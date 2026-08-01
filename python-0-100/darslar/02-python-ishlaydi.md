# 02 — Python qanday ishlaydi (10%)

## Zanjir
```text
1. Siz .py yozasiz
2. Parser → AST (daraxt)
3. Compiler → bytecode
4. PVM bajaradi
```

`.pyc` / `__pycache__` — saqlangan bytecode (keyingi safar tezroq).

## O‘zgaruvchi = havola
Python da `x = 10` degani: ism `x` ni obyektga bog‘lash.

```python
a = [1]
b = a      # bir xil obyekt
c = [1]    # boshqa obyekt
print(a is b)  # True
print(a is c)  # False
print(a == c)  # True (qiymat)
```

- `==` qiymat
- `is` bir xil obyekt (`None` uchun: `x is None`)

## O‘tdim
- [ ] Source → bytecode → PVM chizasiz
- [ ] `==` / `is` farqi aniq
