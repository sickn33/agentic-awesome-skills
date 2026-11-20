#!/usr/bin/env node
// bodies-check.mjs: accepts a before/after request-body pair only when one logged browser run produced both files.
// Node 18+, no dependencies.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HELP = `bodies-check.mjs log <run log> start|end <RUN_ID> [rc]     append one run-log line around a browser run
bodies-check.mjs <dir> --expect <procs> --before-ports a,b --after-ports c,d --log <run log> [--slack 5]

Reads <dir>/bodies.before.json and <dir>/bodies.after.json, each {"run": "<RUN_ID>", "rows": [{url, proc, body, capturedAt}]}.
Rejects (exit 2) unless all of these hold
  1. both files exist, are not byte-identical, and have a non-empty rows array of complete rows
  2. before rows are on the before ports and after rows on the after ports (any local host)
  3. both files name one RUN_ID, and the run log shows that id with a start and an end with rc 0
  4. every capturedAt lies inside the run window plus --slack seconds (default 5)
  5. every procedure in --expect (comma list) has rows in both files
     The expected list comes from the verifier brief, written from the diff's write lines before the run.
Exit 0 when valid and every procedure's bodies match between before and after. Exit 1 when valid and some
procedure's bodies differ, printed as "DIFF <proc> <before count> <after count>". land.mjs lands a DIFF only when
decisions.tsv (or its --intended file) holds an intended change row naming the surface and that procedure.

Making the two files: serve the base commit's build (a separate worktree) and the run branch's build at the same
time on different ports, then wrap both captures in one logged run:
  rc=0; node bodies-check.mjs log runs.log start RUN-7
  node capture.mjs --base http://localhost:5183 --kind before ... --run RUN-7 --bodies <dir>/bodies.before.json || rc=1
  node capture.mjs --base http://localhost:5173 --kind after ... --run RUN-7 --bodies <dir>/bodies.after.json || rc=1
  node bodies-check.mjs log runs.log end RUN-7 $rc
capture.mjs is in build-design-system's scripts. Drive the changed write in both captures with the same --states
step, so both runs send it.

Run log: tab separated, one line per event: <event>\\t<iso time>\\t<slot>\\t<RUN_ID>\\t<rc>
  where event is start or end and rc is only read on end. Wrap the browser run with the log subcommand: start before it, end with its exit code after it.
Residual risk that stays: a script can still write a pair inside a real run, and a fixture may not exercise the changed path.
Options: --self-test, --help`;

class Reject extends Error {}
const die = (m) => { throw new Reject(m); };

export function check(dir, o) {
	const pb = join(dir, "bodies.before.json");
	const pa = join(dir, "bodies.after.json");
	for (const p of [pb, pa]) if (!existsSync(p)) die(`missing ${p}`);
	if (readFileSync(pb).equals(readFileSync(pa))) die("before and after files are byte-identical");
	const load = (p, ports) => {
		let f;
		try { f = JSON.parse(readFileSync(p, "utf8")); } catch (e) { die(`${p}: not JSON (${e.message})`); }
		if (!f || typeof f !== "object" || !("run" in f) || !Array.isArray(f.rows)) die(`${p}: needs {"run", "rows"}`);
		if (!f.rows.length) die(`${p}: no rows`);
		const groups = new Map();
		const times = [];
		for (const r of f.rows) {
			for (const k of ["url", "proc", "body", "capturedAt"]) if (typeof r?.[k] !== "string") die(`${p}: row without ${k}`);
			let u;
			try { u = new URL(r.url); } catch { die(`${p}: bad url ${r.url}`); }
			if (!/^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(u.hostname)) die(`${p}: url ${r.url} is not on a local host`);
			if (!ports.includes(u.port)) die(`${p}: url ${r.url} is not on port ${ports.join("/")}`);
			const t = Date.parse(r.capturedAt);
			if (Number.isNaN(t)) die(`${p}: bad capturedAt ${r.capturedAt}`);
			times.push(t);
			if (!groups.has(r.proc)) groups.set(r.proc, new Set());
			groups.get(r.proc).add(createHash("sha256").update(r.body).digest("hex"));
		}
		return { run: f.run, groups, times };
	};
	const B = load(pb, o.beforePorts);
	const A = load(pa, o.afterPorts);
	if (B.run !== A.run) die(`runs differ: ${B.run} vs ${A.run}. One browser run must produce both files; merge nothing`);
	if (!o.log || !existsSync(o.log)) die(`no run log at ${o.log}`);
	let start = null;
	let end = null;
	for (const line of readFileSync(o.log, "utf8").split("\n")) {
		const c = line.split("\t");
		if (c.length >= 5 && c[3] === B.run) {
			if (c[0] === "start") start = Date.parse(c[1]);
			if (c[0] === "end" && c[4].trim() === "0") end = Date.parse(c[1]);
		}
	}
	if (start === null || end === null) die(`run ${B.run} has no start and end rc 0 in ${o.log}`);
	const slack = (o.slack ?? 5) * 1000;
	if ([...B.times, ...A.times].some((t) => t < start - slack || t > end + slack)) die(`capturedAt outside run ${B.run} window ${new Date(start).toISOString()}..${new Date(end).toISOString()}`);
	for (const p of o.expect) {
		if (!B.groups.has(p)) die(`expected procedure ${p} has no rows in bodies.before.json`);
		if (!A.groups.has(p)) die(`expected procedure ${p} has no rows in bodies.after.json`);
	}
	const lines = [];
	let differ = false;
	for (const k of [...new Set([...B.groups.keys(), ...A.groups.keys()])].sort()) {
		const b = B.groups.get(k);
		const a = A.groups.get(k);
		const same = b && a && b.size === a.size && [...b].every((h) => a.has(h));
		if (!same) differ = true;
		lines.push(`${same ? "same" : "DIFF"} ${k} ${b?.size ?? 0} ${a?.size ?? 0}`);
	}
	return { lines, differ };
}

function parse(argv) {
	const o = { _: [], expect: [], beforePorts: [], afterPorts: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		const next = () => argv[++i];
		if (a === "--expect") o.expect = next().split(",").filter(Boolean);
		else if (a === "--before-ports") o.beforePorts = next().split(",");
		else if (a === "--after-ports") o.afterPorts = next().split(",");
		else if (a === "--log") o.log = next();
		else if (a === "--slack") o.slack = Number(next());
		else if (a === "--help" || a === "-h") o.help = true;
		else if (a === "--self-test") o.selfTest = true;
		else if (a.startsWith("--")) { console.error(`bodies-check: unknown flag ${a}. See --help`); process.exit(2); }
		else o._.push(a);
	}
	return o;
}

function selfTest() {
	const root = mkdtempSync(join(tmpdir(), "bc-"));
	let failed = 0;
	const t0 = Date.parse("2026-01-01T10:00:00Z");
	const iso = (s) => new Date(t0 + s * 1000).toISOString();
	const row = (port, proc, body, s) => ({ url: `http://localhost:${port}/rpc/${proc}`, proc, body, capturedAt: iso(s) });
	const log = join(root, "runs.log");
	writeFileSync(log, [`start\t${iso(0)}\tslot1\tRUN-A\t`, `end\t${iso(60)}\tslot1\tRUN-A\t0`, `start\t${iso(100)}\tslot1\tRUN-B\t`, `end\t${iso(160)}\tslot1\tRUN-B\t0`, `start\t${iso(200)}\tslot1\tRUN-C\t`, `end\t${iso(210)}\tslot1\tRUN-C\t1`, ""].join("\n"));
	const opts = (extra = {}) => ({ beforePorts: ["5183", "5184"], afterPorts: ["5173", "5174"], log, expect: ["items/update"], ...extra });
	const mk = (name, before, after) => {
		const d = join(root, name);
		mkdirSync(d);
		if (before) writeFileSync(join(d, "bodies.before.json"), JSON.stringify(before));
		if (after) writeFileSync(join(d, "bodies.after.json"), JSON.stringify(after));
		return d;
	};
	const expectReject = (name, dir, o, re) => {
		try { check(dir, o); failed++; console.error(`FAIL ${name}: accepted`); } catch (e) {
			if (e instanceof Reject && re.test(e.message)) console.log(`ok   ${name}`);
			else { failed++; console.error(`FAIL ${name}: ${e.message}`); }
		}
	};
	const good = (run) => ({
		b: { run, rows: [row(5183, "items/update", '{"count":2}', 10), row(5184, "items/create", '{"a":1}', 12)] },
		a: { run, rows: [row(5173, "items/update", '{"count":2}', 11), row(5174, "items/create", '{"a":1}', 13)] },
	});
	const g = good("RUN-A");
	let r = check(mk("good", g.b, g.a), opts());
	if (!r.differ && r.lines.every((l) => l.startsWith("same"))) console.log("ok   valid pair passes"); else { failed++; console.error("FAIL valid pair"); }
	const dif = good("RUN-A");
	dif.a.rows[0].body = '{"count":3}';
	r = check(mk("diff", dif.b, dif.a), opts());
	if (r.differ && r.lines.some((l) => l.startsWith("DIFF items/update"))) console.log("ok   differing bodies reported as DIFF"); else { failed++; console.error("FAIL diff"); }
	// Two files merged from two different real runs: each run is valid alone, the pair is not.
	const m = { b: good("RUN-A").b, a: good("RUN-B").a };
	m.a.rows.forEach((x) => (x.capturedAt = iso(105)));
	expectReject("merged pair from two runs", mk("merged", m.b, m.a), opts(), /runs differ/);
	const inside = good("RUN-A"); inside.b.rows[0].capturedAt = iso(500);
	expectReject("capturedAt outside the run window", mk("late", inside.b, inside.a), opts(), /outside run/);
	const g2 = good("RUN-A"); g2.b.rows[0].capturedAt = iso(63);
	r = check(mk("slack", g2.b, g2.a), opts()); console.log("ok   inside slack accepted");
	expectReject("slack zero rejects the same row", mk("slack0", g2.b, g2.a), opts({ slack: 0 }), /outside run/);
	const bad = good("RUN-C");
	expectReject("run that ended rc 1", mk("rc1", bad.b, bad.a), opts(), /no start and end rc 0/);
	const unk = good("RUN-Z");
	expectReject("run id not in the log", mk("unk", unk.b, unk.a), opts(), /no start and end/);
	expectReject("empty rows", mk("empty", { run: "RUN-A", rows: [] }, g.a), opts(), /no rows/);
	const gi = good("RUN-A");
	expectReject("byte-identical files", mk("ident", gi.b, gi.b), opts(), /byte-identical/);
	const swapped = good("RUN-A");
	swapped.b.rows[0].url = "http://localhost:5173/rpc/items/update";
	expectReject("before row on an after port", mk("ports", swapped.b, swapped.a), opts(), /not on port/);
	const remote = good("RUN-A");
	remote.a.rows[0].url = "https://app.example.com:5173/rpc/items/update";
	expectReject("a row from a non-local host", mk("remote", remote.b, remote.a), opts(), /not on a local host/);
	const miss = good("RUN-A");
	miss.a.rows = miss.a.rows.filter((x) => x.proc !== "items/update");
	expectReject("expected procedure missing in after", mk("miss", miss.b, miss.a), opts(), /expected procedure items\/update has no rows in bodies.after/);
	expectReject("expected procedure never run in either file", mk("miss2", g.b, g.a), opts({ expect: ["items/delete"] }), /items\/delete/);
	expectReject("missing file", mk("nofile", g.b, null), opts(), /missing/);
	// The log subcommand writes lines this checker accepts.
	const lg = join(root, "made.log");
	const me = fileURLToPath(import.meta.url);
	spawnSync(process.execPath, [me, "log", lg, "start", "RUN-L"]);
	spawnSync(process.execPath, [me, "log", lg, "end", "RUN-L", "0"]);
	const now = Date.now();
	const lrow = (port, at) => ({ url: `http://localhost:${port}/rpc/items/update`, proc: "items/update", body: "{}", capturedAt: new Date(at).toISOString() });
	const lb = { run: "RUN-L", rows: [lrow(5183, now)] };
	const la = { run: "RUN-L", rows: [lrow(5173, now + 1)] };
	r = check(mk("logged", lb, la), opts({ log: lg }));
	if (!r.differ) console.log("ok   run log written by the log subcommand is accepted"); else { failed++; console.error("FAIL log subcommand"); }
	rmSync(root, { recursive: true, force: true });
	if (failed) { console.error(`${failed} self-test failure(s)`); process.exit(1); }
	console.log("all as expected");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const o = parse(process.argv.slice(2));
	if (o.help) console.log(HELP);
	else if (o.selfTest) selfTest();
	else if (o._[0] === "log") {
		const [, file, event, id, rc = ""] = o._;
		if (!file || !["start", "end"].includes(event) || !id) { console.error("usage: bodies-check.mjs log <run log> start|end <RUN_ID> [rc]"); process.exit(2); }
		appendFileSync(file, `${event}\t${new Date().toISOString()}\tmain\t${id}\t${event === "end" ? rc : ""}\n`);
	} else {
		if (!o._[0] || !o.beforePorts.length || !o.afterPorts.length || !o.log) { console.error("needs <dir> --before-ports --after-ports --log (and --expect). See --help"); process.exit(2); }
		if (!o.expect.length) { console.error("--expect is required: the verifier brief lists the procedures the diff's write lines call"); process.exit(2); }
		try {
			const { lines, differ } = check(o._[0], o);
			console.log(lines.join("\n"));
			process.exit(differ ? 1 : 0);
		} catch (e) {
			if (e instanceof Reject) { console.log(`REJECT ${e.message}`); process.exit(2); }
			throw e;
		}
	}
}
