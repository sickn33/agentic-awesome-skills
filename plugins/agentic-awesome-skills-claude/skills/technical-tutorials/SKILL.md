---
name: technical-tutorials
description: When the user wants to create step-by-step technical tutorials, quickstarts, or code walkthroughs. Trigger phrases include "tutorial," "quickstart," "getting started guide," "walkthrough," "step by step," "how to guide," "hands-on guide," or "code tutorial."
risk: critical
source: https://github.com/jonathimer/devmarketing-skills/tree/main/skills/technical-tutorials
source_repo: jonathimer/devmarketing-skills
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/jonathimer/devmarketing-skills/blob/main/LICENSE
---

# Technical Tutorials

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use

Use this skill when you need when the user wants to create step-by-step technical tutorials, quickstarts, or code walkthroughs. Trigger phrases include "tutorial," "quickstart," "getting started guide," "walkthrough," "step by step," "how to guide," "hands-on guide," or "code tutorial.".


This skill helps you create step-by-step tutorials that actually work. Covers prerequisite handling, progressive complexity, troubleshooting sections, and creating those satisfying "it works!" moments.

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

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
