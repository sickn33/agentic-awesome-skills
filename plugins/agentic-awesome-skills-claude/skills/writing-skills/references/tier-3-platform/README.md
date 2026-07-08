---
description: When to use Tier 3 (Platform) skill architecture for large platforms.
metadata:
  tags: [tier-3, platform, enterprise, cloudflare-pattern]
---

# Tier 3: Platform Skills

Enterprise-grade skills for entire platforms (AWS, Cloudflare, Convex, etc).

## When to Use

- **Entire platform**: 10+ products/services
- **1000+ lines total**: Would overwhelm context if monolithic
- **Complex decision logic**: Users start with "I need X" not "I want product Y"
- **Undocumented gotchas**: Tribal knowledge is critical

## The Cloudflare Pattern

Based on `cloudflare-skill` by Dillon Mulroy.

### Structure

```
my-platform/
├── SKILL.md                  # Decision trees only
└── references/
    └── <product>/
        ├── README.md         # Overview, when to use
        ├── api.md            # Runtime API reference
        ├── configuration.md  # Config options
        ├── patterns.md       # Usage patterns
        └── gotchas.md        # Pitfalls, limits
```

### The 5-File Pattern

Each product directory has exactly 5 files:

| File | Purpose | When to Load |
|------|---------|--------------|
| `README.md` | Overview, when to use | Always first |
| `api.md` | Runtime APIs, methods | Implementing features |
| `configuration.md` | Config, environment | Setting up |
| `patterns.md` | Common workflows | Best practices |
| `gotchas.md` | Pitfalls, limits | Debugging |

## Decision Trees

The power of Tier 3 is decision trees that help the AI **choose**:

```markdown
Need to store data?
├─ Simple key-value → kv/
├─ Relational queries → d1/
├─ Large files/blobs → r2/
├─ Per-user state → durable-objects/
└─ Vector embeddings → vectorize/
```

## Slash Command Integration

Create a slash command to orchestrate:

```markdown
---
description: Load platform skill and get contextual guidance
---

## Workflow

1. Load skill: `skill({ name: 'my-platform' })`
2. Identify product from decision tree
3. Load relevant reference files based on task

| Task | Files |
|------|-------|
| New setup | README.md + configuration.md |
| Implement feature | api.md + patterns.md |
| Debug issue | gotchas.md |
```

## Progressive Disclosure in Action

- **Startup**: Only name + description (~100 tokens)
- **Activation**: SKILL.md with trees (<5000 tokens)
- **Navigation**: One product's 5 files (as needed)

Result: 60+ product references without blowing context.

## Checklist

- [ ] SKILL.md contains ONLY decision trees + index
- [ ] Each product has exactly 5 files
- [ ] Decision trees cover all "I need X" scenarios
- [ ] Cross-references stay one level deep
- [ ] Slash command created for orchestration
- [ ] Every product has `gotchas.md`
