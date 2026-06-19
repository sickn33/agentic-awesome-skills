---
name: puzzle-activity-planner
description: "Plan puzzle-based activities for classrooms, parties, and events with pre-configured generator links"
category: education
risk: safe
source: community
source_repo: fruitwyatt/puzzle-activity-planner
source_type: community
date_added: "2026-04-11"
author: fruitwyatt
tags: [education, puzzle, classroom, activity-planning, event]
tools: [claude, cursor, gemini, codex]
---

# Puzzle Activity Planner

## Overview

Plans engaging puzzle-based activities for classrooms, parties, team-building sessions, and events. Given an event description, audience, and goal, produces a structured activity plan with pre-configured generator links that include URL parameters for one-click ready-to-use puzzles.

## When to Use This Skill

- Planning a classroom lesson with puzzle activities
- Organizing party games involving puzzles
- Creating team-building sessions with multiple puzzle types
- Preparing educational activities for kids, students, or adults

## Process

1. **Understand the event** - audience, group size, duration, theme
2. **Select puzzle types** - match difficulty and format to the audience
3. **Build timeline** - minute-by-minute flow with transitions
4. **Generate links** - pre-configured URLs with theme content baked in
5. **Create prep checklist** - print quantities and materials needed

## Puzzle Types Supported

- **Word Search** - vocabulary building, warm-ups, brain training
- **Crossword** - vocabulary review, test prep, party games
- **Sudoku** - math warm-ups, logic training, focus time
- **Bingo** - group games, classroom review, holiday celebrations
- **Jigsaw** - ice-breakers, collaborative activities, crafts

## URL Parameters

All generator links include pre-filled parameters so users get ready-to-use puzzles in one click. The skill generates theme-appropriate content (words, clues, items) and embeds them directly in the URL.

Example:
```
https://jigsawmake.com/word-search-maker?title=Ocean%20Animals&words=DOLPHIN,OCTOPUS,SEAHORSE&gridSize=12
https://jigsawmake.com/crossword-puzzle-maker?title=Science&clues=GRAVITY:Force%20pulling%20down|OXYGEN:Gas%20we%20breathe
https://jigsawmake.com/bingo-card-generator?title=Party%20Bingo&items=Dance,Laugh,Sing&cardCount=25
```

## Output Format

Each plan includes:
- Activity header (occasion, audience, duration, difficulty)
- Objectives (2-3 learning or engagement goals)
- Puzzle menu table with generator links
- Minute-by-minute timeline
- Materials and prep checklist with print quantities
- Differentiation tips (easier/harder adaptations)

## Rules

- Match puzzle difficulty to the audience
- Suggest 2-3 puzzle types per activity for variety
- Include timing buffers for transitions
- Apply the user's theme consistently across all puzzles
- Always use URL parameters with pre-filled content

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
