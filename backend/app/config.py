"""Konfigurasi dari variabel lingkungan (lihat `.env.example` di akar repo)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"
# Ambang skor BM25 mentah. Nilai awal kasar; kalibrasi dengan eval_rag.py (T-062).
DEFAULT_MIN_SCORE = 1.0


def _bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _list(value: str | None) -> list[str]:
    return [v.strip() for v in (value or "").split(",") if v.strip()]


def _str(value: str | None) -> str | None:
    return value.strip() if value and value.strip() else None


@dataclass(frozen=True)
class Settings:
    content_dir: Path = REPO_ROOT / "content"
    # True: data yang belum diisi/diverifikasi menggagalkan startup (mode rilis).
    content_strict: bool = False
    allowed_origins: list[str] = field(default_factory=list)

    # Agen AI (SDD §9). Tanpa kunci, /api/chat menjawab 503 dan klien memakai skrip.
    gemini_api_key: str | None = None
    gemini_model: str = DEFAULT_GEMINI_MODEL
    llm_timeout_s: float = 15.0
    min_score: float = DEFAULT_MIN_SCORE
    rate_limit_per_min: int = 20
    # Batas total /api/chat dari semua IP; pengaman kuota Gemini bila IP dipalsukan (T-064).
    global_rate_limit_per_min: int = 120
    # Jumlah proxy tepercaya di depan API. 0 = X-Forwarded-For diabaikan (lokal, aman);
    # di Render lewat rewrite Vercel pakai 2 (lihat SDD §12).
    trusted_proxy_hops: int = 0
    # Swagger /docs; matikan di produksi agar permukaan serangan kecil.
    enable_docs: bool = True
    mascot_name: str = "Pemandu Rupaloka"  # [PERLU DIISI] nama maskot final

    @classmethod
    def from_env(cls) -> Settings:
        env = os.environ.get
        content_dir = env("CONTENT_DIR")
        return cls(
            content_dir=Path(content_dir).resolve() if content_dir else REPO_ROOT / "content",
            content_strict=_bool(env("CONTENT_STRICT")),
            allowed_origins=_list(env("ALLOWED_ORIGINS")),
            gemini_api_key=_str(env("GEMINI_API_KEY")),
            gemini_model=_str(env("GEMINI_MODEL")) or DEFAULT_GEMINI_MODEL,
            llm_timeout_s=float(env("LLM_TIMEOUT_S") or 15.0),
            min_score=float(env("MIN_SCORE") or DEFAULT_MIN_SCORE),
            rate_limit_per_min=int(env("RATE_LIMIT_PER_MIN") or 20),
            global_rate_limit_per_min=int(env("GLOBAL_RATE_LIMIT_PER_MIN") or 120),
            trusted_proxy_hops=max(0, int(env("TRUSTED_PROXY_HOPS") or 0)),
            enable_docs=_bool(env("ENABLE_DOCS"), default=True),
            mascot_name=_str(env("MASCOT_NAME")) or "Pemandu Rupaloka",
        )
