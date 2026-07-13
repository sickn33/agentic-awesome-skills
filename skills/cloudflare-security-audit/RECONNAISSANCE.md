# Phase 1: Reconnaissance

## Objective

Identify ALL technologies, frameworks, languages, entry points, and dependencies in the target codebase. Generate a machine-readable `RECON.json` manifest.

## Instructions

1. **Technology Stack Identification**
   - Scan for language-specific config files (package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, etc.)
   - Identify frameworks from imports and config (React, Express, Django, Spring, etc.)
   - List databases (SQL, NoSQL, file-based)
   - Identify cloud services and APIs

2. **Entry Point Discovery**
   - HTTP handlers (routes, controllers, middleware)
   - CLI commands and scripts
   - Message queue consumers
   - WebSocket handlers
   - File upload/download endpoints
   - Scheduled tasks/cron jobs

3. **Data Flow Mapping**
   - Input sources (user input, API requests, file reads, database queries)
   - Data transformations
   - Output sinks (database writes, API responses, file writes, logs)

4. **Trust Boundary Identification**
   - Authentication mechanisms
   - Authorization checks
   - Input validation boundaries
   - External vs internal interfaces

5. **Dependency Analysis**
   - Third-party libraries and versions
   - Known vulnerabilities (CVE lookup)
   - Outdated dependencies

## Output Format

Generate `RECON.json` with this structure:

```json
{
  "timestamp": "ISO-8601",
  "target": "repository path",
  "technologies": {
    "languages": [],
    "frameworks": [],
    "databases": [],
    "cloud_services": [],
    "build_tools": []
  },
  "entry_points": [
    {
      "type": "http|cli|queue|websocket|file|cron",
      "location": "file:line",
      "method": "HTTP method if applicable",
      "path": "route path if applicable",
      "authentication": "none|session|token|api_key",
      "authorization": "none|role_based|attribute_based"
    }
  ],
  "data_flows": [
    {
      "name": "flow name",
      "source": "input source",
      "transformations": ["step1", "step2"],
      "sink": "output sink",
      "trust_boundary_crossed": true/false
    }
  ],
  "trust_boundaries": [
    {
      "name": "boundary name",
      "location": "file:line",
      "type": "auth|validation|encryption"
    }
  ],
  "dependencies": [
    {
      "name": "package name",
      "version": "installed version",
      "latest_version": "latest available",
      "known_vulnerabilities": []
    }
  ]
}
```

## Critical Rules

- **NEVER skip technologies** — Missing one technology means missing entire attack classes
- **NEVER assume** — Verify every technology through config files, not just imports
- **NEVER skip entry points** — Every entry point is a potential attack vector
- **NEVER trust documentation** — Verify tech stack from actual code, not README claims
