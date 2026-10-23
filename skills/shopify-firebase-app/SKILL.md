---
name: shopify-firebase-app
description: "Scaffold, extend and deploy Shopify embedded apps on Firebase with Nitrogen. Use for a Shopify app on Cloud Functions, Firestore and Hosting, or inside a Nitrogen project."
category: development
risk: critical
source: community
source_repo: mksd0398/nitrogen
source_type: community
date_added: "2026-10-23"
author: mksd0398
tags: [shopify, shopify-app, firebase, cloud-functions, firestore, polaris, app-bridge]
tools: [claude, cursor, codex, copilot, gemini]
license: "MIT"
license_source: "https://github.com/mksd0398/nitrogen/blob/master/LICENSE"
---

# Shopify Apps on Firebase, with Nitrogen

## Overview

Nitrogen (`npx @mksd0398/nitrogen`) scaffolds a Shopify embedded app on Firebase. It has one Cloud Function (gen 2, Node.js 24) per API resource, in TypeScript or JavaScript, plus Firestore, Hosting and Secret Manager. Its pages are plain HTML built from Polaris web components and App Bridge, with no build step. An app is single- or multi-tenant, and every generated project has a test suite.

Two rules come before anything else:

- **Working inside an app?** Read its `AGENTS.md` first; it is the project's own guide. Apps made before Nitrogen 3.4 have none, so read [references/app-guide.md](references/app-guide.md) instead. It is the same guide, written for TypeScript; a JavaScript app has `.js` files.
- **Building UI?** Use [references/polaris.md](references/polaris.md) for every Polaris web component, and [references/app-bridge.md](references/app-bridge.md) for the `shopify` global. Never use Polaris React or `@shopify/app-bridge-react`.

Adapted from the [upstream skill](https://github.com/mksd0398/nitrogen/tree/master/skills/shopify-firebase-app) (MIT). Nitrogen is an independent project, not affiliated with or endorsed by Shopify or Google.

## When to Use This Skill

- Use when someone wants a Shopify app on Firebase (Cloud Functions, Firestore, Hosting), or a Shopify app without Remix, React Router or a server.
- Use when they mention Nitrogen or `npx @mksd0398/nitrogen`.
- Use when working in a Nitrogen project, recognisable by `functions/src/api/`, `web/*.html` pages with `<s-app-nav>`, and an `AGENTS.md` that names Nitrogen.
- Use it to create such an app, to add APIs, webhooks, pages, scopes or Firestore data to one, and to deploy it.
- Do not use it for Shopify apps built on Remix or React Router, such as those from `shopify app init`.

## How It Works

### Step 1: Get what only the user can give

Inspect existing authorized project configuration and account context first. Ask only for missing decisions; never invent identifiers or request secrets in chat.

| You need | Where the user finds it |
|---|---|
| Shopify client ID and secret | The app's settings in the Shopify Dev Dashboard. Create the app there first if it does not exist. |
| A Firebase project ID | An existing project, or a new id (6 to 30 characters: lowercase letters, digits, hyphens) for you to create with `--create-project`. |
| The Blaze plan on that project | `https://console.firebase.google.com/project/PROJECT_ID/usage/details`. Functions and Secret Manager need it. It is pay as you go, with a free monthly allowance. |
| One store, or any store | One store makes it single-tenant (`--shop=STORE.myshopify.com`). Any store makes it multi-tenant (leave `--shop` out). |
| Where the data lives | A Firestore location such as `us-central1` or `europe-west1`. It cannot be changed later, so ask. |

Choose the scopes from the feature yourself. Keep `read_products` only if the requested starter/product UI actually needs it; remove unused starter pages instead of retaining unnecessary access, and add what the feature needs: orders need `read_orders`, and so on. Add `write_` scopes only for what the app changes.

Use the host's approved interactive authentication flow for: `firebase login` now, and `shopify auth login` before the first `shopify app deploy`.

Ask the user to save the client secret to `secret.txt` in the folder you will run the CLI from, which is outside the app. Do not ask them to paste it into the chat, and never print it. Once it is stored in Secret Manager, they can delete the file.

### Step 2: Scaffold

The scaffolder is third-party executable code with package-install, cloud-provisioning and Git-commit effects. Review the selected version and its dependency/lifecycle behavior before execution; use an isolated new project directory. `--skip-provision` is only a cloud-provisioning switch, not a sandbox or a guarantee of no local/network side effects. Do not run a provisioning path until the intended Firebase project, region, billing and resource effects are authorized. Store `secret.txt` outside Git/synced folders with owner-only permissions and no tracing; environment variables are not immune to child-process/log disclosure. Unset the secret after use and remove the temporary file once secure storage is verified.


There is no terminal to answer the wizard's questions in, so pass every answer as a flag:

```bash
IFS= read -r SHOPIFY_API_SECRET < secret.txt  # Private file; disable tracing; no newline in the value
export SHOPIFY_API_SECRET
npx "@mksd0398/nitrogen@${NITROGEN_VERSION:?Set the approved reviewed version}" my-app \
  --api-key=CLIENT_ID \
  --project-id=PROJECT_ID \
  --firestore-region=us-central1 \
  --scopes=read_products,read_orders
```

| Flag | Use it when |
|---|---|
| `--create-project` | The Firebase project does not exist yet. |
| `--shop=STORE.myshopify.com` | The app is for one store. |
| `--language=javascript` | The user wants JavaScript. TypeScript is the default. |
| `--region=REGION` | The functions should run somewhere other than next to Firestore. |
| `--overwrite` | `my-app` exists and the user said to replace it. |
| `--skip-provision` | A trial run that touches nothing in Firebase. For a real app, leave it out. |

Run it from the parent folder; it creates `my-app/`. It stops with exit code 1 when a flag is missing or the folder already has files, and says why. It never replaces the folder it runs from. `--no-deploy` and `--skip-shopify` belong to the interactive wizard and do nothing here.

What it does: it creates Firestore and a Firebase web app (both only with `--firestore-region`), stores the secret in Secret Manager, installs dependencies, builds, runs `git init` and commits. It does not deploy, and "All done" means the scaffold is done.

Read its output for these warnings. Run the commands from inside `my-app`.

- **"Firebase project … not found in your account".** Either the project does not exist, so ask the user whether to create it (`firebase projects:create PROJECT_ID --display-name "App name"`), or they are signed in to another Google account (`firebase login:list`). Then set up Firebase by hand, as below.
- **"This project is on the Spark (free) plan".** The user upgrades to Blaze. Then store the secret: `firebase functions:secrets:set SHOPIFY_API_SECRET --data-file=../secret.txt --project=PROJECT_ID`.
- **"Could not store the Client Secret".** Run that same command once the project is on Blaze.

When the setup was skipped, or stopped early, finish it by hand:

```bash
firebase firestore:databases:create "(default)" --location=LOCATION --project=PROJECT_ID
firebase functions:secrets:set SHOPIFY_API_SECRET --data-file=../secret.txt --project=PROJECT_ID
```

### Step 3: Deploy and install

```bash
cd my-app
cd functions && npm test && cd ..
firebase deploy --project PROJECT_ID
shopify app deploy
```

`firebase deploy` ships the functions, the pages and the Firestore rules. `shopify app deploy` sends `shopify.app.toml` to Shopify: the app URL, scopes and webhook subscriptions. The user then installs the app from the Dev Dashboard onto a development store. `https://PROJECT_ID.web.app/auth?shop=STORE.myshopify.com` also works.

### Step 4: Change an app

Follow the app's `AGENTS.md`. These are the steps agents miss most:

- **A new API** needs its file in `functions/src/api/`, an export in `functions/src/index`, and two rewrites in `firebase.json`. The rewrites use the lowercase export name and the same region as the others. `npm test` fails if the three disagree.
- **A new scope** goes in `shopify.app.toml` and `functions/.env`, then needs `shopify app deploy`. Merchants approve it the next time they open the app.
- **Orders and customers** are protected customer data. The user selects the data the app uses in the Partner Dashboard, under the app's API access; apps made in the Dev Dashboard are listed there too. Until then, Shopify refuses order and customer webhooks, even on a development store.
- **A new Firestore collection** is keyed by `tenantId(ctx.app, ctx.shop)` and listed in `TENANT_DOCS` or `TENANT_FIELD` in `functions/src/webhooks`. That way `shop/redact` deletes it.
- **A new page** needs its link added to the `<s-app-nav>` of every page, because each page carries its own copy.
- **A new webhook topic** reaches the app only after `shopify app deploy`.

Run `cd functions && npm test` after every change, and before every deploy.

## Examples

### Example 1: A one-store JavaScript app on a new Firebase project

The user gave the client ID, a new project id, their store and the location `europe-west1`, and saved the secret to `secret.txt`. The feature reads orders.

```bash
IFS= read -r SHOPIFY_API_SECRET < secret.txt  # Private file; disable tracing; no newline in the value
export SHOPIFY_API_SECRET
npx "@mksd0398/nitrogen@${NITROGEN_VERSION:?Set the approved reviewed version}" my-app \
  --api-key=CLIENT_ID \
  --project-id=PROJECT_ID \
  --create-project \
  --shop=STORE.myshopify.com \
  --language=javascript \
  --firestore-region=europe-west1 \
  --scopes=read_products,read_orders
```

Orders are protected customer data: Shopify refuses order webhooks until the user selects that data in the Partner Dashboard.

### Example 2: Add an API resource

1. Create `functions/src/api/<name>.ts`, starting from `functions/src/api/status.ts`. A route returns the JSON to send, or throws `HttpError(status, message)`.
2. Export it from `functions/src/index.ts`.
3. Add rewrites for `/api/<name>` and `/api/<name>/**` to `firebase.json`. `serviceId` is the export name in lowercase; `region` is the same as the other rewrites.
4. Add tests next to `functions/test/api.test.js`, which shows how to sign a session token and stub Shopify.

```bash
cd functions && npm test && cd ..
firebase deploy --project PROJECT_ID
```

### Example 3: Add a webhook

1. Subscribe in `shopify.app.toml` with a `[[webhooks.subscriptions]]` block, using the same `uri` as the others.
2. Handle its topic in the `switch` in `functions/src/webhooks.ts`. Answer within 5 seconds.
3. Deploy the function, then send the subscription to Shopify:

```bash
firebase deploy --only functions:webhooks
shopify app deploy
```

## Best Practices

- ✅ Read the app's `AGENTS.md` before changing it.
- ✅ Take the shop and the app from what was verified, `ctx.shop` and `ctx.app`, never from a request's body, query or headers.
- ✅ Treat a missing signature, session token or body as a refusal.
- ✅ Keep the client secret only in Secret Manager, and in `functions/.secret.local` for the emulator, which git ignores.
- ✅ Reach Firestore only through functions, and keep `firestore.rules` denying every client.
- ✅ Run `cd functions && npm test` after every change, and before every deploy.
- ❌ Don't use Polaris React or `@shopify/app-bridge-react`.
- ❌ Don't loosen any check in `functions/src/verify`.
- ❌ Don't invent the client ID, the secret or the Firebase project, and don't ask for the secret in the chat.

## Deployment and data checks

Before any authorized deploy, inspect the actual generated source and dependencies, not just scaffold success. Test invalid/expired/wrong-audience tokens, raw-body webhook HMAC, replay/idempotent webhook handling, cross-tenant reads/writes and redaction coverage. Verify JWT signature, issuer, audience, time claims and tenant binding server-side; deny-client Firestore rules do not constrain Admin SDK code. Public invocation allows requests to reach the verifier; it is never a replacement for authentication. Confirm requested app/project/store and preserve existing resources. Tests passing does not independently prove these properties or authorize deployment.

## Limitations

- Cloud Functions and Secret Manager need the Blaze plan. Only the user can upgrade the project.
- Authentication requires a supported interactive host/browser flow; do not guess account identity or expose credentials.
- The Firestore location cannot be changed after it is created.
- Shopify refuses order and customer webhooks until the user selects protected customer data in the Partner Dashboard.
- Hosting ends a rewritten request at 60 seconds, whatever `timeoutSeconds` says.
- Apps made before Nitrogen 3.4 have no `AGENTS.md`; use [references/app-guide.md](references/app-guide.md) for them.
- Stop and ask when a value only the user can give is missing.

## Security & Safety Notes

- The scaffold changes the user's Firebase project: with `--firestore-region` it creates Firestore and a Firebase web app, and it stores the client secret in Secret Manager. `--create-project` and `firebase projects:create` create a project; use them only with the user's go-ahead. `--skip-provision` is a trial run that touches nothing in Firebase.
- `firebase deploy --project PROJECT_ID` ships functions, pages and Firestore rules to the live project, and `shopify app deploy --allow-updates` sends the URL, scopes and webhook subscriptions to Shopify. Run them when the user has asked for a deploy, after `npm test` passes.
- Do not add Firebase `--force`: it can suppress function-deletion confirmation. Inventory existing resources and use `--only` for the intended functions/hosting/rules where possible, with the explicit target project. Review deletions before deployment.
- `--overwrite` replaces an existing `my-app` folder. Pass it only when the user said to replace it.
- The secret is loaded through the process environment rather than a CLI argument. It may still be exposed by tracing, child processes or logs; restrict file permissions, avoid output and unset it after setup.
- Use the approved pinned Nitrogen version; a package name/version pin alone is not a review of its transitive dependencies.

## Common Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| `There is no terminal to ask the setup questions in` | The wizard needs a terminal | Pass the flags in Step 2 |
| `"my-app" already has files in it` | The folder exists | Use a new name, or `--overwrite` if the user agrees |
| `Firebase project "…" not found in your account` | It does not exist yet, or the user is signed in to another account | Create it with the user's go-ahead, or check `firebase login:list`; then finish the setup by hand |
| Deploy says billing or the Blaze plan is required | The project is on Spark | The user upgrades; then store the secret as in Step 2 |
| The Dashboard says it could not load store information | `read_products` was dropped from the scopes | Put it back |
| Deploy asks for `SHOPIFY_API_SECRET` | The secret was never stored | `firebase functions:secrets:set SHOPIFY_API_SECRET --data-file=../secret.txt` |
| `/api/x` answers 404 from Hosting | The export and rewrite disagree, or the regions do | `npm test` names the mismatch |
| Google's 403 page instead of JSON | `invoker: "public"` was removed | Inspect Hosting/function invocation configuration and application authentication before any IAM/public-exposure change |
| Every call answers 429 `Rate exceeded.` just after billing was enabled | Google is still applying billing | Wait; it has taken 25 minutes |
| A GraphQL call says access denied | A scope is missing or not yet approved | Add it as in Step 4. If it persists, inspect the token/installation state; do not delete sessions as a blind fix |
| `shopify app deploy` refuses an order or customer webhook | Protected customer data is not selected | The user selects it in the Partner Dashboard |

## Additional Resources

- [Nitrogen on GitHub](https://github.com/mksd0398/nitrogen) (MIT licence)
- [`@mksd0398/nitrogen` on npm](https://www.npmjs.com/package/@mksd0398/nitrogen)
- [Upstream skill](https://github.com/mksd0398/nitrogen/tree/master/skills/shopify-firebase-app), also installable with `npx skills add mksd0398/nitrogen`
- Bundled references, copied from the upstream skill: [Polaris web components](references/polaris.md), [App Bridge](references/app-bridge.md), [App guide](references/app-guide.md)
