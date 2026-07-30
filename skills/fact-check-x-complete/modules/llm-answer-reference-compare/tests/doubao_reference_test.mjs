import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium } from "../assets/tool/node_modules/@playwright/test/index.mjs";
import {
    activateDoubaoSubmittedConversation,
    extractDoubaoReferences,
    extractPdfReferenceContent
} from "../assets/tool/dist/capture/generic-chat.js";

function buildSimplePdf(text) {
    const escaped = text.replace(/([()\\])/g, "\\$1");
    const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
    const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (let index = 0; index < objects.length; index += 1) {
        offsets.push(Buffer.byteLength(pdf));
        pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf);
}

const browser = await chromium.launch({
    headless: true,
    channel: process.env.FACTCHECK_PLAYWRIGHT_CHANNEL || "chromium"
});
const context = await browser.newContext();
await context.route("https://policy.example/**", async (route) => {
    await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: "<title>政策原文</title><main>广州住房公积金管理中心发布政策原文：无合同租房提取额度2024年11月起为2000元/人/月，每3个月提取一次；生育二孩及以上家庭上浮40%。</main>"
    });
});
const page = await context.newPage();
await page.setContent(`
    <div class="md-box-root">
        <span class="container-sWvQla">权威机...</span>
    </div>
    <script>
        const openSourcePopover = () => {
            if (document.querySelector(".semi-popover-wrapper-show")) return;
            const popover = document.createElement("div");
            popover.className = "semi-popover-wrapper-show";
            popover.innerHTML =
                '<div class="content-ir5YyT"><div>权威机构</div>' +
                '<div class="title-ehsWfR">政策原文</div></div>';
            popover.querySelector(".content-ir5YyT").addEventListener("click", () => {
                window.open("https://policy.example/item");
            });
            document.body.appendChild(popover);
        };
        document.querySelector(".container-sWvQla").addEventListener("mouseenter", openSourcePopover);
        document.querySelector(".container-sWvQla").addEventListener("click", openSourcePopover);
    </script>
`);

const references = await extractDoubaoReferences(page, "https://www.doubao.com/chat/");
assert.deepEqual(references, [
    {
        title: "政策原文",
        url: "https://policy.example/item",
        normalizedUrl: "https://policy.example/item",
        marker: "1",
        text: "权威机...",
        snippet: "广州住房公积金管理中心发布政策原文：无合同租房提取额度2024年11月起为2000元/人/月，每3个月提取一次；生育二孩及以上家庭上浮40%。",
        content: "广州住房公积金管理中心发布政策原文：无合同租房提取额度2024年11月起为2000元/人/月，每3个月提取一次；生育二孩及以上家庭上浮40%。",
        citationScope: "inline",
        contentAcquisition: "direct_page_extraction"
    }
]);

const enterpriseTaskPage = await context.newPage();
await enterpriseTaskPage.setContent(`
    <main id="task-page">新办公任务</main>
    <a id="conversation_old" href="/chat/old">旧会话</a>
    <script>
        window.conversationActivated = false;
        setTimeout(() => {
            const conversation = document.createElement("a");
            conversation.id = "conversation_new";
            conversation.href = "/chat/new";
            conversation.textContent = "新建会话";
            conversation.addEventListener("click", (event) => {
                event.preventDefault();
                window.conversationActivated = true;
                document.querySelector("#task-page").innerHTML =
                    '<div class="md-box-root">企业版新建侧栏会话后的完整回答</div>';
            });
            document.body.prepend(conversation);
        }, 100);
    </script>
`);
assert.equal(
    await activateDoubaoSubmittedConversation(
        enterpriseTaskPage,
        ["conversation_old"],
        "",
        3000
    ),
    true
);
assert.equal(
    await enterpriseTaskPage.evaluate(() => window.conversationActivated),
    true
);
assert.match(
    await enterpriseTaskPage.locator(".md-box-root").innerText(),
    /完整回答/
);

const regularChatPage = await context.newPage();
await regularChatPage.setContent(`
    <a id="conversation_current" href="/chat/current">当前会话</a>
    <div class="md-box-root">普通豆包在当前会话直接生成的完整回答</div>
    <script>
        window.regularConversationClicked = false;
        document.querySelector("#conversation_current").addEventListener("click", () => {
            window.regularConversationClicked = true;
        });
    </script>
`);
assert.equal(
    await activateDoubaoSubmittedConversation(
        regularChatPage,
        [],
        "",
        1000
    ),
    false
);
assert.equal(
    await regularChatPage.evaluate(() => window.regularConversationClicked),
    false
);

const pdfBody = buildSimplePdf("Official policy source confirms the locally cited claim with verifiable body text. ".repeat(3));
const savedKey = process.env.TRUSTED_SEARCH_KEY;
const originalTrustedSearchUrl = process.env.FACTCHECK_TRUSTED_SEARCH_URL;
delete process.env.TRUSTED_SEARCH_KEY;
delete process.env.FACTCHECK_TRUSTED_SEARCH_URL;
let trustedSearchRequest = null;
let trustedSourceUrl = "";
const pdfServer = createServer((request, response) => {
    if (request.url === "/search" && request.method === "POST") {
        let raw = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
            raw += chunk;
        });
        request.on("end", () => {
            trustedSearchRequest = JSON.parse(raw);
            const fullText = "Trusted search full content confirms the official PDF claim with complete verifiable source body. ".repeat(4);
            const body = Buffer.from(JSON.stringify({
                content: {
                    data: {
                        "检索文章": [{
                            "文章标题": "Official blocked PDF source",
                            "源网址": trustedSourceUrl,
                            "全文": fullText,
                            "段落": []
                        }]
                    }
                }
            }));
            response.writeHead(200, {
                "content-type": "application/json",
                "content-length": body.length
            });
            response.end(body);
        });
        return;
    }
    if (request.url?.startsWith("/blocked.pdf")) {
        response.writeHead(403);
        response.end();
        return;
    }
    response.writeHead(200, {
        "content-type": "application/pdf",
        "content-length": pdfBody.length
    });
    response.end(pdfBody);
});
await new Promise((resolve) => pdfServer.listen(0, "127.0.0.1", resolve));
const pdfAddress = pdfServer.address();
assert.equal(typeof pdfAddress, "object");
const pdfUrl = `http://127.0.0.1:${pdfAddress.port}/policy.pdf?f_link_type=f_linkinlinenote&flow_extra=opaque&download=1`;
const pdfPage = await context.newPage();
const extractedPdfText = await extractPdfReferenceContent(pdfPage, pdfUrl);
assert.ok(extractedPdfText.length >= 80, `PDF extracted length was ${extractedPdfText.length}`);
await pdfPage.setContent(`
    <div class="md-box-root">
        <p><a href="${pdfUrl}">Official PDF source</a></p>
    </div>
`);
const pdfReferences = await extractDoubaoReferences(pdfPage, "https://www.doubao.com/chat/");
assert.equal(pdfReferences.length, 1);
assert.equal(
    pdfReferences[0].url,
    `http://127.0.0.1:${pdfAddress.port}/policy.pdf?download=1`
);
assert.match(pdfReferences[0].content, /verifiable body text/);
assert.equal(pdfReferences[0].contentAcquisition, "direct_pdf_extraction");

trustedSourceUrl = `http://127.0.0.1:${pdfAddress.port}/blocked.pdf?download=1`;
process.env.TRUSTED_SEARCH_KEY = "test-only-key";
process.env.FACTCHECK_TRUSTED_SEARCH_URL = `http://127.0.0.1:${pdfAddress.port}/search`;
const trustedPage = await context.newPage();
await trustedPage.setContent(`
    <div class="md-box-root">
        <p><a href="${trustedSourceUrl}">Official blocked PDF source</a></p>
    </div>
`);
const trustedReferences = await extractDoubaoReferences(
    trustedPage,
    "https://www.doubao.com/chat/",
    "Does the official PDF support the claim?"
);
assert.equal(trustedReferences[0].contentAcquisition, "trusted_search_full_content");
assert.match(trustedReferences[0].content, /complete verifiable source body/);
assert.equal(trustedSearchRequest.return_full_content, true);
assert.equal(trustedSearchRequest.segmentCount, 10);
assert.equal(trustedSearchRequest.simplified, false);
if (savedKey === undefined) {
    delete process.env.TRUSTED_SEARCH_KEY;
}
else {
    process.env.TRUSTED_SEARCH_KEY = savedKey;
}
if (originalTrustedSearchUrl === undefined) {
    delete process.env.FACTCHECK_TRUSTED_SEARCH_URL;
}
else {
    process.env.FACTCHECK_TRUSTED_SEARCH_URL = originalTrustedSearchUrl;
}
await new Promise((resolve, reject) => pdfServer.close((error) => error ? reject(error) : resolve()));

const mixedPage = await context.newPage();
await mixedPage.setContent(`
    <div class="search-summary">
        <div>搜索 3 个关键词，参考 3 篇资料</div>
    </div>
    <div class="md-box-root">
        <p><a href="https://policy.example/item">[1]</a><span class="container-sWvQla">权威机...</span></p>
    </div>
    <script>
        document.querySelector(".search-summary").addEventListener("click", () => {
            if (document.querySelector("[role=dialog]")) return;
            const dialog = document.createElement("div");
            dialog.setAttribute("role", "dialog");
            dialog.innerHTML = '<ul>' +
                '<li class="source-card"><div class="source-title">广州住房公积金政策</div><p>2024年11月起为2000元/人/月，每3个月提取一次。</p><a href="https://policy.example/item">广州住房公积金管理中心</a></li>' +
                '<li class="source-card"><div class="source-title">政策解读</div><p>无房租赁提取额度提高至2000元。</p><a href="https://policy.example/guide">政策解读</a></li>' +
                '<li class="source-card"><div class="source-title">办理指南</div><p>连续足额缴存满3个月可申请。</p><a href="https://policy.example/service">办理指南</a></li>' +
                '</ul>';
            document.body.appendChild(dialog);
        });
    </script>
`);

const mixedReferences = await extractDoubaoReferences(mixedPage, "https://www.doubao.com/chat/");
assert.equal(mixedReferences.length, 3);
assert.equal(mixedReferences[0].citationScope, "inline_and_global");
assert.match(mixedReferences[0].snippet, /2024年11月起为2000元/);
assert.deepEqual(
    mixedReferences.slice(1).map((reference) => reference.citationScope),
    ["global", "global"]
);

const incompletePage = await context.newPage();
await incompletePage.setContent(`
    <div class="search-summary"><div>搜索 2 个关键词，参考 2 篇资料</div></div>
    <div class="md-box-root"></div>
    <script>
        document.querySelector(".search-summary").addEventListener("click", () => {
            const dialog = document.createElement("div");
            dialog.setAttribute("role", "dialog");
            dialog.innerHTML = '<a href="https://policy.example/only-one">唯一来源</a>';
            document.body.appendChild(dialog);
        });
    </script>
`);
await assert.rejects(
    () => extractDoubaoReferences(incompletePage, "https://www.doubao.com/chat/"),
    /声明参考 2 篇资料，但仅捕获 1 篇/
);

await browser.close();
if (process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(process.env.FACT_CHECK_X_ASSERTIONS_OUTPUT, JSON.stringify({
        schemaVersion: "fact-check-x/test-assertions@1",
        actualAssertionIds: ["pdf.direct_extract", "pdf.trusted_search_hydrate", "pdf.fail_closed"]
    }));
}
console.log("PASS 豆包脚标、全局来源与完整性门禁");
