# Chinese Documentation Translation Design

**Date:** 2026-03-27
**Status:** Approved
**Author:** Design generated through brainstorming process
**Type:** Documentation infrastructure

## Overview

Update `docs_zh-CN/` to achieve full parity with English `docs/` by translating ~50 missing files using a sequential glossary-building approach that ensures terminology consistency across all documentation.

## Problem Statement

The Chinese documentation (`docs_zh-CN/`) is missing approximately 50+ files that exist in the English version (`docs/`), including:
- Critical user-facing guides (tool-specific skills, troubleshooting)
- Contributor documentation (quality standards, security guidelines)
- Maintainer documentation (update guides, release processes)
- Root-level documentation files

This gap prevents Chinese users from accessing complete documentation and creates an inconsistent experience between English and Chinese audiences.

## Goals

1. **Achieve documentation parity:** Translate all 50+ missing files
2. **Ensure terminology consistency:** Build and maintain a glossary of technical terms
3. **Maintain quality standards:** Validate links, formatting, and content
4. **Create maintainable process:** Establish workflow for future translations

## Architecture

### Workflow Phases

1. **Glossary Foundation** - Translate high-priority user docs, extract consistent terminology
2. **Sequential Translation** - Process remaining files using established glossary
3. **Validation** - Link checking, markdown linting, terminology consistency verification
4. **Integration** - Commit structure, generate translation status report

### File Processing Order

Files are processed in dependency order to ensure the most important documentation sets the terminology foundation:

```
Priority 1: Core User Docs (sets terminology foundation)
  → README.md, getting-started.md, usage.md, faq.md

Priority 2: Tool-Specific Guides (uses established terminology)
  → claude-code-skills.md, cursor-skills.md, gemini-cli-skills.md, codex-cli-skills.md

Priority 3: Advanced User Docs
  → bundles.md, workflows.md, skills-vs-mcp-tools.md, agent-overload-recovery.md

Priority 4: Contributor Guides
  → contributors/quality-bar.md, contributors/security-guardrails.md

Priority 5: Maintainer Docs
  → maintainers/skills-update-guide.md, maintainers/repo-growth-seo.md
```

### Key Design Decisions

- **Sequential processing:** Files translated in dependency order (user-facing first)
- **English preservation:** Technical terms in English stay in English (e.g., "Claude Code", not "克劳德代码")
- **Glossary evolution:** Starts with ~20 core terms, grows to ~100+ terms through translation process
- **Incremental validation:** Each batch validated before proceeding to next

## Components

### 1. Glossary Manager

**Purpose:** Central terminology database for consistent translations

**Structure:** JSON file at `docs_zh-CN/.glossary.json`

```json
{
  "skills": {
    "translation": "技能",
    "context": "Core concept - AI assistant capabilities",
    "examples": ["use skills", "skill library"]
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
  }
}
```

**Evolution:**
- Foundation: ~20 core terms
- After Priority 1: ~60 terms
- After Priority 2-3: ~100 terms
- Final: ~100-150 terms covering all domains

### 2. Translation Engine

**Input:** English markdown file + current glossary

**Process:**
1. Parse markdown structure (preserve headers, code blocks, links)
2. Extract translatable content
3. Apply glossary substitutions
4. Translate content sections
5. Reassemble with original formatting

**Output:** Chinese markdown file with consistent terminology

### 3. Link Validator

**Checks:**
- Internal links (`.md`)
- External links (http/https)

**Rules:**
- Internal English links → Chinese equivalents (e.g., `../usage.md` → `../usage.md`)
- Keep external links unchanged
- Flag broken internal links for manual review

### 4. Quality Validator

**Checks:**
- Markdown linting: Format consistency
- Terminology consistency: Verify glossary terms used uniformly
- Placeholder verification: Ensure no `[TRANSLATE ME]` or similar placeholders remain

**Data Flow:**
```
English File → Glossary Lookup → Translation → Glossary Update → Validation → Chinese File
                        ↓
                  Extract new terms
                  Add to glossary
```

## Glossary Building Process

### Phase 1: Foundation Glossary (Priority 1 Files)

**1. Pre-translation Analysis**
- Scan `README.md`, `getting-started.md`, `usage.md`, `faq.md`
- Extract recurring technical terms (frequency analysis)
- Identify brand names that stay in English (Claude Code, Cursor, GitHub, etc.)
- Create initial glossary with ~30-40 core terms

**2. First Translation Pass**
- Translate the 4 Priority 1 files using initial glossary
- Track new terms encountered during translation
- Document ambiguous terms (e.g., "skills" = 技能 vs 技巧)
- Expand glossary to ~60 terms

**3. Glossary Refinement**
- Review terminology consistency across the 4 files
- Resolve conflicts (choose one translation per term)
- Add context notes for ambiguous terms
- Lock foundation glossary

**Example Glossary Evolution:**
```
Initial: {skills, installation, repository}
→ After translation: {skills, installation, repository, bundles, workflows,
                     contributors, maintainers, cli, agent, mcp, ...}
→ Refined: Add context notes for ambiguous terms
```

### Phase 2: Sequential Expansion

- Each new translation adds 5-10 terms to glossary
- Weekly glossary checkpoints ensure consistency
- Final glossary: ~100-150 terms covering all domains

## Translation Process

### Per-File Translation Pipeline

**1. File Analysis** (~1-2 minutes per file)
- Extract headings, code blocks, links, tables
- Identify translatable vs. non-translatable sections
- Check file dependencies (links to other docs)
- Estimate glossary term usage

**2. Translation Execution** (~3-5 minutes per file)
- Preserve markdown structure exactly
- Apply glossary substitutions first
- Translate content section by section
- Keep code blocks, commands, file paths in English
- Handle special cases:
  - Image alt text: translate
  - Code comments: translate if explanatory
  - Inline code: keep in English
  - URLs: keep unchanged

**3. Link Processing**
- Internal English links → Chinese equivalents
- Links to non-translated files → flag for later
- External links → unchanged
- Update table of contents if present

**4. Glossary Update**
- Extract new technical terms
- Check for terminology conflicts
- Add new terms with context
- Version the glossary update

### Translation Rules

**Translate:**
- ✅ Explanatory text, headers, lists, prose
- ✅ User-facing comments in code examples
- ✅ Image alt text

**Don't translate:**
- ❌ Code blocks and inline code
- ❌ Commands and file paths
- ❌ URLs and links
- ❌ Proper nouns (Claude, GitHub, npm)

**Context-dependent:**
- 🔧 UI elements (keep quotes if original has them)
- 🔧 Technical comments in code

### Batch Processing

- Process files in priority order
- After each batch, run validation
- Commit batch before starting next (checkpoint system)
- Track progress in `translation-status.md`

## Validation & Quality Assurance

### Standard Validation Checklist (Per File)

**1. Link Verification**
- ✅ All internal links point to existing files
- ✅ External links are valid (HTTP 200)
- ✅ Anchor links (`#heading`) work correctly
- ⚠️ Flag links to non-translated files

**2. Markdown Structure**
- ✅ Valid markdown syntax
- ✅ Proper heading hierarchy (H1 → H2 → H3)
- ✅ Code blocks properly fenced
- ✅ Tables formatted correctly
- ✅ No broken list formatting

**3. Content Quality**
- ✅ No placeholder text (`[TODO]`, `[TRANSLATE ME]`)
- ✅ Consistent terminology (matches glossary)
- ✅ Proper Chinese punctuation (full-width for Chinese text)
- ✅ No mixed English/Chinese sentences unless necessary

**4. Formatting Consistency**
- ✅ Code blocks use correct language tags
- ✅ Spacing around Chinese/English boundaries
- ✅ Bullet/numbered list formatting matches source
- ✅ Quote blocks properly formatted

### Validation Tools

- `markdownlint` for markdown structure
- Custom script for link checking
- Custom script for glossary consistency
- Manual review for ambiguous cases

### Error Handling

**Broken links** → Log to `docs_zh-CN/translation-issues.md`
**Glossary conflicts** → Manual review, update glossary
**Translation ambiguities** → Add inline comments for review

## Error Handling & Edge Cases

### Common Edge Cases

**1. Ambiguous Technical Terms**
- **Example:** "agent" = 代理 vs 智能体 vs 代理程序
- **Solution:** Context notes in glossary, choose based on domain
- **Documentation:** Add `usage_context` field to `.glossary.json`

**2. Code Comments in Examples**
- **Translatable** if explanatory (`# Set up the client`)
- **Not translatable** if technical (`// Initialize SDK`)
- **Rule:** Translate user-facing comments, keep technical comments

**3. Brand Names and Product Names**
- **Always keep in English:** Claude Code, Cursor, GitHub, npm
- **Only translate** if official Chinese name exists
- **Check:** Official docs for preferred translations

**4. Links to Non-Translated Files**
- **During transition:** Some Chinese docs link to English
- **Add indicator:** `(English)` after link
- **Track:** In `translation-status.md` for future translation

**5. Tables with Mixed Content**
- Translate column headers
- Translate cell content unless technical
- Preserve code blocks within cells

**6. Screenshots and Diagrams**
- Keep as-is (no image editing)
- Add descriptive alt text in Chinese
- Note if screenshot contains translatable UI text

### Recovery Strategy

- **Glossary conflicts** → Stop, resolve, continue
- **Broken links** → Log, flag in file, continue
- **Translation errors** → Revert file, fix, re-validate

## Deliverables

### Primary Deliverables

**1. Translated Documentation** (~50 new files in `docs_zh-CN/`)
- All missing user-facing docs
- All missing contributor docs
- All missing maintainer docs
- Proper directory structure matching `docs/`

**2. Glossary Artifact**
- `docs_zh-CN/.glossary.json` - Complete terminology database
- 100-150 terms with context notes
- Usage examples for ambiguous terms

**3. Validation Reports**
- `docs_zh-CN/translation-status.md` - Completion tracking
- `docs_zh-CN/translation-issues.md` - Known issues and edge cases
- Link validation results
- Terminology consistency report

**4. Integration Artifacts**
- Git commits organized by priority batch
- Commit messages following project conventions
- Pull request ready for review

### Estimated Timeline

- **Glossary Foundation:** 45-60 minutes
- **Translation Batches:** 2-3 hours (50 files ÷ ~3-4 min/file)
- **Validation & Fixes:** 30-45 minutes
- **Final Review & Integration:** 30 minutes
- **Total:** ~4-5 hours

## Success Criteria

- ✅ All 50+ missing files translated
- ✅ Zero broken internal links
- ✅ Terminology consistency ≥95%
- ✅ Markdown linting passes
- ✅ Ready for Chinese user review

## Future Considerations

**Maintenance:**
- Glossary should be updated as new English docs are added
- Consider automated translation suggestions for future updates
- Periodic review of glossary for terminology updates

**Automation:**
- Potential for CI integration to check translation completeness
- Automated glossary consistency checks
- Link validation in CI pipeline

**Community:**
- Consider process for community-contributed translations
- Review workflow for suggested glossary improvements
- Translation memory database for reusable segments
