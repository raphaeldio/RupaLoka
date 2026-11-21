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


def _first(value: str | None) -> str:
    return value.split(",")[0].strip() if value else ""


def client_ip(request: Request, trusted_hops: int = 0) -> str:
    """IP klien untuk batas laju.

    Produksi (Vercel → Cloudflare → Render, diukur 21 Nov 2026): rantai X-Forwarded-For lewat
    Vercel = [pengunjung, server Vercel, edge Cloudflare, internal Render], langsung ke Render =
    [klien, edge Cloudflare, internal Render]. Server Vercel dan edge Cloudflare berganti tiap
    permintaan, jadi jumlah hop tetap tidak pernah menunjuk klien yang sama.

    Dengan `trusted_hops` > 0 (di belakang proxy) dan header `CF-Connecting-IP` ada:
    - `CF-Connecting-IP` = mesin yang terhubung ke Cloudflare; tidak dapat dipalsukan
      (Cloudflare menolak permintaan yang mengirimnya sendiri).
    - Bila mesin itu server Vercel, pengunjung asli = entri tepat di kiri `CF-Connecting-IP`
      dan sama dengan `X-Vercel-Forwarded-For` (Vercel menimpa header ini). Bentuk ini dapat
      ditiru oleh pemanggil yang langsung ke Render; untuk kasus itu batas global tetap berlaku.
    - Selain itu, pakai `CF-Connecting-IP`.
    Tanpa header Cloudflare: entri ke-`trusted_hops` dari kanan X-Forwarded-For (entri kiri
    dapat diisi klien). Dengan `trusted_hops` 0 semua header diabaikan (tanpa proxy).
    """
    socket_ip = request.client.host if request.client else "unknown"
    if trusted_hops <= 0:
        return socket_ip
    hops = [h.strip() for h in request.headers.get("x-forwarded-for", "").split(",") if h.strip()]
    cf = _first(request.headers.get("cf-connecting-ip"))
    if cf:
        vercel = _first(request.headers.get("x-vercel-forwarded-for"))
        if vercel and cf in hops:
            i = hops.index(cf)
            if i >= 1 and hops[i - 1] == vercel:
                return vercel
        return cf
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
