/**
 * The five MCP tools. Each returns markdown-ish plain text, and each failure
 * says whether Naver refused us or whether we simply could not parse what it
 * sent - those need different fixes, so they must not look alike.
 */

import {
  NaverError,
  blogReadRoutes,
  decodeEntities,
  extractPostBody,
  extractTitle,
  extractDate,
  htmlToText,
  httpGet,
  parseBlogUrl,
  parseNewsUrl,
  readViaChain,
} from "./naver.js";

const SEARCH_REFERER = "https://m.search.naver.com/";
const MAX_COUNT = 100;
const PAGE_SIZE = 30;

const clampCount = (n, dflt = 10) => {
  const v = Number.isFinite(Number(n)) ? Math.floor(Number(n)) : dflt;
  return Math.min(MAX_COUNT, Math.max(1, v));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Chrome/UI labels that sit next to result links and are not titles.
const UI_NOISE = new Set([
  "저장하기", "공유하기", "더보기", "신고", "신고하기", "답글", "댓글",
  "블로그", "카페", "네이버", "관련글", "본문 보기", "새글", "닫기", "열기",
  "이미지", "동영상", "지도", "길찾기", "전화", "예약", "정보",
]);

const isNoise = (t) => UI_NOISE.has(t) || /^[\s·|\-—]*$/.test(t);

/**
 * Pull a human-readable title for a search hit.
 *
 * Naver wraps result titles in the anchor itself, so the anchor's own text is
 * the most reliable source. Attribute/class matches are only a fallback, and
 * both are filtered against UI chrome like "저장하기" which otherwise wins by
 * being physically nearer the link than the real title.
 */
function titleNear(html, index) {
  const clean = (raw) => {
    const t = htmlToText(raw).replace(/\s+/g, " ").trim();
    return t.length >= 4 && t.length <= 200 && !isNoise(t) ? t : "";
  };

  // 1. Text of the anchor that contains this URL.
  const openIdx = html.lastIndexOf("<a ", index);
  if (openIdx !== -1 && index - openIdx < 600) {
    const gt = html.indexOf(">", openIdx);
    const closeIdx = html.indexOf("</a>", gt);
    if (gt !== -1 && closeIdx !== -1 && closeIdx - gt < 3000) {
      const t = clean(html.slice(gt + 1, closeIdx));
      if (t) return t;
    }
  }

  // 2. A titled element nearby, preferring Naver's result-title classes.
  const window_ = html.slice(Math.max(0, index - 1800), index + 1800);
  const pats = [
    /class="[^"]*(?:title_link|api_txt_lines|total_tit|name_link|title_area|sub_tit)[^"]*"[^>]*>([\s\S]{4,300}?)<\/(?:a|strong|span|div)>/i,
    /<strong[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]{4,300}?)<\/strong>/i,
    /title="([^"]{4,150})"/,
  ];
  for (const p of pats) {
    const m = window_.match(p);
    if (m) {
      const t = clean(m[1]);
      if (t) return t;
    }
  }
  return "";
}

/* -------------------------------------------------------------- 1. blog search */

export async function naverBlogSearch({ query, count = 10, sort = "sim" }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);
  const sortParam = sort === "date" ? "&nso=so%3Add%2Cp%3Aall" : "";
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&sm=mtb_jum` +
      `&query=${encodeURIComponent(query)}&start=${start}${sortParam}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    const re = /https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{6,})/g;
    let m;
    let addedThisPage = 0;
    while ((m = re.exec(html)) !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        blogId: m[1],
        logNo: m[2],
        url: `https://m.blog.naver.com/${m[1]}/${m[2]}`,
        title: titleNear(html, m.index),
      });
      addedThisPage++;
      if (seen.size >= want) break;
    }
    if (addedThisPage === 0) break; // no more results
    if (seen.size < want) await sleep(600); // be polite between pages
  }

  const items = [...seen.values()].slice(0, want);
  if (!items.length) {
    throw new NaverError("PARSE_FAILED", "Search page loaded but no blog posts were found in it.", { query });
  }

  const lines = items.map(
    (it, i) => `${i + 1}. ${it.title || "(제목 미확인)"}\n   ${it.url}`
  );
  return `"${query}" 블로그 검색 결과 ${items.length}건 (정렬: ${sort})\n\n${lines.join("\n")}`;
}

/* ---------------------------------------------------------------- 2. blog read */

export async function naverBlogRead({ url }) {
  const ref = parseBlogUrl(url);
  if (!ref || !ref.logNo) {
    throw new NaverError(
      "BAD_INPUT",
      "Could not read a blogId/logNo out of that URL. Expected something like https://blog.naver.com/{blogId}/{logNo}.",
      { url }
    );
  }

  const routes = blogReadRoutes(ref.blogId, ref.logNo);
  const post = await readViaChain(routes, DEFAULT_BLOG_ORDER);

  const header = [
    post.title ? `# ${post.title}` : `# ${ref.blogId}/${ref.logNo}`,
    `출처: https://m.blog.naver.com/${ref.blogId}/${ref.logNo}`,
    post.date ? `작성일: ${post.date}` : null,
    `경로: ${post.route} (추출: ${post.strategy})`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n---\n\n${post.text}`;
}

/**
 * Preference order measured by the step-0 probe. All four stay in the chain;
 * this only decides what is tried first.
 */
export const DEFAULT_BLOG_ORDER = ["direct-mobile", "pc-postview", "jina-reader", "rss"];

/* -------------------------------------------------------------- 3. news search */

export async function naverNewsSearch({ query, count = 10 }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_news.all&where=m_news` +
      `&query=${encodeURIComponent(query)}&start=${start}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    const re = /https?:\/\/n\.news\.naver\.com\/(?:mnews\/)?article\/(\d{3})\/(\d{10})/g;
    let m;
    let added = 0;
    while ((m = re.exec(html)) !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        url: `https://n.news.naver.com/mnews/article/${m[1]}/${m[2]}`,
        title: titleNear(html, m.index),
      });
      added++;
      if (seen.size >= want) break;
    }
    if (added === 0) break;
    if (seen.size < want) await sleep(600);
  }

  const items = [...seen.values()].slice(0, want);
  if (!items.length) {
    throw new NaverError("PARSE_FAILED", "News search page loaded but no articles were found in it.", { query });
  }
  const lines = items.map((it, i) => `${i + 1}. ${it.title || "(제목 미확인)"}\n   ${it.url}`);
  return `"${query}" 뉴스 검색 결과 ${items.length}건\n\n${lines.join("\n")}`;
}

/* ---------------------------------------------------------------- 4. news read */

const NEWS_BODY = [
  /<article[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/article>/i,
  /<div[^>]*id="dic_area"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  /<div[^>]*id="newsct_article"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
  /<div[^>]*class="[^"]*newsct_article[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i,
];

export async function naverNewsRead({ url }) {
  const ref = parseNewsUrl(url);
  if (!ref) {
    throw new NaverError(
      "BAD_INPUT",
      "Could not read oid/aid out of that URL. Expected https://n.news.naver.com/mnews/article/{oid}/{aid}.",
      { url }
    );
  }
  const target = `https://n.news.naver.com/mnews/article/${ref.oid}/${ref.aid}`;
  const html = await httpGet(target, { referer: SEARCH_REFERER });

  let body = "";
  for (const re of NEWS_BODY) {
    const m = html.match(re);
    if (m) {
      body = htmlToText(m[1]);
      if (body.length > 80) break;
    }
  }
  if (!body || body.length < 80) {
    throw new NaverError(
      "PARSE_FAILED",
      "Fetched the article page but no known body container matched.",
      { url: target, bytes: html.length }
    );
  }

  const title = extractTitle(html);
  const press =
    (html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]+)"/i) || [])[1] || "";
  const date =
    (html.match(/<span[^>]*class="[^"]*media_end_head_info_datestamp_time[^"]*"[^>]*data-date-time="([^"]+)"/i) || [])[1] ||
    extractDate(html);

  const header = [
    title ? `# ${title}` : `# ${ref.oid}/${ref.aid}`,
    press ? `언론사: ${press}` : null,
    date ? `작성일: ${date}` : null,
    `출처: ${target}`,
  ]
    .filter(Boolean)
    .join("\n");

  return `${header}\n\n---\n\n${body}`;
}

/* -------------------------------------------------------------- 5. cafe search */

export async function naverCafeSearch({ query, count = 10 }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_cafe.all&where=m_cafe` +
      `&query=${encodeURIComponent(query)}&start=${start}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    // Only public cafe article links; member-only boards are not reachable
    // without a login and are deliberately not attempted.
    const re = /https?:\/\/cafe\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{2,})/g;
    let m;
    let added = 0;
    while ((m = re.exec(html)) !== null) {
      const key = `${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        url: `https://cafe.naver.com/${m[1]}/${m[2]}`,
        cafe: m[1],
        title: titleNear(html, m.index),
      });
      added++;
      if (seen.size >= want) break;
    }
    if (added === 0) break;
    if (seen.size < want) await sleep(600);
  }

  const items = [...seen.values()].slice(0, want);
  if (!items.length) {
    throw new NaverError(
      "PARSE_FAILED",
      "Cafe search page loaded but no public cafe posts were found. Member-only posts are not accessible without a login.",
      { query }
    );
  }
  const lines = items.map(
    (it, i) => `${i + 1}. ${it.title || "(제목 미확인)"}\n   카페: ${it.cafe}\n   ${it.url}`
  );
  return `"${query}" 카페 검색 결과 ${items.length}건 (공개글만)\n\n${lines.join("\n")}`;
}

/* ------------------------------------------------------------ 6. place reviews */

export async function naverPlaceReviews({ query, count = 10 }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);

  // Place "blog reviews" are ordinary blog posts about the place, so the most
  // reliable route is the blog tab scoped by the place name plus 리뷰/후기.
  const url =
    `https://m.search.naver.com/search.naver?ssc=tab.m_blog.all` +
    `&query=${encodeURIComponent(query + " 후기")}&start=1`;
  const html = await httpGet(url, { referer: SEARCH_REFERER });

  const seen = new Map();
  const re = /https?:\/\/(?:m\.)?blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d{6,})/g;
  let m;
  while ((m = re.exec(html)) !== null && seen.size < want) {
    const key = `${m[1]}/${m[2]}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      url: `https://m.blog.naver.com/${m[1]}/${m[2]}`,
      title: titleNear(html, m.index),
    });
  }

  const placeIds = [
    ...new Set(
      (html.match(/place\.naver\.com\/(?:restaurant|place)\/(\d+)/g) || []).map((s) =>
        s.replace(/\D+/g, "")
      )
    ),
  ].slice(0, 3);

  const items = [...seen.values()];
  if (!items.length) {
    throw new NaverError("PARSE_FAILED", "No blog reviews were found for that place.", { query });
  }

  const lines = items.map((it, i) => `${i + 1}. ${it.title || "(제목 미확인)"}\n   ${it.url}`);
  const placeLine = placeIds.length
    ? `\n\n플레이스 페이지: ${placeIds.map((id) => `https://m.place.naver.com/restaurant/${id}/review/ugc`).join(", ")}`
    : "";
  return (
    `"${query}" 플레이스 블로그 리뷰 ${items.length}건\n\n${lines.join("\n")}` +
    placeLine +
    `\n\n(본문을 읽으려면 naver_blog_read 에 위 URL을 넣으세요.)`
  );
}
