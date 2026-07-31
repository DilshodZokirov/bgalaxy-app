"""
Bosqich 8 — JSON
python3 exercises/ex04_json.py
"""

from __future__ import annotations

import json
from pathlib import Path


def to_json_str(data: dict | list) -> str:
    """Dict/list ni JSON stringga (ensure_ascii=False, indent=2)."""
    # TODO
    raise NotImplementedError


def from_json_str(text: str) -> dict | list:
    """JSON stringdan Python obyekt."""
    # TODO
    raise NotImplementedError


def save_json(path: Path, data: dict | list) -> None:
    """Faylga yozish (utf-8)."""
    # TODO
    raise NotImplementedError


def load_json(path: Path) -> dict | list:
    """Fayldan o'qish."""
    # TODO
    raise NotImplementedError


def append_item(path: Path, item: dict) -> list[dict]:
    """
    Agar fayl yo'q yoki bo'sh bo'lsa [] dan boshlang.
    item ni list oxiriga qo'shing, saqlang, yangi listni qaytaring.
    """
    # TODO
    raise NotImplementedError


def _check() -> None:
    import tempfile

    sample = {"ism": "Ali", "yosh": 20}
    text = to_json_str(sample)
    assert '"ism"' in text and "Ali" in text
    assert from_json_str(text) == sample

    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "data.json"
        save_json(p, sample)
        assert load_json(p) == sample

        items_path = Path(tmp) / "items.json"
        got = append_item(items_path, {"id": 1})
        assert got == [{"id": 1}]
        got = append_item(items_path, {"id": 2})
        assert got == [{"id": 1}, {"id": 2}]
        assert load_json(items_path) == [{"id": 1}, {"id": 2}]

    print("ex04_json: OK")


if __name__ == "__main__":
    _check()
