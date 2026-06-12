---
name: evolution
description: "This skill enables makepad-skills to self-improve continuously during development."
risk: critical
source: community
---

# Makepad Skills Evolution

This skill enables makepad-skills to self-improve continuously during development.

## When to Use
- You are maintaining `makepad-skills` and want the skill library to improve itself during development.
- You need the workflow for deciding when a new pattern should become a skill update or hook-driven evolution.
- You are working on self-correction, self-validation, or version adaptation for the skill set.

## Quick Navigation

| Topic | Description |
|-------|-------------|
| Collaboration Guidelines | **Contributing to makepad-skills** |
| [Hooks Setup](#hooks-based-auto-triggering) | Auto-trigger evolution with hooks |
| [When to Evolve](#when-to-evolve) | Triggers and classification |
| [Evolution Process](#evolution-process) | Step-by-step guide |
| [Self-Correction](#self-correction) | Auto-fix skill errors |
| [Self-Validation](#self-validation) | Verify skill accuracy |
| [Version Adaptation](#version-adaptation) | Multi-branch support |

---

## Hooks-Based Auto-Triggering

For reliable automatic triggering, use Claude Code hooks. Install with `--with-hooks`:

```bash
# Install makepad-skills with hooks enabled
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT
curl -fsSLo "$tmpdir/makepad-skills-install.sh" https://raw.githubusercontent.com/ZhangHanDong/makepad-skills/main/install.sh
sed -n '1,160p' "$tmpdir/makepad-skills-install.sh"
bash "$tmpdir/makepad-skills-install.sh" --with-hooks
```

This will install hooks to `.claude/hooks/` and configure `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/makepad-skill-router.sh"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash|Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/pre-tool.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/post-bash.sh"
          }
        ]
      }
    ]
  }
}
```

### What Hooks Do

| Hook | Trigger Event | Action |
|------|---------------|--------|
| `makepad-skill-router.sh` | UserPromptSubmit | Auto-route to relevant skills |
| `pre-tool.sh` | Before Bash/Write/Edit | Detect Makepad version from Cargo.toml |
| `post-bash.sh` | After Bash command fails | Detect Makepad errors, suggest fixes |
| `session-end.sh` | Session ends | Prompt to capture learnings |

---

## Skill Routing and Bundling

The `makepad-skill-router.sh` hook automatically loads relevant skills based on user queries.

### Context Detection

| Context | Trigger Keywords | Skills Loaded |
|---------|------------------|---------------|
| **Full App** | "build app", "从零", "完整应用" | basics, dsl, layout, widgets, event-action, app-architecture |
| **UI Design** | "ui design", "界面设计" | dsl, layout, widgets, animation, shaders |
| **Widget Creation** | "create widget", "创建组件", "自定义组件" | widgets, dsl, layout, animation, shaders, font, event-action |
| **Production** | "best practice", "robrix pattern", "实际项目" | app-architecture, widget-patterns, state-management, event-action |

### Skill Dependencies

When loading certain skills, related skills are auto-loaded:

| Primary Skill | Auto-loads |
|---------------|------------|
| robius-app-architecture | makepad-basics, makepad-event-action |
| robius-widget-patterns | makepad-widgets, makepad-layout |
| makepad-widgets | makepad-layout, makepad-dsl |
| makepad-animation | makepad-shaders |
| makepad-shaders | makepad-widgets |
| makepad-font | makepad-widgets |
| robius-event-action | makepad-event-action |

### Example

```
User: "我想从零开发一个 Makepad 应用"

[makepad-skills] Detected Makepad/Robius query
[makepad-skills] App development context detected - loading skill bundle
[makepad-skills] Routing to: makepad-basics makepad-dsl makepad-event-action
                            makepad-layout makepad-widgets robius-app-architecture
```

---

## When to Evolve

Trigger skill evolution when any of these occur during development:

| Trigger | Target Skill | Priority |
|---------|--------------|----------|
| New widget pattern discovered | robius-widget-patterns/_base | High |
| Shader technique learned | makepad-shaders | High |
| Compilation error solved | makepad-reference/troubleshooting | High |
| Layout solution found | makepad-reference/adaptive-layout | Medium |
| Build/packaging issue resolved | makepad-deployment | Medium |
| New project structure insight | makepad-basics | Low |
| Core concept clarified | makepad-dsl/makepad-widgets | Low |

---

## Evolution Process

### Step 1: Identify Knowledge Worth Capturing

Ask yourself:
- Is this a reusable pattern? (not project-specific)
- Did it take significant effort to figure out?
- Would it help other Makepad developers?
- Is it not already documented in makepad-skills?

### Step 2: Classify the Knowledge

```
Widget/Component Pattern     → robius-widget-patterns/_base/
Shader/Visual Effect         → makepad-shaders/
Error/Debug Solution         → makepad-reference/troubleshooting.md
Layout/Responsive Design     → makepad-reference/adaptive-layout.md
Build/Deploy Issue           → makepad-deployment/SKILL.md
Project Structure            → makepad-basics/
Core Concept/API             → makepad-dsl/ or makepad-widgets/
```

### Step 3: Format the Contribution

**For Patterns**:
```markdown
## Pattern N: [Pattern Name]

Brief description of what this pattern solves.

### live_design!
```rust
live_design! {
    // DSL code
}
```

### Rust Implementation
```rust
// Rust code
```
```

**For Troubleshooting**:
```markdown
### [Error Type/Message]

**Symptom**: What the developer sees

**Cause**: Why this happens

**Solution**:
```rust
// Fixed code
```
```

### Step 4: Mark Evolution (NOT Version)

Add an evolution marker above new content:

```markdown
<!-- Evolution: 2024-01-15 | source: my-app | author: @zhangsan -->
```

### Step 5: Submit via Git

```bash
# Create branch for your contribution
git checkout -b evolution/add-loading-pattern

# Commit your changes
git add robius-widget-patterns/_base/my-pattern.md
git commit -m "evolution: add loading state pattern from my-app"

# Push and create PR
git push origin evolution/add-loading-pattern
```

---

## Self-Correction

When skill content causes errors, automatically correct it.

### Trigger Conditions

```
User follows skill advice → Code fails to compile/run → Claude identifies skill was wrong
                                                      ↓
                                         AUTO: Correct skill immediately
```

### Correction Flow

1. **Detect** - Skill advice led to an error
2. **Verify** - Confirm the skill content is wrong
3. **Correct** - Update the skill file with fix

### Correction Marker Format

```markdown
<!-- Correction: YYYY-MM-DD | was: [old advice] | reason: [why it was wrong] -->
```

---

## Self-Validation

Periodically verify skill content is still accurate.

### Validation Checklist

```markdown
## Validation Report

### Code Examples
- [ ] All `live_design!` examples parse correctly
- [ ] All Rust code compiles
- [ ] All patterns work as documented

### API Accuracy
- [ ] Widget names exist in makepad-widgets
- [ ] Method signatures are correct
- [ ] Event types are accurate
```

### Validation Prompt

> "Please validate makepad-skills against current Makepad version"

---

## Version Adaptation

Provide version-specific guidance for different Makepad branches.

### Supported Versions

| Branch | Status | Notes |
|--------|--------|-------|
| main | Stable | Production ready |
| dev | Active | Latest features, may break |
| rik | Legacy | Older API style |

### Version Detection

Claude should detect Makepad version from:

1. **Cargo.toml branch reference**:
   ```toml
   makepad-widgets = { git = "...", branch = "dev" }
   ```

2. **Cargo.lock content**

3. **Ask user if unclear**

---

## Personalization

Adapt skill suggestions to project's coding style.

### Style Detection

Claude analyzes the current project to detect:

| Aspect | Detection Method | Adaptation |
|--------|------------------|------------|
| Naming convention | Scan existing widgets | Match snake_case vs camelCase |
| Code organization | Check module structure | Suggest matching patterns |
| Comment style | Read existing comments | Match documentation style |
| Widget complexity | Count lines per widget | Suggest appropriate patterns |

---

## Quality Guidelines

### DO Add
- Generic, reusable patterns
- Common errors with clear solutions
- Well-tested shader effects
- Platform-specific gotchas
- Performance optimizations

### DON'T Add
- Project-specific code
- Unverified solutions
- Duplicate content
- Incomplete examples
- Personal preferences without rationale

---

## Skill File Locations

```
skills/
├── # === Core Skills (16) ===
├── makepad-basics/        ← Getting started, app structure
├── makepad-dsl/           ← DSL syntax, inheritance
├── makepad-layout/        ← Layout, sizing, alignment
├── makepad-widgets/       ← Widget components
├── makepad-event-action/  ← Event handling
├── makepad-animation/     ← Animation, states
├── makepad-shaders/       ← Shader basics
├── makepad-platform/      ← Platform support
├── makepad-font/          ← Font, typography
├── makepad-splash/        ← Splash scripting
├── robius-app-architecture/   ← App architecture patterns
├── robius-widget-patterns/    ← Widget reuse patterns
├── robius-event-action/       ← Custom actions
├── robius-state-management/   ← State persistence
├── robius-matrix-integration/ ← Matrix SDK
├── molykit/               ← AI chat toolkit
│
├── # === Extended Skills (3) ===
├── makepad-shaders/ ← Advanced shaders, SDF
│   ├── _base/             ← Official patterns
│   └── community/         ← Community contributions
├── makepad-deployment/    ← Build & packaging
├── makepad-reference/     ← Troubleshooting, code quality
│
├── # Note: Production patterns integrated into robius-* skills:
├── # - Widget patterns → robius-widget-patterns/_base/
├── # - State patterns → robius-state-management/_base/
├── # - Async patterns → robius-app-architecture/_base/
│
└── evolution/             ← Self-evolution system
    ├── hooks/             ← Auto-trigger hooks
    ├── references/        ← Detailed guides
    └── templates/         ← Contribution templates
```

---

## Auto-Evolution Prompts

Use these prompts to trigger self-evolution:

### After Solving a Problem
> "This solution should be added to makepad-skills for future reference."

### After Creating a Widget
> "This widget pattern is reusable. Let me add it to makepad-patterns."

### After Debugging
> "This error and its fix should be documented in makepad-troubleshooting."

### After Completing a Feature
> "Review what I learned and update makepad-skills if applicable."

---

## Continuous Improvement Checklist

After each Makepad development session, consider:

- [ ] Did I discover a new widget composition pattern?
- [ ] Did I solve a tricky shader problem?
- [ ] Did I encounter and fix a confusing error?
- [ ] Did I find a better way to structure layouts?
- [ ] Did I learn something about packaging/deployment?
- [ ] Would any of this help other Makepad developers?

If yes to any, evolve the appropriate skill!

## References

- [makepad-skills repository](https://github.com/ZhangHanDong/makepad-skills)
- [Makepad documentation](https://github.com/makepad/makepad)
- [Project Robius](https://github.com/project-robius)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
