"""Aplikasi FastAPI Rupaloka (SDD §8).

Jalankan dari folder backend/:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api_schemas import (
    CityDetail,
    CitySummary,
    ExhibitOut,
    GalleryOut,
    Health,
    LeaderboardEntry,
    LeaderboardResponse,
    ReflectionPrompt,
    ScoreSubmit,
    SourceRef,
    SourcesResponse,
    YourRank,
)
from app.chat import ChatRequest, ChatResponse, ChatService, RateLimiter, UnknownContext
from app.config import Settings
from app.content_loader import CityContent, Content, load_content
from app.leaderboard import (
    LeaderboardStore,
    NicknameError,
    StoreError,
    build_store,
    clean_nickname,
    max_points,
    reflection_questions,
)
from app.llm import LLM, GeminiLLM, LLMError
from app.reflection import ReflectionRequest, ReflectionResult, assess
from app.retrieval import Retriever
from app.schemas import CARD_ASPECTS, City
from app.security import add_security_headers, client_ip

logger = logging.getLogger("rupaloka")

CONTENT_CACHE = "public, max-age=300"


class ContentError(RuntimeError):
    """Konten tidak lolos validasi; server menolak start agar tidak menyajikan konten rusak."""


def load_validated_content(settings: Settings) -> Content:
    result = load_content(settings.content_dir)
    errors = result.errors(release=settings.content_strict)
    for issue in result.warnings(release=settings.content_strict):
        logger.warning("konten: %s: %s", issue.file, issue.message)
    if errors:
        for issue in errors:
            logger.error("konten: %s: %s", issue.file, issue.message)
        raise ContentError(
            f"{len(errors)} galat konten; jalankan scripts/validate_content.py untuk rinciannya"
        )
    return result.content


def build_llm(settings: Settings) -> LLM | None:
    if not settings.gemini_api_key:
        logger.warning(
            "GEMINI_API_KEY belum diatur; /api/chat menjawab 503 untuk pertanyaan dalam cakupan"
        )
        return None
    return GeminiLLM(settings.gemini_api_key, settings.gemini_model, settings.llm_timeout_s)


def create_app(
    settings: Settings | None = None,
    llm: LLM | None = None,
    leaderboard: LeaderboardStore | None = None,
) -> FastAPI:
    settings = settings or Settings.from_env()
    limiter = RateLimiter(settings.rate_limit_per_min)
    global_limiter = RateLimiter(settings.global_rate_limit_per_min)
    board_limiter = RateLimiter(settings.leaderboard_rate_limit_per_min)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.content = load_validated_content(settings)
        app.state.retriever = Retriever.from_content(app.state.content)
        app.state.chat = ChatService(
            app.state.content,
            app.state.retriever,
            llm if llm is not None else build_llm(settings),
            settings,
        )
        app.state.leaderboard = leaderboard or build_store(
            settings.supabase_url, settings.supabase_service_role_key
        )
        yield

    docs = settings.enable_docs
    app = FastAPI(
        title="Rupaloka API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if docs else None,
        redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )
    app.middleware("http")(add_security_headers)
    # Gambar konten (content/assets). `src` di konten relatif ke content/, jadi URL-nya
    # adalah "/api/" + src, mis. assets/images/x.webp -> /api/assets/images/x.webp.
    app.mount(
        "/api/assets",
        StaticFiles(directory=settings.content_dir / "assets", check_dir=False),
        name="assets",
    )
    if settings.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.allowed_origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    def content(request: Request) -> Content:
        return request.app.state.content  # type: ignore[no-any-return]

    @app.get("/api/health", response_model=Health)
    def health(request: Request) -> Health:
        c = content(request)
        return Health(
            status="ok",
            cities=len(c.cities),
            active_cities=sum(1 for city in c.cities if city.status == "active"),
        )

    @app.get("/api/content/cities", response_model=list[CitySummary])
    def list_cities(request: Request, response: Response) -> list[CitySummary]:
        response.headers["Cache-Control"] = CONTENT_CACHE
        c = content(request)
        out: list[CitySummary] = []
        for city in c.cities:
            cc = c.city_content.get(city.id)
            out.append(
                CitySummary(
                    **city.model_dump(),
                    lesson_count=len(cc.lessons) if cc else None,
                    item_count=len(cc.items) if cc else None,
                )
            )
        return out

    @app.get("/api/content/cities/{city_id}", response_model=CityDetail)
    def city_detail(city_id: str, request: Request, response: Response) -> CityDetail:
        c = content(request)
        city = next((x for x in c.cities if x.id == city_id), None)
        if city is None:
            raise HTTPException(status_code=404, detail="kota tidak dikenal")
        cc = c.city_content.get(city_id)
        if cc is None:
            raise HTTPException(status_code=404, detail="kota belum tersedia")
        response.headers["Cache-Control"] = CONTENT_CACHE
        return _city_detail(city, cc)

    @app.get("/api/content/sources", response_model=SourcesResponse)
    def sources(request: Request, response: Response) -> SourcesResponse:
        response.headers["Cache-Control"] = CONTENT_CACHE
        c = content(request)
        refs = {}
        for cc in c.city_content.values():
            for chunk in cc.chunks.values():
                key = (chunk.source.title, chunk.source.url, chunk.source.type)
                refs.setdefault(key, chunk.source)
        return SourcesResponse(
            assets=c.sources.assets if c.sources else [],
            references=sorted(refs.values(), key=lambda s: s.title.lower()),
        )

    @app.post("/api/chat", response_model=ChatResponse)
    async def chat(req: ChatRequest, request: Request, response: Response) -> ChatResponse:
        # Jawaban bergantung pada pertanyaan pengguna; jangan disimpan proxy/peramban.
        response.headers["Cache-Control"] = "no-store"
        too_many = {"Retry-After": "60", "Cache-Control": "no-store"}
        if not limiter.allow(client_ip(request, settings.trusted_proxy_hops)):
            raise HTTPException(
                status_code=429,
                detail="terlalu banyak pertanyaan; coba lagi nanti",
                headers=too_many,
            )
        # Setelah batas per IP: satu IP yang membanjiri tidak menghabiskan kuota global.
        if not global_limiter.allow("*"):
            logger.warning("chat: batas laju global tercapai")
            raise HTTPException(
                status_code=429, detail="agen sedang ramai; coba lagi sebentar", headers=too_many
            )
        service: ChatService = request.app.state.chat
        try:
            return await service.answer(req)
        except UnknownContext as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except LLMError as exc:
            logger.warning("chat: LLM tidak tersedia: %s", exc)
            raise HTTPException(status_code=503, detail="agen sedang tidak tersedia") from exc

    @app.post("/api/reflection", response_model=ReflectionResult)
    async def reflection(
        req: ReflectionRequest, request: Request, response: Response
    ) -> ReflectionResult:
        # Jawaban pemain tidak disimpan maupun dicatat; jangan di-cache.
        response.headers["Cache-Control"] = "no-store"
        if not limiter.allow(client_ip(request, settings.trusted_proxy_hops)):
            raise HTTPException(
                status_code=429,
                detail="terlalu sering mengirim; coba lagi nanti",
                headers={"Retry-After": "60", "Cache-Control": "no-store"},
            )
        cc = content(request).city_content.get(req.city_id)
        question = next(
            (q for q in reflection_questions(cc) if q.id == req.question_id) if cc else iter(()),
            None,
        )
        if question is None:
            raise HTTPException(status_code=404, detail="soal refleksi tidak dikenal")
        service: ChatService = request.app.state.chat
        # Kuota global LLM dipakai bersama chat; bila habis, nilai dengan kata kunci saja.
        llm = service.llm if global_limiter.allow("*") else None
        return await assess(question, req.answer, llm)

    def board_city(request: Request, city_id: str) -> tuple[CityContent, str, int]:
        cc = content(request).city_content.get(city_id)
        cfg = cc.config.rewards.leaderboard if cc else None
        if cc is None or cfg is None or not cfg.enabled:
            raise HTTPException(status_code=404, detail="papan peringkat kota ini belum tersedia")
        return cc, cfg.champion_title, cfg.size

    def board_response(
        request: Request, city_id: str, player_id: str | None
    ) -> LeaderboardResponse:
        cc, title, size = board_city(request, city_id)
        store: LeaderboardStore = request.app.state.leaderboard
        try:
            rows = store.top(city_id, size)
            you = store.rank_of(city_id, player_id) if player_id else None
        except StoreError as exc:
            logger.warning("leaderboard: penyimpanan gagal: %s", exc)
            raise HTTPException(
                status_code=503, detail="papan peringkat sedang tidak tersedia"
            ) from exc
        return LeaderboardResponse(
            city_id=city_id,
            champion_title=title,
            max_points=max_points(cc),
            entries=[
                LeaderboardEntry(
                    rank=i,
                    nickname=r.nickname,
                    points=r.points,
                    title=title if i == 1 else None,
                )
                for i, r in enumerate(rows, start=1)
            ],
            you=YourRank(rank=you[0], points=you[1]) if you else None,
        )

    @app.get("/api/leaderboard/{city_id}", response_model=LeaderboardResponse)
    def get_leaderboard(
        city_id: str, request: Request, response: Response, player_id: UUID | None = None
    ) -> LeaderboardResponse:
        response.headers["Cache-Control"] = "no-store"
        return board_response(request, city_id, str(player_id) if player_id else None)

    @app.post("/api/leaderboard/{city_id}", response_model=LeaderboardResponse)
    def submit_score(
        city_id: str, body: ScoreSubmit, request: Request, response: Response
    ) -> LeaderboardResponse:
        response.headers["Cache-Control"] = "no-store"
        cc, _, _ = board_city(request, city_id)
        if not board_limiter.allow(client_ip(request, settings.trusted_proxy_hops)):
            raise HTTPException(
                status_code=429,
                detail="terlalu sering mengirim skor; coba lagi nanti",
                headers={"Retry-After": "60"},
            )
        try:
            nickname = clean_nickname(body.nickname)
        except NicknameError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        if body.points > max_points(cc):
            raise HTTPException(status_code=422, detail="poin melebihi batas kota ini")
        store: LeaderboardStore = request.app.state.leaderboard
        try:
            store.submit(city_id, str(body.player_id), nickname, body.points)
        except StoreError as exc:
            logger.warning("leaderboard: gagal menyimpan: %s", exc)
            raise HTTPException(
                status_code=503, detail="papan peringkat sedang tidak tersedia"
            ) from exc
        return board_response(request, city_id, str(body.player_id))

    return app


def _gallery_out(cc: CityContent) -> GalleryOut | None:
    g = cc.gallery
    if g is None:
        return None
    exhibits: list[ExhibitOut] = []
    for ex in g.exhibits:
        if ex.item is not None:
            item = cc.items.get(ex.item)
            if item is None:
                continue
            name, model, hotspots, image = item.name, item.model, item.hotspots, item.image
            short, short_chunk = item.short_explanation, item.chunk
            kind = "item"
        else:
            obj = ex.object
            assert obj is not None
            name, model, hotspots, image = obj.name, obj.model, obj.hotspots, obj.image
            short = obj.short_explanation.text if obj.short_explanation else None
            short_chunk = obj.short_explanation.chunk if obj.short_explanation else None
            kind = "object"
        exhibits.append(
            ExhibitOut(
                id=ex.key,
                kind=kind,
                name=name,
                short_explanation=short,
                short_chunk=short_chunk,
                asal_usul=ex.asal_usul,
                image=image,
                model_src=model.src if model else None,
                model_available=bool(model and model.src in cc.models_present),
                accuracy_by=model.accuracy_check.by if model and model.accuracy_check else None,
                hotspots=[h for h in hotspots if h.text and h.chunk],
            )
        )
    return GalleryOut(
        layout=g.layout,
        room_model=g.room.model,
        room_available=g.room.model in cc.models_present,
        exhibits=exhibits,
        guide_model=g.guide.model if g.guide else None,
        guide_available=bool(g.guide and g.guide.model in cc.models_present),
        approved=g.approved_by_kh is not None,
    )


def _city_detail(city: City, cc: CityContent) -> CityDetail:
    # Validasi menjamin agent_script dan quiz ada; tanpa itu konten tidak lolos startup.
    assert cc.agent_script is not None and cc.quiz is not None
    referenced = {q.chunk for q in cc.quiz.intro + cc.quiz.outro}
    referenced |= {f.chunk for lesson in cc.lessons.values() for f in lesson.key_facts}
    referenced |= {item.chunk for item in cc.items.values()}
    referenced |= {h.chunk for item in cc.items.values() for h in item.hotspots if h.chunk}
    gallery = _gallery_out(cc)
    if gallery is not None:
        for ex in gallery.exhibits:
            referenced |= {c for c in (ex.short_chunk,) if c}
            referenced |= {ex.asal_usul.chunk} if ex.asal_usul else set()
            referenced |= {h.chunk for h in ex.hotspots if h.chunk}
    for item in cc.items.values():
        if item.card is not None:
            for name in CARD_ASPECTS:
                aspect = getattr(item.card, name)
                if aspect is not None:
                    referenced.add(aspect.chunk)
    referenced |= {
        v.explanation.chunk
        for q in reflection_questions(cc)
        for v in q.values
        if v.explanation is not None
    }
    return CityDetail(
        city=city,
        phases=cc.config.phases,
        game=cc.config.game,
        rewards=cc.config.rewards,
        agent_script=cc.agent_script,
        quiz=cc.quiz,
        lessons=[cc.lessons[i] for i in cc.config.lessons if i in cc.lessons],
        items=[cc.items[i] for i in cc.config.game.items_order if i in cc.items],
        sources={
            cid: SourceRef(
                chunk_id=cid,
                lesson_id=cc.chunks[cid].lesson_id,
                **cc.chunks[cid].source.model_dump(),
            )
            for cid in sorted(referenced)
            if cid in cc.chunks
        },
        reflection=[
            ReflectionPrompt(id=q.id, lesson=q.lesson, prompt=q.prompt)
            for q in reflection_questions(cc)
        ],
        gallery=gallery,
    )


app = create_app()
