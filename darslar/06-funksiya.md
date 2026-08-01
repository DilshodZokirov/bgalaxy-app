# 06 — Funksiya (40%)

```python
def greet(name: str, excited: bool = False) -> str:
    msg = f"Salom, {name}"
    return msg + "!" if excited else msg
```

- Parametr — kiruvchi
- `return` — natija (`print` emas)
- Default — bermasa ham ishlaydi

## Scope
Funksiya ichidagi o'zgaruvchi tashqariga chiqmaydi.

## Mashq
```bash
python3 mashqlar/m01_funksiya.py
```

## O'tdim
- [ ] m01 OK
- [ ] return vs print aniq
