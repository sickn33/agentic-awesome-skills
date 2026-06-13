# Audit Templates

Templates for auditing and improving existing harness infrastructure.

Advanced profile note: eval and observability sections in this reference apply only when the
project explicitly enables advanced agent-platform capabilities. Core ECL harness audits should
not fail or lose score just because `harness/eval`, `harness/trace`, `harness/memory`,
`harness/checkpoints`, or `harness/metrics` are absent.

## Audit Checklist

### Documentation Audit (25%)

| Item | Check | Score |
|------|-------|-------|
| AGENTS.md exists | `test -f AGENTS.md` | 0/10 |
| AGENTS.md is ~100 lines (not monolithic) | `wc -l AGENTS.md` should be 80-120 | 0/10 |
| docs/ARCHITECTURE.md exists | `test -f docs/ARCHITECTURE.md` | 0/10 |
| Architecture matches reality | Compare layer hierarchy to `go list ./...` | 0/20 |
| docs/DEVELOPMENT.md exists | `test -f docs/DEVELOPMENT.md` | 0/10 |
| Build commands in DEVELOPMENT.md work | Run them and check | 0/10 |
| docs/QUALITY.md exists | `test -f docs/QUALITY.md` | 0/10 |
| Design docs cover major components | Check docs/design-docs/ | 0/10 |
| Reference docs are complete | Check docs/references/ | 0/10 |

**Total: /100 → Scale to 25%**

### Linter Audit (20%)

| Item | Check | Score |
|------|-------|-------|
| scripts/lint-deps.go exists | `test -f scripts/lint-deps.go` | 0/15 |
| Layer map covers all packages | Compare to `go list ./...` | 0/20 |
| Introducing violation fails lint | Add bad import, run lint | 0/15 |
| scripts/lint-quality.go exists | `test -f scripts/lint-quality.go` | 0/15 |
| Quality rules match QUALITY.md | Compare documented rules to linter | 0/10 |
| Makefile has lint-arch target | `grep lint-arch Makefile` | 0/10 |
| `make lint-arch` passes | Run it | 0/15 |

**Total: /100 → Scale to 20%**

### Observability Audit (15%)

| Item | Check | Score |
|------|-------|-------|
| harness/trace/ exists | `test -d harness/trace` | 0/25 |
| Trace format covers all tool types | Check ToolTrace struct | 0/25 |
| harness/selftest/ exists | `test -d harness/selftest` | 0/25 |
| Observability hook registered | Check hook wiring | 0/25 |

**Total: /100 → Scale to 15%**

### Eval Audit (20%)

| Item | Check | Score |
|------|-------|-------|
| harness/eval/framework.go exists | `test -f harness/eval/framework.go` | 0/10 |
| harness/eval/runner.go exists | `test -f harness/eval/runner.go` | 0/10 |
| harness/eval/scorer.go exists | `test -f harness/eval/scorer.go` | 0/10 |
| harness/eval/reporter.go exists | `test -f harness/eval/reporter.go` | 0/10 |
| file_ops/ has 5+ tasks | Count JSON files | 0/10 |
| code_gen/ has 5+ tasks | Count JSON files | 0/10 |
| debugging/ has 5+ tasks | Count JSON files | 0/10 |
| refactoring/ has 5+ tasks | Count JSON files | 0/10 |
| Tasks cover new features | Manual review | 0/10 |
| All tasks still work | Run evals | 0/10 |

**Total: /100 → Scale to 20%**

### Quality Automation Audit (10%)

| Item | Check | Score |
|------|-------|-------|
| harness/quality/score.go exists | `test -f harness/quality/score.go` | 0/25 |
| Quality score calculation works | Run it | 0/25 |
| harness/cleanup/tasks.go exists | `test -f harness/cleanup/tasks.go` | 0/25 |
| Cleanup tasks find real issues | Run dry-run | 0/25 |

**Total: /100 → Scale to 10%**

### Integration Audit (10%)

| Item | Check | Score |
|------|-------|-------|
| `go build ./...` passes | Run it | 0/40 |
| `make lint-arch` passes | Run it | 0/30 |
| CI runs harness checks | Check CI config | 0/30 |

**Total: /100 → Scale to 10%**

---

## Scoring Rubric

### How to Score Each Item

- **Binary items** (exists/doesn't): 0 or full points
- **Quality items** (matches reality): Partial credit based on accuracy
  - 100%: Exact match
  - 75%: Minor discrepancies (1-2 items)
  - 50%: Moderate discrepancies (3-5 items)
  - 25%: Major discrepancies but structure is right
  - 0%: Completely wrong or missing

### Calculating Overall Score

```
Overall = (Doc × 0.25) + (Linter × 0.20) + (Obs × 0.15) + (Eval × 0.20) + (Quality × 0.10) + (Integration × 0.10)
```

### Score Interpretation

| Score | Status | Action |
|-------|--------|--------|
| 0-20% | Critical | Use Create Mode — build from scratch |
| 21-40% | Poor | Major gaps — extensive improvement needed |
| 41-60% | Fair | Multiple gaps — targeted improvement |
| 61-80% | Good | Minor gaps — polish and expand |
| 81-100% | Excellent | Maintenance mode — keep current |

---

## Gap Analysis Templates

### Documentation Drift Report

```markdown
## Documentation Drift Analysis

### ARCHITECTURE.md Layer Hierarchy

**Documented Layers:**
```
[Copy from ARCHITECTURE.md]
```

**Actual Package Structure:**
```bash
go list ./... | grep -v vendor
```

**Discrepancies:**
| Documented | Actual | Issue |
|------------|--------|-------|
| core/types | core/types | ✓ Match |
| core/agent | core/agent | ✓ Match |
| - | core/newpkg | Missing from docs |

### Tool Catalog

**Documented Tools:** [count]
**Actual Tools:** [count]

**Missing from docs:**
- ToolA (added in commit abc123)
- ToolB (added in commit def456)

### Error Codes

**Documented Codes:** [count]
**Actual Codes:** [count]

**Missing from docs:**
- 300105 NotFoundError (added in PR #123)
```

### Linter Gap Report

```markdown
## Linter Gap Analysis

### Layer Map Coverage

**Packages in layer map:** [count]
**Packages in codebase:** [count]

**Missing from layer map:**
| Package | Suggested Layer | Reason |
|---------|-----------------|--------|
| core/newpkg | Layer 2 | Depends only on core/types |
| api/v2 | Layer 4 | New API version |

### Violation Test Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Bad import in core/types | Fail | Fail | ✓ Pass |
| Bad import in core/agent | Fail | Fail | ✓ Pass |
| Bad import in api/v2 | Fail | Pass | ✗ Gap |

### Quality Rules Coverage

**Rules in QUALITY.md:** [count]
**Rules in lint-quality.go:** [count]

**Missing enforcement:**
- Rule 5: "No hardcoded timeouts" — not checked by linter
```

### Eval Coverage Report

```markdown
## Eval Coverage Analysis

### Tasks per Category

| Category | Count | Target | Status |
|----------|-------|--------|--------|
| file_ops | 3 | 5+ | ✗ Below target |
| code_gen | 2 | 5+ | ✗ Below target |
| debugging | 5 | 5+ | ✓ Meets target |
| refactoring | 4 | 5+ | ✗ Below target |

### Feature Coverage

| Feature | Has Eval | Priority |
|---------|----------|----------|
| File write | ✓ | - |
| File read | ✓ | - |
| JSON parsing | ✗ | P1 |
| Error handling | ✓ | - |
| New auth module | ✗ | P0 |

### Task Health

| Task ID | Status | Issue |
|---------|--------|-------|
| file_ops_001 | ✓ Works | - |
| code_gen_001 | ✗ Broken | Uses removed API |
| debug_001 | ✓ Works | - |
```

---

## Improvement Plan Template

```markdown
## Harness Improvement Plan

**Project:** [Name]
**Audit Date:** YYYY-MM-DD
**Audit Score:** XX%
**Target Score:** 80%+

### Priority Gaps

#### P0 — Critical (Fix Immediately)
1. [Gap description]
   - Impact: [Why this matters]
   - Fix: [Specific action]
   - Effort: [Hours estimate]

#### P1 — High (Fix This Sprint)
1. [Gap description]
   - Impact: [Why this matters]
   - Fix: [Specific action]
   - Effort: [Hours estimate]

#### P2 — Medium (Fix Next Sprint)
1. [Gap description]
   - Impact: [Why this matters]
   - Fix: [Specific action]
   - Effort: [Hours estimate]

#### P3 — Low (Backlog)
1. [Gap description]
   - Impact: [Why this matters]
   - Fix: [Specific action]
   - Effort: [Hours estimate]

### Improvement Timeline

| Week | Focus | Expected Score |
|------|-------|----------------|
| 1 | P0 gaps | 45% → 55% |
| 2 | P1 gaps | 55% → 70% |
| 3 | P2 gaps | 70% → 80% |
| 4 | P3 gaps + polish | 80% → 85% |

### Success Metrics

- [ ] Audit score ≥ 80%
- [ ] No P0 or P1 gaps remaining
- [ ] `make lint-arch` passes
- [ ] All eval categories have 5+ tasks
- [ ] Quality score trend is positive
```

---

## Before/After Comparison Template

```markdown
## Improvement Results

**Project:** [Name]
**Improvement Period:** YYYY-MM-DD to YYYY-MM-DD

### Score Comparison

| Dimension | Before | After | Delta |
|-----------|--------|-------|-------|
| Documentation | XX% | XX% | +XX% |
| Linters | XX% | XX% | +XX% |
| Observability | XX% | XX% | +XX% |
| Evals | XX% | XX% | +XX% |
| Quality | XX% | XX% | +XX% |
| Integration | XX% | XX% | +XX% |
| **Overall** | **XX%** | **XX%** | **+XX%** |

### Changes Made

#### Documentation
- Updated ARCHITECTURE.md with [changes]
- Created design doc for [component]
- Added [N] entries to tool catalog

#### Linters
- Added [N] packages to layer map
- Created new linter for [pattern]
- Fixed [N] false positives

#### Evals
- Added [N] new eval tasks
- Removed [N] obsolete tasks
- Updated [N] broken tasks

#### Quality
- Added cleanup task for [pattern]
- Updated quality score weights
- Fixed [N] golden principle violations

### Remaining Gaps

[List any P2/P3 items not yet addressed]

### Recommendations

[Next steps for maintaining/improving harness]
```

---

## Automated Audit Script

```go
// scripts/audit-harness.go
//
// Automated harness audit. Run: go run scripts/audit-harness.go
//
// Outputs JSON with scores per dimension.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

type AuditResult struct {
	Dimension string  `json:"dimension"`
	Score     float64 `json:"score"`
	MaxScore  float64 `json:"max_score"`
	Percent   float64 `json:"percent"`
	Items     []AuditItem `json:"items"`
}

type AuditItem struct {
	Name    string  `json:"name"`
	Score   float64 `json:"score"`
	Max     float64 `json:"max"`
	Notes   string  `json:"notes,omitempty"`
}

func main() {
	results := []AuditResult{
		auditDocumentation(),
		auditLinters(),
		auditObservability(),
		auditEvals(),
		auditQuality(),
		auditIntegration(),
	}

	// Calculate overall
	weights := map[string]float64{
		"Documentation": 0.25,
		"Linters": 0.20,
		"Observability": 0.15,
		"Evals": 0.20,
		"Quality": 0.10,
		"Integration": 0.10,
	}

	var overall float64
	for _, r := range results {
		overall += r.Percent * weights[r.Dimension]
	}

	// Output
	output := map[string]interface{}{
		"results": results,
		"overall": overall,
	}

	data, _ := json.MarshalIndent(output, "", "  ")
	fmt.Println(string(data))
}

func auditDocumentation() AuditResult {
	r := AuditResult{Dimension: "Documentation", MaxScore: 100}

	// Check files exist
	files := map[string]float64{
		"AGENTS.md": 10,
		"docs/ARCHITECTURE.md": 10,
		"docs/DEVELOPMENT.md": 10,
		"docs/QUALITY.md": 10,
	}

	for file, points := range files {
		if _, err := os.Stat(file); err == nil {
			r.Score += points
			r.Items = append(r.Items, AuditItem{Name: file, Score: points, Max: points})
		} else {
			r.Items = append(r.Items, AuditItem{Name: file, Score: 0, Max: points, Notes: "missing"})
		}
	}

	// Check docs/design-docs/ has files (not just the index)
	if matches, _ := filepath.Glob("docs/design-docs/*.md"); len(matches) > 0 {
		// Exclude index.md from count
		actualDocs := 0
		for _, m := range matches {
			if !strings.HasSuffix(m, "index.md") {
				actualDocs++
			}
		}
		score := min(float64(actualDocs)*5, 20)
		r.Score += score
		r.Items = append(r.Items, AuditItem{Name: "docs/design-docs/", Score: score, Max: 20, Notes: fmt.Sprintf("%d design docs (excluding index)", actualDocs)})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "docs/design-docs/", Score: 0, Max: 20, Notes: "empty or missing"})
	}

	// Check docs/references/ has files
	if matches, _ := filepath.Glob("docs/references/*.md"); len(matches) > 0 {
		score := min(float64(len(matches))*5, 20)
		r.Score += score
		r.Items = append(r.Items, AuditItem{Name: "docs/references/", Score: score, Max: 20, Notes: fmt.Sprintf("%d files", len(matches))})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "docs/references/", Score: 0, Max: 20, Notes: "empty or missing"})
	}

	// Remaining 20 points for AGENTS.md line count
	if data, err := os.ReadFile("AGENTS.md"); err == nil {
		lines := len(strings.Split(string(data), "\n"))
		if lines >= 80 && lines <= 150 {
			r.Score += 20
			r.Items = append(r.Items, AuditItem{Name: "AGENTS.md size", Score: 20, Max: 20, Notes: fmt.Sprintf("%d lines", lines)})
		} else if lines < 80 {
			r.Items = append(r.Items, AuditItem{Name: "AGENTS.md size", Score: 10, Max: 20, Notes: fmt.Sprintf("%d lines (too short)", lines)})
			r.Score += 10
		} else {
			r.Items = append(r.Items, AuditItem{Name: "AGENTS.md size", Score: 5, Max: 20, Notes: fmt.Sprintf("%d lines (too long, should be map)", lines)})
			r.Score += 5
		}
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func auditLinters() AuditResult {
	r := AuditResult{Dimension: "Linters", MaxScore: 100}

	linters := []string{"scripts/lint-deps.go", "scripts/lint-quality.go"}
	for _, l := range linters {
		if _, err := os.Stat(l); err == nil {
			r.Score += 25
			r.Items = append(r.Items, AuditItem{Name: l, Score: 25, Max: 25})
		} else {
			r.Items = append(r.Items, AuditItem{Name: l, Score: 0, Max: 25, Notes: "missing"})
		}
	}

	// Check Makefile
	if data, err := os.ReadFile("Makefile"); err == nil {
		if strings.Contains(string(data), "lint-arch") {
			r.Score += 25
			r.Items = append(r.Items, AuditItem{Name: "Makefile lint-arch", Score: 25, Max: 25})
		} else {
			r.Items = append(r.Items, AuditItem{Name: "Makefile lint-arch", Score: 0, Max: 25, Notes: "target missing"})
		}
	}

	// Remaining 25 for additional linters
	if matches, _ := filepath.Glob("scripts/lint-*.go"); len(matches) > 2 {
		r.Score += 25
		r.Items = append(r.Items, AuditItem{Name: "additional linters", Score: 25, Max: 25, Notes: fmt.Sprintf("%d total", len(matches))})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "additional linters", Score: 0, Max: 25, Notes: "only core linters"})
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func auditObservability() AuditResult {
	r := AuditResult{Dimension: "Observability", MaxScore: 100}

	dirs := map[string]float64{
		"harness/trace": 35,
		"harness/selftest": 35,
	}

	for dir, points := range dirs {
		if info, err := os.Stat(dir); err == nil && info.IsDir() {
			r.Score += points
			r.Items = append(r.Items, AuditItem{Name: dir, Score: points, Max: points})
		} else {
			r.Items = append(r.Items, AuditItem{Name: dir, Score: 0, Max: points, Notes: "missing"})
		}
	}

	// Check for observability hook
	if matches, _ := filepath.Glob("**/observability*.go"); len(matches) > 0 {
		r.Score += 30
		r.Items = append(r.Items, AuditItem{Name: "observability hook", Score: 30, Max: 30})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "observability hook", Score: 0, Max: 30, Notes: "not found"})
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func auditEvals() AuditResult {
	r := AuditResult{Dimension: "Evals", MaxScore: 100}

	// Framework files (40 points)
	files := []string{
		"harness/eval/framework.go",
		"harness/eval/runner.go",
		"harness/eval/scorer.go",
		"harness/eval/reporter.go",
	}
	for _, f := range files {
		if _, err := os.Stat(f); err == nil {
			r.Score += 10
			r.Items = append(r.Items, AuditItem{Name: f, Score: 10, Max: 10})
		} else {
			r.Items = append(r.Items, AuditItem{Name: f, Score: 0, Max: 10, Notes: "missing"})
		}
	}

	// Dataset categories (60 points, 15 each)
	categories := []string{"file_ops", "code_gen", "debugging", "refactoring"}
	for _, cat := range categories {
		pattern := fmt.Sprintf("harness/eval/datasets/%s/*.json", cat)
		matches, _ := filepath.Glob(pattern)
		if len(matches) >= 5 {
			r.Score += 15
			r.Items = append(r.Items, AuditItem{Name: cat, Score: 15, Max: 15, Notes: fmt.Sprintf("%d tasks", len(matches))})
		} else if len(matches) > 0 {
			score := float64(len(matches)) * 3
			r.Score += score
			r.Items = append(r.Items, AuditItem{Name: cat, Score: score, Max: 15, Notes: fmt.Sprintf("%d tasks (need 5+)", len(matches))})
		} else {
			r.Items = append(r.Items, AuditItem{Name: cat, Score: 0, Max: 15, Notes: "no tasks"})
		}
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func auditQuality() AuditResult {
	r := AuditResult{Dimension: "Quality", MaxScore: 100}

	items := map[string]float64{
		"harness/quality/score.go": 35,
		"harness/cleanup/tasks.go": 35,
		"docs/QUALITY.md": 30,
	}

	for item, points := range items {
		if _, err := os.Stat(item); err == nil {
			r.Score += points
			r.Items = append(r.Items, AuditItem{Name: item, Score: points, Max: points})
		} else {
			r.Items = append(r.Items, AuditItem{Name: item, Score: 0, Max: points, Notes: "missing"})
		}
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func auditIntegration() AuditResult {
	r := AuditResult{Dimension: "Integration", MaxScore: 100}

	// Check go.mod exists (build will work)
	if _, err := os.Stat("go.mod"); err == nil {
		r.Score += 40
		r.Items = append(r.Items, AuditItem{Name: "go.mod", Score: 40, Max: 40})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "go.mod", Score: 0, Max: 40, Notes: "missing"})
	}

	// Check Makefile exists
	if _, err := os.Stat("Makefile"); err == nil {
		r.Score += 30
		r.Items = append(r.Items, AuditItem{Name: "Makefile", Score: 30, Max: 30})
	} else {
		r.Items = append(r.Items, AuditItem{Name: "Makefile", Score: 0, Max: 30, Notes: "missing"})
	}

	// Check for CI config
	ciConfigs := []string{".github/workflows", ".gitlab-ci.yml", "Jenkinsfile", ".circleci"}
	found := false
	for _, ci := range ciConfigs {
		if _, err := os.Stat(ci); err == nil {
			found = true
			r.Score += 30
			r.Items = append(r.Items, AuditItem{Name: "CI config", Score: 30, Max: 30, Notes: ci})
			break
		}
	}
	if !found {
		r.Items = append(r.Items, AuditItem{Name: "CI config", Score: 0, Max: 30, Notes: "not found"})
	}

	r.Percent = (r.Score / r.MaxScore) * 100
	return r
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

import "strings"
```

Note: The script above has a deliberate syntax issue (import at the end) — move the `import "strings"` to the import block at the top when using.
