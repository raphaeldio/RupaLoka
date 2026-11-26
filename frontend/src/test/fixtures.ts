import type { CityDetail } from '../lib/api.types'

const ref = (chunk_id: string, lesson_id: string) => ({
  chunk_id,
  lesson_id,
  title: `Sumber ${chunk_id}`,
  url: `https://contoh.test/${chunk_id}`,
  type: 'web',
  accessed: '2026-11-19',
})

/** CityDetail fiktif untuk uji komponen (bukan konten budaya nyata). */
export const detailFixture: CityDetail = {
  city: { id: 'kota-a', name: 'Kota A', province: 'Provinsi A', status: 'active', lat: 0, lng: 0, summary: 'Ringkasan A.' },
  phases: ['quiz_intro', 'lessons', 'game', 'summary'],
  game: {
    unlock_every: 100,
    items_order: ['item-x'],
    obstacles: ['batu'],
    background: 'bg',
    speed: { start: 240, max: 520, ramp_per_100: 25 },
  },
  rewards: {
    points_per_node: 100,
    points_per_correct: 10,
    points_per_value: 30,
    points_per_reflection: 50,
    game_node_points: 100,
    game_score_cap: 1000,
    leaderboard: { enabled: true, champion_title: 'Si Paling A', size: 10 },
    badges: [
      { id: 'lencana-1', name: 'Lencana Satu', min_points: 100, description: 'Deskripsi satu.' },
      { id: 'lencana-2', name: 'Lencana Dua', min_points: 300, description: 'Deskripsi dua.' },
    ],
  },
  agent_script: {
    quiz_intro: 'Skrip kuis.',
    lessons_start: 'Skrip materi.',
    game_start: 'Skrip game.',
    item_unlocked: 'Kamu menemukan {item}! {short_explanation}',
    summary: 'Skrip ringkasan.',
    small_talk: null,
  },
  quiz: {
    intro: [
      { id: 'q1', kind: 'fakta', question: 'Soal satu?', options: ['Benar', 'Salah'], correct: 0, explanation: 'Penjelasan satu.', chunk: 'a-001' },
      { id: 'q2', kind: 'fakta', question: 'Soal dua?', options: ['Salah', 'Benar'], correct: 1, explanation: 'Penjelasan dua.', chunk: 'b-001' },
    ],
    outro: [],
  },
  lessons: [
    {
      id: 'a',
      title: 'Materi A',
      narrative: 'Narasi A.',
      key_facts: [{ text: 'Fakta A.', chunk: 'a-001' }],
      images: [],
      videos: [],
      location: { name: 'Situs A', address: 'Jalan A', lat: -6.9, lng: 107.6, links: [] },
      suggested_questions: ['Apa itu A?'],
      tier: 'free',
    },
    {
      id: 'b',
      title: 'Materi B',
      narrative: 'Narasi B.',
      key_facts: [],
      images: [],
      videos: [],
      location: null,
      suggested_questions: [],
      tier: 'free',
    },
  ],
  items: [
    {
      id: 'item-x',
      name: 'Item X',
      rarity: 'umum',
      short_explanation: 'Penjelasan X.',
      image: { src: 'assets/images/x.webp', alt: 'Gambar X', license: 'CC0' },
      chunk: 'a-001',
      lesson: 'a',
      tier: 'free',
      card: null,
      model: null,
      hotspots: [],
    },
  ],
  sources: { 'a-001': ref('a-001', 'a'), 'b-001': ref('b-001', 'b') },
  reflection: [],
  gallery: null,
}
