import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    openBrowserSession,
    resolveVisibleBrowserExecutable,
    resolveVisibleBrowserExecutables,
    shouldPreserveMainPage,
    visibleBrowserCooldownMs,
} from "../assets/tool/dist/capture/browser-session.js";

assert.equal(shouldPreserveMainPage({ headed: true, ci: false }), true);
assert.equal(shouldPreserveMainPage({ interactive: true, ci: false }), true);
assert.equal(shouldPreserveMainPage({ headed: false, ci: false }), false);
assert.equal(shouldPreserveMainPage({ headed: true, ci: true }), false);
assert.equal(visibleBrowserCooldownMs({}), 8000);
assert.equal(visibleBrowserCooldownMs({ visibleLaunchCooldownMs: 0 }), 0);
assert.equal(
    resolveVisibleBrowserExecutable({}, {
        platform: "darwin",
        env: {},
        existsSync: (path) => path.includes("Microsoft Edge.app"),
        bundledExecutable: "/bundled/chromium",
    }),
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
);
assert.deepEqual(
    resolveVisibleBrowserExecutables({}, {
        platform: "darwin",
        env: {},
        existsSync: (path) => path.includes("Google Chrome.app")
            || path === "/bundled/chromium",
        bundledExecutable: "/bundled/chromium",
    }),
    [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/bundled/chromium",
    ],
);
assert.equal(
    resolveVisibleBrowserExecutable({ executablePath: "/custom/browser" }, {
        platform: "darwin",
        env: {},
        existsSync: (path) => path === "/custom/browser",
    }),
    "/custom/browser",
);
assert.equal(
    resolveVisibleBrowserExecutable({}, {
        platform: "darwin",
        env: {},
        existsSync: (path) => path === "/bundled/chromium",
        bundledExecutable: "/bundled/chromium",
    }),
    "/bundled/chromium",
);
assert.throws(
    () => resolveVisibleBrowserExecutable({}, {
        platform: "darwin",
        env: {},
        existsSync: () => false,
        bundledExecutable: "/missing/chromium",
    }),
    /未检测到可用于可见采集/,
);

const root = await mkdtemp(join(tmpdir(), "fact-check-x-browser-session-"));
const integrationExecutable = resolveVisibleBrowserExecutable();
try {
    const fallback = await openBrowserSession(join(root, "fallback"), "about:blank", {
        headed: true,
        externalHeadless: true,
        visibleLaunchCooldownMs: 0,
        browserExecutableCandidates: [
            "/definitely/missing/fact-check-x-browser",
            integrationExecutable,
        ],
    });
    assert.equal(fallback.executablePath, integrationExecutable);
    await fallback.release();

    for (const platform of ["dknowc-chat", "doubao"]) {
        const profile = join(root, platform);
        let current = await openBrowserSession(profile, "about:blank", {
            headed: true,
            externalHeadless: true,
            visibleLaunchCooldownMs: 0,
            executablePath: integrationExecutable,
        });
        assert.equal(current.preserved, true);
        assert.equal(current.launchMode, "playwright-persistent");
        const marker = `${platform}-login-state`;
        await current.context.addCookies([{
            name: `fact-check-${platform}`,
            value: marker,
            domain: "fact-check.test",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 3600
        }]);
        await current.page.close();
        await current.release();
        current = await openBrowserSession(profile, "about:blank", {
            headed: true,
            externalHeadless: true,
            visibleLaunchCooldownMs: 0,
            executablePath: integrationExecutable,
        });
        assert.equal(current.page.isClosed(), false);
        assert.equal(current.page.url(), "about:blank");
        assert.equal(
            (await current.context.cookies("https://fact-check.test"))
                .find((cookie) => cookie.name === `fact-check-${platform}`)?.value,
            marker
        );
        await current.release();
    }

    const ciProfile = join(root, "ci-headless");
    const managed = await openBrowserSession(ciProfile, "about:blank", {
        headed: true,
        ci: true,
        executablePath: integrationExecutable,
    });
    assert.equal(managed.preserved, false);
    const managedPage = managed.page;
    await managedPage.setContent("<main>CI transient page</main>");
    await managed.release();
    assert.equal(managedPage.isClosed(), true);
}
finally {
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}

if (process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT, JSON.stringify({
        schemaVersion: "fact-check-x/test-assertions@1",
        actualAssertionIds: [
            "browser.playwright_managed_persistent_context",
            "browser.profile_state_retained",
            "browser.closed_page_reopened",
            "browser.system_chromium_preferred",
        ]
    }));
}
console.log("PASS Playwright 直接管理系统 Chromium 持久化会话、保留两平台登录状态，CI 关闭浏览器");
