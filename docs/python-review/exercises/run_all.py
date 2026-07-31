"""Barcha mashqlarni ketma-ket ishga tushiradi."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


def _load(path: Path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> int:
    root = Path(__file__).resolve().parent
    files = [
        root / "ex01_basics.py",
        root / "ex02_collections.py",
        root / "ex03_oop.py",
        root / "ex04_async_mini.py",
    ]
    failed = 0
    for f in files:
        print(f"--- {f.name} ---")
        try:
            mod = _load(f)
            if hasattr(mod, "_check"):
                result = mod._check()
                # async check
                import asyncio
                import inspect

                if inspect.iscoroutine(result):
                    asyncio.run(result)
        except NotImplementedError:
            print(f"HALI TODO: {f.name} (yechimlar: ../solutions/)")
            failed += 1
        except Exception as e:
            print(f"XATO: {f.name}: {e}")
            failed += 1
    if failed:
        print(f"\n{failed} ta mashq hali tayyor emas.")
        return 1
    print("\nHammasi o'tdi ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
