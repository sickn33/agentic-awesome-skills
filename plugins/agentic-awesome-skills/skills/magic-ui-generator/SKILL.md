---
name: magic-ui-generator
description: Utilizes Magic by 21st.dev to generate, compare, and integrate multiple production-ready UI component variations.
risk: safe
source: community
date_added: "2026-03-07"
---

# Magic UI Generator

Leverage [Magic by 21st.dev](https://21st.dev/magic) to build modern, responsive UI components using an AI-native workflow that prioritizes choice and design excellence.

## Context

This skill leverages Magic by 21st.dev to build modern, responsive UI components. Instead of generating a single standard solution, it focuses on providing multiple design variations to choose from, drawing inspiration from a curated library of real-world components and premium design patterns (Shadcn UI, Magic UI, Aceternity, etc.).

## When to Use
Trigger this skill whenever:

- A new UI component is requested (e.g., pricing tables, contact forms, hero sections).
- Enhancing an existing UI element with animations, better styling, or advanced features.
- Brainstorming different design directions for a specific feature.
- Professional logos or icons are needed (via the built-in [SVGL](https://svgl.app/) integration).

## Execution Workflow

1. **Analyze Requirements**: Review the component description. Ensure the target output aligns with the project's stack (e.g., Next.js, TypeScript, Tailwind CSS). Define clear constraints for accessibility and responsiveness.
2. **Generate Variations**: Use Magic only if a compatible tool or browser is actually available and the user approves external processing. Otherwise produce local variations from project primitives.
   - **Pro Tip**: Use descriptive prompts pushing for modern aesthetics: "avant-garde SaaS pricing table with glassmorphism and animated borders" or "highly immersive contact form with dynamic floating labels."
3. **Present Options**: Briefly describe the generated variations side-by-side. Highlight stylistic differences, layout approaches, and premium features (sticky headers, hover animations, etc.).
4. **Integrate Selection**: Once a favorite variation is chosen:
   - Integrate the fully functional, production-ready TypeScript code.
   - Reuse existing dependencies; obtain approval before changing the dependency graph.
   - Handle proper props, types, and responsive behaviors.

## Strict Rules

- **Project Fit First**: Follow the requested design direction and existing design system; external generation is optional.
- **Choice First**: Always offer multiple premium design variations before writing the final code to the project.
- **Clean Code**: Ensure all generated code is clean TypeScript, accessible, and responsive.
- **Review Before Use**: Inspect generated code for accessibility, security, licenses, provenance, dependency risk, and compatibility before integration.
- **Approval Boundary**: Do not upload private designs, install packages, or write generated code into the project without the relevant user approval.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
