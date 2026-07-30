import assert from "node:assert/strict";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquireConsoleKey,
  createDedicatedKey,
  responseData,
  usableKey,
  waitForMaaSLogin,
  writeCredential
} from "../assets/tool/dist/trusted-search-onboarding.js";

const TEST_KEY = "fixture_fact_check_x_onboarding_123456";

assert.equal(usableKey(TEST_KEY), TEST_KEY);
assert.equal(usableKey("fixture_xxxx****************"), "");
assert.deepEqual(responseData({ code: 200, data: [1] }), [1]);
assert.deepEqual(responseData({ code: "200", data: [1] }), [1]);
assert.deepEqual(responseData({ ret: 0, content: [2] }), [2]);
assert.equal(responseData({ code: 401 }), undefined);

let createCalls = 0;
const page = {
  async evaluate(_callback, argument) {
    createCalls += 1;
    assert.equal(argument.path, "/auth/maas/api-key/create");
    assert.equal(argument.init.method, "POST");
    const body = JSON.parse(argument.init.body);
    assert.equal(body.name, "Fact-Check-X");
    assert.match(body.remark, /跨载体/);
    return {
      ok: true,
      status: 200,
      body: { code: 200, data: { appKey: TEST_KEY } }
    };
  }
};

assert.equal(await createDedicatedKey(page), TEST_KEY);
assert.equal(createCalls, 1);

const existing = await acquireConsoleKey(page, [
  { status: true, appKey: TEST_KEY }
]);
assert.deepEqual(existing, {
  key: TEST_KEY,
  source: "maas_existing_key",
  created: false
});
assert.equal(createCalls, 1);

const created = await acquireConsoleKey(page, [
  { status: true, appKey: "fixture_xxxx****************" }
]);
assert.deepEqual(created, {
  key: TEST_KEY,
  source: "maas_created_key",
  created: true
});
assert.equal(createCalls, 2);

let loginProbeCount = 0;
const navigations = [];
const loginPage = {
  isClosed() {
    return false;
  },
  url() {
    return navigations.at(-1) || "https://platform.dknowc.cn/#/home";
  },
  async evaluate() {
    loginProbeCount += 1;
    if (loginProbeCount === 1) {
      return { ok: false, status: 401, body: { code: 401 } };
    }
    return { ok: true, status: 200, body: { code: 200, data: [] } };
  },
  async goto(url) {
    navigations.push(url);
  },
  async waitForTimeout() {}
};
assert.deepEqual(await waitForMaaSLogin(loginPage), []);
assert.deepEqual(navigations, ["https://platform.dknowc.cn/auth/#/login"]);
const onboardingSource = await readFile(
  new URL("../assets/tool/dist/trusted-search-onboarding.js", import.meta.url),
  "utf8"
);
assert.match(
  onboardingSource,
  /openBrowserSession\(profileDir, DEFAULT_LOGIN_URL/
);
assert.match(onboardingSource, /options\.force/);
assert.match(onboardingSource, /argument === "--force"/);
assert.match(onboardingSource, /创建 API Key/);
assert.match(onboardingSource, /新的API Key/);

const root = await mkdtemp(join(tmpdir(), "fact-check-x-onboarding-"));
const credential = join(root, "credentials", "trusted-search-key");
await writeCredential(credential, TEST_KEY);
assert.equal((await readFile(credential, "utf8")).trim(), TEST_KEY);
if (process.platform !== "win32") {
  assert.equal((await stat(credential)).mode & 0o777, 0o600);
}

console.log("PASS MaaS 登录后复用或创建专用 Key，且凭据不写入输出");
