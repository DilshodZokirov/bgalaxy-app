"""Barcha mashqlarni tekshiradi."""
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
    files = sorted(root.glob("m*.py"))
    failed = 0
    for f in files:
        print(f"--- {f.name} ---")
        try:
            _load(f)._check()
        except NotImplementedError:
            print(f"HALI TODO: {f.name}  (yechimlar/)")
            failed += 1
        except Exception as e:
            print(f"XATO: {f.name}: {e}")
            failed += 1
    print("\nOK" if not failed else f"\n{failed} ta hali tayyor emas")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
