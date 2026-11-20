"""Skema konten Rupaloka (SDD §5).

Skema hanya memeriksa bentuk satu berkas. Pemeriksaan lintas berkas
(rujukan id, kelengkapan sumber, aset) ada di `content_loader`.
"""

from __future__ import annotations

from datetime import date
from string import Formatter
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

ID_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
Id = Annotated[str, Field(pattern=ID_PATTERN)]
Text = Annotated[str, Field(min_length=1)]
Lat = Annotated[float, Field(ge=-90, le=90)]
Lng = Annotated[float, Field(ge=-180, le=180)]
Tier = Literal["free", "premium"]
Phase = Literal["quiz_intro", "lessons", "game", "summary"]


class Strict(BaseModel):
    """Basis model: kolom tak dikenal ditolak agar salah ketik di YAML ketahuan."""

    model_config = ConfigDict(extra="forbid")


def _no_duplicates(values: list[str], name: str) -> None:
    seen: set[str] = set()
    dupes = sorted({v for v in values if v in seen or seen.add(v)})
    if dupes:
        raise ValueError(f"{name} memuat id ganda: {', '.join(dupes)}")


# --- content/cities.yaml ---------------------------------------------------


class City(Strict):
    id: Id
    name: Text
    province: str | None = None
    status: Literal["active", "coming_soon"]
    lat: Lat | None = None
    lng: Lng | None = None
    summary: str | None = None


# --- content/<kota>/city.yaml ----------------------------------------------


class Speed(Strict):
    start: float = Field(gt=0)
    max: float = Field(gt=0)
    ramp_per_100: float = Field(ge=0)

    @model_validator(mode="after")
    def _max_not_below_start(self) -> Speed:
        if self.max < self.start:
            raise ValueError("speed.max harus >= speed.start")
        return self


class GameConfig(Strict):
    unlock_every: int = Field(gt=0)
    items_order: list[Id] = Field(min_length=3)
    obstacles: list[Id] = Field(min_length=1)
    background: Text
    speed: Speed

    @model_validator(mode="after")
    def _unique(self) -> GameConfig:
        _no_duplicates(self.items_order, "items_order")
        _no_duplicates(self.obstacles, "obstacles")
        return self


class Badge(Strict):
    """Lencana yang didapat saat poin path kota mencapai `min_points`."""

    id: Id
    name: Text
    min_points: int = Field(gt=0)
    description: Text


class Rewards(Strict):
    """Poin path belajar (titik = materi, titik terakhir = game) dan lencana.

    Poin kota = titik materi selesai × points_per_node + jawaban kuis benar ×
    points_per_correct + (game_node_points bila game sudah dimainkan sekali).
    """

    points_per_node: int = Field(default=100, ge=0)
    points_per_correct: int = Field(default=10, ge=0)
    game_node_points: int = Field(default=100, ge=0)
    badges: list[Badge] = Field(default_factory=list)

    @model_validator(mode="after")
    def _ordered(self) -> Rewards:
        _no_duplicates([b.id for b in self.badges], "badges")
        mins = [b.min_points for b in self.badges]
        if mins != sorted(mins) or len(set(mins)) != len(mins):
            raise ValueError("badges harus berurutan naik menurut min_points tanpa ambang ganda")
        return self


class CityConfig(Strict):
    id: Id
    phases: list[Phase] = Field(min_length=1)
    # Urutan titik path belajar. Tiap titik: kuis (soal yang chunk-nya milik materi ini),
    # lalu kartu materi.
    lessons: list[Id] = Field(min_length=1)
    game: GameConfig
    rewards: Rewards = Field(default_factory=Rewards)

    @model_validator(mode="after")
    def _unique(self) -> CityConfig:
        _no_duplicates(list(self.phases), "phases")
        _no_duplicates(self.lessons, "lessons")
        return self


# --- content/<kota>/agent_script.yaml --------------------------------------

ITEM_UNLOCKED_FIELDS = {"item", "short_explanation"}


class AgentScript(Strict):
    quiz_intro: Text
    lessons_start: Text
    game_start: Text
    item_unlocked: Text
    summary: Text

    @model_validator(mode="after")
    def _known_placeholders(self) -> AgentScript:
        used = {f for _, f, _, _ in Formatter().parse(self.item_unlocked) if f is not None}
        unknown = used - ITEM_UNLOCKED_FIELDS
        if unknown:
            raise ValueError(
                f"item_unlocked memakai variabel tak dikenal: {', '.join(sorted(unknown))}; "
                f"yang tersedia: {', '.join(sorted(ITEM_UNLOCKED_FIELDS))}"
            )
        return self


# --- content/<kota>/quiz.yaml ----------------------------------------------


class QuizQuestion(Strict):
    id: Id
    question: Text
    options: list[Text] = Field(min_length=2)
    correct: int = Field(ge=0)
    explanation: Text
    chunk: Id

    @model_validator(mode="after")
    def _correct_in_range(self) -> QuizQuestion:
        if self.correct >= len(self.options):
            raise ValueError(
                f"correct={self.correct} di luar rentang opsi (0..{len(self.options) - 1})"
            )
        return self


class Quiz(Strict):
    intro: list[QuizQuestion] = Field(min_length=1)
    outro: list[QuizQuestion] = Field(default_factory=list)  # kuis penutup, P1

    @model_validator(mode="after")
    def _unique(self) -> Quiz:
        _no_duplicates([q.id for q in self.intro + self.outro], "quiz")
        return self


# --- content/<kota>/lessons/*.yaml dan items/*.yaml ------------------------


class ImageRef(Strict):
    src: Text  # relatif terhadap folder content/
    alt: Text
    license: Text


class KeyFact(Strict):
    text: Text
    chunk: Id


class Location(Strict):
    name: Text
    address: Text
    lat: Lat | None = None
    lng: Lng | None = None


class Lesson(Strict):
    id: Id
    title: Text
    narrative: Text
    key_facts: list[KeyFact] = Field(min_length=1)
    images: list[ImageRef] = Field(default_factory=list)
    location: Location | None = None
    suggested_questions: list[Text] = Field(default_factory=list)
    tier: Tier = "free"


class Item(Strict):
    id: Id
    name: Text
    rarity: Text
    short_explanation: Text
    image: ImageRef
    chunk: Id
    lesson: Id
    tier: Tier = "free"


# --- content/<kota>/knowledge/*.yaml ---------------------------------------


class Source(Strict):
    title: Text
    url: str | None = None
    type: Text  # mis. web, buku, jurnal, wawancara, museum
    accessed: date | None = None  # kosong = tertunda

    @model_validator(mode="after")
    def _web_needs_url(self) -> Source:
        if self.type == "web" and not self.url:
            raise ValueError("sumber bertipe web wajib punya url")
        return self


class Chunk(Strict):
    id: Id
    lesson_id: Id
    text: Text
    source: Source
    verified_by: str | None = None
    verified_at: date | None = None


# --- content/sources.yaml --------------------------------------------------


class AssetEntry(Strict):
    path: Text  # relatif terhadap folder content/
    license: Text
    author: str | None = None
    url: str | None = None
    note: str | None = None


class GameObject(Strict):
    """Objek yang dipakai di game (rintangan). Persetujuan anggota budaya dicatat di sini."""

    id: Id
    name: Text
    sensitive: bool = False
    approved_by: str | None = None
    note: str | None = None


class SourcesFile(Strict):
    assets: list[AssetEntry] = Field(default_factory=list)
    objects: list[GameObject] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique(self) -> SourcesFile:
        _no_duplicates([a.path for a in self.assets], "assets")
        _no_duplicates([o.id for o in self.objects], "objects")
        return self
