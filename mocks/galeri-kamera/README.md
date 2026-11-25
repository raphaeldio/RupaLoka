# Mock: alur kamera Galeri 3D (sekali pakai)

Purwarupa terpisah dari aplikasi utama untuk mencoba **alur kamera** galeri 3D
(spesifikasi: `docs/superpowers/specs/2026-11-25-galeri-3d-vr-design.md`).
Semua objek adalah primitif pengganti; model asli menyusul dari Blender. Tanpa fakta budaya.

Pola interaksi terinspirasi galeri dinding lengkung (shutabug.com); tampilan memakai palet Rupaloka sendiri.

```
npm install
npm run dev    # http://localhost:5180
```

Alur: intro (masuk dari pintu) → jalan menyusuri busur (scroll/geser/←→) → klik objek = mendekat
→ klik lagi = periksa (geser memutar objek, titik emas = hotspot) → Esc / klik kosong = mundur satu tingkat.
Toggle "Gerak dikurangi" mengganti luncuran kamera dengan pudar.
