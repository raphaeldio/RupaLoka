import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { modelUrl } from '../lib/api'
import type { ExhibitOut } from '../lib/api.types'
import {
  damp,
  exhibitPos,
  exhibitYaw,
  HALF_W,
  poseFor,
  ringCenter,
  type CamState,
  type Exhibit,
  type Layout,
} from './cameraFlow'
import { PENDING_TEXT, wrapLines } from './labelText'

const C = {
  kertas: '#f5f1e8',
  tinta: '#1d2a2a',
  teal: '#146b68',
  teal800: '#0e4d4b',
  emas: '#e8b64c',
  bata: '#b5523b',
}

/** Ukuran kotak putih pedestal (m) dan ruang tampil model di atasnya. */
const BOX = { w: 1.0, h: 1.0, d: 0.6 }
const FIT = { w: 0.85, h: 0.85 }

export interface SceneProps {
  layout: Layout
  exhibits: ExhibitOut[]
  state: CamState
  reducedMotion: boolean
  guideModel: string | null
  guideLine: string | null
  spin: React.MutableRefObject<number>
  wasDrag: () => boolean
  onExhibit: (i: number) => void
  onCard: (i: number) => void
  onMascot: () => void
  onMiss: () => void
}

export default function GalleryScene(props: SceneProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.05, far: 60, position: [0, 2, 4] }}
      onPointerMissed={() => {
        if (!props.wasDrag()) props.onMiss()
      }}
      aria-hidden="true"
    >
      <color attach="background" args={[C.teal800]} />
      <fog attach="fog" args={[C.teal800, 9, 22]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff3dc', C.tinta, 0.55]} />
      <directionalLight position={[-6, 8, 4]} intensity={0.6} />
      <CameraRig layout={props.layout} state={props.state} reducedMotion={props.reducedMotion} />
      <RingRoom layout={props.layout} />
      {props.layout.exhibits.map((e, i) => (
        <Pedestal key={e.id} index={i} e={e} data={e.source === null ? null : props.exhibits[e.source]} {...props} />
      ))}
      <Mascot {...props} />
    </Canvas>
  )
}

/** Rig kamera: meluruh menuju pose state; gerak dikurangi = langsung lompat. */
function CameraRig({ layout, state, reducedMotion }: Pick<SceneProps, 'layout' | 'state' | 'reducedMotion'>) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const aspect = useThree((s) => s.size.width / s.size.height)
  const portrait = Math.min(1, Math.max(0, (1 - aspect) / 0.5))
  const look = useRef(new THREE.Vector3(...poseFor({ kind: 'intro' }, layout).target))
  const first = useRef(true)

  useFrame((_, dt) => {
    const pose = poseFor(state, layout, portrait)
    const d = Math.min(dt, 0.05)
    const lambda = state.kind === 'walk' ? 6 : 3.2
    if (reducedMotion || first.current) {
      camera.position.set(...pose.position)
      look.current.set(...pose.target)
      first.current = false
    } else {
      const p = camera.position
      p.set(damp(p.x, pose.position[0], lambda, d), damp(p.y, pose.position[1], lambda, d), damp(p.z, pose.position[2], lambda, d))
      const l = look.current
      l.set(damp(l.x, pose.target[0], lambda, d), damp(l.y, pose.target[1], lambda, d), damp(l.z, pose.target[2], lambda, d))
    }
    camera.lookAt(look.current)
    const fov = 55 + portrait * 22
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })
  return null
}

/** Lorong cincin dari primitif (pengganti sampai GLB ruangan dibuat di Blender, T-121). */
function RingRoom({ layout }: { layout: Layout }) {
  const c = ringCenter(layout)
  const R = layout.radius
  const H = 4.2
  const rin = R - HALF_W
  const rout = R + HALF_W
  return (
    <group position={c}>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[rin, rin, H, 96, 1, true]} />
        <meshStandardMaterial color={C.kertas} roughness={0.95} />
      </mesh>
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[rout, rout, H, 128, 1, true]} />
        <meshStandardMaterial color={C.kertas} side={THREE.BackSide} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[rin + 0.02, rin + 0.02, 0.24, 96, 1, true]} />
        <meshStandardMaterial color={C.bata} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[rout - 0.02, rout - 0.02, 0.24, 128, 1, true]} />
        <meshStandardMaterial color={C.bata} side={THREE.BackSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[rin, rout, 128]} />
        <meshStandardMaterial color={C.tinta} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[R - 0.25, R + 0.25, 128]} />
        <meshStandardMaterial color="#24413f" roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <ringGeometry args={[rin, rout, 128]} />
        <meshStandardMaterial color={C.teal800} roughness={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/** Tekstur kotak putih: nama pameran + penjelasan singkat (atau keterangan pending). */
function useLabelTexture(title: string, body: string | null, empty: boolean): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
  useEffect(() => {
    let alive = true
    const draw = () => {
      const canvas = tex.image as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx || !alive) return
      const s = canvas.width
      const font = '"Nunito Sans Variable", "Nunito Sans", system-ui, sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, s, s)
      ctx.strokeStyle = C.tinta
      ctx.lineWidth = 6
      ctx.strokeRect(14, 14, s - 28, s - 28)
      ctx.fillStyle = C.tinta
      ctx.textBaseline = 'top'
      ctx.font = `800 52px ${font}`
      const titleLines = wrapLines(title, s - 80, 2, (x) => ctx.measureText(x).width)
      titleLines.forEach((l, i) => ctx.fillText(l, 40, 40 + i * 58))
      let y = 40 + titleLines.length * 58 + 12
      ctx.fillStyle = C.emas
      ctx.fillRect(40, y, 90, 8)
      y += 28
      ctx.fillStyle = empty ? '#6b7a78' : C.tinta
      ctx.font = `500 28px ${font}`
      const text = empty ? 'Koleksi berikutnya segera hadir.' : body ?? PENDING_TEXT
      const lines = wrapLines(text, s - 80, 9, (x) => ctx.measureText(x).width)
      lines.forEach((l, i) => ctx.fillText(l, 40, y + i * 36))
      if (!empty) {
        ctx.fillStyle = C.teal
        ctx.font = `800 26px ${font}`
        ctx.fillText('Klik kotak ini untuk kartu lengkap ›', 40, s - 66)
      }
      tex.needsUpdate = true
    }
    draw()
    void document.fonts?.ready.then(draw)
    return () => {
      alive = false
    }
  }, [tex, title, body, empty])
  useEffect(() => () => tex.dispose(), [tex])
  return tex
}

function Pedestal({
  index,
  e,
  data,
  layout,
  state,
  spin,
  wasDrag,
  onExhibit,
  onCard,
}: { index: number; e: Exhibit; data: ExhibitOut | null } & SceneProps) {
  const pos = useMemo(() => exhibitPos(layout, e), [layout, e])
  const yaw = useMemo(() => exhibitYaw(layout, e), [layout, e])
  const empty = data === null
  const label = useLabelTexture(data?.name ?? 'Segera hadir', data?.short_explanation ?? null, empty)
  const model = useRef<THREE.Group>(null)
  const light = useRef<THREE.SpotLight>(null)
  const aim = useRef<THREE.Object3D>(null)
  const inspecting = state.kind === 'inspect' && state.index === index
  const focused = (state.kind === 'focus' || state.kind === 'inspect') && state.index === index

  useEffect(() => {
    if (light.current && aim.current) light.current.target = aim.current
  }, [])
  useFrame((_, dt) => {
    if (!model.current) return
    model.current.rotation.y = damp(model.current.rotation.y, inspecting ? spin.current : 0, 8, Math.min(dt, 0.05))
  })

  const click = (handler: (i: number) => void) => (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation()
    if (!wasDrag() && !empty) handler(index)
  }

  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <mesh position={[0, BOX.h / 2, 0]} onClick={click(onCard)}>
        <boxGeometry args={[BOX.w, BOX.h, BOX.d]} />
        <meshStandardMaterial color={focused ? '#ffffff' : '#f3efe6'} roughness={0.9} />
      </mesh>
      <mesh position={[0, BOX.h / 2, BOX.d / 2 + 0.002]} onClick={click(onCard)}>
        <planeGeometry args={[BOX.w * 0.94, BOX.h * 0.94]} />
        <meshBasicMaterial map={label} toneMapped={false} />
      </mesh>
      <group ref={model} position={[0, BOX.h, 0]} onClick={click(onExhibit)}>
        {data && (
          <ModelBoundary key={data.id} fallback={<FallbackModel id={data.id} />}>
            <Suspense fallback={<FallbackModel id={data.id} />}>
              {data.model_available && data.model_src ? (
                <FittedModel url={modelUrl(data.model_src)} />
              ) : (
                <FallbackModel id={data.id} />
              )}
            </Suspense>
          </ModelBoundary>
        )}
      </group>
      <object3D ref={aim} position={[0, 1.3, 0]} />
      <spotLight
        ref={light}
        position={[0, 3.9, 1.4]}
        angle={0.45}
        penumbra={0.7}
        intensity={focused ? 70 : 40}
        distance={9}
        color="#fff3dc"
      />
    </group>
  )
}

/** GLB voxel dipaskan ke ruang tampil di atas pedestal (tinggi/lebar maks. FIT). */
function FittedModel({ url, maxH = FIT.h, maxW = FIT.w }: { url: string; maxH?: number; maxW?: number }) {
  const { scene } = useGLTF(url, false, false)
  const obj = useMemo(() => {
    const clone = scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const k = Math.min(maxH / (size.y || 1), maxW / (Math.max(size.x, size.z) || 1))
    clone.scale.setScalar(k)
    const b2 = new THREE.Box3().setFromObject(clone)
    const center = b2.getCenter(new THREE.Vector3())
    clone.position.set(-center.x, -b2.min.y, -center.z)
    return clone
  }, [scene, maxH, maxW])
  return <primitive object={obj} />
}

/** Pengganti bila model belum dibuat atau gagal dimuat (prinsip "gagal dengan anggun"). */
function FallbackModel({ id }: { id: string }) {
  if (id.includes('angklung')) {
    return (
      <group>
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={x} position={[x, 0.32 + i * 0.04, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.5 + i * 0.08, 16]} />
            <meshStandardMaterial color={C.emas} roughness={0.6} />
          </mesh>
        ))}
        {[0.08, 0.62].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.52, 0.04, 0.08]} />
            <meshStandardMaterial color="#8a6a3a" />
          </mesh>
        ))}
      </group>
    )
  }
  return (
    <mesh position={[0, 0.3, 0]}>
      <boxGeometry args={[0.4, 0.6, 0.4]} />
      <meshStandardMaterial color={C.kertas} transparent opacity={0.45} />
    </mesh>
  )
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/**
 * Maskot pemandu: melayang di depan-kanan kamera dan menyusul dengan tertunda (mengikuti
 * pengguna), menghadap kamera, menampilkan gelembung kalimat pemandu. Klik = tanya.
 */
function Mascot({ guideModel, guideLine, reducedMotion, wasDrag, onMascot, state }: SceneProps) {
  const ref = useRef<THREE.Group>(null)
  const camera = useThree((s) => s.camera)
  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), target: new THREE.Vector3() }), [])
  const t0 = useRef(0)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    t0.current += dt
    camera.getWorldDirection(tmp.fwd)
    tmp.fwd.y = 0
    tmp.fwd.normalize()
    tmp.right.set(-tmp.fwd.z, 0, tmp.fwd.x)
    const close = state.kind === 'inspect'
    const ahead = close ? 1.1 : 1.9
    const side = close ? 0.8 : 1.05
    tmp.target.copy(camera.position).addScaledVector(tmp.fwd, ahead).addScaledVector(tmp.right, side)
    const bob = reducedMotion ? 0 : Math.sin(t0.current * 2) * 0.04
    tmp.target.y = camera.position.y - 0.85 + bob
    if (reducedMotion) g.position.copy(tmp.target)
    else {
      const d = Math.min(dt, 0.05)
      g.position.set(damp(g.position.x, tmp.target.x, 2.5, d), damp(g.position.y, tmp.target.y, 4, d), damp(g.position.z, tmp.target.z, 2.5, d))
    }
    g.lookAt(camera.position.x, g.position.y, camera.position.z)
  })

  const click = (ev: ThreeEvent<MouseEvent>) => {
    ev.stopPropagation()
    if (!wasDrag()) onMascot()
  }

  return (
    <group ref={ref}>
      <group onClick={click}>
        <ModelBoundary fallback={<MascotFallback />}>
          <Suspense fallback={<MascotFallback />}>
            {guideModel ? <FittedModel url={modelUrl(guideModel)} maxH={0.38} maxW={0.42} /> : <MascotFallback />}
          </Suspense>
        </ModelBoundary>
        {/* area klik yang lebih besar dari model voxel */}
        <mesh position={[0, 0.22, 0]} visible={false}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
      </group>
      {guideLine && (
        <Html position={[0, 0.62, 0]} center distanceFactor={1.6} zIndexRange={[20, 0]}>
          {/* aria-hidden: kalimat yang sama sudah diumumkan lewat wilayah aria-live */}
          <div aria-hidden="true" className="pointer-events-none w-56 rounded-md border-2 border-tinta bg-white px-3 py-2 text-xs font-semibold leading-snug text-tinta shadow-kartu">
            {guideLine}
          </div>
        </Html>
      )}
    </group>
  )
}

function MascotFallback() {
  return (
    <group>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.36, 0.36, 0.3]} />
        <meshStandardMaterial color={C.teal} />
      </mesh>
      <mesh position={[0, 0.43, 0]}>
        <boxGeometry args={[0.38, 0.1, 0.32]} />
        <meshStandardMaterial color={C.emas} />
      </mesh>
    </group>
  )
}
