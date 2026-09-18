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
license_source: "https://github.com/beatra-ai/beatra-skills/blob/95d662f7aeddd6e2aa6da9e14f9c985e3f6b914d/LICENSE"
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
calls, store a credential, and can replace their own files. Read
[Install](#install-pinned-verified-approved-twice) and
[Security & Safety Notes](#security--safety-notes) before activating it.

| Pinned identity | Value |
| --- | --- |
| Package | `beatra-ai-video-studio` `1.2.5` |
| Archive | `https://cdn.beatra.ai/agent-packages/beatra-ai-video-studio/v1.2.5/beatra-ai-video-studio-skill-1.2.5.zip` |
| Archive SHA-256 | `679a3ddc06c7be631ef31f002f918465a26f17a189ffac723f45dfd348e1fc4a` |
| Source tree | [`beatra-ai/beatra-skills@95d662f`](https://github.com/beatra-ai/beatra-skills/tree/95d662f7aeddd6e2aa6da9e14f9c985e3f6b914d/skills/beatra-ai-video-studio) (full SHA `95d662f7aeddd6e2aa6da9e14f9c985e3f6b914d`) |
| License | MIT No Attribution (MIT-0) |

The archive holds 17 regular files (no symlinks, no executable bits, no
binaries), and every file is byte-identical to the source tree at that commit.

## When to Use This Skill

- Use when the user explicitly wants a short AI video clip produced on Beatra
  and accepts that the work is paid and runs on a hosted service.
- Use when a still image should be animated, two frames interpolated, or an
  existing clip edited or extended by Beatra.
- Do not use for local-only or offline video editing, timeline assembly, or
  when the user has not agreed to send prompts and media to a third party.

## Install (pinned, verified, approved twice)

### Step 1: Download and verify into a review directory

Explain that this downloads an external package from `cdn.beatra.ai`, then ask
for approval. Only after approval:

```bash
umask 077
review_dir="$(mktemp -d)"
cd "$review_dir" || exit 1
curl -fsSLO "https://cdn.beatra.ai/agent-packages/beatra-ai-video-studio/v1.2.5/beatra-ai-video-studio-skill-1.2.5.zip"
printf '%s  %s\n' \
  '679a3ddc06c7be631ef31f002f918465a26f17a189ffac723f45dfd348e1fc4a' \
  'beatra-ai-video-studio-skill-1.2.5.zip' | shasum -a 256 -c -
```

Stop if the check does not print `OK`. The expected digest comes from this
catalog entry, not from a file on the same CDN.

### Step 2: Inspect before activation

```bash
unzip -l beatra-ai-video-studio-skill-1.2.5.zip
unzip -q beatra-ai-video-studio-skill-1.2.5.zip
find beatra-ai-video-studio -type l -print            # expect no output
find beatra-ai-video-studio -type f -perm -111 -print # expect no output
grep -n '"auto_update": True' beatra-ai-video-studio/scripts/mcp_client.py
```

Optionally confirm byte identity with the public source tree (a second,
independent host):

```bash
git clone --quiet --filter=blob:none --no-checkout https://github.com/beatra-ai/beatra-skills.git src
git -C src checkout --quiet 95d662f7aeddd6e2aa6da9e14f9c985e3f6b914d -- skills/beatra-ai-video-studio
(cd beatra-ai-video-studio && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > archive.sha
(cd src/skills/beatra-ai-video-studio && find . -type f | LC_ALL=C sort | xargs shasum -a 256) > tree.sha
cmp archive.sha tree.sha && echo IDENTICAL
```

Report to the user what the review found: `SKILL.md`, `manifest.json`, 12
Markdown references, and `scripts/authorize.py`, `scripts/mcp_client.py`,
`scripts/uninstall.py` (Python 3.10+, standard library only, no dependency
installation, no lifecycle hooks). Summarize the network, credential,
local-state, telemetry, and self-update behavior listed under
[Security & Safety Notes](#security--safety-notes).

### Step 3: Copy in and disable self-update before any other command

Ask for a **second, separate** approval, because this changes agent
configuration. Then copy the reviewed tree to the host's skills directory
(Claude Code shown; use the equivalent path for other hosts) and immediately
turn off silent self-update for that exact path:

```bash
dest="$HOME/.claude/skills/beatra-ai-video-studio"
test ! -e "$dest" || { echo "destination exists; stop and ask the user"; exit 1; }
cp -R beatra-ai-video-studio "$dest"
python3 "$dest/scripts/mcp_client.py" update --auto off
```

The last command must print
`Automatic Beatra package updates are disabled.` It writes only
`~/.beatra/updates/<id>/state.json` and makes no network request. Run it
before `authorize.py`, `verify`, `tools`, `upload`, or `call`: in version 1.2.5
self-update is **on by default** (see below). The setting is keyed to the
resolved install path, so repeat it after moving or re-copying the directory.

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

This entry does not endorse the package's silent self-update. Keep
`update --auto off` in place and do not run `update --auto on` or a bare
`update` without explicit approval.

To move to a newer version, repeat Steps 1 to 3 for that version in a new
review directory, verify its digest against the matching tree in
`beatra-ai/beatra-skills` (a version not listed in this entry has not been
reviewed here), show the user the file-level changes against the installed
copy, and replace the directory only after approval. `update --check` reports
the available version from `beatra.ai` without changing files.

## Uninstall

```bash
dest="$HOME/.claude/skills/beatra-ai-video-studio"
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
- ✅ Start with the shortest duration and lowest resolution the model admits.
- ✅ Report net charged credits from the terminal task, not the estimate.
- ❌ Do not re-enable self-update or install an unreviewed version silently.
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

- **Network.** Authorization uses `api.beatra.ai`; every tool call and upload
  goes to `mcp.beatra.ai`. With self-update left on, the client also fetches
  `https://beatra.ai/skills/beatra-ai-video-studio/install.json` and archives
  from `cdn.beatra.ai`.
- **Self-update (on by default in 1.2.5).** Before `verify`, `tools`, `upload`,
  or `call`, the client checks for a newer release at most once every 24 hours
  and, if one exists, replaces package-owned files without per-update preview
  or approval. It pins host and path, verifies checksums from Beatra's own
  discovery document and CDN, and rolls back on failure, but those digests are
  not independently anchored. This entry therefore requires
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

- [Source tree at the pinned commit](https://github.com/beatra-ai/beatra-skills/tree/95d662f7aeddd6e2aa6da9e14f9c985e3f6b914d/skills/beatra-ai-video-studio)
- [Product page](https://beatra.ai/skills/beatra-ai-video-studio)
- [Terms](https://beatra.ai/en/terms) and [privacy policy](https://beatra.ai/en/privacy)
