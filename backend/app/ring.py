"""Geometri lorong melingkar galeri 3D (SDD ADR 40).

Rumus ini harus sama dengan `frontend/src/gallery/cameraFlow.ts`; keduanya diuji
dengan vektor yang sama (posisi pedestal_1 dan pedestal_2 untuk R=6, 12 slot, first_d=3).

Jalur mulai di titik asal menghadap −Z dan berbelok ke kiri (pusat lingkaran di
(−R, 0, 0)). Pedestal berselang-seling: indeks genap di dinding dalam (kiri),
ganjil di dinding luar (kanan), 1,9 m dari garis tengah.
"""

from __future__ import annotations

import math

from app.schemas import GalleryLayout

HALF_WIDTH = 2.6  # setengah lebar lorong (m)
PEDESTAL_OFFSET = HALF_WIDTH - 0.7  # jarak pedestal dari garis tengah (m)


def ring_point(layout: GalleryLayout, index: int) -> tuple[float, float]:
    """Posisi (x, z) pusat pedestal ke-`index` (0-based) di dunia."""
    r = layout.radius
    d = layout.first_d + index * 2 * math.pi * r / layout.slots
    a = d / r
    c, s = math.cos(a), math.sin(a)
    side = -1 if index % 2 == 0 else 1
    x = -r + r * c + side * PEDESTAL_OFFSET * c
    z = -r * s - side * PEDESTAL_OFFSET * s
    return (x, z)
