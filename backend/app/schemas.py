"""Skema konten Rupaloka (SDD §5).

Skema hanya memeriksa bentuk satu berkas. Pemeriksaan lintas berkas
(rujukan id, kelengkapan sumber, aset) ada di `content_loader`.
"""

from __future__ import annotations

import re
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
    unlock_every: int = Field(gt=0)  # meter lari per item (1 m = 10 poin skor)
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


class LeaderboardConfig(Strict):
    """Papan peringkat akhir tur kota (diputuskan tim 21 Nov 2026). Skor = total poin path."""

    enabled: bool = True
    champion_title: Text  # gelar peringkat 1, mis. "Si Paling Bandung"
    size: int = Field(default=10, ge=3, le=50)  # jumlah baris yang ditampilkan


class Rewards(Strict):
    """Poin path belajar (titik = materi, titik terakhir = game) dan lencana.

    Poin kota = titik materi selesai × points_per_node + jawaban fakta benar ×
    points_per_correct + jawaban nilai benar × points_per_value + refleksi yang dikenali ×
    points_per_reflection + (game_node_points bila game sudah dimainkan sekali) +
    skor game terbaik, dibatasi game_score_cap (agar batas papan peringkat tetap ada).
    """

    points_per_node: int = Field(default=100, ge=0)
    points_per_correct: int = Field(default=10, ge=0)
    # Soal nilai (kind: nilai) dan refleksi akhir tur diberi poin lebih besar agar peringkat
    # mencerminkan pemahaman, bukan kecepatan berlari (masukan juri, 25 Nov 2026).
    points_per_value: int = Field(default=30, ge=0)
    points_per_reflection: int = Field(default=50, ge=0)
    game_node_points: int = Field(default=100, ge=0)
    game_score_cap: int = Field(default=1000, ge=0)
    badges: list[Badge] = Field(default_factory=list)
    leaderboard: LeaderboardConfig | None = None

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


QuestionKind = Literal["fakta", "nilai"]


class QuizQuestion(Strict):
    id: Id
    # "nilai" = soal tentang nilai/makna budaya (bukan hafalan fakta); poinnya points_per_value.
    kind: QuestionKind = "fakta"
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


YOUTUBE_ID = re.compile(
    r"^https://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{11})(?:[&?#].*)?$"
)


class VideoRef(Strict):
    """Video YouTube pendukung materi (pengganti gambar materi, 21 Nov 2026)."""

    url: Text  # https://www.youtube.com/watch?v=<id> atau https://youtu.be/<id>
    title: Text
    channel: Text
    note: str | None = None  # catatan kurasi, mis. "kanal resmi"
    checked_by: str | None = None  # nama yang sudah menonton isinya (KH); kosong = tertunda

    @model_validator(mode="after")
    def _youtube_only(self) -> VideoRef:
        if not YOUTUBE_ID.match(self.url):
            raise ValueError(
                "url video harus tautan YouTube (youtube.com/watch?v=… atau youtu.be/…)"
            )
        return self


class KeyFact(Strict):
    text: Text
    chunk: Id


VisitKind = Literal["situs", "sanggar", "perajin", "jadwal"]


class VisitLink(Strict):
    """Tautan "Kunjungi": situs resmi, sanggar, perajin, atau jadwal pertunjukan komunitas."""

    label: Text
    url: Text
    kind: VisitKind
    note: str | None = None
    verified_by: str | None = None  # nama KH yang memeriksa tautan; kosong = tertunda

    @model_validator(mode="after")
    def _http_only(self) -> VisitLink:
        if not re.match(r"^https?://", self.url):
            raise ValueError("url tautan kunjungi harus diawali http:// atau https://")
        return self


class Location(Strict):
    name: Text
    address: Text
    lat: Lat | None = None
    lng: Lng | None = None
    links: list[VisitLink] = Field(default_factory=list)


class Lesson(Strict):
    id: Id
    title: Text
    narrative: Text
    key_facts: list[KeyFact] = Field(min_length=1)
    images: list[ImageRef] = Field(default_factory=list)
    videos: list[VideoRef] = Field(default_factory=list)
    location: Location | None = None
    suggested_questions: list[Text] = Field(default_factory=list)
    tier: Tier = "free"


class CardAspect(Strict):
    """Satu bagian kartu budaya: teks ditulis tim budaya, bersumber pada chunk."""

    text: Text
    chunk: Id


class Validator(Strict):
    """Budayawan/anggota komunitas yang memvalidasi kartu budaya."""

    name: Text
    role: str | None = None
    validated_at: date | None = None


class CultureCard(Strict):
    """Kartu budaya lengkap (masukan juri, 25 Nov 2026). Kosong = belum disusun (pending)."""

    nilai: CardAspect | None = None
    pengetahuan: CardAspect | None = None
    ekspresi: CardAspect | None = None
    fungsi: CardAspect | None = None
    community: CardAspect | None = None  # mis. "ekspresi budaya tradisional masyarakat Sunda"
    validator: Validator | None = None


CARD_ASPECTS = ("nilai", "pengetahuan", "ekspresi", "fungsi", "community")


class AccuracyCheck(Strict):
    """Pemeriksaan bentuk model 3D buatan tim oleh anggota budaya (KH)."""

    by: Text
    checked_at: date


class ItemModel(Strict):
    """Model 3D objek untuk galeri (SDD ADR 40). Berkas dicatat di sources.yaml → assets."""

    src: Text  # relatif terhadap content/, mis. assets/models/angklung.glb
    poster: Text | None = None  # gambar cadangan bila 3D gagal; kosong = item.image
    accuracy_check: AccuracyCheck | None = None


class Hotspot(Strict):
    """Titik penjelasan pada model; posisinya dari node `hotspot_<id>` di GLB.

    Teks dan chunk DIISI TIM BUDAYA; kosong = tidak ditampilkan (pending).
    """

    id: Id
    label: Text
    text: Text | None = None
    chunk: Id | None = None


class Item(Strict):
    id: Id
    name: Text
    rarity: Text
    short_explanation: Text
    image: ImageRef
    chunk: Id
    lesson: Id
    tier: Tier = "free"
    card: CultureCard | None = None
    model: ItemModel | None = None
    hotspots: list[Hotspot] = Field(default_factory=list)

    @model_validator(mode="after")
    def _hotspot_ids_unique(self) -> Item:
        _no_duplicates([h.id for h in self.hotspots], "hotspots")
        return self


# --- content/<kota>/gallery.yaml (opsional; galeri 3D, SDD ADR 40) ----------


class GalleryRoom(Strict):
    model: Text  # GLB lorong melingkar, relatif terhadap content/


class GalleryLayout(Strict):
    """Parameter lorong cincin; dibaca sama oleh frontend (cameraFlow.ts) dan validator."""

    radius: float = Field(default=6.0, ge=6.0)  # jari-jari garis tengah lorong (m)
    slots: int = Field(default=12, ge=1)  # jumlah pedestal di keliling
    first_d: float = Field(default=3.0, ge=0.0)  # jarak pedestal pertama dari titik awal (m)


class MuseumObject(Strict):
    """Objek khusus museum 3D (bukan item hadiah game). Teks DIISI dari chunk bersumber."""

    id: Id
    name: Text
    short_explanation: CardAspect | None = None  # kosong = "sedang disusun tim budaya"
    image: ImageRef | None = None
    model: ItemModel | None = None
    hotspots: list[Hotspot] = Field(default_factory=list)

    @model_validator(mode="after")
    def _hotspot_ids_unique(self) -> MuseumObject:
        _no_duplicates([h.id for h in self.hotspots], "hotspots")
        return self


class GalleryExhibit(Strict):
    """Satu pedestal: item koleksi yang sudah ada (`item`) ATAU objek khusus museum (`object`)."""

    item: Id | None = None
    object: MuseumObject | None = None
    asal_usul: CardAspect | None = None  # cerita asal usul bersumber; kosong = pending

    @model_validator(mode="after")
    def _one_kind(self) -> GalleryExhibit:
        if (self.item is None) == (self.object is None):
            raise ValueError("isi tepat salah satu: item atau object")
        return self

    @property
    def key(self) -> str:
        return self.item if self.item is not None else self.object.id  # type: ignore[union-attr]


class GalleryGuide(Strict):
    """Maskot pemandu di galeri (model GLB); jawabannya tetap lewat agen bersumber."""

    model: Text


class KhApproval(Strict):
    name: Text
    approved_at: date


class GalleryFile(Strict):
    room: GalleryRoom
    layout: GalleryLayout = Field(default_factory=GalleryLayout)
    exhibits: list[GalleryExhibit] = Field(min_length=1)  # urutan = pedestal_1, pedestal_2, ...
    guide: GalleryGuide | None = None
    approved_by_kh: KhApproval | None = None

    @model_validator(mode="after")
    def _check(self) -> GalleryFile:
        _no_duplicates([e.key for e in self.exhibits], "exhibits")
        if len(self.exhibits) > self.layout.slots:
            raise ValueError(
                f"{len(self.exhibits)} exhibits melebihi layout.slots ({self.layout.slots})"
            )
        return self


# --- content/<kota>/reflection.yaml (opsional) -----------------------------


class ReflectionValue(Strict):
    """Nilai yang diharapkan muncul di jawaban refleksi; kata kunci ditulis tim budaya."""

    id: Id
    label: Text
    keywords: list[Text] = Field(default_factory=list)
    explanation: CardAspect | None = None


class ReflectionQuestion(Strict):
    id: Id
    lesson: Id | None = None
    prompt: Text
    values: list[ReflectionValue] = Field(default_factory=list)
    feedback_match: Text
    feedback_miss: Text

    @model_validator(mode="after")
    def _unique(self) -> ReflectionQuestion:
        _no_duplicates([v.id for v in self.values], "values")
        return self


class ReflectionFile(Strict):
    questions: list[ReflectionQuestion] = Field(default_factory=list)

    @model_validator(mode="after")
    def _unique(self) -> ReflectionFile:
        _no_duplicates([q.id for q in self.questions], "reflection")
        return self


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
