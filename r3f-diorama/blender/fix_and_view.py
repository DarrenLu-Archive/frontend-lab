"""修掉 mesh 非法幾何、重新匯出 GLB，並把 viewport 設成等距視角方便截圖檢視。"""

import bpy
import os

OUT_GLB = "/private/tmp/claude-501/-Users-lvshaomin-Desktop-SideProject/320059e3-6362-480f-b921-879f10268e5d/scratchpad/mcpcheck/windtree.glb"
log = []


def L(m):
    log.append(str(m))


obj = bpy.data.objects["WindTree"]
arm_obj = bpy.data.objects["TreeRig"]

# 1. 修 mesh：validate 會移除非法面/重複資料
removed = obj.data.validate(verbose=False)
L(f"validate removed_geometry={removed}")

# 合併過近的重複頂點（cylinder 環與 icosphere 交疊處）
bpy.context.view_layer.objects.active = obj
bpy.ops.object.select_all(action="DESELECT")
obj.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.0006)
bpy.ops.mesh.normals_make_consistent(inside=False)
bpy.ops.object.mode_set(mode="OBJECT")
L(f"after cleanup verts={len(obj.data.vertices)} faces={len(obj.data.polygons)}")
L(f"validate again={obj.data.validate(verbose=False)}")

# 平滑著色 + 自動平滑角度，讓低多邊形樹幹不出現硬稜
for poly in obj.data.polygons:
    poly.use_smooth = True

# 2. 重新匯出
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
    export_yup=True,
    export_materials="EXPORT",
)
L(f"GLB {os.path.getsize(OUT_GLB) / 1024:.1f} KB")

# 3. viewport 設等距視角 + material preview，並 frame all
for area in bpy.context.screen.areas:
    if area.type != "VIEW_3D":
        continue
    space = area.spaces.active
    space.shading.type = "MATERIAL"
    space.overlay.show_overlays = False
    for region in area.regions:
        if region.type == "WINDOW":
            with bpy.context.temp_override(area=area, region=region, space_data=space):
                bpy.ops.view3d.view_axis(type="FRONT")
                bpy.ops.view3d.view_orbit(angle=0.7854, type="ORBITRIGHT")
                bpy.ops.view3d.view_orbit(angle=0.6109, type="ORBITUP")
                bpy.ops.view3d.view_all()
            L("viewport framed")
            break

bpy.context.scene.frame_set(30)
print("RESULT>>>" + " | ".join(log))
