"""Papan peringkat akhir tur kota: validasi nama, batas poin, urutan, gelar juara."""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.leaderboard import MemoryStore, NicknameError, clean_nickname
from app.main import create_app

CITY = "kota-uji/city.yaml"
MAX = 3 * 100 + 5 * 10 + 100  # 3 materi, 5 soal kuis awal, titik game (rewards bawaan)


def with_board(files: dict[str, Any]) -> None:
    files[CITY]["rewards"] = {"leaderboard": {"champion_title": "Si Paling Uji", "size": 3}}


def make_client(root: Path, **kwargs: Any) -> TestClient:
    return TestClient(create_app(Settings(content_dir=root, **kwargs), leaderboard=MemoryStore()))


@pytest.fixture
def client(make_content: Any) -> Iterator[TestClient]:
    with make_client(make_content(with_board)) as c:
        yield c


def submit(c: TestClient, nickname: str, points: int, player: str | None = None) -> Any:
    return c.post(
        "/api/leaderboard/kota-uji",
        json={"player_id": player or str(uuid.uuid4()), "nickname": nickname, "points": points},
    )


def test_board_empty_then_champion_gets_title(client: TestClient) -> None:
    res = client.get("/api/leaderboard/kota-uji")
    assert res.status_code == 200
    body = res.json()
    assert body == {
        "city_id": "kota-uji",
        "champion_title": "Si Paling Uji",
        "max_points": MAX,
        "entries": [],
        "you": None,
    }
    assert res.headers["cache-control"] == "no-store"

    me = str(uuid.uuid4())
    submit(client, "Rani", 300)
    body = submit(client, "Budi", 420, me).json()
    assert [(e["rank"], e["nickname"], e["points"], e["title"]) for e in body["entries"]] == [
        (1, "Budi", 420, "Si Paling Uji"),
        (2, "Rani", 300, None),
    ]
    assert body["you"] == {"rank": 1, "points": 420}


def test_keeps_best_score_and_latest_nickname(client: TestClient) -> None:
    me = str(uuid.uuid4())
    submit(client, "Asep", 400, me)
    body = submit(client, "Asep Juara", 100, me).json()
    assert body["entries"] == [
        {"rank": 1, "nickname": "Asep Juara", "points": 400, "title": "Si Paling Uji"}
    ]


def test_tie_goes_to_whoever_reached_it_first(client: TestClient) -> None:
    first, second = str(uuid.uuid4()), str(uuid.uuid4())
    submit(client, "Duluan", 350, first)
    body = submit(client, "Belakangan", 350, second).json()
    assert [e["nickname"] for e in body["entries"]] == ["Duluan", "Belakangan"]
    assert body["you"] == {"rank": 2, "points": 350}


def test_board_is_limited_but_rank_is_reported(client: TestClient) -> None:
    for n, pts in enumerate([440, 430, 420, 410]):
        submit(client, f"Pemain {n}", pts)
    me = str(uuid.uuid4())
    body = submit(client, "Telat", 10, me).json()
    assert len(body["entries"]) == 3  # size dari city.yaml
    assert body["you"] == {"rank": 5, "points": 10}
    got = client.get("/api/leaderboard/kota-uji", params={"player_id": me}).json()
    assert got["you"] == {"rank": 5, "points": 10}


def test_rejects_impossible_points_and_bad_input(client: TestClient) -> None:
    assert submit(client, "Curang", MAX + 1).status_code == 422
    assert submit(client, "Rani", -1).status_code == 422
    assert submit(client, "ab", 10).json()["detail"].startswith("nama panggilan harus 3-20")
    assert submit(client, "<script>", 10).status_code == 422
    assert "tidak pantas" in submit(client, "Si Anjing", 10).json()["detail"]
    bad_id = client.post(
        "/api/leaderboard/kota-uji",
        json={"player_id": "bukan-uuid", "nickname": "Rani", "points": 1},
    )
    assert bad_id.status_code == 422


def test_unknown_city_or_disabled_board_is_404(make_content: Any) -> None:
    with make_client(make_content()) as c:  # tanpa rewards.leaderboard
        assert c.get("/api/leaderboard/kota-uji").status_code == 404
        assert submit(c, "Rani", 10).status_code == 404
        assert c.get("/api/leaderboard/tidak-ada").status_code == 404


def test_submit_is_rate_limited(make_content: Any) -> None:
    with make_client(make_content(with_board), leaderboard_rate_limit_per_min=2) as c:
        assert submit(c, "Satu", 1).status_code == 200
        assert submit(c, "Dua", 2).status_code == 200
        assert submit(c, "Tiga", 3).status_code == 429
        assert c.get("/api/leaderboard/kota-uji").status_code == 200  # membaca tidak dibatasi


@pytest.mark.parametrize(
    ("raw", "clean"),
    [("  Rani   Putri ", "Rani Putri"), ("asep_123", "asep_123"), ("Kasur", "Kasur")],
)
def test_clean_nickname_ok(raw: str, clean: str) -> None:
    assert clean_nickname(raw) == clean


@pytest.mark.parametrize("raw", ["a", "x" * 21, "Rani!", "_awal", "b4ngs4t", "Si Asu", "ANJING"])
def test_clean_nickname_rejected(raw: str) -> None:
    with pytest.raises(NicknameError):
        clean_nickname(raw)


def test_supabase_store_requests() -> None:
    import json

    import httpx

    from app.leaderboard import StoreError, SupabaseStore

    seen: list[httpx.Request] = []

    def handler(req: httpx.Request) -> httpx.Response:
        seen.append(req)
        if req.url.path.endswith("/rpc/leaderboard_rank"):
            return httpx.Response(200, json=[{"rank": 2, "points": 300}])
        if req.url.path.endswith("/leaderboard"):
            row = {"nickname": "Rani", "points": 400, "achieved_at": "2026-11-21T02:00:00+00:00"}
            return httpx.Response(200, json=[row])
        return httpx.Response(204)

    store = SupabaseStore("https://contoh.supabase.co", "kunci-uji")
    store._client = httpx.Client(
        base_url="https://contoh.supabase.co/rest/v1",
        headers={"apikey": "kunci-uji", "Authorization": "Bearer kunci-uji"},
        transport=httpx.MockTransport(handler),
    )
    store.submit("bandung", "p-1", "Rani", 400)
    assert [r.nickname for r in store.top("bandung", 10)] == ["Rani"]
    assert store.rank_of("bandung", "p-1") == (2, 300)

    submit_req, top_req, _ = seen
    assert submit_req.url.path == "/rest/v1/rpc/leaderboard_submit"
    assert json.loads(submit_req.content) == {
        "p_city_id": "bandung",
        "p_player_id": "p-1",
        "p_nickname": "Rani",
        "p_points": 400,
    }
    assert submit_req.headers["apikey"] == "kunci-uji"
    assert top_req.url.params["order"] == "points.desc,achieved_at.asc,player_id.asc"
    assert top_req.url.params["city_id"] == "eq.bandung"

    store._client = httpx.Client(
        base_url="https://x/rest/v1", transport=httpx.MockTransport(lambda r: httpx.Response(500))
    )
    with pytest.raises(StoreError):
        store.top("bandung", 10)
