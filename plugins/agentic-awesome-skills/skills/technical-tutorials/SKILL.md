---
name: technical-tutorials
description: When the user wants to create step-by-step technical tutorials, quickstarts, or code walkthroughs. Trigger phrases include "tutorial," "quickstart," "getting started guide," "walkthrough," "step by step," "how to guide," "hands-on guide," or "code tutorial."
risk: unknown
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/technical-tutorials
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Technical Tutorials
## When to Use

Use this skill when you need when the user wants to create step-by-step technical tutorials, quickstarts, or code walkthroughs. Trigger phrases include "tutorial," "quickstart," "getting started guide," "walkthrough," "step by step," "how to guide," "hands-on guide," or "code tutorial.".


This skill helps you create step-by-step tutorials that actually work. Covers prerequisite handling, progressive complexity, troubleshooting sections, and creating those satisfying "it works!" moments.

---

## Before You Start

**Load your audience context first.** Read `.agents/developer-audience-context.md` to understand:

- Developer skill level (beginner, intermediate, senior)
- Tech stack familiarity (what can you assume they know?)
- Environment (macOS, Linux, Windows, cloud)
- Why they're learning (job, side project, curiosity)

If the context file doesn't exist, run the `developer-audience-context` skill first.

---

## Tutorial Types

| Type | Length | Purpose | Example |
|------|--------|---------|---------|
| **Quickstart** | 5-10 min | First success ASAP | "Make your first API call" |
| **Tutorial** | 20-45 min | Learn a concept deeply | "Build a REST API with Node.js" |
| **Workshop** | 1-3 hours | Comprehensive project | "Build a full-stack app" |
| **Code walkthrough** | Varies | Explain existing code | "Understanding our SDK architecture" |

---

## The Tutorial Structure

### Anatomy of a Great Tutorial

```
1. Title & Meta
   - What you'll build
   - Time estimate
   - Prerequisites

2. Overview
   - What you'll learn
   - Final result preview

3. Prerequisites Check
   - Environment setup
   - Verification commands

4. The Build (Progressive Steps)
   - Step 1: Simplest foundation
   - Step 2: Add one concept
   - Step 3: Add complexity
   - [Checkpoint: "It works!" moment]
   - Step 4: Continue building
   - ...
   - [Final checkpoint]

5. What You Built
   - Recap
   - Complete code

6. Troubleshooting
   - Common errors
   - Debugging tips

7. Next Steps
   - Where to go from here
   - Related tutorials
```

---

## Prerequisites Handling

### The Prerequisites Section

Be explicit. Don't make developers guess what they need.

```markdown
## Prerequisites

Before starting, make sure you have:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | Any | `git --version` |

You should also be comfortable with:
- Basic JavaScript (variables, functions, async/await)
- Command line basics (cd, mkdir, running commands)
- REST API concepts (HTTP methods, JSON)

**New to any of these?** Check out [link to prerequisite tutorial].
```

### Environment Setup Section

Make setup foolproof:

```markdown
## Setting Up Your Environment

### 1. Create Project Directory

\`\`\`bash
mkdir my-awesome-project
cd my-awesome-project
\`\`\`

### 2. Initialize the Project

\`\`\`bash
npm init -y
\`\`\`

You should see output like:
\`\`\`json
{
  "name": "my-awesome-project",
  "version": "1.0.0",
  ...
}
\`\`\`

### 3. Install Dependencies

\`\`\`bash
npm install express dotenv
\`\`\`

### 4. Verify Installation

\`\`\`bash
node -e "require('express'); console.log('Express installed!')"
\`\`\`

Expected output: `Express installed!`
```

---

## Progressive Complexity

### The Layer Cake Approach

Build up in understandable layers:

| Layer | What It Does | Example |
|-------|--------------|---------|
| **1. Skeleton** | Minimum viable code that runs | "Hello World" server |
| **2. Core feature** | Primary functionality | Add one API endpoint |
| **3. Real data** | Replace hardcoded values | Connect to database |
| **4. Error handling** | Production-ready patterns | Add try/catch, validation |
| **5. Polish** | Nice-to-haves | Logging, config, tests |

### Show Progress, Not Perfection

**Wrong approach** (overwhelming):
```javascript
// Here's the complete file with everything
const express = require('express');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
// ... 200 more lines
```

**Right approach** (progressive):

**Step 1: Basic server**
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

**Step 2: Add your first route**
```javascript
// Add this below your existing route
app.get('/api/users', (req, res) => {
  res.json([{ id: 1, name: 'Jane' }]);
});
```

---

## Copy-Paste Friendly Code

### The Copy-Paste Checklist

Every code block must pass these tests:

| Test | How to Verify |
|------|---------------|
| **Runs standalone** | Copy into new file, execute, it works |
| **Imports included** | All `require`/`import` statements present |
| **No undefined variables** | No references to code from other steps without showing it |
| **Environment agnostic** | Works on Mac/Linux/Windows |
| **Comments explain why** | Not what (code shows what), but why |

### Code Block Patterns

**File context is critical:**

```javascript
// server.js - Add this to your existing file
const rateLimit = require('express-rate-limit');

// Add this BEFORE your routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});

app.use(limiter);
```

**Show file structure:**

```
my-project/
├── src/
│   ├── index.js      ← You're editing this
│   ├── routes/
│   │   └── users.js
│   └── db/
│       └── connection.js
├── package.json
└── .env
```

**Highlight changes in context:**

```javascript
// src/index.js
const express = require('express');
const app = express();

// ✅ ADD THIS: Import your new route
const userRoutes = require('./routes/users');

// ✅ ADD THIS: Use the route
app.use('/api/users', userRoutes);

app.listen(3000);
```

---

## "It Works!" Moments

### Checkpoints Create Motivation

Every 3-5 steps, give developers a win:

```markdown
## Checkpoint: Test Your API

Let's make sure everything works before continuing.

**Start your server:**
\`\`\`bash
node server.js
\`\`\`

**In a new terminal, test the endpoint:**
\`\`\`bash
curl http://localhost:3000/api/users
\`\`\`

**You should see:**
\`\`\`json
[{"id": 1, "name": "Jane"}]
\`\`\`

🎉 **It works!** Your API is returning data.

If you don't see this output, check the [Troubleshooting](#troubleshooting) section.
```

### Visual Confirmation

When possible, show what success looks like:

| Output Type | How to Show |
|-------------|-------------|
| **Terminal output** | Code block with expected text |
| **Browser result** | Screenshot or description |
| **API response** | Formatted JSON |
| **Logs** | Code block with log output |

---

## Troubleshooting Sections

### Common Error Template

```markdown
## Troubleshooting

### "Error: Cannot find module 'express'"

**Cause:** Dependencies weren't installed.

**Fix:**
\`\`\`bash
npm install
\`\`\`

---

### "EADDRINUSE: address already in use :::3000"

**Cause:** Another process is using port 3000.

**Fix (macOS/Linux):**
\`\`\`bash
# Find the process
lsof -i :3000

# Kill it (replace PID with actual number)
kill -9 PID
\`\`\`

**Or use a different port:**
\`\`\`javascript
app.listen(process.env.PORT || 3001);
\`\`\`

---

### "SyntaxError: Unexpected token"

**Cause:** Likely a typo or missing bracket.

**Debug steps:**
1. Check the line number in the error
2. Look for missing `,`, `}`, or `)`
3. Verify all strings are closed with matching quotes
```

### Proactive Error Prevention

Add warnings before common pitfalls:

```markdown
⚠️ **Windows users:** Use `set` instead of `export`:
\`\`\`bash
# macOS/Linux
export API_KEY=your_key

# Windows Command Prompt
set API_KEY=your_key

# Windows PowerShell
$env:API_KEY = Read-Host -AsSecureString "API key"
\`\`\`
```

---

## Tutorial Templates

### Quickstart Template (5-10 minutes)

```markdown
# [Product] Quickstart: [What You'll Do] in 5 Minutes

Get [specific outcome] in under 5 minutes.

## Prerequisites

- [Requirement 1]
- [Requirement 2]

## Step 1: Install

\`\`\`bash
npm install your-package
\`\`\`

## Step 2: Configure

Create a `.env` file:
\`\`\`
API_KEY=your_key_here
\`\`\`

## Step 3: Write Code

Create `index.js`:
\`\`\`javascript
// Complete, working code
\`\`\`

## Step 4: Run It

\`\`\`bash
node index.js
\`\`\`

Expected output:
\`\`\`
[Output here]
\`\`\`

## 🎉 You Did It!

You just [accomplished thing].

**Next steps:**
- [Link to full tutorial]
- [Link to API docs]
- [Link to examples repo]
```

### Full Tutorial Template (20-45 minutes)

```markdown
# Build a [Thing] with [Technology]

Learn how to [outcome] by building [specific project].

| | |
|---|---|
| **Time** | 30 minutes |
| **Level** | Intermediate |
| **Prerequisites** | Node.js 18+, basic JavaScript |

## What You'll Build

[Screenshot or diagram of final result]

By the end, you'll have:
- ✅ [Capability 1]
- ✅ [Capability 2]
- ✅ [Capability 3]

## Prerequisites

### Required Software

| Tool | Version | Verify |
|------|---------|--------|
| Node.js | 18+ | `node -v` |

### Required Knowledge

- [Concept 1] — [link to learn]
- [Concept 2] — [link to learn]

## Step 1: Project Setup

[Setup instructions with verification]

**Checkpoint:** You should see `[expected output]`.

## Step 2: [First Feature]

[Instructions]

**Checkpoint:** Test with `[command]`.

## Step 3: [Second Feature]

[Instructions]

## Step 4: [Third Feature]

[Instructions]

**Checkpoint:** Your app should now [do thing].

## Complete Code

Here's everything together:

\`\`\`javascript
// Full final code
\`\`\`

## Troubleshooting

### [Common Error 1]
[Solution]

### [Common Error 2]
[Solution]

## What You Learned

- [Key concept 1]
- [Key concept 2]
- [Key concept 3]

## Next Steps

- **Go deeper:** [Link to advanced tutorial]
- **Explore:** [Link to related feature]
- **Get help:** [Link to Discord/community]
```

---

## Quality Checklist

Before publishing, verify:

### Code Quality
- [ ] Every code block runs without modification
- [ ] All imports/requires are included
- [ ] Expected output is shown
- [ ] Error handling is included
- [ ] Environment variables use `.env` pattern

### Structure Quality
- [ ] Prerequisites are explicit
- [ ] Time estimate is accurate (test it!)
- [ ] Checkpoints every 3-5 steps
- [ ] Final complete code is provided
- [ ] Troubleshooting covers likely errors

### Accessibility
- [ ] Works on Mac, Linux, AND Windows
- [ ] Commands work in bash/zsh/PowerShell
- [ ] File paths use correct separators
- [ ] No assumptions about installed tools

---

## Tools

| Tool | Use Case |
|------|----------|
| **[Octolens](https://octolens.com)** | Find common questions and errors developers encounter. Monitor Stack Overflow and GitHub issues for troubleshooting content. |
| **Replit/CodeSandbox** | Embed runnable examples |
| **Carbon/Ray.so** | Beautiful code screenshots |
| **Excalidraw** | Architecture diagrams |
| **Terminalizer** | Record terminal sessions |
| **Loom** | Quick video supplements |

---

## Related Skills

- `developer-audience-context` — Understand skill level and environment
- `devrel-content` — General technical writing principles
- `developer-onboarding` — Optimize time to first success
- `developer-seo` — Get tutorials found via search

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
