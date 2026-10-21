---
name: conductor-setup
description: Configure a Rails project to work with Conductor (parallel coding agents)
allowed-tools: Read, Write, Edit, Bash(chmod *), Bash(bundle *), Bash(npm *), Bash(script/server)
context: fork
risk: critical
source: community
date_added: "2026-01-28"
metadata:
  author: Shpigford
  version: "1.0"
---

Set up the explicitly selected Rails development project for the Conductor app. Frontmatter tool/context hints are host-specific, not authorization to delegate, alter secrets or broaden permissions. Review existing scripts and lockfiles before running installs; preserve unrelated settings.

## When to Use
- You need to configure a Rails project so it runs correctly inside Conductor workspaces.
- The project should support parallel coding agents with isolated ports, Redis settings, and shared secrets.
- You want the standard `conductor.json`, `bin/conductor-setup`, and `script/server` scaffolding for a Rails repo.

# What to Create

## 1. conductor.json (project root)

Create `conductor.json` in the project root if it doesn't already exist:

```json
{
  "scripts": {
    "setup": "bin/conductor-setup",
    "run": "script/server"
  }
}
```

## 2. bin/conductor-setup (executable)

Create `bin/conductor-setup` if it doesn't already exist:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${CONDUCTOR_ROOT_PATH:?Set the reviewed repository root first}"

# Link only an explicitly approved local development secret source.
# Preserve any existing destination, including dangling symlinks; never use ln -sf.
link_if_absent() {
  local source_path="$1" destination="$2"
  if [[ -f "$source_path" && ! -e "$destination" && ! -L "$destination" ]]; then
    ln -s -- "$source_path" "$destination"
  fi
}
link_if_absent "$CONDUCTOR_ROOT_PATH/.env" .env
mkdir -p config
link_if_absent "$CONDUCTOR_ROOT_PATH/config/master.key" config/master.key

# Dependency installation may execute trusted project code and access the network.
# Review Gemfile.lock/package-lock.json and lifecycle behavior before this step.
bundle install
if [[ -f package-lock.json ]]; then
  npm ci --ignore-scripts
elif [[ -f package.json ]]; then
  printf '%s\n' 'A reviewed npm lockfile is required; no silent npm install.' >&2
  exit 1
fi
```

Make it executable with `chmod +x bin/conductor-setup`.

## 3. script/server (executable)

Create the `script` directory if needed, then create `script/server` if it doesn't already exist:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Reserve distinct ports through the workspace manager, not by assuming uniqueness.
PORT="${CONDUCTOR_PORT:-3000}"
[[ "$PORT" =~ ^[0-9]{1,5}$ ]] || { printf '%s\n' 'Invalid port' >&2; exit 1; }
PORT=$((10#$PORT))
(( PORT >= 1024 && PORT <= 64535 )) || { printf '%s\n' 'Port outside safe range' >&2; exit 1; }
export PORT
export VITE_RUBY_PORT=$((PORT + 1000))

# Supply a dedicated disposable Redis instance/namespace explicitly.
# Hashing a workspace name modulo 16 causes collisions and is not isolation.
: "${REDIS_URL:?Set an approved workspace-specific development Redis URL}"
export REDIS_URL
exec bin/dev
```

Make it executable with `chmod +x script/server`.

## 4. Update Rails Config Files

For each of the following files, if they exist and contain Redis configuration, update them to use `ENV.fetch('REDIS_URL', ...)` or `ENV['REDIS_URL']` with a fallback:

### config/initializers/sidekiq.rb
If this file exists and configures Redis, update it to use:
```ruby
redis_url = ENV.fetch('REDIS_URL', 'redis://localhost:6379/0')
```

### config/cable.yml
If this file exists, update the development adapter to use:
```yaml
development:
  adapter: redis
  url: <%= ENV.fetch('REDIS_URL', 'redis://localhost:6379/1') %>
```

### config/environments/development.rb
If this file configures Redis for caching, update to use:
```ruby
config.cache_store = :redis_cache_store, { url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0') }
```

### config/initializers/rack_attack.rb
If this file exists and configures a Redis cache store, update to use:
```ruby
Rack::Attack.cache.store = ActiveSupport::Cache::RedisCacheStore.new(url: ENV.fetch('REDIS_URL', 'redis://localhost:6379/0'))
```

# Implementation Notes

- **Don't overwrite existing files**: Check if conductor.json, bin/conductor-setup, and script/server exist before creating them. If they exist, skip creation and inform the user.
- **Rails config updates**: Only modify Redis-related configuration. If a file doesn't exist or doesn't use Redis, skip it gracefully.
- **Create directories as needed**: Create `script/` directory if it doesn't exist.

# Verification

After creating the files:
1. Confirm all Conductor files exist and scripts are executable
2. Validate script syntax first, then start the owned development server with a bounded observation window and a defined shutdown method; verify actual port/Redis separation across workspaces
3. Check that Rails configs properly reference `ENV['REDIS_URL']` or `ENV.fetch('REDIS_URL', ...)`

## Limitations
- Secret symlinks share the same sensitive values across workspaces; use only approved development credentials, preserve owner-only source permissions, exclude secrets from Git and do not imply worktrees are a secret sandbox.
- Sharing one Redis URL across Sidekiq, Cable and cache may still need service namespaces; dedicated instances or explicitly assigned namespaces are safer than modulo hashes. Never flush shared Redis as cleanup.
- npm/Gem installation and bin/dev execute project dependencies/scripts. Review them first; explicitly required lifecycle steps should be run individually after approval, not re-enabled silently.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
