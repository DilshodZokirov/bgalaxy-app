# 12 — Comprehension, lambda, *args (75%)

## Comprehension
```python
squares = [x * x for x in range(5)]
mapping = {x: x * x for x in range(5)}
unique = {c.lower() for c in ["A", "a", "B"]}
```

## lambda
```python
items = [("a", 2), ("b", 1)]
items.sort(key=lambda t: t[1])
```

## *args / **kwargs
```python
def total(*nums):
    return sum(nums)

def conf(**kwargs):
    return kwargs.get("debug", False)

print(total(1, 2, 3))
print(conf(debug=True))
```

## unpacking
```python
a, *rest = [1, 2, 3, 4]
```

## Mashq
```bash
python3 mashqlar/m05_comprehension.py
```

## O'tdim
- [ ] m05 OK
