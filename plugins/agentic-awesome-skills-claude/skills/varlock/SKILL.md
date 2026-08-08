---
name: varlock
description: "Secure-by-default environment variable management for Claude Code sessions."
risk: critical
source: "https://github.com/dmno-dev/varlock"
version: 1.0.0
---

# Varlock Security Skill

Secure-by-default environment variable management for Claude Code sessions.

> **Repository**: https://github.com/dmno-dev/varlock
> **Documentation**: https://varlock.dev

## When to Use
- You need to work with environment variables or secrets in a Claude Code session without exposing their values.
- The task involves validating, loading, or auditing secrets while keeping them out of logs, diffs, and assistant context.
- You want a secure-by-default workflow built around Varlock instead of direct `.env` inspection.

## Core Principle: Secrets Never Exposed

When working with Claude, secrets must NEVER appear in:
- Terminal output
- Claude's input/output context
- Log files or traces
- Git commits or diffs
- Error messages

This skill ensures all sensitive data is properly protected.

---

## CRITICAL: Security Rules for Claude

### Rule 1: Never Echo Secrets

```bash
# ❌ NEVER DO THIS - exposes secret to Claude's context
echo $CLERK_SECRET_KEY
cat .env | grep SECRET
printenv | grep API

# ✅ DO THIS - validates without exposing
varlock load --quiet && echo "✓ Secrets validated"
```

### Rule 2: Never Read .env Directly

```bash
# ❌ NEVER DO THIS - exposes all secrets
cat .env
less .env
Read tool on .env file

# ✅ DO THIS - read schema (safe) not values
cat .env.schema
varlock load  # Shows masked values
```

### Rule 3: Use Varlock for Validation

```bash
# ❌ NEVER DO THIS - exposes secret in error
test -n "$API_KEY" && echo "Key: $API_KEY"

# ✅ DO THIS - Varlock validates and masks
varlock load
# Output shows: API_KEY 🔐sensitive └ ▒▒▒▒▒
```

### Rule 4: Never Include Secrets in Commands

```bash
# ❌ NEVER DO THIS - secret in command history
curl -H "Authorization: Bearer sk_live_xxx" https://api.example.com

# ✅ DO THIS - use environment variable
curl -H "Authorization: Bearer $API_KEY" https://api.example.com
# Or better: varlock run -- curl ...
```

---

## Quick Start

### Installation

```bash
# Install Varlock CLI
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -sSfL https://varlock.dev/install.sh -o "$tmpdir/varlock-install.sh"
cat "$tmpdir/varlock-install.sh"  # review the full installer before executing
sh "$tmpdir/varlock-install.sh" --force-no-brew

# Add to PATH (add to ~/.zshrc or ~/.bashrc)
export PATH="$HOME/.varlock/bin:$PATH"

# Verify
varlock --version
```

### Initialize Project

```bash
# Create .env.schema from existing .env
varlock init

# Or create manually
touch .env.schema
```

---

## Schema File: .env.schema

The schema defines types, validation, and sensitivity for each variable.

### Basic Structure

```bash
# Global defaults
# @defaultSensitive=true @defaultRequired=infer

# Application
# @type=enum(development,staging,production) @sensitive=false
NODE_ENV=development

# @type=port @sensitive=false
PORT=3000

# Database - SENSITIVE
# @type=url @required
DATABASE_URL=

# @type=string @required @sensitive
DATABASE_PASSWORD=

# API Keys - SENSITIVE
# @type=string(startsWith=sk_) @required @sensitive
STRIPE_SECRET_KEY=

# @type=string(startsWith=pk_) @sensitive=false
STRIPE_PUBLISHABLE_KEY=
```

### Security Annotations

| Annotation | Effect | Use For |
|------------|--------|---------|
| `@sensitive` | Redacted in all output | API keys, passwords, tokens |
| `@sensitive=false` | Shown in logs | Public keys, non-secret config |
| `@defaultSensitive=true` | All vars sensitive by default | High-security projects |

### Type Annotations

| Type | Validates | Example |
|------|-----------|---------|
| `string` | Any string | `@type=string` |
| `string(startsWith=X)` | Prefix validation | `@type=string(startsWith=sk_)` |
| `string(contains=X)` | Substring validation | `@type=string(contains=+clerk_test)` |
| `url` | Valid URL | `@type=url` |
| `port` | 1-65535 | `@type=port` |
| `boolean` | true/false | `@type=boolean` |
| `enum(a,b,c)` | One of values | `@type=enum(dev,prod)` |

---

## Safe Commands for Claude

### Validating Environment

```bash
# Check all variables (safe - masks sensitive values)
varlock load

# Quiet mode (no output on success)
varlock load --quiet

# Check specific environment
varlock load --env=production
```

### Running Commands with Secrets

```bash
# Inject validated env into command
varlock run -- npm start
varlock run -- node script.js
varlock run -- pytest

# Secrets are available to the command but never printed
```

### Checking Schema (Safe)

```bash
# Schema is safe to read - contains no values
cat .env.schema

# List expected variables
grep "^[A-Z]" .env.schema
```

---

## Common Patterns

### Pattern 1: Validate Before Operations

```bash
# Always validate environment first
varlock load --quiet || {
  echo "❌ Environment validation failed"
  exit 1
}

# Then proceed with operation
npm run build
```

### Pattern 2: Safe Secret Rotation

```bash
# 1. Update secret in external source (1Password, AWS, etc.)
# 2. Update .env file manually (don't use Claude for this)
# 3. Validate new value works
varlock load

# 4. If using GitHub Secrets, sync (values not shown)
./scripts/update-github-secrets.sh
```

### Pattern 3: CI/CD Integration

```yaml
# GitHub Actions - secrets from GitHub Secrets
- name: Validate environment
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    API_KEY: ${{ secrets.API_KEY }}
  run: varlock load --quiet
```

### Pattern 4: Docker Integration

```dockerfile
# Install Varlock in container
RUN tmpdir="$(mktemp -d)" \
    && curl -sSfL https://varlock.dev/install.sh -o "$tmpdir/varlock-install.sh" \
    && cat "$tmpdir/varlock-install.sh" \
    && sh "$tmpdir/varlock-install.sh" --force-no-brew \
    && rm -rf "$tmpdir" \
    && ln -s /root/.varlock/bin/varlock /usr/local/bin/varlock

# Validate at container start
CMD ["varlock", "run", "--", "npm", "start"]
```

---

## Handling Secret-Related Tasks

### When User Asks to "Check if API key is set"

```bash
# ✅ Safe approach
varlock load 2>&1 | grep "API_KEY"
# Shows: ✅ API_KEY 🔐sensitive └ ▒▒▒▒▒

# ❌ Never do
echo $API_KEY
```

### When User Asks to "Debug authentication"

```bash
# ✅ Safe approach - check presence and format
varlock load  # Validates types and required fields

# Check if key has correct prefix (without showing value)
varlock load 2>&1 | grep -E "(CLERK|AUTH)"

# ❌ Never do
printenv | grep KEY
```

### When User Asks to "Update a secret"

```
Claude should respond:
"I cannot directly modify secrets for security reasons. Please:
1. Update the value in your .env file manually
2. Or update in your secrets manager (1Password, AWS, etc.)
3. Then run `varlock load` to validate

I can help you update the .env.schema if you need to add new variables."
```

### When User Asks to "Show me the .env file"

```
Claude should respond:
"I won't read .env files directly as they contain secrets. Instead:
- Run `varlock load` to see masked values
- Run `cat .env.schema` to see the schema (safe)
- I can help you modify .env.schema if needed"
```

---

## External Secret Sources

### 1Password Integration

```bash
# In .env.schema
# @type=string @sensitive
API_KEY=exec('op read "op://vault/item/field"')
```

### AWS Secrets Manager

```bash
# In .env.schema
# @type=string @sensitive
DB_PASSWORD=exec('aws secretsmanager get-secret-value --secret-id prod/db')
```

### Environment-Specific Values

```bash
# In .env.schema
# @type=url
API_URL=env('API_URL_${NODE_ENV}', 'http://localhost:3000')
```

---

## Troubleshooting

### "varlock: command not found"

```bash
# Check installation
ls ~/.varlock/bin/varlock

# Add to PATH
export PATH="$HOME/.varlock/bin:$PATH"

# Or use full path
~/.varlock/bin/varlock load
```

### "Schema validation failed"

```bash
# Check which variables are missing/invalid
varlock load  # Shows detailed errors

# Common fixes:
# - Add missing required variables to .env
# - Fix type mismatches (port must be number)
# - Check string prefixes match schema
```

### "Sensitive value exposed in logs"

```bash
# 1. Rotate the exposed secret immediately
# 2. Check .env.schema has @sensitive annotation
# 3. Ensure using varlock commands, not echo/cat

# Add missing sensitivity:
# Before: API_KEY=
# After:  # @type=string @sensitive
#         API_KEY=
```

---

## npm Scripts

Add these to your package.json:

```json
{
  "scripts": {
    "env:validate": "varlock load",
    "env:check": "varlock load --quiet || echo 'Environment validation failed'",
    "prestart": "varlock load --quiet",
    "start": "varlock run -- node server.js"
  }
}
```

---

## Security Checklist for New Projects

- [ ] Install Varlock CLI
- [ ] Create `.env.schema` with all variables defined
- [ ] Mark all secrets with `@sensitive` annotation
- [ ] Add `@defaultSensitive=true` to schema header
- [ ] Add `.env` to `.gitignore`
- [ ] Commit `.env.schema` to version control
- [ ] Add `npm run env:validate` to CI/CD
- [ ] Document secret rotation procedure
- [ ] Never use `cat .env` or `echo $SECRET` in Claude sessions

---

## Quick Reference Card

| Task | Safe Command |
|------|-------------|
| Validate all env vars | `varlock load` |
| Quiet validation | `varlock load --quiet` |
| Run with env | `varlock run -- <cmd>` |
| View schema | `cat .env.schema` |
| Check specific var | `varlock load \| grep VAR_NAME` |

| Never Do | Why |
|----------|-----|
| `cat .env` | Exposes all secrets |
| `echo $SECRET` | Exposes to Claude context |
| `printenv \| grep` | Exposes matching secrets |
| Read .env with tools | Secrets in Claude's context |
| Hardcode in commands | In shell history |

---

## Integration with Other Skills

### Clerk Skill
- Test user passwords are `@sensitive`
- Test emails are `@sensitive=false` (contain +clerk_test, not secret)
- See: `~/.claude/skills/clerk/SKILL.md`

### Docker Skill
- Mount `.env` file, never copy secrets to image
- Use `varlock run` as entrypoint
- See: `~/.claude/skills/docker/SKILL.md`

---

*Last updated: December 22, 2025*
*Secure-by-default environment management for Claude Code*

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
