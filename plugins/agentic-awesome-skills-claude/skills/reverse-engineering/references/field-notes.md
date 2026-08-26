# Reverse Engineering Field Notes

Detailed quick notes that support [`SKILL.md`](SKILL.md). Read this file after triage, not before.

## Table of Contents

- [Binary Types](#binary-types)
  - [Python .pyc](#python-pyc)
  - [WASM](#wasm)
  - [Android APK](#android-apk)
  - [Flutter APK (Dart AOT)](#flutter-apk-dart-aot)
  - [.NET](#net)
  - [Packed (UPX)](#packed-upx)
  - [Tauri Packed Desktop Apps](#tauri-packed-desktop-apps)
- [Anti-Debugging Bypass](#anti-debugging-bypass)
- [Specialized Patterns](#specialized-patterns)
  - [S-Box / Keystream Patterns](#s-box--keystream-patterns)
  - [Custom VM Analysis](#custom-vm-analysis)
  - [Python Bytecode Reversing](#python-bytecode-reversing)
  - [Signal-Based Binary Exploration](#signal-based-binary-exploration)
  - [Malware Anti-Analysis Bypass via Patching](#malware-anti-analysis-bypass-via-patching)
  - [Expected Values Tables](#expected-values-tables)
  - [x86-64 Gotchas](#x86-64-gotchas)
  - [Iterative Solver Pattern](#iterative-solver-pattern)
  - [Unicorn Emulation (Complex State)](#unicorn-emulation-complex-state)
  - [Multi-Stage Shellcode Loaders](#multi-stage-shellcode-loaders)
  - [Timing Side-Channel Attack](#timing-side-channel-attack)
  - [Unstripped Binary Information Leaks](#unstripped-binary-information-leaks)
  - [Custom Mangle Function Reversing](#custom-mangle-function-reversing)
  - [Rust serde_json Schema Recovery](#rust-serde_json-schema-recovery)
  - [Position-Based Transformation Reversing](#position-based-transformation-reversing)
  - [Hex-Encoded String Comparison](#hex-encoded-string-comparison)
- [CTF Case Notes](#ctf-case-notes)
  - [Embedded ZIP + XOR License Decryption](#embedded-zip--xor-license-decryption)
  - [Stack String Deobfuscation (.rodata XOR Blob)](#stack-string-deobfuscation-rodata-xor-blob)
  - [Prefix Hash Brute-Force](#prefix-hash-brute-force)
  - [Mathematical Convergence Bitmap](#mathematical-convergence-bitmap)
  - [RISC-V Binary Analysis](#risc-v-binary-analysis)
  - [Kernel Module Maze Solving](#kernel-module-maze-solving)
  - [Multi-Threaded VM with Channels](#multi-threaded-vm-with-channels)
  - [CVP/LLL Lattice for Constrained Integer Validation](#cvplll-lattice-for-constrained-integer-validation)
  - [Decision Tree Function Obfuscation](#decision-tree-function-obfuscation)
  - [Android JNI RegisterNatives Obfuscation](#android-jni-registernatives-obfuscation)
  - [Multi-Layer Self-Decrypting Binary](#multi-layer-self-decrypting-binary)
  - [GLSL Shader VM with Self-Modifying Code](#glsl-shader-vm-with-self-modifying-code)
  - [GF(2^8) Gaussian Elimination for Flag Recovery](#gf28-gaussian-elimination-for-flag-recovery)
  - [Z3 for Single-Line Python Boolean Circuit](#z3-for-single-line-python-boolean-circuit)
  - [Sliding Window Popcount Differential Propagation](#sliding-window-popcount-differential-propagation)
  - [Ruby/Perl Polyglot Constraint Satisfaction](#rubyperl-polyglot-constraint-satisfaction)
  - [Verilog/Hardware RE](#veriloghardware-re)
  - [Custom binfmt Kernel Module with RC4 Flat Binaries](#custom-binfmt-kernel-module-with-rc4-flat-binaries)
  - [Hash-Resolved Imports / No-Import Ransomware](#hash-resolved-imports--no-import-ransomware)
  - [ELF Section Header Corruption for Anti-Analysis](#elf-section-header-corruption-for-anti-analysis)
  - [Brainfuck Character-by-Character Static Analysis](#brainfuck-character-by-character-static-analysis)
  - [Brainfuck Side-Channel via Read Count Oracle](#brainfuck-side-channel-via-read-count-oracle)
  - [Brainfuck Comparison Idiom Detection](#brainfuck-comparison-idiom-detection)
  - [Backdoored Shared Library Detection](#backdoored-shared-library-detection)
  - [Go Binary Reversing](#go-binary-reversing)
  - [Go Binary UUID Patching for C2 Enumeration](#go-binary-uuid-patching-for-c2-enumeration)
  - [D Language Binary Reversing](#d-language-binary-reversing)
  - [Rust Binary Reversing](#rust-binary-reversing)
  - [Frida Dynamic Instrumentation](#frida-dynamic-instrumentation)
  - [Frida Firebase Cloud Functions Bypass](#frida-firebase-cloud-functions-bypass)
  - [angr Symbolic Execution](#angr-symbolic-execution)
  - [Qiling Emulation](#qiling-emulation)
  - [VMProtect / Themida Analysis](#vmprotect--themida-analysis)
  - [Binary Diffing](#binary-diffing)
  - [Advanced GDB (pwndbg, rr)](#advanced-gdb-pwndbg-rr)
  - [macOS / iOS Reversing](#macos--ios-reversing)
  - [Embedded / IoT Firmware RE](#embedded--iot-firmware-re)
  - [Kernel Driver Reversing](#kernel-driver-reversing)
  - [Swift / Kotlin Binary Reversing](#swift--kotlin-binary-reversing)
  - [INT3 Patch + Coredump Brute-Force Oracle](#int3-patch--coredump-brute-force-oracle)
  - [Signal Handler Chain + LD_PRELOAD Oracle](#signal-handler-chain--ld_preload-oracle)
  - [Font Ligature Exploitation](#font-ligature-exploitation)
  - [Instruction Counter as Cryptographic State](#instruction-counter-as-cryptographic-state)
  - [Burrows-Wheeler Transform Inversion](#burrows-wheeler-transform-inversion)
  - [FRACTRAN Program Inversion](#fractran-program-inversion)
  - [Opcode-Only Trace Reconstruction](#opcode-only-trace-reconstruction)
  - [Thread Race Signed Integer Overflow](#thread-race-signed-integer-overflow)
  - [ESP32/Xtensa Firmware Reversing](#esp32xtensa-firmware-reversing)
  - [Custom VM Bytecode Lifting to LLVM IR](#custom-vm-bytecode-lifting-to-llvm-ir)
  - [SIGFPE Signal Handler Side-Channel](#sigfpe-signal-handler-side-channel)
  - [Batch Crackme Automation via objdump](#batch-crackme-automation-via-objdump)
  - [Android DEX Runtime Bytecode Patching](#android-dex-runtime-bytecode-patching)
  - [Fork + Pipe + Dead Branch Anti-Analysis](#fork--pipe--dead-branch-anti-analysis)
- [Web/CTF Auth Bypass Case Notes](#webctf-auth-bypass-case-notes)
  - [Signed Cookie Key Reuse: access token to admin_session](#signed-cookie-key-reuse-access-token-to-admin_session)
- [Web Phishing Infrastructure](#web-phishing-infrastructure)
  - [Phishing Panel: {domain_a} / {domain_b}](#phishing-panel-domain_a--domain_b)

## Binary Types

### Python .pyc
Disassemble with `marshal.load()` + `dis.dis()`. Header: 8 bytes (2.x), 12 (3.0-3.6), 16 (3.7+). See [languages.md](languages.md#python-bytecode-reversing-disdis-output).

### WASM
```bash
wasm2c checker.wasm -o checker.c
gcc -O3 checker.c wasm-rt-impl.c -o checker

# WASM patching (challenge binaries):
wasm2wat main.wasm -o main.wat    # Binary → text
# Edit WAT: flip comparisons, change constants
wat2wasm main.wat -o patched.wasm # Text → binary
```

### Android APK
`apktool d app.apk -o decoded/` for resources; `jadx app.apk` for Java decompilation. Check `decoded/res/values/strings.xml` for flags. See [tools.md](tools.md#android-apk).

### Flutter APK (Dart AOT)
If `lib/arm64-v8a/libapp.so` + `libflutter.so` present, use [Blutter](https://github.com/worawit/blutter): `python3 blutter.py path/to/app/lib/arm64-v8a out_dir`. Outputs reconstructed Dart symbols + Frida script. See [tools.md](tools.md#flutter-apk-blutter).

### .NET
- dnSpy - debugging + decompilation
- ILSpy - decompiler

### Packed (UPX)
```bash
upx -d packed -o unpacked
```
If unpacking fails, inspect UPX metadata first: verify UPX section names, header fields, and version markers are intact. If metadata looks tampered or uncertain, review UPX source on GitHub to identify likely modification points.

### Tauri Packed Desktop Apps
Tauri embeds Brotli-compressed frontend assets in the executable. Find `index.html` xrefs to locate asset index table, dump blobs, Brotli decompress. Reference: `tauri-codegen/src/embedded_assets.rs`.

## Anti-Debugging Bypass

Common checks:
- `IsDebuggerPresent()` / PEB.BeingDebugged / NtQueryInformationProcess (Windows)
- `ptrace(PTRACE_TRACEME)` / `/proc/self/status` TracerPid (Linux)
- TLS callbacks (run before main — check PE TLS Directory)
- Timing checks (`rdtsc`, `clock_gettime`, `GetTickCount`)
- Hardware breakpoint detection (DR0-DR3 via GetThreadContext)
- INT3 scanning / code self-hashing (CRC over .text section)
- Signal-based: SIGTRAP handler, SIGALRM timeout, SIGSEGV for real logic
- Frida/DBI detection: `/proc/self/maps` scan, port 27042, inline hook checks

Bypass: Set breakpoint at check, modify register to bypass conditional. pwntools patch: `elf.asm(elf.symbols.ptrace, 'ret')` to replace function with immediate return. See [patterns.md](patterns.md#pwntools-binary-patching-crypto-cat).

For comprehensive anti-analysis techniques and bypasses (30+ methods with code), see [anti-analysis.md](anti-analysis.md).

## Specialized Patterns

### S-Box / Keystream Patterns
**Xorshift32:** Shifts 13, 17, 5  
**Xorshift64:** Shifts 12, 25, 27  
**Magic constants:** `0x2545f4914f6cdd1d`, `0x9e3779b97f4a7c15`

### Custom VM Analysis
1. Identify structure: registers, memory, IP
2. Reverse `executeIns` for opcode meanings
3. Write disassembler mapping opcodes to mnemonics
4. Often easier to bruteforce than fully reverse
5. Look for the bytecode file loaded via command-line arg

See [patterns.md](patterns.md#custom-vm-reversing) for VM workflow, opcode tables, and state machine BFS.

**Sequential key-chain brute-force:** When a VM validates input in small blocks (e.g., 3 bytes = 2^24 candidates) with each block's output key feeding the next, brute-force each block sequentially with OpenMP parallelization. Compile solver with `gcc -O3 -march=native -fopenmp`. See [patterns-ctf-3.md](patterns-ctf-3.md#vm-sequential-key-chain-brute-force-midnight-flag-2026).

### Python Bytecode Reversing
XOR flag checkers with interleaved even/odd tables are common. See [languages.md](languages.md#python-bytecode-reversing-disdis-output) for bytecode analysis tips and reversing patterns.

### Signal-Based Binary Exploration
Binary uses UNIX signals as binary tree navigation; hook `sigaction` via `LD_PRELOAD`, DFS by sending signals. See [patterns.md](patterns.md#signal-based-binary-exploration).

### Malware Anti-Analysis Bypass via Patching
Flip `JNZ`/`JZ` (0x75/0x74), change sleep values, patch environment checks in Ghidra (`Ctrl+Shift+G`). See [patterns.md](patterns.md#malware-anti-analysis-bypass-via-patching).

### Expected Values Tables
Locate with `objdump -s -j .rodata binary | less` — look near comparison instructions, size matches flag length.

### x86-64 Gotchas
Sign extension and 32-bit truncation pitfalls. See [patterns.md](patterns.md#x86-64-gotchas) for details and code examples.

### Iterative Solver Pattern
Try each byte (0-255) per position, match against expected output. **Uniform transform shortcut:** if one input byte only changes one output byte, build 0..255 mapping then invert. See [patterns.md](patterns.md) for full implementation.

### Unicorn Emulation (Complex State)
`from unicorn import *` -- map segments, set up stack, hook to trace. **Mixed-mode pitfall:** 64-bit stub jumping to 32-bit via `retf` requires switching to UC_MODE_32 and copying GPRs + EFLAGS + XMM regs. See [tools.md](tools.md#unicorn-emulation).

### Multi-Stage Shellcode Loaders
Nested shellcode with XOR decode loops; break at `call rax`, bypass ptrace with `set $rax=0`, extract flag from `mov` instructions. See [patterns.md](patterns.md#multi-stage-shellcode-loaders).

### Timing Side-Channel Attack
Validation time varies per correct character; measure elapsed time per candidate to recover flag byte-by-byte. See [patterns.md](patterns.md#timing-side-channel-attack).

### Unstripped Binary Information Leaks
**Pattern:** Debug info and file paths leak author identity. Quick checks: `strings binary | grep "/home/"` (home dirs), `file binary` (stripped?), `readelf -S binary | grep debug` (debug sections).

### Custom Mangle Function Reversing
Binary mangles input 2 bytes at a time with running state; extract target from `.rodata`, write inverse function. See [patterns.md](patterns.md#custom-mangle-function-reversing).

### Rust serde_json Schema Recovery
Disassemble serde `Visitor` implementations to recover expected JSON schema; field names in order reveal flag. See [languages-platforms.md](languages-platforms.md#rust-serdejson-schema-recovery).

### Position-Based Transformation Reversing
Binary adds/subtracts position index; reverse by undoing per-index offset. See [patterns.md](patterns.md#position-based-transformation-reversing).

### Hex-Encoded String Comparison
Input converted to hex, compared against constant. Decode with `xxd -r -p`. See [patterns.md](patterns.md#hex-encoded-string-comparison).

## CTF Case Notes

### Embedded ZIP + XOR License Decryption
Binary with named symbols (`EMBEDDED_ZIP`, `ENCRYPTED_MESSAGE`) in `.rodata` → extract ZIP containing license, XOR encrypted message with license bytes to recover flag. No execution needed. See [patterns-ctf-2.md](patterns-ctf-2.md#embedded-zip-xor-license-decryption-metactf-2026).

### Stack String Deobfuscation (.rodata XOR Blob)
Binary mmaps `.rodata` blob, XOR-deobfuscates, uses it to validate input. Reimplement verification loop with pyelftools to extract blob. Look for `0x9E3779B9`, `0x85EBCA6B` constants and `rol32()`. See [patterns-ctf-2.md](patterns-ctf-2.md#stack-string-deobfuscation-from-rodata-xor-blob-nullcon-2026).

### Prefix Hash Brute-Force
Binary hashes every prefix independently. Recover one character at a time by matching prefix hashes. See [patterns-ctf-2.md](patterns-ctf-2.md#prefix-hash-brute-force-nullcon-2026).

### Mathematical Convergence Bitmap
**Pattern:** Binary classifies coordinate pairs by Newton's method convergence (e.g., z^3-1=0). Grid of pass/fail results renders ASCII art flag. Key: the binary is a classifier, not a checker — reverse the math and visualize. See [patterns-ctf.md](patterns-ctf.md#mathematical-convergence-bitmap-ehax-2026).

### RISC-V Binary Analysis
Statically linked, stripped RISC-V ELF. Use Capstone with `CS_MODE_RISCVC | CS_MODE_RISCV64` for mixed compressed instructions. Emulate with `qemu-riscv64`. Watch for fake flags and XOR decryption with incremental keys. See [tools.md](tools.md#risc-v-binary-analysis-ehax-2026).

### Kernel Module Maze Solving
Rust kernel module implements maze via device ioctls. Enumerate commands dynamically, build DFS solver with decoy avoidance, deploy as minimal static binary (raw syscalls, no libc). See [patterns-ctf.md](patterns-ctf.md#kernel-module-maze-solving-dicectf-2026).

### Multi-Threaded VM with Channels
Custom VM with 16+ threads communicating via futex channels. Trace data flow across thread boundaries, extract constants from GDB, watch for inverted validity logic, solve via BFS state space search. See [patterns-ctf.md](patterns-ctf.md#multi-threaded-vm-with-channel-synchronization-dicectf-2026).

### CVP/LLL Lattice for Constrained Integer Validation
Binary validates flag via matrix multiplication with 64-bit coefficients; solutions must be printable ASCII. Use LLL reduction + CVP in SageMath to find nearest lattice point in the constrained range. Two-phase pattern: Phase 1 recovers AES key, Phase 2 decrypts custom VM bytecode with another linear system (mod 2^32). See [patterns-ctf-2.md](patterns-ctf-2.md#cvplll-lattice-for-constrained-integer-validation-htb-shadowlabyrinth).

### Decision Tree Function Obfuscation
~200+ auto-generated functions routing input through polynomial comparisons. Script extraction via Ghidra headless rather than reversing each function manually. Constraint propagation from known output format cascades through arithmetic constraints. See [patterns-ctf-2.md](patterns-ctf-2.md#decision-tree-function-obfuscation-htb-wondersms).

### Android JNI RegisterNatives Obfuscation
`RegisterNatives` in `JNI_OnLoad` hides which C++ function handles each Java native method (no standard `Java_com_pkg_Class_method` symbol). Find the real handler by tracing `JNI_OnLoad` → `RegisterNatives` → `fnPtr`. Use x86_64 `.so` from APK for best Ghidra decompilation. See [languages-platforms.md](languages-platforms.md#android-jni-registernatives-obfuscation-htb-wondersms).

### Multi-Layer Self-Decrypting Binary
N-layer binary where each layer decrypts the next using user-provided key bytes + SHA-NI. Use oracle (correct key → valid code with expected pattern). JIT execution with fork-per-candidate COW isolation for speed. See [patterns-ctf-2.md](patterns-ctf-2.md#multi-layer-self-decrypting-binary-dicectf-2026).

### GLSL Shader VM with Self-Modifying Code
**Pattern:** WebGL2 fragment shader implements Turing-complete VM on a 256x256 RGBA texture (program memory + VRAM). Self-modifying code (STORE opcode) patches drawing instructions. GPU parallelism causes write conflicts — emulate sequentially in Python to recover full output. See [patterns-ctf-3.md](patterns-ctf-3.md#glsl-shader-vm-with-self-modifying-code-apoorvctf-2026).

### GF(2^8) Gaussian Elimination for Flag Recovery
**Pattern:** Binary performs Gaussian elimination over GF(2^8) with the AES polynomial (0x11b). Matrix + augmentation vector in `.rodata`; solution vector is the flag. Look for constant `0x1b` in disassembly. Addition is XOR, multiplication uses polynomial reduction. See [patterns-ctf-2.md](patterns-ctf-2.md#gf28-gaussian-elimination-for-flag-recovery-apoorvctf-2026).

### Z3 for Single-Line Python Boolean Circuit
**Pattern:** Single-line Python (2000+ semicolons) with walrus operator chains validates flag as big-endian integer via boolean circuit. Obfuscated XOR `(a | b) & ~(a & b)`. Split on semicolons, translate to Z3 symbolically, solve in under a second. See [patterns-ctf-3.md](patterns-ctf-3.md#z3-for-single-line-python-boolean-circuit-bearcatctf-2026).

### Sliding Window Popcount Differential Propagation
**Pattern:** Binary validates input via expected popcount for each position of a 16-bit sliding window. Popcount differences create a recurrence: `bit[i+16] = bit[i] + (data[i+1] - data[i])`. Brute-force ~4000-8000 valid initial 16-bit windows; each determines the entire bit sequence. See [patterns-ctf-3.md](patterns-ctf-3.md#sliding-window-popcount-differential-propagation-bearcatctf-2026).

### Ruby/Perl Polyglot Constraint Satisfaction
**Pattern:** Single file valid in both Ruby and Perl, each imposing different constraints on a key. Exploits `=begin`/`=end` (Ruby block comment) vs `=begin`/`=cut` (Perl POD) to run different code per interpreter. Intersect constraints from both languages to recover the unique key. See [languages-platforms.md](languages-platforms.md#rubyperl-polyglot-constraint-satisfaction-bearcatctf-2026).

### Verilog/Hardware RE
**Pattern:** Verilog HDL source for state machines with hidden conditions gated on shift register history. Analyze `always @(posedge clk)` blocks and `case` statements to find correct input sequences. See [languages-platforms.md](languages-platforms.md#veriloghardware-reverse-engineering-srdnlenctf-2026).

### Custom binfmt Kernel Module with RC4 Flat Binaries
**Pattern:** Kernel module registers binfmt handler for encrypted flat binaries. Reverse the `.ko` to find RC4 key (in `movabs` immediates), decrypt the flat binary, import at the fixed virtual address from the module's `vm_mmap` call. See [patterns-ctf.md](patterns-ctf.md#custom-binfmt-kernel-module-with-rc4-flat-binaries-bsidessf-2026).

### Hash-Resolved Imports / No-Import Ransomware
**Pattern:** Binary with zero visible imports resolves APIs via symbol name hashing at runtime. Skip the hash reversing — hook OpenSSL functions via `LD_PRELOAD` in Docker to capture AES keys directly. See [patterns-ctf.md](patterns-ctf.md#hash-resolved-imports-no-import-ransomware-bsidessf-2026).

### ELF Section Header Corruption for Anti-Analysis
**Pattern:** Corrupted section headers crash analysis tools but program headers are intact so binary runs normally. Patch `e_shoff` to zero or use `readelf -l` (program headers only). Flag hidden after corrupted sections with magic marker + XOR. See [patterns-ctf.md](patterns-ctf.md#elf-section-header-corruption-for-anti-analysis-bsidessf-2026).

### Brainfuck Character-by-Character Static Analysis
**Pattern:** BF programs validating input have `,` (read char) followed by `+` operations whose count = expected ASCII value. Extract increment counts per input position to recover expected input without execution. See [languages.md](languages.md#brainfuck-character-by-character-static-analysis-bsidessf-2026).

### Brainfuck Side-Channel via Read Count Oracle
**Pattern:** BF input validators read more bytes when a character is correct. Count `,` operations per candidate — highest read count = correct byte. Character-by-character recovery. See [languages.md](languages.md#brainfuck-side-channel-via-read-count-oracle-bsidessf-2026).

### Brainfuck Comparison Idiom Detection
**Pattern:** Compiled BF uses fixed idioms for equality checks (`<[-<->] +<[>-<[-]]>[-<+>]`). Instrument interpreter to detect patterns and extract comparison operands (expected flag bytes). See [languages.md](languages.md#brainfuck-comparison-idiom-detection-bsidessf-2026).

### Backdoored Shared Library Detection
Binary works in GDB but fails when run normally (suid)? Check `ldd` for non-standard libc paths, then `strings | diff` the suspicious vs. system library to find injected code/passwords. See [patterns-ctf.md](patterns-ctf.md#backdoored-shared-library-detection-via-string-diffing-hacklu-ctf-2012).

### Go Binary Reversing
Large static binary with `go.buildid`? Use GoReSym to recover function names (works even on stripped binaries). Go strings are `{ptr, len}` pairs — not null-terminated. Look for `main.main`, `runtime.gopanic`, channel ops (`runtime.chansend1`/`chanrecv1`). Use Ghidra golang-loader plugin for best results. See [languages-compiled.md](languages-compiled.md#go-binary-reversing).

### Go Binary UUID Patching for C2 Enumeration
**Pattern:** Go C2 client with UUID from `-ldflags -X`. Binary-patch UUID bytes (same length), register with C2, enumerate clients/files via API. See [languages-compiled.md](languages-compiled.md#go-binary-uuid-patching-for-c2-client-enumeration-bsidessf-2026).

### D Language Binary Reversing
D language binaries have unique symbol mangling (not C++ style). Template-heavy, many function variants. Look for `_D` prefix in symbols. See [languages-compiled.md](languages-compiled.md#d-language-binary-reversing-csaw-ctf-2016).

### Rust Binary Reversing
Binary with `core::panicking` strings and `_ZN` mangled symbols? Use `rustfilt` for demangling. Panic messages contain source paths and line numbers — `strings binary | grep "panicked"` is the fastest approach. Option/Result enums use discriminant byte (0=None/Err, 1=Some/Ok). See [languages-compiled.md](languages-compiled.md#rust-binary-reversing).

### Frida Dynamic Instrumentation
Hook runtime functions without modifying binary. `frida -f ./binary -l hook.js` to spawn with instrumentation. Hook `strcmp`/`memcmp` to capture expected values, bypass anti-debug by replacing `ptrace` return value, scan memory for flag patterns, replace validation functions. See [tools-dynamic.md](tools-dynamic.md#frida-dynamic-instrumentation).

### Frida Firebase Cloud Functions Bypass
**Pattern:** Android app validates via Firebase Cloud Functions. Post-login Frida hook constructs valid payload (UID + value + timestamp) and calls Cloud Function directly, bypassing QR/payment validation. See [languages-platforms.md](languages-platforms.md#frida-firebase-cloud-functions-bypass-bsidessf-2026).

### angr Symbolic Execution
Automatic path exploration to find inputs satisfying constraints. Load binary with `angr.Project`, set find/avoid addresses, call `simgr.explore()`. Constrain input to printable ASCII and known prefix for faster solving. Hook expensive functions (crypto, I/O) to prevent path explosion. See [tools-dynamic.md](tools-dynamic.md#angr-symbolic-execution).

### Qiling Emulation
Cross-platform binary emulation with OS-level support (syscalls, filesystem). Emulate Linux/Windows/ARM/MIPS binaries on any host. No debugger artifacts — bypasses all anti-debug by default. Hook syscalls and addresses with Python API. See [tools-dynamic.md](tools-dynamic.md#qiling-framework-cross-platform-emulation).

### VMProtect / Themida Analysis
VMProtect virtualizes code into custom bytecode. Identify VM entry (pushad-like), find handler table (large indirect jump), trace handlers dynamically. For CTF, focus on tracing operations on input rather than full devirtualization. Themida: dump at OEP with ScyllaHide + Scylla. See [tools-advanced.md](tools-advanced.md#vmprotect-analysis).

### Binary Diffing
BinDiff and Diaphora compare two binaries to highlight changes. Essential when challenge provides patched/original versions. Export from IDA/Ghidra, diff to find vulnerability or hidden functionality. See [tools-advanced.md](tools-advanced.md#binary-diffing).

### Advanced GDB (pwndbg, rr)
pwndbg: `context`, `vmmap`, `search -s "flag{"`, `telescope $rsp`. GEF alternative. Reverse debugging with `rr record`/`rr replay` — step backward through execution. Python scripting for brute-force and automated tracing. See [tools-advanced.md](tools-advanced.md#advanced-gdb-techniques).

### macOS / iOS Reversing
Mach-O binaries: `otool -l` for load commands, `class-dump` for Objective-C headers. Swift: `swift demangle` for symbols. iOS apps: decrypt FairPlay DRM with frida-ios-dump, bypass jailbreak detection with Frida hooks. Re-sign patched binaries with `codesign -f -s -`. See [platforms.md](platforms.md#macos-ios-reversing).

### Embedded / IoT Firmware RE
`binwalk -Me firmware.bin` for recursive extraction. Hardware: UART/JTAG/SPI flash for firmware dumps. Filesystems: SquashFS (`unsquashfs`), JFFS2, UBI. Emulate with QEMU: `qemu-arm -L /usr/arm-linux-gnueabihf/ ./binary`. See [platforms.md](platforms.md#embedded-iot-firmware-re).

### Kernel Driver Reversing
Linux `.ko`: find ioctl handler via `file_operations` struct, trace `copy_from_user`/`copy_to_user`. Debug with QEMU+GDB (`-s -S`). eBPF: `bpftool prog dump xlated`. Windows `.sys`: find `DriverEntry` → `IoCreateDevice` → IRP handlers. See [platforms.md](platforms.md#kernel-driver-reversing).

### Swift / Kotlin Binary Reversing
Swift: `swift demangle` symbols, protocol witness tables for dispatch, `__swift5_*` sections. Kotlin/JVM: coroutines compile to state machines in `invokeSuspend`, `jadx` with Kotlin mode for best decompilation. Kotlin/Native: LLVM backend, looks like C++ in disassembly. See [languages-compiled.md](languages-compiled.md#swift-binary-reversing).

### INT3 Patch + Coredump Brute-Force Oracle
Patch `0xCC` (INT3) after transform output, enable core dumps, brute-force each input character by extracting computed state from coredump via `strings`. Avoids full reverse of transformation. See [patterns.md](patterns.md#int3-patch-coredump-brute-force-oracle-pwn2win-2016).

### Signal Handler Chain + LD_PRELOAD Oracle
Binary uses signal handler chains for per-character password validation. Hook `signal()` via LD_PRELOAD -- the call to install the next handler confirms the current character is correct. See [patterns.md](patterns.md#signal-handler-chain-ldpreload-oracle-nuit-du-hack-2016).

### Font Ligature Exploitation
Custom OpenType font maps multi-character ligature sequences to single glyphs; reverse the GSUB table to decode hidden messages. See [patterns-ctf-3.md](patterns-ctf-3.md#opentype-font-ligature-exploitation-for-hidden-messages-hack-the-vote-2016).

### Instruction Counter as Cryptographic State
**Pattern:** Hand-written assembly uses a dedicated register (e.g., `r12`) as an instruction counter incremented after nearly every instruction. The counter feeds into XOR/ROL/multiply transformations on input bytes, making transformation path-dependent. Byte-by-byte brute force with Unicorn emulation recovers the flag. See [patterns-ctf-3.md](patterns-ctf-3.md#instruction-counter-as-cryptographic-state-metactf-flash-2026).

### Burrows-Wheeler Transform Inversion
Invert BWT without terminator character by trying all possible row indices. Standard `bwtool` or manual column-sorting reconstruction. See [patterns-ctf-3.md](patterns-ctf-3.md#burrows-wheeler-transform-inversion-without-terminator-asis-ctf-finals-2016).

### FRACTRAN Program Inversion
Esoteric language using iterated fraction multiplication. Invert by swapping numerator/denominator in fraction table, run output backward. I/O encoded as prime factorization exponents. See [languages.md](languages.md#fractran-program-inversion-boston-key-party-2016).

### Opcode-Only Trace Reconstruction
Execution traces with only opcodes (no data) still leak info through branch decisions. Sorting algorithm comparisons reveal element ordering. Reconstruct by deduplicating trace, splitting into basic blocks. See [tools-dynamic.md](tools-dynamic.md#opcode-only-trace-reconstruction-0ctf-2016).

### Thread Race Signed Integer Overflow
Combat-simulation binary with thread-unsafe skill lock. Race between skill selection and damage calculation; `cdqe` sign-extends 0xFFFFFFFF to -1 (signed), causing HP overflow on subtraction. See [patterns-ctf-3.md](patterns-ctf-3.md#thread-race-condition-with-signed-integer-overflow-codegate-2017).

### ESP32/Xtensa Firmware Reversing
No IDA support — use radare2 + ESP-IDF ROM linker script (`esp32.rom.ld`) for symbol resolution. Cross-reference with public ESP-IDF HTTP server examples to identify app logic. See [patterns-ctf-3.md](patterns-ctf-3.md#esp32xtensa-firmware-reversing-with-rom-symbol-map-insomnihack-2017).

### Custom VM Bytecode Lifting to LLVM IR
Transpile custom VM bytecode to LLVM IR, then use `opt -O3` to simplify (inlining, constant folding, dead code elimination). Reduces 1300 lines to ~150 lines, revealing the underlying algorithm. See [tools-advanced.md](tools-advanced.md#custom-vm-bytecode-lifting-to-llvm-ir-google-ctf-2017).

### SIGFPE Signal Handler Side-Channel
SIGFPE signal handlers create implicit control flow invisible to static analysis. Count SIGFPE signals via `strace -e signal=SIGFPE` per candidate character -- correct characters produce more signals. See [anti-analysis.md](anti-analysis.md#sigfpe-signal-handler-side-channel-via-strace-counting-plaidctf-2017).

### Batch Crackme Automation via objdump
Mass crackme challenges (100s of binaries) with identical structure: script `objdump` to extract CMP immediates and add/sub arithmetic sequences, then reverse-compute keys algebraically without execution. See [patterns-ctf-3.md](patterns-ctf-3.md#batch-crackme-automation-via-objdump-pattern-extraction-def-con-2017).

### Android DEX Runtime Bytecode Patching
Native JNI library patches Dalvik bytecode in memory via `/proc/self/maps` + `mprotect` + XOR. Static APK analysis alone is insufficient -- extract XOR key and offsets from the native `.so` to reconstruct the runtime DEX. See [languages-platforms.md](languages-platforms.md#android-dex-runtime-bytecode-patching-via-procselfmaps-google-ctf-2017).

### Fork + Pipe + Dead Branch Anti-Analysis
Fork/pipe IPC where parent writes data and exits, child reads and continues. Real validation hidden in a dead branch (always-false comparison). `strace` reveals the fork/pipe pattern; patch the comparison constant to reach hidden code. See [patterns-ctf-3.md](patterns-ctf-3.md#fork-pipe-dead-branch-anti-analysis-rctf-2017).

## Web/CTF Auth Bypass Case Notes

### Signed Cookie Key Reuse: access token to admin_session

**Case:** `class.pangbaoba.me` CTF homework system. Public `/access/<token>` route set a signed `student_gate`; the same access token also worked as the HMAC key for `admin_session`, allowing direct admin API access by forging the exact session payload shape.

**Core pattern:** A visible invite/access token is reused as a server-side signing secret. If one signed cookie can be validated offline, test whether sibling auth cookies use the same signing scheme and key.

**Triage workflow:**
1. Capture `Set-Cookie` from the gated entry route, especially cookies shaped like `<base64url-json>.<base64url-signature>`.
2. Decode the first segment; identify compact JSON payloads such as `{"access":"student"}`.
3. Recompute `HMAC-SHA256(payload_b64, candidate_key)` using visible route tokens, invite codes, reset tokens, or frontend constants as candidate keys.
4. If the signature matches, enumerate *payload shape*, not passwords: try likely authorization claims on the correct cookie name (`admin_session`, `session`, `auth`, etc.).
5. Verify with read-only endpoints first (`/api/admin/me`, settings/status/list routes) before any write action.

**Important lesson:** The first obvious payload may fail. In this case `{"access":"admin"}`, `{"role":"admin"}`, and `{"access":"student","isAdmin":true}` failed, while the backend actually checked:

```json
{"admin":true}
```

**Minimal PoC shape:**

```python
import base64, hashlib, hmac, json

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

access_token = "<token from /access/<token>>"
payload_b64 = b64u(json.dumps({"admin": True}, separators=(",", ":")).encode())
sig_b64 = b64u(hmac.new(access_token.encode(), payload_b64.encode(), hashlib.sha256).digest())
print(f"admin_session={payload_b64}.{sig_b64}")
```

**Validation signals:**
- `GET /api/admin/me` changes from `401 {"error":"unauthorized"}` to `200 {"admin":true}`.
- Other read-only admin endpoints return real data with the forged cookie.
- A JSON-cookie value like `admin_session=j:{}` causing `500` suggests Express/cookie-parser type confusion and confirms fragile cookie parsing; it is not required for the bypass but helps identify the stack and parsing assumptions.

**What to avoid:** Do not brute-force admin passwords or enumerate unrelated user IDs when a signed-cookie structure is visible. Work offline on signatures and use low-frequency read-only verification.

**Fix guidance:** Never use public route/access tokens as HMAC secrets. Use server-only cookie signing secrets, separate student/admin secrets, server-side sessions for admin identity, strict cookie type checks, and return `401` on parse/verify failure instead of `500`.

## Web Phishing Infrastructure

### Phishing Panel: {target_domain_a} / {target_domain_b}
**完整分析**: [phishing-case-study.md](phishing-case-study.md)

Two-server phishing infrastructure impersonating a government agency. Full victim control system with server-driven status code redirection.

**Architecture:**
- `{target_domain_a}` — Presentation layer (phishing pages, JS polling client)
- `{target_domain_b}` — Data layer (PHP+MySQL backend, admin panel)
- Both behind NAT ({internal_ip} internal), nginx, SSL-only
- Web root: `/www/wwwroot/{target_domain_b}/`

**Victim Flow:** Landing page (fake subsidy quotas) → 1.html (ID/bank card form → `submit.php`) → 4.html (PIN → `get-ayment.php`) → server-controlled staged pages (9-16) via 1-second `status_check.php` polling.

**Key Findings:**
- Admin panel at `register.php` → `qichuang.php` (login form), `list.php` (dashboard template)
- Auth via PHP session (`PHPSESSID`); `login.php` and `check_login_ajax.php` removed (404)
- **Data leak**: `db.php` returns victim name list without auth (49+ records, **no bank details** — only id/username/note/description fields)
- **No-auth write**: `save_note.php` accepts data without authentication
- `backend.php` gives SQL error suggesting admin registration endpoint (broken)
- Rate limiting on `submit.php` (multi-factor), no SQLi or session bypass found
- Status code system: admin sets 1-16, victim browser auto-redirects to `N.html`

**Infrastructure:**
| Domain | Public IP | Role |
|--------|-----------|------|
| {target_domain_1} | {target_ip_1} | Backend + Admin |
| {target_domain_2} | {target_ip_2} | Frontend (phishing pages) |



---

## 分析前预判：文件伪装与名字欺骗

### 文件后缀不可信

**核心原则：永远用 `file` 命令或 magic bytes 判断文件类型，不要相信后缀名。**

常见伪装手法：

| 伪装后缀 | 实际类型 | 目的 |
|---------|---------|------|
| `.sh` | ELF 二进制 | 让人以为是脚本，降低警惕 |
| `.txt` | PE/ELF | 绕过简单的文件类型过滤 |
| `.jpg`/`.png` | 可执行文件或压缩包 | 隐藏在图片中 |
| `.dll` | 实际是 .NET assembly | 混淆分析方向 |
| `.so` | 实际是加密 payload | 需要先解密 |
| 无后缀 | 任何类型 | Linux 下常见 |

```bash
# 正确做法：用 file 命令
file suspicious_file.sh
# 输出: ELF 64-bit LSB executable, ARM aarch64...

# 用 xxd 看 magic bytes
xxd suspicious_file.sh | head -1
# 7f454c46 = ELF magic
```

### 文件名不可信

**"DriverLoader" 不一定加载驱动，"Updater" 不一定更新。**

常见名字欺骗：

| 文件名暗示 | 实际行为 |
|-----------|---------|
| `DriverLoader` | 可能是 ptrace 注入器 / 进程 hook |
| `SystemService` | 可能是后门 / C2 agent |
| `Updater` / `Update` | 可能是 dropper / 下载器 |
| `Helper` / `Assistant` | 可能是提权工具 |
| `lib*.so` | 可能是注入 payload |

**分析时应该：**
- 忽略文件名暗示，按实际代码行为判断
- 关注 `mmap`、`ptrace`、`/proc/self/mem` 等系统调用
- 如果看到"加载驱动"但没有 `insmod`/`init_module` 调用，说明名不副实

### 静态分析不够时的动态补充

纯静态分析只能看到代码骨架。以下场景必须配合动态分析：

| 场景 | 推荐动态方法 |
|------|-------------|
| 代码有解密/解压逻辑 | 在解密后下断点，dump 明文 |
| 大量间接调用（函数指针表） | strace/ltrace 跟踪实际调用 |
| 疑似反调试 | 先 strace 看 ptrace 调用 |
| 内嵌 shellcode/payload | QEMU 用户态模拟执行 |
| 网络通信协议未知 | tcpdump/Wireshark 抓包 |

```bash
# strace 跟踪系统调用（重点关注）
strace -f -e trace=open,mmap,ptrace,execve,connect ./binary

# ltrace 跟踪库函数调用
ltrace -f ./binary

# QEMU 用户态模拟（不需要真实设备）
qemu-aarch64 -strace ./binary_arm64

# 检查反调试：看是否 ptrace 自追踪
strace ./binary 2>&1 | grep ptrace
# 如果看到 ptrace(PTRACE_TRACEME, ...) 说明有反调试
```

### 进程注入/保护壳类样本的常见模式

这类样本（如 `LinYuDriverLoader`）通常：

1. **不是真正加载内核驱动**（需要 root 权限，大多数场景没有）
2. **实际行为是进程注入**：
   - `ptrace` attach 到目标进程
   - 通过 `/proc/<pid>/mem` 读写目标内存
   - `mmap` 映射 shellcode 到目标进程空间
3. **内嵌加密 payload**：
   - 运行时解密一段 shellcode
   - 解密后的 payload 才是真正的 hook 代码
4. **反调试保护**：
   - `ptrace(PTRACE_TRACEME)` 自追踪
   - 时间检测（`clock_gettime` 前后对比）
   - `/proc/self/status` 检查 TracerPid

**分析策略**：
```text
1. file 命令确认真实类型
2. strings 看有没有明显的路径/库名/错误信息
3. rabin2 -I 看架构/编译器/保护
4. 静态找 mmap/ptrace/open 调用
5. 如果有解密逻辑 → 动态跑到解密后 dump
6. 如果有反调试 → 先 patch 掉或用 LD_PRELOAD 绕过
```
