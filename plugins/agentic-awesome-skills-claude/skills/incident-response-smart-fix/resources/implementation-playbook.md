# Intelligent Issue Resolution with Multi-Agent Orchestration Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Intelligent Issue Resolution with Multi-Agent Orchestration

[Extended thinking: This workflow implements a sophisticated debugging and resolution pipeline that leverages AI-assisted debugging tools and observability platforms to systematically diagnose and resolve production issues. The intelligent debugging strategy combines automated root cause analysis with human expertise, using modern 2024/2025 practices including AI code assistants (GitHub Copilot, Claude Code), observability platforms (Sentry, DataDog, OpenTelemetry), git bisect automation for regression tracking, and production-safe debugging techniques like distributed tracing and structured logging. The process follows a rigorous four-phase approach: (1) Issue Analysis Phase - error-detective and debugger agents analyze error traces, logs, reproduction steps, and observability data to understand the full context of the failure including upstream/downstream impacts, (2) Root Cause Investigation Phase - debugger and code-reviewer agents perform deep code analysis, automated git bisect to identify introducing commit, dependency compatibility checks, and state inspection to isolate the exact failure mechanism, (3) Fix Implementation Phase - domain-specific agents (python-pro, typescript-pro, rust-expert, etc.) implement minimal fixes with comprehensive test coverage including unit, integration, and edge case tests while following production-safe practices, (4) Verification Phase - test-automator and performance-engineer agents run regression suites, performance benchmarks, security scans, and verify no new issues are introduced. Complex issues spanning multiple systems require orchestrated coordination between specialist agents (database-optimizer → performance-engineer → devops-troubleshooter) with explicit context passing and state sharing. The workflow emphasizes understanding root causes over treating symptoms, implementing lasting architectural improvements, automating detection through enhanced monitoring and alerting, and preventing future occurrences through type system enhancements, static analysis rules, and improved error handling patterns. Success is measured not just by issue resolution but by reduced mean time to recovery (MTTR), prevention of similar issues, and improved system resilience.]

## Phase 1: Issue Analysis - Error Detection and Context Gathering

Use Task tool with subagent_type="error-debugging::error-detective" followed by subagent_type="error-debugging::debugger":

**First: Error-Detective Analysis**

**Prompt:**
```
Analyze error traces, logs, and observability data for: $ARGUMENTS

Deliverables:
1. Error signature analysis: exception type, message patterns, frequency, first occurrence
2. Stack trace deep dive: failure location, call chain, involved components
3. Reproduction steps: minimal test case, environment requirements, data fixtures needed
4. Observability context:
   - Sentry/DataDog error groups and trends
   - Distributed traces showing request flow (OpenTelemetry/Jaeger)
   - Structured logs (JSON logs with correlation IDs)
   - APM metrics: latency spikes, error rates, resource usage
5. User impact assessment: affected user segments, error rate, business metrics impact
6. Timeline analysis: when did it start, correlation with deployments/config changes
7. Related symptoms: similar errors, cascading failures, upstream/downstream impacts

Modern debugging techniques to employ:
- AI-assisted log analysis (pattern detection, anomaly identification)
- Distributed trace correlation across microservices
- Production-safe debugging (no code changes, use observability data)
- Error fingerprinting for deduplication and tracking
```

**Expected output:**
```
ERROR_SIGNATURE: {exception type + key message pattern}
FREQUENCY: {count, rate, trend}
FIRST_SEEN: {timestamp or git commit}
STACK_TRACE: {formatted trace with key frames highlighted}
REPRODUCTION: {minimal steps + sample data}
OBSERVABILITY_LINKS: [Sentry URL, DataDog dashboard, trace IDs]
USER_IMPACT: {affected users, severity, business impact}
TIMELINE: {when started, correlation with changes}
RELATED_ISSUES: [similar errors, cascading failures]
```

**Second: Debugger Root Cause Identification**

**Prompt:**
```
Perform root cause investigation using error-detective output:

Context from Error-Detective:
- Error signature: {ERROR_SIGNATURE}
- Stack trace: {STACK_TRACE}
- Reproduction: {REPRODUCTION}
- Observability: {OBSERVABILITY_LINKS}

Deliverables:
1. Root cause hypothesis with supporting evidence
2. Code-level analysis: variable states, control flow, timing issues
3. Git bisect analysis: identify introducing commit (automate with git bisect run)
4. Dependency analysis: version conflicts, API changes, configuration drift
5. State inspection: database state, cache state, external API responses
6. Failure mechanism: why does the code fail under these specific conditions
7. Fix strategy options with tradeoffs (quick fix vs proper fix)

Context needed for next phase:
- Exact file paths and line numbers requiring changes
- Data structures or API contracts affected
- Dependencies that may need updates
- Test scenarios to verify the fix
- Performance characteristics to maintain
```

**Expected output:**
```
ROOT_CAUSE: {technical explanation with evidence}
INTRODUCING_COMMIT: {git SHA + summary if found via bisect}
AFFECTED_FILES: [file paths with specific line numbers]
FAILURE_MECHANISM: {why it fails - race condition, null check, type mismatch, etc}
DEPENDENCIES: [related systems, libraries, external APIs]
FIX_STRATEGY: {recommended approach with reasoning}
QUICK_FIX_OPTION: {temporary mitigation if applicable}
PROPER_FIX_OPTION: {long-term solution}
TESTING_REQUIREMENTS: [scenarios that must be covered]
```

## Phase 2: Root Cause Investigation - Deep Code Analysis

Use Task tool with subagent_type="error-debugging::debugger" and subagent_type="comprehensive-review::code-reviewer" for systematic investigation:

**First: Debugger Code Analysis**

**Prompt:**
```
Perform deep code analysis and bisect investigation:

Context from Phase 1:
- Root cause: {ROOT_CAUSE}
- Affected files: {AFFECTED_FILES}
- Failure mechanism: {FAILURE_MECHANISM}
- Introducing commit: {INTRODUCING_COMMIT}

Deliverables:
1. Code path analysis: trace execution from entry point to failure
2. Variable state tracking: values at key decision points
3. Control flow analysis: branches taken, loops, async operations
4. Git bisect automation: create bisect script to identify exact breaking commit
   ```bash
   git bisect start HEAD v1.2.3
   git bisect run ./test_reproduction.sh
   ```
5. Dependency compatibility matrix: version combinations that work/fail
6. Configuration analysis: environment variables, feature flags, deployment configs
7. Timing and race condition analysis: async operations, event ordering, locks
8. Memory and resource analysis: leaks, exhaustion, contention

Modern investigation techniques:
- AI-assisted code explanation (Claude/Copilot to understand complex logic)
- Automated git bisect with reproduction test
- Dependency graph analysis (npm ls, go mod graph, pip show)
- Configuration drift detection (compare staging vs production)
- Time-travel debugging using production traces
```

**Expected output:**
```
CODE_PATH: {entry → ... → failure location with key variables}
STATE_AT_FAILURE: {variable values, object states, database state}
BISECT_RESULT: {exact commit that introduced bug + diff}
DEPENDENCY_ISSUES: [version conflicts, breaking changes, CVEs]
CONFIGURATION_DRIFT: {differences between environments}
RACE_CONDITIONS: {async issues, event ordering problems}
ISOLATION_VERIFICATION: {confirmed single root cause vs multiple issues}
```

**Second: Code-Reviewer Deep Dive**

**Prompt:**
```
Review code logic and identify design issues:

Context from Debugger:
- Code path: {CODE_PATH}
- State at failure: {STATE_AT_FAILURE}
- Bisect result: {BISECT_RESULT}

Deliverables:
1. Logic flaw analysis: incorrect assumptions, missing edge cases, wrong algorithms
2. Type safety gaps: where stronger types could prevent the issue
3. Error handling review: missing try-catch, unhandled promises, panic scenarios
4. Contract validation: input validation gaps, output guarantees not met
5. Architectural issues: tight coupling, missing abstractions, layering violations
6. Similar patterns: other code locations with same vulnerability
7. Fix design: minimal change vs refactoring vs architectural improvement

Review checklist:
- Are null/undefined values handled correctly?
- Are async operations properly awaited/chained?
- Are error cases explicitly handled?
- Are type assertions safe?
- Are API contracts respected?
- Are side effects isolated?
```

**Expected output:**
```
LOGIC_FLAWS: [specific incorrect assumptions or algorithms]
TYPE_SAFETY_GAPS: [where types could prevent issues]
ERROR_HANDLING_GAPS: [unhandled error paths]
SIMILAR_VULNERABILITIES: [other code with same pattern]
FIX_DESIGN: {minimal change approach}
REFACTORING_OPPORTUNITIES: {if larger improvements warranted}
ARCHITECTURAL_CONCERNS: {if systemic issues exist}
```

## Phase 3: Fix Implementation - Domain-Specific Agent Execution

Based on Phase 2 output, route to appropriate domain agent using Task tool:

**Routing Logic:**
- Python issues → subagent_type="python-development::python-pro"
- TypeScript/JavaScript → subagent_type="javascript-typescript::typescript-pro"
- Go → subagent_type="systems-programming::golang-pro"
- Rust → subagent_type="systems-programming::rust-pro"
- SQL/Database → subagent_type="database-cloud-optimization::database-optimizer"
- Performance → subagent_type="application-performance::performance-engineer"
- Security → subagent_type="security-scanning::security-auditor"

**Prompt Template (adapt for language):**
```
Implement production-safe fix with comprehensive test coverage:

Context from Phase 2:
- Root cause: {ROOT_CAUSE}
- Logic flaws: {LOGIC_FLAWS}
- Fix design: {FIX_DESIGN}
- Type safety gaps: {TYPE_SAFETY_GAPS}
- Similar vulnerabilities: {SIMILAR_VULNERABILITIES}

Deliverables:
1. Minimal fix implementation addressing root cause (not symptoms)
2. Unit tests:
   - Specific failure case reproduction
   - Edge cases (boundary values, null/empty, overflow)
   - Error path coverage
3. Integration tests:
   - End-to-end scenarios with real dependencies
   - External API mocking where appropriate
   - Database state verification
4. Regression tests:
   - Tests for similar vulnerabilities
   - Tests covering related code paths
5. Performance validation:
   - Benchmarks showing no degradation
   - Load tests if applicable
6. Production-safe practices:
   - Feature flags for gradual rollout
   - Graceful degradation if fix fails
   - Monitoring hooks for fix verification
   - Structured logging for debugging

Modern implementation techniques (2024/2025):
- AI pair programming (GitHub Copilot, Claude Code) for test generation
- Type-driven development (leverage TypeScript, mypy, clippy)
- Contract-first APIs (OpenAPI, gRPC schemas)
- Observability-first (structured logs, metrics, traces)
- Defensive programming (explicit error handling, validation)

Implementation requirements:
- Follow existing code patterns and conventions
- Add strategic debug logging (JSON structured logs)
- Include comprehensive type annotations
- Update error messages to be actionable (include context, suggestions)
- Maintain backward compatibility (version APIs if breaking)
- Add OpenTelemetry spans for distributed tracing
- Include metric counters for monitoring (success/failure rates)
```

**Expected output:**
```
FIX_SUMMARY: {what changed and why - root cause vs symptom}
CHANGED_FILES: [
  {path: "...", changes: "...", reasoning: "..."}
]
NEW_FILES: [{path: "...", purpose: "..."}]
TEST_COVERAGE: {
  unit: "X scenarios",
  integration: "Y scenarios",
  edge_cases: "Z scenarios",
  regression: "W scenarios"
}
TEST_RESULTS: {all_passed: true/false, details: "..."}
BREAKING_CHANGES: {none | API changes with migration path}
OBSERVABILITY_ADDITIONS: [
  {type: "log", location: "...", purpose: "..."},
  {type: "metric", name: "...", purpose: "..."},
  {type: "trace", span: "...", purpose: "..."}
]
FEATURE_FLAGS: [{flag: "...", rollout_strategy: "..."}]
BACKWARD_COMPATIBILITY: {maintained | breaking with mitigation}
```

## Phase 4: Verification - Automated Testing and Performance Validation

Use Task tool with subagent_type="unit-testing::test-automator" and subagent_type="application-performance::performance-engineer":

**First: Test-Automator Regression Suite**

**Prompt:**
```
Run comprehensive regression testing and verify fix quality:

Context from Phase 3:
- Fix summary: {FIX_SUMMARY}
- Changed files: {CHANGED_FILES}
- Test coverage: {TEST_COVERAGE}
- Test results: {TEST_RESULTS}

Deliverables:
1. Full test suite execution:
   - Unit tests (all existing + new)
   - Integration tests
   - End-to-end tests
   - Contract tests (if microservices)
2. Regression detection:
   - Compare test results before/after fix
   - Identify any new failures
   - Verify all edge cases covered
3. Test quality assessment:
   - Code coverage metrics (line, branch, condition)
   - Mutation testing if applicable
   - Test determinism (run multiple times)
4. Cross-environment testing:
   - Test in staging/QA environments
   - Test with production-like data volumes
   - Test with realistic network conditions
5. Security testing:
   - Authentication/authorization checks
   - Input validation testing
   - SQL injection, XSS prevention
   - Dependency vulnerability scan
6. Automated regression test generation:
   - Use AI to generate additional edge case tests
   - Property-based testing for complex logic
   - Fuzzing for input validation

Modern testing practices (2024/2025):
- AI-generated test cases (GitHub Copilot, Claude Code)
- Snapshot testing for UI/API contracts
- Visual regression testing for frontend
- Chaos engineering for resilience testing
- Production traffic replay for load testing
```

**Expected output:**
```
TEST_RESULTS: {
  total: N,
  passed: X,
  failed: Y,
  skipped: Z,
  new_failures: [list if any],
  flaky_tests: [list if any]
}
CODE_COVERAGE: {
  line: "X%",
  branch: "Y%",
  function: "Z%",
  delta: "+/-W%"
}
REGRESSION_DETECTED: {yes/no + details if yes}
CROSS_ENV_RESULTS: {staging: "...", qa: "..."}
SECURITY_SCAN: {
  vulnerabilities: [list or "none"],
  static_analysis: "...",
  dependency_audit: "..."
}
TEST_QUALITY: {deterministic: true/false, coverage_adequate: true/false}
```

**Second: Performance-Engineer Validation**

**Prompt:**
```
Measure performance impact and validate no regressions:

Context from Test-Automator:
- Test results: {TEST_RESULTS}
- Code coverage: {CODE_COVERAGE}
- Fix summary: {FIX_SUMMARY}

Deliverables:
1. Performance benchmarks:
   - Response time (p50, p95, p99)
   - Throughput (requests/second)
   - Resource utilization (CPU, memory, I/O)
   - Database query performance
2. Comparison with baseline:
   - Before/after metrics
   - Acceptable degradation thresholds
   - Performance improvement opportunities
3. Load testing:
   - Stress test under peak load
   - Soak test for memory leaks
   - Spike test for burst handling
4. APM analysis:
   - Distributed trace analysis
   - Slow query detection
   - N+1 query patterns
5. Resource profiling:
   - CPU flame graphs
   - Memory allocation tracking
   - Goroutine/thread leaks
6. Production readiness:
   - Capacity planning impact
   - Scaling characteristics
   - Cost implications (cloud resources)

Modern performance practices:
- OpenTelemetry instrumentation
- Continuous profiling (Pyroscope, pprof)
- Real User Monitoring (RUM)
- Synthetic monitoring
```

**Expected output:**
```
PERFORMANCE_BASELINE: {
  response_time_p95: "Xms",
  throughput: "Y req/s",
  cpu_usage: "Z%",
  memory_usage: "W MB"
}
PERFORMANCE_AFTER_FIX: {
  response_time_p95: "Xms (delta)",
  throughput: "Y req/s (delta)",
  cpu_usage: "Z% (delta)",
  memory_usage: "W MB (delta)"
}
PERFORMANCE_IMPACT: {
  verdict: "improved|neutral|degraded",
  acceptable: true/false,
  reasoning: "..."
}
LOAD_TEST_RESULTS: {
  max_throughput: "...",
  breaking_point: "...",
  memory_leaks: "none|detected"
}
APM_INSIGHTS: [slow queries, N+1 patterns, bottlenecks]
PRODUCTION_READY: {yes/no + blockers if no}
```

**Third: Code-Reviewer Final Approval**

**Prompt:**
```
Perform final code review and approve for deployment:

Context from Testing:
- Test results: {TEST_RESULTS}
- Regression detected: {REGRESSION_DETECTED}
- Performance impact: {PERFORMANCE_IMPACT}
- Security scan: {SECURITY_SCAN}

Deliverables:
1. Code quality review:
   - Follows project conventions
   - No code smells or anti-patterns
   - Proper error handling
   - Adequate logging and observability
2. Architecture review:
   - Maintains system boundaries
   - No tight coupling introduced
   - Scalability considerations
3. Security review:
   - No security vulnerabilities
   - Proper input validation
   - Authentication/authorization correct
4. Documentation review:
   - Code comments where needed
   - API documentation updated
   - Runbook updated if operational impact
5. Deployment readiness:
   - Rollback plan documented
   - Feature flag strategy defined
   - Monitoring/alerting configured
6. Risk assessment:
   - Blast radius estimation
   - Rollout strategy recommendation
   - Success metrics defined

Review checklist:
- All tests pass
- No performance regressions
- Security vulnerabilities addressed
- Breaking changes documented
- Backward compatibility maintained
- Observability adequate
- Deployment plan clear
```

**Expected output:**
```
REVIEW_STATUS: {APPROVED|NEEDS_REVISION|BLOCKED}
CODE_QUALITY: {score/assessment}
ARCHITECTURE_CONCERNS: [list or "none"]
SECURITY_CONCERNS: [list or "none"]
DEPLOYMENT_RISK: {low|medium|high}
ROLLBACK_PLAN: {
  steps: ["..."],
  estimated_time: "X minutes",
  data_recovery: "..."
}
ROLLOUT_STRATEGY: {
  approach: "canary|blue-green|rolling|big-bang",
  phases: ["..."],
  success_metrics: ["..."],
  abort_criteria: ["..."]
}
MONITORING_REQUIREMENTS: [
  {metric: "...", threshold: "...", action: "..."}
]
FINAL_VERDICT: {
  approved: true/false,
  blockers: [list if not approved],
  recommendations: ["..."]
}
```

## Phase 5: Documentation and Prevention - Long-term Resilience

Use Task tool with subagent_type="comprehensive-review::code-reviewer" for prevention strategies:

**Prompt:**
```
Document fix and implement prevention strategies to avoid recurrence:

Context from Phase 4:
- Final verdict: {FINAL_VERDICT}
- Review status: {REVIEW_STATUS}
- Root cause: {ROOT_CAUSE}
- Rollback plan: {ROLLBACK_PLAN}
- Monitoring requirements: {MONITORING_REQUIREMENTS}

Deliverables:
1. Code documentation:
   - Inline comments for non-obvious logic (minimal)
   - Function/class documentation updates
   - API contract documentation
2. Operational documentation:
   - CHANGELOG entry with fix description and version
   - Release notes for stakeholders
   - Runbook entry for on-call engineers
   - Postmortem document (if high-severity incident)
3. Prevention through static analysis:
   - Add linting rules (eslint, ruff, golangci-lint)
   - Configure stricter compiler/type checker settings
   - Add custom lint rules for domain-specific patterns
   - Update pre-commit hooks
4. Type system enhancements:
   - Add exhaustiveness checking
   - Use discriminated unions/sum types
   - Add const/readonly modifiers
   - Leverage branded types for validation
5. Monitoring and alerting:
   - Create error rate alerts (Sentry, DataDog)
   - Add custom metrics for business logic
   - Set up synthetic monitors (Pingdom, Checkly)
   - Configure SLO/SLI dashboards
6. Architectural improvements:
   - Identify similar vulnerability patterns
   - Propose refactoring for better isolation
   - Document design decisions
   - Update architecture diagrams if needed
7. Testing improvements:
   - Add property-based tests
   - Expand integration test scenarios
   - Add chaos engineering tests
   - Document testing strategy gaps

Modern prevention practices (2024/2025):
- AI-assisted code review rules (GitHub Copilot, Claude Code)
- Continuous security scanning (Snyk, Dependabot)
- Infrastructure as Code validation (Terraform validate, CloudFormation Linter)
- Contract testing for APIs (Pact, OpenAPI validation)
- Observability-driven development (instrument before deploying)
```

**Expected output:**
```
DOCUMENTATION_UPDATES: [
  {file: "CHANGELOG.md", summary: "..."},
  {file: "docs/runbook.md", summary: "..."},
  {file: "docs/architecture.md", summary: "..."}
]
PREVENTION_MEASURES: {
  static_analysis: [
    {tool: "eslint", rule: "...", reason: "..."},
    {tool: "ruff", rule: "...", reason: "..."}
  ],
  type_system: [
    {enhancement: "...", location: "...", benefit: "..."}
  ],
  pre_commit_hooks: [
    {hook: "...", purpose: "..."}
  ]
}
MONITORING_ADDED: {
  alerts: [
    {name: "...", threshold: "...", channel: "..."}
  ],
  dashboards: [
    {name: "...", metrics: [...], url: "..."}
  ],
  slos: [
    {service: "...", sli: "...", target: "...", window: "..."}
  ]
}
ARCHITECTURAL_IMPROVEMENTS: [
  {improvement: "...", reasoning: "...", effort: "small|medium|large"}
]
SIMILAR_VULNERABILITIES: {
  found: N,
  locations: [...],
  remediation_plan: "..."
}
FOLLOW_UP_TASKS: [
  {task: "...", priority: "high|medium|low", owner: "..."}
]
POSTMORTEM: {
  created: true/false,
  location: "...",
  incident_severity: "SEV1|SEV2|SEV3|SEV4"
}
KNOWLEDGE_BASE_UPDATES: [
  {article: "...", summary: "..."}
]
```

## Multi-Domain Coordination for Complex Issues

For issues spanning multiple domains, orchestrate specialized agents sequentially with explicit context passing:

**Example 1: Database Performance Issue Causing Application Timeouts**

**Sequence:**
1. **Phase 1-2**: error-detective + debugger identify slow database queries
2. **Phase 3a**: Task(subagent_type="database-cloud-optimization::database-optimizer")
   - Optimize query with proper indexes
   - Context: "Query execution taking 5s, missing index on user_id column, N+1 query pattern detected"
3. **Phase 3b**: Task(subagent_type="application-performance::performance-engineer")
   - Add caching layer for frequently accessed data
   - Context: "Database query optimized from 5s to 50ms by adding index on user_id column. Application still experiencing 2s response times due to N+1 query pattern loading 100+ user records per request. Add Redis caching with 5-minute TTL for user profiles."
4. **Phase 3c**: Task(subagent_type="incident-response::devops-troubleshooter")
   - Configure monitoring for query performance and cache hit rates
   - Context: "Cache layer added with Redis. Need monitoring for: query p95 latency (threshold: 100ms), cache hit rate (threshold: >80%), cache memory usage (alert at 80%)."

**Example 2: Frontend JavaScript Error in Production**

**Sequence:**
1. **Phase 1**: error-detective analyzes Sentry error reports
   - Context: "TypeError: Cannot read property 'map' of undefined, 500+ occurrences in last hour, affects Safari users on iOS 14"
2. **Phase 2**: debugger + code-reviewer investigate
   - Context: "API response sometimes returns null instead of empty array when no results. Frontend assumes array."
3. **Phase 3a**: Task(subagent_type="javascript-typescript::typescript-pro")
   - Fix frontend with proper null checks
   - Add type guards
   - Context: "Backend API /api/users endpoint returning null instead of [] when no results. Fix frontend to handle both. Add TypeScript strict null checks."
4. **Phase 3b**: Task(subagent_type="backend-development::backend-architect")
   - Fix backend to always return array
   - Update API contract
   - Context: "Frontend now handles null, but API should follow contract and return [] not null. Update OpenAPI spec to document this."
5. **Phase 4**: test-automator runs cross-browser tests
6. **Phase 5**: code-reviewer documents API contract changes

**Example 3: Security Vulnerability in Authentication**

**Sequence:**
1. **Phase 1**: error-detective reviews security scan report
   - Context: "SQL injection vulnerability in login endpoint, Snyk severity: HIGH"
2. **Phase 2**: debugger + security-auditor investigate
   - Context: "User input not sanitized in SQL WHERE clause, allows authentication bypass"
3. **Phase 3**: Task(subagent_type="security-scanning::security-auditor")
   - Implement parameterized queries
   - Add input validation
   - Add rate limiting
   - Context: "Replace string concatenation with prepared statements. Add input validation for email format. Implement rate limiting (5 attempts per 15 min)."
4. **Phase 4a**: test-automator adds security tests
   - SQL injection attempts
   - Brute force scenarios
5. **Phase 4b**: security-auditor performs penetration testing
6. **Phase 5**: code-reviewer documents security improvements and creates postmortem

**Context Passing Template:**
```
Context for {next_agent}:

Completed by {previous_agent}:
- {summary_of_work}
- {key_findings}
- {changes_made}

Remaining work:
- {specific_tasks_for_next_agent}
- {files_to_modify}
- {constraints_to_follow}

Dependencies:
- {systems_or_components_affected}
- {data_needed}
- {integration_points}

Success criteria:
- {measurable_outcomes}
- {verification_steps}
```

## Configuration Options

Customize workflow behavior by setting priorities at invocation:

**VERIFICATION_LEVEL**: Controls depth of testing and validation
- **minimal**: Quick fix with basic tests, skip performance benchmarks
  - Use for: Low-risk bugs, cosmetic issues, documentation fixes
  - Phases: 1-2-3 (skip detailed Phase 4)
  - Timeline: ~30 minutes
- **standard**: Full test coverage + code review (default)
  - Use for: Most production bugs, feature issues, data bugs
  - Phases: 1-2-3-4 (all verification)
  - Timeline: ~2-4 hours
- **comprehensive**: Standard + security audit + performance benchmarks + chaos testing
  - Use for: Security issues, performance problems, data corruption, high-traffic systems
  - Phases: 1-2-3-4-5 (including long-term prevention)
  - Timeline: ~1-2 days

**PREVENTION_FOCUS**: Controls investment in future prevention
- **none**: Fix only, no prevention work
  - Use for: One-off issues, legacy code being deprecated, external library bugs
  - Output: Code fix + tests only
- **immediate**: Add tests and basic linting (default)
  - Use for: Common bugs, recurring patterns, team codebase
  - Output: Fix + tests + linting rules + minimal monitoring
- **comprehensive**: Full prevention suite with monitoring, architecture improvements
  - Use for: High-severity incidents, systemic issues, architectural problems
  - Output: Fix + tests + linting + monitoring + architecture docs + postmortem

**ROLLOUT_STRATEGY**: Controls deployment approach
- **immediate**: Deploy directly to production (for hotfixes, low-risk changes)
- **canary**: Gradual rollout to subset of traffic (default for medium-risk)
- **blue-green**: Full environment switch with instant rollback capability
- **feature-flag**: Deploy code but control activation via feature flags (high-risk changes)

**OBSERVABILITY_LEVEL**: Controls instrumentation depth
- **minimal**: Basic error logging only
- **standard**: Structured logs + key metrics (default)
- **comprehensive**: Full distributed tracing + custom dashboards + SLOs

**Example Invocation:**
```
Issue: Users experiencing timeout errors on checkout page (500+ errors/hour)

Config:
- VERIFICATION_LEVEL: comprehensive (affects revenue)
- PREVENTION_FOCUS: comprehensive (high business impact)
- ROLLOUT_STRATEGY: canary (test on 5% traffic first)
- OBSERVABILITY_LEVEL: comprehensive (need detailed monitoring)
```

## Modern Debugging Tools Integration

This workflow leverages modern 2024/2025 tools:

**Observability Platforms:**
- Sentry (error tracking, release tracking, performance monitoring)
- DataDog (APM, logs, traces, infrastructure monitoring)
- OpenTelemetry (vendor-neutral distributed tracing)
- Honeycomb (observability for complex distributed systems)
- New Relic (APM, synthetic monitoring)

**AI-Assisted Debugging:**
- GitHub Copilot (code suggestions, test generation, bug pattern recognition)
- Claude Code (comprehensive code analysis, architecture review)
- Sourcegraph Cody (codebase search and understanding)
- Tabnine (code completion with bug prevention)

**Git and Version Control:**
- Automated git bisect with reproduction scripts
- GitHub Actions for automated testing on bisect commits
- Git blame analysis for identifying code ownership
- Commit message analysis for understanding changes

**Testing Frameworks:**
- Jest/Vitest (JavaScript/TypeScript unit/integration tests)
- pytest (Python testing with fixtures and parametrization)
- Go testing + testify (Go unit and table-driven tests)
- Playwright/Cypress (end-to-end browser testing)
- k6/Locust (load and performance testing)

**Static Analysis:**
- ESLint/Prettier (JavaScript/TypeScript linting and formatting)
- Ruff/mypy (Python linting and type checking)
- golangci-lint (Go comprehensive linting)
- Clippy (Rust linting and best practices)
- SonarQube (enterprise code quality and security)

**Performance Profiling:**
- Chrome DevTools (frontend performance)
- pprof (Go profiling)
- py-spy (Python profiling)
- Pyroscope (continuous profiling)
- Flame graphs for CPU/memory analysis

**Security Scanning:**
- Snyk (dependency vulnerability scanning)
- Dependabot (automated dependency updates)
- OWASP ZAP (security testing)
- Semgrep (custom security rules)
- npm audit / pip-audit / cargo audit

## Success Criteria

A fix is considered complete when ALL of the following are met:

**Root Cause Understanding:**
- Root cause is identified with supporting evidence
- Failure mechanism is clearly documented
- Introducing commit identified (if applicable via git bisect)
- Similar vulnerabilities catalogued

**Fix Quality:**
- Fix addresses root cause, not just symptoms
- Minimal code changes (avoid over-engineering)
- Follows project conventions and patterns
- No code smells or anti-patterns introduced
- Backward compatibility maintained (or breaking changes documented)

**Testing Verification:**
- All existing tests pass (zero regressions)
- New tests cover the specific bug reproduction
- Edge cases and error paths tested
- Integration tests verify end-to-end behavior
- Test coverage increased (or maintained at high level)

**Performance & Security:**
- No performance degradation (p95 latency within 5% of baseline)
- No security vulnerabilities introduced
- Resource usage acceptable (memory, CPU, I/O)
- Load testing passed for high-traffic changes

**Deployment Readiness:**
- Code review approved by domain expert
- Rollback plan documented and tested
- Feature flags configured (if applicable)
- Monitoring and alerting configured
- Runbook updated with troubleshooting steps

**Prevention Measures:**
- Static analysis rules added (if applicable)
- Type system improvements implemented (if applicable)
- Documentation updated (code, API, runbook)
- Postmortem created (if high-severity incident)
- Knowledge base article created (if novel issue)

**Metrics:**
- Mean Time to Recovery (MTTR): < 4 hours for SEV2+
- Bug recurrence rate: 0% (same root cause should not recur)
- Test coverage: No decrease, ideally increase
- Deployment success rate: > 95% (rollback rate < 5%)

Issue to resolve: $ARGUMENTS
