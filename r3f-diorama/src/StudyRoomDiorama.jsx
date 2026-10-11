/**
 * StudyRoomDiorama — 等距視角 (Isometric) 木質書房微縮模型
 *
 * 技術限制：
 *  - 零外部資產：無貼圖、無 GLTF、無 HDRI。所有物件皆由 R3F 內建幾何體
 *    (boxGeometry / cylinderGeometry / coneGeometry / sphereGeometry / planeGeometry) 組合。
 *  - 材質一律 meshStandardMaterial 純色，靠顏色明暗 + roughness 分層。
 *  - OrthographicCamera + OrbitControls，經典 2.5D 遊戲俯視角。
 */

import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

/* ------------------------------------------------------------------ *
 * 色盤：同一色系用三階明暗（暗 / 中 / 亮）取代貼圖，是零素材的關鍵
 * ------------------------------------------------------------------ */
const C = {
  // 地基
  plinthDeep: '#4a2d18',
  plinthMid: '#6b3f22',
  plinthEdge: '#96633a',
  floor: '#c98f5a',
  floorSeam: '#a9713f',
  // 牆
  wallBack: '#efe3cf',
  wallSide: '#e0d0b6',
  skirting: '#8a5a34',
  // 木作
  woodDark: '#5f3d22',
  woodMid: '#7b4f2e',
  woodLight: '#a06a3c',
  deskTop: '#8a5a34',
  // 織物
  rugOuter: '#b0533d',
  rugInner: '#cd7a5c',
  cushion: '#c9705a',
  // 雜物
  glass: '#d3e7f2',
  sky: '#eaf4fb',
  lampShade: '#f0b862',
  metal: '#463c33',
  paper: '#f7f1e4',
  potClay: '#b5654a',
  soil: '#4b3524',
  leaf: '#527f4c',
  leafDark: '#3d6139',
}

const BOOK_COLORS = [
  '#c1573f', '#4a7c59', '#3f6b8c', '#d9a13b',
  '#8a6bb0', '#c9705a', '#5b8c85', '#a8503f',
]

/* 決定性偽隨機：同一 seed 永遠同一結果，避免 re-render 抖動 */
const rand = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ *
 * 幾何體薄包裝：把 castShadow / receiveShadow / 純色材質收成一行
 * ------------------------------------------------------------------ */
function Block({ size, color, roughness = 0.8, metalness = 0, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function Tube({ args, color, roughness = 0.75, metalness = 0, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
    </mesh>
  )
}

function Taper({ args, color, roughness = 0.6, cast = true, receive = true, side, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <coneGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} side={side} />
    </mesh>
  )
}

function Ball({ args, color, roughness = 0.85, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <sphereGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * 1. 懸浮地基（多層階梯製造「被切下的一塊土地」感）
 * ------------------------------------------------------------------ */
const FLOOR = 12 // 地板邊長

function Foundation() {
  const seams = []
  for (let i = -5; i <= 5; i++) {
    seams.push(
      <Block
        key={i}
        size={[FLOOR, 0.02, 0.05]}
        color={C.floorSeam}
        position={[0, 0.005, i * 1.05]}
        cast={false}
      />
    )
  }

  return (
    <group>
      {/* 地板面：頂面刻意對齊 y=0，所有傢俱才能用 y=0 當地面基準 */}
      <Block size={[FLOOR, 0.26, FLOOR]} color={C.floor} position={[0, -0.13, 0]} roughness={0.9} />
      {/* 木地板接縫（只是深色細條，不投影） */}
      {seams}
      {/* 地基三層漸縮，離地懸浮 */}
      <Block size={[FLOOR - 0.15, 0.5, FLOOR - 0.15]} color={C.plinthEdge} position={[0, -0.49, 0]} />
      <Block size={[FLOOR - 1.1, 0.5, FLOOR - 1.1]} color={C.plinthMid} position={[0, -0.96, 0]} />
      <Block size={[FLOOR - 2.6, 0.45, FLOOR - 2.6]} color={C.plinthDeep} position={[0, -1.41, 0]} />
      <Taper
        args={[3.2, 1.6, 4]}
        color={C.plinthDeep}
        position={[0, -2.43, 0]}
        rotation={[Math.PI, Math.PI / 4, 0]}
        roughness={0.95}
      />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 2. L 型牆 + 窗（無 CSG，用四段牆圍出窗洞）
 *    牆刻意不 castShadow：否則整室只剩窗光會太暗，
 *    要物理正確的話把 cast 打開即可。
 * ------------------------------------------------------------------ */
const WALL_H = 5
const WIN = { x0: 0.2, x1: 3.8, y0: 1.75, y1: 3.95 } // 窗洞範圍（後牆座標）

function Walls() {
  const half = FLOOR / 2
  const backZ = -half + 0.15
  const leftX = -half + 0.15
  const wSeg = (x0, x1) => [x1 - x0, 0, (x0 + x1) / 2]

  const [lw, , lcx] = wSeg(-half, WIN.x0)
  const [rw, , rcx] = wSeg(WIN.x1, half)

  return (
    <group>
      {/* ---- 後牆（含窗洞的四段） ---- */}
      <Block size={[lw, WALL_H, 0.3]} color={C.wallBack} position={[lcx, WALL_H / 2, backZ]} cast={false} />
      <Block size={[rw, WALL_H, 0.3]} color={C.wallBack} position={[rcx, WALL_H / 2, backZ]} cast={false} />
      <Block
        size={[WIN.x1 - WIN.x0, WIN.y0, 0.3]}
        color={C.wallBack}
        position={[(WIN.x0 + WIN.x1) / 2, WIN.y0 / 2, backZ]}
        cast={false}
      />
      <Block
        size={[WIN.x1 - WIN.x0, WALL_H - WIN.y1, 0.3]}
        color={C.wallBack}
        position={[(WIN.x0 + WIN.x1) / 2, (WALL_H + WIN.y1) / 2, backZ]}
        cast={false}
      />
      {/* ---- 左牆 ---- */}
      <Block size={[0.3, WALL_H, FLOOR]} color={C.wallSide} position={[leftX, WALL_H / 2, 0]} cast={false} />

      {/* ---- 踢腳板 ---- */}
      <Block size={[FLOOR - 0.3, 0.34, 0.1]} color={C.skirting} position={[0.15, 0.17, backZ + 0.2]} cast={false} />
      <Block size={[0.1, 0.34, FLOOR - 0.3]} color={C.skirting} position={[leftX + 0.2, 0.17, 0.15]} cast={false} />

      <WindowUnit backZ={backZ} />
    </group>
  )
}

function WindowUnit({ backZ }) {
  const cx = (WIN.x0 + WIN.x1) / 2
  const cy = (WIN.y0 + WIN.y1) / 2
  const w = WIN.x1 - WIN.x0
  const h = WIN.y1 - WIN.y0

  return (
    <group>
      {/* 窗外天空：純色 Plane，讓窗洞不是黑的 */}
      <mesh position={[cx, cy + 0.1, backZ - 0.4]}>
        <planeGeometry args={[w + 1.2, h + 1.2]} />
        <meshStandardMaterial color={C.sky} emissive={C.sky} emissiveIntensity={0.55} roughness={1} />
      </mesh>

      {/* 玻璃 */}
      <mesh position={[cx, cy, backZ - 0.02]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={C.glass} transparent opacity={0.28} roughness={0.15} metalness={0.1} />
      </mesh>

      {/* 窗框四邊 */}
      <Block size={[w + 0.3, 0.14, 0.34]} color={C.woodLight} position={[cx, WIN.y1 + 0.07, backZ]} cast={false} />
      <Block size={[w + 0.3, 0.16, 0.42]} color={C.woodLight} position={[cx, WIN.y0 - 0.08, backZ + 0.04]} cast={false} />
      <Block size={[0.15, h, 0.34]} color={C.woodLight} position={[WIN.x0 - 0.07, cy, backZ]} cast={false} />
      <Block size={[0.15, h, 0.34]} color={C.woodLight} position={[WIN.x1 + 0.07, cy, backZ]} cast={false} />
      {/* 十字窗櫺 */}
      <Block size={[0.08, h, 0.1]} color={C.woodLight} position={[cx, cy, backZ + 0.05]} cast={false} />
      <Block size={[w, 0.08, 0.1]} color={C.woodLight} position={[cx, cy, backZ + 0.05]} cast={false} />
      {/* 窗台 */}
      <Block size={[w + 0.7, 0.12, 0.62]} color={C.woodMid} position={[cx, WIN.y0 - 0.2, backZ + 0.16]} />
      {/* 窗台上的小盆栽 */}
      <group position={[WIN.x1 - 0.45, WIN.y0 - 0.13, backZ + 0.2]}>
        <Tube args={[0.16, 0.12, 0.24, 12]} color={C.potClay} position={[0, 0.12, 0]} />
        <Ball args={[0.17, 12, 10]} color={C.leaf} position={[0, 0.32, 0]} />
        <Ball args={[0.11, 10, 8]} color={C.leafDark} position={[0.12, 0.42, 0.04]} />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 3. 傢俱
 * ------------------------------------------------------------------ */
const DESK = { w: 4.4, d: 2.0, h: 1.5 }

function Desk({ position = [0, 0, 0] }) {
  const { w, d, h } = DESK
  const legs = [
    [-w / 2 + 0.18, d / 2 - 0.18],
    [w / 2 - 0.18, d / 2 - 0.18],
    [-w / 2 + 0.18, -d / 2 + 0.18],
    [w / 2 - 0.18, -d / 2 + 0.18],
  ]
  return (
    <group position={position}>
      {/* 桌板 + 下方橫樑 */}
      <Block size={[w, 0.16, d]} color={C.deskTop} position={[0, h, 0]} roughness={0.55} />
      <Block size={[w - 0.5, 0.1, d - 0.6]} color={C.woodDark} position={[0, h - 0.14, 0]} />
      {legs.map(([x, z], i) => (
        <Tube key={i} args={[0.09, 0.1, h - 0.1, 10]} color={C.woodDark} position={[x, (h - 0.1) / 2, z]} />
      ))}
      {/* 側邊抽屜櫃 */}
      <group position={[w / 2 - 0.62, 0, -0.1]}>
        <Block size={[1.1, h - 0.2, d - 0.45]} color={C.woodMid} position={[0, (h - 0.2) / 2, 0]} />
        {[0.35, 0.78, 1.18].map((y, i) => (
          <Block key={i} size={[0.95, 0.32, 0.06]} color={C.woodLight} position={[0, y, (d - 0.45) / 2]} />
        ))}
        {[0.35, 0.78, 1.18].map((y, i) => (
          <Tube
            key={`h${i}`}
            args={[0.03, 0.03, 0.34, 8]}
            color={C.metal}
            position={[0, y, (d - 0.45) / 2 + 0.06]}
            rotation={[0, 0, Math.PI / 2]}
            metalness={0.6}
            roughness={0.35}
          />
        ))}
      </group>
    </group>
  )
}

function Chair({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const seatH = 0.88
  return (
    <group position={position} rotation={rotation}>
      <Block size={[1.24, 0.12, 1.2]} color={C.woodMid} position={[0, seatH, 0]} />
      <Block size={[1.1, 0.1, 1.06]} color={C.cushion} position={[0, seatH + 0.11, 0]} roughness={0.95} />
      {/* 靠背 */}
      <Block size={[0.12, 1.05, 0.12]} color={C.woodDark} position={[-0.5, seatH + 0.5, -0.52]} />
      <Block size={[0.12, 1.05, 0.12]} color={C.woodDark} position={[0.5, seatH + 0.5, -0.52]} />
      <Block size={[1.14, 0.26, 0.1]} color={C.woodMid} position={[0, seatH + 0.92, -0.52]} />
      <Block size={[1.14, 0.2, 0.1]} color={C.woodMid} position={[0, seatH + 0.56, -0.52]} />
      {[
        [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5],
      ].map(([x, z], i) => (
        <Tube key={i} args={[0.06, 0.07, seatH, 8]} color={C.woodDark} position={[x, seatH / 2, z]} />
      ))}
    </group>
  )
}

/* 書架：側板 + 隔板 + 背板，每層自動排入立書 */
const SHELF = { w: 4.2, h: 4.4, d: 1.0 }
const SHELF_LEVELS = [0.16, 1.24, 2.32, 3.4]

const shelfBooks = SHELF_LEVELS.map((y, level) => {
  const rows = []
  let x = -SHELF.w / 2 + 0.22
  let i = 0
  while (x < SHELF.w / 2 - 0.35) {
    const r = rand(level * 17 + i * 3.7)
    const thick = 0.13 + r * 0.12
    if (r > 0.82) { x += 0.28; i++; continue } // 隨機留空
    rows.push({
      x: x + thick / 2,
      thick,
      height: 0.68 + rand(level * 5 + i) * 0.26,
      color: BOOK_COLORS[Math.floor(rand(level * 31 + i * 11) * BOOK_COLORS.length)],
      tilt: r > 0.7 ? (r - 0.5) * 0.22 : 0,
      y,
    })
    x += thick + 0.015
    i++
  }
  return rows
}).flat()

function Bookshelf({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  const { w, h, d } = SHELF
  return (
    <group position={position} rotation={rotation}>
      <Block size={[0.14, h, d]} color={C.woodMid} position={[-w / 2, h / 2, 0]} />
      <Block size={[0.14, h, d]} color={C.woodMid} position={[w / 2, h / 2, 0]} />
      <Block size={[w, h, 0.08]} color={C.woodDark} position={[0, h / 2, -d / 2 + 0.04]} />
      <Block size={[w + 0.28, 0.16, d + 0.12]} color={C.woodLight} position={[0, h + 0.08, 0]} />
      {[0.08, ...SHELF_LEVELS.slice(1).map((y) => y - 0.08), h - 0.08].map((y, i) => (
        <Block key={i} size={[w - 0.28, 0.12, d - 0.06]} color={C.woodLight} position={[0, y, 0.03]} />
      ))}
      {shelfBooks.map((b, i) => (
        <Block
          key={i}
          size={[b.thick, b.height, 0.66]}
          color={b.color}
          position={[b.x, b.y + b.height / 2, 0.1]}
          rotation={[0, 0, b.tilt]}
          roughness={0.9}
        />
      ))}
      {/* 頂層擺件 */}
      <Tube args={[0.2, 0.24, 0.5, 12]} color={C.potClay} position={[w / 2 - 0.6, h + 0.41, 0.05]} />
      <Ball args={[0.26, 14, 12]} color={C.leafDark} position={[w / 2 - 0.6, h + 0.78, 0.05]} />
    </group>
  )
}

/* 散落的書堆 */
function BookStack({ position = [0, 0, 0], count = 3, seed = 1, base = 0 }) {
  const items = []
  let y = base
  for (let i = 0; i < count; i++) {
    const r = rand(seed * 13 + i * 7.3)
    const t = 0.11 + r * 0.07
    items.push(
      <Block
        key={i}
        size={[1.05 + r * 0.25, t, 0.78 + r * 0.15]}
        color={BOOK_COLORS[Math.floor(rand(seed * 3 + i * 5) * BOOK_COLORS.length)]}
        position={[(r - 0.5) * 0.18, y + t / 2, (rand(seed + i) - 0.5) * 0.18]}
        rotation={[0, (r - 0.5) * 0.5, 0]}
        roughness={0.9}
      />
    )
    y += t
  }
  return <group position={position}>{items}</group>
}

/* 攤開的書（兩片微掀的封面） */
function OpenBook({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <Block size={[1.5, 0.05, 0.95]} color={BOOK_COLORS[3]} position={[0, 0.025, 0]} />
      <Block size={[0.68, 0.04, 0.86]} color={C.paper} position={[-0.36, 0.065, 0]} rotation={[0, 0, 0.04]} />
      <Block size={[0.68, 0.04, 0.86]} color={C.paper} position={[0.36, 0.065, 0]} rotation={[0, 0, -0.04]} />
    </group>
  )
}

function DeskLamp({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Tube args={[0.26, 0.3, 0.07, 16]} color={C.metal} position={[0, 0.035, 0]} metalness={0.5} roughness={0.4} />
      <Tube args={[0.045, 0.045, 0.95, 10]} color={C.metal} position={[0, 0.5, 0]} metalness={0.5} roughness={0.4} />
      <Tube
        args={[0.04, 0.04, 0.5, 10]}
        color={C.metal}
        position={[0.2, 0.96, 0]}
        rotation={[0, 0, -Math.PI / 2.6]}
        metalness={0.5}
        roughness={0.4}
      />
      <Taper
        args={[0.34, 0.42, 18, 1, true]}
        color={C.lampShade}
        position={[0.42, 1.06, 0]}
        rotation={[0, 0, Math.PI]}
        side={2 /* THREE.DoubleSide */}
        cast={false}
      />
      {/* 桌面暖光：只補光不投影，避免與主平行光的陰影打架 */}
      <pointLight position={[0.42, 0.92, 0]} intensity={2.6} distance={3.4} decay={2} color="#ffd9a0" />
    </group>
  )
}

function DeskProps({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* 馬克杯 */}
      <Tube args={[0.17, 0.15, 0.3, 14]} color={C.paper} position={[0, 0.15, 0]} />
      <Block size={[0.07, 0.13, 0.04]} color={C.paper} position={[0.2, 0.17, 0]} />
      {/* 筆筒 + 筆 */}
      <group position={[0.62, 0, 0.12]}>
        <Tube args={[0.15, 0.15, 0.34, 12]} color={C.woodDark} position={[0, 0.17, 0]} />
        {[
          [0.04, 0.06, 0.1, BOOK_COLORS[0]],
          [-0.05, 0.02, -0.06, BOOK_COLORS[2]],
          [0.01, -0.05, 0.02, BOOK_COLORS[3]],
        ].map(([x, z, tilt, color], i) => (
          <Tube
            key={i}
            args={[0.022, 0.022, 0.6, 6]}
            color={color}
            position={[x, 0.44, z]}
            rotation={[tilt, 0, tilt * 1.4]}
          />
        ))}
      </group>
      {/* 紙張 */}
      <Block size={[0.78, 0.02, 0.56]} color={C.paper} position={[-0.75, 0.01, 0.22]} rotation={[0, 0.18, 0]} />
      <Block size={[0.78, 0.02, 0.56]} color={C.paper} position={[-0.68, 0.03, 0.14]} rotation={[0, -0.1, 0]} />
    </group>
  )
}

function Rug({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Tube args={[2.55, 2.55, 0.05, 40]} color={C.rugOuter} position={[0, 0.025, 0]} roughness={1} cast={false} />
      <Tube args={[1.85, 1.85, 0.06, 40]} color={C.rugInner} position={[0, 0.04, 0]} roughness={1} cast={false} />
      <Tube args={[0.9, 0.9, 0.07, 32]} color={C.rugOuter} position={[0, 0.05, 0]} roughness={1} cast={false} />
    </group>
  )
}

function Plant({ position = [0, 0, 0] }) {
  const leaves = [
    [0, 1.35, 0, 0.62],
    [0.34, 1.12, 0.2, 0.44],
    [-0.3, 1.18, -0.16, 0.4],
    [0.12, 1.62, -0.24, 0.36],
    [-0.16, 1.55, 0.26, 0.32],
  ]
  return (
    <group position={position}>
      <Tube args={[0.52, 0.38, 0.78, 16]} color={C.potClay} position={[0, 0.39, 0]} />
      <Tube args={[0.56, 0.56, 0.12, 16]} color="#9c503a" position={[0, 0.78, 0]} />
      <Tube args={[0.48, 0.48, 0.06, 16]} color={C.soil} position={[0, 0.82, 0]} cast={false} />
      <Tube args={[0.07, 0.09, 0.7, 8]} color={C.leafDark} position={[0, 1.15, 0]} />
      {leaves.map(([x, y, z, r], i) => (
        <Ball key={i} args={[r, 14, 12]} color={i % 2 ? C.leaf : C.leafDark} position={[x, y, z]} />
      ))}
    </group>
  )
}

function WallArt({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Block size={[0.07, 1.34, 1.74]} color={C.woodDark} cast={false} />
      <Block size={[0.03, 1.06, 1.46]} color={C.paper} position={[0.04, 0, 0]} cast={false} />
      <Block size={[0.02, 0.42, 1.1]} color={BOOK_COLORS[2]} position={[0.06, -0.22, 0]} cast={false} />
      <Block size={[0.02, 0.3, 0.42]} color={BOOK_COLORS[3]} position={[0.06, 0.28, -0.3]} cast={false} />
    </group>
  )
}

function WallClock({ position = [0, 0, 0] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      <Tube args={[0.44, 0.44, 0.09, 24]} color={C.woodMid} cast={false} />
      <Tube args={[0.37, 0.37, 0.1, 24]} color={C.paper} position={[0, 0.02, 0]} cast={false} />
      <Block size={[0.04, 0.11, 0.26]} color={C.metal} position={[0, 0.08, -0.1]} cast={false} />
      <Block size={[0.18, 0.11, 0.04]} color={C.metal} position={[0.07, 0.08, 0]} cast={false} />
    </group>
  )
}

function Crates({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Block size={[1.3, 0.9, 1.1]} color={C.woodMid} position={[0, 0.45, 0]} />
      <Block size={[1.34, 0.08, 1.14]} color={C.woodLight} position={[0, 0.9, 0]} />
      <Block size={[1.0, 0.7, 0.9]} color={C.woodLight} position={[0.1, 1.29, -0.1]} rotation={[0, 0.32, 0]} />
      <BookStack position={[0.1, 1.64, -0.1]} count={2} seed={9} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 4. 場景組裝 + 光影
 * ------------------------------------------------------------------ */
function Scene() {
  return (
    <group>
      {/* --- 光：環境光打底 + 一盞從窗戶方向進來的平行光（唯一投影光源） --- */}
      <ambientLight intensity={1.15} color="#fff2e0" />
      <directionalLight
        castShadow
        position={[7.5, 11, -13]}       /* 窗在後牆右側 → 光源落在窗外 */
        intensity={2.9}
        color="#ffe9c9"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      {/* 反射補光：不投影，只把背光面從純黑拉回暖灰 */}
      <directionalLight position={[-9, 5, 9]} intensity={0.55} color="#cfe0f0" />

      <Foundation />
      <Walls />

      <Desk position={[1.5, 0, -4.75]} />
      <DeskLamp position={[-0.05, 1.58, -4.95]} />
      <DeskProps position={[1.5, 1.58, -4.4]} />
      <OpenBook position={[2.55, 1.59, -4.55]} rotation={[0, -0.22, 0]} />
      <Chair position={[1.4, 0, -2.75]} rotation={[0, Math.PI + 0.12, 0]} />

      <Bookshelf position={[-5.25, 0, -0.9]} rotation={[0, Math.PI / 2, 0]} />

      <Rug position={[0.9, 0, 2.4]} />
      <BookStack position={[1.2, 0, 2.2]} count={3} seed={4} base={0.07} />
      <OpenBook position={[-0.1, 0.07, 3.1]} rotation={[0, 0.6, 0]} />
      <BookStack position={[-2.6, 0, 1.1]} count={4} seed={21} />

      <Plant position={[-4.3, 0, 4.3]} />
      <Crates position={[4.6, 0, 3.1]} />
      <WallArt position={[-5.72, 3.05, 2.6]} />
      <WallClock position={[-2.9, 3.75, -5.7]} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 5. 匯出元件：OrthographicCamera + OrbitControls
 * ------------------------------------------------------------------ */
export default function StudyRoomDiorama({
  className,
  style,
  cameraPosition = [16, 14, 16], /* 等距標準角：三軸等距 → 45° 俯視 */
  zoom = 66,
}) {
  return (
    <Canvas
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      shadows                                    /* 開啟 shadow map */
      orthographic                               /* 等距視角關鍵：正交投影 */
      camera={{ position: cameraPosition, zoom, near: -50, far: 120 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#f3e9dc']} />
      <fog attach="fog" args={['#f3e9dc', 34, 70]} />
      <Scene />
      <OrbitControls
        target={[0, 1.6, 0]}
        enablePan={false}
        minZoom={26}
        maxZoom={150}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
