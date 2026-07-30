export const builtInPlatforms = [
    {
        name: "doubao",
        label: "豆包",
        url: "https://www.doubao.com/chat/",
        adapter: "generic-chat",
        profile: "doubao",
        requiresLogin: true,
        selectors: {
            loginGate: [
                "[class*='login-btn-header']",
                "button:has-text('登录')",
                "button:has-text('Sign in')",
                "[data-testid*='login']"
            ],
            input: ["[contenteditable='true'][role='textbox']", "div[role='textbox']", "textarea.semi-input-textarea", ".semi-input-textarea", "textarea"],
            send: ["#flow-end-msg-send", ".send-btn-wrapper button", "[class*='send-btn-wrapper'] button", "button:has-text('发送')", "button[type='submit']"],
            answer: [
                "[data-plugin-identifier='block_type:10000'] .md-box-root",
                ".md-box-root",
                "[data-testid*='message']",
                "[class*='message-content']",
                "[class*='answer']",
                "[class*='chat-message']",
                "[class*='markdown']"
            ],
            references: [
                "[data-plugin-identifier='block_type:10000'] .md-box-root a[href]",
                ".md-box-root a[href]"
            ]
        },
        sendFallback: "input-container-bottom-right"
    },
    {
        name: "yuanbao",
        label: "元宝",
        url: "https://yuanbao.tencent.com/",
        adapter: "generic-chat",
        profile: "yuanbao",
        requiresLogin: true,
        selectors: {
            loginGate: [
                ".hyc-login-v2",
                "[data-placeholder*='请登录后']",
                "button:has-text('登录')"
            ],
            input: ["#search-bar .ql-editor[contenteditable='true']", ".ql-editor[contenteditable='true']", "textarea", "[contenteditable='true']", "div[role='textbox']"],
            send: ["#yuanbao-send-btn", "a[id*='send']", "[class*='send-btn']", "button:has-text('发送')", "button[type='submit']", "button"],
            answer: [
                ".agent-chat__list__item--ai .hyc-common-markdown",
                ".agent-chat__list__item--ai [class*='markdown']",
                "[class*='hyc-component-markdown']",
                "[class*='message']",
                "[class*='answer']",
                "#chat-content"
            ],
            references: ["#chat-content a[href]", "[class*='source'] a[href]", "[class*='reference'] a[href]"]
        }
    },
    {
        name: "deepseek",
        label: "DeepSeek",
        url: "https://chat.deepseek.com/",
        adapter: "generic-chat",
        profile: "deepseek",
        requiresLogin: true,
        selectors: {
            loginGate: [
                ".ds-sign-in-form__main",
                "input[placeholder='请输入手机号']",
                "input[placeholder='请输入验证码']",
                "[class*='sign-in-with-wechat']",
                "[class*='sign-in-form']"
            ],
            input: ["textarea", "[contenteditable='true']", "div[role='textbox']"],
            send: ["button:has-text('Send')", "button:has-text('发送')", "button[type='submit']", "button"],
            answer: [
                ".ds-markdown.ds-assistant-message-main-content",
                ".ds-assistant-message-main-content",
                "[class*='assistant'][class*='message']",
                "[class*='message']",
                "main"
            ],
            references: [
                ".ds-assistant-message-main-content a[href]",
                ".ds-markdown.ds-assistant-message-main-content a[href]"
            ]
        }
    },
    {
        name: "qianwen",
        label: "千问",
        url: "https://tongyi.aliyun.com/qianwen/",
        adapter: "generic-chat",
        profile: "qianwen",
        selectors: {
            input: [
                "[data-slate-editor='true'][contenteditable='true'][role='textbox']",
                "[data-placeholder='向千问提问'][contenteditable='true']",
                "[data-chat-input-shell='true'] [contenteditable='true']",
                "textarea",
                "[contenteditable='true']",
                "div[role='textbox']"
            ],
            send: ["button[aria-label='发送消息']", "button:has-text('发送')", "button[type='submit']"],
            answer: [
                ".qk-markdown.qk-markdown-react",
                "#qk-markdown-react",
                ".markdown-pc-special-class .qk-markdown",
                "[data-message-author-role='assistant']",
                "[class*='message']",
                "[class*='answer']",
                "main"
            ],
            references: [
                "[class*='reference'] a[href]",
                "[class*='source'] a[href]",
                "[class*='search'] a[href]",
                ".qk-md a[href]"
            ]
        }
    },
    {
        name: "dknowc-chat",
        label: "深知晓",
        url: "https://yun.dknowc.cn/wlcb/dknowc-chat/",
        adapter: "dknowc-chat",
        profile: "dknowc-chat",
        selectors: {
            input: ["textarea", "[contenteditable='true']", "input[type='text']"],
            send: ["button:has-text('发送')", "button[type='submit']", "button"],
            answer: [
                ".czkj-robot:not(.chat-load-text) .czkj-msg",
                ".czkj-robot .czkj-msg",
                ".czkj-chat-center .czkj-msg",
                "[class*='assistant']",
                "[class*='answer']",
                "[class*='message']",
                ".chat-content",
                "main",
                "body"
            ],
            references: [
                "a[href]",
                ".czkj-robot [data-url]",
                ".chatsse-note-item [data-url]",
                ".chat-jb [data-url]",
                ".czkj-robot a[href]",
                "[class*='source'] a[href]",
                "[class*='citation'] a[href]",
                "[class*='reference'] a[href]"
            ]
        }
    },
    {
        name: "dknowc-deep-research",
        label: "深知晓（深度研究）",
        url: "https://poc1.dknowc.cn/wlcb/shenzhimini-test5/",
        adapter: "dknowc-deep-research",
        profile: "dknowc-chat",
        deepResearchTimeoutMs: 600000,
        selectors: {
            input: ["textarea", "[contenteditable='true']", "input[type='text']"],
            send: ["button:has-text('发送')", "button[type='submit']", "button"],
            answer: [
                ".czkj-robot:not(.chat-load-text) .czkj-msg",
                ".czkj-robot .czkj-msg",
                ".czkj-chat-center .czkj-msg",
                "[class*='assistant']",
                "[class*='answer']",
                "[class*='message']",
                ".chat-content",
                "main",
                "body"
            ],
            references: [
                "a[href]",
                ".czkj-robot [data-url]",
                ".chatsse-note-item [data-url]",
                ".chat-jb [data-url]",
                ".czkj-robot a[href]",
                "[class*='source'] a[href]",
                "[class*='citation'] a[href]",
                "[class*='reference'] a[href]"
            ],
            deepResearch: [
                ".chatgpt-deepsearch.open",
                ".chatgpt-deepsearch[data-opens]"
            ]
        }
    },
    {
        name: "generic",
        label: "Generic Chat",
        url: "",
        adapter: "generic-chat",
        profile: "generic"
    }
];
export function listPlatformConfigs() {
    return builtInPlatforms;
}
export function resolvePlatformTarget(raw) {
    const [nameOrUrl, explicitUrl] = raw.includes("=")
        ? raw.split(/=(.*)/s).filter(Boolean)
        : [raw, ""];
    const builtIn = builtInPlatforms.find((platform) => platform.name === nameOrUrl);
    if (builtIn) {
        return {
            ...builtIn,
            url: explicitUrl || builtIn.url
        };
    }
    const url = explicitUrl || nameOrUrl;
    return {
        name: hostNameFor(url),
        label: hostNameFor(url),
        url,
        adapter: "generic-chat",
        profile: hostNameFor(url)
    };
}
function hostNameFor(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    }
    catch {
        return "generic";
    }
}
