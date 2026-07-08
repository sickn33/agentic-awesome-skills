# Loki Mode Demo - VHS Tape
# Generate with: vhs demo/vhs-tape.tape
# Output: demo/loki-demo.gif

Output demo/loki-demo.gif
Output demo/loki-demo.mp4

Set FontSize 14
Set Width 1200
Set Height 800
Set Theme "Catppuccin Mocha"
Set Padding 20
Set TypingSpeed 50ms

# Title screen
Type "# Loki Mode - Multi-Agent Autonomous Startup System"
Enter
Sleep 2s

Type "# Building a Todo App from PRD - Zero Human Intervention"
Enter
Sleep 2s

Hide
Type "clear"
Enter
Show

# Step 1: Show we're starting Claude Code
Sleep 1s
Type "claude --dangerously-skip-permissions"
Enter
Sleep 2s

# Step 2: Invoke Loki Mode
Type "Loki Mode with PRD at examples/simple-todo-app.md"
Enter
Sleep 3s

# Simulate Loki Mode output
Hide
Type@0ms "echo ''"
Enter
Show

Type@0ms "[LOKI MODE] Reading PRD..."
Sleep 1s
Enter

Type@0ms "[LOKI MODE] Phase: BOOTSTRAP"
Sleep 500ms
Enter

Type@0ms "  Creating .loki/ directory..."
Sleep 500ms
Enter

Type@0ms "  Initializing orchestrator state..."
Sleep 500ms
Enter

Type@0ms "[LOKI MODE] Phase: DISCOVERY"
Sleep 1s
Enter

Type@0ms "  Analyzing requirements..."
Sleep 500ms
Enter

Type@0ms "  Generated 17 tasks"
Sleep 500ms
Enter

Type@0ms "[LOKI MODE] Phase: ARCHITECTURE"
Sleep 1s
Enter

Type@0ms "  Creating OpenAPI specification..."
Sleep 500ms
Enter

Type@0ms "  Spec written to .loki/specs/openapi.yaml"
Sleep 500ms
Enter

Type@0ms "[LOKI MODE] Phase: DEVELOPMENT"
Sleep 1s
Enter

Type@0ms "  Spawning agents..."
Sleep 500ms
Enter

Type@0ms "    [SPAWN] agent-backend-001 (Sonnet)"
Sleep 300ms
Enter

Type@0ms "    [SPAWN] agent-frontend-001 (Sonnet)"
Sleep 300ms
Enter

Type@0ms "    [SPAWN] agent-qa-001 (Haiku)"
Sleep 300ms
Enter

Sleep 2s

Type@0ms "  [agent-backend-001] Implementing Express server..."
Sleep 1s
Enter

Type@0ms "  [agent-frontend-001] Creating React components..."
Sleep 1s
Enter

Type@0ms "  [agent-backend-001] Task complete: API endpoints"
Sleep 500ms
Enter

Type@0ms "[LOKI MODE] Code Review"
Sleep 1s
Enter

Type@0ms "  Launching 3 parallel reviewers (Opus)..."
Sleep 500ms
Enter

Type@0ms "    [1/3] Code Quality:   REVIEWING..."
Sleep 300ms
Enter

Type@0ms "    [2/3] Business Logic: REVIEWING..."
Sleep 300ms
Enter

Type@0ms "    [3/3] Security:       REVIEWING..."
Sleep 300ms
Enter

Sleep 2s

Type@0ms "  Review Results:"
Sleep 500ms
Enter

Type@0ms "    Code Quality:   APPROVED"
Sleep 300ms
Enter

Type@0ms "    Business Logic: APPROVED"
Sleep 300ms
Enter

Type@0ms "    Security:       APPROVED"
Sleep 300ms
Enter

Type@0ms "  Running Devil's Advocate check..."
Sleep 1s
Enter

Type@0ms "    Devil's Advocate: APPROVED (1 Low suggestion)"
Sleep 500ms
Enter

Type@0ms "[LOKI MODE] Quality Gates"
Sleep 1s
Enter

Type@0ms "  Unit Tests:    24/24 PASS (92% coverage)"
Sleep 500ms
Enter

Type@0ms "  Integration:   8/8 PASS"
Sleep 500ms
Enter

Type@0ms "  Quality Gate:  PASSED"
Sleep 500ms
Enter

Sleep 2s

Type@0ms "[LOKI MODE] COMPLETE"
Sleep 1s
Enter
Enter

Type@0ms "Todo App successfully generated!"
Sleep 500ms
Enter

Type@0ms "  Files created: 24"
Sleep 300ms
Enter

Type@0ms "  Tests passing: 32"
Sleep 300ms
Enter

Type@0ms "  Time elapsed:  8m 42s"
Sleep 300ms
Enter

Sleep 3s

# End screen
Hide
Type "clear"
Enter
Show

Type "# Loki Mode - From PRD to Production"
Enter
Sleep 1s

Type "# Zero Human Intervention"
Enter
Sleep 1s

Type "# github.com/asklokesh/loki-mode"
Enter
Sleep 3s
