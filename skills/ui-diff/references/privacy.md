# Privacy, image hosting and protected previews

Target repositories are private company code, and screenshots of them are just as sensitive:
unreleased features, customer data in fixtures, internal tools. ui-diff is built so images never
leave the repository's own access control.

## Where images go (default: orphan branch in the same repo)

GitHub has no API for the drag-and-drop uploads used in comments, so `publish` commits the images
to an orphan branch, `ui-diff-assets`, of the **same repository** and links them as

```
https://github.com/<owner>/<repo>/raw/ui-diff-assets/pr-<n>/<comment-id>/<run>/<file>.png
```

In a private repository GitHub serves these only to signed-in users who can read the repo (the
request is redirected to a short-lived tokenized URL), so the comment shows images to exactly the
people who can see the PR. Nothing is sent to imgur, gists, Slack, S3, a CDN or any other host;
the skill has no code path for third-party uploads.

How it is written:

- Git plumbing with a temporary index and a private ref (`refs/ui-diff/*`, deleted afterwards):
  your working tree, index, branches and stash are never touched.
- The branch is a single parentless commit, replaced on every publish with `--force-with-lease`
  (concurrent publishers retry instead of overwriting each other). Files of other PRs are carried
  over, so their links keep working; older runs of the same PR are removed (`publish.keepRuns`).
- `publish` checks the repository's visibility with `gh` first. Public repo → refused unless
  `--allow-public-repo` / `publish.allowPublicRepo`. Unknown visibility → refused unless
  `--assume-private`. Internal (enterprise) repos → allowed with a warning, because every member of
  the enterprise can read them.
- `ui-diff prune --closed` (or `--pr <n>`) deletes images of closed PRs.

### Trade-offs

| | Orphan branch (default) | Text-only (`--no-upload`, `publish.mode: "none"`) | CI artifact | Manual drag-and-drop |
|---|---|---|---|---|
| Who can see images | Repo readers only | No images in the comment | Repo readers (Actions artifact) | Repo readers (private-repo attachments) |
| Inline in the PR | Yes | No | No, link only | Yes |
| Automatable | Yes | Yes | Yes | No |
| Lifetime | Until pruned or the branch is deleted | — | Artifact retention (default 90 days) | Indefinite |
| Cost | Branch is fetched by full clones; kept small (single commit, pruning) | None | Storage quota | None |

Things to know about the default:

- **Same audience as the code.** Anyone with read access (including outside collaborators and
  read-only bots) can open the images. Forks of the repository copy branches that exist when the
  fork is made.
- **Clones.** `git clone` fetches all branches, so the current assets snapshot is downloaded by
  full clones. Keep it small with `keepRuns: 1` (default) and `prune --closed`; history is not
  accumulated because the branch is a single commit. CI checkouts with `fetch-depth: 1` fetch only
  one branch.
- **Deletion.** Removing files from the branch hides them from the branch tip; GitHub may keep
  unreachable objects for a while and cached raw URLs can live for minutes. Treat anything that
  was pushed as shared with repo readers. If a screenshot leaked something it should not have,
  delete the branch and contact GitHub support to purge cached objects, as with any pushed secret.
- **Mobile apps / email notifications.** GitHub Mobile and notification emails may not render
  images from private repos; reviewers open the PR in a browser.
- **Write access needed.** Pushing the branch needs `contents: write`. PRs from forks usually have
  read-only tokens; use `--no-upload` or attach images manually.
- **GitHub Enterprise Server** works the same way; set `publish.linkBase` if your instance serves
  raw files from a different host.
- **Separate assets repo.** If you do not want the branch in the code repo, point `publish.remote`
  at another private repository with the same audience and set `publish.linkBase` to its raw URL
  prefix. Reviewers then need read access to that repository too.

## Protected preview deployments

To capture previews behind Vercel Authentication, password protection, Cloudflare Access, basic
auth or an SSO proxy, configure credentials that the capture browser attaches to requests:

```json
{
  "preview": { "base": "https://app-git-main-acme.vercel.app", "head": "https://app-git-feature-x-acme.vercel.app" },
  "auth": {
    "headers": [{ "name": "x-vercel-protection-bypass", "env": "VERCEL_AUTOMATION_BYPASS_SECRET" }],
    "cookies": [{ "name": "_vercel_jwt", "env": "VERCEL_JWT" }]
  }
}
```

Rules ui-diff enforces:

- **Values only from environment variables.** The config holds variable *names*; a value-shaped
  string is rejected by the schema. Missing variables fail the run with a clear message.
- **Headers scoped to the preview origins.** Only matched requests receive configured headers.
  The authenticated request does not follow redirects with those headers. Use the final HTTPS
  preview URL if a redirect reaches another page that needs credentials. Cookies use browser scope
  rules. Leave the domain unset for preview hosts and review any explicit cookie domain before use.
- **No links with secrets.** ui-diff never creates Vercel Shareable Links or protection-bypass
  URLs, and refuses preview URLs carrying credentials or token-like parameters
  (`x-vercel-protection-bypass`, `_vercel_share`, `token`, `jwt`, `sig`, …), because URLs end up in
  logs, reports and PR comments.
- **Redaction.** Secret values are registered at startup and replaced with `[redacted]` in logs,
  errors and every file ui-diff writes; reports only contain sanitized URLs.
- A page answering 401/403 fails the capture ("protected page? configure auth") instead of being
  compared as an unchanged login screen.

Vercel specifics: create a *Protection Bypass for Automation* secret in the project settings and
store it as a CI secret (`VERCEL_AUTOMATION_BYPASS_SECRET`). Sending it as the
`x-vercel-protection-bypass` header on every same-origin request is enough; you do not need
`x-vercel-set-bypass-cookie`. Other options: `Authorization` with `prefix: "Bearer "` or
`prefix: "Basic "` (value = base64 of `user:password`), or the session cookie of a dedicated
test account.

Screenshots of protected previews are uploaded the same way as any other: to the private assets
branch, visible to repo readers only.
