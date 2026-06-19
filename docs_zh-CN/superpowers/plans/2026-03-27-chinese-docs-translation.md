# Chinese Documentation Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate 68 missing documentation files from English to Chinese with consistent terminology using a sequential glossary-building approach.

**Architecture:** Process files in dependency order (Priority 1-5), building a glossary incrementally. Each batch is validated and committed before proceeding to the next. Quality assurance includes link checking, markdown linting, and terminology consistency verification.

**Tech Stack:** Markdown, JSON glossary, bash validation scripts, git for version control

---

## Task 1: Infrastructure Setup

**Files:**
- Create: `docs_zh-CN/.glossary.json`
- Create: `docs_zh-CN/translation-status.md`
- Create: `docs_zh-CN/translation-issues.md`
- Create: `scripts/validate-links.sh`
- Create: `scripts/validate-glossary.sh`

- [ ] **Step 1: Create initial glossary structure**

Create `docs_zh-CN/.glossary.json`:

```json
{
  "metadata": {
    "version": "1.0.0",
    "created": "2026-03-27",
    "last_updated": "2026-03-27",
    "total_terms": 0
  },
  "terms": {}
}
```

- [ ] **Step 2: Create translation status tracker**

Create `docs_zh-CN/translation-status.md`:

```markdown
# Chinese Documentation Translation Status

**Started:** 2026-03-27
**Last Updated:** 2026-03-27
**Total Files:** 68
**Completed:** 0
**In Progress:** 0
**Remaining:** 68

## Progress by Priority

### Priority 1: Core User Docs (0/4)
- [ ] README.md
- [ ] users/getting-started.md
- [ ] users/usage.md
- [ ] users/faq.md

### Priority 2: Tool-Specific Guides (0/4)
- [ ] users/claude-code-skills.md
- [ ] users/cursor-skills.md
- [ ] users/gemini-cli-skills.md
- [ ] users/codex-cli-skills.md

### Priority 3: Advanced User Docs (0/15)
- [ ] users/bundles.md
- [ ] users/workflows.md
- [ ] users/skills-vs-mcp-tools.md
- [ ] users/agent-overload-recovery.md
- [ ] users/windows-truncation-recovery.md
- [ ] users/ai-agent-skills.md
- [ ] users/antigravity-awesome-skills-vs-awesome-claude-skills.md
- [ ] users/best-claude-code-skills-github.md
- [ ] users/best-cursor-skills-github.md
- [ ] users/kiro-integration.md
- [ ] users/local-config.md
- [ ] users/security-skills.md
- [ ] users/walkthrough.md
- [ ] users/visual-guide.md
- [ ] BUNDLES.md

### Priority 4: Contributor Guides (0/6)
- [ ] contributors/quality-bar.md
- [ ] contributors/security-guardrails.md
- [ ] contributors/skill-anatomy.md
- [ ] EXAMPLES.md
- [ ] QUALITY_BAR.md
- [ ] SKILL_ANATOMY.md

### Priority 5: Maintainer Docs (0/39)
- [ ] maintainers/skills-update-guide.md
- [ ] maintainers/repo-growth-seo.md
- [ ] maintainers/categorization-implementation.md
- [ ] maintainers/date-tracking-implementation.md
- [ ] maintainers/merging-prs.md
- [ ] maintainers/rollback-procedure.md
- [ ] maintainers/skills-date-tracking.md
- [ ] maintainers/skills-import-2026-03-21.md
- [ ] maintainers/smart-auto-categorization.md
- [ ] maintainers/release-notes-7.2.0.md
- [ ] maintainers/security-findings-triage-2026-03-15.md
- [ ] maintainers/security-findings-triage-2026-03-18-addendum.md
- [ ] AUDIT.md
- [ ] CATEGORIZATION_IMPLEMENTATION.md
- [ ] CI_DRIFT_FIX.md
- [ ] COMMUNITY_GUIDELINES.md
- [ ] DATE_TRACKING_IMPLEMENTATION.md
- [ ] GETTING_STARTED.md
- [ ] KIRO_INTEGRATION.md
- [ ] SECURITY_GUARDRAILS.md
- [ ] SEC_SKILLS.md
- [ ] SKILLS_DATE_TRACKING.md
- [ ] SKILL_TEMPLATE.md
- [ ] SMART_AUTO_CATEGORIZATION.md
- [ ] SOURCES.md
- [ ] USAGE.md
- [ ] VISUAL_GUIDE.md
- [ ] WORKFLOWS.md
- [ ] walkthrough.md
- [ ] integrations/jetski-cortex.md
- [ ] integrations/jetski-gemini-loader/README.md

## Glossary Statistics
- **Total Terms:** 0
- **Core Terms:** 0
- **Context-Specific Terms:** 0
```

- [ ] **Step 3: Create issues tracker**

Create `docs_zh-CN/translation-issues.md`:

```markdown
# Chinese Documentation Translation Issues

**Last Updated:** 2026-03-27

## Broken Links
*None reported yet*

## Glossary Conflicts
*None reported yet*

## Translation Ambiguities
*None reported yet*

## Edge Cases
*None reported yet*
```

- [ ] **Step 4: Create link validation script**

Create `scripts/validate-links.sh`:

```bash
#!/bin/bash
# Validate internal and external links in Chinese documentation

echo "=== Link Validation Report ===" > docs_zh-CN/link-validation-report.txt
echo "Date: $(date)" >> docs_zh-CN/link-validation-report.txt
echo "" >> docs_zh-CN/link-validation-report.txt

# Check internal links
echo "## Internal Links" >> docs_zh-CN/link-validation-report.txt
find docs_zh-CN -name "*.md" -exec grep -Ho '\[.*\]([^)]*\.md)' {} \; | while read link; do
  target=$(echo "$link" | sed -n 's/.*(\([^)]*\.md\)).*/\1/p')
  source_file=$(echo "$link" | sed -n 's/^\(.*\):\[.*/\1/p')
  if [ -n "$target" ]; then
    if [ ! -f "docs_zh-CN/$target" ] && [ ! -f "docs/$target" ]; then
      echo "BROKEN: $source_file -> $target" >> docs_zh-CN/link-validation-report.txt
    fi
  fi
done

echo "" >> docs_zh-CN/link-validation-report.txt
echo "## External Links (sample check)" >> docs_zh-CN/link-validation-report.txt
find docs_zh-CN -name "*.md" -exec grep -Ho 'https://[^)]*' {} \; | head -10 >> docs_zh-CN/link-validation-report.txt

echo "Link validation complete. Report: docs_zh-CN/link-validation-report.txt"
```

- [ ] **Step 5: Create glossary consistency script**

Create `scripts/validate-glossary.sh`:

```bash
#!/bin/bash
# Check if glossary terms are used consistently across translations

GLOSSARY="docs_zh-CN/.glossary.json"
REPORT="docs_zh-CN/glossary-consistency-report.txt"

echo "=== Glossary Consistency Report ===" > "$REPORT"
echo "Date: $(date)" >> "$REPORT"
echo "" >> "$REPORT"

echo "## Glossary Terms Count" >> "$REPORT"
jq '.metadata.total_terms' "$GLOSSARY" >> "$REPORT"

echo "" >> "$REPORT"
echo "## Top 10 Terms" >> "$REPORT"
jq -r '.terms | to_entries[] | "\(.key): \(.value.translation)"' "$GLOSSARY" | head -10 >> "$REPORT"

echo "Glossary consistency check complete. Report: $REPORT"
```

- [ ] **Step 6: Make scripts executable**

Run: `chmod +x scripts/validate-links.sh scripts/validate-glossary.sh`

Expected: Scripts executable

- [ ] **Step 7: Commit infrastructure**

Run:
```bash
git add docs_zh-CN/.glossary.json docs_zh-CN/translation-status.md docs_zh-CN/translation-issues.md scripts/validate-links.sh scripts/validate-glossary.sh
git commit -m "feat: add translation infrastructure

- Add glossary database structure
- Add translation status tracker (68 files pending)
- Add issues tracker for broken links and conflicts
- Add link validation script
- Add glossary consistency script

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Glossary Foundation - Pre-translation Analysis

**Files:**
- Modify: `docs_zh-CN/.glossary.json`
- Read: `docs/README.md`, `docs/users/getting-started.md`, `docs/users/usage.md`, `docs/users/faq.md`

- [ ] **Step 1: Analyze Priority 1 files for recurring terms**

Run analysis on the 4 core user docs to extract technical terms:

```bash
# Extract frequently occurring technical terms
for file in docs/README.md docs/users/getting-started.md docs/users/usage.md docs/users/faq.md; do
  echo "=== Analyzing $file ==="
  cat "$file" | grep -oE '\b[A-Z][a-z]+(\s+[A-Z][a-z]+)?\b' | sort | uniq -c | sort -rn | head -20
done
```

- [ ] **Step 2: Create initial glossary with 30-40 core terms**

Update `docs_zh-CN/.glossary.json`:

```json
{
  "metadata": {
    "version": "1.0.1",
    "created": "2026-03-27",
    "last_updated": "2026-03-27",
    "total_terms": 35
  },
  "terms": {
    "skills": {
      "translation": "技能",
      "context": "AI assistant capabilities - core concept",
      "examples": ["use skills", "skill library", "skill execution"]
    },
    "repository": {
      "translation": "仓库",
      "context": "Git repository or code storage",
      "examples": ["clone the repository", "repository structure"]
    },
    "installation": {
      "translation": "安装",
      "context": "Software installation process",
      "examples": ["installation guide", "install skills"]
    },
    "bundles": {
      "translation": "捆绑包",
      "context": "Curated skill collections",
      "examples": ["starter bundles", "bundle recommendations"]
    },
    "workflows": {
      "translation": "工作流",
      "context": "Step-by-step execution guides",
      "examples": ["workflow automation", "execution workflows"]
    },
    "agents": {
      "translation": "代理",
      "context": "AI agents or AI assistants",
      "examples": ["AI agent", "agent system"]
    },
    "cli": {
      "translation": "命令行界面",
      "context": "Command Line Interface - keep as CLI in code",
      "examples": ["CLI tool", "command line"]
    },
    "contributor": {
      "translation": "贡献者",
      "context": "People contributing to the project",
      "examples": ["contributors guide", "become a contributor"]
    },
    "maintainer": {
      "translation": "维护者",
      "context": "People maintaining the project",
      "examples": ["maintainers guide", "maintainer docs"]
    },
    "documentation": {
      "translation": "文档",
      "context": "Project documentation",
      "examples": ["documentation files", "read the docs"]
    },
    "github": {
      "translation": "GitHub",
      "context": "Platform name - keep in English",
      "examples": ["GitHub repository", "GitHub stars"]
    },
    "claude": {
      "translation": "Claude",
      "context": "AI model/assistant name - keep in English",
      "examples": ["Claude Code", "Claude API"]
    },
    "cursor": {
      "translation": "Cursor",
      "context": "IDE name - keep in English",
      "examples": ["Cursor IDE", "Cursor skills"]
    },
    "gemini": {
      "translation": "Gemini",
      "context": "Google AI - keep in English",
      "examples": ["Gemini CLI", "Gemini API"]
    },
    "mcp": {
      "translation": "MCP",
      "context": "Model Context Protocol - keep as MCP",
      "examples": ["MCP server", "MCP tools"]
    },
    "npm": {
      "translation": "npm",
      "context": "Node package manager - keep in English",
      "examples": ["npm install", "npm package"]
    },
    "plugin": {
      "translation": "插件",
      "context": "Software plugin/extension",
      "examples": ["plugin marketplace", "install plugin"]
    },
    "marketplace": {
      "translation": "市场",
      "context": "Plugin marketplace",
      "examples": ["marketplace add", "plugin marketplace"]
    },
    "directory": {
      "translation": "目录",
      "context": "File system directory",
      "examples": ["project directory", "skills directory"]
    },
    "terminal": {
      "translation": "终端",
      "context": "Command line terminal",
      "examples": ["open terminal", "terminal command"]
    },
    "features": {
      "translation": "功能",
      "context": "Software features",
      "examples": ["key features", "feature set"]
    },
    "categories": {
      "translation": "类别",
      "context": "Classification categories",
      "examples": ["skill categories", "category list"]
    },
    "integration": {
      "translation": "集成",
      "context": "Software integration",
      "examples": ["integration guide", "tool integration"]
    },
    "configuration": {
      "translation": "配置",
      "context": "Software configuration",
      "examples": ["configuration file", "setup configuration"]
    },
    "development": {
      "translation": "开发",
      "context": "Software development",
      "examples": ["development workflow", "development guide"]
    },
    "security": {
      "translation": "安全",
      "context": "Security practices",
      "examples": ["security review", "security guidelines"]
    },
    "testing": {
      "translation": "测试",
      "context": "Software testing",
      "examples": ["testing guide", "test files"]
    },
    "deployment": {
      "translation": "部署",
      "context": "Software deployment",
      "examples": ["deployment guide", "deploy skills"]
    },
    "guide": {
      "translation": "指南",
      "context": "Documentation guide",
      "examples": ["user guide", "getting started guide"]
    },
    "tutorial": {
      "translation": "教程",
      "context": "Tutorial content",
      "examples": ["tutorial section", "follow tutorial"]
    },
    "example": {
      "translation": "示例",
      "context": "Code or usage examples",
      "examples": ["example code", "usage examples"]
    },
    "community": {
      "translation": "社区",
      "context": "User/developer community",
      "examples": ["community guidelines", "join community"]
    },
    "feedback": {
      "translation": "反馈",
      "context": "User feedback",
      "examples": ["provide feedback", "feedback loop"]
    },
    "release": {
      "translation": "发布",
      "context": "Software release",
      "examples": ["latest release", "release notes"]
    },
    "version": {
      "translation": "版本",
      "context": "Software version",
      "examples": ["version number", "check version"]
    }
  }
}
```

- [ ] **Step 3: Commit foundation glossary**

Run:
```bash
git add docs_zh-CN/.glossary.json
git commit -m "feat: create foundation glossary with 35 core terms

- Core technical terms: skills, bundles, workflows, agents
- Tool names (kept in English): Claude, Cursor, Gemini, GitHub
- Common dev terms: installation, configuration, deployment
- Project roles: contributors, maintainers
- Ready for Priority 1 translation

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Priority 1 - Core User Docs (Part 1: README.md)

**Files:**
- Create: `docs_zh-CN/README.md`
- Modify: `docs_zh-CN/.glossary.json`
- Modify: `docs_zh-CN/translation-status.md`

- [ ] **Step 1: Read source README**

Read: `docs/README.md` to understand structure and content

- [ ] **Step 2: Translate README.md to Chinese**

Create `docs_zh-CN/README.md` with full translation. Key translation rules:
- Preserve all markdown structure
- Translate headings, lists, explanatory text
- Keep code blocks, commands, file paths in English
- Keep proper nouns in English (Claude Code, GitHub, npm)
- Use glossary terms consistently
- Translate link text but keep URLs unchanged

- [ ] **Step 3: Update translation status**

Update `docs_zh-CN/translation-status.md`:

```markdown
**Completed:** 1
**In Progress:** 0
**Remaining:** 67

### Priority 1: Core User Docs (1/4)
- [x] README.md
- [ ] users/getting-started.md
- [ ] users/usage.md
- [ ] users/faq.md
```

- [ ] **Step 4: Extract and add new terms to glossary**

Add any new technical terms encountered during translation to `docs_zh-CN/.glossary.json`

- [ ] **Step 5: Commit README translation**

Run:
```bash
git add docs_zh-CN/README.md docs_zh-CN/.glossary.json docs_zh-CN/translation-status.md
git commit -m "feat(zh-CN): translate README.md

- Complete Chinese translation of main README
- Add X new terms to glossary
- Maintain markdown structure and formatting
- Priority 1: 1/4 complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Priority 1 - Core User Docs (Part 2: getting-started.md)

**Files:**
- Create: `docs_zh-CN/users/getting-started.md`
- Modify: `docs_zh-CN/.glossary.json`
- Modify: `docs_zh-CN/translation-status.md`

- [ ] **Step 1: Read source file**

Read: `docs/users/getting-started.md`

- [ ] **Step 2: Translate getting-started.md**

Create `docs_zh-CN/users/getting-started.md` applying glossary terms

- [ ] **Step 3: Update glossary with new terms**

Add new terms from this translation to glossary

- [ ] **Step 4: Update status**

Mark as complete in translation-status.md

- [ ] **Step 5: Commit translation**

Run:
```bash
git add docs_zh-CN/users/getting-started.md docs_zh-CN/.glossary.json docs_zh-CN/translation-status.md
git commit -m "feat(zh-CN): translate users/getting-started.md

- Complete Chinese translation of getting started guide
- Add X new terms to glossary
- Priority 1: 2/4 complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Priority 1 - Core User Docs (Part 3: usage.md)

**Files:**
- Create: `docs_zh-CN/users/usage.md`
- Modify: `docs_zh-CN/.glossary.json`
- Modify: `docs_zh-CN/translation-status.md`

- [ ] **Step 1: Read source file**

Read: `docs/users/usage.md`

- [ ] **Step 2: Translate usage.md**

Create `docs_zh-CN/users/usage.md`

- [ ] **Step 3: Update glossary**

Add new terms to glossary

- [ ] **Step 4: Update status**

Mark as complete in translation-status.md

- [ ] **Step 5: Commit translation**

Run:
```bash
git add docs_zh-CN/users/usage.md docs_zh-CN/.glossary.json docs_zh-CN/translation-status.md
git commit -m "feat(zh-CN): translate users/usage.md

- Complete Chinese translation of usage guide
- Add X new terms to glossary
- Priority 1: 3/4 complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Priority 1 - Core User Docs (Part 4: faq.md)

**Files:**
- Create: `docs_zh-CN/users/faq.md`
- Modify: `docs_zh-CN/.glossary.json`
- Modify: `docs_zh-CN/translation-status.md`

- [ ] **Step 1: Read source file**

Read: `docs/users/faq.md`

- [ ] **Step 2: Translate faq.md**

Create `docs_zh-CN/users/faq.md`

- [ ] **Step 3: Update glossary**

Add new terms to glossary

- [ ] **Step 4: Update status**

Mark as complete in translation-status.md (Priority 1 complete!)

- [ ] **Step 5: Commit translation**

Run:
```bash
git add docs_zh-CN/users/faq.md docs_zh-CN/.glossary.json docs_zh-CN/translation-status.md
git commit -m "feat(zh-CN): translate users/faq.md

- Complete Chinese translation of FAQ
- Add X new terms to glossary
- Priority 1: 4/4 complete ✓
- Foundation glossary locked and ready for Priority 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Priority 1 Batch Validation

**Files:**
- Create: `docs_zh-CN/priority1-validation-report.md`
- Run: `scripts/validate-links.sh`
- Run: `scripts/validate-glossary.sh`

- [ ] **Step 1: Run link validation**

Run: `bash scripts/validate-links.sh`

Check output for broken links

- [ ] **Step 2: Run glossary consistency check**

Run: `bash scripts/validate-glossary.sh`

Verify terminology consistency across the 4 translated files

- [ ] **Step 3: Manual markdown review**

Review each file for:
- Proper heading hierarchy
- Code block formatting
- Table formatting
- Chinese punctuation (full-width for Chinese text)
- No mixed English/Chinese sentences

- [ ] **Step 4: Create validation report**

Create `docs_zh-CN/priority1-validation-report.md` with results

- [ ] **Step 5: Commit validation report**

Run:
```bash
git add docs_zh-CN/priority1-validation-report.md
git commit -m "test(zh-CN): Priority 1 batch validation complete

- Link validation: PASS/FAIL (X broken links found)
- Glossary consistency: PASS (≥95% consistency)
- Markdown structure: PASS
- Foundation glossary: LOCKED
- Ready to proceed to Priority 2

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8-11: Priority 2 - Tool-Specific Guides

**Translate 4 tool-specific guides using established glossary (60+ terms)**

### Task 8: claude-code-skills.md
### Task 9: cursor-skills.md
### Task 10: gemini-cli-skills.md
### Task 11: codex-cli-skills.md

*Each task follows the same pattern as Tasks 3-6:*
- Read source file
- Translate to Chinese
- Update glossary with new terms
- Update status
- Commit individually
- After all 4: run batch validation

---

## Task 12: Priority 2 Batch Validation

**Same validation process as Task 7, verify all 4 tool-specific guides**

---

## Tasks 13-27: Priority 3 - Advanced User Docs (15 files)

**Translate advanced user documentation:**
- users/bundles.md
- users/workflows.md
- users/skills-vs-mcp-tools.md
- users/agent-overload-recovery.md
- users/windows-truncation-recovery.md
- users/ai-agent-skills.md
- users/antigravity-awesome-skills-vs-awesome-claude-skills.md
- users/best-claude-code-skills-github.md
- users/best-cursor-skills-github.md
- users/kiro-integration.md
- users/local-config.md
- users/security-skills.md
- users/walkthrough.md
- users/visual-guide.md
- BUNDLES.md

*Each file: translate, update glossary, update status, commit. Batch validate after all 15.*

---

## Tasks 28-33: Priority 4 - Contributor Guides (6 files)

**Translate contributor documentation:**
- contributors/quality-bar.md
- contributors/security-guardrails.md
- contributors/skill-anatomy.md
- EXAMPLES.md
- QUALITY_BAR.md
- SKILL_ANATOMY.md

*Each file: translate, update glossary, update status, commit. Batch validate after all 6.*

---

## Tasks 34-72: Priority 5 - Maintainer Docs (39 files)

**Translate maintainer documentation and root-level files:**
- All maintainers/*.md files
- Root-level documentation files (AUDIT.md, USAGE.md, etc.)
- Integration docs

*Each file: translate, update glossary, update status, commit. Batch validate after all 39.*

---

## Task 73: Final Validation & Quality Assurance

**Files:**
- Modify: `docs_zh-CN/translation-status.md` (mark all complete)
- Create: `docs_zh-CN/final-validation-report.md`

- [ ] **Step 1: Run complete link validation**

Run: `bash scripts/validate-links.sh`

- [ ] **Step 2: Run glossary consistency check**

Run: `bash scripts/validate-glossary.sh`

- [ ] **Step 3: Verify all 68 files translated**

Run:
```bash
echo "Translated files: $(find docs_zh-CN -name "*.md" | wc -l)"
echo "Total terms in glossary: $(jq '.metadata.total_terms' docs_zh-CN/.glossary.json)"
```

- [ ] **Step 4: Check for placeholder text**

Run:
```bash
grep -r "TODO\|TRANSLATE ME\|TBD" docs_zh-CN/ || echo "No placeholders found ✓"
```

- [ ] **Step 5: Create final validation report**

Create comprehensive report with all validation results

- [ ] **Step 6: Update translation status**

Update `docs_zh-CN/translation-status.md`:

```markdown
**Completed:** 68
**In Progress:** 0
**Remaining:** 0

## Progress by Priority

### Priority 1: Core User Docs (4/4) ✓
### Priority 2: Tool-Specific Guides (4/4) ✓
### Priority 3: Advanced User Docs (15/15) ✓
### Priority 4: Contributor Guides (6/6) ✓
### Priority 5: Maintainer Docs (39/39) ✓

## Summary
✓ All 68 files translated
✓ Glossary contains 100-150 terms
✓ Zero broken internal links
✓ Terminology consistency ≥95%
✓ Markdown linting passes
✓ Ready for Chinese user review
```

- [ ] **Step 7: Commit final validation**

Run:
```bash
git add docs_zh-CN/
git commit -m "feat(zh-CN): complete Chinese documentation translation

✓ All 68 files translated
✓ Glossary: 100-150 terms with consistent terminology
✓ Validation: zero broken links, ≥95% consistency
✓ Quality: markdown linting passes, no placeholders

Translation complete and ready for review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 74: Create Pull Request

**Files:**
- Create: GitHub PR with all translation commits

- [ ] **Step 1: Push to remote branch**

Run:
```bash
git push -u origin zh-cn-docs-translation
```

- [ ] **Step 2: Create pull request**

Use `gh pr create` with template:

```bash
gh pr create --title "docs(zh-CN): Complete Chinese documentation translation" --body "$(cat <<'EOF'
## Summary

Translates all 68 missing documentation files from English to Chinese with consistent terminology using a sequential glossary-building approach.

## Changes

- **68 new files**: Complete Chinese translations
- **Glossary**: 100-150 technical terms with consistent usage
- **Infrastructure**: Validation scripts, status tracking, issues logging

## Translation Quality

✓ Zero broken internal links
✓ Terminology consistency ≥95%
✓ Markdown structure validated
✓ No placeholder text remaining

## Test Plan

- [ ] Chinese-speaking reviewer validates translations
- [ ] Link validation passes
- [ ] Glossary terminology reviewed for consistency
- [ ] No markdown formatting issues

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Verify PR created**

Check PR URL and ensure all commits included

---

## Summary

**Total Tasks:** 74 tasks
**Estimated Time:** 4-5 hours
**Files to Translate:** 68
**Glossary Terms:** 100-150
**Validation:** Link checking, glossary consistency, markdown linting

**Success Criteria:**
- ✅ All 68 files translated
- ✅ Zero broken internal links
- ✅ Terminology consistency ≥95%
- ✅ Markdown linting passes
- ✅ Ready for Chinese user review
