---
id: usage-spike-triage
title: Usage spike triage
status: active
candidateKinds: ["usage_spike_triage"]
frameworks: ["*"]
priority: 95
citations: ["https://vercel.com/docs/alerts", "https://vercel.com/docs/spend-management", "https://vercel.com/docs/bot-management"]
maxBriefChars: 950
---

## Investigation Brief
A single-day or single-SKU spike needs cause before fix. Branches: bot or AI crawler on a cacheable route, viral moment, pricing-model migration, or code regression.

## Evidence To Check
Confirm SKU and day from `usage.breakdown.data`. Cross-check firewall/bot data, traffic curve, SKU rename timing, and deploy log around the spike day. Spend Management and Alerts are monitoring tools; they do not replace finding the traffic or deploy cause.

## Do Not Recommend When
Do not propose a code fix until the branch is identified. Do not rate-limit a viral moment or revert a deploy for third-party crawler traffic.

## Verification
Name SKU, day, value, window mean, branch, and one supporting datum.
