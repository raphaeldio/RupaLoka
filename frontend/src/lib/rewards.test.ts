import { describe, expect, it } from 'vitest'
import type { Rewards } from './api.types'
import {
  earnedBadges,
  emptyPath,
  GAME_NODE,
  maxPathPoints,
  newBadges,
  nextBadge,
  nextNode,
  pathNodes,
  pathPoints,
} from './rewards'

const badge = (id: string, min_points: number) => ({ id, name: id, min_points, description: '' })
const rewards: Rewards = {
  points_per_node: 100,
  points_per_correct: 10,
  game_node_points: 100,
  leaderboard: null,
  badges: [badge('a', 100), badge('b', 300), badge('c', 500)],
}
const lessons = ['l1', 'l2', 'l3']

describe('pathNodes', () => {
  it('membuka titik secara berurutan; game terakhir', () => {
    const s = (p = emptyPath()) => pathNodes(lessons, p).map((n) => n.status)
    expect(s()).toEqual(['open', 'locked', 'locked', 'locked'])
    expect(s({ ...emptyPath(), completed: ['l1'] })).toEqual(['done', 'open', 'locked', 'locked'])
    expect(s({ ...emptyPath(), completed: ['l1', 'l2', 'l3'] })).toEqual(['done', 'done', 'done', 'open'])
    expect(s({ completed: ['l1', 'l2', 'l3'], correct: {}, gameDone: true })).toEqual(['done', 'done', 'done', 'done'])
    expect(pathNodes(lessons, emptyPath()).at(-1)!.id).toBe(GAME_NODE)
  })

  it('titik berikutnya = titik terbuka pertama', () => {
    expect(nextNode(pathNodes(lessons, { ...emptyPath(), completed: ['l1'] }))!.id).toBe('l2')
    expect(nextNode(pathNodes(lessons, { completed: lessons, correct: {}, gameDone: true }))).toBeNull()
  })
})

describe('poin dan lencana', () => {
  it('menghitung poin titik, jawaban benar, dan game', () => {
    expect(pathPoints(lessons, emptyPath(), rewards)).toBe(0)
    expect(pathPoints(lessons, { completed: ['l1'], correct: { l1: 2, l2: 1 }, gameDone: false }, rewards)).toBe(120)
    expect(pathPoints(lessons, { completed: lessons, correct: {}, gameDone: true }, rewards)).toBe(400)
    // id materi usang tidak dihitung
    expect(pathPoints(lessons, { completed: ['lama'], correct: { lama: 5 }, gameDone: false }, rewards)).toBe(0)
    expect(maxPathPoints(lessons, 5, rewards)).toBe(450)
  })

  it('lencana didapat, berikutnya, dan yang baru', () => {
    expect(earnedBadges(320, rewards.badges).map((b) => b.id)).toEqual(['a', 'b'])
    expect(nextBadge(320, rewards.badges)!.id).toBe('c')
    expect(nextBadge(600, rewards.badges)).toBeNull()
    expect(newBadges(90, 310, rewards.badges).map((b) => b.id)).toEqual(['a', 'b'])
    expect(newBadges(310, 320, rewards.badges)).toEqual([])
  })
})
