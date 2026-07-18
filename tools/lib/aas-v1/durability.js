"use strict";

const fs = require("node:fs");
const fsp = require("node:fs/promises");
const { spawnSync } = require("node:child_process");

const WINDOWS_DIRECTORY_FLUSH_PATH_ENV = "AAS_WINDOWS_DIRECTORY_FLUSH_PATH";
const WINDOWS_DIRECTORY_FLUSH_TIMEOUT_MS = 60_000;
const WINDOWS_DIRECTORY_FLUSH = [
  "$ErrorActionPreference='Stop'",
  "$source='using System; using System.Runtime.InteropServices; public static class AasDirectoryFlush { [DllImport(\"kernel32.dll\", CharSet=CharSet.Unicode, SetLastError=true)] public static extern IntPtr CreateFileW(string n, uint a, uint s, IntPtr p, uint c, uint f, IntPtr t); [DllImport(\"kernel32.dll\", SetLastError=true)] public static extern bool FlushFileBuffers(IntPtr h); [DllImport(\"kernel32.dll\", SetLastError=true)] public static extern bool CloseHandle(IntPtr h); }'",
  "Add-Type -TypeDefinition $source",
  "function Write-AasFlushFailure([string]$phase,[uint32]$nativeCode,[int]$exitCode){[Console]::Out.WriteLine(('AAS_WIN32_DIRECTORY_FLUSH_FAILURE|{0}|{1}' -f $phase,$nativeCode));exit $exitCode}",
  `$directoryPath=$env:${WINDOWS_DIRECTORY_FLUSH_PATH_ENV}`,
  "if([string]::IsNullOrWhiteSpace($directoryPath)){Write-AasFlushFailure 'input' 0 40}",
  // FlushFileBuffers requires a handle opened with GENERIC_WRITE. Keep all
  // sharing flags so the durability probe does not become an exclusivity lock.
  "$h=[AasDirectoryFlush]::CreateFileW($directoryPath,0x40000000,7,[IntPtr]::Zero,3,0x02000000,[IntPtr]::Zero)",
  "if($h -eq [IntPtr](-1)){$nativeCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error();Write-AasFlushFailure 'createFileW' ([uint32]$nativeCode) 41}",
  "try{if(-not [AasDirectoryFlush]::FlushFileBuffers($h)){$nativeCode=[Runtime.InteropServices.Marshal]::GetLastWin32Error();Write-AasFlushFailure 'flushFileBuffers' ([uint32]$nativeCode) 42}}finally{[void][AasDirectoryFlush]::CloseHandle($h)}",
].join(";");

const WINDOWS_FAILURE_PATTERN = /^AAS_WIN32_DIRECTORY_FLUSH_FAILURE\|(input|createFileW|flushFileBuffers)\|(\d{1,10})$/m;

function windowsFlushEnvironment(directoryPath) {
  const environment = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (name.toUpperCase() !== WINDOWS_DIRECTORY_FLUSH_PATH_ENV) environment[name] = value;
  }
  environment[WINDOWS_DIRECTORY_FLUSH_PATH_ENV] = directoryPath;
  return environment;
}

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
    "-NoProfile", "-NonInteractive", "-Command", WINDOWS_DIRECTORY_FLUSH,
  ], {
    encoding: "utf8",
    env: windowsFlushEnvironment(directoryPath),
    windowsHide: true,
    // Hosted Windows runners can take more than 15 seconds to cold-start
    // PowerShell while ETW is active. Keep the helper bounded and fail-closed,
    // but allow the capability probe to finish under verified CI load.
    timeout: WINDOWS_DIRECTORY_FLUSH_TIMEOUT_MS,
    maxBuffer: 64 * 1024,
  });
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
