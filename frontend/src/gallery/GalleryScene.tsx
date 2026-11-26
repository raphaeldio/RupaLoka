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
  poseFor,
  type CamState,
  type Exhibit,
  type Layout,
} from './cameraFlow'
import { PENDING_TEXT, wrapLines } from './labelText'
import MuseumRoom, { ROOM_H, TrackLight } from './MuseumRoom'
import { MUSEUM } from './museumTextures'

const C = {
  kertas: '#f5f1e8',
  tinta: '#1d2a2a',
  teal: '#146b68',
  teal800: '#0e4d4b',
  emas: '#e8b64c',
  bata: '#b5523b',
}

/**
 * Pedestal bergaya museum (m): plinth gelap, badan kayu, pita putih berlabel (nama +
 * penjelasan singkat), tutup marun. Model dipaskan ke ruang FIT di atas TOP.
 */
const PED = { w: 0.82, d: 0.66, plinth: 0.1, body: 0.55, band: 0.33, top: 0.06 }
const BAND_Y = PED.plinth + PED.body + PED.band / 2
const TOP = PED.plinth + PED.body + PED.band + PED.top
const FIT = { w: 0.85, h: 0.85 }
/** Lampu sorot plafon: 1,4 m ke arah lorong dari pedestal. */
const LAMP: [number, number, number] = [0, ROOM_H - 0.12, 1.4]

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
      <color attach="background" args={[MUSEUM.background]} />
      <fog attach="fog" args={[MUSEUM.background, 10, 24]} />
      <ambientLight intensity={0.6} color="#ffe9d0" />
      <hemisphereLight args={['#fff1dc', '#3a2016', 0.55]} />
      <directionalLight position={[-6, 8, 4]} intensity={0.35} color="#fff1dc" />
      <CameraRig layout={props.layout} state={props.state} reducedMotion={props.reducedMotion} />
      <MuseumRoom layout={props.layout} />
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

/** Tekstur pita putih pedestal: plakat emas bernama + penjelasan singkat (atau pending). */
function useLabelTexture(title: string, body: string | null, empty: boolean): THREE.CanvasTexture {
  const tex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = Math.round((1024 * PED.band) / PED.w)
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
      const w = canvas.width
      const h = canvas.height
      const font = '"Nunito Sans Variable", "Nunito Sans", system-ui, sans-serif'
      ctx.fillStyle = '#f6f2e8'
      ctx.fillRect(0, 0, w, h)
      // plakat emas bernama
      ctx.font = `800 54px ${font}`
      const name = wrapLines(title, w - 200, 1, (x) => ctx.measureText(x).width)[0]
      const pw = Math.min(w - 80, ctx.measureText(name).width + 80)
      const px = (w - pw) / 2
      ctx.fillStyle = '#8a6a2a'
      ctx.fillRect(px - 4, 22, pw + 8, 84)
      ctx.fillStyle = MUSEUM.plaque
      ctx.fillRect(px, 26, pw, 76)
      ctx.fillStyle = '#2a1a0e'
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(name, w / 2, 66)
      // penjelasan singkat
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillStyle = empty ? '#7a6f64' : '#2a1a0e'
      ctx.font = `600 30px ${font}`
      const text = empty ? 'Koleksi berikutnya segera hadir.' : body ?? PENDING_TEXT
      const lines = wrapLines(text, w - 100, 5, (x) => ctx.measureText(x).width)
      lines.forEach((l, i) => ctx.fillText(l, 50, 128 + i * 38))
      if (!empty) {
        ctx.fillStyle = '#6b1e1e'
        ctx.font = `800 26px ${font}`
        ctx.textAlign = 'right'
        ctx.fillText('Klik untuk kartu lengkap ›', w - 40, h - 46)
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
      <group onClick={click(onCard)}>
        <mesh position={[0, PED.plinth / 2, 0]}>
          <boxGeometry args={[PED.w + 0.14, PED.plinth, PED.d + 0.14]} />
          <meshStandardMaterial color={MUSEUM.pedestalPlinth} roughness={0.8} />
        </mesh>
        <mesh position={[0, PED.plinth + PED.body / 2, 0]}>
          <boxGeometry args={[PED.w, PED.body, PED.d]} />
          <meshStandardMaterial color={MUSEUM.pedestalBody} roughness={0.75} />
        </mesh>
        <mesh position={[0, BAND_Y, 0]}>
          <boxGeometry args={[PED.w + 0.02, PED.band, PED.d + 0.02]} />
          <meshStandardMaterial color={focused ? '#ffffff' : '#f3efe6'} roughness={0.9} />
        </mesh>
        <mesh position={[0, BAND_Y, PED.d / 2 + 0.012]}>
          <planeGeometry args={[PED.w, PED.band]} />
          <meshBasicMaterial map={label} toneMapped={false} />
        </mesh>
        <mesh position={[0, TOP - PED.top / 2, 0]}>
          <boxGeometry args={[PED.w + 0.06, PED.top, PED.d + 0.06]} />
          <meshStandardMaterial color={MUSEUM.pedestalTop} roughness={0.7} />
        </mesh>
      </group>
      <group ref={model} position={[0, TOP, 0]} onClick={click(onExhibit)}>
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
      <TrackLight position={LAMP} />
      <spotLight
        ref={light}
        position={[LAMP[0], LAMP[1] - 0.2, LAMP[2]]}
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
          <div aria-hidden="true" className="pointer-events-none w-56 rounded-xl border border-emas/40 bg-white px-3 py-2 text-xs font-semibold leading-snug text-tinta shadow-kartu">
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
