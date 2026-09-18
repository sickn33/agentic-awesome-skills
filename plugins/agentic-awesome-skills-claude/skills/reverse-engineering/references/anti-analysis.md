# CTF Reverse - Anti-Analysis Techniques & Bypasses

Comprehensive reference for anti-debugging, anti-VM, anti-DBI, and integrity-check techniques encountered in CTF challenges, with practical bypasses.

## Table of Contents
- [Linux Anti-Debug (Advanced)](#linux-anti-debug-advanced)
  - [ptrace-Based](#ptrace-based)
  - [/proc Filesystem Checks](#proc-filesystem-checks)
  - [Timing-Based Detection](#timing-based-detection)
  - [Signal-Based Anti-Debug](#signal-based-anti-debug)
  - [Syscall-Level Evasion](#syscall-level-evasion)
- [Windows Anti-Debug (Advanced)](#windows-anti-debug-advanced)
  - [PEB (Process Environment Block) Checks](#peb-process-environment-block-checks)
  - [NtQueryInformationProcess](#ntqueryinformationprocess)
  - [Heap Flags](#heap-flags)
  - [TLS Callbacks](#tls-callbacks)
  - [Hardware Breakpoint Detection](#hardware-breakpoint-detection)
  - [Software Breakpoint Detection (INT3 Scanning)](#software-breakpoint-detection-int3-scanning)
  - [Exception-Based Anti-Debug](#exception-based-anti-debug)
  - [NtSetInformationThread (Thread Hiding)](#ntsetinformationthread-thread-hiding)
- [Anti-VM / Anti-Sandbox](#anti-vm--anti-sandbox)
  - [CPUID Hypervisor Bit](#cpuid-hypervisor-bit)
  - [MAC Address / Hardware Fingerprinting](#mac-address--hardware-fingerprinting)
  - [Timing-Based VM Detection](#timing-based-vm-detection)
  - [File / Registry Artifacts](#file--registry-artifacts)
  - [Resource Checks (CPU Count, RAM, Disk)](#resource-checks-cpu-count-ram-disk)
- [Anti-DBI (Dynamic Binary Instrumentation)](#anti-dbi-dynamic-binary-instrumentation)
  - [Frida Detection](#frida-detection)
  - [Pin/DynamoRIO Detection](#pindynamorio-detection)
- [Code Integrity / Self-Hashing](#code-integrity--self-hashing)
- [Anti-Disassembly Techniques](#anti-disassembly-techniques)
  - [Opaque Predicates](#opaque-predicates)
  - [Junk Bytes / Overlapping Instructions](#junk-bytes--overlapping-instructions)
  - [Jump-in-the-Middle](#jump-in-the-middle)
  - [Function Chunking / Scattered Code](#function-chunking--scattered-code)
  - [Control Flow Flattening (Advanced)](#control-flow-flattening-advanced)
  - [Mixed Boolean-Arithmetic (MBA) Identification & Simplification](#mixed-boolean-arithmetic-mba-identification--simplification)
- [SIGILL Handler for Execution Mode Switching (Hack.lu 2015)](#sigill-handler-for-execution-mode-switching-hacklu-2015)
- [SIGFPE Signal Handler Side-Channel via strace Counting (PlaidCTF 2017)](#sigfpe-signal-handler-side-channel-via-strace-counting-plaidctf-2017)
- [Instruction Trace Inversion with Keystone and Unicorn (MeePwn CTF 2017)](#instruction-trace-inversion-with-keystone-and-unicorn-meepwn-ctf-2017)
- [Call-less Function Chaining via Stack Frame Manipulation (THC CTF 2018)](#call-less-function-chaining-via-stack-frame-manipulation-thc-ctf-2018)
- [Comprehensive Bypass Strategies](#comprehensive-bypass-strategies)
  - [Universal Bypass Checklist](#universal-bypass-checklist)
  - [Layered Anti-Debug (Real-World Pattern)](#layered-anti-debug-real-world-pattern)
  - [Quick Reference: Check to Bypass](#quick-reference-check-to-bypass)

---

## Linux Anti-Debug (Advanced)

### ptrace-Based

**Self-ptrace (most common):**
```c
if (ptrace(PTRACE_TRACEME, 0, 0, 0) == -1) exit(1); // Already traced = debugger attached
```

**Bypasses:**
```bash
# 1. LD_PRELOAD (see patterns.md for full hook)
LD_PRELOAD=./hook.so ./binary

# 2. Patch with pwntools
python3 -c "
from pwn import *
elf = ELF('./binary', checksec=False)
elf.asm(elf.symbols.ptrace, 'xor eax, eax; ret')
elf.save('patched')
"

# 3. GDB: catch the syscall
gdb ./binary
(gdb) catch syscall ptrace
(gdb) run
# When it stops at ptrace:
(gdb) set $rax = 0
(gdb) continue

# 4. Kernel config (requires root)
echo 0 > /proc/sys/kernel/yama/ptrace_scope
```

**Double-ptrace pattern:**
```c
// Fork child to ptrace parent — blocks all other debuggers
pid_t child = fork();
if (child == 0) {
    ptrace(PTRACE_ATTACH, getppid(), 0, 0);
    // Child sits in waitpid loop, keeping parent traced
} else {
    // Parent continues with real logic
}
```
**Bypass:** Kill the watchdog child process, then attach debugger.

### /proc Filesystem Checks

```c
// TracerPid check
FILE *f = fopen("/proc/self/status", "r");
// Looks for "TracerPid:\t0" — non-zero means debugger

// /proc/self/exe link check (some debuggers change this)
readlink("/proc/self/exe", buf, sizeof(buf));

// /proc/self/maps — check for debugger libraries
grep("frida", "/proc/self/maps");
```

**Bypasses:**
```bash
# 1. LD_PRELOAD fopen/fread to fake /proc contents
# 2. Mount namespace isolation
unshare -m bash -c 'mount --bind /dev/null /proc/self/status && ./binary'

# 3. GDB: set breakpoint at fopen, change filename argument
(gdb) b fopen
(gdb) run
(gdb) set {char[20]} $rdi = "/dev/null"
(gdb) continue
```

### Timing-Based Detection

```c
// rdtsc (CPU timestamp counter)
uint64_t start = __rdtsc();
// ... code ...
uint64_t delta = __rdtsc() - start;
if (delta > THRESHOLD) exit(1);  // too slow = debugger

// clock_gettime
struct timespec ts1, ts2;
clock_gettime(CLOCK_MONOTONIC, &ts1);
// ... code ...
clock_gettime(CLOCK_MONOTONIC, &ts2);

// gettimeofday
struct timeval tv1, tv2;
gettimeofday(&tv1, NULL);
```

**Bypasses:**
```bash
# 1. Frida hook (see tools-dynamic.md for clock_gettime hook)

# 2. GDB: skip rdtsc by patching with constant
(gdb) set {unsigned char[2]} 0x401234 = {0x90, 0x90}  # NOP the rdtsc

# 3. Pin tool to fix TSC reads
# 4. faketime library
LD_PRELOAD=/usr/lib/faketime/libfaketime.so.1 FAKETIME="2024-01-01" ./binary
```

### Signal-Based Anti-Debug

```c
// SIGTRAP handler — INT3 under debugger is caught by debugger, not handler
signal(SIGTRAP, handler);
__asm__("int3");
// If handler runs: no debugger. If debugger catches: debugged.

// SIGALRM timeout — kill self if analysis takes too long
signal(SIGALRM, kill_handler);
alarm(5);

// SIGSEGV handler that does real work (see patterns.md for MBA pattern)
signal(SIGSEGV, real_logic_handler);
*(int*)0 = 0;  // deliberate crash → handler runs real code
```

**Bypasses:**
```bash
# GDB: pass signals to program instead of handling them
(gdb) handle SIGTRAP nostop pass
(gdb) handle SIGALRM ignore
(gdb) handle SIGSEGV nostop pass

# For alarm-based: patch alarm() to return immediately
```

### Syscall-Level Evasion

```c
// Direct syscall instead of libc — bypasses LD_PRELOAD hooks
long ret;
asm volatile("syscall" : "=a"(ret) : "a"(101), "D"(0), "S"(0), "d"(0), "r"(0));
// Syscall 101 = ptrace on x86_64
```

**Bypass:** Must patch the binary itself or use ptrace to intercept at syscall level.
```bash
# GDB: catch syscall
(gdb) catch syscall 101
(gdb) commands
> set $rax = 0
> continue
> end
```

---

## Windows Anti-Debug (Advanced)

### PEB (Process Environment Block) Checks

```c
// BeingDebugged flag (offset 0x2 in PEB)
bool debugged = NtCurrentPeb()->BeingDebugged;

// NtGlobalFlag (offset 0x68/0xBC in PEB)
// When debugger: FLG_HEAP_ENABLE_TAIL_CHECK | FLG_HEAP_ENABLE_FREE_CHECK | FLG_HEAP_VALIDATE_PARAMETERS = 0x70
DWORD flags = *(DWORD*)((BYTE*)NtCurrentPeb() + 0xBC); // 64-bit offset
if (flags & 0x70) exit(1);
```

**Bypass (x64dbg):**
```text
# ScyllaHide plugin auto-patches PEB fields
# Manual: dump PEB, zero BeingDebugged and NtGlobalFlag
```

### NtQueryInformationProcess

```c
// ProcessDebugPort (0x7)
DWORD_PTR debugPort = 0;
NtQueryInformationProcess(GetCurrentProcess(), 7, &debugPort, sizeof(debugPort), NULL);
if (debugPort != 0) exit(1);

// ProcessDebugObjectHandle (0x1E)
HANDLE debugObj = NULL;
NTSTATUS status = NtQueryInformationProcess(GetCurrentProcess(), 0x1E, &debugObj, sizeof(debugObj), NULL);
if (status == 0) exit(1); // STATUS_SUCCESS means debugger present

// ProcessDebugFlags (0x1F) — returns inverse: 0 = debugger present
DWORD noDebug = 0;
NtQueryInformationProcess(GetCurrentProcess(), 0x1F, &noDebug, sizeof(noDebug), NULL);
if (noDebug == 0) exit(1);
```

**Bypass:** Hook `NtQueryInformationProcess` to return fake values, or use ScyllaHide.

### Heap Flags

```c
// Process heap has debug flags when debugger attached
PHEAP heap = (PHEAP)GetProcessHeap();
// Flags at offset 0x70 (64-bit): should be HEAP_GROWABLE (0x2)
// ForceFlags at offset 0x74: should be 0
if (heap->Flags != 0x2 || heap->ForceFlags != 0) exit(1);
```

### TLS Callbacks

**Key technique:** TLS (Thread Local Storage) callbacks execute BEFORE `main()` / entry point.

```c
// Registered in PE header's TLS directory
void NTAPI TlsCallback(PVOID DllHandle, DWORD Reason, PVOID Reserved) {
    if (Reason == DLL_PROCESS_ATTACH) {
        if (IsDebuggerPresent()) {
            ExitProcess(1);  // Kills process before main runs
        }
    }
}

#pragma comment(linker, "/INCLUDE:_tls_used")
#pragma data_seg(".CRT$XLB")
PIMAGE_TLS_CALLBACK callbacks[] = { TlsCallback, NULL };
```

**Detection in IDA/Ghidra:** Check PE TLS Directory → AddressOfCallBacks. Functions listed there run before EP.

**Bypass:** Set breakpoint on TLS callback in x64dbg (Options → Events → TLS Callbacks), or patch the TLS directory entry.

### Hardware Breakpoint Detection

```c
// Read debug registers via GetThreadContext
CONTEXT ctx;
ctx.ContextFlags = CONTEXT_DEBUG_REGISTERS;
GetThreadContext(GetCurrentThread(), &ctx);
if (ctx.Dr0 || ctx.Dr1 || ctx.Dr2 || ctx.Dr3) exit(1);

// Also via exception handler: deliberate exception, check DR regs in handler
```

**Bypass:**
```bash
# x64dbg: use software breakpoints instead, or hook GetThreadContext
# Frida: hook GetThreadContext to zero DR registers
```

### Software Breakpoint Detection (INT3 Scanning)

```c
// CRC / hash check over code section
unsigned char *code = (unsigned char*)function_addr;
uint32_t checksum = 0;
for (int i = 0; i < code_size; i++) {
    checksum += code[i];
    if (code[i] == 0xCC) exit(1);  // INT3 = software breakpoint
}
if (checksum != EXPECTED_CHECKSUM) exit(1);
```

**Bypass:** Use hardware breakpoints (DR0-DR3) instead of software breakpoints. Or hook the scanning function.

### Exception-Based Anti-Debug

```c
// UnhandledExceptionFilter — under debugger, filter is NOT called
SetUnhandledExceptionFilter(handler);
RaiseException(EXCEPTION_ACCESS_VIOLATION, 0, 0, NULL);
// If handler runs: no debugger
// If debugger catches: debugger present

// INT 2D — debugger single-step anomaly
__asm { int 2dh }  // Debugger silently consumes the exception
// If execution continues: debugger present
```

### NtSetInformationThread (Thread Hiding)

```c
// Hide thread from debugger — stops all debug events
typedef NTSTATUS(NTAPI *pNtSIT)(HANDLE, ULONG, PVOID, ULONG);
pNtSIT NtSIT = (pNtSIT)GetProcAddress(GetModuleHandle("ntdll"), "NtSetInformationThread");
NtSIT(GetCurrentThread(), 0x11 /*ThreadHideFromDebugger*/, NULL, 0);
// After this, debugger won't see breakpoints or exceptions from this thread
```

**Bypass:** Hook `NtSetInformationThread` to ignore class 0x11, or patch the call.

---

## Anti-VM / Anti-Sandbox

### CPUID Hypervisor Bit

```c
int regs[4];
__cpuid(regs, 1);
if (regs[2] & (1 << 31)) {  // ECX bit 31 = hypervisor present
    exit(1);
}

// Hypervisor brand string
__cpuid(regs, 0x40000000);
char brand[13] = {0};
memcpy(brand, &regs[1], 12);
// "VMwareVMware", "Microsoft Hv", "KVMKVMKVM", "XenVMMXenVMM"
```

**Bypass:** Patch `cpuid` results or use `LD_PRELOAD` to hook wrapper functions.

### MAC Address / Hardware Fingerprinting

```text
Known VM MAC prefixes:
  VMware:     00:0C:29, 00:50:56
  VirtualBox: 08:00:27
  Hyper-V:    00:15:5D
  Parallels:  00:1C:42
  QEMU:       52:54:00
```

### Timing-Based VM Detection

```c
// VM exits on privileged instructions are measurably slower
uint64_t start = __rdtsc();
__cpuid(regs, 0);  // Forces VM exit
uint64_t delta = __rdtsc() - start;
if (delta > 500) { /* likely VM */ }
```

### File / Registry Artifacts

```text
Files: C:\Windows\System32\drivers\vm*.sys, vbox*.dll, VBoxService.exe
Registry: HKLM\SOFTWARE\VMware, Inc.\VMware Tools
Services: VMTools, VBoxService
Processes: vmtoolsd.exe, VBoxTray.exe, qemu-ga.exe
Linux: /sys/class/dmi/id/product_name contains "VirtualBox"|"VMware"
       dmesg | grep -i "hypervisor detected"
```

### Resource Checks (CPU Count, RAM, Disk)

```c
// Sandboxes typically have minimal resources
SYSTEM_INFO si;
GetSystemInfo(&si);
if (si.dwNumberOfProcessors < 2) exit(1);

MEMORYSTATUSEX ms;
ms.dwLength = sizeof(ms);
GlobalMemoryStatusEx(&ms);
if (ms.ullTotalPhys < 2ULL * 1024 * 1024 * 1024) exit(1); // < 2GB RAM

// Disk size check (< 60GB = sandbox)
GetDiskFreeSpaceEx("C:\\", NULL, &total, NULL);
```

**Bypass:** Use a VM configured with adequate resources (4+ CPUs, 8GB+ RAM, 100GB+ disk).

---

## Anti-DBI (Dynamic Binary Instrumentation)

### Frida Detection

```c
// 1. Check /proc/self/maps for frida-agent
FILE *f = fopen("/proc/self/maps", "r");
while (fgets(line, sizeof(line), f)) {
    if (strstr(line, "frida") || strstr(line, "gadget")) exit(1);
}

// 2. Check for Frida's default port (27042)
int sock = socket(AF_INET, SOCK_STREAM, 0);
struct sockaddr_in addr = {.sin_family=AF_INET, .sin_port=htons(27042), .sin_addr.s_addr=inet_addr("127.0.0.1")};
if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) == 0) exit(1);

// 3. Check for inline hooks (function prologue modification)
// Compare first bytes of libc functions against expected values
unsigned char *strcmp_bytes = (unsigned char *)strcmp;
if (strcmp_bytes[0] == 0xE9 || strcmp_bytes[0] == 0xFF) exit(1); // JMP = hooked

// 4. Thread name check
// Frida creates threads with names like "gmain", "gdbus", "frida-*"
DIR *dir = opendir("/proc/self/task");
while ((entry = readdir(dir))) {
    char comm_path[256];
    snprintf(comm_path, sizeof(comm_path), "/proc/self/task/%s/comm", entry->d_name);
    // Read comm and check for "gmain", "gdbus"
}

// 5. Named pipe detection (Windows)
// Frida creates \\.\pipe\frida-* named pipes
```

**Frida bypass of Frida detection:**
```javascript
// Hook the detection functions themselves
Interceptor.attach(Module.findExportByName(null, "strstr"), {
    onEnter(args) {
        this.haystack = Memory.readUtf8String(args[0]);
        this.needle = Memory.readUtf8String(args[1]);
    },
    onLeave(retval) {
        if (this.needle && (this.needle.includes("frida") || this.needle.includes("gadget"))) {
            retval.replace(ptr(0)); // Not found
        }
    }
});

// Early Frida load (before anti-DBI runs)
// Use frida-gadget as early-init shared library
```

### Pin/DynamoRIO Detection

```c
// Check for instrumentation libraries in /proc/self/maps
// Pin: "pin-", "pinbin", "pinatrace"
// DynamoRIO: "dynamorio", "drcov", "drrun"

// Instruction count timing — DBI adds overhead
// Execute known instruction sequence, compare execution time
```

---

## Code Integrity / Self-Hashing

```c
// CRC32 over .text section
uint32_t crc = compute_crc32(text_start, text_size);
if (crc != EXPECTED_CRC) exit(1);  // Code was modified (breakpoints, patches)

// MD5/SHA256 of function bodies
unsigned char hash[32];
SHA256(function_addr, function_size, hash);
if (memcmp(hash, expected_hash, 32) != 0) exit(1);
```

**Bypasses:**
1. **Hardware breakpoints** (don't modify code, DR0-DR3)
2. **Patch the comparison** to always succeed
3. **Hook the hash function** to return expected value
4. **Emulate** instead of debug (Unicorn/Qiling — no code modification)
5. **Snapshot + restore:** dump memory before and after, diff to find checks

**Self-checksumming in loops:**
```c
// Continuous integrity check in separate thread
void *watchdog(void *arg) {
    while (1) {
        if (compute_crc32(text_start, text_end - text_start) != saved_crc) {
            memset(flag_buffer, 0, flag_len);  // Destroy flag
            exit(1);
        }
        usleep(100000);
    }
}
```
**Bypass:** Kill the watchdog thread or patch its sleep to infinite.

---

## Anti-Disassembly Techniques

### Opaque Predicates

```asm
; Condition that always evaluates the same way but looks data-dependent
mov eax, [some_memory]
imul eax, eax          ; x^2
and eax, 1             ; x^2 mod 2 is always 0 for any x
jnz fake_branch        ; Never taken, but disassembler doesn't know
; real code here
```

**Identification:** Z3/SMT can prove branch is always/never taken.

### Junk Bytes / Overlapping Instructions

```asm
jmp real_code
db 0xE8           ; Looks like start of CALL to linear disassembler
real_code:
mov eax, 1        ; Real code — disassembler may misalign here
```

**Fix:** Switch to graph-mode disassembly (Ghidra/IDA handle this well). Manual: undefine and re-analyze from correct offset.

### Jump-in-the-Middle

```asm
; Jumps into the middle of a multi-byte instruction
eb 01          ; jmp +1 (skip next byte)
e8             ; fake CALL opcode — disassembler tries to decode as call
90             ; real: NOP (landed here from jmp)
```

### Function Chunking / Scattered Code

Functions split into non-contiguous chunks connected by unconditional jumps. Defeats linear function boundary detection.

**Tool:** IDA's "Append function tail" or Ghidra's "Create function" at each chunk.

### Control Flow Flattening (Advanced)

> 完整的 OLLVM 脱密工作流、变种生态（Hikari/Polaris/O-MVLL/Tigress/Hodur 等）和社区工具调研见 [ollvm-deobfuscation.md](references/ollvm-deobfuscation.md)。

Beyond basic switch-case (see patterns.md): modern OLLVM variants use:
- **Bogus control flow:** Fake branches with opaque predicates
- **Instruction substitution:** `a + b` → `a - (-b)`, `a ^ b` → `(a | b) & ~(a & b)`
- **String encryption:** Strings decrypted at runtime, cleared after use

**现代变种（2026 社区活跃）：** Hikari (Anti Class Dump/String Encryption/Indirect Branch), Polaris (原 Pluto, 含 Trap Angr 专门坑 angr), O-MVLL (Python 驱动, Android 加固常用), Arkari (goron 基础, 间接跳转可被数据段只读对抗), amice (Rust, 含 VM Flatten 需 VM 逆向而非 deflat)。变种识别详见 ollvm-deobfuscation.md 第 1 节。

**Deobfuscation tools (社区活跃度排序):**
- **obpo-plugin** (629⭐, IDA microcode+concolic 云插件, 效果最强): https://github.com/obpo-project/obpo-plugin
- **ollvm-breaker** (441⭐, Binary Ninja, Android .so 实战): https://github.com/amimo/ollvm-breaker
- **ollvm-unflattener** (265⭐, Miasm 符号执行, 纯脚本 x86/x64): https://github.com/cdong1012/ollvm-unflattener
- **d810-ng** (223⭐, IDA, 集成 Z3, 覆盖 OLLVM/Tigress/Hodur/Approov): https://github.com/w00tzenheimer/d810-ng — **本地首选**
- **DeObfBR** (96⭐, BR 间接分支混淆专项): https://github.com/Mrack/DeObfBR
- **D-810** (原版, 已较少维护, 建议用 d810-ng): pattern-based deobfuscation, MBA simplification
- **Miasm**: Symbolic execution for deobfuscation
- **Arybo** / **SiMBA**: MBA expression simplification

```bash
# d810-ng: 复制到 IDA plugins 目录, Ctrl-Shift-D 加载
# 选择 Unflattener + MBA simplification + Opaque predicate removal
# obpo: 右键 dispatcher → OBPO → Mark and process function (需联网)
# ⚠️ Pluto/Polaris 的 Trap Angr pass 会让 angr 失效 → 改用 d810-ng/Unicorn
```

### Mixed Boolean-Arithmetic (MBA) Identification & Simplification

```python
# Common MBA patterns and their simplified forms:
# (x & y) + (x | y) == x + y
# (x ^ y) + 2*(x & y) == x + y
# (x | y) - (x & ~y) == y
# ~(~x & ~y) == x | y (De Morgan's)
# (x | y) & ~(x & y) == x ^ y

# SiMBA tool for automated simplification:
# pip install simba-simplifier
from simba import simplify_mba
expr = "(a | b) + (a & b) - (~a & b)"
print(simplify_mba(expr))  # → a
```

---

## SIGILL Handler for Execution Mode Switching (Hack.lu 2015)

Binaries may install SIGILL (illegal instruction) handlers to switch between x86 and x86-64 execution modes or implement custom opcode dispatch:

1. **Signal registration:** `signal(SIGILL, handler)` installs a callback for illegal instruction exceptions
2. **Mode switching:** The handler modifies the saved instruction pointer or segment registers to switch between 32-bit and 64-bit code
3. **Custom opcodes:** Invalid x86 instructions trigger the handler, which interprets operand bytes as custom VM opcodes

```c
// Signal handler decodes "illegal" instructions as custom opcodes
void sigill_handler(int sig, siginfo_t *info, void *ucontext) {
    ucontext_t *ctx = (ucontext_t *)ucontext;
    unsigned char *pc = (unsigned char *)ctx->uc_mcontext.gregs[REG_RIP];
    // Decode custom opcode from bytes at PC
    // Advance PC past the custom instruction
    ctx->uc_mcontext.gregs[REG_RIP] += opcode_length;
}
```

**Key insight:** If a binary installs signal handlers for SIGILL/SIGSEGV/SIGTRAP early in execution, suspect custom instruction dispatch. Trace signal deliveries with `strace -e signal` or set GDB to not intercept: `handle SIGILL nostop pass`.

---

## SIGFPE Signal Handler Side-Channel via strace Counting (PlaidCTF 2017)

Binary uses SIGFPE signal handlers for control flow, making static analysis unreliable. Brute-force by counting SIGFPE signals via strace — correct input characters produce more signals.

```bash
# Count SIGFPE signals per input character guess
for c in {a..z} {A..Z} {0..9}; do
    count=$(echo -n "${c}AAAAAAA" | strace -e signal=SIGFPE ./binary 2>&1 | grep -c SIGFPE)
    echo "$c: $count"
done
# Character producing the most SIGFPEs is correct
# Repeat for each position, extending the known prefix
```

**Key insight:** Signal handlers (SIGFPE, SIGSEGV, SIGILL) create implicit control flow invisible to static analysis. The number of signals raised correlates with validation progress. Counting signals via `strace -e signal=SIGFPE` turns opaque signal-based validation into a measurable side-channel for character-by-character brute-force.

---

## Instruction Trace Inversion with Keystone and Unicorn (MeePwn CTF 2017)

UPX-packed binary applies a sequence of arithmetic-only transforms (sub, add, xor, rol, ror) to the flag. No memory side-effects — purely register arithmetic. IDAPython traces non-jump instructions, the sequence is then inverted to recover the flag.

**Inversion rules:**
- Reverse the instruction sequence (last instruction first)
- Swap inverse pairs: `add ↔ sub`, `rol ↔ ror`, `xor` is self-inverse

```python
# IDAPython: collect non-jump instructions in the obfuscated routine
import idaapi, idc

def trace_transforms(start_ea, end_ea):
    instructions = []
    ea = start_ea
    while ea < end_ea:
        mnem = idc.print_insn_mnem(ea)
        if mnem not in ('jmp', 'je', 'jne', 'call', 'ret'):
            instructions.append((ea, mnem, idc.print_operands(ea)))
        ea = idc.next_head(ea)
    return instructions

transforms = trace_transforms(0x401000, 0x401200)

# Invert: reverse order, swap add/sub and rol/ror
inverse_map = {'add': 'sub', 'sub': 'add', 'rol': 'ror', 'ror': 'rol', 'xor': 'xor'}
inverted = [(mnem, op) for (_, mnem, op) in reversed(transforms)]
inverted = [(inverse_map.get(m, m), op) for m, op in inverted]
```

```python
# Assemble inverted instructions with Keystone, emulate with Unicorn
from keystone import *
from unicorn import *
from unicorn.x86_const import *

ks = Ks(KS_ARCH_X86, KS_MODE_64)
uc = Uc(UC_ARCH_X86, UC_MODE_64)

asm_src = '\n'.join(f'{mnem} {op}' for mnem, op in inverted)
encoding, _ = ks.asm(asm_src)

CODE_BASE = 0x400000
uc.mem_map(CODE_BASE, 0x10000)
uc.mem_write(CODE_BASE, bytes(encoding))

# Set initial register state to the observed output value
uc.reg_write(UC_X86_REG_RAX, known_output)
uc.emu_start(CODE_BASE, CODE_BASE + len(encoding))
flag_bytes = uc.reg_read(UC_X86_REG_RAX).to_bytes(8, 'little')
```

**PEB anti-debug note:** If the binary reads `PEB.BeingDebugged` and uses it to select between two comparison target values, the traced instructions under IDAPython may use the debug-mode target. Patch `BeingDebugged` to 0 before tracing, or identify both branches and use the non-debug target value.

**Key insight:** Arithmetic-only obfuscation (no memory writes) is fully reversible by tracing, inverting the instruction sequence, and swapping inverse operations. PEB anti-debug can silently change comparison targets — always verify which branch is taken.

**References:** MeePwn CTF 2017

---

### Call-less Function Chaining via Stack Frame Manipulation (THC CTF 2018)

**Pattern:** Binary hides function calls by building a linked list of function pointers on the stack, then modifying saved RBP and return addresses so `leave; ret` instructions chain through the list without any explicit `CALL` instructions. IDA fails to decompile because push/pop are unbalanced and function boundaries cannot be determined.

Each function in the chain:
1. Pushes operands and the next function's address onto the stack
2. Sets saved RBP to point to the next stack frame
3. Sets the return address to the next function
4. `leave` restores RSP from RBP (moving to next frame), `ret` jumps to the next function

```python
# Reversed processing chain (each function applied via leave/ret):
def reverse_processing(byte):
    res = byte | 0x80       # OR 0x80
    res = res ^ 0xCA        # XOR 0xCA
    res = (res + 66) & 0xFF # ADD 66
    res = res ^ 0xCA        # XOR 0xCA (repeated)
    res = (res + 66) & 0xFF
    res = res ^ 0xCA
    res = (res + 66) & 0xFF
    res = res ^ 0xFE        # XOR 0xFE (final)
    return res
# Apply in reverse order, then reverse the character sequence
```

**Key insight:** By manipulating saved RBP to point to the next stack frame and saved RIP to the next function, `leave; ret` chains through functions without any `call` instructions. Disassemblers that track call/ret balance fail to identify function boundaries. Patch each function body individually for IDA to handle them.

**Detection:** Binary with many small code blocks ending in `leave; ret` but no corresponding `call` instructions. Stack contains interleaved function pointers and data. IDA shows "stack frame is too big" or fails to create functions.

**References:** THC CTF 2018

---

## Comprehensive Bypass Strategies

### Universal Bypass Checklist

1. **Identify all anti-analysis checks** — search for: `ptrace`, `IsDebuggerPresent`, `rdtsc`, `cpuid`, `NtQuery`, `GetTickCount`, `CheckRemoteDebuggerPresent`, `/proc/self`, `SIGTRAP`, `alarm`
2. **Static patching** — NOP/patch checks with pwntools or Ghidra before running
3. **LD_PRELOAD** (Linux) — hook libc functions returning fake values
4. **ScyllaHide** (Windows x64dbg) — patches PEB, hooks NT functions automatically
5. **Emulation** (Unicorn/Qiling) — no debugger artifacts to detect
6. **Kernel-level bypass** — modify `/proc/sys/kernel/yama/ptrace_scope`, use `prctl`

### Layered Anti-Debug (Real-World Pattern)

Many CTF challenges stack multiple checks:
```text
1. TLS callback → IsDebuggerPresent (before main)
2. main() → ptrace(TRACEME)
3. Watchdog thread → timing check + /proc scan
4. Code section → self-CRC32 integrity
5. Signal handler → real logic in SIGSEGV handler
```

**Approach:** Identify ALL checks before patching. Patch or hook each one systematically. Run under emulator if too many to patch individually.

### Quick Reference: Check to Bypass

| Anti-Debug Check | Platform | Bypass |
|---|---|---|
| `ptrace(TRACEME)` | Linux | `LD_PRELOAD`, patch to `ret 0`, `catch syscall` |
| `IsDebuggerPresent` | Windows | ScyllaHide, Frida hook, PEB patch |
| `NtQueryInformationProcess` | Windows | ScyllaHide, hook ntdll |
| `rdtsc` timing | Both | NOP rdtsc, Frida time hook, Pin |
| `/proc/self/status` | Linux | Mount namespace, hook fopen |
| `alarm(N)` | Linux | `handle SIGALRM ignore` in GDB |
| `SIGTRAP` handler | Linux | `handle SIGTRAP nostop pass` |
| `SIGFPE` handler side-channel | Linux | `strace -e signal=SIGFPE` count per input |
| TLS callback | Windows | Break on TLS in x64dbg, patch |
| DR register scan | Windows | Use software BPs, hook GetThreadContext |
| INT3 scan / CRC | Both | Hardware BPs, patch CRC comparison |
| Frida detection | Both | Early-load gadget, hook strstr |
| CPUID hypervisor | Both | Patch CPUID result, bare metal |
| Thread hiding | Windows | Hook NtSetInformationThread |


---

## Agent 响应菜谱 A–T（Issue #65）

> 检测类长文仍见 `malware-analysis/references/anti-analysis-techniques.md`；OLLVM 长流程见 `references/ollvm-deobfuscation.md`。  
> 本节是 **触发 → 动作 → Evidence** 短菜谱，供 agent 在 Dynamic/Static 旁路选用。  
> **授权隔离 lab 默认**；静态 patch / 改 PEB / 改返回值不是未授权目标上的默认动作。

### 使用规则

1. 先 **识别并记录** 检测点（地址/API/字符串），再决定绕过或换环境。  
2. 绕过尝试（成功或失败）MUST 写 Evidence；禁止把反调试退出写成「样本无害」。  
3. H/S 不在此展开长文 → 跳转 OLLVM 专章。  
4. L 仅 Linux/ELF 强制；Windows PE 主路径不因缺 TracerPid 判失败。  
5. E 的 VT 对照为 **可选**；无外部情报源时写 n/a，不编造首次提交时间。

### 全表 A–T

| ID | 触发 | 处理动作 | Evidence | 优先级 |
|----|------|----------|----------|--------|
| **A** | `cpuid` 后条件跳（jz/jnz） | 识别 hypervisor 检测；lab 改标志位或 patch 跳转走恶意/真实业务分支；或换物理机 | `E-anti-debug-cpuid` | P0 |
| **B** | `rdtsc` + sub/cmp 时间差 | bp `rdtsc` / hook 时间 API；或 patch 比较；避免只靠「等沙箱超时」 | `E-anti-debug-rdtsc` | P0 |
| **C** | 字符串含 x64dbg/olly/windbg 等，或 Toolhelp 枚举 | bp `CreateToolhelp32Snapshot`→`Process32First/Next`；改匹配或跳过扫描分支 | `E-anti-debug-procscan` | P1 |
| **D** | `AddVectoredExceptionHandler` + 故意访问违例 | bp 注册点；定位 VEH handler 分析；调试器可忽略特定异常 | `E-anti-debug-veh` | P1 |
| **E** | TimeDateStamp 未来/0/荒谬；版本信息像合法厂商 | 与发现时间对照；**可选** VT 首次提交；`SigCheck` 看版本资源是否配合签名；无 VT → n/a | `E-meta-timestamp` | P2 |
| **F** | 显示有数字签名但来源可疑 | `SigCheck`：链有效？吊销？签名时间 vs 编译时间；**无效/吊销不得降低**威胁等级 | `E-sig-forge` | P0 |
| **G** | 多 PE 头、重叠节、节名伪装 | CFF/PE-bear/LoadPE 看真实映射与 EP 节；熵区分加密 vs 代码；不信节名 | `E-pe-anomaly` | P1 |
| **H** | F5 大量 `while(1)+switch`、星形 CFG | **See** `ollvm-deobfuscation.md`（d810/deflat 等）；插件不全则动态记录块序重构 | `E-cff` | P1 指针 |
| **I** | strings 无域名/IP 但有网/文件行为 | 找 Base64/XOR/自定义 decode；xref 解密函数；解密后 dump 回注 IDA | `E-string-decrypt` | P0 |
| **J** | 文件大小 ≫ 节原始数据之和（Overlay） | 提 overlay；`file`/熵；IDA 搜偏移引用；加密则动态抓密钥 | `E-overlay` | P1 |
| **K** | `fs:[0x30]`/`gs:[0x60]` → BeingDebugged / NtGlobalFlag | 改 PEB 标志或 ScyllaHide；或 patch 条件跳 | `E-anti-debug-peb` | P0 |
| **L** | 读 `/proc/self/status` 查 TracerPid≠0 | **Linux/ELF**：hook fopen/read 或 patch；Windows 不强制 | `E-anti-debug-tracerpid` | P2 平台 |
| **M** | `int3`(0xCC) 或读 DR0–DR7 | int3→nop；硬件 BP 检测用 ScyllaHide/软 BP；CRC 自检见补丁 6 | `E-anti-debug-bp` | P1 |
| **N** | IAT 空/极少 + 自写哈希解析 API | bp `GetProcAddress`/`Ldr*`；哈希反查导出表；回注符号；与「干净 IAT」铁律协同 | `E-api-hash` | P0 |
| **O** | 线性反汇编大量 db、花指令致错位 | F5/Hex-Rays；动态确认真流；junk nop 后 reanalyze；静还不全以动态为准 | `E-junk-code` | P2 |
| **P** | `NtQueryInformationProcess` class 7/30/31 | ScyllaHide 或 hook 返回；记 InformationClass | `E-anti-debug-ntqip` | P0 |
| **Q** | `.rsrc` 过大/高熵/非标准 RT_RCDATA | Resource Hacker/CFF 提取；`FindResource`/`LoadResource` xref；解密后 dump | `E-rsrc-payload` | P1 |
| **R** | 静态 IAT 无某 DLL，运行时才用 | 查 Delay Import Table；bp `__delayLoadHelper2` 或首次调用；纳入能力评估 | `E-delay-import` | P1 |
| **S** | 恒真/恒假条件、大片死代码 | **See** ollvm / angr 等；patch 唯一可达分支或动态路径回注 | `E-opaque-pred` | P1 指针 |
| **T** | ASCII strings 无结果，数据区像 UTF-16 | `strings -el` 或 `-encoding=utf-16le`；IDA Alt+A unicode；纳入 IOC | `E-wide-strings` | P0 |

### 与主 workflow 的挂接

| 阶段 | 菜谱 |
|------|------|
| Triage | E, F, G, T（元数据/签名/节/宽串） |
| Static | H, I, J, N 线索, O, Q, R, S |
| Dynamic | A–D, K, L, M, N, P + 既有断点四级火箭与无行为应急 |
| 失败 | 任何绕不过的检测 → Evidence + 换工具/环境；不静默降威胁 |

### 工具注记（非强制安装清单）

- Windows 用户态：x64dbg + **ScyllaHide**（PEB/NtQuery/硬件 BP 等批量隐藏）  
- 签名：Sysinternals **SigCheck**  
- PE 结构：PE-bear / CFF Explorer  
- 平坦化：见 ollvm 专章工具表（d810-ng 等）  
- 无某工具时：等价命令 + 记失败，禁止假装已验证签名/已脱平坦化