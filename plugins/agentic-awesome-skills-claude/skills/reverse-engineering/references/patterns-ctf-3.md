# CTF Reverse - Competition-Specific Patterns (Part 3)

## Table of Contents
- [Z3 for Single-Line Python Boolean Circuit (BearCatCTF 2026)](#z3-for-single-line-python-boolean-circuit-bearcatctf-2026)
- [Sliding Window Popcount Differential Propagation (BearCatCTF 2026)](#sliding-window-popcount-differential-propagation-bearcatctf-2026)
- [Morse Code from Keyboard LEDs via ioctl (PlaidCTF 2013)](#morse-code-from-keyboard-leds-via-ioctl-plaidctf-2013)
- [C++ Destructor-Hidden Validation (Defcamp 2015)](#c-destructor-hidden-validation-defcamp-2015)
- [Syscall Side-Effect Memory Corruption (Hack.lu 2015)](#syscall-side-effect-memory-corruption-hacklu-2015)
- [MFC Dialog Event Handler Location (WhiteHat 2015)](#mfc-dialog-event-handler-location-whitehat-2015)
- [VM Sequential Key-Chain Brute-Force (Midnight Flag 2026)](#vm-sequential-key-chain-brute-force-midnight-flag-2026)
- [Burrows-Wheeler Transform Inversion without Terminator (ASIS CTF Finals 2016)](#burrows-wheeler-transform-inversion-without-terminator-asis-ctf-finals-2016)
- [OpenType Font Ligature Exploitation for Hidden Messages (Hack The Vote 2016)](#opentype-font-ligature-exploitation-for-hidden-messages-hack-the-vote-2016)
- [GLSL Shader VM with Self-Modifying Code (ApoorvCTF 2026)](#glsl-shader-vm-with-self-modifying-code-apoorvctf-2026)
- [Instruction Counter as Cryptographic State (MetaCTF Flash 2026)](#instruction-counter-as-cryptographic-state-metactf-flash-2026)
- [Thread Race Condition with Signed Integer Overflow (Codegate 2017)](#thread-race-condition-with-signed-integer-overflow-codegate-2017)
- [ESP32/Xtensa Firmware Reversing with ROM Symbol Map (Insomni'hack 2017)](#esp32xtensa-firmware-reversing-with-rom-symbol-map-insomnihack-2017)
- [Batch Crackme Automation via objdump Pattern Extraction (DEF CON 2017)](#batch-crackme-automation-via-objdump-pattern-extraction-def-con-2017)
- [Fork + Pipe + Dead Branch Anti-Analysis (RCTF 2017)](#fork--pipe--dead-branch-anti-analysis-rctf-2017)
- [Time-Locked Binary with Date-Based Key (Hack.lu 2017)](#time-locked-binary-with-date-based-key-hacklu-2017)
- [ARM Code in Image Pixels via UnicornJS (Hack.lu 2017)](#arm-code-in-image-pixels-via-unicornjs-hacklu-2017)
- [x86 16-bit MBR psadbw Constraint Solving (CSAW 2017)](#x86-16-bit-mbr-psadbw-constraint-solving-csaw-2017)
- [TensorFlow DNN Inversion by Inverting Sigmoid Layers (N1CTF 2018)](#tensorflow-dnn-inversion-by-inverting-sigmoid-layers-n1ctf-2018)
- [BPF Filter Analysis via JIT Compilation to x64 Assembly (Midnight Sun CTF 2018)](#bpf-filter-analysis-via-jit-compilation-to-x64-assembly-midnight-sun-ctf-2018)

---

## Z3 for Single-Line Python Boolean Circuit (BearCatCTF 2026)

**Pattern (Captain Morgan):** Single-line Python (2000+ semicolons) validates flag via walrus operator chains decomposing input as a big-endian integer, with bitwise operations producing a boolean circuit.

**Identification:**
- Single-line Python with semicolons separating statements
- Walrus operator `:=` chains: `(x := expr)`
- Obfuscated XOR: `(x | i) & ~(x & i)` instead of `x ^ i`
- Input treated as a single large integer, decomposed via bit-shifting

**Z3 solution:**
```python
from z3 import *

n_bytes = 29  # Flag length
ari = BitVec('ari', n_bytes * 8)

# Parse semicolon-separated statements
# Model walrus chains as LShR(ari, shift_amount)
# Evaluate boolean expressions symbolically
# Final assertion: result_var == 0

s = Solver()
s.add(bfu == 0)  # Final validation variable
if s.check() == sat:
    m = s.model()
    val = m[ari].as_long()
    flag = val.to_bytes(n_bytes, 'big').decode('ascii')
```

**Key insight:** Single-line Python obfuscation creates a boolean circuit over input bits. The walrus operator chains are just variable assignments — split on semicolons and translate each to Z3 symbolically. Obfuscated XOR `(a | b) & ~(a & b)` is just `a ^ b`. Z3 solves these circuits in under a second. Look for `__builtins__` access or `ord()`/`chr()` calls to identify the input→integer conversion.

**Detection:** Single-line Python with 1000+ semicolons, walrus operators, bitwise operations, and a final comparison to 0 or True.

---

## Sliding Window Popcount Differential Propagation (BearCatCTF 2026)

**Pattern (Treasure Hunt 4):** Binary validates input via expected popcount (number of set bits) for each position of a 16-bit sliding window over the input bits.

**Differential propagation:**
When the window slides by 1 bit:
```text
popcount(window[i+1]) - popcount(window[i]) = bit[i+16] - bit[i]
```
So: `bit[i+16] = bit[i] + (data[i+1] - data[i])`

```python
expected = [...]  # 337 expected popcount values
total_bits = 337 + 15  # = 352

# Brute-force the initial 16-bit window (must have popcount = expected[0])
for start_val in range(0x10000):
    if bin(start_val).count('1') != expected[0]:
        continue

    bits = [0] * total_bits
    for j in range(16):
        bits[j] = (start_val >> (15 - j)) & 1

    valid = True
    for i in range(len(expected) - 1):
        new_bit = bits[i] + (expected[i + 1] - expected[i])
        if new_bit not in (0, 1):
            valid = False
            break
        bits[i + 16] = new_bit

    if valid:
        # Convert bits to bytes
        flag_bytes = bytes(int(''.join(map(str, bits[i:i+8])), 2)
                          for i in range(0, total_bits, 8))
        if b'BCCTF' in flag_bytes or flag_bytes[:5].isascii():
            print(flag_bytes.decode(errors='replace'))
            break
```

**Key insight:** Sliding window popcount differences create a recurrence relation: each new bit is determined by the bit 16 positions back plus the popcount delta. Only the first 16 bits are free (constrained by initial popcount). Brute-force the ~4000-8000 valid initial windows — for each, the entire bit sequence is deterministic. Runs in under a second.

**Detection:** Binary computing popcount/hamming weight on fixed-size windows. Expected value array with length ≈ input_bits - window_size + 1. Values in array are small integers (0 to window_size).

---

---

## Morse Code from Keyboard LEDs via ioctl (PlaidCTF 2013)

**Pattern:** Binary uses `ioctl(fd, KDSETLED, value)` to blink keyboard LEDs (Num/Caps/Scroll Lock). Timing patterns encode Morse code.

```bash
# Step 1: Bypass ptrace anti-debug
# Patch ptrace call at offset with NOP (0x90)
python3 -c "
data = open('binary','rb').read()
data = data[:0x72b] + b'\x90'*5 + data[:0x730]  # NOP the ptrace call
open('patched','wb').write(data)
"

# Step 2: Run under strace, capture ioctl calls
strace -e ioctl ./patched 2>&1 | grep KDSETLED > leds.txt

# Step 3: Decode timing patterns
# Short blink (250ms) = dit (.), long blink (750ms) = dah (-)
# Inter-character pause = 3x, inter-word pause = 7x
```

```python
# Parse strace output to extract Morse
import re
morse_map = {'.-':'A', '-...':'B', '-.-.':'C', '-..':'D', '.':'E',
             '..-.':'F', '--.':'G', '....':'H', '..':'I', '.---':'J',
             '-.-':'K', '.-..':'L', '--':'M', '-.':'N', '---':'O',
             '.--.':'P', '--.-':'Q', '.-.':'R', '...':'S', '-':'T',
             '..-':'U', '...-':'V', '.--':'W', '-..-':'X', '-.--':'Y',
             '--..':'Z', '-----':'0', '.----':'1'}
# Map LED on-durations to dots/dashes, group by pauses
```

**Key insight:** `KDSETLED` controls physical keyboard LEDs on Linux (`/dev/console`). The binary must run with console access. Use `strace -e ioctl` to capture all LED state changes without needing physical observation. Timing between calls determines dot vs dash.

---

## C++ Destructor-Hidden Validation (Defcamp 2015)

Validation logic may hide in C++ destructors that execute after `main()` returns. The `__cxa_atexit` mechanism registers destructor callbacks:

1. **Locate destructors:** Search for `__cxa_atexit` calls in `.init_array`/constructor sections
2. **Static analysis:** Identify global objects whose destructors perform flag checking
3. **Dynamic verification:** Set breakpoints on `__cxa_finalize` to trace post-main execution

```asm
# In IDA/Ghidra: look for atexit registrations
__cxa_atexit(destructor_func, object_ptr, dso_handle);

# Destructor contains actual validation:
# - Regex pattern matching on 4-byte blocks (8 sequential checks)
# - Arithmetic: v2 += -3 * s[i] + 36 + (s[i] ^ 0x2FCFBA)
# - Modular verification of accumulated sum
```

**Key insight:** When `main()` appears trivial or incomplete, check destructors of global/static C++ objects. The `.fini_array` section and `__cxa_atexit` registrations reveal hidden post-main logic.

---

## Syscall Side-Effect Memory Corruption (Hack.lu 2015)

The `rt_sigprocmask` syscall writes a `sigset_t` structure to its output pointer. When input parsing passes a pointer near a security-critical variable:

1. Certain input characters (e.g., `:` to `@` range, values 0x3A-0x40) trigger `rt_sigprocmask` as a side effect
2. The syscall zeros out bytes at the output address, which may overlap adjacent variables
3. In little-endian layout, zeroing the MSB of an adjacent integer variable effectively sets it to a small value

```c
// Memory layout (no ASLR):
// 0x603390: input_buffer[4]
// 0x603394: security_check_var

// Input ':' triggers: rt_sigprocmask(SIG_BLOCK, NULL, (sigset_t*)0x603397, ...)
// This zeros bytes at 0x603397+, corrupting security_check_var's high bytes
```

**Key insight:** Audit how input validation functions interact with syscalls. Character-to-syscall mappings in hex conversion routines can produce unintended memory writes via kernel-space operations.

---

## MFC Dialog Event Handler Location (WhiteHat 2015)

To find event handlers in MFC (Microsoft Foundation Class) applications:

1. **Break on SendMessageW:** Set breakpoint on `user32!SendMessageW` to intercept dialog messages
2. **Filter for WM_COMMAND:** Message ID 0x111 indicates button clicks and control events
3. **Trace message map:** Follow the MFC message dispatch from `CWnd::OnWndMsg` → `CCmdTarget::OnCmdMsg` → handler function
4. **OnInitDialog:** Often contains decryption or validation setup; triggered by WM_INITDIALOG (0x110)

```asm
# WinDbg/x64dbg:
bp user32!SendMessageW ".if (poi(@esp+8)==0x111) {} .else {gc}"
# Or in IDA: find cross-references to AFX_MSGMAP_ENTRY structures
```

**Key insight:** MFC applications route messages through dispatch tables. Identify the `AFX_MSGMAP` structure to enumerate all handled messages without runtime analysis.

---

## VM Sequential Key-Chain Brute-Force (Midnight Flag 2026)

**Pattern (67):** Custom VM validates input in N-byte blocks. Each block's output key feeds as input to the next block, preventing parallel solving. Per-block search space is small enough to brute-force (2^24 for 3-byte blocks).

**Recognition signs:**
- Bytecode with XOR-obfuscated opcodes (all bytes XOR'd with a constant, producing ASCII-looking bytecode)
- Iterative transformation loop (xorshift + multiply, repeated 1000+ times) making algebraic inversion impractical
- CHECK opcodes comparing accumulated state against embedded constants
- Large `.data` section with repetitive bytecode patterns

**Solving approach:**
1. Parse bytecode to extract CHECK values (expected key after each block)
2. For each block sequentially, brute-force the input bytes that produce the expected key
3. Use the CHECK value as the key for the next block

```c
// OpenMP-parallelized per-block brute-force
uint32_t process(uint32_t val) {
    for (int i = 0; i < 1000; i++) {
        val ^= (val << 13);
        val ^= (val >> 17);
        val ^= (val << 5);
        val *= 0x2545f491;
    }
    return val;
}

int solve_block(uint32_t old_key, uint32_t expected_key, unsigned char *out) {
    int found = 0;
    #pragma omp parallel for shared(found)
    for (int v = 0; v < 0x1000000; v++) {
        if (found) continue;
        uint32_t input_val = ((v >> 16) << 16) | (v & 0xFF) | ((v >> 8 & 0xFF) << 8);
        uint32_t saved = input_val ^ old_key;
        uint32_t final_val = process(saved);
        if ((final_val ^ saved) == expected_key) {
            #pragma omp critical
            { if (!found) { out[0]=v>>16; out[1]=(v>>8)&0xFF; out[2]=v&0xFF; found=1; } }
        }
    }
    return found;
}
// Compile: gcc -O3 -march=native -fopenmp -o solve solve.c
```

**Key insight:** When a transformation is intentionally non-invertible (iterated hash-like function), brute-force is the intended solution. OpenMP parallelization is critical — 287 blocks x 16.7M candidates each takes minutes parallelized vs hours single-threaded. The sequential key dependency means blocks must be solved in order, but each individual block search is embarrassingly parallel.

---

## Burrows-Wheeler Transform Inversion without Terminator (ASIS CTF Finals 2016)

BWT applied to binary representation without a standard terminating character. Requires brute-force inversion by trying all possible original strings.

```python
def bwt_inverse_bruteforce(bwt_string):
    """Invert BWT when no terminating character is present.
    Standard BWT inverse needs the terminator position.
    Without it, try all n possible rotations."""
    n = len(bwt_string)

    # Standard BWT inverse produces a table
    table = [''] * n
    for _ in range(n):
        table = sorted([bwt_string[i] + table[i] for i in range(n)])

    # Without terminator, all n rows are valid candidates
    # Filter by known constraints (e.g., starts with '1' for binary, matches XOR pattern)
    candidates = []
    for row in table:
        # Apply challenge-specific validation
        if is_valid_plaintext(row):
            candidates.append(row)

    return candidates

def bwt_with_xor_rounds(encrypted_hex, num_rounds):
    """Multi-round BWT with XOR key derived from round index"""
    data = bytes.fromhex(encrypted_hex)
    for round_idx in range(num_rounds - 1, -1, -1):
        # Each round: BWT on binary representation, then XOR with round-based key
        binary_str = ''.join(format(b, '08b') for b in data)
        candidates = bwt_inverse_bruteforce(binary_str)
        # Select candidate matching constraints (leading '1', trailing bit rule)
        data = select_valid_candidate(candidates, round_idx)
    return data
```

**Key insight:** Standard BWT uses a terminating character (like '$') to mark the original string's position. Without it, BWT inversion produces n candidates (one per rotation). Use domain-specific constraints (binary format, XOR round structure, flag prefix) to identify the correct candidate.

---

## OpenType Font Ligature Exploitation for Hidden Messages (Hack The Vote 2016)

Font files with custom OpenType ligatures map visible characters to hidden glyphs. The GSUB (Glyph Substitution) table defines these mappings.

```python
from fontTools.ttLib import TTFont

def decode_font_ligatures(font_path, encoded_text):
    """Extract ligature substitution table and decode message"""
    font = TTFont(font_path)

    # Extract GSUB table for ligature substitutions
    gsub = font['GSUB']

    # Navigate to ligature lookup
    ligature_map = {}
    for lookup in gsub.table.LookupList.Lookup:
        for subtable in lookup.SubTable:
            if hasattr(subtable, 'ligatures'):
                for glyph_name, ligatures in subtable.ligatures.items():
                    for lig in ligatures:
                        # Map: input sequence -> output glyph
                        input_seq = [glyph_name] + lig.Component
                        output = lig.LigGlyph
                        ligature_map[tuple(input_seq)] = output

    print("Ligature mappings found:")
    for inp, out in ligature_map.items():
        print(f"  {inp} -> {out}")

    # Alternative: convert TTF to XML for manual analysis
    # font.saveXML('font_dump.xml')
    # Search for <LigatureSubst> entries

# Command-line approach:
# pip install fonttools
# ttx font.otf  # converts to XML
# grep -A5 'LigatureSubst' font.ttx
```

**Key insight:** Custom fonts with GSUB ligature tables create a cipher where displayed characters differ from their glyph mappings. The `fonttools` library's `ttx` command dumps the font to XML, making ligature substitution tables easily readable. Each ligature maps an input character sequence to a different output glyph.

---

## GLSL Shader VM with Self-Modifying Code (ApoorvCTF 2026)

**Pattern (Draw Me):** A WebGL2 fragment shader implements a Turing-complete VM on a 256x256 RGBA texture. The texture is both program memory and display output.

**Texture layout:**
- **Row 0:** Registers (pixel 0 = instruction pointer, pixels 1-32 = general purpose)
- **Rows 1-127:** Program memory (RGBA = opcode, arg1, arg2, arg3)
- **Rows 128-255:** VRAM (display output)

**Opcodes:** NOP(0), SET(1), ADD(2), SUB(3), XOR(4), JMP(5), JNZ(6), VRAM-write(7), STORE(8), LOAD(9). 16 steps per frame.

**Self-modifying code:** Phase 1 (decryption) uses STORE opcode to XOR-patch program memory that Phase 2 (drawing) then executes. The decryption overwrites SET instructions with correct pixel color values before the drawing code runs.

**Why GPU rendering fails:** The GPU runs all pixels in parallel per frame, but the shader tracks only ONE write target per pixel per frame. With multiple VRAM writes per frame, only the last survives — losing 75%+ of pixels. Similarly, STORE patches conflict during parallel decryption.

**Solve via sequential emulation:**
```python
from PIL import Image
import numpy as np

img = Image.open('program.png').convert('RGBA')
state = np.array(img, dtype=np.int32).copy()
regs = [0] * 33

# Phase 1: Trace decryption — apply all STORE patches sequentially
x, y = start_x, start_y
while True:
    r, g, b, a = state[y][x]
    opcode = int(r)
    if opcode == 1: regs[g] = b & 255           # SET
    elif opcode == 4: regs[g] = regs[b] ^ regs[a]  # XOR
    elif opcode == 8:                              # STORE — patches program memory
        tx, ty = regs[g], regs[b]
        state[ty][tx] = [regs[a], regs[a+1], regs[a+2], regs[a+3]]
    elif opcode == 5: break                        # JMP to drawing phase
    x += 1
    if x > 255: x, y = 0, y + 1

# Phase 2: Execute drawing code — all VRAM writes preserved
vram = np.zeros((128, 256), dtype=np.uint8)
# ... trace with opcode 7 writing to vram[ty][tx] = color
Image.fromarray(vram, mode='L').save('output.png')
```

**Key insight:** GLSL shaders are Turing-complete but GPU parallelism causes write conflicts. Self-modifying code (STORE patches) compounds the problem — patches from parallel executions overwrite each other. Sequential emulation in Python recovers the full output. The program.png file IS the bytecode.

**Detection:** WebGL/shader challenge with a PNG "program" file, challenge says "nothing renders" or output is garbled. Look for custom opcode tables in GLSL source.

---

## Instruction Counter as Cryptographic State (MetaCTF Flash 2026)

**Pattern (Who's Counting?):** Hand-written assembly binary uses a dedicated register (e.g., `r12`) as an instruction counter that increments after nearly every instruction. The counter value feeds into XOR, ROL, and multiply transformations on each input byte, making the entire transformation path-dependent on the number of instructions executed before reaching each byte.

**Identification:**
- Hand-written assembly (no compiler patterns, unusual register usage)
- A register that only increments (`inc r12` or `add r12, 1`) appearing after most instructions
- Transformations that reference this counter register (`xor rax, r12`, `rol al, cl` where `cl` derives from counter)
- Sequential byte processing loop where state carries forward

**Solving approach:**
```python
# Byte-by-byte brute force with emulation
# Since each byte's transformation depends on the counter (which depends
# on all prior instructions), state is path-dependent.

from unicorn import *
from unicorn.x86_const import *

def try_byte(known_prefix, candidate_byte):
    """Emulate binary with known prefix + candidate, check output."""
    uc = Uc(UC_ARCH_X86, UC_MODE_64)
    # Map code, stack, data segments
    uc.mem_map(CODE_BASE, 0x10000)
    uc.mem_write(CODE_BASE, binary_code)
    uc.mem_map(STACK_BASE, 0x10000)
    uc.mem_map(DATA_BASE, 0x10000)

    # Write input: known_prefix + candidate
    test_input = known_prefix + bytes([candidate_byte])
    uc.mem_write(DATA_BASE, test_input + b'\x00' * (64 - len(test_input)))

    # Set up registers (rsp, rdi pointing to input, r12 = 0)
    uc.reg_write(UC_X86_REG_RSP, STACK_BASE + 0x8000)
    uc.reg_write(UC_X86_REG_R12, 0)  # instruction counter starts at 0

    try:
        uc.emu_start(CODE_BASE + ENTRY_OFFSET, CODE_BASE + EXIT_OFFSET)
        # Read transformed output, compare against expected
        output = uc.mem_read(OUTPUT_ADDR, len(test_input))
        return output[:len(test_input)] == expected[:len(test_input)]
    except:
        return False

# Recover flag byte by byte
flag = b''
for pos in range(FLAG_LEN):
    for b in range(256):
        if try_byte(flag, b):
            flag += bytes([b])
            print(f"Position {pos}: {chr(b)} -> {flag}")
            break
```

**Key insight:** When a register acts as an instruction counter feeding into byte transformations, the transformation of byte N depends on the exact number of instructions executed while processing bytes 0 through N-1. This makes analytical inversion impractical because the counter value at each byte position depends on the execution path through all prior bytes. Byte-by-byte brute force with full emulation (Unicorn or GDB scripting) is the most reliable approach -- try all 256 values for each position, keeping the state from the correct prefix.

**When to recognize:** Binary has no standard library calls, uses unusual registers consistently, and shows a register that only increments. The transformation per byte involves operations (XOR, rotate, multiply) that reference this counter. Challenge name hints at "counting" or "instructions".

**Alternative approaches:**
- GDB scripting: set breakpoint after each byte's transformation, compare output
- Static analysis: count instructions manually to compute counter values, then invert transforms algebraically (error-prone due to counter accumulation)

**References:** MetaCTF Flash CTF 2026 "Who's Counting?"

---

## Thread Race Condition with Signed Integer Overflow (Codegate 2017)

**Pattern (Hunting):** A combat-simulation binary uses thread-unsafe skill selection. The attack thread checks `skill_id <= 4` using signed comparison, then sleeps briefly before applying damage. During the sleep, switch to a different skill. The fireball skill uses `cdqe` (sign-extend EAX to RAX), converting `0xFFFFFFFF` (icesword damage) to `-1` as a signed 64-bit value. Subtracting `-1` from the boss's HP (`0x7FFFFFFFFFFFFFFF`) causes signed overflow to a negative value, killing the boss.

```python
# Race condition exploit:
# Thread A: select fireball (skill_id=2, passes <= 4 check)
# Thread A: sleeps for animation
# Main: switch to icesword (skill_id=5, damage=0xFFFFFFFF)
# Thread A: wakes, reads damage from icesword slot
# cdqe: 0xFFFFFFFF -> 0xFFFFFFFFFFFFFFFF (-1 signed)
# boss_hp -= (-1) -> boss_hp = 0x7FFFFFFFFFFFFFFF + 1 = negative -> dead

import time, threading
def race():
    select_skill(2)  # fireball - passes bounds check
    time.sleep(0.001)
    select_skill(5)  # icesword - race into damage calculation
```

**Key insight:** `cdqe` (Convert Doubleword to Quadword Extension) sign-extends 32-bit EAX into 64-bit RAX. When the attack code reads a 32-bit damage value and sign-extends it, `0xFFFFFFFF` becomes `-1`. Subtracting a negative number adds to HP, but if HP is already at `INT64_MAX`, the addition overflows to negative, killing the target.

---

## ESP32/Xtensa Firmware Reversing with ROM Symbol Map (Insomni'hack 2017)

**Pattern (Internet of Fail):** ESP32 firmware (Xtensa architecture) with no native IDA support. Use radare2 with the ESP32 ROM linker script (`esp32.rom.ld`) to map function addresses to names. Cross-reference with public ESP32 HTTP server source code to identify the password-checking logic, composed of ~20 conditional XOR functions operating on a global state variable.

```bash
# Load ESP32 firmware in radare2
r2 -a xtensa -b 32 firmware.bin

# Apply ROM symbol map from ESP-IDF
# esp32.rom.ld maps addresses like:
# 0x40000000 = ets_printf
# 0x400013A0 = cache_Read_Enable
# Load as flags: . esp32.rom.ld.r2

# Identify HTTP request handler by cross-referencing
# with esp-idf/examples/protocols/http_server
# Look for URI handler registration patterns
```

**Key insight:** ESP32's Xtensa architecture lacks mainstream RE tool support, but the ESP-IDF SDK provides ROM linker scripts mapping every ROM function address to its name. Loading these as symbols in radare2 immediately resolves hundreds of function calls. Cross-referencing with public ESP-IDF example code identifies application-level patterns (HTTP handlers, WiFi callbacks) even in stripped firmware.

---

## Batch Crackme Automation via objdump Pattern Extraction (DEF CON 2017)

Solve hundreds of identical-structure crackmes by scripting `objdump` to extract comparison values and arithmetic operations, computing keys without execution.

```bash
# Simple variant: extract CMP immediates directly
objdump -M intel -d $binary | grep -P "cmp\s+rdi" | \
    grep -oP "0x\w{1,2}" | xxd -r -p

# Complex variant: parse add/sub/cmp chains and reverse-compute
# Each binary: series of add/sub rdi,N then cmp rdi,target
# Reverse: start from target, undo operations in reverse order
python3 <<'EOF'
import subprocess, re, glob
for binary in sorted(glob.glob("crackmes/*")):
    asm = subprocess.check_output(["objdump", "-M", "intel", "-d", binary]).decode()
    ops = re.findall(r'(add|sub)\s+rdi,(0x\w+)', asm)
    target = int(re.search(r'cmp\s+rdi,(0x\w+)', asm).group(1), 16)
    # Reverse operations
    for op, val in reversed(ops):
        val = int(val, 16)
        target = (target - val) if op == 'add' else (target + val)
    print(chr(target & 0xff), end='')
EOF
```

**Key insight:** Mass crackme challenges (100s-1000s of binaries) have identical structure with per-binary constants. Script `objdump` disassembly parsing to extract immediates and arithmetic sequences, then reverse-compute the key algebraically. No execution or emulation needed.

---

## Fork + Pipe + Dead Branch Anti-Analysis (RCTF 2017)

Binary uses fork/pipe IPC where the parent writes data and exits, child reads from pipe and continues. Key validation is in a dead branch (always-false comparison) that requires binary patching to reach.

```bash
# Detection: fork() + pipe() + read()/write() in main
# The child process reads from pipe, needs to know its own PID

# Dead branch pattern:
# cmp DWORD PTR [ebp-0xc], 0x1  ; compares 0 with 1, always false
# je  real_flag_computation      ; never taken

# Patch: change comparison value from 0x1 to 0x0
# Find: 83 7d f4 01 → change to: 83 7d f4 00
python3 -c "
data = open('binary','rb').read()
data = data.replace(b'\x83\x7d\xf4\x01', b'\x83\x7d\xf4\x00')
open('binary_patched','wb').write(data)
"
```

**Key insight:** Fork+pipe creates a parent-child relationship where the parent provides data and exits. Dead branches (comparisons that always evaluate to false) hide the real validation logic. `strace` reveals the fork/pipe/read pattern; patching the comparison constant reaches the hidden code path.

---

---

## Time-Locked Binary with Date-Based Key (Hack.lu 2017)

Binary reads the system date and only executes correctly on a specific date (e.g., December 21, 2012). The date constant appears in the binary as a Unix timestamp or structured date comparison.

**Detection:** Look for comparisons against large integer constants that fall in a recognizable date range (Unix timestamps: 2012 = ~1.35B, 2017 = ~1.5B). Cultural significance helps: apocalypse dates, CTF release dates, historical events.

```bash
# Set system clock to the required date
sudo date -s "2012-12-21 00:00:00"
./binary

# Or use faketime to avoid system-wide change
LD_PRELOAD=/usr/lib/faketime/libfaketime.so.1 FAKETIME="2012-12-21 00:00:00" ./binary

# Restore system time afterward
sudo ntpdate pool.ntp.org
```

**In IDA/Ghidra:** Search for `time()` or `localtime()` calls. The struct `tm` fields to watch: `tm_year` (years since 1900), `tm_mon` (0-based), `tm_mday`.

**Key insight:** Time-based keys use culturally significant dates. Always check for date comparisons in reversed code and try setting the system clock or using faketime before attempting deeper analysis.

**References:** Hack.lu CTF 2017

---

## ARM Code in Image Pixels via UnicornJS (Hack.lu 2017)

JavaScript challenge embeds ARM bytecode in image pixel data. The image is base64-encoded in the HTML/JS source. Pixel RGBA values encode ARM instructions. A bundled UnicornJS library (ARM CPU emulator in JavaScript) extracts and executes the bytecode.

**Identification flow:**
1. Find base64 blob in JS source → decode → PNG/BMP file
2. Identify UnicornJS import (`unicorn.js`, `uc.js`, or similar) → confirms ARM emulation
3. Pixel extraction loop: RGBA bytes concatenated in raster order form the ARM instruction stream
4. Feed the extracted bytes to an ARM disassembler

```python
from PIL import Image
import capstone

img = Image.open('decoded.png').convert('RGBA')
pixels = list(img.getdata())

# Extract ARM bytecode from pixel data (4 bytes per pixel: R, G, B, A)
arm_code = bytes([channel for pixel in pixels for channel in pixel])

# Disassemble as ARM Thumb or ARM32
md = capstone.Cs(capstone.CS_ARCH_ARM, capstone.CS_MODE_THUMB)
for insn in md.disasm(arm_code, 0x0):
    print(f"0x{insn.address:04x}: {insn.mnemonic} {insn.op_str}")
```

**Key insight:** Multi-layer obfuscation: ARM code in image pixels, base64 encoded, emulated via UnicornJS at runtime. Identify the emulator library first to know which ISA to reverse — the library name reveals the architecture.

**References:** Hack.lu CTF 2017

---

## x86 16-bit MBR psadbw Constraint Solving (CSAW 2017)

Bootable MBR uses SSE2 `psadbw` (Packed Sum of Absolute Differences of Bytes) on xmm registers to validate the flag. Each iteration masks 2 input bytes, computes `psadbw` against known constants, and compares the sum to an expected value.

**`psadbw` semantics:**
```asm
psadbw xmm0, xmm1
; For each of 8 byte pairs: sum += |xmm0[i] - xmm1[i]|
; Result stored as 16-bit integer in low qword of xmm0
```

This generates sum-of-absolute-differences equations:
```text
|a[0] - k[0]| + |a[1] - k[1]| + ... + |a[7] - k[7]| = C
```

**Solution approach:**
```python
import numpy as np
from itertools import product

# For each 2-byte masked group, extract the constants and expected sum
# Equations are not purely linear (absolute value), but printable ASCII
# constrains each byte to [0x20, 0x7e], limiting brute-force space

def solve_psadbw_group(known_constants, expected_sum, printable_range=(0x20, 0x7e)):
    """Brute-force 2 unknown bytes given sum-of-abs-diff constraint."""
    solutions = []
    for a, b in product(range(*printable_range), repeat=2):
        pair = [a, b]
        sad = sum(abs(pair[i] - known_constants[i]) for i in range(len(pair)))
        if sad == expected_sum:
            solutions.append(bytes([a, b]))
    return solutions

# For ambiguous cases with multiple solutions: apply additional constraints
# (flag format prefix, character frequency, subsequent iterations)
```

**Key insight:** `psadbw` creates sum-of-absolute-difference equations — not purely linear but solvable with constrained brute-force when bytes are limited to printable ASCII. Each 2-byte group is independent, keeping the search space to 95^2 = ~9000 candidates per group.

**References:** CSAW CTF 2017

---

## TensorFlow DNN Inversion by Inverting Sigmoid Layers (N1CTF 2018)

**Pattern:** Binary implements a 5-layer deep neural network with sigmoid activation. The input (flag characters) is transformed as `1.0/char_value` before feeding into the network. Extract weights and biases from the binary, then compute the inverse layer-by-layer: apply inverse-sigmoid, subtract bias, multiply by weight matrix inverse.

```python
import numpy as np

def sigmoid_inv(x):
    return -np.log(1.0/x - 1.0)

# Invert layer by layer from output to input
v = target_output
for i in range(num_layers - 1, -1, -1):
    v = np.dot(sigmoid_inv(v) - biases[i], np.linalg.inv(weights[i]))

# Input was 1.0/char, so flag chars are the multiplicative inverse
flag = ''.join(chr(int(round(1.0 / v[j]))) for j in range(len(v)))
```

**Key insight:** Neural networks with invertible activation functions (sigmoid, tanh) and square weight matrices can be mathematically inverted layer-by-layer. Apply inverse-sigmoid, subtract bias, multiply by weight inverse. Watch for input transformations (e.g., 1/x) that must also be inverted.

**Detection:** Binary with TensorFlow or custom DNN implementation. Look for sigmoid/tanh calls, matrix multiplications, and hardcoded float arrays (weights/biases) in `.rodata`. Square weight matrices (N x N) indicate the network is invertible.

**References:** N1CTF 2018

---

## BPF Filter Analysis via JIT Compilation to x64 Assembly (Midnight Sun CTF 2018)

**Pattern:** Binary creates a raw socket with a BPF (Berkeley Packet Filter) attached. When standard BPF disassemblers fail to produce readable output, enable the kernel's BPF JIT compiler to convert BPF bytecode to native x64 assembly, then read the compiled code from dmesg.

```bash
# Enable BPF JIT compilation
echo 1 > /proc/sys/net/core/bpf_jit_enable

# Run the binary, then read JIT-compiled BPF from kernel log
dmesg | grep -A 100 "flen="

# Analysis revealed: expects DNS TXT query on UDP port 3333
dig @target -p 3333 'M4d!bKn3~l' TXT
```

**Key insight:** Linux can JIT-compile BPF filters to native x64 machine code. When standard BPF disassemblers fail or produce unreadable output, enable `bpf_jit_enable` and read the compiled assembly from dmesg. The native code is often easier to understand than BPF bytecode.

**Detection:** Binary using `setsockopt` with `SO_ATTACH_FILTER`, raw socket creation (`socket(AF_PACKET, ...)`), or embedded `struct sock_fprog` structures. BPF programs appear as arrays of `struct sock_filter` (8 bytes each: opcode, jt, jf, k).

**References:** Midnight Sun CTF 2018

---

See also: [patterns-ctf.md](patterns-ctf.md) for Part 1, [patterns-ctf-2.md](patterns-ctf-2.md) for Part 2 (multi-layer self-decrypting binary, embedded ZIP+XOR license, stack string deobfuscation, prefix hash brute-force, CVP/LLL lattice, decision tree obfuscation, GF(2^8) Gaussian elimination).
