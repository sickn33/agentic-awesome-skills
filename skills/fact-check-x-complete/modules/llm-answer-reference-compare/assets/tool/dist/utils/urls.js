export function normalizeUrl(rawUrl, baseUrl) {
    try {
        const url = unwrapTrackingUrl(new URL(rawUrl, baseUrl));
        removePresentationTrackingParameters(url);
        url.hash = "";
        url.hostname = url.hostname.toLowerCase();
        if (url.pathname !== "/") {
            url.pathname = url.pathname.replace(/\/+$/, "");
        }
        if (url.pathname === "/") {
            url.pathname = "";
        }
        return url.toString().replace(/\/$/, "");
    }
    catch {
        return rawUrl.trim();
    }
}
function removePresentationTrackingParameters(url) {
    for (const name of ["f_link_type", "flow_extra"]) {
        url.searchParams.delete(name);
    }
}
function unwrapTrackingUrl(url) {
    const target = url.searchParams.get("target") || url.searchParams.get("url");
    if (!target) {
        return url;
    }
    const trackingHosts = new Set(["link.wtturl.cn"]);
    if (!trackingHosts.has(url.hostname.toLowerCase())) {
        return url;
    }
    try {
        return new URL(target);
    }
    catch {
        return url;
    }
}
