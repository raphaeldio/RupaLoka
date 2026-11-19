"""Validasi folder konten Rupaloka (SDD §5.3).

Pemakaian (dari folder backend/):
    python scripts/validate_content.py              # mode pengembangan
    python scripts/validate_content.py --release    # data belum diisi = galat
    python scripts/validate_content.py --content path/ke/content

Kode keluar 0 bila lolos, 1 bila ada galat.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.content_loader import load_content  # noqa: E402

DEFAULT_CONTENT = BACKEND_DIR.parent / "content"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validasi konten Rupaloka")
    parser.add_argument("--content", type=Path, default=DEFAULT_CONTENT, help="folder konten")
    parser.add_argument(
        "--release",
        action="store_true",
        help="mode rilis: data yang belum diisi atau belum diverifikasi menjadi galat",
    )
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    result = load_content(args.content.resolve())
    errors = result.errors(args.release)
    warnings = result.warnings(args.release)

    for issue in errors:
        print(f"GALAT      {issue.file}: {issue.message}")
    for issue in warnings:
        print(f"PERINGATAN {issue.file}: {issue.message}")

    mode = "rilis" if args.release else "pengembangan"
    print(f"\nMode {mode}: {len(errors)} galat, {len(warnings)} peringatan.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
