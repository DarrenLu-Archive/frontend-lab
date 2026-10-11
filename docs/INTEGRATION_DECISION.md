# frontend-lab 信封整合評估報告

**評估日期**：2026-05-07
**評估對象**：`frontend-lab/` → `saas-wedding-invite/`（喜帖醬）
**評估者**：Claude（不實作，只給結論）

---

## 一、現況盤點

### frontend-lab 信封原型清單（實際檔案）

`frontend-lab/` 中與信封主題相關的 HTML 檔共 **13 個**（含原始 `index.html` 公版）：

| # | 檔名 | 主題 | 主要技術 | 行數 | 完成度 |
|---|------|------|----------|------|--------|
| 1 | `index.html` | 公版紙信封（蠟封 + 3D 翻蓋） | Canvas 三層紙張紋理（噪點+纖維+斑塊）+ CSS perspective/rotateX/preserve-3d | 747 | 高 — 含手機版 V 摺痕、蠟封跟著翻蓋物理旋轉、陰影系統 |
| 2 | `petal-envelope.html` | 雙半圓翻蓋 + 愛心扣 | 純 CSS 三階段動畫 | 468 | 中 — 結構簡單、無紋理 Canvas |
| 3 | `leather-envelope.html` | 深棕皮革 + 金箔蠟封 | Canvas 四層皮革（毛孔+皺褶+磨損+光澤）+ CSS dashed border 縫線 | 628 | 高 |
| 4 | `wood-envelope.html` | 木紋 + 燒印蠟封 | Canvas sin 波年輪 + 木節 + 燒焦邊緣 | 608 | 高 |
| 5 | `velvet-envelope.html` | 紫紅天鵝絨 + 珍珠蠟封 | Canvas 斜向絨毛 + conic-gradient 虹彩 | 642 | 高 |
| 6 | `rosegold-envelope.html` | 玫瑰金箔金屬 | Canvas 刷紋 + 光池 + 閃光點，CSS soft-light | 692 | 高 |
| 7 | `sunset-envelope.html` | 晚霞漸層 + 雲隙光 | CSS + Canvas 雙層漸層 + 光斑 | 734 | 高 |
| 8 | `linen-envelope.html` | 亞麻金線織紋 | Canvas 經緯織紋 + 金線斜插 | 693 | 高 |
| 9 | `cloud-envelope.html` | 黃金時刻雲霧 | 純 CSS 多層橢圓漸層 + 發光蠟封 | 651 | 中高 — Canvas 用得少 |
| 10 | `flower-envelope.html` | 壓花古紙 | Canvas 花瓣/葉片 + 老化紙效果 | 729 | 高 |
| 11 | `silk-envelope.html` | 絲綢光澤 | Canvas 45° 細密織紋 + 雙層 CSS 光帶 | 669 | 高 |
| 12 | `marble-envelope.html` | 暖色大理石金脈 | Canvas 隨機漫步金脈系統（主脈+分支+陰影） | 470 | 高 |
| 13 | `watercolor-envelope.html` | 水彩暈染 | Canvas 14 個羽化色池 + 同心暈染環 | 445 | 高 |

> 註：使用者題目列出 8 款，但 `frontend-lab/` 實際有 13 款信封 + `index.html` 公版。本評估涵蓋全部。
>
> 另有素材圖片：`natural-paper.png`、`cream-paper.png`、`handmade-paper.png`、`paper-fibers.png`、`textured-paper.png`（合計約 340KB），目前看來是早期素材測試，未被任何 HTML 引用。

### saas-wedding-invite 既有信封實作

實際檔案驗證（非推測）：

- **`src/components/wedding-blocks/EnvelopeOpener.tsx`**（295 行）— 已是完整可用元件
  - 使用 framer-motion 做 3D 翻蓋（`rotateX: -180`，800ms easeInOut）
  - 點擊開啟 → 卡片滑出 → RSVP 按鈕，含「重新播放」
  - 信封紋理：純 CSS `linear-gradient`（45° 斜紋方塊），**無 Canvas 紋理**
- **`src/config/envelopeThemes.ts`** — 10 組 pastel 色票（pink/blue/green/yellow/lavender/peach/mint/coral/cream/rose）
  - 命名為 `pastel-*`，但專案 CLAUDE.md 主色系是「莫蘭迪藍」（#486581 系列）
  - 色票是高飽和粉嫩色，與莫蘭迪藍系並存（Builder 讓使用者選一組）
- **`src/components/builder/EnvelopeThemeSelector.tsx`** — 已有切換 UI
- **`src/types/wedding-blocks.ts`** — 型別 `EnvelopeTheme = 'pastel-pink' | ...`

**結論**：喜帖醬已有信封封面元件 + 主題切換系統，但**僅 CSS 純色/漸層，無材質紋理**。

---

## 二、接入成本評估

### 共通成本

每個信封 prototype 從 HTML 接到 React/Next 元件，需要：

1. **重寫成 React 元件**（必做）
   - HTML inline `<script>` 的 Canvas 紋理生成 → 改為 `useEffect` + `useRef<HTMLCanvasElement>`
   - 動畫從 CSS keyframes 改用 framer-motion（與既有 `EnvelopeOpener` 一致）
   - 每個信封原 ~600-700 行 HTML（含 CSS + JS） → 預估壓縮成 ~250-400 行 TSX
2. **整合 design token 衝突問題**
   - frontend-lab 用獨立的 Cormorant Garamond / Noto Serif TC，喜帖醬已用 `var(--color-elegant-*)` token
   - 各信封自帶配色（皮革深棕、天鵝絨紫紅），與莫蘭迪藍系**會撞色**
   - 需新增 `EnvelopeMaterial` 維度（紋理）與既有 `EnvelopeTheme`（色票）正交
3. **紋理圖片**
   - PNG 紋理檔（`natural-paper.png` 等共 340KB）目前**未被使用**，整合時無此問題
   - Canvas 紋理是 runtime 生成，無圖片資產問題；但每次掛載重算（可加 `useMemo` 或 OffscreenCanvas）
4. **效能**
   - Canvas 680×480 三層紋理生成約 30-80ms（行動裝置首次掛載會 jank）
   - 需用 `requestIdleCallback` 或於 `'closed'` 階段預生成
5. **型別系統**
   - `WeddingBlockContent.envelopeTheme` 目前限定 10 個 pastel；新增 material 需擴 schema 與 D1 storage（喜帖儲存於 D1）

### 個別成本評估

| 信封 | 重寫成本 | 莫蘭迪藍系相容 | 接入價值 |
|------|---------|----------------|----------|
| `index.html` 公版 | 中 — 紋理 Canvas 邏輯需抽函式 | 高 — 中性紙色可搭配藍色印泥 | 高 — 是「質感升級」的最低風險選項 |
| `petal-envelope` | 低 — 純 CSS 動畫好移植 | 中 — 結構獨特，適合做 B 公版 | 中 |
| `leather-envelope` | 高 — 四層 Canvas | 低 — 深棕，不搭莫蘭迪藍 | 中 — 適合「復古紳士」風格婚禮 |
| `wood-envelope` | 高 | 低 — 木色與藍系違和 | 低 — 受眾窄 |
| `velvet-envelope` | 高 — conic-gradient 兼容性需驗證 | 低 — 紫紅，但奢華婚禮市場有需求 | 中 |
| `rosegold-envelope` | 中高 | 中 — 玫瑰金可搭藍 | 高 — 婚禮市場主流 |
| `sunset-envelope` | 中 | 中 | 中 |
| `linen-envelope` | 中 | 高 — 米色亞麻是中性底，配藍蠟封可行 | 高 — 自然風受眾大 |
| `cloud-envelope` | 低 — 純 CSS | 高 — 雲霧色易調為藍灰 | 高 — 接入成本最低 |
| `flower-envelope` | 高 — 花瓣 Canvas 邏輯複雜 | 中 | 中 |
| `silk-envelope` | 中 | 中 — 米玫瑰金可調為冷色絲綢 | 中高 |
| `marble-envelope` | 高 — 隨機漫步金脈演算法需小心 | 中 — 大理石可改冷色 | 高 — 高端市場差異化 |
| `watercolor-envelope` | 中 — 14 色池色彩可調 | 高 — 改藍系色池就匹配 | 高 — 文藝風受眾大 |

---

## 三、結論：**部分接（精選 5 款）**

### 不建議全接，理由

1. **13 款一次接 = 預估 2,500-4,000 行新程式碼 + Schema 變更 + 跨 D1 migration**，工程量過大
2. 部分信封與莫蘭迪藍主色系強烈違和（皮革、木紋）
3. 喜帖醬目標市場是「優雅藍系電子喜帖」，不是材質百貨展示
4. 既有 `EnvelopeOpener` 已可運作，沒有「不接就壞掉」的壓力

### 建議接入的 5 款（按優先序）

| 優先 | 信封 | 理由 |
|------|------|------|
| P0 | `index.html` 公版 + `cloud-envelope` | 中性色、Canvas 邏輯可重用、與莫蘭迪藍直接相容 |
| P1 | `linen-envelope` | 自然風主流市場、米色配藍蠟封容易調 |
| P1 | `watercolor-envelope` | 色池可調為藍系、文藝風受眾廣 |
| P2 | `marble-envelope` | 高端差異化、可改冷色金脈 |
| P2 | `rosegold-envelope` | 玫瑰金 × 莫蘭迪藍是目前婚禮主流配色 |

其餘 8 款（皮革、木紋、天鵝絨、晚霞、絲綢、花押、petal、sunset）**保留在 frontend-lab 不接**，未來客製化專案有需求再單獨報價。

---

## 四、Step-by-Step 動工計畫（不實作，僅規劃）

### Phase 0：型別與 Schema 擴充（1 個 PR）

1. 在 `src/types/wedding-blocks.ts` 新增 `EnvelopeMaterial` 型別：
   - `'plain' | 'cloud' | 'linen' | 'watercolor' | 'marble' | 'rosegold'`
2. `WeddingBlockContent` 加 `envelopeMaterial?: EnvelopeMaterial`（optional，預設 `'plain'` 維持相容）
3. Drizzle migration：D1 `projects` 表的 JSON 內容欄位無需變更（已是 free-form JSON）
4. `BuilderEditor` 加一個 material 下拉選單

### Phase 1：抽出 Canvas 紋理生成 utils（1 個 PR）

5. 建立 `src/lib/envelope-textures/`：
   - `paper.ts`、`linen.ts`、`watercolor.ts`、`marble.ts`、`rosegold.ts`、`cloud.ts`
   - 每個檔 export `generateXxxTexture(ctx, w, h, palette)` 函式
   - 從對應 HTML 抽出 Canvas 邏輯，**參數化色票**（接 `themeColors` 而非寫死）
6. 寫 vitest 測試：紋理函式輸出 ImageData 大小正確、不丟例外

### Phase 2：重構 EnvelopeOpener 支援 material 層（1 個 PR）

7. `EnvelopeOpener.tsx` 加 `<canvas ref>` 層在信封 body 上
8. `useEffect` 依 `material` + `themeColors` 呼叫對應 `generateXxxTexture`
9. 蠟封 Canvas 同樣抽 `generateSeal(ctx, sealStyle)`
10. 確認 framer-motion 翻蓋動畫不被 Canvas 干擾（z-index 與 `transform-style: preserve-3d` 順序）

### Phase 3：加入 Builder UI（1 個 PR）

11. `EnvelopeThemeSelector.tsx` 改名/拆為 `EnvelopeStyleSelector.tsx`，含 color + material 兩維選單
12. Material 預覽縮圖：先用靜態 PNG（從 `frontend-lab` 截圖），不要 iframe（效能）
13. 補 e2e Playwright 測試：切換 material → 信封外觀變化 → 點擊翻開動畫正常

### Phase 4：行動裝置效能驗證（驗收 gate）

14. iPhone Safari + Android Chrome 實機測：首次紋理生成 < 200ms
15. 若不達標：改用 `OffscreenCanvas` + Web Worker，或預先 SSR 成 SVG/PNG
16. Lighthouse Mobile Performance 不低於現狀

### Phase 5：上線與監控

17. 灰度開放：先在 admin 帳號可見 material 選項，搜集回饋一週
18. 上 Cloudflare Workers 看 CPU time 沒爆量（Canvas 是 client-side，但 SSR 預渲染若有要小心）
19. 全量開放

---

## 五、風險與不接的取捨

- **不接的風險**：競品可能用更花俏的材質吸客；但喜帖醬定位是「優雅克制」，不一定要追
- **接的風險**：Canvas 紋理在低階手機卡頓，反而劣化體驗；要嚴守 Phase 4 效能 gate
- **建議先做 1-2 款試水溫**（cloud + linen），驗證 Phase 1-3 流程順暢，再決定是否擴到 5 款

---

**評估結論**：**部分接（5 款）**，分 5 個 PR 推進，每階段獨立可驗收；不全接、不放棄。
