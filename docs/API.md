# Kontrak API Rupaloka (untuk frontend)

Sumber kebenaran: kode backend (`backend/app/`). Tipe TypeScript dibuat otomatis di `frontend/src/lib/api.types.ts`; klien siap pakai di `frontend/src/lib/api.ts`. Rincian desain: SDD §8–9.

## Aturan pakai

1. **Ambil konten lewat API, bukan dengan membaca YAML.** API memvalidasi konten, menyembunyikan teks chunk, dan menyusun sumber. Pengecualian yang disepakati: salinan `content/cities.yaml` yang dibundel sebagai cadangan peta beranda bila API tidak dapat dihubungi (`src/lib/cities.ts`).
2. **Pakai `src/lib/api.ts`** (`getCities`, `getCity`, `getSources`, `postChat`, `assetUrl`, `shouldUseScript`, `fillTemplate`, `splitAnswer`). Jangan memanggil `fetch('/api/...')` di komponen.
3. **Jangan menyunting `api.types.ts`.** Bila skema backend berubah: `cd backend && python scripts/gen_ts_types.py`. Pytest gagal bila berkas itu tertinggal.
4. **Basis URL relatif** (`/api/...`). Produksi: Vercel meneruskan ke Render (`frontend/vercel.json`). Lokal: proxy Vite ke `localhost:8000`.
5. **Teks bertanda `[PERLU DIISI]`** masih mungkin muncul selama konten belum lengkap (server berjalan dengan `CONTENT_STRICT=false`). Tampilkan sebagai placeholder, jangan sebagai fakta.

## Endpoint

| Metode | Path | Respons | Catatan |
|---|---|---|---|
| GET | `/api/health` | `Health` | Juga untuk "membangunkan" Render sebelum demo |
| GET | `/api/content/cities` | `CitySummary[]` | Peta beranda. `lesson_count`/`item_count` hanya untuk kota `active` |
| GET | `/api/content/cities/{id}` | `CityDetail` | Seluruh isi satu kota. 404 bila tidak dikenal atau `coming_soon` |
| GET | `/api/content/sources` | `SourcesResponse` | Halaman `/sumber`: lisensi aset + daftar sumber |
| GET | `/api/assets/{path}` | berkas | Gambar konten. Pakai `assetUrl(src)` |
| POST | `/api/chat` | `ChatResponse` | Tanya agen; lihat di bawah |
| GET | `/api/leaderboard/{id}?player_id=` | `LeaderboardResponse` | Papan peringkat akhir tur (skor = total poin path). `entries[0].title` = gelar juara. `you` diisi bila `player_id` dikirim. 404 bila kota tanpa `rewards.leaderboard`; 503 bila penyimpanan mati. `no-store` |
| POST | `/api/leaderboard/{id}` | `LeaderboardResponse` | Badan `ScoreSubmit {player_id (UUID), nickname, points}`. Skor terbaik per pemain disimpan. 422: nama 3-20 karakter huruf/angka/spasi/`._-`, kata tidak pantas, atau poin > batas kota; 429 batas laju per IP |
| POST | `/api/reflection` | `ReflectionResult` | Refleksi akhir tur. Badan `ReflectionRequest {city_id, question_id, answer (≤500)}`. Hasil `{matched[{id,label,explanation,chunk}], method: keyword\|ai\|none, feedback}`; `feedback` dari konten. Soal yang tersedia ada di `CityDetail.reflection` (tanpa kata kunci). 404 soal tidak dikenal; 422 jawaban tidak valid; 429 batas laju per IP. Jawaban tidak disimpan. `no-store` |

Respons konten di-cache 5 menit (`Cache-Control: public, max-age=300`). Muat `CityDetail` sekali per kota lalu simpan di store.

## `CityDetail`: cara memakai

| Kolom | Dipakai untuk |
|---|---|
| `phases` | Urutan alur (state machine, SDD §6) |
| `agent_script` | Kalimat agen per fase. `item_unlocked` diisi dengan `fillTemplate(t, { item, short_explanation })` |
| `quiz.intro` | Kuis dasar. `correct` = indeks opsi benar (mulai 0). `chunk` → sumber di `sources[chunk]` |
| `lessons` | Kartu materi, sudah berurutan. `key_facts[].chunk` → `sources`. `location` boleh `null`; tombol "Lihat lokasi asli" hanya bila `lat` dan `lng` tidak `null` |
| `items` | Sudah berurutan sesuai `game.items_order`: ambang ke-k (`k × game.unlock_every` meter) membuka `items[k-1]`. Setelah item habis, game lanjut tanpa jeda |
| `game` | `unlock_every` (meter), `obstacles` (id sprite), `background`, `speed {start, max, ramp_per_100}` dalam piksel/detik |
| `sources` | Peta `chunk_id → SourceRef` untuk menampilkan rujukan kuis, fakta, dan item; `lesson_id` = materi asal chunk (saran materi F-022). Teks chunk tidak pernah dikirim |

Gambar: `lesson.images[].src` dan `item.image.src` relatif ke `content/`. URL = `assetUrl(src)` → `/api/assets/...`. Selalu pakai `alt`; bila gambar gagal dimuat, tampilkan placeholder (berkas mungkin belum ada selama konten belum lengkap).

## `POST /api/chat`

Permintaan (`ChatRequest`):
```json
{
  "city_id": "bandung",
  "context": { "phase": "lessons", "lesson_id": "angklung" },
  "message": "Dari bahan apa angklung dibuat?",
  "history": [
    { "role": "user", "content": "Apa itu angklung?" },
    { "role": "assistant", "content": "Angklung adalah ... [1]" }
  ]
}
```
- `message`: 1–500 karakter. `history`: maksimal 6 giliran terakhir, `role` hanya `user`/`assistant`.
- `context.lesson_id`: isi saat bertanya dari kartu materi (F-031) agar materi itu diutamakan.

Respons (`ChatResponse`), selalu 200 baik dijawab maupun ditolak:
```json
{
  "answer": "Angklung dibuat dari bambu [1].",
  "grounded": true,
  "citations": [{ "chunk_id": "angklung-002", "title": "...", "url": "https://..." }],
  "refusal_reason": null,
  "suggestions": []
}
```
- **Sitasi:** `[n]` di `answer` menunjuk `citations[n-1]`. Pakai `splitAnswer(answer, citations)` untuk merender chip sitasi.
- **Penolakan:** `grounded: false`, `refusal_reason` = `out_of_scope` atau `no_valid_citation`, `answer` berisi kalimat penolakan baku, `suggestions` berisi contoh pertanyaan yang bisa diklik. Ini respons normal, bukan galat.

Galat:

| Status | Arti | Tindakan UI |
|---|---|---|
| 400 | `city_id`/`lesson_id` tidak dikenal | Bug klien; log |
| 422 | Permintaan tidak valid (pesan kosong/terlalu panjang, riwayat >6) | Validasi di form sebelum kirim |
| 429 | Batas laju (20/menit per IP) | `shouldUseScript` → true: tampilkan pesan "tunggu sebentar" dan skrip agen |
| 503 | Agen tidak tersedia (LLM gagal/tanpa kunci) | `shouldUseScript` → true: kembali ke skrip, alur tetap jalan (F-014) |
| 0 | Jaringan gagal (Render bangun dari tidur) | `shouldUseScript` → true |

## Lokasi asli

Tautan arah dibuat di klien dari `location.lat`/`lng` (SDD §10, `mapLinks.ts`). Tampilkan `location.address` sebagai cadangan teks.
