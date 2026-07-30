import assert from "node:assert/strict";
import { createServer } from "node:http";
import { extractDknowcReferences } from "../assets/tool/dist/capture/generic-chat.js";

const originalKey = process.env.TRUSTED_SEARCH_KEY;
const originalEndpoint = process.env.FACTCHECK_TRUSTED_SEARCH_URL;
const internalUrls = [
    "https://yun.dknowc.cn/baike/policyDetails?id=training-001",
    "https://yun.dknowc.cn/baike/policyDetails?id=training-002",
    "https://yun.dknowc.cn/baike/policyDetails?id=training-003"
];
const requestPayloads = [];
const policyBody = "北京市教育委员会发布的学科类校外培训管理要求，明确高中阶段培训的准入、登记、收费与合规要求。".repeat(8);
const ministryBody = "校外培训管理条例征求意见稿规定校外培训分类管理、预收费监管与行政主管部门职责。".repeat(12);
const noticeBody = "不得违规开展学科类培训，校外培训机构不得占用法定节假日、休息日及寒暑假组织学科类培训。".repeat(10);

const server = createServer((request, response) => {
    if (request.url !== "/search" || request.method !== "POST") {
        response.writeHead(404);
        response.end();
        return;
    }
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
        raw += chunk;
    });
    request.on("end", () => {
        const payload = JSON.parse(raw);
        requestPayloads.push(payload);
        const query = String(payload.query || "");
        const articles = query.includes("北京市学科类校外培训指导手册")
            ? [{
                "文章标题": "北京市教育委员会关于印发《北京市学科类校外培训指导手册》的通知",
                "源网址": "https://jw.beijing.gov.cn/official/training-policy.html",
                "发布或实施机构": "北京市教育委员会",
                "办理地域": "北京市",
                "数据源": "北京市教育委员会",
                "全文": policyBody,
                "段落": []
            }]
            : query.includes("校外培训管理条例")
                ? [{
                    "文章标题": "教育部关于《校外培训管理条例（征求意见稿）》公开征求意见的公告",
                    "源网址": "https://jyj.rikaze.gov.cn/reprint/training.html",
                    "发布或实施机构": "日喀则市教育局",
                    "办理地域": "西藏自治区日喀则市",
                    "数据源": "日喀则市教育局",
                    "全文": ministryBody,
                    "段落": []
                }]
                : [{
                    "文章标题": "致全区校外培训机构的告知书",
                    "源网址": "https://kjj.yinchuan.gov.cn/reprint/notice.html",
                    "发布或实施机构": "银川市科学技术局",
                    "办理地域": "宁夏回族自治区银川市",
                    "数据源": "银川市科学技术局",
                    "全文": noticeBody,
                    "段落": []
                }];
        const body = Buffer.from(JSON.stringify({
            content: { data: { "检索文章": articles } }
        }));
        response.writeHead(200, {
            "content-type": "application/json",
            "content-length": body.length
        });
        response.end(body);
    });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.equal(typeof address, "object");
process.env.TRUSTED_SEARCH_KEY = "test-only-key";
process.env.FACTCHECK_TRUSTED_SEARCH_URL = `http://127.0.0.1:${address.port}/search`;

const captured = [
    {
        title: "北京市教育委员会关于印发《北京市学科类校外培训指导手册》的通知",
        url: internalUrls[0],
        normalizedUrl: internalUrls[0],
        marker: "113",
        text: "北京市教育委员会关于印发《北京市学科类校外培训指导手册》的通知",
        snippet: policyBody.slice(0, 180)
    },
    {
        title: "【已结束】教育部关于《校外培训管理条例（征求意见稿）》公开征求意见的公告",
        url: internalUrls[1],
        normalizedUrl: internalUrls[1],
        marker: "114",
        text: "教育部关于《校外培训管理条例（征求意见稿）》公开征求意见的公告",
        snippet: ministryBody.slice(0, 180)
    },
    {
        title: "致全区校外培训机构的告知书",
        url: internalUrls[2],
        normalizedUrl: internalUrls[2],
        marker: "115",
        text: "致全区校外培训机构的告知书",
        snippet: noticeBody.slice(0, 180)
    }
];
const page = {
    locator() {
        return {
            async evaluateAll() {
                return captured;
            }
        };
    }
};

const references = await extractDknowcReferences(
    page,
    "https://yun.dknowc.cn/",
    "北京做高中的教培，违法吗？"
);
if (process.env.DEBUG_FACT_CHECK_X_TEST === "1") {
    console.log(JSON.stringify({ requestPayloads, references }, null, 2));
}
assert.equal(references.length, 3);

const verified = references[0];
assert.equal(verified.url, "https://jw.beijing.gov.cn/official/training-policy.html");
assert.equal(verified.officialUrl, verified.url);
assert.equal(verified.platformUrl, internalUrls[0]);
assert.equal(verified.originAttributionStatus, "trusted_search_official_url");
assert.equal(verified.sameMaterialVerified, true);

const ministryReprint = references[1];
assert.equal(ministryReprint.url, "https://jyj.rikaze.gov.cn/reprint/training.html");
assert.equal(ministryReprint.officialUrl, ministryReprint.url);
assert.equal(ministryReprint.platformUrl, internalUrls[1]);
assert.equal(ministryReprint.contentAcquisition, "trusted_search_full_content");
assert.equal(ministryReprint.sameMaterialVerified, true);
assert.equal(ministryReprint.originAttributionStatus, "trusted_search_official_url");

const ambiguousReprint = references[2];
assert.equal(ambiguousReprint.url, "https://kjj.yinchuan.gov.cn/reprint/notice.html");
assert.equal(ambiguousReprint.officialUrl, ambiguousReprint.url);
assert.equal(ambiguousReprint.platformUrl, internalUrls[2]);
assert.equal(ambiguousReprint.originAttributionStatus, "trusted_search_official_url");

for (const payload of requestPayloads) {
    assert.equal(payload.return_full_content, true);
    assert.equal(payload.segmentCount, 10);
    assert.equal(payload.simplified, false);
    assert.doesNotMatch(payload.query, /北京做高中的教培/);
}
assert.equal(requestPayloads[0].service_area, "北京市");
assert.ok(references.every((reference) => reference.platformTrustSource === "dknow_reference_capture"));

await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
if (originalKey === undefined) {
    delete process.env.TRUSTED_SEARCH_KEY;
}
else {
    process.env.TRUSTED_SEARCH_KEY = originalKey;
}
if (originalEndpoint === undefined) {
    delete process.env.FACTCHECK_TRUSTED_SEARCH_URL;
}
else {
    process.env.FACTCHECK_TRUSTED_SEARCH_URL = originalEndpoint;
}

console.log("PASS 深知可信搜索源网址与全文直接用于官方溯源和判断");
