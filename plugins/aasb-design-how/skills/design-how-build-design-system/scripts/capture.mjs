#!/usr/bin/env node
// capture.mjs: screenshots of every route, width, theme and state, behind capture-guard. Node 18+, Playwright 1.49+.
// Run `node capture.mjs --help` for usage.
import { createServer } from "node:http";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { launchChromium, repoRoot } from "./find-chromium.mjs";
import { installGuard, isLocalHost, prove } from "./capture-guard.mjs";

const SELF = fileURLToPath(import.meta.url);

const HELP = `capture.mjs: screenshots and accessibility trees for every route, width and theme, with every write blocked

Usage
  node capture.mjs --base <url> --kind before|after --out <folder> (--routes <r>... | --surfaces <tsv>)
                   (--writes <file> | --no-backend) [options]
  node capture.mjs --base <url> --status (--routes <r>... | --surfaces <tsv>)
  node capture.mjs --self-test | --help

  Example, with the app served on port 3000:
  node capture.mjs --base http://localhost:3000 --kind before --out .design-system/captures \\
    --surfaces .design-system/surfaces.tsv --writes .design-system/writes.txt

Routes
  --routes <r>...      each a path (/settings/profile) or surface=path (profile=/settings/profile), separated by
                       spaces or commas. The surface name defaults to the path as a slug: / is home. Load state only
  --surfaces <tsv>     a TSV with a header row holding surface and route (or path or url), and optionally states
                       (comma separated) and status (the HTTP code the route should answer, 200 when blank).
                       It is the only way to capture states
  --expect-status <s=code>...  a surface or route that should answer another code, such as notfound=404

Files, in --out
  <surface>-<kind>-<width>.png              the page as it loads, first theme
  <surface>-<kind>-<width>-<theme>.png      the other themes
  <surface>.<state>-<kind>-<width>.png      a listed state other than the load state
  ...same name with .aria.yml               the accessibility tree (roles, names, states). Diff before and after
  ...same name with .<audit>.json           what each --eval script returned
  guard.log                                 one JSON line per network decision, with the body of every write
  bodies.json                               with --run: the request bodies of every write, for bodies-check

The guard (capture-guard.mjs) is installed on the browser context before the first navigation. It aborts every
non-local host, every PUT, PATCH and DELETE, and every POST not listed as a read. Service workers are blocked so
no request goes around it. A WebSocket is not guarded: an app that writes over one is not safe to capture live.
A capture needs one of these two, so no run starts before its writes are proven blocked:
  --writes <file>      lines of "METHOD URL", every write the app sends, copied from its network log ("METHOD URL
                       BODY" for GraphQL). capture runs capture-guard prove on them first and exits 2 before
                       opening a browser if any one would get through
  --no-backend         the app sends no writes (a static site, or every call answered by --guard-fixtures). The
                       guard still aborts every write, and a write seen anyway is printed as a WARN line
  --read-procedures <a,b>  exact POST procedure names, or GraphQL operation names, that are reads and may continue
  --procedure-style <s>    rpc-post (default) or rest
  --graphql <path>...      a path that serves GraphQL, beyond any ending in /graphql or /gql
  --guard-fixtures <json>  {"<procedure>": {"status": 200, "body": {...}}}, answered in the browser
  --app-origin <url>...    origins that serve the app. Default: any local host
  --allow-host <host>...   a non-local host the page may reach. A non-local --base is refused unless named here

Request bodies, for bodies-check.mjs in migrate-design-system
  --run <RUN_ID>       write bodies.json in --out: {"run", "rows": [{url, proc, body, capturedAt}]}, one row per
                       write the page sent, blocked or not. A GraphQL row's proc is graphql/<operation name>
  --bodies <file>      write it here instead, such as <evidence>/bodies.before.json

Options
  --root <dir>         the app's repo root, where Playwright is looked for first. Default: the git root of --out
  --widths 390,1280    viewport widths: the narrowest and widest the app supports
  --height 900         viewport height. 320 at --widths 390 shows overlays that run past a short screen
  --themes light,dark  the first is the default theme. Default: light
  --theme-via <how>    media (prefers-color-scheme, default), class (toggles .dark on <html>) or storage:<key>
                       (sets localStorage <key> before load). media is what a dark OS does
  --states <file.mjs>  a module whose default export maps a state name, or surface.state, to async (page) => {}
                       that reaches it. A listed state with no function is not captured, which fails the run
  --eval <file.js>...  in-page audit scripts. What each returns is written as JSON beside the screenshot
  --full               full-page screenshots (default: the viewport)
  --mobile             isMobile and hasTouch on, for a review of a phone
  --storage-state <f>  a Playwright storage state the person provides, to reach signed-in screens. Never a real
                       account's session
  --no-aria            skip the accessibility trees
  --status             only request every route and print its HTTP status. Exit 1 unless each answers as expected.
                       Redirects are not followed: a 3xx is reported with its Location and fails unless
                       --expect-status or the status column names that code

It requests every route first and exits 1 if any answers other than expected, after capturing the rest. The
clock is fixed, Math.random is seeded, reduced motion is on, lazy images load eagerly, and it waits for fonts
and, on a React app, for handlers to attach.
Exit 0 every planned capture written, 1 a route or capture failed or any capture is missing (each is listed),
2 bad input, a write that would get through, or no browser.`;

const die = (m) => { console.error(`capture: ${m}`); process.exit(2); };
const slug = (p) => p.replace(/[?#].*$/, "").replace(/^\/+|\/+$/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "home";

async function main(argv) {
	if (!argv.length || argv.includes("--help") || argv.includes("-h")) { console.log(HELP); process.exit(argv.length ? 0 : 2); }
	if (argv.includes("--self-test")) process.exit(await selfTest());
	const KNOWN = new Set(["--height", "--root", "--base", "--kind", "--out", "--routes", "--surfaces", "--widths", "--themes", "--theme-via", "--states", "--full", "--status", "--no-aria", "--expect-status", "--mobile", "--storage-state", "--eval", "--writes", "--read-procedures", "--procedure-style", "--guard-fixtures", "--app-origin", "--allow-host", "--no-backend", "--run", "--bodies", "--graphql"]);
	const bad = argv.filter((a) => a.startsWith("--") && !KNOWN.has(a));
	if (bad.length) die(`unknown ${bad.join(", ")}. See --help`);
	const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d; };
	const list = (f) => { const i = argv.indexOf(f); if (i < 0) return null; const out = []; for (let k = i + 1; k < argv.length && !argv[k].startsWith("--"); k++) out.push(argv[k]); return out; };

	const base = val("--base"); if (!base || !/^https?:\/\//.test(base)) die("--base <http://host:port> is required");
	const statusOnly = argv.includes("--status");
	const kind = val("--kind");
	const out = val("--out") && resolve(val("--out"));
	if (!statusOnly) {
		if (!/^(before|after)$/.test(kind || "")) die("--kind before or --kind after is required");
		if (!out) die("--out <folder> is required");
		if (!val("--writes") && !argv.includes("--no-backend")) die("give --writes <file> (every write the app sends, proven blocked before the browser opens) or --no-backend (the app sends none). See --help");
		if (val("--writes") && argv.includes("--no-backend")) die("give --writes or --no-backend, not both");
	}
	const runId = val("--run");
	if (runId && !/^[\w.-]+$/.test(runId)) die("--run takes an id of letters, digits, dot, dash or underscore");
	if (val("--bodies") && !runId) die("--bodies needs --run <RUN_ID>, the id the run log records");
	if (runId && statusOnly) die("--run writes request bodies from a capture, so it does not go with --status");
	const widths = val("--widths", "390,1280").split(",").map(Number);
	if (widths.some((w) => !w)) die("--widths takes numbers, such as 390,1280");
	const height = Number(val("--height", "900"));
	if (!height) die("--height takes a number, such as 320");
	const themes = val("--themes", "light").split(",");
	const via = val("--theme-via", "media");
	if (!/^(media|class|storage:.+)$/.test(via)) die("--theme-via is media, class or storage:<key>");
	const aria = !argv.includes("--no-aria");
	const storageState = val("--storage-state") && resolve(val("--storage-state"));
	if (storageState && !existsSync(storageState)) die(`no storage state at ${storageState}`);
	const audits = (list("--eval") || []).flatMap((f) => f.split(",")).filter(Boolean).map((f) => {
		const p = resolve(f); if (!existsSync(p)) die(`--eval: no file at ${p}`);
		const n = p.split("/").pop().replace(/\.(m?js)$/, ""); if (n === "aria") die("--eval: a script named aria would overwrite the .aria files. Rename it");
		return { name: n, src: readFileSync(p, "utf8") };
	});

	let surfaces = [];
	const routeArgs = (list("--routes") || []).flatMap((r) => r.split(",")).map((r) => r.trim()).filter(Boolean);
	if (argv.includes("--routes") && !routeArgs.length) die("--routes needs one or more paths, such as --routes /,/settings/profile");
	if (routeArgs.length && val("--surfaces")) die("give --routes or --surfaces, not both");
	if (routeArgs.length && val("--states")) die("--states needs --surfaces, whose states column lists each surface's states");
	if (routeArgs.length) surfaces = routeArgs.map((r) => { const m = /^([\w-]+)=(\/.*)$/.exec(r); return m ? { surface: m[1], route: m[2], states: [] } : { surface: slug(r), route: r.startsWith("/") ? r : `/${r}`, states: [] }; });
	else if (val("--surfaces")) {
		const p = resolve(val("--surfaces")); if (!existsSync(p)) die(`no file at ${p}`);
		const rows = readFileSync(p, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("\t"));
		const head = rows.shift().map((h) => h.trim().toLowerCase());
		const col = (...n) => head.findIndex((h) => n.includes(h));
		const cs = col("surface"), cr = col("route", "path", "url"), ct = col("states"), cx = col("status", "expect");
		if (cs < 0 || cr < 0) die(`${p} needs a header row with surface and route columns`);
		surfaces = rows.map((r) => ({ surface: r[cs].trim(), route: r[cr].trim(), states: ct >= 0 ? (r[ct] || "").split(",").map((s) => s.trim()).filter((s) => s && s !== "-" && s !== "default") : [], expect: cx >= 0 && /^\d{3}$/.test((r[cx] || "").trim()) ? Number(r[cx].trim()) : 200 }));
	} else die("give --routes or --surfaces");
	for (const e of list("--expect-status") || []) {
		const m = /^(.+)=(\d{3})$/.exec(e); if (!m) die(`--expect-status takes surface=code, such as notfound=404, not ${e}`);
		const hit = surfaces.filter((s) => s.surface === m[1] || s.route === m[1]); if (!hit.length) die(`--expect-status: no surface or route ${m[1]}`);
		for (const s of hit) s.expect = Number(m[2]);
	}
	for (const s of surfaces) s.expect ??= 200;
	if (surfaces.some((s) => s.surface.includes("."))) die("a surface name may not contain a dot; the dot separates surface and state");

	// The guard's options, and the dry run that must come back clean before any browser opens.
	const host = new URL(base).hostname;
	const allowHosts = list("--allow-host") || [];
	// A non-local base once opened the guard to that host for every request. Only an explicit --allow-host does now.
	if (!isLocalHost(host) && !allowHosts.map((h) => h.toLowerCase()).includes(host.toLowerCase())) die(`--base ${host} is not a local host. Capture a local build, or name the host with --allow-host ${host} if every write to it is proven blocked`);
	const guardOpts = {
		procedureStyle: val("--procedure-style", "rpc-post"),
		readProcedures: (val("--read-procedures") || "").split(",").filter(Boolean),
		appOrigins: list("--app-origin") || [],
		allowHosts,
		graphqlPaths: list("--graphql") || [],
		fixtures: val("--guard-fixtures") ? JSON.parse(readFileSync(resolve(val("--guard-fixtures")), "utf8")) : undefined,
	};
	if (!["rpc-post", "rest"].includes(guardOpts.procedureStyle)) die("--procedure-style is rpc-post or rest");
	let proved = "--no-backend, so no dry run of the app's writes";
	if (val("--writes")) {
		const p = resolve(val("--writes")); if (!existsSync(p)) die(`no writes file at ${p}`);
		const lines = readFileSync(p, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#"));
		const leaks = prove(lines, guardOpts);
		for (const l of leaks) console.log(`LEAK\t${l.method} ${l.url}\t${l.reason}`);
		if (leaks.length) die(`${leaks.length} of ${lines.length} writes in ${p} would reach the backend. Fix the guard options; nothing was captured`);
		proved = `every one of ${lines.length} writes in --writes blocked`;
	}

	// 1. Every route answers as expected. A type check passes a server/client break that only a request shows.
	const statuses = [];
	// Redirects are not followed, so a route that bounces to /login reads as the 3xx it is.
	for (const s of surfaces) {
		let code, where = "";
		try {
			const res = await fetch(new URL(s.route, base), { redirect: "manual" });
			code = res.status;
			if (code >= 300 && code < 400) where = ` -> ${res.headers.get("location") || "(no Location)"}`;
		} catch (e) { code = `no answer (${e.cause?.code || e.message})`; }
		statuses.push([s, code]);
		console.log(`${code === s.expect ? code : "FAIL"}\t${s.route}\t${code}${where}${s.expect !== 200 ? ` (expected ${s.expect})` : ""}`);
	}
	const off = statuses.filter(([s, c]) => c !== s.expect);
	if (statusOnly) { console.log(`${statuses.length} route(s), ${off.length} not as expected`); process.exit(off.length ? 1 : 0); }
	mkdirSync(out, { recursive: true });

	const FREEZE = `(() => { let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();`;
	const HYDRATED = `new Promise((ok) => { const t0 = Date.now(); const tick = () => { const el = document.querySelector("button, a[href], input, select, textarea, [role=button]"); const ready = !el || Object.keys(el).some((k) => k.startsWith("__reactProps") || k.startsWith("__reactFiber")) || !document.querySelector("#__next, [data-reactroot], script[src*='_next']"); if (ready || Date.now() - t0 > 5000) ok(ready); else setTimeout(tick, 50); }; tick(); })`;
	const SETTLE = `(async () => { for (const i of document.querySelectorAll("img[loading=lazy]")) i.loading = "eager"; await Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); }))); await document.fonts.ready; document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); return true; })()`;
	const themeClass = (t) => `document.documentElement.classList.toggle("dark", ${JSON.stringify(t)} === "dark"); document.documentElement.style.colorScheme = ${JSON.stringify(t)};`;
	if (via !== "media" && themes.length > 1) console.error(`capture: --theme-via ${via} sets the theme by hand. It proves the tokens, not that a dark OS reaches them`);
	const name = (s, state, w, t) => `${s.surface}${state ? `.${state}` : ""}-${kind}-${w}${t === themes[0] ? "" : `-${t}`}`;
	const written = [], missed = [];
	let evals = 0, trees = 0, blocked = 0;

	const launched = await launchChromium({}, { root: repoRoot(val("--root"), out) });
	if (launched.error) die(launched.error);
	const browser = launched.browser;
	console.error(`capture: ${launched.from}, ${launched.how}`);
	let steps = {};
	if (val("--states")) { const m = await import(pathToFileURL(resolve(val("--states"))).href); steps = m.default || m; }
	const logFile = join(out, "guard.log");
	writeFileSync(logFile, "");
	for (const [s, code] of statuses) {
		if (code !== s.expect) { missed.push(`${s.surface}: HTTP ${code}`); continue; }
		for (const t of themes) for (const w of widths) for (const state of ["", ...s.states]) {
			const step = state ? steps[`${s.surface}.${state}`] || steps[state] : null;
			if (state && typeof step !== "function") { missed.push(`${s.surface}.${state}: no function for it in --states`); continue; }
			const ctx = await browser.newContext({ viewport: { width: w, height }, colorScheme: via === "media" ? (t === "dark" ? "dark" : "light") : "light", reducedMotion: "reduce", serviceWorkers: "block", ...(argv.includes("--mobile") ? { isMobile: true, hasTouch: true } : {}), ...(storageState ? { storageState } : {}) });
			const guard = installGuard(ctx, { ...guardOpts, logFile });
			await guard.ready;
			const page = await ctx.newPage();
			try {
				await page.clock.install({ time: new Date("2026-01-01T09:00:00Z") });
				await page.addInitScript(FREEZE);
				if (via.startsWith("storage:")) await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} }, [via.slice(8), t]);
				await page.goto(new URL(s.route, base).href, { waitUntil: "load" });
				if (via === "class") await page.evaluate(themeClass(t));
				await page.evaluate(HYDRATED);
				if (step) await step(page);
				await page.evaluate(SETTLE);
				const file = join(out, `${name(s, state, w, t)}.png`);
				await page.screenshot({ path: file, fullPage: argv.includes("--full"), animations: "disabled" });
				// A blank or failed render compresses to almost nothing. It is not a baseline.
				if (readFileSync(file).length < 700) { rmSync(file); throw new Error("blank render, a capture under 700 bytes was deleted"); }
				if (aria) {
					try { writeFileSync(file.replace(/\.png$/, ".aria.yml"), (await page.locator("body").ariaSnapshot()) + "\n"); trees++; }
					catch (e) { missed.push(`${name(s, state, w, t)}: aria tree failed (needs Playwright 1.49+): ${String(e.message).split("\n")[0]}`); }
				}
				for (const a of audits) {
					try { const r = await page.evaluate(a.src); if (r === undefined || r === null) throw new Error("returned nothing"); writeFileSync(file.replace(/\.png$/, `.${a.name}.json`), JSON.stringify(r, null, 1)); evals++; }
					catch (e) { missed.push(`${name(s, state, w, t)}: eval ${a.name} failed: ${String(e.message).split("\n")[0]}`); }
				}
				written.push(file);
			} catch (e) { missed.push(`${name(s, state, w, t)}: ${String(e.message).split("\n")[0]}`); }
			await guard.releaseAll();
			blocked += guard.log.filter((l) => l.action === "abort").length;
			await ctx.close();
		}
	}
	await browser.close();

	const log = readFileSync(logFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
	const writes = log.filter((l) => !["GET", "HEAD", "OPTIONS"].includes(String(l.method).toUpperCase()) && l.action !== "error" && !/released|aborted at release/.test(l.reason || ""));
	const unproven = writes.filter((w) => w.action === "abort" || w.action === "hold");
	if (argv.includes("--no-backend") && unproven.length) console.log(`WARN\tthe app sent ${unproven.length} write request(s) though --no-backend was given, each blocked. List them in --writes: ${[...new Set(unproven.map((w) => `${w.method} ${w.proc}`))].join(", ")}`);
	if (runId) {
		const file = val("--bodies") ? resolve(val("--bodies")) : join(out, "bodies.json");
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, JSON.stringify({ run: runId, rows: writes.map((w) => ({ url: w.url, proc: w.proc, body: w.body ?? "", capturedAt: w.t, method: w.method, action: w.action })) }, null, 1) + "\n");
		console.log(`bodies: ${writes.length} write request(s) from run ${runId} in ${file}${writes.length ? "" : ". None was sent, so the changed path was not exercised"}`);
	}
	const planned = surfaces.reduce((n, s) => n + (1 + s.states.length) * widths.length * themes.length, 0);
	for (const m of missed) console.log(`not captured\t${m}`);
	console.log(`capture: ${written.length} of ${planned} planned file(s) in ${out}, ${missed.length} not captured, ${off.length} route(s) not as expected, ${blocked} request(s) blocked (guard.log)`);
	console.log(`Coverage: ${written.length} of ${planned} captures (${surfaces.length} surface(s), widths ${widths.join(",")}, themes ${themes.join(",")} via ${via}), ${aria ? `${trees} accessibility tree(s)` : "no accessibility trees (--no-aria)"}${audits.length ? `, ${evals} audit result(s)` : ""}, ${proved}. Not captured: hover, focus and pressed states, motion in flight, states the surfaces file does not list, routes not listed`);
	// Any capture short of the plan fails the run, so a missing state is never read as a baseline.
	process.exit(off.length || missed.length || written.length < planned ? 1 : 0);
}

// ---------------------------------------------------------------- self-test
// A local app whose page fires a write on load. The capture must save the page and the write must never arrive.
async function selfTest() {
	let fails = 0;
	const t = (name, ok, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `: ${detail}`}`); if (!ok) fails++; };
	const hits = [];
	const page = `<!doctype html><html><body><h1>Items</h1><button>Save</button><script>
fetch("/rpc/items/update", { method: "POST", body: '{"id":1,"count":2}' }).catch(() => {});
fetch("/rpc/items/list", { method: "POST", body: "{}" }).catch(() => {});
fetch("/api/ping").catch(() => {});
</script></body></html>`;
	const server = createServer((req, res) => {
		hits.push(`${req.method} ${req.url}`);
		if (req.url === "/") { res.writeHead(200, { "content-type": "text/html" }); res.end(page); }
		else if (req.url === "/gone") { res.writeHead(404); res.end(); }
		else if (req.url === "/private") { res.writeHead(302, { location: "/login" }); res.end(); }
		else if (req.url === "/login") { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><html><body><h1>Log in</h1></body></html>"); }
		else if (req.url === "/blank") { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><html><body></body></html>"); }
		else { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); }
	});
	await new Promise((r) => server.listen(0, "127.0.0.1", r));
	const base = `http://127.0.0.1:${server.address().port}`;
	const dir = mkdtempSync(join(tmpdir(), "capture-"));
	// The child is async and the server lives in this process, so run it without blocking the event loop.
	const run = (...a) => new Promise((ok) => {
		const p = spawn(process.execPath, [SELF, ...a], { cwd: dir });
		let out = "";
		p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
		p.on("close", (code) => ok({ code, out }));
	});
	try {
		let r = await run("--base", base, "--status", "--routes", "/", "/gone");
		t("--status exits 1 on a route that answers 404", r.code === 1 && /FAIL\t\/gone\t404/.test(r.out), r.out);
		r = await run("--base", base, "--status", "--routes", "/", "gone=/gone", "--expect-status", "gone=404");
		t("--expect-status accepts the expected code", r.code === 0, r.out);
		// Redirects were once followed, so a route that bounced to /login read as 200.
		r = await run("--base", base, "--status", "--routes", "/private");
		t("--status reports a redirect as not OK, with its Location", r.code === 1 && /FAIL\t\/private\t302 -> \/login/.test(r.out), r.out);
		r = await run("--base", base, "--status", "--routes", "private=/private", "--expect-status", "private=302");
		t("--status accepts a redirect it was told to expect", r.code === 0, r.out);
		// A non-local base once opened the guard to that host.
		r = await run("--base", "http://app.example.com", "--status", "--routes", "/");
		t("a non-local --base is refused without --allow-host", r.code === 2 && /not a local host/.test(r.out), r.out);
		// A capture once started with no proof that the app's writes were blocked.
		const before0 = hits.length;
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "noproof"), "--routes", "/");
		t("a capture with neither --writes nor --no-backend is refused before any request", r.code === 2 && /--writes <file>.*--no-backend/.test(r.out) && hits.length === before0, r.out);
		writeFileSync(join(dir, "writes.txt"), `POST ${base}/rpc/items/update\nPOST ${base}/rpc/items/list\n`);
		const before = hits.length;
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "leak"), "--routes", "/", "--writes", join(dir, "writes.txt"), "--read-procedures", "items/update");
		t("a write the guard would let through stops the run before any request", r.code === 2 && /LEAK\tPOST/.test(r.out) && hits.length === before, r.out);
		const pw = spawnSync(process.execPath, [join(SELF, "..", "find-chromium.mjs"), "--root", dir], { encoding: "utf8" });
		if (pw.status !== 0) {
			console.log(`self-test: the browser checks did not run, because no Playwright and Chromium were found:\n${(pw.stderr || pw.stdout).trim()}`);
			return 2;
		}
		hits.length = 0;
		writeFileSync(join(dir, "writes.txt"), `POST ${base}/rpc/items/update\nPUT ${base}/api/items/1\n`);
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "shots"), "--routes", "/", "--widths", "390", "--writes", join(dir, "writes.txt"), "--read-procedures", "items/list", "--run", "RUN-T", "--bodies", join(dir, "evidence/bodies.before.json"));
		t("a clean dry run is reported", /every one of 2 writes in --writes blocked/.test(r.out), r.out);
		t("the capture exits 0", r.code === 0, r.out);
		t("the screenshot and the accessibility tree are written", existsSync(join(dir, "shots/home-before-390.png")) && /button "Save"/.test(existsSync(join(dir, "shots/home-before-390.aria.yml")) ? readFileSync(join(dir, "shots/home-before-390.aria.yml"), "utf8") : ""), r.out);
		t("the write never reached the server", !hits.some((h) => h.startsWith("POST /rpc/items/update")), hits.join(", "));
		t("the listed read and the GET did reach it", hits.includes("POST /rpc/items/list") && hits.includes("GET /api/ping"), hits.join(", "));
		const log = existsSync(join(dir, "shots/guard.log")) ? readFileSync(join(dir, "shots/guard.log"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
		t("guard.log records the write as aborted, with its body", log.some((l) => l.action === "abort" && /items\/update/.test(l.url) && l.body === '{"id":1,"count":2}'), JSON.stringify(log));
		// Nothing once wrote request bodies, so request-body equality could not be shown with these tools.
		const bodies = existsSync(join(dir, "evidence/bodies.before.json")) ? JSON.parse(readFileSync(join(dir, "evidence/bodies.before.json"), "utf8")) : {};
		t("--run writes the blocked write's body in the shape bodies-check reads", bodies.run === "RUN-T" && bodies.rows?.some((x) => x.proc === "items/update" && x.body === '{"id":1,"count":2}' && x.url.startsWith(base) && !Number.isNaN(Date.parse(x.capturedAt))), JSON.stringify(bodies));
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "nb"), "--routes", "/", "--widths", "390", "--no-backend");
		t("--no-backend still blocks the write and warns about it", r.code === 0 && /WARN\tthe app sent \d+ write/.test(r.out) && !hits.some((h) => h.startsWith("POST /rpc/items/update")), r.out);
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "blank"), "--routes", "/blank", "--widths", "16", "--height", "16", "--no-backend");
		t("a blank render is not kept as a capture", r.code === 1 && /blank render/.test(r.out) && !existsSync(join(dir, "blank/blank-before-16.png")), r.out);
		// A capture short of its plan once exited 0, so a missing state looked like a full baseline.
		writeFileSync(join(dir, "surfaces.tsv"), "surface\troute\tstates\nhome\t/\topen\n");
		r = await run("--base", base, "--kind", "before", "--out", join(dir, "short"), "--surfaces", join(dir, "surfaces.tsv"), "--widths", "390", "--no-backend");
		t("a capture with a planned state missing exits 1 and names it", r.code === 1 && /1 of 2 planned/.test(r.out) && /not captured\thome\.open/.test(r.out), r.out);
	} finally {
		server.close();
		rmSync(dir, { recursive: true, force: true });
	}
	console.log(fails ? `${fails} failed` : "all as expected");
	return fails ? 1 : 0;
}

await main(process.argv.slice(2));
