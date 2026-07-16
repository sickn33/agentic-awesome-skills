#!/bin/bash
# Loki Mode Demo Runner
# Usage: ./demo/run-demo.sh [simple-todo|full-stack]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEMO_TYPE="${1:-simple-todo}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Demo output helpers
banner() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

step() {
    echo -e "${GREEN}>>> $1${NC}"
    sleep 1
}

info() {
    echo -e "${BLUE}    $1${NC}"
}

pause() {
    echo -e "${YELLOW}[Press Enter to continue...]${NC}"
    read -r
}

# Demo introduction
banner "LOKI MODE DEMO"

echo "Loki Mode - Multi-Agent Autonomous Startup System"
echo ""
echo "This demo will show:"
echo "  - Autonomous project generation from PRD"
echo "  - Multi-agent orchestration"
echo "  - Kanban board task tracking"
echo "  - Parallel code review system"
echo "  - Quality gates enforcement"
echo ""

case "$DEMO_TYPE" in
    simple-todo)
        PRD_FILE="examples/simple-todo-app.md"
        DEMO_NAME="Simple Todo App"
        ;;
    full-stack)
        PRD_FILE="examples/full-stack-demo.md"
        DEMO_NAME="Full-Stack Bookmark Manager"
        ;;
    *)
        echo "Unknown demo type: $DEMO_TYPE"
        echo "Usage: $0 [simple-todo|full-stack]"
        exit 1
        ;;
esac

step "Demo: $DEMO_NAME"
step "PRD: $PRD_FILE"
pause

# Create demo workspace
banner "STEP 1: Setting Up Demo Workspace"

DEMO_WORKSPACE="/tmp/loki-demo-$(date +%s)"
step "Creating workspace: $DEMO_WORKSPACE"
mkdir -p "$DEMO_WORKSPACE"
cd "$DEMO_WORKSPACE"

info "Workspace ready"
pause

# Show PRD content
banner "STEP 2: Reviewing PRD"

step "PRD Contents:"
echo ""
cat "$PROJECT_DIR/$PRD_FILE"
echo ""
pause

# Initialize git
banner "STEP 3: Initialize Git Repository"

step "git init"
git init
git add -A 2>/dev/null || true
git commit -m "Initial commit" --allow-empty

info "Git initialized"
pause

# Show how to invoke Loki Mode
banner "STEP 4: Invoking Loki Mode"

step "To invoke Loki Mode, you would run:"
echo ""
echo -e "${CYAN}  claude --dangerously-skip-permissions${NC}"
echo ""
echo "Then type:"
echo ""
echo -e "${CYAN}  Loki Mode with PRD at $PRD_FILE${NC}"
echo ""

info "Loki Mode will then:"
info "  1. Read and analyze the PRD"
info "  2. Create .loki/ directory for state management"
info "  3. Generate tasks and add to queue"
info "  4. Spawn specialized agents"
info "  5. Execute RARV cycle until completion"
pause

# Show expected .loki structure
banner "STEP 5: Loki State Directory"

step "Creating sample .loki structure..."
mkdir -p .loki/{queue,state,memory/{episodic,semantic,skills},metrics/{efficiency,rewards},specs}

# Create sample orchestrator state
cat > .loki/state/orchestrator.json << 'EOF'
{
  "currentPhase": "DEVELOPMENT",
  "startedAt": "2026-01-06T10:00:00Z",
  "metrics": {
    "tasksCompleted": 12,
    "tasksPending": 5,
    "agentsSpawned": 8,
    "reviewsPassed": 4
  }
}
EOF

# Create sample queue
cat > .loki/queue/pending.json << 'EOF'
[
  {
    "id": "task-013",
    "type": "eng-frontend",
    "priority": 8,
    "payload": {
      "action": "Implement TodoList component",
      "description": "Create React component to display todos"
    }
  },
  {
    "id": "task-014",
    "type": "eng-backend",
    "priority": 7,
    "payload": {
      "action": "Add DELETE endpoint",
      "description": "Implement DELETE /api/todos/:id"
    }
  }
]
EOF

cat > .loki/queue/in-progress.json << 'EOF'
[
  {
    "id": "task-012",
    "type": "eng-frontend",
    "claimedBy": "agent-frontend-001",
    "payload": {
      "action": "Implement AddTodo form",
      "description": "Create form component with validation"
    }
  }
]
EOF

# Create sample CONTINUITY.md
cat > .loki/CONTINUITY.md << 'EOF'
# CONTINUITY - Working Memory

## Current State
- **Phase:** DEVELOPMENT
- **Current Task:** task-012 (Implement AddTodo form)
- **Agent:** agent-frontend-001

## Progress Today
- [x] Bootstrap complete
- [x] Discovery complete
- [x] Architecture complete - OpenAPI spec created
- [x] Database schema implemented
- [x] Backend API endpoints (GET, POST, PUT)
- [ ] Frontend components (in progress)
- [ ] DELETE endpoint
- [ ] Integration tests

## Decisions Made
- Using SQLite for simplicity (per PRD)
- React Query for data fetching
- TailwindCSS for styling

## Mistakes & Learnings
- Initially forgot return type on Express handler
  - Fix: Always add `: void` to handlers
- First test run failed due to missing dev dependency
  - Fix: Check package.json before running tests

## Next Steps
1. Complete AddTodo form component
2. Implement TodoList component
3. Add DELETE endpoint
4. Run full test suite
EOF

step "Directory structure:"
find .loki -type f | head -20

info "CONTINUITY.md contains working memory"
info "Queue files track task states"
info "Orchestrator tracks overall progress"
pause

# Show kanban export
banner "STEP 6: Vibe Kanban Integration"

step "Exporting tasks to Vibe Kanban format..."

mkdir -p ~/.vibe-kanban/loki-demo
"$PROJECT_DIR/scripts/export-to-vibe-kanban.sh" ~/.vibe-kanban/loki-demo 2>/dev/null || true

info "Tasks exported to kanban board"
info "Run 'npx vibe-kanban' to view visual board"
pause

# Show agent spawning simulation
banner "STEP 7: Agent Orchestration"

step "Simulating agent spawning..."
echo ""
echo "Agent Pool Status:"
echo "  [ACTIVE] agent-frontend-001 - Working on task-012"
echo "  [IDLE]   agent-backend-001  - Waiting for task"
echo "  [ACTIVE] agent-qa-001       - Running tests"
echo ""

info "Agents work in parallel but respect dependencies"
info "Task queue prevents conflicts"
pause

# Show code review simulation
banner "STEP 8: Code Review System"

step "Launching 3-reviewer parallel review..."
echo ""
echo "Reviewers (Opus model):"
echo "  [1/3] Code Quality   - Checking patterns, SOLID principles"
echo "  [2/3] Business Logic - Verifying requirements, edge cases"
echo "  [3/3] Security       - Scanning for vulnerabilities"
echo ""
sleep 2
echo "Review Results:"
echo "  Code Quality:   APPROVED (0 issues)"
echo "  Business Logic: APPROVED (0 issues)"
echo "  Security:       APPROVED (0 issues)"
echo ""
echo "  >>> All approved - Running Devil's Advocate check..."
sleep 1
echo "  Devil's Advocate: APPROVED (found 1 Low severity suggestion)"
echo ""

info "Anti-sycophancy protocol prevents groupthink"
info "Blind review ensures independent analysis"
pause

# Show quality gates
banner "STEP 9: Quality Gates"

step "Running quality gates..."
echo ""
echo "Static Analysis:"
echo "  ESLint:     PASS (0 errors, 2 warnings)"
echo "  TypeScript: PASS (strict mode)"
echo "  CodeQL:     PASS (no vulnerabilities)"
echo ""
echo "Test Coverage:"
echo "  Unit Tests:        24/24 PASS (92% coverage)"
echo "  Integration Tests: 8/8 PASS"
echo ""
echo "Quality Gate: PASSED"
echo ""

info "Critical/High/Medium issues BLOCK the pipeline"
info "Low/Cosmetic issues become TODO comments"
pause

# Final summary
banner "DEMO COMPLETE"

echo "Loki Mode Demo Summary:"
echo ""
echo "  PRD:            $DEMO_NAME"
echo "  Workspace:      $DEMO_WORKSPACE"
echo "  Tasks Created:  17"
echo "  Tasks Complete: 12"
echo "  Agents Used:    8"
echo "  Reviews Passed: 4"
echo ""
echo "To run Loki Mode for real:"
echo ""
echo -e "  ${CYAN}claude --dangerously-skip-permissions${NC}"
echo -e "  ${CYAN}> Loki Mode with PRD at $PRD_FILE${NC}"
echo ""
echo "Documentation: https://github.com/asklokesh/loki-mode"
echo ""

# Cleanup prompt
echo -e "${YELLOW}Demo workspace at: $DEMO_WORKSPACE${NC}"
echo -e "${YELLOW}Run 'rm -rf $DEMO_WORKSPACE' to clean up${NC}"
