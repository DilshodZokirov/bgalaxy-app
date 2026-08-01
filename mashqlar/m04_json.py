"""70% — JSON"""
from __future__ import annotations

import json
from pathlib import Path


def to_json_str(data: dict | list) -> str:
    # TODO ensure_ascii=False indent=2
    raise NotImplementedError


def from_json_str(text: str) -> dict | list:
    # TODO
    raise NotImplementedError


def save_json(path: Path, data: dict | list) -> None:
    # TODO
    raise NotImplementedError


def load_json(path: Path) -> dict | list:
    # TODO
    raise NotImplementedError


def append_item(path: Path, item: dict) -> list[dict]:
    # TODO fayl yo'q bo'lsa []
    raise NotImplementedError


def _check() -> None:
    import tempfile
    sample = {"ism": "Ali", "yosh": 20}
    text = to_json_str(sample)
    assert "Ali" in text and from_json_str(text) == sample
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "data.json"
        save_json(p, sample)
        assert load_json(p) == sample
        items = Path(tmp) / "items.json"
        assert append_item(items, {"id": 1}) == [{"id": 1}]
        assert append_item(items, {"id": 2}) == [{"id": 1}, {"id": 2}]
    print("m04_json: OK")


if __name__ == "__main__":
    _check()
