# Maskot Rupaloka

Taruh gambar maskot di folder ini; `src/components/Mascot.tsx` memakainya otomatis.

- `maskot.svg` / `maskot.png` / `maskot.webp` / `maskot.gif`: gambar utama (persegi, latar transparan).
- Opsional per suasana: `maskot-thinking.*` (menunggu jawaban), `maskot-talking.*` (baru menjawab).
- Animasi dasar ada di `src/components/mascot.css`. Untuk animasi kompleks (Lottie/Rive),
  ganti isi komponen `Mascot`; ia menerima prop `mood`.

Maskot harus orisinal (CLAUDE.md prinsip 5) dan dicatat di `content/sources.yaml`.
