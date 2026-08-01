"""Yechim"""
from __future__ import annotations


def same_object(a, b) -> bool:
    return a is b


def share_list_append(original: list, value) -> list:
    alias = original
    alias.append(value)
    return alias


def independent_copy(original: list) -> list:
    return original[:]


def count_unique_ids(values: list) -> int:
    return len({id(v) for v in values})


def describe_binding() -> dict:
    x = [1]
    y = x
    z = x[:]
    y.append(2)
    return {"x": x, "y": y, "z": z, "x_is_y": x is y, "x_is_z": x is z}


def _check() -> None:
    a = []
    b = a
    c = []
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
    print("m00_xotira (yechim): OK")


if __name__ == "__main__":
    _check()
