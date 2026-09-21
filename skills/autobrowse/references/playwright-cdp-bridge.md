# Playwright ↔ Browserbase bridge — patterns the upstream skill doesn't cover

This file covers patterns specific to **running Playwright against a Browserbase
session over CDP**. The upstream Playwright reference (e.g. the Currents.dev
best-practices skill at `/tmp/playwright-skill/SKILL.md` if cloned, or
`https://playwright.dev/docs`) covers the general API — locators, auto-waiting,
error testing, framework patterns — but doesn't document the Browserbase
wiring. This is the canonical reference for codegen targets that produce
Playwright (or Playwright-API-compatible) scripts.

## 1. `connectOverCDP` to a freshly-created Browserbase session

The emitted script **creates its own fresh Browserbase session** at startup.
Don't try to attach to whatever session autobrowse was on — autobrowse
releases each iteration's session before the script ever runs, so there's no
surviving session to reuse anyway. More importantly: the emitted script must
be self-contained. Anyone who downloads it should be able to run it locally
with just `BROWSERBASE_API_KEY` set — no implicit dependency on autobrowse
state.

Pattern is always: **create → connect → use → release.**

```typescript
import { chromium, type Browser } from "playwright";
import { execFileSync } from "node:child_process";

function createSession() {
  // `browse` is on PATH after `npm install -g browse`. The CLI returns a
  // JSON envelope with `id` + `connectUrl`. The flags below match what
  // autobrowse uses for stealth; drop --verified or --proxies for
  // low-anti-bot sites.
  const stdout = execFileSync("browse", [
    "cloud", "sessions", "create",
    "--keep-alive", "--verified", "--proxies",
  ]).toString();
  return JSON.parse(stdout) as { id: string; connectUrl: string };
}

async function connect(connectUrl: string) {
  const browser = await chromium.connectOverCDP(connectUrl);
  const [context] = browser.contexts();
  const page = context.pages()[0] ?? await context.newPage();
  return { browser, page };
}

function releaseSession(sessionId: string) {
  // Fire-and-forget; the CLI handles network errors gracefully.
  execFileSync("browse", [
    "cloud", "sessions", "update", sessionId,
    "--status", "REQUEST_RELEASE",
  ]);
}

// Skeleton for main():
//   const session = createSession();
//   try {
//     const { page } = await connect(session.connectUrl);
//     // … do the work on page …
//   } finally {
//     // Do NOT call browser.close() — connectOverCDP tears down the remote
//     // session prematurely. Release via the CLI instead:
//     releaseSession(session.id);
//   }
```

**Do not** call `browser.close()` on a `connectOverCDP` attachment — it tears
down the remote session prematurely and can leak underlying Browserbase
resources. Always release with
`browse cloud sessions update <id> --status REQUEST_RELEASE` in the `finally`
block.

## 2. React-fill DOM workaround

Some React-controlled inputs ignore `page.fill()` because their `onChange`
listener is bound to a synthetic React-managed value. Stripped values,
autocompletes that don't fire, validators that don't trigger — symptoms of
this. The fix is to set the value via the native DOM setter so React picks
it up.

```typescript
import type { Page } from "playwright";

async function fillField(page: Page, selector: string, value: string) {
  const locator = page.locator(selector);
  await locator.click();
  await locator.evaluate((el: HTMLInputElement, v: string) => {
    const setter = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(el), "value",
    )?.set;
    setter?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}
```

Use this when `page.fill()` worked in the autobrowse iteration but the value
gets stripped on submit (common on React-heavy form wizards).

## 3. `snap()` screenshot helper — the convention codegen expects

When verify runs the script, the runner sets a `SCREENSHOT_DIR` env var per
attempt. The script can write progress + failure screenshots there so a
human (or a future LLM rewrite pass) can debug. Every emitted script should
include this helper.

```typescript
import type { Page } from "playwright";
import { join } from "node:path";

async function snap(page: Page, label: string) {
  const dir = process.env.SCREENSHOT_DIR;
  if (!dir) return; // local-run no-op, so engineers don't trip on missing dirs
  await page.screenshot({
    path: join(dir, `${label}.png`),
    fullPage: false,
  });
}
```

**Call it at:** the initial page load (`01-landing`), after each meaningful
step (`02-form-filled`, `03-submitted`, etc.), at the converged final state
(`08-success`), and inside a top-level
`try { ... } catch (err) { await snap(page, \`99-error-at-${currentStep}\`); throw err }`
wrapper so failures always capture the failure-state DOM.

**Naming convention:** zero-padded numeric prefix + kebab-case label, all
lowercase. Sorting by filename gives iteration order.

## 4. Schema-validated output (Zod)

The script's last action on stdout must be a single JSON line that the runner
can parse:

```typescript
import { z } from "zod";

const OutputSchema = z.object({
  // … task-specific fields …
});

// At end of main(), after successful extraction:
const output = OutputSchema.parse({ /* extracted data */ });
console.log(JSON.stringify({ success: true, data: output }));
```

On failure, exit non-zero AND emit `{"success":false,"error":"..."}` so the
runner can distinguish "script ran cleanly but didn't find data" from
"script crashed".
