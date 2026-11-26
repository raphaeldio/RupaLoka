"""Bentuk respons API konten (SDD §8). Chunk mentah tidak pernah dikirim ke klien."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas import (
    AgentScript,
    AssetEntry,
    CardAspect,
    City,
    GalleryLayout,
    GameConfig,
    Hotspot,
    ImageRef,
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


class ExhibitOut(BaseModel):
    """Satu pedestal galeri, siap tampil. Teks hanya dari konten bersumber; None = pending."""

    id: str
    kind: Literal["item", "object"]  # item koleksi game atau objek khusus museum
    name: str
    short_explanation: str | None = None
    short_chunk: str | None = None
    asal_usul: CardAspect | None = None
    image: ImageRef | None = None
    model_src: str | None = None  # relatif ke content/ (klien: modelUrl)
    model_available: bool = False  # False = klien langsung memakai pengganti
    accuracy_by: str | None = None  # pemeriksa bentuk model (KH); None = belum diperiksa
    hotspots: list[Hotspot] = []  # hanya yang teksnya sudah diisi


class DecorOut(BaseModel):
    """Pajangan dinding (lukisan) di seberang pedestal `slot`; hanya hiasan."""

    id: str
    name: str
    model_src: str
    model_available: bool
    slot: int


class GalleryOut(BaseModel):
    layout: GalleryLayout
    room_model: str
    room_available: bool
    exhibits: list[ExhibitOut]
    guide_model: str | None = None
    guide_available: bool = False
    decor: list[DecorOut] = []
    approved: bool = False  # isi galeri sudah disetujui anggota budaya (KH)


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
    gallery: GalleryOut | None = None  # galeri 3D (ADR 40); klien menampilkan bila flag aktif


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


# --- suara Saloka (ElevenLabs TTS, ADR 42) ------------------------------------


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=600)  # sama dengan app.tts.MAX_TTS_CHARS


class TtsStatus(BaseModel):
    enabled: bool
