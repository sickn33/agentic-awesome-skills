# Quota Reference Card

Quick reference for estimating and managing quota in every mission.

---

## Sprint vs Weekly Limits

| Limit | Size | Resets |
|-------|------|--------|
| Sprint limit | 250 units | Every 5 hours |
| Weekly baseline | 2,800 units | Once per week (hard cap) |

The 5-hour refresh only refills the sprint — NOT the weekly baseline.

---

## Estimated Cost Per Event

| Action | Approx Units |
|--------|-------------|
| Spawning 1 agent | 1–2 |
| Reading 1 file (small) | 1 |
| Reading 1 file (large, e.g. 500+ lines) | 3–5 |
| Writing/editing 1 file | 2–4 |
| Terminal command | 2–3 |
| Browser subagent session | 15–30 |
| Enabling thinking/reasoning mode | 10–20 extra |
| Re-running a failed agent | same as original |

---

## Model Multipliers (relative cost)

| Model | Cost Multiplier |
|-------|----------------|
| Gemini Flash | 1x (baseline) |
| Claude Sonnet | ~4x |
| Claude Opus | ~8x (avoid in subagents) |

---

## Mission Size Guide

| Mission Size | Agents | Est. Sprint % | Safe? |
|-------------|--------|---------------|-------|
| Tiny (1 file fix) | 1 Flash | < 5% | Always |
| Small (1 feature) | 2–3 Flash | 15–25% | Yes |
| Medium (full flow) | 3–4 Mixed | 30–45% | Yes |
| Large (whole module) | 5+ Mixed | 50–70% | Careful |
| XL (full app build) | 6+ | 70–100% | Split across days |

---

## Quota Saving Moves

1. **`.antigravityignore`** → biggest single saving. Do this first always.
2. **New conversation per mission** → prevents history bloat eating tokens.
3. **Spec-first parallelism** → agents run at same time instead of waiting in sequence.
4. **Flash for repairs** → never use Sonnet to fix a small bug.
5. **Skip browser agent** → unless the task literally requires a live webpage.
6. **Sideload AI Studio key** → free Gemini quota when weekly limit hits.

---

## Sideload Free Quota (when you hit the wall)

1. Go to https://aistudio.google.com
2. Create a free API key (Gemini Flash, free tier)
3. In Antigravity → Settings → Models → Paste API key
4. Now running on your own separate quota pool

Works great for continuation after weekly baseline runs out.
