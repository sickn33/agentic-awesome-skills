# Walkthrough: Release v8.2.0 Maintenance Sweep

## Overview

This walkthrough captures the maintainer-side documentation and release publication work for **v8.2.0** after the 2026-03-18 maintenance sweep.

## Changes Verified

### 1. Community PR batch integrated

- **PR #333**: Repaired missing required frontmatter fields in `skill-anatomy` and `adapter-patterns`
- **PR #336**: Added `astro`, `hono`, `pydantic-ai`, and `sveltekit`
- **PR #338**: Repaired malformed markdown in `browser-extension-builder`
- **PR #343**: Added missing metadata labels to `devcontainer-setup`
- **PR #340**: Added `openclaw-github-repo-commander`
- **PR #334**: Added `goldrush-api`
- **PR #345**: Added `Wolfe-Jam/faf-skills` to README source attributions

### 2. Release-facing docs refreshed

- **README.md**:
  - Current release updated to **v8.2.0**
  - Release summary text aligned with the merged PR batch
  - Contributor acknowledgements kept in sync with the latest merge set
- **docs/users/getting-started.md**:
  - Version header updated to **v8.2.0**
- **CHANGELOG.md**:
  - Added the release notes section for **8.2.0**

### 3. Maintenance fixes verified

- **Issue #344**: Corrected `.claude-plugin/marketplace.json` to use `source: "./"` and added a regression test for the Claude Code marketplace entry
- **.github/MAINTENANCE.md**: Documented the maintainer flow for fork-gated workflows and stale PR metadata

### 4. Release protocol executed

- `npm run release:preflight`
- `npm run security:docs`
- `npm run validate:strict` (diagnostic, optional blocker)
- `npm run release:prepare -- 8.2.0`
- `npm run release:publish -- 8.2.0`

## Expected Outcome

- Documentation, changelog, and generated metadata all agree on the release state.
- The repository published the `v8.2.0` tag and GitHub release successfully.
