from __future__ import annotations

from pathlib import Path

from app.config import Settings
from app.main import create_app
from scripts.gen_ts_types import OUTPUT, main, render


def test_frontend_types_are_up_to_date() -> None:
    assert main(["--check"]) == 0, "jalankan: python scripts/gen_ts_types.py"


def test_response_fields_are_required_and_request_defaults_optional() -> None:
    text = render(create_app(Settings()).openapi())
    chat_response = text.split("export interface ChatResponse {")[1].split("}")[0]
    assert "  suggestions: string[]" in chat_response
    assert '  refusal_reason: "out_of_scope" | "no_valid_citation" | null' in chat_response
    chat_request = text.split("export interface ChatRequest {")[1].split("}")[0]
    assert "  city_id: string" in chat_request
    assert "  history?: HistoryTurn[]" in chat_request
    assert "  sources: Record<string, SourceRef>" in text
    assert "ValidationError" not in text


def test_check_detects_stale_file(tmp_path: Path) -> None:
    stale = tmp_path / "api.types.ts"
    stale.write_text("// lama\n", encoding="utf-8")
    assert main(["--check", "--output", str(stale)]) == 1
    assert OUTPUT.name == "api.types.ts"
