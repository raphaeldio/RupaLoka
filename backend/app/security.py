"""Pengamanan dasar API (T-064, SDD §12): IP klien di belakang proxy dan header keamanan."""

from __future__ import annotations

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
