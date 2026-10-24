# Constant-Time Analysis: VM-Compiled Languages

Analysis guidance for Java and C#. These languages compile to bytecode (JVM bytecode / CIL) that runs on a virtual machine with Just-In-Time (JIT) compilation to native code.

## Understanding VM-Compiled Languages

Unlike native-compiled languages (C, Rust, Go), Java and C# add an intermediate layer:

```text
Source Code (.java/.cs)
        |
        v
    Compiler (javac/csc)
        |
        v
Bytecode (.class/.dll)
        |
        v
    JIT Compiler (HotSpot/RyuJIT)
        |
        v
   Native Code (at runtime)
```

**Security implications:**

1. **Bytecode is deterministic** - Output depends on compiler version, flags and dependencies
2. **JIT is non-deterministic** - Native code varies by runtime, version, and warmup state
3. **Analysis target** - We analyze bytecode since JIT output is impractical to capture

**Limitations:**

- JIT may introduce timing variations not visible in bytecode
- Runtime optimizations can convert safe bytecode to unsafe native code
- Different JVM/CLR implementations may behave differently

## Running the Analyzer

```bash
# Java
uv run {baseDir}/ct_analyzer/analyzer.py CryptoUtils.java

# C#
uv run {baseDir}/ct_analyzer/analyzer.py CryptoUtils.cs

# Include conditional branch warnings
uv run {baseDir}/ct_analyzer/analyzer.py --warnings CryptoUtils.java

# Filter to specific methods
uv run {baseDir}/ct_analyzer/analyzer.py --func 'sign|verify' CryptoUtils.java

# CI-friendly JSON output
uv run {baseDir}/ct_analyzer/analyzer.py --json CryptoUtils.java
```

Note: The `--arch` and `--opt-level` flags do not apply to VM-compiled languages.

## Dangerous Bytecode Instructions

### JVM Bytecode

| Category | Instructions | Risk |
|----------|--------------|------|
| Integer Division | `idiv`, `ldiv`, `irem`, `lrem` | Variable-time based on operand values |
| Floating Division | `fdiv`, `ddiv`, `frem`, `drem` | Variable latency |
| Conditional Branches | `ifeq`, `ifne`, `iflt`, `ifge`, `ifgt`, `ifle`, `if_icmp*`, `if_acmp*` | Timing leak if condition depends on secrets |
| Table Lookups | `*aload`, `*astore`, `tableswitch`, `lookupswitch` | Cache timing if index depends on secrets |

### CIL (C# / .NET)

| Category | Instructions | Risk |
|----------|--------------|------|
| Integer Division | `div`, `div.un`, `rem`, `rem.un` | Variable-time based on operand values |
| Floating Division | (uses same `div`/`rem` opcodes) | Variable latency |
| Conditional Branches | `beq`, `bne`, `blt`, `bgt`, `ble`, `bge`, `brfalse`, `brtrue` | Timing leak if condition depends on secrets |
| Table Lookups | `ldelem.*`, `stelem.*`, `switch` | Cache timing if index depends on secrets |

## Constant-Time Patterns

### Java

#### Replace Division

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

#### Replace Branches

```java
// VULNERABLE: Branch timing reveals secret
int result;
if (secret != 0) {
    result = a;
} else {
    result = b;
}

// Candidate selection pattern: generated native code still requires review using bitwise ops
int mask = (secret | -secret) >> 31;  // -1 if secret != 0, else 0
int result = (a & mask) | (b & ~mask);
```

#### Replace Comparisons

```java
// VULNERABLE: Arrays.equals() may early-terminate
if (Arrays.equals(computed, expected)) { ... }

// SAFE: Use MessageDigest.isEqual() for constant-time comparison
import java.security.MessageDigest;
if (MessageDigest.isEqual(computed, expected)) { ... }
```

#### Secure Random

```java
// VULNERABLE: Predictable PRNG
Random rand = new Random();
int value = rand.nextInt();

// SAFE: Cryptographically secure
SecureRandom secureRand = new SecureRandom();
int value = secureRand.nextInt();
```

### C# / .NET

#### Replace Division

```csharp
// VULNERABLE: Division instruction emitted
int q = secretValue / divisor;

// SAFE: Barrett reduction (for fixed divisor)
// Precompute: mu = (1UL << 32) / divisor
ulong mu = 0x100000000UL / (ulong)divisor;
int q = (int)(((ulong)secretValue * mu) >> 32);
```

#### Replace Branches

```csharp
// VULNERABLE: Branch timing reveals secret
int result = secret != 0 ? a : b;

// Candidate selection pattern: generated native code still requires review
int mask = -(secret != 0 ? 1 : 0);
int result = (a & mask) | (b & ~mask);

// SIMD or branch-free source alone does not guarantee constant-time native code.
```

#### Replace Comparisons

```csharp
// VULNERABLE: SequenceEqual may early-terminate
if (computed.SequenceEqual(expected)) { ... }

// SAFE: Use CryptographicOperations.FixedTimeEquals (.NET Core 2.1+)
using System.Security.Cryptography;
if (CryptographicOperations.FixedTimeEquals(computed, expected)) { ... }
```

#### Secure Random

```csharp
// VULNERABLE: Predictable PRNG
Random rand = new Random();
int value = rand.Next();

// SAFE: Cryptographically secure
using System.Security.Cryptography;
int value = RandomNumberGenerator.GetInt32(int.MaxValue);
// Or for bytes:
byte[] bytes = RandomNumberGenerator.GetBytes(32);
```

## Platform-Specific Considerations

### Java

- **Bouncy Castle**: Use `org.bouncycastle.util.Arrays.constantTimeAreEqual()` for constant-time comparison
- **JEP 329 (Java 11)**: ChaCha20 and Poly1305 implementations are designed to be constant-time
- **BigInteger**: Operations like `modPow()` may have timing leaks; consider using Bouncy Castle's constant-time implementations

### C# / .NET

- **Span<T>**: Use `CryptographicOperations.FixedTimeEquals(ReadOnlySpan<byte>, ReadOnlySpan<byte>)` for best performance
- **NSec**: Consider using NSec library for constant-time cryptographic primitives
- **BigInteger**: .NET's BigInteger has potential timing leaks; use specialized crypto libraries

## JIT Compiler Caveats

Even if bytecode appears safe, JIT compilers can introduce timing vulnerabilities:

1. **Speculative optimization** - JIT may convert constant-time bytecode to branching native code
2. **Escape analysis** - May inline and optimize in ways that introduce timing
3. **Tiered compilation** - Code behavior may change as it "warms up"

**Mitigations:**

- Test with production JVM/CLR versions
- Consider ahead-of-time (AOT) compilation (GraalVM Native Image, .NET Native AOT)
- For critical code, verify native code output with JIT logging:

```bash
# Java: Print JIT compilation
java -XX:+PrintCompilation -XX:+UnlockDiagnosticVMOptions -XX:+PrintAssembly MyClass

# .NET: Enable tiered compilation diagnostics
DOTNET_TieredCompilation=0 dotnet run  # Disable tiered compilation for consistent behavior
```

## Setup Requirements

### Java

**Required:** JDK 8+ with `javac` and `javap` available.

**Installation:**

```bash
# macOS (Homebrew)
brew install openjdk@21

# Ubuntu/Debian
sudo apt install openjdk-21-jdk

# Windows (via winget)
winget install Microsoft.OpenJDK.21
```

**PATH Configuration (macOS):**

On macOS, Homebrew installs OpenJDK as "keg-only" (not linked to `/usr/local/bin`). You must add it to your PATH:

```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"  # Apple Silicon
# or
export PATH="/usr/local/opt/openjdk@21/bin:$PATH"     # Intel Mac
```

**Verification:**

```bash
javac --version  # Should show: javac 21.x.x
javap -version   # Should show version info
```

**Common Issues:**

- **"Unable to locate a Java Runtime"** on macOS: The system `/usr/bin/javac` is a stub that requires a real JDK. Install OpenJDK via Homebrew.
- **Wrong Java version**: If you have multiple JDKs, use `JAVA_HOME` or ensure the correct one is first in PATH.

### C#

**Required:** .NET SDK 8.0+ with `dotnet` available, plus `ilspycmd` for IL disassembly.

**Installation:**

```bash
# macOS (Homebrew)
brew install dotnet-sdk

# Ubuntu/Debian
sudo apt install dotnet-sdk-8.0

# Windows
winget install Microsoft.DotNet.SDK.8
```

**Install IL Disassembler:**

```bash
dotnet tool install -g ilspycmd
```

**PATH Configuration:**

Ensure the .NET tools directory is in your PATH:

```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH="$HOME/.dotnet/tools:$PATH"
```

**Verification:**

```bash
dotnet --version    # Should show: 8.x.x or higher
ilspycmd --version  # Should show: ilspycmd: 9.x.x
```

**Common Issues:**

- **"ilspycmd requires .NET 8.0 but you have .NET 10.0"**: This happens when ilspycmd targets an older .NET version than your installed SDK. The analyzer automatically handles this on macOS by detecting Homebrew's dotnet@8 installation. Install the compatible runtime:

  ```bash
  # macOS
  brew install dotnet@8

  # Other platforms: install .NET 8.0 runtime alongside your SDK
  ```

- **"IL disassembly tools not found"**: Ensure `ilspycmd` is installed globally and `~/.dotnet/tools` is in your PATH.

- **Source-only fallback**: If IL disassembly fails, the analyzer falls back to source-level analysis. This still detects division operators and dangerous function calls but misses bytecode-level issues.

### Alternative: Mono (Linux/macOS)

For environments without .NET SDK, you can use Mono:

```bash
# macOS
brew install mono

# Ubuntu/Debian
sudo apt install mono-complete

# Verify
mcs --version
monodis --help
```

Note: Mono's `monodis` produces different IL output than `ilspycmd`. The analyzer supports both formats.

## Common Mistakes

1. **Trusting high-level APIs** - `Arrays.equals()` in Java and `SequenceEqual()` in C# are NOT constant-time

2. **Ignoring JIT behavior** - Bytecode analysis is necessary but not sufficient; JIT can introduce leaks

3. **BigInteger operations** - Both platforms' BigInteger implementations may leak timing; use crypto libraries

4. **String comparisons** - Never compare secrets as strings; use byte arrays with constant-time comparison

5. **Exception timing** - Try/catch blocks around secret operations may leak timing through exception handling

## Further Reading

- [Java Cryptography Architecture Guide](https://docs.oracle.com/en/java/javase/17/security/java-cryptography-architecture-jca-reference-guide.html)
- [.NET Cryptography Model](https://docs.microsoft.com/en-us/dotnet/standard/security/cryptography-model)
- [Bouncy Castle Java](https://www.bouncycastle.org/java.html) - Constant-time crypto primitives
- [NSec](https://nsec.rocks/) - Modern cryptographic library for .NET
