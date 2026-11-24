# Troubleshooting

Symptoms seen when running ui-diff on real apps, and what to do. Logs are in `.ui-diff/logs/`
(`server-base.log`, `server-head.log`, `install-*.log`).

## The dev server never becomes ready

- **Vite, SvelteKit, Astro (anything that binds `localhost`).** On many machines `localhost` is
  IPv6 `::1` only, so `http://127.0.0.1:{port}` never connects. Use
  `"baseUrl": "http://localhost:{port}"`.
- **The app ignores the port.** `startCommand` must pass `{port}` (`--port {port}`, `-p {port}`)
  or the app must read `PORT`. If the log shows it listening on another port, fix the command.
- **It is just slow** (first compile, big monorepo): raise `startTimeoutMs`.
- **It answers 500.** Read `server-*.log`: usually a missing env var (add it to `copyFiles` or
  `env`) or a build error on that commit.

## Next.js

- Use `"baseUrl": "http://localhost:{port}"`. Next.js blocks its dev resources for `127.0.0.1`
  (`Blocked cross-origin request … from "127.0.0.1"` in the server log), so pages never hydrate:
  client components stay empty and `actions` / motion clicks do nothing.
- Turbopack does not accept symlinked `node_modules`, so worktrees get hard-linked copies of an
  existing install instead: install your checkout's dependencies first (CI does) and a worktree
  whose lockfile matches needs no install of its own. Hard links need the worktrees (system temp
  directory) on the same file system as the checkout; otherwise the files are copied.

## "No UI changes" or files listed as `unmatched`

- Check the `reasons` of `ui-diff detect`. Components reach routes through imports; if your import
  aliases are not in `tsconfig.json`/`jsconfig.json` `paths` (for example only in
  `vite.config.ts`), add them to `detect.aliases`: `{ "@/": "src/" }`.
- Map shared code explicitly with `routes[].files` or `globalFiles`, or pass `--routes`.
- Dynamic routes are listed in `needsExample`; pass a real path (`--routes /blog/hello-world`).
- Paths in the config are relative to the config file and use `/`.

## Captures differ when nothing changed

- **Carousels, tickers and other JavaScript animations** are not frozen by the CSS rules. Mask
  them (`capture.mask`), hide them (`capture.hide`), or have them respect
  `prefers-reduced-motion`, which ui-diff turns on.
- **Live data** (timestamps, counters, "x minutes ago"): `Date` is frozen by default (`freeze.clock`);
  data that changes without the clock (a counter fetched from an API, a ticker) needs a `capture.mask`
  with a stable size (`font-variant-numeric: tabular-nums`).
- **Fonts that arrive late** (slow font files, `new FontFace(...)` in a timeout) are waited for
  until none is loading, up to `freeze.fontTimeoutMs` (8 s). A font that never loads is listed as
  failed or still loading in the capture settings; one requested later than that needs a `waitFor`
  selector that appears once it is applied.
- A warning "page did not settle" means consecutive screenshots of one side kept changing.

## Changes far down a page are missing

Pages taller than `capture.maxHeight` (4000 px) are cut; the report and the comment say so. Raise
`capture.maxHeight` (up to 16000) for long pages.

## Chromium

- First run downloads Chromium (~150 MB). Offline or behind a proxy: set `HTTPS_PROXY`, or a mirror
  with `PLAYWRIGHT_DOWNLOAD_HOST`, or use an installed Chrome with `UI_DIFF_BROWSER_CHANNEL=chrome`.
- Linux without browser libraries: `npx --prefix <skill folder> playwright install --with-deps chromium`.

## Publishing

- **"This repository is public"**: screenshots would be public. Use `--no-upload` for a
  text-only comment, or `--allow-public-repo` only after the user confirms.
- **"Could not verify that the repository is private"**: `gh auth login` (or `GH_TOKEN`), or
  `--assume-private` when you are sure.
- **"Cannot derive image links"**: there is no GitHub remote. Add one, set `publish.linkBase`, or
  preview locally with `ui-diff render`.
- **Exit code 3 on push**: no write access (fork PR, read-only token). Use `--no-upload`.

## Windows

Run ui-diff inside WSL2. The scripts rely on POSIX process groups and `install.sh` is a bash script.
