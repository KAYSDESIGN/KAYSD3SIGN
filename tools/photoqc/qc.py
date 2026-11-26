#!/usr/bin/env python3
"""
Photo-view quality control for MOTOFORGE (any bike).

  python3 tools/photoqc/qc.py <pack_dir> <spec.json> [--review review.json] [--out report.json] [--md report.md]

pack_dir/photo_<angle>.png : RGBA cut-outs (angles: front, frontThreeQuarter, rightProfile, rear, rearThreeQuarter, leftProfile)
spec.json   : official dimensions + facts per bike (tools/photoqc/specs/<generation>.json)
review.json : per-view mechanical checklist filled by a reviewer (engine, brake discs, transmission, exhaust, mirrors,
              wheels, fork, bodywork, logos, colour). Missing item = "unverified".

A view is ACCEPTED only if every automatic check passes AND every checklist item is "ok".
Nothing here edits images; the report is the gate before integration.
"""
import argparse, json, os, statistics, sys
import numpy as np
from PIL import Image

ANGLES = ["front", "frontThreeQuarter", "rightProfile", "rear", "rearThreeQuarter", "leftProfile"]
DEGREES = {"front": 0, "frontThreeQuarter": 45, "rightProfile": 90, "rear": 180, "rearThreeQuarter": 225, "leftProfile": 270}
CHECKLIST = ["engine", "brakeDiscs", "transmission", "exhaust", "mirrors", "wheels", "fork", "bodywork", "logos", "colour"]


def analyse(path, spec, angle):
    im = Image.open(path)
    res = {"file": os.path.basename(path), "size": list(im.size), "checks": {}}
    c = res["checks"]
    if im.mode != "RGBA":
        c["transparentBackground"] = {"ok": False, "detail": f"mode {im.mode}, pas de canal alpha"}
        return res
    a = np.asarray(im)[..., 3].astype(np.float32) / 255
    H, W = a.shape
    k = max(4, min(W, H) // 50)
    corners = [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]
    clear = float((a < 0.02).mean())
    c["transparentBackground"] = {"ok": bool(all(float(x.max()) < 0.02 for x in corners) and clear > 0.15),
                                  "detail": f"{clear:.0%} de pixels transparents"}
    ys, xs = np.nonzero(a > 0.06)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    margin = min(x0, y0, W - 1 - x1, H - 1 - y1)
    c["fullyVisible"] = {"ok": bool(margin >= 2), "detail": f"marge minimale {margin} px"}
    bw, bh = x1 - x0 + 1, y1 - y0 + 1
    long_side = max(bw, bh)
    c["resolution"] = {"ok": bool(long_side >= spec["qc"]["minLongSidePx"]), "detail": f"moto {bw}×{bh} px (minimum {spec['qc']['minLongSidePx']} px côté long)"}
    d = spec["dimensionsMM"]
    ref = spec["qc"].get("profileAspectReference")
    if "Profile" in angle and ref:
        ys2, xs2 = np.nonzero(a > 0.98)   # opaque pixels only: soft ground shadows excluded
        ratio = (xs2.max() - xs2.min() + 1) / (ys2.max() - ys2.min() + 1)
        tol = spec["qc"]["aspectTolerance"]
        c["proportions"] = {"ok": bool(abs(ratio / ref["value"] - 1) <= tol),
                            "detail": f"rapport L/H {ratio:.3f}, référence {ref['value']:.3f} ±{tol:.0%} ({ref['source']})"}
    else:
        c["proportions"] = {"ok": True, "detail": "pas de référence mesurée pour cet angle : contrôle par la revue"}
    rgb = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    lum = (0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2])[a > 0.9]
    res["luminance"] = {"mean": round(float(lum.mean()), 4), "p95": round(float(np.percentile(lum, 95)), 4)}
    res["bbox"] = [x0, y0, bw, bh]
    res["pxPerMM"] = round(bh / d["height"], 4)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pack"); ap.add_argument("spec")
    ap.add_argument("--review"); ap.add_argument("--out"); ap.add_argument("--md")
    o = ap.parse_args()
    spec = json.load(open(o.spec))
    review = json.load(open(o.review)) if o.review else {"views": {}}
    views = {}
    for angle in ANGLES:
        p = os.path.join(o.pack, f"photo_{angle}.png")
        if not os.path.exists(p):
            views[angle] = {"missing": True, "accepted": False}
            continue
        views[angle] = analyse(p, spec, angle)
    present = [v for v in views.values() if not v.get("missing")]
    if present:
        med = statistics.median(v["luminance"]["mean"] for v in present)
        tol = spec["qc"]["lightingTolerance"]
        for v in present:
            dev = v["luminance"]["mean"] / med - 1 if med else 0
            v["checks"]["uniformLighting"] = {"ok": abs(dev) <= tol, "detail": f"luminance moyenne {v['luminance']['mean']:.3f}, écart {dev:+.0%} / médiane (±{tol:.0%})"}
    for angle, v in views.items():
        if v.get("missing"): continue
        r = review["views"].get(angle, {})
        v["review"] = {item: r.get(item, {"status": "unverified", "note": ""}) for item in CHECKLIST}
        auto_ok = all(ch["ok"] for ch in v["checks"].values())
        manual_ok = all(x["status"] == "ok" for x in v["review"].values())
        v["accepted"] = auto_ok and manual_ok
        v["rejectReasons"] = [f"auto:{k}" for k, ch in v["checks"].items() if not ch["ok"]] + \
                             [f"{k}:{x['status']}" for k, x in v["review"].items() if x["status"] != "ok"]
    out = {"generation": spec["generation"], "reviewedAt": review.get("reviewedAt"), "reviewer": review.get("reviewer"),
           "setNotes": review.get("setNotes", []), "views": views,
           "accepted": [a for a in ANGLES if views[a].get("accepted")]}
    if o.out: json.dump(out, open(o.out, "w"), indent=1, ensure_ascii=False)
    if o.md: open(o.md, "w").write(markdown(out, spec))
    for a in ANGLES:
        v = views[a]
        print(f"{DEGREES[a]:>3}° {a:<18} {'ACCEPTÉE' if v.get('accepted') else 'REJETÉE '} {'absente' if v.get('missing') else ', '.join(v['rejectReasons'])}")
    return 0


def markdown(r, spec):
    L = [f"# Contrôle qualité des vues photo — {spec['name']}", "",
         f"Généré par `tools/photoqc/qc.py`. Revue : {r.get('reviewer') or '—'}, {r.get('reviewedAt') or '—'}. "
         "Une vue n'est intégrée que si **tous** les contrôles automatiques et **tous** les points mécaniques sont « ok ».", "",
         "## Référence (sources)", ""]
    for f in spec["facts"]:
        L.append(f"- **{f['item']}** : {f['value']} — {f['status']} ({f['source']})")
    L += ["", "## Constats sur le jeu", ""] + [f"- {n}" for n in r["setNotes"]] + ["", "## Vues", "",
          "| Vue | Verdict | Contrôles automatiques | Revue mécanique |", "|---|---|---|---|"]
    for a in ANGLES:
        v = r["views"][a]
        if v.get("missing"):
            L.append(f"| {DEGREES[a]}° {a} | Absente | — | — |"); continue
        auto = "<br>".join(f"{'✅' if c['ok'] else '❌'} {k} : {c['detail']}" for k, c in v["checks"].items())
        rev = "<br>".join(f"{ {'ok': '✅', 'fail': '❌'}.get(x['status'], '❔')} {k}{' : ' + x['note'] if x['note'] else ''}" for k, x in v["review"].items())
        L.append(f"| {DEGREES[a]}° {a} | {'**Acceptée**' if v['accepted'] else '**Rejetée**'} | {auto} | {rev} |")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    sys.exit(main())
