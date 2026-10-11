"""在 Blender 內建一棵帶骨架的樹，並烘出可循環的風吹動畫，匯出 GLB。

風吹的關鍵不是「整棵樹左右搖」，而是**風波沿骨骼鏈往末梢傳遞**：
每根骨骼的擺動相位隨層級延遲、擺幅隨層級放大，末梢因此比樹幹晚一步且晃得更誇張。
"""

import bpy
import bmesh
import math
import random
from mathutils import Vector

random.seed(7)

FPS = 24
LOOP_FRAMES = 120  # 5 秒完美循環
WIND_DIR = Vector((1.0, 0.35, 0.0)).normalized()

OUT_GLB = "/private/tmp/claude-501/-Users-lvshaomin-Desktop-SideProject/320059e3-6362-480f-b921-879f10268e5d/scratchpad/mcpcheck/windtree.glb"

log = []


def L(msg):
    log.append(str(msg))


# ---------------------------------------------------------------- 清空場景
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
for block in (
    bpy.data.meshes,
    bpy.data.armatures,
    bpy.data.materials,
    bpy.data.actions,
):
    for item in list(block):
        block.remove(item)

scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 1
scene.frame_end = LOOP_FRAMES

# ---------------------------------------------------------------- 樹骨架定義
# segments: (name, start, end, radius_start, radius_end, depth, parent_name)
segments = []


def add_segment(name, start, direction, length, r0, r1, depth, parent):
    end = start + direction.normalized() * length
    segments.append(
        dict(
            name=name,
            start=start.copy(),
            end=end,
            r0=r0,
            r1=r1,
            depth=depth,
            parent=parent,
        )
    )
    return end


def grow(name, start, direction, length, r0, r1, depth, parent, max_depth=3):
    end = add_segment(name, start, direction, length, r0, r1, depth, parent)
    if depth >= max_depth:
        return
    children = 3 if depth == 0 else 2
    for i in range(children):
        az = (i / children) * math.tau + random.uniform(0, 0.9) + depth
        tilt = random.uniform(0.55, 0.85) if depth == 0 else random.uniform(0.35, 0.7)
        d = Vector(
            (
                math.sin(az) * math.sin(tilt),
                math.cos(az) * math.sin(tilt),
                math.cos(tilt),
            )
        )
        if depth > 0:
            d = (d + direction.normalized() * 0.9).normalized()
        grow(
            f"{name}_{i}",
            end
            if depth > 0
            else start + direction.normalized() * length * random.uniform(0.55, 0.95),
            d,
            length * random.uniform(0.55, 0.72),
            r1,
            r1 * 0.6,
            depth + 1,
            name,
            max_depth,
        )


# Blender 是 Z-up
grow("trunk", Vector((0, 0, 0)), Vector((0, 0, 1)), 3.2, 0.34, 0.20, 0, None)
L(f"segments: {len(segments)}")

# ---------------------------------------------------------------- 建樹幹 mesh
mesh = bpy.data.meshes.new("TreeMesh")
obj = bpy.data.objects.new("WindTree", mesh)
bpy.context.collection.objects.link(obj)

bm = bmesh.new()

for seg in segments:
    d = seg["end"] - seg["start"]
    length = d.length
    # 沿枝條切成多段，骨骼變形才會平滑（單段圓柱會折斷成硬角）
    rings = max(3, int(length / 0.35))
    ring_verts = []
    sides = 8 if seg["depth"] == 0 else 6
    quat = d.normalized().to_track_quat("Z", "Y")

    for ri in range(rings + 1):
        t = ri / rings
        centre = seg["start"] + d * t
        radius = seg["r0"] * (1 - t) + seg["r1"] * t
        verts = []
        for si in range(sides):
            a = (si / sides) * math.tau
            local = Vector((math.cos(a) * radius, math.sin(a) * radius, 0))
            verts.append(bm.verts.new(centre + quat @ local))
        ring_verts.append(verts)

    for ri in range(rings):
        a, b = ring_verts[ri], ring_verts[ri + 1]
        for si in range(sides):
            sj = (si + 1) % sides
            bm.faces.new((a[si], a[sj], b[sj], b[si]))

# 樹冠：末端枝條各掛一顆低多邊形球
crown_centres = []
for seg in segments:
    if seg["depth"] < 3:
        continue
    c = seg["end"]
    r = random.uniform(0.62, 0.92)
    crown_centres.append((c, r))
    bmesh.ops.create_icosphere(
        bm,
        subdivisions=2,
        radius=r,
        matrix=__import__("mathutils").Matrix.Translation(c),
    )

L(f"crown balls: {len(crown_centres)}")
bm.to_mesh(mesh)
bm.free()
L(f"verts: {len(mesh.vertices)}  faces: {len(mesh.polygons)}")

# ---------------------------------------------------------------- 建 armature
bpy.ops.object.armature_add(enter_editmode=False, location=(0, 0, 0))
arm_obj = bpy.context.object
arm_obj.name = "TreeRig"
arm = arm_obj.data
arm.name = "TreeArm"

bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="EDIT")
for b in list(arm.edit_bones):
    arm.edit_bones.remove(b)

edit_bones = {}
for seg in segments:
    eb = arm.edit_bones.new(seg["name"])
    eb.head = seg["start"]
    eb.tail = seg["end"]
    # 讓骨骼吃到整根枝條的體積，automatic weights 才綁得住
    eb.envelope_distance = max(seg["r0"], 0.25) * 2.6
    edit_bones[seg["name"]] = eb

for seg in segments:
    if seg["parent"]:
        eb = edit_bones[seg["name"]]
        eb.parent = edit_bones[seg["parent"]]
        eb.use_connect = False

bpy.ops.object.mode_set(mode="OBJECT")
L(f"bones: {len(arm.bones)}")

# ---------------------------------------------------------------- 綁定
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
arm_obj.select_set(True)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
L(f"vertex groups: {len(obj.vertex_groups)}")


# ---------------------------------------------------------------- 材質
def make_mat(name, rgba, rough=0.85):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = rough
    return m


bark = make_mat("Bark", (0.29, 0.17, 0.09, 1.0))
leaf = make_mat("Leaf", (0.13, 0.36, 0.14, 1.0), 0.9)
obj.data.materials.append(bark)
obj.data.materials.append(leaf)

# 樹冠面指到葉子材質：以「離某顆樹冠球心足夠近」判定
leaf_idx = 1
for poly in obj.data.polygons:
    centre = Vector(poly.center)
    for c, r in crown_centres:
        if (centre - c).length < r * 1.15:
            poly.material_index = leaf_idx
            break

# ---------------------------------------------------------------- 風吹動畫
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode="POSE")

depth_of = {s["name"]: s["depth"] for s in segments}
max_depth = max(depth_of.values())

for pb in arm_obj.pose.bones:
    pb.rotation_mode = "XYZ"

# 每 4 幀一個 key，動畫曲線夠平滑又不會塞爆 GLB
STEP = 4
for frame in range(1, LOOP_FRAMES + 1, STEP):
    t = (frame - 1) / LOOP_FRAMES  # 0..1 完整循環
    for pb in arm_obj.pose.bones:
        d = depth_of.get(pb.name, 0)
        # 相位延遲：風波從樹幹往末梢傳
        phase = -d * 0.7
        # 擺幅：末梢比樹幹誇張得多
        amp = 0.022 + 0.058 * (d / max_depth)
        # 主風（1 週期）+ 顫動（3 週期），兩者都整數週期才能無縫循環
        sway = math.sin(t * math.tau + phase) + 0.35 * math.sin(
            t * math.tau * 3 + phase * 2
        )
        cross = 0.4 * math.sin(t * math.tau * 2 + phase * 1.6)

        pb.rotation_euler[0] = amp * sway * WIND_DIR.y + amp * cross * 0.5
        pb.rotation_euler[1] = amp * sway * WIND_DIR.x
        pb.rotation_euler[2] = amp * cross * 0.35
        pb.keyframe_insert(data_path="rotation_euler", frame=frame)

# 收尾：把最後一幀對回第一幀，循環才不會跳
for pb in arm_obj.pose.bones:
    d = depth_of.get(pb.name, 0)
    phase = -d * 0.7
    amp = 0.022 + 0.058 * (d / max_depth)
    sway = math.sin(0 + phase) + 0.35 * math.sin(phase * 2)
    cross = 0.4 * math.sin(phase * 1.6)
    pb.rotation_euler[0] = amp * sway * WIND_DIR.y + amp * cross * 0.5
    pb.rotation_euler[1] = amp * sway * WIND_DIR.x
    pb.rotation_euler[2] = amp * cross * 0.35
    pb.keyframe_insert(data_path="rotation_euler", frame=LOOP_FRAMES + 1)

bpy.ops.object.mode_set(mode="OBJECT")

action = arm_obj.animation_data.action
action.name = "WindLoop"


def all_fcurves(act):
    """Blender 4.4+ 把 fcurves 移進 layers>strips>channelbags（slotted actions），
    舊版才有 act.fcurves"""
    out = []
    for layer in getattr(act, "layers", []):
        for strip in layer.strips:
            for cbag in getattr(strip, "channelbags", []):
                out.extend(cbag.fcurves)
    if not out:
        out = list(getattr(act, "fcurves", []))
    return out


fcurves = all_fcurves(action)
L(f"action: {action.name}  fcurves: {len(fcurves)}  range: {tuple(action.frame_range)}")

# 曲線設為平滑插值
for fc in fcurves:
    for kp in fc.keyframe_points:
        kp.interpolation = "BEZIER"

# ---------------------------------------------------------------- 匯出 GLB
scene.frame_end = LOOP_FRAMES + 1
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
arm_obj.select_set(True)

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    use_selection=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_bake_animation=False,
    export_apply=False,
    export_yup=True,  # Blender Z-up -> glTF Y-up
    export_materials="EXPORT",
)

import os

size = os.path.getsize(OUT_GLB)
L(f"GLB: {OUT_GLB}  {size / 1024:.1f} KB")

print("RESULT>>>" + " | ".join(log))
