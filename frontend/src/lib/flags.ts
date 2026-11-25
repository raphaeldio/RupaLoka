/** Fitur yang ditunda dari MVP-0 (SDD §11). Jangan diaktifkan tanpa keputusan tim. */
const defaults = {
  viewer3d: false,
  class_mode: false,
  premium_content: false,
  /**
   * Syarat titik selesai (21 Nov 2026): kedua kuis dijawab semua dan video materi ditonton
   * minimal 3 menit pertama; bila dilewati, titik tidak selesai dan tanpa poin.
   * Disembunyikan untuk MVP (keputusan tim 21 Nov 2026): titik selesai walau kuis/video dilewati.
   */
  strict_node_requirements: false,
}

export type FeatureFlags = { readonly [K in keyof typeof defaults]: boolean }

/**
 * Baca flag dari env build `VITE_FLAGS` (dipisah koma), mis. `viewer3d,premium_content`
 * untuk demo galeri 3D (SDD ADR 40). Nama yang tidak dikenal diabaikan; bawaan semua mati.
 */
export function parseFlags(raw: string | undefined): FeatureFlags {
  const on = new Set((raw ?? '').split(',').map((s) => s.trim()))
  const out = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof typeof defaults)[]) {
    if (on.has(key)) out[key] = true
  }
  return out
}

export const featureFlags: FeatureFlags = parseFlags(import.meta.env.VITE_FLAGS)

/** Galeri 3D/VR hanya untuk premium (ADR 40); untuk demo dibuka lewat flag. */
export const galleryEnabled: boolean = featureFlags.viewer3d && featureFlags.premium_content
