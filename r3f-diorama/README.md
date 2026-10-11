# r3f-diorama — 零素材 3D 場景與動畫實驗

驗證題：**完全不引入任何外部素材（貼圖／模型／HDRI／字型檔）的前提下，R3F 能把等距 3D 場景與動畫做到什麼品質。**

三個場景：
- **成長大樹 + 果實 pop**（`GrowingTree`，零素材）— 樹逐節生長 → 樹冠依序彈出 → 每個成員化為一顆果實 pop 上樹。支援「事件觸發時再長一顆」的增量模式。
- **風吹大樹**（`WindTree`，**非**零素材）— Blender 產的 22 骨骼 skinned mesh + 5 秒無縫循環動畫，匯出 GLB（130 KB）給網頁播。完整可重現流程見 [`blender/`](blender/)。這是為了對照「零素材做不到什麼」：網格變形。
- **木質書房 diorama**（`StudyRoomDiorama`，零素材）— 靜態等距場景，測純幾何體的質感天花板。

## 跑起來

```bash
npm install
npm run dev        # http://localhost:5183
```

## 檔案

| 檔案 | 說明 |
|---|---|
| `src/GrowingTree.jsx` | 大樹動畫，單一自包含元件。含樹骨架程序生成、時間軸、Canvas／光影／相機 |
| `src/WindTree.jsx` | 載入 `public/windtree.glb`，用 `useAnimations` 播骨骼風吹動畫 |
| `src/StudyRoomDiorama.jsx` | 書房場景，單一自包含元件（581 行） |
| `src/App.jsx` | demo 外殼：控制面板 + 場景切換 + URL hooks |
| `blender/` | Blender 路線的完整流程：bootstrap、socket client、建模與烘動畫腳本、.blend 源檔 |

### URL hooks（驗證／截圖用）

| 參數 | 作用 |
|---|---|
| `?scene=tree\|wind\|room` | 選場景 |
| `?seek=3.5` | 把動畫**定格**在第 N 秒（時間軸凍結，用來逐階段比對） |
| `?start=5` | 從第 N 秒**起播**（跳過生長段直接看成樹） |
| `?n=12` | 初始果實數 |
| `?autoadd=4` | 動畫播完後自動再長 N 顆，看增量 pop |
| `?labels=0` | 關掉名字標籤 |
| `?cam=x,y,z&zoom=n` | 覆寫視角 |

## GrowingTree 的動畫做法

- **時間軸集中在 `T` 常數**（土丘／樹幹／樹冠／果實各自的 start、duration、stagger），單一 `useFrame` 自行累加 clock 後遍歷 refs 更新，不用動畫庫。
- **生長**＝枝條 `group` 的 `scale.y` 從 0 → 1（`easeOutCubic`）。枝條全部**攤平在同一層**、各自存 world 座標的 `start` + `quaternion`；若做成父子階層，父枝生長時會把子枝一起拉長位移。靠 delay 先後出場就能讀成「從父枝長出來」。
- **pop**＝`easeOutBack`（overshoot >1），彈跳手感全靠這條 easing。
- **兩種播放模式共用同一條時間軸**：果實的出場時間排定為 `fruitStart + index × stagger`；若當下時間已超過該排程（＝動畫播完後才新增的成員），就改用「當下 + 0.05」，於是新成員立刻 pop。
- `delta` 取 `Math.min(delta, 0.05)`：切到別的分頁再回來時，一個巨大的 delta 會讓整段動畫瞬間跳完。

## 實測結論（2026-07-26）

- 幾何體只用 `box / cylinder / cone / sphere / plane`，材質只用 `meshStandardMaterial`，零 loader、零外部請求。
- 品質瓶頸不在幾何體，在**色階與光影**：同一色系拆「暗／中／亮」三階替代貼圖，就足以讀出木紋與樹冠層次。
- 純色材質沒有反光，果實的「光澤」是**貼一顆白色小球**假造的高光點。
- production bundle：**1.12 MB / gzip 309 KB**（幾乎全是 three.js）。

## 實測結論（2026-07-26）

- 幾何體只用 `box / cylinder / cone / sphere / plane`，材質只用 `meshStandardMaterial`，零 loader、零外部請求。
- 品質瓶頸不在幾何體，在**色階與光影**：同一色系拆「暗／中／亮」三階替代貼圖，就足以讀出木紋層次。
- 陰影取捨：牆面刻意 `castShadow={false}`。開了物理正確，但整室只剩窗光會太暗，傢俱自身的陰影會被牆的大片陰影吃掉。
- production bundle：**1.10 MB / gzip 302 KB**（幾乎全是 three.js）。這是要不要放進 TutorKit 的主要成本。

## 踩雷紀錄

- **果實掛在球體上會消失**（踩了三次才對）：
  1. 掛在樹冠球面 × 0.92 → 在不透明球體**內部**，9 顆果實全不見。係數必須 >1。
  2. 改貼球面外側下半球 → 16 顆樹冠球互相重疊，一顆球的「外側下方」往往落在另一顆球肚子裡，9 顆只露出 3 顆。而且等距俯視角下，球的正下方本身就是視覺死角。
  3. 可靠解＝**包絡面**：從樹冠重心往各方向射線，取與所有球相交的最遠出射點，那就是整團樹冠的外殼；果實貼外殼再往外 0.3，保證在所有球體之外。掛點朝向用 `Quaternion.setFromUnitVectors(UP, dir)`，果實就會「從樹冠往外長出來」。
- **定格 hook 與增量邏輯打架**：`seek` 定格時時間不前進，而「已過排程時間就立刻 pop」這條規則會把出場時間一直往未來推（`t + 0.05`），於是果實永遠不出現。定格模式必須跳過那條規則。
- **drei `<Html>` 不要在正交相機下用 `distanceFactor`**：標籤縮放行為不直覺。不傳就是固定像素大小，對 UI 標籤本來也更合適。
- **地板頂面基準沒對齊 y=0**：地板 `Box` 高 0.26 放在 y=0 時，頂面在 y=0.13，於是所有以 y=0 為地面基準的物件都陷入地板 —— 厚度 0.05 的地毯直接整片消失（圓柱腳陷入 0.13 反而看不出來，所以只有地毯露餡）。修法：地板 `position=[0,-0.13,0]`，讓頂面就是 y=0，其餘一律以 y=0 當地面。
- **`@vitejs/plugin-react@6` 要 vite ^8**，配 vite 7 會 ERESOLVE 直接裝不起來。
- headless 截圖驗證（無需開 GUI）：
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --disable-gpu --enable-unsafe-swiftshader \
    --use-gl=angle --use-angle=swiftshader --hide-scrollbars \
    --window-size=1400,1000 --virtual-time-budget=12000 \
    --screenshot=out.png http://localhost:5183/
  ```
  swiftshader 軟體渲染，WebGL 能正常出圖；`--virtual-time-budget` 要給足（12s）等 R3F 首幀。
- **headless 的虛擬時間與 rAF 幀數嚴重脫節**：swiftshader 大約只跑 1.3 幀／虛擬秒，`setTimeout` 卻按虛擬時間飛快前進。要驗證一段 6 秒的動畫自然播完，`--virtual-time-budget` 得開到 110s 以上；要驗證「事件觸發後才新增」這類邏輯，直接用 `?start=` 把時間軸推到該階段更省事。
