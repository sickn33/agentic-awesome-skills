"use strict";

const path = require("node:path");

// SystemRoot is the OS-provided installation root, never the project's cwd/PATH.
// Reject relative, network and traversal spellings rather than falling back.
function windowsPowerShell(environment = process.env) {
  const root = environment.SystemRoot || environment.SYSTEMROOT;
  if (typeof root !== "string" || !/^[a-z]:[\\/]/i.test(root)
    || /[\u0000-\u001f<>"|?*%]/u.test(root) || root.slice(2).includes(":")
    || root.split(/[\\/]/u).some(part => part === "." || part === "..")) {
    const error = new Error("AAS_WINDOWS_POWERSHELL_UNAVAILABLE");
    error.code = "AAS_WINDOWS_POWERSHELL_UNAVAILABLE";
    throw error;
  }
  const cwd = path.win32.join(root, "System32");
  return { executable: path.win32.join(cwd, "WindowsPowerShell", "v1.0", "powershell.exe"), cwd };
}

module.exports = { windowsPowerShell };
