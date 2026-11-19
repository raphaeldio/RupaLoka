"""Uji GeminiLLM tanpa jaringan: panggilan SDK diganti tiruan."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from typing import Any

import pytest
from google.genai import errors

from app.llm import GeminiLLM, LLMError, Turn


def api_error(code: int) -> errors.APIError:
    return errors.APIError(code, {"error": {"code": code, "message": "uji", "status": "UJI"}})


def make_llm(outcomes: list[Any]) -> tuple[GeminiLLM, list[dict[str, Any]]]:
    llm = GeminiLLM(api_key="kunci-uji", model="model-uji", timeout_s=15)
    calls: list[dict[str, Any]] = []

    async def fake_generate(**kwargs: Any) -> Any:
        calls.append(kwargs)
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(text=outcome)

    llm._client = SimpleNamespace(  # type: ignore[assignment]
        aio=SimpleNamespace(models=SimpleNamespace(generate_content=fake_generate))
    )
    return llm, calls


def run(llm: GeminiLLM, turns: list[Turn] | None = None) -> str:
    return asyncio.run(llm.generate("aturan", turns or [Turn("user", "halo")]))


def test_builds_request() -> None:
    llm, calls = make_llm(["jawaban"])
    turns = [Turn("user", "a"), Turn("assistant", "b"), Turn("user", "c")]
    assert run(llm, turns) == "jawaban"
    call = calls[0]
    assert call["model"] == "model-uji"
    assert [c.role for c in call["contents"]] == ["user", "model", "user"]
    assert call["contents"][2].parts[0].text == "c"
    assert call["config"].system_instruction == "aturan"
    assert call["config"].temperature == 0.2


def test_retries_once_on_retryable_error() -> None:
    llm, calls = make_llm([api_error(503), "ok"])
    assert run(llm) == "ok"
    assert len(calls) == 2


def test_gives_up_after_second_failure() -> None:
    llm, calls = make_llm([TimeoutError("lambat"), api_error(429)])
    with pytest.raises(LLMError):
        run(llm)
    assert len(calls) == 2


def test_does_not_retry_client_error() -> None:
    llm, calls = make_llm([api_error(400), "tidak terpakai"])
    with pytest.raises(LLMError):
        run(llm)
    assert len(calls) == 1


def test_empty_text_becomes_empty_string() -> None:
    llm, _ = make_llm([None])
    assert run(llm) == ""
