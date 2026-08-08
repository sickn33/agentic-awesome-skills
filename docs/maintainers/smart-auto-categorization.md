# Smart Auto-Categorization Guide

## Overview

The skill collection now uses intelligent auto-categorization to eliminate "uncategorized" and organize skills into meaningful categories based on their content.

## Current Status

✅ Current repository indexed through the generated catalog
- Most skills are in meaningful categories
- A smaller tail still needs manual review or better keyword coverage
- `skills_index.json` is the source of truth for current category labels and counts
- Category filters should be derived from the generated index at build time

## Category Distribution

Do not copy fixed counts into user-facing docs. To inspect the current distribution, generate it from the index:

```bash
node - <<'NODE'
const fs = require('fs');
const skills = JSON.parse(fs.readFileSync('skills_index.json', 'utf8'));
const counts = new Map();
for (const skill of skills) {
  const category = skill.category || 'uncategorized';
  counts.set(category, (counts.get(category) || 0) + 1);
}
console.log(`skills=${skills.length} categories=${counts.size}`);
for (const [category, count] of [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`${category}: ${count}`);
}
NODE
```

## How It Works

### 1. **Keyword-Based Analysis**
The system analyzes skill names and descriptions for keywords:
- **Backend**: nodejs, express, fastapi, django, server, api, database
- **Web Dev**: react, vue, angular, frontend, css, html, tailwind
- **AI/ML**: ai, machine learning, tensorflow, nlp, gpt
- **DevOps**: docker, kubernetes, ci/cd, deploy
- And more...

### 2. **Priority System**
Frontmatter category > Detected Keywords > Fallback (uncategorized)

If a skill already has a category in frontmatter, that's preserved.

### 3. **Scope-Based Matching**
- Exact phrase matches weighted 2x higher than partial matches
- Uses word boundaries to avoid false positives

## Using the Auto-Categorization

### Run on Uncategorized Skills
```bash
python tools/scripts/auto_categorize_skills.py
```

### Preview Changes First (Dry Run)
```bash
python tools/scripts/auto_categorize_skills.py --dry-run
```

### Output
```
======================================================================
AUTO-CATEGORIZATION REPORT
======================================================================

Summary:
   ✅ Categorized: 776
   ⏭️  Already categorized: 46
   ❌ Failed to categorize: 124
   📈 Total processed: full repository

Sample changes:
   • 3d-web-experience
     uncategorized → web-development
   • ab-test-setup
     uncategorized → testing
   • agent-framework-azure-ai-py
     uncategorized → backend
```

## Web App Improvements

### Category Filter
**Before:**
- Unordered list including "uncategorized"
- No indication of category size

**After:**
- Categories sorted by skill count (most first, "uncategorized" last)
- Shows counts from the generated index instead of hard-coded documentation numbers
- Much easier to browse

### Example Dropdowns

**Sorted Order:**
1. All Categories
2. Highest-count generated category
3. Next generated category
4. ... more generated categories ...
5. Uncategorized, if present, at the end

## For Skill Creators

### When Adding a New Skill

Include category in frontmatter:
```yaml
---
name: my-skill
description: "..."
category: web-development
date_added: "2026-03-06"
---
```

### If You're Not Sure

The system will automatically categorize on next index regeneration:
```bash
python tools/scripts/generate_index.py
```

## Keyword Reference

Available auto-categorization keywords by category:

**Backend**: nodejs, node.js, express, fastapi, django, flask, spring, java, python, golang, rust, server, api, rest, graphql, database, sql, mongodb

**Web Development**: react, vue, angular, html, css, javascript, typescript, frontend, tailwind, bootstrap, webpack, vite, pwa, responsive, seo

**Database**: database, sql, postgres, mysql, mongodb, firestore, redis, orm, schema

**AI/ML**: ai, machine learning, ml, tensorflow, pytorch, nlp, llm, gpt, transformer, embedding, training

**DevOps**: docker, kubernetes, ci/cd, git, jenkins, terraform, ansible, deploy, container, monitoring

**Cloud**: aws, azure, gcp, serverless, lambda, storage, cdn

**Security**: encryption, cryptography, jwt, oauth, authentication, authorization, vulnerability

**Testing**: test, jest, mocha, pytest, cypress, selenium, unit test, e2e

**Mobile**: mobile, react native, flutter, ios, android, swift, kotlin

**Automation**: automation, workflow, scripting, robot, trigger, integration

**Game Development**: game, unity, unreal, godot, threejs, 2d, 3d, physics

**Data Science**: data, analytics, pandas, numpy, statistics, visualization

## Customization

### Add Custom Keywords

Edit [`tools/scripts/auto_categorize_skills.py`](../../tools/scripts/auto_categorize_skills.py):

```python
CATEGORY_KEYWORDS = {
    'your-category': [
        'keyword1', 'keyword2', 'exact phrase', 'another-keyword'
    ],
    # ... other categories
}
```

Then re-run:
```bash
python tools/scripts/auto_categorize_skills.py
python tools/scripts/generate_index.py
```

## Troubleshooting

### "Failed to categorize" Skills

Some skills may be too generic or unique. You can:

1. **Manually set category** in the skill's frontmatter:
```yaml
category: your-chosen-category
```

2. **Add keywords** to CATEGORY_KEYWORDS config

3. **Move to folder** if it fits a broader category:
```
skills/backend/my-new-skill/SKILL.md
```

### Regenerating Index

After making changes to SKILL.md files:
```bash
python tools/scripts/generate_index.py
```

This will:
- Parse frontmatter categories
- Fallback to folder structure
- Generate new skills_index.json
- Copy to apps/web-app/public/skills.json

## Next Steps

1. **Test in web app**: Try the improved category filter
2. **Add missing keywords**: If certain skills are still uncategorized
3. **Organize remaining uncategorized skills**: Either auto-assign or manually review
4. **Monitor growth**: Use reports to track new vs categorized skills

---

**Result**: Much cleaner category filter with smart, meaningful organization! 🎉
