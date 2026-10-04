import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const script = path.join(process.cwd(), "scripts/inline-single-file.js");
const temporaryDirectories = [];

function buildFixture() {
  const directory = mkdtempSync(path.join(tmpdir(), "aas-inline-"));
  temporaryDirectories.push(directory);
  const assets = path.join(directory, "assets");
  mkdirSync(assets);
  writeFileSync(path.join(assets, "style.css"), ".root{color:red}");
  writeFileSync(path.join(assets, "workbench.js"), "console.log('workbench');");
  writeFileSync(
    path.join(directory, "workbench.html"),
    [
      "<!doctype html><html><head>",
      '<link rel="stylesheet" crossorigin href="/assets/style.css">',
      '<script type="module" crossorigin src="/assets/workbench.js"></script>',
      "</head><body><div id=\"root\"></div></body></html>",
    ].join("\n"),
  );
  return { directory, assets };
}

afterEach(() => {
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop(), { recursive: true, force: true });
  }
});

describe("inline-single-file", () => {
  it("inlines every emitted asset and removes the assets directory", () => {
    const { directory, assets } = buildFixture();
    const result = spawnSync(
      process.execPath,
      [script, path.join(directory, "workbench.html")],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    const html = readFileSync(path.join(directory, "workbench.html"), "utf8");
    expect(html).toContain("<style>.root{color:red}</style>");
    expect(html).toContain("<script type=\"module\">console.log('workbench');</script>");
    expect(html).not.toMatch(/\/assets\//u);
    expect(existsSync(assets)).toBe(false);
  });

  it("fails loudly when a referenced asset is missing", () => {
    const { directory } = buildFixture();
    rmSync(path.join(directory, "assets", "workbench.js"));

    const result = spawnSync(
      process.execPath,
      [script, path.join(directory, "workbench.html")],
      { encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
  });
});
