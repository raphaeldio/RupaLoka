"""Pembaca node GLB minimal untuk validasi konten galeri (rencana T-112).

Hanya membaca header 12 byte dan chunk JSON pertama, tanpa dependensi 3D.
Posisi yang dikembalikan adalah ``translation`` lokal tiap node; transformasi
induk tidak dikomposisi. Karena itu empty ``pedestal_N`` dan ``hotspot_<id>``
harus diekspor di akar adegan (atau di bawah objek akar tanpa transformasi).
"""

from __future__ import annotations

import json
import struct
from pathlib import Path

GLB_MAGIC = 0x46546C67  # "glTF"
JSON_CHUNK = 0x4E4F534A  # "JSON"

Vec3 = tuple[float, float, float]


class GlbError(ValueError):
    """Berkas bukan GLB 2.0 yang dapat dibaca."""


def read_nodes(data: bytes) -> dict[str, Vec3]:
    """Kembalikan {nama node: translasi lokal} untuk semua node bernama."""
    if len(data) < 12:
        raise GlbError("bukan GLB: berkas terlalu pendek")
    magic, version, _length = struct.unpack_from("<III", data, 0)
    if magic != GLB_MAGIC:
        raise GlbError("bukan GLB: magic salah")
    if version != 2:
        raise GlbError(f"versi GLB {version} tidak didukung (harus 2)")
    if len(data) < 20:
        raise GlbError("GLB terpotong: chunk JSON tidak ada")
    chunk_len, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != JSON_CHUNK:
        raise GlbError("chunk pertama GLB bukan JSON")
    if len(data) < 20 + chunk_len:
        raise GlbError("GLB terpotong: chunk JSON tidak lengkap")
    try:
        doc = json.loads(data[20 : 20 + chunk_len].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GlbError(f"chunk JSON GLB rusak: {exc}") from exc

    nodes: dict[str, Vec3] = {}
    for node in doc.get("nodes", []):
        name = node.get("name")
        if not isinstance(name, str):
            continue
        t = node.get("translation") or [0, 0, 0]
        nodes[name] = (float(t[0]), float(t[1]), float(t[2]))
    return nodes


def read_nodes_file(path: Path) -> dict[str, Vec3]:
    return read_nodes(path.read_bytes())
