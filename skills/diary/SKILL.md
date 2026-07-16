---
name: diary
description: "Unified Diary System: A context-preserving automated logger for multi-project development."
risk: safe
source: self
---

# 📔 Unified Diary System

## When to Use This Skill
Use this skill when you want to summarize progress, write a daily dev log, or perform a daily review while keeping project contexts isolated and synced to Notion/Obsidian.

> 🚨 **Agent One-Shot Integrity Constraint (Highest Priority)**: Steps 1-4 are an **indivisible atomic workflow**. The AI **MUST use Continuous Tool Calling** to complete all actions in one breath.
> - **ABSOLUTELY FORBIDDEN** to output conversational text and wait for the user after completing Step 1, 2, or 3.
> - Example: Immediately after saving the file in Step 1, you must **automatically and instantly** call the terminal tool to execute the script in Step 2. Stopping to chat or asking "Should I continue?" is considered a critical error. Only inform the user explicitly if you are stuck due to a technical error.

> ⚠️ **Ironclad Rule 1**: The local project diary in Step 1 **must NEVER be polluted with global data**. It only records the current project.
> ⚠️ **Ironclad Rule 2**: When using tools like `run_command` to execute predefined python scripts (Step 2, Step 4), you must set them to `SafeToAutoRun: true` to avoid getting stuck waiting for user authorization.
> ⚠️ **Ironclad Rule 3**: **Never guess the project name**. The AI must confirm the current directory name as the project identifier using a terminal command BEFORE taking any action in Step 1.

---

## Step 1: Local Project Archiving (AI Generation)
- **Action 0 (Identify)**: Call the terminal `pwd` (Linux/Mac) or `(Get-Item .).Name` (Windows) to confirm the current folder name.
- **Action 1 (Write)**: Summarize the achievements from the current conversation (Git Commits, file changes, task progress), and write them into the **current project folder** at `diary/YYYY/MM/YYYY-MM-DD-ProjectName.md`.
- **Isolation and Naming Rules (Ironclad Rules)**:
  - 📄 **Mandatory Filename Suffix**: The local diary **MUST** include the project name detected just now. It is **absolutely forbidden** to use a global-level filename (like `2026-02-23.md`) locally.
  - ✅ **Pure Content**: Only record content exclusive to the current project. Do not mix in other projects.
  - 📝 **Append Mode**: If the project diary already exists, update it using "append", never overwrite the original content.
  - 📁 **Auto-Creation**: Create subfolders `diary/YYYY/MM/` based on the year and month.
  - ⚡ **Force Continue**: Once writing is complete, **do not interrupt the conversation; immediately call the terminal tool and proceed to Step 2.**

## Step 1.5: Refresh Project Context (Automation Script)
- **Prerequisite**: You have confirmed the current project directory path (from Action 0's `pwd` result).
- **Action**: Call the terminal to execute the following command to automatically scan the project state and generate/update `AGENT_CONTEXT.md`:
  ```powershell
  python {diary_system_path}/scripts/prepare_context.py "<Project_Root_Path>"
  ```
- **SafeToAutoRun**: true (Safe operation; purely reading and writing local files).
- **Result**: `AGENT_CONTEXT.md` in the project directory is refreshed to the latest state.
- **After Completion**: Force continue to Step 2; do not wait for user confirmation.

## Step 2: Extract Global & Project Material (Script Execution)
- **Action**: Call the extraction script, **passing in the absolute path of the project diary just written in Step 1**. The script will precisely print "Today's Global Progress" and "Current Project Progress".
- **Execution Command**:
  ```powershell
  python {diary_system_path}/scripts/fetch_diaries.py "<Absolute_Path_to_Step1_Project_Diary>"
  ```
- **Result**: The terminal will print two sets of material side-by-side. The AI must read the terminal output directly and prepare for mental fusion.

## Step 3: AI Smart Fusion & Global Archiving (AI Execution) 🧠
- **Action**: Based on the two materials printed by the terminal in Step 2, complete a **seamless fusion** mentally, then write it to the global diary: `{diary_system_path}/diary/YYYY/MM/YYYY-MM-DD.md`.
- **Context Firewall (Core Mechanism)**:
  1. **No Tag Drift**: When reading "Global Progress Material", there may be progress from other projects. **It is strictly forbidden to categorize today's conversation achievements under existing project headings belonging to other projects.**
  2. **Priority Definition**: The content marked as `📁 [Current Project Latest Progress]` in Step 2 is the protagonist of today's diary.
- **Rewrite Rules**:
  1. **Safety First**: If the global diary "already exists," preserve the original content and append/fuse the new project progress. **Do not overwrite.**
  2. **Precise Zoning**: Ensure there is a dedicated `### 📁 ProjectName` zone for this project. Do not mix content into other project zones.
  3. **Lessons Learned**: Merge and deduplicate; attach action items to every entry.
  4. **Cleanup**: After writing or fusing globally, you **must** force-delete any temporary files created to avoid encoding issues (e.g., `temp_diary.txt`, `fetched_diary.txt`) to keep the workspace clean.

## Step 4: Cloud Sync & Experience Extraction (Script + Human) 🛑
- **Action 1 (Sync)**: Call the master script to push the global diary to Notion and Obsidian.
- **Execution Command**:
  ```powershell
  python {diary_system_path}/scripts/master_diary_sync.py --sync-only
  ```
- **Action 2 (Extraction & Forced Pause)**:
  1. The AI extracts "Improvements & Learning" from the global diary.
  2. Confirm if it contains entirely new key points lacking in the past (📌 New Rules), or better approaches (🔄 Evolved Rules).
  3. List the results and **WAIT FOR USER CONFIRMATION** (user says "execute" or "agree").
  4. After user confirmation, update the `.md` file in `{Knowledge_Base_Path}/` and execute `qmd embed` (if applicable).

---
**🎯 Task Acceptance Criteria**:
1. ✅ Project local diary generated (no pollution).
2. ✅ `fetch_diaries.py` called with absolute path and successfully printed materials.
3. ✅ AI executed high-quality rewrite and precisely wrote to global diary (appended successfully if file existed).
4. ✅ `--sync-only` successfully pushed to Notion + Obsidian.
5. ✅ Experience extraction presented to the user and authorized.

---

## 📝 Templates and Writing Guidelines

Strictly apply the following Markdown templates to ensure clarity during Step 1 (Local) and Step 3 (Global Fusion).

### 💡 Writing Guidelines (For AI)
1. **Dynamic Replacement**: The `{Project Name}` in the template MUST strictly use the folder name grabbed by `pwd` in Step 1.
2. **Concise Deduplication**: When writing the global diary in Step 3, the AI must condense the "🛠️ Execution Details" from the local diary. The global diary focuses only on "General Direction and Output Results."
3. **Mandatory Checkboxes**: All "Next Steps" and "Action Items" must use the Markdown `* [ ]` format so they can be checked off in Obsidian/Notion later.

### 📝 Template 1: Project Local Diary (Step 1 Exclusive)

```markdown
# Project DevLog: {Project Name}
* **📅 Date**: YYYY-MM-DD
* **🏷️ Tags**: `#Project` `#DevLog`

---

> 🎯 **Progress Summary**
> (Briefly state the core task completed, e.g., "Finished Google Colab environment testing for auto-video-editor")

### 🛠️ Execution Details & Changes
* **Git Commits**: (List if any)
* **Core File Modifications**:
  * 📄 `path/filename`: Explanation of changes.
* **Technical Implementation**:
  * (Record key logic or architecture structural changes)

### 🚨 Troubleshooting
> 🐛 **Problem Encountered**: (e.g., API error, package conflict)
> 💡 **Solution**: (Final fix, leave key commands)

### ⏭️ Next Steps
- [ ] (Specific task 1)
- [ ] (Specific task 2)
```

---

### 🌍 Template 2: Global Diary (Step 3 Exclusive)

```markdown
# 📔 YYYY-MM-DD Global Progress Overview

> 🌟 **Daily Highlight**
> (1-2 sentences summarizing all project progress for the day, synthesized by AI)

---

## 📁 Project Tracking
(⚠️ AI Rule: If file exists, find the corresponding project title and append; NEVER overwrite, keep it clean.)

### 🔵 {Project A, e.g., auto-video-editor}
* **Today's Progress**: (Condense Step 2 local materials into key points)
* **Action Items**: (Extract next steps)

### 🟢 {Project B, e.g., GSS}
* **Today's Progress**: (Condense key points)
* **Action Items**: (Extract next steps)

---

## 🧠 Improvements & Learnings
(⚠️ Dedicated to Experience Extraction)

📌 **New Rules / Discoveries**
(e.g., Found hidden API limit, or a more efficient python syntax)

🔄 **Optimizations & Reflections**
(Improvements from past methods)

---

## ✅ Global Action Items
- [ ] (Tasks unrelated to specific projects)
- [ ] (System environment maintenance, etc.)
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
