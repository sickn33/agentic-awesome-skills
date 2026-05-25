# Customer Journey Map Example

## Meta Dogfooding Example: Product Manager Skills Repo

This example intentionally maps our own repository journey to model the operating principle of dogfooding: we use the same PM artifacts and quality bar we ask others to use.

```markdown
## Customer Journey Map: AI-Forward PM Lead (Product Manager Skills)

### Product
Product Manager Skills (open-source PM skill library for agentic workflows in Claude/Codex)

### Persona
- AI-Forward PM Lead: PM leader at a B2B SaaS company (20-300 employees), accountable for faster discovery/delivery, skeptical of AI hype, values practical frameworks and reusable workflows

### Objectives
- Increase qualified adoption of PM skills in real product workflows
- Improve first-week activation from discovery to successful skill usage
- Increase repeat usage and contribution behavior

| **Stage** | **Awareness** | **Consideration** | **Decision** | **Service** | **Loyalty** |
|---|---|---|---|---|---|
| **Customer Actions** | Sees LinkedIn/Substack post, hears about repo from peers, searches for PM skills for Claude/Codex | Reads README, scans skill catalog, compares with prompt libraries, checks docs | Clones repo, selects 1-2 skills, runs first guided flow, evaluates output quality | Uses multiple skills in planning/discovery cycles, adapts outputs, shares internally | Reuses as default PM operating layer, recommends to peers, opens issues/PRs |
| **Touchpoints** | LinkedIn posts, Substack, GitHub repo/search, community mentions | README, CLAUDE.md, usage docs, individual SKILL.md files | Terminal/Codex/Claude session, skill files, helper scripts, quickstart docs | Skill workflows, scripts, docs, release notes, commit history | GitHub issues/PRs, release notes, docs updates, announcements |
| **Customer Experience** | Curious but skeptical: "Is this practical or just prompt theater?" | Interested but overloaded: "Which skill should I use first?" | Hopeful but anxious: "Will this work in my real context?" | Relieved when outputs are reusable; frustrated if behavior is inconsistent | Confident and invested: "This gives my team a repeatable edge." |
| **KPIs** | GitHub page views, unique visitors, referral source mix, star rate per visitor | README-to-doc click-through, time on docs, skill page opens, first install intent | First-run success rate, time-to-first-usable-output, setup drop-off, return within 48h | Weekly active users (proxy), multi-skill usage rate, workflow completion rate, issue rate on broken patterns | Repeat contributor count, PR volume/quality, referral traffic, retention of active users |
| **Business Goals** | Reach qualified PM/PMM/Founder audiences, position as practical and agent-ready | Reduce cognitive load, help users pick the right first skill quickly | Minimize setup friction, prove value in first session | Maintain consistent quality across skills, increase workflow-level adoption | Build contributor flywheel and trust through consistency |
| **Teams Involved** | Content/author, community, maintainers | Maintainers, doc owners, skill authors | Maintainers, contributors, tooling/script maintainers | Skill authors, reviewers, maintainers | Core maintainers, contributors, community advocates |

### Analysis
**Top 3 Priority Opportunities:**
1. First-skill onboarding path: add a "Start Here (15 min)" flow mapping persona to first 3 recommended skills
2. Consistency guardrails: keep shared facilitation rules centralized and auto-checked for all linked skills
3. Activation instrumentation: define lightweight metrics for first-run success and multi-skill adoption

### Assumptions to Validate
1. Primary persona is PM leads at B2B SaaS teams
2. Most discovery traffic starts from GitHub plus social content
3. Biggest friction is "which skill first?" plus cross-skill consistency
```
