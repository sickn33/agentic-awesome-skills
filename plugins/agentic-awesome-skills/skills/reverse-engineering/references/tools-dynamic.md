# CTF Reverse - Dynamic Analysis Tools

## Table of Contents
- [Frida (Dynamic Instrumentation)](#frida-dynamic-instrumentation)
  - [Installation](#installation)
  - [Basic Function Hooking](#basic-function-hooking)
  - [Anti-Debug Bypass](#anti-debug-bypass)
  - [Memory Scanning and Patching](#memory-scanning-and-patching)
  - [Function Replacement](#function-replacement)
  - [Tracing and Stalker](#tracing-and-stalker)
  - [r2frida (Radare2 + Frida Integration)](#r2frida-radare2--frida-integration)
  - [Frida for Android/iOS](#frida-for-androidios)
  - [Frida Memoization for Recursive Function Speedup (hxp CTF 2017)](#frida-memoization-for-recursive-function-speedup-hxp-ctf-2017)
- [angr (Symbolic Execution)](#angr-symbolic-execution)
  - [angr Installation](#angr-installation)
  - [Basic Path Exploration](#basic-path-exploration)
  - [Symbolic Input with Constraints](#symbolic-input-with-constraints)
  - [Hook Functions to Simplify Analysis](#hook-functions-to-simplify-analysis)
  - [Exploring from Specific Address](#exploring-from-specific-address)
  - [Common Patterns and Tips](#common-patterns-and-tips)
  - [Dealing with Path Explosion](#dealing-with-path-explosion)
  - [angr CFG Recovery](#angr-cfg-recovery)
- [lldb (LLVM Debugger)](#lldb-llvm-debugger)
  - [Basic Commands](#basic-commands)
  - [Scripting (Python)](#scripting-python)
- [x64dbg (Windows Debugger)](#x64dbg-windows-debugger)
  - [Key Features](#key-features)
  - [Scripting](#scripting)
  - [Common CTF Workflow](#common-ctf-workflow)
- [Qiling Framework (Cross-Platform Emulation)](#qiling-framework-cross-platform-emulation)
  - [Qiling Installation](#qiling-installation)
  - [Basic Usage](#basic-usage)
  - [Anti-Debug Bypass via Emulation](#anti-debug-bypass-via-emulation)
  - [Input Fuzzing with Qiling](#input-fuzzing-with-qiling)
- [Triton (Dynamic Symbolic Execution)](#triton-dynamic-symbolic-execution)
- [Intel Pin Instruction-Counting Side Channel (Hackover CTF 2015)](#intel-pin-instruction-counting-side-channel-hackover-ctf-2015)
- [Intel Pin Instruction Counting with Genetic Algorithm (hxp CTF 2017)](#intel-pin-instruction-counting-with-genetic-algorithm-hxp-ctf-2017)
- [Opcode-Only Trace Reconstruction (0CTF 2016)](#opcode-only-trace-reconstruction-0ctf-2016)
- [LD_PRELOAD time() Freeze for Deterministic Analysis (EKOPARTY 2017)](#ld_preload-time-freeze-for-deterministic-analysis-ekoparty-2017)
- [LD_PRELOAD memcmp Side-Channel for Byte-by-Byte Bruteforce (Blaze CTF 2018)](#ld_preload-memcmp-side-channel-for-byte-by-byte-bruteforce-blaze-ctf-2018)

---

## Frida (Dynamic Instrumentation)

Frida injects JavaScript into running processes for real-time hooking, tracing, and modification. Essential for anti-debug bypass, runtime inspection, and mobile RE.

### Installation

```bash
pip install frida-tools frida
# Verify
frida --version
```

### Basic Function Hooking

```javascript
// hook.js — intercept a function and log arguments/return value
Interceptor.attach(Module.findExportByName(null, "strcmp"), {
    onEnter: function(args) {
        this.arg0 = Memory.readUtf8String(args[0]);
        this.arg1 = Memory.readUtf8String(args[1]);
        console.log(`strcmp("${this.arg0}", "${this.arg1}")`);
    },
    onLeave: function(retval) {
        console.log(`  → ${retval}`);
    }
});
```

```bash
# Attach to running process
frida -p $(pidof binary) -l hook.js

# Spawn and instrument from start
frida -f ./binary -l hook.js --no-pause

# One-liner: hook strcmp and dump comparisons
frida -f ./binary --no-pause -e '
Interceptor.attach(Module.findExportByName(null, "strcmp"), {
    onEnter(args) {
        console.log("strcmp:", Memory.readUtf8String(args[0]), Memory.readUtf8String(args[1]));
    }
});
'
```

### Anti-Debug Bypass

```javascript
// Bypass ptrace(PTRACE_TRACEME) — returns 0 (success) without calling
Interceptor.attach(Module.findExportByName(null, "ptrace"), {
    onEnter: function(args) {
        this.request = args[0].toInt32();
    },
    onLeave: function(retval) {
        if (this.request === 0) { // PTRACE_TRACEME
            retval.replace(ptr(0));
            console.log("[*] ptrace(TRACEME) bypassed");
        }
    }
});

// Bypass IsDebuggerPresent (Windows)
var isDbg = Module.findExportByName("kernel32.dll", "IsDebuggerPresent");
Interceptor.attach(isDbg, {
    onLeave: function(retval) {
        retval.replace(ptr(0));
    }
});

// Bypass timing checks — hook clock_gettime to return constant
Interceptor.attach(Module.findExportByName(null, "clock_gettime"), {
    onLeave: function(retval) {
        // Force constant timestamp to defeat timing checks
        var ts = this.context.rsi || this.context.x1; // x86 or ARM
        Memory.writeU64(ts, 0);        // tv_sec
        Memory.writeU64(ts.add(8), 0); // tv_nsec
    }
});
```

### Memory Scanning and Patching

```javascript
// Scan for flag pattern in memory
Process.enumerateRanges('r--').forEach(function(range) {
    Memory.scan(range.base, range.size, "66 6c 61 67 7b", { // "flag{"
        onMatch: function(address, size) {
            console.log("[FLAG] Found at:", address, Memory.readUtf8String(address, 64));
        },
        onComplete: function() {}
    });
});

// Patch instruction (NOP out a check)
var addr = Module.findBaseAddress("binary").add(0x1234);
Memory.patchCode(addr, 2, function(code) {
    var writer = new X86Writer(code, { pc: addr });
    writer.putNop();
    writer.putNop();
    writer.flush();
});
```

### Function Replacement

```javascript
// Replace a validation function to always return true
var checkFlag = Module.findExportByName(null, "check_flag");
Interceptor.replace(checkFlag, new NativeCallback(function(input) {
    console.log("[*] check_flag called with:", Memory.readUtf8String(input));
    return 1; // always valid
}, 'int', ['pointer']));
```

### Tracing and Stalker

```javascript
// Trace all calls in a function (Stalker — instruction-level tracing)
var targetAddr = Module.findExportByName(null, "main");
Stalker.follow(Process.getCurrentThreadId(), {
    transform: function(iterator) {
        var instruction;
        while ((instruction = iterator.next()) !== null) {
            if (instruction.mnemonic === "call") {
                iterator.putCallout(function(context) {
                    console.log("CALL at", context.pc, "→", ptr(context.pc).readPointer());
                });
            }
            iterator.keep();
        }
    }
});
```

### r2frida (Radare2 + Frida Integration)

```bash
# Attach radare2 to process via Frida
r2 frida://spawn/./binary

# r2frida commands
\ii                    # List imports
\il                    # List loaded modules
\dt strcmp             # Trace strcmp calls
\dc                    # Continue execution
\dm                    # List memory maps
```

### Frida for Android/iOS

```bash
# Android (requires rooted device or Frida server)
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server && /data/local/tmp/frida-server &"

# Hook Android Java methods
frida -U -f com.example.app -l hook_android.js --no-pause
```

```javascript
// hook_android.js — hook Java method
Java.perform(function() {
    var MainActivity = Java.use("com.example.app.MainActivity");
    MainActivity.checkPassword.implementation = function(input) {
        console.log("[*] checkPassword called with:", input);
        var result = this.checkPassword(input);
        console.log("[*] Result:", result);
        return result;
    };
});
```

**Key insight:** Frida excels where static analysis fails — obfuscated code, packed binaries, and runtime-generated data. Hook comparison functions (`strcmp`, `memcmp`, custom validators) to extract expected values without reversing the algorithm. Use `Interceptor.attach` for observation, `Interceptor.replace` for modification.

**When to use:** Anti-debugging bypass, extracting runtime-computed keys, hooking crypto functions to dump plaintext, mobile app analysis, packed binary inspection.

### Frida Memoization for Recursive Function Speedup (hxp CTF 2017)

Hook a recursive function with Frida, memoize results, and replay cached values to skip redundant computation. Fibonacci-like recursive challenges with exponential complexity become instant with memoization.

```javascript
// memo_hook.js — memoize a recursive function to skip redundant calls
var memo = {};
var funcAddr = ptr("0x400abc");    // Address of the recursive function
var retAddr = ptr("0x400def");     // Address of the function's ret instruction

Interceptor.attach(funcAddr, {
    onEnter: function(args) {
        this.key = args[0].toInt32();
        if (memo[this.key] !== undefined) {
            // Skip computation entirely: set return value and jump to ret
            this.context.rax = memo[this.key];
            this.context.rip = retAddr;
        }
    },
    onLeave: function(retval) {
        // Cache the result for future calls with the same argument
        memo[this.key] = retval.toInt32();
    }
});
```

```bash
# Usage
frida -f ./binary -l memo_hook.js --no-pause
```

For multi-argument functions, build a composite key:
```javascript
Interceptor.attach(funcAddr, {
    onEnter: function(args) {
        this.key = args[0].toInt32() + "," + args[1].toInt32();
        if (memo[this.key] !== undefined) {
            this.context.rax = memo[this.key];
            this.context.rip = retAddr;
        }
    },
    onLeave: function(retval) {
        memo[this.key] = retval.toInt32();
    }
});
```

**Key insight:** Frida's `Interceptor` can both read and modify register state, allowing you to skip function execution entirely by setting `rax` (return value) and `rip` (to the `ret` instruction). This works on any recursive function where the same arguments produce the same result. Exponential-time recursive computations (Fibonacci, Ackermann, tree traversals) become linear with memoization.

**References:** hxp CTF 2017

---

## angr (Symbolic Execution)

angr automatically explores program paths to find inputs satisfying constraints. Solves many flag-checking binaries in minutes that take hours manually.

### angr Installation

```bash
pip install angr
```

### Basic Path Exploration

```python
import angr
import claripy

# Load binary
proj = angr.Project('./binary', auto_load_libs=False)

# Find address of "Correct!" print, avoid "Wrong!" print
# Get these from disassembly (objdump -d or Ghidra)
FIND_ADDR = 0x401234    # Address of success path
AVOID_ADDR = 0x401256   # Address of failure path

# Create simulation manager and explore
simgr = proj.factory.simgr()
simgr.explore(find=FIND_ADDR, avoid=AVOID_ADDR)

if simgr.found:
    found = simgr.found[0]
    # Get stdin that reaches the target
    print("Flag:", found.posix.dumps(0))  # fd 0 = stdin
```

### Symbolic Input with Constraints

```python
import angr
import claripy

proj = angr.Project('./binary', auto_load_libs=False)

# Create symbolic input (e.g., 32-byte flag)
flag_len = 32
flag_chars = [claripy.BVS(f'flag_{i}', 8) for i in range(flag_len)]
flag = claripy.Concat(*flag_chars + [claripy.BVV(b'\n')])

# Constrain to printable ASCII
state = proj.factory.entry_state(stdin=flag)
for c in flag_chars:
    state.solver.add(c >= 0x20)
    state.solver.add(c <= 0x7e)

# Constrain known prefix: "flag{"
state.solver.add(flag_chars[0] == ord('f'))
state.solver.add(flag_chars[1] == ord('l'))
state.solver.add(flag_chars[2] == ord('a'))
state.solver.add(flag_chars[3] == ord('g'))
state.solver.add(flag_chars[4] == ord('{'))
state.solver.add(flag_chars[flag_len-1] == ord('}'))

simgr = proj.factory.simgr(state)
simgr.explore(find=0x401234, avoid=0x401256)

if simgr.found:
    found = simgr.found[0]
    result = found.solver.eval(flag, cast_to=bytes)
    print("Flag:", result.decode())
```

### Hook Functions to Simplify Analysis

```python
import angr

proj = angr.Project('./binary', auto_load_libs=False)

# Hook printf to avoid path explosion in I/O
@proj.hook(0x401100, length=5)  # Address of call to printf
def skip_printf(state):
    pass  # Do nothing, just skip

# Hook sleep/anti-debug functions
@proj.hook(0x401050, length=5)  # Address of call to sleep
def skip_sleep(state):
    pass

# Replace a function with a summary
class AlwaysSucceed(angr.SimProcedure):
    def run(self):
        return 1

proj.hook_symbol('check_license', AlwaysSucceed())
```

### Exploring from Specific Address

```python
# Start from middle of function (skip initialization)
state = proj.factory.blank_state(addr=0x401200)

# Set up registers/memory manually
state.regs.rdi = 0x600000  # Pointer to input buffer
state.memory.store(0x600000, b"AAAA" + b"\x00" * 28)

simgr = proj.factory.simgr(state)
simgr.explore(find=0x401300, avoid=0x401350)
```

### Common Patterns and Tips

```python
# Pattern 1: argv-based input
state = proj.factory.entry_state(args=['./binary', flag_sym])

# Pattern 2: Multiple find/avoid addresses
simgr.explore(
    find=[0x401234, 0x401300],     # Any success path
    avoid=[0x401256, 0x401400]     # All failure paths
)

# Pattern 3: Find by output string (no address needed)
def is_successful(state):
    stdout = state.posix.dumps(1)  # fd 1 = stdout
    return b"Correct" in stdout

def should_avoid(state):
    stdout = state.posix.dumps(1)
    return b"Wrong" in stdout

simgr.explore(find=is_successful, avoid=should_avoid)

# Pattern 4: Timeout protection
simgr.explore(find=0x401234, avoid=0x401256, num_find=1)
# Or use exploration techniques:
simgr.use_technique(angr.exploration_techniques.DFS())  # Depth-first
simgr.use_technique(angr.exploration_techniques.LengthLimiter(max_length=500))
```

### Dealing with Path Explosion

```python
# Use DFS instead of BFS (default) for flag checkers
simgr.use_technique(angr.exploration_techniques.DFS())

# Limit symbolic memory operations
state.options.add(angr.options.ZERO_FILL_UNCONSTRAINED_MEMORY)
state.options.add(angr.options.ZERO_FILL_UNCONSTRAINED_REGISTERS)

# Hook expensive functions (crypto, hashing) to avoid explosion
import hashlib
class SHA256Hook(angr.SimProcedure):
    def run(self, data, length, output):
        # Concretize input and compute hash
        concrete_data = self.state.solver.eval(
            self.state.memory.load(data, self.state.solver.eval(length)),
            cast_to=bytes
        )
        h = hashlib.sha256(concrete_data).digest()
        self.state.memory.store(output, h)

proj.hook_symbol('SHA256', SHA256Hook())
```

### angr CFG Recovery

```python
# Control flow graph for understanding structure
cfg = proj.analyses.CFGFast()
print(f"Functions found: {len(cfg.functions)}")

# Find main
for addr, func in cfg.functions.items():
    if func.name == 'main':
        print(f"main at {addr:#x}")
        break

# Cross-references
node = cfg.model.get_any_node(0x401234)
print("Predecessors:", [hex(p.addr) for p in cfg.model.get_predecessors(node)])
```

**Key insight:** angr works best on flag-checker binaries with clear success/failure paths. For complex binaries, hook expensive functions (crypto, I/O) and use DFS exploration. Start with the simplest approach (just find/avoid addresses) before adding constraints. If angr is slow, constrain input to printable ASCII and add known prefix.

**When to use:** Flag validators with branching logic, maze/path-finding binaries, constraint-heavy checks, automated binary analysis. Less effective for: heavy crypto, floating-point math, complex heap operations.

---

## lldb (LLVM Debugger)

Primary debugger for macOS/iOS. Also works on Linux. Preferred for Swift/Objective-C and Apple platform binaries.

### Basic Commands

```bash
lldb ./binary
(lldb) run                          # Run program
(lldb) b main                       # Breakpoint on main
(lldb) b 0x401234                   # Breakpoint at address
(lldb) breakpoint set -r "check.*"  # Regex breakpoint
(lldb) c                            # Continue
(lldb) si                           # Step instruction
(lldb) ni                           # Next instruction
(lldb) register read                # Show all registers
(lldb) register write rax 0         # Modify register
(lldb) memory read 0x401000 -c 32   # Read 32 bytes
(lldb) x/s $rsi                     # Examine string (GDB-style)
(lldb) dis -n main                  # Disassemble function
(lldb) image list                   # Loaded modules + base addresses
```

### Scripting (Python)

```python
# lldb Python scripting
import lldb

def hook_strcmp(debugger, command, result, internal_dict):
    target = debugger.GetSelectedTarget()
    process = target.GetProcess()
    thread = process.GetSelectedThread()
    frame = thread.GetSelectedFrame()
    arg0 = frame.FindRegister("rdi").GetValueAsUnsigned()
    arg1 = frame.FindRegister("rsi").GetValueAsUnsigned()
    s0 = process.ReadCStringFromMemory(arg0, 256, lldb.SBError())
    s1 = process.ReadCStringFromMemory(arg1, 256, lldb.SBError())
    print(f'strcmp("{s0}", "{s1}")')

# Register in lldb: command script add -f script.hook_strcmp hook_strcmp
```

**Key insight:** Use lldb for macOS binaries (Mach-O), iOS apps, and when GDB isn't available. `image list` gives ASLR slide for PIE binaries. Scripting API is more structured than GDB's.

---

## x64dbg (Windows Debugger)

Open-source Windows debugger with modern UI. Alternative to OllyDbg/WinDbg for Windows RE challenges.

### Key Features

```bash
# Launch
x64dbg.exe binary.exe         # 64-bit
x32dbg.exe binary.exe         # 32-bit

# Essential shortcuts
F2      → Toggle breakpoint
F7      → Step into
F8      → Step over
F9      → Run
Ctrl+G  → Go to address
Ctrl+F  → Find pattern in memory
```

### Scripting

```bash
# x64dbg command line
bp 0x401234                    # Breakpoint
SetBPX 0x401234, 0, "log {s:utf8@[esp+4]}"  # Log string arg on hit
run                            # Continue
StepOver                       # Step over
```

### Common CTF Workflow

1. Set breakpoint on `GetWindowTextA`/`MessageBoxA` for GUI crackers
2. Trace back from success/failure message
3. Use **Scylla** plugin for IAT reconstruction on packed binaries
4. **Snowman** decompiler plugin for quick pseudo-C

**Key insight:** x64dbg has built-in pattern scanning, hardware breakpoints, and conditional logging. For Windows CTF binaries, it's often faster than IDA/Ghidra for dynamic analysis. Use the **xAnalyzer** plugin for automatic function argument annotation.

---

## Qiling Framework (Cross-Platform Emulation)

Qiling emulates binaries with OS-level support (syscalls, filesystem, registry). Built on Unicorn but adds the OS layer that Unicorn lacks.

### Qiling Installation

```bash
pip install qiling
# Download rootfs for target OS:
git clone https://github.com/qilingframework/rootfs
```

### Basic Usage

```python
from qiling import Qiling
from qiling.const import QL_VERBOSE

# Linux ELF emulation
ql = Qiling(["./binary", "arg1"], "rootfs/x8664_linux",
            verbose=QL_VERBOSE.DEFAULT)
ql.run()

# Windows PE emulation (no Windows needed!)
ql = Qiling(["rootfs/x86_windows/bin/binary.exe"], "rootfs/x86_windows")
ql.run()

# ARM/MIPS emulation (IoT firmware)
ql = Qiling(["rootfs/arm_linux/bin/binary"], "rootfs/arm_linux")
ql.run()
```

### Anti-Debug Bypass via Emulation

```python
from qiling import Qiling

ql = Qiling(["./binary"], "rootfs/x8664_linux")

# Hook ptrace syscall — return 0 (success)
def hook_ptrace(ql, ptrace_request, pid, addr, data):
    ql.log.info("ptrace bypassed")
    return 0

ql.os.set_syscall("ptrace", hook_ptrace)

# Hook specific address (e.g., anti-VM check)
def skip_check(ql):
    ql.arch.regs.rax = 0  # Force success
    ql.log.info(f"Skipped check at {ql.arch.regs.rip:#x}")

ql.hook_address(skip_check, 0x401234)

ql.run()
```

### Input Fuzzing with Qiling

```python
# Emulate binary with different inputs to find flag
import string
from qiling import Qiling

def test_input(candidate):
    ql = Qiling(["./binary"], "rootfs/x8664_linux",
                verbose=QL_VERBOSE.DISABLED, stdin=candidate.encode())
    ql.run()
    return ql.os.stdout.read()

for ch in string.printable:
    output = test_input("flag{" + ch)
    if b"Correct" in output:
        print(f"Found: {ch}")
```

**Advantages over GDB/Frida:**
- No debugger artifacts (bypasses all anti-debug by default)
- Cross-platform without hardware (ARM, MIPS, RISC-V on x86 host)
- Scriptable with Python (faster iteration than GDB)
- Snapshot/restore for brute-forcing

**Key insight:** Qiling emulates the entire OS layer (syscalls, filesystem, registry), not just the CPU. This means anti-debug checks like `ptrace(TRACEME)` naturally return success without patching, and you can analyze ARM/MIPS binaries on an x86 host without QEMU or real hardware.

**When to use:** Foreign architecture binaries, IoT firmware, heavy anti-debug, automated testing of many inputs.

---

## Triton (Dynamic Symbolic Execution)

See [tools-advanced.md](tools-advanced.md#triton-dynamic-symbolic-execution) for full Triton reference. Quick usage:

```python
from triton import *

ctx = TritonContext(ARCH.X86_64)

# Symbolize input buffer
for i in range(32):
    ctx.symbolizeMemory(MemoryAccess(0x600000 + i, CPUSIZE.BYTE), f"flag_{i}")

# Process instructions and collect constraints
# At comparison point, solve for flag
model = ctx.getModel(ctx.getPathConstraintsAst())
flag = ''.join(chr(v.getValue()) for _, v in sorted(model.items()))
```

**Key insight:** Triton excels at single-path DSE (Dynamic Symbolic Execution) where angr's path explosion is a problem. Feed it a concrete execution trace, symbolize specific inputs, and solve for constraints at comparison points. Faster than angr for linear code paths with known execution flow.

**Best for:** Single-path symbolic execution, deobfuscation, taint analysis. Faster than angr for linear code paths.

---

## Intel Pin Instruction-Counting Side Channel (Hackover CTF 2015)

**Pattern:** Brute-force input character-by-character against a binary using Intel Pin's `inscount0` tool. Each correct character causes deeper execution (more instructions) in the comparison logic.

```python
import string
from subprocess import Popen, PIPE

pin = './pin'
tool = './source/tools/ManualExamples/obj-ia32/inscount0.so'
binary = './target'

key = ''
while True:
    best_count, best_char = 0, ''
    for c in string.printable:
        cmd = [pin, '-injection', 'child', '-t', tool, '--', binary]
        p = Popen(cmd, stdout=PIPE, stdin=PIPE, stderr=PIPE)
        p.communicate((key + c + '\n').encode())
        with open('inscount.out') as f:
            count = int(f.read().split()[-1])
        if count > best_count:
            best_count, best_char = count, c
    key += best_char
    print(f"Found: {key}")
```

**Key insight:** Movfuscated binaries (compiled with `movfuscator`) expand every instruction into sequences of `mov` operations, making static analysis impractical. However, character-by-character comparison still creates measurable instruction count differences. Pin's `inscount0.so` counts total executed instructions — the correct character at each position causes ~1000+ more instructions (proceeding further in the comparison). Also works for obfuscated binaries with sequential input checks.

---

### Intel Pin Instruction Counting with Genetic Algorithm (hxp CTF 2017)

For self-modifying code that decrypts the next chunk only after each character check passes, standard character-by-character Pin counting fails because the search space is too large and characters may interact. Use a genetic algorithm instead to explore the input space more efficiently.

```python
import subprocess
import random
import string

PIN_PATH = '/tmp/pin-3.5/pin'
TOOL_PATH = 'source/tools/ManualExamples/obj-intel64/inscount0.so'

def fitness(candidate):
    """Run binary under Pin and return instruction count as fitness."""
    proc = subprocess.Popen(
        [PIN_PATH, '-t', TOOL_PATH, '--', './binary'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stdout, stderr = proc.communicate(candidate.encode())
    # inscount0 writes count to stderr or inscount.out
    try:
        with open('inscount.out') as f:
            return int(f.read().split()[-1])
    except:
        return 0

def mutate(individual, rate=0.1):
    """Randomly mutate characters in the individual."""
    result = list(individual)
    for i in range(len(result)):
        if random.random() < rate:
            result[i] = random.choice(string.printable[:62])
    return result

# Genetic algorithm parameters
FLAG_LEN = 40
POP_SIZE = 100
SURVIVORS = 20

# Initialize random population
population = [random.choices(string.printable[:62], k=FLAG_LEN) for _ in range(POP_SIZE)]

for generation in range(10000):
    # Score each individual by instruction count
    scored = [(fitness(''.join(p)), p) for p in population]
    scored.sort(reverse=True)
    best_score, best_individual = scored[0]
    print(f"Gen {generation}: {best_score} {''.join(best_individual)}")

    # Keep top survivors, mutate to refill population
    survivors = [s[1] for s in scored[:SURVIVORS]]
    population = survivors + [mutate(random.choice(survivors)) for _ in range(POP_SIZE - SURVIVORS)]
```

**Modified Pin for Go binaries (table-lookup flag checking):**
When standard `inscount` fails because counter increments don't correlate with correctness (e.g., table-lookup comparison), modify Pin's icount tool to only count executions at the success-branch address. Brute-force character-by-character with this targeted counter:
```cpp
// Modified inscount0.cpp — count only executions of a specific address
static ADDRINT target_addr = 0x401234;  // success-branch address
static UINT64 target_count = 0;

VOID CountAtTarget(ADDRINT ip) {
    if (ip == target_addr) target_count++;
}

VOID Instruction(INS ins, VOID *v) {
    INS_InsertCall(ins, IPOINT_BEFORE, (AFUNPTR)CountAtTarget,
                   IARG_INST_PTR, IARG_END);
}
```

**Key insight:** When each correct character unlocks a new code section (self-modifying or multi-stage decryption), instruction count increases monotonically with correctness. A genetic algorithm explores the input space more efficiently than character-by-character brute-force because it can discover multiple correct characters simultaneously. Converges in approximately 30 minutes for 40-character flags. For table-lookup comparisons where total instruction count doesn't correlate, target a specific branch address instead.

**References:** hxp CTF 2017

---

## Opcode-Only Trace Reconstruction (0CTF 2016)

Given an execution trace with only opcodes (no register/memory values), reconstruct the program: sort/dedup trace by address, split into basic blocks, annotate functions. Sorting algorithms are particularly vulnerable -- branch decisions leak element ordering.

**Approach:**
1. Sort trace entries by address, deduplicate to recover code layout
2. Identify basic block boundaries (jumps, calls, returns)
3. Map branch taken/not-taken decisions from trace order
4. For sorting algorithms, partition comparisons reveal relative ordering of all input elements

**Key insight:** Execution traces without data values still leak information through branch decisions. Quicksort partition comparisons reveal which element is greater/lesser at each step, enabling full recovery of the sorted input from branch direction alone.

---

## LD_PRELOAD time() Freeze for Deterministic Analysis (EKOPARTY 2017)

Override `time()` via LD_PRELOAD to return a constant value, freezing any timestamp-seeded PRNG. Once the binary's cipher becomes deterministic, brute-force each output byte without understanding the VM or cipher internals.

```c
// freeze_time.c — compile: gcc -shared -fPIC -o freeze.so freeze_time.c
#include <time.h>

time_t time(time_t *t) {
    if (t) *t = 1234567890;
    return 1234567890;
}
```

```bash
# Build and use:
gcc -shared -fPIC -o freeze.so freeze_time.c
LD_PRELOAD=./freeze.so ./binary

# Byte-at-a-time oracle: run with frozen time, try each candidate byte,
# observe output — correct byte produces expected output character.
for byte in $(seq 0 255); do
    output=$(echo -n "$(printf '\x%02x' $byte)" | LD_PRELOAD=./freeze.so ./binary)
    # Check output against known/expected
done
```

If `srand()` or `rand()` is also involved, override `rand()` too:
```c
int rand(void) { return 42; }
```

**Key insight:** LD_PRELOAD function interception freezes non-determinism sources (time, rand). Once deterministic, even complex VMs become tractable byte-at-a-time oracles.

**References:** EKOPARTY CTF 2017

---

### LD_PRELOAD memcmp Side-Channel for Byte-by-Byte Bruteforce (Blaze CTF 2018)

**Pattern:** Replace `memcmp` with an LD_PRELOAD library that returns the number of matching bytes instead of the standard -1/0/1 result. This converts any memcmp-based validation into a byte-by-byte oracle. Automate with GDB Python scripting to bruteforce each character position.

```c
// memcmp_hook.c - compile: gcc -shared -fPIC -o hook.so memcmp_hook.c
int memcmp(const char *s1, const char *s2, int n) {
    int cnt = 0;
    for (int i = 0; i < n; ++i) {
        if (s1[i] == s2[i]) cnt++;
        else break;
    }
    return cnt;
}
```

```bash
# Use with GDB: LD_PRELOAD=./hook.so gdb ./binary
# Set breakpoint after memcmp, read return value to count matching bytes
# Iterate characters at each position to find the one that increases count
```

**Key insight:** Replacing memcmp via LD_PRELOAD to return match count converts any comparison-based validation into a byte-by-byte oracle. Combined with GDB scripting, this automates bruteforce of password/flag checks without reversing the validation algorithm.

**Detection:** Binary uses `memcmp` or `strcmp` for flag validation (visible in `ltrace` output or import table). The comparison function is called with user input and a computed/stored expected value.

**References:** Blaze CTF 2018
