# The companion public repository and the MCP package

The `app-lifecycle` skill's capabilities ("Public companion repository") say when to propose it and what the owner does. This is how it is run once the MCP package lives there.

## What it is

- **Two jobs**: the product's public issue tracker (no application source; outside pull requests are not accepted) and the open-source **stdio MCP server that wraps the product's REST API** with the hosted server's tools, under a permissive licence (MIT) and a stated minimum Node version.
- **Three ways to install**: the npm package (`npx -y <package>`), a desktop bundle (`<product>.mcpb`) attached to each GitHub release, and `npx -y github:<owner>/<product>#vX.Y.Z`.
- **Its own `AGENTS.md`** holds the package's rules and its release procedure, and says nothing about the private application beyond its public API.
- **Layout**: the REST client (reads, actions, pagination, any Markdown the tools build); the stdio server (tools, error mapping, the reply-size cap); tests with no network (`node --test`); `manifest.json` (the desktop bundle's manifest); `server.json` (the registry entry, `references/directories.md`); a bundle script; `glama.json`; `.mcpbignore`; `.gitattributes`; CI and Dependabot.

## The README

- **It leads with what the server does**, then what the product is, then the ways in: sign in to the hosted server, the hosted server with a token, the local package. Directories and GitHub search read the README and the repository description, and a README that opened with "issue tracker" was what the listings showed.
- It says what the server **cannot** do, from the product's never-exposed list.
- A tool table per kind (reads, writes) matching the server's tools.
- **Issues and support** in a section of its own: issues are public, pull requests are not accepted, and nothing that grants access goes in an issue. A README once told users to post a room code, which lets anyone join the room; send such details through the product's support page instead.
- Badges: Glama's card, CI, npm. One-click install links for Cursor and VS Code, untested until someone records a run (`references/clients.md`). A pinned welcome issue on how to report a bug.

## The package's rules

- **Same tool names, titles and annotations as the hosted server for the tools they share**, so a client treats both the same way. **Descriptions are written for what each server returns, so never copy one across unchecked.** Where the package's Q&A read returns one Markdown document with no ids and no `cursor`, and the hosted one returns a structured, paged result, the package's moderation tools must send the model to the package's own read for ids, not to the hosted read's structure; copying the hosted text would send a model looking for ids in Markdown that has none, or passing a `cursor` the tool does not take.
- **It starts and lists its tools with no token.** The token is read when a tool calls the API. Glama's checks start the server with no real credentials and need only introspection; the CI smoke step does the same.
- **It starts through its installed bin, on every platform.** npm starts a package's bin through a symlink in `node_modules/.bin` on macOS and Linux, and through a cmd shim on Windows. An entry check written as `import.meta.url === pathToFileURL(process.argv[1]).href` never matches through the symlink: a monitoring product's first package version did nothing on macOS and Linux, while a Windows-only `npx` test passed (October 2026). Compare the `realpathSync` of both paths instead.
- **The token never appears in output.** Transport errors are reported generically, because they can quote request headers; error text from the server has the token cut out and is capped at 500 characters; a base URL carrying a user name or password is refused before any request, and the configured value is never echoed (its origin is, in the error for a response that is not the product's API). Tests pin the transport error, the server text's redaction and cap, and the URL refusals.
- **Bounded**: one reply under 1,000,000 characters (the MCP SDK refuses 10 MB), each API response read to at most 5 MB; a reply too large tells the agent to ask for a smaller page.
- **Writes are never retried by the package.** The caller's `request_id` is the retry key.
- **Ids are validated before they reach a URL** (UUIDs where the API uses them).
- **A write's reply must carry what it names.** A reply like `{"room":[]}` must not count as success: a room needs a code, and a survey or a question an id.
- **Its `User-Agent` is `<package>/<version>`**, so the product's per-call log counts it: the package reaches the server over REST, and its calls are REST rows whose client is the package and version.
- Documentation keeps the token out of shell history (`read -rsp`), and a base-URL override for a self-hosted install accepts `https`, and `http` only for `localhost` and `127.0.0.1`.

## One version everywhere

The version lives in `package.json`, `package-lock.json` (top level and `packages[""]`), `manifest.json`, `server.json` (its own `version`, the npm package's `version`, and the bundle's `identifier`, `…/releases/download/vX.Y.Z/<product>.mcpb`) and the README's `#vX.Y.Z` pin. **`npm run bundle` refuses to pack until all of them agree**, packs with a pinned MCPB CLI (`@anthropic-ai/mcpb`, an exact version), and writes the bundle's SHA-256 into `server.json`. **`npm run verify-release`** downloads the release asset and compares its hash with `server.json`, then checks that npm shows the version with the right `mcpName`. Each of those drifted, or nearly did, on a release day before the scripts existed.

## The release procedure

1. **Set the new version** in every file above. `npm run bundle` will not run until they agree.
2. **An independent review of everything since the package's last release**, `--subject vX.Y.Z..HEAD` with the tag of its latest GitHub release (never one that came with a history begun in another repository), or `--subject HEAD` before its first, plus the working tree, from a fresh session with no checklist (the `independent-review` skill), repeated with another fresh session until a round finds no INTRODUCED finding above Low after that skill's § Triage, and no High or Critical of any age is open. **Before the tag, not after**: a GitHub release is public. A version released on GitHub had its pagination wording found wrong by a review of the hosted server eleven minutes later, and had to be superseded before it reached npm or the registry.
3. **`npm run bundle`**, then commit and push: `server.json` now carries the new hash.
4. **`npm publish --access public`.** With two-factor authentication the owner confirms the publish in a browser with a security key (or passes `--otp`), so this step is the owner's. It comes before the registry, which checks the published `package.json` for `mcpName`.
5. **Tag the reviewed commit, push the tag, then release from it**: `git tag -a vX.Y.Z <full sha> -m vX.Y.Z`, `git push origin vX.Y.Z`, then `gh release create vX.Y.Z <product>.mcpb --repo <owner>/<product> --verify-tag`. `--target` with a short SHA failed with "target_commitish is invalid" (October 2026). A release is public, so the agent runs it once the owner has approved releases in that repository in so many words: without that approval an agent's permission check refused it as a public step, and after it the same command went through. With Glama's Auto-Release on, the release also starts a Glama build and release; Glama's own Build & Release re-rates the same way (`references/directories.md § Glama`).
6. **`npm run verify-release`**: the asset matches `server.json`, and npm shows the version (npm processes a publish for seconds to minutes; rerun until it passes). **Then start the published version the way a user does, on Linux**: `(cat in.jsonl; sleep 8) | docker run --rm -i node:22-alpine sh -c 'npx -y <package>@<version> <command>'`, with `in.jsonl` holding `initialize`, `notifications/initialized` and `tools/list`, and count the tools in the reply. A run on Windows proves nothing about the bin (§ The package's rules).
7. **Log in to the registry and publish** as `references/directories.md` § Official MCP Registry says. The owner enters the login's code at GitHub, so this step is the owner's too.
8. Then the directories: Glama's new release (its build's pinned version bumped, if it installs the package), and `references/directories.md § After a tool change`.

## CI and the repository's health

- **CI on the supported Node versions (for example 20, 22 and 24)**: `npm ci`, `npm test`, and a smoke step that pipes `initialize`, `notifications/initialized` and `tools/list` into the server with an empty token, checks the output for the server's name and a tool, **and checks the exit status**: a `|| true` once let a crash or a timeout pass whenever the expected strings had printed.
- **`.gitattributes` forces LF in every checkout.** A version packed on Windows with `core.autocrlf=true` shipped CRLF line endings in both the npm package and the bundle; harmless that time, but a pack must not depend on the machine.
- Dependabot, CodeQL and vulnerability alerts on; `.mcpbignore` keeps tests, scripts, `server.json`, `AGENTS.md` and `glama.json` out of the bundle, and `files` in `package.json` limits the npm package to the source, the README and the licence.

## After a product release

**The package follows production's API, never the reverse.** It can only call what production serves, so it is updated after a promotion, never before. A product release that touches the tool surface owes, in order:

1. The same tools in the package's source, its README table and examples, and the desktop manifest's tool list.
2. A new version through the procedure above.
3. The directories (`references/directories.md § After a tool change`).

**A change to the hosted tools' descriptions or output schemas is a change to the surface.** A trigger list that named only tools added, removed, renamed or returning something different let a release that gave every hosted tool an `outputSchema` and every argument a description pass without a package release; the package went on declaring no output schema, and the server directories scored was no longer the surface the package offered.

**What the package cannot follow**: OAuth. REST stays token-only, so the package keeps needing a token. When the hosted server gains OAuth, the companion repository changes its README, which leads with signing in to the hosted server, and the registry entry, whose remote header becomes optional.
