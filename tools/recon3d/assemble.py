"""
MOTOFORGE — turns a textured 3D reconstruction of a real bike (TRELLIS.2, photogrammetry…) into an app-ready GLB.

  blender -b -P tools/recon3d/assemble.py -- --ref <reference.glb> --recon <a.glb> [--recon <b.glb> --sides left,right] --out <bike.glb>
                                              [--renders <dir>] [--report <report.json>] [--max-label-dist 0.06]

Reference = the project's dimensioned model of the same generation (tools/bike3d), whose nodes are tagged
cmp~<component>~n / stock~<part>~n / fixed~x~n / acc~<accessory>~n, in the bike frame (X forward, Z up, rear axle at 0).

Steps
 1. Join each reconstruction into one mesh (texture kept). With two reconstructions (one photographed from each
    side), --sides keeps the left half (+Y) of the first and the right half of the second, after alignment, so
    each side's asymmetric parts come from a real photo of that side, not from the model's guess.
 2. Align it on the reference: longest horizontal axis → X, uniform scale to the official length, ground on Z=0,
    then ICP (rotation + translation + uniform scale, Umeyama). Two headings are tried (0° / 180°).
    NEVER mirrored: a mirror would swap the mechanical asymmetries (chain, exhaust, brake discs).
 3. Each face gets the component of the nearest reference surface (≤ max-label-dist, else fixed), then neighbour voting
    (--smooth passes) and merging of islands smaller than --min-island faces into their surroundings. Faces become objects cmp~<slug>~0 / stock~<part>~0 / fixed~x~0.
 4. Each paintable component stores its mean texture luminance (extras "lumMean") so the app can repaint it while
    keeping the photographed shading.
 5. The reference accessories (acc~) are copied in: same frame, so fitted parts land at their real place.
 6. GLB export (+ optional Cycles renders of the 6 MOTOFORGE angles for mechanical review).
"""
import bpy, bmesh, json, math, os, random, sys
import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
REF, OUT = arg("--ref"), arg("--out")
RECONS = [argv[i + 1] for i, a in enumerate(argv) if a == "--recon"]
SIDES = (arg("--sides") or "").split(",") if arg("--sides") else []   # e.g. left,right: keep +Y half of 1st, -Y half of 2nd
RENDERS, REPORT = arg("--renders"), arg("--report")
MAXD = float(arg("--max-label-dist", "0.06"))
MAX_FOOTPRINT = float(arg("--max-footprint", "0.6"))
SMOOTH_ITERS = int(arg("--smooth", "10"))
MIN_ISLAND = int(arg("--min-island", "400"))   # faces   # CB125R: 820/2040 = 0.40 incl. mirrors
random.seed(1)

bpy.ops.wm.read_factory_settings(use_empty=True)

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]

def tag_of(o):
    n = o.name if "~" in o.name else (o.parent.name if o.parent and "~" in o.parent.name else "")
    parts = n.split("~")
    return (parts[0], parts[1]) if len(parts) >= 2 else ("fixed", "x")

# ---------- reference ----------
ref_objs = [o for o in import_glb(REF) if o.type == "MESH"]
dg = bpy.context.evaluated_depsgraph_get()
verts, polys, poly_tag, accessories = [], [], [], []
for o in ref_objs:
    kind, ident = tag_of(o)
    if kind == "acc":
        accessories.append(o); continue
    me = o.evaluated_get(dg).to_mesh()
    off = len(verts)
    verts += [o.matrix_world @ v.co for v in me.vertices]
    for p in me.polygons:
        polys.append([off + i for i in p.vertices]); poly_tag.append(f"{kind}~{ident}")
    o.evaluated_get(dg).to_mesh_clear()
ref_bvh = BVHTree.FromPolygons(verts, polys)
rv = np.array([v[:] for v in verts])
ref_min, ref_max = rv.min(0), rv.max(0)
ref_len = ref_max[0] - ref_min[0]
for o in ref_objs:
    if o not in accessories: o.hide_render = True; o.hide_set(True)

# ---------- reconstruction(s) ----------
def align(path):
    global co
    for o in bpy.context.view_layer.objects: o.select_set(False)
    rec = [o for o in import_glb(path) if o.type == "MESH"]
    for o in rec: o.select_set(True)
    bpy.context.view_layer.objects.active = rec[0]
    if len(rec) > 1: bpy.ops.object.join()
    R = bpy.context.view_layer.objects.active
    R.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = R.data
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get("co", co); co = co.reshape(-1, 3)

    def apply(M):
        global co
        h = np.c_[co, np.ones(len(co))] @ np.array(M).T
        co = h[:, :3]

    # 0) plausibility gate: a bike's footprint is long and narrow (width/length from the official dimensions).
    #    A square footprint means the generator merged views into crossing bodies → reject, never force-align.
    ext = co.max(0) - co.min(0)
    ratio = min(ext[0], ext[1]) / max(ext[0], ext[1])
    if ratio > MAX_FOOTPRINT:
        print(f"[reject] {os.path.basename(path)}: footprint width/length {ratio:.2f} > {MAX_FOOTPRINT:.2f} — "
              "incoherent geometry (views merged at wrong angles)")
        sys.exit(3)
    # 1) longest horizontal axis → X ; uniform scale ; ground
    if ext[1] > ext[0]: apply(Matrix.Rotation(math.pi / 2, 4, "Z"))
    s = ref_len / (co[:, 0].max() - co[:, 0].min())
    apply(Matrix.Scale(s, 4))
    c = (co.max(0) + co.min(0)) / 2
    apply(Matrix.Translation(Vector(((ref_max[0] + ref_min[0]) / 2 - c[0], (ref_max[1] + ref_min[1]) / 2 - c[1], ref_min[2] - co[:, 2].min()))))

    def nearest(points):
        q, d = [], []
        for p in points:
            loc, _, idx, dist = ref_bvh.find_nearest(Vector(p))
            q.append(loc[:]); d.append(dist)
        return np.array(q), np.array(d)

    def umeyama(src, dst):
        ms, md = src.mean(0), dst.mean(0)
        a, b = src - ms, dst - md
        U, S, Vt = np.linalg.svd(b.T @ a / len(src))
        D = np.eye(3); D[2, 2] = np.sign(np.linalg.det(U @ Vt))   # det=+1: rotation only, never a reflection
        Rm = U @ D @ Vt
        sc = (S * np.diag(D)).sum() / (a ** 2).sum(1).mean()
        t = md - sc * Rm @ ms
        M = np.eye(4); M[:3, :3] = sc * Rm; M[:3, 3] = t
        return M

    def icp(points, iters=40):
        M = np.eye(4); p = points.copy()
        for _ in range(iters):
            q, d = nearest(p)
            keep = d < np.percentile(d, 85)                    # robust to parts missing from the reference
            Mi = umeyama(p[keep], q[keep])
            p = (np.c_[p, np.ones(len(p))] @ Mi.T)[:, :3]
            M = Mi @ M
        return M, float(np.median(nearest(p)[1]))

    sample = co[np.random.default_rng(0).choice(len(co), min(4000, len(co)), replace=False)]
    best = None
    pivot = Vector(((ref_max[0] + ref_min[0]) / 2, (ref_max[1] + ref_min[1]) / 2, 0))
    for heading in (0, 180):
        H = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(heading), 4, "Z") @ Matrix.Translation(-pivot)
        start = (np.c_[sample, np.ones(len(sample))] @ np.array(H).T)[:, :3]
        M, err = icp(start)
        if best is None or err < best[1]: best = (np.array(M) @ np.array(H), err, heading)
    apply(best[0])
    me.vertices.foreach_set("co", co.ravel()); me.update()
    print(f"[align] heading {best[2]}°, median surface gap {best[1] * 1000:.1f} mm")


    return R, best

aligned = []
for i, path in enumerate(RECONS):
    R_i, best_i = align(path)
    if SIDES:
        keep_left = SIDES[i] == "left"   # bike frame: +Y = left side
        b = bmesh.new(); b.from_mesh(R_i.data); b.faces.ensure_lookup_table()
        bmesh.ops.delete(b, geom=[f for f in b.faces if (f.calc_center_median().y >= 0) != keep_left], context="FACES")
        b.to_mesh(R_i.data); b.free()
    aligned.append((R_i, best_i))
for o in bpy.context.view_layer.objects: o.select_set(False)
for R_i, _ in aligned: R_i.select_set(True)
bpy.context.view_layer.objects.active = aligned[0][0]
if len(aligned) > 1: bpy.ops.object.join()
R = bpy.context.view_layer.objects.active; me = R.data
best = max((b for _, b in aligned), key=lambda b: b[1])   # report the worst fit
# 3) labels
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
labels, gaps = [], []
for f in bm.faces:
    loc, _, idx, dist = ref_bvh.find_nearest(f.calc_center_median())
    labels.append(poly_tag[idx] if dist <= MAXD else "fixed~x"); gaps.append(dist)
# Region cleanup (vectorised): neighbour voting, then small islands merged into their surroundings.
# The reference is a simplified model, so raw nearest-surface labels are noisy where shapes differ.
F = len(bm.faces)
pairs = np.array([(e.link_faces[0].index, e.link_faces[1].index) for e in bm.edges if len(e.link_faces) == 2], dtype=np.int64)
names = sorted(set(labels)); L = len(names); lab = np.array([names.index(l) for l in labels])
for _ in range(SMOOTH_ITERS):
    votes = np.zeros((F, L), dtype=np.int32)
    np.add.at(votes, (pairs[:, 0], lab[pairs[:, 1]]), 1)
    np.add.at(votes, (pairs[:, 1], lab[pairs[:, 0]]), 1)
    votes[np.arange(F), lab] += 1                          # a face keeps its label on ties
    lab = votes.argmax(1)
adj = [[] for _ in range(F)]
for a, b in pairs: adj[a].append(b); adj[b].append(a)
seen = np.full(F, -1); comps = []
for f0 in range(F):
    if seen[f0] >= 0: continue
    stack, comp = [f0], []; seen[f0] = len(comps)
    while stack:
        f = stack.pop(); comp.append(f)
        for g in adj[f]:
            if seen[g] < 0 and lab[g] == lab[f0]: seen[g] = len(comps); stack.append(g)
    comps.append(comp)
merged = 0
for comp in sorted(comps, key=len):
    if len(comp) >= MIN_ISLAND: break
    cs = set(comp); around = {}
    for f in comp:
        for g in adj[f]:
            if g not in cs: around[lab[g]] = around.get(lab[g], 0) + 1
    if around:
        new = max(around, key=around.get)
        for f in comp: lab[f] = new
        merged += 1
labels = [names[i] for i in lab]
print(f"[labels] {SMOOTH_ITERS} voting passes, {merged} small islands merged")
bm.free()

# split into tagged objects
groups = {}
for i, l in enumerate(labels): groups.setdefault(l, []).append(i)
parts = {}
for label, faces in groups.items():
    dup = R.copy(); dup.data = R.data.copy(); bpy.context.collection.objects.link(dup)
    keep = set(faces)
    b = bmesh.new(); b.from_mesh(dup.data); b.faces.ensure_lookup_table()
    bmesh.ops.delete(b, geom=[f for f in b.faces if f.index not in keep], context="FACES")
    b.to_mesh(dup.data); b.free()
    dup.name = f"{label}~0"; parts[label] = dup
bpy.data.objects.remove(R)

# 4) texture luminance per paintable component
def texture_of(o):
    for slot in o.material_slots:
        if slot.material and slot.material.use_nodes:
            for n in slot.material.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image: return n.image
img = texture_of(next(iter(parts.values())))
pix = None
if img:
    w, h = img.size; pix = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(pix); pix = pix.reshape(h, w, 4)
stats = {}
for label, o in parts.items():
    if not label.startswith("cmp~") or pix is None: continue
    uv = o.data.uv_layers.active
    if not uv: continue
    uvs = np.empty(len(uv.data) * 2); uv.data.foreach_get("uv", uvs); uvs = uvs.reshape(-1, 2)
    x = np.clip((uvs[:, 0] % 1) * (pix.shape[1] - 1), 0, pix.shape[1] - 1).astype(int)
    y = np.clip((uvs[:, 1] % 1) * (pix.shape[0] - 1), 0, pix.shape[0] - 1).astype(int)
    rgb = pix[y, x, :3]
    if img.colorspace_settings.name == 'sRGB':   # the app shades in linear space
        rgb = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    lum = float((rgb @ np.array([0.2126, 0.7152, 0.0722])).mean())
    o["lumMean"] = round(max(lum, 0.005), 5)
    stats[label] = {"faces": len(groups[label]), "lumMean": o["lumMean"]}

# 5) accessories from the reference, same frame
for a in accessories:
    a.hide_set(False); a.hide_render = False
for o in ref_objs:
    if o not in accessories: bpy.data.objects.remove(o)

# 6) export
for o in bpy.data.objects: o.select_set(o.type == "MESH")
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_extras=True,
                          export_apply=True, export_image_format="JPEG", export_jpeg_quality=88)
report = {"heading": best[2], "medianGapMM": round(best[1] * 1000, 1),
          "unlabeledFaces": len(groups.get("fixed~x", [])), "totalFaces": len(labels),
          "components": {k: len(v) for k, v in groups.items()}, "lum": stats}
if REPORT: json.dump(report, open(REPORT, "w"), indent=1)
print("[report]", json.dumps({k: report[k] for k in ("heading", "medianGapMM", "unlabeledFaces", "totalFaces")}))

if RENDERS:
    os.makedirs(RENDERS, exist_ok=True)
    for a in accessories: a.hide_render = True
    sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.device = "CPU"
    sc.render.resolution_x, sc.render.resolution_y = 2400, 1600; sc.render.film_transparent = True
    world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.92, 1)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); bpy.context.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 85
    center = Vector(((ref_max[0] + ref_min[0]) / 2, 0, 0.55))
    # MOTOFORGE angles (0° = facing the front of the bike, clockwise seen from above, 90° = right side)
    for name, deg in (("front", 0), ("frontThreeQuarter", 45), ("rightProfile", 90), ("rear", 180), ("rearThreeQuarter", 225), ("leftProfile", 270)):
        a = math.radians(deg); d = 6.0
        cam.location = center + Vector((math.cos(a) * d, -math.sin(a) * d, 0.35))
        cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(RENDERS, f"photo_{name}.png")   # same names as tools/photoqc → qc.py runs on them
        bpy.ops.render.render(write_still=True)
