---
name: ai-podcast-voiceover
description: "Install and use the official AI Podcast Voiceover package, pinned by digest, for paid hosted work on the Beatra service."
category: media
risk: critical
source: community
source_repo: beatra-ai/ai-podcast-voiceover-skill
source_type: official
date_added: "2026-09-18"
author: beatra-ai
tags: [podcast, tts, voiceover, mcp, paid-api, beatra]
tools: [claude, codex, cursor, gemini]
license: "MIT-0"
license_source: "https://github.com/beatra-ai/ai-podcast-voiceover-skill/blob/ddca11ec6853184468eab57a5b4b3649e5293f4d/LICENSE"
---

# AI Podcast Voiceover Skill

## Overview

Turn an article, notes, or a finished script into a solo podcast episode with a consistent host voice, natural pacing, pronunciation control, and an MP3 you can publish, from inside Claude Code, Codex, or OpenClaw. The work is produced on the hosted, paid Beatra service
(`mcp.beatra.ai`).

This catalog entry is a **reviewed pointer, not the executable package**. It
contains no client code and performs no Beatra operation by itself. The package
it points to bundles three standard-library Python scripts that make network
calls, store a credential, and can replace their own files. Read
[Install](#install-pinned-verified-approved-twice) and
[Security & Safety Notes](#security--safety-notes) before activating it.

| Pinned identity | Value |
| --- | --- |
| Package | `ai-podcast-voiceover` `0.1.7` |
| Archive | `https://cdn.beatra.ai/agent-packages/ai-podcast-voiceover/v0.1.7/ai-podcast-voiceover-skill-0.1.7.zip` |
| Archive SHA-256 | `571a9b48f7e32e5350a4916f502ed78c66b16f6bffdde33dda1c4c1b00996c87` |
| Source tree | [`beatra-ai/ai-podcast-voiceover-skill@ddca11e`](https://github.com/beatra-ai/ai-podcast-voiceover-skill/tree/ddca11ec6853184468eab57a5b4b3649e5293f4d/skills/ai-podcast-voiceover) (full SHA `ddca11ec6853184468eab57a5b4b3649e5293f4d`) |
| License | MIT No Attribution (MIT-0) |

The archive holds regular files only (no symlinks, no executable bits, no
binaries). Confirm that with the inspect commands below. Every file must be
byte-identical to the source tree at the pinned commit.

## When to Use This Skill

- Use when the user explicitly wants AI Podcast Voiceover audio produced on Beatra and accepts that it is paid.
- Use when they have agreed to send scripts to a third party for hosted synthesis.
- Do not use for local TTS or when no paid synthesis was approved.

## Install (pinned, verified, approved twice)

### Step 1: Download and verify into a review directory

Explain that this downloads an external package from `cdn.beatra.ai`, then ask
for approval. Only after approval:

```bash
umask 077
review_dir="$(mktemp -d)"
cd "$review_dir" || exit 1
curl -fsSLO "https://cdn.beatra.ai/agent-packages/ai-podcast-voiceover/v0.1.7/ai-podcast-voiceover-skill-0.1.7.zip"
printf '%s  %s\n' \
  '571a9b48f7e32e5350a4916f502ed78c66b16f6bffdde33dda1c4c1b00996c87' \
  'ai-podcast-voiceover-skill-0.1.7.zip' | shasum -a 256 -c -
```

Stop if the check does not print `OK`. The expected digest comes from this
catalog entry, not from a file on the same CDN.

### Step 2: Inspect before activation

```bash
unzip -l ai-podcast-voiceover-skill-0.1.7.zip
unzip -q ai-podcast-voiceover-skill-0.1.7.zip
find ai-podcast-voiceover -type l -print            # expect no output
find ai-podcast-voiceover -type f -perm -111 -print # expect no output
grep -n '"auto_update": True' ai-podcast-voiceover/scripts/mcp_client.py
```

Optionally confirm byte identity with the public source tree (a second,
independent host):

```bash
git clone --quiet --filter=blob:none --no-checkout https://github.com/beatra-ai/ai-podcast-voiceover-skill.git src
git -C src checkout --quiet ddca11ec6853184468eab57a5b4b3649e5293f4d -- skills/ai-podcast-voiceover
(cd ai-podcast-voiceover && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > archive.sha
(cd src/skills/ai-podcast-voiceover && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > tree.sha
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
dest="$HOME/.claude/skills/ai-podcast-voiceover"
test ! -e "$dest" || { echo "destination exists; stop and ask the user"; exit 1; }
cp -R ai-podcast-voiceover "$dest"
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
python3 "$HOME/.claude/skills/ai-podcast-voiceover/scripts/mcp_client.py" verify
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
review directory, verify its digest against the matching tree in `beatra-ai/ai-podcast-voiceover-skill`
(a version not listed in this entry has not been reviewed here), show the
user the file-level changes against the installed copy, and replace the
directory only after approval. `update --check` reports the available version
from `beatra.ai` without changing files.

## Uninstall

```bash
dest="$HOME/.claude/skills/ai-podcast-voiceover"
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
  `https://beatra.ai/skills/ai-podcast-voiceover/install.json` and archives from
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

- [Source tree at the pinned commit](https://github.com/beatra-ai/ai-podcast-voiceover-skill/tree/ddca11ec6853184468eab57a5b4b3649e5293f4d/skills/ai-podcast-voiceover)
- [Product page](https://beatra.ai/skills/ai-podcast-voiceover)
- [Terms](https://beatra.ai/en/terms) and [privacy policy](https://beatra.ai/en/privacy)
