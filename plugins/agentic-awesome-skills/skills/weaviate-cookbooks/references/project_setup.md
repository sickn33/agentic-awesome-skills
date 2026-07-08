# Project Setup Contract (All Cookbooks)

Use this reference before generating any cookbook app.

## Goal

Set up a safe default project layout that prevents accidental secret leaks and keeps setup instructions consistent across all cookbooks.

## Required Order

1. Create project directory.
2. Initialize git immediately.
3. Create `.gitignore` before any local `.env` file.
4. Create `.env` from [environment_requirements.md](environment_requirements.md).
5. Ask user to fill required values (`WEAVIATE_URL`, `WEAVIATE_API_KEY`) and only the optional keys they need.

## Required Files

### `.gitignore`

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/

# Node
node_modules/
.next/
out/
dist/

# Local env files (never commit secrets)
.env
.env.*
secrets/

# Common local artifacts
.DS_Store
```

### `.env`

- Use the canonical template as provided in [environment_requirements.md](environment_requirements.md).
- Keep real `.env` values local only.

## Git Baseline

Run these commands in every new cookbook app:

```bash
git init
git add .gitignore
git commit -m "initialize project baseline"
```

## Claude Safety Baseline (Recommended)

For projects developed with Claude Code, add deny rules for local secret files:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./**/.env)",
      "Read(./**/.env.*)",
      "Read(./secrets/**)"
    ]
  }
}
```

Save this to `.claude/settings.json` at project root.
