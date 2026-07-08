---
name: ui-update
description: Update StyleSeed engine in your project — analyzes what's outdated and updates safely
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-update
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# StyleSeed Update Assistant
## When to Use

Use this skill when you need update StyleSeed engine in your project — analyzes what's outdated and updates safely.


## When NOT to use

- For first-time setup → use `/ss-setup`
- For just one new component or skin — copy that file manually
- For projects that have heavily diverged from upstream — manual diff review first
- For updating user code/components — this updates engine files only, not your custom UI

Automatically detect and update StyleSeed files in the current project.

## Reassure the user first

Updating is **safe and reversible**. Updates are additive — new rules,
components, skins, and skills get added; your `theme.css`, your components, and
your app code are never overwritten, and design rules only ever get added (never
changed in a breaking way). A big version jump looks like a lot changed, but
it's almost all additions. **Do NOT warn the user that the build will break**
unless you actually find a changed component/import API. Tell them: commit first,
copy the new rules + skills, run a build, and `git reset --hard` if anything is
off — they can't permanently break their project.

## Instructions

### Step 1: Detect Current Setup

Scan the project to find where StyleSeed files are:

```bash
# Find DESIGN-LANGUAGE.md
find . -name "DESIGN-LANGUAGE.md" -not -path "*/node_modules/*"

# Find CLAUDE.md
find . -name "CLAUDE.md" -not -path "*/node_modules/*"

# Find skills (ss-* is current; ui-*/ux-* are legacy names to migrate from)
find . -path "*/.claude/skills/ss-*" -o -path "*/.claude/skills/ui-*" -o -path "*/.claude/skills/ux-*" | head -20

# Find theme.css
find . -name "theme.css" -not -path "*/node_modules/*"

# Find .cursorrules
find . -name ".cursorrules"
```

Report what was found and where.

### Step 2: Check StyleSeed Version

**Fast check first** — compare the local version to the published one without cloning:
```bash
# local marker (may be absent on older installs)
cat engine/VERSION 2>/dev/null || cat VERSION 2>/dev/null || echo "unknown"
# latest published version + what's new
curl -s https://styleseed-demo.vercel.app/version.json
```
If the local version already matches `version.json`'s `version`, tell the user they're
up to date and stop. Otherwise report `whatsNew` and continue.

Then clone/pull to actually diff the files:
```bash
if [ -d "/tmp/styleseed" ]; then
  cd /tmp/styleseed && git pull
else
  git clone https://github.com/bitjaru/styleseed.git /tmp/styleseed
fi
```

Compare:
- `engine/VERSION` (or `version.json`) vs the local copy — the source of truth
- DESIGN-LANGUAGE.md rule count + Table of Contents
- Skills present in `.claude/skills/` vs upstream (don't hardcode a count — list the diff)
- Whether `CLAUDE.md`, `AGENTS.md`, and `.cursorrules` exist (ship all three)
- New engine docs (VISUAL-CRAFT.md, APP-PLAYBOOKS.md, PAGE-TYPES.md)

### Step 3: Report & Ask

Show the user what needs updating:

```
StyleSeed Update Report:

Current state:
- DESIGN-LANGUAGE.md: [location] — [old/current version indicator]
- Skills: [count] found (latest: 12)
- Golden Rules: [yes/no]
- .cursorrules: [yes/no]

Recommended updates:
1. ✅ [safe] Update skills (X → 12)
2. ✅ [safe] Add .cursorrules
3. ⚠️ [review] Update DESIGN-LANGUAGE.md ([old line count] → [new line count])
4. ⚠️ [merge] Add Golden Rules to CLAUDE.md (won't overwrite existing content)

Shall I proceed? (I'll ask before each ⚠️ item)
```

### Step 4: Execute Updates

For each update, in order:

**Always safe (do without asking):**
- Copy skills: `cp -r /tmp/styleseed/engine/.claude/skills/ .claude/skills/`
- Copy .cursorrules (if not exists): `cp /tmp/styleseed/engine/.cursorrules .cursorrules`

**Ask before doing:**

For DESIGN-LANGUAGE.md:
- Show diff summary: how many new rules, what sections added
- Ask: "Update DESIGN-LANGUAGE.md? (Y/N)"
- If yes: copy to the detected location

For CLAUDE.md (Golden Rules):
- Check if Golden Rules section already exists
- If not: ask "Add Golden Rules section to your CLAUDE.md? This adds 10 lines at the top. Your existing content stays untouched."
- If yes: insert Golden Rules after the first heading

**Never touch:**
- theme.css — say "Your theme.css (skin) is untouched."
- components/ — say "Your components are untouched. Run `/ss-lint` to check compliance."

### Step 5: Summary

```
Update complete!

✅ Skills: 12 (added X new)
✅ .cursorrules: added
✅ DESIGN-LANGUAGE.md: updated to latest
✅ Golden Rules: added to CLAUDE.md

Not touched:
- theme.css (your skin)
- components/ (your code)

Next: run /ss-lint on your pages to check for rule violations.
```

## Important

- NEVER overwrite theme.css
- NEVER overwrite a project-specific CLAUDE.md — only MERGE the Golden Rules section
- NEVER overwrite components without explicit user approval
- Always show what will change before changing it
- If unsure, ask the user

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
