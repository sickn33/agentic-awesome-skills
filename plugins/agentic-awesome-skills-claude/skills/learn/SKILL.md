---
name: learn
description: Help a user learn a topic through adaptive tutoring, lesson planning, practice, retrieval checks, explanations, study guides, or exercises. Use when the user asks to learn, understand, practice, drill, review, study, or be tutored on something.
category: "education"
risk: "safe"
source: "official"
source_repo: "dair-ai/dair-academy-plugins"
source_type: "official"
date_added: "2026-06-19"
author: "DAIR.AI"
license: "MIT"
license_source: "https://github.com/dair-ai/dair-academy-plugins/blob/main/README.md#license"
tags:
  - dair-academy
  - ai
  - workflow
tools:
  - claude-code
  - codex-cli
  - cursor
---

## When to Use

Use when this workflow matches the user request: Help a user learn a topic through adaptive tutoring, lesson planning, practice, retrieval checks, explanations, study guides, or exercises. Use when the user asks to learn, understand, practice, drill, review, study, or be tutored on something.


_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._Use this skill when the user wants to learn a topic or improve a skill. The output should fit the user's request and the host agent's environment. Do not assume a specific product, delivery format, persistence mechanism, or runtime unless the user asks for one.

## Core Workflow

1. Diagnose the learner's current level and goal.
2. Choose a small next learning objective.
3. Teach with concrete examples before abstractions.
4. Give the learner an active task, question, or exercise.
5. Provide immediate feedback and correction.
6. Record or summarize the next recommended step when useful.

For very small questions, answer directly and include one quick check for understanding. For larger learning requests, create a short learning path and start with the first lesson.

## Diagnostic

Before building a full plan, infer what you can from the user's prompt. Ask at most 1 to 3 short questions only when the missing information would materially change the lesson.

Useful diagnostic dimensions:

- Current familiarity
- Goal or use case
- Preferred depth
- Time available
- Format preference, if the user has one

If the user wants to begin immediately, make a reasonable assumption and state it briefly.

When the user gives a short time window, do not ask broad diagnostic questions unless essential. State one reasonable assumption and begin with the highest-leverage objective.

## Learning Design

Keep the learner in the right difficulty band:

- Beginners need simple vocabulary, worked examples, and frequent checks.
- Intermediate learners need comparison, practice, and common failure modes.
- Advanced learners need compression, edge cases, tradeoffs, and realistic tasks.

Teach one useful concept at a time. Avoid covering a whole subject in one pass unless the user explicitly asks for a survey.

Use active learning:

- Retrieval questions
- Prediction prompts
- Worked examples followed by a similar problem
- Debugging or critique tasks
- Short applied exercises
- Spaced review of earlier ideas

Make feedback specific. Explain why the right answer is right and why tempting wrong answers fail.

## Output Formats

Choose the lightest format that satisfies the request:

- Conversational lesson for quick tutoring
- Study plan for multi-session learning
- Markdown notes for durable reference
- Exercises or quizzes for practice
- Code examples for programming topics
- Diagrams or tables when they clarify relationships
- Files, notebooks, slides, or web pages only when requested or clearly useful

Do not force every learning task into an app, web page, persistent hub, or local file set.

For multi-day plans, include cadence, daily focus, active practice, and review checkpoints. If daily time is unknown and materially changes the plan, ask one question or state an assumed daily commitment.

## Lesson Structure

A strong lesson usually includes:

- A short objective
- A concrete example or scenario
- The principle behind the example
- A guided practice step
- A knowledge check
- Feedback or answer key
- A next step

Keep explanations concise. Prefer plain language over jargon, then introduce precise terms after the learner has a handle on the idea.

## Practice And Assessment

Every substantial lesson should include at least one way for the learner to test themselves.

For explicit practice requests, lead with a task before a long explanation, then provide targeted feedback or an answer key.

Good checks include:

- Multiple-choice questions with unambiguous distractors
- Short answer prompts
- Fill-in-the-blank exercises
- Explain-the-mistake questions
- Code tracing or prediction
- Mini projects with clear success criteria

For multiple-choice questions, make only one answer clearly correct unless the question explicitly asks for multiple answers.

For programming topics, avoid pretending to execute arbitrary code unless the environment actually runs it. Use real tool execution when available, or provide fixed snippets with expected outputs and reasoning.

When interactive back-and-forth is available, ask the learner to attempt the exercise before revealing the answer. For self-contained responses, include the answer key after the task.

## Adaptation

Use the learner's answers and mistakes to adjust:

- Slow down and add examples when confusion appears.
- Increase difficulty when answers are consistently correct.
- Revisit misconceptions explicitly.
- Connect new material to the learner's stated goal.

When continuing from earlier work, preserve useful context from existing notes, files, chat history, or user-provided progress. Do not assume a specific persistence mechanism.

## Quality Bar

Before finishing, check that:

- The lesson matches the learner's level and goal.
- The explanation has a concrete example.
- The practice task is solvable from the lesson.
- The answer or feedback is included when appropriate.
- The next step is clear.
- Any generated files or code are actually usable in the target environment.


## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
