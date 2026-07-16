---
name: hig-project-context
description: Create or update a shared Apple design context document that other HIG skills use to tailor guidance.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Project Context

Create and maintain `.claude/apple-design-context.md` so other HIG skills can skip redundant questions.

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Gathering Context

Before asking questions, auto-discover context from:

1. **README.md** -- Product description, platform targets
2. **Package.swift / .xcodeproj** -- Supported platforms, minimum OS versions, dependencies
3. **Info.plist** -- App category, required capabilities, supported orientations
4. **Existing code** -- Import statements reveal frameworks (SwiftUI vs UIKit, HealthKit, etc.)
5. **Assets.xcassets** -- Color assets, icon sets, dark mode variants
6. **Accessibility audit** -- Grep for accessibility modifiers/attributes

Present findings and ask the user to confirm or correct. Then gather anything still missing:

### 1. Product Overview
- What does the app do? (one sentence)
- Category (productivity, social, health, game, utility, etc.)
- Stage (concept, development, shipped, redesign)

### 2. Target Platforms
- Which Apple platforms? (iOS, iPadOS, macOS, tvOS, watchOS, visionOS)
- Minimum OS versions
- Universal or platform-specific?

### 3. Technology Stack
- UI framework: SwiftUI, UIKit, AppKit, or mixed?
- Architecture: single-window, multi-window, document-based?
- Apple technologies in use? (HealthKit, CloudKit, ARKit, etc.)

### 4. Design System
- System defaults or custom design system?
- Brand colors, fonts, icon style?
- Dark mode and Dynamic Type support status

### 5. Accessibility Requirements
- Target level (baseline, enhanced, comprehensive)
- Specific considerations (VoiceOver, Switch Control, etc.)
- Regulatory requirements (WCAG, Section 508)

### 6. User Context
- Primary personas (1-3)
- Key use cases and environments (desk, on-the-go, glanceable, immersive)
- Known pain points or design challenges

### 7. Existing Design Assets
- Figma/Sketch files?
- Apple Design Resources in use?
- Existing component library?

## Context Document Template

Generate `.claude/apple-design-context.md` using this structure:

```markdown
# Apple Design Context

## Product
- **Name**: [App name]
- **Description**: [One sentence]
- **Category**: [Category]
- **Stage**: [Concept / Development / Shipped / Redesign]

## Platforms
| Platform | Supported | Min OS | Notes |
|----------|-----------|--------|-------|
| iOS      | Yes/No    |        |       |
| iPadOS   | Yes/No    |        |       |
| macOS    | Yes/No    |        |       |
| tvOS     | Yes/No    |        |       |
| watchOS  | Yes/No    |        |       |
| visionOS | Yes/No    |        |       |

## Technology
- **UI Framework**: [SwiftUI / UIKit / AppKit / Mixed]
- **Architecture**: [Single-window / Multi-window / Document-based]
- **Apple Technologies**: [List any: HealthKit, CloudKit, ARKit, etc.]

## Design System
- **Base**: [System defaults / Custom design system]
- **Brand Colors**: [List or reference]
- **Typography**: [System fonts / Custom fonts]
- **Dark Mode**: [Supported / Not yet / N/A]
- **Dynamic Type**: [Supported / Not yet / N/A]

## Accessibility
- **Target Level**: [Baseline / Enhanced / Comprehensive]
- **Key Considerations**: [List any specific needs]

## Users
- **Primary Persona**: [Description]
- **Key Use Cases**: [List]
- **Known Challenges**: [List]
```

## Updating Context

When updating an existing context document:

1. Read the current `.claude/apple-design-context.md`
2. Ask what has changed
3. Update only the changed sections
4. Preserve all unchanged information

## Related Skills

- **hig-platforms** -- Platform-specific guidance
- **hig-foundations** -- Color, typography, layout decisions
- **hig-patterns** -- UX pattern recommendations
- **hig-components-*** -- Component recommendations
- **hig-inputs** -- Input method coverage
- **hig-technologies** -- Apple technology relevance

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
