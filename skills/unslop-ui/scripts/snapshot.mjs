import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const usage = "usage: node snapshot.mjs <url of the screen> <out.html> [pass label] [--dark | --light] [--width=1440] [--height=810]";
const args = process.argv.slice(2);
const flag = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
const [url, out, label] = args.filter((arg) => !arg.startsWith("--"));
const width = flag("width") ?? "1440";
const height = flag("height") ?? "810";
const scheme = args.includes("--dark") ? "dark" : args.includes("--light") ? "light" : "no-preference";
if (!url || !out) {
  console.error(usage);
  process.exit(1);
}

async function browserKit() {
  for (const name of ["playwright", "playwright-core"]) {
    try {
      return await import(name);
    } catch {}
    try {
      return createRequire(join(process.cwd(), "package.json"))(name);
    } catch {}
  }
  console.error("Playwright is not installed. In your project, run `npm install -D playwright` followed by `npx playwright install chromium`.");
  process.exit(1);
}

const chrome = [process.env.CHROME_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"].find((path) => path && existsSync(path));
const { chromium } = await browserKit();
const browser = await chromium.launch(chrome ? { executablePath: chrome } : {});
try {
  const page = await browser.newPage({ viewport: { width: Number(width), height: Number(height) }, colorScheme: scheme });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  const html = await page.evaluate(async ([label, scheme]) => {
    const LIMIT = 3_000_000;
    const absolute = (value, base = location.href) => {
      try {
        return new URL(value, base).href;
      } catch {
        return value;
      }
    };
    const inlined = new Map();
    const inline = async (href) => {
      if (!href || href.startsWith("data:")) return href;
      if (!inlined.has(href)) {
        inlined.set(
          href,
          fetch(href)
            .then((response) => (response.ok ? response.blob() : null))
            .then((blob) =>
              blob && blob.size < LIMIT
                ? new Promise((done) => {
                    const reader = new FileReader();
                    reader.onload = () => done(reader.result);
                    reader.readAsDataURL(blob);
                  })
                : href,
            )
            .catch(() => href),
        );
      }
      return inlined.get(href);
    };
    const urls = async (css, base) => {
      const found = [...css.matchAll(/url\((['"]?)(?!data:)([^)'"]+)\1\)/g)];
      let result = css;
      for (const [whole, , value] of found) {
        if (/^(#|%23)/.test(value.trim())) continue;
        const data = await inline(absolute(value.trim(), base));
        result = result.split(whole).join(`url("${data}")`);
      }
      return result;
    };

    const css = [];
    for (const sheet of document.styleSheets) {
      const owner = sheet.ownerNode;
      let text = "";
      let base = location.href;
      if (sheet.href) {
        base = sheet.href;
        text = await fetch(sheet.href).then((response) => (response.ok ? response.text() : "")).catch(() => "");
      } else if (owner && owner.textContent.trim()) {
        text = owner.textContent;
      }
      if (!text) {
        try {
          text = [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
        } catch {}
      }
      const media = sheet.media && sheet.media.mediaText;
      css.push(media && media !== "all" ? `@media ${media} {\n${text}\n}` : text);
      css[css.length - 1] = await urls(css[css.length - 1], base);
    }

    const copy = document.documentElement.cloneNode(true);
    copy.querySelectorAll("script, noscript, link[rel='stylesheet'], link[rel='preload'], link[rel='modulepreload'], style").forEach((node) => node.remove());
    copy.querySelectorAll("[srcset]").forEach((node) => node.removeAttribute("srcset"));
    copy.querySelectorAll("source").forEach((node) => node.remove());
    copy.querySelectorAll("[loading]").forEach((node) => node.removeAttribute("loading"));
    for (const node of copy.querySelectorAll("img[src], video[poster], image")) {
      const attr = node.tagName === "VIDEO" ? "poster" : node.tagName.toLowerCase() === "image" ? "href" : "src";
      const value = node.getAttribute(attr);
      if (value) node.setAttribute(attr, await inline(absolute(value)));
    }
    copy.querySelectorAll("a[href]").forEach((node) => node.setAttribute("href", absolute(node.getAttribute("href"))));
    for (const node of copy.querySelectorAll("[style*='url(']")) {
      node.setAttribute("style", await urls(node.getAttribute("style"), location.href));
    }
    const style = document.createElement("style");
    let text = css.join("\n");
    if (scheme === "dark" || scheme === "light") {
      const other = scheme === "dark" ? "light" : "dark";
      text = text
        .replace(new RegExp(`prefers-color-scheme\\s*:\\s*${scheme}`, "g"), "min-width: 0px")
        .replace(new RegExp(`prefers-color-scheme\\s*:\\s*${other}`, "g"), "max-width: 0px");
      const meta = document.createElement("meta");
      meta.name = "color-scheme";
      meta.content = scheme;
      copy.querySelector("head").prepend(meta);
    }
    style.textContent = text;
    copy.querySelector("head").appendChild(style);
    if (label) {
      const meta = document.createElement("meta");
      meta.name = "unslop-pass";
      meta.content = label;
      copy.querySelector("head").prepend(meta);
    }
    return "<!doctype html>\n" + copy.outerHTML;
  }, [label ?? "", scheme]);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const output = resolve(out);
  const screenshot = output.replace(/\.html?$/, "") + ".live.png";
  if (existsSync(output) || existsSync(screenshot)) throw new Error("Output already exists; choose a new path");
  await page.evaluate(() => window.scrollTo(0, 0));
  const pixels = await page.screenshot();
  writeFileSync(output, html, { flag: "wx" });
  writeFileSync(screenshot, pixels, { flag: "wx" });
  console.log(`saved ${resolve(out)}${label ? ` as ${label}` : ""}`);
} finally {
  await browser.close();
}
