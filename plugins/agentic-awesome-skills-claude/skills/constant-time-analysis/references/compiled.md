# Constant-Time Analysis: Compiled Languages

Analysis guidance for C, C++, Go, and Rust. These languages compile to native assembly, where timing side-channels are detected by scanning for variable-time CPU instructions.

## Running the Analyzer

```bash
# C/C++ (default: clang, native architecture)
uv run {baseDir}/ct_analyzer/analyzer.py crypto.c

# Go
uv run {baseDir}/ct_analyzer/analyzer.py crypto.go

# Rust
uv run {baseDir}/ct_analyzer/analyzer.py crypto.rs

# Cross-architecture testing (RECOMMENDED)
uv run {baseDir}/ct_analyzer/analyzer.py --arch x86_64 crypto.c
uv run {baseDir}/ct_analyzer/analyzer.py --arch arm64 crypto.c

# Multiple optimization levels
uv run {baseDir}/ct_analyzer/analyzer.py --opt-level O0 crypto.c
uv run {baseDir}/ct_analyzer/analyzer.py --opt-level O3 crypto.c

# Include conditional branch warnings
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.c

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'sign|verify|decrypt' crypto.c

# CI-friendly JSON output
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.c
```

## Supported Compilers

| Language | Compiler | Flag |
|----------|----------|------|
| C/C++ | gcc | `--compiler gcc` |
| C/C++ | clang (default) | `--compiler clang` |
| Go | go | `--compiler go` |
| Rust | rustc | `--compiler rustc` |

## Supported Architectures

x86_64, arm64, arm, riscv64, ppc64le, s390x, i386

## Dangerous Instructions by Architecture

| Architecture | Division | Floating-Point |
|-------------|----------|----------------|
| x86_64 | DIV, IDIV, DIVQ, IDIVQ | DIVSS, DIVSD, SQRTSS, SQRTSD |
| ARM64 | UDIV, SDIV | FDIV, FSQRT |
| ARM | UDIV, SDIV | VDIV, VSQRT |
| RISC-V | DIV, DIVU, REM, REMU | FDIV.S, FDIV.D, FSQRT |
| PowerPC | DIVW, DIVD | FDIV, FSQRT |
| s390x | D, DR, DL, DLG, DSG | DDB, SQDB |

## Constant-Time Patterns

### Replace Division

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

### Replace Branches

```c
// VULNERABLE: Branch timing reveals secret
if (secret) { result = a; } else { result = b; }

// Candidate selection pattern: generated native code still requires review
uint32_t mask = -(uint32_t)(secret != 0);
result = (a & mask) | (b & ~mask);
```

### Replace Comparisons

```c
// VULNERABLE: memcmp returns early on mismatch
if (memcmp(a, b, len) == 0) { ... }

// SAFE: Constant-time comparison
if (CRYPTO_memcmp(a, b, len) == 0) { ... }  // OpenSSL
if (subtle.ConstantTimeCompare(a, b) == 1) { ... }  // Go
```

## Common Mistakes

1. **Testing only one optimization level** - Compilers make different decisions at O0 vs O3. A clean O2 build may have divisions at O0.

2. **Testing only one architecture** - ARM and x86 have different division behavior. Test your deployment targets.

3. **Ignoring warnings** - Conditional branches on secrets are exploitable. Use `--warnings` and review each branch.

4. **Assuming the tool catches everything** - This tool detects instruction-level issues only. It cannot detect:
   - Cache timing from memory access patterns
   - Microarchitectural attacks (Spectre, etc.)
   - Whether flagged code actually processes secrets

5. **Fixing symptoms, not causes** - If compiler introduces division, understand why. Sometimes the algorithm itself needs redesign.

## Go-Specific Notes

Go compiles to native code, so the analyzer builds a binary and disassembles it using `go tool objdump`. The analyzer:
- Sets `CGO_ENABLED=0` for pure Go analysis
- Supports cross-compilation via `GOARCH` environment variable
- Uses `-N -l` gcflags for O0 (disable optimizations)

## Rust-Specific Notes

Rust uses `rustc --emit=asm` for assembly generation. The analyzer:
- Maps optimization levels to rustc's `-C opt-level` flag
- Supports cross-compilation via `--target` flag
- Analyzes the emitted assembly for timing-unsafe instructions

## CI Integration

```yaml
- name: Check constant-time properties
  run: |
    uv run ct_analyzer/analyzer.py --json src/crypto/*.c
    # Exit code 1 = violations found
```
