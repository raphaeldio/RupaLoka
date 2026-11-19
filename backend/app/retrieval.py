"""Retrieval BM25 per kota dengan boost materi aktif (SDD §9 langkah 1–2).

BM25 ditulis sendiri (bukan `rank_bm25`) agar IDF selalu positif pada korpus kecil:
`BM25Okapi` dapat menghasilkan IDF negatif untuk istilah yang muncul di lebih dari separuh
chunk, sehingga skor tidak stabil untuk gerbang `MIN_SCORE` (T-013).

`raw_score` adalah skor BM25 murni (dipakai gerbang). `score` = `raw_score` setelah boost
materi aktif (dipakai mengurutkan). Boost bersifat perkalian sehingga chunk tanpa kecocokan
tidak pernah lolos karena boost.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from collections.abc import Iterable, Mapping
from dataclasses import dataclass

from app.content_loader import CityContent, Content
from app.schemas import Chunk

TOP_K = 4
LESSON_BOOST = 0.5  # skor chunk dari materi aktif dikali 1.5
MAX_QUERY_CHARS = 500
MAX_QUERY_TOKENS = 64
K1 = 1.5
B = 0.75

# Kata fungsi dan kata tanya bahasa Indonesia yang tidak membantu pencarian.
STOPWORDS = frozenset("""
    ada adalah agar akan aku apa apakah atau bagaimana bahwa banyak beberapa berapa bisa boleh
    dalam dan dari dengan di dia dimana harus hal ia ini itu jadi jelaskan juga kah kami kamu
    kapan karena ke kenapa kita lah lalu mana masih mengapa mereka nya oleh pada para saja saya
    sebagai sebutkan sedang sejak seperti siapa sudah supaya tahu tentang tersebut tidak untuk
    yaitu yakni yang
    """.split())
_PARTICLES = ("lah", "kah", "pun")
_TOKEN = re.compile(r"[a-z0-9]+")


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _light_stem(token: str) -> str:
    """Buang partikel (-lah, -kah, -pun) dan -nya bila sisa kata masih cukup panjang."""
    for suffix in (*_PARTICLES, "nya"):
        if token.endswith(suffix) and len(token) - len(suffix) >= 4:
            return token[: -len(suffix)]
    return token


def tokenize(text: str) -> list[str]:
    text = _strip_accents(text.lower())
    out: list[str] = []
    for raw in _TOKEN.findall(text):
        token = _light_stem(raw)
        if token not in STOPWORDS and len(token) > 1:
            out.append(token)
    return out


def normalize_query(query: str) -> list[str]:
    """Token unik dari pertanyaan, dibatasi panjangnya (SDD §9 langkah 1)."""
    tokens = tokenize(query[:MAX_QUERY_CHARS])
    return list(dict.fromkeys(tokens))[:MAX_QUERY_TOKENS]


@dataclass(frozen=True)
class Hit:
    chunk: Chunk
    score: float
    raw_score: float


class CityIndex:
    """Indeks BM25 untuk chunk satu kota."""

    def __init__(
        self,
        chunks: Iterable[Chunk],
        lesson_titles: Mapping[str, str] | None = None,
        k1: float = K1,
        b: float = B,
    ) -> None:
        titles = lesson_titles or {}
        self.chunks = sorted(chunks, key=lambda c: c.id)
        self.k1, self.b = k1, b
        # Judul materi ikut diindeks agar chunk yang tidak menyebut nama materinya tetap terjangkau.
        self._tf = [
            Counter(tokenize(f"{c.text} {titles.get(c.lesson_id, '')}")) for c in self.chunks
        ]
        self._len = [sum(tf.values()) for tf in self._tf]
        self._avg_len = (sum(self._len) / len(self._len)) if self._len else 0.0
        df: Counter[str] = Counter()
        for tf in self._tf:
            df.update(tf.keys())
        n = len(self.chunks)
        self._idf = {t: math.log(1 + (n - d + 0.5) / (d + 0.5)) for t, d in df.items()}

    def _bm25(self, i: int, terms: list[str]) -> float:
        tf, length = self._tf[i], self._len[i]
        norm = self.k1 * (1 - self.b + self.b * length / self._avg_len) if self._avg_len else 0.0
        score = 0.0
        for term in terms:
            f = tf.get(term, 0)
            if f:
                score += self._idf[term] * f * (self.k1 + 1) / (f + norm)
        return score

    def search(self, query: str, lesson_id: str | None = None, top_k: int = TOP_K) -> list[Hit]:
        terms = normalize_query(query)
        if not terms or top_k <= 0:
            return []
        hits: list[Hit] = []
        for i, chunk in enumerate(self.chunks):
            raw = self._bm25(i, terms)
            if raw <= 0:
                continue
            boost = 1 + LESSON_BOOST if lesson_id and chunk.lesson_id == lesson_id else 1
            hits.append(Hit(chunk=chunk, score=raw * boost, raw_score=raw))
        hits.sort(key=lambda h: (-h.score, h.chunk.id))
        return hits[:top_k]


class Retriever:
    """Indeks per kota; pencarian tidak pernah melintasi kota."""

    def __init__(self, indexes: Mapping[str, CityIndex]) -> None:
        self._indexes = dict(indexes)

    @classmethod
    def from_content(cls, content: Content) -> Retriever:
        return cls({city_id: _index_city(cc) for city_id, cc in content.city_content.items()})

    def search(
        self, city_id: str, query: str, lesson_id: str | None = None, top_k: int = TOP_K
    ) -> list[Hit]:
        index = self._indexes.get(city_id)
        if index is None:
            raise KeyError(city_id)
        return index.search(query, lesson_id=lesson_id, top_k=top_k)


def _index_city(cc: CityContent) -> CityIndex:
    titles = {lesson_id: lesson.title for lesson_id, lesson in cc.lessons.items()}
    return CityIndex(cc.chunks.values(), titles)
