# 數位信封喜帖 — 前端質感技巧筆記

## 概述

在網頁上重現「實體信封 + 蠟封」的質感，核心挑戰是讓數位畫面看起來不像廉價的 CSS 色塊。本文件記錄開發過程中的關鍵技巧與踩坑經驗。

---

## 1. 紙張紋理：Canvas 逐像素生成

### 為什麼不用 CSS？

| 方案 | 結果 |
|------|------|
| 純色 `background-color` | 完全平面，塑膠感 |
| CSS `linear-gradient` 疊加 | 有漸層但沒有纖維感 |
| SVG `feTurbulence` filter | 偏灰、偏假，像 Photoshop 濾鏡 |
| 透明紋理 PNG 疊加 | 紋路太淡，在深色底上幾乎看不見 |
| **Canvas 逐像素生成** | **最接近真實紙張** |

### 三層疊加法

```javascript
function makePaperTexture(canvas, w, h, baseR, baseG, baseB) {
  // Layer 1: 細微噪點 — 每個像素隨機偏移 ±11
  // 模擬紙張表面的微觀不規則
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    data[i] += n; data[i+1] += n; data[i+2] += n;
  }

  // Layer 2: 纖維線條 — 水平方向偏移的短線段
  // 模擬紙漿中的植物纖維
  for (let f = 0; f < 1200; f++) {
    // 每條纖維: 8~43px 長，水平走向，隨機亮度
  }

  // Layer 3: 柔和斑塊 — 大面積明暗變化
  // 模擬紙張的厚薄不均
  for (let b = 0; b < 50; b++) {
    // 每個斑塊: 半徑 12~52px，用 falloff² 柔化邊緣
  }
}
```

### 關鍵參數

- Canvas 尺寸用 **2x CSS 尺寸**（如 340×240 → 680×480），確保 Retina 清晰
- 噪點強度 `22` 是甜蜜點，太低看不見，太高變電視雪花
- 纖維數量 `1200` 適合 680px 寬度，密度約 1.7 條/px
- 斑塊的 `falloff²` (quadratic) 比線性更自然

---

## 2. 蠟封/印泥質感：Canvas + CSS 多層

### 與紙張的差異

紙張是「平面 + 纖維」，印泥是「立體 + 顆粒」。需要額外處理：

1. **徑向漸層底色** — 中心亮邊緣暗，模擬凸起表面的受光
2. **帶暖色的噪點** — R 通道額外偏移，蠟天然偏暖
3. **顆粒感** — 比紙張噪點更大（±25），每個顆粒影響周圍 3×3 像素
4. **邊緣壓痕** — radial gradient 在 82%~100% 區間做亮暗交替

### CSS 輔助層（疊在 Canvas 上方）

```css
/* 頂光反射 — 模擬光源從左上打下 */
.seal-disc::after {
  background:
    radial-gradient(ellipse at 35% 28%, rgba(255,255,255,0.35) 0%, transparent 40%),
    radial-gradient(ellipse at 65% 70%, rgba(0,0,0,0.06) 0%, transparent 35%);
}

/* 邊緣立體感 — inset shadow 模擬厚度 */
.seal-shadow {
  box-shadow:
    inset 0 2px 3px rgba(255,255,255,0.4),   /* 頂部亮邊 */
    inset 0 -2px 4px rgba(0,0,0,0.08),        /* 底部暗邊 */
    inset 2px 0 3px rgba(255,255,255,0.15),    /* 左亮 */
    inset -2px 0 3px rgba(0,0,0,0.05),         /* 右暗 */
    0 3px 8px rgba(0,0,0,0.14);                /* 投射陰影 */
}

/* 凹刻文字 — text-shadow 做上暗下亮 */
.seal-text {
  color: rgba(160,150,140,0.35);
  text-shadow:
    0 -0.5px 0 rgba(0,0,0,0.06),   /* 上方暗邊 = 凹下去 */
    0 1px 0 rgba(255,255,255,0.35); /* 下方亮邊 = 光照 */
}
```

---

## 3. 信封 3D 翻蓋動畫：正確的物理邏輯

### 核心概念

信封蓋是一個三角形，**鉸鏈在信封最上方**。打開時，蓋子的 V 尖端（底部）往後翻轉，遠離觀看者。

### CSS 3D 系統配置（重要！）

```
                    ┌─ perspective ──┐
                    │                │
.envelope-outer     │  filter: drop-shadow()  ← 陰影放這，不影響 3D
  .envelope         │  perspective: 1000px    ← 3D 視角放父元素
    .env-body       │                         ← 信封底層
    .flap-shadow    │                         ← 固定在表面的陰影
    .fold-svg       │                         ← V 摺痕裝飾
    .env-flap-wrapper  transform-style: preserve-3d  ← 3D 容器
      .env-flap     │  clip-path: polygon()   ← 三角形裁切
      .seal         │                         ← 蠟封（子元素，自動跟旋轉）
```

### 關鍵規則

| 屬性 | 放在哪 | 為什麼 |
|------|--------|--------|
| `perspective` | `.envelope`（父元素） | 放在 transform 函式裡會造成大小變形 |
| `transform-style: preserve-3d` | `.envelope` + `.env-flap-wrapper` | 子元素在同一 3D 空間中 |
| `filter` | `.envelope-outer`（更外層） | `filter` 會**破壞** `preserve-3d` |
| `transform-origin` | `center top`（wrapper 上） | 鉸鏈在信封最上方 |
| 蠟封 | wrapper 的子元素 | 自動跟著 3D 旋轉，不需額外動畫 |

### 旋轉方向

```css
.env-flap-wrapper {
  transform-origin: center top;
  transform: rotateX(0deg);     /* 關閉：蓋子平貼在信封上 */
}
/* 打開 */
.env-flap-wrapper {
  transform: rotateX(160deg);   /* V 尖端往後翻到信封背面 */
}
```

`rotateX(正值)` = 元素底部遠離觀看者。因為 `transform-origin: top`，頂邊（鉸鏈）不動，V 尖端往後翻。

### 踩坑：perspective() 放錯位置

```css
/* ✗ 錯誤：perspective 在 transform 函式裡 */
.wrapper {
  transform: perspective(800px) rotateX(40deg);
  /* → 透視投影作用在元素本身，子元素（蠟封）會縮放變形 */
}

/* ✓ 正確：perspective 在父元素上 */
.envelope {
  perspective: 1000px;
}
.wrapper {
  transform: rotateX(40deg);
  /* → 透視由父元素提供，子元素大小不變 */
}
```

### 踩坑：filter 破壞 3D

```css
/* ✗ 錯誤 */
.env-flap-wrapper {
  filter: drop-shadow(0 8px 20px rgba(0,0,0,0.15));
  transform-style: preserve-3d;
  /* → filter 建立新的合成層，強制 flatten 3D 上下文 */
  /* → 子元素（蠟封）不再參與 3D 旋轉 */
}

/* ✓ 正確：filter 放在更外層 */
.envelope-outer {
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.06));
}
```

---

## 4. 翻蓋陰影：利用 3D 空間自然遮擋

### 物理邏輯

光從上方照下。蓋子關閉時遮住下方的紙面，打開時 V 尖端先離開，露出被遮住的區域。那個區域因為蓋子還在上方擋光，所以有陰影。

### CSS 實現

```css
/* 陰影固定在信封表面，跟蓋子同形三角形 */
.flap-shadow {
  position: absolute; inset: 0;
  clip-path: polygon(0% 0%, 100% 0%, 100% 28%, 50% 42%, 0% 28%);
  background: linear-gradient(to top,
    rgba(0,0,0,0.18) 0%,    /* V 尖端最暗 */
    rgba(0,0,0,0.03) 80%,
    transparent 100%);        /* 頂部（近鉸鏈）無陰影 */
  opacity: 1;  /* 始終存在 */
}
```

陰影不需要 opacity 動畫來「顯現」！透過 `transform-style: preserve-3d`，蓋子在 3D 空間中旋轉時，V 尖端移到信封平面後方，瀏覽器的 3D 渲染自動讓陰影從 V 尖端處逐漸露出。

Phase 2（蓋子完全打開後）再用 `opacity: 0` 讓陰影消散（模擬光線照到）。

---

## 5. 信封結構：一個長方形

桌面版信封是一個**純長方形**。蓋子是長方形內部的三角形覆蓋層，用 V 摺痕線標示邊界。

### V 摺痕線

摺痕從畫面外以淺角度延伸進來，交會在 42% 高度處。**不是從角落出發的對角線**。

```
SVG viewBox="0 0 100 100"
上方左線：(-30, 20) → (50, 42)   // 從左邊畫面外進入
上方右線：(130, 20) → (50, 42)   // 從右邊畫面外進入
```

每條摺痕由三層組成：寬柔陰影 + 銳利摺痕線 + 高光線。

### 蓋子三角形 clip-path

```css
.env-flap {
  clip-path: polygon(0% 0%, 100% 0%, 100% 28%, 50% 42%, 0% 28%);
}
```

28% 和 42% 對應 V 摺痕線進入信封的位置和交會點。

---

## 6. 動畫時序

```
0.0s ─── Phase 1: 蓋子開始旋轉 (rotateX 40°)
         摺痕線淡出
         蠟封呼吸動畫停止
0.9s ─── Phase 2: 蓋子繼續旋轉 (rotateX 160°) + 淡出
         蠟封淡出
         信封整體退場
         陰影消散
1.6s ─── Phase 3: 卡片進場
```

### 蠟封行為

蠟封是蓋子 wrapper 的子元素，**不需要**獨立的 transform 動畫。它自動：
- 跟著蓋子旋轉（因為是子元素）
- 保持原始大小（因為 perspective 在父元素上，不在 transform 裡）
- Phase 2 時單純 `opacity: 0` 淡出

---

## 7. 手機版：全螢幕信封特寫

### 設計思路

手機螢幕 = 信封正面的特寫。不是看到完整的信封外型，而是只看到**中間那一段**。

### 結構

```
.envelope-outer   ← position: fixed; inset: 0 （撐滿螢幕）
  .envelope       ← width: 100%; height: 100%; perspective: 1200px
    ...（跟桌面版相同的子元素結構）
```

`filter: drop-shadow()` 在手機版設為 `none`（全螢幕不需要外框陰影）。

Canvas 紋理尺寸跟著螢幕大小動態調整：
```javascript
const sw = Math.ceil(window.innerWidth * dpr);
const sh = Math.ceil(window.innerHeight * dpr);
makePaperTexture(envCanvas, sw, sh, 201, 189, 179);
```

---

## 8. 壓印立體感：凸起外圈 + 凹陷中心

### 截面示意

```
      ╱‾‾‾‾‾‾‾╲         ← 外圈凸起
     ╱    ____   ╲
    ╱   ╱      ╲   ╲     ← 中心凹陷
───╱───╱────────╲───╲─── ← 紙面
```

### CSS 實現

```css
/* 外圈凸起 — 多層 inset shadow */
.seal-shadow {
  box-shadow:
    inset 0 3px 4px rgba(255,255,255,0.45),   /* 頂部亮 = 凸起受光 */
    inset 0 -3px 5px rgba(0,0,0,0.12),         /* 底部暗 = 凸起背光 */
    0 2px 6px rgba(0,0,0,0.12);                 /* 投射陰影 = 凸出紙面 */
}

/* 中心凹陷 — 獨立 div */
.seal-center-dip {
  inset: 15%;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.08);  /* 上方暗 = 凹下去 */
  background: radial-gradient(rgba(0,0,0,0.03), transparent);
}
```

---

## 9. 素材來源

| 素材 | 來源 | 用途 |
|------|------|------|
| `natural-paper.png` | [Transparent Textures](https://www.transparenttextures.com/) | 背景紋理 |
| `cream-paper.png` | 同上 | 卡片紋理 |
| `textured-paper.png` | 同上 | 蠟封紋理覆蓋 |
| Canvas 生成 | 自製 | 信封 / 翻蓋 / 蠟封主紋理 |

---

## 10. 可改進方向

- **陀螺儀互動**：手機傾斜時蠟封高光跟著移動（`DeviceOrientationEvent`）
- **GSAP 動畫**：更精確的時間軸控制，支援暫停/倒轉
- **真實紙張掃描**：用 300dpi 掃描實體紙張作為紋理，效果最逼真
- **WebGL 材質**：Three.js 的 MeshPhysicalMaterial 可做真實蠟面反射
- **花瓣扣信封**：`petal-envelope.html` 已有初版，待完善開啟動畫
