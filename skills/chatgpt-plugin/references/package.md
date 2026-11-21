# The package

What goes in the ZIP the portal reads, field by field, as OpenAI's `/build/plugins`, `/deploy/submission` and `/deploy/submission-errors` pages stated them on 2026-10-26. `python <skill dir>/scripts/check_package.py <package dir> --zip <zip>` checks everything below that a file can show.

## Layout

```
<package>/
  plugin.json                     the manifest: identity, listing, review, publication
  mcp.json                        the one remote server and how it signs in
  skills/<skill-name>/SKILL.md    at least one skill
  assets/icon.png, assets/logo.png
```

- **The ZIP is the folder's contents, not the folder.** `plugin.json` sits at the ZIP's root. (The portal also accepts a single top-level directory, but a ZIP that matches the folder byte for byte is the one a test can hold.)
- **One connected MCP server per plugin**, `type: "streamable-http"`, on the production HTTPS URL. A package may declare more, but only one can be connected, and plugin-level review cases require exactly one declared server.
- **Formats.** A root `plugin.json` with the Agent Plugins 1.0.0 `$schema` is the portable form. `.codex-plugin/plugin.json` is still read as a fallback, and `.claude-plugin/plugin.json` is converted (`claude_format_normalized`). When the root manifest carries `extensions["com.openai"]`, OpenAI ignores the OpenAI settings in `.codex-plugin/plugin.json`; the two are not merged. Keep one.
- **What cannot be submitted**: a package with app references (`apps`, a root `.app.json`) or lifecycle hooks. "Adding an MCP server to an existing skills-only plugin is not currently supported", so a plugin that will have a server has it from the first upload.

## plugin.json

Identity at the root; everything OpenAI-specific under `extensions["com.openai"]`, with `interface`, `review`, `publication` and `onboardingSkill` beside one another, not nested.

| Field | Rule (read 2026-10-26) | Why it matters |
|---|---|---|
| `name` | lowercase letters, numbers and single hyphens, at most 64; the prefix of every skill's `plugin:skill` name | It is the plugin's stable id: an update with a different name is refused (`plugin_name_mismatch`). Another OpenAI page also allows uppercase and `_`; the stricter rule is safe |
| `description` | required; at most 1,024 (one OpenAI page says 4,000) | |
| `version` | semver; raise it on every upload | A new plugin was labelled "Version 1.0.0" in the portal whatever the manifest said (October 2026) |
| `author.name` | the legal entity that publishes | The directory shows the verified identity instead, and the two disagreeing was a rejection reason |
| `interface.displayName` | at most 30, one line; no "MCP", "MCP Server" or "Plugin" appended | |
| `interface.shortDescription` | at most 30: the listing's subtitle | |
| `interface.longDescription` | at most 4,000; no pricing, subscriptions, trials, discounts or promotions | The guidelines ban them in listing copy |
| `interface.developerName` | at most 80 | The portal replaces it with the verified identity chosen when the draft was created, "regardless of the name in your ZIP" (`developer_name_defaulted`) |
| `interface.category` | one of `Productivity`, `Creativity`, `Developer Tools`, `Business & Operations`, `Data & Analytics`, `Communication`, `Education & Research`, `Security`, `Finance`, `Healthcare`, `Travel`, `Entertainment`, `Other` | omitted, it is `Other` |
| `interface.capabilities` | at most 20 strings, such as `Read` and `Write` | |
| `websiteURL`, `supportURL`, `privacyPolicyURL`, `termsOfServiceURL` | **all four required for MCP review**, HTTPS, no credentials in them, each answering 200, each naming the same publisher | A product without a support page needed one built for the listing |
| `interface.defaultPrompt` | at most 3, each at most 128 characters, unique, no `@` mention | The directory no longer shows screenshots; these starter prompts take their place |
| `interface.brandColor` | at least 2:1 contrast against white | A brand's own light accent can fail it; pick the darker shade the checker accepts |
| `interface.brandColorDark` | optional; at least 2:1 against `#212121` | |
| `interface.composerIcon`, `interface.logo` | `./` paths to files in the package; PNG, JPEG, WebP or SVG; at most 5 MiB; icons square and at least 48 px; rasters at most 4,096 px | |
| `interface.screenshots` | only when the tool scan reports a UI output template: one per starter prompt, exactly 706 px wide, 400–860 px tall | § Where OpenAI's pages disagree, in SKILL.md |
| `onboardingSkill` | optional path to one of the package's skills (`./skills/<name>/SKILL.md`) | |
| `review.test_cases.positive` | **exactly 5**: `description`, `prompt`, `tools_triggered` (one string, tool names separated by commas), `expected_behavior`; optional `file_attachment_urls`, `expected_output_url` | The portal refused a draft whose cases lived only in docs: "No test cases provided" (October 2026) |
| `review.test_cases.negative` | **exactly 3**: `description`, `prompt`; requests where the plugin should not act, with why, and the expected refusal, clarification or safe fallback | |
| `review.demo_recording_url` | required for MCP review; opens for a reviewer without an account; shows "the main use cases and tools across supported platforms" | § Review information in `portal-and-review.md` |
| `review.commerce`, `commerce_description` | declare whether it sells; commerce is for physical goods only, without freemium upsells | |
| `publication.release_notes` | "Notes describing this version's changes"; required at final submission for a plugin with an MCP server | Say what this version changed, plainly: each resubmission is a new review, and OpenAI asks the notes to describe what changed |
| `publication.countries` | uppercase country codes; omitted preserves the existing targeting (everywhere, on a first upload); `[]` removes restrictions; "applies when the plugin is published" | |
| `publication.translations` | optional localized listing fields | |

**Never in the ZIP**: `test_credentials`, `reviewer_instructions` (the ZIP is rejected with either), and any secret. Reviewer credentials go in the portal's Review details.

**How the portal imports review and publication data.** Imported cases and the video link are shown read-only and reapplied at submission, so changing one means a new ZIP. Omitting `test_cases` keeps the ones already saved; `{}` clears them.

## mcp.json

```json
{
  "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  "mcpServers": {
    "<server>": {
      "type": "streamable-http",
      "url": "https://<host>/<path>",
      "extensions": { "com.openai": { "auth": { "type": "oauth", "client": { "mode": "cimd" } } } }
    }
  }
}
```

**Declare `auth` for the server before the first upload, even when it is `none`.** The portal reads authentication from the uploaded version's `mcp.json`, shows it under MCPs, and has no editor for it; to change it, OpenAI says to upload a new version and check MCPs before connecting. A product whose anonymous server shared a domain with its OAuth-protected one uploaded a package with no declaration (October 2026): the portal followed the domain's root protected-resource document, read the plugin as OAuth and asked for a reviewer account. Completing the sign-in cleared the warning and locked the draft to OAuth. A new version declaring `type: "none"` changed nothing, Reconnect reused the sign-in, and only deleting the draft and creating a new plugin fixed it. The submission page now says the same in general: "Existing client registration can lock credential changes; check the saved connection rather than assuming an upload replaces an existing client."

| `auth.type` | Means | Portal |
|---|---|---|
| `none` | no sign-in | supported. Never declare a protected server as `none` |
| `oauth` | every call signs in | supported |
| `mixed` | some tools without sign-in, some with OAuth (not OAuth plus a fixed key) | supported |
| `api_key` | a fixed credential in a header (`headerScheme`: `bearer`, `basic` or `custom_header` with `headerName`) | **no connection flow and no token field**: the schema accepts it, the portal cannot connect it |

For `oauth` and `mixed`, `auth.client` chooses how ChatGPT registers:

| `client.mode` | Package carries | Notes |
|---|---|---|
| `cimd` | nothing else | ChatGPT's metadata-document client; does not disable the DCR fallback |
| `dcr` | nothing else | the authorization server's registration endpoint, through discovery or `registrationUrl` |
| `provided` | `clientId`, optionally `tokenEndpointAuthMethod` (`none`, `client_secret_basic`, `client_secret_post`, `private_key_jwt`) | the client secret is typed into the portal, never put in the manifest (it rejects `clientSecret`). The portal has no signing-key setup for `private_key_jwt` |

- `dcr` and `cimd` carry no `clientId` and no credentials.
- Optional overrides, used only when discovery does not supply them: `authorizationUrl`, `tokenUrl`, `registrationUrl`, `authorizationServerBase`, `resource`, `baseScopes`, `defaultScopes` (`[]` requests none; omitted uses the defaults), `oidcEnabled`, `oidcConfigurationUrl`, `oidcUserinfoEndpoint`, `oidcScopesSupported`. Overrides are absolute URLs without credentials or fragments.
- Field names are case-sensitive: `client.clientId`, never `oauth.client_id`.
- `headers` stays empty: public submission rejects non-empty server headers.

What ChatGPT's client then needs from the server is `server-and-auth.md § OAuth`.

## The skill inside the package

A public submission needs **at least one valid skill**, whatever server it connects (`plugin_runtime_surface_missing`, read 2026-10-26). It is also what routes requests to the tools: the model reads skill metadata first. In one product's routing evals (2026-10-02), five of eight review cases passed: prompts that did not name the product were answered as text. Naming the product in every positive case made it eight of eight, and the product added a skill whose description says when to use it and whose body names every tool and the order to call them in. Write the skill for the user who never names the product.

- Each skill is `skills/<name>/SKILL.md`, the folder an immediate child of `skills/`, never starting with a dot.
- Frontmatter between `---` lines with `name` and `description` (at most 1,024 characters); names unique in the plugin; `<plugin name>:<skill name>` at most 64 characters; a body that is not empty.
- Optional `agents/openai.yaml` in the skill folder sets its interface.
- Skill safety scans can take up to 2 hours after upload.

## Pinning the ZIP to the package

The portal reads only the ZIP. Build it from the package folder's contents with a script, and keep a test in the product's own suite that fails when the ZIP and the folder differ by a file or a byte. That test caught a stale ZIP the moment `mcp.json` changed (October 2026). The checker's `--zip` does the same comparison before an upload; the test keeps it true between uploads.

Two more pins, both cheap:

- **The review cases equal the routing evals' cases**, read from one file, so the five and three the reviewers run are the ones that passed.
- **The tools the skill names equal the server's tool list**, so a renamed or removed tool fails a test, not a review.
