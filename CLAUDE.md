# CLAUDE.md — RUPALOKA (v0.3)

Konteks proyek untuk Claude Code. Baca ini dulu, lalu `docs/PRD.md`, `docs/SDD.md`, `docs/TASKS.md` (semuanya v0.3).

## Proyek

**RUPALOKA** — web edukasi budaya Nusantara berbasis gamifikasi dengan pemandu AI dan peta situs sejarah. Tim KamiPemenang (Bandung), untuk BUDAYA GO! 2026, cabang Inovasi Digital, subtema 04 Pembelajaran dan Edukasi Digital Berbasis Budaya.

**Alur (diperbarui 20 Nov 2026):** Beranda = peta Indonesia Leaflet (batas 38 provinsi, titik kota) → pilih kota (MVP: **Bandung**; lainnya "segera hadir") → **path belajar**: titik berurutan (1. Pengenalan Bandung, 2. Angklung, …), tiap titik = **kuis awal → kartu materi (video YouTube) → kuis akhir**, titik terakhir = **game runner keliling kota** (tiap **100 m** lari bertemu NPC: pause → item budaya → penjelasan singkat → lanjut) → ringkasan + "Lihat lokasi asli". Titik selesai memberi **poin path**; poin melewati ambang memberi **lencana** (`city.yaml` → `rewards`). Agen AI = **chatbot melayang** bernama **Saloka** dengan maskot (`src/components/Mascot.tsx`); tiap jawaban berlabel "Dijawab AI" + sumber. **Masukan juri (25 Nov 2026, PRD §6.5a):** kartu budaya lengkap per item (`card`), soal `kind: nilai` berpoin besar + refleksi akhir tur (`reflection.yaml`), tombol "Beri masukan" (Google Form), tombol "Kunjungi" (`location.links`).

**Ditunda (jangan dibangun di MVP-0):** langganan/pembayaran, mode kelas, akun, portal museum. **Papan peringkat akhir tur kota** disetujui tim 21 Nov 2026 (tanpa akun: nama panggilan + id acak perangkat, skor = total poin path, gelar juara dari `city.yaml` → `rewards.leaderboard`, data di Supabase). Siapkan hanya `feature_flags`. **Galeri 3D/VR** (lorong melingkar + penampil objek + WebXR) dibangun sebagai purwarupa demo di balik flag `viewer3d` + `premium_content` (SDD ADR 40; rencana `docs/superpowers/plans/2026-11-25-galeri-3d-vr.md`, T-110…T-129).

**Rencana bisnis (hipotesis):** mitra = museum se-Indonesia; pengguna berbayar = sekolah dan individu (akses model 3D + fitur khusus).

Batas pendaftaran: diperpanjang, tanggal **[lihat docs/decisions.md]**. Fokus: **MVP-0** (semua P0 di `docs/TASKS.md`).

## Prinsip yang tidak boleh dilanggar

1. **Jangan mengarang konten budaya.** Fakta (tahun, nama, lokasi, koordinat, jam buka, angka) harus berasal dari sumber di `content/`. Bila data belum ada, isi `null`/`TODO` dan beri tahu pengguna. Dasar yang sudah ada: angklung UNESCO 2010; wayang UNESCO 2008; Museum Sri Baduga di Jl. BKR No.185 Bandung. Kaitan wayang golek–Bandung dan peran Saung Angklung Udjo **harus diverifikasi** dulu.
2. **Kuis dan teks item ditulis manual dan bersumber**, bukan dihasilkan AI saat runtime. AI hanya untuk tanya-jawab agen, dan (pengecualian ADR 34) mengklasifikasi jawaban refleksi ke daftar nilai tulisan tim — tanpa menulis teks yang ditampilkan.
3. **Agen AI hanya menjawab dari basis pengetahuan** dan selalu menyertakan sitasi `chunk_id`, atau menolak. Jangan melemahkan gerbang skor, validasi sitasi, atau aturan prompt tanpa persetujuan.
4. **Hormati budaya dalam gamifikasi:** rintangan tidak boleh berupa benda sakral, simbol agama, atau objek yang dihormati komunitas. Objek budaya adalah **hadiah/koleksi**, bukan sesuatu yang ditabrak atau dihancurkan. Daftar rintangan/item harus disetujui anggota budaya (KH).
5. **Orisinal:** karakter pelari, maskot, dan tampilan dibuat sendiri. Jangan meniru gim, karakter, atau tampilan aplikasi lain (mis. gim dinosaurus peramban, aplikasi belajar bahasa).
6. **Jangan menulis hasil/angka yang belum diukur** (uji pengguna, akurasi, skor) sebagai capaian; tandai sebagai target. Hasil evaluasi harus keluar dari skrip.
7. **Hanya aset berlisensi jelas atau milik sendiri**, tercatat di `content/sources.yaml` dengan lisensi/atribusi.
8. **Kunci API tidak pernah di klien atau repositori** (`.env` di `.gitignore`; perbarui `.env.example` tanpa rahasia).
9. **Nama produk selalu "RUPALOKA"** (UI: "Rupaloka").
10. **Gagal dengan anggun:** AI gagal → skrip agen tetap jalan; aset gagal → placeholder; jangan biarkan layar kosong.

## Tumpukan (usulan; lihat SDD §3)

- Frontend: Vite + React 18 + TypeScript + Tailwind; Zustand (persist); React Router; `d3-geo` (peta SVG); game = HTML Canvas 2D (loop sendiri).
- Backend: Python 3.11+, FastAPI, Pydantic v2, BM25 sendiri (`app/retrieval.py`), SDK `google-genai` untuk Gemini (model dari env `GEMINI_MODEL`, default `gemini-3.5-flash-lite`).
- Konten: YAML di `content/`, divalidasi `backend/scripts/validate_content.py`.
- Deploy: frontend di **Vercel**, API di **Render** (`render.yaml`). **Supabase** hanya untuk data runtime (log chat, analitik, akun kelak); konten tetap YAML di repo.

## Struktur

```
content/        # cities.yaml, sources.yaml, <kota>/{city,agent_script,quiz,reflection}.yaml, lessons/, items/, knowledge/, assets/
backend/app/    # main, config, content_loader, retrieval, chat, prompts, schemas
backend/scripts # validate_content.py, eval_rag.py
frontend/src/   # pages, flow (state machine), game (engine, spawner, ...), components, lib
eval/           # in_scope.yaml, out_of_scope.yaml
render.yaml     # blueprint API Render
docs/           # PRD, SDD, TASKS, decisions.md
```

## Perintah (perbarui setelah scaffolding)

```bash
# Backend (Windows: pakai .venv/Scripts/activate)
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
pytest -q
python scripts/validate_content.py
python scripts/eval_rag.py
python scripts/gen_ts_types.py         # setelah mengubah skema API; pytest gagal bila tertinggal

# Frontend
cd frontend && npm install
npm run dev
npm run build && npm run lint && npm test

# Deploy: push ke cabang utama; Render (render.yaml) dan Vercel membangun otomatis
python scripts/validate_content.py --release   # sebelum rilis
```

## Konvensi

- Python: tipe lengkap, Pydantic untuk skema, `ruff` + `black`; fungsi kecil dan diuji.
- TypeScript `strict`; komponen fungsional; hindari `any`; aksesibilitas dasar (label, alt, fokus keyboard, `prefers-reduced-motion`).
- Logika game murni dan dapat diuji (engine terpisah dari render); kolisi, spawner, dan ambang unlock punya uji unit.
- Teks UI Bahasa Indonesia ramah pelajar; istilah Sunda dijelaskan.
- Commit kecil (Conventional Commits: `feat:`, `fix:`, `docs:`, `content:`, `chore:`); rujuk ID tugas (mis. `feat: T-051 unlock item game`). Perubahan konten pakai `content:` dan harus lolos `validate_content.py`.

## Cara bekerja

1. Pilih tugas dari `docs/TASKS.md` (urut jalur kritis); baca ID F-xxx di PRD dan bagian SDD terkait.
2. Tulis uji dulu/bersamaan untuk logika inti (retrieval, validasi sitasi, validasi konten, state machine, unlock game, `mapLinks`).
3. Implementasi minimal; jalankan lint, uji, dan `validate_content.py`.
4. Verifikasi UI di peramban (lebar 360 px dan desktop); gunakan `?debug=1` untuk mempercepat skor saat menguji item. Laporkan hal yang tidak bisa diuji.
5. Perbarui `docs/TASKS.md` dan dokumen terdampak; keputusan arsitektur masuk SDD §16.
6. Bila waktu mepet, pangkas sesuai urutan di TASKS. Jangan memangkas: peta di beranda, agen bersumber, kuis dasar, ≥3 materi bersumber, path belajar, game dengan item tiap `unlock_every` meter, deploy.

## Definisi selesai

- Memenuhi kriteria penerimaan PRD untuk ID terkait.
- Lint dan uji lolos; konten lolos validasi.
- Berfungsi di ponsel (360 px) dan desktop; ada mode cadangan untuk AI.
- Tidak ada rahasia di repositori; aset berlisensi tercatat; rintangan/item disetujui KH.
- Dokumen diperbarui bila perlu.

## Kontrak chat (ringkas; detail SDD §8–9)

`POST /api/chat` ← `{city_id, context{phase?,lesson_id?}, message, history[]}` → `{answer, grounded, citations[{chunk_id,title,url}], refusal_reason, suggestions[]}`. Alur: BM25 → gerbang `MIN_SCORE` (pada `raw_score`, tanpa memanggil LLM) → Gemini dengan konteks `[chunk_id] teks` → validasi sitasi (penanda diganti `[1]`, `[2]`; yang tidak ada di konteks dibuang) → format. Tanpa sitasi valid = penolakan. Kode: `app/chat.py`, `app/llm.py`, `app/prompts.py`.

## Mekanik unlock (ringkas)

`city.game.unlock_every` dalam **meter** (Bandung: 100 m; 1 m = 100 px = 10 poin). Saat jarak melewati `k × unlock_every` m, pelari bertemu NPC (`src/game/npcs.ts`), engine memancarkan `UNLOCK(item_k)` **tepat sekali**, game `pause()`, `ItemModal` tampil dengan NPC yang menjelaskan item (nama, gambar, penjelasan singkat bersumber, "Tanya lebih lanjut"), tombol "Lanjut" memulai hitung mundur 3 dtk lalu `resume()` tanpa mengubah skor. Item masuk Koleksi (localStorage). Ambang diberi nomor urut sesuai `items_order`; setelah semua item terbuka, ambang berikutnya tidak memicu apa pun dan game berjalan terus sampai game over. Skor = jarak/10 (belum ada benda yang dipungut saat berlari).

## Hal yang masih terbuka (jangan diasumsikan)

Tanggal batas baru; materi, rintangan, dan item final Bandung; nama dan visual maskot/pelari; tagline baru; koordinat situs; ambang `MIN_SCORE`; hasil survei/uji; komitmen museum mitra; domain. Tanyakan atau tandai `TODO`, jangan mengisi dengan tebakan.
