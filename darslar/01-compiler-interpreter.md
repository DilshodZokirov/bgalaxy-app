# 01 — Compiler va Interpreter (5%)

Kompyuter faqat mashina kodini tushunadi. Sizning kodingiz qanday yetib boradi?

## Compiler
```text
kod → COMPILER → binary (.exe) → to'g'ridan-to'g'ri ishlaydi
```
Misollar: C, C++, Go, Rust. Bir marta tarjima, keyin tez.

## Interpreter
```text
kod → INTERPRETER → qatorma-qator bajaradi
```
Misollar: shell, klassik BASIC.

## Python (CPython) — aralash
```text
.py  →  (ichki) compiler  →  bytecode
                                ↓
                         PVM (interpreter) bajaradi
```

Tekshiruv:
```bash
python3 -c "import dis; dis.dis('x = 1 + 2')"
```

## Jadval
| | C (compiler) | Python |
|---|---|---|
| Natija | binary | bytecode + runtime |
| Tezlik | odatda tez | qulay, sekinroq |
| Xotira | ko‘p qo‘lda | GC yordamida |

## O‘tdim
- [ ] Farqni og‘zaki aytolasiz
- [ ] `dis.dis` ni ko‘rdingiz
