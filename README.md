# 前端質感研究 — Frontend Lab

數位信封、紋理生成、材質模擬等前端實驗。

## 目錄結構

```
frontend-lab/
├── cinematic-envelope/    # 現行活躍：電影感信封開啟動畫（2026-07 重做）
├── material-envelopes/    # 材質信封系列 13 款 + showcase（2026-04，已封存供取材）
├── proposal/              # 電子喜帖服務提案與報價單（PDF 生成腳本）
└── docs/                  # 技術筆記與整合評估報告
```

## cinematic-envelope/ — 電影感信封開啟動畫（現行）

依 TikTok 婚禮邀請參考影片逐格重做的開啟動畫（2026-07-09）：蠟封字樣速融留壓痕、翻蓋受光掀起、曝光洗白、暗場卡片依序浮字。

- `cinematic-envelope.html` — v2 主實作（純 CSS @keyframes + Canvas 2D 貼圖；`?auto` 自動播放、`?seek=N` 定格驗證 hook；可直接 file:// 開啟）
- `cinematic-envelope-v3-webgl.html` — **v3（2026-07-12）**：WebGL 法線貼圖打光版，**單一自足檔案，雙擊（file://）即可開啟**（OGL 與貼圖已內嵌，共 249KB）。蠟封＝高度圖→法線→Blinn-Phong 真浮雕（Italianno 刻字壓進高度圖）、紙張＝ambientCG 真實掃描法線貼圖、翻蓋掀起 0.7s 內逐幀真算受光、壓痕＝浮雕殘留。雙層架構：互動與 v2 級視覺用普通 script 保證先動，WebGL 增強層獨立執行、失敗自動留在 v2 視覺。靜態載入時烘焙一次、動畫只跑 transform（效能研究結論）
- `lib/ogl.min.mjs` — OGL 1.0.11 原始 bundle（jsDelivr ESM，github.com/oframe/ogl）；已內嵌進 v3，此檔留作再生成來源
- `assets/` — ambientCG Paper002 法線/色彩貼圖 1K 原檔（CC0，來源見 SOURCES.txt）；v3 內嵌的是 512px 壓縮版
- `cinematic-envelope-sbs.mp4` — 參考對照影片（左＝目標原片、右＝舊版實作）
- `cinematic-envelope-sbs-v2.mp4` — v2 驗證影片（左＝原片、右＝v2，16 格逐格對齊）

## material-envelopes/ — 材質信封系列（2026-04）

13 款材質信封原型＋Gallery 總覽（`showcase.html`，iframe 縮圖分組展示）。純 HTML/CSS/JS＋Canvas 2D 紋理生成，不依賴外部圖片素材（僅共用同資料夾內 5 張紙紋 PNG 作底圖）。

| 檔案 | 主題 |
|---|---|
| `index.html` | 公版紙信封（Canvas 三層紙紋＋蠟封＋3D 翻蓋＋手機版 V 摺痕） |
| `petal-envelope.html` | 雙半圓翻蓋＋愛心扣，三階段動畫 |
| `leather-envelope.html` | 深棕皮革＋金箔蠟封＋縫線裝飾 |
| `wood-envelope.html` | 木紋年輪＋燒印蠟封＋木框邊飾 |
| `velvet-envelope.html` | 紫紅天鵝絨＋珍珠虹彩蠟封 |
| `rosegold-envelope.html` | 玫瑰金屬刷紋＋珍珠蠟封 |
| `sunset-envelope.html` | 晚霞漸層＋雲隙光 |
| `linen-envelope.html` | 亞麻經緯織紋＋金線穿插 |
| `cloud-envelope.html` | 金時雲霧＋發光蠟封 |
| `flower-envelope.html` | 壓花古紙＋植物紋蠟封 |
| `silk-envelope.html` | 絲綢斜織紋＋多角度光帶 |
| `marble-envelope.html` | 暖色大理石＋隨機漫步金脈 |
| `watercolor-envelope.html` | 水彩暈染色池 |

各款的技術細節（紋理生成層數、光影手法）見 git 歷史版 README 或直接讀各檔內註解。

## proposal/ — 服務提案文件

- `proposal.md` — 提案內容（Markdown 原稿）
- `generate_pdf.py` — PDF 生成腳本（fpdf2＋微軟正黑體，輸出到同資料夾）
- `2026 電子喜帖與感謝卡片 提案與報價單.pdf` — 最終輸出

## docs/ — 技術筆記

- `TECHNIQUES.md` — 3D 翻蓋物理邏輯、`preserve-3d` 踩坑、Canvas 紋理生成細節
- `INTEGRATION_DECISION.md` — frontend-lab → 喜帖醬（saas-wedding-invite）整合評估報告（2026-05-07）

## 技術棧

- 純 HTML / CSS / JavaScript
- Canvas 2D API（紋理生成）
- CSS 3D Transforms + `transform-style: preserve-3d`
- Google Fonts（Cormorant Garamond / Noto Serif TC）
