---
name: setsuzei-japan-tax-savings
description: "Estimate how much Japanese income and resident tax a freelancer can still save before year-end (furusato nozei limit, iDeCo, mutual aid, blue-return deduction) by running the setsuzei CLI."
category: finance
risk: safe
source: self
source_type: self
date_added: "2026-11-26"
author: ozko00
tags: [japan, tax, freelance, furusato-nozei, ideco, finance, cli]
---

# Setsuzei: Japanese Year-End Tax Savings Estimate

## Overview

Estimates Japanese national income tax and local resident tax for a freelancer or a person with a side job, and how much each of four year-end measures would still reduce them: furusato nozei (hometown tax donation), iDeCo, Small Enterprise Mutual Aid (shokibo kigyo kyosai), and the blue-return special deduction (aoiro shinkoku, 100k / 550k / 650k yen).

The skill does not let the model do tax arithmetic. It collects the user's projected figures, runs the open-source `setsuzei` CLI (https://github.com/ozko00/setsuzei, MIT), and explains the CLI's JSON output. Rates and thresholds live in the CLI's data file with a primary-source URL per number (National Tax Agency, Ministry of Internal Affairs and Communications, e-Gov).

Scope: tax year 2026 (Reiwa 8) income tax and the fiscal 2027 resident tax that follows from it. Other skills in this catalog cover bookkeeping registers and accounting setups; none computes Japanese personal tax.

## When to Use

- The user asks, in Japanese or English, how much Japanese tax they can still save this year, what their furusato nozei limit is, how much iDeCo or shokibo kigyo kyosai would save, or what the difference between blue-return deduction levels is.
- The user is self-employed in Japan (sole proprietor / freelancer) or an employee with side-job income.
- Do not use it for corporate tax, consumption tax, tax years other than 2026, or for filing a return.

## Prerequisites

- Node.js 20 or later and git.
- Network access once, to download the CLI source from GitHub and its build-time dependencies (`typescript`, `@types/node`, and the latter's dependency `undici-types`) from the npm registry. The calculation itself runs offline and sends nothing.
- About 30 MB of disk space for the checkout and its build-time dependencies.

## How It Works

### 1. Establish the inputs

Ask for yearly projected amounts in yen. Start with the required items. If the user leaves optional inputs unspecified, identify the assumptions or defaults that affect the estimate. Never infer eligibility or a municipality-specific rate.

Required:

| Ask for | JSON key |
| --- | --- |
| Salary income, if any (the "payment amount" on the withholding slip) | `salaryRevenue` |
| Freelance / side-job sales | `businessRevenue` |
| Business expenses | `businessExpenses` |
| Business income or miscellaneous income | `businessIncomeType`: `"business"` / `"misc"` |
| Expected blue-return deduction (`"none"` for a white return) | `blueReturn`: `"none"` / `"10"` / `"55"` / `"65"` |
| Social insurance premiums paid in the year | `socialInsurance` |

Optional: `idecoPaid`, `kyosaiPaid`, `furusatoPaid`, `spouse` (`{ "income": 0, "age70OrOlder": false }`, where income is total income, not salary), `dependents` (`{ "general", "specific", "elderly", "elderlyCohabiting" }`; children under 16 are not counted), `incomeAdjustment` (`true` when salary exceeds 8.5 million yen and there is a dependent under 23 or a specially disabled person), `otherDeductions`, `idecoAnnualLimit`, `nhiIncomeRatePercent` (only when the user knows their municipality's rate; never guess it).

Do not decide for the user what counts as an expense or which income category applies; ask them.

### 2. Get the CLI (first time only, with the user's approval)

The CLI is not published on npm, so it is built from a pinned commit. Before doing anything, tell the user what will be downloaded and where, and wait for approval. Ask again before installing dependencies.

```bash
git clone https://github.com/ozko00/setsuzei.git "$HOME/.cache/setsuzei"
git -C "$HOME/.cache/setsuzei" checkout --detach 83f70c46aee447974a37be83a2f5b04e13568ad8
cd "$HOME/.cache/setsuzei" && npm ci --ignore-scripts && npm run build
```

- The checkout goes to a cache directory, not into any skills, plugin, hook, or agent-configuration directory.
- `npm ci --ignore-scripts` installs only the build-time dependencies listed above and runs no lifecycle scripts; `npm run build` runs the TypeScript compiler. The built CLI has no runtime dependencies.
- Do not move the pin to a newer commit without the user asking for it and reviewing the change.
- If the user declines, or the build fails, say that the estimate cannot be computed. Do not substitute figures from memory.

### 3. Perform the task

Pass the inputs as JSON on standard input through a process API. Do not put real user figures in shell commands, shell history, or files. The following shell example uses synthetic values only:

```bash
echo '{"businessRevenue":8000000,"businessExpenses":1500000,"businessIncomeType":"business","blueReturn":"65","socialInsurance":900000,"idecoPaid":276000,"furusatoPaid":30000}' \
  | node "$HOME/.cache/setsuzei/dist/cli.js" --input - --json
```

Exit code 2 means invalid input; read `error.issues` on standard error and fix the input or ask the user. To compare conditions (for example "only 100,000 yen more into iDeCo"), set `idecoAdditional` / `kyosaiAdditional` and run the CLI again for each condition.

Read the result from these fields:

| Question | Field |
| --- | --- |
| Current income tax / resident tax / total | `baseline.incomeTax.total` / `baseline.residentTax.total` / `baseline.totalTax` |
| Furusato nozei limit and remaining room | `measures.furusato.limit` / `.remaining` |
| iDeCo remaining room and saving | `measures.ideco.remaining` / `.saving.total` |
| Mutual aid remaining room and saving | `measures.kyosai.remaining` / `.saving.total` |
| Tax for each blue-return level | `measures.blueReturn.options[]` |
| Saving if furusato nozei, iDeCo and mutual aid are all done | `measures.combined.saving.total` |
| Why a measure was not computed | `applicable: false` and `notes` on that measure |
| Input-dependent cautions | `warnings` |

### 4. Verify the result and report

- Quote amounts only from the CLI output. Do not add, prorate, or round them yourself; use `measures.combined.saving.total` for the combined total, because the per-measure savings do not add up.
- Report the current tax, then each measure as "pay this much more, tax falls by this much", including every item in that measure's `notes`.
- Say that iDeCo and mutual aid money is locked up long-term, and that raising them lowers the furusato nozei limit (`measures.furusato.limitAfterOtherMeasures`).
- End every answer by saying the figures are estimates and do not replace a tax accountant, the tax office, or the municipality.

## Examples

```text
User request: 今年あといくら節税できる？ フリーランスで売上800万、経費150万、青色65万、社会保険料90万、iDeCo 27.6万、ふるさと納税3万済み。
Inputs: {"businessRevenue":8000000,"businessExpenses":1500000,"businessIncomeType":"business","blueReturn":"65","socialInsurance":900000,"idecoPaid":276000,"furusatoPaid":30000}
Expected result: current tax 780,000 yen (income tax 375,400 + resident tax 404,600); furusato nozei limit 123,000 yen with 93,000 remaining; iDeCo saving 164,300 yen for 540,000 more; mutual aid saving 241,700 yen for 840,000 more; all three together 393,800 yen. These are the CLI's outputs for this input at the pinned commit.
```

## Limitations

- Tax year 2026 only. Rules change yearly; the pinned commit does not know later law.
- Estimates only. It does not compute National Health Insurance premiums in full, enterprise tax, consumption tax, the resident-tax exemption threshold, separately taxed income, housing-loan credits, or pension income.
- The iDeCo limit is assumed from employment type (self-employed, or employee without a corporate pension) unless `idecoAnnualLimit` is given.
- It does not judge eligibility: whether the user can join mutual aid, meets a blue-return requirement, or may claim a dependent.
- The CLI's messages and notes are in Japanese.
- If the CLI cannot be run, the skill produces no numbers.

## Safety and side effects

- Writes: one git checkout and its `node_modules` under `$HOME/.cache/setsuzei`. Nothing else is modified.
- Network: GitHub and the npm registry during the one-time setup, only after the user approves. No user data is sent anywhere; the calculation reads standard input and writes standard output.
- The user's income figures stay in the conversation and the local process. Do not write them to files.
- No accounts, credentials, or paid services.

## Sources and related skills

- CLI source, tests, and the list of what is and is not calculated: https://github.com/ozko00/setsuzei
- Per-number primary sources: https://github.com/ozko00/setsuzei/blob/83f70c46aee447974a37be83a2f5b04e13568ad8/src/data/2026.ts
- Browser version of the same calculation (no install): https://ozko00.github.io/setsuzei/
- Related in this catalog: `tax-register` and `expense-accounting` build record-keeping templates; they do not estimate personal tax.
