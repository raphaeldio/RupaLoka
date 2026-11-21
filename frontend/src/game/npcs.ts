/**
 * Karakter piksel milik tim (folder "PIXEL NPC"): warga yang ditemui di jalan dan di latar.
 * Pelari (karakter pangsi) digambar tampak samping di runnerSprite.ts.
 * Tiap ambang unlock (Bandung: 1000 poin = 100 m) pelari bertemu satu NPC yang menjelaskan
 * item budaya. NPC hanya pemandu, bukan rintangan (tidak ada tabrakan).
 */
import npcAngklung from './sprites/npc-angklung.png'
import npcAngklung2 from './sprites/npc-angklung-2.png'
import npcWayang from './sprites/npc-wayang.png'

export interface NpcDef {
  /** Sebutan di dialog; nama tokoh belum diputuskan tim, jadi pakai peran. */
  label: string
  sprite: string
  /** Lebar ÷ tinggi gambar (untuk kanvas sebelum gambar termuat). */
  aspect: number
}


const ANGKLUNG: NpcDef = { label: 'Pemain angklung', sprite: npcAngklung, aspect: 52 / 128 }
const WAYANG: NpcDef = { label: 'Pembawa wayang golek', sprite: npcWayang, aspect: 102 / 128 }
const WARGA: NpcDef = { label: 'Warga Bandung', sprite: npcAngklung2, aspect: 59 / 128 }

/** NPC per id item; item lain memakai NPC warga. */
const BY_ITEM: Record<string, NpcDef> = {
  'item-angklung': ANGKLUNG,
  'item-wayang': WAYANG,
  'item-cepot': WAYANG,
}

/** Warga acak di latar (hiasan, lihat ambient.ts). */
export const AMBIENT_NPCS: NpcDef[] = [ANGKLUNG, WAYANG, WARGA]

/** Semua gambar karakter, untuk dimuat lebih awal. Pelari digambar di runnerSprite.ts. */
export const ALL_SPRITES = [ANGKLUNG.sprite, WAYANG.sprite, WARGA.sprite]

export const npcFor = (itemId: string | undefined): NpcDef => (itemId && BY_ITEM[itemId]) || WARGA
