"""Bentuk respons API konten (SDD §8). Chunk mentah tidak pernah dikirim ke klien."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas import (
    AgentScript,
    AssetEntry,
    City,
    GameConfig,
    Item,
    Lesson,
    Phase,
    Quiz,
    Rewards,
    Source,
)


class Health(BaseModel):
    status: str
    cities: int
    active_cities: int


class CitySummary(City):
    """Kartu kota (F-003). Hitungan hanya diisi untuk kota aktif."""

    lesson_count: int | None = None
    item_count: int | None = None


class SourceRef(Source):
    """Sumber satu chunk, tanpa teks chunk. Dipakai untuk menampilkan rujukan kuis/fakta/item."""

    chunk_id: str
    lesson_id: str  # materi asal chunk; dipakai untuk saran materi setelah kuis (F-022)


class ReflectionPrompt(BaseModel):
    """Soal refleksi akhir tur untuk klien (tanpa kata kunci agar tidak bisa dicontek)."""

    id: str
    lesson: str | None = None
    prompt: str


class CityDetail(BaseModel):
    city: City
    phases: list[Phase]
    game: GameConfig
    rewards: Rewards
    agent_script: AgentScript
    quiz: Quiz
    lessons: list[Lesson]  # urut sesuai city.yaml
    items: list[Item]  # urut sesuai items_order
    sources: dict[str, SourceRef]  # chunk_id -> sumber, hanya chunk yang dirujuk konten
    reflection: list[ReflectionPrompt] = []  # soal refleksi siap pakai (punya daftar nilai)


class SourcesResponse(BaseModel):
    assets: list[AssetEntry]
    references: list[Source]  # sumber unik dari seluruh chunk


# --- papan peringkat (akhir tur kota) ----------------------------------------


class LeaderboardEntry(BaseModel):
    rank: int
    nickname: str
    points: int
    title: str | None = None  # gelar juara (peringkat 1), mis. "Si Paling Bandung"


class YourRank(BaseModel):
    rank: int
    points: int


class LeaderboardResponse(BaseModel):
    city_id: str
    champion_title: str
    max_points: int
    entries: list[LeaderboardEntry]
    you: YourRank | None = None  # posisi pemain yang meminta (bila player_id dikirim)


class ScoreSubmit(BaseModel):
    player_id: UUID  # dibuat acak di perangkat; bukan data pribadi
    nickname: str = Field(min_length=1, max_length=40)
    points: int = Field(ge=0)
