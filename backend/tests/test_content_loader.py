from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from app.content_loader import is_unfilled, load_content
from scripts.validate_content import main as validate_main

CITY = "kota-uji/city.yaml"
QUIZ = "kota-uji/quiz.yaml"
KNOW_A = "kota-uji/knowledge/materi-a.yaml"
LESSON_A = "kota-uji/lessons/materi-a.yaml"
ITEM_A = "kota-uji/items/item-a.yaml"


def messages(root: Path, release: bool) -> list[str]:
    return [f"{i.file}: {i.message}" for i in load_content(root).errors(release)]


def assert_error(root: Path, *needles: str) -> None:
    """Galat struktural: gagal bahkan di mode pengembangan."""
    errs = messages(root, release=False)
    for needle in needles:
        assert any(needle in e for e in errs), f"{needle!r} tidak ada di {errs}"


def assert_pending(root: Path, needle: str) -> None:
    """Data belum diisi: peringatan saat pengembangan, galat saat rilis."""
    result = load_content(root)
    assert result.ok(release=False), result.errors(release=False)
    assert any(needle in i.message for i in result.warnings(release=False))
    assert any(needle in i.message for i in result.errors(release=True))


# --- konten valid ----------------------------------------------------------


def test_valid_content_passes_release(make_content: Any) -> None:
    result = load_content(make_content())
    assert result.issues == []
    city = result.content.city_content["kota-uji"]
    assert list(city.items) == ["item-a", "item-b", "item-c"]
    assert len(city.chunks) == 24
    assert "kota-nanti" not in result.content.city_content


def test_missing_content_folder(tmp_path: Path) -> None:
    assert_error(tmp_path / "tidak-ada", "folder konten tidak ditemukan")


# --- aturan 1: rujukan id ada berkasnya ------------------------------------


def test_missing_lesson_file(make_content: Any) -> None:
    root = make_content(lambda f: f.pop("kota-uji/lessons/materi-b.yaml"))
    assert_error(root, "materi 'materi-b' dirujuk di city.yaml tetapi berkasnya tidak ada")


def test_missing_item_file(make_content: Any) -> None:
    root = make_content(lambda f: f.pop("kota-uji/items/item-c.yaml"))
    assert_error(root, "item 'item-c' dirujuk")


def test_file_id_must_match_filename(make_content: Any) -> None:
    root = make_content(lambda f: f[LESSON_A].update(id="materi-lain"))
    assert_error(root, "harus sama dengan nama berkas 'materi-a'")


def test_unknown_phase_rejected(make_content: Any) -> None:
    root = make_content(lambda f: f[CITY].update(phases=["quiz_intro", "quiz_result"]))
    assert_error(root, "phases.1")


# --- aturan 2: sumber dan verifikasi ---------------------------------------


def test_chunk_without_source_fails(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][0].pop("source"))
    assert_error(root, "[0].source: Field required")


def test_missing_access_date_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][0]["source"].update(accessed=None))
    assert_pending(root, "chunk 'materi-a-001': source.accessed belum diisi")


def test_web_source_needs_url(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][0]["source"].pop("url"))
    assert_error(root, "sumber bertipe web wajib punya url")


def test_unverified_chunk_is_pending(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        f[KNOW_A][0]["verified_by"] = "[nama]"
        f[KNOW_A][0]["verified_at"] = None

    assert_pending(make_content(mutate), "verified_by/verified_at belum diisi")


def test_unknown_chunk_reference(make_content: Any) -> None:
    root = make_content(lambda f: f[QUIZ]["intro"][0].update(chunk="tidak-ada-001"))
    assert_error(root, "soal 'q1': chunk 'tidak-ada-001' tidak ada")


def test_key_fact_and_item_chunk_references(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        f[LESSON_A]["key_facts"][0]["chunk"] = "hilang-001"
        f[ITEM_A]["chunk"] = "hilang-002"

    assert_error(
        make_content(mutate), "key_facts[0]: chunk 'hilang-001'", "chunk: chunk 'hilang-002'"
    )


def test_duplicate_chunk_id(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][1].update(id="materi-a-001"))
    assert_error(root, "id chunk ganda: 'materi-a-001'")


def test_chunk_lesson_must_belong_to_city(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][0].update(lesson_id="materi-z"))
    assert_error(root, "lesson_id 'materi-z' bukan materi kota ini")


def test_placeholder_text_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[LESSON_A]["location"].update(address="[PERLU DIISI]"))
    assert_pending(root, "location.address: belum diisi")


# --- aturan 3: kuis --------------------------------------------------------


def test_quiz_correct_out_of_range(make_content: Any) -> None:
    root = make_content(lambda f: f[QUIZ]["intro"][0].update(correct=4))
    assert_error(root, "correct=4 di luar rentang opsi (0..3)")


def test_quiz_count_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[QUIZ]["intro"].pop())
    assert_pending(root, "kuis dasar berisi 4 soal (target 5)")


# --- aturan 4: item dan ambang ---------------------------------------------


def test_unlock_every_must_be_positive(make_content: Any) -> None:
    root = make_content(lambda f: f[CITY]["game"].update(unlock_every=0))
    assert_error(root, "game.unlock_every")


def test_at_least_three_items(make_content: Any) -> None:
    root = make_content(lambda f: f[CITY]["game"].update(items_order=["item-a", "item-b"]))
    assert_error(root, "game.items_order")


def test_duplicate_item_in_order(make_content: Any) -> None:
    root = make_content(
        lambda f: f[CITY]["game"].update(items_order=["item-a", "item-b", "item-a"])
    )
    assert_error(root, "items_order memuat id ganda: item-a")


def test_item_lesson_must_exist(make_content: Any) -> None:
    root = make_content(lambda f: f[ITEM_A].update(lesson="materi-z"))
    assert_error(root, "lesson 'materi-z' bukan materi kota ini")


def test_item_explanation_too_long_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[ITEM_A].update(short_explanation=" ".join(["kata"] * 61)))
    assert_pending(root, "short_explanation 61 kata (maksimal 60)")


# --- aturan 5: aset --------------------------------------------------------


def test_image_needs_alt(make_content: Any) -> None:
    root = make_content(lambda f: f[LESSON_A]["images"][0].pop("alt"))
    assert_error(root, "images.0.alt: Field required")


def test_missing_image_file_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[ITEM_A]["image"].update(src="assets/images/hilang.webp"))
    assert_pending(root, "berkas gambar 'assets/images/hilang.webp' belum ada")
    assert_pending(root, "belum tercatat di sources.yaml (assets)")


def test_placeholder_license_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[LESSON_A]["images"][0].update(license="[PERLU DIISI]"))
    assert_pending(root, "images[0].license: belum diisi")


# --- aturan 6: status kota -------------------------------------------------


def test_active_city_needs_city_yaml(make_content: Any) -> None:
    root = make_content(lambda f: f.pop(CITY))
    assert_error(root, "kota-uji/city.yaml: berkas tidak ditemukan")


def test_coming_soon_city_must_not_have_city_yaml(make_content: Any) -> None:
    root = make_content(lambda f: f.update({"kota-nanti/city.yaml": {"id": "kota-nanti"}}))
    assert_error(root, "berstatus coming_soon tetapi punya city.yaml")


def test_active_city_without_coordinates_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f["cities.yaml"][0].update(lat=None, lng=None))
    assert_pending(root, "koordinat titik peta (lat/lng) belum diisi")


# --- aturan 7: koordinat lokasi --------------------------------------------


def test_location_without_coordinates_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[LESSON_A]["location"].update(lat=None))
    assert_pending(root, "location: lat/lng belum diisi")


# --- aturan 8: rintangan ---------------------------------------------------


def test_sensitive_obstacle_fails(make_content: Any) -> None:
    root = make_content(lambda f: f[CITY]["game"].update(obstacles=["batu", "benda-sakral"]))
    assert_error(root, "rintangan 'benda-sakral' ditandai sensitive")


def test_unapproved_obstacle_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f["sources.yaml"]["objects"][0].update(approved_by=None))
    assert_pending(root, "rintangan 'batu' belum disetujui")


def test_unregistered_obstacle_is_pending(make_content: Any) -> None:
    root = make_content(lambda f: f[CITY]["game"].update(obstacles=["batu", "becak"]))
    assert_pending(root, "rintangan 'becak' belum terdaftar")


# --- lain-lain -------------------------------------------------------------


def test_unknown_field_rejected(make_content: Any) -> None:
    root = make_content(lambda f: f[ITEM_A].update(rarirty="umum"))
    assert_error(root, "rarirty: Extra inputs are not permitted")


def test_agent_script_unknown_placeholder(make_content: Any) -> None:
    root = make_content(
        lambda f: f["kota-uji/agent_script.yaml"].update(item_unlocked="Dapat {benda}!")
    )
    assert_error(root, "variabel tak dikenal: benda")


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (None, True),
        ("", True),
        ("...", True),
        ("[PERLU DIISI]", True),
        ("[nama]", True),
        ("TODO cek", True),
        ("Angklung", False),
        ("[angklung-001] teks", False),
    ],
)
def test_is_unfilled(value: str | None, expected: bool) -> None:
    assert is_unfilled(value) is expected


# --- CLI -------------------------------------------------------------------


def test_cli_exit_codes(make_content: Any, capsys: pytest.CaptureFixture[str]) -> None:
    ok_root = make_content()
    assert validate_main(["--content", str(ok_root), "--release"]) == 0

    def mutate(f: dict[str, Any]) -> None:
        f[KNOW_A][0]["verified_at"] = None

    pending_root = make_content(mutate)
    assert validate_main(["--content", str(pending_root)]) == 0
    assert validate_main(["--content", str(pending_root), "--release"]) == 1
    assert "GALAT" in capsys.readouterr().out


def test_rewards_default_and_badge_order() -> None:
    from pydantic import ValidationError

    from app.schemas import Rewards

    r = Rewards()
    assert (r.points_per_node, r.points_per_correct, r.game_node_points) == (100, 10, 100)
    assert r.badges == []
    badge = {"id": "a", "name": "A", "min_points": 300, "description": "x"}
    with pytest.raises(ValidationError):
        Rewards(badges=[badge, {**badge, "id": "b", "min_points": 100}])
    with pytest.raises(ValidationError):
        Rewards(badges=[badge, {**badge, "id": "b"}])


def test_video_materi_harus_youtube(make_content: Any) -> None:
    root = make_content(
        lambda f: f[LESSON_A].update(
            videos=[{"url": "https://vimeo.com/1", "title": "V", "channel": "K"}]
        )
    )
    assert_error(root, "url video harus tautan YouTube")


def test_video_belum_diperiksa_jadi_tertunda(make_content: Any) -> None:
    root = make_content(
        lambda f: f[LESSON_A].update(
            videos=[
                {"url": "https://www.youtube.com/watch?v=gxwPUVEXPtI", "title": "V", "channel": "K"}
            ]
        )
    )
    assert_pending(root, "videos[0]: isi video belum ditonton/diperiksa")
