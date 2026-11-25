# Mock: alur kamera Galeri 3D (sekali pakai)

Purwarupa terpisah dari aplikasi utama untuk mencoba **alur kamera** galeri 3D
(spesifikasi: `docs/superpowers/specs/2026-11-25-galeri-3d-vr-design.md`).
Semua objek adalah primitif pengganti; model asli menyusul dari Blender. Tanpa fakta budaya.

Pola interaksi (klik untuk mendekat, Esc untuk mundur, Galeri/Daftar) terinspirasi shutabug.com; tata letak lorong dan tampilan milik Rupaloka.

```
npm install
npm run dev    # http://localhost:5180
```

Alur: intro (masuk dari pintu) → berjalan maju di lorong, objek di kiri-kanan (scroll / geser ke atas / ↑↓)
→ klik objek = kamera menoleh dan mendekat
→ klik lagi = periksa (geser memutar objek, titik emas = hotspot) → Esc / klik kosong = mundur satu tingkat.
Toggle "Gerak dikurangi" mengganti luncuran kamera dengan pudar.
