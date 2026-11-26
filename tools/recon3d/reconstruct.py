#!/usr/bin/env python3
"""
MOTOFORGE — automated photo → 3D reconstruction for any bike.

  python3 tools/recon3d/reconstruct.py <generation> [--engine trellis-mv|trellis2] [--out <dir>] [--dry-run]

Reads tools/recon3d/refs/<generation>.json (reference photos with source, rights and view angle), then:
  1. rights gate: every image must be `rights: "free"` (CC0/CC BY/CC BY-SA…) or `rights: "personal"` (user-provided,
     result kept private). Anything else (e.g. manufacturer photos, all rights reserved) is refused.
  2. reconstruction — ONE generation from ALL views of the same bike (no fusion of independent models):
       trellis2   : TRELLIS.2 (MIT), Space microsoft/TRELLIS.2, best view (highest `priority`)        [default]
                    → coherent textured geometry; the hidden side is inferred (asymmetries checked by the QC)
       trellis-mv : TRELLIS v1 (MIT) multi-image ("experimental"), Space trellis-community/TRELLIS. Tested on the
                    CB125R with views 90° apart: views merged into crossing bodies → rejected by the footprint gate
  3. tools/recon3d/run.sh: alignment on the dimensioned reference, component split, accessories, GLB,
     6 renders from that single geometry, photoqc gate.

Authentication: the Hugging Face token goes in the standard `Authorization: Bearer` header (as documented for
Spaces). gradio_client's own `token=` uses `x-hf-authorization`, which header-injecting proxies do not fill —
that was the cause of the earlier "anonymous quota" refusals. Locally, set HF_TOKEN; in the cloud session the
network proxy injects the saved token. Free account quota: 5 GPU-minutes per day (Hugging Face docs).
Exit code 75 = quota exhausted (retry after the reset time printed).
"""
import argparse, json, os, shutil, subprocess, sys, time, urllib.request
from gradio_client import Client, handle_file

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ap = argparse.ArgumentParser()
ap.add_argument("generation"); ap.add_argument("--engine", default="trellis2", choices=["trellis-mv", "trellis2"])
ap.add_argument("--out"); ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--seed", type=int, default=1)
o = ap.parse_args()
refs = json.load(open(os.path.join(ROOT, "tools/recon3d/refs", f"{o.generation}.json")))
out = o.out or os.path.join(ROOT, "build/recon", o.generation)
os.makedirs(os.path.join(out, "inputs"), exist_ok=True)

# 1) rights gate + fetch
images = []
for ref in refs["images"]:
    if ref.get("use") is False:
        print(f"  skip  {ref['id']}: {ref.get('reason', 'excluded')}"); continue
    if ref["rights"] not in ("free", "personal"):
        sys.exit(f"REFUSED {ref['id']}: rights '{ref['rights']}' do not allow reuse ({ref.get('source')})")
    dst = os.path.join(out, "inputs", f"{ref['id']}.png")
    src = ref["file"] if "file" in ref else ref["url"]
    if src.startswith("http"):
        req = urllib.request.Request(src, headers={"User-Agent": "MOTOFORGE-recon/1.0"})
        with urllib.request.urlopen(req) as r, open(dst, "wb") as f: f.write(r.read())
    else:
        shutil.copy(os.path.join(ROOT, src) if not os.path.isabs(src) else src, dst)
    images.append((ref, dst))
    print(f"  use   {ref['id']}: {ref['angle']} · {ref['rights']} · {ref.get('source', '')}")
if not images: sys.exit("No usable reference image (see refs file).")
private = any(r["rights"] == "personal" for r, _ in images)
json.dump({"generation": o.generation, "engine": o.engine, "private": private,
           "inputs": [r for r, _ in images]}, open(os.path.join(out, "provenance.json"), "w"), indent=1, ensure_ascii=False)
if o.dry_run: sys.exit(0)

# 2) reconstruction — one generation, all views
token = os.environ.get("HF_TOKEN") or "hf_injected_by_proxy"
headers = {"Authorization": f"Bearer {token}"}
glb = os.path.join(out, "reconstruction.glb")
t = time.time()
try:
    if o.engine == "trellis-mv":
        c = Client("trellis-community/TRELLIS", headers=headers, verbose=False, download_files=os.path.join(out, "dl"))
        c.predict(api_name="/start_session")
        files = [handle_file(p) for _, p in images]
        pre = c.predict([{"image": f, "caption": None} for f in files], api_name="/preprocess_images")
        def path_of(x):
            x = x.get("image", x) if isinstance(x, dict) else x
            return x.get("path") if isinstance(x, dict) else x
        mv = [{"image": handle_file(path_of(x)), "caption": None} for x in pre]
        res = c.predict(image=mv[0]["image"], multiimages=mv, seed=o.seed, ss_guidance_strength=7.5, ss_sampling_steps=12,
                        slat_guidance_strength=3, slat_sampling_steps=12, multiimage_algo="stochastic",
                        mesh_simplify=0.9, texture_size=2048, api_name="/generate_and_extract_glb")
        path = next(x for x in (res if isinstance(res, (list, tuple)) else [res]) if isinstance(x, str) and x.endswith(".glb"))
    else:
        best = max(images, key=lambda x: x[0].get("priority", 0))[1]
        c = Client("microsoft/TRELLIS.2", headers=headers, verbose=False, download_files=os.path.join(out, "dl"))
        c.predict(api_name="/start_session")
        pre = c.predict(handle_file(best), api_name="/preprocess_image")
        c.predict(handle_file(pre), o.seed, "1536", api_name="/image_to_3d")
        g, d = c.predict(400000, 4096, api_name="/extract_glb"); path = d or g
except Exception as e:
    if "quota" in str(e).lower():
        print(f"QUOTA: {e}"); sys.exit(75)
    raise
shutil.copy(path, glb)
print(f"reconstruction: {glb} ({os.path.getsize(glb) / 1e6:.1f} Mo, {time.time() - t:.0f} s)")

# 3) assemble + renders + QC
subprocess.run([os.path.join(ROOT, "tools/recon3d/run.sh"), o.generation, out, glb], check=True)
print("PRIVÉ — ne pas publier ni committer." if private else "Sources libres : publication possible avec attribution (provenance.json).")
