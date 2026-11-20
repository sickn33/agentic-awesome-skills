#!/usr/bin/env node
// capture-guard.mjs: deny-by-default network guard for any script that drives a browser against a live app.
// Node 18+, no dependencies. Works as a module (installGuard, decide, classifyName) and as a CLI.
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const HELP = `capture-guard.mjs: deny-by-default network guard for browser capture scripts

Usage
  node capture-guard.mjs names <procedure>... [--procedure-style rpc-post|rest] [--read-procedures a,b] [--read-verbs ...]
      Prints read or deny for each procedure name. Run it on the app's real procedure list before a capture.
  node capture-guard.mjs decide --method POST --url <url> [--body <text>] [--fixtures <json>] [options]
      Prints the decision as JSON: {action: fulfill|continue|abort, reason}.
  node capture-guard.mjs prove --writes <file> [options]
      The dry run before any run that can reach a backend. Each line of the file is "METHOD URL" for a write the
      app really sends, copied from its network log in the shape it has there, or "METHOD URL BODY" when the
      endpoint is GraphQL, with the request body as one line of JSON. Exits 1 if any one would continue.
      Pass the same options the capture uses. Then fire the same writes from the page and read guard.log.
  node capture-guard.mjs --self-test
  node capture-guard.mjs --help

Options (CLI and the opts object of decide and installGuard)
  --procedure-style <s>   rpc-post (default) or rest. Many RPC styles send reads as POST, so
                          "abort every non-GET" blocks the app. rest allows GET/HEAD only.
  --app-origin <url>      repeatable. Origins that serve the app and its assets. Default: any local host.
  --allow-host <host>     repeatable. A non-local host that may be reached (almost never right).
  --read-procedures <a,b> exact procedure names (items/list) that continue. By default only these do.
                          For GraphQL these are operation names (ListItems), never the endpoint itself.
  --graphql <path>        repeatable. A path that serves GraphQL. Any path whose last segment is graphql or gql
                          already counts. Its bodies are read: see rule 5.
  --read-verbs <a,b>      opt in to prefix matching: a POST whose name starts with one of these verbs also
                          continues. "default" means ${"get,list,me,find,search,read,check,preview,count"}. A name like
                          getOrCreate can write, so prefer exact names for any run that reaches a real backend.
  --fixtures <json>       {"<procedure or last segment>": {"status":200,"body":{...}}}. Matched calls are
                          fulfilled in the browser and never reach the backend, whatever the method.
  --log <file>            JSON lines, one per decision (installGuard writes it as guard.log). A request that is
                          not GET, HEAD or OPTIONS carries its body, so capture.mjs can export request bodies.
  hold                    installGuard only: procedure names to leave unanswered, to capture a pending state.
                          releaseAll() aborts them before the page closes.

capture.mjs installs this guard on every browser context before the first navigation. A script of your own
does the same: await installGuard(context, opts).ready, then navigate. Create the context with
serviceWorkers: "block", because a service worker's requests go around page and context routes. A WebSocket
is never routed, so an app that writes over one is not guarded.

Rules
  1. A host that is not local is aborted, unless --allow-host names it.
  2. A fixture match is fulfilled. A GraphQL operation matches a fixture by its operation name.
  3. GET and HEAD to the app origin continue (documents, assets, GET reads). A GET to a GraphQL path whose
     query parameter holds a mutation or subscription is aborted.
  4. In rpc-post style a POST continues only when --read-procedures lists it. With --read-verbs, it also
     continues when the last path segment, split into tokens on / . - _ and camelCase boundaries, starts
     with a read verb and holds no write token. Anything else is aborted, and the reason names the two
     ways out: add a fixture or list the procedure in --read-procedures.
  5. A POST to a GraphQL path is judged by its body, never by its path. Every operation in it (a batch is a
     JSON array) must be a query whose operation name passes rule 4. A mutation or subscription is aborted
     even when its name is listed. A persisted query with no query text continues only when its name is
     listed exactly. A body that is not JSON is aborted.
  6. OPTIONS to a local host continues. It is the CORS preflight a browser sends before a cross-origin read,
     it carries no body, and the request it precedes is judged on its own. Set no fixture on it.
  7. PUT, PATCH, DELETE and every other method are aborted.
  8. A write is never continued. Held routes are aborted by releaseAll() before the page closes.
  A GET that writes (a logout or unsubscribe link) passes rule 3. List it in the prove file, which then fails,
  and answer it with a fixture.`;

export const PREFIX_READ_VERBS = ["get", "list", "me", "find", "search", "read", "check", "preview", "count"];
export const WRITE_TOKENS = ["create", "update", "delete", "remove", "set", "modify", "add", "send", "submit", "upload", "invite", "approve", "reject", "cancel", "save", "write", "publish", "revoke", "archive", "restore", "grant", "execute", "mutate", "patch", "put", "post", "import", "reset", "confirm", "accept", "decline", "assign", "move", "merge", "enable", "disable", "toggle", "sync", "start", "stop", "trigger"];
const ASSET_EXT = /\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|json|html|txt|wasm)$/i;

export function tokens(name) {
	return String(name)
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(/[\s/._\-]+/)
		.filter(Boolean)
		.map((t) => t.toLowerCase());
}

export function lastSegment(procOrPath) {
	const parts = String(procOrPath).split("/").filter(Boolean);
	return parts[parts.length - 1] || "";
}

// Judges one procedure name. Exact names only, unless readVerbs opts in to prefix matching: then the first
// token must be a read verb and no later token may be a write token.
export function classifyName(name, opts = {}) {
	const verbs = (opts.readVerbs || []).filter(Boolean);
	const exact = opts.readProcedures || [];
	if (exact.includes(name) || exact.includes(lastSegment(name))) return { read: true, why: "listed in readProcedures" };
	if (!verbs.length) return { read: false, why: "not listed in readProcedures" };
	const t = tokens(lastSegment(name));
	if (!t.length) return { read: false, why: "empty name" };
	if (!verbs.includes(t[0])) return { read: false, why: `first token "${t[0]}" is not a read verb` };
	const w = t.slice(1).find((x) => WRITE_TOKENS.includes(x));
	if (w) return { read: false, why: `read verb "${t[0]}" followed by write token "${w}"` };
	return { read: true, why: `read verb "${t[0]}"` };
}

export function isLocalHost(host) {
	const h = String(host).replace(/^\[|\]$/g, "").toLowerCase();
	return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

export function procedureOf(url) {
	let u;
	try { u = new URL(url); } catch { return ""; }
	return u.pathname.split("/").filter(Boolean).slice(-2).join("/");
}

export function isGraphqlPath(url, opts = {}) {
	let path;
	try { path = new URL(url).pathname; } catch { return false; }
	if ((opts.graphqlPaths || []).some((p) => path === p || path.endsWith(p))) return true;
	return /^(graphql|gql)$/i.test(lastSegment(path));
}

// The operations a GraphQL document defines, as [{type, name}], read at the top level only. Strings, block
// strings and comments are skipped, and braces inside variable definitions do not open a selection set.
export function graphqlOps(text) {
	const ops = [];
	let depth = 0, parens = 0, pending = null, i = 0;
	const src = String(text);
	while (i < src.length) {
		const c = src[i];
		if (c === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }
		if (c === '"') {
			if (src.startsWith('"""', i)) { const e = src.indexOf('"""', i + 3); i = e < 0 ? src.length : e + 3; continue; }
			i++;
			while (i < src.length && src[i] !== '"') i += src[i] === "\\" ? 2 : 1;
			i++;
			continue;
		}
		if (c === "(") { parens++; i++; continue; }
		if (c === ")") { parens--; i++; continue; }
		if (c === "{" && parens === 0) {
			if (depth === 0) { ops.push(pending || { type: "query", name: null }); pending = null; }
			depth++; i++; continue;
		}
		if (c === "}" && parens === 0) { depth--; i++; continue; }
		if (depth === 0 && parens === 0 && /[_A-Za-z]/.test(c)) {
			let j = i;
			while (j < src.length && /\w/.test(src[j])) j++;
			const word = src.slice(i, j);
			if (!pending && ["query", "mutation", "subscription", "fragment"].includes(word)) pending = { type: word, name: null, named: false };
			else if (pending && !pending.named) { pending.name = word; pending.named = true; }
			i = j;
			continue;
		}
		i++;
	}
	return ops.filter((o) => o.type !== "fragment").map(({ type, name }) => ({ type, name }));
}

// Judges one GraphQL request ({query, operationName}) for rules 4 and 5. {read, name, why}.
export function judgeGraphql(one, opts = {}) {
	if (!one || typeof one !== "object") return { read: false, name: "", why: "a GraphQL body that is not an object" };
	const exact = opts.readProcedures || [];
	const named = typeof one.operationName === "string" && one.operationName ? one.operationName : null;
	if (typeof one.query !== "string" || !one.query.trim()) {
		if (named && exact.includes(named)) return { read: true, name: named, why: "persisted query listed by name in readProcedures" };
		return { read: false, name: named || "", why: "a persisted query with no query text continues only when its name is listed exactly" };
	}
	const ops = graphqlOps(one.query);
	const op = named ? ops.find((o) => o.name === named) : ops.length === 1 ? ops[0] : null;
	if (!op) return { read: false, name: named || "", why: ops.length ? "several operations and no operationName picks one" : "no operation in the query" };
	const name = named || op.name || "";
	if (op.type !== "query") return { read: false, name, why: `GraphQL ${op.type} ${name || "(anonymous)"}` };
	if (!name) return { read: false, name, why: "an anonymous query has no name to list" };
	const c = classifyName(name, opts);
	return { read: c.read, name, why: `query ${name}: ${c.why}` };
}

// The name a GraphQL request is logged and grouped under: graphql/<operation names>, so bodies compare per operation.
export function graphqlProc(req) {
	let list = [];
	try {
		if (String(req.method).toUpperCase() === "GET") list = [{ operationName: new URL(req.url).searchParams.get("operationName"), query: new URL(req.url).searchParams.get("query") }];
		else { const b = JSON.parse(req.postData ?? ""); list = Array.isArray(b) ? b : [b]; }
	} catch { return procedureOf(req.url); }
	const names = list.map((one) => one?.operationName || (typeof one?.query === "string" ? graphqlOps(one.query)[0]?.name : null) || "anonymous");
	return `graphql/${names.join(",")}`;
}

function findFixture(fixtures, url) {
	if (!fixtures) return null;
	let path;
	try { path = new URL(url).pathname; } catch { return null; }
	const segs = path.split("/").filter(Boolean);
	const keys = [segs.slice(-2).join("/"), segs[segs.length - 1], path];
	for (const k of keys) if (k && Object.prototype.hasOwnProperty.call(fixtures, k)) return { key: k, fx: fixtures[k] };
	return null;
}

// Pure. {method, url, postData} in, {action, reason, response?} out.
export function decide(req, opts = {}) {
	const style = opts.procedureStyle || "rpc-post";
	if (!["rpc-post", "rest"].includes(style)) throw new Error(`procedureStyle must be rpc-post or rest, got ${style}`);
	const method = String(req.method || "GET").toUpperCase();
	let u;
	try { u = new URL(req.url); } catch { return { action: "abort", reason: "unparseable url" }; }
	if (["data:", "blob:", "about:"].includes(u.protocol)) return { action: "continue", reason: `${u.protocol} is not network` };
	const allowed = (opts.allowHosts || []).map((h) => h.toLowerCase());
	if (!isLocalHost(u.hostname) && !allowed.includes(u.hostname.toLowerCase()))
		return { action: "abort", reason: `non-local host ${u.hostname}` };
	if (opts.appOrigins?.length && !opts.appOrigins.includes(u.origin) && !allowed.includes(u.hostname.toLowerCase()))
		return { action: "abort", reason: `origin ${u.origin} is not an app origin` };
	const fulfill = (key, fx) => ({ action: "fulfill", reason: `fixture ${key}`, response: { status: fx.status ?? 200, contentType: fx.contentType || "application/json", body: typeof fx.body === "string" ? fx.body : JSON.stringify(fx.body ?? null) } });
	if (method === "OPTIONS") return { action: "continue", reason: "CORS preflight to a local host (rule 6)" };
	const gql = isGraphqlPath(req.url, opts);
	const hit = findFixture(opts.fixtures, req.url);
	if (hit) return fulfill(hit.key, hit.fx);
	if (gql && (method === "GET" || method === "POST")) {
		let list;
		if (method === "GET") {
			const q = u.searchParams.get("query");
			if (!q) return { action: "continue", reason: "GET to a GraphQL path with no query" };
			list = [{ query: q, operationName: u.searchParams.get("operationName") || undefined }];
		} else {
			try { const b = JSON.parse(req.postData ?? ""); list = Array.isArray(b) ? b : [b]; } catch { return { action: "abort", reason: "a GraphQL POST whose body is not JSON" }; }
			if (!list.length) return { action: "abort", reason: "an empty GraphQL batch" };
		}
		const judged = list.map((one) => judgeGraphql(one, opts));
		const fx = opts.fixtures || {};
		if (judged.length === 1 && judged[0].name && Object.prototype.hasOwnProperty.call(fx, judged[0].name)) return fulfill(judged[0].name, fx[judged[0].name]);
		const bad = judged.find((j) => !j.read);
		if (method === "GET" && (!bad || !/mutation|subscription/.test(bad.why))) return { action: "continue", reason: "GET to a GraphQL path with a query" };
		if (bad) return { action: "abort", reason: `deny ${bad.why}. Fixture it by operation name or list the query in readProcedures` };
		return { action: "continue", reason: `read ${judged.map((j) => j.why).join("; ")}` };
	}
	if (method === "GET" || method === "HEAD") return { action: "continue", reason: "GET to a local host" };
	if (method === "POST") {
		const proc = procedureOf(req.url);
		const exact = opts.readProcedures || [];
		if (style === "rest" && !(exact.includes(proc) || exact.includes(lastSegment(proc))))
			return { action: "abort", reason: `POST ${proc} in rest style; fixture it or list it in readProcedures` };
		if (ASSET_EXT.test(u.pathname)) return { action: "abort", reason: "POST to an asset path" };
		const c = classifyName(proc, opts);
		if (c.read) return { action: "continue", reason: `read ${proc}: ${c.why}` };
		return { action: "abort", reason: `deny ${proc}: ${c.why}. Fixture it or list it in readProcedures if it is a read` };
	}
	return { action: "abort", reason: `${method} is never continued` };
}

// target: a Playwright Page or BrowserContext, or anything with route(pattern, handler).
// The handler's route object needs request() with method(), url(), postData(), and fulfill, continue, abort.
// Pure. Lines of "METHOD URL" in, the ones a guard with these options would let through out.
// A third field is the request body, for an endpoint judged by its body (GraphQL).
export function prove(lines, opts = {}) {
	return lines.map((l) => /^\s*(\S+)\s+(\S+)(?:\s+(.+))?$/.exec(l)).filter(Boolean)
		.map(([, method, url, body]) => ({ method, url, ...decide({ method, url, postData: body }, opts) })).filter((d) => d.action === "continue");
}

export function installGuard(target, opts = {}) {
	const log = [];
	const held = new Set();
	const holdNames = opts.hold || [];
	const record = (entry, body) => {
		const line = { t: new Date().toISOString(), ...entry };
		if (!["GET", "HEAD", "OPTIONS"].includes(String(entry.method).toUpperCase())) line.body = body ?? "";
		log.push(line);
		if (opts.logFile) appendFileSync(opts.logFile, JSON.stringify(line) + "\n");
	};
	const handler = async (route) => {
		const r = route.request();
		const req = { method: r.method(), url: r.url(), postData: r.postData ? r.postData() : undefined };
		const d = decide(req, opts);
		const proc = isGraphqlPath(req.url, opts) ? graphqlProc(req) : procedureOf(req.url);
		const wantsHold = holdNames.some((h) => h === proc || h === lastSegment(proc));
		if (wantsHold) {
			held.add(route);
			return record({ method: req.method, url: req.url, proc, action: "hold", reason: `held (${d.reason}); aborted by releaseAll` }, req.postData);
		}
		record({ method: req.method, url: req.url, proc, action: d.action, reason: d.reason }, req.postData);
		try {
			if (d.action === "fulfill") await route.fulfill(d.response);
			else if (d.action === "continue") await route.continue();
			else await route.abort();
		} catch (e) {
			record({ method: req.method, url: req.url, proc, action: "error", reason: String(e.message || e) }, req.postData);
		}
	};
	const ready = target.route(opts.pattern || "**/*", handler);
	return {
		ready,
		log,
		heldCount: () => held.size,
		// Aborts every held route. Call it before page.close(); a route released after close can still reach the backend.
		async releaseAll() {
			const routes = [...held];
			held.clear();
			for (const route of routes) {
				const r = route.request();
				record({ method: r.method(), url: r.url(), proc: procedureOf(r.url()), action: "abort", reason: "held route aborted at release" });
				try { await route.abort(); } catch { /* page already gone */ }
			}
			return routes.length;
		},
		async closePage(page) {
			await this.releaseAll();
			await page.close();
		},
	};
}

// ---- CLI ----
function parse(argv) {
	const o = { _: [], appOrigins: [], allowHosts: [], graphqlPaths: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => argv[++i];
		if (a === "--procedure-style") o.procedureStyle = next();
		else if (a === "--app-origin") o.appOrigins.push(next());
		else if (a === "--allow-host") o.allowHosts.push(next());
		else if (a === "--graphql") o.graphqlPaths.push(next());
		else if (a === "--read-verbs") { const v = next(); o.readVerbs = v === "default" ? PREFIX_READ_VERBS : v.split(","); }
		else if (a === "--read-procedures") o.readProcedures = next().split(",");
		else if (a === "--fixtures") o.fixtures = JSON.parse(readFileSync(next(), "utf8"));
		else if (a === "--method") o.method = next();
		else if (a === "--url") o.url = next();
		else if (a === "--body") o.body = next();
		else if (a === "--log") o.logFile = next();
		else if (a === "--writes") o.writes = next();
		else if (a === "--help" || a === "-h") o.help = true;
		else if (a === "--self-test") o.selfTest = true;
		else if (a.startsWith("-")) { console.error(`capture-guard: unknown flag ${a}. See --help`); process.exit(2); }
		else o._.push(a);
	}
	return o;
}

function fakePage() {
	const calls = [];
	let handler;
	const page = {
		calls,
		async route(_p, h) { handler = h; },
		async close() { calls.push("page.close"); },
		async fire(method, url, postData) {
			const route = {
				request: () => ({ method: () => method, url: () => url, postData: () => postData }),
				fulfill: async (r) => calls.push({ op: "fulfill", url, status: r.status }),
				continue: async () => calls.push({ op: "continue", url, method }),
				abort: async () => calls.push({ op: "abort", url, method }),
			};
			await handler(route);
			return route;
		},
	};
	return page;
}

async function selfTest() {
	const dir = mkdtempSync(join(tmpdir(), "cg-"));
	let failed = 0;
	const t = (name, ok, detail = "") => { if (!ok) { failed++; console.error(`FAIL ${name} ${detail}`); } else console.log(`ok   ${name}`); };
	try {
		const base = "http://localhost:5173";
		const rpc = (p) => `${base}/rpc/${p}`;
		const prefix = { readVerbs: PREFIX_READ_VERBS };
		t("default: a read-looking name is denied until listed", !classifyName("items/getItem").read && classifyName("items/getItem", { readProcedures: ["items/getItem"] }).read);
		t("default: users/me aborted until listed", decide({ method: "POST", url: rpc("users/me") }, {}).action === "abort");
		t("default: a listed last segment continues", decide({ method: "POST", url: rpc("users/me") }, { readProcedures: ["me"] }).action === "continue");
		// A substring match once judged a name by a word inside it, so a read was blocked and a state never captured.
		t("tokens split camelCase", JSON.stringify(tokens("itemUrl")) === '["item","url"]' && JSON.stringify(tokens("getItem")) === '["get","item"]');
		t("prefix: getItem is a read", classifyName("items/getItem", prefix).read);
		t("prefix: itemUrl has no read verb first", !classifyName("files/itemUrl", prefix).read);
		const d1 = decide({ method: "POST", url: rpc("files/get") }, {});
		t("files/get aborted with a way out named", d1.action === "abort" && /readProcedures/.test(d1.reason), JSON.stringify(d1));
		const d2 = decide({ method: "POST", url: rpc("files/get") }, { readProcedures: ["files/get"] });
		t("files/get continues once listed", d2.action === "continue", JSON.stringify(d2));
		const d2b = decide({ method: "POST", url: rpc("files/get") }, { fixtures: { "files/get": { body: { url: "x" } } } });
		t("files/get fulfilled from a fixture", d2b.action === "fulfill" && d2b.response.status === 200);
		// A leaked update once changed real data.
		const d3 = decide({ method: "POST", url: rpc("items/update"), postData: "{}" }, prefix);
		t("prefix: items/update aborted", d3.action === "abort", JSON.stringify(d3));
		t("prefix: getOrCreate is not a read", !classifyName("items/getOrCreate", prefix).read);
		t("prefix: listUpdates is a read (plural is not a write token)", classifyName("feed/listUpdates", prefix).read);
		t("prefix: items/list is a read", decide({ method: "POST", url: rpc("items/list") }, prefix).action === "continue");
		t("prefix: users/me is a read", decide({ method: "POST", url: rpc("users/me") }, prefix).action === "continue");
		t("rest style aborts POST reads", decide({ method: "POST", url: rpc("items/list") }, { procedureStyle: "rest" }).action === "abort");
		t("PUT aborted", decide({ method: "PUT", url: `${base}/api/x` }, {}).action === "abort");
		t("GET to app continues", decide({ method: "GET", url: `${base}/assets/app.js` }, {}).action === "continue");
		t("non-localhost aborted", decide({ method: "GET", url: "https://api.example.com/v1/x" }, {}).action === "abort");
		t("lookalike host aborted", decide({ method: "GET", url: "http://localhost.evil.com/x" }, {}).action === "abort");
		t("a non-local host continues only when --allow-host names it", decide({ method: "GET", url: "https://api.example.com/v1/x" }, { allowHosts: ["api.example.com"] }).action === "continue");
		t("OPTIONS to a local host continues as a preflight", decide({ method: "OPTIONS", url: `${base}/api/x` }, {}).action === "continue");
		t("OPTIONS to a non-local host is aborted", decide({ method: "OPTIONS", url: "https://api.example.com/x" }, {}).action === "abort");
		const writes = ["POST " + rpc("items/update"), "PUT " + base + "/api/x", "POST " + rpc("items/list")];
		t("prove names a write the prefix verbs let through", prove(writes, prefix).length === 1);
		t("prove is clean by default", prove(writes, { readProcedures: ["users/me"] }).length === 0);
		t("bad procedureStyle throws", (() => { try { decide({ method: "GET", url: base }, { procedureStyle: "x" }); return false; } catch { return true; } })());

		// GraphQL. Listing the endpoint once let every mutation through, because the body was never read.
		const gq = `${base}/graphql`;
		const body = (query, operationName) => JSON.stringify({ query, operationName, variables: {} });
		const mutation = body("mutation UpdateItem($id: ID!) { updateItem(id: $id) { id } }", "UpdateItem");
		const query = body("query ListItems { items { id } }", "ListItems");
		t("graphql: listing the endpoint does not open a mutation", decide({ method: "POST", url: gq, postData: mutation }, { readProcedures: ["graphql"] }).action === "abort");
		t("graphql: a listed mutation name is still aborted", decide({ method: "POST", url: gq, postData: mutation }, { readProcedures: ["UpdateItem"] }).action === "abort");
		t("graphql: a listed query continues", decide({ method: "POST", url: gq, postData: query }, { readProcedures: ["ListItems"] }).action === "continue");
		t("graphql: an unlisted query is aborted", decide({ method: "POST", url: gq, postData: query }, {}).action === "abort");
		t("graphql: a query passes the read verbs by its name", decide({ method: "POST", url: gq, postData: query }, prefix).action === "continue");
		t("graphql: a shorthand query has no name to list", decide({ method: "POST", url: gq, postData: body("{ items { id } }") }, { readProcedures: ["graphql"] }).action === "abort");
		t("graphql: a batch with one mutation is aborted", decide({ method: "POST", url: gq, postData: `[${query},${mutation}]` }, { readProcedures: ["ListItems"] }).action === "abort");
		t("graphql: braces in strings and variable defaults are not selection sets", JSON.stringify(graphqlOps('query Q($f: In = {a: "}"}) { a } # mutation X { b }\nfragment F on T { c }')) === '[{"type":"query","name":"Q"}]');
		t("graphql: operationName picks the operation", decide({ method: "POST", url: gq, postData: body("query ListItems { a } mutation UpdateItem { b }", "UpdateItem") }, { readProcedures: ["ListItems", "UpdateItem"] }).action === "abort");
		t("graphql: a persisted query continues only when listed by name", decide({ method: "POST", url: gq, postData: JSON.stringify({ operationName: "ListItems", extensions: {} }) }, { readProcedures: ["ListItems"] }).action === "continue" && decide({ method: "POST", url: gq, postData: JSON.stringify({ operationName: "UpdateItem" }) }, prefix).action === "abort");
		t("graphql: a body that is not JSON is aborted", decide({ method: "POST", url: gq, postData: "x" }, { readProcedures: ["graphql"] }).action === "abort");
		t("graphql: a fixture answers an operation by name", decide({ method: "POST", url: gq, postData: mutation }, { fixtures: { UpdateItem: { body: {} } } }).action === "fulfill");
		t("graphql: a GET carrying a mutation is aborted", decide({ method: "GET", url: `${gq}?query=${encodeURIComponent("mutation { deleteItem(id: 1) }")}` }, {}).action === "abort");
		t("graphql: --graphql marks another path", isGraphqlPath(`${base}/api/data`, { graphqlPaths: ["/api/data"] }) && decide({ method: "POST", url: `${base}/api/data`, postData: mutation }, { readProcedures: ["data"], graphqlPaths: ["/api/data"] }).action === "abort" && decide({ method: "POST", url: `${base}/api/data`, postData: mutation }, { readProcedures: ["data"] }).action === "continue");
		t("graphql: prove reads a body on the line", prove([`POST ${gq} ${mutation}`], { readProcedures: ["graphql"] }).length === 0 && prove([`POST ${gq} ${query}`], { readProcedures: ["ListItems"] }).length === 1);

		// installGuard against a fake page. A held write is aborted at close, not released.
		const logFile = join(dir, "guard.log");
		const page = fakePage();
		const guard = installGuard(page, { logFile, hold: ["items/create", "items/list"], fixtures: { "users/me": { body: { id: "u1" } } } });
		await guard.ready;
		await page.fire("GET", `${base}/`);
		await page.fire("POST", rpc("users/me"));
		await page.fire("POST", rpc("items/create"), "{}");
		await page.fire("POST", rpc("items/list"));
		await page.fire("POST", rpc("items/update"), '{"id":1,"count":2}');
		await page.fire("GET", "https://example.com/pixel.gif");
		t("two routes held", guard.heldCount() === 2, String(guard.heldCount()));
		t("nothing continued for the held write", !page.calls.some((c) => c.op === "continue" && /items\/create/.test(c.url)));
		await guard.closePage(page);
		const ops = page.calls.map((c) => (typeof c === "string" ? c : `${c.op}:${c.url.split("/").slice(-2).join("/")}`));
		const closeAt = ops.indexOf("page.close");
		t("held write aborted before page close", ops.indexOf("abort:items/create") > -1 && ops.indexOf("abort:items/create") < closeAt, ops.join(" | "));
		t("held read aborted too, never released", ops.indexOf("abort:items/list") > -1 && !ops.includes("continue:items/list"));
		t("items/update never continued", !ops.includes("continue:items/update") && ops.includes("abort:items/update"));
		t("non-local aborted in the page", ops.some((o) => o.startsWith("abort:") && o.includes("pixel.gif")));
		t("users/me fulfilled", ops.includes("fulfill:users/me"));
		const lines = readFileSync(logFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
		t("guard.log has one JSON line per decision", lines.length >= 8 && lines.every((l) => l.action && l.url && l.t), String(lines.length));
		t("no continue of any write in the log", !lines.some((l) => l.action === "continue" && /items\/(update|create)/.test(l.url)));
		// Request bodies were once dropped from the log, so no tool could compare them before and after.
		t("guard.log keeps the body of a blocked write", lines.some((l) => /items\/update/.test(l.url) && l.action === "abort" && l.body === '{"id":1,"count":2}'), JSON.stringify(lines));
		t("a GraphQL request is logged under its operation name", graphqlProc({ method: "POST", url: `${base}/graphql`, postData: '{"query":"mutation UpdateItem { a }"}' }) === "graphql/UpdateItem");
		t("guard.log keeps no body on a GET", lines.filter((l) => l.method === "GET").every((l) => !("body" in l)));
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
	if (failed) { console.error(`${failed} self-test failure(s)`); process.exit(1); }
	console.log("all as expected");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const o = parse(process.argv.slice(2));
	if (o.help) console.log(HELP);
	else if (o.selfTest) await selfTest();
	else if (o._[0] === "names") {
		for (const n of o._.slice(1)) {
			const c = classifyName(n, o);
			console.log(`${c.read ? "read" : "deny"}\t${n}\t${c.why}`);
		}
	} else if (o._[0] === "decide") {
		if (!o.url) { console.error("decide needs --url"); process.exit(2); }
		console.log(JSON.stringify(decide({ method: o.method || "GET", url: o.url, postData: o.body }, o)));
	} else if (o._[0] === "prove") {
		if (!o.writes) { console.error("prove needs --writes <file>"); process.exit(2); }
		const leaks = prove(readFileSync(o.writes, "utf8").split("\n"), o);
		for (const l of leaks) console.log(`LEAK\t${l.method} ${l.url}\t${l.reason}`);
		console.log(leaks.length ? `${leaks.length} writes would reach the backend` : "every write is blocked");
		process.exitCode = leaks.length ? 1 : 0;
	} else { console.error("usage: capture-guard.mjs names|decide|prove|--self-test|--help"); process.exit(2); }
}
