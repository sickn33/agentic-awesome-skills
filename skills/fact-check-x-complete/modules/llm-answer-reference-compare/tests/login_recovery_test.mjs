import assert from "node:assert/strict";

import { buildLoginRecovery } from "../assets/tool/dist/capture/login-recovery.js";

const recovery = buildLoginRecovery(
  {
    name: "doubao",
    label: "豆包",
    url: "https://www.doubao.com/chat/?tracked=1#fragment",
  },
  "测试原始问题",
  new Error("browserContext.newPage: Target page, context or browser has been closed"),
);

assert.equal(recovery.schemaVersion, "fact-check-x/capture-recovery@1");
assert.equal(recovery.status, "required");
assert.equal(recovery.action, "computer_use");
assert.equal(recovery.phase, "login");
assert.equal(recovery.question, "测试原始问题");
assert.equal(recovery.failedPlatforms.length, 1);
assert.equal(recovery.failedPlatforms[0].platform, "doubao");
assert.equal(recovery.failedPlatforms[0].loginUrl, "https://www.doubao.com/chat?tracked=1");
assert.equal(new URL(recovery.failedPlatforms[0].loginUrl).hash, "");
assert.match(recovery.failedPlatforms[0].error, /Target page/);
assert.ok(recovery.instructions.some((item) => item.includes("禁止测试或改用 headless")));
assert.ok(recovery.instructions.some((item) => item.includes("没有 Computer Use 能力")));

console.log("PASS 登录失败生成唯一 Computer Use 恢复指令");
