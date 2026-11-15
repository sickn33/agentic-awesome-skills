---
name: mobbin
description: "Find real app screens, user flows and website sections on Mobbin through the Mobbin MCP server, to ground UI design and code in shipped products."
category: frontend
risk: safe
source: official
source_repo: mobbin/skills
source_type: official
date_added: "2026-10-31"
author: mobbin
tags: [mobbin, mcp, ui, ux, design, design-references]
tools: [claude, cursor, gemini, codex]
license: "MIT"
license_source: "https://github.com/mobbin/skills/blob/main/LICENSE"
---

# Mobbin UI references

## Overview

Mobbin is a library of real screens, user flows and website sections from shipped iOS, Android and web products. This skill tells the agent how to search it through the official Mobbin MCP server (`https://api.mobbin.com/mcp`) and how to cite what it finds, so design and UI code decisions are based on what real products ship instead of on memory. It is adapted from the `search` and `best-practices` skills in [mobbin/skills](https://github.com/mobbin/skills), which also ships a full `redesign-screen` workflow.

## When to Use

- The user asks for examples of a screen, component, flow or website section ("show me paywalls from meditation apps", "how do banking apps do onboarding?").
- The user is designing or building UI and wants it grounded in real products.
- Not for building a whole product or cloning an app in one go; scope it to one screen, flow or section at a time.
- Not for generating images or editing design files; use a design-tool skill for that.

## Prerequisites

- The Mobbin MCP server connected to the agent (remote, Streamable HTTP, OAuth):

```bash
claude mcp add --transport http mobbin https://api.mobbin.com/mcp
```

  Other clients: add `{"mcpServers": {"mobbin": {"url": "https://api.mobbin.com/mcp"}}}` to their MCP config.
- A Mobbin account on a Pro, Team or Enterprise plan. On first use the client opens a browser to sign in.
- Network access to `api.mobbin.com`. Search queries are sent to Mobbin.

## How It Works

### 1. Pick the tool

| Target | Tool |
|---|---|
| A screen or component in an app | `search_screens` with `platform` |
| A section of a marketing site (hero, pricing, footer) | `search_sections` (no `platform`) |
| A journey, or one screen whose place in a journey matters | `search_flows` with `platform` |

`platform` is `ios` or `web`. There is no Android filter, so an Android target searches `ios`; say the references are iOS when citing them.

### 2. Write the query

- One screen, flow or section per query, starting with its type ("paywall", "signup screen").
- At most three constraints (a state, a step, a visible part or a visual trait such as `dark mode`). The domain ("banking app") and an app name ("Revolut") don't count as constraints.
- Every constraint comes from the user's request. Don't add parts you expect the target to have.
- Plain phrases beat keyword lists. Leave out the user's own copy, brand and words like "best" or "examples of".
- On `search_screens`, use `mode: standard` for a query with no constraints and `mode: deep` for one to three.

### 3. Pull more or recover

- More results for a query that works: `search_screens` with the same query and every seen id in `exclude_screen_ids`; `search_sections` and `search_flows` with the next `page` while `has_next_page` is true.
- Weak results: change the query (drop or reword a constraint), don't just raise `limit`.
- A named app doesn't appear: retry with its exact spelling, then the other `platform`. Never describe it from memory.
- Images don't open: call again with `image_format: jpg`.
- The tool refuses the call: stop and tell the user (often a plan or connection issue); don't retry.

### 4. Verify and cite

Open each image before citing it. Cite each reference with its `app_name` or `site_name` and its `mobbin_url`, and say what decision it shows. Check `app_name` even when the query named an app, since not every result is from that app.

## Examples

```text
User request: Find onboarding paywalls from meditation apps that offer a free trial.
Call: search_screens({ query: "meditation app paywall with a free trial button", platform: "ios", mode: "deep" })
Expected result (illustrative): a short list of paywall screens, each with the app name, a one-line note on how it presents the trial, and its mobbin_url.
```

```text
User request: Compare how AI tools design their pricing sections.
Call: search_sections({ query: "AI tool pricing section" })
Expected result (illustrative): pricing sections from several AI product sites, grouped by layout (plan cards, comparison table, usage slider), each linked to Mobbin.
```

## Limitations

- Requires a paid Mobbin plan (Pro, Team or Enterprise) and the Mobbin MCP server; without them the tools are unavailable.
- No Android filter; Android requests return iOS references.
- Search returns references, not code or design files. The agent still has to adapt them to the user's own design system.
- A short or empty result means few close matches for that query, not that Mobbin has none.

## Safety and side effects

Read-only for search. Queries are sent to Mobbin's servers under the user's account. The Mobbin MCP server also has collection tools that write to the user's Mobbin account (e.g. saving screens to a collection); only call them when the user asks. Authentication is OAuth in the browser, so no tokens belong in prompts or files.

## Sources and related skills

- Upstream skills and Mobbin MCP config (MIT): https://github.com/mobbin/skills (`search`, `best-practices`, `redesign-screen`, `plain-writing`)
- Docs: https://docs.mobbin.com/mcp/introduction
- Related here: `product-design`, `design-md`
