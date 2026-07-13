# Phase 2: Hunting

## Objective

Apply the ATTACK_PLAYBOOK.md to discover features, data flows, and trust boundaries. Build the FEATURE_INDEX.md mapping features to attack classes.

## Instructions

1. **Feature Discovery**
   - Read through entry points from RECON.json
   - Identify user-facing features (registration, login, search, upload, etc.)
   - Identify internal features (admin panels, batch jobs, data exports)
   - Map features to entry points

2. **Data Flow Analysis per Feature**
   - Trace data from input to output for each feature
   - Identify all validation and transformation steps
   - Note where trust boundaries are crossed
   - Identify sensitive data handling (PII, credentials, tokens)

3. **Attack Class Mapping**
   - For each feature, consult ATTACK-CLASSES.md
   - Map feature characteristics to applicable attack classes
   - Prioritize based on data sensitivity and exposure

4. **FEATURE_INDEX.md Generation**
   - Create a structured markdown file listing all features
   - For each feature: description, entry point, data flows, applicable attack classes
   - Include severity estimates for each attack class

## FEATURE_INDEX.md Format

```markdown
# Feature Index

## Feature: [Feature Name]
- **Entry Point:** [file:line]
- **HTTP Method:** [GET/POST/etc]
- **Authentication:** [none/session/token]
- **Authorization:** [none/role_based]
- **Data Sources:** [where input comes from]
- **Data Sinks:** [where output goes]
- **Sensitive Data:** [PII/credentials/tokens handled]
- **Applicable Attack Classes:**
  - A1: [Injection] - [justification]
  - A5: [Broken Access Control] - [justification]
  - ...

## Feature: [Next Feature]
...
```

## Critical Rules

- **NEVER skip features** — Every feature is a potential attack surface
- **NEVER skip data flows** — Attackers target data, not code
- **NEVER assume validation** — Verify every validation point in the code
- **NEVER skip internal features** — Internal features often have weaker security
