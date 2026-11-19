"""Pembuat folder konten contoh untuk pengujian.

Teksnya sengaja dummy (bukan fakta budaya) agar tidak ada klaim tanpa sumber.
"""

from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

import pytest
import yaml

LESSONS = ["materi-a", "materi-b", "materi-c"]
ITEMS = ["item-a", "item-b", "item-c"]
NARRATIVE = " ".join(["kata"] * 120)


def _source() -> dict[str, Any]:
    return {
        "title": "Sumber contoh",
        "url": "https://example.org/sumber",
        "type": "web",
        "accessed": "2026-11-19",
    }


def _chunks(lesson_id: str) -> list[dict[str, Any]]:
    return [
        {
            "id": f"{lesson_id}-{n:03d}",
            "lesson_id": lesson_id,
            "text": f"Teks pengetahuan contoh nomor {n}.",
            "source": _source(),
            "verified_by": "Penguji",
            "verified_at": "2026-11-19",
        }
        for n in range(1, 9)
    ]


def _image(name: str) -> dict[str, str]:
    return {"src": f"assets/images/{name}.webp", "alt": f"Gambar {name}", "license": "CC0"}


def valid_content() -> dict[str, Any]:
    """Peta `path relatif -> data YAML` untuk konten yang lolos mode rilis."""
    files: dict[str, Any] = {
        "cities.yaml": [
            {
                "id": "kota-uji",
                "name": "Kota Uji",
                "province": "Provinsi Uji",
                "status": "active",
                "lat": -6.9,
                "lng": 107.6,
                "summary": "Ringkasan kota uji.",
            },
            {"id": "kota-nanti", "name": "Kota Nanti", "status": "coming_soon"},
        ],
        "sources.yaml": {
            "assets": [
                {"path": f"assets/images/{n}.webp", "license": "CC0", "author": "Tim"}
                for n in LESSONS + ITEMS
            ],
            "objects": [
                {"id": "batu", "name": "Batu", "approved_by": "Penguji"},
                {"id": "pagar", "name": "Pagar", "approved_by": "Penguji"},
                {"id": "benda-sakral", "name": "Benda sakral", "sensitive": True},
            ],
        },
        "kota-uji/city.yaml": {
            "id": "kota-uji",
            "phases": ["quiz_intro", "lessons", "game", "summary"],
            "lessons": LESSONS,
            "game": {
                "unlock_every": 100,
                "items_order": ITEMS,
                "obstacles": ["batu", "pagar"],
                "background": "kota-uji-siang",
                "speed": {"start": 240, "max": 520, "ramp_per_100": 25},
            },
        },
        "kota-uji/agent_script.yaml": {
            "quiz_intro": "Halo, jawab kuis dulu ya.",
            "lessons_start": "Ayo belajar.",
            "game_start": "Siap berlari?",
            "item_unlocked": "Kamu menemukan {item}! {short_explanation}",
            "summary": "Kerja bagus.",
        },
        "kota-uji/quiz.yaml": {
            "intro": [
                {
                    "id": f"q{n}",
                    "question": f"Pertanyaan contoh {n}?",
                    "options": ["A", "B", "C", "D"],
                    "correct": n % 4,
                    "explanation": "Penjelasan contoh.",
                    "chunk": f"{LESSONS[n % 3]}-001",
                }
                for n in range(1, 6)
            ]
        },
    }
    for lesson_id in LESSONS:
        files[f"kota-uji/lessons/{lesson_id}.yaml"] = {
            "id": lesson_id,
            "title": f"Materi {lesson_id}",
            "narrative": NARRATIVE,
            "key_facts": [{"text": "Fakta contoh.", "chunk": f"{lesson_id}-001"}],
            "images": [_image(lesson_id)],
            "location": {"name": "Tempat uji", "address": "Jalan Uji 1", "lat": -6.9, "lng": 107.6},
            "suggested_questions": ["Apa ini?"],
        }
        files[f"kota-uji/knowledge/{lesson_id}.yaml"] = _chunks(lesson_id)
    for item_id, lesson_id in zip(ITEMS, LESSONS, strict=True):
        files[f"kota-uji/items/{item_id}.yaml"] = {
            "id": item_id,
            "name": f"Item {item_id}",
            "rarity": "umum",
            "short_explanation": "Penjelasan singkat contoh.",
            "image": _image(item_id),
            "chunk": f"{lesson_id}-002",
            "lesson": lesson_id,
        }
    return files


def write_content(root: Path, files: dict[str, Any]) -> None:
    for rel, data in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, allow_unicode=True, sort_keys=False), encoding="utf-8")
    for name in LESSONS + ITEMS:
        image = root / "assets" / "images" / f"{name}.webp"
        image.parent.mkdir(parents=True, exist_ok=True)
        image.write_bytes(b"dummy")


Builder = Callable[[Callable[[dict[str, Any]], None] | None], Path]


@pytest.fixture
def make_content(tmp_path: Path) -> Builder:
    """Tulis konten valid, setelah diubah oleh `mutate(files)` bila diberikan."""

    def build(mutate: Callable[[dict[str, Any]], None] | None = None) -> Path:
        files = valid_content()
        if mutate is not None:
            mutate(files)
        root = tmp_path / "content"
        write_content(root, files)
        return root

    return build
