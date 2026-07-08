#!/bin/bash
# Loki Mode Auto Demo - Non-interactive version for recording
# Usage: ./demo/run-demo-auto.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Demo output helpers
banner() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
    sleep 1
}

step() {
    echo -e "${GREEN}>>> $1${NC}"
    sleep 0.5
}

info() {
    echo -e "${BLUE}    $1${NC}"
    sleep 0.3
}

agent() {
    echo -e "${MAGENTA}    [$1]${NC} $2"
    sleep 0.3
}

# Clear screen
clear

# Introduction
banner "LOKI MODE"
echo -e "${CYAN}Multi-Agent Autonomous Startup System${NC}"
echo ""
echo "From PRD to Production - Zero Human Intervention"
echo ""
sleep 2

# Show PRD
banner "STEP 1: Product Requirements"
step "PRD: Simple Todo App"
echo ""
cat << 'EOF'
Features:
  - Add Todo    - Create new task
  - View Todos  - List all tasks
  - Complete    - Mark task done
  - Delete      - Remove task

Tech Stack:
  - React + TypeScript (Frontend)
  - Express + SQLite (Backend)
EOF
echo ""
sleep 3

# Bootstrap
banner "STEP 2: Bootstrap Phase"
step "Initializing Loki Mode..."
sleep 1

echo ""
echo ".loki/"
echo "  CONTINUITY.md      <- Working memory"
echo "  queue/"
echo "    pending.json     <- Task queue"
echo "    in-progress.json"
echo "    completed.json"
echo "  state/"
echo "    orchestrator.json <- Phase tracking"
echo "  specs/"
echo "    openapi.yaml     <- API specification"
echo ""
sleep 2

# Discovery
banner "STEP 3: Discovery Phase"
step "Analyzing PRD and generating tasks..."
sleep 1

echo ""
echo "Tasks Generated:"
echo "  [1] Set up Express backend"
echo "  [2] Create SQLite database schema"
echo "  [3] Implement GET /api/todos"
echo "  [4] Implement POST /api/todos"
echo "  [5] Implement PUT /api/todos/:id"
echo "  [6] Implement DELETE /api/todos/:id"
echo "  [7] Set up React with Vite"
echo "  [8] Create TodoList component"
echo "  [9] Create AddTodo component"
echo "  [10] Write unit tests"
echo "  [11] Write integration tests"
echo ""
info "11 tasks added to pending queue"
sleep 2

# Architecture
banner "STEP 4: Architecture Phase"
step "Creating OpenAPI specification..."
sleep 1

echo ""
cat << 'EOF'
openapi: 3.0.0
info:
  title: Todo API
  version: 1.0.0
paths:
  /api/todos:
    get:
      summary: List all todos
      responses:
        200:
          description: Array of todos
    post:
      summary: Create a todo
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TodoInput'
EOF
echo ""
info "Spec-first development: API defined before code"
sleep 2

# Agent Spawning
banner "STEP 5: Agent Orchestration"
step "Spawning specialized agents..."
echo ""

agent "SPAWN" "agent-backend-001  (Sonnet) - Backend implementation"
sleep 0.5
agent "SPAWN" "agent-frontend-001 (Sonnet) - Frontend development"
sleep 0.5
agent "SPAWN" "agent-database-001 (Haiku)  - Database setup"
sleep 0.5
agent "SPAWN" "agent-qa-001       (Haiku)  - Test execution"
echo ""
info "4 agents working in parallel"
info "Haiku for simple tasks, Sonnet for implementation"
sleep 2

# Development
banner "STEP 6: Development Phase"
echo ""

agent "backend-001" "Implementing Express server..."
sleep 0.8
agent "database-001" "Creating SQLite schema..."
sleep 0.5
agent "database-001" "DONE: Database ready"
sleep 0.3
agent "backend-001" "Implementing API endpoints..."
sleep 1
agent "frontend-001" "Setting up React + Vite..."
sleep 0.8
agent "backend-001" "DONE: All endpoints implemented"
sleep 0.3
agent "frontend-001" "Creating components..."
sleep 1
agent "qa-001" "Running unit tests..."
sleep 0.5
agent "frontend-001" "DONE: UI complete"
sleep 0.3
agent "qa-001" "DONE: 24/24 tests passing"
echo ""
sleep 2

# Code Review
banner "STEP 7: Code Review (Anti-Sycophancy)"
step "Launching 3 parallel reviewers (Opus model)..."
echo ""

echo "  [1/3] Code Quality Reviewer"
echo "        - SOLID principles"
echo "        - Best practices"
echo "        - Maintainability"
sleep 0.5

echo ""
echo "  [2/3] Business Logic Reviewer"
echo "        - Requirements alignment"
echo "        - Edge cases"
echo "        - User experience"
sleep 0.5

echo ""
echo "  [3/3] Security Reviewer"
echo "        - OWASP Top 10"
echo "        - Input validation"
echo "        - SQL injection"
echo ""
sleep 1.5

step "Review Results (Blind Review Mode):"
echo ""
echo -e "  Code Quality:   ${GREEN}APPROVED${NC} (0 issues)"
sleep 0.3
echo -e "  Business Logic: ${GREEN}APPROVED${NC} (0 issues)"
sleep 0.3
echo -e "  Security:       ${GREEN}APPROVED${NC} (0 issues)"
echo ""
sleep 1

step "All approved - Running Devil's Advocate..."
sleep 1
echo ""
echo -e "  Devil's Advocate: ${GREEN}APPROVED${NC}"
echo "    Found 1 Low severity suggestion (added as TODO)"
echo ""
info "Anti-sycophancy protocol prevents groupthink"
sleep 2

# Quality Gates
banner "STEP 8: Quality Gates"
echo ""
echo "Static Analysis:"
echo -e "  ESLint:     ${GREEN}PASS${NC} (0 errors)"
echo -e "  TypeScript: ${GREEN}PASS${NC} (strict mode)"
echo -e "  CodeQL:     ${GREEN}PASS${NC} (no vulnerabilities)"
echo ""
sleep 1

echo "Test Coverage:"
echo -e "  Unit Tests:        ${GREEN}24/24 PASS${NC} (92% coverage)"
echo -e "  Integration Tests: ${GREEN}8/8 PASS${NC}"
echo ""
sleep 1

echo -e "Quality Gate: ${GREEN}PASSED${NC}"
echo ""
sleep 2

# CONTINUITY.md
banner "STEP 9: Memory System"
step "CONTINUITY.md - Working Memory"
echo ""
cat << 'EOF'
## Current State
Phase: DEVELOPMENT (complete)
Tasks: 11/11 done

## Decisions Made
- SQLite for simplicity (per PRD)
- React Query for data fetching
- TailwindCSS for styling

## Mistakes & Learnings
- Express handlers need explicit return types
- Run npm install before tests
EOF
echo ""
info "Context persists across sessions"
info "Learnings improve future runs"
sleep 2

# Completion
banner "COMPLETE"
echo ""
echo -e "${GREEN}Todo App Successfully Generated!${NC}"
echo ""
echo "  Files created:    24"
echo "  Tests passing:    32"
echo "  Code coverage:    92%"
echo "  Time elapsed:     8m 42s"
echo "  Human input:      0"
echo ""
sleep 2

echo -e "${CYAN}From PRD to Production${NC}"
echo -e "${CYAN}Zero Human Intervention${NC}"
echo ""
echo "github.com/asklokesh/loki-mode"
echo ""
sleep 3
