import { buildReferenceMatrix } from "./reference-matrix.js";
import { sourceDescriptor } from "./source-level.js";
export function renderMarkdownReport(run) {
    const lines = [
        "# Answer & References Compare",
        "",
        `**Question**: ${run.question}`,
        "",
        `**Run time**: ${run.createdAt}`,
        "",
        "## Platform Status",
        "",
        "| Platform | Status | Answer Length | References | Source labels without URL |",
        "|---|---:|---:|---:|---:|"
    ];
    for (const platform of run.platforms) {
        lines.push(`| ${platform.label} | ${platform.status} | ${platform.answerMarkdown.length} | ${platform.references.length} | ${(platform.sourceMentions || []).length} |`);
    }
    lines.push("", "## Answer Comparison", "");
    for (const platform of run.platforms) {
        lines.push(`### ${platform.label}`, "");
        if (platform.status === "success") {
            lines.push(platform.answerMarkdown || "_No answer captured._");
        }
        else {
            lines.push(`_${platform.status}: ${platform.error || "No details"}_`);
        }
        lines.push("");
    }
    lines.push("## Reference Comparison", "");
    const platformHeaders = run.platforms.map((platform) => platform.label);
    lines.push(`| Reference | ${platformHeaders.join(" | ")} |`);
    lines.push(`|---|${platformHeaders.map(() => "---:").join("|")}|`);
    for (const row of buildReferenceMatrix(run)) {
        const marks = run.platforms.map((platform) => row.platforms[platform.platform] ? "yes" : "");
        lines.push(`| [${escapePipe(row.title)}](${row.url}) | ${marks.join(" | ")} |`);
    }
    if (buildReferenceMatrix(run).length === 0) {
        lines.push("| No references captured |  |");
    }
    lines.push("", "## Per-Platform References", "");
    for (const platform of run.platforms) {
        lines.push(`### ${platform.label}`, "");
        if (platform.references.length === 0) {
            lines.push("_No reference URLs captured._", "");
        }
        else {
            platform.references.forEach((reference, index) => {
                const title = reference.title || reference.text || reference.url;
                const source = sourceDescriptor(reference, platform.platform);
                const marker = reference.marker ? `[${reference.marker}] ` : "";
                const scope = reference.citationScope === "global"
                    ? "（来源清单）"
                    : reference.citationScope === "inline_and_global"
                        ? "（间接查找）"
                        : "";
                const snippet = reference.snippet ? ` — ${reference.snippet}` : "";
                const origin = source.officialOriginUrl && source.officialOriginUrl !== reference.url
                    ? `（[官网回链](${source.officialOriginUrl})）`
                    : "";
                const platformUrl = reference.platformUrl || reference.platform_url || reference.originalUrl || reference.original_url || "";
                const platformLink = platformUrl && platformUrl !== reference.url
                    ? `（[深知收录页](${platformUrl})）`
                    : "";
                const attribution = reference.originAttributionStatus === "trusted_search_official_url"
                    ? "（官方来源）"
                    : reference.originAttributionStatus === "trusted_search_no_source_url"
                        ? "（可信搜索未返回源网址，保留深知收录页）"
                        : "";
                lines.push(`${index + 1}. ${marker}【${source.label}】${attribution}${scope}[${title}](${reference.url})${origin}${platformLink}${snippet}`);
            });
            lines.push("");
        }
        const sourceMentions = platform.sourceMentions || [];
        if (sourceMentions.length > 0) {
            lines.push("Source labels shown by the page without accessible URLs:", "");
            sourceMentions.forEach((mention, index) => {
                lines.push(`${index + 1}. ${mention.label}${mention.occurrenceCount > 1 ? ` (shown ${mention.occurrenceCount} times)` : ""}`);
            });
            lines.push("");
        }
        if (platform.references.length === 0 && sourceMentions.length === 0) {
            continue;
        }
    }
    return `${lines.join("\n")}\n`;
}
function escapePipe(value) {
    return value.replace(/\|/g, "\\|");
}
