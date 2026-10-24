# Python Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Mutable Default Arguments

```python
# DANGEROUS: Default is shared across all calls
def append_to(item, target=[]):
    target.append(item)
    return target

append_to(1)  # [1]
append_to(2)  # [1, 2] - same list!
append_to(3)  # [1, 2, 3]

# Also affects dicts and other mutables
def register(name, registry={}):
    registry[name] = True
    return registry
```

**The Problem**: Default arguments are evaluated once at function definition, not at each call.

**Fix**: Use `None` sentinel:
```python
def append_to(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

## Eval, Exec, and Code Execution

```python
# DANGEROUS: Arbitrary code execution
eval(user_input)      # Executes Python expression
exec(user_input)      # Executes Python statements

# DANGEROUS: compile + exec
code = compile(user_input, '<string>', 'exec')
exec(code)

# DANGEROUS: input() in Python 2
# In Python 2: input() == eval(raw_input())
# Python 2 code taking input() from users = RCE

# DANGEROUS: Dynamic import
__import__(user_input)
importlib.import_module(user_input)
```

**Also Dangerous**:
- `pickle.loads()` - arbitrary code execution
- `yaml.load()` - arbitrary code execution (use `safe_load`)
- `subprocess.Popen(shell=True)` with user input

## Late Binding Closures

```python
# DANGEROUS: Closures capture variable by reference, not value
funcs = []
for i in range(3):
    funcs.append(lambda: i)

[f() for f in funcs]  # [2, 2, 2] - all see final i

# Same with list comprehension
funcs = [lambda: i for i in range(3)]
[f() for f in funcs]  # [2, 2, 2]
```

**Fix**: Capture by value using default argument:
```python
funcs = []
for i in range(3):
    funcs.append(lambda i=i: i)  # i=i captures current value

[f() for f in funcs]  # [0, 1, 2]
```

## Identity vs Equality

```python
# DANGEROUS: 'is' checks identity, not equality
a = 256
b = 256
a is b  # True - CPython caches small integers [-5, 256]

a = 257
b = 257
a is b  # Implementation/context-dependent, including constant folding; never use identity for numeric equality.

# String interning is also unpredictable
s1 = "hello"
s2 = "hello"
s1 is s2  # True - interned

s1 = "hello world"
s2 = "hello world"
s1 is s2  # Maybe - depends on context

# DANGEROUS in conditionals
if x is True:   # Valid only when exact True singleton identity is intended; use if x for truthiness.
if x is 1:      # Wrong - use: if x == 1
```

**Rule**: Use `is` only for `None`, `True`, `False`, and explicit singleton checks.

## Import Shadowing

```python
# DANGEROUS: Naming your file same as stdlib module
# File: random.py
import random
print(random.randint(1, 10))  # ImportError or recursion!

# Your random.py shadows the stdlib random module

# Similarly dangerous names:
# - email.py (shadows email module)
# - test.py (shadows test framework)
# - types.py (shadows types module)
```

## Exception Handling Pitfalls

```python
# DANGEROUS: Bare except catches everything
try:
    risky_operation()
except:  # Catches KeyboardInterrupt, SystemExit, etc.
    pass

# DANGEROUS: Catching Exception still misses some
try:
    risky_operation()
except Exception:  # Misses KeyboardInterrupt, SystemExit
    pass

# DANGEROUS: Silently swallowing
try:
    important_security_check()
except SomeError:
    pass  # Security check failure ignored!

# DANGEROUS: Exception in except block
try:
    operation()
except SomeError as e:
    log(e)  # If log() raises, original exception lost
    raise
```

## Name Rebinding in Loops

```python
# DANGEROUS: Reusing loop variable
for item in items:
    process(item)

# Later in same scope:
print(item)  # Still bound to last item!

# DANGEROUS with exceptions
for item in items:
    try:
        process(item)
    except Exception as e:
        pass

# In Python 3, 'e' is deleted after except block
# But 'item' persists
```

## Class vs Instance Attributes

```python
# DANGEROUS: Mutable class attribute shared by all instances
class User:
    permissions = []  # Class attribute - shared!

u1 = User()
u2 = User()
u1.permissions.append('admin')
print(u2.permissions)  # ['admin'] - u2 is also admin!
```

**Fix**: Initialize in `__init__`:
```python
class User:
    def __init__(self):
        self.permissions = []  # Instance attribute - unique
```

## String Formatting Injection

```python
# DANGEROUS: Format string with user data as format spec
template = user_input  # e.g. attribute/index traversal such as "{0.__init__.__globals__[SECRET]}"
template.format(some_object)  # Can access arbitrary attributes!

# DANGEROUS: f-string with user input (if using eval)
eval(f'f"{user_input}"')  # Code execution

# DANGEROUS: % formatting with user-controlled format
user_template % (data,)  # Less dangerous but still risky
```

**Fix**: Keep the template trusted and pass untrusted values only as data. Jinja2 autoescape addresses HTML output escaping, not arbitrary template execution; an untrusted template needs a separately reviewed sandbox and resource limits.

## Numeric Precision

```python
# DANGEROUS: Float comparison
0.1 + 0.2 == 0.3  # False!
# 0.1 + 0.2 = 0.30000000000000004

# DANGEROUS: Large integer to float
n = 10**20
float(n) == float(n + 1)  # True - precision loss

# DANGEROUS: Division in Python 2
# 5 / 2 = 2 (integer division in Python 2)
# 5 / 2 = 2.5 (float division in Python 3)
```

## Unpacking Pitfalls

```python
# DANGEROUS: Unpacking user-controlled data
a, b, c = user_list  # ValueError if wrong length

# Can be used for DoS:
# Send list with 10 million elements to function expecting 3
# Ordinary fixed-length unpacking does not necessarily consume the whole input.
# Starred unpacking (a, *rest = iterable) can materialize the remaining iterable; bound input before parsing.
```

## Subprocess Shell Injection

```python
# DANGEROUS: shell=True with user input
import subprocess
subprocess.run(f"ls {user_input}", shell=True)
# user_input = "; rm -rf /" → command injection

# SAFE: Use list form without shell
subprocess.run(["ls", "--", approved_path], timeout=10, check=True)  # Unix example; validate destination and options too
```

## Attribute Access on None

```python
# DANGEROUS: Chained access without checks
result = api.get_user().profile.settings.theme
# Any None in chain causes AttributeError

# Python doesn't have optional chaining like JS (?.)
# Must check each step or use getattr with default
```

## Detection Patterns

| Pattern | Risk |
|---------|------|
| `def f(x=[])` or `def f(x={})` | Mutable default argument |
| `eval(`, `exec(`, `compile(` | Code execution |
| `pickle.loads(`, `yaml.load(` | Deserialization RCE |
| `lambda: var` in loop | Late binding closure |
| `x is 1`, `x is "string"` | Identity vs equality confusion |
| `import x` where x.py exists locally | Import shadowing |
| `except:` or `except Exception:` | Over-broad exception catching |
| `class Foo: bar = []` | Shared mutable class attribute |
| `template.format(obj)` with user template | Format string injection |
| `subprocess.*(..., shell=True)` | Command injection |
