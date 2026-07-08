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

- **Requirement**: The skill description/instructions must explicitly tell the agent to _ask for user confirmation_ before executing any exploit or attack command.
- **Agent Instruction**: "Ask the user to verify the target URL/IP before running."

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

---

## ⚖️ Legal Disclaimer

By using this repository, you agree that:

1. You are responsible for your own actions.
2. The authors and contributors are not liable for any damage caused by these tools.
3. You will comply with all local, state, and federal laws regarding cybersecurity.
