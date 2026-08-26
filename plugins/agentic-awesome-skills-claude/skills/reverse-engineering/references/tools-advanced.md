# CTF Reverse - Advanced Tools & Deobfuscation

Advanced tooling for commercial packers/protectors, binary diffing, deobfuscation frameworks, emulation, and symbolic execution beyond angr.

## Table of Contents
- [VMProtect Analysis](#vmprotect-analysis)
  - [Recognition](#recognition)
  - [Approach](#approach)
  - [Tools](#tools)
  - [CTF Strategy](#ctf-strategy)
- [Themida / WinLicense Analysis](#themida--winlicense-analysis)
  - [Themida Recognition](#themida-recognition)
  - [Approach for CTF](#approach-for-ctf)
- [Binary Diffing](#binary-diffing)
  - [BinDiff](#bindiff)
  - [Diaphora](#diaphora)
- [Deobfuscation Frameworks](#deobfuscation-frameworks)
  - [D-810 (IDA)](#d-810-ida)
  - [GOOMBA (Ghidra)](#goomba-ghidra)
  - [Miasm](#miasm)
- [Qiling Framework (Emulation)](#qiling-framework-emulation)
- [Triton (Dynamic Symbolic Execution)](#triton-dynamic-symbolic-execution)
- [Manticore (Symbolic Execution)](#manticore-symbolic-execution)
- [Rizin / Cutter](#rizin--cutter)
- [RetDec (Retargetable Decompiler)](#retdec-retargetable-decompiler)
- [Custom VM Bytecode Lifting to LLVM IR (Google CTF 2017)](#custom-vm-bytecode-lifting-to-llvm-ir-google-ctf-2017)
- [Advanced GDB Techniques](#advanced-gdb-techniques)
  - [Python Scripting](#python-scripting)
  - [Brute-Force with GDB Script](#brute-force-with-gdb-script)
  - [Conditional Breakpoints](#conditional-breakpoints)
  - [Watchpoints](#watchpoints)
  - [Reverse Debugging (rr)](#reverse-debugging-rr)
  - [GDB Dashboard / GEF / pwndbg](#gdb-dashboard--gef--pwndbg)
- [Advanced Ghidra Scripting](#advanced-ghidra-scripting)
- [Patching Strategies](#patching-strategies)
  - [Binary Ninja Patching (Python API)](#binary-ninja-patching-python-api)
  - [LIEF (Library for Instrumenting Executable Formats)](#lief-library-for-instrumenting-executable-formats)
- [GDB Constraint Extraction with ILP/LP Solver (BackdoorCTF 2017)](#gdb-constraint-extraction-with-ilplp-solver-backdoorctf-2017)
- [GDB Position-Encoded Input with Zero Flag Monitoring (EKOPARTY 2017)](#gdb-position-encoded-input-with-zero-flag-monitoring-ekoparty-2017)
- [LD_PRELOAD to Dump Execute-Only Binary (BackdoorCTF 2017)](#ld_preload-to-dump-execute-only-binary-backdoorctf-2017)

---

## VMProtect Analysis

VMProtect virtualizes x86/x64 code into custom bytecode interpreted by a generated VM. One of the most challenging protectors in CTF.

### Recognition

```bash
# VMProtect signatures
strings binary | grep -i "vmp\|vmprotect"
# PE sections: .vmp0, .vmp1 (VMProtect adds its own sections)
readelf -S binary | grep ".vmp"
# Large binary with entropy > 7.5 in certain sections
```

**Key indicators:**
- `push` / `pop` heavy prologues (VM entry pushes all registers to stack)
- Large switch-case dispatcher (the VM handler loop)
- Anti-debug checks embedded in VM handlers
- Mutation engine: same opcode has different handlers per build

### Approach

```text
1. Identify VM entry points — look for pushad/pushaq-like sequences
2. Find the handler table — large indirect jump (jmp [reg + offset])
3. Trace handler execution — each handler ends with jump to next
4. Identify handlers:
   - vAdd, vSub, vMul, vXor, vNot (arithmetic)
   - vPush, vPop (stack operations)
   - vLoad, vStore (memory access)
   - vJmp, vJcc (control flow)
   - vRet (VM exit — restores real registers)
5. Build disassembler for VM bytecode
6. Simplify / deobfuscate the lifted IL
```

### Tools

- **VMPAttack** (IDA plugin): Automatically identifies VM handlers
- **NoVmp**: Devirtualization via VTIL (open-source)
- **VMProtect devirtualizer scripts**: Community IDA/Binary Ninja scripts
- **Approach for CTF:** Often easier to trace specific operations (crypto, comparisons) than fully devirtualize

### CTF Strategy

```python
# Trace VM execution dynamically to extract operations on flag
# Hook VM handler dispatch to log opcode + operands

import frida

script = """
var vm_dispatch = ptr('0x...');  // Address of handler table jump
Interceptor.attach(vm_dispatch, {
    onEnter(args) {
        // Log handler index and stack state
        var handler_idx = this.context.rax;  // or whichever register
        console.log('Handler:', handler_idx, 'RSP:', this.context.rsp);
    }
});
"""
```

**Key insight:** Full devirtualization is rarely needed for CTF. Focus on tracing what operations are performed on your input. Hook comparison/crypto functions called from within the VM.

---

## Themida / WinLicense Analysis

Similar to VMProtect but with additional anti-debug layers.

### Themida Recognition
- Sections: `.themida`, `.winlice`
- Extremely heavy anti-debug (kernel-level checks, driver installation)
- Code mutation + virtualization + packing combined

### Approach for CTF
1. **Dump unpacked code:** Let it run, dump process memory after unpacking
2. **Bypass anti-debug:** ScyllaHide in x64dbg with Themida-specific preset
3. **Fix imports:** Use Scylla plugin for IAT reconstruction
4. **Focus on dumped code:** Once unpacked, analyze as normal binary

```bash
# x64dbg workflow for Themida:
1. Load binary
2. Enable ScyllaHide → Profile: Themida
3. Run to OEP (Original Entry Point) — may need several attempts
4. Dump with Scylla: OEP → IAT Autosearch → Get Imports → Dump
5. Fix dump: Scylla → Fix Dump
6. Analyze fixed dump in Ghidra/IDA
```

---

## Binary Diffing

Critical for patch analysis, 1-day exploit development, and CTF challenges that provide two versions of a binary.

### BinDiff

```bash
# Export from IDA/Ghidra first, then diff
# IDA: File → BinExport → Export as BinExport2
# Ghidra: Use BinExport plugin

# Command line diffing
bindiff primary.BinExport secondary.BinExport
# Opens in BinDiff GUI — shows matched/unmatched functions
```

**Key metrics:**
- Similarity score (0.0-1.0) per function pair
- Changed instructions highlighted
- Unmatched functions = new/removed code

### Diaphora

Free, open-source alternative to BinDiff, runs as IDA plugin.

```bash
# In IDA:
# File → Script file → diaphora.py
# Export first binary, then open second and diff

# Ghidra version: diaphora_ghidra.py
```

**Useful for CTF:** When challenge provides "patched" and "original" binaries, diff reveals the vulnerability or hidden functionality.

---

## Deobfuscation Frameworks

> OLLVM 脱密的完整工作流、变种生态和社区工具调研见 [ollvm-deobfuscation.md](references/ollvm-deobfuscation.md)。

### d810-ng (IDA) — 本地首选

D-810 的现代维护版（Next Generation），集成 **Z3 SMT** 求解器，覆盖 OLLVM / Tigress / Hodur(PlugX) / Approov 多种变种。

```text
Capabilities:
- MBA simplification (Z3-verified): (a ^ b) + 2*(a & b) → a + b
- Opaque predicate removal (Pred0/PredFF/PredSetz/PredSetnz)
- Constant folding (22 rules)
- Control flow unflattening (多种 unflattener):
  * Unflattener           → O-LLVM (switch/if-chain)
  * UnflattenerSwitchCase → Tigress (m_jtbl)
  * UnflattenerTigressIndirect → Tigress (m_ijmp)
  * HodurUnflattener      → Hodur/PlugX (while(1) + jnz state)
  * BadWhileLoop          → Approov (0xF6000–0xF6FFF 状态常量)
- Hacker's Delight 位运算等价
- PlugX (Hodur) 恶意软件专用 MBA 模式

Installation: clone → 复制到 IDA plugins 目录 → Ctrl-Shift-D 加载
Source: https://github.com/w00tzenheimer/d810-ng
```

### obpo-plugin (IDA) — 效果最强，云插件

基于 Hex-Rays **microcode** + 数据流跟踪 + 程序切片 + 混合执行（concolic）。社区公认效果最强之一。

```text
- 在 microcode 层优化反编译输出（不是改 ASM）
- 支持 IDA 7.5-7.7 + Hex-Rays，多架构 (ARM/ARM64/x86/x64/PPC/MIPS)
- 云插件：目标函数上传 obpo-server 处理（核心闭源，插件免费）
- ⚠️ 敏感样本慎用（二进制上传云服务）
- 用法：右键 dispatcher → OBPO → Mark and process function
Source: https://github.com/obpo-project/obpo-plugin
```

### ollvm-unflattener — Miasm 纯脚本

无 IDA 依赖，基于 Miasm 符号执行，BFS 多层处理，支持 x86/x64 Win/Linux。

```bash
git clone https://github.com/cdong1012/ollvm-unflattener
pip install -r requirements.txt   # miasm, graphviz, keystone-engine
python unflattener -i <input> -o <output> -t <func_addr> -a   # -a 自动多层
```

### ollvm-breaker (Binary Ninja)

Binary Ninja 去平坦化，仓库自带 Android 加固样本 `libvdog.so` 实战。Source: amimo/ollvm-breaker

### DeObfBR — BR 混淆专项

专门去除 Goron/Arkari 风格的 BR（间接分支）混淆。简易技巧：设置数据段只读可部分对抗。Source: Mrack/DeObfBR

### deollvm — ARM64 Unicorn

无 IDA 时处理 ARM64 .so 的备选，基于 Unicorn。Source: GeT1t/deollvm

### GOOMBA (Ghidra)

```text
GOOMBA (Ghidra-based Obfuscated Object Matching and Bytes Analysis):
- Integrates with Ghidra's P-Code
- Simplifies MBA expressions
- Pattern matching for known obfuscation

Installation: Copy .jar to Ghidra extensions
Usage: Code Browser → Analysis → GOOMBA
```

### Miasm

Powerful reverse engineering framework with symbolic execution and IR lifting.

```python
from miasm.analysis.binary import Container
from miasm.analysis.machine import Machine
from miasm.expression.expression import *

# Load binary and lift to Miasm IR
cont = Container.from_stream(open("binary", "rb"))
machine = Machine(cont.arch)
mdis = machine.dis_engine(cont.bin_stream, loc_db=cont.loc_db)

# Disassemble function
asmcfg = mdis.dis_multiblock(entry_addr)

# Lift to IR
lifter = machine.lifter_model_call(loc_db=cont.loc_db)
ircfg = lifter.new_ircfg_from_asmcfg(asmcfg)

# Symbolic execution
from miasm.ir.symbexec import SymbolicExecutionEngine
sb = SymbolicExecutionEngine(lifter)
# Execute symbolically, then simplify expressions
```

**Use case:** Deobfuscate expression trees, simplify complex arithmetic, trace data flow through obfuscated code.

---

## Qiling Framework (Emulation)

Cross-platform emulation framework built on Unicorn, with OS-level support (syscalls, filesystem, registry).

```python
from qiling import Qiling
from qiling.const import QL_VERBOSE

# Emulate Linux ELF
ql = Qiling(["./binary"], "rootfs/x8664_linux",
            verbose=QL_VERBOSE.DEBUG)

# Hook specific address
@ql.hook_address
def hook_check(ql, address, size):
    if address == 0x401234:
        ql.arch.regs.rax = 0  # Bypass check
        ql.log.info("Anti-debug bypassed")

# Hook syscall
@ql.hook_syscall(name="ptrace")
def hook_ptrace(ql, request, pid, addr, data):
    return 0  # Always succeed

# Hook API (Windows)
@ql.set_api("IsDebuggerPresent", target=ql.os.user_defined_api)
def hook_isdebug(ql, address, params):
    return 0

ql.run()
```

**Advantages over Unicorn:**
- OS emulation (file I/O, network, registry)
- Multi-platform (Linux, Windows, macOS, Android, UEFI)
- Built-in debugger interface
- Rootfs for library loading

**CTF use cases:**
- Emulate binaries for foreign architectures (ARM, MIPS, RISC-V)
- Bypass all anti-debug at once (no debugger artifacts)
- Fuzz embedded/IoT firmware without hardware
- Trace execution without code modification

---

## Triton (Dynamic Symbolic Execution)

Pin-based dynamic binary analysis framework with symbolic execution, taint analysis, and AST simplification.

```python
from triton import *

ctx = TritonContext(ARCH.X86_64)

# Load binary sections
with open("binary", "rb") as f:
    binary = f.read()
ctx.setConcreteMemoryAreaValue(0x400000, binary)

# Symbolize input
for i in range(32):
    ctx.symbolizeMemory(MemoryAccess(INPUT_ADDR + i, CPUSIZE.BYTE), f"input_{i}")

# Emulate instructions
pc = ENTRY_POINT
while pc:
    inst = Instruction(pc, ctx.getConcreteMemoryAreaValue(pc, 16))
    ctx.processing(inst)

    # At comparison point, extract path constraint
    if pc == CMP_ADDR:
        ast = ctx.getPathConstraintsAst()
        model = ctx.getModel(ast)
        for k, v in sorted(model.items()):
            print(f"input[{k}] = {chr(v.getValue())}", end="")
        break

    pc = ctx.getConcreteRegisterValue(ctx.registers.rip)
```

**Triton vs angr:**
| Feature | Triton | angr |
|---|---|---|
| Execution | Concrete + symbolic (DSE) | Fully symbolic |
| Speed | Faster (concrete-driven) | Slower (explores all paths) |
| Path explosion | Less prone (follows one path) | Major issue |
| API | C++ / Python | Python |
| Best for | Single-path deobfuscation, taint tracking | Multi-path exploration |

**Key use:** Triton excels at deobfuscation — run the program concretely, but track symbolic state, then simplify the collected constraints.

---

## Manticore (Symbolic Execution)

Trail of Bits' symbolic execution tool for native binaries. Its API is similar in spirit to angr.

```python
from manticore.native import Manticore

m = Manticore("./binary")

# Hook success/failure
@m.hook(0x401234)
def success(state):
    buf = state.solve_one_n_batched(state.input_symbols, 32)
    print("Flag:", bytes(buf))
    m.kill()

@m.hook(0x401256)
def fail(state):
    state.abandon()

m.run()
```

**Best for:** simpler Linux binaries and embedded targets. angr is generally more mature for complex RE tasks.

---

## Rizin / Cutter

Rizin is the maintained fork of radare2. Cutter is its Qt-based GUI.

```bash
# Rizin CLI (r2-compatible commands)
rizin -d ./binary
> aaa                    # Analyze all
> afl                    # List functions
> pdf @ main             # Print disassembly
> VV                     # Visual graph mode

# Cutter GUI
cutter binary           # Open in GUI with decompiler
```

**Cutter advantages:**
- Built-in Ghidra decompiler (via r2ghidra plugin)
- Graph view, hex editor, debug panel in one GUI
- Integrated Python/JavaScript scripting console
- Free and open source

---

## RetDec (Retargetable Decompiler)

LLVM-based decompiler supporting many architectures. Free and open-source.

```bash
# Install
pip install retdec-decompiler
# Or use web: https://retdec.com/decompilation/

# CLI
retdec-decompiler binary
# Outputs: binary.c (decompiled C), binary.dsm (disassembly)

# Specific function
retdec-decompiler --select-ranges 0x401000-0x401100 binary
```

**Strengths:** Multi-arch support (x86, ARM, MIPS, PowerPC, PIC32), free, produces compilable C. Good for architectures not well-supported by Ghidra.

---

## Custom VM Bytecode Lifting to LLVM IR (Google CTF 2017)

For complex custom VMs, transpile the VM bytecode to LLVM IR and use LLVM's optimization passes to simplify the code, then decompile the optimized IR.

```python
# Pipeline: VM bytecode → custom disassembler → LLVM IR → optimize → decompile
# 1. Write disassembler for the custom VM opcodes
# 2. Emit LLVM IR for each opcode:
#    INC reg  → %reg = add i32 %reg, 1
#    CDEC reg → conditional decrement
#    CALL fn  → call void @fn()
# 3. Use MCJIT or llc to optimize:
#    opt -O3 -S vm_lifted.ll -o vm_optimized.ll
# 4. Load optimized IR in IDA or decompile with RetDec
# Result: 1300 lines → 150 lines after inlining + constant folding
```

**Key insight:** LLVM's optimization passes (inlining, constant folding, dead code elimination) dramatically simplify lifted VM bytecode. A custom VM with 26 registers and 3 opcodes that produces 1300 lines of IL reduces to ~150 lines after `-O3`, revealing the underlying algorithm (e.g., Collatz sequence computation).

---

## Advanced GDB Techniques

### Python Scripting

```python
# ~/.gdbinit or source from GDB
import gdb

class TraceCompare(gdb.Breakpoint):
    """Log all comparison operations."""
    def __init__(self, addr):
        super().__init__(f"*{addr}", gdb.BP_BREAKPOINT)

    def stop(self):
        frame = gdb.selected_frame()
        rdi = int(frame.read_register("rdi"))
        rsi = int(frame.read_register("rsi"))
        rdx = int(frame.read_register("rdx"))
        # Read compared buffers
        inferior = gdb.selected_inferior()
        buf1 = inferior.read_memory(rdi, rdx).tobytes()
        buf2 = inferior.read_memory(rsi, rdx).tobytes()
        print(f"memcmp({buf1!r}, {buf2!r}, {rdx})")
        return False  # Don't stop, just log

# Usage in GDB:
# (gdb) source trace_cmp.py
# (gdb) python TraceCompare(0x401234)
```

### Brute-Force with GDB Script

```python
# Byte-by-byte brute force via GDB Python API
import gdb, string

def bruteforce_flag(check_addr, success_addr, fail_addr, flag_len):
    flag = []
    for pos in range(flag_len):
        for ch in string.printable:
            candidate = ''.join(flag) + ch + 'A' * (flag_len - pos - 1)
            gdb.execute('start', to_string=True)
            gdb.execute(f'b *{check_addr}', to_string=True)
            # Write candidate to stdin pipe
            # ... (setup input)
            gdb.execute('continue', to_string=True)
            rip = int(gdb.parse_and_eval('$rip'))
            if rip == success_addr:
                flag.append(ch)
                break
        gdb.execute('delete breakpoints', to_string=True)
    return ''.join(flag)
```

### Conditional Breakpoints

```bash
# Break only when register has specific value
(gdb) b *0x401234 if $rax == 0x41
(gdb) b *0x401234 if *(char*)$rdi == 'f'

# Break on Nth hit
(gdb) b *0x401234
(gdb) ignore 1 99    # Skip first 99 hits, break on 100th

# Log without stopping
(gdb) b *0x401234
(gdb) commands
> silent
> printf "rax=%lx rdi=%lx\n", $rax, $rdi
> continue
> end
```

### Watchpoints

```bash
# Hardware watchpoint — break when memory changes
(gdb) watch *(int*)0x601050        # Break on write to address
(gdb) rwatch *(int*)0x601050       # Break on read
(gdb) awatch *(int*)0x601050       # Break on read or write

# Watch a variable by name (needs debug symbols)
(gdb) watch flag_buffer[0]

# Conditional watchpoint
(gdb) watch *(int*)0x601050 if *(int*)0x601050 == 0x42
```

### Reverse Debugging (rr)

```bash
# Record execution
rr record ./binary
# Replay with reverse execution support
rr replay

# In rr replay (GDB commands plus):
(gdb) reverse-continue     # Run backward to previous breakpoint
(gdb) reverse-stepi        # Step backward one instruction
(gdb) reverse-next         # Reverse next
(gdb) when                 # Show current event number

# Set checkpoint and return to it
(gdb) checkpoint
(gdb) restart 1           # Return to checkpoint 1
```

**Key use:** When you step past the critical moment, reverse back instead of restarting. Invaluable for anti-debug that corrupts state.

### GDB Dashboard / GEF / pwndbg

```bash
# pwndbg (most popular for CTF)
# https://github.com/pwndbg/pwndbg
git clone https://github.com/pwndbg/pwndbg && cd pwndbg && ./setup.sh

# Key pwndbg commands:
pwndbg> context           # Show registers, stack, code, backtrace
pwndbg> vmmap             # Memory map (like /proc/self/maps)
pwndbg> search -s "flag{" # Search memory for string
pwndbg> telescope $rsp 20 # Smart stack dump
pwndbg> cyclic 200        # Generate De Bruijn pattern
pwndbg> hexdump $rdi 64   # Pretty hex dump
pwndbg> got               # Show GOT entries
pwndbg> plt               # Show PLT entries

# GEF (alternative)
# https://github.com/hugsy/gef
bash -c "$(curl -fsSL https://gef.blah.cat/sh)"

# Key GEF commands:
gef> xinfo $rdi           # Detailed info about address
gef> checksec             # Binary security features
gef> heap chunks          # Heap chunk listing
gef> pattern create 100   # De Bruijn pattern
```

---

## Advanced Ghidra Scripting

```python
# Ghidra Python (Jython) — run via Script Manager or headless

# Batch rename functions matching a pattern
from ghidra.program.model.symbol import SourceType
fm = currentProgram.getFunctionManager()
for func in fm.getFunctions(True):
    if func.getName().startswith("FUN_"):
        # Check if function contains specific instruction pattern
        body = func.getBody()
        inst_iter = currentProgram.getListing().getInstructions(body, True)
        for inst in inst_iter:
            if inst.getMnemonicString() == "CPUID":
                func.setName("anti_vm_check_" + hex(func.getEntryPoint().getOffset()),
                            SourceType.USER_DEFINED)
                break

# Extract all XOR constants from a function
def extract_xor_constants(func):
    """Find all XOR operations and their immediate operands."""
    constants = []
    body = func.getBody()
    inst_iter = currentProgram.getListing().getInstructions(body, True)
    for inst in inst_iter:
        if inst.getMnemonicString() == "XOR":
            for i in range(inst.getNumOperands()):
                op = inst.getOpObjects(i)
                if op and hasattr(op[0], 'getValue'):
                    constants.append(int(op[0].getValue()))
    return constants

# Bulk decompile and search for pattern
from ghidra.app.decompiler import DecompInterface
decomp = DecompInterface()
decomp.openProgram(currentProgram)

for func in fm.getFunctions(True):
    result = decomp.decompileFunction(func, 30, monitor)
    if result.depiledFunction():
        code = result.getDecompiledFunction().getC()
        if "strcmp" in code or "memcmp" in code:
            print(f"Comparison in {func.getName()} at {func.getEntryPoint()}")
```

---

## Patching Strategies

### Binary Ninja Patching (Python API)

```python
import binaryninja as bn

bv = bn.open_view("binary")

# NOP out instruction
bv.write(0x401234, b"\x90" * 5)  # 5-byte NOP

# Patch conditional jump (JNZ → JZ)
bv.write(0x401234, b"\x74")  # 0x75 (JNZ) → 0x74 (JZ)

# Insert always-true (mov eax, 1; ret)
bv.write(0x401234, b"\xb8\x01\x00\x00\x00\xc3")

bv.save("patched")
```

### LIEF (Library for Instrumenting Executable Formats)

```python
import lief

# Parse and modify ELF/PE/Mach-O
binary = lief.parse("binary")

# Add a new section
section = lief.ELF.Section(".patch")
section.content = list(b"\xcc" * 0x100)
section.type = lief.ELF.SECTION_TYPES.PROGBITS
section.flags = lief.ELF.SECTION_FLAGS.EXECINSTR | lief.ELF.SECTION_FLAGS.ALLOC
binary.add(section)

# Modify entry point
binary.header.entrypoint = 0x401000

# Hook imported function
binary.patch_pltgot("strcmp", 0x401000)

binary.write("patched")
```

**LIEF advantages:** Cross-format (ELF, PE, Mach-O), Python API, can add sections/segments, modify headers, patch imports.

---

## GDB Constraint Extraction with ILP/LP Solver (BackdoorCTF 2017)

When a binary enforces linear arithmetic relationships between input bytes, extract constraints automatically via GDB and solve with an ILP solver.

**Technique:** Send position-encoded input (`input[i] = i`) so that when a comparison fires, you know exactly which positions are involved and what their sum/difference must equal. Collect all constraints from logged comparisons, then feed to PuLP or Gurobi.

```python
from pulp import *

n = 32  # flag length
prob = LpProblem("crackme", LpMinimize)
x = [LpVariable(f'x{i}', 32, 126, cat='Integer') for i in range(n)]
prob += 0  # dummy objective

# Constraints extracted via GDB automation (input[i]=i, monitor comparisons):
prob += x[3] + x[7] == 0xAB
prob += x[1] - x[5] == 0x0C
# ... add all extracted constraints ...

# Constrain to printable ASCII
for xi in x:
    prob += xi >= 32
    prob += xi <= 126

prob.solve(PULP_CBC_CMD(msg=0))
flag = ''.join(chr(int(value(xi))) for xi in x)
print("Flag:", flag)
```

**GDB automation to extract constraints:**
```python
# In GDB Python: set input[i]=i, run, log every CMP instruction result
import gdb

class CmpLogger(gdb.Breakpoint):
    def stop(self):
        frame = gdb.selected_frame()
        # Read compared values, map back to input indices via position encoding
        return False
```

**Key insight:** When a binary enforces linear arithmetic relationships between input bytes, ILP solvers directly find the satisfying assignment once constraints are extracted via GDB automation.

**References:** BackdoorCTF 2017

---

## GDB Position-Encoded Input with Zero Flag Monitoring (EKOPARTY 2017)

Send input where `input[i] = i` (position-encoded). Single-step through the binary monitoring the CPU zero flag (ZF). When ZF is set at a comparison involving a specific position's value, the comparison matched — log the expected value for that position.

```python
import gdb

# Script: single-step binary with position-encoded input, watch ZF
class ZFMonitor(gdb.Breakpoint):
    def stop(self):
        zf = (int(gdb.parse_and_eval('$eflags')) >> 6) & 1
        if zf:
            rip = int(gdb.parse_and_eval('$rip'))
            # Disassemble at rip to find the compared immediate
            disasm = gdb.execute(f'x/1i {rip-5}', to_string=True)
            print(f"ZF set at {rip:#x}: {disasm.strip()}")
        return False

# Run once with input b'\x00\x01\x02\x03...\x1f'
# ZF fires when comparison matches the position's own value -> that IS the key byte
```

Maps each input byte to its required value in one pass without manual reversing.

**Key insight:** Position-encoded input (`input[i]=i`) combined with zero flag monitoring reveals the full key/password in one pass — the zero flag fires when the expected value for position i equals i itself.

**References:** EKOPARTY CTF 2017

---

## LD_PRELOAD to Dump Execute-Only Binary (BackdoorCTF 2017)

A binary has execute-only permissions (mode `--x`, no read bit). The file cannot be read directly or with standard tools, but the kernel still maps it into memory on execution.

LD_PRELOAD a shared library with a constructor that runs inside the process and reads its own memory via `/proc/self/mem`:

```c
// dump_xo.c — compile: gcc -shared -fPIC -o dump_xo.so dump_xo.c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

__attribute__((constructor)) void dump() {
    FILE *maps = fopen("/proc/self/maps", "r");
    char line[256];
    unsigned long base = 0, end = 0;

    // Find the execute-only binary's mapping (r-xp or --xp)
    while (fgets(line, sizeof(line), maps)) {
        if (strstr(line, "binary_name")) {
            sscanf(line, "%lx-%lx", &base, &end);
            break;
        }
    }
    fclose(maps);

    FILE *mem = fopen("/proc/self/mem", "rb");
    fseek(mem, base, SEEK_SET);
    size_t size = end - base;
    void *buf = malloc(size);
    fread(buf, 1, size, mem);
    fclose(mem);

    FILE *out = fopen("/tmp/dumped_binary", "wb");
    fwrite(buf, 1, size, out);
    fclose(out);
}
// Usage: LD_PRELOAD=./dump_xo.so ./binary_xo
```

**Key insight:** Execute-only prevents file reading but not execution. LD_PRELOAD constructors run inside the process where `/proc/self/mem` provides access to mapped memory regardless of file permissions.

**References:** BackdoorCTF 2017
