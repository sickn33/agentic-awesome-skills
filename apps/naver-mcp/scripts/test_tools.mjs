/**
 * Runs the real tool implementations against live Naver from a GitHub runner.
 *
 * This exercises the exact scraping/parsing code the Worker ships, so the
 * logic is verified independently of whether a Cloudflare deploy has happened.
 */

import {
  naverBlogSearch,
  naverBlogRead,
  naverNewsSearch,
  naverNewsRead,
  naverCafeSearch,
  naverPlaceReviews,
} from "../src/tools.js";

let failures = 0;
const summary = [];

function show(label, text, { minChars = 100 } = {}) {
  const ok = typeof text === "string" && text.length >= minChars;
  if (!ok) failures++;
  summary.push([label, ok ? "PASS" : "FAIL", `${(text || "").length} chars`]);
  console.log("=".repeat(72));
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${label}  (${(text || "").length} chars)`);
  console.log("=".repeat(72));
  console.log((text || "").slice(0, 900));
  console.log();
  return ok;
}

async function step(label, fn, opts) {
  try {
    const out = await fn();
    return show(label, out, opts);
  } catch (e) {
    failures++;
    summary.push([label, "ERROR", e.kind ? `${e.kind}: ${e.message}` : e.message]);
    console.log("=".repeat(72));
    console.log(`[ERROR] ${label}`);
    console.log(`  kind   : ${e.kind || "unknown"}`);
    console.log(`  message: ${e.message}`);
    if (e.detail) console.log(`  detail : ${JSON.stringify(e.detail).slice(0, 600)}`);
    console.log();
    return false;
  }
}

const run = async () => {
  // 1. blog search -> take a real URL out of it and read it
  let blogUrl = null;
  await step("naver_blog_search('제주도 맛집', 5)", async () => {
    const out = await naverBlogSearch({ query: "제주도 맛집", count: 5 });
    const m = out.match(/https:\/\/m\.blog\.naver\.com\/[A-Za-z0-9_-]+\/\d+/);
    if (m) blogUrl = m[0];
    return out;
  });

  if (blogUrl) {
    console.log(`--> reading the first search hit: ${blogUrl}\n`);
    await step(`naver_blog_read(${blogUrl})`, () => naverBlogRead({ url: blogUrl }), { minChars: 300 });
  } else {
    failures++;
    summary.push(["naver_blog_read", "SKIP", "search produced no URL"]);
  }

  // A PC-form URL must be normalised to m.blog and still return a body.
  await step("naver_blog_read(PC blog.naver.com URL)", async () => {
    if (!blogUrl) throw new Error("no blog url from search");
    const [, id, no] = blogUrl.match(/m\.blog\.naver\.com\/([A-Za-z0-9_-]+)\/(\d+)/);
    return naverBlogRead({ url: `https://blog.naver.com/${id}/${no}` });
  }, { minChars: 300 });

  // 2. news
  let newsUrl = null;
  await step("naver_news_search('금리', 5)", async () => {
    const out = await naverNewsSearch({ query: "금리", count: 5 });
    const m = out.match(/https:\/\/n\.news\.naver\.com\/mnews\/article\/\d+\/\d+/);
    if (m) newsUrl = m[0];
    return out;
  });
  if (newsUrl) {
    await step(`naver_news_read(${newsUrl})`, () => naverNewsRead({ url: newsUrl }), { minChars: 200 });
  }

  // 3. cafe + place
  await step("naver_cafe_search('캠핑 후기', 5)", () => naverCafeSearch({ query: "캠핑 후기", count: 5 }));
  await step("naver_place_reviews('성수동 카페', 5)", () => naverPlaceReviews({ query: "성수동 카페", count: 5 }));

  console.log("=".repeat(72));
  console.log("TOOL TEST SUMMARY");
  console.log("=".repeat(72));
  for (const [label, status, detail] of summary) {
    console.log(`${status.padEnd(6)} ${label.slice(0, 46).padEnd(48)} ${detail}`);
  }
  console.log();

  if (failures) {
    console.log(`${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("All tool checks passed.");
};

run().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
