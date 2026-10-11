/**
 * WindTree — 載入 Blender 產出的 GLB，播放骨骼風吹動畫
 *
 * 與另兩個場景的關鍵差別：**這個不是零素材**。
 * 樹是 Blender 用 22 根骨骼綁定 + 烘出 5 秒循環動畫後匯出的 GLB（130 KB），
 * 網頁端只負責載入與播放。取捨：
 *   優點 — 骨骼變形、風波沿枝條傳遞這類效果，手寫幾何體幾乎做不出來
 *   代價 — 多一個資產檔要部署、要 CDN、改動畫得回 Blender 重烘
 */

import { Suspense, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'

const GLB_URL = '/windtree.glb'

function Tree({ seek = null, timeScale = 1 }) {
  const group = useRef()
  const { scene, animations } = useGLTF(GLB_URL)
  const { actions, mixer } = useAnimations(animations, group)

  useEffect(() => {
    const action = actions.WindLoop
    if (!action) return
    action.reset().play()
    action.timeScale = timeScale

    if (seek != null) {
      /* 定格：把 mixer 推到指定秒數後暫停，用於截圖比對 */
      mixer.setTime(seek)
      action.paused = true
    }
    return () => action.stop()
  }, [actions, mixer, seek, timeScale])

  useEffect(() => {
    scene.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
  }, [scene])

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  )
}

function Ground() {
  return (
    <group>
      <mesh receiveShadow position={[0, -0.15, 0]}>
        <boxGeometry args={[11, 0.3, 11]} />
        <meshStandardMaterial color="#7ba861" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, -0.47, 0]}>
        <boxGeometry args={[10.9, 0.34, 10.9]} />
        <meshStandardMaterial color="#7c5a38" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.89, 0]}>
        <boxGeometry args={[9.8, 0.5, 9.8]} />
        <meshStandardMaterial color="#6b4a2f" roughness={0.9} />
      </mesh>
      <mesh position={[0, -1.36, 0]}>
        <boxGeometry args={[8.2, 0.45, 8.2]} />
        <meshStandardMaterial color="#4a3520" roughness={0.95} />
      </mesh>
    </group>
  )
}

export default function WindTree({
  className,
  style,
  seek = null,
  timeScale = 1,
  cameraPosition = [13, 11, 13],
  zoom = 52,
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
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-9, 6, -8]} intensity={0.5} color="#cfe0f0" />

      <Ground />
      <Suspense fallback={null}>
        <Tree seek={seek} timeScale={timeScale} />
      </Suspense>

      <OrbitControls
        target={[0, 2.2, 0]}
        enablePan={false}
        minZoom={30}
        maxZoom={180}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI / 2.15}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}

useGLTF.preload(GLB_URL)
