"""Uji peringkat retrieval (T-012). Teks chunk dummy, bukan fakta budaya."""

from __future__ import annotations

from typing import Any

import pytest

from app.content_loader import load_content
from app.retrieval import (
    MAX_QUERY_TOKENS,
    CityIndex,
    Retriever,
    normalize_query,
    tokenize,
)
from app.schemas import Chunk


def chunk(id_: str, text: str, lesson_id: str = "materi-a") -> Chunk:
    return Chunk.model_validate(
        {
            "id": id_,
            "lesson_id": lesson_id,
            "text": text,
            "source": {"title": "Uji", "type": "buku", "accessed": "2026-11-19"},
        }
    )


def ids(hits: list[Any]) -> list[str]:
    return [h.chunk.id for h in hits]


# --- tokenisasi ------------------------------------------------------------


def test_tokenize_lowercases_strips_accents_and_stopwords() -> None:
    assert tokenize("Apa itu Kécapi dan SULING?") == ["kecapi", "suling"]


def test_tokenize_strips_particles_and_nya() -> None:
    assert tokenize("bunyinya bagaimanakah alatnya") == ["bunyi", "alat"]
    # Kata pendek tidak dipotong.
    assert tokenize("punya") == ["punya"]


def test_normalize_query_dedupes_and_limits() -> None:
    assert normalize_query("bambu bambu nada") == ["bambu", "nada"]
    long_query = " ".join(f"kata{i}" for i in range(200))
    assert len(normalize_query(long_query)) <= MAX_QUERY_TOKENS


# --- peringkat -------------------------------------------------------------


@pytest.fixture
def index() -> CityIndex:
    return CityIndex(
        [
            chunk("a-001", "Alat musik bambu digoyangkan untuk menghasilkan nada."),
            chunk("a-002", "Alat ini dimainkan berkelompok dalam pertunjukan."),
            chunk("b-001", "Boneka kayu dimainkan dalang dalam pertunjukan malam.", "materi-b"),
            chunk("b-002", "Kisah pertunjukan diambil dari cerita klasik.", "materi-b"),
            chunk("c-001", "Gedung museum menyimpan koleksi sejarah daerah.", "materi-c"),
        ],
        lesson_titles={"materi-a": "Alat bambu", "materi-b": "Boneka kayu", "materi-c": "Museum"},
    )


def test_relevant_chunk_ranks_first(index: CityIndex) -> None:
    hits = index.search("Bagaimana boneka kayu dimainkan dalang?")
    assert ids(hits)[0] == "b-001"


def test_rare_term_outweighs_common_term(index: CityIndex) -> None:
    # "pertunjukan" muncul di 3 chunk, "museum" hanya di 1.
    hits = index.search("pertunjukan museum")
    assert ids(hits)[0] == "c-001"


def test_shorter_chunk_wins_with_equal_term_frequency() -> None:
    idx = CityIndex(
        [
            chunk("x-001", "nada " + " ".join(f"isi{i}" for i in range(30))),
            chunk("x-002", "nada pendek"),
            chunk("x-003", "lain sekali"),
        ]
    )
    assert ids(idx.search("nada")) == ["x-002", "x-001"]


def test_lesson_title_is_indexed(index: CityIndex) -> None:
    # Teks a-002 tidak memuat "bambu", tetapi judul materinya memuat.
    assert "a-002" in ids(index.search("bambu"))


def test_no_match_returns_empty(index: CityIndex) -> None:
    assert index.search("pesawat luar angkasa") == []
    assert index.search("apa itu?") == []  # hanya kata henti
    assert index.search("") == []


def test_top_k_and_deterministic_order(index: CityIndex) -> None:
    first = index.search("pertunjukan dimainkan", top_k=2)
    assert len(first) == 2
    assert ids(first) == ids(index.search("pertunjukan dimainkan", top_k=2))
    scores = [h.score for h in index.search("pertunjukan dimainkan", top_k=10)]
    assert scores == sorted(scores, reverse=True)


def test_scores_are_positive_even_for_very_common_terms() -> None:
    # Istilah di semua chunk: IDF BM25Okapi bisa negatif; di sini harus tetap positif.
    idx = CityIndex([chunk(f"y-00{i}", f"budaya teks{i}") for i in range(1, 6)])
    hits = idx.search("budaya", top_k=10)
    assert len(hits) == 5
    assert all(h.raw_score > 0 for h in hits)


# --- boost materi aktif ----------------------------------------------------


def test_boost_reorders_toward_active_lesson() -> None:
    idx = CityIndex(
        [
            chunk("a-001", "nada tinggi", "materi-a"),
            chunk("b-001", "nada", "materi-b"),
            chunk("c-001", "lain sekali", "materi-c"),
        ]
    )
    assert ids(idx.search("nada")) == ["b-001", "a-001"]  # tanpa konteks: chunk pendek unggul
    assert ids(idx.search("nada", lesson_id="materi-a")) == ["a-001", "b-001"]


def test_boost_does_not_change_raw_score(index: CityIndex) -> None:
    plain = {h.chunk.id: h for h in index.search("pertunjukan", top_k=10)}
    boosted = {h.chunk.id: h for h in index.search("pertunjukan", lesson_id="materi-a", top_k=10)}
    hit = boosted["a-002"]
    assert hit.raw_score == pytest.approx(plain["a-002"].raw_score)
    assert hit.score == pytest.approx(hit.raw_score * 1.5)
    assert boosted["b-001"].score == pytest.approx(boosted["b-001"].raw_score)


def test_boost_never_adds_unmatched_chunks(index: CityIndex) -> None:
    hits = index.search("museum", lesson_id="materi-a", top_k=10)
    assert ids(hits) == ["c-001"]


# --- per kota --------------------------------------------------------------


def test_retriever_isolates_cities() -> None:
    retriever = Retriever(
        {
            "kota-1": CityIndex([chunk("k1-001", "gamelan logam")]),
            "kota-2": CityIndex([chunk("k2-001", "gamelan perunggu")]),
        }
    )
    assert ids(retriever.search("kota-1", "gamelan")) == ["k1-001"]
    assert ids(retriever.search("kota-2", "gamelan")) == ["k2-001"]
    with pytest.raises(KeyError):
        retriever.search("kota-3", "gamelan")


def test_retriever_from_loaded_content(make_content: Any) -> None:
    retriever = Retriever.from_content(load_content(make_content()).content)
    hits = retriever.search("kota-uji", "Teks pengetahuan contoh nomor 3", lesson_id="materi-b")
    assert len(hits) == 4
    assert hits[0].chunk.lesson_id == "materi-b"
