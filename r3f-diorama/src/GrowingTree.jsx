/**
 * GrowingTree — 成長大樹 + 學生果實 pop 動畫（等距視角）
 *
 * 用途：老師答題／完成任務後播放的獎勵動畫。樹逐節長出 → 樹冠 pop →
 *       每個學生化為一顆果實依序彈出。
 *
 * 技術限制與 StudyRoomDiorama 相同：
 *  - 零外部素材：無貼圖、無模型、無字型檔（名字標籤走 drei Html，用瀏覽器字型）
 *  - 幾何體只用 box / cylinder / cone / sphere，材質只用 meshStandardMaterial
 *  - 樹骨架由決定性偽隨機在 module scope 生成一次，不隨 re-render 變動
 *
 * 兩種播放模式（同一個 timeline，自動判斷）：
 *  1. 首次播放：果實按 index 依序 pop（間隔 FRUIT_STAGGER）
 *  2. 增量：students 陣列變長時，新果實在「當下」立刻 pop（答對一題 → 長一顆）
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { Quaternion, Vector3 } from 'three'

/* ------------------------------------------------------------------ *
 * 色盤
 * ------------------------------------------------------------------ */
const C = {
  plinthDeep: '#4a3520',
  plinthMid: '#6b4a2f',
  plinthEdge: '#8a6440',
  soil: '#7c5a38',
  grass: '#7ba861',
  grassDark: '#628a4d',
  grassLight: '#93bd75',
  trunk: '#7a5233',
  trunkDark: '#5e3d24',
  trunkLight: '#96693f',
  crown: '#4e8046',
  crownDark: '#3f6b3a',
  crownLight: '#63995a',
  stone: '#9a9186',
  stoneDark: '#7d746a',
}

const FRUIT_COLORS = ['#d1503f', '#e07a3c', '#e3b23c', '#c9455a']

/* 時間軸（秒）— 全部集中在這裡，方便調節奏 */
const T = {
  moundStart: 0.0,
  moundDur: 0.45,
  trunkStart: 0.3,
  branchDur: 0.5,      // 單一枝條生長時間
  crownStart: 2.15,
  crownStagger: 0.09,
  crownDur: 0.5,
  fruitStart: 3.1,
  fruitStagger: 0.13,
  fruitDur: 0.55,
}

/* ------------------------------------------------------------------ *
 * easing
 * ------------------------------------------------------------------ */
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)
/* easeOutBack：>1 的 overshoot，就是「pop」的手感來源 */
const easeOutBack = (x) => {
  const c1 = 1.9, c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

const rand = (seed) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/* ------------------------------------------------------------------ *
 * 樹骨架生成：遞迴分枝，攤平成同一層
 *
 * 關鍵：所有枝條都存 world 座標的 start + quaternion，攤平放在同一個 group 下。
 * 若做成父子階層，父枝 scale.y 生長時會把子枝一起拉長／位移；攤平後各枝
 * 只靠 delay 先後出場，視覺上仍是「從父枝長出來」。
 * ------------------------------------------------------------------ */
const UP = new Vector3(0, 1, 0)

function buildTree() {
  const branches = []
  const crowns = []

  const grow = (start, dir, length, rBot, rTop, depth, delay) => {
    const q = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
    branches.push({
      start: start.toArray(),
      quaternion: q.toArray(),
      length,
      rBot,
      rTop,
      depth,
      delay,
    })
    const end = start.clone().add(dir.clone().normalize().multiplyScalar(length))

    if (depth >= 3) {
      // 末端：掛一團樹冠
      crowns.push({ pos: end.toArray(), r: 0.62 + rand(delay * 91 + depth) * 0.34, delay: delay + T.branchDur * 0.6 })
      return
    }

    /* 分枝數刻意收斂：主幹 4 根、之後各 2 根 = 16 團樹冠。
       更多球只會糊成一團，也會把果實埋起來 */
    const childCount = depth === 0 ? 4 : 2
    for (let i = 0; i < childCount; i++) {
      const s = depth * 13.7 + i * 5.3 + length * 2.1
      // 主幹分枝：繞 y 均分 + 抖動；上層枝：延續父枝方向再外擴
      const az = (i / childCount) * Math.PI * 2 + rand(s) * 0.9 + depth * 0.7
      const tilt = depth === 0 ? 0.62 + rand(s + 1) * 0.22 : 0.42 + rand(s + 2) * 0.3
      const childDir = new Vector3(
        Math.sin(az) * Math.sin(tilt),
        Math.cos(tilt),
        Math.cos(az) * Math.sin(tilt)
      )
      if (depth > 0) childDir.add(dir.clone().normalize().multiplyScalar(0.85)).normalize()

      // 分枝點：主幹從 55%~100% 高度分出，讓樹形不是傘狀
      const at = depth === 0 ? 0.6 + (i / childCount) * 0.4 : 0.72 + rand(s + 3) * 0.28
      const from = start.clone().add(dir.clone().normalize().multiplyScalar(length * at))

      grow(
        from,
        childDir,
        length * (0.56 + rand(s + 4) * 0.16),
        rTop * 0.82,
        rTop * 0.62,
        depth + 1,
        delay + T.branchDur * (0.55 + at * 0.35)
      )
    }
  }

  grow(new Vector3(0, 0, 0), new Vector3(0, 1, 0), 3.4, 0.44, 0.3, 0, T.trunkStart)
  return { branches, crowns }
}

const TREE = buildTree()

/* ------------------------------------------------------------------ *
 * 果實掛點：樹冠團的「包絡面」
 *
 * 踩過兩次坑才走到這個做法：
 *  1. 掛在單顆球的球面上（半徑 × 0.92）→ 在不透明樹冠內部，整批消失。
 *  2. 改成單顆球的下半球外側 → 16 顆球互相重疊，一顆球的「外側下方」
 *     往往落在另一顆球肚子裡，9 顆果實只有 3 顆露出來。
 *
 * 可靠解：從樹冠重心往各方向射線，取與所有球相交的「最遠出射點」，
 * 那就是整團樹冠的外殼。果實貼在外殼再往外 0.3，保證在所有球體之外。
 * ------------------------------------------------------------------ */
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
/* 預設鏡頭方向（與 cameraPosition 同向），用來把果實優先排在正面 */
const DEFAULT_VIEW = new Vector3(13, 11, 13).normalize()

const CROWN_CENTER = TREE.crowns
  .reduce((a, c) => a.add(new Vector3(...c.pos)), new Vector3())
  .divideScalar(TREE.crowns.length)

/* 射線從球群內部出發，求最遠出射距離 */
function envelopeDist(origin, dir) {
  let best = 0
  for (const c of TREE.crowns) {
    const oc = new Vector3(...c.pos).sub(origin)
    const tca = oc.dot(dir)
    const d2 = oc.lengthSq() - tca * tca
    if (d2 > c.r * c.r) continue // 射線未穿過這顆球
    best = Math.max(best, tca + Math.sqrt(c.r * c.r - d2))
  }
  return best
}

const FRUIT_SLOTS = (() => {
  const N = 72
  const slots = []
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    /* 只要側面到下側：果實長在樹冠頂上不像樣，也會被俯視角壓扁 */
    if (y > 0.12 || y < -0.78) continue
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const th = i * GOLDEN
    const dir = new Vector3(Math.cos(th) * r, y, Math.sin(th) * r).normalize()

    const d = envelopeDist(CROWN_CENTER, dir)
    if (d <= 0.3) continue // 這個方向沒有樹冠

    const pos = CROWN_CENTER.clone().add(dir.clone().multiplyScalar(d))
    slots.push({
      pos: pos.toArray(),
      /* local +y 對齊 dir：果實從外殼往外長出 */
      quaternion: new Quaternion().setFromUnitVectors(UP, dir).toArray(),
      facing: dir.dot(DEFAULT_VIEW),
      y: pos.y,
    })
  }
  /* 先用正面（朝預設鏡頭的半球），正面內再由上往下。
     單純按 facing 排序會讓果實全擠在最正對鏡頭的一小塊，反而不自然 */
  const front = slots.filter((s) => s.facing > -0.15).sort((a, b) => b.y - a.y)
  const back = slots.filter((s) => s.facing <= -0.15).sort((a, b) => b.y - a.y)
  return [...front, ...back]
})()

/* ------------------------------------------------------------------ *
 * 幾何體薄包裝
 * ------------------------------------------------------------------ */
function Tube({ args, color, roughness = 0.85, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <cylinderGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

function Ball({ args, color, roughness = 0.8, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <sphereGeometry args={args} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

function Block({ size, color, roughness = 0.85, cast = true, receive = true, ...props }) {
  return (
    <mesh castShadow={cast} receiveShadow={receive} {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ *
 * 懸浮草地基座（靜態，不參與動畫）
 * ------------------------------------------------------------------ */
const ISLAND = 11

function Island() {
  const tufts = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = rand(i * 3.1) * Math.PI * 2
        const r = 1.9 + rand(i * 7.7) * 3.2
        return {
          pos: [Math.cos(a) * r, 0, Math.sin(a) * r],
          h: 0.22 + rand(i * 2.3) * 0.3,
          w: 0.16 + rand(i * 5.9) * 0.12,
          dark: rand(i * 11.3) > 0.5,
        }
      }),
    []
  )

  return (
    <group>
      <Block size={[ISLAND, 0.3, ISLAND]} color={C.grass} position={[0, -0.15, 0]} roughness={0.95} />
      <Block size={[ISLAND - 0.12, 0.34, ISLAND - 0.12]} color={C.soil} position={[0, -0.47, 0]} />
      <Block size={[ISLAND - 1.2, 0.5, ISLAND - 1.2]} color={C.plinthMid} position={[0, -0.89, 0]} />
      <Block size={[ISLAND - 2.8, 0.45, ISLAND - 2.8]} color={C.plinthDeep} position={[0, -1.36, 0]} />
      <mesh castShadow position={[0, -2.35, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
        <coneGeometry args={[2.9, 1.55, 4]} />
        <meshStandardMaterial color={C.plinthDeep} roughness={0.95} />
      </mesh>

      {/* 草叢：兩色小片，打散地面的單調 */}
      {tufts.map((t, i) => (
        <Block
          key={i}
          size={[t.w, t.h, t.w]}
          color={t.dark ? C.grassDark : C.grassLight}
          position={[t.pos[0], t.h / 2, t.pos[2]]}
          rotation={[0, rand(i) * 1.5, 0]}
        />
      ))}

      {/* 石頭 */}
      <Ball args={[0.34, 8, 6]} color={C.stone} position={[3.5, 0.16, -2.4]} />
      <Ball args={[0.22, 8, 6]} color={C.stoneDark} position={[3.02, 0.1, -2.0]} />
      <Ball args={[0.28, 8, 6]} color={C.stone} position={[-3.3, 0.12, 2.9]} />
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 動畫本體：單一 useFrame 驅動所有 refs
 * ------------------------------------------------------------------ */
function TreeRig({ students, showLabels, playKey, seek, startAt, onComplete }) {
  const swayRef = useRef()
  const moundRef = useRef()
  const branchRefs = useRef([])
  const crownRefs = useRef([])
  const fruitRefs = useRef([])
  const labelRefs = useRef([])

  const clock = useRef(startAt)
  const appearAt = useRef(new Map())   // studentId -> 出場時間
  const completed = useRef(false)

  /* 重播：把時間軸拉回 startAt，清掉所有果實的出場時間 */
  useEffect(() => {
    clock.current = startAt
    appearAt.current.clear()
    completed.current = false
  }, [playKey, startAt])

  const lastBranchEnd = useMemo(
    () => Math.max(...TREE.branches.map((b) => b.delay + T.branchDur)),
    []
  )

  useFrame((_, delta) => {
    /* seek != null → 定格在指定秒數（截圖比對動畫各階段用）
       delta 上限避免切換分頁回來時整段動畫瞬間跳完 */
    const t = seek != null ? seek : (clock.current += Math.min(delta, 0.05))

    /* --- 土丘 --- */
    if (moundRef.current) {
      const p = clamp01((t - T.moundStart) / T.moundDur)
      const s = easeOutBack(p)
      moundRef.current.scale.set(s, s * 0.85, s)
    }

    /* --- 枝條：沿自身方向 scale.y 生長 --- */
    for (let i = 0; i < TREE.branches.length; i++) {
      const g = branchRefs.current[i]
      if (!g) continue
      const b = TREE.branches[i]
      const p = clamp01((t - b.delay) / T.branchDur)
      g.scale.y = Math.max(0.0001, easeOutCubic(p))
      g.visible = p > 0
    }

    /* --- 樹冠：pop --- */
    for (let i = 0; i < TREE.crowns.length; i++) {
      const m = crownRefs.current[i]
      if (!m) continue
      const d = T.crownStart + i * T.crownStagger
      const p = clamp01((t - d) / T.crownDur)
      const s = p <= 0 ? 0 : easeOutBack(p)
      m.scale.setScalar(Math.max(0.0001, s))
      m.visible = p > 0
    }

    /* --- 果實：排定出場時間後 pop + 輕微垂盪 --- */
    for (let i = 0; i < students.length; i++) {
      const st = students[i]
      const key = st.id ?? i
      if (!appearAt.current.has(key)) {
        const scheduled = T.fruitStart + i * T.fruitStagger
        /* 已經過了排程時間 = 動畫播完後新增的學生 → 立刻 pop。
           ⚠️ seek 定格時時間不前進，若也走這條會把出場時間一直推到未來 → 永遠不 pop */
        const late = seek == null && t > scheduled
        appearAt.current.set(key, late ? t + 0.05 : scheduled)
      }
      const at = appearAt.current.get(key)
      const g = fruitRefs.current[i]
      if (!g) continue
      const p = clamp01((t - at) / T.fruitDur)
      const s = p <= 0 ? 0 : easeOutBack(p)
      g.scale.setScalar(Math.max(0.0001, s))
      g.visible = p > 0
      if (p > 0) {
        /* 掛在枝上的鐘擺感，各果實相位錯開（軸心＝掛點） */
        g.rotation.z = Math.sin(t * 1.5 + i * 1.7) * 0.1 * p
        g.rotation.x = Math.sin(t * 1.22 + i * 2.4) * 0.07 * p
      }
      const lb = labelRefs.current[i]
      if (lb) {
        const vis = p > 0.55
        if (lb.style.opacity !== (vis ? '1' : '0')) {
          lb.style.opacity = vis ? '1' : '0'
        }
      }
    }

    /* --- 整棵樹隨風輕擺（軸心在樹根） --- */
    if (swayRef.current) {
      swayRef.current.rotation.z = Math.sin(t * 0.62) * 0.014
      swayRef.current.rotation.x = Math.sin(t * 0.47 + 1.1) * 0.009
    }

    /* --- 完成回呼 --- */
    if (!completed.current && students.length > 0) {
      const lastFruit = Math.max(...[...appearAt.current.values()]) + T.fruitDur
      if (t > Math.max(lastFruit, lastBranchEnd)) {
        completed.current = true
        onComplete?.()
      }
    }
  })

  return (
    <group>
      <Island />

      {/* 樹根土丘 */}
      <group ref={moundRef}>
        <Tube args={[1.05, 1.5, 0.42, 18]} color={C.soil} position={[0, 0.16, 0]} />
        <Tube args={[0.78, 1.0, 0.2, 18]} color={C.grassDark} position={[0, 0.4, 0]} />
      </group>

      <group ref={swayRef}>
        {/* 枝條 */}
        {TREE.branches.map((b, i) => (
          <group
            key={i}
            ref={(el) => (branchRefs.current[i] = el)}
            position={b.start}
            quaternion={b.quaternion}
            scale={[1, 0.0001, 1]}
          >
            <Tube
              args={[b.rTop, b.rBot, b.length, b.depth === 0 ? 12 : 8]}
              color={b.depth === 0 ? C.trunk : b.depth === 1 ? C.trunkLight : C.trunkDark}
              position={[0, b.length / 2, 0]}
            />
          </group>
        ))}

        {/* 樹冠 */}
        {TREE.crowns.map((c, i) => (
          <mesh
            key={i}
            ref={(el) => (crownRefs.current[i] = el)}
            castShadow
            receiveShadow
            position={c.pos}
            scale={0.0001}
          >
            <sphereGeometry args={[c.r, 16, 12]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? C.crownLight : i % 3 === 1 ? C.crown : C.crownDark}
              roughness={0.9}
            />
          </mesh>
        ))}

        {/* 果實（每個學生一顆） */}
        {students.map((st, i) => {
          const slot = FRUIT_SLOTS[i % FRUIT_SLOTS.length]
          const color = st.color ?? FRUIT_COLORS[i % FRUIT_COLORS.length]
          return (
            /* 外層：靜態掛點 + 朝向（local +y = 樹冠外殼法線方向）
               內層：動畫（scale pop + 以掛點為軸的擺動） */
            <group key={st.id ?? i} position={slot.pos} quaternion={slot.quaternion}>
              <group ref={(el) => (fruitRefs.current[i] = el)} scale={0.0001}>
                {/* 果梗 */}
                <Tube args={[0.032, 0.032, 0.16, 6]} color={C.trunkDark} position={[0, 0.07, 0]} />
                <Ball args={[0.33, 18, 14]} color={color} roughness={0.5} position={[0, 0.36, 0]} />
                {/* 高光小球：純色材質下用亮一階的小球假造反光點 */}
                <Ball args={[0.1, 10, 8]} color="#ffffff" position={[-0.12, 0.5, 0.19]} cast={false} />
                {/* 葉片 */}
                <Block
                  size={[0.2, 0.035, 0.11]}
                  color={C.crownDark}
                  position={[0.14, 0.14, 0]}
                  rotation={[0, 0.4, 0.42]}
                />
                {showLabels && (
                  /* 不用 distanceFactor：標籤保持固定像素大小，縮放視角時永遠可讀 */
                  <Html center position={[0, 1.02, 0]} zIndexRange={[20, 0]}>
                    <div
                      ref={(el) => (labelRefs.current[i] = el)}
                      style={{
                        opacity: 0,
                        transition: 'opacity .25s ease',
                        background: 'rgba(38,28,20,.86)',
                        color: '#fff6e8',
                        font: '600 12.5px/1 system-ui, "Noto Sans TC", sans-serif',
                        padding: '5px 9px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                    >
                      {st.name}
                    </div>
                  </Html>
                )}
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ *
 * 匯出元件
 * ------------------------------------------------------------------ */
export default function GrowingTree({
  students = [],
  showLabels = true,
  playKey = 0,
  seek = null,
  startAt = 0,   /* 從第幾秒起播：>0 可跳過生長段直接看成樹 */
  onComplete,
  className,
  style,
  cameraPosition = [13, 11, 13],
  zoom = 62,
}) {
  return (
    <Canvas
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      shadows
      orthographic
      camera={{ position: cameraPosition, zoom, near: -60, far: 140 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#e9f1e6']} />

      <ambientLight intensity={1.1} color="#fff6e6" />
      <directionalLight
        castShadow
        position={[8, 13, 5]}
        intensity={2.7}
        color="#fff0d4"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={16}
        shadow-camera-bottom={-14}
      />
      <directionalLight position={[-9, 6, -8]} intensity={0.5} color="#cfe0f0" />

      <TreeRig
        students={students}
        showLabels={showLabels}
        playKey={playKey}
        seek={seek}
        startAt={startAt}
        onComplete={onComplete}
      />

      <OrbitControls
        target={[0, 3.2, 0]}
        enablePan={false}
        minZoom={28}
        maxZoom={150}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
