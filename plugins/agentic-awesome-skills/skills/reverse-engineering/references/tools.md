# CTF Reverse - Tools Reference

## Table of Contents
- [GDB](#gdb)
  - [Basic Commands](#basic-commands)
  - [PIE Binary Debugging](#pie-binary-debugging)
  - [One-liner Automation](#one-liner-automation)
  - [Memory Examination](#memory-examination)
- [Radare2](#radare2)
  - [Basic Session](#basic-session)
  - [r2pipe Automation](#r2pipe-automation)
- [Ghidra](#ghidra)
  - [Headless Analysis](#headless-analysis)
  - [Emulator for Decryption](#emulator-for-decryption)
  - [MCP Commands](#mcp-commands)
- [Unicorn Emulation](#unicorn-emulation)
  - [Basic Setup](#basic-setup)
  - [Mixed-Mode (64 to 32) Switch](#mixed-mode-64-to-32-switch)
  - [Register Tracing Hook](#register-tracing-hook)
  - [Track Register Changes](#track-register-changes)
- [Python Bytecode](#python-bytecode)
  - [Disassembly](#disassembly)
  - [Extract Constants](#extract-constants)
  - [Pyarmor Static Unpack (1shot)](#pyarmor-static-unpack-1shot)
- [WASM Analysis](#wasm-analysis)
  - [Decompile to C](#decompile-to-c)
  - [Common Patterns](#common-patterns)
- [Android APK](#android-apk)
  - [Extraction](#extraction)
  - [Key Locations](#key-locations)
  - [Search](#search)
  - [Flutter APK (Blutter)](#flutter-apk-blutter)
  - [HarmonyOS HAP/ABC (abc-decompiler)](#harmonyos-hapabc-abc-decompiler)
- [.NET Analysis](#net-analysis)
  - [Tools](#tools)
  - [Two-Stage XOR + AES-CBC Decode Pattern (Codegate 2013)](#two-stage-xor--aes-cbc-decode-pattern-codegate-2013)
  - [NativeAOT](#nativeaot)
- [Packed Binaries](#packed-binaries)
  - [UPX](#upx)
  - [Custom Packers](#custom-packers)
  - [PyInstaller](#pyinstaller)
- [LLVM IR](#llvm-ir)
  - [Convert to Assembly](#convert-to-assembly)
- [RISC-V Binary Analysis (EHAX 2026)](#risc-v-binary-analysis-ehax-2026)
- [Binary Ninja](#binary-ninja)
- [Decompiler Comparison with dogbolt.org](#decompiler-comparison-with-dogboltorg)
- [Useful Commands](#useful-commands)

For dynamic instrumentation tools (Frida, angr, lldb, x64dbg), see [tools-dynamic.md](tools-dynamic.md).

---

## GDB

### Basic Commands
```bash
gdb ./binary
run                      # Run program
start                    # Run to main
b *0x401234              # Breakpoint at address
b *main+0x100            # Relative breakpoint
c                        # Continue
si                       # Step instruction
ni                       # Next instruction (skip calls)
x/s $rsi                 # Examine string
x/20x $rsp               # Examine stack
info registers           # Show registers
set $eax=0               # Modify register
```

### PIE Binary Debugging
```bash
gdb ./binary
start                    # Forces PIE base resolution
b *main+0xca            # Relative to main
b *main+0x198
run
```

### One-liner Automation
```bash
gdb -ex 'start' -ex 'b *main+0x198' -ex 'run' ./binary
```

### Memory Examination
```bash
x/s $rsi                 # String at RSI
x/38c $rsi               # 38 characters
x/20x $rsp               # 20 hex words from stack
x/10i $rip               # 10 instructions from RIP
```

---

## Radare2

### Basic Session
```bash
r2 -d ./binary           # Open in debug mode
aaa                      # Analyze all
afl                      # List functions
pdf @ main               # Disassemble main
db 0x401234              # Set breakpoint
dc                       # Continue
ood                      # Restart debugging
dr                       # Show registers
dr eax=0                 # Modify register
```

### r2pipe Automation
```python
import r2pipe
r2 = r2pipe.open('./binary', flags=['-d'])
r2.cmd('aaa')
r2.cmd('db 0x401234')

for char in range(256):
    r2.cmd('ood')        # Restart
    r2.cmd(f'dr eax={char}')
    output = r2.cmd('dc')
    if 'correct' in output:
        print(f"Found: {chr(char)}")
```

---

## Ghidra

### Headless Analysis
```bash
analyzeHeadless /path/to/project tmp -import binary -postScript script.py
```

### Emulator for Decryption
```java
EmulatorHelper emu = new EmulatorHelper(currentProgram);
emu.writeRegister("RSP", 0x2fff0000);
emu.writeRegister("RBP", 0x2fff0000);

// Write encrypted data
emu.writeMemory(dataAddress, encryptedBytes);

// Set function arguments
emu.writeRegister("RDI", arg1);

// Run until return
emu.setBreakpoint(returnAddress);
emu.run(functionEntryAddress);

// Read result
byte[] decrypted = emu.readMemory(outputAddress, length);
```

### MCP Commands
- Recon: `list_functions`, `list_imports`, `list_strings`
- Analysis: `decompile_function`, `get_xrefs_to`
- Annotation: `rename_function`, `rename_variable`

---

## Unicorn Emulation

### Basic Setup
```python
from unicorn import *
from unicorn.x86_const import *

mu = Uc(UC_ARCH_X86, UC_MODE_64)

# Map code segment
mu.mem_map(0x400000, 0x10000)
mu.mem_write(0x400000, code_bytes)

# Map stack
mu.mem_map(0x7fff0000, 0x10000)
mu.reg_write(UC_X86_REG_RSP, 0x7fff0000 + 0xff00)

# Run
mu.emu_start(start_addr, end_addr)
```

### Mixed-Mode (64 to 32) Switch
```python
# When a 64-bit stub jumps into 32-bit code via retf/retfq:
# - retf pops 4-byte EIP + 2-byte CS (6 bytes)
# - retfq pops 8-byte RIP + 8-byte CS (16 bytes)

uc32 = Uc(UC_ARCH_X86, UC_MODE_32)
# Copy memory regions, then GPRs
reg_map = {
    UC_X86_REG_EAX: UC_X86_REG_RAX,
    UC_X86_REG_EBX: UC_X86_REG_RBX,
    UC_X86_REG_ECX: UC_X86_REG_RCX,
    UC_X86_REG_EDX: UC_X86_REG_RDX,
    UC_X86_REG_ESI: UC_X86_REG_RSI,
    UC_X86_REG_EDI: UC_X86_REG_RDI,
    UC_X86_REG_EBP: UC_X86_REG_RBP,
}
for e, r in reg_map.items():
    uc32.reg_write(e, mu.reg_read(r) & 0xffffffff)  # mu = 64-bit emulator from above
uc32.reg_write(UC_X86_REG_EFLAGS, mu.reg_read(UC_X86_REG_RFLAGS) & 0xffffffff)

# SSE-heavy blobs need XMM registers copied
for xr in [UC_X86_REG_XMM0, UC_X86_REG_XMM1, UC_X86_REG_XMM2, UC_X86_REG_XMM3,
           UC_X86_REG_XMM4, UC_X86_REG_XMM5, UC_X86_REG_XMM6, UC_X86_REG_XMM7]:
    uc32.reg_write(xr, mu.reg_read(xr))

# Run 32-bit, then copy regs/memory back to 64-bit
```

**Tip:** set `UC_IGNORE_REG_BREAK=1` to silence warnings on unimplemented regs.

### Register Tracing Hook
```python
def hook_code(uc, address, size, user_data):
    if address == TARGET_ADDR:
        rsi = uc.reg_read(UC_X86_REG_RSI)
        print(f"0x{address:x}: rsi=0x{rsi:016x}")

mu.hook_add(UC_HOOK_CODE, hook_code)
```

### Track Register Changes
```python
prev_rsi = [None]
def hook_rsi_changes(uc, address, size, user_data):
    rsi = uc.reg_read(UC_X86_REG_RSI)
    if rsi != prev_rsi[0]:
        print(f"0x{address:x}: RSI changed to 0x{rsi:016x}")
        prev_rsi[0] = rsi

mu.hook_add(UC_HOOK_CODE, hook_rsi_changes)
```

---

## Python Bytecode

### Disassembly
```python
import marshal, dis

with open('file.pyc', 'rb') as f:
    f.read(16)  # Skip header (varies by Python version)
    code = marshal.load(f)
    dis.dis(code)
```

### Extract Constants
```python
for ins in dis.get_instructions(code):
    if ins.opname == 'LOAD_CONST':
        print(ins.argval)
```

### Pyarmor Static Unpack (1shot)

Repository: `https://github.com/Lil-House/Pyarmor-Static-Unpack-1shot`

```bash
# Basic usage (recursive processing)
python /path/to/oneshot/shot.py /path/to/scripts

# Specify pyarmor runtime library explicitly
python /path/to/oneshot/shot.py /path/to/scripts -r /path/to/pyarmor_runtime.so

# Save outputs to another directory
python /path/to/oneshot/shot.py /path/to/scripts -o /path/to/output
```

Notes:
- `oneshot/pyarmor-1shot` must exist before running `shot.py`.
- Supported focus: Pyarmor 8.x-9.x (`PY` + six digits header style).
- Pyarmor 7 and earlier (`PYARMOR` header) are out of scope.
- Disassembly output is generally reliable; decompiled source is experimental.

---

## WASM Analysis

### Decompile to C
```bash
wasm2c checker.wasm -o checker.c
gcc -O3 checker.c wasm-rt-impl.c -o checker
```

### Common Patterns
- `w2c_memory` - Linear memory array
- `wasm_rt_trap(N)` - Runtime errors
- Function exports: `flagChecker`, `validate`

---

## Android APK

### Extraction
```bash
apktool d app.apk -o decoded/   # Best - decodes XML
jadx app.apk                     # Decompile to Java
unzip app.apk -d extracted/      # Simple extraction
```

### Key Locations
- `res/values/strings.xml` - String resources
- `AndroidManifest.xml` - App metadata
- `classes.dex` - Dalvik bytecode
- `assets/`, `res/raw/` - Resources

### Search
```bash
grep -r "flag\|CTF" decoded/
strings decoded/classes*.dex | grep -i flag
```

### Flutter APK (Blutter)

```bash
# Run Blutter on arm64 build
python3 blutter.py path/to/app/lib/arm64-v8a out_dir
```

### HarmonyOS HAP/ABC (abc-decompiler)

Repository: `https://github.com/ohos-decompiler/abc-decompiler`

```bash
# Extract .hap first to obtain .abc files
unzip app.hap -d hap_extracted/
```

Critical startup mode:
```bash
# Use CLI entrypoint (avoid java -jar GUI mode)
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI [options] <input>
```

```bash
# Basic decompile
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI -d "out" ".abc"

# Recommended for .abc
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI -m simple --log-level ERROR -d "out_abc_simple" ".abc"
```

Notes:
- Start with `-m simple --log-level ERROR`.
- If `auto` fails, retry with `-m simple` first.
- Errors do not always mean total failure; check `out_xxx/sources/`.
- Use a fresh output directory per run.

---

## .NET Analysis

### Tools
- **dnSpy** - Debugging + decompilation (best)
- **ILSpy** - Decompiler
- **dotPeek** - JetBrains decompiler

### NativeAOT
- Look for `System.Private.CoreLib` strings
- Type metadata present but restructured
- Search for length-prefixed UTF-16 patterns

### Two-Stage XOR + AES-CBC Decode Pattern (Codegate 2013)

**Pattern:** .NET binary stores an encrypted byte array that undergoes XOR decoding followed by AES-256-CBC decryption. The same key value serves as both the AES key and IV.

**Steps:**
1. Extract hardcoded byte array and key string from binary (dnSpy/ILSpy)
2. XOR each byte (may be multi-pass, e.g., `0x25` then `0x58`, equivalent to single `0x7D`)
3. Base64-decode the XOR result
4. AES-256-CBC decrypt with `RijndaelManaged` using the extracted key as both Key and IV

```python
from Crypto.Cipher import AES
from base64 import b64decode

# Step 1: XOR decode
data = bytearray(encrypted_bytes)
for i in range(len(data)):
    data[i] ^= 0x7D  # Combined XOR key (0x25 ^ 0x58)

# Step 2: Base64 decode
ct = b64decode(bytes(data))

# Step 3: AES-256-CBC decrypt (same value for key and IV)
key = b"9e2ea73295c7201c5ccd044477228527"  # Padded to 32 bytes
cipher = AES.new(key, AES.MODE_CBC, iv=key)
plaintext = cipher.decrypt(ct)
```

**Key insight:** When `RijndaelManaged` appears in .NET decompilation, check if Key and IV are set to the same value — this is a common CTF pattern. The XOR stage often serves as a simple obfuscation layer before the real crypto.

---

## Packed Binaries

### UPX
```bash
upx -d packed -o unpacked
strings binary | grep UPX     # Check for UPX signature
```

### Custom Packers
1. Set breakpoint after unpacking stub
2. Dump memory
3. Fix PE/ELF headers

### PyInstaller
```bash
python pyinstxtractor.py binary.exe
# Look in: binary.exe_extracted/
```

---

## LLVM IR

### Convert to Assembly
```bash
llc task.ll --x86-asm-syntax=intel
gcc -c task.s -o file.o
```

---

## RISC-V Binary Analysis (EHAX 2026)

**Pattern (iguessbro):** Statically linked, stripped RISC-V ELF binary. Can't run natively on x86.

**Disassembly with Capstone:**
```python
from capstone import *

with open('binary', 'rb') as f:
    code = f.read()

# RISC-V 64-bit with compressed instruction support
md = Cs(CS_ARCH_RISCV, CS_MODE_RISCVC | CS_MODE_RISCV64)
md.detail = True

# Disassemble from entry point (check ELF header for e_entry)
TEXT_OFFSET = 0x10000  # typical for static RISC-V
for insn in md.disasm(code[TEXT_OFFSET:], TEXT_OFFSET):
    print(f"0x{insn.address:x}:\t{insn.mnemonic}\t{insn.op_str}")
```

**Common RISC-V patterns:**
- `li a0, N` → load immediate (argument setup)
- `mv a0, s0` → register move
- `call offset` → function call (auipc + jalr pair)
- `beq/bne a0, zero, label` → conditional branch
- `sd/ld` → 64-bit store/load
- `addiw` → 32-bit add (W-suffix = word operations)

**Key differences from x86:**
- No flags register — comparisons are inline with branch instructions
- Arguments in a0-a7 (not rdi/rsi/rdx)
- Return value in a0
- Saved registers s0-s11 (callee-saved)
- Compressed instructions (2 bytes) mixed with standard (4 bytes) — use `CS_MODE_RISCVC`

**Anti-RE tricks in RISC-V:**
- Fake flags as string constants (check for `"n0t_th3_r34l"` patterns)
- Timing anti-brute-force (rdtime instruction)
- XOR decryption with incremental key: `decrypted[i] = enc[i] ^ (key & 0xFF) ^ 0xA5; key += 7`

**Emulation:** `qemu-riscv64 -L /usr/riscv64-linux-gnu/ ./binary` (needs cross-toolchain sysroot)

---

## Binary Ninja

Interactive disassembler/decompiler with rapid community growth.

**Decompilation outputs:** High-Level Intermediate Language (HLIL), pseudo-C, pseudo-Rust, pseudo-Python.

```bash
# Open binary
binaryninja binary
```

```python
# Headless analysis (Python API)
import binaryninja
bv = binaryninja.open_view("binary")
for func in bv.functions:
    print(func.name, hex(func.start))
    print(func.hlil)  # High-Level IL
```

**Community plugins:** Available via Plugin Manager (Ctrl+Shift+P → "Plugin Manager").

**Free version:** https://binary.ninja/free/ (cloud-based, limited features).

**Advantages over Ghidra:** Faster startup, cleaner IL representations, better Python API for scripting.

---

## Decompiler Comparison with dogbolt.org

**dogbolt.org** runs multiple decompilers simultaneously on the same binary and shows results side-by-side.

**Supported decompilers:** Hex-Rays (IDA), Ghidra, Binary Ninja, angr, RetDec, Snowman, dewolf, Reko, Relyze.

**When to use:**
- Decompiler output is confusing — compare with alternatives for clarity
- One decompiler mishandles a construct — another may get it right
- Quick triage without installing every tool locally
- Validate decompiler correctness by cross-referencing outputs

```bash
# Upload via web interface: https://dogbolt.org/
# Or use the API:
curl -F "file=@binary" https://dogbolt.org/api/binaries/
```

**Key insight:** Different decompilers excel at different constructs. When one produces unreadable output, another often generates clearer pseudocode. Cross-referencing catches decompiler bugs.

---

## Useful Commands

```bash
# File info
file binary
checksec --file=binary
rabin2 -I binary

# String extraction
strings binary | grep -iE "flag|secret"
rabin2 -z binary

# Sections
readelf -S binary
objdump -h binary

# Symbols
nm binary
readelf -s binary

# Disassembly
objdump -d binary
objdump -M intel -d binary
```
