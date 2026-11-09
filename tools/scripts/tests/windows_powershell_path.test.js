"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const { windowsPowerShell } = require("../../lib/aas-v1/windows-powershell");
test("Windows helpers resolve the OS binary and cwd independently of project PATH", () => {
  const helper = windowsPowerShell({ SystemRoot: String.raw`C:\Windows`, PATH: String.raw`C:\untrusted-project` });
  assert.equal(helper.executable, String.raw`C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`);
  assert.equal(helper.cwd, String.raw`C:\Windows\System32`);
});
test("Windows helper resolution fails closed without a canonical local OS root", () => {
  for (const root of [undefined, "", "Windows", String.raw`\\server\share`, String.raw`C:\Windows\..\project`, String.raw`C:\x%PATH%`, "C:" + String.fromCharCode(92, 10)]) {
    assert.throws(() => windowsPowerShell({ SystemRoot: root }), error => error.code === "AAS_WINDOWS_POWERSHELL_UNAVAILABLE");
  }
});
