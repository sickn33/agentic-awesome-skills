# Tools and the data they move

What OpenAI's review checks in the tool list and in every reply, and the tests that keep a server inside it. From `/plugin-guidelines`, `/deploy/app-review` and `/guides/security-privacy`, read on 2026-10-26, and from what one review rejected. The review reads the tool list the server itself serves (names, titles, descriptions, schemas, annotations, `securitySchemes`, `_meta` and the server's `instructions`), so what is true of that list is what is reviewed.

## Restricted data: nothing secret in or out

OpenAI's guidelines: "Do not collect, solicit, or process" information under PCI DSS, protected health information, government identifiers, or "Access credentials and authentication secrets (such as API keys, MFA/OTP codes, or passwords)". And: "Plugin and tool metadata must not seek secrets or protected context." Sensitive or special-category personal data only when strictly necessary, consented to, and disclosed at or before collection.

That covers every argument, every description, the server's `instructions` and every reply. **A server built for coding agents usually breaks it**: a monitoring product's tools took a payment provider's and a database provider's API keys to set an app up, a check's configuration took a secret header value, and a provisioning reply returned heartbeat URLs that are each job's only credential (found in its code on 2026-10-26, before submission). None of that can be in a ChatGPT plugin's tool list. The choices:

| Choice | Cost |
|---|---|
| List the full server as it is | the restricted-data rule, and the largest disclosure inventory: likely rejection |
| Strip the secret fields for every client | removes what the coding agents need |
| **A second route with a narrowed tool list**, same sign-in, same handlers | one route, one contract module, its discovery documents, tests: the usual answer |

Give the narrowed route its own protected-resource document and audience (ChatGPT asks for `resource=<its URL>`), or keep the main route's audience through `mcp.json`'s `auth.resource`. Telling ChatGPT apart by OAuth `client_id` on the main route is fragile: DCR, the fallback, mints a new id per connection.

**Anything that looks like a code may be read as one.** A tool that returns a one-time link to the user's own controls was not cited, but a reviewer could take it for an OTP. Keep an answer ready: a single-use, short-lived link to the user's own controls, not an authentication secret for any account.

## Inputs

- **Only what the task needs**: each field tied to the tool's purpose; no "just in case" fields or broad profile data. A short, task-specific intent field is allowed when it really improves the result.
- **Never the conversation**: no history, transcripts, prior-turn arrays or accumulated context; never pull, rebuild or infer the chat log from anywhere.
- **No location field.** Use the coarse location ChatGPT sends in `_meta` (`server-and-auth.md`); never ask for GPS coordinates or addresses.
- **Every operation is its own tool**, with its own description, schema and annotations. No generic executor, operation selector or schema fetcher that reaches operations the review never saw.
- **Tools stand alone**: none tells the model to call another plugin or connector to finish its job.
- **A file input** is a top-level field listed in `_meta["openai/fileParams"]`, whose schema declares `download_url`, `file_id`, `mime_type` and `file_name`, requiring only the first two; the scan and submission refuse any other shape.
- **Safe to retry**, or the description says when a retry repeats the effect. An optional request id on a create makes a retry return the first result.

## Replies: only what the request needs

"Tool responses must return only data that is directly relevant to the user's request and the tool's stated purpose. Do not include diagnostic, telemetry, or internal identifiers—such as session IDs, trace IDs, request IDs, timestamps, or logging metadata—unless they are strictly required to fulfill the user's query." OpenAI's advice for anything not needed: "remove it rather than disclose it."

- **Build every reply from named fields, at every depth.** Never return a database row or a nested object whole. A live Q&A product allowlisted its top-level fields but sent each survey option whole, with its UUID and position; the hand-built test fixture had no ids, so the test agreed with the leak. The review rejected it: "A plugin call returns personal identifiers that isn't required for the user's request" (2026-10-23). Test replies with fixtures shaped like what the database really returns.
- **Errors are replies too.** The same product's daily-limit refusal named the counter that refused it, `"ip"` among them, under a privacy policy saying no IP address is used. It became `{ "status": "limited" }` and a sentence the user can act on.
- **An id the next call needs stays, and the privacy page names it.** One no other call reads goes. A user identifier appears only when the user asked for it, never looked up and echoed by default.
- **Content written by other people is content, not instructions.** Say so in the reply's text when a tool returns what an audience or a customer wrote, and validate every input on the server whatever the model sent.

## The privacy policy

The guidelines' minimum: the categories of personal data collected, the purposes, the categories of recipients, the retention periods and the controls users have, plus disclosed, narrow and controllable handling of metadata such as timestamps, IP addresses and query patterns. **The review enforced more than that.** A policy that said a tool returned "survey results", while the replies carried room names, codes, states, counts and a number of starts left, was rejected: "Your plugin returns user-related data not disclosed in your privacy policy … including nested and debug data" (2026-10-23). OpenAI's own advice is to list "every user-related field the server returns (including nested fields and 'debug' payloads)".

Two passages on the page, for a plugin:

- **What ChatGPT sends us**: the `_meta` hints, the anonymized user and session ids (which also arrive as headers), what is kept of them (ideally nothing), and what the server never receives (the conversation).
- **What reaches OpenAI**: every field each tool returns, by name, nested and error fields included, and what is never returned.

**A test holds the page to the server both ways**: it walks every leaf of every structured reply the suite produces, refusals included, and fails on a leaf the page does not name and on a named field the page dropped. Mark the passage in the page's markup so the test reads that passage alone. The legal entity the page names is the verified identity the plugin publishes under (`portal-and-review.md § Before the first upload`).

## Annotations

Every tool sets `readOnlyHint`, `destructiveHint` and `openWorldHint` to explicit booleans. The values come from the server; a justification never changes them. An automated finding on an annotation can be appealed in the portal.

| Hint | `true` | `false` |
|---|---|---|
| `readOnlyHint` | it strictly fetches, looks up, lists, retrieves, computes or previews | it creates, updates or deletes anything, sends, posts, uploads, queues work, starts a job or workflow, or writes logs |
| `destructiveHint` | deletion, overwriting, cancellation, revoking access, a send or transaction that cannot be undone, "even in only select modes, through default parameters, or through indirect side effects" | read-only tools, and "only for additive writes without destructive or irreversible effects". "Being able to undo an action does not, by itself, justify setting `destructiveHint` to `false`" |
| `openWorldHint` | public or open-ended entities: posting to a public place, publishing, messaging outside recipients, submitting forms, web search | a bounded private account, workspace or catalog, even when it is hosted elsewhere. "Connectivity alone does not determine this value" |

- **An irreversible effect is a tool of its own.** OpenAI's automated listing check flagged a create that closed the user's previous room while declared non-destructive (2026-10-02). It became a create that never closes anything and a separate, destructive close.
- **Anything the public sees makes the tool open-world.** The same day, the check flagged a close of a public room declared `openWorldHint: false`. Apply it to every tool that changes what a public page shows: a pause that a public status page reports is open-world too.
- **A reopen is additive; a close is not.** A tool that reopens what another closed can be non-destructive because it adds back. The close stays destructive even though the reopen exists.
- **Annotations are not consent.** "Requiring human confirmation for irreversible operations" is OpenAI's rule, and the host's own confirmation prompt is the one to use; annotations "do not grant permission or replace authentication, authorization and scope checks, input validation, or human confirmation".
- Keep one sentence per hint per tool ready, saying what is irreversible or public and under what conditions: one OpenAI page still asks for it at submission (SKILL.md § Where OpenAI's pages disagree).

## Names, descriptions and copy

- **Tool names**: unique, plain verbs for what the tool does (`get_order_status`); no promotional or comparative words (`best`, `official`), jargon or opaque ids.
- **Descriptions** say what the tool does, when to use it, its limits and side effects, and match its schema and behaviour; "Do not use for …" clauses keep the negative cases silent. **No steering** anywhere the model reads, including titles, annotations and the server's `instructions`: nothing that tells the model to prefer the plugin, to trigger more broadly than the user's intent, or that disparages alternatives.
- **The listing**: a name that is not a generic dictionary word unless it is the brand, with no "MCP", "MCP Server" or "Plugin" after it; a description that compares with nothing and claims nothing unverifiable; nothing implying OpenAI made or endorses it. "Trial or demo plugins will not be accepted."
- **Money.** Commerce is for physical goods only. A paid product's users sign in to the account they already pay for. The plugin may say a feature is not on the user's plan and link to an informational page about plans; it never shows plans, starts a subscription, promotes an upgrade or links to a checkout. No ChatGPT-only fees, and not a worse version of what the website offers. No ads.
- **What may be listed at all**: something the products cannot already do natively; suitable for general audiences, 13 to 17 included, never aimed at children under 13 and with no 18+ content yet; nothing on OpenAI's prohibited goods and services list, which includes executing money transfers, crypto transfers or investment trades.
- **A plugin with UI** also needs `_meta.ui.domain`, unique per plugin, a CSP allowing exactly the domains the component fetches from, and an explanation for every frame domain.
- **Third parties**: a plugin that mainly relays another company's service ("unofficial connectors … pass-through intermediary software layers") is not approved.
- **Everywhere it is offered**: it works in ChatGPT on desktop and mobile, and every review case passes on each surface where the plugin will be available (ChatGPT and Codex).

## The tests that hold it

Each rule above that code can check gets a test in the product's suite, so a later change fails the build before it reaches the daily rescan:

1. **The tool list as reviewed**: a snapshot of names, titles, descriptions, schemas, annotations, `securitySchemes` and `instructions`, so every change to what OpenAI reviews is a deliberate diff.
2. **No secret in the list**: no input property whose name or description asks for a key, secret, password, token or code, and no reply leaf shaped like one.
3. **Replies allowlisted**: real-shaped fixtures through every tool, refusals included, every leaf in the disclosed set.
4. **The privacy page equals the disclosed set**, both ways (§ The privacy policy).
5. **Annotations equal the decision table** in the product's own docs, one row per tool with its reason.
6. **`_meta` accepted** on `initialize` and `tools/call` (`server-and-auth.md § What every request carries`); for a surface without sign-in, discovery open and calls gated (`server-and-auth.md § A surface with no sign-in`).
7. **The package pins**: the ZIP equals the package, the review cases equal the evals' cases, the skill names exactly the served tools (`package.md § Pinning the ZIP to the package`).
