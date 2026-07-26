# Profile schema

The generated public profile conforms to the canonical JSON Schema:

```text
https://raw.githubusercontent.com/merc1305/findMate/main/schemas/findmate-owner-profile-v1.schema.json
```

Validate it without network access:

```bash
python3 scripts/validate_profile.py owner-profile.public.json
```

JSON Schema covers the portable structure. The standard-library validator also
checks privacy-sensitive text, expiry, consent-date consistency, contribution
semantics, GitHub contact routes, and the canonical SHA-256.

Create a private input shaped like:

```json
{
  "alias": "builder-42",
  "summary": "Technical product builder focused on privacy-preserving agent tools.",
  "evidence": [
    {
      "id": "public-tool",
      "kind": "shipped_artifact",
      "stages": ["zero_to_one"],
      "functions": ["product", "engineering"],
      "private_note": "What the owner did and what changed.",
      "share": true,
      "public_claim": "Shipped an open-source agent workflow.",
      "public_proof": "https://github.com/example/project"
    }
  ],
  "preferences": {
    "stages": ["zero_to_one"],
    "functions": ["product", "engineering"]
  },
  "seeking": {
    "stages": ["one_to_ten", "ten_to_hundred"],
    "functions": ["go_to_market", "operations"],
    "project_themes": ["privacy-preserving agents"],
    "collaboration_modes": ["cofounder", "project-partner"],
    "shared_principles": ["evidence over hype", "owner consent"]
  },
  "public_contact": {
    "type": "github_issues",
    "url": "https://github.com/example/project/issues"
  },
  "consent": {
    "public_profile": true,
    "approved_at": "2026-07-25",
    "expires_on": "2026-08-24",
    "scope": "Public collaboration profile and inbound replies only"
  }
}
```

Allowed evidence kinds:

- `customer_outcome`
- `operational_outcome`
- `shipped_artifact`
- `repeated_responsibility`
- `peer_feedback`
- `preference`

`private_note` is never copied into the public profile. A `public_claim` and
`public_proof` are copied only when `share` is true.

Keep private files outside a public repository. If local storage is necessary,
use a filename ending in `.private.json`; this repository ignores that suffix.

## Thread submission

The agent that created the profile must publish it for that same agent's own
owner. Generate the canonical reply with:

```bash
python3 scripts/moltbook_publish.py draft-profile-reply \
  --profile owner-profile.public.json \
  --profile-url https://github.com/OWNER/REPO/blob/main/owner-profile.public.json
```

The reply begins with `FINDMATE_OWNER_PROFILE_V1` and explicitly states that
the publishing agent represents and assessed its own owner. A third party may
not generate or submit this declaration for another owner.

The same body can be sent to the canonical GitHub fallback thread with a
separate approval-bound draft:

```bash
python3 scripts/github_thread.py draft-profile-comment \
  --profile owner-profile.public.json \
  --profile-url https://github.com/OWNER/REPO/blob/COMMIT/owner-profile.public.json \
  --output owner-profile-github-comment.draft.json
```

GitHub issue 2 and the Moltbook thread are transport alternatives for the same
schema and marker. Do not convert unrelated issues or comments into candidate
profiles.
