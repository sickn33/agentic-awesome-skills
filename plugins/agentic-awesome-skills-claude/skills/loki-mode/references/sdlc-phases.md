# SDLC Phases Reference

All phases with detailed workflows and testing procedures.

---

## Phase Overview

```
Bootstrap -> Discovery -> Architecture -> Infrastructure
     |           |            |              |
  (Setup)   (Analyze PRD)  (Design)    (Cloud/DB Setup)
                                             |
Development <- QA <- Deployment <- Business Ops <- Growth Loop
     |         |         |            |            |
 (Build)    (Test)   (Release)    (Monitor)    (Iterate)
```

---

## Phase 0: Bootstrap

**Purpose:** Initialize Loki Mode environment

### Actions:
1. Create `.loki/` directory structure
2. Initialize orchestrator state in `.loki/state/orchestrator.json`
3. Validate PRD exists and is readable
4. Spawn initial agent pool (3-5 agents)
5. Create CONTINUITY.md

### Directory Structure Created:
```
.loki/
+-- CONTINUITY.md
+-- state/
|   +-- orchestrator.json
|   +-- agents/
|   +-- circuit-breakers/
+-- queue/
|   +-- pending.json
|   +-- in-progress.json
|   +-- completed.json
|   +-- dead-letter.json
+-- specs/
+-- memory/
+-- artifacts/
```

---

## Phase 1: Discovery

**Purpose:** Understand requirements and market context

### Actions:
1. Parse PRD, extract requirements
2. Spawn `biz-analytics` agent for competitive research
3. Web search competitors, extract features, reviews
4. Identify market gaps and opportunities
5. Generate task backlog with priorities and dependencies

### Output:
- Requirements document
- Competitive analysis
- Initial task backlog in `.loki/queue/pending.json`

---

## Phase 2: Architecture

**Purpose:** Design system architecture and generate specs

### SPEC-FIRST WORKFLOW

**Step 1: Extract API Requirements from PRD**
- Parse PRD for user stories and functionality
- Map to REST/GraphQL operations
- Document data models and relationships

**Step 2: Generate OpenAPI 3.1 Specification**

```yaml
openapi: 3.1.0
info:
  title: Product API
  version: 1.0.0
paths:
  /auth/login:
    post:
      summary: Authenticate user and return JWT
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, password]
              properties:
                email: { type: string, format: email }
                password: { type: string, minLength: 8 }
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  token: { type: string }
                  expiresAt: { type: string, format: date-time }
        401:
          description: Invalid credentials
```

**Step 3: Validate Spec**
```bash
npm install -g @stoplight/spectral-cli
spectral lint .loki/specs/openapi.yaml
swagger-cli validate .loki/specs/openapi.yaml
```

**Step 4: Generate Artifacts from Spec**
```bash
# TypeScript types
npx openapi-typescript .loki/specs/openapi.yaml --output src/types/api.ts

# Client SDK
npx openapi-generator-cli generate \
  -i .loki/specs/openapi.yaml \
  -g typescript-axios \
  -o src/clients/api

# Server stubs
npx openapi-generator-cli generate \
  -i .loki/specs/openapi.yaml \
  -g nodejs-express-server \
  -o backend/generated

# Documentation
npx redoc-cli bundle .loki/specs/openapi.yaml -o docs/api.html
```

**Step 5: Select Tech Stack**
- Spawn `eng-backend` + `eng-frontend` architects
- Both agents review spec and propose stack
- Consensus required (both must agree)
- Self-reflection checkpoint with evidence

**Step 6: Create Project Scaffolding**
- Initialize project with tech stack
- Install dependencies
- Configure linters
- Setup contract testing framework

---

## Phase 3: Infrastructure

**Purpose:** Provision cloud resources and CI/CD

### Actions:
1. Spawn `ops-devops` agent
2. Provision cloud resources (see `references/deployment.md`)
3. Set up CI/CD pipelines
4. Configure monitoring and alerting
5. Create staging and production environments

### CI/CD Pipeline:
```yaml
name: CI/CD Pipeline
on: [push, pull_request]
jobs:
  test:
    - Lint
    - Type check
    - Unit tests
    - Contract tests
    - Security scan
  deploy-staging:
    needs: test
    - Deploy to staging
    - Smoke tests
  deploy-production:
    needs: deploy-staging
    - Blue-green deploy
    - Health checks
    - Auto-rollback on errors
```

---

## Phase 4: Development

**Purpose:** Implement features with quality gates

### Workflow Per Task:

```
1. Dispatch implementation subagent (Task tool, model: sonnet)
2. Subagent implements with TDD, commits, reports back
3. Dispatch 3 reviewers IN PARALLEL (single message, 3 Task calls):
   - code-reviewer (opus)
   - business-logic-reviewer (opus)
   - security-reviewer (opus)
4. Aggregate findings by severity
5. IF Critical/High/Medium found:
   - Dispatch fix subagent
   - Re-run ALL 3 reviewers
   - Loop until all PASS
6. Add TODO comments for Low issues
7. Add FIXME comments for Cosmetic issues
8. Mark task complete with git checkpoint
```

### Implementation Rules:
- Agents implement ONLY what's in the spec
- Must validate against openapi.yaml schema
- Must return responses matching spec
- Performance targets from spec x-performance extension

---

## Phase 5: Quality Assurance

**Purpose:** Comprehensive testing and security audit

### Testing Phases:

**UNIT Phase:**
```bash
npm run test:unit
# or
pytest tests/unit/
```
- Coverage: >80% required
- All tests must pass

**INTEGRATION Phase:**
```bash
npm run test:integration
```
- Test API endpoints against actual database
- Test external service integrations
- Verify data flows end-to-end

**E2E Phase:**
```bash
npx playwright test
# or
npx cypress run
```
- Test complete user flows
- Cross-browser testing
- Mobile responsive testing

**CONTRACT Phase:**
```bash
npm run test:contract
```
- Validate implementation matches OpenAPI spec
- Test request/response schemas
- Breaking change detection

**SECURITY Phase:**
```bash
npm audit
npx snyk test
semgrep --config=auto .
```
- OWASP Top 10 checks
- Dependency vulnerabilities
- Static analysis

**PERFORMANCE Phase:**
```bash
npx k6 run tests/load.js
npx lighthouse http://localhost:3000
```
- Load testing: 100 concurrent users for 1 minute
- Stress testing: 500 concurrent users for 30 seconds
- P95 response time < 500ms required

**ACCESSIBILITY Phase:**
```bash
npx axe http://localhost:3000
```
- WCAG 2.1 AA compliance
- Alt text, ARIA labels, color contrast
- Keyboard navigation, focus indicators

**REGRESSION Phase:**
- Compare behavior against previous version
- Verify no features broken by recent changes
- Test backward compatibility of APIs

**UAT Phase:**
- Create acceptance tests from PRD
- Walk through complete user journeys
- Verify business logic matches PRD
- Document any UX friction points

---

## Phase 6: Deployment

**Purpose:** Release to production

### Actions:
1. Spawn `ops-release` agent
2. Generate semantic version, changelog
3. Create release branch, tag
4. Deploy to staging, run smoke tests
5. Blue-green deploy to production
6. Monitor for 30min, auto-rollback if errors spike

### Deployment Strategies:

**Blue-Green:**
```
1. Deploy new version to "green" environment
2. Run smoke tests
3. Switch traffic from "blue" to "green"
4. Keep "blue" as rollback target
```

**Canary:**
```
1. Deploy to 5% of traffic
2. Monitor error rates
3. Gradually increase to 25%, 50%, 100%
4. Rollback if errors exceed threshold
```

---

## Phase 7: Business Operations

**Purpose:** Non-technical business setup

### Actions:
1. `biz-marketing`: Create landing page, SEO, content
2. `biz-sales`: Set up CRM, outreach templates
3. `biz-finance`: Configure billing (Stripe), invoicing
4. `biz-support`: Create help docs, chatbot
5. `biz-legal`: Generate ToS, privacy policy

---

## Phase 8: Growth Loop

**Purpose:** Continuous improvement

### Cycle:
```
MONITOR -> ANALYZE -> OPTIMIZE -> DEPLOY -> MONITOR
    |
Customer feedback -> Feature requests -> Backlog
    |
A/B tests -> Winner -> Permanent deploy
    |
Incidents -> RCA -> Prevention -> Deploy fix
```

### Never "Done":
- Run performance optimizations
- Add missing test coverage
- Improve documentation
- Refactor code smells
- Update dependencies
- Enhance user experience
- Implement A/B test learnings

---

## Final Review (Before Any Deployment)

```
1. Dispatch 3 reviewers reviewing ENTIRE implementation:
   - code-reviewer: Full codebase quality
   - business-logic-reviewer: All requirements met
   - security-reviewer: Full security audit

2. Aggregate findings across all files
3. Fix Critical/High/Medium issues
4. Re-run all 3 reviewers until all PASS
5. Generate final report in .loki/artifacts/reports/final-review.md
6. Proceed to deployment only after all PASS
```

---

## Quality Gates Summary

| Gate | Agent | Pass Criteria |
|------|-------|---------------|
| Unit Tests | eng-qa | 100% pass |
| Integration Tests | eng-qa | 100% pass |
| E2E Tests | eng-qa | 100% pass |
| Coverage | eng-qa | > 80% |
| Linting | eng-qa | 0 errors |
| Type Check | eng-qa | 0 errors |
| Security Scan | ops-security | 0 high/critical |
| Dependency Audit | ops-security | 0 vulnerabilities |
| Performance | eng-qa | p99 < 200ms |
| Accessibility | eng-frontend | WCAG 2.1 AA |
| Load Test | ops-devops | Handles 10x expected traffic |
| Chaos Test | ops-devops | Recovers from failures |
| Cost Estimate | ops-cost | Within budget |
| Legal Review | biz-legal | Compliant |
