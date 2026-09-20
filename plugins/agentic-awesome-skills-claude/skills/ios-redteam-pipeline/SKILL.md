---
name: ios-redteam-pipeline
description: End-to-end iOS red-team pipeline
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
sources: public_research, frida_docs, objection_docs, owasp_mastg
report_count: 0
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
- Recon surfaces 1+ apps under the target's Apple Developer / App Store publisher page
- A TestFlight public link or enterprise/ad-hoc `.ipa`/`manifest.plist` (OTA install) is found
- Customer-facing app, dealer/partner portal, or employee mobile companion app ships on iOS
- Bug bounty program lists iOS in scope
- `apk-redteam-pipeline` already found Android endpoints/secrets — the iOS build often ships a *different* backend version worth diffing (see `hunt-shadow-api`)

DO NOT use for:
- Android-only targets — that's `apk-redteam-pipeline`
- React Native / Flutter apps already fully covered by JS-bundle analysis on the web side
- Server-side only assessments with no mobile client in scope

---

## Stage 0 — Inventory all org-owned iOS apps

```bash
# App Store search API (no auth, no scraping needed)
curl -s "https://itunes.apple.com/search?term=<brand>&country=us&entity=software&limit=50" | python3 -m json.tool

# Pull the full metadata for a known bundle ID (once you have one)
curl -s "https://itunes.apple.com/lookup?bundleId=com.<brand>.app&country=us"
```

Extract: `trackId`, `bundleId`, `sellerName` (developer account — pivot to find sibling apps), `version`,
`releaseNotes` (changelogs often reference deprecated/removed API behavior — feeds `hunt-shadow-api`).

Cross-reference sibling-app bundle IDs surfaced from Android APK inventories (same
multi-brand conglomerate usually reuses `com.<corp>.<sub-brand>` naming on both platforms).

---

## Stage 1 — IPA acquisition

### Primary: from a real device you control (no jailbreak needed for a purchased/free app)
```bash
# Install the app on a real device via Apple Configurator 2 or Xcode, then pull the .ipa
# Apple Configurator 2 (macOS): Devices > select device > right-click installed app > "Save to..."
# Or via libimobiledevice:
brew install libimobiledevice ideviceinstaller
ideviceinstaller -l              # list installed apps + bundle IDs
```

### Secondary: TestFlight (if the program distributes betas publicly)
Open the public TestFlight link, install via the TestFlight app, then extract as above.
TestFlight builds are frequently LESS hardened than App Store releases (debug logging left on,
staging API hosts hardcoded) — always prefer a TestFlight build over the Store build if both exist.

### Tertiary: enterprise / ad-hoc distribution (OTA install)
```bash
# itms-services:// links embed a manifest.plist with a direct .ipa URL
curl -s "https://<target>/manifest.plist" | plutil -convert xml1 -o - -
# Look for <key>software-package</key> — that URL is a directly downloadable, unencrypted IPA
curl -sk -L "<software-package-url>" -o target.ipa
```
Enterprise/ad-hoc IPAs are **not FairPlay-encrypted** — no jailbreak or decryption tooling needed,
unlike an App Store binary pulled from a device.

### Decrypting an App-Store-sourced binary (only if extracted from a jailbroken device)
App Store binaries are FairPlay-encrypted at rest; a binary copied off a jailbroken device
needs runtime decryption (`frida-ios-dump`, `bagbak`, or `flexdecrypt`) before static tools can
read it meaningfully:
```bash
pip install --break-system-packages frida-tools
# with frida-server running on the jailbroken device and the app in foreground:
python3 dump.py <bundle_id>          # frida-ios-dump — outputs a decrypted .ipa
```

---

## Stage 2 — Unpack and static analysis

```bash
# An IPA is just a zip
unzip -o target.ipa -d extracted_target/
cd extracted_target/Payload/*.app

# Info.plist — bundle ID, URL schemes, ATS config, entitlements hint
plutil -convert xml1 -o - Info.plist

# Entitlements — codesign reads the .app bundle (or the Mach-O binary), NOT Info.plist
codesign -d --entitlements :- Payload/<AppName>.app 2>/dev/null || \
  security cms -D -i embedded.mobileprovision | plutil -convert xml1 -o - -

# class-dump for Objective-C symbol/class recovery (compiled binary, not the .app bundle)
brew install class-dump
class-dump -H <AppBinaryName> -o headers/

# Swift binaries: class-dump won't show much — use Hopper, Ghidra, or `nm`/`strings` instead
nm -a <AppBinaryName> | grep -i swift | head -50
strings -a <AppBinaryName> > strings_target.txt
```

For a fast triage pass without a disassembler, the strings dump alone usually surfaces most of
what Stage 3 is looking for.

---

## Stage 3 — Secret grep (same catalog as apk-redteam-pipeline, iOS-specific sources added)

```bash
# URL grep — owned-domain references
grep -oE 'https?://[a-zA-Z0-9.-]+\.(target1|target2|target3)\.(com|io|net)[a-zA-Z0-9./_?=&%-]*' strings_target.txt | sort -u

# Cloud credentials (same 60-pattern catalog as Android — reuse verbatim)
grep -oE 'AKIA[A-Z0-9]{16}'                             # AWS Access Key
grep -oE 'AIza[A-Za-z0-9_-]{35}'                        # Google API key
grep -oE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*' strings_target.txt   # JWT

# iOS-specific: GoogleService-Info.plist (Firebase config bundled per-platform)
find extracted_target -iname "GoogleService-Info.plist" -exec plutil -convert xml1 -o - {} \;
# Look for API_KEY, PROJECT_ID, STORAGE_BUCKET, GCM_SENDER_ID, GOOGLE_APP_ID — same Firebase
# public-read tests as apk-redteam-pipeline Stage 6.

# iOS-specific: hardcoded config plists shipped in the bundle
find extracted_target -iname "*.plist" ! -iname "Info.plist" -exec sh -c 'echo "=== {} ==="; plutil -convert xml1 -o - "{}"' \;

# App Transport Security exceptions (Info.plist) — tells you if arbitrary/insecure loads are allowed
plutil -extract NSAppTransportSecurity xml1 -o - Info.plist 2>/dev/null
```

### Keychain items left in a backup (if you have a device backup, encrypted or not)
```bash
pip install --break-system-packages iphone_backup_decrypt   # for encrypted local backups
# keychain-dumper (run ON a jailbroken device) for live keychain contents:
./keychain-dumper -e   # -e also decodes entitlements per item, showing which app owns which secret
```

---

## Stage 4 — App Transport Security (ATS) misconfig + certificate-pinning bypass

### Check for blanket ATS disablement (the single most common iOS network misconfig)
```bash
plutil -extract NSAppTransportSecurity xml1 -o - Info.plist
```
Red flags in the output:
- `NSAllowsArbitraryLoads = true` at the top level — HTTP (cleartext) allowed anywhere, app-wide.
- Per-domain `NSExceptionAllowsInsecureHTTPLoads = true` for a domain that carries auth tokens.
- `NSAllowsArbitraryLoadsInWebContent = true` — WKWebView traffic exempted, common blind spot.

A blanket ATS exception + a network position (rogue AP, ARP spoof, malicious VPN profile) =
plaintext credential/token interception without touching pinning at all.

### Certificate-pinning bypass (when pinning IS present and correctly configured)
```bash
pip install --break-system-packages frida-tools objection
objection --gadget <bundle_id> explore
# inside objection:
ios sslpinning disable
```
If you want a Frida script instead, don't hand-roll one — use a maintained universal bypass
(e.g. the widely-used `frida-ios-pinning`/`ios-ssl-bypass` community scripts). Modern iOS TLS goes
through **BoringSSL**, so a reliable universal hook targets `SSL_CTX_set_custom_verify` /
`SSL_get_psk_identity` at the native layer and forces the verify callback to return "OK" — this
catches `URLSession`, `AFNetworking`, `Alamofire`, and `TrustKit` at once, which per-delegate
Objective-C hooks (like the deprecated `NSURLConnection` delegate) miss:
```bash
# Pull a maintained universal BoringSSL-layer bypass and run it:
frida -U -f <bundle_id> -l ios-ssl-bypass.js --no-pause
```
In practice, prefer **SSL Kill Switch 2** (jailbroken device, installs as a tweak) or
**objection's `ios sslpinning disable`** over any hand-rolled script — both cover the common
pinning implementations (`NSURLSession`, `AFNetworking`, `TrustKit`) without per-app tuning.

---

## Stage 5 — URL scheme / Universal Link enumeration

```bash
# Custom URL schemes (CFBundleURLTypes) — anything can invoke these via Safari/another app
plutil -extract CFBundleURLTypes xml1 -o - Info.plist

# Universal Links / Associated Domains (applinks:) — requires a matching apple-app-site-association
plutil -extract com.apple.developer.associated-domains xml1 -o - Info.plist 2>/dev/null
curl -s "https://<domain>/.well-known/apple-app-site-association" | python3 -m json.tool
```

For each custom scheme found (e.g. `myapp://`):
- Trigger it from Safari/Notes and observe what the app does with parameters:
  `myapp://reset-password?token=x&redirect=https://evil.com` — does the app trust an
  attacker-supplied `redirect`/`url`/`callback` param and load it in a WebView (open-redirect →
  WebView-XSS chain) or use it to bypass an auth screen?
- If the scheme is also registered by another app on the device (scheme squatting), a malicious
  app can intercept traffic intended for the legitimate app — check `CFBundleURLName` uniqueness.
- Universal Links degrade to the custom scheme when the AASA validation fails or is absent —
  test both paths for the same parameter-injection surface.

---

## Stage 6 — Runtime instrumentation (Frida / objection)

Requires a jailbroken device (checkra1n/palera1n for older iOS, or a Corellium virtual device) —
unlike Android, there is no practical rooted-emulator equivalent for iOS.

```bash
# Setup
pip install --break-system-packages frida-tools objection
# Install frida-server on the jailbroken device via Cydia/Sileo (frida repo), matching the
# host frida-tools version exactly — version skew is the #1 cause of "failed to attach" errors.

# Full interactive exploration
objection --gadget <bundle_id> explore
# Inside objection:
ios hooking watch class <ClassName>
ios hooking watch class_method <Class>.<method> --dump-args --dump-return
ios keychain dump
ios plist dump
ios cookies get
```

### Network traffic capture (once pinning is bypassed)
```bash
mitmproxy --listen-port 8080
# Set the device Wi-Fi proxy to host:8080, install the mitmproxy CA via http://mitm.it on-device
# (Settings > General > VPN & Device Management > trust the cert, then enable full trust under
# Certificate Trust Settings — iOS requires this second step, unlike Android)
```

---

## Decision tree — what to do with what you find

| Finding | Next move |
|---|---|
| `NSAllowsArbitraryLoads = true` | Confirm a token/credential actually transits HTTP — needs a network position to exploit, but is a real finding on its own (config-level, no MITM needed to report) |
| Hardcoded JWT / API key in strings dump | Same as Android — test against the API host, chain into `hunt-api-misconfig` |
| GoogleService-Info.plist present | Test public Firestore/RTDB/Storage read (identical to apk-redteam-pipeline Stage 6) |
| Custom URL scheme accepts a `redirect`/`url` param | Test open-redirect → WebView-load chain; check for scheme squatting by other installed apps |
| Universal Link AASA missing/misconfigured | Confirm scheme fallback still carries the same injectable params |
| Entitlements show `keychain-access-groups` shared with other apps | Cross-app Keychain read — a compromised sibling app reads this app's secrets |
| Older API version referenced vs. what the current web app calls | Hand off to `hunt-shadow-api` for version-diffing |

---

## Anti-patterns

- **Don't assume App Store = FairPlay-encrypted requires jailbreak** — TestFlight and enterprise/ad-hoc
  builds are frequently NOT encrypted and need no decryption step at all. Always check distribution
  channel before reaching for `frida-ios-dump`.
- **Don't skip Swift binaries because class-dump shows nothing** — `strings` and `nm` still work; a
  proper Swift-aware disassembler (Hopper, Ghidra with Swift demangling) recovers the rest.
- **Don't stop at "pinning is present" as a finding** — pinning is a mitigation, not a vulnerability;
  the finding is what you can do once it's bypassed (or the ATS misconfig that makes it moot).
- **Don't ignore WKWebView-loaded content** — `NSAllowsArbitraryLoadsInWebContent` is a distinct,
  frequently-overlooked exception from the top-level ATS setting.
- **Don't run Frida instrumentation against a personal/production Apple ID device** — use a
  dedicated jailbroken test device or Corellium instance.

---

## Tooling install (one-time)

```bash
brew install libimobiledevice ideviceinstaller class-dump
pip install --break-system-packages frida-tools objection iphone_backup_decrypt
# Jailbroken test device (checkra1n/palera1n) or a Corellium virtual iOS device for runtime work
# frida-server installed on-device via the Frida Cydia/Sileo repo
```

---

## Related Skills & Chains

- **`apk-redteam-pipeline`** — the Android counterpart; run both when a target ships on both
  platforms. Sibling bundle IDs and shared backend endpoints frequently surface cross-platform.
- **`hunt-shadow-api`** — mobile builds (iOS and Android alike) often hardcode an older API
  version than the current web app. Chain: IPA reveals `/v1/*` endpoints → `hunt-shadow-api`
  diffs `/v1/` against the current `/v3/` for auth/validation regressions.
- **`cloud-iam-deep`** — IPA secret extraction frequently yields live AWS/GCP/Azure credentials
  or Firebase configs. Chain: strings-grep produces an AWS key → `cloud-iam-deep` privilege
  analysis.
- **`hunt-api-misconfig`** — hardcoded JWTs/API keys extracted here feed directly into JWT
  algorithm-confusion and mass-assignment testing there.
- **`evidence-hygiene`** — extracted Keychain items and secrets need redaction before report
  inclusion.
- **`offensive-osint`** — App Store developer-page enumeration is part of the broader org recon
  graph; pair with certificate-transparency lookups for the same brand.

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
