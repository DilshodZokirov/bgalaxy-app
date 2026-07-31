"""Yechim — avval o'zingiz urinib ko'ring."""

from __future__ import annotations

import json
from pathlib import Path


def to_json_str(data: dict | list) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def from_json_str(text: str) -> dict | list:
    return json.loads(text)


def save_json(path: Path, data: dict | list) -> None:
    path.write_text(to_json_str(data), encoding="utf-8")


def load_json(path: Path) -> dict | list:
    return from_json_str(path.read_text(encoding="utf-8"))


def append_item(path: Path, item: dict) -> list[dict]:
    if path.exists() and path.read_text(encoding="utf-8").strip():
        data = load_json(path)
        if not isinstance(data, list):
            raise TypeError("JSON ildizi list bo'lishi kerak")
        items = data
    else:
        items = []
    items.append(item)
    save_json(path, items)
    return items


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

    print("ex04_json (yechim): OK")


if __name__ == "__main__":
    _check()
