import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { corridorLength, damp, exhibitPos, HALF_W, poseFor, type CamState, type Exhibit } from './flow'

const C = {
  kertas: '#f5f1e8',
  tinta: '#1d2a2a',
  teal: '#146b68',
  teal800: '#0e4d4b',
  emas: '#e8b64c',
  bata: '#b5523b',
}

export interface SceneProps {
  state: CamState
  exhibits: Exhibit[]
  reducedMotion: boolean
  /** true bila pointer terakhir adalah drag (bukan klik) */
  wasDrag: () => boolean
  spin: React.MutableRefObject<number>
  onExhibit: (i: number) => void
  onHotspot: (i: number, h: number) => void
  onMiss: () => void
}

/** Rig kamera: meluruh menuju pose state; gerak dikurangi = langsung lompat. */
function CameraRig({ state, exhibits, reducedMotion }: Pick<SceneProps, 'state' | 'exhibits' | 'reducedMotion'>) {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / s.size.height)
  // 0 di layar lebar, naik sampai 1 di ponsel tegak (aspek ~0.5)
  const portrait = Math.min(1, Math.max(0, (1 - aspect) / 0.5))
  const look = useRef(new THREE.Vector3(...poseFor({ kind: 'intro' }, exhibits).target))
  const first = useRef(true)

  useFrame((_, dt) => {
    const pose = poseFor(state, exhibits, portrait)
    const d = Math.min(dt, 0.05)
    const lambda = state.kind === 'walk' ? 6 : 3.2
    if (reducedMotion || first.current) {
      camera.position.set(...pose.position)
      look.current.set(...pose.target)
      first.current = false
    } else {
      camera.position.set(
        damp(camera.position.x, pose.position[0], lambda, d),
        damp(camera.position.y, pose.position[1], lambda, d),
        damp(camera.position.z, pose.position[2], lambda, d),
      )
      look.current.set(
        damp(look.current.x, pose.target[0], lambda, d),
        damp(look.current.y, pose.target[1], lambda, d),
        damp(look.current.z, pose.target[2], lambda, d),
      )
    }
    camera.lookAt(look.current)
    // Layar tegak: lebarkan FOV vertikal agar objek di sisi lorong tetap terlihat.
    const fov = 55 + portrait * 22
    const cam = camera as THREE.PerspectiveCamera
    if (Math.abs(cam.fov - fov) > 0.1) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
  })
  return null
}

/** Lorong lurus: dua dinding samping, lantai, langit-langit, dinding ujung. */
function Room({ exhibits }: { exhibits: Exhibit[] }) {
  const L = corridorLength(exhibits) + 6 // ruang 6 m di belakang titik awal (pintu masuk)
  const zc = -(L / 2 - 6)
  const H = 4.2
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh position={[side * HALF_W, H / 2, zc]} rotation={[0, -side * (Math.PI / 2), 0]}>
            <planeGeometry args={[L, H]} />
            <meshStandardMaterial color={C.kertas} roughness={0.95} />
          </mesh>
          {/* list dinding (pita bata) */}
          <mesh position={[side * (HALF_W - 0.02), 0.12, zc]}>
            <boxGeometry args={[0.04, 0.24, L]} />
            <meshStandardMaterial color={C.bata} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, H / 2, -(L - 6)]}>
        <planeGeometry args={[HALF_W * 2, H]} />
        <meshStandardMaterial color={C.teal} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zc]}>
        <planeGeometry args={[HALF_W * 2, L]} />
        <meshStandardMaterial color={C.tinta} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, zc]}>
        <planeGeometry args={[HALF_W * 2, L]} />
        <meshStandardMaterial color={C.teal800} roughness={1} />
      </mesh>
      {/* jalur lantai tengah sebagai penunjuk arah jalan */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, zc]}>
        <planeGeometry args={[0.5, L]} />
        <meshStandardMaterial color={'#24413f'} roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Objek pengganti dari primitif; model GLB asli menyusul dari Blender. */
function PlaceholderModel({ id }: { id: string }) {
  if (id === 'angklung') {
    return (
      <group position={[0, 0.05, 0]}>
        {[-0.18, 0, 0.18].map((x, i) => (
          <mesh key={x} position={[x, 0.32 + i * 0.04, 0]}>
            <cylinderGeometry args={[0.045, 0.045, 0.5 + i * 0.08, 16]} />
            <meshStandardMaterial color={C.emas} roughness={0.6} />
          </mesh>
        ))}
        {[0.08, 0.62].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.52, 0.04, 0.08]} />
            <meshStandardMaterial color={'#8a6a3a'} />
          </mesh>
        ))}
      </group>
    )
  }
  if (id === 'wayang' || id === 'cepot') {
    const body = id === 'wayang' ? C.teal : C.bata
    return (
      <group>
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.16, 0.2, 0.08, 24]} />
          <meshStandardMaterial color={'#5b4630'} />
        </mesh>
        <mesh position={[0, 0.38, 0]}>
          <capsuleGeometry args={[id === 'cepot' ? 0.15 : 0.11, 0.38, 6, 16]} />
          <meshStandardMaterial color={body} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <sphereGeometry args={[id === 'cepot' ? 0.13 : 0.1, 24, 16]} />
          <meshStandardMaterial color={id === 'cepot' ? '#c0392b' : '#d9b48a'} />
        </mesh>
      </group>
    )
  }
  return (
    <mesh position={[0, 0.35, 0]}>
      <boxGeometry args={[0.4, 0.6, 0.4]} />
      <meshStandardMaterial color={C.kertas} transparent opacity={0.35} />
    </mesh>
  )
}

/** Titik hotspot tiruan relatif terhadap objek (posisi kelak dari empty `hotspot_<id>` di GLB). */
export const MOCK_HOTSPOTS: [number, number, number][] = [
  [0.0, 0.75, 0.2],
  [0.22, 0.35, 0.18],
]

function ExhibitStand({
  ex,
  index,
  state,
  wasDrag,
  spin,
  onExhibit,
  onHotspot,
}: { ex: Exhibit; index: number } & Pick<SceneProps, 'state' | 'wasDrag' | 'spin' | 'onExhibit' | 'onHotspot'>) {
  const pos = useMemo(() => exhibitPos(ex), [ex])
  // Menghadap tengah lorong: objek di kanan (side 1) menghadap −X, di kiri menghadap +X.
  const facing = -ex.side * (Math.PI / 2)
  const light = useRef<THREE.SpotLight>(null)
  const aim = useRef<THREE.Object3D>(null)
  const model = useRef<THREE.Group>(null)
  const inspecting = state.kind === 'inspect' && state.index === index
  const focused = (state.kind === 'focus' || state.kind === 'inspect') && state.index === index

  useEffect(() => {
    if (light.current && aim.current) light.current.target = aim.current
  }, [])

  useFrame((_, dt) => {
    if (!model.current) return
    const targetRot = inspecting ? spin.current : 0
    model.current.rotation.y = damp(model.current.rotation.y, targetRot, 8, Math.min(dt, 0.05))
  })

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (wasDrag()) return
    onExhibit(index)
  }

  return (
    <group position={pos} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.5, 0]} onClick={click}>
        <boxGeometry args={[0.7, 1, 0.7]} />
        <meshStandardMaterial color={focused ? '#ffffff' : '#e9e2d2'} roughness={0.9} />
      </mesh>
      <group ref={model} position={[0, 1, 0]} onClick={click}>
        <PlaceholderModel id={ex.id} />
        {inspecting &&
          MOCK_HOTSPOTS.map((p, h) => (
            <mesh
              key={h}
              position={p}
              onClick={(e) => {
                e.stopPropagation()
                if (!wasDrag()) onHotspot(index, h)
              }}
            >
              <sphereGeometry args={[0.035, 16, 12]} />
              <meshBasicMaterial color={C.emas} />
            </mesh>
          ))}
      </group>
      <object3D ref={aim} position={[0, 1.2, 0]} />
      <spotLight
        ref={light}
        position={[0, 3.9, 1.4]}
        angle={0.42}
        penumbra={0.7}
        intensity={focused ? 70 : 45}
        distance={9}
        color={'#fff3dc'}
      />
    </group>
  )
}

export function Scene(props: SceneProps) {
  const { exhibits } = props
  return (
    <>
      <color attach="background" args={[C.teal800]} />
      <fog attach="fog" args={[C.teal800, 9, 22]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#fff3dc', C.tinta, 0.35]} />
      <CameraRig state={props.state} exhibits={exhibits} reducedMotion={props.reducedMotion} />
      <Room exhibits={exhibits} />
      {exhibits.map((ex, i) => (
        <ExhibitStand key={ex.id} ex={ex} index={i} {...props} />
      ))}
    </>
  )
}
