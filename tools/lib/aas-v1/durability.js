"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawnSync } = require("node:child_process");

const WINDOWS_DIRECTORY_FLUSH = [
  "$ErrorActionPreference='Stop'",
  "$source='using System; using System.Runtime.InteropServices; public static class AasDirectoryFlush { [DllImport(\"kernel32.dll\", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateFileW(string n, uint a, uint s, IntPtr p, uint c, uint f, IntPtr t); [DllImport(\"kernel32.dll\", SetLastError=true)] public static extern bool FlushFileBuffers(IntPtr h); [DllImport(\"kernel32.dll\", SetLastError=true)] public static extern bool CloseHandle(IntPtr h); }'",
  "Add-Type -TypeDefinition $source",
  "function Write-AasFlushFailure([string]$phase,[uint32]$nativeCode,[int]$exitCode){[Console]::Out.WriteLine(('AAS_WIN32_DIRECTORY_FLUSH_FAILURE|{0}|{1}' -f $phase,$nativeCode));exit $exitCode}",
  // FlushFileBuffers requires a handle opened with GENERIC_WRITE. Keep all
  // sharing flags so the durability probe does not become an exclusivity lock.
  "$h=[AasDirectoryFlush]::CreateFileW($args[0],0x40000000,7,[IntPtr]::Zero,3,0x02000000,[IntPtr]::Zero)",
  "if($h -eq [IntPtr](-1)){$nativeCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error();Write-AasFlushFailure 'createFileW' ([uint32]$nativeCode) 41}",
  "try{if(-not [AasDirectoryFlush]::FlushFileBuffers($h)){$nativeCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error();Write-AasFlushFailure 'flushFileBuffers' ([uint32]$nativeCode) 42}}finally{[void][AasDirectoryFlush]::CloseHandle($h)}",
].join(";");

const WINDOWS_FAILURE_PATTERN = /^AAS_WIN32_DIRECTORY_FLUSH_FAILURE\|(createFileW|flushFileBuffers)\|(\d{1,10})$/m;

function windowsFailureDetails(result) {
  const details = {
    platform: "win32",
    capability: "directoryMetadataFlush",
  };
  const match = typeof result.stdout === "string"
    ? WINDOWS_FAILURE_PATTERN.exec(result.stdout)
    : null;
  if (match) {
    const win32Error = Number(match[2]);
    if (Number.isSafeInteger(win32Error) && win32Error >= 0 && win32Error <= 0xffffffff) {
      return { ...details, helperPhase: match[1], win32Error };
    }
  }
  if (result.error) {
    const spawnCode = typeof result.error.code === "string" && /^[A-Z0-9_]+$/.test(result.error.code)
      ? result.error.code
      : "UNKNOWN";
    return { ...details, helperPhase: "launch", spawnCode };
  }
  return {
    ...details,
    helperPhase: "unknown",
    helperExitCode: Number.isInteger(result.status) ? result.status : null,
  };
}

function durabilityError(cause, details = {}) {
  const error = new Error("AAS_DURABILITY_CAPABILITY_UNAVAILABLE", { cause });
  error.code = "AAS_DURABILITY_CAPABILITY_UNAVAILABLE";
  error.category = "filesystem";
  error.details = details;
  return error;
}

function flushWindowsDirectory(directoryPath, cause) {
  if (process.platform !== "win32") throw cause;
  const result = spawnSync("powershell.exe", [
    "-NoProfile", "-NonInteractive", "-Command", WINDOWS_DIRECTORY_FLUSH, directoryPath,
  ], { encoding: "utf8", windowsHide: true, timeout: 15000, maxBuffer: 64 * 1024 });
  if (result.status !== 0 || result.error) {
    throw durabilityError(result.error || cause, windowsFailureDetails(result));
  }
}

function fsyncDirectorySync(directoryPath) {
  let descriptor;
  try {
    descriptor = fs.openSync(directoryPath, fs.constants.O_RDONLY);
    fs.fsyncSync(descriptor);
  } catch (error) {
    flushWindowsDirectory(directoryPath, error);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

async function fsyncDirectoryAsync(directoryPath) {
  let handle;
  try {
    handle = await fsp.open(directoryPath, "r");
    await handle.sync();
  } catch (error) {
    flushWindowsDirectory(directoryPath, error);
  } finally {
    if (handle) await handle.close();
  }
}

module.exports = { fsyncDirectoryAsync, fsyncDirectorySync };
