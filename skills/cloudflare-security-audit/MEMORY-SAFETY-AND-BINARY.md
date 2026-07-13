# Memory Safety and Binary Audit Patterns

## Buffer Overflow Detection

Look for:
- `strcpy`, `strcat`, `sprintf`, `gets` in C/C++
- Array access without bounds checking
- Manual memory management (`malloc`, `free`, `new`, `delete`)
- Pointer arithmetic without validation

## Format String Vulnerabilities

Look for:
- User-controlled format strings in `printf`, `fprintf`, `sprintf`
- Direct string interpolation in logging functions

## Use-After-Free

Look for:
- Pointer usage after `free()` or `delete`
- Dangling pointers in data structures
- Double-free conditions

## Integer Overflow

Look for:
- Arithmetic operations without overflow checking
- Size calculations that could wrap around
- Signed/unsigned comparison issues

## Race Conditions

Look for:
- Shared state access without synchronization
- Time-of-check-to-time-of-use (TOCTOU) patterns
- File operations without proper locking

## Binary Analysis

Look for:
- Stack canary presence (`-fstack-protector`)
- Position-independent executable (PIE) flags
- Non-executable stack (NX bit)
- Address space layout randomization (ASLR) compatibility
