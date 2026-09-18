[中文](README.md) · **English**

# src-hunter

A Claude Code skill for SRC / bug-bounty / pentest workflows. Loads automatically when you mention things like *bug bounty*, *hackerone*, *waf bypass*, or *任意账号*, and walks Claude through a five-phase hunt: intake → recon → enum → hunt → report.

It bundles a knowledge base built from public sources: nineteen attack-class playbooks, three hundred-odd structured payloads with WAF/EDR bypass variants, the full HackerOne hacktivity feed (High and Critical, disclosed) at the time of build, and statistical residue from the old WooYun corpus.

## Install

Marketplace:

```
/plugin marketplace add MyuriKanao/src-hunter-skill
/plugin install src-hunter@src-hunter
```

Plain git:

```
git clone https://github.com/MyuriKanao/src-hunter-skill.git ~/.claude/skills/src-hunter
```

## What's in here

```
references/
  methodology/    five-phase workflow, attack-priority, bypass toolkit, evidence rules
  playbooks/      one file per attack class — each ends with real H1 cases and a payload library
  industry/       banking/finance and telecom/ISP verticals
  dictionaries/   default credentials and component fingerprints (Chinese stack)
  templates/      submission template (CVSS 4.0)
  h1-reports/     2887 disclosed reports, raw + grouped by weakness
  payloader/      305 structured payloads, 263 WAF/EDR bypass steps, 114 tool cheats
```

The playbooks are the entry point. They're written from a black-box hunter's perspective — assume you only have a URL — and each one carries the same shape: where to look, what to throw, what response shapes to watch for, how to escalate, and the legal lines.

## MCP integration

The skill wires in a local MCP server as a tool layer so Claude can drive browser automation, CDP debugging, network interception, JS hooks, AST deobfuscation, Frida memory verification, WASM reversing, source-map reconstruction, Android adb bridging, and SSL-pinning bypass directly during the hunt phase.

**Current pick**: [jshookmcp](https://github.com/vmoranv/jshookmcp) 0.3.0 (134 curated / 386 full / 36 domains). The full index and scenario→tool map lives in [`references/tools/mcp-jshook.md`](references/tools/mcp-jshook.md).

Seven high-affinity playbooks (`xss` / `rce` / `ssrf-cache-host` / `mobile` / `oauth-saml-jwt` / `api-rest` / `file-upload`) carry a `## 相关 MCP 工具` trailer block telling Claude which jshook tools to reach for and when.

## TODO

- Support more MCP tools
- Multi-agent execution workflow

## Triggers

The skill loads on any of these (and a few more spelled out in `SKILL.md`):

- bug bounty, hackerone, src 挖洞, 漏洞赏金, 众测
- waf bypass / 绕过 WAF
- "how do I test this endpoint / API / parameter"
- 任意账号 / 任意修改 / 任意删除, 密码重置 / 找回密码
- 默认凭据, Actuator, exposed admin, etc.

Or invoke explicitly: `/src-hunter <target>`.

## Playbook list

| Playbook | H1 cases bundled |
|---|---:|
| arbitrary-x-authz (IDOR / account takeover / privesc) | 465 |
| rce (deserialization / SSTI / XXE / framework) | 385 |
| xss | 335 |
| info-disclosure | 319 |
| oauth-saml-jwt | 240 |
| logic-flaws (CSRF, clickjacking, payment) | 234 |
| path-traversal / LFI / RFI | 163 |
| sqli | 147 |
| dos | 138 |
| ssrf-cache-host | 108 |
| unauth-access (default creds, Actuator, exposed services) | 46 |
| http-smuggling / CRLF | 38 |
| api-rest / WebSocket | 15 |
| file-upload | 8 |
| mobile (Android / iOS) | 8 |
| race-conditions | 5 |
| llm-prompt-injection | 1 |
| graphql | 1 |
| intranet-postexp (post-exploitation reference) | — |

## Sources

- HackerOne hacktivity feed — 2887 disclosed High/Critical reports, fetched directly. Public data.
- WooYun historical archive — 88,636 cases. Only parameter-frequency tables, case IDs, and bypass patterns are retained. The platform is defunct; data is unrecoverable elsewhere.
- Payloader — 305 structured payloads, 263 WAF/EDR bypass steps, 114 tool cheats from the open-source `3516634930/Payloader` repo.

This project re-organizes and translates these sources into a hunter-oriented skill. No proprietary data, no scraping of authenticated content.

## Rules of engagement

Each playbook spells out concrete limits. The most-commonly-stepped-on ones:

- **Sample size**: for SQLi, proving the database name / version is enough — don't dump rows. For IDOR / Mongo / ES exfil, 1–3 samples is the cap.
- **Self-account testing**: authz bypass, password reset, JWT forgery, redirect_uri abuse, blind XSS — all on two accounts you registered yourself. Never on a stranger's account, even if you can.
- **Read, don't write**: with RCE, only `id` / `whoami` / `uname -a`. With unauth Redis / Mongo, only `info` / `ping` / `db.version()`. With LFI, stop at `root:x:` — don't read `/etc/shadow`.
- **No real side effects**: no real SMS, no real charges, no real emails, no real refunds, no overwriting files, no editing global announcements / mail templates. Stop once the endpoint returns 200.
- **DoS / concurrency**: each repro ≤ 60 s, serial, 5 reps total. Race conditions: 50–100 concurrent, never 1000+. Rate-limit bugs: 5–10 hits to your own number, not 1000.
- **Don't keep loot**: webshells, heapdumps, backups, dumped source — local only, deleted once the report lands. Never push to GitHub or third-party storage.
- **Credentials, don't use**: leaked AWS / Stripe / DB creds get one validation call (`sts get-caller-identity`, banner grab) — never spend, send, or connect.
- **Redact PII in reports**: phone numbers, emails, usernames, tokens, cookies — keep first-2 + last-2, optionally a sha256 fingerprint to prove you had it.
- **OOB infrastructure**: don't hit public DNSLog services. Use the vendor-provided SSRF testing platform if they offer one, or self-host interactsh / your own DNSLog.
- **No capture, no finding**: every claim needs an HTTP capture, screenshot, or video. Don't submit "this should work."

The per-playbook rules are tighter (DoS is the most sensitive, file-upload bans webshells, file-read takes one sample). See the last section of each playbook.

## License

MIT. Data sources are public; this project's contribution is the organization, translation to a black-box perspective, and the merge.
