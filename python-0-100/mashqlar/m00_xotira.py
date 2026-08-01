"""
15% — Memory
python3 mashqlar/m00_xotira.py
"""
from __future__ import annotations


def same_object(a, b) -> bool:
    """Bir xil obyektmi? (is)"""
    # TODO
    raise NotImplementedError


def share_list_append(original: list, value) -> list:
    """original ga bog'langan ism orqali append; umumiy listni qaytar."""
    # TODO
    raise NotImplementedError


def independent_copy(original: list) -> list:
    """Sayoz nusxa — original.append nusxaga tegmasin."""
    # TODO
    raise NotImplementedError


def count_unique_ids(values: list) -> int:
    """Nechta turli id()?"""
    # TODO
    raise NotImplementedError


def describe_binding() -> dict:
    """
    x=[1]; y=x; z=x[:]; y.append(2)
    return {x,y,z,x_is_y,x_is_z}
    """
    # TODO
    raise NotImplementedError


def _check() -> None:
    a, b, c = [], None, []
    b = a
    assert same_object(a, b) is True
    assert same_object(a, c) is False
    original = [1]
    shared = share_list_append(original, 2)
    assert shared == [1, 2] and original == [1, 2] and shared is original
    src = [10, 20]
    copied = independent_copy(src)
    src.append(30)
    assert copied == [10, 20] and copied is not src
    x = [1]
    assert count_unique_ids([x, x, [1]]) == 2
    got = describe_binding()
    assert got["x"] == [1, 2] and got["y"] == [1, 2] and got["z"] == [1]
    assert got["x_is_y"] is True and got["x_is_z"] is False
    print("m00_xotira: OK")


if __name__ == "__main__":
    _check()
