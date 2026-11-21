"""Pengamanan dasar API (T-064, SDD §12): IP klien di belakang proxy dan header keamanan."""

from __future__ import annotations

import hashlib
import ipaddress
import secrets
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

# API hanya mengembalikan JSON dan gambar; tidak ada yang perlu dimuat atau dibingkai.
API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
# Swagger UI memuat skrip/gaya dari CDN, jadi CSP ketat di atas tidak dipasang di sana.
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")

SECURITY_HEADERS: dict[str, str] = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}
HSTS = "max-age=31536000; includeSubDomains"


def client_ip(request: Request, trusted_hops: int = 0) -> str:
    """IP klien dari X-Forwarded-For, dibaca dari kanan.

    Entri di kiri dapat diisi bebas oleh klien, jadi entri pertama tidak boleh dipercaya.
    Setiap proxy tepercaya menambahkan satu entri di kanan; dengan `trusted_hops` proxy,
    IP klien adalah entri ke-`trusted_hops` dari kanan. Bila entri lebih sedikit (mis.
    proxy terdekat tidak menambahkan entri), pakai entri paling kiri yang tersedia.
    Dengan `trusted_hops` 0 header diabaikan: tanpa proxy, seluruh isinya dari klien.
    """
    socket_ip = request.client.host if request.client else "unknown"
    if trusted_hops <= 0:
        return socket_ip
    hops = [h.strip() for h in request.headers.get("x-forwarded-for", "").split(",") if h.strip()]
    if hops:
        return hops[max(0, len(hops) - trusted_hops)]
    return socket_ip


# --- diagnostik rantai proxy (SEMENTARA, 21 Nov 2026) -------------------------
# Batas laju per IP tidak pernah aktif di produksi: entri X-Forwarded-For yang dipilih
# `trusted_hops` berubah tiap permintaan. Endpoint diagnostik memakai fungsi ini untuk
# melihat BENTUK rantai tanpa membuka alamat IP: tiap entri hanya diwakili hash bergaram
# (garam acak per proses, tidak pernah dikirim) dan tanda privat/publik. Hapus setelah
# TRUSTED_PROXY_HOPS / cara membaca IP diperbaiki.
_DIAG_SALT = secrets.token_bytes(16)
_DIAG_HEADERS = ("cf-connecting-ip", "true-client-ip", "x-real-ip", "x-vercel-forwarded-for")


def _tag(value: str) -> str:
    return hashlib.sha256(_DIAG_SALT + value.encode()).hexdigest()[:8]


def _is_private(value: str) -> bool | None:
    try:
        return ipaddress.ip_address(value).is_private
    except ValueError:
        return None


def describe_client_chain(request: Request, trusted_hops: int) -> dict[str, object]:
    """Bentuk rantai proxy tanpa alamat IP (lihat catatan di atas)."""
    hops = [h.strip() for h in request.headers.get("x-forwarded-for", "").split(",") if h.strip()]
    tags = [_tag(h) for h in hops]
    socket_ip = request.client.host if request.client else ""
    derived = client_ip(request, trusted_hops)
    other: dict[str, object] = {}
    for name in _DIAG_HEADERS:
        raw = request.headers.get(name)
        if raw is None:
            continue
        first = raw.split(",")[0].strip()
        other[name] = {
            "tag": _tag(first),
            "xff_index": tags.index(_tag(first)) if _tag(first) in tags else None,
        }
    return {
        "trusted_hops": trusted_hops,
        "xff_count": len(hops),
        "xff_tags": tags,
        "xff_private": [_is_private(h) for h in hops],
        "socket_tag": _tag(socket_ip),
        "socket_private": _is_private(socket_ip),
        "derived_tag": _tag(derived),
        "other_headers": other,
    }


def is_https(request: Request) -> bool:
    proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    return (proto or request.url.scheme) == "https"


async def add_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    if not request.url.path.startswith(DOCS_PATHS):
        response.headers.setdefault("Content-Security-Policy", API_CSP)
    if is_https(request):
        response.headers.setdefault("Strict-Transport-Security", HSTS)
    return response
