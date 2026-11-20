from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import ContentError, create_app

KNOW_A = "kota-uji/knowledge/materi-a.yaml"


def client_for(root: Path, **kwargs: Any) -> TestClient:
    return TestClient(create_app(Settings(content_dir=root, **kwargs)))


@pytest.fixture
def client(make_content: Any) -> Iterator[TestClient]:
    with client_for(make_content()) as c:
        yield c


def test_health(client: TestClient) -> None:
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok", "cities": 2, "active_cities": 1}


def test_list_cities(client: TestClient) -> None:
    res = client.get("/api/content/cities")
    assert res.status_code == 200
    assert res.headers["cache-control"] == "public, max-age=300"
    active, soon = res.json()
    assert active["id"] == "kota-uji"
    assert active["status"] == "active"
    assert (active["lesson_count"], active["item_count"]) == (3, 3)
    assert soon["status"] == "coming_soon"
    assert soon["lesson_count"] is None


def test_city_detail(client: TestClient) -> None:
    res = client.get("/api/content/cities/kota-uji")
    assert res.status_code == 200
    body = res.json()
    assert body["phases"] == ["quiz_intro", "lessons", "game", "summary"]
    assert body["game"]["unlock_every"] == 100
    assert [i["id"] for i in body["items"]] == ["item-a", "item-b", "item-c"]
    assert [lesson["id"] for lesson in body["lessons"]] == ["materi-a", "materi-b", "materi-c"]
    assert len(body["quiz"]["intro"]) == 5
    assert "{item}" in body["agent_script"]["item_unlocked"]


def test_city_detail_has_sources_but_no_chunk_text(client: TestClient) -> None:
    body = client.get("/api/content/cities/kota-uji").json()
    sources = body["sources"]
    # Hanya chunk yang dirujuk kuis, fakta, atau item.
    assert set(sources) == {
        "materi-a-001",
        "materi-b-001",
        "materi-c-001",
        "materi-a-002",
        "materi-b-002",
        "materi-c-002",
    }
    ref = sources["materi-a-001"]
    assert ref["chunk_id"] == "materi-a-001"
    assert ref["lesson_id"] == "materi-a"
    assert ref["title"] == "Sumber contoh"
    assert "text" not in ref
    assert "Teks pengetahuan contoh" not in str(body)


def test_unknown_and_coming_soon_city(client: TestClient) -> None:
    assert client.get("/api/content/cities/tidak-ada").json() == {"detail": "kota tidak dikenal"}
    res = client.get("/api/content/cities/kota-nanti")
    assert res.status_code == 404
    assert res.json() == {"detail": "kota belum tersedia"}


def test_sources(client: TestClient) -> None:
    body = client.get("/api/content/sources").json()
    assert len(body["assets"]) == 6
    assert body["assets"][0]["license"] == "CC0"
    assert body["references"] == [
        {
            "title": "Sumber contoh",
            "url": "https://example.org/sumber",
            "type": "web",
            "accessed": "2026-11-19",
        }
    ]
    assert "objects" not in body  # daftar rintangan internal tidak diekspos


def test_broken_content_blocks_startup(make_content: Any) -> None:
    root = make_content(lambda f: f[KNOW_A][0].pop("source"))
    with pytest.raises(ContentError), client_for(root):
        pass


def test_pending_content_starts_unless_strict(make_content: Any) -> None:
    def mutate(f: dict[str, Any]) -> None:
        f[KNOW_A][0]["verified_at"] = None

    root = make_content(mutate)
    with client_for(root) as c:
        assert c.get("/api/health").status_code == 200
    with pytest.raises(ContentError), client_for(root, content_strict=True):
        pass


def test_cors_only_for_allowed_origins(make_content: Any) -> None:
    root = make_content()
    with client_for(root, allowed_origins=["https://rupaloka.example"]) as c:
        ok = c.get("/api/health", headers={"Origin": "https://rupaloka.example"})
        assert ok.headers["access-control-allow-origin"] == "https://rupaloka.example"
        bad = c.get("/api/health", headers={"Origin": "https://lain.example"})
        assert "access-control-allow-origin" not in bad.headers


def test_env_settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("CONTENT_DIR", str(tmp_path))
    monkeypatch.setenv("CONTENT_STRICT", "true")
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example, http://localhost:5173")
    s = Settings.from_env()
    assert s.content_dir == tmp_path.resolve()
    assert s.content_strict is True
    assert s.allowed_origins == ["https://a.example", "http://localhost:5173"]


def test_assets_are_served(client: TestClient) -> None:
    res = client.get("/api/assets/images/item-a.webp")
    assert res.status_code == 200
    assert res.content == b"dummy"
    assert client.get("/api/assets/images/tidak-ada.webp").status_code == 404
    assert client.get("/api/assets/../cities.yaml").status_code == 404
