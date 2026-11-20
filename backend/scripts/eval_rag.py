"""Evaluasi agen RAG dan kalibrasi `MIN_SCORE` (T-062, SDD §9).

Pemakaian (dari folder backend/):
    python scripts/eval_rag.py                    # retrieval + gerbang saja, tanpa LLM
    python scripts/eval_rag.py --min-score 2.5    # coba ambang lain
    python scripts/eval_rag.py --llm              # alur chat penuh (perlu GEMINI_API_KEY)
    python scripts/eval_rag.py --json hasil.json  # simpan semua baris dan metrik

Set evaluasi: `eval/in_scope.yaml` dan `eval/out_of_scope.yaml` (T-060).

Tahap retrieval (selalu, tanpa biaya):
- recall@k pertanyaan dalam cakupan (chunk yang diharapkan ada di hasil teratas);
- persen dalam cakupan yang lolos gerbang dan persen luar cakupan yang ditolak gerbang;
- `suggested_questions` materi harus lolos gerbang (saran pada penolakan tidak boleh ikut ditolak);
- sapuan ambang untuk memilih `MIN_SCORE`.

Tahap LLM (`--llm`): persen jawaban bersitasi valid, persen penolakan benar, dan pelanggaran
(jawaban tanpa sitasi, prompt sistem bocor, frasa terlarang). Kode keluar 1 bila ada pelanggaran,
2 bila berkas evaluasi atau konten tidak valid. Angka hanya dicatat dari keluaran skrip ini.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from collections.abc import Iterable, Sequence
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Literal, TypeVar

import yaml
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.chat import ChatContext, ChatRequest, ChatResponse, ChatService  # noqa: E402
from app.config import Settings  # noqa: E402
from app.content_loader import Content, is_unfilled, load_content  # noqa: E402
from app.llm import LLM, GeminiLLM, LLMError  # noqa: E402
from app.prompts import SYSTEM_TEMPLATE  # noqa: E402
from app.retrieval import TOP_K, Retriever  # noqa: E402

DEFAULT_CONTENT = BACKEND_DIR.parent / "content"
DEFAULT_EVAL_DIR = BACKEND_DIR.parent / "eval"
GATE_KINDS = ("off_topic", "other_region")  # harus ditolak sebelum LLM

M = TypeVar("M", bound=BaseModel)


# --- set evaluasi ------------------------------------------------------------


class InScopeCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    city_id: str
    question: str = Field(min_length=1)
    lesson_id: str | None = None
    expected_chunks: list[str] = Field(min_length=1)
    note: str | None = None


class OutOfScopeCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    city_id: str
    question: str = Field(min_length=1)
    kind: Literal["off_topic", "other_region", "near_miss", "injection"]
    lesson_id: str | None = None
    expect: Literal["refusal", "no_leak"] = "refusal"
    must_not_contain: list[str] = Field(default_factory=list)
    note: str | None = None

    @property
    def gate_expected(self) -> bool:
        return self.kind in GATE_KINDS


class EvalFileError(ValueError):
    pass


def load_cases(path: Path, model: type[M]) -> list[M]:
    if not path.is_file():
        return []
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    try:
        cases = TypeAdapter(list[model]).validate_python(data)  # type: ignore[valid-type]
    except ValidationError as exc:
        raise EvalFileError(f"{path.name}: {exc}") from exc
    ids = [c.id for c in cases]  # type: ignore[attr-defined]
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    if dupes:
        raise EvalFileError(f"{path.name}: id ganda {', '.join(dupes)}")
    return cases


def check_cases(
    content: Content, ins: Sequence[InScopeCase], oos: Sequence[OutOfScopeCase]
) -> tuple[list[str], list[str]]:
    """(galat, peringatan) untuk rujukan kota/materi/chunk yang tidak dikenal."""
    errors: list[str] = []
    warnings: list[str] = []
    for case in [*ins, *oos]:
        city = content.city_content.get(case.city_id)
        if city is None:
            errors.append(f"{case.id}: city_id '{case.city_id}' tidak dikenal atau belum aktif")
            continue
        if case.lesson_id is not None and case.lesson_id not in city.lessons:
            errors.append(f"{case.id}: lesson_id '{case.lesson_id}' bukan materi kota ini")
        for cid in getattr(case, "expected_chunks", []):
            chunk = city.chunks.get(cid)
            if chunk is None:
                errors.append(f"{case.id}: chunk '{cid}' tidak ada")
            elif is_unfilled(chunk.text):
                warnings.append(f"{case.id}: chunk '{cid}' masih penanda (belum diisi)")
    return errors, warnings


# --- tahap retrieval ---------------------------------------------------------

SetName = Literal["in_scope", "out_of_scope", "suggested"]


@dataclass
class RetrievalRow:
    case_id: str
    set: SetName
    question: str
    top_score: float
    top_chunks: list[str]
    gate_pass: bool
    recall_hit: bool | None = None  # hanya dalam cakupan
    gate_expected: bool | None = None  # hanya luar cakupan


def retrieve_rows(
    retriever: Retriever,
    content: Content,
    ins: Sequence[InScopeCase],
    oos: Sequence[OutOfScopeCase],
    min_score: float,
    top_k: int = TOP_K,
) -> list[RetrievalRow]:
    def run(case_id: str, set_name: SetName, city: str, q: str, lesson: str | None) -> RetrievalRow:
        hits = retriever.search(city, q, lesson_id=lesson, top_k=top_k)
        top = hits[0].raw_score if hits else 0.0
        chunks = [h.chunk.id for h in hits]
        return RetrievalRow(
            case_id, set_name, q, round(top, 4), chunks, bool(hits) and top >= min_score
        )

    rows: list[RetrievalRow] = []
    for c in ins:
        row = run(c.id, "in_scope", c.city_id, c.question, c.lesson_id)
        row.recall_hit = any(cid in row.top_chunks for cid in c.expected_chunks)
        rows.append(row)
    for o in oos:
        row = run(o.id, "out_of_scope", o.city_id, o.question, o.lesson_id)
        row.gate_expected = o.gate_expected
        rows.append(row)
    for city_id, city in content.city_content.items():
        for lesson_id, lesson in city.lessons.items():
            for n, q in enumerate(lesson.suggested_questions, start=1):
                rows.append(run(f"{lesson_id}#{n}", "suggested", city_id, q, lesson_id))
    return rows


def pct(part: int, whole: int) -> str:
    return f"{part}/{whole} ({100 * part / whole:.0f}%)" if whole else "0/0 (-)"


@dataclass
class SweepRow:
    threshold: float
    in_scope_pass: int
    in_scope_total: int
    oos_blocked: int
    oos_total: int


def sweep(
    pass_scores: Sequence[float], block_scores: Sequence[float], current: float
) -> list[SweepRow]:
    """Untuk tiap ambang kandidat: berapa yang harus lolos tetap lolos, berapa yang ditolak."""
    candidates = sorted({current, *pass_scores, *block_scores})
    return [
        SweepRow(
            threshold=t,
            in_scope_pass=sum(s >= t for s in pass_scores),
            in_scope_total=len(pass_scores),
            oos_blocked=sum(s < t for s in block_scores),
            oos_total=len(block_scores),
        )
        for t in candidates
    ]


def separable_range(
    pass_scores: Sequence[float], block_scores: Sequence[float]
) -> tuple[float, float] | None:
    """(skor luar cakupan tertinggi, skor dalam cakupan terendah) bila keduanya terpisah."""
    if not pass_scores or not block_scores:
        return None
    hi_block, lo_pass = max(block_scores), min(pass_scores)
    return (hi_block, lo_pass) if hi_block < lo_pass else None


# --- tahap LLM ---------------------------------------------------------------


def _leak_markers(template: str = SYSTEM_TEMPLATE) -> list[str]:
    markers = []
    for line in template.splitlines():
        text = re.sub(r"^\s*\d+\.\s*", "", line).strip().lower()
        if len(text) >= 30 and "{" not in text:
            markers.append(text[:40])
    return markers


LEAK_MARKERS = _leak_markers()


def prompt_leaked(answer: str) -> bool:
    low = answer.lower()
    return any(m in low for m in LEAK_MARKERS)


@dataclass
class LLMRow:
    case_id: str
    set: SetName
    refusal_reason: str | None = None
    citations: list[str] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)
    expected_cited: bool | None = None  # dalam cakupan: sitasi memuat chunk yang diharapkan
    correct_refusal: bool | None = None  # luar cakupan dengan expect=refusal
    error: str | None = None
    answer: str = ""


def judge(
    res: ChatResponse,
    set_name: SetName,
    case_id: str,
    expected_chunks: Iterable[str] = (),
    expect: str | None = None,
    must_not_contain: Iterable[str] = (),
) -> LLMRow:
    cited = [c.chunk_id for c in res.citations]
    row = LLMRow(case_id, set_name, res.refusal_reason, cited, answer=res.answer)
    refused = res.refusal_reason is not None
    if not refused and not cited:
        row.violations.append("jawaban tanpa sitasi")
    if res.grounded == refused:
        row.violations.append("grounded tidak sesuai refusal_reason")
    if prompt_leaked(res.answer):
        row.violations.append("prompt sistem bocor")
    low = res.answer.lower()
    row.violations += [f"memuat '{p}'" for p in must_not_contain if p.lower() in low]
    expected = list(expected_chunks)
    if expected:
        row.expected_cited = any(c in cited for c in expected)
    if expect == "refusal":
        row.correct_refusal = refused
    return row


async def run_llm(
    service: ChatService,
    ins: Sequence[InScopeCase],
    oos: Sequence[OutOfScopeCase],
    delay_s: float = 0.0,
) -> list[LLMRow]:
    jobs: list[tuple[SetName, InScopeCase | OutOfScopeCase]] = [
        *(("in_scope", c) for c in ins),
        *(("out_of_scope", o) for o in oos),
    ]
    rows: list[LLMRow] = []
    for n, (set_name, case) in enumerate(jobs):
        if n and delay_s > 0:
            await asyncio.sleep(delay_s)  # kuota gratis Gemini terbatas per menit
        req = ChatRequest(
            city_id=case.city_id,
            context=ChatContext(lesson_id=case.lesson_id),
            message=case.question,
        )
        try:
            res = await service.answer(req)
        except LLMError as exc:
            rows.append(LLMRow(case.id, set_name, error=str(exc)[:200]))
            continue
        if isinstance(case, InScopeCase):
            rows.append(judge(res, set_name, case.id, expected_chunks=case.expected_chunks))
        else:
            rows.append(
                judge(
                    res,
                    set_name,
                    case.id,
                    expect=case.expect,
                    must_not_contain=case.must_not_contain,
                )
            )
    return rows


# --- laporan -----------------------------------------------------------------


@dataclass
class Report:
    min_score: float
    top_k: int
    chunks_total: int
    chunks_placeholder: int
    retrieval: list[RetrievalRow]
    metrics: dict[str, str] = field(default_factory=dict)
    sweep: list[SweepRow] = field(default_factory=list)
    sweep_basis: str = ""
    separable: tuple[float, float] | None = None
    llm: list[LLMRow] = field(default_factory=list)
    model: str | None = None

    @property
    def violations(self) -> list[str]:
        return [f"{r.case_id}: {v}" for r in self.llm for v in r.violations]


def build_report(
    content: Content,
    retriever: Retriever,
    ins: Sequence[InScopeCase],
    oos: Sequence[OutOfScopeCase],
    min_score: float,
    top_k: int = TOP_K,
) -> Report:
    chunks = [c for city in content.city_content.values() for c in city.chunks.values()]
    rows = retrieve_rows(retriever, content, ins, oos, min_score, top_k)
    report = Report(
        min_score=min_score,
        top_k=top_k,
        chunks_total=len(chunks),
        chunks_placeholder=sum(is_unfilled(c.text) for c in chunks),
        retrieval=rows,
    )
    in_rows = [r for r in rows if r.set == "in_scope"]
    gate_rows = [r for r in rows if r.set == "out_of_scope" and r.gate_expected]
    sug_rows = [r for r in rows if r.set == "suggested"]
    m = report.metrics
    m[f"recall@{top_k} dalam cakupan"] = pct(sum(bool(r.recall_hit) for r in in_rows), len(in_rows))
    m["dalam cakupan lolos gerbang"] = pct(sum(r.gate_pass for r in in_rows), len(in_rows))
    m["luar cakupan ditolak gerbang"] = pct(sum(not r.gate_pass for r in gate_rows), len(gate_rows))
    m["pertanyaan saran lolos gerbang"] = pct(sum(r.gate_pass for r in sug_rows), len(sug_rows))

    # Dasar sapuan: set dalam cakupan; bila belum ada, pertanyaan saran materi (sementara).
    pass_rows, report.sweep_basis = (
        (in_rows, "in_scope.yaml")
        if in_rows
        else (
            sug_rows,
            "suggested_questions materi (sementara; in_scope.yaml masih kosong)",
        )
    )
    pass_scores = [r.top_score for r in pass_rows]
    block_scores = [r.top_score for r in gate_rows]
    report.sweep = sweep(pass_scores, block_scores, min_score)
    report.separable = separable_range(pass_scores, block_scores)
    return report


def add_llm_metrics(report: Report, rows: list[LLMRow], model: str) -> None:
    report.llm, report.model = rows, model
    ok = [r for r in rows if r.error is None]
    ins = [r for r in ok if r.set == "in_scope"]
    answered = [r for r in ins if r.refusal_reason is None]
    refusal = [r for r in ok if r.correct_refusal is not None]
    m = report.metrics
    m["LLM: galat/timeout"] = pct(len(rows) - len(ok), len(rows))
    m["LLM: dalam cakupan dijawab bersitasi"] = pct(len(answered), len(ins))
    m["LLM: jawaban mengutip chunk yang diharapkan"] = pct(
        sum(bool(r.expected_cited) for r in answered), len(answered)
    )
    m["LLM: luar cakupan ditolak dengan benar"] = pct(
        sum(bool(r.correct_refusal) for r in refusal), len(refusal)
    )
    m["LLM: pelanggaran (harus 0)"] = str(len(report.violations))


def print_report(report: Report, warnings: Sequence[str]) -> None:
    print(f"MIN_SCORE {report.min_score} | top_k {report.top_k}", end="")
    print(f" | model {report.model}" if report.model else " | tanpa LLM")
    print(f"Chunk: {report.chunks_total}, {report.chunks_placeholder} masih penanda [PERLU DIISI]")
    if report.chunks_placeholder:
        print(
            "  ! Chunk penanda ikut terindeks di mode pengembangan; kalibrasi belum mewakili rilis."
        )
    for w in warnings:
        print(f"  ! {w}")

    print("\nRetrieval (skor = raw_score BM25 teratas):")
    for r in report.retrieval:
        mark = "lolos" if r.gate_pass else "tolak"
        extra = ""
        if r.recall_hit is not None:
            extra = " recall:ya" if r.recall_hit else " recall:TIDAK"
        if r.set == "out_of_scope" and r.gate_expected and r.gate_pass:
            extra = " <- seharusnya ditolak gerbang"
        if r.set == "suggested" and not r.gate_pass:
            extra = " <- saran ikut ditolak"
        top = ",".join(r.top_chunks[:2]) or "-"
        print(f"  {r.set:<12} {r.case_id:<22} {r.top_score:7.3f} {mark:<5} [{top}]{extra}")

    print(f"\nSapuan ambang (dasar: {report.sweep_basis}):")
    print("  ambang   lolos (harus lolos)   ditolak (harus ditolak gerbang)")
    for s in report.sweep:
        here = "  <- MIN_SCORE sekarang" if s.threshold == report.min_score else ""
        print(
            f"  {s.threshold:7.3f}  {pct(s.in_scope_pass, s.in_scope_total):<20}  "
            f"{pct(s.oos_blocked, s.oos_total)}{here}"
        )
    if report.separable:
        lo, hi = report.separable
        print(f"  Terpisah sempurna untuk ambang di antara {lo:.3f} (eksklusif) dan {hi:.3f}.")
    else:
        print("  Tidak ada ambang yang memisahkan kedua kelompok sepenuhnya.")

    if report.llm:
        print("\nLLM:")
        for row in report.llm:
            if row.error:
                status = f"GALAT {row.error}"
            else:
                status = row.refusal_reason or f"dijawab [{', '.join(row.citations)}]"
            flags = "; ".join(row.violations)
            print(f"  {row.set:<12} {row.case_id:<22} {status}{'  !! ' + flags if flags else ''}")

    print("\nMetrik:")
    for name, value in report.metrics.items():
        print(f"  {name:<44} {value}")


def report_json(report: Report) -> dict[str, object]:
    data = asdict(report)
    data["generated_at"] = datetime.now().isoformat(timespec="seconds")
    data["violations"] = report.violations
    return data


# --- main --------------------------------------------------------------------


def make_llm(settings: Settings) -> LLM | None:
    if not settings.gemini_api_key:
        return None
    return GeminiLLM(settings.gemini_api_key, settings.gemini_model, settings.llm_timeout_s)


def main(argv: list[str] | None = None, llm: LLM | None = None) -> int:
    env_settings = Settings.from_env()
    parser = argparse.ArgumentParser(description="Evaluasi agen RAG Rupaloka")
    parser.add_argument("--content", type=Path, default=DEFAULT_CONTENT, help="folder konten")
    parser.add_argument("--eval-dir", type=Path, default=DEFAULT_EVAL_DIR, help="folder eval/")
    parser.add_argument("--min-score", type=float, default=env_settings.min_score)
    parser.add_argument("--top-k", type=int, default=TOP_K)
    parser.add_argument("--llm", action="store_true", help="jalankan alur chat penuh (Gemini)")
    parser.add_argument("--delay", type=float, default=4.0, help="jeda antar panggilan LLM (dtk)")
    parser.add_argument("--json", type=Path, help="simpan laporan lengkap ke berkas JSON")
    args = parser.parse_args(argv)

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    loaded = load_content(args.content.resolve())
    content_errors = loaded.errors(release=False)
    if content_errors:
        for issue in content_errors:
            print(f"GALAT KONTEN {issue.file}: {issue.message}")
        return 2
    content = loaded.content
    try:
        ins = load_cases(args.eval_dir / "in_scope.yaml", InScopeCase)
        oos = load_cases(args.eval_dir / "out_of_scope.yaml", OutOfScopeCase)
    except EvalFileError as exc:
        print(f"GALAT SET EVALUASI {exc}")
        return 2
    errors, warnings = check_cases(content, ins, oos)
    if errors:
        for e in errors:
            print(f"GALAT SET EVALUASI {e}")
        return 2
    if not ins:
        warnings.append("eval/in_scope.yaml kosong: recall@k belum dapat diukur (T-060, KH).")

    retriever = Retriever.from_content(content)
    report = build_report(content, retriever, ins, oos, args.min_score, args.top_k)

    if args.llm:
        settings = Settings(
            content_dir=args.content.resolve(),
            gemini_api_key=env_settings.gemini_api_key,
            gemini_model=env_settings.gemini_model,
            llm_timeout_s=env_settings.llm_timeout_s,
            min_score=args.min_score,
            mascot_name=env_settings.mascot_name,
        )
        llm = llm or make_llm(settings)
        if llm is None:
            print("GEMINI_API_KEY belum diatur; jalankan tanpa --llm atau isi backend/.env.")
            return 2
        service = ChatService(content, retriever, llm, settings)
        rows = asyncio.run(run_llm(service, ins, oos, args.delay))
        add_llm_metrics(report, rows, settings.gemini_model)

    print_report(report, warnings)
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(
            json.dumps(report_json(report), ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"\nLaporan JSON: {args.json}")
    return 1 if report.violations else 0


if __name__ == "__main__":
    raise SystemExit(main())
