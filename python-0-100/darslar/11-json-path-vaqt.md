# 11 — JSON, pathlib, datetime (70%)

## JSON
```python
import json
from pathlib import Path

data = {"ism": "Ali", "yosh": 20}
text = json.dumps(data, ensure_ascii=False, indent=2)
obj = json.loads(text)

path = Path("data.json")
path.write_text(text, encoding="utf-8")
obj2 = json.loads(path.read_text(encoding="utf-8"))
```

## pathlib
```python
p = Path("loyihalar") / "02_todo"
print(p.exists())
```

## datetime
```python
from datetime import datetime, date
print(datetime.now())
print(date.today().isoformat())
```

## Mashq
```bash
python3 mashqlar/m04_json.py
```

## O'tdim
- [ ] m04 OK
