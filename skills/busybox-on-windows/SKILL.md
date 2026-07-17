---
name: busybox-on-windows
description: "How to use a Win32 build of BusyBox to run many of the standard UNIX command line tools on Windows."
risk: critical
source: community
date_added: "2026-02-27"
---

BusyBox is a single binary that implements many common Unix tools. This skill covers a third-party Win32 build distributed from `frippery.org`; do not treat the upstream `busybox.net` project as authentication for that Windows binary.

Use this skill only on Windows. If you are on UNIX, then stop here.

Do not download or execute a binary automatically. If a verified `busybox.exe` is not already available, first:

1. Ask the user for explicit approval to download a third-party executable, the intended architecture, and the destination where a verified binary may be installed.
2. Print the CPU and OS details without changing the system:
   - `Get-CimInstance -ClassName Win32_Processor | Select-Object Name, AddressWidth, NumberOfCores`
   - `Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" | Select-Object ProductName, DisplayVersion, CurrentBuild`
3. Select exactly one documented download URL:
   - 32-bit x86 (ANSI): `https://frippery.org/files/busybox/busybox.exe`
   - 64-bit x86 (ANSI): `https://frippery.org/files/busybox/busybox64.exe`
   - 64-bit x86 (Unicode): `https://frippery.org/files/busybox/busybox64u.exe`
   - 64-bit ARM (Unicode): `https://frippery.org/files/busybox/busybox64a.exe`
4. Obtain an expected SHA-256 digest or a signing-publisher identity from a trusted source independent of the download itself, such as the user's administrator or an approved software inventory. A digest shown only by the same download host is not independent evidence.
5. Download to a new temporary directory, not the project or final install directory. Replace both placeholders before running these PowerShell commands:

   ```powershell
   $DownloadUri = '<approved URL from the list above>'
   $ExpectedSha256 = '<trusted expected SHA-256>'
   $AllowedUris = @(
     'https://frippery.org/files/busybox/busybox.exe',
     'https://frippery.org/files/busybox/busybox64.exe',
     'https://frippery.org/files/busybox/busybox64u.exe',
     'https://frippery.org/files/busybox/busybox64a.exe'
   )
   if ($DownloadUri -notin $AllowedUris) { throw 'Unapproved download URL' }
   if ($ExpectedSha256 -notmatch '^[0-9A-Fa-f]{64}$') { throw 'A trusted SHA-256 digest is required' }

   $TempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("busybox-review-" + [guid]::NewGuid())
   New-Item -ItemType Directory -Path $TempDir | Out-Null
   $Candidate = Join-Path $TempDir 'busybox.exe'
   Invoke-WebRequest -Uri $DownloadUri -OutFile $Candidate

   $Signature = Get-AuthenticodeSignature -FilePath $Candidate
   $ActualSha256 = (Get-FileHash -Algorithm SHA256 -Path $Candidate).Hash
   $Signature | Select-Object Status, StatusMessage, SignerCertificate
   $ActualSha256
   if ($ActualSha256 -ne $ExpectedSha256.ToUpperInvariant()) {
     Remove-Item -LiteralPath $Candidate -Force
     throw 'BusyBox digest mismatch; the candidate was deleted'
   }
   ```

6. Review the reported signature status and hash with the user. Copy the verified candidate to the approved destination only after confirmation. If no independent expected digest or trusted signer identity is available, stop and do not execute the file.

After verification, list the available commands with `busybox.exe --list`.

Usage: Prefix the UNIX command with `busybox.exe`, for example: `busybox.exe ls -1`

If you need to run a UNIX command under another working directory, use the absolute path to the verified `busybox.exe`.

Documentation: https://frippery.org/busybox/
Original BusyBox: https://busybox.net/

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- The repository does not pin or attest the current third-party Windows binaries. Never invent an expected digest, accept a mismatch, or execute an unverified candidate.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
