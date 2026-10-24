---
name: gdpr-data-handling
description: "Practical implementation guide for GDPR-oriented data-processing design, consent management, and privacy controls."
risk: critical
source: community
date_added: "2026-02-27"
---

# GDPR Data Handling

Practical implementation guide for GDPR-oriented data-processing design, consent management, and privacy controls.

## Use this skill when

- Building systems that process EU personal data
- Implementing consent management
- Handling data subject requests (DSRs)
- Conducting GDPR compliance reviews
- Designing privacy-first architectures
- Creating data processing agreements

## Do not use this skill when

- The task is unrelated to gdpr data handling
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

The playbook is partial application scaffolding, not a compliance certification. Database/auth/event/notification helpers and calendar-month deadline computation must be implemented and tested before use; a request-supplied `verified` boolean is not identity proof. Authenticate/authorize the handler and subject ownership before any export/deletion, filter third-party data and report partial-source failures without marking complete. Portability has specific legal scope and is not identical to access. Retention periods and consent-log fields are illustrative, not universal legal minima; justify collection and apply legal holds/backups/restore handling. Pseudonymisation/removing IDs does not establish anonymity. Breach risk flags require a documented competent assessment, with the controller clock tied to actual awareness; high-risk subject notification is without undue delay and has legal exceptions. Do not dispatch notices or delete data outside the authorized incident/request procedure. See [EDPB rights timing](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en) and [EDPB breaches](https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en).
