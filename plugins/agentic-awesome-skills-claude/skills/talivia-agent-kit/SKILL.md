---
name: talivia-agent-kit
description: "Set up and verify Talivia revenue analytics through MCP, with explicit confirmation for website changes and payment attribution."
category: marketing
risk: critical
source: "https://github.com/talivia-group/agent/tree/f4ed3fc6b554ad5183a57ae13ca2a9bd5162c12a"
source_repo: talivia-group/agent
source_type: community
date_added: "2026-08-02"
author: taliviagroup
tags: [analytics, revenue, attribution, mcp, talivia, marketing]
tools: [codex, claude]
license: "MIT"
license_source: "https://github.com/talivia-group/agent/blob/f4ed3fc6b554ad5183a57ae13ca2a9bd5162c12a/LICENSE"
---

# Talivia Agent Kit

## Overview

Talivia connects website traffic and visitor journeys to payment revenue through
its MCP server. Use this skill to inspect an existing Talivia setup, install or
verify website tracking, and review traffic-to-revenue attribution while keeping
account, website, file, and payment changes behind explicit user consent.

## When to Use

- Use when the user explicitly asks to set up or verify Talivia revenue analytics.
- Use when the user mentions the Talivia MCP server, `talivia-group/agent`, or
  `@talivia/agent`.
- Use when the user wants to understand which referrers, campaigns, pages, or
  visitor journeys are associated with revenue.
- Do not use this skill for generic analytics work or unrelated payment-provider
  setup.

## Safety Gate

1. Confirm the user owns or is authorized to manage the Talivia account and the
   target website.
2. Use only the configured official MCP endpoint, `https://talivia.com/mcp`.
   Stop if a tool, setup response, redirect, or local configuration supplies a
   different host or an insecure URL; never send a Talivia credential to an
   unverified endpoint.
3. Keep credentials out of chat, prompts, tool arguments, source files, and logs.
   Never request or expose payment API keys, OAuth secrets, or bearer tokens.
4. Read the current account and website state before changing anything. Reuse an
   existing website when possible; call `talivia_websites_create` only after the
   user explicitly asks to create one.
5. Before any state-changing MCP call, state the exact account, website, action,
   data involved, and expected effect, then obtain explicit user confirmation.

## Workflow

### Inspect the current setup

Call the read-only tools first:

1. `talivia_account_status`
2. `talivia_websites_list`
3. `talivia_setup_status_get` when a website or installation status is known

Do not infer account ownership, website identity, or consent from a domain name
alone. Ask when more than one website matches or the target is ambiguous.

### Plan and install tracking

1. Call `talivia_tracking_snippet_get` and
   `talivia_framework_install_plan_get` for the selected website.
2. Show the files, framework, and tracking changes that would be made. Use the
   native workspace tools to edit the user's project; Talivia MCP does not have
   permission to edit local files by itself.
3. Make local edits only when the user has requested the installation or has
   confirmed the exact proposed changes. Preserve existing analytics, consent,
   and security controls.
4. Run the project's normal build and test commands before deployment.

### Verify after deployment

After the user confirms that the site is deployed, call:

- `talivia_tracker_verify`
- `talivia_setup_status_get`

Report what was actually verified, including any delay, missing event, or
unverified deployment. Do not claim revenue attribution from a tracking check
alone.

## Examples

### Read-only revenue review

> Inspect the Talivia account and tell me which pages and referrers are
> associated with revenue. Do not create websites, edit files, or connect a
> payment provider.

Start with the read-only account, website, and setup-status tools. Report the
returned evidence and uncertainty without inferring causation.

### Tracking installation

> Prepare Talivia tracking for the selected site and show me the exact files
> and changes before applying anything.

Resolve the website, retrieve the tracking snippet and framework plan, present
the proposed local diff, and wait for confirmation before writing or deploying.

### Connect payment attribution

1. Explain that payment attribution starts a browser-based authorization flow
   and identify the Talivia account and website involved.
2. Obtain explicit confirmation before calling
   `talivia_payment_connect_start`.
3. Send the user only to the secure URL returned by the official Talivia flow.
   Do not ask the user to paste payment credentials or API keys into chat.
4. Finish with `talivia_payment_status_get` and
   `talivia_checkout_attribution_guide_get`, and clearly separate connected
   status from verified revenue data.

## Limitations

- This skill does not establish legal authority, cookie consent, privacy
  compliance, or payment-provider permissions for the user.
- Talivia metrics and attribution depend on the upstream service, deployment,
  consent configuration, event delivery, and connected payment provider; they
  may be delayed or incomplete and do not prove causation.
- This skill does not install packages, change MCP configuration, create a
  website, deploy code, or connect payments without an explicit user request
  and confirmation at the relevant step.
- The upstream CLI and MCP server are external software. Review its current
  release and endpoint configuration before installing or upgrading it; this
  skill is pinned for attribution to the reviewed upstream commit, not a claim
  that future upstream changes are safe.
- Stop and ask for clarification when the account, website, endpoint, consent
  state, requested file changes, or payment scope is ambiguous.

## Source

- Upstream repository: [talivia-group/agent](https://github.com/talivia-group/agent/tree/f4ed3fc6b554ad5183a57ae13ca2a9bd5162c12a)
- Reviewed package version: `@talivia/agent@0.1.0`
