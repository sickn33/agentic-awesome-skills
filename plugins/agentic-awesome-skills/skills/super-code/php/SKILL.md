---
name: php
description: "Language-specific super-code guidelines for php."
risk: safe
source: community
date_added: "2026-06-16"
---
# PHP: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for php.

## Table of Contents
1. [Arrays & Collections](#arrays)
2. [Type Safety](#types)
3. [Error Handling](#errors)
4. [String Handling](#strings)
5. [OOP & Modern PHP](#oop)
6. [Functions & Closures](#functions)
7. [Anti-patterns specific to PHP](#antipatterns)

---

## 1. Arrays & Collections {#arrays}

```php
// ❌ Manual accumulation
$result = [];
foreach ($items as $item) {
    if ($item->isActive()) {
        $result[] = strtoupper($item->getName());
    }
}

// ✅
$result = array_map(
    fn($i) => strtoupper($i->getName()),
    array_filter($items, fn($i) => $i->isActive())
);
```

```php
// ❌ Manual key-value grouping
$grouped = [];
foreach ($items as $item) {
    $grouped[$item->getCategory()][] = $item;
}

// ✅ (PHP 8.1+) — or use the loop above; PHP lacks a built-in groupBy
// The foreach is actually idiomatic PHP for grouping. No need to force array_* here.
```

```php
// ❌ Checking isset then accessing
if (isset($data['key'])) {
    $value = $data['key'];
} else {
    $value = 'default';
}

// ✅
$value = $data['key'] ?? 'default';
```

```php
// ❌ array_push for single element
array_push($items, $newItem);

// ✅
$items[] = $newItem;
```

**Use `array_map`/`array_filter` for transforms. The `foreach` loop is fine when array functions would be less readable.**

---

## 2. Type Safety {#types}

```php
// ❌ No type declarations
function process($items) {
    return $items;
}

// ✅ (PHP 8.0+)
function process(array $items): array {
    return $items;
}
```

```php
// ❌ Union type for nullable
function find(string $key): string|null { ... }

// ✅
function find(string $key): ?string { ... }
```

```php
// ❌ Loose comparison
if ($value == '0') { ... } // true for 0, '', false, null

// ✅
if ($value === '0') { ... }
```

```php
// ❌ Type checking with gettype()
if (gettype($x) === 'integer') { ... }

// ✅
if (is_int($x)) { ... }
// or with union types, avoid checks entirely
```

**Enable `declare(strict_types=1)` at the top of every file.**

---

## 3. Error Handling {#errors}

```php
// ❌ Suppressing errors with @
$data = @file_get_contents($path);

// ✅
$data = file_get_contents($path);
if ($data === false) {
    throw new RuntimeException("Failed to read: $path");
}
```

```php
// ❌ Catching \Exception and swallowing
try { process(); }
catch (\Exception $e) { /* silence */ }

// ✅
try {
    process();
} catch (SpecificException $e) {
    $this->logger->error($e->getMessage(), ['exception' => $e]);
    throw new AppException('Processing failed', previous: $e);
}
```

```php
// ❌ Returning mixed types for error indication
function divide(int $a, int $b): int|false {
    if ($b === 0) return false;
    return intdiv($a, $b);
}

// ✅ — throw exception for exceptional cases
function divide(int $a, int $b): int {
    if ($b === 0) throw new \DivisionByZeroError();
    return intdiv($a, $b);
}
```

---

## 4. String Handling {#strings}

```php
// ❌ Concatenation for variable interpolation
$msg = 'Hello, ' . $name . '! You have ' . $count . ' messages.';

// ✅
$msg = "Hello, {$name}! You have {$count} messages.";
```

```php
// ❌ Manual string contains check
if (strpos($haystack, $needle) !== false) { ... }

// ✅ (PHP 8.0+)
if (str_contains($haystack, $needle)) { ... }
```

```php
// ❌ substr for prefix/suffix check
if (substr($str, 0, 4) === 'http') { ... }
if (substr($str, -4) === '.php') { ... }

// ✅ (PHP 8.0+)
if (str_starts_with($str, 'http')) { ... }
if (str_ends_with($str, '.php')) { ... }
```

---

## 5. OOP & Modern PHP {#oop}

```php
// ❌ Manual constructor property assignment
class User {
    private string $name;
    private int $age;
    public function __construct(string $name, int $age) {
        $this->name = $name;
        $this->age = $age;
    }
}

// ✅ (PHP 8.0+)
class User {
    public function __construct(
        private readonly string $name,
        private readonly int $age,
    ) {}
}
```

```php
// ❌ Constants as class properties
class Status {
    const ACTIVE = 'active';
    const INACTIVE = 'inactive';
}

// ✅ (PHP 8.1+)
enum Status: string {
    case Active = 'active';
    case Inactive = 'inactive';
}
```

```php
// ❌ instanceof chains
if ($shape instanceof Circle) { ... }
elseif ($shape instanceof Rectangle) { ... }

// ✅ (PHP 8.0+)
$area = match(true) {
    $shape instanceof Circle => $shape->radius ** 2 * M_PI,
    $shape instanceof Rectangle => $shape->width * $shape->height,
    default => throw new \InvalidArgumentException("Unknown shape"),
};
```

```php
// ❌ Named constructor via static method returning new self()
class Money {
    public static function fromCents(int $cents): self {
        $m = new self();
        $m->cents = $cents;
        return $m;
    }
}

// ✅ (PHP 8.0+) — constructor promotion + named arguments
class Money {
    public function __construct(
        public readonly int $cents,
    ) {}
}
$m = new Money(cents: 500);
```

---

## 6. Functions & Closures {#functions}

```php
// ❌ Verbose closure for simple operation
$doubled = array_map(function ($x) { return $x * 2; }, $numbers);

// ✅ (PHP 7.4+)
$doubled = array_map(fn($x) => $x * 2, $numbers);
```

```php
// ❌ Passing globals or using `global` keyword
global $db;
function getUser(int $id) {
    global $db;
    return $db->find($id);
}

// ✅ — dependency injection
function getUser(int $id, PDO $db): ?User {
    return $db->find($id);
}
```

```php
// ❌ Named arguments abused for every call
str_pad(string: $s, length: 10, pad_string: ' ', pad_type: STR_PAD_LEFT);

// ✅ — named args are useful for readability on ambiguous params; don't force
str_pad($s, 10, ' ', STR_PAD_LEFT);
// but named args shine for: new User(name: 'Alice', age: 30)
```

---

## 7. Anti-patterns specific to PHP {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `==` for comparison | `===` (strict equality) |
| `@` error suppression | explicit error handling |
| `global` keyword | dependency injection |
| `extract()` on user input | access keys explicitly |
| `die()` / `exit()` in library code | throw exception |
| `strpos !== false` for contains | `str_contains()` (PHP 8.0) |
| Manual constructor assignment | constructor promotion (PHP 8.0) |
| Class constants for enums | `enum` (PHP 8.1) |
| `mixed` return types | specific typed returns |
| `array` for everything | typed classes / DTOs |
| `var_dump` / `print_r` debugging | proper logging (PSR-3) |
| Not using `declare(strict_types=1)` | always enable |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
