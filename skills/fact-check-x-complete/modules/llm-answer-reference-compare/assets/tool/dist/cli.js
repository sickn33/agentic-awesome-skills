#!/usr/bin/env node
import { Command } from "commander";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { authenticationRequired, waitForAuthentication } from "./capture/auth-state.js";
import { openBrowserSession } from "./capture/browser-session.js";
import { captureGenericChat } from "./capture/generic-chat.js";
import { buildLoginRecovery } from "./capture/login-recovery.js";
import { captureDknowcChat } from "./capture/providers/dknowc-chat.js";
import { listPlatformConfigs, resolvePlatformTarget } from "./capture/platform-registry.js";
import { renderHtmlReport } from "./report/html-report.js";
import { renderMarkdownReport } from "./report/markdown-report.js";
import { parseRunResult } from "./schema/result.js";
import { ensureDir, readJsonFile, writeJsonFile, writeTextFile } from "./utils/filesystem.js";
import { profileDirectory } from "./utils/profile.js";
import { normalizeUrl } from "./utils/urls.js";
export async function generateReportFiles(run, outDir) {
    await ensureDir(outDir);
    await writeJsonFile(join(outDir, "results.json"), run);
    await writeTextFile(join(outDir, "report.html"), renderHtmlReport(run));
    await writeTextFile(join(outDir, "report.md"), renderMarkdownReport(run));
}
async function reportCommand(input, outDir) {
    const run = parseRunResult(await readJsonFile(input));
    await generateReportFiles(run, outDir);
    console.log(`报告已写入 ${outDir}`);
}
async function loginCommand(platformTarget, timeoutMs, outDir, question) {
    const config = resolvePlatformTarget(platformTarget);
    const profileDir = profileDirectory(config.profile);
    let session;
    let saved = false;
    try {
        session = await openBrowserSession(profileDir, config.url, {
            headed: true,
            interactive: true
        });
        const page = session.page;
        await page.goto(config.url, { waitUntil: "domcontentloaded" });
        if (config.requiresLogin) {
            await page.waitForTimeout(1500);
        }
        console.log(`已打开 ${config.label} 浏览器。首次使用请完成登录；检测到可提问界面后将自动保存会话。`);
        let loginRequired = await authenticationRequired(page, config);
        if (!loginRequired) {
            loginRequired = !(await waitForAuthentication(page, config, Math.min(timeoutMs, 5000)));
        }
        if (loginRequired) {
            console.log(`${config.label} 当前未登录。请在浏览器完成登录；登录入口消失前不会保存会话。`);
            const authenticated = await waitForAuthentication(page, config, timeoutMs);
            if (!authenticated) {
                throw new Error(`${config.label} 在 ${Math.round(timeoutMs / 1000)} 秒内未完成登录，请重新运行登录准备。`);
            }
        }
        const ready = await waitForChatReady(page, config, timeoutMs);
        if (!ready) {
            throw new Error(`${config.label} 在 ${Math.round(timeoutMs / 1000)} 秒内未检测到已登录的可提问界面，请重新运行登录准备。`);
        }
        saved = true;
    }
    catch (error) {
        const recovery = buildLoginRecovery(config, question, error);
        if (outDir) {
            await ensureDir(outDir);
            await writeJsonFile(join(outDir, "capture-recovery.json"), recovery);
            console.error(`登录准备未完成，已写出 ${join(outDir, "capture-recovery.json")}。`);
        }
        console.error("当前载体具备 Computer Use 时必须用它恢复同一平台；否则停止在原始答案采集阶段。禁止改用 headless、另一套浏览器或命令行诊断。");
        throw new Error(`登录准备未完成，已停止在原始答案采集阶段并请求 Computer Use 恢复：${recovery.failedPlatforms[0].error}`);
    }
    finally {
        if (session) {
            await session.release();
        }
    }
    if (saved) {
        console.log(`已保存 ${config.label} 登录状态：${profileDir}`);
    }
}

async function waitForChatReady(page, config, timeoutMs) {
    const selectors = (config.selectors?.input || ["textarea", "[contenteditable='true']", "div[role='textbox']"])
        .filter((selector) => !selector.includes("input[type='text']"));
    const deadline = Date.now() + timeoutMs;
    let consecutiveReadyChecks = 0;
    while (Date.now() < deadline) {
        if (await authenticationRequired(page, config)) {
            consecutiveReadyChecks = 0;
            await page.waitForTimeout(1000);
            continue;
        }
        let inputVisible = false;
        for (const selector of selectors) {
            const locator = page.locator(selector);
            const count = await locator.count().catch(() => 0);
            for (let index = count - 1; index >= 0; index -= 1) {
                if (await locator.nth(index).isVisible().catch(() => false)) {
                    inputVisible = true;
                    break;
                }
            }
            if (inputVisible) {
                break;
            }
        }
        if (inputVisible) {
            consecutiveReadyChecks += 1;
            if (consecutiveReadyChecks >= 3) {
                return true;
            }
        }
        else {
            consecutiveReadyChecks = 0;
        }
        await page.waitForTimeout(700);
    }
    return false;
}
async function runCommand(options) {
    const timeoutMs = positiveNumber(options.timeout, 180000);
    const retryCount = nonnegativeInteger(options.retries, 2);
    const retryDelayMs = nonnegativeInteger(options.retryDelay, 3000);
    const configs = options.platform.map(resolvePlatformTarget);
    const platforms = [];
    for (const config of configs) {
        const loginTimeoutMs = positiveNumber(options.loginTimeout, 300000);
        const result = await captureWithRetries(config, {
            question: options.question,
            outDir: options.out,
            headed: Boolean(options.headed || options.interactive),
            interactive: Boolean(options.interactive),
            timeoutMs,
            loginTimeoutMs,
            retryCount,
            retryDelayMs
        });
        platforms.push(result);
    }
    const run = parseRunResult({
        schemaVersion: "1",
        question: options.question,
        createdAt: new Date().toISOString(),
        platforms
    });
    await generateReportFiles(run, options.out);
    console.log(`报告已写入 ${options.out}`);
    const incomplete = platforms.filter((platform) => platform.status !== "success");
    if (incomplete.length > 0) {
        await writeJsonFile(join(options.out, "capture-recovery.json"), {
            schemaVersion: "fact-check-x/capture-recovery@1",
            status: "required",
            action: "computer_use",
            createdAt: new Date().toISOString(),
            question: options.question,
            failedPlatforms: incomplete.map((platform) => ({
                platform: platform.platform,
                label: platform.label,
                url: normalizeUrl(platform.url),
                loginUrl: normalizeUrl(platform.url),
                status: platform.status,
                error: platform.error
            })),
            instructions: [
                "运行载体具备 Computer Use 时用它恢复同一平台；否则停止在原始答案采集阶段。",
                "需要用户本人处理账号、密码、验证码或人机验证。",
                "仅使用 failedPlatforms[].loginUrl 打开平台；该字段是已清洗的纯 URL，不得拼接说明文字或展示层追踪参数。",
                "直接读取本文件 question 字段并复用原始问题；不得要求用户回滚会话复制问题。",
                "接管后保持当前页面；等待人工验证时不得关闭、重复打开浏览器或机械重采。",
                "告诉用户完成后可回复“验证已完成”或“答案已生成”；继续检测当前回答并自动采集，无需暂停或取消任务。",
                "完成登录、地区选择、问题提交并等待回答停止生成。",
                "随后重新运行原始答案采集；全部平台成功前禁止进入知识点对比。"
            ]
        });
        const details = incomplete
            .map((platform) => `${platform.label}: ${platform.status} (${platform.error || "未知原因"})`)
            .join("；");
        throw new Error(`采集未完成，已停止流水线并请求 Computer Use 恢复，禁止进入知识点对比：${details}`);
    }
    await writeJsonFile(join(options.out, "capture-recovery.json"), {
        schemaVersion: "fact-check-x/capture-recovery@1",
        status: "not_required",
        action: "none",
        createdAt: new Date().toISOString(),
        question: options.question,
        failedPlatforms: []
    });
}
export async function captureWithRetries(config, options, capture = capturePlatform, wait = sleep) {
    const maxAttempts = options.retryCount + 1;
    let result;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        console.log(`正在采集 ${config.label}（第 ${attempt}/${maxAttempts} 次，最长等待 ${Math.round(options.timeoutMs / 1000)} 秒）`);
        result = await capture(config, options);
        if (result.status === "success") {
            console.log(`${config.label} 已确认采集完成。`);
            break;
        }
        console.log(`${config.label} 本次采集未完成：${result.status}；${result.error || "未知原因"}`);
        if (["login_required", "verification_required"].includes(result.status)) {
            console.log(`${config.label} 需要人工接管。已停止机械重采并保留原始问题；请根据 capture-recovery.json 继续。`);
            break;
        }
        if (attempt < maxAttempts) {
            console.log(`${Math.round(options.retryDelayMs / 1000)} 秒后重新采集 ${config.label}。`);
            await wait(options.retryDelayMs);
        }
    }
    return result;
}
async function capturePlatform(config, options) {
    if (config.adapter === "dknowc-chat") {
        return captureDknowcChat(config, options);
    }
    return captureGenericChat(config, options);
}
function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
function positiveNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
function nonnegativeInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}
export function createProgram() {
    const program = new Command();
    program
        .name("llm-compare")
        .description("无损采集并对比多个 AI 网页端的原始回答与引用。")
        .version("0.1.0");
    program
        .command("report")
        .description("从已有 results.json 生成原始答案与引用报告。")
        .requiredOption("--input <path>", "results.json 路径")
        .requiredOption("--out <dir>", "输出目录")
        .action(async (options) => {
        await reportCommand(options.input, options.out);
    });
    program
        .command("run")
        .description("从平台网页采集原始回答与引用并生成报告。")
        .requiredOption("--question <question>", "提交给各平台的用户问题")
        .requiredOption("--platform <target>", "平台名或 name=url 自定义目标", collect, [])
        .requiredOption("--out <dir>", "输出目录")
        .option("--headed", "显示浏览器窗口")
        .option("--interactive", "允许手工处理登录、二维码、验证码或其他验证")
        .option("--timeout <ms>", "回答生成完成等待毫秒数", "180000")
        .option("--login-timeout <ms>", "首次登录等待毫秒数", "300000")
        .option("--retries <count>", "每个平台失败后的自动重采次数", "2")
        .option("--retry-delay <ms>", "重采间隔毫秒数", "3000")
        .action(async (options) => {
        await runCommand(options);
    });
    program
        .command("login")
        .description("首次使用时打开可见浏览器，提示登录并在检测到聊天界面后保存会话。")
        .requiredOption("--platform <target>", "平台名或 name=url 自定义目标")
        .option("--question <question>", "需要在 Computer Use 恢复时复用的原始问题", "")
        .option("--out <dir>", "登录失败时写入 capture-recovery.json 的采集目录")
        .option("--timeout <ms>", "等待登录完成的毫秒数", "300000")
        .action(async (options) => {
        await loginCommand(options.platform, Number(options.timeout || 300000), options.out, options.question);
    });
    program
        .command("platforms")
        .description("列出内置平台。")
        .action(() => {
        for (const platform of listPlatformConfigs()) {
            console.log(`${platform.name}\t${platform.label}\t${platform.url || "(custom URL)"}`);
        }
    });
    return program;
}
function collect(value, previous) {
    previous.push(value);
    return previous;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    createProgram().parseAsync(process.argv).catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    });
}
