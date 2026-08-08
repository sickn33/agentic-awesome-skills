# 🛡️ Security Guardrails & Policy

Agentic Awesome Skills is a powerful toolkit. With great power comes great responsibility. This document defines the **Rules of Engagement** for all security and offensive capabilities in this repository.

## 🔴 Offensive Skills Policy (The "Red Line")

**What is an Offensive Skill?**
Any skill designed to penetrate, exploit, disrupt, or simulate attacks against systems.
_Examples: Pentesting, SQL Injection, Phishing Simulation, Red Teaming._

### 1. The "Authorized Use Only" Disclaimer

Every offensive skill **MUST** begin with this exact disclaimer in its `SKILL.md`:

> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

### 2. Mandatory User Confirmation

Offensive skills must **NEVER** run fully autonomously.

- **Requirement**: Before each command that probes, exploits, changes, persists
  on, extracts data from, or attempts credential access against a target, the
  agent must collect the exact target, written-authorization confirmation, and
  permitted scope; show the exact command and expected effect; and wait for
  explicit confirmation in the current conversation.
- Without that confirmation, the skill must remain read-only and provide
  defensive guidance only.

### 3. Safe by Design

- **No Weaponized Payloads**: Skills should not include active malware, ransomware, or non-educational exploits.
- **Sandbox Recommended**: Instructions should recommend running in a contained environment (Docker/VM).

---

## 🔵 Defensive Skills Policy

**What is a Defensive Skill?**
Tools for hardening, auditing, monitoring, or protecting systems.
_Examples: Linting, Log Analysis, Configuration Auditing._

- **Data Privacy**: Defensive skills must not upload data to 3rd party servers without explicit user consent.
- **Non-Destructive**: Audits should be read-only by default.
- **Documentation review**: Defensive skills with command examples must still be reviewed for unsafe command patterns.
- **High-risk examples** (`curl|bash`, `wget|sh`, etc.) must use explicit allowlisting comments and clear warning context in the skill body when retained for operational examples.

## External Source Installation

- Do not clone or download a moving branch directly into an active skills,
  plugin, hook, or agent-configuration directory.
- Pin external examples to a full reviewed commit or immutable release, clone to
  a temporary review directory, and inspect every bundled file before activation.
- Report scripts, package lifecycle hooks, symlinks, binaries, network access,
  credential handling, privileged actions, and destructive operations.
- Obtain explicit user approval before downloading and again before copying,
  installing dependencies, enabling hooks, or changing agent configuration.
- A pin provides reproducibility, not proof of trust; upgrading requires a new review.

---

## ⚖️ Legal Disclaimer

By using this repository, you agree that:

1. You are responsible for your own actions.
2. The authors and contributors are not liable for any damage caused by these tools.
3. You will comply with all local, state, and federal laws regarding cybersecurity.
