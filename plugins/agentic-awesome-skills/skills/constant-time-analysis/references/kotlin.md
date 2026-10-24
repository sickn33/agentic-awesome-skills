# Constant-Time Analysis: Kotlin

Analysis guidance for Kotlin targeting Android and JVM platforms. Kotlin compiles to JVM bytecode, sharing the same runtime characteristics as Java.

## Understanding Kotlin Compilation

Kotlin compiles to JVM bytecode that runs on the same virtual machine as Java:

```text
Source Code (.kt/.kts)
        |
        v
    kotlinc (Kotlin Compiler)
        |
        v
Bytecode (.class files)
        |
        v
    JIT Compiler (HotSpot/ART)
        |
        v
   Native Code (at runtime)
```

**Key implications for Android:**

1. **Android Runtime (ART)** - Android uses ART instead of HotSpot JVM
2. **AOT compilation** - ART uses a combination of interpretation, JIT and AOT compilation; details depend on Android/runtime version
3. **Same bytecode vulnerabilities** - Bytecode flags require native-code review on the actual runtime; not every flagged instruction leaks on every CPU

## Running the Analyzer

```bash
# Analyze Kotlin source
uv run {baseDir}/ct_analyzer/analyzer.py CryptoUtils.kt

# Include conditional branch warnings
uv run {baseDir}/ct_analyzer/analyzer.py --warnings CryptoUtils.kt

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'sign|verify' CryptoUtils.kt

# CI-friendly JSON output
uv run {baseDir}/ct_analyzer/analyzer.py --json CryptoUtils.kt
```

Note: The `--arch` and `--opt-level` flags do not apply to Kotlin as it compiles to JVM bytecode.

## Dangerous Bytecode Instructions

Kotlin compiles to the same JVM bytecode as Java:

| Category | Instructions | Risk |
|----------|--------------|------|
| Integer Division | `idiv`, `ldiv`, `irem`, `lrem` | Variable-time based on operand values |
| Floating Division | `fdiv`, `ddiv`, `frem`, `drem` | Variable latency |
| Conditional Branches | `ifeq`, `ifne`, `iflt`, `ifge`, `ifgt`, `ifle`, `if_icmp*` | Timing leak if condition depends on secrets |
| Table Lookups | `*aload`, `*astore`, `tableswitch`, `lookupswitch` | Cache timing if index depends on secrets |

## Constant-Time Patterns

### Replace Division

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

### Replace Branches

```kotlin
// VULNERABLE: Branch timing reveals secret
val result = if (secret != 0) a else b

// Candidate selection pattern: generated native code still requires review using bitwise ops
val mask = (secret or -secret) shr 31  // -1 if secret != 0, else 0
val result = (a and mask) or (b and mask.inv())
```

### Replace Comparisons

```kotlin
// VULNERABLE: contentEquals() may early-terminate
if (computed.contentEquals(expected)) { ... }

// SAFE: Use MessageDigest.isEqual() for constant-time comparison
import java.security.MessageDigest
if (MessageDigest.isEqual(computed, expected)) { ... }
```

### Secure Random

```kotlin
// VULNERABLE: kotlin.random.Random is predictable
import kotlin.random.Random
val value = Random.nextInt()

// SAFE: Cryptographically secure
import java.security.SecureRandom
val secureRand = SecureRandom()
val value = secureRand.nextInt()

// Or use Kotlin's secure wrapper (requires kotlin-stdlib-jdk8)
import kotlin.random.asKotlinRandom
val secureKotlinRandom = SecureRandom().asKotlinRandom()
```

## Android-Specific Considerations

### Keystore Operations

```kotlin
// Use Android Keystore for cryptographic key storage
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties

val keyGenerator = KeyGenerator.getInstance(
    KeyProperties.KEY_ALGORITHM_AES,
    "AndroidKeyStore"
)
keyGenerator.init(
    KeyGenParameterSpec.Builder(
        "my_key",
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
    )
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .build()
)
```

### Constant-Time Comparison on Android

```kotlin
// Android provides MessageDigest.isEqual()
import java.security.MessageDigest

fun constantTimeEquals(a: ByteArray, b: ByteArray): Boolean {
    return MessageDigest.isEqual(a, b)
}
```

### Secure Random on Android

```kotlin
// SecureRandom works the same on Android
import java.security.SecureRandom

fun generateSecureToken(length: Int): ByteArray {
    val random = SecureRandom()
    val token = ByteArray(length)
    random.nextBytes(token)
    return token
}
```

## Kotlin-Specific Pitfalls

### Extension Functions on Primitives

```kotlin
// DANGEROUS: Division in extension function
fun Int.divideBy(divisor: Int) = this / divisor  // Emits IDIV

// The inline modifier doesn't change bytecode behavior
inline fun Int.divideByInline(divisor: Int) = this / divisor  // Still IDIV
```

### When Expressions

```kotlin
// VULNERABLE: when compiles to tableswitch/lookupswitch
when (secretValue) {
    0 -> handleZero()
    1 -> handleOne()
    else -> handleOther()
}

// Consider constant-time alternatives for secret-dependent dispatch
```

### Null Safety Checks

```kotlin
// Nullable operations may introduce branches
val result = secretNullable?.process()  // Introduces null check branch

// Be aware of null-check timing when handling secrets
```

## Setup Requirements

### Kotlin Compiler

**macOS:**
```bash
brew install kotlin
```

**Ubuntu/Debian:**
```bash
sudo snap install kotlin --classic
```

**Windows:**
```bash
scoop install kotlin
# or
choco install kotlinc
```

### Android Development

For Android projects, the Kotlin compiler is typically bundled with Android Studio. Ensure your project's Kotlin version is up to date in `build.gradle.kts`:

```kotlin
plugins {
    kotlin("jvm") version "<reviewed-project-version>"
}
```

### Verification

```bash
kotlinc -version  # Should show: kotlinc-jvm X.X.X
javap -version    # Required for bytecode disassembly
```

## Common Mistakes

1. **Using kotlin.random.Random** - The default Random is not cryptographically secure; use `java.security.SecureRandom`

2. **Relying on == for byte arrays** - `==` compares references in Kotlin; use `contentEquals()` for value comparison, but neither is constant-time

3. **Infix functions for crypto** - Custom operators don't change timing characteristics of underlying operations

4. **Coroutines timing** - Suspending functions add scheduling overhead that may mask or introduce timing variations

5. **Sealed classes for dispatch** - Pattern matching on sealed classes compiles to switches that may leak timing

## Further Reading

- [Kotlin/JVM Interoperability](https://kotlinlang.org/docs/java-interop.html)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [Bouncy Castle for Kotlin](https://www.bouncycastle.org/java.html) - Constant-time crypto primitives
