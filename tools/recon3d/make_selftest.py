"""Builds a synthetic 'reconstruction' from the reference model to test assemble.py without a GPU:
all non-accessory parts merged into ONE untagged mesh, rotated 270°, scaled ×0.43, moved, optional Gaussian vertex noise (metres), with each original
face label stored in a sidecar JSON (face order) so label transfer accuracy can be measured.
  blender -b -P tools/recon3d/make_selftest.py -- <reference.glb> <out.glb> [noise]"""
import bpy, json, math, sys
from mathutils import Matrix, Vector
a = sys.argv[sys.argv.index("--") + 1:]
ref, out = a[:2]
noise = float(a[2]) if len(a) > 2 else 0.0
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=ref)
objs = []
for o in list(bpy.data.objects):
    if o.type != "MESH": continue
    n = o.name if "~" in o.name else (o.parent.name if o.parent else "")
    if n.startswith("acc~"): bpy.data.objects.remove(o); continue
    o["label"] = "~".join(n.split("~")[:2]) if "~" in n else "fixed~x"
    objs.append(o)
for o in objs:
    o.select_set(True)
    o.parent = None
bpy.context.view_layer.objects.active = objs[0]
labels = []
for o in objs:
    bpy.context.view_layer.objects.active = o
    o.data = o.data.copy()
    labels.append((o.name, o["label"], len(o.data.polygons)))
bpy.ops.object.select_all(action="SELECT")
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# join order = selection order with active first; record order explicitly
order = [objs[0]] + objs[1:]
seq = []
for o in order: seq += [o["label"]] * len(o.data.polygons)
bpy.ops.object.join()
R = bpy.context.view_layer.objects.active; R.name = "scan"
import random
random.seed(3)
for v in R.data.vertices: v.co += Vector((random.gauss(0, noise), random.gauss(0, noise), random.gauss(0, noise)))   # metres, before scaling
R.matrix_world = Matrix.Translation(Vector((0.3, -0.2, 0.1))) @ Matrix.Rotation(math.radians(270), 4, "Z") @ Matrix.Scale(0.43, 4)
# Photo-like texture (dark matte with lighter streaks) so the textured repaint path is exercised.
import numpy as np
W = 1024
rng = np.random.default_rng(5)
base = 0.06 + 0.04 * rng.random((W, W)) + 0.25 * (np.sin(np.linspace(0, 40, W))[None, :] > 0.97)
img = bpy.data.images.new("scan_albedo", W, W)
img.pixels.foreach_set(np.dstack([base, base, base * 1.05, np.ones_like(base)]).astype(np.float32).ravel())
img.pack()
mat = bpy.data.materials.new("scan"); mat.use_nodes = True
tex = mat.node_tree.nodes.new("ShaderNodeTexImage"); tex.image = img
mat.node_tree.links.new(tex.outputs[0], mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
R.data.materials.clear(); R.data.materials.append(mat)
bpy.context.view_layer.objects.active = R
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.cube_project(cube_size=0.5); bpy.ops.object.mode_set(mode="OBJECT")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", use_selection=False)
json.dump(seq, open(out + ".labels.json", "w"))
print("faces", len(seq))
