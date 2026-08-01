"""
Bosqich: Memory asoslari
python3 exercises/ex00_xotira.py
"""

from __future__ import annotations


def same_object(a, b) -> bool:
    """a va b bir xil obyektmi? (== emas, is)"""
    # TODO
    raise NotImplementedError


def share_list_append(original: list, value) -> list:
    """
    original ga bog'langan yangi ism yarating, value ni append qiling.
    Qaytaring: o'sha umumiy list (original ham o'zgarishi kerak).
    """
    # TODO
    raise NotImplementedError


def independent_copy(original: list) -> list:
    """
    original ning sayoz nusxasini qaytaring (tashqi list alohida).
    original.append(...) nusxaga ta'sir qilmasin.
    """
    # TODO
    raise NotImplementedError


def count_unique_ids(values: list) -> int:
    """Ro'yxatdagi elementlarning nechta turli id() si bor?"""
    # TODO
    raise NotImplementedError


def describe_binding() -> dict:
    """
    Quyidagi skript natijasini qaytaring (hisoblab yozing / ishga tushirib tekshiring):

        x = [1]
        y = x
        z = x[:]
        y.append(2)

    Qaytarish formati:
    {
      "x": [...],
      "y": [...],
      "z": [...],
      "x_is_y": bool,
      "x_is_z": bool,
    }
    """
    # TODO
    raise NotImplementedError


def _check() -> None:
    a = []
    b = a
    c = []
    assert same_object(a, b) is True
    assert same_object(a, c) is False

    original = [1]
    shared = share_list_append(original, 2)
    assert shared == [1, 2]
    assert original == [1, 2]
    assert shared is original

    src = [10, 20]
    copied = independent_copy(src)
    src.append(30)
    assert copied == [10, 20]
    assert copied is not src

    x = [1]
    assert count_unique_ids([x, x, [1]]) == 2

    got = describe_binding()
    assert got["x"] == [1, 2]
    assert got["y"] == [1, 2]
    assert got["z"] == [1]
    assert got["x_is_y"] is True
    assert got["x_is_z"] is False
    print("ex00_xotira: OK")


if __name__ == "__main__":
    _check()
