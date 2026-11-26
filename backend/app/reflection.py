"""Penilaian refleksi akhir tur (masukan juri, 25 Nov 2026; ADR di SDD §16).

Pemain menulis jawaban bebas, mis. "Nilai apa dari angklung yang bisa kamu pakai?".
Jawaban dicocokkan dengan daftar nilai yang DITULIS TIM BUDAYA (reflection.yaml):

1. Kata kunci (deterministik, tanpa LLM).
2. Bila tidak ada yang cocok dan LLM tersedia: LLM hanya MENGKLASIFIKASI jawaban ke id nilai
   yang ada di daftar. LLM tidak pernah menulis teks yang ditampilkan; umpan balik berasal
   dari konten. Id di luar daftar dibuang.
3. LLM gagal → hasil kata kunci tetap dipakai (gagal dengan anggun).

Jawaban pemain tidak disimpan dan tidak dicatat di log.
"""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from collections.abc import Sequence
from typing import Literal

from pydantic import BaseModel, Field

from app.llm import LLM, LLMError, Turn
from app.prompts import REFLECTION_SYSTEM, reflection_user_prompt
from app.schemas import ReflectionQuestion, ReflectionValue

logger = logging.getLogger("rupaloka.reflection")

MAX_ANSWER_CHARS = 500
Method = Literal["keyword", "ai", "none"]


class ReflectionRequest(BaseModel):
    city_id: str
    question_id: str
    answer: str = Field(min_length=1, max_length=MAX_ANSWER_CHARS)


class MatchedValue(BaseModel):
    id: str
    label: str
    explanation: str | None = None
    chunk: str | None = None


class ReflectionResult(BaseModel):
    matched: list[MatchedValue]
    method: Method  # "ai" = dikenali dengan bantuan AI (ditampilkan sebagai label di UI)
    feedback: str


def normalize(text: str) -> str:
    """Huruf kecil, tanpa diakritik dan tanda baca, spasi tunggal."""
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", text).split())


def match_keywords(answer: str, values: Sequence[ReflectionValue]) -> list[ReflectionValue]:
    """Nilai yang salah satu kata kuncinya muncul utuh (per kata) di jawaban."""
    padded = f" {normalize(answer)} "
    found: list[ReflectionValue] = []
    for value in values:
        for kw in value.keywords:
            norm = normalize(kw)
            if norm and f" {norm} " in padded:
                found.append(value)
                break
    return found


def parse_value_ids(raw: str, allowed: set[str]) -> list[str]:
    """Ambil `value_ids` dari keluaran LLM; id yang tidak dikenal dibuang."""
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    ids = data.get("value_ids") if isinstance(data, dict) else None
    if not isinstance(ids, list):
        return []
    out: list[str] = []
    for i in ids:
        if isinstance(i, str) and i in allowed and i not in out:
            out.append(i)
    return out


async def classify_with_llm(
    llm: LLM, question: ReflectionQuestion, answer: str
) -> list[ReflectionValue]:
    raw = await llm.generate(
        REFLECTION_SYSTEM, [Turn("user", reflection_user_prompt(question, answer))]
    )
    ids = parse_value_ids(raw, {v.id for v in question.values})
    return [v for v in question.values if v.id in ids]


async def assess(question: ReflectionQuestion, answer: str, llm: LLM | None) -> ReflectionResult:
    matched = match_keywords(answer, question.values)
    method: Method = "keyword" if matched else "none"
    if not matched and llm is not None:
        try:
            matched = await classify_with_llm(llm, question, answer)
        except LLMError as exc:
            logger.warning("refleksi: LLM tidak tersedia, pakai kata kunci saja: %s", exc)
            matched = []
        if matched:
            method = "ai"
    return ReflectionResult(
        matched=[
            MatchedValue(
                id=v.id,
                label=v.label,
                explanation=v.explanation.text if v.explanation else None,
                chunk=v.explanation.chunk if v.explanation else None,
            )
            for v in matched
        ],
        method=method,
        feedback=question.feedback_match if matched else question.feedback_miss,
    )
