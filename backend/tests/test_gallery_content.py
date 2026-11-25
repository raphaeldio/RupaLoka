"""Konten galeri 3D (rencana T-113/T-114): skema, rujukan, dan aset GLB."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.content_loader import load_content
from tests.test_content_loader import assert_error, assert_pending

GALLERY = "kota-uji/gallery.yaml"


def with_gallery(files: dict[str, Any], **overrides: Any) -> None:
    """Tambahkan galeri lengkap (lolos rilis bila aset GLB ditulis oleh uji)."""
    gallery: dict[str, Any] = {
        "room": {"model": "assets/models/galeri.glb"},
        "layout": {"radius": 6, "slots": 12, "first_d": 3},
        "exhibits": [{"item": "item-a"}, {"item": "item-b"}],
        "approved_by_kh": {"name": "Penguji", "approved_at": "2026-11-25"},
    }
    gallery.update(overrides)
    files[GALLERY] = gallery
    for item_id in ("item-a", "item-b"):
        files[f"kota-uji/items/{item_id}.yaml"]["model"] = {
            "src": f"assets/models/{item_id}.glb",
            "accuracy_check": {"by": "Penguji", "checked_at": "2026-11-25"},
        }
        files[f"kota-uji/items/{item_id}.yaml"]["hotspots"] = [
            {
                "id": "bagian",
                "label": "Bagian contoh",
                "text": "Teks contoh.",
                "chunk": "materi-a-005",
            }
        ]
    files["sources.yaml"]["assets"] += [
        {"path": p, "license": "milik sendiri (tim)", "author": "Tim"}
        for p in (
            "assets/models/galeri.glb",
            "assets/models/item-a.glb",
            "assets/models/item-b.glb",
        )
    ]


def test_without_gallery_file_is_fine(make_content: Any) -> None:
    result = load_content(make_content())
    assert result.content.city_content["kota-uji"].gallery is None


def test_gallery_loads(make_content: Any) -> None:
    root = make_content(with_gallery)
    city = load_content(root).content.city_content["kota-uji"]
    assert city.gallery is not None
    assert [e.item for e in city.gallery.exhibits] == ["item-a", "item-b"]
    assert city.gallery.layout.slots == 12
    assert city.items["item-a"].hotspots[0].id == "bagian"


def test_unknown_exhibit_item(make_content: Any) -> None:
    root = make_content(lambda f: with_gallery(f, exhibits=[{"item": "item-z"}]))
    assert_error(root, "item 'item-z'")


def test_duplicate_exhibit(make_content: Any) -> None:
    root = make_content(
        lambda f: with_gallery(f, exhibits=[{"item": "item-a"}, {"item": "item-a"}])
    )
    assert_error(root, "exhibits memuat id ganda")


def test_more_exhibits_than_slots(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f, layout={"radius": 6, "slots": 1, "first_d": 3})

    assert_error(make_content(mutate), "slots")


def test_radius_too_small(make_content: Any) -> None:
    root = make_content(lambda f: with_gallery(f, layout={"radius": 4, "slots": 12, "first_d": 3}))
    assert_error(root, "radius")


def test_hotspots_need_model(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f)
        del f["kota-uji/items/item-a.yaml"]["model"]

    assert_error(make_content(mutate), "hotspots butuh model")


def test_hotspot_unknown_chunk(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f)
        f["kota-uji/items/item-a.yaml"]["hotspots"][0]["chunk"] = "tidak-ada-001"

    assert_error(make_content(mutate), "chunk 'tidak-ada-001'")


def test_pending_fields(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f, approved_by_kh=None)
        f["kota-uji/items/item-a.yaml"]["model"]["accuracy_check"] = None
        f["kota-uji/items/item-a.yaml"]["hotspots"][0]["text"] = None
        f["kota-uji/items/item-a.yaml"]["hotspots"][0]["chunk"] = None
        del f["kota-uji/items/item-b.yaml"]["model"]
        del f["kota-uji/items/item-b.yaml"]["hotspots"]

    root = make_content(mutate)
    assert_pending(root, "approved_by_kh")
    assert_pending(root, "accuracy_check")
    assert_pending(root, "hotspot 'bagian': teks belum diisi")
    assert_pending(root, "model 3D belum ada")


def test_missing_glb_is_pending_not_error(make_content: Any) -> None:
    # write_content tidak menulis berkas .glb: model belum dibuat = pending.
    assert_pending(make_content(with_gallery), "berkas model 'assets/models/item-a.glb' belum ada")


def test_hotspot_chunk_is_exposed_in_city_detail(make_content: Any, tmp_path: Path) -> None:
    from app.main import _city_detail

    result = load_content(make_content(with_gallery))
    city = next(c for c in result.content.cities if c.id == "kota-uji")
    detail = _city_detail(city, result.content.city_content["kota-uji"])
    assert detail.gallery is not None
    assert "materi-a-005" in detail.sources


# --- aset GLB (T-114) --------------------------------------------------------

# Vektor uji bersama dengan frontend/src/gallery/cameraFlow.test.ts (R=6, 12 slot, first_d=3).
PEDESTAL_1 = (-2.401911, -1.965645)
PEDESTAL_2 = (-1.889661, -6.746489)


def write_glbs(root: Path, *, room_nodes: list[dict[str, Any]] | None = None, **pads: int) -> None:
    from app.ring import ring_point
    from app.schemas import GalleryLayout
    from tests.glbfixture import make_glb

    if room_nodes is None:
        layout = GalleryLayout()
        room_nodes = []
        for i in range(layout.slots):
            x, z = ring_point(layout, i)
            room_nodes.append({"name": f"pedestal_{i + 1}", "translation": [x, 0, z]})
    models = root / "assets" / "models"
    models.mkdir(parents=True, exist_ok=True)
    (models / "galeri.glb").write_bytes(make_glb(room_nodes, pad=pads.get("galeri", 0)))
    for item_id in ("item-a", "item-b", "item-c"):
        nodes = [{"name": "hotspot_bagian", "translation": [0, 0.5, 0.1]}]
        (models / f"{item_id}.glb").write_bytes(make_glb(nodes, pad=pads.get(item_id, 0)))


def test_shared_ring_vector() -> None:
    from app.ring import ring_point
    from app.schemas import GalleryLayout

    for i, expected in enumerate((PEDESTAL_1, PEDESTAL_2)):
        x, z = ring_point(GalleryLayout(), i)
        assert abs(x - expected[0]) < 1e-5 and abs(z - expected[1]) < 1e-5


def test_complete_gallery_passes_release(make_content: Any) -> None:
    root = make_content(with_gallery)
    write_glbs(root)
    result = load_content(root)
    assert result.ok(release=True), result.errors(release=True)


def test_object_model_too_large(make_content: Any) -> None:
    root = make_content(with_gallery)
    write_glbs(root, **{"item-a": 3 * 1024 * 1024 + 1})
    assert_error(root, "melebihi batas 3 MB")


def test_gallery_total_too_large(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f, exhibits=[{"item": i} for i in ("item-a", "item-b", "item-c")])
        f["kota-uji/items/item-c.yaml"]["model"] = {"src": "assets/models/item-c.glb"}
        f["sources.yaml"]["assets"].append(
            {"path": "assets/models/item-c.glb", "license": "milik sendiri (tim)"}
        )

    root = make_content(mutate)
    big = 2 * 1024 * 1024 + 900 * 1024  # tiap objek di bawah batas 3 MB, totalnya > 15 MB
    write_glbs(
        root, galeri=7 * 1024 * 1024 + 900 * 1024, **{"item-a": big, "item-b": big, "item-c": big}
    )
    assert_error(root, "total model galeri")


def test_hotspot_node_missing(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f)
        f["kota-uji/items/item-a.yaml"]["hotspots"][0]["id"] = "lain"

    root = make_content(mutate)
    write_glbs(root)
    assert_error(root, "node 'hotspot_lain' tidak ada")


def test_pedestal_missing_and_misplaced(make_content: Any) -> None:
    root = make_content(with_gallery)
    write_glbs(
        root,
        room_nodes=[
            {"name": "pedestal_1", "translation": [PEDESTAL_1[0], 0, PEDESTAL_1[1]]},
            {"name": "pedestal_2", "translation": [0, 0, 0]},
        ],
    )
    assert_error(root, "node 'pedestal_3' tidak ada", "pedestal_2 di (0.00, 0.00)")
    errs = [i.message for i in load_content(root).errors(release=False)]
    assert not any("pedestal_1 di" in e for e in errs)


def test_unreadable_glb(make_content: Any) -> None:
    root = make_content(with_gallery)
    write_glbs(root)
    (root / "assets" / "models" / "item-b.glb").write_bytes(b"bukan glb")
    assert_error(root, "tidak terbaca")


def test_unregistered_model_is_pending(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        with_gallery(f)
        f["sources.yaml"]["assets"] = [
            a for a in f["sources.yaml"]["assets"] if a["path"] != "assets/models/item-a.glb"
        ]

    root = make_content(mutate)
    write_glbs(root)
    assert_pending(root, "'assets/models/item-a.glb' belum tercatat")
