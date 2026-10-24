# C/C++ Sharp Edges

> Catalog correction (CC-BY-SA-4.0 adaptation; original attribution/license in UPSTREAM-NOTICE.md): snippets are isolated teaching fragments, not production implementations or an assertion of exploitability. Confirm the installed language/library version, trust boundary, reachable input and impact. Use inert local fixtures only; do not execute the intentionally unsafe snippets, untrusted audited code or destructive payloads. No network attack or configuration change is authorized by this guide.


## Integer Overflow is Undefined Behavior

```c
// DANGEROUS: Signed overflow is UB, compiler can optimize away checks
int x = INT_MAX;
if (x + 1 > x) {  // Compiler may assume always true (UB)
    // Overflow check optimized away!
}

// DANGEROUS: Size calculations
size_t size = user_count * sizeof(struct User);
// If user_count * sizeof overflows, allocates tiny buffer
void *buf = malloc(size);
```

**The Problem**: Signed integer overflow is undefined behavior. Compilers assume it never happens and optimize accordingly—including removing overflow checks.

**Detection**: Look for arithmetic on signed integers, especially in size calculations, loop bounds, and allocation sizes.

## Buffer Handling

```c
// DANGEROUS: No bounds checking
char buf[64];
strcpy(buf, user_input);       // Classic overflow
sprintf(buf, "Hello %s", name); // Format + overflow
gets(buf);                      // Never use, removed in C11

// DANGEROUS: Off-by-one
char buf[64];
strncpy(buf, src, 64);         // NOT null-terminated if src >= 64!
buf[63] = '\0';                // Must do manually

// DANGEROUS: snprintf return value
int ret = snprintf(buf, sizeof(buf), "%s", long_string);
// ret is length that WOULD be written, not actual length
// If ret >= sizeof(buf), output was truncated
```

**Safe Alternatives**:
- `strlcpy`, `strlcat` (BSD, not standard)
- `snprintf` with proper return value checking
- C11 Annex K `strcpy_s`, `sprintf_s` (limited support)

## Format Strings

```c
// DANGEROUS: User controls format
printf(user_input);            // Format string attack
syslog(LOG_INFO, user_input);  // Same problem
fprintf(stderr, user_input);   // Same problem

// Attacker input: "%x%x%x%x" → leaks stack
// Attacker input: "%n" → writes to memory

// SAFE: Format as literal
printf("%s", user_input);
```

**Detection**: Any `*printf` family function where the format argument is not a string literal.

## Memory Cleanup

```c
// DANGEROUS: Compiler may optimize away
char password[64];
// ... use password ...
memset(password, 0, sizeof(password));  // May be removed!

// The compiler sees: "writes to password, then password goes out of scope"
// Optimization: "dead store elimination" removes the memset
```

**Safe Alternatives**:
```c
// Option 1: explicit_bzero (BSD, glibc 2.25+)
explicit_bzero(password, sizeof(password));

// Option 2: SecureZeroMemory (Windows)
SecureZeroMemory(password, sizeof(password));

// Historical fallback: compiler-specific behavior, not a portable secure-erasure guarantee
static void *(*const volatile memset_ptr)(void *, int, size_t) = memset;
memset_ptr(password, 0, sizeof(password));

// Option 4: C11 memset_s (limited support)
memset_s(password, sizeof(password), 0, sizeof(password));
```

## Uninitialized Variables

```c
// DANGEROUS: Uninitialized stack variables
int result;
if (condition) {
    result = compute();
}
return result;  // Uninitialized if !condition

// DANGEROUS: Uninitialized struct padding
struct {
    char a;      // 1 byte
    // 3 bytes padding (uninitialized)
    int b;       // 4 bytes
} s;
s.a = 'x';
s.b = 42;
send(sock, &s, sizeof(s), 0);  // Leaks 3 bytes of stack
```

**Fix**: Initialize members and serialize fields explicitly into a defined wire format. Struct padding is not a portable serialization contract; do not send sizeof(struct) bytes merely because members were initialized.

## Double Free and Use-After-Free

```c
// DANGEROUS: Double free
free(ptr);
// ... later ...
free(ptr);  // Heap corruption

// DANGEROUS: Use after free
free(ptr);
ptr->value = 42;  // Writing to freed memory

// DANGEROUS: Returning pointer to local
char *get_greeting() {
    char buf[64] = "hello";
    return buf;  // Stack pointer invalid after return
}
```

**Mitigations**:
- Set the owning pointer to NULL after free where appropriate; other aliases can still dangle.
- Use static analysis (Coverity, cppcheck)
- Use AddressSanitizer in testing

## Signal Handler Issues

```c
// DANGEROUS: Non-async-signal-safe functions in handler
void handler(int sig) {
    printf("Got signal\n");  // NOT async-signal-safe
    malloc(100);             // NOT async-signal-safe
    free(ptr);               // NOT async-signal-safe
}

// Async-signal-safe: write(), _exit(), signal()
// Most functions including printf, malloc, free are NOT safe
```

## Time-of-Check to Time-of-Use (TOCTOU)

```c
// DANGEROUS: File state can change between check and use
if (access(filename, W_OK) == 0) {
    // Attacker replaces file with symlink here
    fd = open(filename, O_WRONLY);  // Opens different file
}
```

**Fix**: Open first, then check permissions on the file descriptor.

## Variadic Function Pitfalls

```c
// DANGEROUS: Wrong format specifier
printf("%d", (long long)value);  // %d expects int, not long long
printf("%s", 42);                // Interprets 42 as pointer

// DANGEROUS: Missing sentinel
execl("/bin/ls", "ls", "-l", NULL);  // NULL required!
execl("/bin/ls", "ls", "-l");        // Missing NULL = UB
```

## Macro Pitfalls

```c
// DANGEROUS: Macro arguments evaluated multiple times
#define SQUARE(x) ((x) * (x))
int a = 5;
SQUARE(a++);  // Expands to two unsequenced modifications: undefined behavior, not a reliable numeric result.

// DANGEROUS: Operator precedence
#define ADD(a, b) a + b
int x = ADD(1, 2) * 3;  // Expands to 1 + 2 * 3 = 7, not 9

// SAFER: Fully parenthesize
#define ADD(a, b) ((a) + (b))
```

## Detection Patterns

Search for these patterns in C/C++ code:

| Pattern | Risk |
|---------|------|
| `strcpy`, `strcat`, `gets`, `sprintf` | Buffer overflow |
| `printf(var)` where var is not literal | Format string |
| `memset` before variable goes out of scope | Dead store elimination |
| `free(ptr)` without `ptr = NULL` | Double free risk |
| `malloc` without overflow check on size | Integer overflow |
| Arithmetic on `int` near INT_MAX | Signed overflow UB |
| `strncpy` without explicit null termination | Missing terminator |
