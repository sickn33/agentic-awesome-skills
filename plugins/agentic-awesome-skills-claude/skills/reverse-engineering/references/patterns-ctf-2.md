# CTF Reverse - Competition-Specific Patterns (Part 2)

## Table of Contents
- [Multi-Layer Self-Decrypting Binary (DiceCTF 2026)](#multi-layer-self-decrypting-binary-dicectf-2026)
- [Embedded ZIP + XOR License Decryption (MetaCTF 2026)](#embedded-zip--xor-license-decryption-metactf-2026)
- [Stack String Deobfuscation from .rodata XOR Blob (Nullcon 2026)](#stack-string-deobfuscation-from-rodata-xor-blob-nullcon-2026)
- [Prefix Hash Brute-Force (Nullcon 2026)](#prefix-hash-brute-force-nullcon-2026)
- [CVP/LLL Lattice for Constrained Integer Validation (HTB ShadowLabyrinth)](#cvplll-lattice-for-constrained-integer-validation-htb-shadowlabyrinth)
- [Decision Tree Function Obfuscation (HTB WonderSMS)](#decision-tree-function-obfuscation-htb-wondersms)
- [GF(2^8) Gaussian Elimination for Flag Recovery (ApoorvCTF 2026)](#gf28-gaussian-elimination-for-flag-recovery-apoorvctf-2026)
- [ROP Chain Obfuscation in Modified Binary (PlaidCTF 2016)](#rop-chain-obfuscation-in-modified-binary-plaidctf-2016)

---

## Multi-Layer Self-Decrypting Binary (DiceCTF 2026)

**Pattern (another-onion):** Binary with N layers (e.g., 256), each reading 2 key bytes, deriving keystream via SHA-256 NI instructions, XOR-decrypting the next layer, then jumping to it. Must solve within a time limit (e.g., 30 minutes).

**Oracle for correct key:** Wrong key bytes produce garbage code. Correct key bytes produce code with exactly 2 `call read@plt` instructions (next layer's reads). Brute-force all 65536 candidates per layer using this oracle.

**JIT execution approach (fastest):**
```c
// Map binary's memory at original virtual addresses into solver process
// Compile solver at non-overlapping address: -Wl,-Ttext-segment=0x10000000
void *text = mmap((void*)0x400000, text_size, PROT_RWX, MAP_FIXED|MAP_PRIVATE, fd, 0);
void *bss = mmap((void*)bss_addr, bss_size, PROT_RW, MAP_FIXED|MAP_SHARED, shm_fd, 0);

// Patch read@plt to inject candidate bytes instead of reading stdin
// Patch tail jmp/call to next layer with ret/NOP to return from layer

// Fork-per-candidate: COW gives isolated memory without memcpy
for (int candidate = 0; candidate < 65536; candidate++) {
    pid_t pid = fork();
    if (pid == 0) {
        // Child: remap BSS as MAP_PRIVATE (COW from shared file)
        mmap(bss_addr, bss_size, PROT_RW, MAP_FIXED|MAP_PRIVATE, shm_fd, 0);
        inject_key(candidate >> 8, candidate & 0xff);
        ((void(*)())layer_addr)();  // Execute layer as function call
        // Check: does decrypted code contain exactly 2 call read@plt?
        if (count_read_calls(next_layer_addr) == 2) signal_found(candidate);
        _exit(0);
    }
}
```

**Performance tiers:**
| Approach | Speed | 256-layer estimate |
|----------|-------|--------------------|
| Python subprocess | ~2/s | days |
| Ptrace fork injection | ~119/s | 6+ hours |
| JIT + fork-per-candidate | ~1000/s | 140 min |
| JIT + shared BSS + 32 workers | ~3500/s | **~17 min** |

**Shared BSS optimization:** BSS (16MB+) stored in `/dev/shm` as `MAP_SHARED` in parent. Children remap as `MAP_PRIVATE` for COW. Reduces fork overhead from 16MB page-table setup to ~4KB.

**Key insight:** Multi-layer decryption challenges are fundamentally about building fast brute-force engines. JIT execution (mapping binary memory into solver, running code directly as function calls) is orders of magnitude faster than ptrace. Fork-based COW provides free memory isolation per candidate.

**Gotchas:**
- Real binary may use `call` (0xe8) instead of `jmp` (0xe9) for layer transitions — adjust tail patching
- BSS may extend beyond ELF MemSiz via kernel brk mapping — map extra space
- SHA-NI instructions work even when not advertised in `/proc/cpuinfo`

---

## Embedded ZIP + XOR License Decryption (MetaCTF 2026)

**Pattern (License To Rev):** Binary requires a license file as argument. Contains an embedded ZIP archive with the expected license, and an XOR-encrypted flag.

**Recognition:**
- `strings` reveals `EMBEDDED_ZIP` and `ENCRYPTED_MESSAGE` symbols
- Binary is not stripped — `nm` or `readelf -s` shows data symbols in `.rodata`
- `file` shows PIE executable, source file named `licensed.c`

**Analysis workflow:**
1. **Find data symbols:**
```bash
readelf -s binary | grep -E "EMBEDDED|ENCRYPTED|LICENSE"
# EMBEDDED_ZIP at offset 0x2220, 384 bytes
# ENCRYPTED_MESSAGE at offset 0x21e0, 35 bytes
```

2. **Extract embedded ZIP:**
```python
import struct
with open('binary', 'rb') as f:
    data = f.read()
# Find PK\x03\x04 magic in .rodata
zip_start = data.find(b'PK\x03\x04')
# Extract ZIP (size from symbol table or until next symbol)
open('embedded.zip', 'wb').write(data[zip_start:zip_start+384])
```

3. **Extract license from ZIP:**
```bash
unzip embedded.zip  # Contains license.txt
```

4. **XOR decrypt the flag:**
```python
license = open('license.txt', 'rb').read()
enc_msg = open('encrypted_msg.bin', 'rb').read()  # Extract from .rodata
flag = bytes(a ^ b for a, b in zip(enc_msg, license))
print(flag.decode())
```

**Key insight:** No need to run the binary or bypass the expiry date check. The embedded ZIP and encrypted message are both in `.rodata` — extract and XOR offline.

**Disassembly confirms:**
- `memcmp(user_license, decompressed_embedded_zip, size)` — license validation
- Date parsing with `sscanf("%d-%d-%d")` on `EXPIRY_DATE=` field
- XOR loop: `ENCRYPTED_MESSAGE[i] ^ license[i]` → `putc()` per byte

**Lesson:** When a binary has named symbols (`EMBEDDED_*`, `ENCRYPTED_*`), extract data directly from the binary without execution. XOR with known plaintext (the license) is trivially reversible.

---

## Stack String Deobfuscation from .rodata XOR Blob (Nullcon 2026)

**Pattern (stack_strings_1/2):** Binary mmaps a blob from `.rodata`, XOR-deobfuscates it, then uses the blob to validate input. Flag is recovered by reimplementing the verification loop.

**Recognition:**
- `mmap()` call followed by XOR loop over `.rodata` data
- Verification loop with running state (`eax`, `ebx`, `r9`) updated with constants like `0x9E3779B9`, `0x85EBCA6B`, `0xA97288ED`
- `rol32()` operations with position-dependent shifts
- Expected bytes stored in deobfuscated buffer

**Approach:**
1. Extract `.rodata` blob with pyelftools:
   ```python
   from elftools.elf.elffile import ELFFile
   with open(binary, "rb") as f:
       elf = ELFFile(f)
       ro = elf.get_section_by_name(".rodata")
       blob = ro.data()[offset:offset+size]
   ```
2. Recover embedded constants (length, magic values) by XOR with known keys from disassembly
3. Reimplement the byte-by-byte verification loop:
   - Each iteration: compute two hash-like values from running state
   - XOR them together and with expected byte to recover input byte
   - Update running state with constant additions

**Variant (stack_strings_2):** Adds position permutation + state dependency on previous character:
- Position permutation: byte `i` may go to position `pos[i]` in the output
- State dependency: `need = (expected - rol8(prev_char, 1)) & 0xFF`
- Must track `state` variable that updates to current character each iteration

**Key constants to look for:**
- `0x9E3779B9` (golden ratio fractional, common in hash functions)
- `0x85EBCA6B` (MurmurHash3 finalizer constant)
- `0xA97288ED` (related hash constant)
- `rol32()` with shift `i & 7`

---

## Prefix Hash Brute-Force (Nullcon 2026)

**Pattern (Hashinator):** Binary hashes every prefix of the input independently and outputs one digest per prefix. Given N output digests, the flag has N-1 characters.

**Attack:** Recover input one character at a time:
```python
for pos in range(1, len(target_hashes)):
    for ch in charset:
        candidate = known_prefix + ch + padding
        hashes = run_binary(candidate)
        if hashes[pos] == target_hashes[pos]:
            known_prefix += ch
            break
```

**Key insight:** If each prefix hash is independent (no chaining/HMAC), the problem decomposes into `N` x `|charset|` binary executions. This is the hash equivalent of byte-at-a-time block cipher attacks.

**Detection:** Binary outputs multiple hash lines. Changing last character only changes last hash. Different input lengths produce different numbers of output lines.

---

## CVP/LLL Lattice for Constrained Integer Validation (HTB ShadowLabyrinth)

**Pattern:** Binary validates flag via matrix multiplication where grouped input characters are multiplied by coefficient matrices and checked against expected 64-bit results. Standard algebra fails because solutions must be printable ASCII (32-126). Lattice-based CVP (Closest Vector Problem) with LLL reduction solves this efficiently.

**Identification:**
1. Binary groups input characters (e.g., 4 at a time)
2. Each group is multiplied by a coefficient matrix
3. Results compared against hardcoded 64-bit values
4. Need integer solutions in a constrained range (printable ASCII)

**SageMath CVP solver:**
```python
from sage.all import *

def solve_constrained_matrix(coefficients, targets, char_range=(32, 126)):
    """
    coefficients: list of coefficient rows (e.g., 4 values per group)
    targets: expected output values
    char_range: valid character range (printable ASCII)
    """
    n = len(coefficients[0])  # characters per group
    mid = (char_range[0] + char_range[1]) // 2

    # Build lattice: [coeff_matrix | I*scale]
    # The target vector includes adjusted targets
    M = matrix(ZZ, n + len(targets), n + len(targets))
    scale = 1000  # Weight to constrain character range

    for i, row in enumerate(coefficients):
        for j, c in enumerate(row):
            M[j, i] = c
        M[n + i, i] = 1  # padding

    for j in range(n):
        M[j, len(targets) + j] = scale

    target_vec = vector(ZZ, [t - sum(c * mid for c in row)
                              for row, t in zip(coefficients, targets)]
                        + [0] * n)

    # LLL + CVP
    L = M.LLL()
    closest = L * L.solve_left(target_vec)  # or use Babai
    solution = [closest[len(targets) + j] // scale + mid for j in range(n)]
    return bytes(solution)
```

**Two-phase validation pattern:**
1. **Phase 1 (matrix math):** Solve via CVP/LLL → recovers first N characters
2. First N characters become AES key → decrypt `file.bin` (XOR last 16 bytes + AES-256-CBC + zlib decompress)
3. **Phase 2 (custom VM):** Decrypted bytecode runs in custom VM, validates remaining characters via another linear system (mod 2^32)

**Modular linear system solving (Phase 2 — VM validation):**
```python
import numpy as np
from sympy import Matrix

# M * x = v (mod 2^32)
M_mod = Matrix(coefficients) % (2**32)
v_mod = Matrix(targets) % (2**32)
# Gaussian elimination in Z/(2^32)
solution = M_mod.solve(v_mod)  # Returns flag characters
```

**Key insight:** When a binary validates input through linear combinations with large coefficients and the solution must be in a small range (printable ASCII), this is a lattice problem in disguise. LLL reduction + CVP finds the nearest lattice point, recovering the constrained solution. Cross-reference: invoke `/ctf-crypto` for LLL/CVP fundamentals (advanced-math.md in ctf-crypto).

**Detection:** Binary performs matrix-like operations on grouped input, compares against 64-bit constants, and a brute-force search space is too large (e.g., 256^4 per group × 12 groups).

---

## Decision Tree Function Obfuscation (HTB WonderSMS)

**Pattern:** Binary routes input through ~200+ auto-generated functions, each computing a polynomial expression from input positions, comparing against a constant, and branching left/right. The tree makes static analysis impractical without scripted extraction.

**Identification:**
1. Large number of similar functions with random-looking names (e.g., `f315732804`)
2. Each function computes arithmetic on specific input positions
3. Functions call other tree functions or a final validation function
4. Decompiled code shows `if (expr cmp constant) call_left() else call_right()`

**Ghidra headless scripting for mass extraction:**
```python
# Extract comparison constants from all tree functions
# Run via: analyzeHeadless project/ tmp -import binary -postScript extract_tree.py
from ghidra.program.model.listing import *
from ghidra.program.model.symbol import *

fm = currentProgram.getFunctionManager()
results = []
for func in fm.getFunctions(True):
    name = func.getName()
    if name.startswith('f') and name[1:].isdigit():
        # Find CMP instruction and extract immediate constant
        inst_iter = currentProgram.getListing().getInstructions(func.getBody(), True)
        for inst in inst_iter:
            if inst.getMnemonicString() == 'CMP':
                operand = inst.getOpObjects(1)
                if operand:
                    results.append((name, int(operand[0].getValue())))
```

**Constraint propagation from known output format:**
1. Start from known output bytes (e.g., `http://HTB{...}`) → fix several input positions
2. Fixed positions cascade through arithmetic constraints → determine dependent positions
3. Tree root equation pins down remaining free variables
4. Recognize English words in partial flag to disambiguate multiple solutions

**Key insight:** Auto-generated decision trees look overwhelming but are repetitive by construction. Script the extraction (Ghidra, Binary Ninja, radare2) rather than reversing each function manually. The tree is just a dispatcher — the real logic is in the leaf function and its constraints.

**Detection:** Binary with hundreds of similarly-structured functions, 3-5 input position references per function, branching to two other functions or a common leaf.

---

## GF(2^8) Gaussian Elimination for Flag Recovery (ApoorvCTF 2026)

**Pattern (Forge):** Stripped binary performs Gaussian elimination over GF(2^8) (Galois Field with 256 elements, using the AES polynomial). A matrix and augmentation vector are embedded in `.rodata`. The solution vector is the flag.

**GF(2^8) arithmetic with AES polynomial (x^8+x^4+x^3+x+1 = 0x11b):**
```python
def gf_mul(a, b):
    """Multiply in GF(2^8) with AES reduction polynomial."""
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xff
        if hi:
            a ^= 0x1b  # Reduction: x^8 = x^4+x^3+x+1
        b >>= 1
    return p

def gf_inv(a):
    """Brute-force multiplicative inverse (fine for 256 elements)."""
    if a == 0: return 0
    for x in range(1, 256):
        if gf_mul(a, x) == 1:
            return x
    return 0
```

**Solving the linear system:**
```python
# Extract N×N matrix + N-byte augmentation from binary .rodata
N = 56  # Flag length
# Build augmented matrix: N rows × (N+1) cols

for col in range(N):
    # Find non-zero pivot
    pivot = next((r for r in range(col, N) if aug[r][col] != 0), -1)
    if pivot != col:
        aug[col], aug[pivot] = aug[pivot], aug[col]
    # Scale pivot row by inverse
    inv = gf_inv(aug[col][col])
    aug[col] = [gf_mul(v, inv) for v in aug[col]]
    # Eliminate column in all other rows
    for row in range(N):
        if row == col: continue
        factor = aug[row][col]
        if factor == 0: continue
        aug[row] = [v ^ gf_mul(factor, aug[col][j]) for j, v in enumerate(aug[row])]

flag = bytes(aug[i][N] for i in range(N))
```

**Key insight:** GF(2^8) is NOT regular integer arithmetic — addition is XOR, multiplication uses polynomial reduction. The AES polynomial (0x11b) is the most common; look for the constant `0x1b` in disassembly. The binary may encrypt the result with AES-GCM afterward, but the raw solution vector (pre-encryption) is the flag.

**Detection:** Binary with a large matrix in `.rodata` (N² bytes), XOR-based row operations, constants `0x1b` or `0x11b`, and flag length matching sqrt of matrix size.

---

## ROP Chain Obfuscation in Modified Binary (PlaidCTF 2016)

**Pattern (quite quixotic quest):** Modified `curl` binary with a custom `--pctfkey KEY` option. Key validation replaces `esp` with a buffer address and returns into a ~250KB ROP chain stored in a `magic_buf` symbol. The ROP chain validates the key through XOR, MD5, and constant comparisons.

**Analysis approach:**

1. **Detect the ROP dispatch:** Look for `mov esp, eax; ret` or similar stack pivot — this redirects execution into the ROP chain
2. **Dump the ROP chain:** Script GDB to disassemble instructions after each return address in the chain:
```python
# GDB script to trace ROP gadgets
import gdb

magic_buf = 0x080b0000  # symbol address
buf_size = 0x40000       # quarter megabyte
offset = 0

while offset < buf_size:
    addr = int.from_bytes(gdb.selected_inferior().read_memory(magic_buf + offset, 4), 'little')
    gdb.execute(f'x/3i {addr}')
    # Advance past the gadget (typically 4 bytes per return address)
    offset += 4
```

3. **Identify patterns in the chain:** Look for unrolled loops (repeated gadget sequences), `pop` instructions that skip data, and `ret imm16` that skip large blocks
4. **Reconstruct the algorithm:** The chain typically performs:
   - Key length check (compare with constant)
   - Character-level operations (sum ASCII values, XOR with constants)
   - Hash computation (MD5 of derived value)
   - Hash prefix comparison
   - XOR of input with hash as keystream
   - Comparison with embedded constants

5. **Extract and solve:** Dump the embedded constants, brute-force any intermediate values (e.g., character sum → MD5 with matching prefix), then XOR to recover the key:
```python
import hashlib

# Brute-force the sum that produces correct MD5 prefix
target_prefix = 0xc0050bdd  # extracted from ROP chain
for s in range(128 * 0x35):  # max sum of printable chars * key_length
    h = hashlib.md5(str(s ^ xor_constant).encode()).hexdigest()
    if int(h[:8], 16) == target_prefix:
        md5_key = bytes.fromhex(h)
        break

# XOR embedded values with MD5 keystream to get flag
flag = bytes(v ^ md5_key[i % 16] for i, v in enumerate(embedded_values))
```

**Key insight:** ROP chain obfuscation ("ROPfuscation") hides algorithms in chains of return-oriented gadgets. The chain looks incomprehensible as raw addresses but becomes analyzable when you: (a) dump each gadget's disassembly, (b) filter repetitions and skip regions, (c) annotate register effects. The chain is functionally equivalent to normal code — it just uses `ret` instead of sequential execution. Large chains (100K+ gadgets) often contain unrolled loops that compress to ~1000 lines of pseudocode.

See also: [patterns-ctf.md](patterns-ctf.md) for Part 1 (hidden emulator opcodes, SPN static extraction, image XOR smoothness, byte-at-a-time cipher, mathematical convergence bitmap, Windows PE XOR bitmap OCR, two-stage RC4+VM loaders, kernel module maze solving, multi-threaded VM channels). [patterns-ctf-3.md](patterns-ctf-3.md) for Part 3 (Z3 single-line Python circuit, sliding window popcount, keyboard LED Morse code, C++ destructor-hidden validation, syscall side-effect memory corruption, MFC dialog event handlers, VM sequential key-chain brute-force, Burrows-Wheeler transform inversion, OpenType font ligature exploitation, GLSL shader VM with self-modifying code, instruction counter as cryptographic state).
