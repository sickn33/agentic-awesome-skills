import assert from "node:assert/strict";
import {
    authenticationRequired,
    waitForAuthentication
} from "../assets/tool/dist/capture/auth-state.js";
import {
    activateDknowcDeepResearch,
    confirmPromptSubmission,
    extractDoubaoSourceMentions,
    isPdfReference,
    looksLikeLoginOnlyText,
    looksLikeNonAnswerPrompt,
    waitForAnswer
} from "../assets/tool/dist/capture/generic-chat.js";
import { builtInPlatforms } from "../assets/tool/dist/capture/platform-registry.js";
import { captureWithRetries } from "../assets/tool/dist/cli.js";
import { normalizeUrl } from "../assets/tool/dist/utils/urls.js";

const started = Date.now();
const deepResearchConfig = builtInPlatforms.find(
    (platform) => platform.name === "dknowc-deep-research"
);
assert.equal(deepResearchConfig.label, "深知晓（深度研究）");
assert.equal(
    deepResearchConfig.url,
    "https://poc1.dknowc.cn/wlcb/shenzhimini-test5/"
);
assert.equal(deepResearchConfig.profile, "dknowc-chat");

const deepResultPage = {
    async waitForLoadState() {},
    url() {
        return "https://poc1.dknowc.cn/wlcb/SDSYbaogao/?uid=test";
    }
};
let deepResearchClicked = 0;
const deepResearchPage = {
    locator(selector) {
        assert.equal(selector, ".chatgpt-deepsearch.open");
        return {
            last() {
                return this;
            },
            nth() {
                return this;
            },
            async count() {
                return 1;
            },
            async isVisible() {
                return true;
            },
            async click() {
                deepResearchClicked += 1;
            }
        };
    },
    async waitForTimeout() {}
};
const deepResearchContext = {
    pages() {
        return [deepResearchPage];
    },
    async waitForEvent(event) {
        assert.equal(event, "page");
        return deepResultPage;
    }
};
assert.equal(
    await activateDknowcDeepResearch(
        deepResearchPage,
        deepResearchContext,
        deepResearchConfig,
        1000
    ),
    deepResultPage
);
assert.equal(deepResearchClicked, 1);

const page = {
    locator(selector) {
        return {
            last() {
                return this;
            },
            async count() {
                return selector === ".answer" || selector.includes("停止") ? 1 : 0;
            },
            async isVisible() {
                return selector.includes("停止") && Date.now() - started < 320;
            },
            async innerText() {
                const elapsed = Date.now() - started;
                if (elapsed < 100) {
                    return "为您智能匹配到当前所在区域为“北京市”，如想咨询其他区域可点击修改";
                }
                if (elapsed < 220) {
                    return "每人每月最高提取";
                }
                if (elapsed < 320) {
                    return "每人每月最高提取 1400";
                }
                return "每人每月最高提取 1400 元。";
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 50)));
    }
};

assert.equal(
    looksLikeNonAnswerPrompt("为您智能匹配到当前所在区域为“北京市”，如想咨询其他区域可点击修改"),
    true
);
assert.equal(
    looksLikeNonAnswerPrompt("北京高考报名分为网上申请、填报缴费和现场确认三个阶段。".repeat(8) + " 页面底部：为您智能匹配到当前所在区域为“北京市”，如想咨询其他区域可点击修改"),
    false
);
assert.equal(
    looksLikeLoginOnlyText("完整政策回答中要求考生登录北京教育考试院网站填报信息。".repeat(8)),
    false
);
assert.equal(isPdfReference("https://example.gov.cn/policy/source.PDF?download=1"), true);
assert.equal(
    normalizeUrl("https://example.gov.cn/policy.pdf?f_link_type=f_linkinlinenote&flow_extra=opaque&download=1"),
    "https://example.gov.cn/policy.pdf?download=1"
);
const answer = await waitForAnswer(
    {
        name: "slow-test",
        label: "慢响应测试",
        selectors: { answer: [".answer"] },
        completionStableMs: 180
    },
    page,
    10000,
    "",
    "广州无合同租房提取住房公积金每月最高多少？"
);
assert.equal(answer, "每人每月最高提取 1400 元。");

const dknowStarted = Date.now();
const dknowPage = {
    locator(selector) {
        return {
            last() {
                return this;
            },
            async count() {
                return selector === ".chat-loading, .stopChat" ? 1 : 0;
            },
            async isVisible() {
                if (selector === ".chat-loading, .stopChat") {
                    return Date.now() - dknowStarted < 180;
                }
                return false;
            },
            async innerText() {
                return "";
            },
            async evaluateAll(callback) {
                const text = Date.now() - dknowStarted < 180
                    ? "工业互联网平台、MES"
                    : "工业互联网平台、MES/ERP系统升级完整测算与最终汇总。";
                return callback([{ innerText: text }]);
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 20)));
    }
};
const completeDknowAnswer = await waitForAnswer(
    {
        name: "dknowc-chat",
        label: "深知晓",
        selectors: {},
        completionStableMs: 40
    },
    dknowPage,
    3000,
    "",
    "复杂政策测算问题"
);
assert.equal(
    completeDknowAnswer,
    "工业互联网平台、MES/ERP系统升级完整测算与最终汇总。"
);

const deepProgressStarted = Date.now();
const deepProgressPage = {
    locator(selector) {
        return {
            last() {
                return this;
            },
            async count() {
                return 1;
            },
            async isVisible() {
                if (selector.includes("load-deep-search")) {
                    return Date.now() - deepProgressStarted < 180;
                }
                return false;
            },
            async innerText() {
                return "";
            },
            async evaluateAll(callback) {
                const text = Date.now() - deepProgressStarted < 180
                    ? "[查询]现行个人所得税法第六条 居民个人综合所得基本减除费用每月5000元"
                    : "深度研究结论：居民个人综合所得基本减除费用为每年六万元，即每月5000元。";
                return callback([{ innerText: text }]);
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 20)));
    }
};
const completeDeepResearchAnswer = await waitForAnswer(
    {
        name: "dknowc-deep-research",
        label: "深知晓（深度研究）",
        selectors: {},
        completionStableMs: 40
    },
    deepProgressPage,
    3000,
    "",
    "复杂政策研究问题"
);
assert.equal(
    completeDeepResearchAnswer,
    "深度研究结论：居民个人综合所得基本减除费用为每年六万元，即每月5000元。"
);

let attempts = 0;
const retried = await captureWithRetries(
    { name: "retry-test", label: "重采测试", url: "https://example.invalid" },
    {
        timeoutMs: 1000,
        retryCount: 2,
        retryDelayMs: 0
    },
    async (config) => {
        attempts += 1;
        return attempts < 3
            ? {
                platform: config.name,
                label: config.label,
                url: config.url,
                status: "failed",
                answerMarkdown: "",
                references: [],
                error: "尚未采集完成"
            }
            : {
                platform: config.name,
                label: config.label,
                url: config.url,
                status: "success",
                answerMarkdown: "完整回答",
                references: []
            };
    },
    async () => undefined
);
assert.equal(attempts, 3);
assert.equal(retried.status, "success");

const replayQuestion = "页面关闭后必须重新提交的原问题";
let replayAttempts = 0;
const replayed = await captureWithRetries(
    { name: "page-replay-test", label: "页面恢复测试", url: "https://example.invalid" },
    { question: replayQuestion, timeoutMs: 1000, retryCount: 1, retryDelayMs: 0 },
    async (config, options) => {
        replayAttempts += 1;
        assert.equal(options.question, replayQuestion);
        return replayAttempts === 1
            ? { platform: config.name, label: config.label, url: config.url, status: "failed", answerMarkdown: "", references: [], error: "采集页面已关闭；将重开页面并自动重放原问题。" }
            : { platform: config.name, label: config.label, url: config.url, status: "success", answerMarkdown: `已回答：${options.question}`, references: [] };
    },
    async () => undefined
);
assert.equal(replayAttempts, 2);
assert.equal(replayed.answerMarkdown.includes(replayQuestion), true);

let manualGateAttempts = 0;
let manualGateWaits = 0;
const manualGateResult = await captureWithRetries(
    { name: "manual-gate-test", label: "人工门禁测试", url: "https://example.invalid" },
    {
        timeoutMs: 1000,
        retryCount: 2,
        retryDelayMs: 0
    },
    async (config) => {
        manualGateAttempts += 1;
        return {
            platform: config.name,
            label: config.label,
            url: config.url,
            status: "verification_required",
            answerMarkdown: "",
            references: [],
            error: "需要人工验证"
        };
    },
    async () => {
        manualGateWaits += 1;
    }
);
assert.equal(manualGateAttempts, 1);
assert.equal(manualGateWaits, 0);
assert.equal(manualGateResult.status, "verification_required");

const promptQuestion = "如何参加北京高考？";
let promptValue = promptQuestion;
let promptBody = "";
let promptAnswer = "";
const promptPage = {
    locator(selector) {
        return {
            last() {
                return this;
            },
            async count() {
                return selector === ".answer" && promptAnswer ? 1 : 0;
            },
            async isVisible() {
                return false;
            },
            async innerText() {
                if (selector === "body") {
                    return promptBody;
                }
                return promptAnswer;
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 10)));
    }
};
const promptInput = {
    async evaluate() {
        return promptValue;
    }
};
const promptConfig = {
    name: "prompt-test",
    label: "发送确认测试",
    selectors: { answer: [".answer"] }
};
assert.equal(
    await confirmPromptSubmission(promptConfig, promptPage, promptInput, promptQuestion, "", 40),
    "unconfirmed"
);
setTimeout(() => {
    promptValue = "";
}, 20);
assert.equal(
    await confirmPromptSubmission(promptConfig, promptPage, promptInput, promptQuestion, "", 200),
    "submitted"
);
promptValue = promptQuestion;
promptBody = "请完成人机验证";
assert.equal(
    await confirmPromptSubmission(promptConfig, promptPage, promptInput, promptQuestion, "", 100),
    "verification_required"
);

const lateGateStarted = Date.now();
const lateGatePage = {
    locator(selector) {
        return {
            last() {
                return this;
            },
            async count() {
                return selector === ".answer" ? 1 : 0;
            },
            async isVisible() {
                return false;
            },
            async innerText() {
                if (selector === "body") {
                    return Date.now() - lateGateStarted < 50 ? "请完成人机验证" : "";
                }
                return Date.now() - lateGateStarted < 80 ? "" : "北京高考报名条件完整回答";
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 10)));
    }
};
const answerAfterLateGate = await waitForAnswer(
    {
        name: "late-gate-test",
        label: "生成期验证测试",
        selectors: { answer: [".answer"] },
        completionStableMs: 40
    },
    lateGatePage,
    1000,
    "",
    promptQuestion,
    {
        interactive: true,
        verificationTimeoutMs: 500
    }
);
assert.equal(answerAfterLateGate, "北京高考报名条件完整回答");

const answeredDespiteExpiredSessionPage = {
    locator(selector) {
        const isAnswer = selector === ".answer";
        const isLoginSelector = selector.includes("登录") || selector.includes("login");
        return {
            last() {
                return this;
            },
            async count() {
                return isAnswer || isLoginSelector ? 1 : 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                return isLoginSelector;
            },
            async innerText() {
                if (selector === "body") {
                    return "会话过期，请重新登录";
                }
                if (isAnswer) {
                    return "北京市高考报名资格、网上申请、填报缴费和现场确认的完整回答。".repeat(5);
                }
                return "";
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 10)));
    }
};
const recoveredAfterSessionExpiry = await waitForAnswer(
    {
        name: "expired-after-answer-test",
        label: "回答完成后登录失效测试",
        requiresLogin: true,
        selectors: {
            answer: [".answer"],
            loginGate: ["button:has-text('登录')"]
        },
        completionStableMs: 40
    },
    answeredDespiteExpiredSessionPage,
    1000,
    "",
    promptQuestion,
    {
        interactive: false,
        verificationTimeoutMs: 100
    }
);
assert.match(recoveredAfterSessionExpiry, /现场确认/);

let loggedIn = false;
const loggedOutPageWithInput = {
    locator(selector) {
        const isLoginSelector = selector.includes("登录") || selector.includes("login");
        return {
            async count() {
                return isLoginSelector ? 1 : selector.includes("textarea") ? 1 : 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                return isLoginSelector ? !loggedIn : true;
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 20)));
    }
};
const doubaoConfig = {
    name: "doubao",
    label: "豆包",
    requiresLogin: true,
    selectors: {
        loginGate: ["[class*='login-btn-header']", "button:has-text('登录')"],
        input: ["textarea"]
    }
};
assert.equal(await authenticationRequired(loggedOutPageWithInput, doubaoConfig), true);
setTimeout(() => {
    loggedIn = true;
}, 60);
assert.equal(await waitForAuthentication(loggedOutPageWithInput, doubaoConfig, 5000), true);

let transientAuthCheck = 0;
const transientReloadPage = {
    locator(selector) {
        const isLoginSelector = selector.includes("登录") || selector.includes("login");
        return {
            async count() {
                return isLoginSelector ? 1 : 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                if (!isLoginSelector) {
                    return false;
                }
                transientAuthCheck += 1;
                return transientAuthCheck !== 2;
            },
            async innerText() {
                return "";
            }
        };
    },
    async waitForTimeout(milliseconds) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(milliseconds, 10)));
    }
};
assert.equal(
    await waitForAuthentication(transientReloadPage, doubaoConfig, 120),
    false
);

const yuanbaoConfig = builtInPlatforms.find((platform) => platform.name === "yuanbao");
assert.equal(yuanbaoConfig?.requiresLogin, true);
const yuanbaoLoginOverlayPage = {
    locator(selector) {
        const isLoginOverlay = selector === ".hyc-login-v2";
        return {
            async count() {
                return isLoginOverlay ? 1 : 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                return isLoginOverlay;
            },
            async innerText() {
                return selector === "body" ? "请登录后输入内容" : "";
            }
        };
    }
};
assert.equal(
    await authenticationRequired(yuanbaoLoginOverlayPage, yuanbaoConfig),
    true
);

const deepseekConfig = builtInPlatforms.find((platform) => platform.name === "deepseek");
assert.equal(deepseekConfig?.requiresLogin, true);
const deepseekLoginPage = {
    locator(selector) {
        const isLoginForm = selector === ".ds-sign-in-form__main";
        return {
            async count() {
                return isLoginForm ? 1 : 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                return isLoginForm;
            },
            async innerText() {
                return selector === "body" ? "请输入手机号 请输入验证码 微信扫码登录" : "";
            }
        };
    }
};
assert.equal(
    await authenticationRequired(deepseekLoginPage, deepseekConfig),
    true
);

const expiredSessionPage = {
    locator(selector) {
        return {
            async count() {
                return 0;
            },
            nth() {
                return this;
            },
            async isVisible() {
                return false;
            },
            async innerText() {
                return selector === "body" ? "会话过期，请重新登录" : "";
            }
        };
    }
};
assert.equal(await authenticationRequired(expiredSessionPage, doubaoConfig), true);

let doubaoSourceSelector = "";
const doubaoSourcePage = {
    locator(selector) {
        assert.equal(selector, ".md-box-root");
        return {
            last() {
                return {
                    locator(sourceSelector) {
                        doubaoSourceSelector = sourceSelector;
                        return {
                            async evaluateAll(callback) {
                                return callback([
                                    { textContent: "广州住房公积金管理中心" },
                                    { textContent: " 广州住房公积金管理中心 " },
                                    { textContent: "广州市人民政府" }
                                ]);
                            }
                        };
                    }
                };
            }
        };
    }
};
const sourceMentions = await extractDoubaoSourceMentions(doubaoSourcePage);
assert.match(doubaoSourceSelector, /container-sWvQla/);
assert.deepEqual(sourceMentions, [
    { label: "广州住房公积金管理中心", marker: "1", occurrenceCount: 2 },
    { label: "广州市人民政府", marker: "2", occurrenceCount: 1 }
]);
if (process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT, JSON.stringify({
        schemaVersion: "fact-check-x/test-assertions@1",
        actualAssertionIds: ["browser.question_replayed", "browser.retry_submitted"]
    }));
}
console.log("PASS 采集等待完整回答");
