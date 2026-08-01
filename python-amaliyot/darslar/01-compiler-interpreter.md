# 01 — Compiler va Interpreter

Dastur yozasiz — lekin kompyuter faqat **mashina kodi** (0 va 1) ni tushunadi. Shu oraliqni kim to‘ldiradi?

## Ikki yo‘l

### Compiler (kompilyator)

```text
Sizning kodingiz  →  COMPILER  →  mustaqil bajariladigan fayl (exe / binary)
                                      ↓
                                 to'g'ridan-to'g'ri ishlaydi
```

- **Bir marta** tarjima qilinadi, keyin tez ishlaydi
- Misollar: C, C++, Go, Rust
- Xato ko‘pincha **tarjima paytida** chiqadi

### Interpreter (interpretator)

```text
Sizning kodingiz  →  INTERPRETER  →  qatorma-qator (yoki bosqichma-bosqich) bajaradi
```

- Har ishga tushganda o‘qiydi / bajaradi
- Misollar: klassik BASIC, shell skriptlar
- Xato ko‘pincha **ishlash paytida** chiqadi

## Python qaysi?

Python **sof interpreter emas** — aralash model:

```text
hello.py  →  CPython compiler  →  bytecode (.pyc)
                                      ↓
                              Python Virtual Machine
                              (interpreter) bajaradi
```

1. **Compile bosqichi** — `.py` → bytecode (tezkor, ichki)
2. **Interpret bosqichi** — bytecode ni PVM bajaradi

Shuning uchun aytiladi: *Python interpreted language*, lekin ichida kompilyatsiya ham bor.

## Solishtirish

| | Compiler (C) | Python (CPython) |
|---|---|---|
| Natija | binary | bytecode + runtime |
| Tezlik | odatda tezroq | sekinroq, lekin qulay |
| Ishga tushirish | kompilyatsiyadan keyin | `python3 fayl.py` |
| Xotira | dasturchi ko‘proq boshqaradi | runtime + GC yordamida |

## JIT haqida (qisqa)

Ba’zi tillar (Java, JavaScript, PyPy) **JIT** ishlatadi: ishlash paytida “issiq” kodni yana tezroq mashina kodiga aylantiradi.  
Oddiy `python3` (CPython) asosan bytecode + interpreter; **PyPy** esa JIT li Python.

## Amaliy tekshiruv

```bash
python3 -c "import dis; dis.dis('x = 1 + 2')"
```

Bu `1 + 2` ning **bytecode** ko‘rinishini chiqaradi — compiler ishlaganining dalili.

## O‘tdim

- [ ] Compiler va interpreter farqini og‘zaki tushuntira olasiz
- [ ] Pythonning “compile + interpret” modelini bilasiz
- [ ] `dis.dis(...)` ni bir marta ishga tushirib ko‘rdingiz
