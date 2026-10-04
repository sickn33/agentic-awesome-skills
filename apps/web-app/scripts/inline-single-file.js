// Inline the Workbench build into one self-contained HTML file.
//
// This replaces the `vite-plugin-singlefile` devDependency, which pulled in
// `micromatch` -> `braces` and kept the repository audit red with no patched
// `braces` release available. The behaviour is intentionally narrow: the
// plugin build emits exactly one module script and one stylesheet, and this
// script inlines both so the packaged Workbench is a single portable file.

import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

function inlineAsset(html, assetDirectory, tagName, attributeName, wrap, { voidElement = false } = {}) {
  const closing = voidElement ? "" : `\\s*</${tagName}>`;
  const pattern = new RegExp(
    `<${tagName}\\b[^>]*\\b${attributeName}="([^"]+)"[^>]*>${closing}`,
    "gu",
  );
  let inlined = 0;
  return html.replace(pattern, (match, url) => {
    const fileName = path.basename(new URL(url, "http://localhost").pathname);
    const contents = readFileSync(path.join(assetDirectory, fileName), "utf8");
    rmSync(path.join(assetDirectory, fileName), { force: true });
    inlined += 1;
    return wrap(contents);
  });
}

const [, , htmlPath] = process.argv;
if (!htmlPath) {
  throw new Error("Usage: node scripts/inline-single-file.js <html-output-path>");
}

const absoluteHtmlPath = path.resolve(htmlPath);
const outputDirectory = path.dirname(absoluteHtmlPath);
const assetDirectory = path.join(outputDirectory, "assets");

let html = readFileSync(absoluteHtmlPath, "utf8");
html = inlineAsset(
  html,
  assetDirectory,
  "link",
  "href",
  (css) => `<style>${css}</style>`,
  { voidElement: true },
);
html = inlineAsset(
  html,
  assetDirectory,
  "script",
  "src",
  (js) => `<script type="module">${js}</script>`,
);

if (readdirSync(assetDirectory).length > 0) {
  throw new Error(`Expected every build asset to be inlined, but found: ${readdirSync(assetDirectory).join(", ")}`);
}
{
  rmSync(assetDirectory, { recursive: true, force: true });
}

writeFileSync(absoluteHtmlPath, html, "utf8");
