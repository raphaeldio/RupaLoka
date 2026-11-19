# TASKS — RUPALOKA (v0.3, gamifikasi)

Berbasis `PRD v0.3` dan `SDD v0.3`. Menggantikan TASKS v0.2.

**Tanggal batas baru: [PERLU DIISI]**, jam: [PERLU DIISI]. Jadwal memakai **Hari-N** (N = jumlah hari kerja yang tersisa sampai batas, dikurangi 1 hari cadangan untuk dokumen dan pengumpulan). Rencana di bawah untuk **N = 5 hari**; bila lebih sedikit, pakai urutan pemangkasan di bagian "Jalur kritis".

Peran: **HR** = Hadrian Rangga Ardiantara (produk/pengembangan) · **KH** = Muhammad Khalifa Aisy Hafiy (budaya/konten) · **HW** = Hasby Wira Al Muflih (ketua, bisnis/dokumen/pitch).
Prioritas: **P0** wajib MVP-0 · **P1** setelahnya · **P2** pengembangan. `[ ]` belum · `[x]` selesai. Tiap tugas punya **DoD**.

> Titik temu kritis: skema konten (T-010) dan daftar materi/rintangan/item final (T-002) harus selesai di Hari-1 agar HR dan KH tidak saling menunggu.

---

## Jalur kritis

Wajib bertahan: peta Indonesia di beranda → agen bersumber (sitasi/penolakan) → kuis dasar → ≥3 materi bersumber → game dengan item tiap 100 poin → deploy publik → video showcase → proposal.
Fitur P1 (kuis penutup, rekor, analitik) tidak dikerjakan sebelum semua P0 selesai. Bila P0 tidak terkejar, pangkas berurutan: tampilan koleksi dibuat sederhana → variasi rintangan (turun ke 2) → materi ke-4.

## Fase 0 — Keputusan (Hari-1 pagi, ±2 jam)

- [ ] **T-001 (HW)** Cek juknis/tanya panitia: tanggal-jam batas baru, apakah purwarupa wajib berfungsi saat pendaftaran, format bukti. *DoD:* jawaban tertulis di `docs/decisions.md`.
- [ ] **T-002 (KH)** Tetapkan materi Bandung final (3–4), 5 soal kuis (draf), ≥3 item koleksi, dan **daftar rintangan** bertema kota yang aman secara budaya (PRD §7). *DoD:* daftar disetujui KH + satu anggota lain.
- [x] **T-003 (HR)** Buat repo + struktur (SDD §4). Repo git `main` dibuat 19 Nov 2026; `eval/` menyusul di T-060. *DoD:* kerangka ada.
- [ ] **T-004 (HR)** Siapkan kunci Gemini API (Google AI Studio), proyek Render (dari `render.yaml`), proyek Vercel, proyek Supabase, subdomain. *DoD:* `curl https://<render>/api/health` berhasil.
- [ ] **T-005 (HW)** Nama maskot, karakter pelari, tagline baru, gaya visual (orisinal). *DoD:* deskripsi + arahan aset SVG/sprite.

## Fase 1 — Fondasi (Hari-1)

### Backend dan konten
- [x] **T-010 (HR)** Skema Pydantic + `content_loader` + `validate_content.py` (SDD §5). *DoD:* contoh valid lolos, contoh tanpa sumber gagal; pytest hijau.
- [x] **T-011 (HR)** Endpoint `/api/health`, `/content/cities`, `/content/cities/{id}`, `/content/sources`. *DoD:* respons sesuai skema.
- [x] **T-012 (HR)** `retrieval.py` (BM25 + boost `lesson_id`). *DoD:* uji peringkat.
- [x] **T-013 (HR)** `/api/chat`: gerbang skor → LLM → validasi sitasi (SDD §9). *DoD:* dalam cakupan bersitasi valid; luar cakupan ditolak tanpa memanggil LLM.

### Frontend
- [ ] **T-020 (HR)** Vite+React+TS+Tailwind, routing, tema, store persist. *DoD:* rute placeholder.
- [ ] **T-021 (HR)** `IndonesiaMap` di `/` + pengantar singkat + kartu kota + status active/coming_soon. *DoD:* Bandung membuka alur; lainnya "segera hadir"; keyboard OK; lisensi data peta sudah dicek (T-061a).

### Konten (paralel, KH)
- [ ] **T-061a (HW)** Cek lisensi data batas wilayah untuk peta SVG sebelum dipakai T-021; catat atribusi di `sources.yaml`. *DoD:* sumber dan lisensi tercatat. (Sisa pemeriksaan hak cipta ada di T-061.)
- [ ] **T-030 (KH)** Kumpulkan ≥2 sumber kredibel per materi. *DoD:* `sources.yaml`.
- [ ] **T-031 (KH)** Tulis chunk pengetahuan: ≥8 per materi, bersumber, `verified_by`. *DoD:* lolos validasi.
- [ ] **T-032 (KH)** Tulis materi (100–200 kata), 3 pertanyaan contoh, penjelasan singkat item (≤60 kata). *DoD:* ditinjau satu anggota lain; istilah Sunda dijelaskan.
- [ ] **T-033 (KH)** Tulis 5 soal kuis + penjelasan + rujukan chunk. *DoD:* validasi lolos; jawaban benar diperiksa dua orang.
- [ ] **T-034 (KH)** Koordinat dan alamat situs dari sumber resmi/peta. *DoD:* tautan arah dibuka dan dicek.
- [ ] **T-035 (KH)** Verifikasi klaim sensitif: wayang golek–Bandung, peran Saung Angklung Udjo, jam buka. *DoD:* ada sumber atau klaim dihapus.

## Fase 2 — Alur belajar (Hari-2)

- [ ] **T-040 (HR)** State machine alur (SDD §6) + persist progres. *DoD:* transisi benar; uji unit hijau.
- [ ] **T-041 (HR)** `QuizCard` + hasil + saran materi. *DoD:* 5 soal berjalan; penjelasan muncul setelah menjawab; skor tersimpan.
- [ ] **T-042 (HR)** `LessonCard` (narasi, fakta, gambar, sumber, "Tanya agen", "Lihat lokasi asli"). *DoD:* 3 materi dapat dilewati.
- [ ] **T-043 (HR)** `AgentPanel`: skrip per fase + tanya bebas + sitasi + penolakan + penanganan 429/503. *DoD:* percakapan 3 giliran; AI mati → skrip tetap jalan.
- [ ] **T-044 (HR)** `LocationButton` + `mapLinks.ts`. *DoD:* tautan benar di ponsel dan desktop.
- [ ] **T-045 (HR)** Halaman `/koleksi`, `/tentang`, `/sumber`. *DoD:* semua data tampil.

## Fase 3 — Game runner (Hari-2 sore – Hari-3)

- [ ] **T-050 (HR)** Engine kanvas: loop, gravitasi, lompat, kolisi, spawner, skor, kecepatan bertahap (SDD §7). *DoD:* dapat dimainkan di ponsel ≥30 fps **[ukur]**; spawner tidak menghasilkan rintangan mustahil.
- [ ] **T-051 (HR)** Mekanik unlock tiap `unlock_every`: pause → `ItemModal` → hitung mundur → resume. *DoD:* satu kali per ambang; skor tidak berubah saat resume; uji unit hijau.
- [ ] **T-052 (HR)** Layar game over + ringkasan + koleksi + main lagi + lokasi asli. *DoD:* alur penuh kuis → materi → game → ringkasan selesai.
- [ ] **T-053 (HR)** Jeda otomatis (tab tidak aktif), tombol jeda, kurangi gerak. *DoD:* terverifikasi manual.
- [ ] **T-054 (HW+KH)** Aset visual: karakter pelari (orisinal), latar Bandung, 3 rintangan, gambar item, maskot 3 ekspresi. *DoD:* semua orisinal atau berlisensi jelas; dicatat di `sources.yaml`; rintangan disetujui KH.
- [ ] **T-055 (HR)** Parameter `?debug=1` (non-produksi) untuk mempercepat skor saat uji. *DoD:* item mudah diuji.

## Fase 4 — Kualitas dan deploy (Hari-4)

- [ ] **T-060 (KH+HR)** Set evaluasi: 30 dalam cakupan, 15 luar cakupan + percobaan injeksi. *DoD:* `eval/*.yaml`.
- [ ] **T-061 (HW)** Pemeriksaan hak cipta: gambar, sprite, font, ikon, maskot. *DoD:* `sources.yaml` lengkap; aset bermasalah diganti.
- [ ] **T-062 (HR)** Jalankan `eval_rag.py`, kalibrasi `MIN_SCORE`. *DoD:* angka dicatat apa adanya; tak ada jawaban tanpa sitasi lolos.
- [ ] **T-063 (HR)** Deploy API ke Render (`CONTENT_STRICT=true`) dan frontend ke Vercel (rewrite `/api/*`); subdomain; hangatkan Render sebelum demo. *DoD:* tautan publik dapat dibuka dari jaringan lain.
- [ ] **T-064 (HR)** Batas laju, CORS, header keamanan; pastikan kunci tidak ada di bundel FE. *DoD:* pemeriksaan manual.
- [ ] **T-065 (semua)** Uji di ≥2 ponsel nyata + desktop; perbaiki bug kritis. *DoD:* putaran penuh selesai di ponsel.
- [ ] **T-066 (KH+HW)** Uji terpandu 5+ orang (siswa/guru/teman): amati penyelesaian, catat kendala; isi formulir singkat. *DoD:* jumlah, waktu, dan hasil **apa adanya** untuk proposal Bagian 7/14 dan Lampiran 6. Jangan menulis hasil yang tidak terjadi.
- [ ] **T-067 (HR)** **Pembekuan kode** (code freeze); tag rilis; cadangan. *DoD:* tag `v0.1-lomba`.

## Fase 5 — Dokumen lomba (paralel Hari-1 s.d. batas)

- [ ] **T-070 (HW)** Selaraskan proposal dengan konsep v0.3 (PRD §14): judul (≤14 kata), abstrak, Latar Belakang (tambah argumen gamifikasi + keterbatasan bukti), Bagian 7–10, 11–12 (teknologi aktual: game kanvas, tanpa 3D), 13 (BMC freemium, sekolah, mitra museum), 17 (3D dan langganan di roadmap), Gambar 1–2 dan Lampiran. *DoD:* nama "RUPALOKA" konsisten; tidak ada klaim tanpa bukti. (Dapat dikerjakan Claude: kirim konfirmasi konsep final.)
- [ ] **T-071 (HW)** Lengkapi data tim (gelar, afiliasi, email, WhatsApp) sesuai formulir. *DoD:* konsisten dengan formulir.
- [ ] **T-072 (HW+KH)** Isi bagian kuning: objek final, narasumber, hasil survei/uji, bukti mitra (surat dukungan museum bila ada). *DoD:* tak ada penanda kuning kosong, atau dihapus bila tidak berlaku.
- [ ] **T-073 (HR)** Isi 8.3 (status fitur), 11–12 (teknologi aktual), Lampiran 1–2 (tautan demo/repo/video, tangkapan layar, diagram). *DoD:* hanya teknologi yang benar-benar dipakai.
- [ ] **T-074 (HW)** Perbarui Daftar Isi/Tabel/Gambar; ekspor PDF; cek halaman. *DoD:* PDF final.
- [ ] **T-075 (HW+HR)** PPT: masalah, solusi (alur gamifikasi), demo, akar budaya, bisnis, roadmap, tim. *DoD:* konsisten dengan proposal.
- [ ] **T-076 (semua)** Video showcase 3–5 menit: peta → kuis → materi → game + item → tanya agen → lokasi asli. *DoD:* 3–5 menit, produk berjalan nyata, suara jelas.
- [ ] **T-077 (HW)** Administrasi, unggah ke portal. *DoD:* semua berkas terunggah sebelum batas; simpan bukti kirim.
- [ ] **T-078 (semua)** Pemeriksaan silang akhir: nama tim/produk, subtema, tautan hidup, klaim vs bukti. *DoD:* daftar periksa di bawah tercentang.
- [ ] **T-079 (HW, bila sempat)** Hubungi 1–2 museum/sekolah untuk surat dukungan atau wawancara singkat (bukti validasi model bisnis). *DoD:* bukti tertulis; bila tidak ada, bagian itu tetap ditulis sebagai rencana.

## Pasca pendaftaran (P1/P2)

- [ ] T-100 (P1) Kuis penutup dan perbandingan skor (F-023); rekor (F-047).
- [ ] T-101 (P1) Analitik ringan (F-053), umpan balik (F-054), streaming (F-013).
- [ ] T-102 (P1) Survei lebih luas dan wawancara guru/museum; perbarui proposal.
- [ ] T-103 (P1) Kota kedua bersama mitra museum.
- [ ] T-104 (P2) Penampil 3D di balik flag (F-060), paket langganan (F-061), mode kelas (F-062), portal museum (F-063).

---

## Daftar periksa pengumpulan

- [ ] Tautan purwarupa publik berfungsi dari jaringan lain dan ponsel
- [ ] Beranda = peta Indonesia; hanya Bandung aktif; lainnya "segera hadir"
- [ ] Kuis dasar (5 soal) bersumber, dengan penjelasan
- [ ] ≥3 materi bersumber; tombol "Lihat lokasi asli" benar
- [ ] Game runner: item muncul tepat tiap 100 poin dengan penjelasan, lalu lanjut
- [ ] Agen: sitasi atau penolakan; tak ada kunci API di klien
- [ ] Aset orisinal/berlisensi; atribusi lengkap; rintangan disetujui anggota budaya
- [ ] Proposal PDF final (judul ≤14 kata), data sesuai formulir
- [ ] Capaian aktual, uji awal, dan target terpisah dan jujur
- [ ] PPT, video 3–5 menit, administrasi
- [ ] Nama "RUPALOKA" konsisten di semua dokumen dan UI
- [ ] Bukti pengiriman tersimpan

## Pembagian waktu ringkas (N = 5)

| Hari | HR | KH | HW |
|---|---|---|---|
| 1 | T-001 (bantu), 003, 004, 010–013, 020, 021 | T-002, 030–035 | T-001, 005, 061a, 071 |
| 2 | T-040–045, mulai T-050 | T-031–035 lanjut, 054 (bersama HW) | T-054, 061, 070 |
| 3 | T-050–053, 055 | T-060, rintangan/item disetujui | T-070, 072, 075 |
| 4 | T-062–064, 067 | T-066 (uji terpandu), 060 | T-072, 073, 074, 079 |
| 5 (cadangan) | T-065, perbaikan | rekaman video | T-076, 077, 078 |
