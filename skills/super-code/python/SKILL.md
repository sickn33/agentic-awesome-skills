---
name: python
description: "Language-specific super-code guidelines for python."
risk: safe
source: community
date_added: "2026-06-16"
---
# Python: Idiomatic Efficiency Reference

## Table of Contents
1. [Comprehensions & Generators](#comprehensions)
2. [Unpacking & Destructuring](#unpacking)
3. [Built-ins & stdlib](#builtins)
4. [Functions & Defaults](#functions)
5. [Classes & Dataclasses](#classes)
6. [Error Handling](#errors)
7. [Type Hints](#types)
8. [Anti-patterns specific to Python](#antipatterns)

---

## 1. Comprehensions & Generators {#comprehensions}

```python
# ❌ Imperative accumulation
result = []
for item in items:
    if item.active:
        result.append(item.name.upper())

# ✅
result = [item.name.upper() for item in items if item.active]
```

```python
# ❌ Dict built in a loop
d = {}
for k, v in pairs:
    d[k] = v

# ✅
d = dict(pairs)
# or
d = {k: v for k, v in pairs}
```

```python
# ❌ Generator converted to list unnecessarily
total = sum(list(x * 2 for x in nums))

# ✅ — generator expression works directly in sum()
total = sum(x * 2 for x in nums)
```

**Use generator expressions (not list comprehensions) when the result is consumed once and not stored.**

---

## 2. Unpacking & Destructuring {#unpacking}

```python
# ❌ Index access
first = items[0]
rest = items[1:]

# ✅
first, *rest = items
```

```python
# ❌ Temporary variable for swap
tmp = a
a = b
b = tmp

# ✅
a, b = b, a
```

```python
# ❌ items() with separate indexing
for i in range(len(items)):
    print(i, items[i])

# ✅
for i, item in enumerate(items):
    print(i, item)
```

```python
# ❌ zip with separate index
for i in range(len(a)):
    process(a[i], b[i])

# ✅
for x, y in zip(a, b):
    process(x, y)
```

---

## 3. Built-ins & stdlib {#builtins}

```python
# ❌ Manual max search
max_val = items[0]
for item in items[1:]:
    if item > max_val:
        max_val = item

# ✅
max_val = max(items)
```

```python
# ❌ Manual grouping
from collections import defaultdict
groups = defaultdict(list)
for item in items:
    groups[item.category].append(item)

# ✅ — same thing, just be explicit about defaultdict; it IS the right tool
# (this example is already correct — don't replace defaultdict with a loop)
```

```python
# ❌ Manual sentinel for dict default
if key in d:
    val = d[key]
else:
    val = default

# ✅
val = d.get(key, default)
```

```python
# ❌ Rolling your own counter
counts = {}
for item in items:
    counts[item] = counts.get(item, 0) + 1

# ✅
from collections import Counter
counts = Counter(items)
```

**Use `itertools` (chain, islice, groupby, product) before writing nested loops for combinatorial or streaming logic.**

---

## 4. Functions & Defaults {#functions}

```python
# ❌ Mutable default argument (bug, not just style)
def append_to(item, lst=[]):
    lst.append(item)
    return lst

# ✅
def append_to(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst
```

```python
# ❌ Positional args for everything when keyword clarity helps
create_user("Alice", True, False, 30)

# ✅ — use keyword args at call site for boolean/ambiguous params
create_user("Alice", is_admin=True, is_active=False, age=30)
```

```python
# ❌ Long function doing multiple things
def process_and_save(data):
    # 40 lines of transform
    # 20 lines of DB write
    ...

# ✅ — split only if each part is reused OR independently testable
def _transform(data): ...
def _save(record): ...
def process_and_save(data): _save(_transform(data))
```

---

## 5. Classes & Dataclasses {#classes}

```python
# ❌ Manual __init__ for data holders
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

# ✅
from dataclasses import dataclass

@dataclass
class Point:
    x: float
    y: float
```

```python
# ❌ Class just to hold a namespace of functions
class MathUtils:
    @staticmethod
    def add(a, b): return a + b

# ✅ — module-level functions; classes for state + behavior
def add(a, b): return a + b
```

```python
# ❌ __repr__ written manually when dataclass gives it free
# (see above — use @dataclass)
```

**Use `@dataclass(frozen=True)` for immutable value objects. Use `NamedTuple` when you need tuple unpacking.**

---

## 6. Error Handling {#errors}

```python
# ❌ Bare except
try:
    risky()
except:
    pass

# ✅ — catch the specific exception; don't swallow silently
try:
    risky()
except ValueError as e:
    logger.warning("Invalid value: %s", e)
```

```python
# ❌ LBYL (look before you leap) when EAFP is cleaner
if os.path.exists(path):
    with open(path) as f:
        data = f.read()

# ✅ (EAFP)
try:
    with open(path) as f:
        data = f.read()
except FileNotFoundError:
    data = None
```

```python
# ❌ Re-raising with raise e (loses traceback)
except Exception as e:
    raise e

# ✅
except Exception:
    raise  # bare raise preserves original traceback
```

---

## 7. Type Hints {#types}

```python
# ❌ Overly verbose Union syntax (Python <3.10 style in new code)
from typing import Optional, Union
def f(x: Optional[int]) -> Union[str, None]: ...

# ✅ (Python 3.10+)
def f(x: int | None) -> str | None: ...
```

```python
# ❌ Any where a TypeVar or Protocol would be informative
from typing import Any
def first(lst: list[Any]) -> Any: ...

# ✅
from typing import TypeVar
T = TypeVar("T")
def first(lst: list[T]) -> T: ...
```

**Don't add type hints to every local variable — annotate function signatures and class fields; leave obvious locals inferred.**

---

## 8. Anti-patterns specific to Python {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `len(lst) == 0` | `not lst` |
| `if x == True:` | `if x:` |
| `if x == None:` | `if x is None:` |
| `range(len(lst))` for iteration | `enumerate(lst)` |
| String concatenation in a loop | `"".join(parts)` |
| `import *` | explicit imports |
| Catching `Exception` to log and re-raise | bare `raise` or let it propagate |
| `print()` for debug output | `logging.debug()` |
| `os.path.join` (Python 3.4+) | `pathlib.Path / "subpath"` |
| Manual `__eq__` + `__hash__` on value objects | `@dataclass(eq=True, frozen=True)` |


