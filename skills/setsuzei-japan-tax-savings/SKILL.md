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

- Node.js 20 or later (with `npx`).
- Network access once, to download the `setsuzei` package from the npm registry. The package has no dependencies. The calculation itself runs offline and sends nothing.
- Under 1 MB of disk space in the npm cache.

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

Optional: `idecoPaid`, `kyosaiPaid`, `furusatoPaid`, `spouse` (`{ "income": 0, "age70OrOlder": false }`, where income is total income, not salary), `dependents` (`{ "under16", "general", "specific", "elderly", "elderlyCohabiting" }`), `incomeAdjustment` (`true` when salary exceeds 8.5 million yen and there is a dependent under 23 or a specially disabled person; applied automatically when `under16` or `specific` is above 0), `idecoAdditional` (see below), `otherDeductions`, `idecoAnnualLimit`, `nhiIncomeRatePercent` (only when the user knows their municipality's rate; never guess it).

Always ask about two items that are easy to miss:

- **Dependents under 16.** They give no dependent deduction, but they raise the income threshold below which the income-based part of resident tax is not charged. Put the count in `dependents.under16`, not in `general`. For a low-income household, leaving it out makes resident tax and the furusato nozei limit come out higher than they really are.
- **How much more the user can put into iDeCo within this year.** Set `idecoAdditional` only when the user has confirmed the amount with their iDeCo provider. A contribution amount can be changed once a year and lump-sum contributions need a prior filing, so late in the year an increase often cannot count for this year. If the user does not know, leave it out.

Do not decide for the user what counts as an expense or which income category applies; ask them.

### 2. Get the CLI (first time only, with the user's approval)

The CLI is published on npm as [`setsuzei`](https://www.npmjs.com/package/setsuzei). It is built and published from the public repository by GitHub Actions with npm trusted publishing, so the npm page shows where and how each version was built. This skill pins version `0.3.1`.

First check whether a usable CLI is already installed; if this prints `0.2.2` or higher, use it and skip the download:

```bash
setsuzei --version
```

Otherwise, before downloading anything, tell the user that version `0.3.1` of the `setsuzei` package (under 1 MB, no dependencies) will be downloaded from the npm registry into the npm cache and run locally, and wait for approval. Then check the version; it must print `0.3.1`:

```bash
npx --yes setsuzei@0.3.1 --version
```

Use `npx --yes setsuzei@0.3.1` for every later command.

- Do not use an installed `setsuzei` that prints a version below `0.2.2`: versions before 0.2.2 do not apply the resident-tax exemption threshold and can report a furusato nozei limit for a person whose resident tax is actually zero.
- Keep the version pinned. Do not switch to `@latest`, an unpinned `npx setsuzei`, or a newer version without the user asking for it.
- The package goes to the npm cache, not into any skills, plugin, hook, or agent-configuration directory. It has no runtime dependencies and no install scripts.
- If a command is stopped by a permission prompt or denied, do not rephrase and retry it. Ask the user to run it themselves or to allow it.
- If the user declines, or the download fails, say that the estimate cannot be computed. Do not substitute figures from memory. The browser version (https://ozko00.github.io/setsuzei/) needs no install.

### 3. Perform the task

Pass the inputs as JSON on standard input through a process API. Do not put real user figures in shell commands, shell history, or files. The following shell example uses synthetic values only:

```bash
echo '{"businessRevenue":8000000,"businessExpenses":1500000,"businessIncomeType":"business","blueReturn":"65","socialInsurance":900000,"idecoPaid":276000,"furusatoPaid":30000}' \
  | npx --yes setsuzei@0.3.1 --input - --json
```

Exit code 2 means invalid input; read `error.issues` on standard error and fix the input or ask the user. To compare conditions (for example "only 100,000 yen more into iDeCo"), set `idecoAdditional` / `kyosaiAdditional` and run the CLI again for each condition.

Read the result from these fields:

| Question | Field |
| --- | --- |
| Current income tax / resident tax / total | `baseline.incomeTax.total` / `baseline.residentTax.total` / `baseline.totalTax` |
| Furusato nozei limit and remaining room | `measures.furusato.limit` / `.remaining` |
| iDeCo remaining room, the additional payment that was evaluated, and its saving | `measures.ideco.remaining` / `.additional` / `.saving.total` |
| Mutual aid remaining room, the additional payment that was evaluated, and its saving | `measures.kyosai.remaining` / `.additional` / `.saving.total` |
| The amount beyond which a further contribution no longer lowers tax (`null` when the whole room is effective) | `noEffectBeyond` on `measures.ideco` / `measures.kyosai` |
| Tax for each blue-return level | `measures.blueReturn.options[]` |
| Combined plan: furusato nozei plus mutual aid, and iDeCo only when `idecoAdditional` was given. Saving and the total additional payment | `measures.combined.saving.total` / `.totalPayment` |
| How much of that saving comes from contributions and how much from furusato nozei | `measures.combined.savingFromContributions` / `.savingFromFurusato` |
| The same plan if the remaining iDeCo room can also be paid this year (reference; `null` when not applicable) | `measures.combinedWithIdeco` |
| Whether the income-based part of resident tax is exempt or reduced by the exemption threshold | `baseline.residentTax.incomeLevyExempt` / `.exemptionReduction` |
| Why a measure was not computed | `applicable: false` and `notes` on that measure |
| Input-dependent cautions | `warnings` |

### 4. Verify the result and report

- Quote amounts only from the CLI output. Do not add, prorate, or round them yourself; use `measures.combined.saving.total` for the combined total, because the per-measure savings do not add up.
- Report the current tax, then each measure as "pay this much more, tax falls by this much", including every item in that measure's `notes`. Never state a tax saving without the payment next to it (`additional`, `remaining`, or `totalPayment`).
- Do not recommend contributing more than `additional`; beyond it the tax no longer falls (`noEffectBeyond`).
- The combined total (`measures.combined`) does not include an iDeCo increase unless `idecoAdditional` was given. Present `measures.ideco` and `measures.combinedWithIdeco` as conditional on the user's iDeCo provider confirming that the increase can still count for this year; do not speak as if it will.
- Furusato nozei lowers tax by about the amount donated, so it does not leave the user with more money; the benefit is the return gifts, less the 2,000-yen own cost. When giving the combined saving, state the furusato nozei part (`savingFromFurusato`) separately.
- Say that iDeCo money cannot be withdrawn before age 60 in principle, carries account fees, and is taxed when received; that mutual aid payouts are taxed when received and voluntary cancellation before 240 months of contributions returns less than was paid; and that raising either lowers the furusato nozei limit (`measures.furusato.limitAfterOtherMeasures`).
- Pass on every item in `warnings`, including the ones about the resident-tax exemption and about entering dependents under 16.
- End every answer by saying the figures are estimates and do not replace a tax accountant, the tax office, or the municipality.

## Examples

```text
User request: 今年あといくら節税できる？ フリーランスで売上800万、経費150万、青色65万、社会保険料90万、iDeCo 27.6万、ふるさと納税3万済み。
Inputs: {"businessRevenue":8000000,"businessExpenses":1500000,"businessIncomeType":"business","blueReturn":"65","socialInsurance":900000,"idecoPaid":276000,"furusatoPaid":30000}
Expected result: current tax 780,000 yen (income tax 375,400 + resident tax 404,600); furusato nozei limit 123,000 yen with 93,000 remaining; mutual aid saving 241,700 yen for 840,000 more; combined plan (mutual aid 840,000 + furusato nozei 56,000 more, 896,000 paid in total) saving 297,700 yen, of which 56,000 is furusato nozei; iDeCo saving 164,300 yen for 540,000 more only if the provider confirms the increase can count for this year, in which case the combined plan becomes 393,800 yen for 1,423,000 paid. These are the CLI's outputs for this input at the pinned commit.
```

## Limitations

- Tax year 2026 only. Rules change yearly; the pinned commit does not know later law.
- Estimates only. It does not compute National Health Insurance premiums in full, enterprise tax, consumption tax, separately taxed income, housing-loan credits, or pension income.
- Resident tax: the exemption threshold for the income-based part is applied (it depends on the spouse and dependents entered, including those under 16). The exemption of the per-capita part is not computed, because its threshold differs by municipality; the CLI only warns when it may apply.
- The iDeCo limit is assumed from employment type (self-employed, or employee without a corporate pension) unless `idecoAnnualLimit` is given.
- It does not judge eligibility: whether the user can join mutual aid, meets a blue-return requirement, or may claim a dependent.
- The CLI's messages and notes are in Japanese.
- If the CLI cannot be run, the skill produces no numbers.

## Safety and side effects

- Writes: one package (`setsuzei@0.3.1`, under 1 MB, no dependencies) in the npm cache. Nothing else is modified.
- Network: the npm registry during the one-time download, only after the user approves. No user data is sent anywhere; the calculation reads standard input and writes standard output.
- The user's income figures stay in the conversation and the local process. Do not write them to files.
- No accounts, credentials, or paid services.

## Sources and related skills

- CLI source, tests, and the list of what is and is not calculated: https://github.com/ozko00/setsuzei
- Per-number primary sources: https://github.com/ozko00/setsuzei/blob/v0.3.1/src/data/2026.ts
- Browser version of the same calculation (no install): https://ozko00.github.io/setsuzei/
- Related in this catalog: `tax-register` and `expense-accounting` build record-keeping templates; they do not estimate personal tax.
