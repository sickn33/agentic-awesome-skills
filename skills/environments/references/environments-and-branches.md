# Environments, the verified mapping, branches, operator commands, and showing development

## The environments

A split to copy into the product's environments doc:

| | Development | Production |
|---|---|---|
| App | `next dev` on `localhost:3000`, and a development site if the owner tests on a deployed URL | Netlify, from the production branch (`release-gate`) |
| Identity | the identity provider's **development** instance (on Clerk, `pk_test_…` keys) | its production instance, with its own keys (`clerk-production`) |
| Data | a database project `<dev-ref>` of its own (or, by the owner's choice, a branch of production) | the production project `<prod-ref>` |
| Configuration | `.env`, never committed | the host's site environment variables (Netlify does not read `.env`) |

- **The app refuses a partial configuration**: the env schema fails the build and the boot when a required value is missing (`variables.md`).
- **Never pair one environment's identity instance with the other's database**, even for a day. Each sign-in writes rows keyed to that instance's user ids, and they mean nothing to the other one. (`2026-10-23`, a monitoring product: while its production site ran on development identity keys, nobody was allowed to sign in there.)
- **A background job that runs against the development database is scoped away from the test suites' data**, or it acts on their fixtures and races their assertions. (`2026-10-22`, a monitoring product's development worker boxes were checking the suites' fixtures, about 90 real checks per gate run, until they were limited to named workspaces.)
- **The browser suites build into their own directory and serve on their own fixed port** (`3101`, for example), so they never fight a `next dev` you have open — Next refuses two dev servers in one repository (`test-harness`).
- **Every `<…>` in the environments doc is filled in by the stage that creates the thing.** A line still holding a placeholder is a thing that has not happened yet — which makes the doc honest about what exists.

## Recording the verified mapping

**Record here the mapping you verified, with the date it was checked and the command that showed it.** Which project, branch or instance each environment uses, and each database's major version.

- **A development branch can hide.** On Supabase, a development *branch*, where the owner chose one, is a child of the production project and never appears in `supabase projects list`; the owner's read of the production project's branches (the dashboard, or `supabase branches list --project-ref <prod-ref>` on a time-boxed read-only token) shows it, and which git branch it is bound to (`supabase-production`).
- **Never infer the target from a per-machine config file.** An MCP server's configuration, a CLI link or similar is gitignored, per machine, and the last thing it named may have been production. Check its URL before believing any answer it gives about schema. (`2026-09-16`, an MCP configuration named production while migration writes through it were still allowed.)
- **Mappings move.** (`2026-09-15`, a product's former development database was promoted to production and a new development branch created.) A mapping in the doc is a receipt for the day it was checked, not a fact about today.
- **Once the product runs more than its host builds** (a Worker, a box, a database login per component), **the mapping becomes an inventory**: every account, machine, runtime and its bindings, hostname, and operator checkout, per environment. Read it from the providers' APIs by name, dated; compare values in memory and never write one down. (`2026-10-24`, a monitoring product's infrastructure pass read its inventory from four providers' APIs, and found credentials shared between environments that no doc had mentioned.)
- **At go-live**, the doc records the verified production mapping with its date; that line is part of go-live's done-when (`release-gate`, `references/go-live.md`).

## Branches

- **The product branch** (`<product>`) is where stage work lands. **The production branch** (`<product>-prod`) — fast-forward only, after the local gate, the independent review and a human **go** — is what the host deploys to production (`release-gate`).
- **Until the production branch exists, the host deploys the product branch itself**, so every push to it needs a review round first (`release-gate` § Deploying pushes and production promotions).
- **At go-live the product branch becomes a branch deploy: scope its environment to the development values**, or it starts writing to production. Pin it before production's values go in, and deploy production again after they do (`release-gate`, go-live step 3). On Netlify that is a per-branch value (the *Branch deploys* deploy context, or a value for one named branch), which every plan has; only *scopes* (Builds, Functions, Runtime) are a paid feature (Netlify's environment-variable docs, read 2026-10-25).
- **Or run two sites, each building only its own branch**, with deploy previews and branch deploys off: then no build of the product branch can ever exist on the production site. Netlify ignored `skip_prs` and `allowed_branches` when a site was created through its API, so set them right after creation and read them back. (`2026-10-23`, a monitoring product chose two sites; both were created through the API, with those settings applied after creation.)
- **The names are written once**, in the product's release doc, at the first push.
- **If the repository is itself a starter that products are copied from**, its `main` is the reusable starter and never a product's production line; in a product made from it, `main` is usually the product branch.
- **A database integration bound to a git branch** (Supabase's GitHub integration) may run migrations on push: record which branch it is bound to, and whether it applies migrations, with the date it was read (`migrations-window.md`).

## Operator commands

The scripts an operator runs against an environment (migrate, deploy a Worker, provision a box, rotate a key) are where a wrong target does the most damage, so they hold these rules in code.

- **The checkout picks the environment.** Scripts read `.env` from the directory they run in, so keep one operator checkout per environment, and say in each command's output which one it is. **Production's checkout sits at the production branch's tip**, detached, and every command that builds or deploys a bundle there refuses a tree that is not that tip or has local changes: a promotion moves the branch, not the checkout. (`2026-10-24`, a monitoring product: a deploy from the production checkout shipped the previous release's code, and its status check, run against the same old tree, still read current.)
- **No production default.** A configuration that names no target is refused before any request is made; it never falls back to production's names. (`2026-10-24`, the same product: both environments share one DNS zone, and an operator configuration naming no host would have repointed production's records.)
- **Refuse any option a command does not read**, per command, rather than ignoring it. (`2026-10-24`, the same product: `sender-deploy --dry-run` ignored the flag and deployed development's Worker for real; a later review found one shared list of allowed options let `--project-ref <other>` through a command that never read it.)
- **Never echo a value**, in output or in a refusal: an echoed `--name=value` prints whatever was pasted there, a connection string's password included. (`2026-10-24`, a review of the same tooling.)
- **A secret goes in on stdin, or by naming the variable that holds it**, never as an argument: arguments land in shell history and process listings (`variables.md § Setting values on the host`).

## Showing development to the owner

For the owner's preview (`release-gate` § The owner's preview), when the change is not on a deployed development URL: **a Cloudflare quick tunnel to your `next dev`.**

```sh
cloudflared tunnel --no-autoupdate --url http://localhost:<port>
```

It prints a random `https://<words>.trycloudflare.com` address that answers for as long as the command runs. It needs the `cloudflared` binary and nothing else: no account, no DNS.

- **`next dev` refuses its dev resources (HMR, chunks) to an origin it does not know**, so through the tunnel the page never hydrates and the identity provider's scripts never load. Allow the tunnel's domain in `next.config.ts`; only `next dev` reads the setting, so production is unchanged. If the product does not have it yet, add it with its reason:

  ```ts
  // A Cloudflare quick tunnel shares `next dev` with the owner; without this,
  // `next dev` refuses its scripts to the tunnel's address and the page never hydrates.
  allowedDevOrigins: ["*.trycloudflare.com"],
  ```

  **The wildcard is an accepted risk, said out loud.** It trusts every `*.trycloudflare.com` host, not only yours, whenever `next dev` runs: a page someone else serves through a quick tunnel, opened in your browser meanwhile, can load your dev server's scripts. That is accepted because it takes a targeted lure and reaches development only, while naming each tunnel's own host would mean editing the config at every preview.
- **Sign-in works through the tunnel** with Clerk's development instance (observed `2026-10-22`).
- **The address is public: anyone holding it reaches the development app**, on development keys and the development database. So:
  - **tunnel development only**, never anything that holds production data;
  - **send the link to the owner and nowhere else** — never in a commit, a doc, an issue or a public channel;
  - **never put it into a deployed runtime's configuration**: a link base such as `APP_URL` set to a tunnel address bakes it into every link that runtime sends, and they all break when the tunnel closes (`2026-10-24`, a monitoring product's development Worker had been deployed with a tunnel address as its link base);
  - **when the owner is done, stop the tunnel and the dev server, and say so.**
- **In a worktree whose `node_modules` is a junction** to another checkout, Turbopack will not run: start the server there with `next dev --webpack` (`test-harness`, `references/rules-from-bugs.md § Servers, builds and worktrees`).
