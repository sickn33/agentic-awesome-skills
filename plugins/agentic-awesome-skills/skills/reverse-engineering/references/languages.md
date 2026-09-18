# CTF Reverse - Language-Specific Techniques

## Table of Contents
- [Python Bytecode Reversing (dis.dis output)](#python-bytecode-reversing-disdis-output)
  - [Common Pattern: XOR Validation with Split Indices](#common-pattern-xor-validation-with-split-indices)
  - [Bytecode Analysis Tips](#bytecode-analysis-tips)
- [Python Opcode Remapping](#python-opcode-remapping)
  - [Identification](#identification)
  - [Recovery](#recovery)
- [Pyarmor 8/9 Static Unpack (1shot)](#pyarmor-89-static-unpack-1shot)
- [DOS Stub Analysis](#dos-stub-analysis)
- [HarmonyOS HAP/ABC Reverse (abc-decompiler)](#harmonyos-hapabc-reverse-abc-decompiler)
- [Brainfuck/Esolangs](#brainfuckesolangs)
  - [Brainfuck Character-by-Character Static Analysis (BSidesSF 2026)](#brainfuck-character-by-character-static-analysis-bsidessf-2026)
  - [Brainfuck Side-Channel via Read Count Oracle (BSidesSF 2026)](#brainfuck-side-channel-via-read-count-oracle-bsidessf-2026)
  - [Brainfuck Comparison Idiom Detection (BSidesSF 2026)](#brainfuck-comparison-idiom-detection-bsidessf-2026)
- [UEFI Binary Analysis](#uefi-binary-analysis)
- [Transpilation to C](#transpilation-to-c)
- [Code Coverage Side-Channel Attack](#code-coverage-side-channel-attack)
- [Functional Language Reversing (OPAL)](#functional-language-reversing-opal)
- [Python Version-Specific Bytecode (VuwCTF 2025)](#python-version-specific-bytecode-vuwctf-2025)
- [Non-Bijective Substitution Cipher Reversing](#non-bijective-substitution-cipher-reversing)
- [FRACTRAN Program Inversion (Boston Key Party 2016)](#fractran-program-inversion-boston-key-party-2016)

For platform/framework-specific techniques (Android, Electron, Node.js, Verilog, Ruby/Perl polyglot, etc.), see [languages-platforms.md](languages-platforms.md).
For Go and Rust binary reversing, see [languages-compiled.md](languages-compiled.md).

---

## Python Bytecode Reversing (dis.dis output)

### Common Pattern: XOR Validation with Split Indices

Challenge gives raw CPython bytecode (dis.dis disassembly). Common pattern:
1. Check flag length
2. XOR chars at even indices with key1, compare to list p1
3. XOR chars at odd indices with key2, compare to list p2

**Reversing:**
```python
# Given: p1, p2 (expected values), key1, key2 (XOR keys)
flag = [''] * flag_length
for i in range(len(p1)):
    flag[2*i] = chr(p1[i] ^ key1)      # Even indices
    flag[2*i+1] = chr(p2[i] ^ key2)    # Odd indices
print(''.join(flag))
```

### Bytecode Analysis Tips
- `LOAD_CONST` followed by `COMPARE_OP` reveals expected values
- `BINARY_XOR` identifies the transformation
- `BUILD_TUPLE`/`BUILD_LIST` with constants = expected output array
- Loop structure: `FOR_ITER` + `BINARY_SUBSCR` = iterating over flag chars
- `CALL_FUNCTION` on `ord` = character-to-int conversion

**Key insight:** Python bytecode challenges give you the algorithm in explicit stack operations. Focus on `LOAD_CONST` values (expected outputs), `BINARY_XOR`/`BINARY_ADD` (the transform), and `BUILD_TUPLE` (the target array) to reconstruct the validation logic without running the bytecode.

---

## Python Opcode Remapping

### Identification
Decompiler fails with opcode errors.

### Recovery
1. Find modified `opcode.pyc` in PyInstaller bundle
2. Compare with original Python opcodes
3. Build mapping: `{new_opcode: original_opcode}`
4. Patch target .pyc
5. Decompile normally

**Shortcut (Hack.lu CTF 2013):** If the challenge bundles its own modified Python interpreter (e.g., a custom `./py` binary), install `uncompyle2`/`uncompyle6` into that interpreter's environment and decompile using the challenge's own runtime. The modified interpreter understands its own opcode mapping, so standard decompilation tools work without manual opcode recovery.

**Tool selection by Python version:** `uncompyle6` supports Python 2.x–3.8. For Python 3.9+ bytecode, use [`pycdc`](https://github.com/zrax/pycdc) (compile from source: `git clone && cmake . && make`).

**Key insight:** Opcode remapping breaks all standard decompilers. The fastest fix is to find the modified `opcode.pyc` in the PyInstaller bundle, diff it against the stock Python opcodes, and patch the target `.pyc` back to standard opcodes before decompiling.

---

## Pyarmor 8/9 Static Unpack (1shot)

- Tool: `Lil-House/Pyarmor-Static-Unpack-1shot`
- Use for Pyarmor 8.x/9.x armored scripts without executing sample code
- Quick signature check: payload typically starts with `PY` + six digits (Pyarmor 7 and earlier `PYARMOR` format is not supported)

Workflow:
1. Ensure target directory contains armored scripts and matching `pyarmor_runtime` library.
2. Run one-shot unpack to emit `.1shot.` outputs (disassembly + experimental decompile).
3. Treat disassembly as ground truth; verify decompiled source with bytecode when inconsistent.

```bash
python /path/to/oneshot/shot.py /path/to/scripts
```

Optional flags:
```bash
# Specify runtime explicitly
python /path/to/oneshot/shot.py /path/to/scripts -r /path/to/pyarmor_runtime.so

# Write outputs to another directory
python /path/to/oneshot/shot.py /path/to/scripts -o /path/to/output
```

Notes:
- `oneshot/pyarmor-1shot` executable must exist before running `shot.py`.
- PyInstaller bundles or archives should be unpacked first, then processed with 1shot.

**Key insight:** Pyarmor 8/9 wraps scripts with runtime decryption. The 1shot tool statically unpacks without execution by directly processing the armored bytecode and `pyarmor_runtime` library. Treat the disassembly output as ground truth when the experimental decompiled source looks inconsistent.

---

## DOS Stub Analysis

PE files can hide code in DOS stub:
1. Check for large DOS stub in Ghidra/IDA
2. Run in DOSBox
3. Load in IDA as 16-bit DOS
4. Look for `int 16h` (keyboard input)

**Key insight:** PE files can embed a fully functional 16-bit DOS program in the DOS stub (before the PE header). If the stub is unusually large, load it in IDA as 16-bit DOS or run it in DOSBox -- the challenge logic may live entirely in the stub.

---

## HarmonyOS HAP/ABC Reverse (abc-decompiler)

- Target files: `.hap` package and embedded `.abc` bytecode
- Tool: `https://github.com/ohos-decompiler/abc-decompiler`
- Download `jadx-dev-all.jar` from releases

Critical startup note:
- `java -jar` may enter GUI mode
- For CLI mode, always use:

```bash
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI [options] <input>
```

Most common commands:
```bash
# Basic decompile to directory
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI -d "out" ".abc"

# Decompile .abc (recommended for this scenario)
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI -m simple -d "out_hap" "modules.abc"
```

Recommended parameters for this challenge:
- `-m simple`: reduce high-level reconstruction to avoid SSA/PHI-heavy failures
- `--log-level ERROR`: keep only critical errors
- Full recommended command:

```bash
java -cp "./jadx-dev-all.jar" jadx.cli.JadxCLI -m simple --log-level ERROR -d "out_abc_simple" "modules.abc"
```

Parameter quick reference:
- `-d` output directory
- `--help` help

Notes:
- `.hap` is a package: extract it first (zip), then locate and analyze `.abc`
- Quote paths containing spaces or non-ASCII characters
- Use a new output directory name per run to avoid stale results
- Errors do not always mean full failure; prioritize `out_xxx/sources/`
- If `auto` fails, switch to `-m simple` first

Standard workflow:
1. Run with `-m simple --log-level ERROR`
2. Inspect key business files in output (for example `pages/Index.java`)
3. If cleaner output is needed, retry with `-m auto` or `-m restructure`
4. If some methods still fail, keep the `simple` output and continue logic analysis via alternate paths

**Key insight:** HarmonyOS `.hap` packages are ZIP archives containing `.abc` bytecode. Use the abc-decompiler's CLI mode (`jadx.cli.JadxCLI`) with `-m simple` for the most reliable decompilation -- GUI mode may launch instead of processing files.

---

## Brainfuck/Esolangs

- Check if compiled with known tools (BF-it)
- Understand tape/memory model
- Static analysis of cell operations

### Brainfuck Character-by-Character Static Analysis (BSidesSF 2026)

**Pattern (i-love-my-bf-part1):** BF programs that validate input character-by-character follow a recognizable pattern: `,` (read char) followed by a sequence of `+` operations whose count equals the expected ASCII value of that character.

**Extraction technique:**
```python
import re

bf_code = open('challenge.bf', 'r').read()

# Split on comma (input read) — each segment handles one character
segments = bf_code.split(',')
expected = []

for seg in segments[1:]:  # Skip preamble before first comma
    # Count consecutive '+' operations before any branch/output
    plus_count = 0
    for ch in seg:
        if ch == '+':
            plus_count += 1
        elif ch in '-.[]><':
            break  # Stop at first non-increment operation
    if plus_count > 0:
        expected.append(chr(plus_count % 256))

flag = ''.join(expected)
print(f"Flag: {flag}")
```

**Variations:**
- `-` operations: character value = `256 - minus_count`
- Mixed `+`/`-`: net increment determines value
- Cell reset (`[-]`) between characters: each segment is independent
- Loop-based multiplication: `[->>+++<<]` multiplies by 3 — count the inner operations

**Detection:** Large BF file with repeating pattern of `,` followed by many `+` or `-` characters, then a comparison structure (`[-]` or `[->+<]` patterns).

**Key insight:** BF programs that check input are structurally simple — each input byte is compared against a constant built by incrementing a cell. Extract the increment counts to recover the expected input without running the program.

**References:** BSidesSF 2026 "i-love-my-bf-part1"

### Brainfuck Side-Channel via Read Count Oracle (BSidesSF 2026)

**Pattern (i-love-my-bf-part2):** When a BF program validates input character-by-character, a correct character causes the program to consume MORE input bytes (advancing to check the next position). By counting how many `,` (read) operations execute for each candidate input, the character that triggers the most reads is correct.

```python
import itertools

def bytes_read_running_bf(bf_code, input_iter, braces):
    """Run BF and count how many input bytes were consumed."""
    tape = [0] * 30000
    ptr = ip = reads = 0
    input_list = list(input_iter)
    input_idx = 0
    while ip < len(bf_code):
        c = bf_code[ip]
        if c == ',':
            if input_idx < len(input_list):
                tape[ptr] = input_list[input_idx]
                input_idx += 1
                reads += 1
            else:
                return reads
        elif c == '.': pass
        elif c == '+': tape[ptr] = (tape[ptr] + 1) % 256
        elif c == '-': tape[ptr] = (tape[ptr] - 1) % 256
        elif c == '>': ptr += 1
        elif c == '<': ptr -= 1
        elif c == '[' and tape[ptr] == 0: ip = braces[ip]
        elif c == ']' and tape[ptr] != 0: ip = braces[ip]
        ip += 1
    return reads

# Recover flag character by character
PRINTABLE = list(range(32, 127))
flag = []
for pos in range(50):  # max flag length
    best_byte = None
    max_reads = 0
    baseline = bytes_read_running_bf(bf, flag + [PRINTABLE[0]], braces)
    for b in PRINTABLE[1:]:
        reads = bytes_read_running_bf(bf, flag + [b], braces)
        if reads > baseline:
            best_byte = b
            break
    if best_byte is None:
        break
    flag.append(best_byte)
print(bytes(flag).decode())
```

**Key insight:** BF input validation programs are sequential — they read one character, check it, and only read the next if it matches. The character causing more reads is correct because the program advances past the validation gate to check the next position.

**References:** BSidesSF 2026 "i-love-my-bf-part2"

### Brainfuck Comparison Idiom Detection (BSidesSF 2026)

**Pattern (i-love-my-bf-part3):** BF programs compiled from higher-level languages use recognizable comparison idioms. The equality check `<[-<->] +<[>-<[-]]>[-<+>]` compares two adjacent cells. By instrumenting a BF interpreter to detect this pattern during execution, you can extract the comparison operands (expected flag bytes) directly from the tape.

```python
EQ_PATTERN = "<[-<->] +<[>-<[-]]>[-<+>]"

def instrumented_bf_run(bf_code, dummy_input):
    """Run BF, detect equality comparisons, extract operands."""
    tape = [0] * 30000
    ptr = ip = 0
    comparisons = []

    while ip < len(bf_code):
        # Check if current position starts the eq pattern
        if bf_code[ip:ip+len(EQ_PATTERN)] == EQ_PATTERN:
            # The two cells being compared are at ptr-2 and ptr-1
            lhs = tape[ptr - 2]  # User input byte
            rhs = tape[ptr - 1]  # Expected byte
            comparisons.append((chr(lhs), chr(rhs)))
        # ... normal BF execution ...
        ip += 1

    return comparisons

# Expected bytes from comparisons reveal the flag
```

**Key insight:** Compiled BF programs reuse fixed idioms for operations like equality comparison, conditional branching, and loops. Pattern-matching these idioms in the BF source or during execution lets you extract constants without fully understanding the program logic.

**Common BF idioms:**
- `[-]` — clear cell (set to 0)
- `[->+<]` — move cell right
- `<[-<->] +<[>-<[-]]>[-<+>]` — equality comparison of two cells

**References:** BSidesSF 2026 "i-love-my-bf-part3"

---

## UEFI Binary Analysis

```bash
7z x firmware.bin -oextracted/
file extracted/* | grep "PE32+"
```

- Bootkit replaces boot loader
- Custom VM protects decryption
- Lift VM bytecode to C

**Key insight:** UEFI binaries are PE32+ executables. Extract the firmware with `7z`, identify PE files with `file`, and load them in Ghidra/IDA. Bootkits replace the boot loader, so focus on DXE drivers and boot services protocols for the challenge logic.

---

## Transpilation to C

For heavily obfuscated code:
```python
for opcode, args in instructions:
    if opcode == 'XOR':
        print(f"r{args[0]} ^= r{args[1]};")
    elif opcode == 'ADD':
        print(f"r{args[0]} += r{args[1]};")
```

Compile with `-O3` for constant folding.

**Key insight:** Transpiling obfuscated VM bytecode to C and compiling with `-O3` lets the compiler's constant folding and dead code elimination simplify the algorithm automatically. This is faster than manual deobfuscation for complex instruction sets.

---

## Code Coverage Side-Channel Attack

**Pattern (Coverup, Nullcon 2026):** PHP challenge provides XDebug code coverage data alongside encrypted output.

**How it works:**
- PHP code uses `xdebug_start_code_coverage(XDEBUG_CC_UNUSED | XDEBUG_CC_DEAD_CODE | XDEBUG_CC_BRANCH_CHECK)`
- Encryption uses data-dependent branches: `if ($xored == chr(0)) ... if ($xored == chr(1)) ...`
- Coverage JSON reveals which branches were executed during encryption
- This leaks the set of XOR intermediate values that occurred

**Exploitation:**
```python
import json

# Load coverage data
with open('coverage.json') as f:
    cov = json.load(f)

# Extract executed XOR values from branch coverage
executed_xored = set()
for line_no, hit_count in cov['encrypt.php']['lines'].items():
    if hit_count > 0:
        # Map line numbers to the chr(N) value in the if-statement
        executed_xored.add(extract_value_from_line(line_no))

# For each position, filter candidates
for pos in range(len(ciphertext)):
    candidates = []
    for key_byte in range(256):
        xored = plaintext_byte ^ key_byte  # or reverse S-box lookup
        if xored in executed_xored:
            candidates.append(key_byte)
    # Combined with known plaintext prefix, this uniquely determines key
```

**Key insight:** Code coverage is a powerful oracle — it tells you which conditional paths were taken. Any encryption with data-dependent branching leaks information through coverage.

**Mitigation detection:** Look for branchless/constant-time crypto implementations that defeat this attack.

---

## Functional Language Reversing (OPAL)

**Pattern (Opalist, Nullcon 2026):** Binary compiled from OPAL (Optimized Applicative Language), a purely functional language.

**Recognition markers:**
- `.impl` (implementation) and `.sign` (signature) source files
- `IMPLEMENTATION` / `SIGNATURE` keywords
- Nested `IF..THEN..ELSE..FI` structures
- Functions named `f1`, `f2`, ... `fN` (numeric naming)
- Heavy use of `seq[nat]`, `string`, `denotation` types

**Reversing approach:**
1. Pure functions are mathematically invertible — reverse each step in the pipeline
2. Identify the transformation chain: `f_final(f_n(...f_2(f_1(input))...))`
3. For each function, build the inverse

**Aggregate brute-force for scramble functions:**
When a transformation accumulates state that depends on original (unknown) values:
```python
# Example: f8 adds cumulative offset based on parity of original bytes
# offset contribution per element depends on whether pre-scramble value is even/odd
# Total offset S = sum of contributions, but S mod 256 has only 256 possibilities

decoded = base64_decode(target)
for total_offset_S in range(256):
    candidate = [(b - total_offset_S) % 256 for b in decoded]
    # Verify: recompute S from candidate values
    recomputed_S = sum(contribution(i, candidate[i]) for i in range(len(candidate))) % 256
    if recomputed_S == total_offset_S:
        # Apply remaining inverse steps
        result = apply_inverse_substitution(candidate)
        if all(32 <= c < 127 for c in result):
            print(bytes(result))
```

**Key lesson:** When a scramble function has a chicken-and-egg dependency (result depends on original, which is unknown), brute-force the aggregate effect (often mod 256 = 256 possibilities) rather than all possible states (exponential).

---

## Python Version-Specific Bytecode (VuwCTF 2025)

**Pattern (A New Machine):** Challenge targets specific Python version (e.g., 3.14.0 alpha).

**Key requirement:** Compile that exact Python version to disassemble bytecode — alpha/beta versions have different opcodes than stable releases.

```bash
# Build specific Python version
wget https://www.python.org/ftp/python/3.14.0/Python-3.14.0a4.tar.xz
tar xf Python-3.14.0a4.tar.xz
cd Python-3.14.0a4 && ./configure && make -j$(nproc)
./python -c "import dis, marshal; dis.dis(marshal.loads(open('challenge.pyc','rb').read()[16:]))"
```

**Common validation:** Flag compared against tuple of squared ASCII values:
```python
# Reverse: flag[i] = sqrt(expected_tuple[i])
import math
flag = ''.join(chr(int(math.isqrt(v))) for v in expected_values)
```

---

## Non-Bijective Substitution Cipher Reversing

**Pattern (Coverup, Nullcon 2026):** S-box/substitution table has collisions (multiple inputs map to same output).

**Detection:**
```python
sbox = [...]  # substitution table
if len(set(sbox)) < len(sbox):
    print("Non-bijective! Collisions exist.")
```

**Building reverse lookup:**
```python
from collections import defaultdict
rev_sub = defaultdict(list)
for i, v in enumerate(sbox):
    rev_sub[v].append(i)
# rev_sub[output] = [list of possible inputs]
```

**Disambiguation strategies:**
1. Known plaintext format (e.g., `ENO{`, `flag{`) fixes key bytes at known positions
2. Side-channel data (code coverage, timing) eliminates impossible candidates
3. Printable ASCII constraint (32-126) reduces candidate space
4. Re-encrypt candidates and verify against known ciphertext

---

## FRACTRAN Program Inversion (Boston Key Party 2016)

FRACTRAN: an esoteric language where computation is iterated multiplication by a fraction table. Input is encoded as prime factorization (ASCII values as exponents of sequential primes). To invert: swap each fraction's numerator and denominator, run the "success" output backward through the inverted program.

```python
# Original: for each step, find first fraction where n*frac is integer
def fractran_step(n, fractions):
    for num, den in fractions:
        if (n * num) % den == 0:
            return (n * num) // den
    return None  # Halt

# Inversion: swap num/denom in fraction table
inverted = [(d, n) for n, d in fraction_table]
# Run target output through inverted program to recover input
```

**Key insight:** FRACTRAN programs can be inverted by swapping numerators and denominators. The prime factorization encoding is the key to understanding I/O -- factor the result to extract exponents of sequential primes, map to ASCII.

**Detection:** Challenge mentions fractions, prime factorization, or provides a list of rational numbers.
