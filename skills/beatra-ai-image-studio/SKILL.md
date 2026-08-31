---
name: beatra-ai-image-studio
description: Generate, compose, and edit product images, brand visuals, posters, social graphics, illustrations, and photo variations.
risk: critical
source: https://github.com/beatra-ai/beatra-skills/tree/v2026.08.31/skills/beatra-ai-image-studio
source_repo: beatra-ai/beatra-skills
source_type: official
date_added: 2026-08-31
license: MIT-0
license_source: https://github.com/beatra-ai/beatra-skills/blob/v2026.08.31/LICENSE
---

# Beatra AI Image Studio

Official Beatra skill. Generate, compose, and edit product images, brand visuals, posters, social graphics, illustrations, and photo variations.

This entry is a catalog pointer. The executable package lives in
[`beatra-ai/beatra-skills`](https://github.com/beatra-ai/beatra-skills/tree/v2026.08.31/skills/beatra-ai-image-studio) at the immutable tag
[`v2026.08.31`](https://github.com/beatra-ai/beatra-skills/releases/tag/v2026.08.31) and must be installed
from there — see [Install](#install-pinned-verified-reviewed-before-activation) below.

## When to Use

- The user needs product shots, brand visuals, posters, or social stills.
- An existing image should be composed, edited, or varied.
- The deliverable is image-only and should not open the video or music workflows.

## Install (pinned, verified, reviewed before activation)

The package is published as a deterministic archive with a SHA-256 sidecar.
Do not install from a moving branch, and do not extract straight into an active
skills directory.

**Step 1 — download and verify into a temporary review directory.** Ask the
user before downloading.

```bash
SLUG=beatra-ai-image-studio
VER=1.1.3
BASE="https://cdn.beatra.ai/agent-packages/$SLUG/v$VER"

REVIEW="$(mktemp -d)"
cd "$REVIEW"
curl -fsSLO "$BASE/$SLUG-skill-$VER.zip"
curl -fsSLO "$BASE/$SLUG-skill-$VER.zip.sha256"

# Must print OK. Stop here if it does not.
shasum -a 256 -c "$SLUG-skill-$VER.zip.sha256"

unzip -q "$SLUG-skill-$VER.zip"
```

Expected digest for `beatra-ai-image-studio-skill-1.1.3.zip`:

```
2cb062bf74e5a486156e6e2177f24f101855b83f1baf06dc67e74137d506daa3
```

**Step 2 — inspect before activating.**

```bash
find "$REVIEW/beatra-ai-image-studio" -type f | sort
find "$REVIEW/beatra-ai-image-studio" -type l          # expect no output: no symlinks
```

What you should find, and nothing else:

- `SKILL.md`, `manifest.json`, and a `references/` set — all plain text.
- `scripts/mcp_client.py`, `scripts/authorize.py`, `scripts/uninstall.py`.
  Python, standard library only — no third-party dependencies, no package
  lifecycle hooks, no binaries, no symlinks, no compiled artifacts.
- The scripts make outbound HTTPS calls to `api.beatra.ai` and write a
  credential file. Nothing else on the machine is touched.

**Step 3 — copy in, after explicit user approval.** This changes agent
configuration; ask again here rather than chaining it to step 1.

```bash
cp -R "$REVIEW/$SLUG" ~/.claude/skills/
```

**Step 4 — authorize, as a separate decision.** This performs a browser OAuth
flow and stores a token.

```bash
python3 ~/.claude/skills/$SLUG/scripts/authorize.py
```

The bundled `scripts/mcp_client.py` is the only supported client. **Installing
this catalog entry alone does not install a working skill** — it carries no
client and performs no Beatra operation.

The same bytes are mirrored in the tagged repository, verifiable against
`SHA256SUMS.txt` on the release:

```bash
git clone --depth 1 --branch v2026.08.31 https://github.com/beatra-ai/beatra-skills.git
cd beatra-skills
curl -fsSLO "https://github.com/beatra-ai/beatra-skills/releases/download/v2026.08.31/SHA256SUMS.txt"
grep " skills/beatra-ai-image-studio/" SHA256SUMS.txt | shasum -a 256 -c -
```

## Update

Repeat steps 1 and 2 with the newer `VER`, verify the digest again, review the
diff against the installed copy, then replace `~/.claude/skills/beatra-ai-image-studio/`.
Released versions are immutable; a new version always means a new URL and a new
digest. A pin gives reproducibility, not trust — re-review on every upgrade.

## Uninstall

```bash
python3 ~/.claude/skills/beatra-ai-image-studio/scripts/uninstall.py   # revokes the stored token
rm -rf ~/.claude/skills/beatra-ai-image-studio
```

## Risk disclosure

`risk: critical` is deliberate. This is not an offline text skill.

- **Network.** Every operation calls `api.beatra.ai` over HTTPS.
- **Upload.** Source media the user supplies is uploaded to Beatra for
  processing.
- **Billing.** Generation spends prepaid Beatra credits. Cost is real, is quoted
  before submission, and actual use is reported after.
- **Credentials.** `scripts/authorize.py` writes the connection token to a local
  `credentials.json` with file mode `0600` inside a `0700` directory, matching
  the posture of `gh`, `aws`, and `gcloud`. `scripts/uninstall.py` revokes it.

### Approval gates, stated precisely

The packaged `SKILL.md` requires an explicit user decision before **any paid
call**: the agent must not create a `client_request_id` or submit a generation
until the user confirms the quoted cost. Planning, comparing options, or an
instruction like "make the clip" is explicitly *not* approval.

Stated equally plainly, these carry no separate attestation step: ordinary
upload of a file the user supplied for the task, free tool and model discovery,
wallet reads, and task listing. They run only in service of a request the user
made.

Failure, refund, retention, and deletion behaviour is documented in
`references/billing-errors-and-recovery.md` and
`references/uninstall-and-disconnect.md` inside the package.

## Limitations

- Still images only. Animation or video belongs in `beatra-ai-video-studio`.
- Editing operates on images the user supplies or on results returned earlier in the same conversation.
- Uploads are capped at 100 MB, and individual models may impose a lower limit.

## Provenance

- Repository: [`beatra-ai/beatra-skills`](https://github.com/beatra-ai/beatra-skills) — MIT No Attribution
- Pinned tag: [`v2026.08.31`](https://github.com/beatra-ai/beatra-skills/releases/tag/v2026.08.31)
- Package version: `1.1.3`
- Archive SHA-256: `2cb062bf74e5a486156e6e2177f24f101855b83f1baf06dc67e74137d506daa3`

Every `skills/<slug>/` tree at that tag is byte-identical to the archive above.
