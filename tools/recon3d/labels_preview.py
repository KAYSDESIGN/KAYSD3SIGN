"""Renders an assembled GLB with one flat colour per component (cmp~/stock~/fixed~) to check the split.
  blender -b -P tools/recon3d/labels_preview.py -- <bike.glb> <out.png>"""
import bpy, colorsys, math, sys
from mathutils import Vector
src, out = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
names = sorted({o.name.split("~")[1] if "~" in o.name else "x" for o in bpy.data.objects if o.type == "MESH"})
for o in bpy.data.objects:
    if o.type != "MESH": continue
    if o.name.startswith("acc~"): o.hide_render = True; continue
    key = o.name.split("~")[1] if "~" in o.name else "x"
    m = bpy.data.materials.new(key); m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    rgb = (0.55, 0.55, 0.55) if o.name.startswith("fixed") else colorsys.hsv_to_rgb((names.index(key) * 0.618) % 1, 0.8, 0.95)
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    o.data.materials.clear(); o.data.materials.append(m)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.samples = 8
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (1, 1, 1, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 1.5
sc.render.resolution_x, sc.render.resolution_y = 1600, 700
cam = bpy.data.objects.new("c", bpy.data.cameras.new("c")); bpy.context.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
c = Vector((0.66, 0, 0.55))
# two views side by side: right 3/4 front and left 3/4 rear
import os
paths = []
for i, deg in enumerate((45, 225)):
    a = math.radians(deg); cam.location = c + Vector((math.cos(a) * 4.2, -math.sin(a) * 4.2, 0.9))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    p = out.replace(".png", f"_{deg}.png"); sc.render.filepath = p; bpy.ops.render.render(write_still=True); paths.append(p)
print("[labels]", ", ".join(names))
