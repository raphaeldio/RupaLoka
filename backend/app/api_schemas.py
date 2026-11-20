"""Bentuk respons API konten (SDD §8). Chunk mentah tidak pernah dikirim ke klien."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas import (
    AgentScript,
    AssetEntry,
    City,
    GameConfig,
    Item,
    Lesson,
    Phase,
    Quiz,
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


class CityDetail(BaseModel):
    city: City
    phases: list[Phase]
    game: GameConfig
    agent_script: AgentScript
    quiz: Quiz
    lessons: list[Lesson]  # urut sesuai city.yaml
    items: list[Item]  # urut sesuai items_order
    sources: dict[str, SourceRef]  # chunk_id -> sumber, hanya chunk yang dirujuk konten


class SourcesResponse(BaseModel):
    assets: list[AssetEntry]
    references: list[Source]  # sumber unik dari seluruh chunk
