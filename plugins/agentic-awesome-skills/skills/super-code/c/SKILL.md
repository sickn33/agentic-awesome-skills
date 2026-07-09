---
name: c
description: "Language-specific super-code guidelines for c."
risk: safe
source: community
date_added: "2026-06-16"
---
# C: Idiomatic Efficiency Reference

## When to Use
- Use this skill when the task matches this description: Language-specific super-code guidelines for c.

## Table of Contents
1. [Memory Management](#memory)
2. [Pointers & Arrays](#pointers)
3. [Error Handling](#errors)
4. [Strings](#strings)
5. [Structs & Enums](#structs)
6. [Preprocessor & Headers](#preprocessor)
7. [Anti-patterns specific to C](#antipatterns)

---

## 1. Memory Management {#memory}

```c
// ❌ malloc without checking return value
char *buf = malloc(size);
strcpy(buf, src);

// ✅
char *buf = malloc(size);
if (!buf) return -ENOMEM;
memcpy(buf, src, size);
```

```c
// ❌ Casting malloc result (unnecessary in C, hides missing #include)
int *p = (int *)malloc(n * sizeof(int));

// ✅
int *p = malloc(n * sizeof *p);
```

```c
// ❌ free without nulling (dangling pointer risk in long-lived scope)
free(ptr);
// ... later code might use ptr

// ✅
free(ptr);
ptr = NULL;
```

```c
// ❌ Forgetting to free on early-return paths
char *a = malloc(100);
char *b = malloc(200);
if (!b) return -1; // leaks a

// ✅ — single cleanup label
char *a = NULL, *b = NULL;
a = malloc(100);
if (!a) goto cleanup;
b = malloc(200);
if (!b) goto cleanup;
// ... use a, b ...
cleanup:
    free(b);
    free(a);
```

**Use `sizeof *ptr` instead of `sizeof(Type)` — it stays correct when the type changes.**

---

## 2. Pointers & Arrays {#pointers}

```c
// ❌ Manual array size tracking
void process(int *arr, int len) { ... }
process(data, 10);

// ✅ — pass size alongside pointer, or use a struct
typedef struct { int *data; size_t len; } IntSlice;
```

```c
// ❌ Pointer arithmetic where array indexing is clearer
*(arr + i) = value;

// ✅
arr[i] = value;
```

```c
// ❌ VLA in production code (stack overflow risk, optional in C11+)
int arr[n];

// ✅
int *arr = malloc(n * sizeof *arr);
if (!arr) return -ENOMEM;
// ... use arr ...
free(arr);
```

---

## 3. Error Handling {#errors}

```c
// ❌ Using magic numbers for error returns
if (do_thing() == -1) { ... }

// ✅ — define or use named error codes
#include <errno.h>
if (do_thing() < 0) {
    perror("do_thing");
    return errno;
}
```

```c
// ❌ Deeply nested error checks
int r1 = step1();
if (r1 == 0) {
    int r2 = step2();
    if (r2 == 0) {
        int r3 = step3();
        // ...
    }
}

// ✅ — early return / goto cleanup
if (step1() < 0) goto fail;
if (step2() < 0) goto fail;
if (step3() < 0) goto fail;
return 0;
fail:
    cleanup();
    return -1;
```

**`goto cleanup` is idiomatic C for resource teardown — don't avoid it out of principle.**

---

## 4. Strings {#strings}

```c
// ❌ strcpy without bounds checking
strcpy(dest, src);

// ✅
strncpy(dest, src, sizeof(dest) - 1);
dest[sizeof(dest) - 1] = '\0';
// or better: snprintf(dest, sizeof(dest), "%s", src);
```

```c
// ❌ strcmp misuse
if (str == "hello") { ... } // compares pointers, not content

// ✅
if (strcmp(str, "hello") == 0) { ... }
```

```c
// ❌ Building strings with repeated strcat (O(n²))
char result[1024] = "";
for (int i = 0; i < n; i++) {
    strcat(result, items[i]);
}

// ✅ — track write position
char result[1024];
int pos = 0;
for (int i = 0; i < n && pos < (int)sizeof(result); i++) {
    pos += snprintf(result + pos, sizeof(result) - pos, "%s", items[i]);
}
```

**Prefer `snprintf` over `sprintf` — always.**

---

## 5. Structs & Enums {#structs}

```c
// ❌ Bare struct requiring `struct` keyword everywhere
struct point { int x, y; };
struct point p = {1, 2};

// ✅
typedef struct { int x, y; } Point;
Point p = {1, 2};
```

```c
// ❌ Uninitialized struct
Point p;
use(p.x); // UB

// ✅
Point p = {0};
```

```c
// ❌ Magic integer constants
if (state == 3) { ... }

// ✅
typedef enum { STATE_IDLE, STATE_RUNNING, STATE_DONE } State;
if (state == STATE_DONE) { ... }
```

---

## 6. Preprocessor & Headers {#preprocessor}

```c
// ❌ Macro where inline function works (no type safety, double eval)
#define MAX(a, b) ((a) > (b) ? (a) : (b))
MAX(x++, y) // x incremented twice if x > y

// ✅
static inline int max_int(int a, int b) { return a > b ? a : b; }
```

```c
// ❌ No include guard
// my_header.h
struct Foo { int x; };

// ✅
#ifndef MY_HEADER_H
#define MY_HEADER_H
struct Foo { int x; };
#endif
// or: #pragma once (widely supported, not standard)
```

**Keep macros for conditional compilation and constants. Use `static inline` for logic.**

---

## 7. Anti-patterns specific to C {#antipatterns}

| Anti-pattern | Preferred |
|---|---|
| `sprintf` | `snprintf` with buffer size |
| `gets` | `fgets` (gets is removed in C11) |
| Casting `malloc` result | let implicit `void*` conversion work |
| `sizeof(Type)` in malloc | `sizeof *ptr` |
| VLA for large/runtime arrays | heap allocation |
| `void*` callbacks without context param | pass `void *ctx` alongside function pointer |
| Global mutable state | pass state through struct pointers |
| `assert` for runtime error handling | proper error return codes |
| Missing `const` on read-only pointer params | `const char *str` |
| Mixing signed/unsigned in comparisons | use consistent types, cast explicitly |



## Limitations
- These are language-specific guidelines and do not cover overall architectural decisions.
- Over-compression might reduce readability; apply judgement.
