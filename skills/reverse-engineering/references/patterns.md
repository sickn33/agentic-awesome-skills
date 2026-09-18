# CTF Reverse - Patterns & Techniques

## Table of Contents
- [Custom VM Reversing](#custom-vm-reversing)
  - [Analysis Steps](#analysis-steps)
  - [Common VM Patterns](#common-vm-patterns)
  - [RVA-Based Opcode Dispatching](#rva-based-opcode-dispatching)
  - [State Machine VMs (90K+ states)](#state-machine-vms-90k-states)
  - [Custom VM Reverse Engineering via Fuzzing and Instruction Set Discovery (hxp CTF 2017)](#custom-vm-reverse-engineering-via-fuzzing-and-instruction-set-discovery-hxp-ctf-2017)
- [Anti-Debugging Techniques](#anti-debugging-techniques)
  - [Common Checks](#common-checks)
  - [Bypass Technique](#bypass-technique)
  - [LD_PRELOAD Hook](#ld_preload-hook)
  - [pwntools Binary Patching (Crypto-Cat)](#pwntools-binary-patching-crypto-cat)
- [Nanomites](#nanomites)
  - [Linux (Signal-Based)](#linux-signal-based)
  - [Windows (Debug Events)](#windows-debug-events)
  - [Analysis](#analysis)
- [Self-Modifying Code](#self-modifying-code)
  - [Pattern: XOR Decryption](#pattern-xor-decryption)
- [Known-Plaintext XOR (Flag Prefix)](#known-plaintext-xor-flag-prefix)
  - [Variant: XOR with Position Index](#variant-xor-with-position-index)
- [Mixed-Mode (x86-64 / x86) Stagers](#mixed-mode-x86-64--x86-stagers)
- [LLVM (Low Level Virtual Machine) Obfuscation (Control Flow Flattening)](#llvm-low-level-virtual-machine-obfuscation-control-flow-flattening)
  - [Pattern](#pattern)
  - [De-obfuscation](#de-obfuscation)
- [S-Box / Keystream Generation](#s-box--keystream-generation)
  - [Fisher-Yates Shuffle (Xorshift32)](#fisher-yates-shuffle-xorshift32)
  - [Xorshift64* Keystream](#xorshift64-keystream)
  - [Identifying Patterns](#identifying-patterns)
- [SECCOMP/BPF Filter Analysis](#seccompbpf-filter-analysis)
  - [BPF Analysis](#bpf-analysis)
- [Exception Handler Obfuscation](#exception-handler-obfuscation)
  - [RtlInstallFunctionTableCallback](#rtlinstallfunctiontablecallback)
  - [Vectored Exception Handlers (VEH)](#vectored-exception-handlers-veh)
- [Memory Dump Analysis](#memory-dump-analysis)
  - [When Binary Dumps Memory](#when-binary-dumps-memory)
  - [Known Plaintext Attack](#known-plaintext-attack)
- [Byte-Wise Uniform Transforms](#byte-wise-uniform-transforms)
- [x86-64 Gotchas](#x86-64-gotchas)
  - [Sign Extension](#sign-extension)
  - [Loop Boundary State Updates](#loop-boundary-state-updates)
- [Custom Mangle Function Reversing](#custom-mangle-function-reversing)
- [Position-Based Transformation Reversing](#position-based-transformation-reversing)
- [Hex-Encoded String Comparison](#hex-encoded-string-comparison)
- [Signal-Based Binary Exploration](#signal-based-binary-exploration)
- [Malware Anti-Analysis Bypass via Patching](#malware-anti-analysis-bypass-via-patching)
- [Multi-Stage Shellcode Loaders](#multi-stage-shellcode-loaders)
- [Timing Side-Channel Attack](#timing-side-channel-attack)
- [Multi-Thread Anti-Debug with Decoy + Signal Handler Mixed Boolean-Arithmetic (ApoorvCTF 2026)](#multi-thread-anti-debug-with-decoy--signal-handler-mixed-boolean-arithmetic-apoorvctf-2026)
- [INT3 Patch + Coredump Brute-Force Oracle (Pwn2Win 2016)](#int3-patch--coredump-brute-force-oracle-pwn2win-2016)
- [Signal Handler Chain + LD_PRELOAD Oracle (Nuit du Hack 2016)](#signal-handler-chain--ld_preload-oracle-nuit-du-hack-2016)
- [printf Format String VM Decompilation to Z3 (SECCON 2017)](#printf-format-string-vm-decompilation-to-z3-seccon-2017)

---

## Custom VM Reversing

### Analysis Steps
1. Identify VM structure: registers, memory, instruction pointer
2. Reverse `executeIns`/`runvm` function for opcode meanings
3. Write a disassembler to parse bytecode
4. Decompile disassembly to understand algorithm

### Common VM Patterns
```c
switch (opcode) {
    case 1: *R[op1] *= op2; break;      // MUL
    case 2: *R[op1] -= op2; break;      // SUB
    case 3: *R[op1] = ~*R[op1]; break;  // NOT
    case 4: *R[op1] ^= mem[op2]; break; // XOR
    case 5: *R[op1] = *R[op2]; break;   // MOV
    case 7: if (R0) IP += op1; break;   // JNZ
    case 8: putc(R0); break;            // PRINT
    case 10: R0 = getc(); break;        // INPUT
}
```

### RVA-Based Opcode Dispatching
- Opcodes are RVAs pointing to handler functions
- Handler performs operation, reads next RVA, jumps
- Map all handlers by following RVA chain

### State Machine VMs (90K+ states)
```java
// BFS for valid path
var agenda = new ArrayDeque<State>();
agenda.add(new State(0, ""));
while (!agenda.isEmpty()) {
    var current = agenda.remove();
    if (current.path.length() == TARGET_LENGTH) {
        println(current.path);
        continue;
    }
    for (var transition : machine.get(current.state).entrySet()) {
        agenda.add(new State(transition.getValue(),
                            current.path + (char)transition.getKey()));
    }
}
```

**Key insight:** Custom VMs appear when the challenge bundles a bytecode blob alongside a dispatcher loop. Reverse the opcode switch table first, then write a disassembler to lift the bytecode before attempting to understand the algorithm.

### Custom VM Reverse Engineering via Fuzzing and Instruction Set Discovery (hxp CTF 2017)

Methodical black-box approach to reversing unknown VM bytecode when static analysis of the dispatch loop is too complex:

**Step 1: Determine instruction alignment.**
Dump the bytecode as bit strings at various widths (6-11 bits) to identify instruction alignment. Look for repeating patterns that suggest opcode boundaries.

**Step 2: Fuzz with random bytes.**
Send single instructions and observe effects on registers/memory to map opcodes. Reduce to minimal programs: find the shortest input that produces each observable effect.

**Step 3: Build the instruction set.**
Example discovered ISA (variable-length 6-11 bit):
```text
000 xxxxxxxx  jmpz    001 xxxxxxxx  jmp     010 xxxxxxxx  call
011 xxxxxxxx  label   1000 xxxxxxx  loadram  1001 xxxxxxx  saveram
110 xxxxxxxx  loadi   11100 xxxxxx  shl      11101 xxxxxx  shr
111100 not    111101 and    111110 or    111111 setif
```

**Step 4: Build assembler/disassembler.**
Write tools to assemble and disassemble the discovered ISA, then disassemble the challenge bytecode to understand its algorithm.

**Step 5: Implement missing primitives.**
If the ISA lacks expected operations, synthesize them from available instructions. Example: implementing XTEA decryption using only AND/OR/NOT (no native XOR or ADD):
```python
# XOR from AND/OR/NOT:  XOR(a, b) = (a OR b) AND NOT(a AND b)
# ADD via full-adder chains using AND/OR/NOT for carry propagation
def xor_from_primitives(a, b):
    return (a | b) & ~(a & b)

def add_from_primitives(a, b, bits=32):
    carry = 0
    result = 0
    for i in range(bits):
        ai = (a >> i) & 1
        bi = (b >> i) & 1
        sum_bit = xor_from_primitives(xor_from_primitives(ai, bi), carry)
        carry = (ai & bi) | (carry & xor_from_primitives(ai, bi))
        result |= (sum_bit << i)
    return result
```

**Key insight:** When static analysis of a VM's dispatch loop is too complex, black-box fuzzing can map the ISA faster. Send single instructions and observe state changes. Variable-length instruction sets require testing multiple bit widths. Once the ISA is known, complex algorithms (XTEA) can be implemented even with minimal primitives (AND/OR/NOT).

**References:** hxp CTF 2017

---

## Anti-Debugging Techniques

### Common Checks
- `IsDebuggerPresent()` (Windows)
- `ptrace(PTRACE_TRACEME)` (Linux)
- `/proc/self/status` TracerPid
- Timing checks (`rdtsc`, `time()`)
- Registry checks (Windows)

### Bypass Technique
1. Identify `test` instructions after debug checks
2. Set breakpoint at the `test`
3. Modify register to bypass conditional

```bash
# In radare2
db 0x401234          # Break at test
dc                   # Run
dr eax=0             # Clear flag
dc                   # Continue
```

### LD_PRELOAD Hook
```c
#define _GNU_SOURCE
#include <dlfcn.h>
#include <sys/ptrace.h>

long int ptrace(enum __ptrace_request req, ...) {
    long int (*orig)(enum __ptrace_request, pid_t, void*, void*);
    orig = dlsym(RTLD_NEXT, "ptrace");
    // Log or modify behavior
    return orig(req, pid, addr, data);
}
```

Compile: `gcc -shared -fPIC -ldl hook.c -o hook.so`
Run: `LD_PRELOAD=./hook.so ./binary`

**Key insight:** Anti-debugging checks are the first obstacle in most reversing challenges. Look for `ptrace`, `IsDebuggerPresent`, or timing checks early in `main()` and patch or hook them before attempting deeper analysis.

### pwntools Binary Patching (Crypto-Cat)
Patch out anti-debug calls directly using pwntools — replaces function with `ret` instruction:
```python
from pwn import *

elf = ELF('./challenge', checksec=False)
elf.asm(elf.symbols.ptrace, 'ret')   # Replace ptrace() with immediate return
elf.save('patched')                   # Save patched binary
```

Other common patches:
```python
elf.asm(addr, 'nop')                  # NOP out an instruction
elf.asm(addr, 'xor eax, eax; ret')    # Return 0 (bypass checks)
elf.asm(addr, 'mov eax, 1; ret')      # Return 1 (force success)
```

---

## Nanomites

### Linux (Signal-Based)
- `SIGTRAP` (`int 3`) → Custom operation
- `SIGILL` (`ud2`) → Custom operation
- `SIGFPE` (`idiv 0`) → Custom operation
- `SIGSEGV` (null deref) → Custom operation

### Windows (Debug Events)
- `EXCEPTION_DEBUG_EVENT` → Main handler
- Parent modifies child via `PTRACE_POKETEXT`
- Magic markers: `0x1337BABE`, `0xDEADC0DE`

### Analysis
1. Check for `fork()` + `ptrace(PTRACE_TRACEME)`
2. Find `WaitForDebugEvent` loop
3. Map EAX values to operations
4. Log operations to reconstruct algorithm

**Key insight:** Nanomites hide the real computation inside signal/exception handlers that only fire under a debugger parent. If the binary forks and the child calls `ptrace(TRACEME)`, the parent is the real CPU -- log its POKE operations to reconstruct the algorithm.

---

## Self-Modifying Code

### Pattern: XOR Decryption
```asm
lea     rax, next_block
mov     dl, [rcx]        ; Input char
xor_loop:
    xor     [rax+rbx], dl
    inc     rbx
    cmp     rbx, BLOCK_SIZE
    jnz     xor_loop
jmp     rax              ; Execute decrypted
```

**Solution:** Known opcode at block start reveals XOR key (flag char).

**Key insight:** Self-modifying code decrypts the next block using each input character as a key. A known-good opcode at the start of each decrypted block (e.g., function prologue) reveals the correct key byte, recovering the flag one character at a time.

---

## Known-Plaintext XOR (Flag Prefix)

**Pattern:** Encrypted bytes given; flag format known (e.g., `0xL4ugh{`).

**Approach:**
1. Assume repeating XOR key.
2. Use known prefix (and any hint phrase) to recover key bytes.
3. Try small key lengths and validate printable output.

```python
enc = bytes.fromhex("...")  # ciphertext
known = b"0xL4ugh{say_yes_to_me"
for klen in range(2, 33):
    key = bytearray(klen)
    ok = True
    for i, b in enumerate(known):
        if i >= len(enc):
            break
        ki = i % klen
        v = enc[i] ^ b
        if key[ki] != 0 and key[ki] != v:
            ok = False
            break
        key[ki] = v
    if not ok:
        continue
    pt = bytes(enc[i] ^ key[i % klen] for i in range(len(enc)))
    if all(32 <= c < 127 for c in pt):
        print(klen, key, pt)
```

**Note:** Challenge hints often appear verbatim in the flag body (e.g., "say_yes_to_me").

### Variant: XOR with Position Index
**Pattern:** `cipher[i] = plain[i] ^ key[i % k] ^ i` (or `^ (i & 0xff)`).

**Symptoms:**
- Repeating-key XOR almost fits known prefix but breaks at later positions
- XOR with known prefix yields a "key" that changes by +1 per index

**Fix:** Remove index first, then recover key with known prefix.
```python
enc = bytes.fromhex("...")
known = b"0xL4ugh{say_yes_to_me"
for klen in range(2, 33):
    key = bytearray(klen)
    ok = True
    for i, b in enumerate(known):
        if i >= len(enc):
            break
        ki = i % klen
        v = (enc[i] ^ i) ^ b  # strip index XOR
        if key[ki] != 0 and key[ki] != v:
            ok = False
            break
        key[ki] = v
    if not ok:
        continue
    pt = bytes((enc[i] ^ i) ^ key[i % klen] for i in range(len(enc)))
    if all(32 <= c < 127 for c in pt):
        print(klen, key, pt)
```

---

## Mixed-Mode (x86-64 / x86) Stagers

**Pattern:** 64-bit ELF jumps into a 32-bit blob via far return (`retf`/`retfq`), often after anti-debug.

**Identification:**
- Bytes `0xCB` (retf) or `0xCA` (retf imm16), sometimes preceded by `0x48` (retfq)
- 32-bit disasm shows SSE ops (`psubb`, `pxor`, `paddb`) in a tight loop
- Computed jumps into the 32-bit region

**Gotchas:**
- `retf` pops **6 bytes**: 4-byte EIP + 2-byte CS (not 8)
- 32-bit blob may rely on inherited **XMM state** and **EFLAGS**
- Missing XMM/flags transfer when switching emulators yields wrong output

**Bypass/Emulation Tips:**
1. Create a UC_MODE_32 emulator, copy memory + GPRs, **EFLAGS**, and **XMM regs**
2. Run 32-bit block, then copy memory + regs back to 64-bit
3. If anti-debug uses `fork/ptrace` + patching, emulate parent to log POKEs and apply them in child

---

## LLVM (Low Level Virtual Machine) Obfuscation (Control Flow Flattening)

### Pattern
```c
while (1) {
    if (i == 0xA57D3848) { /* block */ }
    if (i != 0xA5AA2438) break;
    i = 0x39ABA8E6;  // Next state
}
```

### De-obfuscation
1. GDB script to break at `je` instructions
2. Log state variable values
3. Map state transitions
4. Reconstruct true control flow

**Key insight:** Control flow flattening replaces structured if/else/loops with a single dispatcher switch. The state variable is the key -- trace its values at runtime to reconstruct the original control flow graph without fighting the obfuscation statically.

---

## S-Box / Keystream Generation

### Fisher-Yates Shuffle (Xorshift32)
```python
def gen_sbox():
    sbox = list(range(256))
    state = SEED
    for i in range(255, -1, -1):
        state = ((state << 13) ^ state) & 0xffffffff
        state = ((state >> 17) ^ state) & 0xffffffff
        state = ((state << 5) ^ state) & 0xffffffff
        j = state % (i + 1) if i > 0 else 0
        sbox[i], sbox[j] = sbox[j], sbox[i]
    return sbox
```

### Xorshift64* Keystream
```python
def gen_keystream():
    ks = []
    state = SEED_64
    mul = 0x2545f4914f6cdd1d
    for _ in range(256):
        state ^= (state >> 12)
        state ^= (state << 25)
        state ^= (state >> 27)
        state = (state * mul) & 0xffffffffffffffff
        ks.append((state >> 56) & 0xff)
    return ks
```

### Identifying Patterns
- Xorshift32: shifts 13, 17, 5 (no multiplication constant)
- Xorshift64*: shifts 12, 25, 27, then multiply by `0x2545f4914f6cdd1d`
- Other common constant: `0x9e3779b97f4a7c15` (golden ratio)

**Key insight:** Recognize S-box generation by the Fisher-Yates shuffle pattern (loop counting down from 255, swap with PRNG-chosen index) and keystream generators by the xorshift constants. Once the PRNG family is identified, the algorithm is fully determined by its seed.

---

## SECCOMP/BPF Filter Analysis

```bash
seccomp-tools dump ./binary
```

### BPF Analysis
- `A = sys_number` followed by comparisons
- `mem[N] = A`, `A = mem[N]` for memory ops
- Map to constraint equations, solve with z3

```python
from z3 import *
flag = [BitVec(f'c{i}', 32) for i in range(14)]
s = Solver()
s.add(flag[0] >= 0x20, flag[0] < 0x7f)
# Add constraints from filter
if s.check() == sat:
    m = s.model()
    print(''.join(chr(m[c].as_long()) for c in flag))
```

**Key insight:** SECCOMP (Secure Computing Mode) filters encode flag validation as BPF bytecode operating on syscall arguments. Dump the filter with `seccomp-tools`, translate the comparisons and memory operations into z3 constraints, and solve for the flag without ever running the binary.

---

## Exception Handler Obfuscation

### RtlInstallFunctionTableCallback
- Dynamic exception handler registration
- Handler installs new handler, modifies code
- Use x64dbg with exception handler breaks

### Vectored Exception Handlers (VEH)
- `AddVectoredExceptionHandler` installs handler
- Handler decrypts code at exception address
- Step through, dump decrypted code

**Key insight:** Exception-handler-based obfuscation hides the real control flow inside SEH/VEH handlers that trigger on deliberate faults. Set breakpoints inside the exception handlers rather than on the faulting instructions to follow the actual execution path.

---

## Memory Dump Analysis

### When Binary Dumps Memory
- Check for `/proc/self/maps` reads
- Check for `/proc/self/mem` reads
- Heap data often appended to dump

### Known Plaintext Attack
```python
prologue = bytes([0xf3, 0x0f, 0x1e, 0xfa, 0x55, 0x48, 0x89, 0xe5])
encrypted = data[func_offset:func_offset+8]
partial_key = bytes(a ^ b for a, b in zip(encrypted, prologue))
```

**Key insight:** When a binary reads `/proc/self/mem` or `/proc/self/maps`, it is dumping its own memory -- possibly after encrypting it. Use known function prologues (`endbr64; push rbp; mov rbp, rsp`) as known plaintext to recover the XOR key from the encrypted dump.

---

## Byte-Wise Uniform Transforms

**Pattern:** Output buffer depends on each input byte independently (no cross-byte coupling).

**Detection:**
- Change one input position → only one output position changes
- Fill input with a single byte → output buffer becomes constant

**Solve:**
1. For each byte value 0..255, run the program with that byte repeated
2. Record output byte → build mapping and inverse mapping
3. Apply inverse mapping to static target bytes to recover the flag

---

## x86-64 Gotchas

### Sign Extension
```python
esi = 0xffffffc7  # NOT -57

# For XOR: low byte only
esi_xor = esi & 0xff  # 0xc7

# For addition: full 32-bit with overflow
r12 = (r13 + esi) & 0xffffffff
```

### Loop Boundary State Updates
Assembly often splits state updates across loop boundaries:
```asm
    jmp loop_middle        ; First iteration in middle!

loop_top:                   ; State for iterations 2+
    mov  r13, sbox[a & 0xf]
    ; Uses OLD 'a', not new!

loop_middle:
    ; Main computation
    inc  a
    jne  loop_top
```

**Key insight:** Decompilers often get x86-64 sign extension and loop boundary state updates wrong. Always verify decompiled output against the raw assembly for operations involving `movsx`/`cdqe`, and check whether loop variables update before or after their use in each iteration.

---

## Custom Mangle Function Reversing

**Pattern (Flag Appraisal):** Binary mangles input 2 bytes at a time with intermediate state, compares to static target.

**Approach:**
1. Extract static target bytes from `.rodata` section
2. Understand mangle: processes pairs with running state value
3. Write inverse function (process in reverse, undo each operation)
4. Feed target bytes through inverse → recovers flag

**Key insight:** When a binary mangles input in pairs with running state and compares to a static target, extract the target from `.rodata` and write the inverse function. Process the target bytes in reverse order, undoing each operation, to recover the original input.

---

## Position-Based Transformation Reversing

**Pattern (PascalCTF 2026):** Binary transforms input by adding/subtracting position index.

**Reversing:**
```python
expected = [...]  # Extract from .rodata
flag = ''
for i, b in enumerate(expected):
    if i % 2 == 0:
        flag += chr(b - i)   # Even: input = output - i
    else:
        flag += chr(b + i)   # Odd: input = output + i
```

---

## Hex-Encoded String Comparison

**Pattern (Spider's Curse):** Input converted to hex, compared against hex constant.

**Quick solve:** Extract hex constant from strings/Ghidra, decode:
```bash
echo "4d65746143..." | xxd -r -p
```

---

## Signal-Based Binary Exploration

**Pattern (Signal Signal Little Star):** Binary uses UNIX signals as a binary tree navigation mechanism.

**Identification:**
- Multiple `sigaction()` calls with `SA_SIGINFO`
- `sigaltstack()` setup (alternate signal stack)
- Handler decodes embedded payload, installs next pair of signals
- Two types: Node (installs children) vs Leaf (prints message + exits)

**Solving approach:**
1. Hook `sigaction` via `LD_PRELOAD` to log signal installations
2. DFS through the binary tree by sending signals
3. At each stage, observe which 2 signals are installed
4. Send one, check if program exits (leaf) or installs 2 more (node)
5. If wrong leaf, backtrack and try sibling

```c
// LD_PRELOAD interposer to log sigaction calls
int sigaction(int signum, const struct sigaction *act, ...) {
    if (act && (act->sa_flags & SA_SIGINFO))
        log("SET %d SA_SIGINFO=1\n", signum);
    return real_sigaction(signum, act, oldact);
}
```

---

## Malware Anti-Analysis Bypass via Patching

**Pattern (Carrot):** Malware with multiple environment checks before executing payload.

**Common checks to patch:**
| Check | Technique | Patch |
|-------|-----------|-------|
| `ptrace(PTRACE_TRACEME)` | Anti-debug | Change `cmp -1` to `cmp 0` |
| `sleep(150)` | Anti-sandbox timing | Change sleep value to 1 |
| `/proc/cpuinfo` "hypervisor" | Anti-VM | Flip `JNZ` to `JZ` |
| "VMware"/"VirtualBox" strings | Anti-VM | Flip `JNZ` to `JZ` |
| `getpwuid` username check | Environment | Flip comparison |
| `LD_PRELOAD` check | Anti-hook | Skip check |
| Fan count / hardware check | Anti-VM | Flip `JLE` to `JGE` |
| Hostname check | Environment | Flip `JNZ` to `JZ` |

**Ghidra patching workflow:**
1. Find check function, identify the conditional jump
2. Click on instruction → `Ctrl+Shift+G` → modify opcode
3. For `JNZ` (0x75) → `JZ` (0x74), or vice versa
4. For immediate values: change operand bytes directly
5. Export: press `O` → choose "Original File" format
6. `chmod +x` the patched binary

**Server-side validation bypass:**
- If patched binary sends system info to remote server, patch the data too
- Modify string addresses in data-gathering functions
- Change format strings to embed correct values directly

---

## Multi-Stage Shellcode Loaders

**Pattern (I Heard You Liked Loaders):** Nested shellcode with XOR decode loops and anti-debug.

**Debugging workflow:**
1. Break at `call rax` in launcher, step into shellcode
2. Bypass ptrace anti-debug: step to syscall, `set $rax=0`
3. Step through XOR decode loop (or break on `int3` if hidden)
4. Repeat for each stage until final payload

**Flag extraction from `mov` instructions:**
```python
# Final stage loads flag 4 bytes at a time via mov ebx, value
# Extract little-endian 4-byte chunks
values = [0x6174654d, 0x7b465443, ...]  # From disassembly
flag = b''.join(v.to_bytes(4, 'little') for v in values)
```

---

## Timing Side-Channel Attack

**Pattern (Clock Out):** Validation time varies per correct character (longer sleep on match).

**Exploitation:**
```python
import time
from pwn import *

flag = ""
for pos in range(flag_length):
    best_char, best_time = '', 0
    for c in string.printable:
        io = remote(host, port)
        start = time.time()
        io.sendline((flag + c).ljust(total_len, 'X'))
        io.recvall()
        elapsed = time.time() - start
        if elapsed > best_time:
            best_time = elapsed
            best_char = c
        io.close()
    flag += best_char
```

---

## Multi-Thread Anti-Debug with Decoy + Signal Handler Mixed Boolean-Arithmetic (ApoorvCTF 2026)

**Pattern (A Golden Experience Requiem):** Multi-threaded binary with layered anti-analysis: Thread 1 performs decoy operations (fake AES + deliberate crash via `ud2`), Thread 2 does the real flag computation in a SIGSEGV signal handler using Mixed Boolean Arithmetic (MBA), Thread 3 erases memory to prevent post-mortem analysis.

**Thread layout:**
| Thread | Purpose | Trap |
|--------|---------|------|
| Thread 1 | Decoy: AES-looking operations → `ud2` crash | Analysts waste time reversing fake crypto |
| Thread 2 | Real flag: SIGSEGV handler with MBA transforms | Hidden in signal handler, not main code path |
| Thread 3 | Memory eraser: zeros out flag data after computation | Prevents memory dumping |
| Main | rdtsc-based anti-debug timing check | Penalizes debugger-attached execution |

**Solving approach — pure Python emulation of MBA logic:**
```python
# MBA helpers (extracted from assembly)
def mba_add(a, b): return (a + b) & 0xff
def mba_xor(a, b): return (a ^ b) & 0xff

def mba_transform(i):
    """Position-dependent transform from signal handler."""
    val = (i * 7 + 0x3f) & 0xff
    rotated = ((i << 3) | (i >> 5)) & 0xff
    return mba_xor(val, rotated)

# S-box (SHA-256 initial hash values repurposed)
SBOX = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]

def sbox_lookup(i):
    idx = i & 7
    shift = ((i >> 3) & 3) * 8
    return (SBOX[idx] >> shift) & 0xff

# Two interleaved rodata arrays (even indices → array1, odd → array2)
rodata1 = bytes.fromhex("39407691b717c97879013adf3a2adea11c2b04e0")
rodata2 = bytes.fromhex("bb19b025e37eaa786c4116e7aeea00c9c623940d")

flag = []
for i in range(40):  # flag length
    t = mba_transform(i)
    s = sbox_lookup(i)
    mem = rodata1[i // 2] if i % 2 == 0 else rodata2[i // 2]
    flag.append(chr(t ^ s ^ mem))

print(''.join(flag))
```

**Key insight:** The real flag logic is in the signal handler (SIGSEGV/SIGILL), not the main thread. Thread 1's AES-like code and `ud2` crash are intentional misdirection. The `rdtsc` timing check detects debuggers and corrupts output. Bypass by extracting the MBA logic from assembly and reimplementing in Python — never run the binary under a debugger.

**Detection indicators:**
- Multiple `pthread_create` calls with different handler functions
- `signal(SIGSEGV, handler)` or `sigaction` setup
- `ud2` instruction (deliberate illegal instruction)
- `rdtsc` instructions for timing checks
- SHA-256 constants (0x6a09e667...) used as lookup tables, not for hashing

---

## INT3 Patch + Coredump Brute-Force Oracle (Pwn2Win 2016)

Instead of reversing complex transformation logic, patch a byte to `0xCC` (INT3) after the transform, enable core dumps, brute-force each character by running the binary and extracting the transformed result from the coredump via `strings`.

```bash
# Patch byte at transform output point to 0xCC
printf '\xcc' | dd of=binary bs=1 seek=$((0x400ebb)) conv=notrunc
ulimit -c unlimited
# Brute-force each position:
for c in $(seq 32 126); do
    echo -ne "$(printf '\\x%02x' $c)$known_suffix" | ./binary 2>/dev/null
    strings core | grep -q "$expected" && echo "Found: $c"
done
```

**Key insight:** Use INT3/SIGTRAP as a breakpoint oracle -- the coredump captures computed state at the crash point. Avoids full reverse engineering of the transformation.

---

## Signal Handler Chain + LD_PRELOAD Oracle (Nuit du Hack 2016)

Binary uses Unix signals for flow control: `main()` sends SIGINT to itself 1024 times, each handler checks one password character, then calls `signal()` to install the next handler. Bypass: LD_PRELOAD a custom `signal()` that logs when it's called (indicating correct character), brute-force each position.

```c
// LD_PRELOAD library:
#include <signal.h>
sighandler_t signal(int sig, sighandler_t handler) {
    write(2, "CORRECT\n", 8);  // signal() called = char was correct
    return SIG_DFL;
}
```

**Key insight:** Signal-handler-chain anti-reversing can be defeated by hooking `signal()` via LD_PRELOAD. The call to `signal()` (to install the next handler) acts as a side-channel confirming the current character.

---

### printf Format String VM Decompilation to Z3 (SECCON 2017)

A "virtual machine" implemented entirely via `%hhn` format strings. Format string `%hhn` writes the count of printed characters (mod 256) to a pointed-to byte. A sequence of `%Nc%hhn` instructions implements arbitrary byte-to-memory writes, effectively creating a bytecode VM.

**Step 1: Identify instruction types.**
Count unique format patterns to determine the instruction set:
```bash
# Normalize numbers and count unique patterns
sed -e 's/[[:digit:]]\+/1/g' program.fs | sort | uniq -c | sort -nr
```

**Step 2: Write a decompiler.**
Convert format patterns to C-style pseudocode. Each `%N...%hhn` pair maps to a memory write: extract the write address (from the argument pointer) and value (from the character count).

**Step 3: Recognize the algorithm.**
The pseudocode typically reveals a linear equation system over bytes. Map memory addresses to symbolic variables.

**Step 4: Generate Z3 constraints and solve.**
```python
from z3 import *

flag_len = 32  # adjust based on decompiled output
flag = [BitVec(f'f{i}', 8) for i in range(flag_len)]
s = Solver()

# Constrain to printable ASCII
for f in flag:
    s.add(f >= 0x20, f <= 0x7e)

# Add constraints from decompiled format string operations
# e.g., flag[3] + flag[7] == 0xAB (mod 256)
# These come from the write sequences: each %hhn accumulates
# character counts and writes the result to a target byte
s.add((flag[0] + flag[1]) & 0xFF == 0x9A)  # example constraint
s.add((flag[2] ^ flag[3]) & 0xFF == 0x3F)  # example constraint
# ... (add all constraints from decompilation)

if s.check() == sat:
    m = s.model()
    print(bytes([m[f].as_long() for f in flag]))
```

**Decompilation approach in detail:**
1. Extract the write address and value from each `%N...%hhn` pair
2. Map memory addresses to symbolic variables (flag bytes)
3. Build an equation system from the write sequences
4. Solve with Z3

**Key insight:** Format string `%hhn` writes the count of printed characters (mod 256) to a pointed-to byte. A sequence of `%Nc%hhn` instructions implements arbitrary byte-to-memory writes, effectively creating a bytecode VM. Decompile by: (1) extract the write address and value from each `%N...%hhn` pair, (2) map memory addresses to symbolic variables, (3) build an equation system from the write sequences, (4) solve with Z3.

**References:** SECCON 2017
