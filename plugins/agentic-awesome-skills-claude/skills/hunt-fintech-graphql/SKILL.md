---
name: hunt-fintech-graphql
description: Hunt fintech-specific GraphQL vulnerabilities
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: owasp_api_top10_2023, public_research
report_count: 0
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

## Why Fintech GraphQL Is a Different Risk Class

Generic GraphQL bugs (IDOR, mass assignment, introspection, batching abuse — see `hunt-graphql`)
still apply here, but the blast radius changes completely: a resolver bug in a SaaS app leaks
data, the same class of bug in a ledger mutation **moves money**. Three properties make fintech
GraphQL backends a distinct hunting surface:

- **Money-movement mutations are almost always resolvers over a double-entry ledger.** A single
  GraphQL mutation (`transferFunds`, `redeemRewards`, `withdrawToBank`) can trigger multiple
  ledger writes (debit + credit + fee) that must be atomic. GraphQL's flexible input shape and
  alias batching make it easy to desynchronize those writes.
- **Decimals are attacker-controlled input, not display formatting.** Amounts, exchange rates,
  interest, and rewards points are usually passed as GraphQL scalars (`Float`, `String`, custom
  `Decimal`/`Money` scalar). How the resolver parses and rounds that value is exploitable surface
  in its own right — this barely exists in non-financial GraphQL APIs.
- **KYC/PII fields sit next to routine account fields in the same type.** `User` or `Account`
  types commonly expose `ssnLast4`, `routingNumber`, `kycStatus`, `governmentIdUrl`, or
  `linkedBankAccount` alongside `displayName` and `email` — one missing field-level authorization
  check on a type used everywhere in the schema fans out to every query that touches it.

---

## Attack Surface Signals

**URL / schema naming patterns (in addition to `hunt-graphql`'s generic `/graphql` list):**
```
/graphql/ledger
/graphql/payments
/api/wallet/graphql
/internal/ledger-graphql
/banking/graphql
```

**Field/type names worth grepping schema introspection or JS bundles for:**
```
balance, availableBalance, pendingBalance, ledgerEntry, ledgerEntries
transferFunds, withdraw, redeem, topUp, reverseTransaction, adjustBalance
kycStatus, ssnLast4, routingNumber, accountNumber, governmentIdUrl
quoteExchangeRate, interestAccrued, rewardsPoints, portfolioValue
idempotencyKey, clientMutationId
```

**Tech-stack tells specific to this vertical:**
- Plaid/Stripe/Dwolla/Marqeta wrapped behind an internal GraphQL gateway (`bankLink`, `plaidLinkToken` mutations)
- Apollo Federation with a dedicated `ledger` or `payments` subgraph — check for the subgraph's own introspection being reachable directly, bypassing the gateway's stitched-down schema
- Custom `Money`/`Decimal`/`BigDecimal` GraphQL scalar in the schema (`scalar Money`) — the parser for this scalar is worth fuzzing directly

Run `hunt-graphql`'s discovery + introspection methodology first to get the schema; everything
below assumes you already have (or have partially enumerated) a schema with money-movement types.

---

## Step-by-Step Hunting Methodology

1. **Map every mutation that touches balance, whether directly or as a side effect.** Not just
   `transfer*`/`withdraw*` — also `redeemRewards`, `applyCoupon`, `upgradeTier`,
   `closeAccount` (often refunds a balance), `disputeTransaction` (often provisionally credits).

2. **For each money-movement mutation, identify the ledger write shape.** Does one mutation call
   produce one ledger entry or several (debit sender, credit receiver, fee entry)? Multi-entry
   writes are the ones worth racing — see Stage 4.

3. **Test idempotency-key handling.** Send the identical mutation (same `idempotencyKey` /
   `clientMutationId`) twice, back-to-back and with a delay. A ledger write on the second call
   means idempotency isn't enforced server-side — replay = double-execute.

4. **Test decimal/precision edge cases** on every amount-accepting argument — see Payload section.
   Confirm server-side rounding matches client-displayed rounding; a mismatch is directly
   monetizable.

5. **Probe cross-account IDOR on account/portfolio node IDs**, same as `hunt-idor`/`hunt-graphql`,
   but specifically test whether a `transferFunds`-style mutation validates that the
   **source account belongs to the authenticated caller** — not just that *some* account with
   that ID exists. This is the fintech-specific IDOR: authz on the *source* of a debit is easy to
   forget when authz on the *destination* of a credit was correctly implemented (crediting an
   arbitrary account "looks safe" to a developer; debiting one clearly isn't, so it gets checked
   — but sometimes only one direction does).

6. **Check field-level authorization on KYC/PII fields** by querying the shared `User`/`Account`
   type from every context that returns it — not just the profile screen. A `transaction` type
   that embeds `counterparty { ssnLast4 }` is a common place for the check to be missing, because
   the developer authorized the top-level `transaction` query but didn't re-check field access on
   the nested `counterparty`.

7. **Look for admin-tier mutations reachable via mass assignment**, not just a missing auth
   check — e.g. an input object with a client-settable `status` or `override` field that a normal
   user's mutation shouldn't expose but that the resolver accepts anyway
   (`updateTransaction(input: {id, status: "COMPLETED", amount: "..."})`).

8. **Test currency-argument consistency.** Send a transfer/quote mutation with mismatched
   `sourceCurrency`/`targetCurrency` combinations the UI never generates (e.g. self-transfer with
   a currency conversion) and check whether the resolver's FX-rate lookup and the ledger write use
   the same rate — a TOCTOU window here is a direct arbitrage bug.

9. **Combine alias batching with money-movement mutations** to test for double-spend — see
   `hunt-race-condition` for the parallel-HTTP escalation once alias batching alone confirms the
   resolver isn't serializing writes per-account.

---

## Payload & Detection Patterns

**Idempotency-key replay test:**
```graphql
mutation {
  transferFunds(input: {
    idempotencyKey: "test-key-001"
    sourceAccountId: "acc_1"
    destAccountId: "acc_2"
    amount: "10.00"
  }) { transactionId status }
}
```
Send twice with the identical `idempotencyKey`. Two successful, distinct `transactionId` values
= idempotency not enforced.

**Decimal-precision / rounding probes:**
```graphql
mutation { transferFunds(input: {sourceAccountId:"acc_1", destAccountId:"acc_2", amount: "0.001"}) { transactionId } }
mutation { transferFunds(input: {sourceAccountId:"acc_1", destAccountId:"acc_2", amount: "9999999999999999.99"}) { transactionId } }
mutation { transferFunds(input: {sourceAccountId:"acc_1", destAccountId:"acc_2", amount: "1e2"}) { transactionId } }
mutation { transferFunds(input: {sourceAccountId:"acc_1", destAccountId:"acc_2", amount: "-50.00"}) { transactionId } }
```
Sub-cent amounts test truncate-vs-round handling (repeat N times to accumulate a rounding-error
balance drift); scientific notation and oversized values test whether the `Money`/`Decimal`
scalar parser falls back to a native float/int with overflow or precision-loss behavior; negative
amounts test whether the resolver assumes sign server-side or trusts the client's.

**Alias-batched double-spend probe (confirm before escalating to parallel HTTP):**
```graphql
mutation {
  r1: redeemRewards(input: {rewardId: "rwd_1", accountId: "acc_1"}) { success }
  r2: redeemRewards(input: {rewardId: "rwd_1", accountId: "acc_1"}) { success }
  r3: redeemRewards(input: {rewardId: "rwd_1", accountId: "acc_1"}) { success }
}
```
If more than one alias succeeds against a single-use reward/coupon, the resolver doesn't
serialize per-account/per-resource writes within a batched request — see `hunt-race-condition`
for combining this with parallel HTTP POSTs to confirm real double-spend impact.

**Source-account authorization probe (asymmetric IDOR check):**
```graphql
mutation {
  transferFunds(input: {
    sourceAccountId: "VICTIM_ACCOUNT_ID"
    destAccountId: "ATTACKER_CONTROLLED_ACCOUNT_ID"
    amount: "1.00"
  }) { transactionId status }
}
```
Run as the attacker's own session/token. Success = the resolver validated the destination is
attacker-controlled (obviously required) but never validated that the source belongs to the
caller.

**Nested field-level PII probe:**
```graphql
query {
  transaction(id: "txn_123") {
    amount
    counterparty { displayName ssnLast4 routingNumber kycStatus }
  }
}
```
Query as a user with no relationship to the counterparty beyond a shared transaction; success on
the nested PII fields is the finding even if the top-level `transaction` query correctly scoped
the transaction itself.

**Mass-assignment probe on admin-shaped input fields:**
```graphql
mutation {
  updateTransaction(input: {id: "txn_123", status: "COMPLETED", amount: "0.01"}) { id status }
}
```
Send as a non-admin user against a mutation the client UI never exposes these fields for; a
schema that accepts them anyway is mass assignment onto ledger state.

---

## Common Root Causes

1. **Client-side amount/fee validation only.** The UI computes and displays the correct amount;
   the resolver trusts whatever the GraphQL client actually sends, because "the app always sends
   the right value."
2. **Non-atomic multi-entry ledger writes.** Debit, credit, and fee entries are written as
   separate sequential statements instead of inside a single transaction/lock — the race window
   this creates is exactly what alias batching + parallel HTTP exploits.
3. **`Money`/`Decimal` scalar falls back to native float parsing** under edge-case input
   (scientific notation, oversized strings), reintroducing floating-point rounding error into a
   system that was supposed to guarantee fixed-point precision.
4. **Idempotency keys are stored but never checked before executing the write** — the key is
   logged for support/debugging purposes, not used as a dedup gate.
5. **Field-level authorization implemented per top-level query, not per type.** A `User`/`Account`
   type's sensitive fields are protected when queried directly (`me { ssnLast4 }`) but not when
   the same type is returned nested inside an unrelated query (`transaction { counterparty {...} }`).
6. **Source-account ownership check missing while destination-account existence check is
   present** — see methodology step 5. Debiting looks dangerous so it gets reviewed; the "does
   this account belong to the caller" check quietly only gets applied to the credited side.
7. **Admin/internal mutations reuse the same input type as the public mutation**, just with extra
   optional fields — nothing at the resolver layer strips those fields for non-admin callers.

---

## Gate 0 Validation

Money-movement findings need a stricter bar than a typical GraphQL IDOR — "the query returns
someone else's balance" is real impact; "I sent a malformed amount and got a 400" is not.

1. **Did an actual ledger write occur, and can you show it?** Query the account balance before
   and after — a state change (not just a `200`/success response body) is the proof.
2. **Is the win deterministic, not a timing fluke?** For race/double-spend findings, reproduce
   twice from a clean state. If it only works under specific load conditions, document the window
   honestly rather than claiming guaranteed exploitability.
3. **Does the finding move value the attacker didn't have, or reveal data they shouldn't see** —
   not just "the mutation accepted an unexpected input type and the API returned an error
   message." A verbose GraphQL error leaking a stack trace on a malformed `Money` scalar is a
   `hunt-source-leak`-class finding, not a fintech-logic one — don't conflate the two in a report.

---

## Related Skills & Chains

- **`hunt-graphql`** — parent skill for generic GraphQL discovery, introspection bypass, node-ID
  IDOR, and alias-batching mechanics. Load this skill first; `hunt-fintech-graphql` assumes that
  methodology and only adds the money-movement-specific delta.
- **`hunt-business-logic`** — coupon/reward double-redemption and other logic-flaw patterns
  generalize directly to `redeemRewards`/`applyCoupon`-style mutations here.
- **`hunt-race-condition`** — the escalation path once alias batching alone confirms a
  money-movement mutation doesn't serialize writes: combine with parallel-HTTP / single-packet
  attack for a deterministic double-spend PoC.
- **`hunt-api-misconfig`** — mass assignment and JWT-claim tampering patterns apply directly to
  admin-shaped GraphQL input objects reachable by normal users.
- **`hunt-idor`** — the source-account-vs-destination-account asymmetric authz pattern (step 5) is
  a fintech-specific instance of the general IDOR-on-mutation-argument class.
- **`evidence-hygiene`** — balance screenshots and ledger-entry PoCs need the same cookie/PII
  redaction discipline as any other capture, plus care that a real account number/balance from a
  live financial account is never included verbatim.
- **`triage-validation`** — apply Gate 0 above before drafting; a fintech program's triage team
  will kill anything without a demonstrated ledger state change immediately.

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
