# 📔 Unified Diary System (Agentic Context-Preserving Logger) v4.1

![Version](https://img.shields.io/badge/version-v4.1-blue)
![AI Agent](https://img.shields.io/badge/AI-Agent_Driven-orange)
![Sync](https://img.shields.io/badge/Sync-Notion%20%7C%20Obsidian-lightgrey)

**Unified Diary System** is a fully automated, anti-pollution AI journaling and synchronization workflow designed specifically for multi-project developers and creators. By leveraging Continuous Tool Calling from AI Agents, a single natural language command automatically executes a 4-step pipeline: **Local Project Logging ➔ Global Context Fusion ➔ Cloud Bi-directional Sync ➔ Experience Extraction**, achieving a true "One-Shot" seamless record.

---

## ✨ Core Features

* ⚡ **Agent One-Shot Execution**: Once triggered, the AI completes the entire technical process without interruption, only pausing at the final step to ask for human validation on extracted "lessons learned".
* 🛡️ **Context Firewall**: Strictly separates "Project Local Diaries" from the "Global Master Diary." This fundamentally solves the severe "Context Pollution / Tag Drift" problem where AI hallucinates and mixes up progress between Project A and Project B during daily summaries.
* 🧠 **Automated Lessons Learned**: More than just a timeline of events, the AI proactively extracts "New Rules" or "Optimizations" from the bugs you faced or discoveries you made today, distilling them into your Knowledge Base.
* 🔄 **Seamless Cross-Platform Sync**: Includes built-in scripts to push the final global diary straight to Notion and/or Obsidian with a simple `--sync-only` flag.

---

## 🏗️ The 5-Step Workflow Architecture

When a developer types `:{Write a diary entry using the diary skill}` in *any* project directory, the system strictly executes the following atomic operations:

### Step 1: Local Project Archiving (AI Execution)
1. **Auto-Location**: The AI calls terminal commands (e.g., `pwd`) to identify the current working directory, establishing the "Project Name".
2. **Precision Writing**: It writes today's Git Commits, code changes, and problem solutions in "append mode" exclusively into that project's local directory: `diary/YYYY/MM/YYYY-MM-DD-<Project_Name>.md`.

### Step 1.5: Refresh Project Context (Automation Script)
* **Auto-Execution**: The AI invokes `prepare_context.py` to scan the project's latest directory structure, tech stack, and diary-based action items, generating/updating the `AGENT_CONTEXT.md` at the project root.

### Step 2: Extracting Global & Project Material (Automation Script)
* **Material Fetching**: The AI automatically executes `fetch_diaries.py`, precisely pulling the "just-written local project diary" and today's "Global Diary (if it exists)", printing both to the terminal for the AI to read.

### Step 3: AI Smart Fusion & Global Archiving (AI Execution)
* **Seamless Fusion**: The AI mentally sews the two sources from Step 2 together, writing the combined result into the global diary vault: `.../global_skills/auto-skill/diary/YYYY/MM/YYYY-MM-DD.md`.
* **Strict Zoning**: It uses `### 📁 <Project Name>` tagging to ensure existing project progress is preserved, while new project progress is safely appended—absolutely no overwriting.

### Step 4: Cloud Sync & Experience Extraction (Script + Human)
1. **One-Click Push**: The AI calls `master_diary_sync.py --sync-only` to push the data to Notion/Obsidian.
2. **Human Authorization**: The AI extracts today's `📌 New Rules` or `🔄 Experience Optimizations` and presents them to the developer. Once authorized, these are written to the local Knowledge Base and embedded (e.g., via `qmd embed`).

---

## 📂 Directory Structure

This system adopts a "Distributed Recording, Centralized Management" architecture:

```text
📦 Your Computer Environment
 ┣ 📂 Project A (e.g., auto-video-editor)
 ┃ ┗ 📂 diary/YYYY/MM/
 ┃    ┗ 📜 2026-02-24-auto-video-editor.md  <-- Step 1 writes here (Clean, isolated history)
 ┣ 📂 Project B (e.g., GSS)
 ┃ ┗ 📂 diary/YYYY/MM/
 ┃    ┗ 📜 2026-02-24-GSS.md                
 ┃
 ┗ 📂 Global Skills & Diary Center (This Repo)
    ┣ 📂 scripts/
    ┃  ┣ 📜 fetch_diaries.py                <-- Step 2: Material transporter
    ┃  ┣ 📜 prepare_context.py              <-- Step 1.5: Context refresher
    ┃  ┗ 📜 master_diary_sync.py            <-- Step 4: Notion/Obsidian sync
    ┣ 📂 knowledge-base/                    <-- Step 4: AI extracted lessons
    ┗ 📂 diary/YYYY/MM/
       ┗ 📜 2026-02-24.md                   <-- Step 3: The ultimate fused global log
```

---

## 🚀 How to Use (Usage)

After setting up `.env` with your Notion tokens, simply input the following into your CLI/IDE chat while working inside a project:

```bash
:{Write a diary entry using the diary skill} Today I finished the initial integration of the Google Colab python script and fixed the package version conflicts.
```

The system will take over to handle all the filing, merging, and syncing automatically.

---

## 🛠️ Setup & Prerequisites

1. **Configuration**: Rename `.env.example` to `.env` and fill in your `NOTION_TOKEN`, `NOTION_DIARY_DB`, and set where your global diary root is stored.
2. **Dependencies**: `pip install -r requirements.txt`
3. **AI Agent**: Requires an AI assistant with Function Calling / Continuous Tool Calling capabilities (like Cursor, Claude Code, or Gemini CLI frameworks).

---

> **💡 Design Philosophy:**
> Why not just have the AI write directly to the global diary? Because we found that when an AI lacks the "isolated local project context", it frequently suffers from **Tag Drift** (writing Project A's progress under Project B's header). Through this highly-structured "Local First, Global Second" 4-step architecture, we completely eliminated the context pollution pain point in AI-automated logging.
