import { describe, expect, it } from 'vitest'
import type { Rewards } from './api.types'
import {
  earnedBadges,
  emptyPath,
  GAME_NODE,
  gamePoints,
  lessonPoints,
  maxCityPoints,
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
  points_per_value: 30,
  points_per_reflection: 50,
  game_node_points: 100,
  game_score_cap: 1000,
  leaderboard: null,
  badges: [badge('a', 100), badge('b', 300), badge('c', 500)],
}
const lessons = ['l1', 'l2', 'l3']
const caps5 = { facts: 5, values: 0, reflections: 0 }

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
    expect(maxPathPoints(lessons, caps5, rewards)).toBe(450)
  })

  it('skor game terbaik ikut dijumlahkan setelah game selesai', () => {
    const p = { completed: lessons, correct: { l1: 2 }, gameDone: true, best: 337 }
    expect(lessonPoints(lessons, p, rewards)).toBe(420)
    expect(gamePoints(p, rewards)).toBe(337)
    // Dibatasi game_score_cap agar batas papan peringkat tetap berlaku.
    expect(gamePoints({ ...p, best: 5000 }, rewards)).toBe(1000)
    expect(maxCityPoints(lessons, caps5, rewards)).toBe(1450)
    expect(pathPoints(lessons, p, rewards)).toBe(757)
    // Skor tersimpan tapi game belum tamat → belum dihitung.
    expect(gamePoints({ ...p, gameDone: false }, rewards)).toBe(0)
  })

  it('lencana didapat, berikutnya, dan yang baru', () => {
    expect(earnedBadges(320, rewards.badges).map((b) => b.id)).toEqual(['a', 'b'])
    expect(nextBadge(320, rewards.badges)!.id).toBe('c')
    expect(nextBadge(600, rewards.badges)).toBeNull()
    expect(newBadges(90, 310, rewards.badges).map((b) => b.id)).toEqual(['a', 'b'])
    expect(newBadges(310, 320, rewards.badges)).toEqual([])
  })
})

describe('soal nilai dan refleksi (masukan juri)', () => {
  it('soal nilai dan refleksi berpoin lebih besar dari soal fakta', () => {
    const p = { completed: ['l1'], correct: { l1: 1 }, valueCorrect: { l1: 1, l2: 4 }, gameDone: false }
    // 100 titik + 10 fakta + 30 nilai; nilai milik titik yang belum selesai tidak dihitung
    expect(lessonPoints(lessons, p, rewards)).toBe(140)
    expect(lessonPoints(lessons, { ...p, reflection: { r1: true, r2: false } }, rewards)).toBe(190)
    expect(maxCityPoints(lessons, { facts: 5, values: 3, reflections: 1 }, rewards)).toBe(1450 + 90 + 50)
  })

  it('API lama tanpa field poin nilai/refleksi -> 0 (data progres lama tetap berlaku)', () => {
    const old = { ...rewards } as Partial<Rewards>
    delete old.points_per_value
    delete old.points_per_reflection
    const p = { completed: ['l1'], correct: { l1: 1 }, valueCorrect: { l1: 1 }, reflection: { r: true }, gameDone: false }
    expect(lessonPoints(lessons, p, old as Rewards)).toBe(110)
    expect(lessonPoints(lessons, { completed: ['l1'], correct: { l1: 1 }, gameDone: false }, rewards)).toBe(110)
  })
})
