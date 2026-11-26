"""Percakapan alami untuk agen (SDD ADR 41): basa-basi dan pertanyaan susulan.

1. **Basa-basi** (`detect_small_talk`): pesan yang HANYA berisi salam, terima kasih, pamit,
   "kamu siapa", atau "bisa tanya apa" dijawab dengan teks tulisan tim (`agent_script.yaml` →
   `small_talk`), tanpa LLM dan tanpa fakta budaya. Begitu ada satu kata isi lain
   ("halo, apa itu angklung?"), pesan diperlakukan sebagai pertanyaan biasa.

2. **Pertanyaan susulan** (`is_follow_up`, `contextual_query`): "terus siapa yang bikin?"
   tidak menyebut topiknya. Bila pesan itu sendiri gagal di gerbang, retrieval diulang dengan
   kueri yang ditambah judul materi aktif dan dua pertanyaan pengguna sebelumnya. Gerbang
   `MIN_SCORE` tidak diubah; hanya masukannya. Pengaman: jalur ini hanya untuk pesan yang
   tampak sebagai susulan DAN paling banyak satu kata isinya tidak dikenal korpus kota, agar
   "terus siapa presiden amerika?" setelah obrolan angklung tetap ditolak.
"""

from __future__ import annotations

import re
from collections.abc import Sequence
from typing import Literal, Protocol

from app.retrieval import STOPWORDS, STOPWORDS_CHAT, normalize_query

SmallTalkKind = Literal["greeting", "thanks", "goodbye", "identity", "help"]

_WORD = re.compile(r"[a-z]+")

# Kata penanda per jenis. Frasa dua kata ("terima kasih") dipecah; keduanya penanda.
_CUES: dict[SmallTalkKind, frozenset[str]] = {
    "greeting": frozenset(
        "halo hallo helo hai hay hi hello hey hei pagi siang sore malam selamat salam "
        "assalamualaikum asalamualaikum sampurasun punten permisi".split()
    ),
    "thanks": frozenset(
        "makasih makasi trims terima kasih thanks thank thx tengkyu nuhun hatur".split()
    ),
    "goodbye": frozenset("dadah dah bye babay pamit sampai jumpa ketemu".split()),
    "identity": frozenset("siapa namamu nama".split()),
    "help": frozenset("bantu bantuan help tolong tanya bisa".split()),
}
# Kata yang boleh menyertai basa-basi tanpa mengubahnya menjadi pertanyaan.
_FILLER = frozenset(
    "saloka kamu kau anda aku saya mau ingin boleh apa aja saja dong ya yuk oke ok sip wah wow "
    "keren baik banget sekali banyak semua juga lagi nanti lain kali kak kakak min nih sih deh "
    "kok loh lho tuh yah atas infonya informasinya penjelasannya jawabannya ini itu kita yang "
    "di ke sama hehe haha wkwk".split()
)
# Urutan prioritas bila beberapa jenis muncul ("makasih, dadah" → pamit).
_PRIORITY: tuple[SmallTalkKind, ...] = ("goodbye", "thanks", "identity", "help", "greeting")

# Penanda susulan: kata rujukan dan sambungan obrolan.
_FOLLOW_UP_CUES = frozenset(
    "itu ini tersebut dia mereka beliau terus trus lalu kalau kalo klo tadi lagi selain "
    "lainnya gitu begitu sana situ sananya juga apalagi".split()
)
SHORT_QUERY_TERMS = 2  # pesan dengan <= 2 kata isi dianggap mungkin susulan
MAX_UNKNOWN_TERMS = 1  # kata isi yang tidak ada di korpus kota
CONTEXT_USER_TURNS = 2


class HistoryLike(Protocol):
    role: str
    content: str


def _words(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def detect_small_talk(message: str) -> SmallTalkKind | None:
    """Jenis basa-basi bila pesan hanya berisi basa-basi; selain itu None."""
    words = _words(message)
    if not words:
        return None
    found: set[SmallTalkKind] = set()
    for word in words:
        kinds = [k for k, cues in _CUES.items() if word in cues]
        if kinds:
            found.update(kinds)
        elif word not in _FILLER and word not in STOPWORDS and word not in STOPWORDS_CHAT:
            return None  # ada kata isi: ini pertanyaan sungguhan
    # "siapa" atau "bisa"/"tanya" saja belum tentu basa-basi; perlu pasangan yang jelas.
    if "identity" in found and not _asks_identity(words):
        found.discard("identity")
    if "help" in found and not _asks_help(words):
        found.discard("help")
    return next((k for k in _PRIORITY if k in found), None)


def _asks_identity(words: Sequence[str]) -> bool:
    w = set(words)
    asks = bool(w & {"siapa", "nama"}) and bool(w & {"kamu", "kau", "anda", "saloka"})
    return "namamu" in w or asks


def _asks_help(words: Sequence[str]) -> bool:
    w = set(words)
    if w & {"bantu", "bantuan", "help", "tolong", "tanya"}:
        return True
    return "bisa" in w and "apa" in w


def is_follow_up(message: str) -> bool:
    """Pesan yang tampak merujuk obrolan sebelumnya: ada kata rujukan, akhiran -nya, atau pendek."""
    words = _words(message)
    if any(w in _FOLLOW_UP_CUES or (w.endswith("nya") and len(w) > 4) for w in words):
        return True
    return len(normalize_query(message)) <= SHORT_QUERY_TERMS


def unknown_terms(message: str, vocabulary: frozenset[str]) -> list[str]:
    """Kata isi pesan yang tidak ada di korpus; kata sambungan obrolan ("terus") tidak dihitung."""
    content = " ".join(w for w in _words(message) if w not in _FOLLOW_UP_CUES)
    return [t for t in normalize_query(content) if t not in vocabulary]


def may_use_context(message: str, vocabulary: frozenset[str]) -> bool:
    """Pengaman jalur susulan (lihat docstring modul)."""
    return is_follow_up(message) and len(unknown_terms(message, vocabulary)) <= MAX_UNKNOWN_TERMS


def contextual_query(
    message: str, history: Sequence[HistoryLike], lesson_title: str | None
) -> str | None:
    """Pesan + judul materi aktif + pertanyaan pengguna sebelumnya; None bila tidak ada konteks.
    Pesan ditaruh paling depan agar tidak terpotong batas panjang kueri."""
    previous = [t.content for t in history if t.role == "user"][-CONTEXT_USER_TURNS:]
    extra = [*([lesson_title] if lesson_title else []), *reversed(previous)]
    if not extra:
        return None
    return " ".join([message, *extra])
