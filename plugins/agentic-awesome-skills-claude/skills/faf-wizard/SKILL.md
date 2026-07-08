---
name: faf-wizard
description: "Done-for-you .faf generator. One-click AI context for any project - new, legacy, or famous. Auto-detects stack, scores readiness, works everywhere."
category: productivity
risk: safe
source: community
source_repo: Wolfe-Jam/faf-skills
source_type: community
date_added: "2026-04-07"
author: wolfejam
tags: [faf, automation, project-setup, ai-context, productivity]
tools: [claude, cursor, gemini, windsurf, any-ai]
---

# FAF Wizard - One-Click AI Intelligence

**The pit crew for your projects.** Point it at any codebase and get scored, AI-ready context in 60 seconds.

Transform any project - new, legacy, famous OSS, or forgotten side projects - into an AI-intelligent workspace with persistent context that works across all AI tools.

## The Problem It Solves

**Even React.js scores 0% AI-readiness.** Famous repositories have no AI context.

| What Exists | What It Tells AI |
|-------------|------------------|
| README.md | "What this does" (for humans) |
| docs/ | "How to use it" (for humans) |
| **project.faf** | "How to help build this" (for AI) |

Documentation tells humans how to use your code. AI context tells AI how to help you build it. **They're completely different things.**

## Works on ANY Project

| Project Type | What FAF Wizard Does |
|-------------|----------------------|
| **Brand new** | Perfect AI context from line one |
| **Legacy nightmare** | AI finally understands the archaeology |
| **Famous OSS** | Even React doesn't have this |
| **Side projects** | Stop re-explaining every session |
| **Client handoffs** | Portable context for any AI tool |
| **Team projects** | Shared context that everyone can use |

## Real Success Stories

### Before/After: Legacy E-commerce Platform
```
Before: "This 50k-line PHP codebase from 2015..."
AI: "I don't understand this architecture"

After: 60 seconds with FAF Wizard
AI: "I see this is a Laravel-based e-commerce system with 
payment processing, inventory management, and multi-tenant 
architecture. Here's how I can help..."
```

### Before/After: Modern React App
```
Before: Every AI session starts with context explanation
Time lost: 5-10 minutes per session

After: project.faf exists
AI: Instant understanding, productive from message one
Time saved: 2+ hours per day
```

## The 60-Second Workflow

### Step 1: Detection (10 seconds)
```bash
faf auto
# Scans manifest files, directory structure, dependencies
# Detects: React + TypeScript + Tailwind + Vercel
```

### Step 2: Generation (30 seconds)  
```yaml
# Auto-generated project.faf
project:
  name: my-saas-dashboard  
  goal: Customer analytics platform

stack:
  frontend: react-18
  css: tailwind
  deployment: vercel
  
human_context:
  who: Solo founder
  what: SaaS analytics dashboard
  why: Customer insights for small businesses
```

### Step 3: Scoring & Report (20 seconds)
```
✅ Generated: project.faf
🏆 AI-Readiness: 87% Bronze - Production ready

Filled: 9/11 active slots
Ignored: 22 slots (not applicable)

To reach Silver (95%):
  + Add API documentation (+5%)  
  + Define deployment details (+3%)
```

## Performance Data (Real Numbers)

**Analyzed 8,400+ Projects:**
- ✅ **99.2% detection accuracy** across 153+ formats
- ✅ **Average generation time**: 12.3 seconds
- ✅ **Bronze tier or higher**: 94% of projects
- ✅ **Zero manual configuration**: Works out of the box

### Format Support
Automatically detects and configures:
- **JavaScript**: React, Vue, Angular, Svelte, Next.js, Nuxt
- **Python**: Django, Flask, FastAPI, Jupyter, Poetry
- **TypeScript**: All JS frameworks + native TS projects  
- **Rust**: Cargo projects, CLI tools, web servers
- **Go**: Modules, Docker, microservices
- **Java**: Maven, Gradle, Spring Boot
- **+147 more formats**

## Universal Compatibility

### Works With Every AI Tool
- ✅ **Claude Code** - Reads .faf natively
- ✅ **Cursor** - Auto-syncs to .cursorrules  
- ✅ **Gemini CLI** - Converts to GEMINI.md
- ✅ **Windsurf** - Syncs to .windsurfrules
- ✅ **ChatGPT** - Readable YAML format
- ✅ **Any AI** - Universal format support

### Migration Support
Already have AI context files?
```bash
# Migrates existing context
faf migrate --from .cursorrules
faf migrate --from CLAUDE.md  
faf migrate --from README.md

# One format, works everywhere
faf sync --target all
```

## Installation Options

### Option 1: CLI (Recommended)
```bash
npm install -g faf-cli
cd your-project
faf auto
```

### Option 2: MCP Server (Claude Code)
```json
{
  "mcpServers": {
    "faf": {
      "command": "npx", 
      "args": ["-y", "claude-faf-mcp@latest"]
    }
  }
}
```

### Option 3: Browser Extension
Install from Chrome Web Store - works on any Git repository.

## Three-Phase Intelligence

### Phase 1: Stack Detection
- Scans `package.json`, `Cargo.toml`, `pyproject.toml`, etc.
- Analyzes directory structure and file patterns
- Identifies frameworks, deployment targets, testing setup

### Phase 2: Context Mining  
- Extracts project description from README
- Identifies architecture patterns from code structure
- Pulls dependency information for AI context

### Phase 3: Optimization
- Generates focused 33-slot IANA format
- Validates against format specification
- Scores AI-readiness with improvement suggestions

## Success Metrics by Project Type

| Project Type | Avg Score | Time to Bronze | Detection Rate |
|-------------|-----------|----------------|----------------|
| **React/Vue** | 89% | Instant | 99.8% |
| **Python Django** | 91% | Instant | 99.5% |  
| **Rust CLI** | 85% | Instant | 99.1% |
| **Legacy PHP** | 76% | 30 seconds | 94.2% |
| **Monorepo** | 82% | 45 seconds | 91.8% |

## When to Use faf-expert Instead

Use `faf-wizard` for:
- ✅ Quick project onboarding
- ✅ Automatic everything
- ✅ "Just make it work"
- ✅ Time-constrained scenarios

Use `faf-expert` for:
- 🎯 Fine-tuned championship scoring (95%+)
- 🎯 Complex MCP server configuration
- 🎯 Multi-platform sync management  
- 🎯 Enterprise deployment patterns

## Validation & Security

**Enterprise-Grade Standards:**
- ✅ **800+ comprehensive tests** across CLI and MCP
- ✅ **No credentials ever stored** in .faf files
- ✅ **YAML format validation** prevents malformed files
- ✅ **IANA-registered format** (application/vnd.faf+yaml)
- ✅ **MIT licensed** - safe for commercial use

## Getting Started

### For Your Current Project
```bash
# One command, done forever
npx faf-cli auto

# Check the results
cat project.faf
```

### For Any GitHub Repository  
Install the browser extension and click "Generate FAF" on any repo.

### For Teams
```bash
# Set up team-wide MCP server
faf mcp install --team
faf sync --target all --watch
```

## Community & Support

- **Website**: https://faf.one
- **Chrome Extension**: 4.8★ rating, Google approved
- **Downloads**: 52k+ across ecosystem  
- **Discord**: Active community of 1000+ developers
- **Documentation**: Comprehensive guides and examples

---

*Stop explaining your project every session. FAF Wizard - because AI should understand your project as well as you do.*

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
