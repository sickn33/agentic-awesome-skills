---
name: web-artifacts-builder
description: "Create React frontend artifacts and bundle a reviewed project into a shareable HTML file."
risk: critical
source: community
date_added: "2026-02-27"
---

# Web Artifacts Builder

To build powerful frontend claude.ai artifacts, follow these steps:
1. Initialize the frontend repo using `scripts/init-artifact.sh`
2. Develop your artifact by editing the generated code
3. Bundle all code into a single HTML file using `scripts/bundle-artifact.sh`
4. Display artifact to user
5. (Optional) Test the artifact

**Stack**: version-selected React/TypeScript/Vite scaffold plus Parcel, Tailwind 3.x and a bundled shadcn-style component snapshot. Mixed snapshot/dependency versions require build verification.

Catalog modification notice: repaired initialization path/version handling, preserved existing outputs, and added explicit checks for the bundled component snapshot. The Apache-2.0 license text is retained. Archive members have no per-file upstream notices/pinned source in this tree; their full provenance/license compatibility is unresolved, so do not claim a complete third-party license audit.

Resolve scripts from the installed skill directory and run initialization in a disposable output parent. Install/build commands fetch packages and may run lifecycle scripts; review selected versions and preserve the lockfile. Supply an explicitly reviewed CREATE_VITE_VERSION and a compatible supported Node/pnpm toolchain. Never embed credentials/private data in client bundles; self-contained HTML still executes JavaScript and may request external resources.

## Design & Style Guidelines

VERY IMPORTANT: To avoid what is often referred to as "AI slop", avoid using excessive centered layouts, purple gradients, uniform rounded corners, and Inter font.

## Quick Start

### Step 1: Initialize Project

Run the initialization script to create a new React project:
```bash
CREATE_VITE_VERSION=<reviewed-version> bash "$SKILL_DIR/scripts/init-artifact.sh" <project-name>
cd <project-name>
```

This creates a fully configured project with:
- ✅ React + TypeScript (via Vite)
- ✅ Tailwind CSS 3.4.1 with shadcn/ui theming system
- ✅ Path aliases (`@/`) configured
- ✅ 40+ shadcn/ui components pre-installed
- ✅ All Radix UI dependencies included
- ✅ Parcel configured for bundling (via .parcelrc)
- Requires a supported Node toolchain compatible with the explicitly selected scaffold; no blanket Node 18 compatibility

### Step 2: Develop Your Artifact

To build the artifact, edit the generated files. See **Common Development Tasks** below for guidance.

### Step 3: Bundle to Single HTML File

To bundle the React app into a single HTML artifact:
```bash
bash "$SKILL_DIR/scripts/bundle-artifact.sh"
```

This creates `bundle.html` with bundleable JavaScript/CSS/assets inlined. Verify dynamic URLs, fonts, images, worker chunks and runtime requests before describing it as self-contained or offline. This file can be directly shared in Claude conversations as an artifact.

**Requirements**: Your project must have an `index.html` in the root directory.

**What the script does**:
- Installs bundling dependencies (parcel, @parcel/config-default, parcel-resolver-tspaths, html-inline)
- Creates `.parcelrc` config with path alias support
- Builds with Parcel (no source maps)
- Inlines all assets into single HTML using html-inline

### Step 4: Share Artifact with User

Finally, share the bundled HTML file in conversation with the user so they can view it as an artifact.

### Step 5: Testing/Visualizing the Artifact (Optional)

Run the generated project's type/build checks and a representative browser check before describing it as working. Verify main interactions, keyboard/focus behavior, responsive layout and the final bundled file (not only Vite development mode). If a check cannot run, state that limitation when sharing the artifact. Publication or external uploads require the requested authorization.

Bundled snapshot caveats: calendar styles include newer Tailwind syntax that may not work with Tailwind 3.4.1; resizable-panel APIs are version-sensitive; the initializer patches a missing Progress value forwarding and a Menubar displayName typo. Form helpers require FormProvider/FormField/FormItem composition, and dialogs/command dialogs need accessible titles/descriptions. These are starting components, not a certified accessible component suite.

## Reference

- **shadcn/ui components**: https://ui.shadcn.com/docs/components

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
