---
name: web-project-brainstorming
description: Masterclass framework for brainstorming web development projects and page designs. Outlines structural phases for concept, UX flow, styling aesthetics, technical architecture, and SEO.
category: consulting
risk: safe
source: self
source_type: self
date_added: "2026-06-26"
author: Rsmiyani
tags: [brainstorming, project-planning, web-development, product-scoping, design-system, architecture]
tools: [claude, cursor, gemini]
---

# Web Project Brainstorming

## Overview

This skill provides a structured, masterclass-level framework for brainstorming web projects, web applications, or individual page designs at their inception. It guides developers and designers through scoping the core product concept, mapping user flows, defining visual styling aesthetics, selecting the technical stack, and planning for search engine optimization (SEO) and performance.

## When to Use This Skill

- Use at the start of any new web development project or page redesign.
- Use when scoping feature sets, user roles, and interaction patterns for web applications.
- Use when establishing design systems, color tokens, and layout guidelines.
- Use when evaluating tech stacks (e.g., Next.js vs. Vanilla JS, CSS Grid vs. Tailwind).

## How It Works

Execute web project brainstorming sequentially across six structured phases. Ask the user questions one phase at a time to maintain focus and ensure thorough alignment.

### Phase 1: Core Concept & Scoping
Define the product's primary value proposition and scope:
- **Target Audience**: Who is using the website or application?
- **Core Value**: What problem does it solve for users?
- **Key Features**: What are the top 3–5 mandatory features?

### Phase 2: User Experience (UX) & Information Architecture
Map how users navigate and interact:
- **Page Hierarchy**: What is the sitemap and page structure?
- **User Journeys**: What step-by-step flows do users take to complete key goals?
- **Responsive Layout**: Is the interface mobile-first, desktop-first, or balanced?

### Phase 3: Visual Styling & Design System
Establish the visual guidelines and aesthetic parameters:
- **Design Aesthetic**: Modern, minimalist, brutalist, glassmorphism, or luxury?
- **Color Palette**: What are the primary, secondary, and accent colors? (Prefer tailorable HSL/RGB models over static color keywords).
- **Typography**: Which Google Fonts or system fonts fit the theme? (e.g., Inter, Outfit, Syne).
- **Interactive States**: How do hovers, clicks, transitions, and loading states behave?

### Phase 4: Technical Stack & Architecture
Select the technologies and integration systems:
- **Frontend Framework**: React, Next.js, Vite, Astro, Svelte, or Vanilla HTML/JS?
- **Styling Method**: Vanilla CSS, Tailwind CSS, or CSS Modules?
- **Data & Backend**: REST API, GraphQL, tRPC, Firebase, Supabase, or SQLite?
- **State Management**: Zustand, Context API, Redux, or local React state?

### Phase 5: SEO, Accessibility (A11y), and Performance
Plan for discoverability and fast loading times:
- **SEO Elements**: Title tag structure, meta descriptions, and semantic HTML tag hierarchy.
- **Accessibility**: ARIA labels, semantic tags, keyboard navigation, and color contrast.
- **Performance**: Preloading assets, lazy loading images, server-side rendering (SSR), and CDN delivery.

### Phase 6: MVP Scope & Project Phases
Break the work down into manageable increments:
- **Phase 1 (MVP)**: The absolute minimum viable product needed to deploy.
- **Phase 2 (Enhancements)**: Nice-to-have features, micro-animations, and advanced integrations.

## Examples

### Interactive Questionnaire Prompt Template
Use this prompt layout when initiating a brainstorming session with a client or team member:

```markdown
👋 Let's brainstorm your new web project! We will walk through 6 quick phases.

---
### Phase 1: Core Concept & Scoping
1. What is the main title or working name of this project?
2. Who are the primary target users (e.g., tech-savvy professionals, shoppers, children)?
3. What are the 3 core tasks a user must be able to perform?
---
```

### Brainstorming Output Document Template
Once all phases are complete, generate a markdown blueprint for the project using this template:

```markdown
# Project Blueprint: [Project Name]

## 1. Product Concept
- **Value Proposition**: [Summary]
- **Key Features**:
  1. [Feature 1]
  2. [Feature 2]

## 2. Information Architecture & UX
- **Pages**: `/index.html`, `/dashboard.html`
- **Primary User Flow**: User signs up -> completes onboarding -> views dashboard.

## 3. Styling & Aesthetics
- **Aesthetic**: Sleek Glassmorphism Dark Mode
- **Color Tokens**:
  - Background: `hsl(222, 47%, 11%)`
  - Accent/Primary: `hsl(217, 91%, 60%)`
- **Typography**: Inter (Body), Outfit (Headings)

## 4. Technical Architecture
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM

## 5. SEO & Performance
- **Primary Title**: "[Brand] | [Tagline]"
- **Performance Strategy**: Dynamic image optimization, caching pages via Cloudflare.

## 6. MVP vs Phase 2 Roadmap
- **MVP**: Authentication + core dashboard view.
- **Phase 2**: Real-time notifications and PDF reporting.
```

## Best Practices

- ✅ Ask questions incrementally—never dump all six phases in a single response to avoid cognitive overload.
- ✅ Propose logical defaults (e.g., recommending responsive Tailwind/CSS Grid and standard semantic HTML) if the user is unsure.
- ✅ Ensure semantic HTML layout hierarchy (one `<h1>` per page, sequential `<section>`, `<article>`, `<header>`, `<footer>` elements) is planned from the start.
- ✅ Document explicit non-goals to prevent feature creep.

## Limitations

- This skill focuses on conceptual mapping, architecture, and feature planning; it does not replace the writing of implementation code or system configuration.
- Brainstorming outcomes should be treated as flexible blueprints and refined as technical constraints are discovered during development.

## Security & Safety Notes

- During Phase 4 (Architecture), flag any security requirements (e.g., SSL certificates, CORS policies, secure authentication storage, environment variables protection) early.
- Do not store actual API tokens, passwords, or credentials in design or blueprint documents.

## Common Pitfalls

- **Problem**: Scope Creep (the project expands too quickly before building an MVP).
  **Solution**: Enforce Phase 6 strictly. Push nice-to-have features into Phase 2.
- **Problem**: Ignoring mobile design until late in development.
  **Solution**: Brainstorm responsive patterns in Phase 2 before deciding on layout style in Phase 3.

## Related Skills

- `@writing-plans` - Organizing structural step-by-step engineering plans.
- `@architecture-decision-records` - Documenting architectural decisions.
- `@ux-flow` - Designing deep user experience flows and interaction details.
