#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { renderHtmlReport } from "./report/html-report.js";
import { renderMarkdownReport } from "./report/markdown-report.js";

function option(name) {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : "";
}

function validate(raw) {
    if (!raw || raw.schemaVersion !== "1" || typeof raw.question !== "string" || !Array.isArray(raw.platforms) || raw.platforms.length === 0) {
        throw new Error("results.json 不符合 schemaVersion=1 的基础结构");
    }
    for (const platform of raw.platforms) {
        if (!platform.platform || !platform.label || !platform.url || !platform.status || !Array.isArray(platform.references)) {
            throw new Error("results.json 的平台结果缺少必要字段");
        }
        if (platform.status === "success" && !String(platform.answerMarkdown || "").trim()) {
            throw new Error(`${platform.label} 状态为 success 但没有原始答案`);
        }
        for (const reference of platform.references) {
            if (!reference.url) {
                throw new Error(`${platform.label} 存在缺少原始 URL 的参考文献`);
            }
        }
    }
}

async function main() {
    const input = option("--input");
    const out = option("--out");
    if (!input || !out) {
        throw new Error("用法: node report-cli.js --input <results.json> --out <目录>");
    }
    const raw = JSON.parse(await readFile(resolve(input), "utf8"));
    validate(raw);
    const displayRun = {
        ...raw,
        platforms: raw.platforms.map((platform) => ({
            ...platform,
            answerMarkdown: String(platform.answerMarkdown || ""),
            sourceMentions: Array.isArray(platform.sourceMentions) ? platform.sourceMentions : [],
            references: platform.references.map((reference) => ({
                ...reference,
                normalizedUrl: reference.normalizedUrl || reference.url,
            })),
        })),
    };
    const output = resolve(out);
    await mkdir(output, { recursive: true });
    await writeFile(join(output, "results.json"), `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    await writeFile(join(output, "report.html"), renderHtmlReport(displayRun), "utf8");
    await writeFile(join(output, "report.md"), renderMarkdownReport(displayRun), "utf8");
    console.log(JSON.stringify({
        status: "completed",
        results: join(output, "results.json"),
        report: join(output, "report.html"),
        markdown: join(output, "report.md"),
    }));
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
});
