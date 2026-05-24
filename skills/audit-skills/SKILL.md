---
id: 'audit-skills'
name: audit-skills
description: "Expert security auditor for AI Skills and Bundles. Performs non-intrusive static analysis to identify malicious patterns, data leaks, system stability risks, and obfuscated payloads across Windows, macOS, Linux/Unix, and Mobile (Android/iOS)."
category: security-offensive
risk: safe
source: community
date_added: "2026-03-07"
author: MAIOStudio
tags: [security, audit, skills, bundles, cross-platform]
tools: [claude, gemini, gpt, llama, mistral, etc]
---

# Audit Skills (Premium Universal Security)

## Overview

Expert security auditor for AI Skills and Bundles. Performs non-intrusive static analysis to identify malicious patterns, data leaks, system stability risks, and obfuscated payloads across Windows, macOS, Linux/Unix, and Mobile (Android/iOS).
2-4 sentences is perfect.

## When to Use This Skill

- Use when you need to audit AI skills and bundles for security vulnerabilities
- Use when working with cross-platform security analysis
- Use when the user asks about verifying skill legitimacy or performing security reviews
- Use when scanning for mobile threats in AI skills

## How It Works

### Step 1: Static Analysis

Performs non-intrusive static analysis to identify malicious patterns, data leaks, system stability risks, and obfuscated payloads.

### Step 2: Platform-Specific Threat Detection

Analyzes code for platform-specific security issues across Windows, macOS, Linux/Unix, and Mobile (Android/iOS).

#### 1. Privilege, Ownership & Metadata Manipulation
- **Elevated Access**: `sudo`, `chown`, `chmod`, `TakeOwnership`, `icacls`, `Set-ExecutionPolicy`.
- **Metadata Tampering**: `touch -t`, `setfile` (macOS), `attrib` (Windows), `Set-ItemProperty`, `chflags`.
- **Risk**: Unauthorized access, masking activity, or making files immutable.

#### 2. File/Folder Locking & Resource Denial
- **Patterns**: `chmod 000`, `chattr +i` (immutable), `attrib +r +s +h`, `Deny` ACEs in `icacls`.
- **Global Actions**: Locking or hiding folders in `%USERPROFILE%`, `/Users/`, or `/etc/`.
- **Risk**: Denial of service or data locking.

#### 3. Script Execution & Batch Invocation
- **Legacy/Batch Windows**: `.bat`, `.cmd`, `cmd.exe /c`, `vbs`, `cscript`, `wscript`.
- **Unix Shell**: `.sh`, `.bash`, `.zsh`, `chmod +x` followed by execution.
- **PowerShell**: `.ps1`, `powershell -ExecutionPolicy Bypass -File ...`.
- **Hidden Flags**: `-WindowStyle Hidden`, `-w hidden`, `-noprofile`.

#### 4. Dangerous Install/Uninstall & System Changes
- **Windows**: `msiexec /qn`, `choco uninstall`, `reg delete`.
- **Linux/Unix**: `apt-get purge`, `yum remove`, `rm -rf /usr/bin/...`.
- **macOS**: `brew uninstall`, deleting from `/Applications`.
- **Risk**: Removing security software or creating unmonitored installation paths.

#### 5. Mobile Application & OS Security (Android/iOS)
- **Android Tools**: `adb shell`, `pm install`, `am start`, `apktool`, `dex2jar`, `keytool`.
- **Android Files**: Manipulation of `AndroidManifest.xml` (permissions), `classes.dex`, or `strings.xml`.
- **iOS Tools**: `xcodebuild`, `codesign`, `security find-identity`, `fastlane`, `xcrun`.
- **iOS Files**: Manipulation of `Info.plist`, `Entitlements.plist`, or `Provisioning Profiles`.
- **Mobile Patterns**: Jailbreak/Root detection bypasses, hardcoded API keys in mobile source, or sensitive permission requests (Camera, GPS, Contacts) in non-mobile skills.
- **Risk**: Malicious mobile package injection, credential theft from mobile builds, or device manipulation via ADB.

#### 6. Information Disclosure & Network Exfiltration
- **Patterns**: `curl`, `wget`, `Invoke-WebRequest`, `Invoke-RestMethod`, `scp`, `ftp`, `nc`, `socat`.
- **Sensible Data**: `.env`, `.ssh`, `cookies.sqlite`, `Keychains` (macOS), `Credentials` (Windows), `keystore` (Android).
- **Intranet**: Scanning internal IPs or mapping local services.

#### 7. Service, Process & Stability Manipulation
- **Windows**: `Stop-Service`, `taskkill /f`, `sc.exe delete`.
- **Unix/Mac**: `kill -9`, `pkill`, `systemctl disable/stop`, `launchctl unload`.
- **Low-level**: Direct disk access (`dd`), firmware/BIOS calls, kernel module management.

#### 8. Obfuscation & Persistence
- **Encoding**: `Base64`, `Hex`, `XOR` loops, `atob()`.
- **Persistence**: `reg add` (Run keys), `schtasks`, `crontab`, `launchctl` (macOS), `systemd` units.
- **Remote script piping**: network fetch commands that stream directly into a shell or PowerShell evaluator.

#### 9. Legitimacy & Scope (Universal)
- **Registry Alignment**: Cross-reference with `CATALOG.md`.
- **Structural Integrity**: Does it follow the standard repo layout?
- **Healthy Scope**: Does a "UI Design" skill need `adb shell` or `sudo`?

### Step 3: Reporting

Generates a security report with a score (0-10), platform target identification, flagged actions, threat analysis, and mitigation recommendations.

## Examples

### Example 1: Security Review

```markdown
"Perform a security audit on this skill bundle"
```

### Example 2: Cross-Platform Threat Analysis

```markdown
"Scan for mobile threats in this AI skill"
```

## Best Practices

- ✅ Perform non-intrusive analysis
- ✅ Check for privilege escalation patterns
- ✅ Look for information disclosure vulnerabilities
- ✅ Analyze cross-platform threats
- ❌ Don't execute potentially malicious code during audit
- ❌ Don't modify the code being audited
- ❌ Don't ignore mobile-specific security concerns

## Common Pitfalls

- **Problem:** Executing code during audit
  **Solution:** Stick to static analysis methods only

- **Problem:** Missing cross-platform threats
  **Solution:** Check for platform-specific security issues on all supported platforms

- **Problem:** Failing to detect obfuscated payloads
 **Solution:** Look for encoding patterns like Base64, Hex, XOR loops, and atob()

## Related Skills

- `@security-scanner` - Additional security scanning capabilities

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
