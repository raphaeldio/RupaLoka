"""Refleksi akhir tur: kata kunci, klasifikasi LLM terbatas, fallback, endpoint."""

from __future__ import annotations

import asyncio
from collections.abc import Sequence
from pathlib import Path
from typing import Any

from fastapi.testclient import TestClient

from app.config import Settings
from app.content_loader import load_content
from app.leaderboard import MemoryStore
from app.llm import LLMError, Turn
from app.main import create_app
from app.reflection import assess, match_keywords, normalize, parse_value_ids
from app.schemas import ReflectionQuestion

REF = "kota-uji/reflection.yaml"


def _question(**kw: Any) -> ReflectionQuestion:
    data: dict[str, Any] = {
        "id": "refleksi-a",
        "lesson": "materi-a",
        "prompt": "Nilai apa yang bisa kamu pakai?",
        "values": [
            {
                "id": "kerja-sama",
                "label": "Kerja sama",
                "keywords": ["kerja sama", "gotong royong"],
                "explanation": {"text": "Penjelasan contoh.", "chunk": "materi-a-005"},
            },
            {
                "id": "tekun",
                "label": "Tekun",
                "keywords": ["tekun", "rajin berlatih"],
                "explanation": {"text": "Penjelasan tekun.", "chunk": "materi-a-006"},
            },
        ],
        "feedback_match": "Bagus!",
        "feedback_miss": "Coba pikirkan lagi.",
    }
    data.update(kw)
    return ReflectionQuestion.model_validate(data)


def with_reflection(files: dict[str, Any]) -> None:
    files[REF] = {"questions": [_question().model_dump(mode="json")]}


class FakeLLM:
    def __init__(self, reply: str | Exception) -> None:
        self.reply = reply
        self.calls: list[tuple[str, Sequence[Turn]]] = []

    async def generate(self, system: str, turns: Sequence[Turn]) -> str:
        self.calls.append((system, turns))
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def test_normalize_strips_case_accents_punctuation() -> None:
    assert normalize("  Kerja-Samá,  TIM! ") == "kerja sama tim"


def test_keywords_match_whole_words_only() -> None:
    q = _question()
    assert [v.id for v in match_keywords("Aku belajar KERJA SAMA dengan teman", q.values)] == [
        "kerja-sama"
    ]
    assert match_keywords("ditekuni", q.values) == []  # "tekun" bukan kata utuh
    assert [v.id for v in match_keywords("rajin berlatih dan gotong-royong", q.values)] == [
        "kerja-sama",
        "tekun",
    ]


def test_parse_value_ids_drops_unknown_ids() -> None:
    raw = 'Hasil: {"value_ids": ["tekun", "palsu", "tekun"]}'
    assert parse_value_ids(raw, {"tekun", "kerja-sama"}) == ["tekun"]
    assert parse_value_ids("bukan json", {"tekun"}) == []
    assert parse_value_ids('{"value_ids": "tekun"}', {"tekun"}) == []


def test_keyword_match_skips_llm() -> None:
    llm = FakeLLM('{"value_ids": ["tekun"]}')
    res = asyncio.run(assess(_question(), "kami gotong royong", llm))
    assert res.method == "keyword"
    assert [m.id for m in res.matched] == ["kerja-sama"]
    assert res.matched[0].chunk == "materi-a-005"
    assert res.feedback == "Bagus!"
    assert llm.calls == []


def test_llm_classifies_when_no_keyword() -> None:
    llm = FakeLLM('{"value_ids": ["tekun", "diarang"]}')
    res = asyncio.run(assess(_question(), "aku terus mencoba setiap hari sampai bisa", llm))
    assert res.method == "ai"
    assert [m.id for m in res.matched] == ["tekun"]
    system, turns = llm.calls[0]
    assert "HANYA mengklasifikasi" in system
    assert "<<<\naku terus mencoba setiap hari sampai bisa\n>>>" in turns[-1].text


def test_llm_failure_falls_back_to_none() -> None:
    res = asyncio.run(assess(_question(), "jawaban lain", FakeLLM(LLMError("mati"))))
    assert res.method == "none"
    assert res.matched == []
    assert res.feedback == "Coba pikirkan lagi."


def test_no_llm_no_match() -> None:
    res = asyncio.run(assess(_question(), "jawaban lain", None))
    assert (res.method, res.matched) == ("none", [])


def test_loader_checks_reflection(make_content: Any) -> None:
    root = make_content(with_reflection)
    assert load_content(root).ok(release=True)

    def broken(files: dict[str, Any]) -> None:
        with_reflection(files)
        q = files[REF]["questions"][0]
        q["lesson"] = "materi-x"
        q["values"][0]["explanation"]["chunk"] = "tidak-ada"
        q["values"][1]["keywords"] = []

    result = load_content(make_content(broken))
    msgs = [i.message for i in result.issues]
    assert any("bukan materi kota ini" in m for m in msgs)
    assert any("tidak-ada" in m for m in msgs)
    assert any("keywords kosong" in m for m in msgs)


def _client(root: Path, llm: Any = None) -> TestClient:
    return TestClient(create_app(Settings(content_dir=root), llm=llm, leaderboard=MemoryStore()))


def test_reflection_endpoint(make_content: Any) -> None:
    with _client(make_content(with_reflection), FakeLLM('{"value_ids": []}')) as c:
        detail = c.get("/api/content/cities/kota-uji").json()
        assert detail["reflection"] == [
            {"id": "refleksi-a", "lesson": "materi-a", "prompt": "Nilai apa yang bisa kamu pakai?"}
        ]
        assert "keywords" not in str(detail["reflection"])
        assert "materi-a-005" in detail["sources"]

        res = c.post(
            "/api/reflection",
            json={"city_id": "kota-uji", "question_id": "refleksi-a", "answer": "tekun"},
        )
        assert res.status_code == 200
        assert res.headers["cache-control"] == "no-store"
        assert res.json()["method"] == "keyword"

        miss = c.post(
            "/api/reflection",
            json={"city_id": "kota-uji", "question_id": "refleksi-a", "answer": "entah"},
        ).json()
        assert (miss["method"], miss["matched"]) == ("none", [])

        assert (
            c.post(
                "/api/reflection",
                json={"city_id": "kota-uji", "question_id": "tidak-ada", "answer": "x"},
            ).status_code
            == 404
        )
        assert (
            c.post(
                "/api/reflection",
                json={"city_id": "kota-uji", "question_id": "refleksi-a", "answer": "x" * 501},
            ).status_code
            == 422
        )


def test_leaderboard_max_includes_reflection(make_content: Any) -> None:
    def setup(files: dict[str, Any]) -> None:
        with_reflection(files)
        files["kota-uji/city.yaml"]["rewards"] = {"leaderboard": {"champion_title": "Uji"}}

    with _client(make_content(setup)) as c:
        body = c.get("/api/leaderboard/kota-uji").json()
        assert body["max_points"] == 3 * 100 + 5 * 10 + 3 * 30 + 50 + 100 + 1000
