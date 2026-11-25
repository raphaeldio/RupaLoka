# Galeri 3D + Penampil Objek + VR — Desain

- Tanggal: 25 November 2026
- Status: disetujui dalam sesi brainstorming, menunggu tinjauan tim
- Fitur: F-060 (diperluas), di balik flag `viewer3d` + `premium_content`
- Usulan ADR: **39** (SDD §16), mencabut penundaan ADR 7 **khusus untuk galeri ini**

## 1. Tujuan dan batas

**Tujuan:** purwarupa fitur premium untuk demo lomba. Pengguna masuk ke **ruang galeri virtual** Bandung yang berisi objek koleksi (angklung, wayang golek, Cepot). Mereka berpindah antar-pedestal dan membuka **penampil objek** yang bisa diputar, lengkap dengan hotspot penjelasan bersumber. Galeri berjalan di desktop, ponsel (layar sentuh, Cardboard bila didukung) dan **Meta Quest** (WebXR penuh).

**Keputusan sesi:**

| Pertanyaan | Keputusan |
|---|---|
| Bentuk 3D | Gabungan ruang galeri + penampil objek |
| Perangkat | Quest (VR penuh) + ponsel (3D sentuh; Cardboard bila WebXR tersedia) |
| Sumber aset | Dibuat tim di Blender (lewat connector Blender) |
| Integrasi | Fitur premium; untuk demo dibuka lewat flag |
| Waktu | Dibangun untuk demo lomba, **setelah semua P0 MVP-0 selesai** |
| Pendekatan | A: React Three Fiber + `@react-three/xr` + drei |

**Di luar cakupan:** akun, pembayaran, dan pengecekan hak akses di server; AR; galeri kota lain; gerak halus (thumbstick) di VR; service worker/offline; poin atau lencana dari galeri.

**Pendekatan yang ditolak:**
- A-Frame: berbasis DOM, integrasinya dengan React/Zustand/TS kurang rapi.
- Babylon.js: imperatif, bundle lebih berat, bertentangan dengan SDD.
- `<model-viewer>`: tidak mendukung VR maupun ruangan.

## 2. Arsitektur dan komponen

**Rute:** `/kota/:cityId/galeri`, ditautkan dari halaman kota dan `/koleksi`.

- Gerbang: bila `featureFlags.viewer3d && featureFlags.premium_content` bernilai salah, halaman menampilkan kartu "Fitur premium" dengan tautan ke `/langganan`.
- Untuk demo, flag dinyalakan lewat env build `VITE_FLAGS=viewer3d,premium_content`. `lib/flags.ts` membaca env ini, dan nilai bawaannya tetap `false`.
- Seluruh `src/gallery/` dimuat lambat (`React.lazy`). Three.js, R3F, drei dan XR hanya ada di chunk `gallery`.

**Versi:** `@react-three/xr` v6 (`createXRStore`, `<XR store>`, `store.enterVR()`) dengan `@react-three/fiber` v8, karena proyek memakai React 18 dan R3F v9 butuh React 19. Kecocokan peer dependency diperiksa saat pemasangan.

| Unit | Tugas | Bergantung pada |
|---|---|---|
| `gallery/GalleryPage.tsx` | Gerbang flag, deteksi mode, tombol "Masuk VR", overlay HTML (progres, panel hotspot layar) | `featureFlags`, `xrSupport`, `galleryConfig` |
| `gallery/xrSupport.ts` | **Murni, diuji.** Masukan: ketersediaan WebGL, `navigator.xr.isSessionSupported('immersive-vr')`, UA. Keluaran: `'vr' \| 'cardboard' \| 'touch' \| 'desktop' \| 'no-webgl'` | — |
| `gallery/galleryConfig.ts` | **Murni, diuji.** Menggabungkan `gallery.yaml` dengan item; hotspot yang `text`-nya `null` disaring; galat bila id item tidak dikenal | content loader |
| `gallery/cameraFlow.ts` | **Murni, diuji.** Jalur cincin (posisi, arah maju, normal kanan per jarak `d`), state kamera, reducer transisi, pose per state (§2.1) | — |
| `gallery/GalleryScene.tsx` | Satu `<Canvas><XR>`: ruangan GLB berbentuk cincin, pedestal, rig kamera (mode layar), `TeleportTarget` di lantai + `XROrigin` (VR) | `galleryConfig`, `cameraFlow` |
| `gallery/Exhibit.tsx` | Satu objek di `pedestal_N`; klik, ketuk, tatap atau grab membuka Inspector; `ErrorBoundary` per objek | data item |
| `gallery/Inspector.tsx` | Objek di tengah pandangan, diputar (geser di layar, grab di VR), penanda hotspot di posisi empty `hotspot_<id>` | `hotspots` |
| `gallery/HotspotPanel.tsx` | Teks hotspot bersumber + "Tanya Saloka". Di layar memakai DOM, di VR memakai panel 3D (teks biasa) | item, chatbot yang ada |

### 2.1 Tata ruang dan alur kamera (keputusan 25 Nov 2026)

Dicoba di mock `mocks/galeri-kamera/` (tombol "Melingkar"). Pola interaksi "klik untuk mendekat, Esc untuk mundur, Galeri/Daftar" terinspirasi shutabug.com. Tata ruang dan tampilannya milik Rupaloka (prinsip 5).

**Tata ruang: lorong melingkar tanpa ujung.**
- Lorong selebar 5,2 m berbentuk cincin dengan jari-jari garis tengah ±6 m.
- Pedestal berdiri bergantian di **dinding dalam** (kiri) dan **dinding luar** (kanan) dari arah jalan, 0,7 m dari dinding.
- Jumlah slot = `max(jumlah objek, 12)` dan jari-jari = `max(6 m, slot × 3,1 m / 2π)`. Batas bawah 6 m menjaga lengkung dinding dalam tidak terlalu tajam (jari-jari dinding dalam ≥3,4 m).
- Slot tanpa objek menampilkan pedestal "Segera hadir" yang tidak bisa diklik.

**State kamera (mode layar):**

| State | Pose kamera | Masuk dari |
|---|---|---|
| `intro` | 4 m di belakang titik awal, setinggi mata +0,3 m | muat halaman |
| `walk(d)` | Di garis tengah lorong pada jarak `d`, menatap titik lorong 3 m di depan (pandangan ikut melengkung) | intro selesai (0,9 dtk), mundur dari `focus` |
| `focus(i)` | Menoleh ke sisi objek, 2,1 m di depannya, menatap objek | klik/ketuk objek, pilih dari Daftar, ← → saat fokus |
| `inspect(i)` | 1,3 m di depan objek; geser memutar objek (bukan kamera) | klik objek yang sedang difokus, Enter |

**Transisi:**
- **Maju/mundur:** scroll, geser layar ke atas/bawah, atau tombol/panah ↑ ↓. Nilai `d` berputar (modulo keliling), jadi tidak ada ujung.
- **Langkah ↑ ↓ saat berjalan:** berdiri 2,4 m sebelum objek berikutnya.
- **Esc, klik area kosong, atau tombol "Mundur":** `inspect` → `focus` → `walk`. Saat kembali ke `walk`, kamera berdiri 2,4 m sebelum objek tadi.
- **Scroll saat `focus`:** langsung kembali berjalan.
- **← → saat `focus`:** pindah ke objek asli berikutnya, melewati slot kosong.
- Drag yang bergeser >6 px tidak dihitung sebagai klik.

**Label bawah:** "Kamu sedang melewati / Di depanmu / Memeriksa" + nama objek. Objek "dilewati" = objek terdekat dengan titik 2,4 m di depan kamera.

**Gerak:**
- Kamera meluruh menuju pose (peluruhan eksponensial; λ = 6 saat berjalan, 3,2 saat menoleh), tidak bergantung frame rate.
- `prefers-reduced-motion` (atau toggle): kamera langsung melompat ke pose tujuan, ditutup kedipan pudar 0,18 dtk.

**Layar tegak:** FOV vertikal 55° → hingga 77°, kamera mundur ±0,6 m saat fokus, dan saat berjalan kamera sedikit melirik ke sisi objek terdekat. Tanpa ini, objek di samping berada di luar FOV horizontal ±21° di layar 360 px.

**Kontrol per mode** (satu scene, yang berganti hanya lapisan input):

| Mode | Berpindah | Memilih/inspeksi |
|---|---|---|
| desktop | Scroll / ↑ ↓ / drag vertikal, menyusuri cincin | Klik objek (fokus → periksa); drag horizontal memutar objek; Esc mundur |
| touch | Geser ke atas/bawah, tombol ↑ ↓ | Ketuk objek; geser memutar objek; tombol "Mundur" |
| vr (Quest) | Teleport di lantai cincin (`teleportPointer` kontroler + tangan); kamera = kepala pengguna, tanpa rig | Ray atau grab untuk mengambil dan memutar objek |
| cardboard | Titik teleport tetap di depan tiap pedestal, dipilih dengan tatapan | Tatap 2 dtk (`gaze`) |
| no-webgl | — | Grid kartu 2D: `poster` + hotspot sebagai daftar teks |

## 3. Konten dan alur Blender

### 3.1 `content/bandung/gallery.yaml` (baru)

```yaml
room:
  model: assets/models/galeri-bandung.glb   # lorong cincin (§2.1), cahaya sudah di-bake
  source: src-model-galeri                  # id di sources.yaml
layout: {radius: 6, slots: 12, first_d: 3}  # parameter cincin §2.1; dibaca frontend dan validator
exhibits:                                   # urutan = pedestal_1, pedestal_2, ...
  - item: item-angklung
  - item: item-wayang
  - item: item-cepot
approved_by_kh: null                        # {name, approved_at}; wajib untuk --release
```

### 3.2 Tambahan di YAML item

```yaml
model:
  src: assets/models/angklung.glb
  poster: assets/images/angklung.webp       # fallback bila 3D gagal
  source: src-model-angklung
  accuracy_check: null                      # {by, checked_at}: bentuk dicek KH
hotspots:
  - id: tabung                              # = empty "hotspot_tabung" di GLB
    label: "Tabung bambu"
    text: null                              # DIISI TIM BUDAYA, bersumber
    chunk: null                             # id chunk di knowledge/
```

Aturannya:
- Teks hotspot ditulis manual dan bersumber; AI tidak menghasilkan teks hotspot.
- Posisi hotspot diambil dari GLB, bukan dari YAML.
- Label "Model 3D buatan tim, bentuk dicek oleh {by}" hanya tampil bila `accuracy_check` terisi. Bila belum, yang tampil "Model 3D buatan tim, belum diperiksa tim budaya".

### 3.3 Validasi (`backend/scripts/validate_content.py`)

- File GLB yang dirujuk ada. Ukurannya ≤3 MB per objek dan ≤8 MB untuk ruangan.
- `source` terdaftar di `sources.yaml`.
- Tiap `hotspots[].id` punya node `hotspot_<id>` di GLB, dan `len(exhibits)` ≤ jumlah node `pedestal_N` di GLB ruangan. Posisi tiap `pedestal_N` berada dalam 0,1 m dari posisi yang dihitung jalur cincin (§2.1). Nama node dibaca dari chunk JSON GLB, tanpa dependensi 3D.
- Pydantic: `Item.model` dan `Item.hotspots` opsional. Skema galeri baru; `gen_ts_types.py` dijalankan ulang.
- `--release` gagal bila ada `text`, `chunk`, `accuracy_check` atau `approved_by_kh` yang masih `null`.

### 3.4 Alur Blender (lewat connector)

1. Modelkan objek dengan anggaran ±20–50 rb segitiga dan ruangan ±50 rb, berskala meter, dengan origin di dasar objek.
2. Ruangan = lorong cincin sesuai §2.1 (dinding dalam dan luar, lantai, langit-langit). Tempatkan empty `hotspot_<id>` (objek) dan `pedestal_N` (ruangan, bergantian dalam/luar searah jalan, sumbu +Z lokal menghadap tengah lorong). Jari-jari dan jumlah slot cincin harus sama dengan nilai di `cameraFlow.ts`; validator membandingkan posisi `pedestal_N` dengan jalur. Mesh statis ruangan digabung agar draw call rendah.
3. Bake cahaya ruangan ke lightmap. Objek memakai PBR sederhana (base color, normal, ORM), tekstur ≤1024 px, dan material sesedikit mungkin.
4. Isi `asset.copyright` "© tim KamiPemenang", lalu ekspor GLB ke `blender/export/`. File `.blend` disimpan di `blender/src/` (Git LFS bila besar), **tidak** di folder yang disajikan.
5. `frontend/scripts/optimize_models.mjs` (gltf-transform) melakukan kompresi Meshopt dan tekstur WebP (KTX2 hanya bila pengukuran memori GPU menuntutnya, lihat §5). Keluarannya ke `content/assets/models/` dengan nama ber-hash.
6. Jalankan `validate_content.py`, lalu catat entri di `sources.yaml` (lisensi: milik tim KamiPemenang).

Bentuk objek budaya adalah interpretasi tim dan harus diperiksa KH (prinsip 1 dan 4).

## 4. Gagal dengan anggun

| Kondisi | Perilaku |
|---|---|
| Flag mati | Kartu "Fitur premium" dengan tautan ke `/langganan` |
| Tanpa WebGL | Mode `no-webgl`: grid kartu 2D |
| GLB ruangan gagal | Ruangan pengganti dari geometri primitif; objek tetap tampil |
| GLB objek gagal | Bidang bergambar `poster` + "Model belum tersedia" (`ErrorBoundary` per objek) |
| `enterVR()` ditolak/gagal | Tetap di mode layar + toast "VR tidak dapat dimulai di perangkat ini" |
| Sesi VR berakhir tiba-tiba | Kembali ke mode layar di posisi terakhir; state dipertahankan |
| Chat gagal dari hotspot | Fallback Saloka yang sudah ada |

Overlay pemuatan menampilkan progres (`useProgress`), sehingga layar tidak pernah kosong.

## 5. Performa

Semua angka di bawah adalah **target**. Laporannya hanya diambil dari hasil ukur.

**Runtime:**
- 72 fps di Quest 2 dan ≥30 fps di ponsel kelas menengah.
- Tanpa bayangan dinamis; satu lampu lingkungan untuk objek.
- `dpr` dibatasi `[1, 1.5]` di ponsel. `PerformanceMonitor` (drei) menurunkan `dpr` bila fps turun. Di Quest dipakai foveation bawaan WebXR.
- Draw call ≤100.
- `prefers-reduced-motion`: perpindahan memakai fade, tanpa animasi kamera. Di VR hanya teleport (tanpa gerak halus).

**Khusus web:**
- **Bundle:** semua paket 3D hanya ada di chunk `gallery`, dan drei diimpor per modul. Anggaran ukuran di CI: chunk utama tidak boleh bertambah karena galeri, dan chunk `gallery` punya batas yang ditetapkan dari pengukuran pertama (diukur dengan `rollup-plugin-visualizer`). Chunk `gallery` di-prefetch saat tautan "Galeri 3D" terlihat atau di-hover.
- **Unduhan:** total galeri Bandung ≤15 MB. Urutan muat: ruangan dulu, lalu objek terdekat. Bila `navigator.connection.saveData` aktif atau `effectiveType` lambat, tampilkan konfirmasi "Galeri butuh ±N MB. Lanjutkan?" (N dihitung dari ukuran file sebenarnya).
- **Decoder:** Meshopt (dan KTX2 bila dipakai) di-self-host di Vercel.
- **Penyajian:** GLB disimpan di `content/assets/models/`, lalu disalin plugin Vite ke `/models/*` dan disajikan CDN Vercel, bukan `/api/assets` di Render (Render gratis tertidur; *cold start* menggagalkan unduhan besar). Lihat rencana Tugas 7.
- **Cache:** GLB ber-hash disajikan dengan `Cache-Control: public, max-age=31536000, immutable` lewat `vercel.json`.
- **Baterai:** `frameloop="demand"` di mode layar. Di VR render terus, dikelola XR. Render berhenti saat tab tersembunyi.
- **Memori:** saat meninggalkan rute, geometri dan tekstur di-dispose dan cache `useGLTF` dibersihkan.

## 6. Keamanan

1. **Gerbang premium demo bukan pengaman.** Flag ada di frontend dan GLB adalah URL publik. Galeri demo tidak melindungi konten premium. Premium sungguhan (bersama akun/F-061) butuh pengecekan hak akses di server, storage privat dan signed URL berumur pendek; ini pekerjaan lanjutan.
2. **Model bisa diekstrak** oleh siapa pun yang merendernya. Yang disajikan hanya GLB teroptimasi; `.blend` tidak disajikan; `asset.copyright` diisi dan atribusi ditampilkan di UI.
3. **Konten:** GLB hanya dari path di YAML milik kita; tidak ada URL model dari pengguna atau query string. Teks hotspot dirender sebagai teks biasa (tanpa `dangerouslySetInnerHTML`). "Tanya Saloka" memakai `/api/chat` yang sudah ada, termasuk rate limit-nya. Tidak ada endpoint baru.
4. **Header `vercel.json`** (sebelumnya belum ada):
   - `Content-Security-Policy`: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'`; `worker-src 'self' blob:`; `connect-src`, `img-src` dan `frame-src` hanya untuk domain yang benar-benar dipakai kode (YouTube, tile peta, Supabase, Google Form; daftar diambil dari kode); `frame-ancestors 'none'`.
   - `Permissions-Policy: xr-spatial-tracking=(self), camera=(), microphone=(), geolocation=()`.
   - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - CSP dipasang dulu sebagai `Content-Security-Policy-Report-Only`, diuji di semua alur (beranda/peta, titik + YouTube, game, chat, Beri masukan, galeri), baru setelah itu ditegakkan.
5. **Rantai pasok:** versi paket 3D dipatok di lockfile; `npm audit --audit-level=high` di CI; tanpa skrip CDN pihak ketiga.
6. **Skor:** galeri tidak memberi poin dan tidak menyentuh papan peringkat.
7. **WebXR:** sesi hanya dimulai dari klik pengguna di HTTPS; tidak meminta izin kamera atau lokasi.

## 7. Pengujian

- **vitest:**
  - `xrSupport`: tiap kombinasi WebGL/XR/UA menghasilkan mode yang benar.
  - `cameraFlow`: jalur cincin (titik awal, arah maju, normal kanan, keliling), pembungkusan `d`, transisi `walk`/`focus`/`inspect`/`back`, langkah melewati slot kosong, objek "dilewati", pose fokus berada di dalam lorong.
  - `galleryConfig`: penggabungan, penyaringan hotspot `null`, galat id tak dikenal.
  - `GalleryPage`: gerbang flag (mati → kartu premium; hidup → memuat scene tiruan).
  - `flags`: parsing `VITE_FLAGS`.
- **pytest:** aturan baru `validate_content.py`, dengan GLB uji kecil di `backend/tests/fixtures/` yang berisi node `hotspot_*`/`pedestal_*`, batas ukuran, `source`, dan aturan `--release`.
- **Manual (dicatat di TASKS beserta hasil ukur):**
  - desktop Chrome
  - ponsel 360 px (Android Chrome dan iOS Safari)
  - Quest browser
  - Immersive Web Emulator di desktop
  - FPS lewat overlay `?debug=1`; waktu muat lewat DevTools dengan throttling "Fast 4G"; ukuran chunk dari build
  - CSP Report-Only tanpa pelanggaran di semua alur

## 8. Perubahan dokumen

- **SDD §16, ADR 39:** "Galeri 3D + penampil + VR dibangun untuk demo lomba di balik `viewer3d` + `premium_content`; mencabut penundaan ADR 7 khusus untuk galeri; R3F v8 + `@react-three/xr` v6; gerbang premium demo hanya di klien."
- **SDD baris 52 dan 310:** perbarui keterangan 3D.
- **PRD:** F-060 menjadi "Galeri 3D + penampil objek (hotspot) + VR", tetap P2 di peta jalan, dengan catatan "purwarupa demo lomba".
- **TASKS:** fase baru "Fase 3d — Galeri 3D/VR (demo; setelah semua P0)". Tugas aset Blender ditandai butuh persetujuan KH.
- **`.env.example`:** `VITE_FLAGS=` (kosong).
- **CLAUDE.md:** bagian "Ditunda" diperbarui (penampil 3D kini purwarupa demo di balik flag).

## 9. Hal terbuka (jangan diasumsikan)

- Teks hotspot dan chunk sumbernya: diisi tim budaya.
- Pemeriksa akurasi bentuk model (KH) dan persetujuan isi galeri.
- Desain visual ruangan galeri: perlu selaras dengan gaya piksel ADR 38 dan tetap orisinal (prinsip 5).
- Batas ukuran chunk `gallery`: ditetapkan dari pengukuran pertama.
- Pilihan KTX2 atau WebP: ditentukan dari pengukuran memori GPU di Quest/ponsel.
- Ketersediaan perangkat Quest untuk uji dan demo.
