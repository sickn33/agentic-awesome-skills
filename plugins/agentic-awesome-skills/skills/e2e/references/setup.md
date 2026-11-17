# Setting up e2e

Follow the [authorization and test data boundaries](../SKILL.md#authorization-and-test-data) before setup, live testing, or sharing results.

## Contents

- Requirements
- Scaffold
- Subscriptions and API keys
- The config
- The app under test
- Environment variables the runner reads
- Mobile targets
- Done when

## Requirements

- Node.js 24.8 or newer, or 22.22.3 or newer on Node.js 22; or Bun 1.4.3 or
  newer (`bunx --bun e2e`), with
  [these limitations](https://e2e.com/docs/reference/cli#bun).
- ES modules: `.ts` config, tests, helpers, and workspace packages exporting
  `.ts` source load as ESM regardless of the nearest `package.json` `type`
  (CommonJS packages need no change); never `require` or `module.exports`.
  Imports follow TypeScript: `./x.js` or `./x` loads `x.ts`, and the nearest
  `tsconfig.json` `paths` and `baseUrl` apply. Decorators need
  `experimentalDecorators`; CommonJS TypeScript goes in `.cts`.
- Browser tests: `@e2e-dev/web`, pinning `playwright-core` exactly; do not
  add `playwright` for it. Missing browsers download on first boot; in CI run
  `npx @e2e-dev/web install chromium --with-deps` (pnpm: `pnpm exec e2e-web
  install chromium --with-deps`). Mobile tests: `@e2e-dev/mobile`, pinning
  `agent-device` exactly; each pin moves with its engine release.

## Scaffold

Fresh project:

```bash
npx e2e init       # npm
pnpm dlx e2e init  # pnpm
```

With `e2e` installed, run the installed version: `npx e2e init` or `pnpm exec
e2e init`; `npx e2e init my-app` scaffolds into a new directory.

The wizard picks the engines (web, mobile, or both) and a model provider (None for tests without AI)
and offers to install this skill, register the MCP server for your coding
agent, and install dependencies. `--yes` picks the web engine (Playwright) and Vercel AI
Gateway, installs the skill in `.agents/skills/` (`.claude/skills/e2e`
symlinks to it), registers MCP in `.mcp.json`, `.cursor/mcp.json`, and `.codex/config.toml`, skips
installing dependencies. A flag per question overrides one default:
`--engine` (`web,mobile` for both), `--gateway`, `--endpoint`, `--skills`,
`--mcp` (comma-separated locations, or `none`), `--ci github-actions`, `--ci gitlab`, or `--ci none` (a
pipeline with a job per platform; `--yes` writes none), `--install`; `npx e2e init --help` lists the values.
To start a new app from one of the repo's examples instead, run `npx e2e init
my-app --example with-vite` (or `with-expo`, `with-flutter`, ...): it
downloads the example into an empty directory with its config and tests, then
asks only for the skill, MCP, and install.

The wizard needs a terminal: without one, `init` exits with code 2. From an
agent's shell, run `npx e2e init --yes` when its defaults fit and install the
dependencies after it, or install by hand (below). `--yes` includes MCP
registration. When the client already has the e2e plugin, pass
`--skills none --mcp none`, since the plugin gives it the skill and the server
(`plugin:e2e:e2e`). A manual install needs a separate entry (topic `mcp`).

Init adds dependencies and a `test:e2e` script to `package.json`, writes
`e2e.config.ts` and `tests/example.e2e.ts`, updates `.gitignore`, leaves
existing configs and tests alone. Re-run after upgrading to refresh skill and
MCP entries.

Without the wizard (`ai`, Vercel AI SDK v7, only for `agent.*` steps):

```bash
npm install --save-dev e2e @e2e-dev/web ai@^7
```

## Subscriptions and API keys

`e2e init` writes model config and dependencies for a subscription, an API
key, or a local endpoint. Authenticate:

| Choice | Setup |
| --- | --- |
| ChatGPT Plus or Pro | `npx e2e login openai` |
| GitHub Copilot | `npx e2e login github-copilot` (GitHub CLI signed in, or your own `--client-id`) |
| OpenCode Console (OpenCode Zen and OpenCode Go) | `npx e2e login opencode-console` (approve the device code, pick the workspace) |
| SuperGrok or X Premium+ | `npx e2e login spacexai` |
| Claude Max or Team | No `e2e login`: link a Claude Console organization in claude.ai for the plan's monthly API credits (Max: Settings > Billing; Team: an Owner under Organization settings > Billing), create an API key in it, set `ANTHROPIC_API_KEY`, use `anthropic('<id>')` from `@ai-sdk/anthropic` |
| Vercel AI Gateway | Set `AI_GATEWAY_API_KEY`, or sign in to the Vercel CLI and `npx vercel link`; without the key `gateway()` uses a Vercel OIDC token |
| OpenRouter | Set `OPENROUTER_API_KEY` |
| Local or self-hosted endpoint | Set the endpoint URL and a model it serves, plus a key if required |

Switching an existing config to ChatGPT: install `ai` and `@ai-sdk/openai`,
set `model: chatgpt('gpt-6-luna')` from `e2e/oauth/chatgpt`, run `npx e2e
login openai`. `npx e2e models` lists the ids each login serves. Use API keys
in CI.

Switching to Copilot: install `ai`, `@ai-sdk/openai-compatible`, and
`@ai-sdk/openai`, set `model: copilot('<id>')` from `e2e/oauth/copilot`, run
`npx e2e login github-copilot`. `copilot()` calls a model over chat completions, or
over Copilot's Responses API when the plan serves that model only there, choosing
per model from the plan's listing. `npx e2e models github-copilot` marks the models
it cannot call at all: those served only over an API `copilot()` does not speak, and
those the plan has not enabled. Whether the plan serves a model shows nowhere: on
Copilot Free, GitHub serves models through auto model selection only, so a model
called by id is usually refused, and the run stops with `MODEL_UNAVAILABLE` naming
it. Pick another id or an API provider.

Switching to OpenCode Console: install `ai`, `@ai-sdk/openai-compatible`,
`@ai-sdk/openai`, `@ai-sdk/anthropic`, and `@ai-sdk/google`, set
`model: opencodeConsole('<id>')` from `e2e/oauth/opencode-console`, run
`npx e2e login opencode-console`. A bare id is an OpenCode Zen model; a `go/` id
(`go/deepseek-v4.1-flash`) is an OpenCode Go model and needs an OpenCode Go
subscription: the workspace's through the login, or yours through
`OPENCODE_API_KEY`. `npx e2e models opencode-console` lists the ids, tagged
Zen or Go, through the key when it is set. In CI, set a Console service account
API key or an OpenCode Go subscription API key as `OPENCODE_API_KEY`.

## The config

`e2e.config.ts` sits at the project root and default-exports an object literal
ending in `satisfies E2EConfig`; unknown keys are `INVALID_CONFIG` at load.

```ts
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { gateway } from 'ai';

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      engine: web(),
      app: {
        url: 'http://127.0.0.1:3000',
        command: { executable: 'pnpm', args: ['dev'], log: '.e2e/logs/app.log' },
      },
    },
  ],
  // Model behind every agent.* step.
  agents: {
    default: {
      model: gateway('openai/gpt-6-luna-fast'),
      system: 'You are a thorough QA agent. Verify every outcome on screen.',
    },
  },
  credentials: {
    admin: { username: 'admin@example.test', password: process.env.ADMIN_PASSWORD ?? '' },
  },
} satisfies E2EConfig;
```

A string `password` is checked at load (6+ code points): set `ADMIN_PASSWORD`
or `E2E_USER_ADMIN_PASSWORD` first, or defer to fill time with
`() => process.env.ADMIN_PASSWORD ?? ''`.

| Key | Default | Notes |
| --- | --- | --- |
| `targets` | required | Non-empty; `--target` takes `name`. UI targets set `engine` and `app` (`platform` and `name` default to the engine's platform); tools-only targets may omit `engine` and must set `platform`. |
| `tests` | `'tests/**/*.e2e.ts'` | Globs relative to the project root (optional `./`): `*`, `?`, whole `**` segments, leading `!` excludes (`'!tests/wip/**'`; only exclusions is `INVALID_CONFIG`). Braces, character classes, extglobs, `..`, absolute paths, and a wildcard-free directory entry (`'!tests/wip'`) are `INVALID_GLOB`. |
| `timeout` | `120000` | Per test attempt, ms; also the default `agent.act` deadline. |
| `launchTimeout` | `60000` | Engine init and attempt start, ms. |
| `actionTimeout` | `30000` | Each locator action and engine operation, agent-step observations included. |
| `assertionTimeout` | `5000` | `expect` polling window. |
| `cleanupTimeout` | `30000` | Each `afterEach` hook, fixture teardown, engine cleanup, ms. |
| `retries` | `0`, `1` in CI | 0 to 10. |
| `workers` | half the cores, `1` in CI | Parallel test files, capped by the `workers` the engine declares per target. |
| `reporters` | `['list']` | `list`, `json`, `junit`, `markdown`, or `{ name, onEvent?, onRunFinished? }` objects; `json` excludes `list`, `--reporter` keeps the objects. |
| `cache` | `'read-write'` | `'read-write'`, `'read-only'`, `'off'`, or `{ mode, store, dir, strict }`; CI demotes only a defaulted mode to `'read-only'`. `strict` (`--strict-cache`) fails a step whose recording no longer replays (`REPLAY_STALE`) instead of handing it to the agent; retries replay too, and the run never writes the cache. |
| `agents` | `{ default: built-in }` | Tests run with `default`, `e2e run --agent <name>` picks another, entries never inherit from `default`. Options: topic `agent`. |
| `filters` | `[]` | Test filters `{ name, filter(tests, context) }`, unique names, applied in order with `--changed-since <ref>`. Use `filters: [decisionFilter({ model: gateway.decisionModel('typesafe-ai/jev') })]`, with `decisionFilter` from `@e2e-dev/decision` and `gateway` from `ai` (install `@e2e-dev/decision ai`), to run only the tests a pull request can affect. `filter` gets candidates `{ id, file, titlePath, tags, setupFile? }` and a context `{ projectRoot, changes: { base, root, files }, configFile, signal, log, redact }` with repository-relative `files`, and returns `{ exclude: { [id]: reason }, relevance?: { [id]: 0 to 1 }, note? }`; every test it does not name runs, and `relevance` (how likely each test is to fail) makes each target start the likeliest files first. Read files, the environment, or the network inside `filter`, never at config load: workers load the config too. When filters run: topic `running`. |
| `credentials` | `{}` | Named `{ username, password }`; `password` is a 6+ code point string or a function returning it. |
| `secrets` | `{}` | Named values the model never sees (API keys, tokens), same value rule. A separate namespace: a credential's password is `credentials.user(name).password` (named `<name>.password`), never `secrets.get()`, so a name may be both. |
| `output` | `'.e2e'` | Results directory; `--output <dir>` for one run. Inside the project root, not the root, not a tests glob's directory, never the cache dir (`cache.dir` stays `.e2e/cache`). |
| `artifacts` | none | `{ store }`: artifacts go to the host `ArtifactStore` (`{ put(artifact), putLink?(link) }`); `putLink` gets provider-hosted video links (never a passed `retain-on-failure` attempt's). Failure screenshots are always captured when the engine can. |
| `trace` | `'retain-on-failure'` | Tests that keep a trace page (`<output>/results/<test>/trace.md`): `'off'`, `'on'` (every test), `'retain-on-failure'` (failed, timed-out, flaky), `'on-first-retry'`, `'on-all-retries'`; precedence as `video`. Works on every engine. |
| `video` | `'off'` | Attempts that record, same modes; `'retain-on-failure'` records all, keeps those that did not pass. Precedence: the test's `video`, `--video [mode]`, the target's (`{ engine, video }`), the config's. |
| `projectId` | the package name | Report and cache identity. |

- `tests` discovery enters only directories a glob can match; symlinks are
  not followed.
- `video`: a config or flag mode skips targets whose engine cannot record
  (one notice), a target or test mode requires it (`UNSUPPORTED_ARTIFACT`).
- `trace` and `video`: a retry mode with `retries: 0` prints a notice;
  neither invalidates the replay cache.

## The app under test

The target declares the app; the engine only drives it. `web({ url })`,
`mobile({ app })`, and the other old app options are unknown keys. The
target's `app`:

| Key | Meaning |
| --- | --- |
| `url` | Base URL for `app.open()` and relative navigation; required on a `web()` target, not supported on a mobile target yet. Missing scheme: `https://`, `http://` for loopback; port `0` on `127.0.0.1` or `[::1]` takes a free port. |
| `bundleId` | Device targets: the bundle id, package name, or display name (`Settings`) `app.open()` launches. |
| `appPath` | Device targets: the `.app` or `.apk` under test. A device target needs `bundleId` or `appPath`. |
| `launchArguments` | Device targets: arguments every fresh launch gets. |
| `permissions` | Device targets: states (`grant`, `deny`, `reset`) every fresh launch gets. Web targets: `grant` only, held by every page (`{ 'clipboard-write': 'grant' }` lets headless Chromium write the clipboard). |
| `command` | The process serving `url`: `{ executable, args, cwd, env, inheritEnv, startupTimeout, shutdownTimeout, log, reuseExisting }`; `{port}` in `args` and `env` expands to `url`'s port. Targets declaring the same command share one process. |
| `readyUrl` | Readiness probe when it differs from `url`; `{port}` expands too. |
| `environment` | `'test'`, `'staging'`, `'production'`; inferred from the host, labels the report and cache key. |
| `identity` | Stable identity for cache and session keys when the origin changes per deploy (preview URLs). Defaults to the URL's origin and path, else `bundleId`, else `appPath`. |

A Next.js 16 dev server blocks cross-origin requests to its dev resources, so
a target that opens `127.0.0.1` or `[::1]` while `next dev` identifies as
`localhost` never hydrates. Add the host to `allowedDevOrigins` in
`next.config.ts` (`'127.0.0.1'`, or `'[::1]'` for the bracket form). A
`localhost` target needs no entry, and a production `next start` target is
unaffected.

There is no `services` key in this version: it is an unknown key wherever it
appears. Start dependency processes before the run, or have `app.command`
start a script that brings them up and serves the app.

`web()` options:

| Option | Meaning |
| --- | --- |
| `browser` | `'chromium'` (default), `'firefox'`, `'webkit'`, or a `BrowserProvider` leasing hosted browsers over CDP ([`browserRun()`](https://e2e.com/docs/integrations/browser-run) from `@e2e-dev/browser-run`, `kernel()` from `@e2e-dev/kernel`, `smol()` from `@e2e-dev/smol`, `lightpanda()` from `@e2e-dev/lightpanda`, `moli()` from `@e2e-dev/moli`, `testmuBrowsers()` from `@e2e-dev/testmu/web`, `e2bBrowsers()` from `@e2e-dev/e2b/web`, or your own), which implies chromium and excludes `connect`. Scope `'worker'` (default): one browser per worker slot from `prepare` to `finish`; `'attempt'`: one per attempt, with `reconnectEndpoint`'s limits (`lightpanda()`, `moli()`, and `testmuBrowsers()` are worker scope only). |
| `viewport` | `{ width, height }`, default 1280x720; `null` follows the browser window (hosted live view, headed run). On a headed hosted browser (Kernel) use `null` and size the service's screen; a fixed size gives a smaller, unmaximized window. |
| `connect` | `{ cdpEndpoint }` attaches to a remote Chromium over CDP; `cdpEndpoint` is required, and both it and `reconnectEndpoint` are resolvers `(signal) => url` or `(signal) => ({ endpoint, headers })` for authenticated CDP connections, not strings, else `INVALID_CONFIG` at load. With `reconnectEndpoint` it rides one persistent default context, needs a fresh browser from `cdpEndpoint` every attempt, and reconnects only to the original browser and page. |
| `headers` | Sent to the app's origin only (scheme, host, and port of `app.url`; Vercel's `x-vercel-protection-bypass`, ngrok's `ngrok-skip-browser-warning`), `agent.act` included; `credentialOrigins: ['https://api.example.com']` adds exact origins for `headers` and `basicAuth`. A request keeps them through its redirects, to any origin. Disables the browser HTTP cache and service workers. |
| `basicAuth` | `{ username, password }` for a `401` challenge from the app's origin, or one `credentialOrigins` lists (a redirect to `www` or `https:` is another origin; WebKit answers any origin when one is on a default port or an IPv6 host); `password` may be `secrets.get('name')`, resolved per attempt and redacted like any secret, the base64 `Authorization` credential too. |
| `userAgent` | The `User-Agent` every attempt sends and `navigator.userAgent` reports. |
| `locale`, `timezoneId` | The language (`'de-DE'`: `navigator.language`, `Intl`, `Accept-Language`) and IANA time zone (`'Europe/Berlin'`) every attempt runs in. |
| `colorScheme`, `reducedMotion` | The `prefers-color-scheme` (`'light'`, `'dark'`, `'no-preference'`) and `prefers-reduced-motion` (`'reduce'`, `'no-preference'`) every page reports to its `@media` rules and `matchMedia`, from first paint. |
| `initScripts` | Scripts every document runs before the page's own: source, `{ path }`, or a function with no closures. |
| `testIdAttribute` | What `getByTestId` reads; default `data-testid`. |
| `screencast` | `{ size?, quality? }` for the engine's own video: frame size (default the viewport's), JPEG quality 0 to 100. |

- `basicAuth` via `secrets.get()` masks text, not screenshots or model pixels
  showing the password. An undeclared name is `INVALID_CONFIG` at load, as is
  the handle (a reference, not the value) in `app.command.env`, a template
  literal, or `context`; read those from `process.env`.
- `reconnectEndpoint` or an attempt-scoped provider rides one persistent
  context without `headers`, `basicAuth`, `userAgent`, `locale`, `timezoneId`, `app.clearState()`, or
  session state. Recovery never repeats a dispatched operation; exhausting
  the budget is `OPERATION_TIMEOUT`. Without `reconnectEndpoint` a dropped
  connection is reacquired at the next attempt.

Two browsers, one app declaration:

```ts
const app = { url: 'http://127.0.0.1:3000' };
export default {
  targets: [
    { name: 'chromium', engine: web(), app },
    { name: 'mobile-webkit', engine: web({ browser: 'webkit', viewport: { width: 390, height: 844 } }), app },
  ],
} satisfies E2EConfig;
```

### Let the runner start the app

Prefer `app.command` to a hand-started dev server: self-contained locally
and in CI.

```ts
engine: web(),
app: {
  url: 'http://127.0.0.1:3000',
  command: {
    executable: 'pnpm',
    args: ['dev'],
    env: { PORT: '3000', DATABASE_URL: process.env.DATABASE_URL ?? '' },
    startupTimeout: 120_000,
    log: '.e2e/logs/app.log',
  },
},
```

- The runner spawns `command`, polls `readyUrl` (default `url`) for a 200 to
  499 status within `startupTimeout` (default 60 s), and stops it when the run
  ends, fails, or is interrupted (`shutdownTimeout`, default 10 s). Never
  ready is `APP_UNREACHABLE`; the run stops before its tests and leaves the
  last run's report and results as they were (`command.log` still gets this
  boot's output).
- In `e2e run`, a command that exits after readiness fails the run with `APP_UNREACHABLE` if a dependent target has unfinished work.
  This includes exit code 0 and termination by a signal.
  The runner interrupts active tests and skips queued tests only for those targets.
  Targets that have finished their work ignore the exit.
  The error labels the command with the first target that declared it, which may have finished already, and reports the command's exit code or signal.
  See the [command reference](https://e2e.com/docs/reference/config#command) for log excerpts and redaction limits.
- The child gets only `PATH`, `HOME`, the temp-directory variables,
  `SystemRoot` and `COMSPEC` on Windows, and `command.env`. Pass the rest
  through `env`, or name host variables in `inheritEnv` (`['DATABASE_URL',
  'STRIPE_*']`); `env` wins over them. Model keys and `E2E_USER_*` values
  are never inherited unless an `inheritEnv` name or prefix matches them.
- Output is discarded unless `log` names a file under an ignored directory
  such as `.e2e/logs/`; without it a server dying on boot is invisible.
- A `url` answering before the spawn is `APP_ALREADY_RUNNING`;
  `command.reuseExisting: true` attaches to a running dev server (CI ignores
  it).
- `executable` resolves on `PATH`, never through a shell; name the server
  itself, not a wrapper script.
- `url: 'http://127.0.0.1:0'` (or `[::1]:0`, never `localhost:0`) takes a
  free port; the command receives it as
  `{port}` in `args` or `env` (`args: ['dev', '--port', '{port}']`), which
  also expands in `readyUrl`. Tests read the URL from `app.baseUrl`; the
  cache identity keeps `:0`. A port-0 `url` with no `command`, and
  `reuseExisting` beside one, are `INVALID_CONFIG`.
  A port grabbed between allocation and spawn fails the start with
  `APP_UNREACHABLE`; rerun.

For an app started elsewhere, point `app.url` at it, literally or via
`process.env.APP_URL ?? 'http://localhost:3000'`; the runner reads no
`APP_URL` and loads no `.env`, so put `process.loadEnvFile('.env')` atop
`e2e.config.ts` (workers re-import it).

## Environment variables the runner reads

| Variable | Effect |
| --- | --- |
| `AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, ... | Read by provider packages, not the runner. |
| `E2E_USER_<NAME>_USERNAME`, `E2E_USER_<NAME>_PASSWORD` | Override `credentials.<name>`; `<NAME>` is the name uppercased, other characters `_`. |
| `E2E_SECRET_<NAME>` | Overrides `secrets.<name>`, same rule. Two entries of one namespace mapping to one variable are `INVALID_CONFIG`. |
| `CI` | CI defaults; list in topic `running`. |
| `E2E_TELEMETRY_DISABLED`, `DO_NOT_TRACK` | Disable anonymous telemetry, as does `e2e telemetry disable`; `E2E_TELEMETRY_DEBUG=1` prints events instead of sending. |

## Mobile targets

`@e2e-dev/mobile` drives iOS simulators, Android emulators, and connected
phones through [agent-device](https://github.com/callstack/agent-device);
needs Xcode with a simulator runtime or the Android SDK with an emulator (a
phone needs Xcode with Developer Mode and runner signing, or adb with USB
debugging authorized); run `npx e2e doctor` to check it. Name a phone in `device` by the name
`npx agent-device devices` lists, not its UDID or serial. On an iPhone, device
settings (permissions, `clearState`, network, location, appearance,
biometrics, keychain) and the clipboard are simulator-only.

```ts
import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { mobileTools } from '@e2e-dev/mobile/tools';
import { gateway } from 'ai';

const iphone = mobile({ platform: 'ios' });

export default {
  targets: [{ engine: iphone, app: { bundleId: 'com.example.app' } }],
  workers: 1,
  agents: {
    default: {
      model: gateway('openai/gpt-6-luna-fast'),
      tools: mobileTools(iphone),
    },
  },
} satisfies E2EConfig;
```

- `app.bundleId`: bundle id, package name, or display name `app.open()`
  launches fresh (an attempt launches nothing itself; without it, the
  installed build). `app.appPath`: the `.app` or `.apk` under test; the
  engine installs nothing, so a fixture every test takes calls
  `device.installApp()` once per device (no path installs `app.appPath`).
  `app.launchArguments` and `app.permissions` ride every fresh launch:
  arguments reach the app process (iOS) or `am start` (Android), permissions
  are set first.
- Expo development build on an iOS simulator: `app.launchArguments:
  ['--initialUrl', 'http://localhost:8081', '-EXDevMenuShowsAtLaunch', 'NO',
  '-EXDevMenuIsOnboardingFinished', 'YES', '-EXDevMenuShowFloatingActionButton',
  'NO']` loads that dev server on every fresh launch, dev menu off;
  `app.command` (`npx expo start --port 8081`) with `readyUrl:
  'http://localhost:8081/status'` starts it.
- Another language on iOS: `app.launchArguments: ['-AppleLanguages', '(fr)',
  '-AppleLocale', 'fr_FR']`, one target per language; the app must ship
  it. Android has no such argument: on a hosted device set `language` and
  `locale` on `browserstack()` or `testmu()`, on a local one set the device's
  language.
- One worker per device. No `device`: every booted simulator or emulator of
  the platform, and every reachable paired iPhone or iPad or connected Android phone, is the pool, up to `workers`,
  minus devices another agent-device session holds (none booted: agent-device boots
  a shut-down one, on iOS an iPhone over an iPad over an Apple TV, on Android a phone or tablet over a TV, then the newest OS, then name order; all held: `prepare` fails); one `device`: one worker whatever `workers` says; a list (`device:
  ['iPhone 17', 'iPhone 17 Pro']`): an explicit pool. Devices boot in
  `prepare`, before the run's clock. Two sessions on one device fight over
  it: for parallel MCP sessions or bug-bash explorers, declare one target per
  device, each naming its `device`.
- `device` can be a `DeviceProvider` leasing hosted devices, one per worker
  slot: `expoSimulators({ buildId })` from `@e2e-dev/eas` takes the project
  from the app config's `extra.eas.projectId` (`projectId` overrides), reads
  `EXPO_TOKEN`, else the `eas login` session, needs no Xcode or Android SDK, and with `buildId` Expo installs
  the app (omit `app.appPath`). A run must fit one session: `maxDurationMinutes`,
  absent, is the account's cap (40 on a standard plan). `videoTouches: false`
  on the engine for video there.
- `limrun()` from `@e2e-dev/limrun` leases one device per worker and installs
  `app.appPath` before tests. Set `LIMRUN_API_KEY` and install `@limrun/api`.
  Android needs `adb` on `PATH` for its tunnel.
  iOS keyboard actions such as `locator.press('Enter')` return
  `UNSUPPORTED_CAPABILITY`; tap an app button when available.
  Limrun's `limrun-inc/testerarmy-e2e-limrun` repository runs the same form
  and restart tests on both platforms.
- `testmu({ device, osVersion, app })` from `@e2e-dev/testmu` leases TestMu
  AI (formerly LambdaTest) emulators, simulators, or real devices
  (`deviceType: 'real'`); `device` and `osVersion` match its catalog
  exactly, TestMu AI installs `app` (omit `app.appPath`), and it reads
  `LT_USERNAME` and `LT_ACCESS_KEY`. An attempt's video links TestMu AI's
  recording of the whole session.
- `browserstack({ device, osVersion, app })` from `@e2e-dev/browserstack`
  leases BrowserStack App Automate real devices; `device` and `osVersion`
  match its catalog exactly, BrowserStack installs `app` (a `bs://` id, an
  `https` URL uploaded once per run, or a local path; omit `app.appPath`),
  and it reads `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY`. Set
  `appiumVersion` (such as `'3.2.0'`): BrowserStack's default Appium 1.x
  lacks `mobile:` commands. An attempt that records video links
  BrowserStack's recording of the whole session.
- `e2b()` from `@e2e-dev/e2b` runs Android 16 in one E2B sandbox per worker
  (Android only, x86_64, no Google Play) and installs the `.apk` at
  `app.appPath` before tests. Set `E2B_API_KEY`; install the `e2b` peer. The
  runner needs no `adb`.
- A control that appeared or moved with the previous action waits out
  `transition` (default 500 ms). Opening or closing the keyboard also uses
  the remaining budget. Screen swipes in tests wait out the remaining budget
  before scrolling. Agent actions settle `settle` ms (default 150) before the
  next observation, `settle: false` skips it.
- Mobile `fill` and `clear` re-read the field before typing, replay included.
  Missing fields, changed security state, or incomplete captures return
  `NODE_STALE` before mutation, then retry after a fresh observation.
  Non-input targets return `UNSUPPORTED_CAPABILITY`; an iOS `other` that holds
  a value or only text is typed into, since a custom-drawn field (Compose
  Multiplatform, Flutter) can read that way.
- A node whose centre the soft keyboard covers is hidden, so
  `scrollUntilVisible` keeps scrolling and `toBeVisible()` fails. The
  keyboard's own keys and dock, the focused field, and a container with a
  child still showing stay visible. A tap on a
  node agent-device finds covered (by an overlay or the keyboard) fails
  `ACTION_FAILED` naming the cover; dismiss it or scroll the target clear.
- `screen`, `expect`, `app`, `agent` work unchanged; `test` from
  `@e2e-dev/mobile` types the `device` fixture (`installApp`, `openLink`,
  `setPermission`, `setNetwork`, `setAppearance`, `clearKeychain`, `fold`
  for a foldable's hinge (iPhone Duo, Android foldable emulators), `locator`, more). Portable suites declare
  `requires: ['device']`.
- `device.unstable_raw` gives the session name, device id and name, a
  `selection` to spread into a call, and a
  raw driver `client` bound to the test's session, for what `device`
  lacks. Client calls are not steps: no report, trace, replay, or secret
  redaction. Unstable: may change or go away in any release.
- A custom tool that needs capabilities e2e does not wrap yet gets the raw
  driver session from `unstable_deviceSession(...engines)`
  (`@e2e-dev/mobile/tools`). Its `client` is typed as
  `DeviceSessionClient` from `@e2e-dev/mobile`. Do not build a client yourself: it would miss
  the engine's daemon, lease, and session.
  Its calls skip e2e's guards like `unstable_raw`: a snapshot or screenshot
  a tool returns is not redacted or masked, even after a secret fill,
  nothing waits for the screen to settle, and a tool that changes the
  device needs `mutates: true`. Unstable like `unstable_raw`.
- `setNetwork('offline')` and `setAirplaneMode(true)` are Android only: on
  iOS both are `UNSUPPORTED_CAPABILITY`, since a simulator shares the Mac's
  network, and `setNetwork('online')` / `setAirplaneMode(false)` do nothing.
  `setNetwork('offline')` turns off Wi-Fi alone and cellular stays up; an
  offline test uses `setAirplaneMode(true)` (Android 11+) under
  `platforms: ['android']` and turns it back off in `afterEach`.
- No `state` capability: `test.setup` and `session` are unavailable; sign in
  per test with `screen` actions or `agent.act`, both fill a `Secret` (topic
  `writing-tests`, Sign-in sessions).
- A deterministic check naming a platform label runs there only:
  `test('...', { platforms: ['ios'] }, ...)`.
- `selectOption`, `setInputFiles`, `scrollIntoView`, `secondaryTap`, and
  `modifiers` on `tap` or `doubleTap` are `UNSUPPORTED_CAPABILITY` on a
  device.
- `device.clipboard()` and `device.setClipboard()` are
  `UNSUPPORTED_CAPABILITY` on an Android build with no clipboard shell
  command (the Android 16 emulator is one); check a copy by pasting into a
  field and reading it back.
- React Native on iOS: checkbox and radio role and state come off the
  accessibility value (`getByRole`, `check()`, `toBeChecked` work); a tab is
  `other` with `selected`, query by test id or label; a plain `View` is a
  leaf, scope to the `ScrollView` or give children test ids.

## Done when

- `npx e2e run tests/example.e2e.ts` passes against the app.
- `package.json` has a script such as `"test:e2e": "e2e run"`.
- `.gitignore` lists the `.e2e/` outputs (init adds them); drop the
  `.e2e/cache/` line to commit replays.
- CI runs the whole suite, agent steps included, on PRs; see `running`.

### Existing MCP registration

Re-running `init` preserves the e2e MCP server's environment and client settings
while repairing its launch command. A current registration is left unchanged.
Codex reads `.codex/config.toml` only in trusted projects; start a new session
after installing dependencies. To add Codex to an existing setup, run the
installed CLI with `e2e init --yes --skills none --mcp .codex/config.toml`.
