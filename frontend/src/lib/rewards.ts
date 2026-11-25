/**
 * Path belajar kota: status titik, poin, dan lencana (fungsi murni).
 *
 * Titik = materi (`lessons`, berurutan) + satu titik game di akhir. Titik ke-1 selalu
 * terbuka; titik berikutnya terbuka setelah titik sebelumnya selesai. Titik game
 * terbuka setelah semua titik materi selesai.
 */
import type { Badge, Rewards } from './api.types'

export const GAME_NODE = 'game'

export type NodeStatus = 'locked' | 'open' | 'done'

export interface PathProgress {
  /** id materi yang sudah selesai (kuis + materi). */
  completed: string[]
  /** Jawaban soal fakta benar terbaik per materi. */
  correct: Record<string, number>
  /** Jawaban soal nilai (kind: nilai) benar terbaik per materi (data lama: tidak ada). */
  valueCorrect?: Record<string, number>
  /** Soal refleksi akhir tur yang jawabannya dikenali (id soal -> true). */
  reflection?: Record<string, boolean>
  /** Game sudah dimainkan sampai selesai minimal sekali. */
  gameDone: boolean
  /** Skor game terbaik (jarak/10); ikut dijumlahkan ke poin path setelah game selesai. */
  best?: number
}

export const emptyPath = (): PathProgress => ({ completed: [], correct: {}, gameDone: false })

export interface PathNode {
  id: string // id materi atau GAME_NODE
  index: number
  status: NodeStatus
}

export function pathNodes(lessonIds: string[], p: PathProgress): PathNode[] {
  const nodes: PathNode[] = lessonIds.map((id, i) => {
    const done = p.completed.includes(id)
    const prevDone = i === 0 || p.completed.includes(lessonIds[i - 1])
    return { id, index: i, status: done ? 'done' : prevDone ? 'open' : 'locked' }
  })
  const allDone = lessonIds.every((id) => p.completed.includes(id))
  nodes.push({
    id: GAME_NODE,
    index: lessonIds.length,
    status: p.gameDone ? 'done' : allDone ? 'open' : 'locked',
  })
  return nodes
}

/** Titik yang sebaiknya dikerjakan berikutnya (titik terbuka pertama), atau null. */
export function nextNode(nodes: PathNode[]): PathNode | null {
  return nodes.find((n) => n.status === 'open') ?? null
}

/** Poin per soal nilai / refleksi; API lama tanpa field ini → 0. */
const perValue = (r: Rewards): number => (Number.isFinite(r.points_per_value) ? r.points_per_value : 0)
const perReflection = (r: Rewards): number => (Number.isFinite(r.points_per_reflection) ? r.points_per_reflection : 0)

/** Jumlah refleksi akhir tur yang dikenali. */
export const reflectionCount = (p: PathProgress): number => Object.values(p.reflection ?? {}).filter(Boolean).length

/**
 * Poin materi + kuis (fakta dan nilai) + refleksi + bonus titik game (tanpa skor lari).
 * Id materi usang diabaikan. Soal nilai dan refleksi berpoin lebih besar agar peringkat
 * mencerminkan pemahaman, bukan kecepatan berlari (masukan juri, 25 Nov 2026).
 */
export function lessonPoints(lessonIds: string[], p: PathProgress, r: Rewards): number {
  const done = lessonIds.filter((id) => p.completed.includes(id))
  const correct = done.reduce((n, id) => n + (p.correct[id] ?? 0), 0)
  const values = done.reduce((n, id) => n + (p.valueCorrect?.[id] ?? 0), 0)
  return (
    done.length * r.points_per_node +
    correct * r.points_per_correct +
    values * perValue(r) +
    reflectionCount(p) * perReflection(r) +
    (p.gameDone ? r.game_node_points : 0)
  )
}

/** Skor game yang ikut dihitung: skor terbaik (maks. `game_score_cap`), hanya setelah game pernah diselesaikan. */
export const gamePoints = (p: PathProgress, r: Rewards): number =>
  p.gameDone ? Math.min(gameCap(r), Math.max(0, Math.round(p.best ?? 0))) : 0

/** Batas skor game; API lama tanpa field ini → skor game tidak dihitung (aman untuk batas papan peringkat). */
const gameCap = (r: Rewards): number => (Number.isFinite(r.game_score_cap) ? Math.max(0, r.game_score_cap) : 0)

/** Poin kota = poin materi/kuis + skor game terbaik (dipakai lencana dan papan peringkat). */
export function pathPoints(lessonIds: string[], p: PathProgress, r: Rewards): number {
  return lessonPoints(lessonIds, p, r) + gamePoints(p, r)
}

/** Batas jawaban benar per jenis soal di seluruh path, dan jumlah soal refleksi. */
export interface QuizCaps {
  facts: number
  values: number
  reflections: number
}

/** Poin maksimum dari materi, kuis, refleksi, dan bonus titik game (skor lari tidak punya batas atas). */
export const maxPathPoints = (lessonIds: string[], caps: QuizCaps, r: Rewards): number =>
  lessonIds.length * r.points_per_node +
  caps.facts * r.points_per_correct +
  caps.values * perValue(r) +
  caps.reflections * perReflection(r) +
  r.game_node_points

/** Poin kota maksimum termasuk batas skor game (= max_points papan peringkat di backend). */
export const maxCityPoints = (lessonIds: string[], caps: QuizCaps, r: Rewards): number =>
  maxPathPoints(lessonIds, caps, r) + gameCap(r)

export function earnedBadges(points: number, badges: Badge[]): Badge[] {
  return badges.filter((b) => points >= b.min_points)
}

/** Lencana berikutnya yang belum didapat, untuk bilah kemajuan. */
export function nextBadge(points: number, badges: Badge[]): Badge | null {
  return badges.find((b) => points < b.min_points) ?? null
}

/** Lencana yang baru didapat saat poin naik dari `before` ke `after`. */
export function newBadges(before: number, after: number, badges: Badge[]): Badge[] {
  return badges.filter((b) => before < b.min_points && after >= b.min_points)
}
