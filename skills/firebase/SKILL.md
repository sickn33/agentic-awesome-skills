---
name: firebase
description: Firebase gives you a complete backend in minutes - auth, database,
  storage, functions, hosting. But the ease of setup hides real complexity.
  Security rules are your last line of defense, and they're often wrong.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Firebase

Firebase gives you a complete backend in minutes - auth, database, storage,
functions, hosting. But the ease of setup hides real complexity. Security rules
are your last line of defense, and they're often wrong. Firestore queries are
limited, and you learn this after you've designed your data model.

This skill covers Firebase Authentication, Firestore, Realtime Database, Cloud
Functions, Cloud Storage, and Firebase Hosting. Key insight: Firebase is
optimized for read-heavy, denormalized data. If you're thinking relationally,
you're thinking wrong.

2025 lesson: Firestore pricing can surprise you. Reads are cheap until they're
not. A poorly designed listener can cost more than a dedicated database. Plan
your data model for your query patterns, not your data relationships.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- User mentions or implies: firebase
- User mentions or implies: firestore
- User mentions or implies: firebase auth
- User mentions or implies: cloud functions
- User mentions or implies: firebase storage
- User mentions or implies: realtime database
- User mentions or implies: firebase hosting
- User mentions or implies: firebase emulator
- User mentions or implies: security rules
- User mentions or implies: firebase admin

## Example

**User request:**

> Use @firebase for this task: Firebase gives you a complete backend in minutes - auth, database, storage, functions, hosting.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
