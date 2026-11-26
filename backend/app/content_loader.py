"""Memuat dan memvalidasi folder `content/` (SDD §5.3).

Ada dua tingkat masalah:
- ``error``: struktur rusak (skema, rujukan id, opsi kuis, objek sakral sebagai rintangan).
  Selalu menggagalkan validasi.
- ``pending``: data yang belum diisi atau belum diverifikasi (sumber, koordinat, lisensi,
  jumlah konten). Peringatan saat pengembangan, galat saat rilis (``--release``).
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, TypeVar

import yaml
from pydantic import BaseModel, ValidationError

from app.glb import GlbError, read_nodes_file
from app.ring import ring_point
from app.schemas import (
    CARD_ASPECTS,
    AgentScript,
    Chunk,
    City,
    CityConfig,
    GalleryFile,
    ImageRef,
    Item,
    Lesson,
    Quiz,
    ReflectionFile,
    SourcesFile,
)

Severity = Literal["error", "pending"]
M = TypeVar("M", bound=BaseModel)

# Target konten per kota (PRD §9, F-020, F-030). Kekurangan = pending.
QUIZ_INTRO_COUNT = 5
LESSON_COUNT_RANGE = (3, 5)  # titik path materi; titik game ditambah otomatis
MIN_CHUNKS_PER_LESSON = 8
NARRATIVE_WORDS = (100, 200)
ITEM_EXPLANATION_MAX_WORDS = 60

# Galeri 3D (SDD ADR 40): batas ukuran GLB dan toleransi posisi pedestal.
MB = 1024 * 1024
MAX_OBJECT_MODEL_BYTES = 3 * MB
MAX_ROOM_MODEL_BYTES = 8 * MB
MAX_GALLERY_BYTES = 15 * MB
PEDESTAL_TOLERANCE_M = 0.1

_BRACKET_PLACEHOLDER = re.compile(r"\[[^\]]*\]")


def is_unfilled(value: str | None) -> bool:
    """True bila nilai kosong atau penanda seperti `[PERLU DIISI]`, `[nama]`, `TODO`, `...`."""
    if value is None:
        return True
    text = value.strip()
    return (
        text in {"", "...", "…"}
        or "PERLU DIISI" in text
        or "TODO" in text
        or _BRACKET_PLACEHOLDER.fullmatch(text) is not None
    )


@dataclass(frozen=True)
class Issue:
    severity: Severity
    file: str
    message: str


@dataclass
class CityContent:
    config: CityConfig
    agent_script: AgentScript | None
    quiz: Quiz | None
    lessons: dict[str, Lesson]
    items: dict[str, Item]
    chunks: dict[str, Chunk]
    reflection: ReflectionFile | None = None
    gallery: GalleryFile | None = None
    # Berkas model galeri (relatif ke content/) yang benar-benar ada; API memakai ini agar
    # klien tidak meminta berkas yang belum dibuat (langsung pakai pengganti).
    models_present: set[str] = field(default_factory=set)


@dataclass
class Content:
    cities: list[City]
    sources: SourcesFile | None
    city_content: dict[str, CityContent]


@dataclass
class LoadResult:
    content: Content
    issues: list[Issue] = field(default_factory=list)

    def errors(self, release: bool) -> list[Issue]:
        return [i for i in self.issues if i.severity == "error" or release]

    def warnings(self, release: bool) -> list[Issue]:
        return [] if release else [i for i in self.issues if i.severity == "pending"]

    def ok(self, release: bool) -> bool:
        return not self.errors(release)


def load_content(root: Path) -> LoadResult:
    """Muat konten di `root` dan kumpulkan semua masalah (tidak berhenti di galat pertama)."""
    return _Loader(root).run()


class _Loader:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.issues: list[Issue] = []

    # --- pelaporan ---------------------------------------------------------

    def _rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return path.as_posix()

    def error(self, path: Path, message: str) -> None:
        self.issues.append(Issue("error", self._rel(path), message))

    def pending(self, path: Path, message: str) -> None:
        self.issues.append(Issue("pending", self._rel(path), message))

    # --- membaca berkas ----------------------------------------------------

    def _read_yaml(self, path: Path) -> Any:
        if not path.is_file():
            self.error(path, "berkas tidak ditemukan")
            return None
        try:
            return yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as exc:
            self.error(path, f"YAML tidak valid: {exc}")
            return None

    def _validate(self, model: type[M], data: Any, path: Path, prefix: str = "") -> M | None:
        try:
            obj = model.model_validate(data)
        except ValidationError as exc:
            for err in exc.errors():
                loc = ".".join(str(p) for p in err["loc"])
                where = f"{prefix}{loc}" if loc else prefix.rstrip(".") or "(akar)"
                self.error(path, f"{where}: {err['msg']}")
            return None
        self._check_placeholders(obj, path, prefix)
        return obj

    def _load_one(self, model: type[M], path: Path) -> M | None:
        data = self._read_yaml(path)
        if data is None:
            if path.is_file():
                self.error(path, "berkas kosong")
            return None
        return self._validate(model, data, path)

    def _load_list(self, model: type[M], path: Path) -> list[M]:
        data = self._read_yaml(path)
        if data is None:
            return []
        if not isinstance(data, list):
            self.error(path, "isi berkas harus berupa daftar (list)")
            return []
        out: list[M] = []
        for i, entry in enumerate(data):
            obj = self._validate(model, entry, path, prefix=f"[{i}].")
            if obj is not None:
                out.append(obj)
        return out

    def _check_placeholders(self, obj: BaseModel, path: Path, prefix: str) -> None:
        for loc, value in _iter_strings(obj.model_dump(mode="python")):
            if is_unfilled(value):
                self.pending(path, f"{prefix}{loc}: belum diisi ({value!r})")

    # --- alur utama --------------------------------------------------------

    def run(self) -> LoadResult:
        if not self.root.is_dir():
            self.issues.append(
                Issue("error", self.root.as_posix(), "folder konten tidak ditemukan")
            )
            return LoadResult(Content([], None, {}), self.issues)

        cities_path = self.root / "cities.yaml"
        cities = self._load_list(City, cities_path)
        _report_duplicates(self, cities_path, [c.id for c in cities], "kota")
        sources = self._load_one(SourcesFile, self.root / "sources.yaml")

        city_content: dict[str, CityContent] = {}
        for city in cities:
            loaded = self._load_city(city, cities_path, sources)
            if loaded is not None:
                city_content[city.id] = loaded
        return LoadResult(Content(cities, sources, city_content), self.issues)

    def _load_city(
        self, city: City, cities_path: Path, sources: SourcesFile | None
    ) -> CityContent | None:
        city_dir = self.root / city.id
        config_path = city_dir / "city.yaml"

        if city.status == "coming_soon":
            if config_path.exists():
                self.error(
                    config_path, f"kota '{city.id}' berstatus coming_soon tetapi punya city.yaml"
                )
            return None

        if city.lat is None or city.lng is None:
            self.pending(
                cities_path, f"kota '{city.id}': koordinat titik peta (lat/lng) belum diisi"
            )

        config = self._load_one(CityConfig, config_path)
        if config is None:
            return None
        if config.id != city.id:
            self.error(config_path, f"id '{config.id}' tidak sama dengan id kota '{city.id}'")

        agent_script = self._load_one(AgentScript, city_dir / "agent_script.yaml")
        quiz = self._load_one(Quiz, city_dir / "quiz.yaml")
        lessons = self._load_by_id(Lesson, city_dir / "lessons", config.lessons, "materi")
        items = self._load_by_id(Item, city_dir / "items", config.game.items_order, "item")
        chunks = self._load_chunks(city_dir / "knowledge")
        reflection_path = city_dir / "reflection.yaml"
        reflection = (
            self._load_one(ReflectionFile, reflection_path) if reflection_path.is_file() else None
        )

        gallery_path = city_dir / "gallery.yaml"
        gallery = self._load_one(GalleryFile, gallery_path) if gallery_path.is_file() else None

        content = CityContent(
            config, agent_script, quiz, lessons, items, chunks, reflection, gallery
        )
        self._check_city(city_dir, content, sources)
        return content

    def _load_by_id(self, model: type[M], folder: Path, ids: list[str], label: str) -> dict[str, M]:
        out: dict[str, M] = {}
        for id_ in ids:
            path = folder / f"{id_}.yaml"
            if not path.is_file():
                self.error(path, f"{label} '{id_}' dirujuk di city.yaml tetapi berkasnya tidak ada")
                continue
            obj = self._load_one(model, path)
            if obj is None:
                continue
            if obj.id != id_:  # type: ignore[attr-defined]
                self.error(path, f"id '{obj.id}' harus sama dengan nama berkas '{id_}'")  # type: ignore[attr-defined]
                continue
            out[id_] = obj
        return out

    def _load_chunks(self, folder: Path) -> dict[str, Chunk]:
        chunks: dict[str, Chunk] = {}
        if not folder.is_dir():
            self.error(folder, "folder knowledge/ tidak ditemukan")
            return chunks
        for path in sorted(folder.glob("*.yaml")):
            for chunk in self._load_list(Chunk, path):
                if chunk.id in chunks:
                    self.error(path, f"id chunk ganda: '{chunk.id}'")
                    continue
                chunks[chunk.id] = chunk
                if chunk.source.accessed is None:
                    self.pending(path, f"chunk '{chunk.id}': source.accessed belum diisi")
                if is_unfilled(chunk.verified_by) or chunk.verified_at is None:
                    self.pending(path, f"chunk '{chunk.id}': verified_by/verified_at belum diisi")
        return chunks

    # --- pemeriksaan lintas berkas -----------------------------------------

    def _check_city(self, city_dir: Path, c: CityContent, sources: SourcesFile | None) -> None:
        config_path = city_dir / "city.yaml"
        lesson_ids = set(c.config.lessons)

        def need_chunk(path: Path, where: str, chunk_id: str) -> None:
            if chunk_id not in c.chunks:
                self.error(path, f"{where}: chunk '{chunk_id}' tidak ada di knowledge/")

        # Chunk -> materi
        for chunk in c.chunks.values():
            if chunk.lesson_id not in lesson_ids:
                self.error(
                    city_dir / "knowledge",
                    f"chunk '{chunk.id}': lesson_id '{chunk.lesson_id}' bukan materi kota ini",
                )
        for lesson_id in c.config.lessons:
            n = sum(1 for ch in c.chunks.values() if ch.lesson_id == lesson_id)
            if n < MIN_CHUNKS_PER_LESSON:
                self.pending(
                    city_dir / "knowledge",
                    f"materi '{lesson_id}': {n} chunk (target minimal {MIN_CHUNKS_PER_LESSON})",
                )

        # Kuis
        quiz_path = city_dir / "quiz.yaml"
        if c.quiz is not None:
            for q in c.quiz.intro + c.quiz.outro:
                need_chunk(quiz_path, f"soal '{q.id}'", q.chunk)
            # Path: tiap titik materi sebaiknya punya minimal satu soal kuis.
            quiz_lessons = {
                c.chunks[q.chunk].lesson_id for q in c.quiz.intro if q.chunk in c.chunks
            }
            for lesson_id in c.config.lessons:
                if lesson_id not in quiz_lessons:
                    self.pending(quiz_path, f"titik path '{lesson_id}' belum punya soal kuis")
            # Kuis akhir tiap titik memuat minimal satu soal nilai (masukan juri, 25 Nov 2026).
            post = c.quiz.outro or c.quiz.intro
            value_lessons = {
                c.chunks[q.chunk].lesson_id
                for q in post
                if q.kind == "nilai" and q.chunk in c.chunks
            }
            for lesson_id in c.config.lessons:
                if lesson_id not in value_lessons:
                    self.pending(
                        quiz_path, f"titik path '{lesson_id}' belum punya soal nilai (kind: nilai)"
                    )
            if len(c.quiz.intro) != QUIZ_INTRO_COUNT:
                self.pending(
                    quiz_path,
                    f"kuis dasar berisi {len(c.quiz.intro)} soal (target {QUIZ_INTRO_COUNT})",
                )

        # Materi
        lo, hi = LESSON_COUNT_RANGE
        if not lo <= len(c.config.lessons) <= hi:
            self.pending(config_path, f"jumlah materi {len(c.config.lessons)} (target {lo}-{hi})")
        for lesson in c.lessons.values():
            path = city_dir / "lessons" / f"{lesson.id}.yaml"
            for i, fact in enumerate(lesson.key_facts):
                need_chunk(path, f"key_facts[{i}]", fact.chunk)
            words = len(lesson.narrative.split())
            if not NARRATIVE_WORDS[0] <= words <= NARRATIVE_WORDS[1]:
                self.pending(
                    path,
                    f"narrative {words} kata (target {NARRATIVE_WORDS[0]}-{NARRATIVE_WORDS[1]})",
                )
            if lesson.location is not None and (
                lesson.location.lat is None or lesson.location.lng is None
            ):
                self.pending(path, "location: lat/lng belum diisi (tombol lokasi butuh koordinat)")
            if lesson.location is not None:
                for i, link in enumerate(lesson.location.links):
                    if is_unfilled(link.verified_by):
                        self.pending(
                            path, f"location.links[{i}]: tautan belum diperiksa (verified_by)"
                        )
            for i, image in enumerate(lesson.images):
                self._check_image(path, f"images[{i}]", image, sources)
            for i, video in enumerate(lesson.videos):
                if not video.checked_by:
                    self.pending(
                        path, f"videos[{i}]: isi video belum ditonton/diperiksa (checked_by)"
                    )

        # Item
        for item in c.items.values():
            path = city_dir / "items" / f"{item.id}.yaml"
            need_chunk(path, "chunk", item.chunk)
            if item.lesson not in lesson_ids:
                self.error(path, f"lesson '{item.lesson}' bukan materi kota ini")
            words = len(item.short_explanation.split())
            if words > ITEM_EXPLANATION_MAX_WORDS:
                self.pending(
                    path,
                    f"short_explanation {words} kata (maksimal {ITEM_EXPLANATION_MAX_WORDS})",
                )
            self._check_image(path, "image", item.image, sources)
            self._check_card(path, item, need_chunk)
            if item.hotspots and item.model is None:
                self.error(path, "hotspots butuh model 3D (model.src)")
            for h in item.hotspots:
                if h.chunk is not None:
                    need_chunk(path, f"hotspot '{h.id}'", h.chunk)

        # Galeri 3D (opsional)
        if c.gallery is not None:
            self._check_gallery(city_dir, c, sources, need_chunk)

        # Refleksi akhir tur (opsional)
        if c.reflection is not None:
            ref_path = city_dir / "reflection.yaml"
            for q in c.reflection.questions:
                if q.lesson is not None and q.lesson not in lesson_ids:
                    self.error(
                        ref_path, f"refleksi '{q.id}': lesson '{q.lesson}' bukan materi kota ini"
                    )
                if not q.values:
                    self.pending(ref_path, f"refleksi '{q.id}': daftar nilai (values) belum diisi")
                for v in q.values:
                    if not v.keywords:
                        self.pending(ref_path, f"refleksi '{q.id}' nilai '{v.id}': keywords kosong")
                    if v.explanation is None:
                        self.pending(
                            ref_path, f"refleksi '{q.id}' nilai '{v.id}': explanation belum diisi"
                        )
                    else:
                        need_chunk(
                            ref_path, f"refleksi '{q.id}' nilai '{v.id}'", v.explanation.chunk
                        )

        # Rintangan (PRD §7)
        objects = {o.id: o for o in sources.objects} if sources else {}
        for obstacle in c.config.game.obstacles:
            obj = objects.get(obstacle)
            if obj is None:
                self.pending(
                    config_path,
                    f"rintangan '{obstacle}' belum terdaftar di sources.yaml (objects)",
                )
            elif obj.sensitive:
                self.error(
                    config_path,
                    f"rintangan '{obstacle}' ditandai sensitive di sources.yaml; "
                    "objek budaya/sakral tidak boleh jadi rintangan",
                )
            elif is_unfilled(obj.approved_by):
                self.pending(config_path, f"rintangan '{obstacle}' belum disetujui (approved_by)")

    def _check_gallery(
        self, city_dir: Path, c: CityContent, sources: SourcesFile | None, need_chunk: Any
    ) -> None:
        assert c.gallery is not None
        g = c.gallery
        gallery_path = city_dir / "gallery.yaml"
        registered = {a.path for a in sources.assets} if sources else set()
        if g.approved_by_kh is None:
            self.pending(gallery_path, "approved_by_kh: isi galeri belum disetujui anggota budaya")

        room_nodes = self._check_model_file(
            gallery_path, "room.model", g.room.model, MAX_ROOM_MODEL_BYTES, registered
        )
        if room_nodes is not None:
            c.models_present.add(g.room.model)
        total = self._size(g.room.model)
        if room_nodes is not None:
            self._check_pedestals(gallery_path, c, room_nodes)

        for i, exhibit in enumerate(g.exhibits):
            where = f"exhibits[{i}] ({exhibit.key})"
            if exhibit.asal_usul is None:
                self.pending(gallery_path, f"{where}: asal_usul (cerita asal usul) belum diisi")
            else:
                need_chunk(gallery_path, f"{where}.asal_usul", exhibit.asal_usul.chunk)

            if exhibit.item is not None:
                item = c.items.get(exhibit.item)
                if item is None:
                    self.error(gallery_path, f"{where}: item '{exhibit.item}' tidak ada di items/")
                    continue
                path = city_dir / "items" / f"{item.id}.yaml"
                model, hotspots = item.model, item.hotspots
            else:
                obj = exhibit.object
                assert obj is not None
                path = gallery_path
                model, hotspots = obj.model, obj.hotspots
                if obj.short_explanation is None:
                    self.pending(path, f"{where}: short_explanation belum diisi")
                else:
                    need_chunk(path, f"{where}.short_explanation", obj.short_explanation.chunk)
                if obj.image is not None:
                    self._check_image(path, f"{where}.image", obj.image, sources)
                if hotspots and model is None:
                    self.error(path, f"{where}: hotspots butuh model 3D (model.src)")
                for h in hotspots:
                    if h.chunk is not None:
                        need_chunk(path, f"{where} hotspot '{h.id}'", h.chunk)

            if model is None:
                self.pending(path, "model 3D belum ada (model.src) untuk galeri")
                continue
            if model.accuracy_check is None:
                self.pending(path, f"{where} model.accuracy_check: bentuk model belum diperiksa KH")
            if model.poster is not None and not (self.root / model.poster).is_file():
                self.pending(path, f"model.poster: berkas '{model.poster}' belum ada")
            for h in hotspots:
                if h.text is None or h.chunk is None:
                    self.pending(path, f"hotspot '{h.id}': teks belum diisi (text/chunk)")
            nodes = self._check_model_file(
                path, "model.src", model.src, MAX_OBJECT_MODEL_BYTES, registered
            )
            if nodes is not None:
                c.models_present.add(model.src)
            total += self._size(model.src)
            if nodes is not None:
                for h in hotspots:
                    if f"hotspot_{h.id}" not in nodes:
                        self.error(
                            path, f"hotspot '{h.id}': node 'hotspot_{h.id}' tidak ada di GLB"
                        )

        if g.guide is not None:
            if (
                self._check_model_file(
                    gallery_path, "guide.model", g.guide.model, MAX_OBJECT_MODEL_BYTES, registered
                )
                is not None
            ):
                c.models_present.add(g.guide.model)
            total += self._size(g.guide.model)

        for d in g.decor:
            if (
                self._check_model_file(
                    gallery_path, f"decor '{d.id}'", d.model, MAX_OBJECT_MODEL_BYTES, registered
                )
                is not None
            ):
                c.models_present.add(d.model)
            total += self._size(d.model)

        if total > MAX_GALLERY_BYTES:
            self.error(
                gallery_path,
                f"total model galeri {total / MB:.1f} MB melebihi {MAX_GALLERY_BYTES // MB} MB",
            )

    def _size(self, rel: str) -> int:
        f = self.root / rel
        return f.stat().st_size if f.is_file() else 0

    def _check_model_file(
        self, path: Path, where: str, rel: str, max_bytes: int, registered: set[str]
    ) -> dict[str, tuple[float, float, float]] | None:
        """Periksa satu GLB; kembalikan node-nya bila berkas ada dan terbaca."""
        if rel not in registered:
            self.pending(path, f"{where}: '{rel}' belum tercatat di sources.yaml (assets)")
        f = self.root / rel
        if not f.is_file():
            self.pending(path, f"{where}: berkas model '{rel}' belum ada")
            return None
        size = f.stat().st_size
        if size > max_bytes:
            self.error(
                path, f"{where}: '{rel}' {size / MB:.1f} MB melebihi batas {max_bytes // MB} MB"
            )
        try:
            return read_nodes_file(f)
        except GlbError as exc:
            self.error(path, f"{where}: '{rel}' tidak terbaca: {exc}")
            return None

    def _check_pedestals(
        self, path: Path, c: CityContent, nodes: dict[str, tuple[float, float, float]]
    ) -> None:
        assert c.gallery is not None
        layout = c.gallery.layout
        for i in range(layout.slots):
            name = f"pedestal_{i + 1}"
            if name not in nodes:
                self.error(path, f"room.model: node '{name}' tidak ada di GLB ruangan")
                continue
            x, _, z = nodes[name]
            ex, ez = ring_point(layout, i)
            if abs(x - ex) > PEDESTAL_TOLERANCE_M or abs(z - ez) > PEDESTAL_TOLERANCE_M:
                self.error(
                    path,
                    f"room.model: {name} di ({x:.2f}, {z:.2f}), "
                    f"seharusnya ({ex:.2f}, {ez:.2f}) sesuai layout",
                )

    def _check_card(self, path: Path, item: Item, need_chunk: Any) -> None:
        card = item.card
        if card is None:
            self.pending(path, "card: kartu budaya belum disusun")
            return
        for name in CARD_ASPECTS:
            aspect = getattr(card, name)
            if aspect is None:
                self.pending(path, f"card.{name}: belum diisi")
            else:
                need_chunk(path, f"card.{name}", aspect.chunk)
        if card.validator is None:
            self.pending(path, "card.validator: kartu belum divalidasi budayawan")

    def _check_image(
        self, path: Path, where: str, image: ImageRef, sources: SourcesFile | None
    ) -> None:
        if not (self.root / image.src).is_file():
            self.pending(path, f"{where}: berkas gambar '{image.src}' belum ada")
        registered = {a.path for a in sources.assets} if sources else set()
        if image.src not in registered:
            self.pending(path, f"{where}: '{image.src}' belum tercatat di sources.yaml (assets)")


def _iter_strings(value: Any, loc: str = "") -> Iterator[tuple[str, str]]:
    if isinstance(value, str):
        yield loc, value
    elif isinstance(value, dict):
        for k, v in value.items():
            yield from _iter_strings(v, f"{loc}.{k}" if loc else str(k))
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from _iter_strings(v, f"{loc}[{i}]")


def _report_duplicates(loader: _Loader, path: Path, ids: list[str], label: str) -> None:
    seen: set[str] = set()
    for id_ in ids:
        if id_ in seen:
            loader.error(path, f"id {label} ganda: '{id_}'")
        seen.add(id_)
