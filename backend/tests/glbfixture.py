"""Pembuat GLB minimal untuk uji (dipakai test_glb dan test_content_loader)."""

from __future__ import annotations

import json
import struct
from typing import Any

GLB_MAGIC = 0x46546C67
JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def make_glb(
    nodes: list[dict[str, Any]], *, version: int = 2, chunk_type: int = JSON_CHUNK, pad: int = 0
) -> bytes:
    """GLB minimal (header + chunk JSON) untuk uji; tanpa geometri."""
    doc = json.dumps({"asset": {"version": "2.0"}, "nodes": nodes}).encode()
    doc += b" " * (-len(doc) % 4)
    doc += b" " * pad  # pengisi agar ukuran berkas bisa diuji
    body = struct.pack("<II", len(doc), chunk_type) + doc
    return struct.pack("<III", GLB_MAGIC, version, 12 + len(body)) + body
