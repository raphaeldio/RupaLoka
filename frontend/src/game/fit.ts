import { WORLD_H, WORLD_W } from './engine'

const MIN_VIEW_W = 540

/**
 * Ukuran kanvas (px CSS) dan lebar dunia yang tampil agar kanvas mengisi area w x h
 * tanpa merusak rasio. Lebar dunia dibatasi MIN_VIEW_W..WORLD_W agar rintangan tetap
 * terlihat cukup lama sebelum sampai.
 */
export function fitCanvas(areaW: number, areaH: number): { w: number; h: number; viewW: number } {
  const viewW = Math.min(WORLD_W, Math.max(MIN_VIEW_W, (areaW * WORLD_H) / Math.max(1, areaH)))
  let w = areaW
  let h = (w * WORLD_H) / viewW
  if (h > areaH) {
    h = areaH
    w = (h * viewW) / WORLD_H
  }
  return { w: Math.floor(w), h: Math.floor(h), viewW }
}
