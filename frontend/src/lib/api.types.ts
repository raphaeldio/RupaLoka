// Dibuat otomatis oleh backend/scripts/gen_ts_types.py dari skema API. JANGAN disunting manual.
// Regenerasi setelah mengubah backend/app/*schemas*.py: python scripts/gen_ts_types.py

export interface AgentScript {
  quiz_intro: string
  lessons_start: string
  game_start: string
  item_unlocked: string
  summary: string
}

export interface AssetEntry {
  path: string
  license: string
  author: string | null
  url: string | null
  note: string | null
}

export interface ChatContext {
  phase?: "quiz_intro" | "lessons" | "game" | "summary" | null
  lesson_id?: string | null
}

export interface ChatRequest {
  city_id: string
  context?: ChatContext
  message: string
  history?: HistoryTurn[]
}

export interface ChatResponse {
  answer: string
  grounded: boolean
  citations: Citation[]
  refusal_reason: "out_of_scope" | "no_valid_citation" | null
  suggestions: string[]
}

export interface Citation {
  chunk_id: string
  title: string
  url: string | null
}

export interface City {
  id: string
  name: string
  province: string | null
  status: "active" | "coming_soon"
  lat: number | null
  lng: number | null
  summary: string | null
}

export interface CityDetail {
  city: City
  phases: ("quiz_intro" | "lessons" | "game" | "summary")[]
  game: GameConfig
  agent_script: AgentScript
  quiz: Quiz
  lessons: Lesson[]
  items: Item[]
  sources: Record<string, SourceRef>
}

/** Kartu kota (F-003). Hitungan hanya diisi untuk kota aktif. */
export interface CitySummary {
  id: string
  name: string
  province: string | null
  status: "active" | "coming_soon"
  lat: number | null
  lng: number | null
  summary: string | null
  lesson_count: number | null
  item_count: number | null
}

export interface GameConfig {
  unlock_every: number
  items_order: string[]
  obstacles: string[]
  background: string
  speed: Speed
}

export interface Health {
  status: string
  cities: number
  active_cities: number
}

export interface HistoryTurn {
  role: "user" | "assistant"
  content: string
}

export interface ImageRef {
  src: string
  alt: string
  license: string
}

export interface Item {
  id: string
  name: string
  rarity: string
  short_explanation: string
  image: ImageRef
  chunk: string
  lesson: string
  tier: "free" | "premium"
}

export interface KeyFact {
  text: string
  chunk: string
}

export interface Lesson {
  id: string
  title: string
  narrative: string
  key_facts: KeyFact[]
  images: ImageRef[]
  location: Location | null
  suggested_questions: string[]
  tier: "free" | "premium"
}

export interface Location {
  name: string
  address: string
  lat: number | null
  lng: number | null
}

export interface Quiz {
  intro: QuizQuestion[]
  outro: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
  chunk: string
}

export interface Source {
  title: string
  url: string | null
  type: string
  accessed: string | null
}

/** Sumber satu chunk, tanpa teks chunk. Dipakai untuk menampilkan rujukan kuis/fakta/item. */
export interface SourceRef {
  title: string
  url: string | null
  type: string
  accessed: string | null
  chunk_id: string
}

export interface SourcesResponse {
  assets: AssetEntry[]
  references: Source[]
}

export interface Speed {
  start: number
  max: number
  ramp_per_100: number
}
