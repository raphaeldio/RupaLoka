from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.tts import MAX_TTS_CHARS, TtsService, TtsUnavailable

MP3 = b"ID3fake-mp3"


def fake_client(calls: list[dict[str, Any]], status: int = 200) -> httpx.Client:
    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(
            {
                "url": str(request.url),
                "key": request.headers.get("xi-api-key"),
                "body": json.loads(request.content),
            }
        )
        return httpx.Response(status, content=MP3 if status == 200 else b"{}")

    return httpx.Client(transport=httpx.MockTransport(handler))


def service(calls: list[dict[str, Any]], **kw: Any) -> TtsService:
    return TtsService("kunci-uji", "voice-uji", client=fake_client(calls), **kw)


def test_calls_elevenlabs_with_voice_and_settings() -> None:
    calls: list[dict[str, Any]] = []
    audio = service(calls).synthesize("  Halo,   aku Saloka. ")
    assert audio == MP3
    (c,) = calls
    assert "/v1/text-to-speech/voice-uji" in c["url"] and "output_format=mp3_44100_128" in c["url"]
    assert c["key"] == "kunci-uji"
    assert c["body"]["text"] == "Halo, aku Saloka."
    assert c["body"]["voice_settings"] == {"stability": 0.5, "similarity_boost": 0.75}


def test_cache_avoids_second_call_and_quota() -> None:
    calls: list[dict[str, Any]] = []
    svc = service(calls, daily_char_limit=12)
    svc.synthesize("Halo Saloka")  # 11 karakter
    svc.synthesize("Halo  Saloka")  # sama setelah dinormalkan -> cache
    assert len(calls) == 1
    with pytest.raises(TtsUnavailable, match="quota"):
        svc.synthesize("Teks lain")


def test_quota_resets_next_day() -> None:
    calls: list[dict[str, Any]] = []
    day = {"v": "2026-11-26"}
    svc = service(calls, daily_char_limit=5, today=lambda: day["v"])
    svc.synthesize("abcde")
    with pytest.raises(TtsUnavailable):
        svc.synthesize("fghij")
    day["v"] = "2026-11-27"
    assert svc.synthesize("fghij") == MP3


def test_not_configured_and_invalid_text() -> None:
    svc = TtsService(None, None)
    assert not svc.enabled
    with pytest.raises(TtsUnavailable, match="not_configured"):
        svc.synthesize("Halo")
    with pytest.raises(ValueError):
        service([]).synthesize("   ")
    with pytest.raises(ValueError):
        service([]).synthesize("a" * (MAX_TTS_CHARS + 1))


def test_upstream_error_is_unavailable() -> None:
    calls: list[dict[str, Any]] = []
    svc = TtsService("k", "v", client=fake_client(calls, status=401))
    with pytest.raises(TtsUnavailable, match="upstream_401"):
        svc.synthesize("Halo")


# --- endpoint ----------------------------------------------------------------


def make_app(tts: TtsService | None, **settings: Any) -> TestClient:
    from app.main import create_app

    app = create_app(Settings(**settings), tts=tts)
    return TestClient(app)


def test_endpoint_returns_mp3_and_status() -> None:
    calls: list[dict[str, Any]] = []
    with make_app(service(calls)) as client:
        assert client.get("/api/tts/status").json() == {"enabled": True}
        r = client.post("/api/tts", json={"text": "Halo, aku Saloka."})
        assert r.status_code == 200
        assert r.headers["content-type"] == "audio/mpeg"
        assert r.content == MP3


def test_endpoint_unconfigured_is_503() -> None:
    with make_app(TtsService(None, None)) as client:
        assert client.get("/api/tts/status").json() == {"enabled": False}
        r = client.post("/api/tts", json={"text": "Halo"})
        assert r.status_code == 503
        assert r.json()["detail"] == "tts_not_configured"


def test_endpoint_validation_and_rate_limit() -> None:
    calls: list[dict[str, Any]] = []
    with make_app(service(calls), tts_rate_limit_per_min=2) as client:
        assert client.post("/api/tts", json={"text": ""}).status_code == 422
        long = "a" * (MAX_TTS_CHARS + 1)
        assert client.post("/api/tts", json={"text": long}).status_code == 422
        assert client.post("/api/tts", json={"text": "satu"}).status_code == 200
        assert client.post("/api/tts", json={"text": "dua"}).status_code == 200
        assert client.post("/api/tts", json={"text": "tiga"}).status_code == 429
