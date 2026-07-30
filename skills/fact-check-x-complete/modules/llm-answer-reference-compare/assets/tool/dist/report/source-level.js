const OFFICIAL_MEDIA = ["people.com.cn", "xinhuanet.com", "qstheory.cn", "gmw.cn"];
const OFFICIAL_ORIGIN_KEYS = [
    "originUrl",
    "origin_url",
    "resourceUrl",
    "resource_url",
    "officialUrl",
    "official_url",
    "sourceUrl",
    "source_url"
];

function hostname(value) {
    try {
        return new URL(String(value || "")).hostname.toLowerCase();
    }
    catch {
        return "";
    }
}

function isOfficialUrl(value) {
    const host = hostname(value);
    return host === "gov.cn"
        || host.endsWith(".gov.cn")
        || OFFICIAL_MEDIA.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function officialOrigin(reference) {
    if (reference?.originAttributionStatus === "trusted_search_no_source_url") {
        return "";
    }
    const primary = String(reference?.url || "").trim();
    if (primary && isOfficialUrl(primary)) {
        return primary;
    }
    for (const key of OFFICIAL_ORIGIN_KEYS) {
        const candidate = String(reference?.[key] || "").trim();
        if (candidate && isOfficialUrl(candidate)) {
            return candidate;
        }
    }
    return "";
}

function isDknowTrustedReference(reference, platformId) {
    if (platformId !== "dknowc-chat") {
        return false;
    }
    const urls = [
        reference?.url,
        reference?.platformUrl,
        reference?.platform_url,
        reference?.originalUrl,
        reference?.original_url
    ].map((value) => String(value || ""));
    const host = hostname(urls.find(Boolean));
    const zone = String(reference?.zone || "").trim().toUpperCase();
    return urls.some((url) => hostname(url).includes("dknowc.cn") || url.toUpperCase().includes("/DT_DATA/"))
        || host.includes("dknowc.cn")
        || zone === "DT_DATA"
        || reference?.contentAcquisition === "trusted_search_full_content";
}

export function sourceDescriptor(reference, platformId = "") {
    const url = String(reference?.url || "");
    if (isDknowTrustedReference(reference, platformId)) {
        const hasOfficialSourceUrl = reference?.originAttributionStatus === "trusted_search_official_url";
        return {
            key: "dknow_trusted_search_official",
            label: "官方来源",
            officialOriginUrl: officialOrigin(reference),
            note: hasOfficialSourceUrl
                ? "可信搜索返回官方来源链接；判断直接使用可信搜索返回材料"
                : "可信搜索未返回源网址；保留深知收录页作为兜底"
        };
    }
    if (isOfficialUrl(url)) {
        return { key: "official_site", label: "官方来源", officialOriginUrl: url };
    }
    return { key: "non_official", label: "非官方来源", officialOriginUrl: "" };
}
