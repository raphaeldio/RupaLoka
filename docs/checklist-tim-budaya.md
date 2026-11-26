# Daftar Isian Tim Budaya (KH) — Kota Bandung

Diperbarui 26 Nov 2026.

## Sudah ditandai aman (diisi "Tim KamiPemenang", 2026-11-26)

- 91 chunk di `content/bandung/knowledge/*.yaml` → `verified_by`, `verified_at`, dan 51 `source.accessed`
- 9 video materi → `checked_by`
- 3 rintangan (batu, pagar, becak) → `approved_by` di `sources.yaml`; daftar titik path dan rintangan di `city.yaml` dianggap final
- Bentuk 6 model 3D → `accuracy_check` (item-angklung, item-wayang, item-cepot, gedung-sate, keris, rumah-adat)
- Galeri 3D → `approved_by_kh`
- Hiasan path belajar → catatan "Perlu persetujuan KH" diganti "Disetujui"
- Alamat Museum Sri Baduga dan 15 soal kuis yang ada → ditandai sudah diperiksa

> Catatan: chunk `angklung.yaml` (sekitar baris 241) masih ditandai **BENTROK** dengan `angklung-004` (UNESCO menyebut dua sampai empat tabung).
> Stempel verifikasi tidak menghapus kontradiksi itu, dan agen AI bisa mengutip keduanya. Pilih salah satu, lalu hapus atau ubah chunk yang lain.

---

## Masih kosong — harus DIISI (bukan sekadar diverifikasi)

Semua butir di bawah muncul sebagai GALAT pada `python backend/scripts/validate_content.py --release`.
Setiap teks harus punya sumber (`chunk` di `knowledge/`). Jangan mengarang.

### 1. Kartu budaya per item — 18 kolom
`content/bandung/items/item-angklung.yaml`, `item-wayang.yaml`, `item-cepot.yaml` → blok `card:`

| Kolom | angklung | wayang | cepot |
|---|:-:|:-:|:-:|
| `nilai: { text, chunk }` | ☐ | ☐ | ☐ |
| `pengetahuan: { text, chunk }` | ☐ | ☐ | ☐ |
| `ekspresi: { text, chunk }` | ☐ | ☐ | ☐ |
| `fungsi: { text, chunk }` | ☐ | ☐ | ☐ |
| `community: { text, chunk }` (komunitas pemilik budaya) | ☐ | ☐ | ☐ |
| `validator: { name, role, validated_at }` (budayawan) | ☐ | ☐ | ☐ |

Bila belum ada chunk yang mendukung suatu aspek, tambahkan dulu chunk baru yang bersumber di `knowledge/`.

### 2. Soal nilai — 4 soal
`content/bandung/quiz.yaml` → `outro:`, satu soal `kind: nilai` per titik:
- [ ] pengenalan-bandung
- [ ] angklung
- [ ] wayang-golek
- [ ] museum-sri-baduga

Bentuk soal: `id`, `kind: nilai`, `question`, `options`, `correct`, `explanation`, `chunk`.

### 3. Refleksi akhir tur
`content/bandung/reflection.yaml` → `values: []`. Isi minimal satu nilai angklung:
`id`, `label`, `keywords` (frasa yang mungkin ditulis pelajar), `explanation: { text, chunk }`.

### 4. Galeri 3D — objek tanpa teks
`content/bandung/gallery.yaml`
- [ ] **Keris** — `short_explanation { text, chunk }` dan `asal_usul { text, chunk }`. Belum ada chunk keris sama sekali.
- [ ] **Rumah adat** — `name` (jenis rumah adat yang dimodelkan), `short_explanation`, `asal_usul`
- [ ] **Hotspot** item (`hotspots: []` di tiap item) — opsional, tetapi nama bagian objek juga termasuk fakta
- [ ] **Lukisan sejarah** (dinonaktifkan) — judul lukisan dan gambar kanvas PNG

### 5. Koordinat dan tautan
- [ ] `content/cities.yaml` → `lat`, `lng` Kota Bandung (catat sumbernya di `docs/decisions.md`)
- [ ] `content/bandung/lessons/angklung.yaml` → Saung Angklung Udjo: alamat lengkap, `lat`, `lng`
- [ ] `content/bandung/lessons/museum-sri-baduga.yaml` → `lat`, `lng` (jam buka belum ada kolomnya)
- [ ] `content/bandung/lessons/wayang-golek.yaml` → `location` (opsional, bila ada lokasi terkait)
- [ ] Tombol "Kunjungi" `location.links` (situs resmi, sanggar, perajin, jadwal), misalnya untuk Saung Angklung Udjo:
  `- { label: "Situs resmi", url: "https://...", kind: situs, verified_by: "Tim KamiPemenang" }`

### 6. Pembuat dan lisensi aset — 42 entri
`content/sources.yaml` → `author` dan `license` masih `[PERLU DIISI]` untuk:
- sprite game: `road.webp`, `bandung-bg.webp`, `gedung-sate.webp`, `rumah-adat.webp` (author)
- 15 hiasan path belajar `frontend/src/assets/budaya/*.webp` (lisensi: milik sendiri atau alat generatif?)
- hero beranda: `bandung-jalan*.webp`, `nusantara*.webp`
- gambar kota: `gerbang-bandung`, `gedung-sate`, `rumah-adat`, `jalan` di `frontend/src/assets/bandung/`
- maskot `PixelMascot.tsx` → pembuat desain dan **nama maskot final** (catatan masih "TODO (T-005)")
- 6 model `.glb` → pembuat dan lisensi. Untuk lukisan Prabu Siliwangi, catat juga sumber gambar asalnya.
- jenis rumah adat pada `rumah-adat.webp` (catatan `[PERLU DIISI]`)

### 7. Untuk tim teknis (bukan tim budaya)
- `item-angklung.glb` belum tercatat di `sources.yaml`
- `galeri-bandung.glb` (ruang galeri) belum dibuat
- validator mode rilis: "kuis dasar berisi 14 soal (target 5)" — perlu diputuskan, kurangi soal atau ubah aturannya

---

## Ringkasan

| Kelompok | Jumlah |
|---|---|
| Kolom kartu budaya | 18 |
| Soal nilai | 4 |
| Daftar nilai refleksi | 1 |
| Teks galeri (keris, rumah adat) | 5 kolom |
| Koordinat (kota + 2 lokasi) | 3 pasang |
| Tautan "Kunjungi" | ≥1 |
| Pembuat/lisensi aset | 42 entri |
| Kontradiksi chunk tabung angklung | 1 |

Cek setelah mengisi: `cd backend && python scripts/validate_content.py --release` (sekarang 112 galat).
