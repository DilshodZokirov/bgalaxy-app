# 07 — To'plamlar (50%)

## list
```python
a = [1, 2, 3]
a.append(4)
a[0]
```

## dict
```python
u = {"ism": "Ali", "yosh": 20}
u["ism"]
u.get("tel", "-")
```

## set / tuple
```python
s = {1, 2, 2}   # {1, 2}
t = (1, 2)      # o'zgarmas
```

## Comprehension
```python
evens = [n for n in range(10) if n % 2 == 0]
```

## Xotira eslatma
`b = a` list/dict da **nusxa emas**. Nusxa: `a[:]` yoki `list(a)`.

## Mashq
```bash
python3 mashqlar/m02_toplamlar.py
```

## O'tdim
- [ ] m02 OK
