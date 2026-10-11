# Blender 路線：骨骼風吹動畫 → GLB → R3F

這個資料夾是「用 AI 驅動 Blender 產出動畫資產」那條路線的完整可重現流程。
與 repo 內另兩個場景相反 —— 這條路**不是零素材**，產出物是 `public/windtree.glb`（130 KB）。

## 為什麼要走這條路

零素材（純幾何體 + `useFrame`）做得到 scale/rotation/position 的動畫，但做不到**網格變形**。
風吹樹的說服力來自枝條本身彎曲、而且風波沿骨骼鏈往末梢傳遞（末梢比樹幹晚一步、晃得更誇張），
那需要 skinned mesh —— 手寫幾何體無法做到。

## 檔案

| 檔案 | 用途 |
|---|---|
| `bootstrap.py` | 用 `blender --python` 自動安裝並啟用 blender-mcp addon、關閉遙測、開 socket server。取代 README 要求的三步 GUI 操作 |
| `bmcp.py` | 直接說 addon 的 JSON-over-TCP 協議（`127.0.0.1:9876`）。MCP server 只是這層協議的轉譯，所以不必經過它 |
| `build_tree.py` | 建樹（22 段枝條 + 12 顆樹冠球）、建 22 根骨架、automatic weights 綁定、烘 5 秒循環風吹動畫、匯出 GLB |
| `fix_and_view.py` | mesh validate + 合併重複頂點 + 統一法線 + 平滑著色，重新匯出；順便把 viewport 轉成等距視角 |
| `windtree.blend` | 可再編輯的源檔 |

## 重跑流程

```bash
# 1. 開 Blender 並自動掛上 addon + 開 server（會出現 Blender 視窗）
DISABLE_TELEMETRY=true /Applications/Blender.app/Contents/MacOS/Blender --python bootstrap.py

# 2. 另一個終端：建樹 + 烘動畫 + 匯出 GLB
python3 bmcp.py code build_tree.py
python3 bmcp.py code fix_and_view.py
python3 bmcp.py shot "$PWD/blender-viewport.png"

# 3. 放進網頁
cp windtree.glb ../public/
```

對話式操作（需重啟 Claude Code session 才會載入 MCP）：
```bash
claude mcp add blender --env DISABLE_TELEMETRY=true -- uvx blender-mcp
```

## 風吹動畫的做法

```python
phase = -depth * 0.7                      # 相位延遲：風波往末梢傳
amp   = 0.022 + 0.058 * (depth/max_depth) # 擺幅：末梢比樹幹誇張
sway  = sin(t*τ + phase) + 0.35*sin(t*τ*3 + phase*2)   # 主風 + 顫動
cross = 0.4 * sin(t*τ*2 + phase*1.6)                   # 側向擺動，避免只在一個平面上晃
```

**兩個頻率都必須是整數週期**（1、2、3），否則首尾對不上、循環會跳。
最後再補一格 `LOOP_FRAMES+1` 把姿態對回第一幀。

## 驗證數字（2026-07-26）

| 項目 | 結果 |
|---|---|
| 骨骼 / 頂點 / 面 | 22 / 1142 / 1464 |
| 動畫曲線 | 66 條（22 骨 × 3 軸旋轉），120 幀 @ 24fps |
| GLB | 130 KB（含骨骼動畫與 2 個材質） |
| 網頁播放（像素差異法） | seek 0 vs 2.5s = **2.35%**（確實在動）；seek 0 vs 5.0s = **0.10%**（循環無縫） |

## 踩雷紀錄

- **Blender 5.x 移除了 `action.fcurves`**。4.4 起改成 slotted actions，曲線在 `action.layers[].strips[].channelbags[].fcurves`。舊教學的寫法會直接 `AttributeError`。
- **`Mesh is not valid` 匯出警告**：原因是 bmesh 手工建面後法線未統一。跑 `mesh.validate()` + `normals_make_consistent()` 即可，順手做平滑著色還讓 GLB 從 259 KB 降到 130 KB（法線可共用頂點）。
- **骨骼要撐開 envelope**：`envelope_distance` 沒設夠大，`ARMATURE_AUTO` 綁不到枝條頂點，樹會在動畫時散開。
- **枝條要切成多段**：單段圓柱被骨骼變形時會折成硬角，沿長度每 0.35 單位切一環才彎得平順。
- **addon 的 `get_viewport_screenshot` 要傳絕對路徑**，相對路徑會落在 Blender 的工作目錄而不是你的 cwd。
- **glTF 每頂點只吃 4 個骨骼權重**，超過會有 `more than 4 joint vertex influences` 警告並自動取權重最高的 4 個。樹這種細長鏈結構通常無感，角色要注意。
