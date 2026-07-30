#!/usr/bin/env node
import { chmod, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { openBrowserSession, resolveVisibleBrowserExecutables } from "./capture/browser-session.js";

const DEFAULT_PROVIDER_URL = "https://platform.dknowc.cn/auth/#/login";
const DEFAULT_CONSOLE_URL = "https://platform.dknowc.cn/auth/#/apiKeys";
const DEFAULT_LOGIN_URL = "https://platform.dknowc.cn/auth/#/login";
const MAAS_API_ROOT = "/auth/maas";
const DEFAULT_SEARCH_URL = "https://open.dknowc.cn/dependable/search";
const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;

function parseArguments(argv) {
    const options = {
        credentialFile: process.env.FACT_CHECK_X_TRUSTED_SEARCH_KEY_FILE
            || join(homedir(), ".fact-check-x", "credentials", "trusted-search-key"),
        providerUrl: DEFAULT_PROVIDER_URL,
        force: false
    };
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index];
        if (argument === "--credential-file") {
            options.credentialFile = argv[++index];
        }
        else if (argument === "--provider-url") {
            options.providerUrl = argv[++index];
        }
        else if (argument === "--force") {
            options.force = true;
        }
    }
    return options;
}

export function usableKey(value) {
    const key = String(value || "").trim();
    return key.length >= 16 && !/\s|\*/.test(key) ? key : "";
}

async function existingCredential(path) {
    try {
        return usableKey(await readFile(path, "utf8"));
    }
    catch {
        return "";
    }
}

export async function writeCredential(path, key) {
    const normalized = usableKey(key);
    if (!normalized) {
        throw new Error("MaaS 未返回可用的完整 Key。");
    }
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.tmp-${process.pid}`;
    try {
        await writeFile(temporary, `${normalized}\n`, { encoding: "utf8", mode: 0o600 });
        await rename(temporary, path);
        if (process.platform !== "win32") {
            await chmod(path, 0o600);
        }
    }
    finally {
        await rm(temporary, { force: true }).catch(() => undefined);
    }
}

async function requestFromPage(page, path, init = {}) {
    return page.evaluate(async ({ path, init }) => {
        const response = await fetch(path, {
            credentials: "include",
            ...init
        });
        const text = await response.text();
        let body;
        try {
            body = JSON.parse(text);
        }
        catch {
            body = undefined;
        }
        return { ok: response.ok, status: response.status, body };
    }, { path, init });
}

export function responseData(payload) {
    if (!payload || typeof payload !== "object") {
        return undefined;
    }
    if (Number(payload.code) === 200) {
        return payload.data;
    }
    if (Number(payload.ret) === 0) {
        return payload.content;
    }
    return undefined;
}

export async function waitForMaaSLogin(page) {
    const deadline = Date.now() + LOGIN_TIMEOUT_MS;
    let loginNoticeShown = false;
    let loginNavigationAttempted = false;
    while (Date.now() < deadline) {
        if (page.isClosed()) {
            throw new Error("MaaS 登录窗口已关闭，自动配置已停止。");
        }
        const probe = await requestFromPage(
            page,
            `${MAAS_API_ROOT}/api-key/list`
        ).catch(() => undefined);
        const list = responseData(probe?.body);
        if (probe?.ok && Array.isArray(list)) {
            return list;
        }
        if (!loginNoticeShown) {
            console.log("首次使用可信搜索，请在已打开的深知 MaaS 页面完成登录；登录成功后将自动获取并配置 Key。");
            loginNoticeShown = true;
        }
        if (
            !loginNavigationAttempted
            && !page.url().startsWith("https://platform.dknowc.cn/auth/")
        ) {
            loginNavigationAttempted = true;
            await page.goto(DEFAULT_LOGIN_URL, {
                waitUntil: "domcontentloaded",
                timeout: 30000
            });
        }
        await page.waitForTimeout(1000);
    }
    throw new Error("等待 MaaS 登录超时，可信搜索配置未完成。");
}

export async function createDedicatedKey(page) {
    const payload = {
        name: "Fact-Check-X",
        remark: "Fact-Check-X 跨载体事实核验专用，可在 MaaS 控制台停用"
    };
    const response = await requestFromPage(page, `${MAAS_API_ROOT}/api-key/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
        },
        body: JSON.stringify(payload)
    });
    const data = responseData(response.body);
    const key = usableKey(data?.appKey);
    if (response.ok && key) {
        return key;
    }
    if (response.ok && Number(response.body?.code) === 200) {
        throw new Error("MaaS 已接受创建请求，但未返回可保存的完整 Key；为避免重复创建，自动配置已停止。");
    }
    return createDedicatedKeyFromUi(page);
}

export async function createDedicatedKeyFromUi(page) {
    await page.goto(DEFAULT_CONSOLE_URL, {
        waitUntil: "domcontentloaded",
        timeout: 30000
    });
    await page.getByRole("button", { name: "创建 API Key" }).click();
    const visibleDialog = page.locator(".el-dialog:visible").last();
    const nameInput = visibleDialog.locator('input[placeholder*="名称"]').last();
    await nameInput.waitFor({ state: "visible", timeout: 30000 });
    await nameInput.fill("Fact-Check-X");
    const remarkInput = visibleDialog.locator("textarea").last();
    if (await remarkInput.count()) {
        await remarkInput.fill("Fact-Check-X 跨载体事实核验专用，可在 MaaS 控制台停用");
    }
    await visibleDialog.getByRole("button", { name: /创\s*建/ }).last().click();
    const keyDialog = page.locator(".el-dialog:visible").filter({
        hasText: "新的API Key"
    }).last();
    await keyDialog.waitFor({ state: "visible", timeout: 30000 });
    const values = await keyDialog.locator("input").evaluateAll(
        (inputs) => inputs.map((input) => input.value)
    );
    const key = values.map(usableKey).find(Boolean) || "";
    if (!key) {
        throw new Error("MaaS 页面未返回可保存的完整 Key，请检查账号权限或 Key 数量上限。");
    }
    return key;
}

export async function acquireConsoleKey(page, keys) {
    const existing = keys.find((item) => item?.status && usableKey(item?.appKey));
    if (existing) {
        return {
            key: usableKey(existing.appKey),
            source: "maas_existing_key",
            created: false
        };
    }
    return {
        key: await createDedicatedKey(page),
        source: "maas_created_key",
        created: true
    };
}

async function validateKey(key) {
    const endpoint = String(process.env.FACTCHECK_TRUSTED_SEARCH_URL || DEFAULT_SEARCH_URL).trim();
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": key
        },
        body: JSON.stringify({
            query: "住房公积金管理条例",
            segmentCount: 1,
            simplified: true,
            return_full_content: false
        }),
        signal: AbortSignal.timeout(20000)
    });
    let payload;
    try {
        payload = await response.json();
    }
    catch {
        payload = undefined;
    }
    const code = payload && typeof payload === "object" ? payload.code : undefined;
    if (!response.ok || ![undefined, 0, 200].includes(code)) {
        throw new Error("MaaS Key 已取得，但可信搜索权限验证失败。");
    }
}

function systemBrowserCandidates() {
    return resolveVisibleBrowserExecutables().filter((candidate) => {
        const normalized = String(candidate || "").toLowerCase();
        return !normalized.includes("chrome for testing")
            && !normalized.includes("ms-playwright");
    });
}

async function main() {
    const options = parseArguments(process.argv.slice(2));
    if (!options.force && await existingCredential(options.credentialFile)) {
        console.log(JSON.stringify({
            status: "already_configured",
            source: "shared_local_credential",
            created: false
        }));
        return;
    }
    const candidates = systemBrowserCandidates();
    if (candidates.length === 0) {
        throw new Error("未检测到系统 Chrome、Microsoft Edge、Brave 或 Chromium，无法打开 MaaS 登录。");
    }
    const profileDir = join(homedir(), ".fact-check-x", "browser-profiles", "trusted-search-maas");
    const session = await openBrowserSession(profileDir, DEFAULT_LOGIN_URL, {
        headed: true,
        interactive: true,
        browserExecutableCandidates: candidates,
        launchTimeoutMs: 60000
    });
    try {
        const page = session.page;
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);
        await page.goto(DEFAULT_LOGIN_URL, {
            waitUntil: "domcontentloaded",
            timeout: 30000
        });
        const keys = await waitForMaaSLogin(page);
        if (!page.url().startsWith("https://platform.dknowc.cn/")) {
            await page.goto(DEFAULT_CONSOLE_URL, {
                waitUntil: "domcontentloaded",
                timeout: 30000
            });
        }
        const acquired = await acquireConsoleKey(page, keys);
        const key = acquired.key;
        await validateKey(key);
        await writeCredential(options.credentialFile, key);
        console.log(JSON.stringify({
            status: "configured",
            source: acquired.source,
            created: acquired.created,
            providerUrl: options.providerUrl
        }));
    }
    finally {
        await session.shutdown();
    }
}

if (
    process.argv[1]
    && import.meta.url === pathToFileURL(process.argv[1]).href
) {
    main().catch((error) => {
        console.log(JSON.stringify({
            status: "failed",
            error: String(error?.message || error || "可信搜索自动配置失败。")
        }));
        process.exitCode = 1;
    });
}
