"""Buat tipe TypeScript untuk frontend dari skema OpenAPI FastAPI.

Pemakaian (dari folder backend/):
    python scripts/gen_ts_types.py           # tulis frontend/src/lib/api.types.ts
    python scripts/gen_ts_types.py --check   # kode keluar 1 bila berkas tertinggal

`tests/test_ts_types.py` menjalankan --check, jadi perubahan skema API yang tidak diikuti
regenerasi tipe membuat pytest gagal.

Aturan: skema yang dipakai respons dibuat dengan semua kolom wajib (FastAPI selalu mengirim
semua kolom, termasuk yang punya nilai default). Skema permintaan mengikuti `required`.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402

OUTPUT = BACKEND_DIR.parent / "frontend" / "src" / "lib" / "api.types.ts"
HEADER = """\
// Dibuat otomatis oleh backend/scripts/gen_ts_types.py dari skema API. JANGAN disunting manual.
// Regenerasi setelah mengubah backend/app/*schemas*.py: python scripts/gen_ts_types.py
"""
SKIP = {"HTTPValidationError", "ValidationError"}


def _ref_name(ref: str) -> str:
    return ref.rsplit("/", 1)[-1]


def _refs(node: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(node, dict):
        if "$ref" in node:
            found.add(_ref_name(node["$ref"]))
        for value in node.values():
            found |= _refs(value)
    elif isinstance(node, list):
        for value in node:
            found |= _refs(value)
    return found


def _closure(roots: set[str], schemas: dict[str, Any]) -> set[str]:
    seen: set[str] = set()
    stack = list(roots)
    while stack:
        name = stack.pop()
        if name in seen or name not in schemas:
            continue
        seen.add(name)
        stack.extend(_refs(schemas[name]))
    return seen


def _ts(schema: dict[str, Any]) -> str:
    if "$ref" in schema:
        return _ref_name(schema["$ref"])
    if "anyOf" in schema:
        parts = list(dict.fromkeys(_ts(s) for s in schema["anyOf"]))
        return " | ".join(parts)
    if "const" in schema:
        return json.dumps(schema["const"])
    if "enum" in schema:
        return " | ".join(json.dumps(v) for v in schema["enum"])
    kind = schema.get("type")
    if kind == "string":
        return "string"
    if kind in ("integer", "number"):
        return "number"
    if kind == "boolean":
        return "boolean"
    if kind == "null":
        return "null"
    if kind == "array":
        inner = _ts(schema.get("items", {}))
        return f"({inner})[]" if " | " in inner else f"{inner}[]"
    if kind == "object":
        extra = schema.get("additionalProperties")
        if isinstance(extra, dict):
            return f"Record<string, {_ts(extra)}>"
        return "Record<string, unknown>"
    return "unknown"


def _comment(text: str | None, indent: str = "") -> list[str]:
    if not text:
        return []
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    if len(lines) == 1:
        return [f"{indent}/** {lines[0]} */"]
    return [f"{indent}/**", *(f"{indent} * {line}" for line in lines), f"{indent} */"]


def render(spec: dict[str, Any]) -> str:
    schemas: dict[str, Any] = spec["components"]["schemas"]
    request_roots: set[str] = set()
    response_roots: set[str] = set()
    for path in spec["paths"].values():
        for op in path.values():
            request_roots |= _refs(op.get("requestBody", {}))
            ok = {k: v for k, v in op.get("responses", {}).items() if k.startswith("2")}
            response_roots |= _refs(ok)
    response_side = _closure(response_roots, schemas)

    out = [HEADER]
    for name in sorted(schemas):
        if name in SKIP:
            continue
        schema = schemas[name]
        all_required = name in response_side
        required = set(schema.get("required", []))
        out += _comment(schema.get("description"))
        out.append(f"export interface {name} {{")
        for prop, prop_schema in schema.get("properties", {}).items():
            optional = "" if all_required or prop in required else "?"
            out += _comment(prop_schema.get("description"), "  ")
            out.append(f"  {prop}{optional}: {_ts(prop_schema)}")
        out.append("}\n")
    return "\n".join(out).rstrip() + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="hanya periksa, jangan tulis")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args(argv)

    text = render(create_app(Settings()).openapi())
    if args.check:
        current = args.output.read_text(encoding="utf-8") if args.output.exists() else ""
        if current != text:
            print(f"{args.output} tertinggal; jalankan: python scripts/gen_ts_types.py")
            return 1
        print(f"{args.output} mutakhir.")
        return 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(text, encoding="utf-8", newline="\n")
    print(f"Ditulis: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
