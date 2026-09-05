---
name: api-patterns
description: "API design principles and decision-making. REST vs GraphQL vs tRPC selection, response formats, versioning, pagination."
risk: none
source: community
date_added: "2026-02-27"
---

# API Patterns

> API design decisions tied to the consumers and deployment constraints.
> **Learn to THINK, not copy fixed patterns.**

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

---

## 📑 Content Map

| File | Description | When to Read |
|------|-------------|--------------|
| `api-style.md` | REST vs GraphQL vs tRPC decision tree | Choosing API type |
| `rest.md` | Resource naming, HTTP methods, status codes | Designing REST API |
| `response.md` | Envelope pattern, error format, pagination | Response structure |
| `graphql.md` | Schema design, when to use, security | Considering GraphQL |
| `trpc.md` | TypeScript monorepo, type safety | TS fullstack projects |
| `versioning.md` | URI/Header/Query versioning | API evolution planning |
| `auth.md` | JWT, OAuth, Passkey, API Keys | Auth pattern selection |
| `rate-limiting.md` | Token bucket, sliding window | API protection |
| `documentation.md` | OpenAPI/Swagger best practices | Documentation |
| `security-testing.md` | OWASP API Top 10, auth/authz testing | Security audits |

---

## 🔗 Related Skills

| Need | Skill |
|------|-------|
| API implementation | `@[skills/backend-architect]` |
| Data structure | `@[skills/database-design]` |
| Security details | `@[skills/api-security-best-practices]` |

---

## ✅ Decision Checklist

Before designing an API:

- [ ] **Asked user about API consumers?**
- [ ] **Chosen API style for THIS context?** (REST/GraphQL/tRPC)
- [ ] **Defined consistent response format?**
- [ ] **Planned versioning strategy?**
- [ ] **Considered authentication needs?**
- [ ] **Planned rate limiting?**
- [ ] **Documentation approach defined?**

---

## ❌ Anti-Patterns

**DON'T:**
- Default to REST for everything
- Use verbs in REST endpoints (/getUsers)
- Return inconsistent response formats
- Expose internal errors to clients
- Skip rate limiting

**DO:**
- Choose API style based on context
- Ask about client requirements
- Document thoroughly
- Use appropriate status codes

---

## Script

| Script | Purpose | Command |
|--------|---------|---------|
| `scripts/api_validator.py` | Local heuristic source scan (not schema validation) | `python3 skills/api-patterns/scripts/api_validator.py <project_path>` |

## When to Use

Use when defining a new endpoint contract, selecting REST/GraphQL/tRPC for known consumers, or changing pagination, errors, authentication or compatibility behavior. For a bug inside an existing contract, preserve that contract unless the task authorizes a change.

## Inputs and procedure

Record consumers and deployed versions, expected payload size, access rules, compatibility obligations and one concrete operation. Read the relevant files in the map, compare the realistic choices, then specify request/response examples and rejection cases. Types shared at build time do not ensure that independently deployed clients remain compatible.

## Worked example

Input: a public order list changes while clients page through it. Choose a bounded page size and cursor over a stable `(created_at, id)` order. Define the next-cursor format, authorization filter and behavior for a removed record or invalid cursor. Test two equal timestamps and an insertion between pages. Expected: no duplicate IDs within the promised snapshot semantics; document whether newly inserted rows can appear.

## Limitations

- The Python helper scans at most 15 matching files using regular expressions and shallow JSON/YAML checks. Its output is a triage hint, not OpenAPI validation, an authorization audit or deployment approval.
- GraphQL query shape, tRPC inference and HTTP method names do not enforce resource authorization or backwards compatibility.
- Rate limiting cannot alone prevent all resource exhaustion; size, concurrency, time and provider-cost bounds depend on the operation.
- Perform security checks only against authorized local/test targets with isolated accounts and a defined scope.
