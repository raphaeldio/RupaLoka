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
  /** Jawaban benar terbaik per materi. */
  correct: Record<string, number>
  /** Game sudah dimainkan sampai selesai minimal sekali. */
  gameDone: boolean
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

/** Poin kota: hanya titik materi yang ada di kota (id usang diabaikan). */
export function pathPoints(lessonIds: string[], p: PathProgress, r: Rewards): number {
  const done = lessonIds.filter((id) => p.completed.includes(id))
  const correct = done.reduce((n, id) => n + (p.correct[id] ?? 0), 0)
  return done.length * r.points_per_node + correct * r.points_per_correct + (p.gameDone ? r.game_node_points : 0)
}

export const maxPathPoints = (lessonIds: string[], questionCount: number, r: Rewards): number =>
  lessonIds.length * r.points_per_node + questionCount * r.points_per_correct + r.game_node_points

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
