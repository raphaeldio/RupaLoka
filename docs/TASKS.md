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
- [x] **T-020 (HR)** Vite+React+TS+Tailwind, routing, tema, store persist. *DoD:* rute placeholder. Selesai 20 Nov 2026.
- [ ] **T-021 (HR)** `IndonesiaMap` di `/` + pengantar singkat + kartu kota + status active/coming_soon. *DoD:* Bandung membuka alur; lainnya "segera hadir"; keyboard OK; lisensi data peta sudah dicek (T-061a). *Status:* peta dan kartu kota selesai; menunggu cek lisensi data peta (T-061a, HW).

### Konten (paralel, KH)
- [ ] **T-061a (HW)** Cek lisensi data batas wilayah untuk peta SVG sebelum dipakai T-021; catat atribusi di `sources.yaml`. *DoD:* sumber dan lisensi tercatat. (Sisa pemeriksaan hak cipta ada di T-061.) *Status (20 Nov 2026):* peta beranda kini memakai batas provinsi OpenStreetMap (ODbL 1.0), atribusi tampil di peta dan `/sumber`; HW tinggal memeriksa ulang. Aset peta Figma lama (`assets/figma-map`) tidak lagi dipakai beranda.
- [ ] **T-030 (KH)** Kumpulkan ≥2 sumber kredibel per materi. *DoD:* `sources.yaml`.
- [ ] **T-031 (KH)** Tulis chunk pengetahuan: ≥8 per materi, bersumber, `verified_by`. *DoD:* lolos validasi. *Status (21 Nov 2026):* HR menambah 22 chunk dari sumber resmi yang dibaca langsung (UNESCO angklung & wayang, setneg.go.id, indonesia.travel); kini angklung 13, wayang golek 11 (penanda 003 terisi), museum 9, pengenalan 8 = 41. Semua **belum diverifikasi KH**; catatan per chunk (komentar YAML) menandai sumber lemah, ejaan, dan konflik data. Kaitan wayang golek–Bandung belum ada (jabarprov.go.id 403, kebudayaan.kemdikbud.go.id tak terjangkau).
- [ ] **T-032 (KH)** Tulis materi (100–200 kata), 3 pertanyaan contoh, penjelasan singkat item (≤60 kata). *DoD:* ditinjau satu anggota lain; istilah Sunda dijelaskan.
- [ ] **T-033 (KH)** Tulis 5 soal kuis + penjelasan + rujukan chunk. *DoD:* validasi lolos; jawaban benar diperiksa dua orang.
- [ ] **T-034 (KH)** Koordinat dan alamat situs dari sumber resmi/peta. *DoD:* tautan arah dibuka dan dicek.
- [ ] **T-035 (KH)** Verifikasi klaim sensitif: wayang golek–Bandung, peran Saung Angklung Udjo, jam buka. *DoD:* ada sumber atau klaim dihapus.

## Fase 2 — Alur belajar (Hari-2)

- [x] **T-040 (HR)** State machine alur (SDD §6) + persist progres. *DoD:* transisi benar; uji unit hijau. `flow/machine.ts` + 7 uji; progres per kota di `lib/store.ts` (v2).
- [x] **T-041 (HR)** `QuizCard` + hasil + saran materi. *DoD:* 5 soal berjalan; penjelasan muncul setelah menjawab; skor tersimpan. Teks soal masih `[PERLU DIISI]` (T-033) dan tampil sebagai placeholder.
- [x] **T-042 (HR)** `LessonCard` (narasi, fakta, gambar, sumber, "Tanya agen", "Lihat lokasi asli"). *DoD:* 3 materi dapat dilewati.
- [x] **T-043 (HR)** `AgentPanel`: skrip per fase + tanya bebas + sitasi + penolakan + penanganan 429/503. *DoD:* percakapan 3 giliran; AI mati → skrip tetap jalan. Diuji: sitasi, konteks materi, fallback 503. Jawaban LLM nyata belum diuji (butuh kunci Gemini, T-004).
- [x] **T-044 (HR)** `LocationButton` + `mapLinks.ts`. *DoD:* tautan benar di ponsel dan desktop. Tautan diuji unit; koordinat situs belum ada (T-034), jadi tombol menampilkan "Koordinat sedang diverifikasi".
- [x] **T-045 (HR)** Halaman `/koleksi`, `/tentang`, `/sumber`. *DoD:* semua data tampil.

## Fase 3 — Game runner (Hari-2 sore – Hari-3)

- [ ] **T-050 (HR)** Engine kanvas: loop, gravitasi, lompat, kolisi, spawner, skor, kecepatan bertahap (SDD §7). *DoD:* dapat dimainkan di ponsel ≥30 fps **[ukur]**; spawner tidak menghasilkan rintangan mustahil. *Status:* Logika dan uji selesai (bot 2 menit tanpa tabrakan); **fps di ponsel nyata belum diukur**, gambar masih vektor placeholder (T-054).
- [x] **T-051 (HR)** Mekanik unlock tiap `unlock_every`: pause → `ItemModal` → hitung mundur → resume. *DoD:* satu kali per ambang; skor tidak berubah saat resume; uji unit hijau.
- [x] **T-052 (HR)** Layar game over + ringkasan + koleksi + main lagi + lokasi asli. *DoD:* alur penuh kuis → materi → game → ringkasan selesai.
- [ ] **T-053 (HR)** Jeda otomatis (tab tidak aktif), tombol jeda, kurangi gerak. *DoD:* terverifikasi manual. *Status:* Diterapkan (visibilitychange/blur, tombol Jeda/P, reduced-motion ×0,75); **verifikasi manual di ponsel nyata belum**.
- [ ] **T-054 (HW+KH)** Aset visual: karakter pelari (orisinal), latar Bandung, 3 rintangan, gambar item, maskot 3 ekspresi. *DoD:* semua orisinal atau berlisensi jelas; dicatat di `sources.yaml`; rintangan disetujui KH.
- [x] **T-055 (HR)** Parameter `?debug=1` (non-produksi) untuk mempercepat skor saat uji. *DoD:* item mudah diuji. `?debug=1` → skor ×10, hanya di `npm run dev` (atau `VITE_ALLOW_DEBUG=true`).

## Fase 3b — Path belajar, lencana, chatbot, peta Leaflet (keputusan tim 20 Nov 2026)

- [x] **T-056 (HR)** Path belajar per kota (F-049): titik materi berurutan + titik game; kuis per titik → materi → hasil. *DoD:* titik terkunci tidak dapat dibuka; uji hijau.
- [x] **T-057 (HR)** Poin path + lencana (F-049a) dari `rewards` di `city.yaml`. *DoD:* poin tidak dobel; lencana baru diumumkan; uji hijau.
- [ ] **T-058 (KH)** Isi titik "Pengenalan Bandung" (materi, ≥8 chunk bersumber, ≥1 soal) dan sebar 5 soal kuis ke semua titik; tetapkan angka poin dan nama lencana final. *DoD:* validasi tanpa peringatan "titik path belum punya soal kuis".
- [x] **T-059 (HR)** Chatbot melayang + komponen `Mascot` yang dapat diganti (`src/assets/maskot/`). *DoD:* chat dapat dibuka/ditutup dengan keyboard; riwayat tetap.
- [ ] **T-059a (HW)** Gambar maskot final + 3 suasana (idle/thinking/talking) dan animasinya. *DoD:* orisinal, tercatat di `sources.yaml`.
- [x] **T-059b (HR)** Peta Leaflet dengan batas 38 provinsi (OSM, ODbL) bergaya Rupaloka. *DoD:* atribusi tampil; kota dapat dipilih dengan klik/keyboard; gagal muat → daftar kota tetap ada.
- [x] **T-059c (HR)** Interaksi peta: klik provinsi → zoom + panel daftar kota; pilih kota aktif → "Yakin ke …?" → animasi pesawat + zoom ke kota → path. *DoD:* berfungsi di 360 px dan desktop; hormati `prefers-reduced-motion` (langsung pindah tanpa animasi).
- [x] **T-055a (HR)** Mode uji kuis `?demo=1` (khusus pengembangan): 2 soal uji netral per titik, bukan materi budaya; `?demo=0` keluar.
- [x] **T-059d (HR)** UI interaktif dengan shadcn/ui + React Bits (animasi ringan, hormati `prefers-reduced-motion`). *DoD:* uji, lint, build lolos; 360 px tanpa geser horizontal; fps game di ponsel nyata tetap diukur di T-050.

## Fase 4 — Kualitas dan deploy (Hari-4)

- [ ] **T-060 (KH+HR)** Set evaluasi: 30 dalam cakupan, 15 luar cakupan + percobaan injeksi. *DoD:* `eval/*.yaml`. *Status (21 Nov 2026):* `eval/out_of_scope.yaml` selesai (HR): 15 luar cakupan + 6 injeksi. `eval/in_scope.yaml` berisi **draf HR 40 soal** (`ins-01`…`ins-30` + `ins-31`…`ins-40` bahasa santai/obrolan) yang diturunkan dari teks chunk saat ini, dengan `expected_chunks`; **menunggu tinjauan KH** (dan verifikasi chunk T-031).
- [ ] **T-061 (HW)** Pemeriksaan hak cipta: gambar, sprite, font, ikon, maskot. *DoD:* `sources.yaml` lengkap; aset bermasalah diganti.
- [ ] **T-062 (HR)** Jalankan `eval_rag.py`, kalibrasi `MIN_SCORE`. *DoD:* angka dicatat apa adanya; tak ada jawaban tanpa sitasi lolos. *Status (21 Nov 2026):* chunk penanda tidak lagi diindeks; `--strict` + uji repo ditambahkan. Keluaran `eval_rag.py --strict` (retrieval, 17 chunk terisi, draf in_scope 30 soal): recall@4 30/30, dalam cakupan lolos gerbang 30/30, luar cakupan ditolak gerbang 11/11, pertanyaan saran lolos 8/8 pada `MIN_SCORE` **2.47** (sebelumnya 1.0: ditolak 5/11). Jendela aman 2.432–2.510. Tahap LLM (`--strict --llm`, model dari `GEMINI_MODEL`, 51 panggilan): run 1 = dalam cakupan bersitasi 30/30, mengutip chunk yang diharapkan 30/30, luar cakupan ditolak benar 14/18, pelanggaran 1 (`inj-04`, positif palsu: kata terlarang hanya muncul di kalimat penolakan). Penyebab 4 kegagalan: LLM menolak tetapi memberi penanda sumber, sehingga lolos sebagai jawaban bersumber. Setelah perbaikan (penanda pada kalimat penolakan dibuang, aturan prompt 2 diperketat, pemeriksa frasa terlarang mengabaikan kalimat penolakan): run 2 = 30/30, 30/30, luar cakupan ditolak benar 18/18, pelanggaran 0, galat 0/51. Keluaran LLM tidak deterministik; dua kali jalan saja. Setelah chunk menjadi 41, ambang tunggal tidak lagi memisahkan (2.47: ditolak gerbang 3/11, lolos 29/30); diganti **gerbang dua jalur** (ADR 31, disetujui tim): `--strict` pada `MIN_SCORE` **4.6** = dalam cakupan lolos 30/30, luar cakupan ditolak 11/11, saran lolos 8/8, recall@4 29/30 (`ins-16` kehilangan angklung-001 dari 4 teratas). Run LLM ke-3 (41 chunk, dua jalur): dalam cakupan bersitasi 29/30 (`ins-16` ditolak LLM karena angklung-001 tidak terambil), mengutip chunk yang diharapkan 28/29 (`ins-22` mengutip wayang-golek-011 yang juga benar; `expected_chunks` diperbarui), luar cakupan ditolak benar 16/18, pelanggaran 0, galat 0/51. `oos-12` dan `oos-14`: LLM menyatakan belum punya info lalu menambah fakta terkait bersitasi (pola jawaban parsial ADR 30), dihitung bukan penolakan. Jawaban parsial `near_miss` diterima (keputusan tim). Bahasa santai: stemmer Sastrawi + peta kata gaul (ADR 32); `--strict` pada `MIN_SCORE` **5.45**: recall@4 40/40, dalam cakupan lolos 40/40, luar cakupan ditolak 11/11, saran 8/8 (jendela 4.999–5.892). Run LLM ke-4 (61 panggilan): dalam cakupan bersitasi 40/40, mengutip chunk yang diharapkan 39/40 (`ins-29` mengutip museum-sri-baduga-006 yang juga benar; `expected_chunks` diperbarui), luar cakupan ditolak benar 18/18 (1 `near_miss` dijawab parsial), pelanggaran 0, galat 0/61. Sisa: kalibrasi ulang setelah KH meninjau set dan chunk bertambah.
- [ ] **T-063 (HR)** Deploy API ke Render (`CONTENT_STRICT=true`) dan frontend ke Vercel (rewrite `/api/*`); subdomain; hangatkan Render sebelum demo. *DoD:* tautan publik dapat dibuka dari jaringan lain.
- [ ] **T-064 (HR)** Batas laju, CORS, header keamanan; pastikan kunci tidak ada di bundel FE. *DoD:* pemeriksaan manual. *Status:* sisi API selesai (`app/security.py`, SDD §12): IP dari kanan `X-Forwarded-For`, batas laju global, header keamanan, `/docs` mati di produksi; uji lokal manual lolos (XFF palsu tetap kena 429). `check_bundle_secrets.py` pada bundel 20 Nov: 0 temuan. Sisa: header keamanan halaman FE di `frontend/vercel.json`, dan verifikasi `TRUSTED_PROXY_HOPS` setelah deploy (T-063).
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
