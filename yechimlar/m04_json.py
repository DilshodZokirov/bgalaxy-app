"""Yechim"""
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
            raise TypeError("list kerak")
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
    assert "Ali" in text and from_json_str(text) == sample
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "data.json"
        save_json(p, sample)
        assert load_json(p) == sample
        items = Path(tmp) / "items.json"
        assert append_item(items, {"id": 1}) == [{"id": 1}]
        assert append_item(items, {"id": 2}) == [{"id": 1}, {"id": 2}]
    print("m04_json (yechim): OK")


if __name__ == "__main__":
    _check()
