"""Uji deteksi basa-basi dan pertanyaan susulan (ADR 41)."""

from __future__ import annotations

from dataclasses import dataclass

import pytest

from app.conversation import contextual_query, detect_small_talk, is_follow_up, may_use_context


@pytest.mark.parametrize(
    ("message", "kind"),
    [
        ("halo", "greeting"),
        ("Hai Saloka!!", "greeting"),
        ("selamat pagi kak", "greeting"),
        ("sampurasun", "greeting"),
        ("terima kasih ya", "thanks"),
        ("makasih banyak infonya", "thanks"),
        ("hatur nuhun", "thanks"),
        ("dadah", "goodbye"),
        ("oke makasih, sampai jumpa", "goodbye"),
        ("kamu siapa?", "identity"),
        ("siapa namamu", "identity"),
        ("kamu bisa apa aja?", "help"),
        ("mau tanya dong", "help"),
        ("tolong bantu aku", "help"),
    ],
)
def test_detect_small_talk(message: str, kind: str) -> None:
    assert detect_small_talk(message) == kind


@pytest.mark.parametrize(
    "message",
    [
        "halo, apa itu angklung?",
        "siapa pendiri kota bandung?",
        "terima kasih itu artinya apa dalam bahasa sunda?",
        "makan malam khas bandung apa?",
        "nama alat musiknya apa?",
        "apa itu?",
        "ok",
        "",
        "!!!",
    ],
)
def test_real_questions_are_not_small_talk(message: str) -> None:
    assert detect_small_talk(message) is None


@pytest.mark.parametrize(
    ("message", "expected"),
    [
        ("terus siapa yang bikin?", True),
        ("siapa penemunya?", True),
        ("kalau yang dari bambu?", True),
        ("kenapa?", True),
        ("Bagaimana cara memainkan angklung dengan benar di sekolah?", False),
    ],
)
def test_is_follow_up(message: str, expected: bool) -> None:
    assert is_follow_up(message) is expected


def test_may_use_context_limits_unknown_terms() -> None:
    vocab = frozenset({"buat", "bambu", "angklung"})
    assert may_use_context("terus siapa yang bikin?", vocab)
    assert may_use_context("siapa penemunya?", vocab)  # satu kata asing masih boleh
    assert not may_use_context("terus siapa presiden amerika?", vocab)


@dataclass
class T:
    role: str
    content: str


def test_contextual_query_order_and_limits() -> None:
    history = [T("user", "satu"), T("assistant", "jawab"), T("user", "dua"), T("user", "tiga")]
    assert contextual_query("pesan", history, "Angklung") == "pesan Angklung tiga dua"
    assert contextual_query("pesan", [], None) is None
    assert contextual_query("pesan", [T("assistant", "x")], None) is None
