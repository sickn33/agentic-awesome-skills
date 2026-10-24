# Constant-Time Analysis: Swift

Analysis guidance for Swift targeting iOS, macOS, watchOS, and tvOS. Swift compiles to native code, making it subject to the same CPU-level timing side-channels as C, C++, Go, and Rust.

## Understanding Swift Compilation

Swift compiles directly to native machine code:

```text
Source Code (.swift)
        |
        v
    swiftc (Swift Compiler / LLVM)
        |
        v
   Native Assembly
        |
        v
   Machine Code (binary)
```

**Key implications:**

1. **Same vulnerabilities as C** - Division, branches, and table lookups have data-dependent timing
2. **LLVM backend** - Swift uses LLVM, so analysis is similar to clang-compiled code
3. **Architecture matters** - x86_64 (Mac) and arm64 (iOS devices, Apple Silicon) have different instruction sets

## Running the Analyzer

```bash
# Analyze Swift for native architecture
uv run {baseDir}/ct_analyzer/analyzer.py crypto.swift

# Analyze for iOS device (arm64)
uv run {baseDir}/ct_analyzer/analyzer.py --arch arm64 crypto.swift

# Analyze for Intel Mac
uv run {baseDir}/ct_analyzer/analyzer.py --arch x86_64 crypto.swift

# Test multiple optimization levels (RECOMMENDED)
uv run {baseDir}/ct_analyzer/analyzer.py --opt-level O0 crypto.swift
uv run {baseDir}/ct_analyzer/analyzer.py --opt-level O2 crypto.swift

# Include conditional branch warnings
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.swift

# CI-friendly JSON output
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.swift
```

## Dangerous Instructions by Architecture

### ARM64 (iOS devices, Apple Silicon Macs)

| Category | Instructions | Risk |
|----------|--------------|------|
| Division | `UDIV`, `SDIV` | Early termination optimization; variable-time |
| Floating-Point | `FDIV`, `FSQRT` | Variable latency based on operand values |
| Conditional Branches | `B.EQ`, `B.NE`, `CBZ`, `CBNZ`, etc. | Timing leak if condition depends on secrets |

### x86_64 (Intel Macs)

| Category | Instructions | Risk |
|----------|--------------|------|
| Division | `DIV`, `IDIV`, `DIVQ`, `IDIVQ` | Data-dependent timing |
| Floating-Point | `DIVSS`, `DIVSD`, `SQRTSS`, `SQRTSD` | Variable latency |
| Conditional Branches | `JE`, `JNE`, `JZ`, `JNZ`, etc. | Timing leak if condition depends on secrets |

## Constant-Time Patterns

### Replace Division

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

### Replace Branches

```swift
// VULNERABLE: Branch timing reveals secret
let result = secret != 0 ? a : b

// Candidate selection pattern: generated native code still requires review using bitwise ops
// For Int32 inputs; wrapping subtraction avoids the Int32.min negation trap:
let nonZero = (secret | (0 &- secret)) >> 31  // -1 if secret != 0, else 0
let result = (a & nonZero) | (b & ~nonZero)
```

### Replace Comparisons

`timingSafeCompare` is not a built-in CryptoKit/Data API. For MAC verification use CryptoKit's `HMAC.isValidAuthenticationCode(_:authenticating:using:)`; do not replace it with an unverified byte loop. Swift optimizations, bounds checks and integer overflow traps can change timing even when source appears branchless.

### Secure Random

```swift
// General-purpose API: use the explicitly selected cryptographic API below for keys
import Foundation
let value = Int.random(in: 0..<100)  // Uses arc4random, generally OK but not verified

// SAFE: Use CryptoKit (iOS 13+, macOS 10.15+)
import CryptoKit
import Security

// Generate secure random bytes
var randomBytes = [UInt8](repeating: 0, count: 32)
let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
guard status == errSecSuccess else { /* handle error */ }

// Or use SymmetricKey for key generation
let key = SymmetricKey(size: .bits256)
```

## Apple Platform Considerations

### Using CryptoKit (Recommended)

CryptoKit provides constant-time implementations for common operations:

```swift
import CryptoKit

// HMAC (constant-time internally)
let key = SymmetricKey(size: .bits256)
let signature = HMAC<SHA256>.authenticationCode(for: data, using: key)

// AES-GCM encryption
let sealedBox = try AES.GCM.seal(plaintext, using: key)

// Curve25519 key agreement
let privateKey = Curve25519.KeyAgreement.PrivateKey()
let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: peerPublicKey)
```

### Security Framework

```swift
import Security

// Generate cryptographically secure random data
func secureRandomBytes(count: Int) -> Data? {
    var bytes = [UInt8](repeating: 0, count: count)
    let status = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
    return status == errSecSuccess ? Data(bytes) : nil
}

// Keychain for secure storage
func storeInKeychain(key: Data, account: String) -> Bool {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrAccount as String: account,
        kSecValueData as String: key
    ]
    return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
}
```

## Swift-Specific Pitfalls

### Optional Unwrapping

```swift
// Branching on optionals
if let secret = maybeSecret {  // Introduces branch
    process(secret)
}

// Guard statements also branch
guard let secret = maybeSecret else { return }
```

### Pattern Matching

```swift
// Switch/case compiles to branching code
switch secretEnum {
case .optionA: handleA()  // Branch
case .optionB: handleB()  // Branch
}
```

### Array Subscripting

```swift
// Array access indexed by secret leaks via cache timing
let value = lookupTable[secretIndex]  // Cache timing side-channel
```

### String Operations

```swift
// String comparison is NOT constant-time
if secretString == expectedString { ... }  // Variable-time

// Character iteration may also have timing variations
for char in secretString { ... }
```

## Setup Requirements

### Xcode (Recommended)

Install Xcode from the Mac App Store. The Swift compiler is included.

```bash
# Verify installation
swiftc --version
```

### Swift Toolchain (Alternative)

Download from [swift.org](https://swift.org/download/) for standalone installation.

```bash
# Verify
swiftc --version
```

### Cross-Compilation

For analyzing code targeting different architectures:

```bash
# Analyze for iOS device
uv run {baseDir}/ct_analyzer/analyzer.py --arch arm64 crypto.swift

# Analyze for iOS simulator
uv run {baseDir}/ct_analyzer/analyzer.py --arch x86_64 crypto.swift
```

## Common Mistakes

1. **Using Swift's == for byte comparison** - Standard equality comparison may early-terminate; use constant-time comparison

2. **Trusting CryptoKit for all operations** - CryptoKit provides constant-time primitives, but combining them incorrectly can introduce vulnerabilities

3. **String manipulation on secrets** - Swift strings have complex internal representations; timing varies with content

4. **Ignoring optimization levels** - Swift's optimizer can transform safe source code into unsafe assembly; test at multiple -O levels

5. **Platform availability** - CryptoKit requires iOS 13+/macOS 10.15+; older platforms need alternative implementations

## Testing on Different Architectures

Always test your cryptographic code on actual target architectures:

```bash
# Apple Silicon Mac (arm64)
uv run {baseDir}/ct_analyzer/analyzer.py crypto.swift

# Cross-compile for Intel
uv run {baseDir}/ct_analyzer/analyzer.py --arch x86_64 crypto.swift
```

## Further Reading

- [Apple CryptoKit Documentation](https://developer.apple.com/documentation/cryptokit)
- [Apple Security Framework](https://developer.apple.com/documentation/security)
- [Swift.org Security](https://swift.org/blog/swift-5-release/)
- [OWASP iOS Security Guide](https://owasp.org/www-project-mobile-security-testing-guide/)
