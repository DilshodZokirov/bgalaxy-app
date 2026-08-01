# 14 — Typing va toza kod (85%)

```python
def find_user(user_id: str) -> dict | None:
    ...
```

- `str | None` — string yoki yo'q
- Type hint majburiy emas, lekin o'qishni osonlashtiradi

## Toza kod qoidalari
1. Bir funksiya — bir vazifa
2. Aniq nomlar (`x` emas, `total_price`)
3. Magic number kamaytirish
4. Qisqa funksiyalar
5. Takrorlanishni funksiyaga chiqarish

## O'tdim
- [ ] Oxirgi 3 funksiyangizga type hint qo'ydingiz
