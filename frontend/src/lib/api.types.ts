// Dibuat otomatis oleh backend/scripts/gen_ts_types.py dari skema API. JANGAN disunting manual.
// Regenerasi setelah mengubah backend/app/*schemas*.py: python scripts/gen_ts_types.py

/** Pemeriksaan bentuk model 3D buatan tim oleh anggota budaya (KH). */
export interface AccuracyCheck {
  by: string
  checked_at: string
}

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

/** Lencana yang didapat saat poin path kota mencapai `min_points`. */
export interface Badge {
  id: string
  name: string
  min_points: number
  description: string
}

/** Satu bagian kartu budaya: teks ditulis tim budaya, bersumber pada chunk. */
export interface CardAspect {
  text: string
  chunk: string
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
  rewards: Rewards
  agent_script: AgentScript
  quiz: Quiz
  lessons: Lesson[]
  items: Item[]
  sources: Record<string, SourceRef>
  reflection: ReflectionPrompt[]
  gallery: GalleryFile | null
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

/** Kartu budaya lengkap (masukan juri, 25 Nov 2026). Kosong = belum disusun (pending). */
export interface CultureCard {
  nilai: CardAspect | null
  pengetahuan: CardAspect | null
  ekspresi: CardAspect | null
  fungsi: CardAspect | null
  community: CardAspect | null
  validator: Validator | null
}

export interface GalleryExhibit {
  item: string
}

export interface GalleryFile {
  room: GalleryRoom
  layout: GalleryLayout
  exhibits: GalleryExhibit[]
  approved_by_kh: KhApproval | null
}

/** Parameter lorong cincin; dibaca sama oleh frontend (cameraFlow.ts) dan validator. */
export interface GalleryLayout {
  radius: number
  slots: number
  first_d: number
}

export interface GalleryRoom {
  model: string
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

/**
 * Titik penjelasan pada model; posisinya dari node `hotspot_<id>` di GLB.
 * Teks dan chunk DIISI TIM BUDAYA; kosong = tidak ditampilkan (pending).
 */
export interface Hotspot {
  id: string
  label: string
  text: string | null
  chunk: string | null
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
  card: CultureCard | null
  model: ItemModel | null
  hotspots: Hotspot[]
}

/** Model 3D objek untuk galeri (SDD ADR 40). Berkas dicatat di sources.yaml → assets. */
export interface ItemModel {
  src: string
  poster: string | null
  accuracy_check: AccuracyCheck | null
}

export interface KeyFact {
  text: string
  chunk: string
}

export interface KhApproval {
  name: string
  approved_at: string
}

/** Papan peringkat akhir tur kota (diputuskan tim 21 Nov 2026). Skor = total poin path. */
export interface LeaderboardConfig {
  enabled: boolean
  champion_title: string
  size: number
}

export interface LeaderboardEntry {
  rank: number
  nickname: string
  points: number
  title: string | null
}

export interface LeaderboardResponse {
  city_id: string
  champion_title: string
  max_points: number
  entries: LeaderboardEntry[]
  you: YourRank | null
}

export interface Lesson {
  id: string
  title: string
  narrative: string
  key_facts: KeyFact[]
  images: ImageRef[]
  videos: VideoRef[]
  location: Location | null
  suggested_questions: string[]
  tier: "free" | "premium"
}

export interface Location {
  name: string
  address: string
  lat: number | null
  lng: number | null
  links: VisitLink[]
}

export interface MatchedValue {
  id: string
  label: string
  explanation: string | null
  chunk: string | null
}

export interface Quiz {
  intro: QuizQuestion[]
  outro: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  kind: "fakta" | "nilai"
  question: string
  options: string[]
  correct: number
  explanation: string
  chunk: string
}

/** Soal refleksi akhir tur untuk klien (tanpa kata kunci agar tidak bisa dicontek). */
export interface ReflectionPrompt {
  id: string
  lesson: string | null
  prompt: string
}

export interface ReflectionRequest {
  city_id: string
  question_id: string
  answer: string
}

export interface ReflectionResult {
  matched: MatchedValue[]
  method: "keyword" | "ai" | "none"
  feedback: string
}

/**
 * Poin path belajar (titik = materi, titik terakhir = game) dan lencana.
 * Poin kota = titik materi selesai × points_per_node + jawaban fakta benar ×
 * points_per_correct + jawaban nilai benar × points_per_value + refleksi yang dikenali ×
 * points_per_reflection + (game_node_points bila game sudah dimainkan sekali) +
 * skor game terbaik, dibatasi game_score_cap (agar batas papan peringkat tetap ada).
 */
export interface Rewards {
  points_per_node: number
  points_per_correct: number
  points_per_value: number
  points_per_reflection: number
  game_node_points: number
  game_score_cap: number
  badges: Badge[]
  leaderboard: LeaderboardConfig | null
}

export interface ScoreSubmit {
  player_id: string
  nickname: string
  points: number
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
  lesson_id: string
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

/** Budayawan/anggota komunitas yang memvalidasi kartu budaya. */
export interface Validator {
  name: string
  role: string | null
  validated_at: string | null
}

/** Video YouTube pendukung materi (pengganti gambar materi, 21 Nov 2026). */
export interface VideoRef {
  url: string
  title: string
  channel: string
  note: string | null
  checked_by: string | null
}

/** Tautan "Kunjungi": situs resmi, sanggar, perajin, atau jadwal pertunjukan komunitas. */
export interface VisitLink {
  label: string
  url: string
  kind: "situs" | "sanggar" | "perajin" | "jadwal"
  note: string | null
  verified_by: string | null
}

export interface YourRank {
  rank: number
  points: number
}
