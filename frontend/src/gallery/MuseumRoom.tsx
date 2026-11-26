import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { modelUrl } from '../lib/api'
import type { DecorOut } from '../lib/api.types'
import { HALF_W, ringCenter, type Layout } from './cameraFlow'
import { artTexture, floorTexture, MUSEUM, wallPanelTexture } from './museumTextures'

/** Tinggi ruangan dan batas panel kayu (di atasnya list krem melengkung ke plafon). */
export const ROOM_H = 4.2
const PANEL_H = 3.5
const PANEL_W = 1.2

function useDispose<T extends { dispose: () => void }>(items: T[]) {
  useEffect(() => () => items.forEach((t) => t.dispose()), [items])
}

/**
 * Ruang museum berbentuk lorong cincin (pengganti sampai GLB ruangan dari Blender, T-121):
 * dinding panel kayu, list krem, plafon terang, lantai ubin dengan garis kuningan, dan
 * bingkai hiasan di dinding seberang tiap pedestal.
 */
export default function MuseumRoom({
  layout,
  decor = [],
  onDecor,
  wasDrag,
}: {
  layout: Layout
  decor?: DecorOut[]
  onDecor?: (slot: number) => void
  wasDrag?: () => boolean
}) {
  const c = ringCenter(layout)
  const R = layout.radius
  const rin = R - HALF_W
  const rout = R + HALF_W
  const tex = useMemo(
    () => ({
      wallIn: wallPanelTexture(Math.round((2 * Math.PI * rin) / PANEL_W)),
      wallOut: wallPanelTexture(Math.round((2 * Math.PI * rout) / PANEL_W)),
      floor: floorTexture((2 * rout) / 0.9),
    }),
    [rin, rout],
  )
  useDispose(useMemo(() => Object.values(tex), [tex]))

  return (
    <group>
      <group position={c}>
        {/* dinding panel kayu: dalam (cembung) dan luar (cekung) */}
        <mesh position={[0, PANEL_H / 2, 0]}>
          <cylinderGeometry args={[rin, rin, PANEL_H, 96, 1, true]} />
          <meshStandardMaterial map={tex.wallIn} roughness={0.85} />
        </mesh>
        <mesh position={[0, PANEL_H / 2, 0]}>
          <cylinderGeometry args={[rout, rout, PANEL_H, 160, 1, true]} />
          <meshStandardMaterial map={tex.wallOut} side={THREE.BackSide} roughness={0.85} />
        </mesh>
        {/* list krem antara panel dan plafon */}
        <mesh position={[0, (PANEL_H + ROOM_H) / 2, 0]}>
          <cylinderGeometry args={[rin - 0.25, rin, ROOM_H - PANEL_H, 96, 1, true]} />
          <meshStandardMaterial color={MUSEUM.cove} roughness={0.9} />
        </mesh>
        <mesh position={[0, (PANEL_H + ROOM_H) / 2, 0]}>
          <cylinderGeometry args={[rout + 0.25, rout, ROOM_H - PANEL_H, 160, 1, true]} />
          <meshStandardMaterial color={MUSEUM.cove} side={THREE.BackSide} roughness={0.9} />
        </mesh>
        <mesh position={[0, PANEL_H, 0]}>
          <cylinderGeometry args={[rout - 0.03, rout - 0.03, 0.06, 160, 1, true]} />
          <meshStandardMaterial color={MUSEUM.wallDark} side={THREE.BackSide} />
        </mesh>
        {/* plinth dinding + garis kuningan */}
        {[
          { r: rin + 0.03, side: THREE.FrontSide },
          { r: rout - 0.03, side: THREE.BackSide },
        ].map(({ r, side }) => (
          <group key={r}>
            <mesh position={[0, 0.1, 0]}>
              <cylinderGeometry args={[r, r, 0.2, 160, 1, true]} />
              <meshStandardMaterial color={MUSEUM.base} side={side} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
              <cylinderGeometry args={[r, r, 0.04, 160, 1, true]} />
              <meshStandardMaterial color={MUSEUM.brass} metalness={0.4} roughness={0.5} side={side} />
            </mesh>
          </group>
        ))}
        {/* lantai ubin + garis kuningan melengkung */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rin, rout, 160]} />
          <meshStandardMaterial map={tex.floor} roughness={0.6} />
        </mesh>
        {[R - 1.35, R + 1.35].map((r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <ringGeometry args={[r - 0.025, r + 0.025, 160]} />
            <meshStandardMaterial color={MUSEUM.brass} metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
        {/* plafon */}
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
          <ringGeometry args={[rin - 0.25, rout + 0.25, 160]} />
          <meshStandardMaterial color={MUSEUM.ceiling} side={THREE.DoubleSide} roughness={1} />
        </mesh>
      </group>
      <WallFrames layout={layout} decor={decor} onDecor={onDecor} wasDrag={wasDrag} />
    </group>
  )
}

/**
 * Hiasan di dinding seberang tiap pedestal, dengan lampu kecil di atasnya: lukisan dari
 * `gallery.yaml` → `decor` bila modelnya ada, selain itu bingkai abstrak (juga sebagai
 * cadangan selama model dimuat atau bila gagal).
 */
function WallFrames({
  layout,
  decor,
  onDecor,
  wasDrag,
}: {
  layout: Layout
  decor: DecorOut[]
  onDecor?: (slot: number) => void
  wasDrag?: () => boolean
}) {
  const arts = useMemo(() => [artTexture(0), artTexture(1)] as const, [])
  useDispose(useMemo(() => [...arts], [arts]))
  return (
    <>
      {layout.exhibits.map((e, i) => {
        const f = layout.at(e.d)
        const s = -e.side // dinding seberang pedestal
        const inset = s < 0 ? 0.09 : 0.05 // dinding dalam cembung: sedikit lebih jauh
        const k = s * (HALF_W - inset)
        const pos: [number, number, number] = [f.p[0] + f.n[0] * k, 1.75, f.p[2] + f.n[2] * k]
        const yaw = Math.atan2(-s * f.n[0], -s * f.n[2]) // menghadap garis tengah
        const w = s < 0 ? 1.15 : 1.5
        const painting = decor.find((d) => d.slot === i && d.model_available)
        const abstract = (
          <>
            <mesh>
              <boxGeometry args={[w + 0.14, 0.86, 0.06]} />
              <meshStandardMaterial color={MUSEUM.frame} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0.031]}>
              <planeGeometry args={[w, 0.72]} />
              <meshStandardMaterial map={arts[i % 2]} roughness={0.9} />
            </mesh>
          </>
        )
        const maxH = 1.5
        const lampY = painting ? maxH / 2 + 0.12 : 0.52
        return (
          <group
            key={e.id}
            position={[pos[0], painting ? 1.95 : pos[1], pos[2]]}
            rotation={[0, yaw, 0]}
            onClick={
              painting && onDecor
                ? (ev: ThreeEvent<MouseEvent>) => {
                    ev.stopPropagation()
                    if (!wasDrag?.()) onDecor(i)
                  }
                : undefined
            }
          >
            {painting ? (
              <DecorBoundary fallback={abstract}>
                <Suspense fallback={abstract}>
                  <WallModel url={modelUrl(painting.model_src)} maxW={w + 0.1} maxH={maxH} />
                </Suspense>
              </DecorBoundary>
            ) : (
              abstract
            )}
            {[-1, 0, 1].map((x) => (
              <group key={x} position={[x * w * 0.33, lampY, 0.06]}>
                <mesh>
                  <boxGeometry args={[0.07, 0.1, 0.07]} />
                  <meshStandardMaterial color="#141110" />
                </mesh>
                <mesh position={[0, -0.06, 0]}>
                  <boxGeometry args={[0.07, 0.02, 0.07]} />
                  <meshStandardMaterial color="#fff4d8" emissive="#ffe9b8" emissiveIntensity={1.4} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}
    </>
  )
}

/** Model pajangan dinding: dipaskan ke lebar/tinggi maks., tengah di asal, belakang di z=0. */
function WallModel({ url, maxW, maxH }: { url: string; maxW: number; maxH: number }) {
  const { scene } = useGLTF(url, false, false)
  const obj = useMemo(() => {
    const clone = scene.clone(true)
    const size = new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3())
    clone.scale.setScalar(Math.min(maxW / (size.x || 1), maxH / (size.y || 1)))
    const b = new THREE.Box3().setFromObject(clone)
    const c = b.getCenter(new THREE.Vector3())
    clone.position.set(-c.x, -c.y, -b.min.z + 0.005)
    return clone
  }, [scene, maxW, maxH])
  return <primitive object={obj} />
}

class DecorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Lampu sorot plafon (badan hitam, ujung menyala) untuk pedestal. */
export function TrackLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial color="#141110" />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 12]} />
        <meshStandardMaterial color="#141110" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.185, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
        <meshStandardMaterial color="#fff4d8" emissive="#ffe9b8" emissiveIntensity={1.6} />
      </mesh>
    </group>
  )
}
