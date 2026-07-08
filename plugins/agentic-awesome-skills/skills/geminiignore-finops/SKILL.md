---
name: geminiignore-finops
description: "Configure and optimize .geminiignore files for AI context window efficiency and token cost reduction (FinOps)."
category: context-optimization
risk: safe
source: community
source_repo: iradoweck/antigravity-awesome-skills
source_type: community
date_added: "2026-05-25"
author: iradoweck
tags: [finops, context-management, token-optimization, geminiignore]
tools: [gemini, claude, cursor]
license: "MIT"
license_source: "https://github.com/iradoweck/antigravity-awesome-skills/blob/main/LICENSE"
---

# GeminiIgnore FinOps Setup & Optimization

## Overview

A skill to construct, refine, and maintain high-performance `.geminiignore` files across diverse tech stacks. By filtering out machine-generated code, heavy logs, package locks, and binary assets, this skill optimizes the AI agent's context window, accelerates processing speed, and reduces token consumption costs (FinOps).

## When to Use This Skill

- Use when initializing a new repository or workspace for pair-programming with AI agents.
- Use when the AI context window is reaching its limits or when billing optimization (FinOps) is a priority.
- Use when the AI agent is accidentally reading build outputs, lock files, databases, or binary media.

## How It Works

### Step 1: Analyze the Workspace Tech Stack
Detect the languages, frameworks, and dependency managers present in the project (e.g., Node.js, Python, PHP, Dart/Flutter, Rust).

### Step 2: Initialize or Update the `.geminiignore` File
Create a `.geminiignore` file at the root of the active workspace. If one already exists, review it to add missing categories.

### Step 3: Implement the 7 Core Rules
Add rules divided into the following categories to filter out unnecessary machine noise while keeping human-written code visible:

1. **System & Editor Noise**: Block OS temp files (`.DS_Store`, `Thumbs.db`) and user-specific IDE caches (`.idea/`, `.vscode/*`, Xcode user data).
2. **Dependency Folders & Lock Files**: Ignore third-party package directories (`node_modules/`, `vendor/`) and giant machine-generated lock files (`package-lock.json`, `yarn.lock`, `Cargo.lock`, `composer.lock`).
3. **Build & Target Output**: Block compiled folders (`dist/`, `build/`, `.next/`, `.nuxt/`).
4. **Caches & Tool Metadata**: Block compiler caches (`.tsbuildinfo`, `.vite/`, `.pytest_cache/`, `.eslintcache`).
5. **Binary & Rich Assets**: Block media types (`*.png`, `*.pdf`, `*.mp4`, `*.woff2`) to prevent triggering expensive vision/multimodal tokens.
6. **Local Databases & Logs**: Block log files (`*.log`) and SQL dumps or local SQLite DBs (`*.sqlite`, `*.db`).
7. **Compiled Binaries & Mobile Builds**: Block mobile package files (`*.apk`, `*.ipa`) and compiled binaries (`*.class`, `*.pyc`, `*.dll`).

### Step 4: Validate Exclusions
Verify that the AI can still see critical configuration blueprints (like `.env.example`, `package.json`, `composer.json`, `pyproject.toml`) but ignores the actual `.env` files and compilation artifacts.

## Examples

### Example 1: Standard Universal `.geminiignore` Template

Here is a recommended baseline configuration for a multi-language project:

```ini
# ==============================================================================
# .geminiignore - BASELINE DE FINOPS E ARQUITETURA
# ==============================================================================

# 1. SISTEMA OPERACIONAL E IDEs
.DS_Store
Thumbs.db
Desktop.ini
$RECYCLE.BIN/
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
.idea/
*.iml
.gradle/
local.properties
.history/

# 2. DEPENDÊNCIAS (ECONOMIA DE TOKENS EM LOCK FILES)
node_modules/
package-lock.json
yarn.lock
pnpm-lock.yaml
vendor/
composer.lock
venv/
.venv/
env/
.env
.env.*
!.env.example
poetry.lock
Cargo.lock
pubspec.lock

# 3. BUILDS E EXPORTAÇÕES
dist/
build/
out/
target/
.next/
.nuxt/
.output/
bin/
obj/

# 4. CACHES DE FRAMEWORKS
.vite/
.parcel-cache/
.eslintcache
.babel-cache/
.tsbuildinfo
.turbo/
.pytest_cache/
.ruff_cache/
storage/framework/
storage/logs/

# 5. ASSETS BINÁRIOS E MULTIMÍDIA EXTREMOS
*.png
*.jpg
*.jpeg
*.gif
*.webp
*.svg
*.ico
*.psd
*.fig
*.pdf
*.zip
*.tar.gz
*.woff
*.woff2
*.ttf

# 6. BANCOS DE DADOS E LOGS
*.log
*.db
*.sqlite
*.sqlite3
*.sql
*.sql.gz

# 7. ARQUIVOS COMPILADOS
*.apk
*.aab
*.ipa
*.jar
*.class
*.pyc
__pycache__/
*.so
*.dylib
*.dll
*.exe
*.js.map
*.css.map
```

## Best Practices

- ✅ **Ignore dependency lock files**: Standard lock files (e.g., `package-lock.json`, `yarn.lock`) contain thousands of lines of redundant package resolution trees. Ignoring them is the single largest FinOps win.
- ✅ **Keep configurations visible**: Ensure manifests like `package.json`, `composer.json`, `Cargo.toml`, and `pyproject.toml` are NEVER ignored, as the AI needs them to understand dependencies.
- ✅ **Whitelist config examples**: Use rules like `!.env.example` alongside `.env` ignores so the AI understands configuration structure without exposing credentials.
- ❌ **Do not ignore source code**: Avoid overly broad folder patterns like `lib/` or `app/` if they contain primary source code. Be specific (e.g., block `vendor/bundle/` but not your actual code).

## Limitations

- A `.geminiignore` file only affects AI tools parsing the workspace; it does not replace `.gitignore` for Git repository hosting.
- Patterns must be formatted correctly according to gitignore-style globbing to avoid accidentally ignoring source files.

## Related Skills

- `@context-optimization` - Broad tactics for context window management.
- `@clean-code` - Architectural practices for clean, human-readable codebases.
