"""Pastikan tidak ada kunci rahasia di bundel frontend (T-064, prinsip 8).

Pemakaian (dari folder backend/, setelah `npm run build` di frontend/):
    python scripts/check_bundle_secrets.py                 # memindai ../frontend/dist
    python scripts/check_bundle_secrets.py PATH [PATH...]  # folder/berkas lain

Yang dicari:
- pola kunci yang dikenal (Google API key, JWT Supabase berperan service_role, kunci privat);
- nama variabel rahasia (GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY, ...);
- nilai rahasia sebenarnya dari environment atau .env, bila tersedia (tidak pernah dicetak).

Keluar dengan kode 1 bila ada temuan. Hanya membaca; tidak mengubah berkas apa pun.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TARGET = REPO_ROOT / "frontend" / "dist"
TEXT_SUFFIXES = {
    ".js",
    ".mjs",
    ".cjs",
    ".css",
    ".html",
    ".json",
    ".map",
    ".txt",
    ".svg",
    ".webmanifest",
}

# Nama variabel yang hanya boleh ada di server.
SECRET_ENV_NAMES = ("GEMINI_API_KEY", "SUPABASE_SERVICE_ROLE_KEY")

PATTERNS: dict[str, re.Pattern[str]] = {
    "Google API key": re.compile(r"AIza[0-9A-Za-z_\-]{35}"),
    "kunci privat": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}
JWT = re.compile(r"eyJ[A-Za-z0-9_\-]{8,}\.(eyJ[A-Za-z0-9_\-]{8,})\.[A-Za-z0-9_\-]{8,}")
NAME_PATTERN = re.compile("|".join(re.escape(n) for n in SECRET_ENV_NAMES))
MIN_SECRET_LEN = 12  # nilai pendek terlalu mudah cocok secara kebetulan


@dataclass(frozen=True)
class Finding:
    path: Path
    kind: str
    line: int

    def __str__(self) -> str:
        return f"{self.path}:{self.line}: {self.kind}"


def _jwt_role(payload_b64: str) -> str | None:
    try:
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
    except (ValueError, json.JSONDecodeError):
        return None
    role = data.get("role") if isinstance(data, dict) else None
    return role if isinstance(role, str) else None


def _line_of(text: str, index: int) -> int:
    return text.count("\n", 0, index) + 1


def scan_text(text: str, path: Path, secret_values: Iterable[str] = ()) -> list[Finding]:
    found: list[Finding] = []
    for kind, pattern in PATTERNS.items():
        found += [Finding(path, kind, _line_of(text, m.start())) for m in pattern.finditer(text)]
    for m in JWT.finditer(text):
        # Kunci anon Supabase memang publik; yang dilarang adalah service_role.
        if _jwt_role(m.group(1)) == "service_role":
            found.append(Finding(path, "JWT Supabase service_role", _line_of(text, m.start())))
    for m in NAME_PATTERN.finditer(text):
        kind = f"nama variabel rahasia {m.group(0)}"
        found.append(Finding(path, kind, _line_of(text, m.start())))
    for name, value in _named(secret_values):
        idx = text.find(value)
        if idx >= 0:
            found.append(Finding(path, f"nilai {name} dari environment", _line_of(text, idx)))
    return found


def _named(secret_values: Iterable[str]) -> Iterator[tuple[str, str]]:
    for item in secret_values:
        name, _, value = item.partition("=")
        if len(value) >= MIN_SECRET_LEN:
            yield name, value


def iter_files(targets: Iterable[Path]) -> Iterator[Path]:
    for target in targets:
        if target.is_file():
            yield target
        elif target.is_dir():
            files = sorted(target.rglob("*"))
            yield from (p for p in files if p.is_file() and p.suffix.lower() in TEXT_SUFFIXES)


def read_dotenv(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    out: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.split(" #")[0].strip().strip("'\"")
    return out


def secret_values_from_env() -> list[str]:
    env = {**read_dotenv(REPO_ROOT / ".env"), **read_dotenv(REPO_ROOT / "backend" / ".env")}
    env.update({k: v for k, v in os.environ.items() if k in SECRET_ENV_NAMES})
    return [f"{name}={env[name]}" for name in SECRET_ENV_NAMES if env.get(name)]


def scan(targets: Iterable[Path], secret_values: Iterable[str] = ()) -> tuple[int, list[Finding]]:
    values = list(secret_values)
    count, findings = 0, []
    for path in iter_files(targets):
        count += 1
        findings += scan_text(path.read_text(encoding="utf-8", errors="replace"), path, values)
    return count, findings


def main(argv: list[str]) -> int:
    targets = [Path(a).resolve() for a in argv] or [DEFAULT_TARGET]
    missing = [t for t in targets if not t.exists()]
    if missing:
        print(f"Tidak ditemukan: {', '.join(map(str, missing))}. Jalankan `npm run build` dulu.")
        return 2
    values = secret_values_from_env()
    count, findings = scan(targets, values)
    if count == 0:
        print("Tidak ada berkas teks untuk dipindai.")
        return 2
    for f in findings:
        print(f"TEMUAN {f}")
    source = f"{len(values)} nilai rahasia dari env/.env" if values else "tanpa nilai dari env/.env"
    print(f"{count} berkas dipindai ({source}): {len(findings)} temuan.")
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
