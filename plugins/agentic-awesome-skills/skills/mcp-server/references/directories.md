# Directories and registries

What each directory lists, requires, scores or refuses, as read on the date given, and how a listing is kept current. A directory changes its rules without notice: read its own page again before submitting, and correct this file when it disagrees. Each product records its own listings in its distribution record: one row per listing with its state, its date and how it is updated.

## Before the first listing

- **Production serves what the listing describes.** After a promotion the order is the package, then its registry entry, then the directories, each describing what the one before it already serves. A package README announces OAuth only once sign-in is live in production.
- **One account for everything**, the owner's (`SKILL.md`). The registry namespace comes from it, and so does the right to edit a listing later.
- **The repository's README and its GitHub description are what directories read.** MCP Market, Glama, mcp.so and GitHub search read both; lead with what the server does, not with "issue tracker".
- **The member endpoint answers a probe**: an unauthenticated request gets `401` with the resource-metadata challenge, and the discovery documents answer `200`. One awesome list's bot classifies the server's authentication from exactly that response. An anonymous surface answers discovery without a challenge and refuses tool calls instead (`server.md § Who may call it`).
- **A reviewer account that is not a real one**: a separate test organization with sample data, on a plan that lets every tool succeed. On a free plan a reviewer's create can fail on a plan limit while a sample room is open. Glama's connector check gets a token from that test organization, never from a real one.
- **A public docs page for the server**, linking the listings: Claude's directory asks for a docs URL, and Smithery's verification looks for a backlink. Pin its links with a test.
- **Assets**: a square icon (Docker asks for a 512×512 PNG; a custom icon added 8 points to one server's Smithery score), a privacy policy, terms, a support page.

## The directories at a glance

As read in October 2026.

| Directory | Lists | What it takes | How long it took |
|---|---|---|---|
| Official MCP Registry | the hosted endpoint, an npm package and a desktop bundle, as `io.github.<login>/<name>` | `server.json` in the companion repository, `mcp-publisher` | minutes |
| Smithery | the hosted endpoint, scanned over OAuth | argument descriptions, output schemas, listing fields, an icon | the same day |
| Glama, server | the package, built and started by Glama | a build in Glama's settings (read the generated one), `glama.json`, a Glama release | the same day |
| Glama, connector | the hosted endpoint | a test-profile token from a test organization | the same day |
| Claude connectors directory | the hosted endpoint | OAuth, a title and hints on every tool, a reviewer account | over two weeks with no answer, for one submission |
| ChatGPT plugin directory | a plugin package naming a hosted endpoint, which may be anonymous | identity verification, a ZIP with review materials, a clean tool scan (the `chatgpt-plugin` skill) | about three weeks to a first decision |
| Docker MCP Catalog | the hosted endpoint, bearer header | `server.yaml`, test credentials through Docker's form | over two weeks with no review, for one pull request |
| punkpeye/awesome-mcp-servers | the package | a passing Glama server listing and its score badge | about nine days to merge |
| punkpeye/awesome-remote-mcp-servers | the hosted endpoint | the right auth marker, a Glama connector badge | about six days to merge |
| other awesome lists and indexes | the package or the endpoint | a neutral one-sentence description, or a form | from the same day to no response |
| GitHub MCP Registry, PulseMCP | said to ingest the official registry | nothing to submit | unverified |

## Official MCP Registry

- **The entry is `server.json`** in the companion repository (`references/companion-repo.md`), against the schema its `$schema` names (`2025-12-11` when read). `name`, `description` and `version` are required; **`description` and `title` are at most 100 characters**; `name` is `io.github.<login>/<name>` for a GitHub-authenticated publisher.
- **It can list three ways in to the same server**: `remotes` (the hosted URL, `type: streamable-http`, with an `Authorization` header whose `isRequired` is `false` once OAuth is live), an npm package (`registryType: npm`, the package's version, `transport: stdio`, `environmentVariables` with `isSecret`), and a desktop bundle (`registryType: mcpb`, the release asset's URL as `identifier`, its `fileSha256`).
- **The npm package's `package.json` must carry `mcpName` equal to the entry's `name`, and the registry refuses the entry until npm shows the version.** npm answers a publish with `202` and processes it for seconds to minutes, so the release script checks npm for the version and its `mcpName`, and stops until both are there, before the registry step.
- **Publish**: `mcp-publisher login github`, then `mcp-publisher publish` from the companion repository. The login prints a code the owner enters at GitHub, after checking that the authorization page shows the owner's account (`SKILL.md`), so no token passes through the agent's shell. Run the login with `MCP_GITHUB_TOKEN` unset: when it is set, the publisher signs in with that token and prints no code (read in its source on 2026-11-20, v1.8.10). Another account is refused at publish: the registry grants names from the signed-in account and its organizations, and answers `403` for any other (read in its source on 2026-11-18).
- **Versions are immutable**; a change is a new version, and a version that was released elsewhere but superseded before the registry step simply never appears there.
- **Downstream registries** (GitHub's MCP Registry, said to feed VS Code, and PulseMCP, submissions paused) are said to ingest the official one. Neither was verified; PulseMCP's search returned nothing for a listed server weeks later.

## Smithery

- **An external-URL listing of the hosted endpoint**, scanned over OAuth: the owner signs in with GitHub and then through the product's own sign-in so the scanner can connect. Display name, description, homepage and repository are set in the listing.
- **It scores the server.** One server went from 47, to 71 with the listing's fields filled, to 90 once every argument had a description and every tool an output schema (it had scored 0 of 10 on each), to 98 with a custom server icon uploaded in Settings (October 2026).
- **Rescan after every tool change**: Releases → Publish → Continue → Skip.
- **The Verified badge** needs a release, a score above 80, a homepage, a `smithery-verification` TXT record on the product's domain, a backlink, and a paid Smithery developer plan. If pursued, set the custom backlink URL to the MCP docs page.

## Glama

- **Two listings**: the **server**, built from the repository (`glama.ai/mcp/servers/<owner>/<repo>`), and the **connector**, for the hosted endpoint, keyed by the official registry name (`glama.ai/mcp/connectors/io.github.<login>/<name>`).
- **The server listing builds the package and starts it in Glama's sandbox**, from the build its settings hold (Admin → Dockerfile: build steps and the command), and its checks need only that the server starts and answers introspection. So **the package must start and list its tools with no credentials**; a token is needed only when a tool is called. The build either installs the published package at a pinned version, bumped with each release, or builds from the repository. `glama.json` at the repository root, `{"$schema":"https://glama.ai/mcp/schemas/server.json","maintainers":["<github login>"]}`, names the GitHub accounts that may maintain the listing, and is what lets the owner claim it.
- **Glama generates the build from the repository, and the generated one is a guess: read it before the first build.** A monitoring product's guessed `pnpm install` and `pnpm run build` for a repository with npm's `package-lock.json`, and a command, `mcp-proxy -- node dist/cli.js`, without the CLI's `mcp` subcommand. A CLI with several commands started without its server's command just exits, so Glama found no tools and scored none (October 2026). The fix was build steps `["npm ci","npm run build"]` and the command `["mcp-proxy","--","node","dist/cli.js","mcp"]`. Reproduce the build before trusting it: in a clean `node:24-bookworm-slim` container, `git clone`, the build steps, then the command, with `initialize`, `notifications/initialized` and `tools/list` piped in.
- **Glama builds from its own copy of the repository, which can be stale.** An empty "pinned commit" means the latest commit Glama knows of, not GitHub's head: one server's last known commit predated the fix it needed. Admin → Repository → Sync Server updated it in about 45 seconds (October 2026).
- **A passing build test is not a release.** Glama scores the tools (TDQS) and the server's coherence only for a published Glama release, which Build & Release makes. For one server the release appeared about three minutes after the test passed and the tool scores about ten minutes after that, and the release alone took the listing's discovery score from 33% to 67% (October 2026). Auto-Release makes a Glama release for every GitHub release.
- **The connector's health check uses a "test profile"** (Admin → Test Profile) holding a token from a separate test organization.
- **It scores each tool's definition** (TDQS), lowest at first on usage guidance (`references/tools.md § Descriptions`), and its review flags "only read operations". Its card also shows a maintenance score, which CI on several Node versions, Dependabot, CodeQL, vulnerability alerts, a pinned welcome issue and `glama.json` raise. A licence file it recognizes (MIT or Apache-2.0) scores A on the licence signal, and passing CI and a README count too. Maintenance stayed at C, on "No stable releases found" and "No commit activity data available", for a repository with no GitHub releases, while one whose releases are semver tags, not prereleases, scored A (October 2026).
- **The listing's profile**: up to three categories, a description, and related servers. "No recent usage" is one of its signals; Try in Browser runs the server from the listing. A server whose `initialize` returns no `instructions` is shown as "This server publishes no instructions" (`references/tools.md § The server's instructions`).
- **Badges**: use the server's card badge. The connector's score badge rendered as broken alt text on Glama's own page, because Glama's image proxy answered `400` for its address (October 2026).
- After a tool change the server's and the connector's descriptions are updated in Glama (§ After a tool change), and the server needs a new Glama release before its tools are scored again. Glama re-rates only the definitions that changed, about two minutes after the release; unchanged ones keep their scores (October 2026).
- **Driving its admin pages.** They need the owner's GitHub sign-in, so an agent works in a browser the owner signed in to: a persistent Playwright Chromium started with `--remote-debugging-port`, the owner signs in there, and the agent attaches with `chromium.connectOverCDP`. The build's JSON fields are CodeMirror editors: click `.cm-content`, select all and delete, then `keyboard.insertText(...)`, which keeps the editor from closing brackets on its own. Read the hidden `select[name=buildSteps]` and `select[name=cmdArguments]` values back before Build & Release.

## Claude connectors directory

- **Requirements**, read in October 2026 at `claude.com/docs/connectors/building/submission` and `/review-criteria`: a remote HTTPS server; OAuth; a `title` and `readOnlyHint` or `destructiveHint` on every tool; tested in Claude as a custom connector, every tool called once before the portal's confirmation is ticked; a docs URL, a privacy policy, a support contact that someone reads, an icon; a reviewer account fully populated with sample data and step-by-step test instructions; a name (100 characters), a one-liner (200), a description (2,000), one to five categories, primary use cases, what a user needs before connecting, and a slug that is permanent.
- **Submit** at `claude.ai/directory/manage` → Submit new → MCP connector (any paid Claude plan). The portal flags tools without titles before it accepts the submission. Questions and changes to a submitted listing: `directory@anthropic.com`; escalations: `mcp-review@anthropic.com`.
- **Until it is live** the listing's page says "Numbers start when the listing is live". If reviewers object to the hints, the fallback is to mark the creates destructive (`references/tools.md § Annotations`).

## ChatGPT plugin directory

Everything OpenAI's plugin directory takes, on any stack, is the `chatgpt-plugin` skill: deciding the authentication before the first upload, the package and a script that checks it, ChatGPT's OAuth client, the data rules, annotations, the reviewer account, the portal, rejection and appeal, and what changes after publication. Read it before building the package. What this stack adds:

- **Declare the authentication the server already has.** A server on this stack signs in through Clerk, which meets ChatGPT's client once `clerk-production` § MCP OAuth is applied (CIMD and DCR, `S256`, the `resource` copied into the token's audience): `auth.type: "oauth"` in the package's `mcp.json`. An anonymous surface is `"none"`, and nobody ever completes an OAuth sign-in for it in the portal (`references/server.md § Who may call it`).
- **The full tool list may not be listable.** OpenAI's restricted data includes API keys and passwords, in arguments and in replies alike, and the review reads the server's own tool list. A server whose tools take provider keys or return a credential serves ChatGPT a narrowed list on a route of its own, with the same auth functions and handlers.
- **Accept `_meta` in `params`** (`references/server.md § The route`); ChatGPT sends it on every tool call.
- **The reply allowlist and the privacy page's field inventory**, both held by tests (`references/tools.md § The tests`), before the first submission: summarizing the returned data in the privacy policy was a rejection reason.
- **The reviewer account is the test organization** from § Before the first listing, signing in with an email and a password. Before submitting, sign in with it from a fresh browser on another network and confirm Clerk's production instance asks for no emailed code.
- **The distribution record** holds the plugin's id, the Authentication field the portal shows, the package version uploaded, and the review state with its dates.

## Docker MCP Catalog

- **A pull request to `docker/mcp-registry`** adding `servers/<name>/server.yaml`, `readme.md` and `tools.json`. A remote entry is `type: remote` with `remote.transport_type: streamable-http`, the `url`, and an `Authorization: "Bearer ${ENV}"` header fed by `config.secrets`; `about.icon` a 512×512 PNG; Prettier formatting. Its `task validate -- --name <server>` needs a Go toolchain; without one, check each rule by hand and rely on CI.
- **Test credentials go through Docker's own form**, never into the pull request.
- **Reviews can be slow**: one pull request had no review after more than two weeks (October 2026). An entry written before the server gained OAuth describes the bearer header only; update it when OAuth goes live.

## The awesome lists and indexes

- **`punkpeye/awesome-mcp-servers`** is for servers with a public repository you install and run; a remote-only server belongs in its sister list. A bot requires a Glama server listing that passes its checks, and the Glama score badge in the entry. **So Glama comes first**: `glama.json` in the repository, the listing claimed, the generated build read, Build & Release, the tool scores in, and only then the pull request. One opened before Glama had scored the server met the bot asking for a Glama quality score (October 2026). An agent's pull request opts into a fast track with `🤖🤖🤖` at the end of its title (`CONTRIBUTING.md`).
- **`punkpeye/awesome-remote-mcp-servers`** marks each entry 🔓 none, 🔑 API key or 🔐 OAuth, and a bot probes the endpoint to check it; its maintainer reads a `401` as OAuth, so a server with OAuth and tokens is 🔐. The entry carries the Glama connector badge, and the submitting account stars the repository, as its rules ask.
- **Lists want what the server does, not why to buy it.** One maintainer added a server directly and rewrote its description as one neutral sentence, without the selling point.
- **Some lists are dormant**: hundreds of open pull requests and no merges for months means no answer; check the last merge date before submitting.
- **Indexes with issue forms** (TensorBlock's, for example) can draft and merge their own pull request the same day. The metadata they generate from the form may be wrong (a bearer token for an OAuth server); read it after the merge.
- **Bots add servers unasked** from the awesome lists (freemcp.space, for example); claim the entry with a GitHub sign-in.

## By form

- **mcp.so**: the repository URL and the hosted server's configuration; listed the same day.
- **MCP Market** (a free queue, said to be four to six weeks) and **mcpservers.org** (as a remote server): forms; no outcome seen within weeks.
- **xAI's plugin marketplace**: a form taking the hosted URL and OAuth testing steps; its requirements beyond the form are unverified.
- **Cline's MCP Marketplace**: its repository was inactive from mid-2025 and its review weighs stars. **LobeHub**: no submission path verified.

## After a tool change

**Update the package and listings the owner chose to publish.** After promoting a release that changes the tool surface, follow the applicable steps in this order:

1. The package and its registry entry: `references/companion-repo.md § After a product release`.
2. Smithery: rescan. Glama: in the browser the owner signed in to (above), and once the owner has approved the new text, the agent updates the server's and the connector's descriptions and, if the build installs the package, its pinned version, then checks that a new Glama release exists (Build & Release, or Auto-Release on the GitHub release). ChatGPT, once the plugin is published: the deploy is enough, because OpenAI scans the server daily (Rescan in the portal's MCPs tab runs one at once), keeps a changed tool's old definition live until the change passes its checks, and holds a new tool until then, so the server keeps answering the live schemas meanwhile. Before publication, rescan before submitting. A change to the package (listing fields, skills, a test case, the video, `mcp.json`) is a new ZIP (the `chatgpt-plugin` skill, after publication).
3. The product's public MCP docs page, its API contract, and the privacy page if a returned field changed.
4. The product's distribution record, and the owner's tracker.
