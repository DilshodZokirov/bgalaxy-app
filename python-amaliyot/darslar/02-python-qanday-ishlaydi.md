# 02 — Python qanday ishlaydi (CPython)

## Atamalar

- **CPython** — eng ko‘p ishlatiladigan Python: C tilida yozilgan implementatsiya
- **Source** — siz yozgan `.py`
- **Bytecode** — Python VM tushunadigan oraliq ko‘rsatmalar
- **PVM** — Python Virtual Machine (bytecode ni bajaruvchi)

## Ketma-ketlik

```text
1) Siz:  print("Salom")
2) Parser: matnni daraxtga (AST) aylantiradi
3) Compiler: AST → bytecode
4) Eval loop (PVM): bytecode ni bajaradi
5) Natija: ekranga "Salom"
```

## `.pyc` nima?

`__pycache__/` ichida `.pyc` paydo bo‘ladi — bu **saqlangan bytecode**.  
Keyingi safar bir xil fayl tezroq yuklanadi (qayta kompilyatsiya shart emas).

```bash
python3 -c "import hello"   # agar hello.py bo'lsa, __pycache__ chiqishi mumkin
```

## `python3 fayl.py` da nima bo‘ladi?

1. Interpreter jarayoni ochiladi
2. Fayl o‘qiladi
3. Compile → bytecode
4. Global namespace yaratiladi (`__name__ == "__main__"`)
5. Kod bajariladi
6. Jarayon tugaydi — oddiy holatda xotira OS ga qaytadi

## Muhim tushuncha: “o‘zgaruvchi” aslida

Ko‘p tillarda:

```text
quti (xotira joyi) ← qiymat yoziladi
```

Python da:

```text
ism  ──────►  obyekt (xotirada)
```

`x = 10` degani: **ism** `x` ni `10` obyektiga bog‘lash (reference / pointer g‘oyasi).

```python
a = 1000
b = a          # b ham xuddi shu obyektga qaraydi
a = 2000       # a endi boshqa obyektga qaraydi; b o'zgarmaydi
```

## `id()` va `is`

```python
x = []
y = x
print(id(x), id(y))   # bir xil — bitta obyekt
print(x is y)         # True

a = [1]
b = [1]
print(a == b)         # True  (qiymat teng)
print(a is b)         # False (turli obyektlar)
```

- `==` — qiymat tengmi?
- `is` — **bir xil obyektmi?** (odatda `None` tekshiruvida)

## O‘tdim

- [ ] Source → bytecode → PVM zanjirini chiza olasiz
- [ ] Python da ism = obyektga havola ekanini tushunasiz
- [ ] `==` va `is` farqini bilasiz
