# Constant-Time Analysis: PHP

Analysis guidance for PHP scripts. Uses the VLD extension or OPcache debug output to analyze Zend opcodes.

## Prerequisites

### Installing VLD Extension

The VLD (Vulcan Logic Dumper) extension is required for detailed opcode analysis. OPcache fallback is available but provides less detail.

**Option 1: PECL Install (Recommended)**

```bash
# Query latest version from PECL
VLD_VERSION=$(curl -s https://pecl.php.net/package/vld | grep -oP 'vld-\K[0-9.]+(?=\.tgz)' | head -1)
echo "Latest VLD version: $VLD_VERSION"

# Install via PECL channel URL (avoids version detection issues)
pecl install channel://pecl.php.net/vld-${VLD_VERSION}

# Or if above fails, install with explicit channel:
pecl install https://pecl.php.net/get/vld-${VLD_VERSION}.tgz
```

**Option 2: Build from Source**

```bash
# Clone and build from GitHub
git clone https://github.com/derickr/vld.git
cd vld
phpize
./configure
make
sudo make install

# Add to php.ini
echo "extension=vld.so" | sudo tee -a $(php --ini | grep "Loaded Configuration" | cut -d: -f2 | tr -d ' ')
```

**Verify Installation**

```bash
php -m | grep -i vld
# Should output: vld
```

### macOS with Homebrew PHP

```bash
# Homebrew PHP may need manual extension directory setup
PHP_EXT_DIR=$(php -i | grep extension_dir | awk '{print $3}')
echo "PHP extension directory: $PHP_EXT_DIR"

# After building VLD, copy the extension
sudo cp modules/vld.so "$PHP_EXT_DIR/"
```

## Running the Analyzer

```bash
# Analyze PHP file
uv run {baseDir}/ct_analyzer/analyzer.py crypto.php

# Include warning-level violations
uv run {baseDir}/ct_analyzer/analyzer.py --warnings crypto.php

# Filter to specific functions
uv run {baseDir}/ct_analyzer/analyzer.py --func 'encrypt|decrypt' crypto.php

# JSON output for CI
uv run {baseDir}/ct_analyzer/analyzer.py --json crypto.php
```

## Dangerous Operations

### Opcodes (Errors)

| Opcode | Issue |
|--------|-------|
| DIV | Variable-time execution based on operand values |
| MOD | Variable-time execution based on operand values |
| POW | Variable-time execution |

### Functions (Errors)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `chr()` | Table lookup indexed by secret data | `pack('C', $int)` |
| `ord()` | Table lookup indexed by secret data | `unpack('C', $char)[1]` |
| `bin2hex()` | Table lookups indexed on secret data | Custom constant-time implementation |
| `hex2bin()` | Table lookups indexed on secret data | Custom constant-time implementation |
| `base64_encode()` | Table lookups indexed on secret data | Custom constant-time implementation |
| `base64_decode()` | Table lookups indexed on secret data | Custom constant-time implementation |
| `rand()` | Predictable | `random_int()` |
| `mt_rand()` | Predictable | `random_int()` |
| `array_rand()` | Uses mt_rand internally | `random_int()` |
| `uniqid()` | Predictable | `random_bytes()` |
| `shuffle()` | Uses mt_rand internally | Fisher-Yates with `random_int()` |

### Functions (Warnings)

| Function | Issue | Safe Alternative |
|----------|-------|------------------|
| `strcmp()` | Variable-time | `hash_equals()` |
| `strcasecmp()` | Variable-time | `hash_equals()` |
| `strncmp()` | Variable-time | `hash_equals()` |
| `substr_compare()` | Variable-time | `hash_equals()` |
| `serialize()` | Variable-length output | Fixed-length output |
| `json_encode()` | Variable-length output | Fixed-length output |

## Safe Patterns

### String Comparison

```php
// VULNERABLE: Early exit on mismatch
if ($user_token === $stored_token) { ... }

// SAFE: Constant-time comparison
if (hash_equals($stored_token, $user_token)) { ... }
```

### Random Number Generation

```php
// VULNERABLE: Predictable
$token = bin2hex(random_bytes(16));  // OK - random_bytes is secure
$index = mt_rand(0, count($array) - 1);  // VULNERABLE

// SAFE: Cryptographically secure
$token = bin2hex(random_bytes(16));
$index = random_int(0, count($array) - 1);
```

### Character Operations

```php
// VULNERABLE: Table lookup timing
$byte = ord($secret_char);
$char = chr($secret_byte);

// SAFE: No table lookup
$byte = unpack('C', $secret_char)[1];
$char = pack('C', $secret_byte);
```

## Troubleshooting

### VLD Not Loading

```bash
# Check if extension is enabled
php -i | grep vld

# Check for loading errors
php -d display_errors=1 -d vld.active=1 -r "echo 'test';" 2>&1

# Common issue: wrong extension directory
php -i | grep extension_dir
ls $(php -r "echo ini_get('extension_dir');") | grep vld
```

### OPcache Fallback

If VLD is unavailable, the analyzer falls back to OPcache debug output:

```bash
# Manually test OPcache output
# No OPcache fallback: these flags execute the target. Stop if VLD with vld.execute=0 is unavailable.
```

OPcache provides less detailed output than VLD but still detects division/modulo opcodes.
