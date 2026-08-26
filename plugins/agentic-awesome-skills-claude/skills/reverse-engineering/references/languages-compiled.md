# CTF Reverse - Compiled Language Reversing (Go, Rust)

## Table of Contents
- [Go Binary Reversing](#go-binary-reversing)
  - [Recognition](#recognition)
  - [Symbol Recovery](#symbol-recovery)
  - [Go Memory Layout](#go-memory-layout)
  - [Goroutine and Concurrency Analysis](#goroutine-and-concurrency-analysis)
  - [Common Go Patterns in Decompilation](#common-go-patterns-in-decompilation)
  - [Go Binary Reversing Workflow](#go-binary-reversing-workflow)
  - [Go Binary UUID Patching for C2 Client Enumeration (BSidesSF 2026)](#go-binary-uuid-patching-for-c2-client-enumeration-bsidessf-2026)
- [Rust Binary Reversing](#rust-binary-reversing)
  - [Rust Recognition](#rust-recognition)
  - [Symbol Demangling](#symbol-demangling)
  - [Common Rust Patterns in Decompilation](#common-rust-patterns-in-decompilation)
  - [Rust-Specific Analysis Tools](#rust-specific-analysis-tools)
- [Swift Binary Reversing](#swift-binary-reversing)
- [Kotlin / JVM Binary Reversing](#kotlin--jvm-binary-reversing)
  - [JVM Bytecode (Android/Server)](#jvm-bytecode-androidserver)
  - [Kotlin/Native](#kotlinnative)
- [D Language Binary Reversing (CSAW CTF 2016)](#d-language-binary-reversing-csaw-ctf-2016)
- [Haskell Binary Reversing via STG Closures and hsdecomp (hxp CTF 2017, Codegate 2018)](#haskell-binary-reversing-via-stg-closures-and-hsdecomp-hxp-ctf-2017-codegate-2018)
- [Haskell Binary RE via GHC CMM Intermediate Language (N1CTF 2018)](#haskell-binary-re-via-ghc-cmm-intermediate-language-n1ctf-2018)
- [.NET / C# Binary Reversing](#net--c-binary-reversing)
- [C++ Binary Reversing (Quick Reference)](#c-binary-reversing-quick-reference)
  - [vtable Reconstruction](#vtable-reconstruction)
  - [RTTI (Run-Time Type Information)](#rtti-run-time-type-information)
  - [Standard Library Patterns](#standard-library-patterns)

---

## Go Binary Reversing

Go binaries are increasingly common in CTF challenges due to Go's popularity for CLI tools, network services, and malware.

### Recognition

```bash
# Detect Go binary
file binary | grep -i "go"
strings binary | grep "go.buildid"
strings binary | grep "runtime.gopanic"

# Go version embedded in binary
strings binary | grep "^go1\."
```

**Key indicators:**
- Very large static binary (even "hello world" is ~2MB)
- Embedded `go.buildid` string
- `runtime.*` symbols (even in stripped binaries, some remain)
- `main.main` as entry point (not `main`)
- Strings like `GOROOT`, `GOPATH`, `/usr/local/go/src/`

### Symbol Recovery

Go embeds rich type and function information even in stripped binaries:

```bash
# GoReSym - recovers function names, types, interfaces from Go binaries
# https://github.com/mandiant/GoReSym
./GoReSym -d binary > symbols.json

# Parse output
python3 -c "
import json
with open('symbols.json') as f:
    data = json.load(f)
for fn in data.get('UserFunctions', []):
    print(f\"{fn['Start']:#x}  {fn['FullName']}\")
"
```

**Ghidra with golang-loader:**
```bash
# Install: Ghidra → Window → Script Manager → search "golang"
# Or use: https://github.com/getCUJO/ThreatFox/tree/main/ghidra-golang
# Recovers function names, string references, interface tables
```

**redress (Go binary analysis):**
```bash
# https://github.com/goretk/redress
redress -src binary         # Reconstruct source tree
redress -pkg binary         # List packages
redress -type binary        # List types and methods
redress -interface binary   # List interfaces
```

### Go Memory Layout

Understanding Go's data structures in decompilation:

```c
# String: {pointer, length} (16 bytes on 64-bit)
# NOT null-terminated! Length field is critical.
struct GoString {
    char *ptr;    // pointer to UTF-8 data
    int64 len;    // byte length
};

# Slice: {pointer, length, capacity} (24 bytes on 64-bit)
struct GoSlice {
    void *ptr;    // pointer to backing array
    int64 len;    // current length
    int64 cap;    // allocated capacity
};

# Interface: {type_descriptor, data_pointer} (16 bytes)
struct GoInterface {
    void *type;   // points to type metadata (itab for non-empty interface)
    void *data;   // points to actual value
};

# Map: pointer to runtime.hmap struct
# Channel: pointer to runtime.hchan struct
```

**In Ghidra/IDA:** When you see a function taking `(ptr, int64)` — it's likely a Go string. Three-field `(ptr, int64, int64)` is a slice.

### Goroutine and Concurrency Analysis

```bash
# Identify goroutine spawns in disassembly
strings binary | grep "runtime.newproc"
# newproc1 is the internal goroutine creation function

# In GDB with Go support:
gdb ./binary
(gdb) source /usr/local/go/src/runtime/runtime-gdb.py
(gdb) info goroutines          # List all goroutines
(gdb) goroutine 1 bt          # Backtrace for goroutine 1
```

**Channel operations in disassembly:**
- `runtime.chansend1` → `ch <- value`
- `runtime.chanrecv1` → `value = <-ch`
- `runtime.selectgo` → `select { case ... }`
- `runtime.closechan` → `close(ch)`

### Common Go Patterns in Decompilation

**Defer mechanism:**
- `runtime.deferproc` → registers deferred function
- `runtime.deferreturn` → executes deferred functions at function exit
- Deferred calls execute in LIFO order — relevant for cleanup/crypto key wiping

**Error handling (the `if err != nil` pattern):**
```text
# In disassembly, this appears as:
# call some_function        → returns (result, error) as two values
# test rax, rax             → check if error (second return value) is nil
# jne error_handler
```

**String concatenation:**
- `runtime.concatstrings` → `s1 + s2 + s3`
- `fmt.Sprintf` → formatted string building
- Look for format strings in `.rodata`: `"%s%d"`, `"%x"`

**Common stdlib patterns in CTF:**
```go
// Crypto operations → look for these in strings/imports:
// "crypto/aes", "crypto/cipher", "crypto/sha256", "encoding/hex", "encoding/base64"

// Network operations:
// "net/http", "net.Dial", "bufio.NewReader"

// File operations:
// "os.Open", "io.ReadAll", "os.ReadFile"
```

### Go Binary Reversing Workflow

```bash
1. file binary                          # Confirm Go, get arch
2. GoReSym -d binary > syms.json       # Recover symbols
3. strings binary | grep -i flag        # Quick win check
4. Load in Ghidra with golang-loader    # Apply recovered symbols
5. Find main.main                       # Entry point
6. Identify string comparisons          # GoString {ptr, len} pairs
7. Trace crypto operations              # crypto/* package usage
8. Check for embedded resources         # embed.FS in Go 1.16+
```

**Go embed.FS (Go 1.16+):** Binaries can embed files at compile time:
```bash
# Look for embedded file data
strings binary | grep "embed"
# Embedded files appear as raw data in the binary
# Search for known file signatures (PK for zip, PNG header, etc.)
```

**Key insight:** Go's runtime embeds extensive metadata even in stripped binaries. Use GoReSym before any manual analysis — it often recovers 90%+ of function names, making decompilation dramatically easier. Go strings are `{ptr, len}` tuples, not null-terminated — Ghidra's default string analysis will miss them without the golang-loader plugin.

**Detection:** Large static binary (2MB+ for simple programs), `go.buildid`, `runtime.gopanic`, source paths like `/home/user/go/src/`.

### Go Binary UUID Patching for C2 Client Enumeration (BSidesSF 2026)

**Pattern (see-two):** A Go-compiled C2 client has a UUID embedded via `-ldflags -X`. The C2 server uses mTLS for authentication. To enumerate other clients and their files, patch the UUID to register as a new client, then use the C2 API to list all clients and download their exfiltrated files.

**Approach:**
1. Extract embedded UUID from Go build metadata: `go version -m client_binary`
2. Binary-patch the UUID (simple byte replacement — Go strings have fixed-length backing arrays)
3. Register with the C2 server using the patched binary (mTLS certs are embedded or in distfiles)
4. Enumerate clients via API: `GET /api/clients` or iterate known endpoints
5. List and download files from each client's GCS bucket or file store
6. Grep downloaded files for the flag

```bash
# Extract Go build info
go version -m ./client_binary | grep ldflags
# Output shows: -X main.clientUUID=<uuid>

# Patch UUID in binary (replace old UUID bytes with new UUID)
python3 -c "
import sys
data = open('client_binary', 'rb').read()
old_uuid = b'original-uuid-value-here'
new_uuid = b'attacker-uuid-value-here'
patched = data.replace(old_uuid, new_uuid)
open('client_patched', 'wb').write(patched)
"
chmod +x client_patched
./client_patched --register
```

**Key insight:** Go binaries embed string values from `-ldflags -X` directly in the binary data section. Since Go strings are `{ptr, len}` pairs pointing to backing byte arrays, replacing the UUID bytes (same length) produces a valid patched binary. The mTLS certificates authenticate the client to the server but don't bind to a specific UUID.

**References:** BSidesSF 2026 "see-two"

---

## Rust Binary Reversing

Rust binaries are common in modern CTFs, especially for crypto, systems, and security tooling challenges.

### Rust Recognition

```bash
# Detect Rust binary
strings binary | grep -c "rust"
strings binary | grep "rustc"             # Compiler version
strings binary | grep "/rustc/"           # Source paths
strings binary | grep "core::panicking"   # Panic infrastructure
```

**Key indicators:**
- `core::panicking::panic` in strings
- Mangled symbols starting with `_ZN` (Itanium ABI) — e.g., `_ZN4main4main17h...`
- `.rustc` section in ELF
- References to `/rustc/<commit_hash>/library/`
- Large binary size (Rust statically links by default)

### Symbol Demangling

```bash
# Rust uses Itanium ABI mangling (same as C++)
# rustfilt demangles Rust-specific symbols
cargo install rustfilt
nm binary | rustfilt | grep "main"

# Or use c++filt (works for most Rust symbols)
nm binary | c++filt | grep "main"

# In Ghidra: Window → Script Manager → search "Demangler"
# Enable "DemangleAllScript" for automatic demangling
```

### Common Rust Patterns in Decompilation

**Option/Result enum:**
```text
# Option<T> in memory: {discriminant (0=None, 1=Some), value}
# Result<T, E>: {discriminant (0=Ok, 1=Err), union{ok_val, err_val}}

# In disassembly:
# cmp byte [rbp-0x10], 0    → check if None/Err
# je handle_none_case
```

**Vec<T> (same as Go slice):**
```c
struct RustVec {
    void *ptr;      // heap pointer
    uint64 cap;     // capacity
    uint64 len;     // length
};
```

**String / &str:**
```text
# String (owned): {ptr, capacity, length} — 24 bytes, heap-allocated
# &str (borrowed): {ptr, length} — 16 bytes, can point anywhere

# In decompilation, look for:
# alloc::string::String::from    → String creation
# core::str::from_utf8           → byte slice to str
```

**Iterator chains:**
```text
# .iter().map().filter().collect() compiles to loop fusion
# In disassembly: tight loop with inlined closures
# Look for: core::iter::adapters::map, filter, etc.
```

**Panic unwinding:**
```bash
# Panic strings reveal source locations and error messages
strings binary | grep "panicked at"
strings binary | grep "called .unwrap().. on"
# These often contain file paths, line numbers, and variable names
```

### Rust-Specific Analysis Tools

```bash
# cargo-bloat: analyze binary size by function
cargo install cargo-bloat
cargo bloat --release -n 50

# Ghidra Rust helper scripts
# https://github.com/AmateursCTF/ghidra-rust (community scripts for Rust RE)
```

**Key insight:** Rust panic messages are goldmines — they contain source file paths, line numbers, and descriptive error strings even in release builds. Always `strings binary | grep "panicked"` first. Rust's monomorphization means generic functions get duplicated per type — expect many similar-looking functions.

**Detection:** `core::panicking`, `.rustc` section, `/rustc/` paths, `_ZN` mangled symbols with Rust-style module paths.

---

## Swift Binary Reversing

See [platforms.md](platforms.md#swift-binary-reversing) for full Swift reversing guide including demangling, runtime structures, and Ghidra integration. Key quick reference:

```bash
# Detect Swift binary
strings binary | grep "swift"
otool -l binary | grep "swift"

# Demangle Swift symbols
swift demangle 's14MyApp0A8ClassC10checkInput6resultSbSS_tF'
# → MyApp.MyAppClass.checkInput(result: String) -> Bool

# Key runtime functions: swift_allocObject, swift_release, swift_once
# String: small (≤15 bytes inline) or large (heap pointer + length)
# Protocol witness tables = dynamic dispatch (like vtables)
```

**Detection:** `__swift5_*` sections in Mach-O, `swift_` runtime symbols, `s` prefix in mangled names.

---

## Kotlin / JVM Binary Reversing

Kotlin compiles to JVM bytecode or native (via Kotlin/Native). Common in Android and server-side CTF.

### JVM Bytecode (Android/Server)

```bash
# Detect Kotlin
strings classes.dex | grep "kotlin"
# Look for: kotlin.Metadata annotation, kotlin/jvm/internal/*

# Decompile
jadx classes.dex                     # Best for Kotlin bytecode
cfr classes.jar --kotlin             # CFR with Kotlin mode
fernflower classes.jar output/       # IntelliJ's decompiler

# Kotlin-specific patterns in decompiled output:
# - Companion objects: ClassName$Companion
# - Data classes: copy(), component1(), component2(), toString()
# - Coroutines: ContinuationImpl, invokeSuspend, state machine
# - Null checks: Intrinsics.checkNotNull() everywhere
# - When expression: compiled as tableswitch/lookupswitch
# - Sealed classes: instanceof checks in chain
```

**Kotlin coroutines in disassembly:**
```text
# Coroutines compile to state machines:
# invokeSuspend(result) {
#     switch (this.label) {
#         case 0: this.label = 1; return suspendFunction();
#         case 1: processResult(result); return Unit;
#     }
# }
# Each suspend point becomes a state in the switch.
# Follow the state machine to understand async flow.
```

### Kotlin/Native

```bash
# Kotlin/Native produces platform binaries (no JVM)
# Recognize by: konan, kotlin.native strings
strings binary | grep "konan"

# Much harder to reverse — no reflection metadata
# Uses LLVM backend, looks similar to C/C++ in disassembly
# Key functions: InitRuntime, DeinitRuntime, CreateStablePointer
# Memory management: automatic reference counting (not GC)
```

**Detection:** `kotlin.Metadata` annotations (JVM), `konan` strings (Native), `kotlin/` package paths.

---

## D Language Binary Reversing (CSAW CTF 2016)

D language binaries have unique symbol mangling different from C++. Template instantiation at compile-time produces many function variants.

```bash
# Recognition: D binaries use different mangling than C++
# Symbols contain "_D" prefix and numeric length-prefixed names
# Example: _D4mainQaFNaNbNfZv

# Symbol demangling:
# GDB: set language d
# Radare2: export names show demangled D symbols
# Online: dlang.org/phobos/core_demangle.html

# Common D binary patterns:
# - Templates instantiated at compile-time: enc!("111"), enc!("222"), ...
# - Garbage collector references (GC.malloc, GC.free)
# - Phobos standard library functions (_D3std...)
# - String processing: std.string, std.conv.to

# Reversing a D cipher (XOR with cycling key):
def reverse_d_cipher(encrypted, num_functions=500):
    """D binaries may chain multiple transformation functions.
    Each function XORs with key character, then XORs with key length.
    Process in reverse order."""
    result = encrypted[:]
    for i in range(num_functions - 1, -1, -1):
        key = str(i) * 3  # e.g., "499499499" for function enc!("499")
        key_len = len(key)
        for j in range(len(result)):
            result[j] ^= key_len
            result[j] ^= ord(key[j % key_len])
    return bytes(result)
```

**Key insight:** D binaries are rare in CTFs but identifiable by `_D` symbol prefixes and Phobos library references. The compile-time template system means D functions may be duplicated hundreds of times with different parameters — look for patterns like `enc!("N")` where N varies.

---

### Haskell Binary Reversing via STG Closures and hsdecomp (hxp CTF 2017, Codegate 2018)

GHC-compiled Haskell binaries use the STG (Spineless Tagless G-machine) execution model, making them notoriously difficult to reverse due to lazy evaluation, closures, and thunks. The STG machine turns everything into closure calls rather than direct function calls.

**Recognition:**
- Shared libraries: `libHSbase-*`, `libHSrts-*`
- Entry symbol: `hs_main` (replaces standard `main`)
- Mangled symbols use Z-encoding: `z` = prefix, `Z` = uppercase, `zd` = `.`, `zi` = `$`
- GHC calling convention register mapping: `rbx` = R1, `r14` = R2

**Closure structure:**
Closures are structs where the first qword points to the info table/code. The info table precedes the code pointer and contains metadata (closure type, layout info, SRT).

```bash
# Identify Haskell binary
ldd ./binary | grep libHS
readelf -s ./binary | grep hs_main

# Decompile with hsdecomp (github.com/gereeter/hsdecomp)
# Recovers closure structure and pattern matching into pseudo-Haskell
python2 hsdecomp ./binary

# Compile reference for monkey-patching
ghc -O0 reference.hs -o reference
objcopy --dump-section .text=main_code reference
```

**Monkey-patching technique:**
When decompilation fails or closures are opaque, compile a minimal Haskell program with the same GHC version, extract the compiled `Main_main_info` closure code, and patch it into the challenge binary. This forces evaluation of hidden closures and prints their results by replacing the main entry point with a known evaluator.

```haskell
-- reference.hs: minimal program that evaluates and prints the target closure
module Main where
main :: IO ()
main = print targetClosure  -- replace with the closure you want to evaluate
```

**Key insight:** Haskell binaries are notoriously hard to reverse due to lazy evaluation, closures, and thunks. The STG machine turns everything into closure calls rather than direct function calls. `hsdecomp` recovers the closure structure and pattern matching. When decompilation fails, monkey-patching a known `Main_main_info` from a reference binary forces evaluation of hidden closures and prints results.

**Detection:** `libHSbase-*` shared libraries, `hs_main` entry, Z-encoded symbols (e.g., `MainZCmain`), GHC version strings.

**References:** hxp CTF 2017, Codegate 2018

---

### Haskell Binary RE via GHC CMM Intermediate Language (N1CTF 2018)

GHC-compiled Haskell binaries are nearly impossible to decompile with IDA due to the STG execution model. When a `.cmm` (C-- intermediate) file is available or recoverable, read it to understand thunks, closures, and lazy evaluation semantics. For exponentially-growing recursive structures, compute segment sizes with memoization and use binary search instead of materializing the full string.

**Pattern:** The binary builds a recursive string structure where `f(n) = s1 + f(n-1) + s2 + f(n-1) + s3`. Direct evaluation is `O(2^n)` in both time and space. Instead, compute the size of each recursion level with memoization, then binary-search for the target character index by walking the segment boundaries.

```python
# Haskell recursive string: f(n) = s1 + f(n-1) + s2 + f(n-1) + s3
# Direct evaluation is O(2^n) -- use size memoization:
from functools import lru_cache

@lru_cache(maxsize=None)
def fsize(n):
    if n == 0: return len(s0)
    return len(s1) + fsize(n-1) + len(s2) + fsize(n-1) + len(s3)

def char_at(n, offset):
    if n == 0: return s0[offset]
    if offset < len(s1): return s1[offset]
    offset -= len(s1)
    if offset < fsize(n-1): return char_at(n-1, offset)
    offset -= fsize(n-1)
    if offset < len(s2): return s2[offset]
    offset -= len(s2)
    return char_at(n-1, offset)
```

**Key insight:** GHC's CMM (C minus minus) intermediate representation preserves enough structure to identify algorithms. For recursive string constructions that double in size each level, compute segment sizes with memoization and binary-search for target indices instead of materializing the exponentially-growing string.

**Detection:** Haskell binary (see recognition above) with a `.cmm` file included in the challenge distribution. Look for recursive closure applications that produce string-like data with exponential growth.

**References:** N1CTF 2018

---

## .NET / C# Binary Reversing

.NET 托管程序（C# 编译的 exe/dll）有完整独立工作流，详见 [`../dotnet-reverse/SKILL.md`](../dotnet-reverse/SKILL.md)。

**速查要点：**
- 识别：PE 头 CLR runtime header 非零、`mscoree.dll` 导入、`mscorlib`/`System.Private.CoreLib` 字符串
- 工具：**dnSpyEx**（反编译+调试+IL 编辑，Windows GUI）/ **ILSpy**（CLI）/ **de4dot**（脱混淆）/ **dnlib**（脚本化）
- 脱混淆：ConfuserEx / SmartAssembly / Babel / .NET Reactor → `de4dot`，详见 [`../dotnet-reverse/references/obfuscators.md`](../dotnet-reverse/references/obfuscators.md)
- **IL 优先**：关键判断与 patch 用 IL 编辑器而非 C# 反编译器（避免编译器生成代码重编译失真）
- 红队 Sharp* 工具（Rubeus/SharpHound）分析 → [`../dotnet-reverse/references/sharp-tools.md`](../dotnet-reverse/references/sharp-tools.md)

**边界：** IL2CPP / NativeAOT 编译产物是 native（无 CLR），不走 dnSpy → 走 `ida-reverse/` / `radare2/`（见 [seed-014](../field-journal/seed-014_unity-il2cpp-reverse.md)）。Codegate 2013 两阶段 XOR+AES-CBC 模式见 [tools.md](tools.md#net-analysis) `.NET Analysis` 段。

---

## C++ Binary Reversing (Quick Reference)

While C++ RE is well-covered by general tools, these patterns are CTF-specific:

### vtable Reconstruction

```text
# Virtual function tables (vtables):
# First 8 bytes of object → pointer to vtable
# vtable entries: [typeinfo_ptr, destructor, method1, method2, ...]
# In Ghidra: Data → Create Pointer at vtable address

# Identify polymorphic dispatch:
# mov rax, [rdi]           # Load vtable from this pointer
# call [rax + 0x18]        # Call 4th virtual method (0x18/8 = 3rd after typeinfo+dtor)
```

### RTTI (Run-Time Type Information)

```bash
# If not stripped, RTTI reveals class hierarchy
strings binary | grep -E "^[0-9]+[A-Z]"   # Mangled type names
c++filt _ZTI7MyClass                        # → typeinfo for MyClass

# In Ghidra: search for vtable references, follow typeinfo pointer
# typeinfo struct: {vtable_for_typeinfo, name_string, base_class_ptr}
```

### Standard Library Patterns

```text
std::string (libstdc++):
  SSO (Small String Optimization): inline buffer for ≤15 chars
  Layout: {char* ptr, size_t size, union{size_t cap, char buf[16]}}

std::vector<T>:
  {T* begin, T* end, T* capacity_end}

std::map<K,V>:
  Red-black tree: each node has {left, right, parent, color, key, value}

std::unordered_map<K,V>:
  Hash table: {bucket_array, size, load_factor_max, ...}
```
