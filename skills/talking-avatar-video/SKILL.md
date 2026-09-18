---
name: talking-avatar-video
description: "Install and use the official Talking Avatar Video package, pinned by digest, for paid hosted work on the Beatra service."
category: media
risk: critical
source: community
source_repo: beatra-ai/talking-avatar-video-skill
source_type: official
date_added: "2026-09-18"
author: beatra-ai
tags: [talking-avatar, talking-head, text-to-video, mcp, paid-api, beatra]
tools: [claude, codex, cursor, gemini]
license: "MIT-0"
license_source: "https://github.com/beatra-ai/talking-avatar-video-skill/blob/251c968deebb1c8f1dbfd0a8404e8e1be1528ac6/LICENSE"
---

# Talking Avatar Video Skill

## Overview

Turn one portrait and a short script into a talking avatar video, from inside Claude Code, Codex, or OpenClaw. The work is produced on the hosted, paid Beatra service
(`mcp.beatra.ai`).

This catalog entry is a **reviewed pointer, not the executable package**. It
contains no client code and performs no Beatra operation by itself. The package
it points to bundles three standard-library Python scripts that make network
calls, store a credential, and can replace their own files. Read
[Install](#install-pinned-verified-approved-twice) and
[Security & Safety Notes](#security--safety-notes) before activating it.

| Pinned identity | Value |
| --- | --- |
| Package | `talking-avatar-video` `0.2.1` |
| Archive | `https://cdn.beatra.ai/agent-packages/talking-avatar-video/v0.2.1/talking-avatar-video-skill-0.2.1.zip` |
| Archive SHA-256 | `cb62d8e3fa65b48f3c3f1803e2008e1b9c25ff057c0a35184e8fcc7d9771eb80` |
| Source tree | [`beatra-ai/talking-avatar-video-skill@251c968`](https://github.com/beatra-ai/talking-avatar-video-skill/tree/251c968deebb1c8f1dbfd0a8404e8e1be1528ac6/skills/talking-avatar-video) (full SHA `251c968deebb1c8f1dbfd0a8404e8e1be1528ac6`) |
| License | MIT No Attribution (MIT-0) |

The archive holds regular files only (no symlinks, no executable bits, no
binaries). Confirm that with the inspect commands below. Every file must be
byte-identical to the source tree at the pinned commit.

## When to Use This Skill

- Use when the user explicitly wants Talking Avatar Video work produced on Beatra and accepts that it is paid.
- Use when they have agreed to send prompts and any reference media to a third party.
- Do not use for local-only or offline video editing, or timeline assembly.

## Install (pinned, verified, approved twice)

### Step 1: Download and verify into a review directory

Explain that this downloads an external package from `cdn.beatra.ai`, then ask
for approval. Only after approval:

```bash
umask 077
review_dir="$(mktemp -d)"
cd "$review_dir" || exit 1
curl -fsSLO "https://cdn.beatra.ai/agent-packages/talking-avatar-video/v0.2.1/talking-avatar-video-skill-0.2.1.zip"
printf '%s  %s\n' \
  'cb62d8e3fa65b48f3c3f1803e2008e1b9c25ff057c0a35184e8fcc7d9771eb80' \
  'talking-avatar-video-skill-0.2.1.zip' | shasum -a 256 -c -
```

Stop if the check does not print `OK`. The expected digest comes from this
catalog entry, not from a file on the same CDN.

### Step 2: Inspect before activation

```bash
unzip -l talking-avatar-video-skill-0.2.1.zip
unzip -q talking-avatar-video-skill-0.2.1.zip
find talking-avatar-video -type l -print            # expect no output
find talking-avatar-video -type f -perm -111 -print # expect no output
grep -n '"auto_update": True' talking-avatar-video/scripts/mcp_client.py
```

Optionally confirm byte identity with the public source tree (a second,
independent host):

```bash
git clone --quiet --filter=blob:none --no-checkout https://github.com/beatra-ai/talking-avatar-video-skill.git src
git -C src checkout --quiet 251c968deebb1c8f1dbfd0a8404e8e1be1528ac6 -- skills/talking-avatar-video
(cd talking-avatar-video && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > archive.sha
(cd src/skills/talking-avatar-video && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > tree.sha
cmp archive.sha tree.sha && echo IDENTICAL
```

Report to the user what the review found: `SKILL.md`, `manifest.json`, the
bundled Markdown references, and `scripts/authorize.py`,
`scripts/mcp_client.py`, `scripts/uninstall.py` (Python 3.10+, standard
library only, no dependency installation, no lifecycle hooks). Summarize the
network, credential, local-state, telemetry, and self-update behavior listed
under [Security & Safety Notes](#security--safety-notes).

### Step 3: Copy in and disable self-update before any other command

Ask for a **second, separate** approval, because this changes agent
configuration. Then copy the reviewed tree to the host's skills directory
(Claude Code shown; use the equivalent path for other hosts) and immediately
turn off silent self-update for that exact path:

```bash
dest="$HOME/.claude/skills/talking-avatar-video"
test ! -e "$dest" || { echo "destination exists; stop and ask the user"; exit 1; }
cp -R talking-avatar-video "$dest"
python3 "$dest/scripts/mcp_client.py" update --auto off
```

The last command must print
`Automatic Beatra package updates are disabled.` It writes only
`~/.beatra/updates/<id>/state.json` and makes no network request. Run it
before `authorize.py`, `verify`, `tools`, `upload`, or `call`: in this
pinned version self-update is **on by default**. The setting is keyed to the
resolved install path, so repeat it after moving or re-copying the directory.

### Step 4: Authorize as its own decision

Authorization opens a browser sign-in and stores a bearer token. Ask first.

```bash
python3 "$dest/scripts/authorize.py"
```

Start a new agent session if the host discovers skills only at startup.

## How It Works

1. Read the installed package's `SKILL.md` and its references; they define the
   routes, payload shapes, and review loop.
2. Use free, non-billable discovery first (`beatra.models.list`, task list) to
   read current model cards and credit estimates.
3. Show the user a cost card for exactly one paid call: tool, model, estimate,
   and which files will be uploaded. Wait for explicit approval. Planning or
   "just do it" is not approval.
4. Upload only files the user supplied and approved for this task, then submit
   once with a stable `client_request_id` and poll the returned task.
5. Report the delivered artifact and `billing.net_charged_credits`, review the
   result with the user, and ask again before any further paid stage.

## Examples

### Free connection check (non-billable)

```bash
python3 "$HOME/.claude/skills/talking-avatar-video/scripts/mcp_client.py" verify
```

### One approved paid call

After the user approved the cost card for this exact payload, submit once with
a stable request id using the tool name from the installed `SKILL.md`. If the
response is lost, retry only with the same `client_request_id` and identical
arguments; never submit a replacement while the task is running.

## Update

This entry does not endorse the package's silent self-update. Keep
`update --auto off` in place and do not run `update --auto on` or a bare
`update` without explicit approval.

To move to a newer version, repeat Steps 1 to 3 for that version in a new
review directory, verify its digest against the matching tree in `beatra-ai/talking-avatar-video-skill`
(a version not listed in this entry has not been reviewed here), show the
user the file-level changes against the installed copy, and replace the
directory only after approval. `update --check` reports the available version
from `beatra.ai` without changing files.

## Uninstall

```bash
dest="$HOME/.claude/skills/talking-avatar-video"
python3 "$dest/scripts/uninstall.py" --dry-run
python3 "$dest/scripts/uninstall.py"
```

Read the JSON decision. `disconnected` means this was the last Beatra skill on
the device: the token was revoked (when `revoked` is `true`) and the files
`credentials.json`, `installation.json`, `host.json`, `skills.json`, and
`registrations.json` under `~/.beatra` were removed. `keep_connection` means
another Beatra skill still uses the shared token, which stays. Then, after
confirming the path with the user, delete `$dest`.

`uninstall.py` does not remove `~/.beatra/updates/`. When the decision is
`disconnected` and no other Beatra skill is installed, remove that directory
too; otherwise leave it. A token that could not be revoked expires after 15
days idle and can be revoked at once in the Beatra Console under Agents.

## Best Practices

- ✅ Keep one approval per paid call, per upload set, and per install step.
- ✅ Report net charged credits from the terminal task, not the estimate.
- ❌ Do not re-enable self-update or install an unreviewed version silently.
- ❌ Do not print, paste, or move the token out of `~/.beatra/credentials.json`.
- ❌ Do not retry a paid call with a new request ID after an uncertain response.

## Limitations

- Requires a Beatra account, network access, Python 3.10+, and prepaid credits.
- Models, prices, schemas, and availability are controlled by Beatra and its
  upstream model providers and can change; the service is provided as is.
- Outputs are probabilistic, not guaranteed unique or non-infringing, and need
  human review before publication.
- This catalog entry reviews only the pinned archive above. A newer version is
  a different review.

## Security & Safety Notes

`risk: critical` is deliberate.

- **Network.** Authorization uses `api.beatra.ai`; every tool call and upload
  goes to `mcp.beatra.ai`. With self-update left on, the client also fetches
  `https://beatra.ai/skills/talking-avatar-video/install.json` and archives from
  `cdn.beatra.ai`.
- **Self-update (on by default in this pinned version).** Before `verify`,
  `tools`, `upload`, or `call`, the client checks for a newer release at most
  once every 24 hours and, if one exists, replaces package-owned files without
  per-update preview or approval. It pins host and path, verifies checksums
  from Beatra's own discovery document and CDN, and rolls back on failure, but
  those digests are not independently anchored. This entry therefore requires
  `update --auto off` before first use, as in Step 3.
- **Uploads and third parties.** Prompts and uploaded media are sent to Beatra
  and forwarded to the third-party model provider executing the task. Beatra
  is hosted outside mainland China. See the
  [privacy policy](https://beatra.ai/en/privacy).
- **Likeness and reference media.** Uploaded portraits or reference clips are sent to Beatra and the model provider. Require approval for that exact file set.
- **Billing.** Paid tools consume prepaid credits. Credits for tasks that fail
  for reasons attributable to Beatra or the upstream model are returned
  automatically; otherwise purchases are non-refundable, and actual usage can
  exceed the estimate and leave a negative balance. See the
  [terms](https://beatra.ai/en/terms).
- **Credentials.** `authorize.py` runs an OAuth device flow, opens the browser,
  and stores one bearer token in `~/.beatra/credentials.json` (directory
  `0700`, file `0600`). The token never goes into argv, environment variables,
  or output. It carries full Beatra scope, including `wallet:spend`, has a
  sliding 15-day idle lifetime, and is shared by every Beatra skill on the
  device.
- **Local state.** `~/.beatra/` also holds `installation.json` (random
  installation reference), `host.json` (agent platform and hostname),
  `skills.json` (installed Beatra skill paths), `registrations.json`, and
  `updates/<id>/state.json` plus update backups when updates run.
- **Telemetry.** The device flow sends the hostname as the device name, the
  package slug and version, and the detected agent platform (for example
  `claude-code`, from environment variables). On first use the client makes a
  non-billable `beatra.installations.register` call, and every tool call adds
  `source_package_slug` and `source_platform`. There is no opt-out for these
  fields.
- **Retention.** Account data is kept for the life of the account. Task
  records, artifacts, and billing ledgers are retained after account closure
  for audit and tax purposes.
- **Content rights.** Users keep rights in their inputs and receive Beatra's
  rights in outputs; they must hold rights to uploaded media and must not
  create deceptive impersonations.

## Additional Resources

- [Source tree at the pinned commit](https://github.com/beatra-ai/talking-avatar-video-skill/tree/251c968deebb1c8f1dbfd0a8404e8e1be1528ac6/skills/talking-avatar-video)
- [Product page](https://beatra.ai/skills/talking-avatar-video)
- [Terms](https://beatra.ai/en/terms) and [privacy policy](https://beatra.ai/en/privacy)
