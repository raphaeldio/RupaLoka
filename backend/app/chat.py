"""Tanya-jawab bersumber (SDD §8.1, §9).

Alur: retrieval → gerbang `MIN_SCORE` (tolak tanpa memanggil LLM) → LLM → validasi sitasi
(penanda pada kalimat penolakan dan penanda yang tidak ada di konteks dibuang; tanpa sitasi valid
= penolakan) → format.
"""

from __future__ import annotations

import re
import time
from collections import deque
from collections.abc import Callable, Sequence
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.config import Settings
from app.content_loader import Content
from app.llm import LLM, LLMError, Turn
from app.prompts import system_prompt, user_prompt
from app.retrieval import Hit, Retriever, passes_gate
from app.schemas import Chunk, Id, Phase

MAX_MESSAGE_CHARS = 500
MAX_HISTORY_TURNS = 6
MAX_SUGGESTIONS = 3
REFUSAL_TEXT = "Maaf, aku belum punya informasi tentang itu di catatan Rupaloka."

RefusalReason = Literal["out_of_scope", "no_valid_citation"]


# --- skema permintaan/respons ----------------------------------------------


class ChatContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    phase: Phase | None = None
    lesson_id: Id | None = None


class HistoryTurn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    city_id: Id
    context: ChatContext = Field(default_factory=ChatContext)
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    history: list[HistoryTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("pertanyaan kosong")
        return value.strip()


class Citation(BaseModel):
    chunk_id: str
    title: str
    url: str | None


class ChatResponse(BaseModel):
    answer: str
    grounded: bool
    citations: list[Citation]
    refusal_reason: RefusalReason | None
    suggestions: list[str] = Field(default_factory=list)


class UnknownContext(ValueError):
    """city_id atau lesson_id tidak dikenal (400)."""


# --- sitasi ----------------------------------------------------------------

# [id] atau [id-1, id-2]
_MARKER = re.compile(r"\[\s*([a-z0-9-]+(?:\s*[,;]\s*[a-z0-9-]+)*)\s*\]")
_SPACE_BEFORE_PUNCT = re.compile(r"\s+([.,;:!?])")
_MULTI_SPACE = re.compile(r"[ \t]{2,}")


# Kalimat penolakan LLM ("aku belum punya informasinya"). Penanda sumber pada kalimat seperti ini
# dibuang: penolakan tidak didukung chunk mana pun, dan tanpa ini penolakan bersitasi lolos sebagai
# jawaban bersumber (eval 21 Nov 2026: 4 dari 18 kasus luar cakupan).
REFUSAL_PATTERN = re.compile(
    r"\b(belum|tidak|tak)\s+(punya|ada|memiliki|tahu|menemukan)\b[^.!?]*"
    r"\b(informasi|info|data|catatan|jawaban|keterangan)"
    r"|\b(belum|tidak|tak)\s+(tahu|mengetahui)\b",
    re.IGNORECASE,
)
_SENTENCE = re.compile(r"[^.!?]+(?:[.!?]+(?:\s*\[[^\]]*\])*|$)")


def is_refusal_sentence(sentence: str) -> bool:
    return REFUSAL_PATTERN.search(sentence) is not None


def drop_refusal_citations(text: str) -> str:
    """Hapus penanda `[...]` dari kalimat yang berupa penolakan; kalimat fakta tidak diubah."""
    return "".join(
        _MARKER.sub("", m.group(0)) if is_refusal_sentence(m.group(0)) else m.group(0)
        for m in _SENTENCE.finditer(text)
    )


def apply_citations(text: str, allowed: dict[str, Chunk]) -> tuple[str, list[Chunk]]:
    """Ganti penanda `[chunk_id]` yang valid dengan nomor `[1]`, buang yang tidak valid."""
    order: list[str] = []

    def replace(match: re.Match[str]) -> str:
        numbers: list[str] = []
        for cid in re.split(r"\s*[,;]\s*", match.group(1)):
            if cid not in allowed:
                continue
            if cid not in order:
                order.append(cid)
            n = str(order.index(cid) + 1)
            if n not in numbers:
                numbers.append(n)
        return "".join(f"[{n}]" for n in numbers)

    out = _MARKER.sub(replace, text)
    out = _SPACE_BEFORE_PUNCT.sub(r"\1", out)
    out = _MULTI_SPACE.sub(" ", out).strip()
    return out, [allowed[cid] for cid in order]


# --- batas laju ------------------------------------------------------------


class RateLimiter:
    """Jendela geser per kunci (IP), di memori. Cukup untuk satu instans Render."""

    def __init__(
        self, limit: int, window_s: float = 60.0, clock: Callable[[], float] = time.monotonic
    ) -> None:
        self.limit, self.window_s, self.clock = limit, window_s, clock
        self._hits: dict[str, deque[float]] = {}

    def allow(self, key: str) -> bool:
        if self.limit <= 0:
            return True
        now = self.clock()
        q = self._hits.setdefault(key, deque())
        while q and now - q[0] >= self.window_s:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        if len(self._hits) > 10_000:  # buang kunci yang sudah lama tidak aktif
            self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] < self.window_s}
        return True


# --- layanan ---------------------------------------------------------------


class ChatService:
    def __init__(
        self, content: Content, retriever: Retriever, llm: LLM | None, settings: Settings
    ) -> None:
        self.content = content
        self.retriever = retriever
        self.llm = llm
        self.settings = settings
        self.system = system_prompt(settings.mascot_name)

    async def answer(self, req: ChatRequest) -> ChatResponse:
        city = self.content.city_content.get(req.city_id)
        if city is None:
            raise UnknownContext(f"city_id '{req.city_id}' tidak dikenal atau belum aktif")
        lesson_id = req.context.lesson_id
        if lesson_id is not None and lesson_id not in city.lessons:
            raise UnknownContext(f"lesson_id '{lesson_id}' bukan materi kota ini")

        hits = self.retriever.search(req.city_id, req.message, lesson_id=lesson_id)
        topical = self.retriever.is_topical(req.city_id, req.message)
        if not passes_gate(hits, topical, self.settings.min_score):
            return self._refusal("out_of_scope", req.city_id, lesson_id)

        if self.llm is None:
            raise LLMError("GEMINI_API_KEY belum diatur")
        raw = await self.llm.generate(self.system, self._turns(req, hits))

        allowed = {h.chunk.id: h.chunk for h in hits}
        text, cited = apply_citations(drop_refusal_citations(raw), allowed)
        if not cited:
            return self._refusal("no_valid_citation", req.city_id, lesson_id)
        return ChatResponse(
            answer=text,
            grounded=True,
            citations=[
                Citation(chunk_id=c.id, title=c.source.title, url=c.source.url) for c in cited
            ],
            refusal_reason=None,
        )

    def _turns(self, req: ChatRequest, hits: Sequence[Hit]) -> list[Turn]:
        history = [Turn(role=t.role, text=t.content) for t in req.history]
        while history and history[0].role != "user":  # Gemini: percakapan dimulai pengguna
            history.pop(0)
        return [*history, Turn(role="user", text=user_prompt(req.message, hits))]

    def _refusal(self, reason: RefusalReason, city_id: str, lesson_id: str | None) -> ChatResponse:
        city = self.content.city_content[city_id]
        if lesson_id is not None:
            pool = city.lessons[lesson_id].suggested_questions
        else:
            pool = [q for lesson in city.lessons.values() for q in lesson.suggested_questions]
        return ChatResponse(
            answer=REFUSAL_TEXT,
            grounded=False,
            citations=[],
            refusal_reason=reason,
            suggestions=pool[:MAX_SUGGESTIONS],
        )
