---
id: bot-protection-product-guardrails
title: Bot Protection product guardrails
status: active
candidateKinds: ["platform_bot_protection"]
frameworks: ["*"]
priority: 90
citations: ["https://vercel.com/docs/bot-management", "https://vercel.com/docs/vercel-firewall/vercel-waf/managed-rulesets", "https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules", "https://vercel.com/docs/botid"]
maxBriefChars: 800
---

## Investigation Brief
Bot Protection recommendations must be grounded in observed automated traffic or meaningful edge-request scale.

## Evidence To Check
Check bot bandwidth share, edge request volume, existing WAF managed rules, and whether BotID or Bot Protection is already enabled. Prefer a staged Log to Challenge or Deny path for rules whose false-positive risk is not proven.

## Do Not Recommend When
Do not recommend disabling Vercel security products to reduce cost. Do not recommend Bot Protection for quiet projects with no bot evidence.

## Verification
State the observed bot share or scale signal, current protection state, and any existing log, challenge, deny, or BotID check.
