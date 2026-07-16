---
name: keyword-extractor
description: >
  Extracts up to 50 highly relevant SEO keywords from text. Use when user wants to generate or extract keywords for given text.
risk: safe
source: original
date_added: "2026-03-11"
---

# Keyword Extractor

Extracts **max 50 relevant keywords** from text and formats them in a strict machine-ready structure.

---

## QUICK START

Jump to any section:
1. [CORE MANDATE](#core-mandate) – Output rules and formatting 
2. [WHEN TO USE](#when-to-use) – Trigger conditions for this skill 
3. [KEYWORD QUALITY RULES](#keyword-quality-rules) – Priorities and forbidden keywords 
4. [WORKFLOW](#workflow) – Step-by-step generation and processing 
5. [FAILURE HANDLING](#failure-handling) – Short text or edge cases 

---

# CORE MANDATE

Return **exactly one comma-separated line** of keywords, following these rules:
- max 50 keywords  
- ordered by relevance  
- all lowercase  
- no duplicates or near-duplicates  
- mix of single words and 2–4 word phrases  
- no numbering, bullets, explanations, or trailing period

---

## When to Use
Use this skill when the user wants to generate or extract **SEO-friendly keywords or tags** from text including:
- Extracting keywords or tags for any given text or paragraph  
- Creating **comma-separated keywords or tags** suitable for SEO, search, or metadata  
- Generating topic-specific keywords or tags based on the content’s main subjects and concepts  

This skill should be triggered for **all text-based keyword extraction requests**, regardless of phrasing, as long as the goal is SEO, tagging, or metadata generation.

Do NOT trigger this skill for:  
- Summaries or paraphrasing requests  
- Text analysis without keyword generation

---

# KEYWORD QUALITY RULES

Prefer noun phrases over verbs or adjectives.
Prefer keywords useful for:
- SEO and search
- tagging
- metadata

Prioritize:
- domain terminology
- meaningful nouns
- search phrases
- entities
- technical concepts

Avoid weak keywords like:
- things and various topics
- general concepts
- important ideas
- methods

**IMPORTANT: Each keyword must strictly represent a phrase that a user would type into a search engine**

---

# WORKFLOW

## Step 1 — Analyze

Identify:
- main subject
- key topics
- domain terminology
- entities
- concepts

Ignore filler words.

---

## Step 2 — Generate Keywords

Generate up to 50 strictly SEO-friendly keywords directly from the text.

Include:
- core topics
- domain terminology
- related concepts
- common search queries

Allowed formats:
- single words
- 2 word phrases
- 3 word phrases
- 4 word phrases

Example:
```machine learning, neural networks, deep learning models, ai algorithms, data science tools```

Avoid vague keywords, filler phrases, adjectives without nouns like:
```important methods, different ideas, various techniques, things```

Keywords must not exceed 4 words.

---

## Step 3 — Rank

Order keywords by SEO importance using these signals:
1. main topic of the text
2. high-value domain terminology
3. technologies, tools, or entities mentioned
4. common search queries related to the topic
5. supporting contextual topics

Most important keywords should always appear first.

---

## Step 4 — Normalize

Ensure:
- lowercase, comma separated, no duplicates
- ≤50 keywords
- Remove near-duplicate keywords that represent the same concept.
- Keep only the most common search phrase.
- If two keywords represent the same concept, keep only the more common search phrase.

---

## Step 5 — Validate

Before returning output ensure:
- keyword_count <= 50
- no duplicates and near-duplicates
- all lowercase and comma separated
- no trailing period
- each keyword is a clear searchable topic
- keywords do not exceed 4 words

If any rule fails regenerate the list.

---

# FAILURE HANDLING

If text is very short, infer likely topics and still generate keywords. Never exceed 50 keywords.

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
