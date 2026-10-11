"""在 Blender 啟動時自動安裝並啟用 blender-mcp addon，然後開 socket server。
取代 README 要求的三步 GUI 操作（Preferences > Add-ons > Install → 勾選 → 側邊欄 Connect）。
"""

import bpy
import os
import sys
import traceback

ADDON_SRC = "/private/tmp/claude-501/-Users-lvshaomin-Desktop-SideProject/320059e3-6362-480f-b921-879f10268e5d/scratchpad/mcpcheck/addon.py"
LOG = "/private/tmp/claude-501/-Users-lvshaomin-Desktop-SideProject/320059e3-6362-480f-b921-879f10268e5d/scratchpad/mcpcheck/bootstrap.log"


def log(msg):
    print(f"[bootstrap] {msg}")
    with open(LOG, "a") as f:
        f.write(f"{msg}\n")


def main():
    log(f"blender {bpy.app.version_string}")

    # 1. 安裝 addon（複製到 scripts/addons，模組名為 addon）
    bpy.ops.preferences.addon_install(overwrite=True, filepath=ADDON_SRC)
    log("addon_install ok")

    # 2. 啟用
    for module_name in ("addon", "bl_ext.user_default.addon"):
        try:
            bpy.ops.preferences.addon_enable(module=module_name)
            log(f"addon_enable ok: {module_name}")
            break
        except Exception as e:
            log(f"addon_enable failed for {module_name}: {e}")

    # 3. 確認遙測同意為關閉（預設 False，這裡明確寫死並存檔）
    for key in list(bpy.context.preferences.addons.keys()):
        if "addon" in key:
            prefs = bpy.context.preferences.addons[key].preferences
            if hasattr(prefs, "telemetry_consent"):
                prefs.telemetry_consent = False
                log(f"telemetry_consent=False set on {key}")

    bpy.ops.wm.save_userpref()
    log("userpref saved")

    # 4. 開 socket server（localhost:9876）
    try:
        bpy.ops.blendermcp.start_server()
        log("start_server ok -> localhost:9876")
    except Exception as e:
        log(f"start_server FAILED: {e}")
        traceback.print_exc()

    log("READY")


try:
    main()
except Exception:
    log("FATAL")
    with open(LOG, "a") as f:
        traceback.print_exc(file=f)
