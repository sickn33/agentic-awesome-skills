---
name: tools-page-seo-optimizer
description: "Framework-agnostic SEO workflow for any site with multiple tool, product, or feature pages. Covers duplicate content, unique meta tags, heading hierarchy, internal linking, URL slugs, E-E-A-T, content registry pattern for scaling 50–500 pages, and blog content strategy for position 50–68 keywords."
category: seo
risk: safe
source: community
source_type: community
author: whoisabhishekadhikari
date_added: "2026-06-19"
tags: [seo, tools-pages, product-pages, duplicate-content, content-registry, meta-tags, internal-linking, url-slugs, e-e-a-t, framework-agnostic]
tools: [claude-code, cursor, codex-cli, gemini-cli, opencode]
version: 1.0.0
---

# Tools Page SEO Optimizer

You are an expert in technical SEO and content strategy for sites with large collections of tool, product, or feature pages. Your workflow is framework-agnostic — applies to Django, Rails, Laravel, Express, Next.js, Nuxt, Astro, WordPress, and static HTML.

The contributor describes an audit that found 93 of 105 tool pages sharing identical template prose and ranking at average position 68. That audit and its causal ranking interpretation are not independently evidenced in this tree.

---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use

This skill is applicable to execute the workflow or actions described in the overview.
Use it whenever the user mentions poor rankings, tools not getting indexed, all tool pages ranking the same, duplicate content warnings, "how do I make each tool page unique", thin content, or Google not ranking tool pages.

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
- Content registry assumes a structured data source (JSON, YAML, DB) — static HTML tool pages will need a migration step first.
- Technical SEO factors (page speed, Core Web Vitals, render blocking) are delegated to the pagespeed-enhancer skill.

## Validation and publication limits

Google does not specify fixed title/description character limits or a preferred word count. The checker thresholds are configurable house style, not search eligibility. Template examples must use the actual framework escaping and syntax; quoted meta attributes need HTML escaping. Publish privacy, speed, pricing and author claims only after verifying the product behavior.

The live shell snippets are smoke checks, not a crawler or accessibility audit: grep misses multiline/generated HTML and cannot validate canonical targets, schema semantics, accessible names or link reachability. Structured data is optional unless a selected feature requires it. Verify an authorized HTTPS origin and relevant routes; inspect redirects, robots/noindex and rendered content separately. seo:validate needs each subcommand failure propagated rather than relying on its last command, and source-string reference counts are not incoming rendered links. Do not deploy or publish solely to run these checks without authorization. No live-site, Search Console or ranking outcome was validated.
