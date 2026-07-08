---
name: skill-scanner
description: "Scan agent skills for security issues before adoption. Detects prompt injection, malicious code, excessive permissions, secret exposure, and supply chain risks."
risk: unknown
source: community
---

# Skill Security Scanner

Scan agent skills for security issues before adoption. Detects prompt injection, malicious code, excessive permissions, secret exposure, and supply chain risks.

**Important**: Run all scripts from the repository root using the full path via `${CLAUDE_SKILL_ROOT}`.

## When to Use
- You need to evaluate a skill for prompt injection, malicious code, over-broad permissions, or supply-chain risk before adopting it.
- You want a static scan plus manual review workflow for a skill directory.
- The task is to decide whether a skill is safe enough to trust in an agent environment.

## Bundled Script

### `scripts/scan_skill.py`

Static analysis scanner that detects deterministic patterns. Outputs structured JSON.

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/scan_skill.py <skill-directory>
```

Returns JSON with findings, URLs, structure info, and severity counts. The script catches patterns mechanically — your job is to evaluate intent and filter false positives.

## Workflow

### Phase 1: Input & Discovery

Determine the scan target:

- If the user provides a skill directory path, use it directly
- If the user names a skill, look for it under `plugins/*/skills/<name>/` or `.claude/skills/<name>/`
- If the user says "scan all skills", discover all `*/SKILL.md` files and scan each

Validate the target contains a `SKILL.md` file. List the skill structure:

```bash
ls -la <skill-directory>/
ls <skill-directory>/references/ 2>/dev/null
ls <skill-directory>/scripts/ 2>/dev/null
```

### Phase 2: Automated Static Scan

Run the bundled scanner:

```bash
uv run ${CLAUDE_SKILL_ROOT}/scripts/scan_skill.py <skill-directory>
```

Parse the JSON output. The script produces findings with severity levels, URL analysis, and structure information. Use these as leads for deeper analysis.

**Fallback**: If the script fails, proceed with manual analysis using Grep patterns from the reference files.

### Phase 3: Frontmatter Validation

Read the SKILL.md and check:

- **Required fields**: `name` and `description` must be present
- **Name consistency**: `name` field should match the directory name
- **Tool assessment**: Review `allowed-tools` — is Bash justified? Are tools unrestricted (`*`)?
- **Model override**: Is a specific model forced? Why?
- **Description quality**: Does the description accurately represent what the skill does?

### Phase 4: Prompt Injection Analysis

Load `${CLAUDE_SKILL_ROOT}/references/prompt-injection-patterns.md` for context.

Review scanner findings in the "Prompt Injection" category. For each finding:

1. Read the surrounding context in the file
2. Determine if the pattern is **performing** injection (malicious) or **discussing/detecting** injection (legitimate)
3. Skills about security, testing, or education commonly reference injection patterns — this is expected

**Critical distinction**: A security review skill that lists injection patterns in its references is documenting threats, not attacking. Only flag patterns that would execute against the agent running the skill.

### Phase 5: Behavioral Analysis

This phase is agent-only — no pattern matching. Read the full SKILL.md instructions and evaluate:

**Description vs. instructions alignment**:
- Does the description match what the instructions actually tell the agent to do?
- A skill described as "code formatter" that instructs the agent to read ~/.ssh is misaligned

**Config/memory poisoning**:
- Instructions to modify `CLAUDE.md`, `MEMORY.md`, `settings.json`, `.mcp.json`, or hook configurations
- Instructions to add itself to allowlists or auto-approve permissions
- Writing to `~/.claude/` or any agent configuration directory

**Scope creep**:
- Instructions that exceed the skill's stated purpose
- Unnecessary data gathering (reading files unrelated to the skill's function)
- Instructions to install other skills, plugins, or dependencies not mentioned in the description

**Information gathering**:
- Reading environment variables beyond what's needed
- Listing directory contents outside the skill's scope
- Accessing git history, credentials, or user data unnecessarily

### Phase 6: Script Analysis

If the skill has a `scripts/` directory:

1. Load `${CLAUDE_SKILL_ROOT}/references/dangerous-code-patterns.md` for context
2. Read each script file fully (do not skip any)
3. Check scanner findings in the "Malicious Code" category
4. For each finding, evaluate:
   - **Data exfiltration**: Does the script send data to external URLs? What data?
   - **Reverse shells**: Socket connections with redirected I/O
   - **Credential theft**: Reading SSH keys, .env files, tokens from environment
   - **Dangerous execution**: eval/exec with dynamic input, shell=True with interpolation
   - **Config modification**: Writing to agent settings, shell configs, git hooks
5. Check PEP 723 `dependencies` — are they legitimate, well-known packages?
6. Verify the script's behavior matches the SKILL.md description of what it does

**Legitimate patterns**: `gh` CLI calls, `git` commands, reading project files, JSON output to stdout are normal for skill scripts.

### Phase 7: Supply Chain Assessment

Review URLs from the scanner output and any additional URLs found in scripts:

- **Trusted domains**: GitHub, PyPI, official docs — normal
- **Untrusted domains**: Unknown domains, personal sites, URL shorteners — flag for review
- **Remote instruction loading**: Any URL that fetches content to be executed or interpreted as instructions is high risk
- **Dependency downloads**: Scripts that download and execute binaries or code at runtime
- **Unverifiable sources**: References to packages or tools not on standard registries

### Phase 8: Permission Analysis

Load `${CLAUDE_SKILL_ROOT}/references/permission-analysis.md` for the tool risk matrix.

Evaluate:

- **Least privilege**: Are all granted tools actually used in the skill instructions?
- **Tool justification**: Does the skill body reference operations that require each tool?
- **Risk level**: Rate the overall permission profile using the tier system from the reference

Example assessments:
- `Read Grep Glob` — Low risk, read-only analysis skill
- `Read Grep Glob Bash` — Medium risk, needs Bash justification (e.g., running bundled scripts)
- `Read Grep Glob Bash Write Edit WebFetch Task` — High risk, near-full access

## Confidence Levels

| Level | Criteria | Action |
|-------|----------|--------|
| **HIGH** | Pattern confirmed + malicious intent evident | Report with severity |
| **MEDIUM** | Suspicious pattern, intent unclear | Note as "Needs verification" |
| **LOW** | Theoretical, best practice only | Do not report |

**False positive awareness is critical.** The biggest risk is flagging legitimate security skills as malicious because they reference attack patterns. Always evaluate intent before reporting.

## Output Format

```markdown
## Skill Security Scan: [Skill Name]

### Summary
- **Findings**: X (Y Critical, Z High, ...)
- **Risk Level**: Critical / High / Medium / Low / Clean
- **Skill Structure**: SKILL.md only / +references / +scripts / full

### Findings

#### [SKILL-SEC-001] [Finding Type] (Severity)
- **Location**: `SKILL.md:42` or `scripts/tool.py:15`
- **Confidence**: High
- **Category**: Prompt Injection / Malicious Code / Excessive Permissions / Secret Exposure / Supply Chain / Validation
- **Issue**: [What was found]
- **Evidence**: [code snippet]
- **Risk**: [What could happen]
- **Remediation**: [How to fix]

### Needs Verification
[Medium-confidence items needing human review]

### Assessment
[Safe to install / Install with caution / Do not install]
[Brief justification for the assessment]
```

**Risk level determination**:
- **Critical**: Any high-confidence critical finding (prompt injection, credential theft, data exfiltration)
- **High**: High-confidence high-severity findings or multiple medium findings
- **Medium**: Medium-confidence findings or minor permission concerns
- **Low**: Only best-practice suggestions
- **Clean**: No findings after thorough analysis

## Reference Files

| File | Purpose |
|------|---------|
| `references/prompt-injection-patterns.md` | Injection patterns, jailbreaks, obfuscation techniques, false positive guide |
| `references/dangerous-code-patterns.md` | Script security patterns: exfiltration, shells, credential theft, eval/exec |
| `references/permission-analysis.md` | Tool risk tiers, least privilege methodology, common skill permission profiles |

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
