"""Papan peringkat akhir tur kota (diputuskan tim 21 Nov 2026).

Tanpa akun: klien membuat `player_id` acak (UUID) di perangkatnya dan memilih nama panggilan.
Satu baris per (kota, pemain); yang disimpan skor terbaik. Skor = total poin path, dibatasi
nilai maksimum yang mungkin dari konten. Peringkat: poin tertinggi, seri = yang lebih dulu
mencapainya (lalu player_id, agar tidak ada dua peringkat 1). Peringkat 1 mendapat gelar
dari `city.yaml` (mis. "Si Paling Bandung").

Penyimpanan: Supabase (PostgREST + fungsi SQL di supabase/migrations) bila dikonfigurasi,
selain itu memori (pengembangan dan uji).
"""

from __future__ import annotations

import logging
import re
import threading
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

import httpx

from app.content_loader import CityContent

logger = logging.getLogger("rupaloka.leaderboard")

NICKNAME_MIN, NICKNAME_MAX = 3, 20
_NICKNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 ._-]*$")

# Saringan kasar kata tidak pantas (Indonesia, Sunda, Jawa, Inggris). Kata pendek hanya dicek
# sebagai kata utuh agar nama seperti "Kasur" tidak ikut tertolak.
_BAD_WORDS_WHOLE = {"asu", "babi", "bego", "anjir", "tai", "kntl", "fuck", "shit"}
_BAD_WORDS_ANY = {
    "anjing",
    "bangsat",
    "goblok",
    "tolol",
    "kontol",
    "memek",
    "ngentot",
    "jancok",
    "jancuk",
    "bajingan",
    "kampret",
    "setan",
    "fuck",
    "bitch",
    "sialan",
}


class NicknameError(ValueError):
    """Nama panggilan tidak memenuhi aturan; pesannya ditampilkan ke pengguna."""


def clean_nickname(raw: str) -> str:
    """Rapikan dan periksa nama panggilan. Melempar NicknameError bila ditolak."""
    name = " ".join(unicodedata.normalize("NFKC", raw).split())
    if not NICKNAME_MIN <= len(name) <= NICKNAME_MAX:
        raise NicknameError(f"nama panggilan harus {NICKNAME_MIN}-{NICKNAME_MAX} karakter")
    if not _NICKNAME_RE.match(name):
        raise NicknameError("nama panggilan hanya boleh huruf, angka, spasi, titik, - dan _")
    lowered = name.lower()
    # Samakan angka yang sering dipakai menyamarkan huruf.
    leet = lowered.translate(str.maketrans("013457", "oieast"))
    words = set(re.split(r"[ ._-]+", leet))
    squashed = re.sub(r"[^a-z]", "", leet)
    if words & _BAD_WORDS_WHOLE or any(w in squashed for w in _BAD_WORDS_ANY):
        raise NicknameError("nama panggilan tidak pantas; pilih nama lain")
    return name


def max_points(cc: CityContent) -> int:
    """Poin path tertinggi yang mungkin (sama dengan maxPathPoints di frontend)."""
    r = cc.config.rewards
    intro = len(cc.quiz.intro) if cc.quiz else 0
    return (
        len(cc.config.lessons) * r.points_per_node
        + intro * r.points_per_correct
        + r.game_node_points
    )


@dataclass(frozen=True)
class Row:
    nickname: str
    points: int
    achieved_at: datetime


class LeaderboardStore(Protocol):
    def submit(self, city_id: str, player_id: str, nickname: str, points: int) -> None: ...
    def top(self, city_id: str, limit: int) -> list[Row]: ...
    def rank_of(self, city_id: str, player_id: str) -> tuple[int, int] | None: ...


class StoreError(RuntimeError):
    """Penyimpanan tidak dapat dihubungi."""


class MemoryStore:
    """Simpanan di memori proses. Hilang saat server mulai ulang."""

    def __init__(self) -> None:
        self._rows: dict[tuple[str, str], Row] = {}
        self._lock = threading.Lock()

    def submit(self, city_id: str, player_id: str, nickname: str, points: int) -> None:
        with self._lock:
            old = self._rows.get((city_id, player_id))
            if old is None or points > old.points:
                self._rows[(city_id, player_id)] = Row(nickname, points, datetime.now(UTC))
            else:
                self._rows[(city_id, player_id)] = Row(nickname, old.points, old.achieved_at)

    def _sorted(self, city_id: str) -> list[tuple[str, Row]]:
        rows = [(p, r) for (c, p), r in self._rows.items() if c == city_id]
        return sorted(rows, key=lambda x: (-x[1].points, x[1].achieved_at, x[0]))

    def top(self, city_id: str, limit: int) -> list[Row]:
        with self._lock:
            return [r for _, r in self._sorted(city_id)[:limit]]

    def rank_of(self, city_id: str, player_id: str) -> tuple[int, int] | None:
        with self._lock:
            for i, (p, r) in enumerate(self._sorted(city_id), start=1):
                if p == player_id:
                    return i, r.points
        return None


class SupabaseStore:
    """Tabel `leaderboard` lewat PostgREST dengan service role key (hanya di backend)."""

    def __init__(self, url: str, key: str, timeout_s: float = 5.0) -> None:
        self._client = httpx.Client(
            base_url=url.rstrip("/") + "/rest/v1",
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
            timeout=timeout_s,
        )

    def _call(self, method: str, path: str, **kw: object) -> httpx.Response:
        try:
            res = self._client.request(method, path, **kw)  # type: ignore[arg-type]
            res.raise_for_status()
            return res
        except httpx.HTTPError as exc:
            raise StoreError(str(exc)) from exc

    def submit(self, city_id: str, player_id: str, nickname: str, points: int) -> None:
        self._call(
            "POST",
            "/rpc/leaderboard_submit",
            json={
                "p_city_id": city_id,
                "p_player_id": player_id,
                "p_nickname": nickname,
                "p_points": points,
            },
        )

    def top(self, city_id: str, limit: int) -> list[Row]:
        res = self._call(
            "GET",
            "/leaderboard",
            params={
                "select": "nickname,points,achieved_at",
                "city_id": f"eq.{city_id}",
                "order": "points.desc,achieved_at.asc,player_id.asc",
                "limit": str(limit),
            },
        )
        return [
            Row(r["nickname"], int(r["points"]), datetime.fromisoformat(r["achieved_at"]))
            for r in res.json()
        ]

    def rank_of(self, city_id: str, player_id: str) -> tuple[int, int] | None:
        res = self._call(
            "POST",
            "/rpc/leaderboard_rank",
            json={"p_city_id": city_id, "p_player_id": player_id},
        )
        rows = res.json()
        if not rows:
            return None
        return int(rows[0]["rank"]), int(rows[0]["points"])


def build_store(url: str | None, key: str | None) -> LeaderboardStore:
    if url and key:
        return SupabaseStore(url, key)
    logger.warning("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY kosong; papan peringkat di memori")
    return MemoryStore()
