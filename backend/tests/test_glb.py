from __future__ import annotations

import struct
from pathlib import Path

import pytest

from app.glb import GlbError, read_nodes, read_nodes_file
from tests.glbfixture import BIN_CHUNK, GLB_MAGIC, JSON_CHUNK, make_glb


def test_reads_names_and_translations() -> None:
    data = make_glb(
        [
            {"name": "hotspot_tabung", "translation": [0, 0.7, 0.2]},
            {"name": "pedestal_1", "translation": [-1.5, 0, -2.25]},
        ]
    )
    assert read_nodes(data) == {
        "hotspot_tabung": (0.0, 0.7, 0.2),
        "pedestal_1": (-1.5, 0.0, -2.25),
    }


def test_missing_translation_is_origin_and_unnamed_nodes_skipped() -> None:
    data = make_glb([{"name": "akar"}, {"mesh": 0}])
    assert read_nodes(data) == {"akar": (0.0, 0.0, 0.0)}


def test_no_nodes_key() -> None:
    doc = b'{"asset":{"version":"2.0"}}'
    doc += b" " * (-len(doc) % 4)
    body = struct.pack("<II", len(doc), JSON_CHUNK) + doc
    data = struct.pack("<III", GLB_MAGIC, 2, 12 + len(body)) + body
    assert read_nodes(data) == {}


@pytest.mark.parametrize(
    ("data", "needle"),
    [
        (b"bukan glb sama sekali", "bukan GLB"),
        (make_glb([], version=1), "versi"),
        (make_glb([], chunk_type=BIN_CHUNK), "JSON"),
        (make_glb([])[:16], "terpotong"),
    ],
)
def test_invalid_glb(data: bytes, needle: str) -> None:
    with pytest.raises(GlbError, match=needle):
        read_nodes(data)


def test_read_from_file(tmp_path: Path) -> None:
    p = tmp_path / "m.glb"
    p.write_bytes(make_glb([{"name": "pedestal_1", "translation": [1, 2, 3]}]))
    assert read_nodes_file(p) == {"pedestal_1": (1.0, 2.0, 3.0)}
