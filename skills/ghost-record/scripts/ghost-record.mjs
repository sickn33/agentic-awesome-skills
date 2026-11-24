/**
 * ghost-record: record a verified ghost-cursor take of one component, in one run.
 *
 *   node <skill dir>/scripts/ghost-record.mjs --component <file>[#Export] [options] <step>...
 *
 * Needs Node 20+ and, in the project you run it from, playwright with Chromium:
 *   npm i -D playwright && npx playwright install chromium
 *
 * Steps, one per argument (or several in one argument, separated by ";"):
 *   click <target>   hover <target>   type "<text>"   press <Key>   wait <ms>   move <x> <y>
 *
 * Targets resolve inside the demo box, most specific first:
 *   @name                  data-ghost-id="name", then data-testid="name", then id="name"
 *   role=button[name=Like] an ARIA role with an accessible name
 *   label=Email            a form label, then a placeholder
 *   text=Most popular      visible text, exact, then partial
 *   anything else          tried as visible text, an accessible name, then a CSS selector
 *
 * Options:
 *   --props <json>     props for the component on the temporary route
 *   --height <px>      box height on the temporary route, default 320
 *   --out <file>       where the take goes, default <component>.take.json next to the component
 *   --url <url>        skip discovery and record on this page (it must contain the component in a GhostCursor)
 *   --ignore <css>     leave matching elements out of the state check (repeatable)
 *   --seed <n>  --speed <n>  --headed  --keep (leave the temporary route and the server running)
 */
import { spawn } from "node:child_process";
import { existsSync, openSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
// Arguments
const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        component: { type: "string" },
        props: { type: "string" },
        height: { type: "string", default: "320" },
        out: { type: "string" },
        url: { type: "string" },
        ignore: { type: "string", multiple: true, default: [] },
        seed: { type: "string", default: "1" },
        speed: { type: "string", default: "1" },
        steps: { type: "string" },
        headed: { type: "boolean", default: false },
        keep: { type: "boolean", default: false },
    },
});
const cleanups = [];
async function cleanup() {
    while (cleanups.length)
        await cleanups.pop()();
}
async function fail(message) {
    console.error(`✗ ${message}`);
    await cleanup();
    process.exit(1);
}
process.on("SIGINT", () => void fail("interrupted"));
/**
 * Playwright comes from the project being recorded, not from this folder, so the skill
 * works wherever it's installed: the project's .claude/skills or a global skills folder.
 */
async function loadPlaywright() {
    for (const base of [process.cwd(), dirname(new URL(import.meta.url).pathname)]) {
        try {
            const path = createRequire(join(base, "package.json")).resolve("playwright");
            const mod = await import(pathToFileURL(path).href);
            return mod.chromium ?? mod.default.chromium;
        }
        catch { }
    }
    return fail("Playwright isn't installed in this project. Run: npm i -D playwright && npx playwright install chromium");
}
// Parse data before generating TSX so the argument is never treated as source code.
let propsExpression = "";
if (values.props !== undefined) {
    let props;
    try {
        props = JSON.parse(values.props);
    }
    catch {
        await fail("--props must be a valid JSON object");
    }
    if (props === null || typeof props !== "object" || Array.isArray(props))
        await fail("--props must be a valid JSON object");
    propsExpression = `JSON.parse(${JSON.stringify(JSON.stringify(props))})`;
}
const chromium = await loadPlaywright();
function parseStep(raw) {
    const text = raw.trim();
    const verb = text.split(/\s+/)[0];
    const arg = text.slice(verb.length).trim();
    switch (verb) {
        case "click":
        case "hover":
            if (arg)
                return { kind: verb, target: arg };
            break;
        case "type":
            return { kind: "type", text: arg.replace(/^(["'])(.*)\1$/, "$2") };
        case "press":
            if (arg)
                return { kind: "press", key: arg };
            break;
        case "wait":
            if (Number.isFinite(Number(arg)))
                return { kind: "wait", ms: Number(arg) };
            break;
        case "move": {
            const [x, y] = arg.split(/\s+/).map(Number);
            if (x >= 0 && x <= 1 && y >= 0 && y <= 1)
                return { kind: "move", x, y };
            break;
        }
    }
    throw new Error(`can't read step "${text}". Use click, hover, type, press, wait or move.`);
}
let steps = [];
const rawSteps = [...positionals, ...(values.steps ? [values.steps] : [])]
    .flatMap((p) => p.split(";"))
    .map((s) => s.trim())
    .filter(Boolean);
try {
    steps = rawSteps.map(parseStep);
}
catch (e) {
    await fail(e.message);
}
if (!steps.length)
    await fail("give at least one step, e.g. 'click @save'");
if (!values.component)
    await fail("--component is required, e.g. --component components/like-button.tsx#LikeButton");
const [componentPath, exportArg] = values.component.split("#");
const COMPONENT = resolve(componentPath);
if (!existsSync(COMPONENT))
    await fail(`${componentPath} doesn't exist`);
const HEIGHT = Number(values.height) || 320;
const BASE_SPEED = Number(values.speed) || 1;
const lastStep = steps.at(-1);
/** Both snapshots happen this long after the last input; the player holds the end for 1600ms. */
const BASE_SETTLE = Math.min(1400, 600 + (lastStep.kind === "wait" ? lastStep.ms : 0));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stripExt = (f) => f.replace(/\.(tsx|ts|jsx|js|mdx)$/, "").replace(/[\\/]index$/, "");
const rel = (f) => relative(process.cwd(), f) || ".";
// Project discovery
async function readJson(file) {
    try {
        return JSON.parse(await readFile(file, "utf8"));
    }
    catch {
        return null;
    }
}
/** The nearest folder above the component whose package.json depends on next. */
async function findApp() {
    for (let dir = dirname(COMPONENT);; dir = dirname(dir)) {
        const pkg = await readJson(join(dir, "package.json"));
        if (pkg && (pkg.dependencies?.next || pkg.devDependencies?.next))
            return { dir, pkg };
        if (dirname(dir) === dir)
            return null;
    }
}
async function componentExport(file, wanted) {
    const src = await readFile(file, "utf8");
    const named = [...src.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+([A-Z]\w*)/g)].map((m) => m[1]);
    const defaultName = src.match(/export\s+default\s+(?:async\s+)?(?:function|class)?\s*([A-Z]\w*)/)?.[1];
    if (wanted) {
        if (named.includes(wanted))
            return { name: wanted, isDefault: false };
        if (defaultName === wanted)
            return { name: wanted, isDefault: true };
        return fail(`${rel(file)} doesn't export ${wanted}`);
    }
    if (named.length)
        return { name: named[0], isDefault: false };
    if (defaultName)
        return { name: defaultName, isDefault: true };
    return fail(`${rel(file)} has no exported component. Pass --component <file>#<Name>.`);
}
async function walk(dir, out = []) {
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
        if (entry.name === "node_modules" || entry.name.startsWith("."))
            continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory())
            await walk(full, out);
        else
            out.push(full);
    }
    return out;
}
/** Turns "@/components/x" or "../x" in `from` into an absolute path, using tsconfig paths. */
function resolver(appDir, paths) {
    return (spec, from) => {
        if (spec.startsWith("."))
            return resolve(dirname(from), spec);
        for (const [pattern, [target]] of Object.entries(paths)) {
            const prefix = pattern.replace(/\*$/, "");
            if (target && spec.startsWith(prefix))
                return resolve(appDir, target.replace(/\*$/, "") + spec.slice(prefix.length));
        }
        return null;
    };
}
function routeFor(appDir, file) {
    const parts = relative(appDir, file).split(sep);
    if (parts[0] === "src")
        parts.shift();
    const router = parts.shift();
    if (router === "app") {
        if (!/^page\.(tsx|jsx|ts|js|mdx)$/.test(parts.at(-1) ?? ""))
            return null;
        const segments = parts.slice(0, -1).filter((s) => !/^\(.*\)$/.test(s));
        if (segments.some((s) => /^[[@_]/.test(s)))
            return null;
        return "/" + segments.join("/");
    }
    if (router === "pages") {
        const segments = stripExt(parts.join("/")).split("/");
        if (segments.some((s) => /^[[_]/.test(s)) || segments[0] === "api")
            return null;
        return "/" + segments.join("/").replace(/(^|\/)index$/, "");
    }
    return null;
}
/** A page where the component is the direct child of a GhostCursor or GhostReplay, so ?record can record it. */
async function findEmbed(appDir, name, resolveSpec) {
    const files = await walk(appDir);
    let firstImporter = null;
    for (const file of files) {
        if (!/\.(tsx|jsx|mdx)$/.test(file))
            continue;
        const src = await readFile(file, "utf8");
        const imports = [...src.matchAll(/import\s+[^;]*?\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]);
        if (!imports.some((spec) => resolveSpec(spec, file) && stripExt(resolveSpec(spec, file)) === stripExt(COMPONENT)))
            continue;
        const route = routeFor(appDir, file);
        if (!route)
            continue;
        firstImporter ??= file;
        // Code samples in template literals aren't embeds; blank them out, keeping line numbers.
        const jsx = src.replace(/`[^`]*`/g, (m) => m.replace(/[^\n]/g, " "));
        const embed = new RegExp(`<(GhostCursor|GhostReplay)\\b[^>]*>\\s*<${name}[\\s/>]`).exec(jsx);
        if (!embed)
            continue;
        const before = jsx.slice(0, embed.index);
        return {
            embed: {
                page: file,
                route,
                index: (before.match(/<(GhostCursor|GhostReplay)\b/g) ?? []).length,
                line: before.split("\n").length,
            },
            firstImporter,
        };
    }
    return { embed: null, firstImporter };
}
/** A route that mounts the component alone inside a GhostCursor; removed when the run ends. */
async function createStage(appDir, exp, take) {
    const root = existsSync(join(appDir, "src", "app")) ? join(appDir, "src", "app") : join(appDir, "app");
    if (!existsSync(root))
        return fail("only the Next.js App Router gets a temporary route. Pass --url to a page instead.");
    let slug = "ghost-stage";
    while (existsSync(join(root, slug)))
        slug = `ghost-stage-${Math.random().toString(36).slice(2, 6)}`;
    const dir = join(root, slug);
    const spec = (to) => {
        const r = relative(dir, to).split(sep).join("/");
        return r.startsWith(".") ? r : `./${r}`;
    };
    const sources = await walk(appDir);
    let hasStyles = false;
    for (const f of sources) {
        if (/\.(css|tsx|ts|jsx|js)$/.test(f) && (await readFile(f, "utf8")).includes("ghost-cursor/styles.css")) {
            hasStyles = true;
            break;
        }
    }
    const imp = exp.isDefault ? `import ${exp.name} from ${JSON.stringify(spec(stripExt(COMPONENT)))};` : `import { ${exp.name} } from ${JSON.stringify(spec(stripExt(COMPONENT)))};`;
    const props = propsExpression ? `{...${propsExpression}}` : "";
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "page.tsx"), `// Temporary route made by ghost-record. It deletes this folder when it finishes.
import { GhostCursor } from "@imuratalpay/ghost-cursor";
${hasStyles ? "" : 'import "@imuratalpay/ghost-cursor/styles.css";\n'}${imp}
import take from ${JSON.stringify(spec(take))};

export default function GhostStage() {
  return (
    <main data-ghost-stage style={{ boxSizing: "border-box", width: "100%", maxWidth: 680, margin: "0 auto", padding: "48px 20px" }}>
      <GhostCursor recording={take} style={{ height: ${HEIGHT} }}>
        <${exp.name} ${props}/>
      </GhostCursor>
    </main>
  );
}
`);
    cleanups.push(() => (values.keep ? undefined : rm(dir, { recursive: true, force: true })));
    return "/" + slug;
}
// Dev server
// No host: Next listens on IPv6 "::", and a bind to 127.0.0.1 would succeed next to it.
const isFree = (port) => new Promise((done) => {
    const server = createServer()
        .once("error", () => done(false))
        .once("listening", () => server.close(() => done(true)))
        .listen(port);
});
const alive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch {
        return false;
    }
};
async function fetchOk(url, timeout = 4000) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
        return res.ok ? await res.text() : null;
    }
    catch {
        return null;
    }
}
/** True when this page, opened with ?record, shows the dev-only recorder. */
async function recorderAt(browser, url) {
    const page = await browser.newPage();
    try {
        await page.goto(withRecord(url), { timeout: 30_000 });
        return await page
            .waitForSelector(".gc-recorder", { timeout: 15_000 })
            .then(() => true)
            .catch(() => false);
    }
    catch {
        return false;
    }
    finally {
        await page.close();
    }
}
async function devServer(browser, app, route) {
    // Next 16 records its running dev server here, and won't start a second one for the same app.
    const lock = await readJson(join(app.dir, ".next", "dev", "lock"));
    if (lock?.appUrl && alive(lock.pid) && (await fetchOk(lock.appUrl + route, 60_000)) !== null) {
        console.log(`  using the dev server already running at ${lock.appUrl}`);
        return lock.appUrl.replace(/\/$/, "");
    }
    const script = app.pkg.scripts?.dev ?? "";
    const declared = Number(script.match(/(?:-p|--port)[\s=](\d+)/)?.[1]) || undefined;
    const candidates = [...new Set([declared, Number(process.env.PORT) || undefined, 3000, 3001, 3002, 3003].filter(Boolean))];
    for (const port of candidates) {
        const base = `http://localhost:${port}`;
        if ((await fetchOk(base + route, 15_000)) !== null && (await recorderAt(browser, base + route))) {
            console.log(`  using the dev server already running at ${base}`);
            return base;
        }
    }
    let port = declared ?? 3000;
    while (!(await isFree(port)))
        port = port < 3100 ? 3100 : port + 1;
    const log = join(app.dir, ".next", "ghost-record-dev.log");
    await mkdir(dirname(log), { recursive: true });
    const fd = openSync(log, "w");
    const child = script
        ? spawn("npm", ["run", "dev", "--", "--port", String(port)], { cwd: app.dir, detached: true, stdio: ["ignore", fd, fd] })
        : spawn("npx", ["next", "dev", "--port", String(port)], { cwd: app.dir, detached: true, stdio: ["ignore", fd, fd] });
    cleanups.push(() => {
        if (values.keep || !child.pid)
            return;
        try {
            process.kill(-child.pid, "SIGTERM");
        }
        catch { }
    });
    const base = `http://localhost:${port}`;
    console.log(`  started the dev server at ${base}`);
    const deadline = Date.now() + 120_000;
    while ((await fetchOk(base + route, 30_000)) === null) {
        const other = (await readFile(log, "utf8").catch(() => "")).match(/existing server at (https?:\/\/[^\s,]+)/)?.[1];
        if (other) {
            console.log(`  a dev server for this app is already running; using ${other}`);
            return other.replace(/\/$/, "");
        }
        if (Date.now() > deadline)
            return fail(`the dev server didn't serve ${route} within 2 minutes. Its log is ${rel(log)}.`);
        await sleep(1000);
    }
    return base;
}
function withRecord(url) {
    const u = new URL(url);
    u.searchParams.set("record", "");
    return u.toString();
}
// Movement. Seeded, so a rerun with the same seed moves the same way.
let seed = 1;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (a, b) => a + (b - a) * rand();
const gaussian = () => (rand() + rand() + rand() - 1.5) / 1.5;
let SPEED = BASE_SPEED;
let pos = { x: 0, y: 0 };
let lastInput = 0;
/** Minimum-jerk speed along a gently bowed cubic Bézier. */
async function curve(page, to, duration, bowScale = 1) {
    const from = { ...pos };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy) || 1;
    const bow = between(-0.16, 0.16) * dist * bowScale;
    const nx = -dy / dist;
    const ny = dx / dist;
    const c1 = { x: from.x + dx * 0.3 + nx * bow, y: from.y + dy * 0.3 + ny * bow };
    const c2 = { x: from.x + dx * 0.72 + nx * bow * 0.45, y: from.y + dy * 0.72 + ny * bow * 0.45 };
    const start = Date.now();
    for (;;) {
        const k = Math.min(1, (Date.now() - start) / duration);
        const s = k * k * k * (10 - 15 * k + 6 * k * k);
        const u = 1 - s;
        const x = u * u * u * from.x + 3 * u * u * s * c1.x + 3 * u * s * s * c2.x + s * s * s * to.x;
        const y = u * u * u * from.y + 3 * u * u * s * c1.y + 3 * u * s * s * c2.y + s * s * s * to.y;
        await page.mouse.move(x, y);
        pos = { x, y };
        lastInput = Date.now();
        if (k >= 1)
            return;
        await sleep(14);
    }
}
/** Fitts-style duration that varies per move, with an overshoot and correction on long moves. */
async function glide(page, to, { quick = false } = {}) {
    const dist = Math.hypot(to.x - pos.x, to.y - pos.y);
    if (dist < 1)
        return;
    const duration = ((160 + 120 * Math.log2(1 + dist / 14)) * between(0.85, 1.2)) / SPEED / (quick ? 1.5 : 1);
    if (quick || dist < 140 || rand() > 0.7)
        return curve(page, to, duration);
    const ux = (to.x - pos.x) / dist;
    const uy = (to.y - pos.y) / dist;
    const past = Math.min(18, Math.max(4, dist * between(0.03, 0.07)));
    const wobble = between(-3, 3);
    await curve(page, { x: to.x + ux * past - uy * wobble, y: to.y + uy * past + ux * wobble }, duration * 0.92);
    await sleep(between(30, 70));
    await curve(page, to, between(110, 170) / SPEED, 0.3);
}
class StepError extends Error {
}
/** Most specific locator first; the first one that matches exactly one visible element wins. */
function candidates(scope, target) {
    const id = target.match(/^@(.+)$/)?.[1];
    if (id)
        return [`[data-ghost-id="${id}"]`, `[data-testid="${id}"]`, `[id="${id}"]`].map((s) => scope.locator(s));
    const role = target.match(/^role=(\w+)(?:\[name=["']?(.+?)["']?\])?$/);
    if (role) {
        const r = role[1];
        return role[2] ? [scope.getByRole(r, { name: role[2], exact: true }), scope.getByRole(r, { name: role[2] })] : [scope.getByRole(r)];
    }
    const label = target.match(/^label=["']?(.+?)["']?$/)?.[1];
    if (label)
        return [scope.getByLabel(label, { exact: true }), scope.getByLabel(label), scope.getByPlaceholder(label)];
    const text = target.match(/^text=["']?(.+?)["']?$/)?.[1];
    const words = text ?? target.replace(/^["']|["']$/g, "");
    const list = [
        scope.getByText(words, { exact: true }),
        scope.getByRole("button", { name: words, exact: true }),
        scope.getByRole("menuitem", { name: words }),
        scope.getByRole("menuitemradio", { name: words }),
        scope.getByRole("option", { name: words }),
        scope.getByLabel(words),
        scope.getByText(words),
    ];
    // An invalid CSS selector just counts zero matches in find().
    if (!text)
        list.push(scope.locator(target));
    return list;
}
async function find(scope, target) {
    let fallback = null;
    for (const c of candidates(scope, target)) {
        const visible = c.filter({ visible: true });
        const n = await visible.count().catch(() => 0);
        if (n === 1)
            return visible;
        if (n > 1 && !fallback)
            fallback = visible.first();
    }
    if (fallback)
        return fallback;
    throw new StepError(`${target} isn't in the box at this point in the take`);
}
async function aim(scope, target) {
    const box = await (await find(scope, target)).boundingBox();
    if (!box)
        throw new StepError(`${target} isn't visible`);
    const mx = Math.min(3, box.width / 2);
    const my = Math.min(3, box.height / 2);
    return {
        x: Math.min(box.x + box.width - mx, Math.max(box.x + mx, box.x + box.width * (0.5 + gaussian() * 0.15))),
        y: Math.min(box.y + box.height - my, Math.max(box.y + my, box.y + box.height * (0.5 + gaussian() * 0.12))),
    };
}
async function perform(page, stage, step, last) {
    const pause = (a, b) => (last ? Promise.resolve() : sleep(between(a, b) / SPEED));
    switch (step.kind) {
        case "click":
        case "hover":
            await glide(page, await aim(stage, step.target));
            if (step.kind === "hover")
                return pause(380, 750);
            await sleep(between(90, 220) / SPEED);
            await page.mouse.down();
            await sleep(between(65, 120));
            await page.mouse.up();
            lastInput = Date.now();
            return pause(260, 520);
        case "type":
            for (const ch of step.text) {
                await page.keyboard.type(ch);
                lastInput = Date.now();
                await sleep((between(65, 160) + (ch === " " ? between(60, 140) : 0) + (rand() < 0.12 ? between(150, 300) : 0)) / SPEED);
            }
            return pause(300, 500);
        case "press":
            await page.keyboard.press(step.key);
            lastInput = Date.now();
            return pause(250, 450);
        case "wait":
            if (!last)
                await sleep(step.ms);
            return;
        case "move": {
            const box = (await stage.boundingBox());
            await glide(page, { x: box.x + box.width * step.x, y: box.y + box.height * step.y });
            return pause(200, 400);
        }
    }
}
// State comparison. Kept as source text, so it runs unchanged inside the page.
const SIGNATURE = String.raw `(content, ignore, volatile) => {
  const SKIP_ATTRS = /^(style|id|for|data-ghost-.*|data-motion-.*|data-projection-id|data-handoff|data-dragging|aria-(controls|labelledby|describedby|activedescendant|owns|valuenow|valuetext))$/;
  const skip = [".gc-overlay", ".gc-time", ".gc-hint", ...ignore].join(",");
  const moving = new Set(volatile.flatMap((p) => [...content.querySelectorAll(p)]));
  let out = "";
  const walk = (n) => {
    if (n.nodeType === Node.TEXT_NODE) { out += n.textContent; return; }
    if (!(n instanceof Element) || n.matches(skip) || moving.has(n)) return;
    const tag = n.tagName.toLowerCase();
    out += "<" + tag;
    for (const a of Array.from(n.attributes)) if (!SKIP_ATTRS.test(a.name)) out += " " + a.name + '="' + a.value + '"';
    out += ">";
    n.childNodes.forEach(walk);
    out += "</" + tag + ">";
  };
  content.childNodes.forEach(walk);
  return out;
}`;
/** Each element's own text and attributes, keyed by its path. Two of these 1s apart show what changes by itself. */
const SNAPSHOT = String.raw `(content) => {
  const out = {};
  const walk = (el, path) => {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
    const attrs = [...el.attributes].filter((a) => !/^(style|data-ghost-|data-motion-)/.test(a.name)).map((a) => a.name + "=" + a.value).join(" ");
    out[path] = own + "|" + attrs;
    [...el.children].forEach((c, i) => walk(c, path + " > " + c.tagName.toLowerCase() + ":nth-child(" + (i + 1) + ")"));
  };
  [...content.children].forEach((c, i) => walk(c, ":scope > " + c.tagName.toLowerCase() + ":nth-child(" + (i + 1) + ")"));
  return out;
}`;
const contentOf = (root) => root.locator(":scope > .gc-stage > .gc-content");
const evalIn = (root, src, ...args) => contentOf(root).evaluate((el, [s, a]) => (0, eval)(s)(el, ...a), [src, args]);
async function volatilePaths(root) {
    const a = await evalIn(root, SNAPSHOT);
    await sleep(1000);
    const b = await evalIn(root, SNAPSHOT);
    const changed = Object.keys(b).filter((k) => a[k] !== undefined && a[k] !== b[k]);
    return changed.filter((p) => !changed.some((q) => q !== p && p.startsWith(q + " > ")));
}
function firstDifference(a, b) {
    let i = 0;
    while (i < a.length && a[i] === b[i])
        i++;
    const from = Math.max(0, i - 60);
    return { take: a.slice(from, i + 80), replay: b.slice(from, i + 80) };
}
// One attempt: record a take live, then replay it with Preview and compare the end states.
const ROOTS = ".gc-root:not(.gc-stage .gc-root)";
async function attempt(browser, url, index, n) {
    SPEED = BASE_SPEED * [1, 0.85, 0.75][n];
    seed = ((Number(values.seed) || 1) + n) * 9301 + 49297;
    const settle = Math.min(1400, BASE_SETTLE + n * 400);
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
        const clipboard = navigator.clipboard;
        if (!clipboard)
            return;
        const original = clipboard.writeText.bind(clipboard);
        clipboard.writeText = async (text) => {
            window.__take = text;
            original(text).catch(() => { });
        };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
        await page.goto(withRecord(url));
        await page.waitForSelector(".gc-recorder", { timeout: 30_000 });
        await sleep(500);
        const root = page.locator(ROOTS).nth(index);
        const stage = root.locator(":scope > .gc-stage");
        await root.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await sleep(300);
        const volatile = await volatilePaths(root);
        const state = () => evalIn(root, SIGNATURE, values.ignore, volatile);
        const panel = (id) => root.locator(`:scope > .gc-recorder [data-ghost-id="${id}"]`);
        const record = await panel("gc-record").boundingBox();
        if (!record)
            return { error: "the recorder isn't on the page. Is the server a dev build?" };
        pos = { x: record.x + record.width / 2, y: record.y + record.height / 2 };
        await page.mouse.click(pos.x, pos.y);
        await sleep(350);
        if ((await root.locator(":scope > .gc-recorder").getAttribute("data-status")) !== "recording") {
            return { error: "pressing Record didn't start a take. Something covers the recorder." };
        }
        const initial = await state();
        for (const [i, step] of steps.entries()) {
            console.log(`    ${i + 1}/${steps.length}  ${rawSteps[i]}`);
            await perform(page, stage, step, i === steps.length - 1);
        }
        await sleep(Math.max(0, lastInput + settle - Date.now()));
        const live = await state();
        const stop = await panel("gc-stop").boundingBox();
        if (!stop)
            return { error: "the recorder stopped during the take. Did the page reload?" };
        await glide(page, { x: stop.x + stop.width / 2, y: stop.y + stop.height / 2 }, { quick: true });
        await page.mouse.down();
        await page.mouse.up();
        await sleep(250);
        await panel("gc-copy").click();
        await sleep(200);
        const json = await page.evaluate(() => window.__take);
        if (!json)
            return { error: "the take has no events inside the box" };
        const take = JSON.parse(json);
        const duration = take.events.at(-1)[0];
        // Replay: Preview plays the take in the same box, from a fresh mount.
        await panel("gc-preview").click();
        const slider = root.locator(':scope > .gc-controls [role="slider"]');
        await slider.waitFor({ state: "attached" });
        const max = await slider.getAttribute("aria-valuemax");
        const deadline = Date.now() + duration * 2 + 10_000;
        let reacted = false;
        let sampled = 0;
        while ((await slider.getAttribute("aria-valuenow")) !== max) {
            if (Date.now() > deadline)
                return { error: "the replay never reached the end of the take" };
            if (!reacted && Date.now() - sampled > 150) {
                sampled = Date.now();
                reacted = (await state()) !== initial;
            }
            await sleep(40);
        }
        await sleep(settle);
        const replayed = await state();
        if (errors.length)
            return { error: `the page threw during the take: ${errors[0]}` };
        if (live !== initial && !reacted && replayed === initial)
            return { error: "the component didn't react to the replay" };
        if (replayed !== live) {
            const d = firstDifference(live, replayed);
            return { error: `the replay ended in a different state\n      take:   …${d.take}…\n      replay: …${d.replay}…` };
        }
        const stageHeight = Math.round((await stage.boundingBox()).height);
        return { json, duration, presses: take.events.filter((e) => e[1] === "d").length, targets: take.targets, stageHeight };
    }
    catch (e) {
        if (e instanceof StepError)
            return { error: e.message };
        return { error: e.message.split("\n")[0] };
    }
    finally {
        await context.close();
    }
}
// Run
const app = await findApp();
if (!app && !values.url)
    await fail("no Next.js app contains this component. Pass --url to a page that renders it in a GhostCursor.");
const exp = await componentExport(COMPONENT, exportArg);
const tsconfig = app ? await readJson(join(app.dir, "tsconfig.json")) : null;
const resolveSpec = resolver(app?.dir ?? process.cwd(), tsconfig?.compilerOptions?.paths ?? {});
const OUT = resolve(values.out ?? join(dirname(COMPONENT), basename(COMPONENT, extname(COMPONENT)) + ".take.json"));
console.log(`→ ${exp.name} from ${rel(COMPONENT)}`);
const found = app && !values.url ? await findEmbed(app.dir, exp.name, resolveSpec) : { embed: null, firstImporter: null };
const embed = found.embed;
const hadTake = existsSync(OUT);
let succeeded = false;
let route = embed?.route ?? "";
if (!values.url && !embed) {
    if (!hadTake) {
        await writeFile(OUT, '{"v":1,"size":[640,320],"targets":[],"events":[[0,"m",0.5,0.5]]}\n');
        cleanups.push(async () => {
            if (!succeeded)
                await rm(OUT, { force: true });
        });
    }
    route = await createStage(app.dir, exp, OUT);
    console.log(`  no page shows it in a GhostCursor, so it's mounted alone at ${route}`);
}
else if (embed) {
    console.log(`  recording where it's embedded: ${route} (${rel(embed.page)}:${embed.line})`);
}
const browser = await chromium.launch({ headless: !values.headed });
cleanups.push(() => browser.close());
const url = values.url ?? (await devServer(browser, app, route)) + route;
let result = { error: "not run" };
for (let n = 0; n < 3; n++) {
    console.log(`  take ${n + 1} of 3`);
    result = await attempt(browser, url, embed?.index ?? 0, n);
    if (!("error" in result))
        break;
    console.warn(`  ! ${result.error}`);
}
if ("error" in result)
    await fail(`three takes failed. The last error: ${result.error}`);
const ok = result;
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, ok.json);
succeeded = true;
// The snippet
const alias = Object.entries(tsconfig?.compilerOptions?.paths ?? {}).find(([, [t]]) => t === "./*" || t === "./src/*");
const importPath = (file, keepExt = false) => {
    const target = keepExt ? file : stripExt(file);
    if (alias && app) {
        const base = resolve(app.dir, alias[1][0].replace(/\*$/, ""));
        if (target.startsWith(base + sep))
            return alias[0].replace(/\*$/, "") + relative(base, target).split(sep).join("/");
    }
    return "./" + relative(app?.dir ?? process.cwd(), target).split(sep).join("/");
};
const takeVar = exp.name[0].toLowerCase() + exp.name.slice(1) + "Take";
const height = embed ? ok.stageHeight : HEIGHT;
const props = propsExpression ? ` {...${propsExpression}}` : "";
const where = embed
    ? `${rel(embed.page)}:${embed.line} already embeds ${exp.name}. Swap its recording for the new take, or paste this where you want another copy:`
    : found.firstImporter
        ? `Paste this into ${rel(found.firstImporter)}, which already imports ${exp.name}, or into any page:`
        : `Paste this into the page that should show the demo:`;
console.log(`
✓ take ${rawSteps.length} ${rawSteps.length === 1 ? "step" : "steps"} · ${(ok.duration / 1000).toFixed(1)}s · ${ok.presses} ${ok.presses === 1 ? "press" : "presses"} · ${(ok.json.length / 1024).toFixed(1)} KB
✓ replay matches the live run
  saved ${rel(OUT)}${ok.targets.some((t) => !t.startsWith("@")) ? "\n  ! some targets are CSS paths; add data-ghost-id to them so the take survives markup changes" : ""}

${where}

import { GhostReplay } from "@imuratalpay/ghost-cursor";
${exp.isDefault ? `import ${exp.name}` : `import { ${exp.name} }`} from ${JSON.stringify(importPath(COMPONENT))};
import ${takeVar} from ${JSON.stringify(importPath(OUT, true))};

<GhostReplay recording={${takeVar}} style={{ height: ${height} }}>
  <${exp.name}${props} />
</GhostReplay>
`);
await cleanup();
process.exit(0);
