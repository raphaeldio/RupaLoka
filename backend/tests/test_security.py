"""T-064: IP klien, batas laju global, header keamanan, /docs, dan pemindai bundel."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.config import Settings
from app.main import create_app
from app.security import API_CSP, client_ip
from scripts.check_bundle_secrets import main as check_main
from scripts.check_bundle_secrets import scan, scan_text

OUT_OF_SCOPE = "Siapa juara piala dunia sepak bola?"


def make_request(xff: str | None = None, host: str = "10.0.0.9") -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request({"type": "http", "headers": headers, "client": (host, 1234)})


def client_for(root: Path, **kwargs: Any) -> TestClient:
    return TestClient(create_app(Settings(content_dir=root, **kwargs)))


def ask(c: TestClient, xff: str | None = None) -> Any:
    headers = {"X-Forwarded-For": xff} if xff else {}
    body = {"city_id": "kota-uji", "message": OUT_OF_SCOPE}
    return c.post("/api/chat", json=body, headers=headers)


# --- client_ip -------------------------------------------------------------


@pytest.mark.parametrize(
    ("xff", "hops", "expected"),
    [
        ("203.0.113.5", 0, "10.0.0.9"),  # tanpa proxy tepercaya: header diabaikan
        (None, 1, "10.0.0.9"),  # header tidak ada: alamat soket
        ("203.0.113.5", 1, "203.0.113.5"),
        ("1.1.1.1, 203.0.113.5", 1, "203.0.113.5"),  # entri kiri bisa dipalsukan klien
        ("198.51.100.7, 76.76.21.1", 2, "198.51.100.7"),  # Vercel -> Render
        ("198.51.100.7", 2, "198.51.100.7"),  # proxy terdekat tidak menambah entri
        (" , 203.0.113.5 ,", 1, "203.0.113.5"),
    ],
)
def test_client_ip_reads_from_the_right(xff: str | None, hops: int, expected: str) -> None:
    assert client_ip(make_request(xff), hops) == expected


def proxied(xff: str, cf: str, vercel: str | None = None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode()), (b"cf-connecting-ip", cf.encode())]
    if vercel is not None:
        headers.append((b"x-vercel-forwarded-for", vercel.encode()))
    return Request({"type": "http", "headers": headers, "client": ("10.0.0.9", 1234)})


# Bentuk rantai produksi yang diukur 21 Nov 2026 (alamat contoh). Server Vercel (V*) dan
# edge Cloudflare (C*) berganti tiap permintaan; klien/pengunjung harus tetap sama.
@pytest.mark.parametrize(
    ("req", "expected"),
    [
        # Lewat Vercel: [pengunjung, server Vercel, edge Cloudflare, internal Render]
        (proxied("1.2.3.4, 5.5.5.1, 6.6.6.1, 10.1.0.2", "5.5.5.1", "1.2.3.4"), "1.2.3.4"),
        (proxied("1.2.3.4, 5.5.5.2, 6.6.6.2, 10.1.0.2", "5.5.5.2", "1.2.3.4"), "1.2.3.4"),
        # Langsung ke Render: [klien, edge Cloudflare, internal Render]
        (proxied("8.8.4.4, 6.6.6.1, 10.1.0.2", "8.8.4.4"), "8.8.4.4"),
        (proxied("8.8.4.4, 6.6.6.3, 10.1.0.2", "8.8.4.4"), "8.8.4.4"),
        # Langsung + entri kiri palsu tanpa header Vercel: tetap IP Cloudflare
        (proxied("9.9.9.9, 8.8.4.4, 6.6.6.1, 10.1.0.2", "8.8.4.4"), "8.8.4.4"),
        # Header Vercel palsu yang tidak cocok dengan bentuk rantai: diabaikan
        (proxied("8.8.4.4, 6.6.6.1, 10.1.0.2", "8.8.4.4", "9.9.9.9"), "8.8.4.4"),
    ],
)
def test_client_ip_behind_vercel_and_cloudflare(req: Request, expected: str) -> None:
    assert client_ip(req, 2) == expected


def test_client_ip_ignores_cloudflare_header_without_trusted_proxy() -> None:
    assert client_ip(proxied("1.2.3.4", "1.2.3.4"), 0) == "10.0.0.9"


@pytest.mark.parametrize(
    ("hops", "xff"),
    [(0, "9.9.9.{i}"), (1, "9.9.9.{i}, 203.0.113.5"), (2, "9.9.9.{i}, 203.0.113.5, 76.76.21.1")],
)
def test_spoofed_forwarded_for_does_not_bypass_rate_limit(
    make_content: Any, hops: int, xff: str
) -> None:
    with client_for(make_content(), rate_limit_per_min=2, trusted_proxy_hops=hops) as c:
        codes = [ask(c, xff.format(i=i)).status_code for i in range(3)]
    assert codes == [200, 200, 429]


def test_global_rate_limit_caps_all_clients(make_content: Any) -> None:
    with client_for(make_content(), rate_limit_per_min=10, global_rate_limit_per_min=2) as c:
        codes = [ask(c, f"203.0.113.{i}").status_code for i in range(3)]
        last = ask(c, "203.0.113.99")
    assert codes == [200, 200, 429]
    assert last.headers["retry-after"] == "60"


def test_chat_response_not_cached(make_content: Any) -> None:
    with client_for(make_content()) as c:
        assert ask(c).headers["cache-control"] == "no-store"


# --- header keamanan dan /docs ---------------------------------------------


def test_security_headers_on_api_responses(make_content: Any) -> None:
    with client_for(make_content()) as c:
        for res in (c.get("/api/health"), c.get("/api/tidak-ada"), ask(c)):
            assert res.headers["x-content-type-options"] == "nosniff"
            assert res.headers["x-frame-options"] == "DENY"
            assert res.headers["referrer-policy"] == "no-referrer"
            assert res.headers["content-security-policy"] == API_CSP
            assert "strict-transport-security" not in res.headers  # bukan HTTPS


def test_hsts_only_behind_https(make_content: Any) -> None:
    with client_for(make_content()) as c:
        res = c.get("/api/health", headers={"X-Forwarded-Proto": "https"})
    assert res.headers["strict-transport-security"].startswith("max-age=")


def test_docs_toggle(make_content: Any) -> None:
    root = make_content()
    with client_for(root) as c:
        res = c.get("/docs")
        assert res.status_code == 200
        assert "content-security-policy" not in res.headers  # Swagger butuh CDN
    with client_for(root, enable_docs=False) as c:
        assert c.get("/docs").status_code == 404
        assert c.get("/openapi.json").status_code == 404


def test_settings_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "-1")
    monkeypatch.setenv("GLOBAL_RATE_LIMIT_PER_MIN", "50")
    monkeypatch.setenv("ENABLE_DOCS", "false")
    s = Settings.from_env()
    assert (s.trusted_proxy_hops, s.global_rate_limit_per_min, s.enable_docs) == (0, 50, False)


# --- pemindai bundel -------------------------------------------------------


def _jwt(role: str) -> str:
    def part(d: dict[str, str]) -> str:
        return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")

    header, payload = part({"alg": "HS256"}), part({"role": role, "iss": "supabase"})
    return f"{header}.{payload}.c2lnbmF0dXJlLWRpdW1teQ"


def test_scan_flags_known_secret_shapes() -> None:
    text = "\n".join(
        [
            'const a="AIza' + "B" * 35 + '"',
            f'const s="{_jwt("service_role")}"',
            "console.log(import.meta.env.GEMINI_API_KEY)",
        ]
    )
    kinds = {f.kind for f in scan_text(text, Path("x.js"))}
    assert kinds == {
        "Google API key",
        "JWT Supabase service_role",
        "nama variabel rahasia GEMINI_API_KEY",
    }


def test_scan_allows_public_anon_jwt_and_clean_code() -> None:
    text = f'const anon="{_jwt("anon")}"; fetch("/api/chat")'
    assert scan_text(text, Path("x.js")) == []


def test_scan_finds_real_value_without_printing_it(tmp_path: Path, capsys: Any) -> None:
    secret = "rahasia-uji-1234567890"
    (tmp_path / "app.js").write_text(f'var k="{secret}"', encoding="utf-8")
    (tmp_path / "logo.png").write_bytes(b"\x89PNG" + secret.encode())  # biner dilewati
    values = [f"GEMINI_API_KEY={secret}", "SUPABASE_SERVICE_ROLE_KEY=pendek"]
    count, findings = scan([tmp_path], values)
    assert count == 1
    assert [f.kind for f in findings] == ["nilai GEMINI_API_KEY dari environment"]

    monkey = pytest.MonkeyPatch()
    monkey.setenv("GEMINI_API_KEY", secret)
    try:
        assert check_main([str(tmp_path)]) == 1
    finally:
        monkey.undo()
    assert secret not in capsys.readouterr().out


def test_scan_missing_target(tmp_path: Path) -> None:
    assert check_main([str(tmp_path / "tidak-ada")]) == 2


def test_rate_limit_holds_when_vercel_and_cloudflare_servers_rotate(make_content: Any) -> None:
    """Pola produksi: pengunjung sama, server Vercel dan edge Cloudflare berganti."""
    body = {"city_id": "kota-uji", "message": OUT_OF_SCOPE}
    with client_for(make_content(), rate_limit_per_min=2, trusted_proxy_hops=2) as c:
        codes = [
            c.post(
                "/api/chat",
                json=body,
                headers={
                    "X-Forwarded-For": f"1.2.3.4, 5.5.5.{i}, 6.6.6.{i}, 10.1.0.2",
                    "CF-Connecting-IP": f"5.5.5.{i}",
                    "X-Vercel-Forwarded-For": "1.2.3.4",
                },
            ).status_code
            for i in range(1, 4)
        ]
    assert codes == [200, 200, 429]
