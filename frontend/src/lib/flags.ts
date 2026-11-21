/** Fitur yang ditunda dari MVP-0 (SDD §11). Jangan diaktifkan tanpa keputusan tim. */
export const featureFlags = {
  viewer3d: false,
  class_mode: false,
  premium_content: false,
  /**
   * Syarat titik selesai (21 Nov 2026): kedua kuis dijawab semua dan video materi ditonton
   * minimal 3 menit pertama; bila dilewati, titik tidak selesai dan tanpa poin.
   * Disembunyikan untuk MVP (keputusan tim 21 Nov 2026): titik selesai walau kuis/video dilewati.
   */
  strict_node_requirements: false,
} as const
