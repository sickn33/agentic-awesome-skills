---
name: mcp-server
description: 'Before adding a remote MCP server or tool to a web product, adding OAuth to it, or listing it in a directory: ship it right the first time, tests included.'
risk: critical
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# MCP server

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Before adding a remote MCP server or tool to a web product, adding OAuth to it, or listing it in a directory: ship it right the first time, tests included.


**Build the remote MCP server and prove it before listing it.** This skill covers serving outside agents and getting listed without relearning the same lessons. Its examples use Next.js, Supabase, Clerk and Netlify.

**Start with one hosted endpoint and prove it with one real client.** Build a package or submit to directories only when the owner chooses those distribution targets.

**Keep product-specific facts in that product's own records.** This skill names those records by what they hold:

- The API contract: every REST route and MCP tool, what it accepts, returns and refuses;
- The distribution record: one row per listing (directory, registry, package), with its state, its date and how it is updated, and each client verified, with the date and what was called;
- The decision log: dated decisions that had real options, each with its reopen trigger;
- The backlog: deferred work, each item with the trigger that reopens it.

**Apply `clerk-production` § MCP OAuth before writing the route.** Discovery lists differ from token shape. Return `503` on verifier outages, refuse unknown `kid` values before calling Clerk and recheck live workspace access on every call because revocation remains unseen until expiry.

## What binds, in order

1. **Apply `saas-authorization` first because a tool is a route.** Its caller is resolved by the three functions, deterministic code decides what it may do, and everything it returns that a person wrote is untrusted text.
2. **Apply and reread every Clerk OAuth setting per instance.** Apply `clerk-production` § MCP OAuth.
3. **Apply this skill to the server and its distribution.** It covers tools, directories, clients and the package.
4. **Let each chosen directory's current page override this skill.** Read it again before every submission and record the date. Where the page and this skill disagree, follow the page and correct this skill with the date.

## Decide these first, in the product's decision log

**Record these decisions before building the server or its tools.** Use the product's decision log.

| Decision | The default | The other choice, and what it costs | Where |
|---|---|---|---|
| Does anything answer without sign-in? | **Authenticate every call, including `initialize`, by default.** Use Clerk OAuth or a workspace API token | An anonymous surface buys users who have no account, such as a ChatGPT plugin that makes a room with no sign-up. It costs a new kind of caller, an identity only the platform can vouch for, limits and a lifetime of its own, a disclosure burden, and in OpenAI's directory a package that declares it before the first upload. | `references/server.md § Who may call it` · the `chatgpt-plugin` skill |
| Who may connect? | An admitted OAuth caller gets the full grant a new API token carries, so admit by the permission that mints such a token, checked through the three functions on every call | A role compared by name, or a neighbouring permission the same role happens to hold today, hands write to whichever role is given that permission later. A caller without the permission gets a clear `403`, never a narrower connection | `references/server.md § Who may call it` |
| What must an agent never do? | A written list, held in code, and said in the instructions and the README | Examples: an audience product's agents cannot ask, vote or delete; a monitoring product's cannot delete, change billing, manage tokens or publish an incident note | `references/tools.md § Choosing the tools` |
| What if the workspace has yet to be created? | Return `403 organization_not_found` with a message to open the organization's dashboard first | When the owner chooses agent-started sign-up, configure Clerk and provision the workspace on the first authorized call | `references/server.md § The first call` |
| The path | `/api/mcp` or `/mcp`, chosen once | The OAuth audience and both protected-resource documents (the path's own and the root alias) name that exact URL, and the `401` challenge points at the path's own document; the authorization-server document stays Clerk's, relayed | `references/server.md § The route` |

## The rules every change meets

- **Descriptions, titles and the server's instructions are product copy, and each sentence is a claim.** Directories score them and show them; agents choose tools from them alone. Review them like code, since a sentence can promise behaviour the handlers do not keep. `references/tools.md`.
- **Every argument has a description and every tool an `outputSchema`, and a test holds both against the real handlers.** Smithery scores each out of 10 (observed `2026-10`). `references/tools.md § The tests`.
- **Every tool carries a `title` and the hints a directory requires.** Claude's directory flags tools lacking a title and `readOnlyHint` or `destructiveHint` (observed `2026-10`). OpenAI's guidelines keep an action destructive even when another tool can undo it (read `2026-10-26`). `references/tools.md § Annotations`.
- **`tools/list` has a size budget.** Pin it in a test. Every client loads it into the model's context, so per-field descriptions can expand it.
- **Log every call, refused ones included, before the server is listed anywhere.** It is the only way to learn which clients and directories actually call you. `references/server.md § The per-call log`.
- **A client is supported only once a happy path with it is recorded.** Record the date, the client and what was called, by this product and against this product. A client another product verified, or someone reports working, is unverified for you. `references/clients.md`.
- **Update every published package and listing after promoting a tool-surface change.** A description or schema change is a surface change. The package can otherwise differ from the hosted surface directories scored. `references/companion-repo.md § After a product release`.
- **Everything is published from the owner's account.** The registry namespace comes from the GitHub login that publishes, and a listing's maintainer is whoever claimed it; check which account the CLI is logged in as before any listing (`gh api user --jq .login`).

## The stage, in order

1. **REST functions first.** MCP and REST call the same module, so the two can never disagree about what a call does. REST stays token-only; OAuth is for MCP clients.
2. **Build a stateless Streamable HTTP route with the required controls.** Include stateless Streamable HTTP, the challenge, the three layers of error, the limits, the log (`references/server.md`).
3. **Build the tools with both required tests.** Read `references/tools.md`.
4. **Configure OAuth for the member endpoint, then prove a real grant and one real client.** Apply `clerk-production` § MCP OAuth, then `references/server.md § Proving it`. An anonymous surface the owner chose keeps its own checks (`references/server.md § Who may call it`).
5. **Write the API contract, public developer page and distribution record.** Include the API contract, a public page for developers pinned to the code by a test, and the distribution record.
6. **Release with independent review of the whole release.** Apply `independent-review`; descriptions and instructions are in the subject, not context.
7. **Publish the chosen listings or package from production after promotion and on the owner's go.** Read `references/directories.md` for listings and `references/companion-repo.md` for the package. Apply `chatgpt-plugin` for a ChatGPT plugin.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

A real client connects to the deployed server, signs in, lists the tools and calls one as a member, and the tests cover each tool's permission check.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/server.md` | who may call it, and what an anonymous surface costs; missing workspaces and agent-started sign-up; the route, its errors and transport; limits; the per-call log; proving it works | building or changing the route, its auth or its limits; deciding on an anonymous surface or agent-started sign-up |
| `references/tools.md` | naming; choosing the tools; descriptions, arguments, results, output schemas, annotations, the server's instructions; the two tests | adding or changing any tool, or the instructions |
| `references/directories.md` | each directory and registry: what it lists, requires, scores or refuses, and how a listing is kept current | listing the server, answering a review, rescanning after a change |
| `references/clients.md` | each client: how it connects, what to verify, what is known about it | writing setup instructions, or saying which clients work |
| `references/companion-repo.md` | the public repository and the stdio package: layout, README, the package's rules, one version everywhere, the release procedure, what a product release owes it | creating the repository, changing the package, releasing it |

## When something is learned

- **This skill is general and will be published.** Write the rule and why it holds. A product appears only as an example, named by kind ("a live Q&A product"), never by its commits, release codes, file paths, listing or plugin ids, pull-request numbers or account names.
- **Date what a platform or directory did or required.** Use "read on" or "observed in", because they change without notice. When one changes, correct the line; do not leave the old one beside the new.
- **What is true of one product goes in that product's repository.** This includes its listings and their states, versions, verified clients, open reviews and receipts, in its distribution record, API contract or backlog.
- **A rule a test can hold gets the test.** Say what the test asserts, not where one product keeps it.

## Where the skill lives

- **Install the `app-stack` pack in every agent that builds the server.** Keep no product copy: it freezes at its copied version, and Claude Code loads it twice beside the pack. For an existing copy (`.claude/skills/mcp-server/`, `.agents/skills/mcp-server/`), move additions into the product's repository (above) or a change for this collection. Then delete the copy.
- **A builder that is not Claude Code has the pack installed in it too.** A Codex brief for the MCP server names the skill as `mcp-server`.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/app-stack/skills/mcp-server).
