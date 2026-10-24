# FFUF (Fuzz Faster U Fool) Skill - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Overview
FFUF is a fast web fuzzer written in Go, designed for discovering hidden content, directories, files, subdomains, and testing for vulnerabilities during penetration testing. Throughput depends on target, limits and workload; do not assume a performance advantage.


## Installation
```bash
# Using Go
# Select a reviewed exact version before installation; do not use latest implicitly.
go install github.com/ffuf/ffuf/v2@<reviewed-version>

# Using Homebrew (macOS)
brew install ffuf

# Binary download
# Download from: https://github.com/ffuf/ffuf/releases/latest
```


## Core Concepts

### The FUZZ Keyword
The `FUZZ` keyword is used as a placeholder that gets replaced with entries from your wordlist. You can place it anywhere:
- URLs: `https://target.example/FUZZ`
- Headers: `-H "Host: FUZZ"`
- POST data: `-d "username=admin&password=FUZZ"`
- Multiple locations with custom keywords: `-w wordlist.txt:CUSTOM` then use `CUSTOM` instead of `FUZZ`

### Multi-wordlist Modes
- **clusterbomb**: Tests all combinations (default) - cartesian product
- **pitchfork**: Iterates through wordlists in parallel (1-to-1 matching)
- **sniper**: Tests one position at a time (for multiple FUZZ positions)


## Common Use Cases

### 1. Directory and File Discovery
```bash
# Basic directory fuzzing
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ'

# With file extensions
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -e .php,.html,.txt,.pdf

# Colored and verbose output
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -c -v

# With recursion (finds nested directories)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -recursion -recursion-depth 2
```

### 2. Subdomain Enumeration
```bash
# Virtual host discovery
ffuf -w /path/to/subdomains.txt -u 'https://target.example' -H "Host: FUZZ.target.example" -fs 4242

# Note: -fs 4242 filters out responses of size 4242 (adjust based on default response size)
```

### 3. Parameter Fuzzing
```bash
# GET parameter names
ffuf -w /path/to/params.txt -u 'https://target.example/script.php?FUZZ=test_value' -fs 4242

# GET parameter values
ffuf -w /path/to/values.txt -u 'https://target.example/script.php?id=FUZZ' -fc 401

# Multiple parameters
ffuf -w params.txt:PARAM -w values.txt:VAL -u 'https://target.example/?PARAM=VAL' -mode clusterbomb
```

### 4. POST Data Fuzzing
```bash
# Basic POST fuzzing
ffuf -w /path/to/passwords.txt -X POST -d "username=admin&password=FUZZ" -u 'https://target.example/login.php' -fc 401

# JSON POST data
ffuf -w entries.txt -u 'https://target.example/api' -X POST -H "Content-Type: application/json" -d '{"name": "FUZZ", "key": "value"}' -fr "error"

# Fuzzing multiple POST fields
ffuf -w users.txt:USER -w passes.txt:PASS -X POST -d "username=USER&password=PASS" -u 'https://target.example/login' -mode pitchfork
```

### 5. Header Fuzzing
```bash
# Custom headers
ffuf -w /path/to/wordlist.txt -u 'https://target.example' -H "X-Custom-Header: FUZZ"

# Multiple headers
ffuf -w /path/to/wordlist.txt -u 'https://target.example' -H "User-Agent: FUZZ" -H "X-Forwarded-For: 127.0.0.1"
```


## Filtering and Matching

### Matchers (Include Results)
- `-mc`: Match status codes (default: 200-299,301,302,307,401,403,405,500)
- `-ml`: Match line count
- `-mr`: Match regex
- `-ms`: Match response size
- `-mt`: Match response time (e.g., `>100` or `<100` milliseconds)
- `-mw`: Match word count

### Filters (Exclude Results)
- `-fc`: Filter status codes (e.g., `-fc 404,403,401`)
- `-fl`: Filter line count
- `-fr`: Filter regex (e.g., `-fr "error"`)
- `-fs`: Filter response size (e.g., `-fs 42,4242`)
- `-ft`: Filter response time
- `-fw`: Filter word count

### Auto-calibration and baseline validation

`-ac` sends extra calibration requests and can suppress real results. Use only within
the approved request budget; compare unfiltered baseline/canary responses before
choosing it. Record exact flags, calibration values, filtered counts, errors and
stopped/incomplete runs. Never assume a supplied result set used calibration or
that an empty filtered result proves no accessible resources.

```bash
# Local authorized lab example, 1 worker / 1 req/s / 20-second total budget.
ffuf -w approved-small-list.txt -u 'https://target.example/FUZZ' -ac -t 1 -rate 1 -maxtime 20 -timeout 5 -mc all
```

## Rate Limiting and Timing

### Rate Control
```bash
# Limit to 2 requests per second (stealth mode)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -rate 2

# Add delay between requests (0.1 to 2 seconds random)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -p 0.1-2.0

# Set number of concurrent threads (default: 40)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -t 10
```

### Time Limits
```bash
# Maximum total execution time (60 seconds)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -maxtime 60

# Maximum time per job (useful with recursion)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -maxtime-job 60 -recursion
```


## Output Options

### Output Formats
```bash
# JSON output
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -o results.json

# HTML output
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -of html -o results.html

# CSV output
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -of csv -o results.csv

# All formats
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -of all -o results

# Silent mode (no progress, only results)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -s

# Pipe to file with tee
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -s | tee results.txt
```


## Advanced Techniques

### Using Raw HTTP Requests (Critical for Authenticated Fuzzing)
This is one of the most powerful features of ffuf, especially for authenticated requests with complex headers, cookies, or tokens.

**Workflow:**
1. Capture a full authenticated request (from Burp Suite, browser DevTools, etc.)
2. Save it to a file (e.g., `req.txt`)
3. Replace the value you want to fuzz with the `FUZZ` keyword
4. Use the `--request` flag

```bash
# From a file containing raw HTTP request
ffuf --request req.txt -w /path/to/wordlist.txt -ac
```

**Example req.txt file:**
```http
POST /api/v1/users/FUZZ HTTP/1.1
Host: target.example
User-Agent: Mozilla/5.0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Cookie: session=abc123xyz; csrftoken=def456
Content-Type: application/json

{"action":"view","id":"1"}
```

**Use Cases:**
- Fuzzing authenticated endpoints with complex auth headers
- Testing API endpoints with JWT tokens
- Fuzzing with CSRF tokens, session cookies, and custom headers
- Testing endpoints that require specific User-Agents or Accept headers
- POST/PUT/DELETE requests with authentication

**Pro Tips:**
- You can place FUZZ in multiple locations: URL path, headers, body
- Use `-request-proto https` if needed (default is https)
- Always use `-ac` to filter out authenticated "not found" or error responses
- Great for IDOR testing: fuzz user IDs, document IDs, etc. in authenticated contexts

```bash
# Common authenticated fuzzing patterns
ffuf --request req.txt -w user_ids.txt -ac -mc 200 -o results.json

# With multiple FUZZ positions using custom keywords
ffuf --request req.txt -w endpoints.txt:ENDPOINT -w ids.txt:ID -mode pitchfork -ac
```

### Proxy Usage
```bash
# HTTP proxy (useful for Burp Suite)
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -x http://127.0.0.1:8080

# SOCKS5 proxy
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -x socks5://127.0.0.1:1080

# Replay matched requests through proxy
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -replay-proxy http://127.0.0.1:8080
```

### Cookie and Authentication
```bash
# Using cookies
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -b "sessionid=abc123; token=xyz789"

# Client certificate authentication
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -cc client.crt -ck client.key
```

### Encoding
```bash
# URL encoding
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -enc 'FUZZ:urlencode'

# Multiple encodings
ffuf -w /path/to/wordlist.txt -u 'https://target.example/FUZZ' -enc 'FUZZ:urlencode b64encode'
```

### Testing for Vulnerabilities
```bash
# SQL injection testing
ffuf -w sqli_payloads.txt -u 'https://target.example/page.php?id=FUZZ' -fs 1234

# XSS testing
ffuf -w xss_payloads.txt -u 'https://target.example/search?q=FUZZ' -mr "<script>"

# Command injection
ffuf -w cmdi_payloads.txt -u 'https://target.example/execute?cmd=FUZZ' -fr "error"
```

### Multiple targets

Do not interpolate untrusted URLs into `sh -c` or split `$(cat targets.txt)`.
Validate each approved HTTPS authority/path and a total cross-target request budget;
use an argument-array process runner with one target at a time. Recursion, extensions,
Cartesian products, calibration and replay requests all increase actual request count.

## Best Practices

### 1. Validate calibration
Use `-ac` only after checking the baseline and budget; the following is illustrative:
```bash
ffuf -w wordlist.txt -u 'https://target.example/FUZZ' -ac
```

### 2. Use Raw Requests for Authentication
Don't struggle with command-line flags for complex auth. Capture the full request and use `--request`:
```bash
# 1. Capture authenticated request from Burp/DevTools
# 2. Save to req.txt with FUZZ keyword in place
# 3. Run with -ac
ffuf --request req.txt -w wordlist.txt -ac -o results.json
```

### 3. Use Appropriate Wordlists
- **Directory discovery**: SecLists Discovery/Web-Content (raft-large-directories.txt, directory-list-2.3-medium.txt)
- **Subdomains**: SecLists Discovery/DNS (subdomains-top1million-5000.txt)
- **Parameters**: SecLists Discovery/Web-Content (burp-parameter-names.txt)
- **Usernames**: SecLists Usernames
- **Passwords**: SecLists Passwords
- Source: https://github.com/danielmiessler/SecLists

### 3. Rate limiting for agreed load
Set owner-approved rate, concurrency and global duration; no rate guarantees safety or invisibility:
```bash
ffuf -w wordlist.txt -u 'https://target.example/FUZZ' -rate 2 -t 10
```

### 4. Filter Strategically
- Check the default response first to identify common response sizes, status codes, or patterns
- Use `-fs` to filter by size or `-fc` to filter by status code
- Combine filters: `-fc 403,404 -fs 1234`

### 5. Save Results Appropriately
Always save results to a file for later analysis:
```bash
ffuf -w wordlist.txt -u 'https://target.example/FUZZ' -o results.json -of json
```

### 6. Use Interactive Mode
Press ENTER during execution to drop into interactive mode where you can:
- Adjust filters on the fly
- Save current results
- Restart the scan
- Manage the queue

### 7. Recursion Depth
Be careful with recursion depth to avoid getting stuck in infinite loops or overwhelming the server:
```bash
ffuf -w wordlist.txt -u 'https://target.example/FUZZ' -recursion -recursion-depth 2 -maxtime-job 120
```


## Common Patterns and One-Liners

### Quick Directory Scan
```bash
ffuf -w ~/wordlists/common.txt -u 'https://target.example/FUZZ' -mc 200,301,302,403 -ac -c -v
```

### Comprehensive Scan with Extensions
```bash
ffuf -w ~/wordlists/raft-large-directories.txt -u 'https://target.example/FUZZ' -e .php,.html,.txt,.bak,.old -ac -c -v -o results.json
```

### Authenticated Fuzzing (Raw Request)
```bash
# 1. Save your authenticated request to req.txt with FUZZ keyword
# 2. Run:
ffuf --request req.txt -w ~/wordlists/api-endpoints.txt -ac -o results.json -of json
```

### API Endpoint Discovery
```bash
ffuf -w ~/wordlists/api-endpoints.txt -u 'https://api.target.example/v1/FUZZ' -H "Authorization: Bearer TOKEN" -mc 200,201 -ac -c
```

### Subdomain Discovery with Auto-Calibration
```bash
ffuf -w ~/wordlists/subdomains-top5000.txt -u 'https://FUZZ.target.example' -ac -c -v
```

### POST Login Brute Force
```bash
ffuf -w ~/wordlists/passwords.txt -X POST -d "username=admin&password=FUZZ" -u 'https://target.example/login' -fc 401 -rate 5 -ac
```

### IDOR Testing with Auth
```bash
# Use req.txt with authenticated headers and FUZZ in the ID parameter
ffuf --request req.txt -w numbers.txt -ac -mc 200 -fw 100-200
```


## Configuration File
Create `~/.config/ffuf/ffufrc` for default settings:
```
[http]
headers = ["User-Agent: Mozilla/5.0"]
timeout = 10

[general]
colors = true
threads = 1

[matcher]
status = "200-299,301,302,307,401,403,405,500"
```


## Troubleshooting

### Too Many False Positives
- Use `-ac` for auto-calibration
- Check default response and filter by size with `-fs`
- Use regex filtering with `-fr`

### Too Slow
- Check the approved request/concurrency budget before changing workers; prefer reducing scope
- Reduce wordlist size
- Use `-ignore-body` if you don't need response content

### Getting Blocked
- Reduce rate: `-rate 2`
- Add delays: `-p 0.5-1.5`
- Reduce threads: `-t 10`
- Stop on blocking, 429, sustained errors or service impact; coordinate with the owner instead of evading controls

### Missing Results
- Check if you're filtering too aggressively
- Use `-mc all` to see all responses
- Disable auto-calibration temporarily
- Use verbose mode `-v` to see what's happening


## Resources
- Official GitHub: https://github.com/ffuf/ffuf
- Wiki: https://github.com/ffuf/ffuf/wiki
- Codingo's Guide: https://codingo.io/tools/ffuf/bounty/2020/09/17/everything-you-need-to-know-about-ffuf.html
- Practice Lab: http://ffuf.me
- SecLists Wordlists: https://github.com/danielmiessler/SecLists


## Quick Reference Card

| Task | Command Template |
|------|------------------|
| Directory Discovery | `ffuf -w wordlist.txt -u 'https://target.example/FUZZ' -ac` |
| Subdomain Discovery | `ffuf -w subdomains.txt -u 'https://FUZZ.target.example' -ac` |
| Parameter Fuzzing | `ffuf -w params.txt -u 'https://target.example/page?FUZZ=value' -ac` |
| POST Data Fuzzing | `ffuf -w wordlist.txt -X POST -d "param=FUZZ" -u 'https://target.example/endpoint'` |
| With Extensions | Add `-e .php,.html,.txt` |
| Filter Status | Add `-fc 404,403` |
| Filter Size | Add `-fs 1234` |
| Rate Limit | Add `-rate 2` |
| Save Output | Add `-o results.json` |
| Verbose | Add `-c -v` |
| Recursion | Add `-recursion -recursion-depth 2` |
| Through Proxy | Add `-x http://127.0.0.1:8080` |


## Missing upstream resources and interpretation limits

`resources/WORDLISTS.md`, `REQUEST_TEMPLATES.md` and `ffuf_helper.py` are not
bundled. Do not invoke them or claim they analyzed a result. Review any separately
obtained helper before use. Raw request files contain credentials: create privately
with mode 0600 through a local editor/secret-aware tooling, exclude from Git and
shared logs, use test identities and delete/revoke them under the retention plan.
Command-line `-H`/`-b` tokens can leak through process lists/history. Output and HTML
reports may contain hostile target strings or private paths; inspect as inert data.

All command fragments require explicit target scope, approved small wordlists,
`-t`, `-rate`, `-maxtime` and per-request `-timeout`; they are alternatives, not a
batch to run. Login fuzzing needs separate lockout-safe approval and controlled
accounts, never public password lists by default. Use a controlled pair of owned
IDs for IDOR checks rather than enumerating other users. Host-header fuzzing tests
routing on the contacted endpoint, not DNS discovery or SNI for every guessed host.
Preserve TLS verification and do not follow redirects outside authorized scope.

Status/size/regex/timing differences are candidates, not proof of SQLi, XSS, command
execution or IDOR. Validate a minimal synthetic canary with its exact context and
expected unauthorized outcome; reflected `<script>` alone does not prove execution.
No fuzzing, third-party lab access, helper run or finding validation occurred here.
