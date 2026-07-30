import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";

const MAC_VISIBLE_BROWSERS = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
];
const DEFAULT_VISIBLE_BROWSER_COOLDOWN_MS = 8000;
let lastVisibleBrowserActivityAt = 0;

export function shouldPreserveMainPage(options = {}) {
    const ci = Boolean(options.ci)
        || /^(1|true|yes)$/i.test(String(process.env.CI || "").trim());
    return Boolean(options.headed || options.interactive) && !ci;
}

export function resolveVisibleBrowserExecutable(options = {}, runtime = {}) {
    return resolveVisibleBrowserExecutables(options, runtime)[0];
}

export function resolveVisibleBrowserExecutables(options = {}, runtime = {}) {
    const env = runtime.env || process.env;
    const pathExists = runtime.existsSync || existsSync;
    const platform = runtime.platform || process.platform;
    const bundledExecutable = runtime.bundledExecutable || chromium.executablePath();
    const configured = options.executablePath
        || String(env.FACT_CHECK_X_BROWSER_EXECUTABLE || "").trim();
    if (configured) {
        if (!pathExists(configured)) {
            throw new Error(`配置的浏览器不存在：${configured}`);
        }
        return [configured];
    }
    const candidates = [];
    if (platform === "darwin") {
        candidates.push(...MAC_VISIBLE_BROWSERS.filter((path) => pathExists(path)));
    }
    if (bundledExecutable && pathExists(bundledExecutable)) {
        candidates.push(bundledExecutable);
    }
    if (candidates.length === 0) {
        throw new Error("未检测到可用于可见采集的系统 Chrome、Microsoft Edge、Brave、Chromium 或 Playwright Chromium。请安装任一支持的浏览器后重试。");
    }
    return [...new Set(candidates)];
}

export async function openBrowserSession(profileDir, initialUrl, options = {}) {
    const visible = shouldPreserveMainPage(options);
    const executablePaths = visible
        ? normalizedExecutableCandidates(options.browserExecutableCandidates)
            || resolveVisibleBrowserExecutables(options)
        : [options.executablePath || chromium.executablePath()];
    let context;
    let executablePath = executablePaths[0];
    const launchErrors = [];
    for (const candidate of executablePaths) {
        if (visible) {
            await waitForVisibleBrowserCooldown(options);
        }
        try {
            context = await chromium.launchPersistentContext(profileDir, {
                executablePath: candidate,
                headless: visible ? Boolean(options.externalHeadless) : true,
                timeout: Number(options.launchTimeoutMs || (visible ? 120000 : 30000)),
                args: [
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-background-networking"
                ]
            });
            executablePath = candidate;
            break;
        }
        catch (error) {
            launchErrors.push({ candidate, error });
            if (visible) {
                lastVisibleBrowserActivityAt = Date.now();
            }
        }
    }
    if (!context) {
        const detail = launchErrors
            .map(({ candidate, error }) => `${candidate}: ${firstErrorLine(error)}`)
            .join("；");
        throw new Error(`所有可用 Chromium 浏览器均启动失败。${detail}`);
    }
    const page = chooseMainPage(context.pages(), initialUrl) || await context.newPage();
    let closed = false;
    const close = async () => {
        if (closed) {
            return;
        }
        closed = true;
        await context.close().catch(() => undefined);
        if (visible) {
            lastVisibleBrowserActivityAt = Date.now();
        }
    };
    return {
        context,
        page,
        preserved: visible,
        launchMode: "playwright-persistent",
        executablePath,
        release: close,
        shutdown: close
    };
}

export function visibleBrowserCooldownMs(options = {}) {
    const configured = Number(options.visibleLaunchCooldownMs);
    return Number.isFinite(configured) && configured >= 0
        ? configured
        : DEFAULT_VISIBLE_BROWSER_COOLDOWN_MS;
}

async function waitForVisibleBrowserCooldown(options) {
    const remaining = visibleBrowserCooldownMs(options)
        - (Date.now() - lastVisibleBrowserActivityAt);
    if (remaining <= 0) {
        return;
    }
    await new Promise((resolve) => setTimeout(resolve, remaining));
}

function firstErrorLine(error) {
    return String(error?.message || error || "未知错误").split("\n")[0];
}

function normalizedExecutableCandidates(candidates) {
    if (!Array.isArray(candidates)) {
        return undefined;
    }
    const normalized = candidates.map((candidate) => String(candidate || "").trim()).filter(Boolean);
    return normalized.length > 0 ? [...new Set(normalized)] : undefined;
}

function chooseMainPage(pages, initialUrl) {
    let expectedHost = "";
    try {
        expectedHost = new URL(initialUrl).hostname;
    }
    catch {
        // A custom target may not be a complete URL yet.
    }
    if (expectedHost) {
        const matching = [...pages].reverse().find((page) => {
            try {
                return new URL(page.url()).hostname === expectedHost;
            }
            catch {
                return false;
            }
        });
        if (matching) {
            return matching;
        }
    }
    return [...pages].reverse().find((page) => page.url() !== "about:blank");
}
