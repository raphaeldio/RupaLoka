/** ?debug=1 hanya di luar produksi (T-055), kecuali VITE_ALLOW_DEBUG=true. Skor ×10. */
export function debugMultiplier(search: string): number {
  const allowed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEBUG === 'true'
  return allowed && new URLSearchParams(search).get('debug') === '1' ? 10 : 1
}
