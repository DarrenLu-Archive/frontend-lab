import { useState, useCallback, useEffect } from 'react'
import GrowingTree from './GrowingTree.jsx'
import StudyRoomDiorama from './StudyRoomDiorama.jsx'
import WindTree from './WindTree.jsx'

/* URL hooks（驗證與截圖用）：
   ?scene=tree|room   場景
   ?seek=3.4          把動畫定格在第 N 秒
   ?n=12              初始果實數
   ?cam=x,y,z&zoom=n  視角
   ?labels=0          關掉名字標籤                                  */
const q = new URLSearchParams(location.search)
const num = (k, d) => (q.get(k) != null ? Number(q.get(k)) : d)

const NAMES = [
  '林宥辰', '陳品妍', '黃睿凱', '吳芷瑄', '張哲瑋', '李佳恬',
  '劉承翰', '鄭曉彤', '王柏睿', '許雅茜', '蔡宗霖', '曾湘婷',
  '謝東霖', '洪語彤', '賴柏丞', '呂心慈', '范廷宇', '邱亭安',
]

const makeStudents = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: NAMES[i % NAMES.length] + (i >= NAMES.length ? `-${Math.floor(i / NAMES.length)}` : ''),
  }))

const BTN = {
  appearance: 'none',
  border: '1px solid rgba(70,50,32,.22)',
  background: 'rgba(255,252,246,.92)',
  color: '#3c2d1e',
  font: '600 13px/1 system-ui, "Noto Sans TC", sans-serif',
  padding: '9px 13px',
  borderRadius: 9,
  cursor: 'pointer',
}

export default function App() {
  const SCENES = ['tree', 'wind', 'room']
  const [scene, setScene] = useState(
    SCENES.includes(q.get('scene')) ? q.get('scene') : 'tree'
  )
  const [students, setStudents] = useState(() => makeStudents(num('n', 9)))
  const [playKey, setPlayKey] = useState(0)
  const [labels, setLabels] = useState(q.get('labels') !== '0')
  const [done, setDone] = useState(false)

  const seek = q.get('seek') != null ? Number(q.get('seek')) : null
  const cam = q.get('cam')?.split(',').map(Number)
  const zoom = q.get('zoom') ? Number(q.get('zoom')) : undefined
  const camProps = {
    ...(cam?.length === 3 ? { cameraPosition: cam } : {}),
    ...(zoom ? { zoom } : {}),
  }

  const addFruit = useCallback(() => {
    setStudents((prev) => [
      ...prev,
      { id: `s${prev.length}-${Date.now()}`, name: NAMES[prev.length % NAMES.length] },
    ])
  }, [])

  const replay = useCallback(() => {
    setDone(false)
    setPlayKey((k) => k + 1)
  }, [])

  /* ?autoadd=N：動畫播完後自動再長 N 顆，用來看（與驗證）增量 pop */
  const [autoLeft, setAutoLeft] = useState(num('autoadd', 0))
  useEffect(() => {
    if (autoLeft <= 0) return
    const id = setTimeout(() => {
      addFruit()
      setAutoLeft((n) => n - 1)
    }, 1600)
    return () => clearTimeout(id)
  }, [autoLeft, addFruit])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {scene === 'tree' ? (
        <GrowingTree
          students={students}
          showLabels={labels}
          playKey={playKey}
          seek={seek}
          startAt={num('start', 0)}
          onComplete={() => setDone(true)}
          {...camProps}
        />
      ) : scene === 'wind' ? (
        <WindTree seek={seek} {...camProps} />
      ) : (
        <StudyRoomDiorama {...camProps} />
      )}

      {/* 控制面板 */}
      <div
        style={{
          position: 'absolute',
          left: 20,
          top: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 16,
          borderRadius: 14,
          background: 'rgba(255,251,244,.82)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 30px rgba(60,44,28,.14)',
          font: '13px/1.5 system-ui, "Noto Sans TC", sans-serif',
          color: '#3c2d1e',
          maxWidth: 250,
        }}
      >
        <div style={{ font: '700 14px/1 system-ui, "Noto Sans TC", sans-serif' }}>
          {scene === 'tree'
            ? '成長大樹 + 果實 pop（零素材）'
            : scene === 'wind'
              ? '風吹大樹（Blender 骨骼動畫 GLB）'
              : '木質書房 Diorama（零素材）'}
        </div>

        {scene === 'tree' && (
          <>
            <div style={{ opacity: 0.72, fontSize: 12 }}>
              果實 {students.length} 顆　{done ? '動畫已播完' : '播放中'}
              {seek != null && `　定格 ${seek}s`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={BTN} onClick={addFruit}>長出一顆</button>
              <button style={BTN} onClick={replay}>重播</button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={BTN} onClick={() => setLabels((v) => !v)}>
                {labels ? '隱藏名字' : '顯示名字'}
              </button>
              <button
                style={BTN}
                onClick={() => setStudents(makeStudents(Math.max(1, students.length - 3)))}
              >
                減少
              </button>
            </div>
            <div style={{ opacity: 0.6, fontSize: 11.5, lineHeight: 1.6 }}>
              動畫播完後按「長出一顆」，新果實會即時 pop —— 就是答題後長一顆的效果。
            </div>
          </>
        )}

        {scene === 'wind' && (
          <div style={{ opacity: 0.6, fontSize: 11.5, lineHeight: 1.6 }}>
            22 根骨骼、5 秒無縫循環。風波沿枝條往末梢傳遞，末梢比樹幹晚一步且晃得更誇張。
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
          {SCENES.filter((s) => s !== scene).map((s) => (
            <button key={s} style={BTN} onClick={() => setScene(s)}>
              {s === 'tree' ? '成長大樹' : s === 'wind' ? '風吹大樹' : '書房'}
            </button>
          ))}
        </div>
        <div style={{ opacity: 0.55, fontSize: 11.5 }}>拖曳可旋轉視角，滾輪縮放</div>
      </div>
    </div>
  )
}
