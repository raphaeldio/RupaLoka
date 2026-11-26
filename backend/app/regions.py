"""Nama wilayah Indonesia untuk cek wilayah di gerbang (SDD §9, ADR 43).

Daftar 38 provinsi disalin dari `frontend/public/geo/indonesia-provinces.geojson` (OSM, ODbL).
`test_provinces_match_geojson` memeriksa daftar ini tetap sama dengan GeoJSON. Ditambah nama kota
di `content/cities.yaml` (lihat `Retriever.from_content`) dan beberapa sebutan sehari-hari.
Ini bukan konten budaya: hanya nama tempat untuk menolak pertanyaan tentang daerah lain.
"""

from __future__ import annotations

PROVINCES = (
    "Aceh", "Bali", "Banten", "Bengkulu", "Daerah Istimewa Yogyakarta",
    "Daerah Khusus Ibukota Jakarta", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah",
    "Jawa Timur", "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah",
    "Kalimantan Timur", "Kalimantan Utara", "Kepulauan Bangka Belitung", "Kepulauan Riau",
    "Lampung", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua",
    "Papua Barat", "Papua Barat Daya", "Papua Pegunungan", "Papua Selatan", "Papua Tengah",
    "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara",
    "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara",
)  # fmt: skip

# Sebutan sehari-hari untuk nama provinsi yang panjang.
ALIASES = ("Yogyakarta", "Jogja", "Jogjakarta", "Yogya", "Jakarta", "Bangka Belitung", "NTB", "NTT")
