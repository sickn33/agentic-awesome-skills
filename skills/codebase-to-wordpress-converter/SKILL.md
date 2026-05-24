---
id: 'codebase-to-wordpress-converter'
name: codebase-to-wordpress-converter
description: "Expert skill for converting any codebase (React/HTML/Next.js) into a pixel-perfect, SEO-optimized, and dynamic WordPress theme."
risk: safe
source: community
date_added: "2026-04-12"
category: cloud
tags:
- css
- frontend
- html
- react
- tailwind
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Codebase to WordPress Converter

## Overview

This skill is designed for the high-fidelity conversion of static or React-based frontends into fully functional, CMS-driven WordPress themes. It acts as a **Senior WordPress Architect**, **React Expert**, and **QA Engineer** to ensure a 100% pixel-perfect match while integrating deep WordPress functionality like ACF, dynamic menus, and technical SEO preservation.

## When to Use This Skill

- Use when converting a React (CRA/Vite/Next.js) or HTML project into a WordPress theme.
- Use when the client demands a 100% pixel-perfect match with the original source.
- Use when auditing an existing WordPress conversion for structural or SEO flaws.
- Use when you need to ensure technical SEO (Schema, Meta tags, Heading hierarchy) is preserved exactly.

## Core Capabilities

### Phased Conversion & Audit
The skill follows a strict 4-phase forensic process:
1.  **Phase 1: Forensic UI Comparison**: Side-by-side table audit of React components vs. WordPress templates to find discrepancies.
2.  **Phase 2: Full Audit**: Deep dive into UI, SEO, CMS Editability, Navigation, Functionality, and Performance.
3.  **Phase 3: Action Plan**: Tasks classified as **SAFE**, **RISKY**, or **BLOCKED** to prevent breaking the UI.
4.  **Phase 4: Iterative Fixing**: Executing one safe task at a time with validation after each step.

### Absolute UI Lock
Strict enforcement of non-negotiable rules:
- No alterations to layout, spacing, typography, or colors.
- Exact preservation of Tailwind or CSS class names.
- Zero changes to DOM structure or HTML nesting.

## Step-by-Step Guide

### 1. Discovery & Forensic Audit
Start by identifying all components in the source code. Create a UI Comparison table comparing the original source output against the target WordPress output.
- *Rule: No fixes are allowed during this phase; only detection.*

### 2. Strategic Field Mapping
Map static React/HTML content to dynamic WordPress functions:
- Replace static text with `the_title()`, `get_field()`, or `the_content()`.
- Replace static paths with `get_template_directory_uri()`.

### 3. Implementation of Core Hooks
Ensure every theme includes the foundational WordPress hooks correctly:
- **Layout Files (`header.php` / `footer.php`)**: Must include `wp_head()` before `</head>` and `wp_footer()` before `</body>`.
- **Page Templates**: Must call `get_header()` and `get_footer()`.
- `register_nav_menus()` for dynamic navigation without breaking original HTML structure.

### 4. Validation & Live Tracker
Maintain a live tracker of Total Issues, Fixed, and Remaining. Every fix must be followed by a confirmation:
- ✅ No UI change
- ✅ No DOM change
- ✅ No class change

## Examples

### Example 1: Navigation Conversion
```php
// WRONG: Static replacement that adds wrappers
wp_nav_menu(['theme_location' => 'primary']);

// CORRECT: Preserving original Tailwind classes and structure
wp_nav_menu([
    'theme_location' => 'primary',
    'container' => false,
    'items_wrap' => '<ul class="flex space-x-8">%3$s</ul>',
    'walker' => new Custom_Tailwind_Walker()
]);
```

### Example 2: Asset Pathing
```php
// Source: <img src="/images/logo.png" />
// WP Conversion:
<img src="<?php echo get_template_directory_uri(); ?>/assets/images/logo.png" alt="Logo" />
```

## Best Practices

- ✅ **Do:** Use `get_page_by_path()` for robust internal linking.
- ✅ **Do:** Implement ACF (Advanced Custom Fields) fallbacks in `functions.php`.
- ✅ **Do:** Keep the Tailwind configuration in the `header.php` to ensure global styles are active.
- ❌ **Don't:** Add "div" wrappers or rename classes to "clean up" the code.
- ❌ **Don't:** Use standard WordPress default styles if they conflict with the original design.

## Additional Resources

- [ACF Documentation](https://www.advancedcustomfields.com/resources/)
- [Tailwind CSS in WordPress](https://tailwindcss.com/docs/installation)
- [WordPress Theme Handbook](https://developer.wordpress.org/themes/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
