---
name: beatra-ai-video-studio
description: "Install and use the official Beatra AI Video Studio package, pinned by digest, for paid text-to-video, image-to-video, and video edit or extend jobs on the hosted Beatra service."
category: media
risk: critical
source: community
source_repo: beatra-ai/beatra-skills
source_type: official
date_added: "2026-09-17"
author: beatra-ai
tags: [video-generation, text-to-video, image-to-video, video-editing, mcp, paid-api, beatra]
tools: [claude, codex, cursor, gemini]
license: "MIT-0"
license_source: "https://github.com/beatra-ai/beatra-skills/blob/b7ab8ed02980ee44b6dac62633f8d79daf0809ab/LICENSE"
---

# Beatra AI Video Studio

## Overview

Beatra AI Video Studio is Beatra's official agent package for short AI video
work: text-to-video, image-to-video, first/last-frame interpolation,
reference-guided generation, and editing or extending an existing clip. The
video is produced on the hosted, paid Beatra service (`mcp.beatra.ai`).

This catalog entry is a **reviewed pointer, not the executable package**. It
contains no client code and performs no Beatra operation by itself. The package
it points to bundles three standard-library Python scripts that make network
calls and store a credential. It has no self-updater: it never downloads
code and never changes its own files. Read
[Install](#install-pinned-verified-approved-twice) and
[Security & Safety Notes](#security--safety-notes) before activating it.

| Pinned identity | Value |
| --- | --- |
| Package | `beatra-ai-video-studio` `1.3.5` |
| Source commit | [`beatra-ai/beatra-skills@b7ab8ed`](https://github.com/beatra-ai/beatra-skills/tree/b7ab8ed02980ee44b6dac62633f8d79daf0809ab/skills/beatra-ai-video-studio) (full SHA `b7ab8ed02980ee44b6dac62633f8d79daf0809ab`) |
| Package tree | `5183c76c894e650691c8bb638257dd202b23e66c` (Git tree ID of `skills/beatra-ai-video-studio` at that commit) |
| License | MIT No Attribution (MIT-0) |

The pinned tree holds regular files only (no symlinks, no executable bits, no
binaries). Confirm that with the inspect commands below.

## When to Use This Skill

- Use when the user explicitly wants a short AI video clip produced on Beatra
  and accepts that the work is paid and runs on a hosted service.
- Use when a still image should be animated, two frames interpolated, or an
  existing clip edited or extended by Beatra.
- Do not use for local-only or offline video editing, timeline assembly, or
  when the user has not agreed to send prompts and media to a third party.

## Install (pinned, verified, approved twice)

### Step 1: Fetch the pinned tree into a review directory

Explain that this fetches an external package from `github.com`, then ask
for approval. Only after approval:

```bash
umask 077
review_dir="$(mktemp -d)"
cd "$review_dir" || exit 1
git clone --quiet --filter=blob:none --no-checkout https://github.com/beatra-ai/beatra-skills.git src
git -C src checkout --quiet b7ab8ed02980ee44b6dac62633f8d79daf0809ab -- skills/beatra-ai-video-studio
test "$(git -C src rev-parse 'b7ab8ed02980ee44b6dac62633f8d79daf0809ab:skills/beatra-ai-video-studio')" = '5183c76c894e650691c8bb638257dd202b23e66c' && echo TREE-OK
```

Stop if the last command does not print `TREE-OK`. The expected commit and
tree IDs come from this catalog entry, not from the package or its website,
and Git addresses every fetched object by its hash.

### Step 2: Inspect before activation

```bash
git -C src ls-tree -r b7ab8ed02980ee44b6dac62633f8d79daf0809ab -- skills/beatra-ai-video-studio | awk '$1 != "100644"'  # expect no output
grep -n -E 'maybe_auto_update|download_update|_apply_update' src/skills/beatra-ai-video-studio/scripts/mcp_client.py  # expect no output
```

The first check lists any symlink, executable, or submodule entry; the second
finds the entry points of the self-updater that earlier versions shipped.

Report to the user what the review found: `SKILL.md`, `manifest.json`,
`install-source.json` (the one-line marker `{"schema_version":1,"source":"github"}`),
the bundled Markdown references, and `scripts/authorize.py`,
`scripts/mcp_client.py`, `scripts/uninstall.py` (Python 3.10+, standard
library only, no dependency installation, no lifecycle hooks). Summarize the
network, credential, local-state, telemetry, and version-notice behavior
listed under [Security & Safety Notes](#security--safety-notes).

### Step 3: Copy in

Ask for a **second, separate** approval, because this changes agent
configuration. Then copy the reviewed tree to the host's skills directory
(Claude Code shown; use the equivalent path for other hosts):

```bash
dest="$HOME/.claude/skills/beatra-ai-video-studio"
test ! -e "$dest" && test ! -L "$dest" || { echo "destination exists; stop and ask the user"; exit 1; }
cp -R "src/skills/beatra-ai-video-studio" "$dest"
```

There is no update switch to turn off in this version.

### Step 4: Authorize as its own decision

Authorization opens a browser sign-in and stores a bearer token. Ask first.

```bash
python3 "$dest/scripts/authorize.py"
```

Start a new agent session if the host discovers skills only at startup.

## How It Works

1. Read the installed package's `SKILL.md` and its references; they define the
   video routes, payload shapes, and review loop.
2. Use free, non-billable discovery first (`beatra.models.list`, task list) to
   read current model cards, durations, resolutions, and credit estimates.
3. Show the user a cost card for exactly one paid call: tool, model, duration,
   resolution, estimate, and which files will be uploaded. Wait for explicit
   approval. Planning or "make the clip" is not approval.
4. Upload only files the user supplied and approved for this task, then submit
   once with a stable `client_request_id` and poll the returned task.
5. Report the delivered artifact and `billing.net_charged_credits`, review the
   clip with the user, and ask again before any further paid stage.

## Examples

### Free connection check (non-billable)

```bash
python3 "$HOME/.claude/skills/beatra-ai-video-studio/scripts/mcp_client.py" verify
```

### One approved text-to-video call

After the user approved the cost card for this exact payload:

```bash
printf '%s' '{"prompt":"A close product reveal with one slow push-in.","model":"auto","duration":5,"client_request_id":"req-7f3c2a"}' \
  | python3 "$HOME/.claude/skills/beatra-ai-video-studio/scripts/mcp_client.py" call beatra.videos.generate
```

If the response is lost, retry only with the same `client_request_id` and
identical arguments; never submit a replacement while the task is running.

## Update

This pinned version cannot update itself: it has no code that downloads or
replaces package files. `update` only reports what the store or tool that
installed the copy offers; for a copy installed by the steps above it finds
no such record and says to update the way you installed it. See the version
notice under [Security & Safety Notes](#security--safety-notes).

To move to a newer version, repeat Steps 1 to 3 for that commit in a new
review directory, show the user the file-level changes against the installed
copy (for example `git -C src diff --stat b7ab8ed <new-commit> -- skills/beatra-ai-video-studio`),
and replace the directory only after approval. A version not listed in this
entry has not been reviewed here.

## Uninstall

```bash
dest="$HOME/.claude/skills/beatra-ai-video-studio"
python3 "$dest/scripts/uninstall.py" --dry-run
python3 "$dest/scripts/uninstall.py"
```

Read the JSON decision. `disconnected` means this was the last Beatra skill on
the device: the token was revoked (when `revoked` is `true`) and the files
`credentials.json`, `installation.json`, `host.json`, `skills.json`,
`network.json`, `balance-holds.json`, `pending_authorization.json`, and
`.authorize.lock` under `~/.beatra` were removed. `keep_connection` means
another Beatra skill still uses the shared token, which stays.
`revoke_retry` means the server refused the revocation and nothing changed;
run it again shortly. The script never deletes the package directory: after
confirming the path it prints with the user, delete `$dest`.

`uninstall.py` does not remove `~/.beatra/updates/`. When the decision is
`disconnected` and no other Beatra skill is installed, remove that directory
and then the empty `~/.beatra`; otherwise leave them. A token that could not
be revoked expires after 15 days idle and can be revoked at once in the
Beatra Console under Agents.

## Best Practices

- ✅ Keep one approval per paid call, per upload set, and per install step.
- ✅ Start with the shortest duration and lowest resolution the model admits.
- ✅ Report net charged credits from the terminal task, not the estimate.
- ❌ Do not replace the installed copy with an unreviewed version silently.
- ❌ Do not print, paste, or move the token out of `~/.beatra/credentials.json`.
- ❌ Do not retry a paid call with a new request ID after an uncertain response.

## Limitations

- Requires a Beatra account, network access, Python 3.10+, and prepaid credits;
  the sign-up gift usually cannot cover a video generation.
- Short clips only; not a timeline editor. Multi-shot work is delivered as
  separate clips.
- Generation is asynchronous and can take minutes. Upload size is capped at
  100 MB and a model may impose a lower limit.
- Models, prices, schemas, and availability are controlled by Beatra and its
  upstream model providers and can change; the service is provided as is.
- Outputs are probabilistic, not guaranteed unique or non-infringing, and need
  human review before publication.

## Security & Safety Notes

`risk: critical` is deliberate.

- **Network.** Every request is HTTPS and refuses redirects. Authorization
  uses `api.beatra.ai` and tool calls go to `mcp.beatra.ai`; an upload is a
  `PUT` of the approved file to the HTTPS address the server returns, without
  the bearer token. Unless a cached decision is still valid (10 minutes to 7
  days), each run first asks `https://api.beatra.ai/skill-route`, and also
  `https://api.beatra.cn/skill-route` when the first is slow or answers `cn`,
  which network to use. These probes carry no credential or package identity.
  When the answer is `cn`, authorization and tool calls go to `api.beatra.cn`
  and `mcp.beatra.cn` with the same bearer token, and the version notice
  reads from `www.beatra.cn`; Beatra serves these `.cn` hosts from mainland
  China.
  `python3 "$dest/scripts/mcp_client.py" network --use ai` pins the `.ai`
  hosts and stops the probes; a failed version-notice read can still retry
  once on the other network.
- **Version notice, no self-update.** This version has no code that downloads
  or replaces package files and writes nothing inside the install directory.
  Before `verify`, `tools`, `upload`, or `call`, at most once every 24 hours
  per install path, it records the check time and looks, read-only, for
  records another installer left beside the package (ClawHub `origin.json`,
  SkillHub or `skills` CLI lock entries, `gh skill` frontmatter). A copy
  installed by the steps above normally has none and makes no request. When
  one is found, it reads `https://beatra.ai/skills/beatra-ai-video-studio/sources.json`
  (no credential, 3-second timeout, 64 KiB cap) and, if that installer offers a
  newer version, prints one line to stderr with the installer's own update
  command. It never runs the command.
- **Uploads and third parties.** Prompts and uploaded media are sent to Beatra
  and forwarded to the third-party model provider executing the task. Beatra
  runs the service outside mainland China; on the `cn` route (see Network)
  requests reach it through Beatra's hosts in mainland China. See the
  [privacy policy](https://beatra.ai/en/privacy).
- **Billing.** Paid tools consume prepaid credits. Credits for tasks that fail
  for reasons attributable to Beatra or the upstream model are returned
  automatically; otherwise purchases are non-refundable, and actual usage can
  exceed the estimate and leave a negative balance. See the
  [terms](https://beatra.ai/en/terms).
- **Credentials.** `authorize.py` runs an OAuth device flow, opens the browser
  on the approval page, and stores one bearer token in
  `~/.beatra/credentials.json` (directory `0700`, file `0600`). The token never
  goes into argv, environment variables, or output. It carries full Beatra
  scope, including `wallet:spend`, has a sliding 15-day idle lifetime, and is
  shared by every Beatra skill on the device. While the user has not yet
  selected Allow, the pending device code is kept in
  `~/.beatra/pending_authorization.json` (`0600`) so a rerun finishes the same
  approval instead of opening a new one. When `verify`, `tools`, `upload`, or
  `call` finds no working token, the client makes one check of that saved
  approval and stores the token if the user has already selected Allow; it
  never starts a new authorization or opens a browser.
- **Local state.** `~/.beatra/` also holds `installation.json` (random
  installation reference), `host.json` (agent platform and hostname),
  `skills.json` (installed Beatra skill paths), `network.json` (route
  decision, with a country code when the route answer includes one),
  `balance-holds.json` (after an insufficient-credit refusal, that tool is
  answered locally for up to 30 minutes; `call --recheck-balance` sends one
  call), a short-lived `.authorize.lock`, and, per install path,
  `updates/<id>/state.json` (last version check), `source.json` (install
  source), and `registration.json` (last registration). Files are `0600`
  except `host.json`, which follows the umask.
- **Telemetry.** Authorization sends the hostname as the device name, the
  package slug and version, the detected agent platform (for example
  `claude-code`, from environment variables), and the installation reference.
  After connecting, at most once a day unless the version, platform, route, or
  install source changes, the client makes a non-billable
  `beatra.installations.register` call with those package and platform
  fields, the release channel, the network route, the install source
  (`github` for this tree), and coarse runtime facts: OS and OS version, CPU
  architecture, Python version, locale, and UTC offset. Every tool call adds
  `source_package_slug` and `source_platform`. There is no opt-out for these
  fields.
- **Retention.** Account data is kept for the life of the account. Task
  records, artifacts, and billing ledgers are retained after account closure
  for audit and tax purposes.
- **Content rights.** Users keep rights in their inputs and receive Beatra's
  rights in outputs; they must hold rights to uploaded media and must not
  create deceptive impersonations.

## Additional Resources

- [Source tree at the pinned commit](https://github.com/beatra-ai/beatra-skills/tree/b7ab8ed02980ee44b6dac62633f8d79daf0809ab/skills/beatra-ai-video-studio)
- [Product page](https://beatra.ai/skills/beatra-ai-video-studio)
- [Terms](https://beatra.ai/en/terms) and [privacy policy](https://beatra.ai/en/privacy)
