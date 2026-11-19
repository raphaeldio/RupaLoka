"""Klien LLM (Gemini lewat SDK `google-genai`).

Antarmuka `LLM` sengaja kecil agar mudah ditiru di pengujian dan diganti penyedia lain.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

logger = logging.getLogger("rupaloka.llm")

Role = Literal["user", "assistant"]
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})


@dataclass(frozen=True)
class Turn:
    role: Role
    text: str


class LLMError(RuntimeError):
    """LLM gagal atau tidak tersedia; API menjawab 503 dan klien memakai skrip agen."""


class LLM(Protocol):
    async def generate(self, system: str, turns: Sequence[Turn]) -> str: ...


class GeminiLLM:
    """Satu kali percobaan ulang untuk timeout, 429, dan 5xx; selain itu langsung gagal."""

    def __init__(
        self,
        api_key: str,
        model: str,
        timeout_s: float = 15.0,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
    ) -> None:
        from google import genai
        from google.genai import types

        self._types = types
        self._client = genai.Client(
            api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout_s * 1000))
        )
        self._model = model
        self._temperature = temperature
        self._max_output_tokens = max_output_tokens

    async def generate(self, system: str, turns: Sequence[Turn]) -> str:
        from google.genai import errors

        types = self._types
        contents = [
            (
                types.UserContent(parts=t.text)
                if t.role == "user"
                else types.ModelContent(parts=t.text)
            )
            for t in turns
        ]
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=self._temperature,
            max_output_tokens=self._max_output_tokens,
        )
        last_exc: Exception | None = None
        for attempt in range(2):
            try:
                response = await self._client.aio.models.generate_content(
                    model=self._model, contents=contents, config=config
                )
                return response.text or ""
            except errors.APIError as exc:
                last_exc = exc
                if exc.code not in RETRYABLE_STATUS:
                    break
            except Exception as exc:  # timeout dan galat jaringan
                last_exc = exc
            logger.warning("LLM gagal (percobaan %d): %s", attempt + 1, last_exc)
        raise LLMError(str(last_exc)) from last_exc
