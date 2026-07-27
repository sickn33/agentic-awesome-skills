/**
 * The five MCP tools. Each returns markdown-ish plain text, and each failure
 * says whether Naver refused us or whether we simply could not parse what it
 * sent - those need different fixes, so they must not look alike.
 */

import {
  NaverError,
  blogReadRoutes,
  extractPostBody,
  extractTitle,
  extractDate,
  htmlToText,
  httpGet,
  parseBlogUrl,
  parseNewsUrl,
  readViaChain,
  sleep,
} from "./naver.js";

const SEARCH_REFERER = "https://m.search.naver.com/";
const MAX_COUNT = 100;
const PAGE_SIZE = 30;

const clampCount = (n, dflt = 10) => {
  const v = Number.isFinite(Number(n)) ? Math.floor(Number(n)) : dflt;
  return Math.min(MAX_COUNT, Math.max(1, v));
};

// Long posts otherwise dominate the caller's context. Most posts land well
// under this, so the cap costs nothing in the common case.
const DEFAULT_MAX_CHARS = 8000;

/**
 * Trim body text to a character budget, cutting at a paragraph break so the
 * tail is not left mid-sentence. Truncation is always announced - silently
 * dropping half a post would let a caller summarise it as if it were whole.
 */
function capLength(text, maxChars) {
  const limit = Number.isFinite(Number(maxChars)) ? Math.floor(Number(maxChars)) : DEFAULT_MAX_CHARS;
  if (limit <= 0 || text.length <= limit) return { text, truncated: false };

  let cut = text.lastIndexOf("\n", limit);
  if (cut < limit * 0.6) cut = limit; // no usable break; take the hard cut
  const kept = text.slice(0, cut).trimEnd();
  return {
    text:
      `${kept}\n\n---\n[본문이 길어 ${kept.length}/${text.length}자만 표시했습니다. ` +
      `전체가 필요하면 max_chars 를 늘리거나 0(무제한)으로 호출하세요.]`,
    truncated: true,
  };
}


// UI chrome that appears as link text on result pages and is never a title.
const UI_NOISE = [
  "저장하기", "Keep에 저장", "Keep 바로가기", "공유하기", "더보기", "신고",
  "답글", "댓글", "관련글", "본문 보기", "바로가기", "옵션", "닫기", "열기",
  "길찾기", "예약", "전화",
];

const isNoise = (t) =>
  !t || t.length < 4 || t.length > 200 || UI_NOISE.some((n) => t.includes(n)) ||
  /^[\s·|\-—RE]*$/.test(t);

const cleanTitle = (raw) => {
  const t = htmlToText(raw).replace(/\s+/g, " ").trim();
  return isNoise(t) ? "" : t;
};

/**
 * Collect search hits, preferring anchors whose href is the result URL.
 *
 * The first occurrence of a result URL on the page is Keep's save button
 * (`data-url="…"`), whose only text is "문서 저장하기" — so anything that
 * searches by proximity to the URL finds the button, not the title. Matching
 * `<a href="…">` skips the button and lands on the real title anchor.
 *
 * A second pass over bare URLs then picks up anything that only appears in an
 * attribute, so coverage never drops below what a plain URL scan would find;
 * those hits simply carry no title.
 */
function collectHits(html, urlSource, into, want) {
  const { anchor, bare, key } = urlSource;

  anchor.lastIndex = 0;
  let m;
  while ((m = anchor.exec(html)) !== null && into.size < want) {
    const k = key(m);
    const title = cleanTitle(m[m.length - 1]);
    const prev = into.get(k);
    // The same URL appears in several anchors ("더보기", the snippet, the
    // title). Let a later real title replace an earlier empty one instead of
    // letting whichever came first win.
    if (prev && (prev.title || !title)) continue;
    into.set(k, { title });
  }

  bare.lastIndex = 0;
  while ((m = bare.exec(html)) !== null && into.size < want) {
    const k = key(m);
    if (into.has(k)) continue;
    into.set(k, { title: "" });
  }
  return into;
}

/** Regexes for one result type: title-bearing anchors, then bare URLs. */
function urlSource(pattern, keyFn) {
  return {
    anchor: new RegExp(`<a\\b[^>]*\\bhref="(?:${pattern})[^"]*"[^>]*>([\\s\\S]{0,2500}?)</a>`, "gi"),
    bare: new RegExp(pattern, "gi"),
    key: keyFn,
  };
}

const BLOG_PATTERN = "https?://(?:m\\.)?blog\\.naver\\.com/([A-Za-z0-9_-]+)/(\\d{6,})";
const CAFE_PATTERN = "https?://cafe\\.naver\\.com/([A-Za-z0-9_-]+)/(\\d{2,})";
const NEWS_PATTERN = "https?://n\\.news\\.naver\\.com/(?:mnews/)?article/(\\d{3})/(\\d{10})";

const pairKey = (m) => `${m[1]}/${m[2]}`;

/* -------------------------------------------------------------- 1. blog search */

export async function naverBlogSearch({ query, count = 10, sort = "sim" }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);
  const sortParam = sort === "date" ? "&nso=so%3Add%2Cp%3Aall" : "";
  const src = urlSource(BLOG_PATTERN, pairKey);
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_blog.all&sm=mtb_jum` +
      `&query=${encodeURIComponent(query)}&start=${start}${sortParam}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    const before = seen.size;
    collectHits(html, src, seen, want);
    if (seen.size === before) break; // page added nothing new
    if (seen.size < want) await sleep(600); // be polite between pages
  }

  const items = [...seen.entries()].slice(0, want).map(([key, v]) => ({
    url: `https://m.blog.naver.com/${key}`,
    title: v.title,
  }));
  if (!items.length) {
    throw new NaverError("PARSE_FAILED", "Search page loaded but no blog posts were found in it.", { query });
  }

  const lines = items.map(
    (it, i) => `${i + 1}. ${it.title || "(제목 미확인)"}\n   ${it.url}`
  );
  return `"${query}" 블로그 검색 결과 ${items.length}건 (정렬: ${sort})\n\n${lines.join("\n")}`;
}

/* ---------------------------------------------------------------- 2. blog read */

export async function naverBlogRead({ url, max_chars }) {
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

  const body = capLength(post.text, max_chars);
  return `${header}\n\n---\n\n${body.text}`;
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
  const src = urlSource(NEWS_PATTERN, pairKey);
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_news.all&where=m_news` +
      `&query=${encodeURIComponent(query)}&start=${start}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    const before = seen.size;
    collectHits(html, src, seen, want);
    if (seen.size === before) break;
    if (seen.size < want) await sleep(600);
  }

  const items = [...seen.entries()].slice(0, want).map(([key, v]) => ({
    url: `https://n.news.naver.com/mnews/article/${key}`,
    title: v.title,
  }));
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

export async function naverNewsRead({ url, max_chars }) {
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

  return `${header}\n\n---\n\n${capLength(body, max_chars).text}`;
}

/* -------------------------------------------------------------- 5. cafe search */

export async function naverCafeSearch({ query, count = 10 }) {
  if (!query || !String(query).trim()) {
    throw new NaverError("BAD_INPUT", "query is required");
  }
  const want = clampCount(count);
  // Only public cafe article links; member-only boards are not reachable
  // without a login and are deliberately not attempted.
  const src = urlSource(CAFE_PATTERN, pairKey);
  const seen = new Map();

  for (let start = 1; seen.size < want && start <= 91; start += PAGE_SIZE) {
    const url =
      `https://m.search.naver.com/search.naver?ssc=tab.m_cafe.all&where=m_cafe` +
      `&query=${encodeURIComponent(query)}&start=${start}`;
    const html = await httpGet(url, { referer: SEARCH_REFERER });

    const before = seen.size;
    collectHits(html, src, seen, want);
    if (seen.size === before) break;
    if (seen.size < want) await sleep(600);
  }

  const items = [...seen.entries()].slice(0, want).map(([key, v]) => ({
    url: `https://cafe.naver.com/${key}`,
    cafe: key.split("/")[0],
    title: v.title,
  }));
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

  const seen = collectHits(html, urlSource(BLOG_PATTERN, pairKey), new Map(), want);

  const placeIds = [
    ...new Set(
      (html.match(/place\.naver\.com\/(?:restaurant|place)\/(\d+)/g) || []).map((s) =>
        s.replace(/\D+/g, "")
      )
    ),
  ].slice(0, 3);

  const items = [...seen.entries()].slice(0, want).map(([key, v]) => ({
    url: `https://m.blog.naver.com/${key}`,
    title: v.title,
  }));
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
