"use strict";

const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { fsyncDirectoryAsync } = require("../durability");
const { hostConfigError } = require("./errors");

function digest(bytes) {
  return `sha256-${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

function currentUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function windowsAclDiagnostic(value) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, 512) : null;
}

function runWindowsAcl(script, filePath, options = {}) {
  const runner = options.runner || spawnSync;
  const result = runner("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000,
    maxBuffer: 64 * 1024,
    env: {
      ...process.env,
      AAS_WINDOWS_ACL_PATH: filePath,
      ...(options.environment || {}),
    },
  });
  if (result.status !== 0 || result.error) {
    const details = {
      status: result.status ?? null,
      phase: options.phase || "windowsAcl",
      path: filePath,
    };
    const diagnostic = windowsAclDiagnostic(result.stderr) || windowsAclDiagnostic(result.error?.message);
    if (diagnostic) details.diagnostic = diagnostic;
    throw hostConfigError("AAS_ADAPTER_WINDOWS_ACL_FAILED", "filesystem", details);
  }
  return result.stdout.trim();
}

function windowsAclSnapshot(filePath) {
  const script = [
    "$ErrorActionPreference='Stop'",
    "$p=$env:AAS_WINDOWS_ACL_PATH",
    "function ConvertTo-SidValue($value){try{return ([Security.Principal.SecurityIdentifier]$value).Value}catch{};try{return ([Security.Principal.NTAccount]$value).Translate([Security.Principal.SecurityIdentifier]).Value}catch{return [string]$value}}",
    "$me=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value",
    "$a=Get-Acl -LiteralPath $p",
    "$owner=ConvertTo-SidValue $a.Owner",
    "$rules=@($a.Access | ForEach-Object { (ConvertTo-SidValue $_.IdentityReference.Value) + '|' + $_.AccessControlType + '|' + $_.IsInherited })",
    "@{current=$me;owner=$owner;protected=$a.AreAccessRulesProtected;rules=$rules}|ConvertTo-Json -Compress",
  ].join(";");
  let snapshot;
  try { snapshot = JSON.parse(runWindowsAcl(script, filePath, { phase: "inspectAcl" })); } catch (cause) {
    if (cause && cause.code) throw cause;
    throw hostConfigError("AAS_ADAPTER_WINDOWS_ACL_FAILED", "filesystem", { phase: "parseAcl", path: filePath });
  }
  return snapshot;
}

function assertWindowsOwned(filePath) {
  if (process.platform !== "win32") return;
  const snapshot = windowsAclSnapshot(filePath);
  if (snapshot.owner !== snapshot.current) throw hostConfigError("AAS_ADAPTER_OWNERSHIP_MISMATCH", "filesystem");
}

function assertWindowsPrivatePath(filePath) {
  if (process.platform !== "win32") return;
  const snapshot = windowsAclSnapshot(filePath);
  const rules = Array.isArray(snapshot.rules) ? snapshot.rules : (snapshot.rules ? [snapshot.rules] : []);
  if (snapshot.owner !== snapshot.current || snapshot.protected !== true || rules.length !== 1
    || rules[0] !== `${snapshot.current}|Allow|False`) {
    throw hostConfigError("AAS_ADAPTER_WINDOWS_ACL_UNSAFE", "filesystem");
  }
}

function hardenWindowsPrivatePath(filePath, directory = false) {
  if (process.platform !== "win32") return;
  const script = [
    "$ErrorActionPreference='Stop'",
    "$p=$env:AAS_WINDOWS_ACL_PATH",
    "$sid=[Security.Principal.WindowsIdentity]::GetCurrent().User",
    "$acl=Get-Acl -LiteralPath $p",
    "$acl.SetAccessRuleProtection($true,$false)",
    "@($acl.Access)|ForEach-Object{$acl.RemoveAccessRuleAll($_)}",
    `$inherit=${directory ? "[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'" : "[Security.AccessControl.InheritanceFlags]::None"}`,
    "$rule=New-Object Security.AccessControl.FileSystemAccessRule($sid,[Security.AccessControl.FileSystemRights]::FullControl,$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow)",
    "$acl.SetOwner($sid)",
    "$acl.SetAccessRule($rule)",
    "Set-Acl -LiteralPath $p -AclObject $acl",
  ].join(";");
  runWindowsAcl(script, filePath, { phase: "hardenAcl" });
  assertWindowsPrivatePath(filePath);
}

function copyWindowsAcl(sourcePath, destinationPath) {
  if (process.platform !== "win32") return;
  const script = "$ErrorActionPreference='Stop';$source=$env:AAS_WINDOWS_ACL_SOURCE_PATH;$destination=$env:AAS_WINDOWS_ACL_PATH;$acl=Get-Acl -LiteralPath $source;Set-Acl -LiteralPath $destination -AclObject $acl";
  runWindowsAcl(script, destinationPath, {
    phase: "copyAcl",
    environment: { AAS_WINDOWS_ACL_SOURCE_PATH: sourcePath },
  });
  assertWindowsOwned(destinationPath);
}

function assertExplicitAbsolutePath(filePath, code = "AAS_ADAPTER_PATH_INVALID") {
  if (typeof filePath !== "string" || filePath.length === 0 || filePath.includes("\0") || !path.isAbsolute(filePath)) {
    throw hostConfigError(code, "invalidInput");
  }
  return path.normalize(filePath);
}

function assertOwned(stat, expectedUid = currentUid(), filePath = null) {
  if (expectedUid !== null && stat.uid !== expectedUid) {
    throw hostConfigError("AAS_ADAPTER_OWNERSHIP_MISMATCH", "filesystem", { expectedUid, actualUid: stat.uid });
  }
  if (process.platform === "win32" && filePath) assertWindowsOwned(filePath);
}

function assertSafeDirectory(directoryPath, options = {}) {
  const absolute = assertExplicitAbsolutePath(directoryPath, "AAS_ADAPTER_DIRECTORY_PATH_INVALID");
  let stat;
  try {
    stat = fs.lstatSync(absolute);
  } catch (error) {
    if (error.code === "ENOENT" && options.allowMissing) return { path: absolute, exists: false };
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw hostConfigError("AAS_ADAPTER_DIRECTORY_UNSAFE", "filesystem");
  }
  assertOwned(stat, options.expectedUid, absolute);
  return { path: absolute, exists: true, stat };
}

async function inspectRegularFile(filePath, options = {}) {
  const absolute = assertExplicitAbsolutePath(filePath);
  const parent = assertSafeDirectory(path.dirname(absolute), { expectedUid: options.expectedUid });
  let stat;
  try {
    stat = await fsp.lstat(absolute);
  } catch (error) {
    if (error.code === "ENOENT" && options.allowMissing !== false) {
      return { path: absolute, parent, exists: false, bytes: Buffer.alloc(0), digest: digest(Buffer.alloc(0)) };
    }
    throw error;
  }
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw hostConfigError("AAS_ADAPTER_CONFIG_UNSAFE", "filesystem");
  }
  assertOwned(stat, options.expectedUid, absolute);
  const handle = await fsp.open(absolute, "r");
  let bytes;
  let openedStat;
  try {
    openedStat = await handle.stat();
    if (!openedStat.isFile() || openedStat.dev !== stat.dev || openedStat.ino !== stat.ino) {
      throw hostConfigError("AAS_ADAPTER_CONFIG_CHANGED", "conflict");
    }
    bytes = await handle.readFile();
  } finally {
    await handle.close();
  }
  return {
    path: absolute,
    parent,
    exists: true,
    bytes,
    digest: digest(bytes),
    identity: {
      dev: stat.dev,
      ino: stat.ino,
      uid: stat.uid,
      gid: stat.gid,
      mode: stat.mode & 0o7777,
      size: stat.size,
    },
  };
}

function sameIdentity(left, right) {
  if (!left || !right) return left === right;
  return ["dev", "ino", "uid", "gid", "mode", "size"].every((key) => left[key] === right[key]);
}

async function fsyncDirectory(directoryPath) {
  await fsyncDirectoryAsync(directoryPath);
}

async function writeExclusiveSynced(filePath, bytes, mode = 0o600) {
  const handle = await fsp.open(filePath, "wx", mode);
  try {
    // On Windows the create mode does not constrain the inherited DACL. Make
    // the still-empty file owner-only before any potentially sensitive bytes
    // are written.
    hardenWindowsPrivatePath(filePath, false);
    await handle.writeFile(bytes);
    await handle.chmod(mode);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

module.exports = {
  assertExplicitAbsolutePath,
  assertOwned,
  assertSafeDirectory,
  assertWindowsPrivatePath,
  copyWindowsAcl,
  currentUid,
  digest,
  fsyncDirectory,
  hardenWindowsPrivatePath,
  inspectRegularFile,
  runWindowsAcl,
  sameIdentity,
  writeExclusiveSynced,
};
