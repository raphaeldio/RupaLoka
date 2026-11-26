"""Retrieval BM25 per kota dengan boost materi aktif (SDD §9 langkah 1–2).

BM25 ditulis sendiri (bukan `rank_bm25`) agar IDF selalu positif pada korpus kecil:
`BM25Okapi` dapat menghasilkan IDF negatif untuk istilah yang muncul di lebih dari separuh
chunk, sehingga skor tidak stabil untuk gerbang `MIN_SCORE` (T-013).

`raw_score` adalah skor BM25 murni (dipakai gerbang). `score` = `raw_score` setelah boost
materi aktif (dipakai mengurutkan). Boost bersifat perkalian sehingga chunk tanpa kecocokan
tidak pernah lolos karena boost.

Gerbang dua jalur (`passes_gate`, disetujui tim 21 Nov 2026): pertanyaan lolos bila menyebut
istilah topik (kata dari judul materi kota, mis. "angklung") dan cocok dengan chunk, ATAU bila
`raw_score` teratas >= `MIN_SCORE`. Istilah topik muncul di banyak chunk sehingga IDF-nya rendah;
tanpa jalur ini "Apa itu angklung?" ditolak, sementara satu kata umum ("cara", "sejarah")
meloloskan pertanyaan luar topik. Pertanyaan bertopik tetap harus dijawab bersitasi oleh LLM
atau ditolak.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.content_loader import CityContent, Content, is_unfilled
from app.regions import ALIASES, PROVINCES
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
_TOKEN = re.compile(r"[a-z]+|[0-9]+")  # "bareng2" → "bareng", "2"

# Bahasa obrolan pelajar → bentuk baku (21 Nov 2026). Hanya singkatan/kata gaul umum; partikel
# obrolan dibuang lewat STOPWORDS_CHAT. Bentuk -in dan nge- ditangani `_formal_candidates`.
SLANG = {
    "gmn": "bagaimana", "gimana": "bagaimana", "yg": "yang", "dmn": "dimana", "dimn": "dimana",
    "knp": "kenapa", "napa": "kenapa", "brp": "berapa", "tgl": "tanggal", "thn": "tahun",
    "ultah": "ulang tahun", "bikin": "buat", "bkin": "buat", "bareng": "bersama",
    "gak": "tidak", "ga": "tidak", "nggak": "tidak", "enggak": "tidak", "tdk": "tidak",
    "udah": "sudah", "udh": "sudah", "aja": "saja", "pake": "pakai", "muka": "wajah",
    "dgn": "dengan", "utk": "untuk", "krn": "karena", "jg": "juga", "sm": "sama", "tau": "tahu",
}  # fmt: skip
STOPWORDS_CHAT = frozenset("sih dong deh kok nih loh lho tuh ya yah kak kakak min mimin".split())


@lru_cache(maxsize=1)
def _stemmer() -> Any:
    """Stemmer bahasa Indonesia berbasis kamus kata dasar (Sastrawi, MIT)."""
    from Sastrawi.Stemmer.StemmerFactory import StemmerFactory

    return StemmerFactory().create_stemmer()


@lru_cache(maxsize=50_000)
def _stem(token: str) -> str:
    """Kata dasar; bentuk obrolan (-in, nge-/ng-) dicoba sebagai bentuk baku lebih dulu.
    Kandidat baku hanya dipakai bila kamus mengenalinya (hasil stem berbeda dari kandidat)."""
    if token.isdigit():
        return token
    stem = _stemmer().stem
    root = stem(token)
    if root and root != token:  # kata baku berimbuhan yang dikenali kamus ("bermain" → "main")
        return root
    for candidate in _formal_candidates(token):  # hanya bila kata aslinya tidak dikenali
        cand_root = stem(candidate)
        if cand_root and cand_root != candidate:
            return cand_root
    return root or token


def _formal_candidates(token: str) -> list[str]:
    """dimainin → dimainkan; ngelatih → melatih; ngajarin → mengajarkan."""
    forms = [token]
    if token.endswith("in") and len(token) > 5:
        forms.append(token[:-2] + "kan")
    out: list[str] = []
    for form in forms:
        if form.startswith("nge") and len(form) > 5:
            out.append("me" + form[3:])
        elif form.startswith("ng") and len(form) > 4:
            out.append("meng" + form[2:])
        if form != token:
            out.append(form)
    return out


def _unslang(word: str) -> str:
    """Ganti kata gaul, juga bila berakhiran -nya ("bikinnya" → "buat", "ultahnya")."""
    if word in SLANG:
        return SLANG[word]
    if word.endswith("nya") and word[:-3] in SLANG:
        return SLANG[word[:-3]]
    return word


def _strip_accents(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def tokenize(text: str) -> list[str]:
    """Huruf kecil, buang aksen, ganti kata gaul, buang kata fungsi, lalu stem ke kata dasar.
    Dipakai sama untuk chunk dan pertanyaan agar "dimainkan", "bermain", dan "dimainin" cocok."""
    text = _strip_accents(text.lower())
    out: list[str] = []
    for raw in _TOKEN.findall(text):
        for word in _unslang(raw).split():
            if word in STOPWORDS or word in STOPWORDS_CHAT or len(word) <= 1:
                continue
            token = _stem(word)
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
        regions: Iterable[str] = (),
        k1: float = K1,
        b: float = B,
    ) -> None:
        titles = lesson_titles or {}
        self.topic_terms = frozenset(t for title in titles.values() for t in tokenize(title))
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
        self.vocabulary = frozenset(self._idf)
        # Cek wilayah (ADR 43): nama wilayah yang tidak muncul di korpus kota ini = daerah lain.
        corpus = " | ".join(
            " ".join(tokenize(f"{c.text} {titles.get(c.lesson_id, '')}")) for c in self.chunks
        )
        corpus = f" {corpus} "
        phrases = {" ".join(tokenize(r)) for r in regions}
        self.foreign_regions = frozenset(p for p in phrases if p and f" {p} " not in corpus)

    def _bm25(self, i: int, terms: list[str]) -> float:
        tf, length = self._tf[i], self._len[i]
        norm = self.k1 * (1 - self.b + self.b * length / self._avg_len) if self._avg_len else 0.0
        score = 0.0
        for term in terms:
            f = tf.get(term, 0)
            if f:
                score += self._idf[term] * f * (self.k1 + 1) / (f + norm)
        return score

    def is_topical(self, query: str) -> bool:
        """Kueri menyebut istilah topik kota (kata dari judul materi)."""
        return not self.topic_terms.isdisjoint(normalize_query(query))

    def mentions_other_region(self, query: str) -> bool:
        """Kueri menyebut provinsi/kota yang tidak ada di catatan kota ini ("kuliner Jogja")."""
        q = f" {' '.join(tokenize(query[:MAX_QUERY_CHARS]))} "
        return any(f" {p} " in q for p in self.foreign_regions)

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


def passes_gate(
    hits: Sequence[Hit], topical: bool, min_score: float, other_region: bool = False
) -> bool:
    """Gerbang skor (tanpa LLM): ada kecocokan, tidak menyebut daerah lain (ADR 43), dan kueri
    bertopik atau skor teratas cukup."""
    return bool(hits) and not other_region and (topical or hits[0].raw_score >= min_score)


class Retriever:
    """Indeks per kota; pencarian tidak pernah melintasi kota."""

    def __init__(self, indexes: Mapping[str, CityIndex]) -> None:
        self._indexes = dict(indexes)

    @classmethod
    def from_content(cls, content: Content) -> Retriever:
        cities = [c.name for c in content.cities]
        regions = [*PROVINCES, *ALIASES, *cities]
        return cls(
            {city_id: _index_city(cc, regions) for city_id, cc in content.city_content.items()}
        )

    def search(
        self, city_id: str, query: str, lesson_id: str | None = None, top_k: int = TOP_K
    ) -> list[Hit]:
        index = self._indexes.get(city_id)
        if index is None:
            raise KeyError(city_id)
        return index.search(query, lesson_id=lesson_id, top_k=top_k)

    def is_topical(self, city_id: str, query: str) -> bool:
        return self._index(city_id).is_topical(query)

    def mentions_other_region(self, city_id: str, query: str) -> bool:
        return self._index(city_id).mentions_other_region(query)

    def vocabulary(self, city_id: str) -> frozenset[str]:
        """Semua token (sudah di-stem) di korpus kota; dipakai pengaman pertanyaan susulan."""
        return self._index(city_id).vocabulary

    def _index(self, city_id: str) -> CityIndex:
        index = self._indexes.get(city_id)
        if index is None:
            raise KeyError(city_id)
        return index


def _index_city(cc: CityContent, regions: Iterable[str] = ()) -> CityIndex:
    """Chunk penanda (`[PERLU DIISI]`, `TODO`) tidak diindeks: tidak berisi fakta, sehingga
    hanya membuat kata seperti "perlu" atau judul materi meloloskan pertanyaan di gerbang."""
    titles = {lesson_id: lesson.title for lesson_id, lesson in cc.lessons.items()}
    chunks = (c for c in cc.chunks.values() if not is_unfilled(c.text))
    return CityIndex(chunks, titles, regions=regions)
