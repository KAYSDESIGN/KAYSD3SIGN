"""
Procedural 3D model of the Honda CB125R JC91 for MOTOFORGE reference visuals.

Dimensions from Honda press materials (Honda Japan 2021-03-19 release, Honda Motor Europe 24YM release):
  length 2040 mm, width 820 mm, height 1055 mm, wheelbase 1345 mm, seat height 815 mm,
  ground clearance 140 mm, caster 24.2 deg, trail 90 mm, tyres 110/70R17 front / 150/60R17 rear,
  296 mm front floating disc + radial 4-piston caliper, 220 mm rear disc, 41 mm USD fork, 10 L tank.

Axes: X forward, Y left, Z up. Units: metres. Rear axle at origin.
Every customizable component is its own object named after its MOTOFORGE component slug, so masks are exact.

Run:  blender -b -P cb125r_jc91.py -- <out_dir> [--samples N] [--size WxH]
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = argv[0] if argv else "/tmp/cb125r"
DENOISE = "--no-denoise" not in argv
SAMPLES = int(argv[argv.index("--samples") + 1]) if "--samples" in argv else 96
W, H = (int(v) for v in (argv[argv.index("--size") + 1] if "--size" in argv else "1600x1100").split("x"))
ONLY = argv[argv.index("--only") + 1].split(",") if "--only" in argv else None
ACCESSORY = argv[argv.index("--accessory") + 1] if "--accessory" in argv else None
CLEANPLATE = argv[argv.index("--cleanplate") + 1].split(",") if "--cleanplate" in argv else None
EXPORT_GLB = argv[argv.index("--export-glb") + 1] if "--export-glb" in argv else None
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- geometry constants
WB = 1.345
R_REAR = 0.4318 / 2 + 0.150 * 0.60          # 150/60R17 -> 0.306 m
R_FRONT = 0.4318 / 2 + 0.110 * 0.70         # 110/70R17 -> 0.293 m
RIM_R = 0.4318 / 2
RAKE = math.radians(24.2)
FRONT = Vector((WB, 0, R_FRONT))
REAR = Vector((0, 0, R_REAR))
HEAD = Vector((1.06, 0, 0.93))              # steering head (top triple clamp)
PIVOT = Vector((0.56, 0, 0.43))             # swingarm pivot

COMPONENTS = {}  # slug -> list of objects

def mat(name, color, metallic=0.0, rough=0.4, coat=0.0, emission=None):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = rough
    if "Coat Weight" in b.inputs: b.inputs["Coat Weight"].default_value = coat
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = 4.0
    return m

# Base paint is Pearl Smoky Grey-like neutral so the app can recolor with preserved shading.
PAINT = mat("paint", (0.22, 0.23, 0.24), metallic=0.45, rough=0.25, coat=1.0)
BLACK = mat("black_plastic", (0.02, 0.02, 0.022), rough=0.55)
SATIN_BLACK = mat("satin_black", (0.03, 0.03, 0.032), metallic=0.4, rough=0.35)
FRAME = mat("frame", (0.05, 0.05, 0.055), metallic=0.6, rough=0.3, coat=0.5)
ALU = mat("alu", (0.55, 0.56, 0.58), metallic=1.0, rough=0.28)
CHROME = mat("chrome", (0.9, 0.9, 0.92), metallic=1.0, rough=0.08)
GOLD = mat("fork_gold", (0.75, 0.52, 0.18), metallic=1.0, rough=0.25)
RUBBER = mat("rubber", (0.006, 0.006, 0.006), rough=0.9)
RIM = mat("rim", (0.04, 0.04, 0.045), metallic=0.5, rough=0.35, coat=0.6)
DISC = mat("disc", (0.6, 0.6, 0.62), metallic=1.0, rough=0.35)
CALIPER = mat("caliper", (0.05, 0.05, 0.05), metallic=0.5, rough=0.4)
SEAT = mat("seat", (0.025, 0.025, 0.025), rough=0.75)
ENGINE = mat("engine", (0.12, 0.12, 0.13), metallic=0.7, rough=0.35)
LED = mat("led", (1, 1, 1), emission=(1, 1, 1))
GLASS = mat("lens", (0.8, 0.8, 0.85), metallic=0.0, rough=0.05)
EXHAUST = mat("exhaust", (0.08, 0.08, 0.085), metallic=0.8, rough=0.3)

def link(obj, comp=None, material=None, smooth=True):
    if material:
        obj.data.materials.clear(); obj.data.materials.append(material)
    if smooth and obj.type == "MESH":
        for p in obj.data.polygons: p.use_smooth = True
    if comp:
        COMPONENTS.setdefault(comp, []).append(obj)
        obj["component"] = comp
    return obj

def active():
    return bpy.context.active_object

def cyl(p1, p2, r, comp=None, material=None, verts=24, smooth=True):
    p1, p2 = Vector(p1), Vector(p2)
    d = p2 - p1
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(p1 + p2) / 2)
    o = active()
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = d.to_track_quat("Z", "Y")
    o = link(o, comp, material, smooth=smooth)
    if smooth:
        bevel = o.modifiers.new("edge", "BEVEL"); bevel.width = min(r * 0.25, 0.006); bevel.segments = 2
        bevel.harden_normals = True
    return o

def sphere(loc, scale, comp=None, material=None, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = active(); o.scale = scale
    return link(o, comp, material)

def box(loc, size, comp=None, material=None, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    o = active(); o.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = 4
    return link(o, comp, material)

def torus(loc, major, minor, axis="Y", comp=None, material=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=72, minor_segments=24,
                                     location=loc, rotation=(math.pi / 2, 0, 0) if axis == "Y" else (0, 0, 0))
    return link(active(), comp, material)

def loft(name, sections, comp=None, material=None, subdiv=2):
    """Skins a closed surface through a list of (x, [(y,z), ...]) cross-sections (same point count)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    rings = []
    for x, pts in sections:
        rings.append([bm.verts.new((x, y, z)) for (y, z) in pts])
    n = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for i in range(n):
            bm.faces.new((a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    if subdiv:
        m = o.modifiers.new("sub", "SUBSURF"); m.levels = subdiv; m.render_levels = subdiv
    return link(o, comp, material)

def slab(name, pts_xz, y0, y1, comp=None, material=None, bevel=0.012, taper=0.0):
    """Extrudes a polygon defined in the XZ plane between y0 and y1 (outer face optionally shrunk by `taper`)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    cx = sum(p[0] for p in pts_xz) / len(pts_xz); cz = sum(p[1] for p in pts_xz) / len(pts_xz)
    inner = [bm.verts.new((x, y0, z)) for x, z in pts_xz]
    outer = [bm.verts.new((cx + (x - cx) * (1 - taper), y1, cz + (z - cz) * (1 - taper))) for x, z in pts_xz]
    n = len(pts_xz)
    bm.faces.new(inner[::-1] if y1 > y0 else inner); bm.faces.new(outer if y1 > y0 else outer[::-1])
    for i in range(n):
        f = (inner[i], inner[(i + 1) % n], outer[(i + 1) % n], outer[i])
        bm.faces.new(f if y1 > y0 else f[::-1])
    bm.normal_update(); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    if bevel:
        m = o.modifiers.new("bevel", "BEVEL"); m.width = bevel; m.segments = 4; m.limit_method = "ANGLE"
    return link(o, comp, material, smooth=False)

def ellipse(cy, cz, ry, rz, n=12, flat_bottom=None):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        y, z = cy + ry * math.cos(t), cz + rz * math.sin(t)
        if flat_bottom is not None: z = max(z, flat_bottom)
        pts.append((y, z))
    return pts

# ---------------------------------------------------------------- wheels
def wheel(center, r_tyre, width, slug):
    torus(center, r_tyre - width * 0.42, width * 0.46, comp=None, material=RUBBER).name = f"tyre_{slug}"
    # rim barrel + 5 Y-shaped spokes (cast wheel)
    rim = torus(center, RIM_R - 0.012, 0.018, comp=slug, material=RIM)
    rim.scale = (1.0, 1.0, width * 0.42 / 0.018)  # torus local Z is the wheel axis before rotation
    hub = cyl(center - Vector((0, 0.07, 0)), center + Vector((0, 0.07, 0)), 0.055, comp=slug, material=RIM)
    for k in range(5):
        a = 2 * math.pi * k / 5
        for off in (-0.16, 0.16):
            tip = center + Vector((math.cos(a + off) * (RIM_R - 0.01), 0, math.sin(a + off) * (RIM_R - 0.01)))
            mid = center + Vector((math.cos(a) * 0.09, 0, math.sin(a) * 0.09))
            cyl(mid, tip, 0.011, comp=slug, material=RIM, verts=12)
        cyl(center, center + Vector((math.cos(a) * 0.09, 0, math.sin(a) * 0.09)), 0.016, comp=slug, material=RIM, verts=12)
    # inner rim face (black) slightly inset so the rim reads as a ring

wheel(FRONT, R_FRONT, 0.110, "front-wheel")
wheel(REAR, R_REAR, 0.150, "rear-wheel")

# Brakes: front 296 mm floating disc on the right (-Y), radial caliper behind the fork leg.
cyl(FRONT + Vector((0, -0.075, 0)), FRONT + Vector((0, -0.068, 0)), 0.148, material=DISC, verts=64)
cyl(FRONT + Vector((0, -0.079, 0)), FRONT + Vector((0, -0.064, 0)), 0.095, material=ALU, verts=32)
box(FRONT + Vector((-0.12, -0.088, 0.09)), (0.10, 0.04, 0.07), comp="brake-calipers", material=CALIPER, bevel=0.01,
    rot=(0, math.radians(35), 0))
cyl(REAR + Vector((0, -0.085, 0)), REAR + Vector((0, -0.08, 0)), 0.11, material=DISC, verts=48)
box(REAR + Vector((0.02, -0.095, -0.1)), (0.07, 0.035, 0.05), comp="brake-calipers", material=CALIPER, bevel=0.008)

# ---------------------------------------------------------------- fork (41 mm USD, raked)
fork_dir = Vector((-math.sin(RAKE), 0, math.cos(RAKE)))
fork_off = 0.035  # offset of axle in front of stanchion line
for side in (1, -1):
    base = FRONT + Vector((-fork_off, 0.085 * side, 0))
    top = base + fork_dir * 0.76
    cyl(base, base + fork_dir * 0.36, 0.022, comp="fork", material=CHROME)          # lower stanchion (USD)
    cyl(base + fork_dir * 0.30, top, 0.029, comp="fork", material=GOLD)            # outer tube
    box(base + Vector((0, 0, -0.02)), (0.07, 0.04, 0.06), comp="fork", material=SATIN_BLACK, bevel=0.01)  # axle foot
TOP = FRONT + Vector((-fork_off, 0, 0)) + fork_dir * 0.74
box(TOP, (0.12, 0.25, 0.035), comp="fork", material=ALU, bevel=0.01, rot=(0, -RAKE, 0))          # top clamp
box(TOP - fork_dir * 0.14, (0.10, 0.25, 0.04), comp="fork", material=SATIN_BLACK, bevel=0.01, rot=(0, -RAKE, 0))

# ---------------------------------------------------------------- front fender
loft("front_fender", [
    (FRONT.x + 0.20, ellipse(0, FRONT.z + 0.17, 0.055, 0.02, 10)),
    (FRONT.x + 0.08, ellipse(0, FRONT.z + 0.30, 0.065, 0.025, 10)),
    (FRONT.x - 0.06, ellipse(0, FRONT.z + 0.31, 0.065, 0.025, 10)),
    (FRONT.x - 0.20, ellipse(0, FRONT.z + 0.22, 0.055, 0.02, 10)),
], comp="front-fender", material=PAINT)

# ---------------------------------------------------------------- headlight (round LED with ring) + gauge
hl = FRONT + Vector((-fork_off, 0, 0)) + fork_dir * 0.62 + Vector((0.09, 0, 0))
cyl(hl + Vector((-0.06, 0, 0)), hl + Vector((0.035, 0, 0)), 0.085, material=BLACK, verts=48)
torus(hl + Vector((0.04, 0, 0)), 0.072, 0.008, axis="X", material=LED).rotation_euler = (0, math.pi / 2, 0)
cyl(hl + Vector((0.035, 0, 0)), hl + Vector((0.045, 0, 0)), 0.07, material=GLASS, verts=48)
box(TOP + Vector((-0.06, 0, 0.07)), (0.05, 0.13, 0.09), material=BLACK, bevel=0.01, rot=(0, math.radians(-40), 0))  # TFT/LCD

# ---------------------------------------------------------------- handlebar, levers, mirrors
bar_c = TOP + Vector((-0.05, 0, 0.09))
pts = [bar_c + Vector((-0.03 * abs(s), 0.39 * s, 0.02 * abs(s))) for s in (-1, -0.45, 0, 0.45, 1)]
for a, b in zip(pts, pts[1:]): cyl(a, b, 0.012, comp="handlebar", material=SATIN_BLACK, verts=16)
for s in (1, -1):
    cyl(bar_c + Vector((-0.03, 0.30 * s, 0.02)), bar_c + Vector((-0.03, 0.40 * s, 0.02)), 0.017, material=RUBBER, verts=16)  # grip
    cyl(bar_c + Vector((-0.02, 0.41 * s, 0.02)), bar_c + Vector((-0.02, 0.425 * s, 0.02)), 0.018, material=ALU, verts=16)   # bar end
    lever = cyl(bar_c + Vector((0.02, 0.24 * s, 0.03)), bar_c + Vector((0.05, 0.40 * s, 0.0)), 0.007, comp="levers", material=ALU, verts=10)
    box(bar_c + Vector((0.0, 0.24 * s, 0.03)), (0.04, 0.05, 0.035), comp="levers", material=SATIN_BLACK, bevel=0.006)
    stem_top = bar_c + Vector((-0.02, 0.26 * s, 0.20))
    cyl(bar_c + Vector((0, 0.22 * s, 0.03)), stem_top, 0.006, material=SATIN_BLACK, verts=10)
    sphere(stem_top + Vector((0, 0.05 * s, 0.02)), (0.02, 0.07, 0.045), material=BLACK)

# ---------------------------------------------------------------- frame (steel diamond)
for s in (1, -1):
    y = 0.07 * s
    head_low = HEAD + Vector((-0.03, 0, -0.16))
    cyl(HEAD + Vector((-0.04, y * 0.5, -0.02)), PIVOT + Vector((0.08, y + 0.01 * s, 0.22)), 0.022, comp="frame", material=FRAME)   # main spar
    cyl(PIVOT + Vector((0.08, y + 0.01 * s, 0.22)), PIVOT + Vector((0.02, y + 0.01 * s, 0.0)), 0.024, comp="frame", material=FRAME)  # pivot plate tube
    cyl(head_low + Vector((0, y * 0.5, 0)), PIVOT + Vector((0.32, y, -0.02)), 0.018, comp="frame", material=FRAME)  # down tube
    # rear subframe
    cyl(PIVOT + Vector((0.07, y, 0.22)), Vector((0.02, y * 0.9, 0.80)), 0.014, comp="frame", material=FRAME)
    cyl(PIVOT + Vector((0.0, y, 0.05)), Vector((0.10, y * 0.9, 0.72)), 0.012, comp="frame", material=FRAME)
cyl(HEAD + Vector((-0.02, 0, -0.18)), HEAD + Vector((0.0, 0, 0.02)), 0.03, comp="frame", material=FRAME)        # steering head
box(PIVOT + Vector((0.03, 0, 0.1)), (0.09, 0.17, 0.26), comp="frame", material=FRAME, bevel=0.015)               # pivot plates

# ---------------------------------------------------------------- swingarm + shock
for s in (1, -1):
    loft(f"swingarm_{s}", [
        (PIVOT.x, ellipse(0.075 * s, PIVOT.z, 0.018, 0.045, 8)),
        (0.30, ellipse(0.085 * s, 0.37, 0.016, 0.036, 8)),
        (REAR.x + 0.02, ellipse(0.09 * s, REAR.z + 0.01, 0.015, 0.028, 8)),
    ], comp="swingarm", material=SATIN_BLACK, subdiv=1)
cyl(PIVOT + Vector((0, -0.09, 0)), PIVOT + Vector((0, 0.09, 0)), 0.025, comp="swingarm", material=SATIN_BLACK)
cyl(Vector((0.45, 0, 0.47)), Vector((0.30, 0, 0.74)), 0.03, material=mat("shock_spring", (0.6, 0.05, 0.05), rough=0.4))
cyl(Vector((0.47, 0, 0.44)), Vector((0.42, 0, 0.53)), 0.02, material=ALU)

# ---------------------------------------------------------------- engine (124 cc single, DOHC) + covers
box(Vector((0.72, 0, 0.40)), (0.32, 0.20, 0.24), material=ENGINE, bevel=0.03)                        # crankcase
cyl(Vector((0.80, 0, 0.48)), Vector((0.92, 0, 0.68)), 0.075, material=ENGINE)                        # cylinder
box(Vector((0.94, 0, 0.71)), (0.16, 0.19, 0.10), material=ENGINE, bevel=0.025, rot=(0, math.radians(-28), 0))   # head
for z in (0.52, 0.56, 0.60, 0.64): cyl(Vector((0.82 + (z - 0.5) * 0.6, -0.08, z)), Vector((0.82 + (z - 0.5) * 0.6, 0.08, z)), 0.082, material=ENGINE, verts=32)  # fins look
cyl(Vector((0.70, 0.10, 0.40)), Vector((0.70, 0.125, 0.40)), 0.10, comp="engine-covers", material=ALU, verts=48, smooth=False)       # left cover
cyl(Vector((0.66, -0.10, 0.38)), Vector((0.66, -0.125, 0.38)), 0.11, comp="engine-covers", material=ALU, verts=48, smooth=False)     # clutch cover
loft("sump_guard", [
    (0.95, ellipse(0, 0.27, 0.10, 0.03, 10)),
    (0.75, ellipse(0, 0.25, 0.11, 0.035, 10)),
    (0.58, ellipse(0, 0.27, 0.10, 0.03, 10)),
], comp="protections", material=SATIN_BLACK)
# radiator + exhaust (short underslung)
box(Vector((1.01, 0, 0.60)), (0.04, 0.26, 0.24), material=BLACK, bevel=0.01, rot=(0, math.radians(-12), 0))
cyl(Vector((0.97, 0, 0.62)), Vector((0.86, 0, 0.32)), 0.022, material=EXHAUST)
loft("muffler", [
    (0.80, ellipse(-0.04, 0.24, 0.07, 0.05, 12)),
    (0.55, ellipse(-0.05, 0.22, 0.09, 0.06, 12)),
    (0.42, ellipse(-0.06, 0.25, 0.07, 0.05, 12)),
], material=EXHAUST)["stock"] = "muffler"
cyl(Vector((0.42, -0.06, 0.25)), Vector((0.36, -0.07, 0.27)), 0.03, material=CHROME)["stock"] = "muffler"

# ---------------------------------------------------------------- fuel tank (10 L) + shrouds (écopes)
loft("tank", [
    (1.12, ellipse(0, 0.93, 0.08, 0.05, 16)),
    (1.04, ellipse(0, 0.985, 0.165, 0.085, 16, flat_bottom=0.87)),
    (0.92, ellipse(0, 1.015, 0.19, 0.10, 16, flat_bottom=0.86)),
    (0.80, ellipse(0, 0.985, 0.175, 0.09, 16, flat_bottom=0.84)),
    (0.71, ellipse(0, 0.90, 0.12, 0.05, 16)),
], comp="tank", material=PAINT)
SHROUD = [(1.10, 0.92), (1.02, 0.98), (0.86, 0.97), (0.80, 0.86), (0.84, 0.71), (0.94, 0.60), (1.05, 0.55), (1.11, 0.62), (1.13, 0.78)]
for side in (1, -1):
    slab(f"shroud_{side}", SHROUD, 0.135 * side, 0.19 * side, comp="tank-shrouds", material=PAINT, taper=0.05)
    # black inner scoop (radiator cover) visible behind the panel edge
    slab(f"scoop_{side}", [(1.12, 0.62), (1.05, 0.56), (0.97, 0.61), (1.02, 0.78), (1.11, 0.80)], 0.10 * side, 0.137 * side,
         material=BLACK, taper=0.0, bevel=0.006)

# ---------------------------------------------------------------- seat, tail section, rear fender
loft("seat", [
    (0.74, ellipse(0, 0.86, 0.09, 0.025, 12)),
    (0.62, ellipse(0, 0.845, 0.135, 0.035, 12)),
    (0.46, ellipse(0, 0.845, 0.125, 0.035, 12)),
    (0.38, ellipse(0, 0.88, 0.10, 0.03, 12)),
    (0.30, ellipse(0, 0.905, 0.09, 0.03, 12)),
    (0.08, ellipse(0, 0.925, 0.075, 0.025, 12)),
], comp="seat", material=SEAT)
loft("tail", [
    (0.50, ellipse(0, 0.78, 0.13, 0.05, 12)),
    (0.34, ellipse(0, 0.83, 0.115, 0.055, 12)),
    (0.16, ellipse(0, 0.87, 0.09, 0.05, 12)),
    (0.00, ellipse(0, 0.895, 0.06, 0.035, 12)),
    (-0.04, ellipse(0, 0.90, 0.04, 0.02, 12)),
], comp="tail-section", material=PAINT)
for side in (1, -1):
    slab(f"side_cover_{side}", [(0.70, 0.82), (0.42, 0.86), (0.18, 0.89), (0.30, 0.78), (0.50, 0.72), (0.66, 0.70)],
         0.105 * side, 0.135 * side, comp="tail-section", material=PAINT, taper=0.06)
box(Vector((-0.035, 0, 0.895)), (0.03, 0.08, 0.025), material=mat("tail_led", (0.6, 0, 0), emission=(1, 0.05, 0.05)), bevel=0.008)
# rear fender / plate holder (hugger-type hanger)
loft("rear_fender", [
    (0.06, ellipse(0, 0.80, 0.05, 0.02, 10)),
    (-0.08, ellipse(0, 0.74, 0.05, 0.02, 10)),
    (-0.16, ellipse(0, 0.62, 0.04, 0.02, 10)),
], comp="rear-fender", material=BLACK)
box(Vector((-0.17, 0, 0.55)), (0.01, 0.20, 0.15), comp="rear-fender", material=BLACK, bevel=0.005, rot=(0, math.radians(-15), 0))
for s in (1, -1):  # indicators
    cyl(Vector((-0.12, 0.05 * s, 0.68)), Vector((-0.12, 0.13 * s, 0.68)), 0.012, material=BLACK, verts=12)
    cyl(Vector((TOP.x + 0.02, 0.10 * s, TOP.z - 0.20)), Vector((TOP.x + 0.06, 0.16 * s, TOP.z - 0.20)), 0.012, material=BLACK, verts=12)

# footpegs + side stand
for s in (1, -1):
    cyl(Vector((0.50, 0.14 * s, 0.33)), Vector((0.50, 0.22 * s, 0.33)), 0.013, material=ALU, verts=12)
    cyl(Vector((0.30, 0.12 * s, 0.42)), Vector((0.30, 0.19 * s, 0.42)), 0.011, material=ALU, verts=12)

# ---------------------------------------------------------------- stage: shadow catcher + lights + world
bpy.ops.mesh.primitive_plane_add(size=20, location=(0.65, 0, 0))
ground = active(); ground.is_shadow_catcher = True
world = bpy.data.worlds.new("world"); scene.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.92, 0.92, 0.94, 1); bg.inputs[1].default_value = 0.35

def area(loc, size, energy, target=(0.65, 0, 0.55)):
    bpy.ops.object.light_add(type="AREA", location=loc)
    l = active(); l.data.size = size; l.data.energy = energy
    d = Vector(target) - Vector(loc); l.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
area((0.65, 0, 4.0), 4.0, 320)        # soft top
area((3.0, 2.5, 2.0), 2.5, 200)       # key front-left
area((-2.5, -2.5, 1.6), 2.5, 140)     # rim rear-right
area((1.5, -3.0, 1.2), 3.0, 100)      # fill right

scene.render.engine = "CYCLES"
scene.cycles.samples = SAMPLES
scene.cycles.use_denoising = DENOISE
scene.cycles.device = "CPU"
scene.render.film_transparent = True
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX" if "AgX" in [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items] else "Filmic"

# ---------------------------------------------------------------- cameras (six fixed angles)
CENTER = Vector((0.66, 0, 0.52))
ANGLES = {
    "front": (0, 0.0),
    "rear": (180, 0.0),
    "leftProfile": (90, 0.0),
    "rightProfile": (-90, 0.0),
    "frontThreeQuarter": (40, 0.0),
    "rearThreeQuarter": (140, 0.0),
}
cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 70; cam_data.sensor_width = 36
cam = bpy.data.objects.new("cam", cam_data); scene.collection.objects.link(cam); scene.camera = cam

def place_camera(azimuth_deg, elev_deg=8):
    az = math.radians(azimuth_deg); el = math.radians(elev_deg)
    dist = 5.2
    pos = CENTER + Vector((math.cos(az) * math.cos(el), math.sin(az) * math.cos(el), math.sin(el))) * dist
    cam.location = pos
    cam.rotation_euler = (CENTER - pos).to_track_quat("-Z", "Y").to_euler()

# ---------------------------------------------------------------- accessories (simplified representations of catalog parts)
ACC_OBJS = []
def acc(o):
    o["accessory"] = True; ACC_OBJS.append(o); return o

CARBON = mat("carbon", (0.03, 0.03, 0.035), metallic=0.2, rough=0.2, coat=1.0)
TITAN = mat("titanium", (0.55, 0.52, 0.48), metallic=1.0, rough=0.25)
MESH_BLACK = mat("mesh_black", (0.02, 0.02, 0.02), metallic=0.5, rough=0.45)
SMOKE = mat("smoke", (0.05, 0.05, 0.06), rough=0.05)
TOPCASE = mat("topcase", (0.02, 0.02, 0.025), rough=0.35, coat=0.5)

def build_accessory(name):
    if name == "mivv-gp-pro":
        # side-mounted short silencer, right side, replacing the stock underbody muffler
        acc(cyl(Vector((0.86, -0.04, 0.30)), Vector((0.62, -0.13, 0.30)), 0.022, material=EXHAUST))
        acc(cyl(Vector((0.62, -0.13, 0.30)), Vector((0.36, -0.17, 0.40)), 0.055, material=CARBON, verts=32))
        acc(cyl(Vector((0.36, -0.17, 0.40)), Vector((0.31, -0.175, 0.42)), 0.045, material=TITAN, verts=32))
    elif name == "givi-b45-sr1169":
        acc(box(Vector((0.08, 0, 0.96)), (0.30, 0.20, 0.02), material=SATIN_BLACK, bevel=0.005))        # SR1169 plate
        acc(box(Vector((0.02, 0, 1.12)), (0.42, 0.50, 0.30), material=TOPCASE, bevel=0.07))           # 45 L top case
        acc(box(Vector((-0.19, 0, 1.12)), (0.01, 0.30, 0.04), material=mat("grey_insert", (0.35, 0.35, 0.37), rough=0.4)))
    elif name == "givi-tn1199":
        for s in (1, -1):
            pts = [Vector((0.98, 0.10 * s, 0.70)), Vector((1.06, 0.20 * s, 0.55)), Vector((1.02, 0.22 * s, 0.38)), Vector((0.86, 0.18 * s, 0.30))]
            for a, b in zip(pts, pts[1:]): acc(cyl(a, b, 0.0125, material=SATIN_BLACK, verts=14))
            acc(cyl(Vector((1.03, 0.225 * s, 0.46)), Vector((1.03, 0.25 * s, 0.46)), 0.02, material=BLACK))   # integrated slider
    elif name == "rg-radiator-guard":
        g = box(Vector((1.035, 0, 0.60)), (0.012, 0.27, 0.25), material=MESH_BLACK, bevel=0.004, rot=(0, math.radians(-12), 0))
        acc(g)
        for k in range(-5, 6):
            acc(cyl(Vector((1.045 - 0.02, k * 0.024, 0.48)), Vector((1.045 + 0.03, k * 0.024, 0.72)), 0.003, material=ALU, verts=6))
    elif name == "puig-9653n":
        acc(box(Vector((-0.05, 0, 0.76)), (0.16, 0.07, 0.015), material=SATIN_BLACK, bevel=0.004, rot=(0, math.radians(-30), 0)))
        acc(box(Vector((-0.11, 0, 0.66)), (0.01, 0.20, 0.15), material=BLACK, bevel=0.004, rot=(0, math.radians(-20), 0)))
    elif name == "rg-aero-cp0522":
        for s in (1, -1):
            acc(cyl(Vector((0.86, 0.10 * s, 0.62)), Vector((0.86, 0.17 * s, 0.62)), 0.008, material=ALU, verts=10))
            acc(sphere(Vector((0.86, 0.19 * s, 0.62)), (0.035, 0.025, 0.035), material=BLACK))
    elif name == "givi-a1164":
        acc(box(hl + Vector((0.03, 0, 0.17)), (0.006, 0.21, 0.26), material=SMOKE, bevel=0.01, rot=(0, math.radians(-22), 0)))
        for s in (1, -1): acc(cyl(hl + Vector((-0.02, 0.07 * s, 0.05)), hl + Vector((0.02, 0.08 * s, 0.10)), 0.006, material=SATIN_BLACK, verts=8))
    else:
        raise SystemExit(f"unknown accessory {name}")

# ---------------------------------------------------------------- render base + masks
all_objs = [o for o in scene.objects if o.type == "MESH" and o is not ground]
mask_white = bpy.data.materials.new("mask_white"); mask_white.use_nodes = True
mask_black = bpy.data.materials.new("mask_black"); mask_black.use_nodes = True
for m, v in ((mask_white, 1.0), (mask_black, 0.0)):
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs[0].default_value = (v, v, v, 1)
    o = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(e.outputs[0], o.inputs[0])
original = {o.name: [s.material for s in o.material_slots] for o in all_objs}

def set_mask_materials(slug):
    for o in all_objs:
        target = mask_white if o.get("component") == slug else mask_black
        for i in range(len(o.material_slots)): o.material_slots[i].material = target
        if not o.material_slots: o.data.materials.append(target)

def restore():
    for o in all_objs:
        for i, m in enumerate(original[o.name]): o.material_slots[i].material = m

angles = ONLY or list(ANGLES)
if EXPORT_GLB:
    # One GLB with every part named for the web engine: "cmp~<slug>~n", "acc~<id>~n", "stock~<part>~n", "fixed~x~n"
    # ("~" survives three.js node-name sanitising, ":" and "." do not).
    ground.hide_render = True
    bpy.data.objects.remove(ground)
    bike_objs = [o for o in scene.objects if o.type == "MESH"]
    for i, o in enumerate(bike_objs):
        tag = f"cmp~{o['component']}" if o.get("component") else (f"stock~{o['stock']}" if o.get("stock") else "fixed~x")
        o.name = f"{tag}~{i}"
    for acc_id in ["givi-b45-sr1169", "givi-a1164", "rg-radiator-guard", "puig-9653n", "givi-tn1199", "rg-aero-cp0522", "mivv-gp-pro"]:
        before = set(scene.objects)
        build_accessory(acc_id)
        for j, o in enumerate(o for o in scene.objects if o not in before and o.type == "MESH"):
            o.name = f"acc~{acc_id}~{j}"
    for o in scene.objects:
        if o.type not in ("MESH",): o.select_set(False)
        else: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=EXPORT_GLB, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_extras=False, export_materials="EXPORT", export_lights=False, export_cameras=False)
    raise SystemExit(0)
if ACCESSORY:
    build_accessory(ACCESSORY)
    bike = [o for o in scene.objects if o.type == "MESH" and o is not ground and not o.get("accessory")]
    for o in bike: o.is_holdout = True
    if ACCESSORY == "mivv-gp-pro":
        for o in bike:
            if o.get("stock") == "muffler": o.hide_render = True
    ground.hide_render = True
    for name in angles:
        place_camera(*ANGLES[name])
        scene.render.filepath = os.path.join(OUT, f"acc_{ACCESSORY}_{name}.png")
        bpy.ops.render.render(write_still=True)
    raise SystemExit(0)
if CLEANPLATE:
    hidden = set(CLEANPLATE)
    for o in all_objs:
        if o.get("component") in hidden or o.get("stock") in hidden: o.hide_render = True
    tag = "-".join(sorted(hidden))
    for name in angles:
        place_camera(*ANGLES[name])
        scene.render.filepath = os.path.join(OUT, f"clean_{tag}_{name}.png")
        bpy.ops.render.render(write_still=True)
    raise SystemExit(0)
for name in angles:
    place_camera(*ANGLES[name])
    restore(); ground.hide_render = False
    scene.cycles.samples = SAMPLES; scene.cycles.use_denoising = DENOISE
    scene.render.film_transparent = True
    scene.render.filepath = os.path.join(OUT, f"cb125r_{name}.png")
    bpy.ops.render.render(write_still=True)
    # masks: emission-only, 1 sample per pixel area is fine with filter, no shadow catcher
    ground.hide_render = True
    scene.cycles.samples = 16; scene.cycles.use_denoising = False
    for slug in COMPONENTS:
        set_mask_materials(slug)
        scene.render.filepath = os.path.join(OUT, f"mask_{name}_{slug}.png")
        bpy.ops.render.render(write_still=True)
    restore()
print("COMPONENTS", sorted(COMPONENTS))
