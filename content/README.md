# Panduan mengisi konten Rupaloka

Folder ini adalah **sumber kebenaran** semua isi aplikasi: peta kota, kuis, materi, item game, dan pengetahuan agen AI. Aplikasi tidak memakai teks lain. Yang tidak ada di sini tidak akan muncul, dan agen AI akan menolak menjawab.

Aturan utama (CLAUDE.md, PRD §7, §9):
- **Jangan mengarang.** Setiap fakta (nama, tahun, angka, lokasi, jam buka) harus punya sumber. Bila belum yakin, biarkan `[PERLU DIISI]` atau `null`.
- **Koordinat** diambil dari sumber peta yang dapat diperiksa, bukan ditebak.
- **Gambar** hanya milik sendiri atau berlisensi jelas, dan dicatat di `sources.yaml`.
- **Objek budaya adalah hadiah, bukan rintangan.** Rintangan disetujui KH lewat `approved_by` di `sources.yaml`.

## Isi folder

```
cities.yaml                  kota di peta beranda (status active / coming_soon, koordinat titik)
sources.yaml                 lisensi semua aset + daftar objek game (rintangan, objek sensitif)
assets/images/               gambar materi dan item (.webp)
assets/sprites/              karakter pelari, latar, rintangan (T-054)
bandung/
  city.yaml                  daftar materi, urutan item, rintangan, kecepatan game
  agent_script.yaml          kalimat pemandu per fase (tanpa fakta)
  quiz.yaml                  5 soal kuis dasar
  lessons/<id>.yaml          kartu materi (narasi, fakta kunci, gambar, lokasi)
  items/<id>.yaml            item koleksi yang terbuka tiap 100 poin
  knowledge/<id>.yaml        chunk pengetahuan untuk agen AI, minimal 8 per materi
```

Nama berkas harus sama dengan `id` di dalamnya. Id memakai huruf kecil, angka, dan tanda hubung (`wayang-golek`, `angklung-004`).

## Urutan kerja yang disarankan

1. **T-002:** tetapkan materi final. Bila berubah, ubah `lessons:` di `bandung/city.yaml`, ganti nama berkas di `lessons/` dan `knowledge/`, serta `lesson_id` pada chunk.
2. **T-030, T-031:** kumpulkan sumber, lalu tulis chunk di `knowledge/`. Satu chunk = satu gagasan, 1–3 kalimat. Isi `source` (judul, tipe, url bila web, tanggal akses), `verified_by`, `verified_at`.
3. **T-032:** tulis narasi materi (100–200 kata), fakta kunci (masing-masing menunjuk chunk), dan penjelasan item (maksimal 60 kata).
4. **T-033:** tulis 5 soal kuis. `correct` adalah nomor opsi yang benar **mulai dari 0**. Setiap soal menunjuk chunk sumbernya.
5. **T-034, T-035:** koordinat dan alamat lokasi; verifikasi klaim yang masih ditandai di komentar.
6. Catat setiap gambar di `sources.yaml` beserta lisensinya.

## Memeriksa hasil

Dari folder `backend/` (setelah venv aktif):

```bash
python scripts/validate_content.py            # pengembangan: hanya GALAT yang menggagalkan
python scripts/validate_content.py --release  # rilis: semua PERINGATAN juga harus beres
```

- **GALAT** = struktur rusak (id yang dirujuk tidak ada, `correct` di luar rentang, objek sensitif dipakai sebagai rintangan, salah ketik nama kolom). Harus diperbaiki sebelum commit; Render menolak deploy bila ada galat.
- **PERINGATAN** = data belum diisi atau belum diverifikasi. Boleh ada selama pengembangan, harus nol sebelum pengumpulan lomba.

Perubahan konten di-commit dengan awalan `content:` (mis. `content: T-031 chunk angklung 004-008`).

## Status kerangka ini

Kerangka dibuat 19 November 2026. Materi dan item masih **kandidat** dari PRD §9 (Angklung, Wayang golek, Museum Sri Baduga), belum final. Fakta yang sudah ditulis hanya tiga yang tercatat di PRD §9, dan semuanya masih menunggu sumber dan verifikasi:

| Chunk | Isi | Yang kurang |
|---|---|---|
| `angklung-001` | Angklung tercatat UNESCO pada 2010 | sumber, verifikasi |
| `wayang-golek-001` | Wayang tercantum dalam daftar UNESCO pada 2008 | sumber, verifikasi; kaitan wayang golek dengan Bandung (T-035) |
| `museum-sri-baduga-001` | Museum Sri Baduga di Jl. BKR No.185, Bandung | sumber, verifikasi, koordinat, jam buka |

Teks pemandu di `agent_script.yaml` adalah draf tanpa fakta budaya; silakan disunting. Rintangan (`batu`, `pagar`, `becak`) adalah kandidat dari SDD dan belum disetujui.
