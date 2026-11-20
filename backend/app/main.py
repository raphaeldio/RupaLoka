"""Aplikasi FastAPI Rupaloka (SDD §8).

Jalankan dari folder backend/:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api_schemas import (
    CityDetail,
    CitySummary,
    Health,
    SourceRef,
    SourcesResponse,
)
from app.chat import ChatRequest, ChatResponse, ChatService, RateLimiter, UnknownContext
from app.config import Settings
from app.content_loader import CityContent, Content, load_content
from app.llm import LLM, GeminiLLM, LLMError
from app.retrieval import Retriever
from app.schemas import City

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


def client_ip(request: Request) -> str:
    # Di belakang proxy Vercel/Render: alamat pertama X-Forwarded-For adalah klien.
    forwarded = request.headers.get("x-forwarded-for", "")
    first = forwarded.split(",")[0].strip()
    return first or (request.client.host if request.client else "unknown")


def create_app(settings: Settings | None = None, llm: LLM | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    limiter = RateLimiter(settings.rate_limit_per_min)

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
        yield

    app = FastAPI(title="Rupaloka API", version="0.1.0", lifespan=lifespan)
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
    async def chat(req: ChatRequest, request: Request) -> ChatResponse:
        if not limiter.allow(client_ip(request)):
            raise HTTPException(
                status_code=429, detail="terlalu banyak pertanyaan; coba lagi nanti"
            )
        service: ChatService = request.app.state.chat
        try:
            return await service.answer(req)
        except UnknownContext as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except LLMError as exc:
            logger.warning("chat: LLM tidak tersedia: %s", exc)
            raise HTTPException(status_code=503, detail="agen sedang tidak tersedia") from exc

    return app


def _city_detail(city: City, cc: CityContent) -> CityDetail:
    # Validasi menjamin agent_script dan quiz ada; tanpa itu konten tidak lolos startup.
    assert cc.agent_script is not None and cc.quiz is not None
    referenced = {q.chunk for q in cc.quiz.intro + cc.quiz.outro}
    referenced |= {f.chunk for lesson in cc.lessons.values() for f in lesson.key_facts}
    referenced |= {item.chunk for item in cc.items.values()}
    return CityDetail(
        city=city,
        phases=cc.config.phases,
        game=cc.config.game,
        agent_script=cc.agent_script,
        quiz=cc.quiz,
        lessons=[cc.lessons[i] for i in cc.config.lessons if i in cc.lessons],
        items=[cc.items[i] for i in cc.config.game.items_order if i in cc.items],
        sources={
            cid: SourceRef(chunk_id=cid, **cc.chunks[cid].source.model_dump())
            for cid in sorted(referenced)
            if cid in cc.chunks
        },
    )


app = create_app()
