# PRD — RUPALOKA (v0.3, konsep gamifikasi)

**Belajar Budaya Nusantara Lewat Ekspedisi Gamifikasi dengan Pemandu AI dan Peta Situs Sejarah**
Tagline: *Putar, tanya, kunjungi.* (tagline dapat disesuaikan; "putar" merujuk 3D yang kini ditunda, usulan pengganti: *Jelajah, jawab, jumpai.* **[PERLU DIISI tim]**)

| | |
|---|---|
| Tim | Kami Siap (Kota Bandung, Jawa Barat) |
| Kompetisi | BUDAYA GO! 2026, cabang Inovasi Digital, subtema 04 Pembelajaran dan Edukasi Digital Berbasis Budaya |
| Versi | 0.3, 19 November 2026. Menggantikan v0.2 (konsep 3D-sentris dengan video beranda) |
| Batas pendaftaran | Diperpanjang; tanggal dan jam **[PERLU DIISI]**. Jadwal di `docs/TASKS.md` dihitung mundur dari tanggal ini |
| Dokumen terkait | `docs/SDD.md`, `docs/TASKS.md`, `CLAUDE.md` (semuanya v0.3), proposal (perlu diselaraskan, lihat §14) |

> Konvensi: **[PERLU DIISI]** = data dari tim. **[VERIFIKASI]** = klaim/angka yang harus dicek. **[HIPOTESIS]** = asumsi yang belum diuji. Dokumen ini tidak menyatakan hal yang belum terbukti sebagai fakta.

---

## 1. Ringkasan

Rupaloka adalah web edukasi budaya berbasis **gamifikasi**. Alurnya:

1. **Beranda = peta Indonesia** dengan titik kota. Pengguna memilih kota (Bandung aktif; lainnya "segera hadir").
2. **Agen AI (maskot)** memandu seluruh perjalanan di kota itu.
3. **Kuis pengetahuan dasar** untuk mengukur titik awal.
4. **Belajar beberapa budaya** kota tersebut (kartu materi bersumber).
5. **Game runner keliling kota** (pemain berlari/melompat melewati rintangan bertema kota). Tiap kelipatan **1000 poin** (parameter `unlock_every`; diubah dari 100 pada 20 Nov 2026), pemain membuka **item/budaya khusus**; permainan berhenti sebentar, agen memberi **penjelasan singkat**, lalu permainan lanjut.
6. **Ringkasan** hasil: item terbuka, skor, dan tombol **Lihat lokasi asli** untuk budaya yang relevan.

Alur belajarnya dibuat berjenjang seperti jalur pelajaran pada aplikasi belajar populer (kuis → materi → latihan → hadiah), tanpa meniru tampilan, karakter, atau merek mana pun.

**Model 3D** (inspeksi objek) dipindahkan ke **pengembangan berikutnya** dan menjadi bagian dari paket berlangganan.

**Mitra sasaran:** museum di seluruh Indonesia. **Pengguna berbayar (rencana):** sekolah dan pengguna individu yang ingin akses model 3D dan fitur khusus.

## 2. Masalah dan peluang

Dari proposal (sumber lengkap pada Daftar Pustaka proposal):
- Pewarisan budaya ke generasi muda rawan terputus (mis. hanya sekitar seperempat dari 718 bahasa daerah berstatus aman; penutur Sunda didominasi usia 40+).
- Layanan digital museum terkendala SDM, kualitas konten, dan anggaran (Puslitjak Kemendikbud, 2021).
- Pengetahuan budaya banyak disajikan lewat teks dan gambar datar sehingga kurang menarik bagi pelajar. **[HIPOTESIS, validasi lewat survei]**
- Bukti empiris bahwa permainan/3D meningkatkan minat belajar budaya masih terbatas (Ishar dkk., 2022). Rupaloka diposisikan sebagai purwarupa yang akan diuji, bukan solusi terbukti.

**Peluang:** menjembatani belajar budaya (yang sering terasa "wajib") dengan kebiasaan bermain dan dengan jalur kunjungan nyata ke museum/situs.

## 3. Tujuan dan non-tujuan

### 3.1 Tujuan produk
- G1. Pengguna dapat menyelesaikan satu putaran penuh di Bandung (kuis → materi → game → ringkasan) tanpa bantuan.
- G2. Setiap materi, soal kuis, dan item budaya dapat ditelusuri ke sumber terkurasi; agen AI menolak menjawab di luar cakupan.
- G3. Gamifikasi mendorong pengguna **mempelajari** budaya (bukan sekadar bermain): item terbuka selalu disertai penjelasan.
- G4. Konten (kota, materi, kuis, item) dapat ditambah lewat berkas konten tanpa mengubah kode, agar museum mitra dapat berkontribusi.

### 3.2 Tujuan lomba
Purwarupa fungsional yang dapat dibuka lewat tautan (kelayakan teknis 25%); akar budaya kuat dengan sumber dan narasumber (25%); model bisnis konsisten (20%); proposal, PPT, dan video showcase rapi dan konsisten (30%).

### 3.3 Non-tujuan (MVP-0)
- Tidak ada model 3D/penampil 3D (ditunda; lihat §11).
- Hanya Bandung yang aktif.
- Tanpa akun, pembayaran, papan peringkat global, atau multipemain. Progres disimpan di perangkat.
- Tidak ada navigasi buatan sendiri; rute ke aplikasi peta pihak ketiga.
- Agen AI tidak menjawab pengetahuan umum di luar basis pengetahuan.
- Soal kuis dan teks item **tidak** dibuat bebas oleh AI saat berjalan; semuanya ditulis dan diverifikasi tim.

## 4. Pengguna

| Persona | Kebutuhan | Prioritas |
|---|---|---|
| **Siswa SMP–SMA / mahasiswa** | Belajar budaya dengan cara yang seru, singkat, di ponsel | Utama |
| **Guru** | Materi muatan lokal bersumber + cara melihat hasil siswa (mode kelas, belakangan) | Utama |
| **Pengunjung / wisatawan** | Pengantar singkat sebelum/sesudah ke museum, rute ke situs | Sekunder |
| **Museum mitra** | Konten dan koleksinya tampil akurat dengan atribusi; bukti ketertarikan pengunjung | Mitra (B2B) |

Kebutuhan pada tabel ini **belum tervalidasi**; hasil survei/wawancara mengisi versi berikutnya. **[PERLU DIISI]**

## 5. Alur pengguna utama (Bandung)

```
Peta Indonesia → pilih Bandung → Agen menyapa
   → Kuis dasar (5 soal) → Hasil + saran materi
   → Materi budaya (3–4 kartu, tiap kartu: narasi + fakta + sumber + tanya agen)
   → Game runner keliling Bandung
        ↳ tiap 1000 poin: pause → Item/Budaya khusus → penjelasan singkat agen → lanjut
        ↳ game over / selesai → Ringkasan: skor, item terbuka, "Lihat lokasi asli"
```

Aturan alur:
- Pengguna boleh melewati kuis dasar (tombol "Lewati"), tetapi skor awal dicatat jika dikerjakan.
- Materi dapat dibuka ulang dari ringkasan.
- Item yang terbuka tersimpan di "Koleksi" (perangkat pengguna).
- Agen hadir di setiap fase: sapaan/arahan (skrip dari konten) + tanya-jawab bersumber.

## 6. Kebutuhan fungsional

Prioritas: **P0** wajib MVP-0, **P1** tahap seleksi berikutnya, **P2** pengembangan.

### 6.1 Peta dan pemilihan kota
| ID | Kebutuhan | Prio | Kriteria penerimaan |
|---|---|---|---|
| F-001 | Beranda menampilkan peta Indonesia (SVG) dengan titik kota | P0 | Tampil baik di ponsel dan desktop; titik dapat diketuk dan dioperasikan keyboard |
| F-002 | Kota `active` membuka alur; `coming_soon` menampilkan label dan tidak membuka | P0 | Bandung membuka alur; lainnya "segera hadir" |
| F-003 | Kartu kota: nama, ringkasan, jumlah materi, item yang bisa dikoleksi, tombol "Mulai" | P0 | Data dari berkas konten |
| F-004 | Teks pengantar singkat di beranda (apa itu Rupaloka, 3 langkah) | P0 | ≤60 kata, tidak menutupi peta di ponsel |
| F-005 | Video pengantar | P2 | Opsional; video showcase lomba dipisah |

### 6.2 Agen AI (pemandu)
| ID | Kebutuhan | Prio | Kriteria penerimaan |
|---|---|---|---|
| F-010 | Agen menyapa dan memberi arahan di tiap fase (skrip dari konten) | P0 | Teks tiap fase ada dan relevan |
| F-011 | Tanya-jawab bebas yang **hanya** bersumber dari basis pengetahuan kota; menampilkan sitasi atau menolak | P0 | ≥1 sitasi valid per jawaban non-penolakan; penolakan di luar cakupan ≥90% pada set uji **[target; ukur]** |
| F-012 | Penjelasan singkat saat item terbuka (teks dari konten; tombol "Tanya lebih lanjut" membuka tanya-jawab) | P0 | Muncul otomatis saat item terbuka |
| F-013 | Respons mengalir (streaming), suara | P2 | — |
| F-014 | Batas laju dan penanganan galat; bila AI gagal, skrip tetap berjalan | P0 | Alur tidak berhenti saat API gagal |

### 6.3 Kuis pengetahuan dasar
| ID | Kebutuhan | Prio | Kriteria penerimaan |
|---|---|---|---|
| F-020 | Kuis 5 soal pilihan ganda per kota, ditulis dan diverifikasi tim | P0 | Tiap soal punya jawaban benar, penjelasan, dan rujukan sumber |
| F-021 | Umpan balik per soal + penjelasan singkat | P0 | Penjelasan tampil setelah menjawab |
| F-022 | Hasil kuis dan saran materi | P0 | Menampilkan skor dan materi terkait soal yang salah |
| F-023 | Kuis penutup di akhir (pasca-game) untuk melihat peningkatan | P1 | Dibandingkan dengan kuis awal |
| F-024 | Acak urutan soal/pilihan | P1 | — |

### 6.4 Materi budaya
| ID | Kebutuhan | Prio | Kriteria penerimaan |
|---|---|---|---|
| F-030 | 3–4 kartu materi budaya per kota (narasi 100–200 kata, fakta kunci, gambar 2D berlisensi, sumber) | P0 | Lolos validasi konten |
| F-031 | Tombol "Tanya agen" pada tiap kartu (konteks = kartu) | P0 | Pertanyaan menyertakan konteks kartu |
| F-032 | Tombol "Lihat lokasi asli" bila kartu terkait situs | P0 | Tautan arah benar |
| F-033 | Dukungan bahasa Inggris | P2 | — |

### 6.5 Game runner
| ID | Kebutuhan | Prio | Kriteria penerimaan |
|---|---|---|---|
| F-040 | Game runner 2D di kanvas: karakter orisinal berlari otomatis, melompat (ketuk/spasi), menghindari rintangan | P0 | Berjalan ≥30 fps pada ponsel kelas menengah **[VERIFIKASI]**; satu input saja |
| F-041 | Latar dan rintangan bertema kota (Bandung) secara visual; kecepatan meningkat bertahap | P0 | Minimal 3 jenis rintangan dan 1 latar |
| F-042 | Skor naik seiring jarak tempuh (MVP-0 belum memiliki benda yang dipungut saat berlari) | P0 | Skor tampil jelas |
| F-043 | Setiap kelipatan 1000 poin (parameter `unlock_every` di konten): game berhenti, tampil item budaya, penjelasan singkat, tombol "Lanjut" | P0 | Berhenti tepat sekali per ambang; lanjut tanpa kehilangan skor. Ambang ke-k membuka item ke-k pada `items_order`; setelah semua item terbuka, game berjalan terus tanpa jeda sampai game over |
| F-044 | Item terbuka masuk Koleksi; tidak muncul ganda dalam satu sesi | P0 | Koleksi tersimpan di perangkat |
| F-045 | Layar game over + ringkasan (skor, item terbuka, tombol main lagi, lokasi asli) | P0 | — |
| F-046 | Jeda otomatis saat tab tidak aktif; tombol jeda; hormati `prefers-reduced-motion` (kecepatan lebih rendah) | P0 | — |
| F-047 | Rekor tertinggi pribadi | P1 | Tersimpan lokal |
| F-048 | Papan peringkat, streak harian | P2 | — |
| F-049 | **Path belajar per kota** (keputusan tim 20 Nov 2026): titik berurutan (materi; titik terakhir = game), tiap titik = kuis topik → kartu materi; titik berikutnya terbuka setelah titik sebelumnya selesai | P0 | Titik terkunci tidak dapat dibuka; progres tersimpan di perangkat |
| F-049a | **Poin path dan lencana**: +poin per titik selesai, per jawaban kuis benar, dan saat menamatkan game; lencana saat poin melewati ambang (`rewards` di `city.yaml`; angka DRAF 100/300/500) | P0 | Poin tidak dobel saat titik diulang; lencana baru diumumkan sekali |

### 6.6 Lokasi asli dan pendukung
| ID | Kebutuhan | Prio |
|---|---|---|
| F-050 | Tombol "Lihat lokasi asli" membuka tautan arah (koordinat terverifikasi) | P0 |
| F-051 | Halaman Koleksi (item terbuka) | P0 |
| F-052 | Halaman Tentang dan Sumber & Atribusi (dari data konten) | P0 |
| F-053 | Analitik ringan tanpa data pribadi (sesi, kuis selesai, item terbuka, klik lokasi) | P1 |
| F-054 | Umpan balik (tautan formulir) | P1 |

### 6.7 Fitur berbayar dan mitra (rencana, **bukan MVP-0**)
| ID | Kebutuhan | Prio |
|---|---|---|
| F-060 | Penampil model 3D objek budaya (hotspot) | P2 |
| F-061 | Paket langganan individu (akses 3D + konten tambahan) | P2 |
| F-062 | Paket sekolah: mode kelas, tautan guru, laporan hasil siswa | P2 |
| F-063 | Portal mitra museum: unggah/validasi konten, atribusi, statistik | P2 |
| F-064 | Kota tambahan melalui kemitraan | P2 |

MVP-0 menyiapkan **tanda fitur** (`feature_flags`) agar fitur berbayar dapat ditambahkan tanpa mengubah struktur.

## 7. Prinsip desain gamifikasi (pengaman nilai budaya)

1. **Belajar harus terjadi:** item terbuka selalu disertai penjelasan dan sumber; kuis memberi penjelasan, bukan hanya benar/salah.
2. **Hormati budaya:** rintangan tidak boleh berupa benda sakral, simbol agama, atau objek yang dihormati komunitas. Rintangan bertema kota (batu, pagar, kendaraan, hambatan jalan) dengan estetika lokal; objek budaya hadir sebagai **hadiah/koleksi**, bukan sesuatu yang "ditabrak" atau "dihancurkan". Khalifa (budaya) menyetujui daftar rintangan dan item sebelum dipakai. **[PERLU DIISI: daftar]**
3. **Orisinal:** karakter pelari dan maskot dibuat sendiri. Jangan meniru gim, karakter, atau tampilan aplikasi lain.
4. **Tanpa tekanan berlebih:** tanpa hukuman streak pada MVP, tanpa iklan, tanpa mekanik yang mendorong penggunaan berlebihan.
5. **Akurasi di atas kesenangan:** konten tidak diubah demi alur game.

## 8. Kebutuhan non-fungsional

| Area | Kebutuhan |
|---|---|
| Kinerja | Muat awal ≤3 dtk pada 4G **[VERIFIKASI Lighthouse]**; aset game ringan (sprite sheet, tanpa pustaka berat); gambar WebP |
| Responsif | Ponsel lebih dulu; lebar min 360 px; kontrol satu jari |
| Aksesibilitas | Kontras memadai; peta dan kuis dapat dioperasikan keyboard; teks alternatif; opsi kurangi gerak; game dapat dijeda |
| Keandalan | AI gagal → skrip tetap jalan; aset gagal → placeholder |
| Keamanan | Kunci API hanya di server; validasi input; batas laju |
| Privasi | Tanpa akun; progres di `localStorage`; analitik anonim; pemberitahuan singkat |
| Pemeliharaan | Konten terstruktur + validasi otomatis |
| Biaya | Model AI kecil/cepat; batas token; skrip agen tidak memanggil AI |
| Hukum/konten | Hanya aset berlisensi jelas atau milik sendiri; atribusi dicantumkan |

## 9. Persyaratan konten

- **Cakupan Bandung (P0):** 3–4 materi budaya, 5 soal kuis dasar, ≥3 item koleksi (untuk ambang 100/200/300), ≥3 jenis rintangan dan 1 latar, ≥8 chunk pengetahuan per materi untuk agen. Kandidat materi (belum final): Angklung, Wayang golek, koleksi Museum Sri Baduga **[PERLU DIISI Khalifa]**.
- **Aturan sumber:** setiap chunk, soal kuis, materi, dan item punya `source` (judul, tautan/jenis, tanggal akses), `verified_by`, `verified_at`. Yang tidak lengkap **tidak boleh** dirilis (dijaga skrip validasi).
- **Fakta dengan dasar yang sudah ada:** angklung tercatat UNESCO 2010; wayang tercantum UNESCO 2008; Museum Sri Baduga di Jl. BKR No.185 Bandung. Kaitan wayang golek dengan Bandung dan peran Saung Angklung Udjo **harus diverifikasi** sebelum dipakai.
- **Aset 2D:** foto milik sendiri atau berlisensi; izin foto di museum/sanggar **[PERLU DIISI]**.
- **Koordinat:** dari sumber peta yang dapat diperiksa, bukan ditebak.
- **Bahasa:** Indonesia; istilah Sunda dijelaskan.

## 10. Model bisnis (hipotesis; selaras dengan proposal setelah diperbarui)

| Elemen | Rencana (belum tervalidasi) |
|---|---|
| Segmen | Sekolah dan guru; pengguna individu pelajar/pembelajar; museum dan pengelola situs sebagai mitra |
| Proposisi nilai | Pengguna/sekolah: belajar budaya dengan cara bermain, bersumber, bertahap. Museum: kanal digital baru dan dorongan kunjungan nyata |
| Gratis | Kuis, materi, dan game kota aktif |
| Berlangganan | Akses model 3D, konten dan kota tambahan, fitur khusus; paket sekolah dengan mode kelas dan laporan |
| Pendapatan mitra | Kemitraan/lisensi konten dengan museum, kerja sama pemda **[HIPOTESIS]** |
| Biaya utama | Pembuatan konten dan verifikasi, pemindaian 3D, hosting dan API AI, pengembangan |
| Harga | **[PERLU DIISI]** setelah wawancara sekolah/museum; jangan menulis angka tanpa dasar |

## 11. Cakupan bertahap

| Tahap | Isi |
|---|---|
| **MVP-0 (pendaftaran diperpanjang)** | Semua P0 untuk Bandung: peta, agen, kuis, materi, path belajar + poin/lencana, game runner dengan item per 1000 poin, koleksi, lokasi asli, deploy, video showcase |
| **MVP-1 (6–12 bln)** | P1: kuis penutup, rekor, analitik, uji di sekolah; kota kedua bersama mitra |
| **Skala (1–5 th)** | P2: penampil 3D, langganan, mode kelas, portal museum, banyak kota |

Fitur P1 (kuis penutup, rekor, analitik) baru dikerjakan setelah semua P0 selesai. Bila P0 pun tidak terkejar, pangkas berurutan: tampilan koleksi dibuat sederhana → variasi rintangan (kurangi ke 2) → materi ke-4. **Tidak boleh dipangkas:** peta di beranda, agen bersumber (sitasi/penolakan), kuis dasar, ≥3 materi bersumber, path belajar, game dengan item tiap `unlock_every` poin, deploy.

## 12. Metrik keberhasilan (target, belum diukur)

| Metrik | Target purwarupa | Ukur |
|---|---|---|
| Penyelesaian putaran Bandung tanpa bantuan | ≥70% penguji | Uji terpandu 5+ orang |
| Selisih skor kuis (awal vs penutup, bila P1) | Meningkat | Uji terpandu |
| Item terbuka per sesi | rata-rata ≥1 | Analitik/uji |
| Jawaban agen bersitasi valid | 100% non-penolakan | Skrip evaluasi |
| Akurasi jawaban agen pada set uji | ≥90% **[target]** | Set 30 soal dinilai tim budaya |
| Penolakan di luar cakupan | ≥90% **[target]** | Set 15 soal |
| Klik "Lihat lokasi asli" | Dicatat sebagai minat kunjungan | Analitik |

Jangan menulis angka di atas sebagai capaian di proposal sebelum diukur.

## 13. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| Waktu mepet | Cakupan MVP ketat (§11); kerja paralel dev / konten / dokumen |
| Game terasa sekadar hiburan, nilai edukasi lemah | Item selalu dengan penjelasan + sumber; kuis dan materi mendahului game; ukur lewat kuis |
| Rintangan/gamifikasi dianggap melecehkan budaya | Prinsip §7; persetujuan anggota budaya; narasumber meninjau |
| Mirip gim/aplikasi lain (hak cipta/merek) | Karakter dan aset orisinal; tanpa meniru tampilan |
| AI berhalusinasi | RAG terbatas, sitasi wajib, ambang skor, evaluasi; kuis dan item ditulis manual |
| Kinerja game di ponsel lama | Kanvas ringan, sprite sederhana, pengaturan kurangi gerak |
| Klaim berlebih di proposal | Pisahkan capaian aktual, uji awal, target |
| Model bisnis tanpa validasi | Tandai hipotesis; wawancara 2–3 sekolah/museum bila sempat |

## 14. Dampak ke dokumen lomba (proposal perlu diselaraskan)

Bagian proposal yang berubah dari v2: judul/deskripsi produk (gamifikasi), abstrak, Latar Belakang (tambah argumen gamifikasi + bukti terbatas), Bagian 7–10 (pengguna, solusi, tujuan, keunikan), 11–12 (teknologi: game kanvas, tanpa 3D), 13 (BMC: freemium, sekolah, mitra museum), 17 (roadmap: 3D dan langganan masuk tahap lanjut), Gambar 1 (alur), Gambar 2 (komponen), dan Lampiran. **Nama produk tetap "RUPALOKA".** Judul lomba maksimal 14 kata; periksa judul baru.

## 15. Pertanyaan terbuka

1. Tanggal dan jam batas baru; apakah purwarupa wajib berjalan saat itu?
2. Daftar materi final, rintangan, dan item Bandung (Khalifa).
3. Nama dan visual karakter pelari dan maskot.
4. Ambang poin (default 100) dan jumlah item (minimal 3). Setelah item habis, game berjalan terus tanpa jeda; ini default yang dapat diubah tim.
5. Tagline baru (karena 3D ditunda).
6. Izin/komitmen museum mitra (ada surat dukungan atau belum).
7. Domain/subdomain.
