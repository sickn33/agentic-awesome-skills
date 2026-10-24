# CTF Reverse - Competition-Specific Patterns (Part 1)

## Table of Contents
- [Hidden Emulator Opcodes + LD_PRELOAD Key Extraction (0xFun 2026)](#hidden-emulator-opcodes--ld_preload-key-extraction-0xfun-2026)
- [Spectre-RSB SPN Cipher — Static Parameter Extraction (0xFun 2026)](#spectre-rsb-spn-cipher--static-parameter-extraction-0xfun-2026)
- [Image XOR Mask Recovery via Smoothness (VuwCTF 2025)](#image-xor-mask-recovery-via-smoothness-vuwctf-2025)
- [Shellcode in Data Section via mmap RWX (VuwCTF 2025)](#shellcode-in-data-section-via-mmap-rwx-vuwctf-2025)
- [Recursive execve Subtraction (VuwCTF 2025)](#recursive-execve-subtraction-vuwctf-2025)
- [Byte-at-a-Time Block Cipher Attack (UTCTF 2024)](#byte-at-a-time-block-cipher-attack-utctf-2024)
- [Mathematical Convergence Bitmap (EHAX 2026)](#mathematical-convergence-bitmap-ehax-2026)
- [Windows PE XOR Bitmap Extraction + OCR (srdnlenCTF 2026)](#windows-pe-xor-bitmap-extraction--ocr-srdnlenctf-2026)
- [Two-Stage Loader: RC4 Gate + VM Constraints (srdnlenCTF 2026)](#two-stage-loader-rc4-gate--vm-constraints-srdnlenctf-2026)
- [Kernel Module Maze Solving (DiceCTF 2026)](#kernel-module-maze-solving-dicectf-2026)
- [Multi-Threaded VM with Channel Synchronization (DiceCTF 2026)](#multi-threaded-vm-with-channel-synchronization-dicectf-2026)
- [Backdoored Shared Library Detection via String Diffing (Hack.lu CTF 2012)](#backdoored-shared-library-detection-via-string-diffing-hacklu-ctf-2012)
- [Custom binfmt Kernel Module with RC4 Flat Binaries (BSidesSF 2026)](#custom-binfmt-kernel-module-with-rc4-flat-binaries-bsidessf-2026)
- [Hash-Resolved Imports / No-Import Ransomware (BSidesSF 2026)](#hash-resolved-imports--no-import-ransomware-bsidessf-2026)
- [ELF Section Header Corruption for Anti-Analysis (BSidesSF 2026)](#elf-section-header-corruption-for-anti-analysis-bsidessf-2026)

---

## Hidden Emulator Opcodes + LD_PRELOAD Key Extraction (0xFun 2026)

**Pattern (CHIP-8):** Non-standard opcode `FxFF` triggers hidden `superChipRendrer()` → AES-256-CBC decryption. Key derived from binary constants.

**Technique:**
1. Check all instruction dispatch branches for non-standard opcodes
2. Hidden opcode may trigger crypto functions (OpenSSL)
3. Use `LD_PRELOAD` hook on `EVP_DecryptInit_ex` to capture AES key at runtime:

```c
#include <openssl/evp.h>
int EVP_DecryptInit_ex(EVP_CIPHER_CTX *ctx, const EVP_CIPHER *type,
                       ENGINE *impl, const unsigned char *key,
                       const unsigned char *iv) {
    // Log key
    for (int i = 0; i < 32; i++) printf("%02x", key[i]);
    printf("\n");
    // Call original
    return ((typeof(EVP_DecryptInit_ex)*)dlsym(RTLD_NEXT, "EVP_DecryptInit_ex"))
           (ctx, type, impl, key, iv);
}
```

```bash
gcc -shared -fPIC -ldl -lssl hook.c -o hook.so
LD_PRELOAD=./hook.so ./emulator rom.ch8
```

---

## Spectre-RSB SPN Cipher — Static Parameter Extraction (0xFun 2026)

**Pattern:** Binary uses cache side channels to implement S-boxes, but ALL cipher parameters (round keys, S-box tables, permutation) are in the binary's data section.

**Key insight:** Don't try to run on special hardware. Extract parameters statically:
- 8 S-boxes × 8 output bits, 256 entries each
- Values `0x340` = bit 1, `0x100` = bit 0
- 64-byte permutation table, 8 round keys

```python
# Extract from binary data section
import struct
sbox = [[0]*256 for _ in range(8)]
for i in range(8):
    for j in range(256):
        val = struct.unpack('<I', data[sbox_offset + (i*256+j)*4 : ...])[0]
        sbox[i][j] = 1 if val == 0x340 else 0
```

**Lesson:** Side-channel implementations embed lookup tables in memory. Extract statically.

---

## Image XOR Mask Recovery via Smoothness (VuwCTF 2025)

**Pattern (Trianglification):** Image divided into triangle regions, each XOR-encrypted with `key = (mask * x - y) & 0xFF` where mask is unknown (0-255).

**Recovery:** Natural images have smooth gradients. Brute-force mask (256 values per region), score by neighbor pixel differences:

```python
import numpy as np
from PIL import Image

img = np.array(Image.open('encrypted.png'))

def score_smoothness(region_pixels, mask, positions):
    decrypted = []
    for (x, y), pixel in zip(positions, region_pixels):
        key = (mask * x - y) & 0xFF
        decrypted.append(pixel ^ key)
    # Score: sum of absolute differences between adjacent pixels
    return -sum(abs(decrypted[i] - decrypted[i+1]) for i in range(len(decrypted)-1))

for region in regions:
    best_mask = max(range(256), key=lambda m: score_smoothness(region, m, positions))
```

**Search space:** 256 candidates × N regions = trivial. Smoothness is a reliable scoring metric for natural images.

---

## Shellcode in Data Section via mmap RWX (VuwCTF 2025)

**Pattern (Missing Function):** Binary relocates data to RWX memory (mmap with PROT_READ|PROT_WRITE|PROT_EXEC) and jumps to it.

**Detection:** Look for `mmap` with PROT_EXEC flag. Embedded shellcode often uses XOR with rotating key.

**Analysis:** Extract data section, apply XOR key (try 3-byte rotating), disassemble result.

---

## Recursive execve Subtraction (VuwCTF 2025)

**Pattern (String Inspector):** Binary recursively calls itself via `execve`, subtracting constants each time.

**Solution:** Find base case and work backward. Often a mathematical relationship like `N * M + remainder`.

---

## Byte-at-a-Time Block Cipher Attack (UTCTF 2024)

**Pattern (PES-128):** First output byte depends only on first input byte (no diffusion).

**Attack:** For each position, try all 256 byte values, compare output byte with target ciphertext. One match per byte = full plaintext recovery without knowing the key.

**Detection:** Change one input byte → only corresponding output byte changes. This means zero cross-byte diffusion = trivially breakable.

---

## Mathematical Convergence Bitmap (EHAX 2026)

**Pattern (Compute It):** Binary classifies complex-plane coordinates by Newton's method convergence. The classification results, arranged as a grid, spell out the flag in ASCII art.

**Recognition:**
- Input file with coordinate pairs (x, y)
- Binary iterates a mathematical function (e.g., z^3 - 1 = 0) and outputs pass/fail
- Grid dimensions hinted by point count (e.g., 2600 = 130×20)
- 5-pixel-high ASCII art font common in CTFs

**Newton's method for z^3 - 1:**
```python
def newton_converges_to_one(px, py, max_iter=50, target_count=12):
    """Returns True if Newton's method converges to z=1 in exactly target_count steps."""
    x, y = px, py
    count = 0
    for _ in range(max_iter):
        f_real = x**3 - 3*x*y**2 - 1.0
        f_imag = 3*x**2*y - y**3
        J_rr = 3.0 * (x**2 - y**2)
        J_ri = 6.0 * x * y
        det = J_rr**2 + J_ri**2
        if det < 1e-9:
            break
        x -= (f_real * J_rr + f_imag * J_ri) / det
        y -= (f_imag * J_rr - f_real * J_ri) / det
        count += 1
        if abs(x - 1.0) < 1e-6 and abs(y) < 1e-6:
            break
    return count == target_count and abs(x - 1.0) < 1e-6 and abs(y) < 1e-6

# Read coordinates and render bitmap
points = [(float(x), float(y)) for x, y in ...]
bits = [1 if newton_converges_to_one(px, py) else 0 for px, py in points]
WIDTH = 130  # 2600 / 20 rows
for r in range(len(bits) // WIDTH):
    print(''.join('#' if bits[r*WIDTH+c] else '.' for c in range(WIDTH)))
```

**Key insight:** The binary is a mathematical classifier, not a flag checker. The flag is in the visual pattern of classifications, not in the binary's output. Reverse-engineer the math, apply to all coordinates, and visualize as bitmap.

---

## Windows PE XOR Bitmap Extraction + OCR (srdnlenCTF 2026)

**Pattern (Artistic Warmup):** Binary renders input text, compares rendered bitmap against expected pixel data stored XOR'd with constant in `.rdata`. No need to compute — extract expected pixels directly.

**Attack:**
1. Reverse the core check function to identify rendering and comparison logic
2. Find the expected pixel blob in `.rdata` (look for large data block referenced near comparison)
3. XOR with constant (e.g., 0xAA) to recover expected rendered DIB
4. Save as image and OCR to recover flag text

```python
import numpy as np
from PIL import Image

with open("binary.exe", "rb") as f:
    data = f.read()

# Extract from .rdata section (offsets from reversing)
blob_offset = 0xC3620  # .rdata offset to XOR'd blob
blob_size = 0x15F90     # 450 * 50 * 4 (BGRA)
blob = np.frombuffer(data[blob_offset:blob_offset + blob_size], dtype=np.uint8)
expected = blob ^ 0xAA  # XOR with constant key

# Reshape as BGRA image (dimensions from reversing)
img = expected.reshape(50, 450, 4)
channel = img[:, :, 0]  # Take one channel (grayscale text)
Image.fromarray(channel, "L").save("target.png")

# OCR with charset whitelist
import subprocess
result = subprocess.run(
    ["tesseract", "target.png", "stdout", "-c",
     "tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}_"],
    capture_output=True, text=True)
print(result.stdout)
```

**Key insight:** When a binary renders text and compares pixels, the expected pixel data is the flag rendered as an image. Extract it directly from the binary data section without needing to understand the rendering logic. OCR with charset whitelist improves accuracy for CTF flag characters.

---

## Two-Stage Loader: RC4 Gate + VM Constraints (srdnlenCTF 2026)

**Pattern (Cornflake v3.5):** Two-stage malware loader — stage 1 uses RC4 username gate, stage 2 downloaded from C2 contains VM-based password validation.

**Stage 1 — RC4 username recovery:**
```python
def rc4(key, data):
    s = list(range(256))
    j = 0
    for i in range(256):
        j = (j + s[i] + key[i % len(key)]) & 0xFF
        s[i], s[j] = s[j], s[i]
    i = j = 0
    out = bytearray()
    for b in data:
        i = (i + 1) & 0xFF
        j = (j + s[i]) & 0xFF
        s[i], s[j] = s[j], s[i]
        out.append(b ^ s[(s[i] + s[j]) & 0xFF])
    return bytes(out)

# Key from binary strings, ciphertext from stored hex
username = rc4(b"s3cr3t_k3y_v1", bytes.fromhex("46f5289437bc009c17817e997ae82bfbd065545d"))
```

**Stage 2 — VM constraint extraction:**
1. Obtain stage 2 from an authorized captured artifact or inert lab fixture; do not contact a live C2 automatically
2. Reverse VM bytecode interpreter (typically 15-20 opcodes)
3. Extract linear equality constraints over flag characters
4. Solve constraint system (Z3 or manual)

**Key insight:** Multi-stage loaders often use simple crypto (RC4) for the first gate and more complex validation (custom VM) for the second. The VM memory may be uninitialized (all zeros), drastically simplifying constraint extraction since memory-dependent operations become constants.

---

## Kernel Module Maze Solving (DiceCTF 2026)

**Pattern (Explorer):** Rust kernel module implements a 3D maze via `/dev/challenge` ioctls. Navigate the maze, avoid decoy exits (status=2), find the real exit (status=1), read the flag.

**Ioctl enumeration:**
| Command | Description |
|---------|-------------|
| `0x80046481-83` | Get maze dimensions (3 axes, 8-16 each) |
| `0x80046485` | Get status: 0=playing, 1=WIN, 2=decoy |
| `0x80046486` | Get wall bitfield (6 directions) |
| `0x80406487` | Get flag (64 bytes, only when status=1) |
| `0x40046488` | Move in direction (0-5) |
| `0x6489` | Reset position |

**DFS solver with decoy avoidance:**
```c
// Minimal static binary using raw syscalls (no libc) for small upload size
// gcc -nostdlib -static -Os -fno-builtin -o solve solve.c -Wl,--gc-sections && strip solve

int visited[16][16][16];
int bad[16][16][16];   // decoy positions across resets

void dfs(int fd, int x, int y, int z) {
    if (x < 0 || x >= 16 || y < 0 || y >= 16 || z < 0 || z >= 16) return;
    if (visited[x][y][z] || bad[x][y][z]) return;
    visited[x][y][z] = 1;

    int status = ioctl_get_status(fd);
    if (status == 1) { read_flag(fd); exit(0); }
    if (status == 2) { bad[x][y][z] = 1; return; }  // decoy — mark bad

    int walls = ioctl_get_walls(fd);
    int dx[] = {1,-1,0,0,0,0}, dy[] = {0,0,1,-1,0,0}, dz[] = {0,0,0,0,1,-1};
    int opp[] = {1,0,3,2,5,4};  // opposite directions for backtracking

    for (int dir = 0; dir < 6; dir++) {
        if (walls & (1 << dir)) continue;  // 1 means wall only if confirmed by this fixture protocol
        ioctl_move(fd, dir);
        dfs(fd, x+dx[dir], y+dy[dir], z+dz[dir]);
        ioctl_move(fd, opp[dir]);  // backtrack
    }
}
// After decoy hit: reset via ioctl 0x6489, clear visited, re-run DFS
```

**Remote deployment:** Upload binary via base64 chunks over netcat shell, decode, execute.

**Key insight:** For kernel module challenges, injecting test binaries into initramfs and probing ioctls dynamically is faster than static RE of stripped kernel modules. Keep solver binary minimal (raw syscalls, no libc) for fast upload.

---

## Multi-Threaded VM with Channel Synchronization (DiceCTF 2026)

**Pattern (locked-in):** Custom stack-based VM runs 16 concurrent threads verifying a 30-char flag. Threads communicate via futex-based channels. Pipeline: input → XOR scramble → transformation → base-4 state machine → final check.

**Analysis approach:**
1. **Identify thread roles** by tracing channel read/write patterns in GDB
2. **Extract constants** (XOR scramble values, lookup tables) via breakpoints on specific opcodes
3. **Watch for inverted logic:** validity check returns 0 for valid, non-zero for blocked (opposite of intuition)
4. **Detect futex quirks:** `unlock_pi` on unowned mutex returns EPERM=1, which can change all computations

**BFS state space search for constrained state machines:**
```python
from collections import deque

def solve_flag(scramble_vals, lookup_table, initial_state, target_state):
    """BFS through state machine to find valid flag bytes."""
    flag = [None] * 30
    # Known prefix/suffix from flag format
    flag[0:5] = list(b'dice{')
    flag[29] = ord('}')

    # For each unknown position, try all printable ASCII
    states = {initial_state}
    for pos in range(28, 4, -1):  # processed in reverse
        next_states = {}
        for state in states:
            for ch in range(32, 127):
                transformed = transform(ch, scramble_vals[pos])
                digits = to_base4(transformed)
                new_state = apply_digits(state, digits, lookup_table)
                if new_state is not None:  # valid path exists
                    next_states.setdefault(new_state, []).append((state, ch))
        states = set(next_states.keys())

    # Trace back from target_state to recover flag
```

**Key insight:** Multi-threaded VMs require tracing data flow across thread boundaries. Channel-based communication creates a pipeline — identify each thread's role (input, transform, validate, output) by watching which channels it reads/writes. Constants that affect computation may come from unexpected sources (futex return values, thread IDs).

---

## Backdoored Shared Library Detection via String Diffing (Hack.lu CTF 2012)

**Pattern (Zombie Lockbox):** A setuid binary uses `strcmp` for password validation. The expected password is visible via `strings` and works under GDB (which drops suid), but fails when run normally. The binary links against a non-standard libc that patches function behavior based on suid status.

**Detection steps:**
1. Check for non-standard library paths with static dynamic-section inspection:
```bash
readelf -d ./binary  # static DT_NEEDED/RPATH/RUNPATH; does not resolve actual runtime paths
# Suspicious: libc.so.6 => /lib/libc/libc.so.6  (non-standard path)
# Normal:    libc.so.6 => /lib32/libc.so.6
```

2. Diff strings between the suspicious and system libc:
```bash
strings /lib/libc/libc.so.6 > suspicious_strings
strings /lib32/libc-2.15.so > normal_strings
diff suspicious_strings normal_strings
```

3. Disassemble the patched function (e.g., `puts`) to find injected code:
```bash
gdb /lib/libc/libc.so.6
(gdb) disas puts
# Look for unexpected calls or branches
# Injected code may check suid status (getuid/geteuid syscalls)
# and swap the expected password at runtime
```

**Key insight:** When a binary behaves differently under GDB vs. normal execution, inspect DT_NEEDED/RPATH/RUNPATH statically for non-standard library paths. Suid binaries drop privileges under debuggers, so a backdoored libc can detect this via `getuid`/`geteuid` syscalls and change program behavior accordingly. The `strings | diff` approach quickly reveals injected data without full disassembly.

---

---

## Custom binfmt Kernel Module with RC4 Flat Binaries (BSidesSF 2026)

**Pattern (Private Binary):** A custom Linux kernel module (`.ko`) registers a `binfmt` handler for non-standard binary formats. When a file with a specific magic number is executed, the kernel module intercepts it, decrypts the contents in memory, and jumps to the entry point.

**Reverse engineering approach:**
1. **Analyze the `.ko`:** Look for `register_binfmt()` call — it registers a `struct linux_binfmt` with a `load_binary` callback
2. **Find the magic number:** The `load_binary` function checks the file's first bytes against a specific magic number to identify its format
3. **Extract the encryption key:** Look for `movabs` instructions loading 8-byte constants — these are often RC4 key bytes
4. **Identify the encryption scheme:** Common choices are RC4, XOR, or AES-ECB. RC4 is identifiable by the S-box initialization loop (256-byte array, swap pattern)
5. **Decrypt the flat binary:** Apply the recovered key to the encrypted file contents, skipping any header

```python
from Crypto.Cipher import ARC4

# Extract RC4 key from kernel module (found via movabs instructions)
key = bytes([0x41, 0x42, 0x43, ...])  # Key bytes from .ko disassembly

with open('encrypted.bin', 'rb') as f:
    header = f.read(HEADER_SIZE)  # Skip binfmt header
    encrypted = f.read()

cipher = ARC4.new(key)
decrypted = cipher.decrypt(encrypted)

# The decrypted output is a flat binary (no ELF headers)
# Load at the fixed virtual address specified in the kernel module
# Disassemble with: objdump -b binary -m i386:x86-64 -D decrypted.bin
# Or in Ghidra: import as "Raw Binary", set base address from .ko
```

**Detection in kernel module:**
- `register_binfmt` / `unregister_binfmt` calls
- `vm_mmap()` or `vm_brk()` for memory allocation at fixed addresses
- Direct jump to mapped memory (entry point execution)
- S-box initialization pattern (RC4): loop 0-255, swap `S[i]` with `S[j]`

**Key insight:** The flat binary has no ELF headers, so standard tools won't recognize it. You must extract the load address from the kernel module (look for the `vm_mmap` call's address argument) and import the decrypted blob at that address in your disassembler. RC4 keys in kernel modules are often stored as immediate values in `mov` or `movabs` instructions rather than in data sections.

**References:** BSidesSF 2026 "Private Binary"

---

## Hash-Resolved Imports / No-Import Ransomware (BSidesSF 2026)

**Pattern (Ran Somewhere):** Malware binary has zero visible imports — all API calls are resolved at runtime by hashing symbol names and comparing against pre-computed hash values. The binary uses `dlopen` + a custom hash table to find libc and libcrypto functions.

**Identification:**
- `readelf -d` shows no dynamic symbols or very few (just `dlopen`/`dlsym`)
- Strings reveal no standard API names
- Disassembly shows hash computation loops followed by indirect calls
- RC4-encrypted embedded strings (RSA public key, file paths, passphrases)

**Defensive analysis:**

Resolve symbol hashes statically or inspect an already authorized capture from a dedicated offline malware-analysis VM. Do not execute ransomware with a writable host bind mount. A container alone does not establish adequate containment, and deterministic keys across runs cannot be assumed. Preserve copies of encrypted files; never run the sample over originals or shared directories.

An earlier hook used the wrong `EVP_CipherInit_ex` signature (missing the `enc` argument), assumed every key was 32 bytes, and wrote secret data into a shared `/tmp` path. That example is not safe to run. A vetted analysis harness must match the exact OpenSSL ABI, handle null/reused cipher/key inputs, restrict key evidence, and fail closed on unresolved symbols. Prefer metadata and bounded synthetic crypto fixtures. For any approved offline decryption, recover the actual key/IV/mode, validate input lengths and authenticated tags or strict padding, and distinguish failed decryption from a valid plaintext. No universal recovery guarantee follows from API hashing.

**References:** BSidesSF 2026 "Ran Somewhere"

---

## ELF Section Header Corruption for Anti-Analysis (BSidesSF 2026)

**Pattern (stubborn-elf):** An ELF binary has deliberately corrupted section header table entries, causing standard analysis tools (`readelf`, `objdump`, IDA, Ghidra) to crash or produce errors. However, the **program headers** (which the OS loader uses) are intact, so the binary executes normally. The flag is appended after the corrupted sections, marked with magic bytes.

```python
import sys

# Standard tools fail on corrupted section headers
# Manual parsing bypasses section headers entirely

with open("stubborn_elf", "rb") as f:
    data = f.read()

# Search for magic marker appended after ELF sections
magic = b"\xDE\xAD\xBE\xEF\xCA\xFE\xBA\xBE"
idx = data.find(magic)
if idx >= 0:
    # Data after magic is XOR-encrypted
    encrypted = data[idx + len(magic):]
    decrypted = bytes(b ^ 0x42 for b in encrypted)
    print(decrypted.decode(errors='ignore'))
```

**Key insight:** ELF execution requires **program headers** (PT_LOAD segments), NOT section headers. Section headers are metadata for debuggers and analysis tools — they're optional at runtime. Corrupting `e_shoff`, `e_shnum`, or `e_shstrndx` in the ELF header breaks tools but not execution. When tools fail, parse the binary manually or patch the ELF header to zero out section header references before loading in a disassembler.

**Recovery approach:**
```bash
# Patch section header offset to 0 (removes section table)
printf '\x00\x00\x00\x00\x00\x00\x00\x00' | dd of=binary-analysis-copy bs=1 seek=40 conv=notrunc
# Now Ghidra/IDA can load it using program headers only

# Or use readelf -l (program headers only, ignores sections)
readelf -l stubborn_elf
```

**When to recognize:** `readelf -S` crashes or shows garbage. `file` command identifies it as ELF. `readelf -l` (lowercase L, program headers) works fine. The binary runs normally despite tool failures.

**References:** BSidesSF 2026 "stubborn-elf"

---

See also: [patterns-ctf-2.md](patterns-ctf-2.md) for Part 2 (multi-layer self-decrypting binary, embedded ZIP+XOR license, stack string deobfuscation, prefix hash brute-force, CVP/LLL lattice, decision tree obfuscation, GF(2^8) Gaussian elimination), [patterns-ctf-3.md](patterns-ctf-3.md) for Part 3 (Z3 boolean circuit, sliding window popcount, keyboard LED Morse code, C++ destructor-hidden validation, VM sequential key-chain brute-force, BWT inversion, OpenType font ligature exploitation, GLSL shader VM with self-modifying code).

## Source and runtime boundaries

All hardcoded layouts/opcodes, IOCTL values and contest results are unverified historical case records. Verify the target before applying them. ELF symbol virtual addresses are not file offsets; map through PT_LOAD/sections and validate lengths. Kernel maze examples omit syscall wrappers/startup and reset/backtracking handling; they are pseudocode, not a complete static binary. Preserve original files and use private fresh outputs. No live C2, third-party client enumeration, malware execution or device probing is authorized by this reference.
