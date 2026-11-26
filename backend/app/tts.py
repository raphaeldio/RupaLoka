"""Suara maskot Saloka lewat ElevenLabs text-to-speech (SDD ADR 42).

Kunci API hanya di server (prinsip 8). Pengaman biaya: panjang teks dibatasi, kuota karakter
harian global, dan cache LRU per teks (kalimat pemandu dan kartu berulang). Kegagalan apa pun
dilaporkan sebagai `TtsUnavailable` agar klien kembali ke suara peramban (prinsip 10).
"""

from __future__ import annotations

import hashlib
import re
import threading
from collections import OrderedDict
from collections.abc import Callable
from datetime import UTC, datetime

import httpx

ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
OUTPUT_FORMAT = "mp3_44100_128"
MAX_TTS_CHARS = 600
CACHE_MAX_BYTES = 40 * 1024 * 1024

_SPACE = re.compile(r"\s+")


class TtsUnavailable(Exception):
    """TTS tidak bisa dipakai saat ini (belum dikonfigurasi, kuota habis, atau gagal)."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def normalize(text: str) -> str:
    return _SPACE.sub(" ", text).strip()


class TtsService:
    def __init__(
        self,
        api_key: str | None,
        voice_id: str | None,
        model_id: str = "eleven_multilingual_v2",
        *,
        stability: float = 0.5,
        similarity_boost: float = 0.75,
        daily_char_limit: int = 20_000,
        timeout_s: float = 20.0,
        client: httpx.Client | None = None,
        today: Callable[[], str] | None = None,
    ) -> None:
        self.api_key, self.voice_id, self.model_id = api_key, voice_id, model_id
        self.voice_settings = {"stability": stability, "similarity_boost": similarity_boost}
        self.daily_char_limit = daily_char_limit
        self._client = client or httpx.Client(timeout=timeout_s)
        self._today = today or (lambda: datetime.now(UTC).date().isoformat())
        self._cache: OrderedDict[str, bytes] = OrderedDict()
        self._cache_bytes = 0
        self._day = ""
        self._chars_today = 0
        self._lock = threading.Lock()

    @property
    def enabled(self) -> bool:
        return bool(self.api_key and self.voice_id)

    def synthesize(self, text: str) -> bytes:
        """MP3 untuk `text`. Cache tidak menghabiskan kuota; teks baru menghabiskan kuota."""
        text = normalize(text)
        if not text:
            raise ValueError("teks kosong")
        if len(text) > MAX_TTS_CHARS:
            raise ValueError(f"teks lebih dari {MAX_TTS_CHARS} karakter")
        if not self.enabled:
            raise TtsUnavailable("tts_not_configured")
        key = hashlib.sha256(f"{self.voice_id}|{self.model_id}|{text}".encode()).hexdigest()
        with self._lock:
            hit = self._cache.get(key)
            if hit is not None:
                self._cache.move_to_end(key)
                return hit
            day = self._today()
            if day != self._day:
                self._day, self._chars_today = day, 0
            if self._chars_today + len(text) > self.daily_char_limit:
                raise TtsUnavailable("tts_quota_exceeded")
            self._chars_today += len(text)  # dipesan dulu agar permintaan paralel tidak lolos

        audio = self._request(text)
        with self._lock:
            self._cache[key] = audio
            self._cache_bytes += len(audio)
            while self._cache_bytes > CACHE_MAX_BYTES and self._cache:
                _, old = self._cache.popitem(last=False)
                self._cache_bytes -= len(old)
        return audio

    def _request(self, text: str) -> bytes:
        try:
            r = self._client.post(
                ELEVENLABS_URL.format(voice_id=self.voice_id),
                params={"output_format": OUTPUT_FORMAT},
                headers={"xi-api-key": self.api_key or "", "Accept": "audio/mpeg"},
                json={
                    "text": text,
                    "model_id": self.model_id,
                    "language_code": "id",
                    "voice_settings": self.voice_settings,
                },
            )
        except httpx.HTTPError as exc:
            raise TtsUnavailable("tts_upstream_error") from exc
        if r.status_code != 200 or not r.content:
            raise TtsUnavailable(f"tts_upstream_{r.status_code}")
        return r.content
