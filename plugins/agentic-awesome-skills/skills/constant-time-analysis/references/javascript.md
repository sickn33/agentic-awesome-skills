# Constant-Time Analysis: JavaScript and TypeScript

Analysis guidance for JavaScript and TypeScript. Uses V8 bytecode output from Node.js to detect timing-unsafe operations.

## Prerequisites

- **Node.js** (v14+) - for JavaScript analysis
- **TypeScript compiler** (tsc) - for TypeScript files (existing reviewed installation required for TypeScript)

## Running the Analyzer

```bash
# Analyze JavaScript
uv run {baseDir}/ct_analyzer/analyzer.py crypto.js

# Analyze TypeScript (transpiles first)
uv run {baseDir}/ct_analyzer/analyzer.py crypto.ts

# Include warning-level violations
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.js

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'encrypt|sign' crypto.js

# JSON output for CI
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.js
```

## Dangerous Operations

### Bytecodes (Errors)

| Bytecode | Issue |
|----------|-------|
| Div | Variable-time execution based on operand values |
| Mod | Variable-time execution based on operand values |
| DivSmi | Division by small integer has variable-time execution |
| ModSmi | Modulo by small integer has variable-time execution |

### Functions (Errors)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `Math.sqrt()` | Variable latency based on operand values | Avoid in crypto |
| `Math.pow()` | Variable latency based on operand values | Avoid in crypto |
| `Math.random()` | Predictable | `crypto.getRandomValues()` |
| `eval()` | Unpredictable timing | Avoid entirely |

### Functions (Warnings)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `===` (strings) | Early-terminating | `crypto.timingSafeEqual()` |
| `indexOf()` | Early-terminating | Constant-time search |
| `includes()` | Early-terminating | Constant-time search |
| `startsWith()` | Early-terminating | `crypto.timingSafeEqual()` on prefix |
| `endsWith()` | Early-terminating | `crypto.timingSafeEqual()` on suffix |
| `JSON.stringify()` | Variable-length output | Fixed-length padding |
| `JSON.parse()` | Variable-time based on input | Fixed-length input |
| `btoa()` / `atob()` | Variable-length output | Fixed-length padding |

## Safe Patterns

### String Comparison (Node.js)

```javascript
// VULNERABLE: Early exit on mismatch
if (userToken === storedToken) { ... }

// SAFE: Constant-time comparison (Node.js)
const crypto = require('crypto');
const supplied = Buffer.from(userToken, "utf8");
const expected = Buffer.from(storedToken, "utf8");
// Length is public in this protocol; reject mismatches before the equal-length API.
if (supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)) { ... }
```

### Random Number Generation

```javascript
// VULNERABLE: Predictable
const token = Math.random().toString(36);

// SAFE: Cryptographically secure (Node.js)
const crypto = require('crypto');
const token = crypto.randomBytes(16).toString('hex');

// SAFE: Browser
const array = new Uint8Array(16);
crypto.getRandomValues(array);
```

### Division Operations

A division involving secrets is a review candidate, not automatically an exploitable leak. Do not replace it with a truncated reciprocal-multiply sketch: signedness, overflow, operand bounds and correction steps determine arithmetic correctness. Use a reviewed cryptographic implementation with a documented input domain, then inspect generated native code on the deployment CPU. Python/Ruby integers and JavaScript arithmetic do not become constant-time merely by replacing division with multiplication or masking.

## TypeScript Notes

The analyzer:
1. Looks for `tsconfig.json` in parent directories
2. Transpiles TypeScript to JavaScript in a temp directory
3. Analyzes the transpiled JavaScript
4. Reports violations against the original TypeScript file

If `tsc` is not installed, stop. Do not allow an analyzer to fall back to `npx tsc` or another network-resolved compiler.

## Limitations

### V8 Bytecode Analysis

The analyzer uses `node --print-bytecode` to get V8 bytecode. This has limitations:

1. **JIT Compilation**: V8 may JIT-compile hot functions to native code with different timing characteristics
2. **Function Inlining**: Inlined functions may not appear in bytecode
3. **Deoptimization**: Code can be deoptimized back to bytecode

### Source-Level Detection

The analyzer also performs source-level pattern matching to detect:
- Division (`/`) and modulo (`%`) operators
- Dangerous function calls (`Math.random()`, etc.)

This catches issues that bytecode analysis might miss due to parsing limitations.

`timingSafeEqual` throws for unequal byte lengths and does not make surrounding parsing/control flow constant-time. Fixed-length input or padding does not make JSON parsing or base64 conversion constant-time.

## Browser Considerations

The analyzer targets Node.js V8 bytecode. Browser JavaScript engines (SpiderMonkey, JavaScriptCore) have different bytecode formats and timing characteristics.

For browser-targeted code:
- The V8 analysis is still valuable as a baseline
- Consider additional testing in target browsers
- Use Web Crypto API for cryptographic operations
