---
name: runaway-guard
description: "Cost-safety discipline for paid AI / inference APIs: treat $-cost as a third complexity dimension alongside time and space. Forces a written per-run $-cap, per-day $-cap, max-iterations bound, concurrency limit, and a matching provider-dashboard hard cap BEFORE any call site is written."
risk: safe
source: community
source_repo: morsechimwai/lemmaly
source_type: community
date_added: "2026-05-28"
author: morsechimwai
tags: [cost-safety, finops, ai-apis, agents, retries, concurrency, wallet-invariant, gateway]
tools: [claude-code, antigravity, cursor, gemini-cli, codex-cli]
license: "Apache-2.0"
license_source: "https://github.com/morsechimwai/lemmaly/blob/main/LICENSE"
---

# runaway-guard — $-Cost is the Third Complexity Dimension

Every loop has time complexity and space complexity. A loop that calls a paid API has a third: **dollars per execution**. The model tracks the first two automatically. It does not track the third, so it ships code where a single bug — a retry without bound, a stream reconnect storm, an agent that re-queues itself, a webhook that fires the same job twice — silently spends real money.

The canonical incident: developer writes a Fal.ai image-generation loop. Loop "obviously terminates" because it iterates over a fixed list. The list comes from a callback that fires on every Inngest retry. Each retry doubles the list. By morning, the bill is **$200**. Tests pass. Code review passed. The bug is not in the loop body. The bug is that **no one stated the wallet invariant**.

runaway-guard fixes this. State the max calls. State the max dollars per run. State the max dollars per day. Set the same caps in the provider dashboard so a code bug cannot bypass them. Then write the code.

**Violating the letter of these rules is violating the spirit of the skill.** "I'm only testing locally" is the exact rationalization that ships the $200 bill — local code hits the same paid API as production.

## When to Use This Skill

Use **runaway-guard** when:

- Writing or reviewing code that calls a paid AI / inference API in a loop, queue, retry path, agent step, webhook handler, or background job.
- Importing or wrapping any paid-inference SDK: `@fal-ai/*`, `fal-client`, `@anthropic-ai/sdk`, `anthropic`, `openai`, `replicate`, `elevenlabs`, `together-ai`, `groq-sdk`, `cohere-ai`, `@mistralai/*`.
- Designing an agent loop, fan-out pipeline, retry wrapper, polling job, stream reconnect, or self-rescheduling job that may call a billed endpoint.
- Auditing a codebase / PR for unbounded fan-out, unbounded retries, missing idempotency keys, or missing provider-side spend caps.
- Diagnosing an unexpected bill, runaway loop incident, or surprise overage.

## The Iron Law

```text
NO CALL TO A PAID API WITHOUT A WRITTEN $-CAP AT BOTH THE CODE AND PROVIDER LEVEL
```

A cap only in code can be bypassed by a bug in that code. A cap only at the provider can be hit during normal usage and degrade the product. You need both. If you cannot state both in one sentence each, you have not designed the call site — you have written a wish.

## Non-negotiable rules

1. **Every call site gets a one-line cost contract.** Before writing any paid-API call, state in one sentence:
   - **Max calls per run:** the strict upper bound on invocations in a single execution of this code path.
   - **Max $ per run:** `max_calls × unit_cost` — compute it, don't estimate.
   - **Max $ per day:** the provider-side hard cap that backstops the code-side bound.

   Examples:
   - "Fal flux-pro at $0.05/image; max 20 images per job; max $1 per job; provider Spend Limit $50/day."
   - "Anthropic Sonnet at ~$0.015 per request (cached); max 50 requests per agent run; max $0.75 per run; Workspace Budget hard cap $30/day."

   If you cannot fill in all three numbers, you have not designed the call site.

2. **Every loop calling a paid API gets an explicit iteration bound, not just a termination argument.** `invariant-guard` requires a termination measure. runaway-guard requires the bound to be a **concrete integer in code**, not just "eventually terminates":

   ```ts
   // ❌ Terminates in theory. Bills $200 in practice.
   while (job.status !== 'done') {
     await fal.run(...);
   }

   // ✅ Concrete bound — wallet invariant explicit.
   const MAX_CALLS = 20;
   for (let i = 0; i < MAX_CALLS && job.status !== 'done'; i++) {
     await fal.run(...);
   }
   if (job.status !== 'done') throw new Error('exceeded MAX_CALLS budget');
   ```

3. **Every retry path is bounded by attempts AND total elapsed cost, not by time alone.** Exponential backoff with no attempt cap is a wallet attack on yourself.
   - Max attempts: a small integer (3–5 for transient errors, 1 for 4xx).
   - Cap counts across the whole pipeline, not just one library — Inngest retries × SDK retries × your own retry wrapper multiply.
   - 4xx errors do not retry. Period. They will not become 2xx; they will just bill again.

4. **Every fan-out path declares a concurrency limit.** Parallel calls multiply cost per wall-clock second. State the limit in code, at the queue (Inngest `concurrency`), and at the provider where supported:
   - Inngest: `concurrency: { limit: N }` on the function.
   - BullMQ / Sidekiq / Cloud Tasks: queue-level concurrency.
   - In-process: `p-limit`, semaphore, or batched `Promise.all` chunks — never an unbounded `Promise.all(items.map(...))` on a paid API.

5. **Every paid API has a matching provider-side hard cap, configured out of band.** Defense in depth: if the code is wrong, the provider stops the bleeding. Document the cap in the same file as the call site so future readers know it exists.

   | Provider | Where to set the hard cap |
   |---|---|
   | **Fal.ai** | Dashboard → Billing → **Spend Limit** (e.g. $50/day). Hard stop on exceed. |
   | **Anthropic** | Console → Workspaces → **Workspace Budget** with hard limit. Per-workspace, per-month. |
   | **OpenAI** | Org → Settings → **Usage limits** (org-level hard limit blocks requests). ⚠️ Per-*project* monthly budgets are **soft thresholds only** — they alert but do not block. For a real hard cap use the org-level Usage limit, a billing gateway, or your own fail-closed budget check. |
   | **Replicate** | Account → Billing → **Spend limit**. Per account. |
   | **ElevenLabs** | Workspace → **Usage limits** per workspace / API key. |
   | **Together / Groq / Cohere / Mistral** | Each has a billing dashboard with a monthly spend cap — set it before first deploy, not after. |

   No hard cap, no call site. Set the cap before the first request, not after the first incident.

6. **Idempotency keys on every mutating or charging call.** A webhook that fires twice should bill once. Without an idempotency key, retry policies you cannot see (load balancer, framework, gateway) silently double-charge.

7. **Make the "amplifier" patterns explicit and forbidden by default.** These are the shapes that turn small bugs into large bills:
   - **Self-rescheduling jobs.** A job that re-enqueues itself with no decrementing measure is an unbounded loop with extra steps.
   - **Webhook handlers that call the API that called the webhook.** Cycle detection or it will cycle.
   - **Recursion over LLM output.** "Ask the model what to do next" with no depth cap is a depth-unbounded recursion in dollars.
   - **Polling without a deadline.** `while (!done) await poll()` with no `maxWaitMs` is a wallet leak.
   - **Streaming reconnect storms.** A WebSocket / SSE reconnect with no backoff and no attempt cap can hammer a billed endpoint thousands of times per minute.
   - **Cache-miss stampede on a paid call.** N concurrent requests for the same uncached key → N billed calls. Use `singleflight` / request coalescing.

## The pre-write protocol

Before producing code that calls a paid API, your message must contain — in this order:

1. **Provider + unit cost.** "Fal flux-pro: $0.05/image, billed per success."
2. **Max calls per run.** A literal integer that will appear as a constant in the code.
3. **Max $ per run.** `max_calls × unit_cost`. Compute it.
4. **Max $ per day (provider hard cap).** The dashboard setting that backstops the code.
5. **Concurrency limit.** In code, at the queue, at the provider.
6. **Retry policy.** Max attempts, which error codes retry, idempotency key strategy.
7. **Amplifier audit.** Walk the list in rule 7; declare "none apply" or address each that does.
8. **The code** — with the cost contract in a comment above the call site.
9. **Self-check.** One line: "in the worst case, this code bills $X and the provider cap stops it at $Y."

If any of 1–7 is missing, do not emit code.

## Worked trap — the Inngest + Fal $200 night

This is the canonical case. Observe how each rule would have caught it.

**What shipped:**

```ts
// inngest function: generate images for a campaign
export const generateCampaign = inngest.createFunction(
  { id: 'gen-campaign' },                              // ❌ no concurrency limit
  { event: 'campaign/start' },
  async ({ event, step }) => {
    const prompts = await step.run('fetch', () => fetchPrompts(event.data.id));
    // ❌ unbounded fan-out, no per-run cap, no idempotency
    await Promise.all(prompts.map(p => fal.run('fal-ai/flux-pro', { input: { prompt: p } })));
  }
);
```

**What went wrong.** `fetchPrompts` had a bug: on a transient DB error it returned the partial list *plus the previous run's list appended*. Inngest retried the function at its default retry count (multiple attempts in addition to the initial one). Each retry re-ran `fetchPrompts`, each retry doubled the list (40 → 80 → 160 → 320 prompts). `Promise.all` fanned all 320 out concurrently. At $0.05/image: **$16/retry × triangular growth across overnight retries on the schedule = ~$200 by morning.**

**Why each rule would have caught it.**

| Rule | Catch |
|---|---|
| 1. Cost contract | Forces writing "max calls per run". The number `prompts.length` is not a known integer → rule fails → write a cap. |
| 2. Concrete iteration bound | `Promise.all(prompts.map(...))` has no integer bound → rule fails → wrap in chunks with `MAX_IMAGES_PER_RUN`. |
| 3. Retry policy | Inngest default retries × no idempotency key = double-billed work. Rule forces an idempotency key per `(campaignId, promptHash)`. |
| 4. Concurrency limit | `Promise.all` is unbounded concurrency. Rule forces `p-limit(3)` and Inngest `concurrency: { limit: 3 }`. |
| 5. Provider hard cap | Fal Spend Limit $50/day would have stopped the bleeding at $50 instead of $200. |
| 7. Amplifier audit | "Self-rescheduling jobs" — Inngest's retry IS self-rescheduling. The audit forces you to consider it. |

**The fix that survives the protocol:**

```ts
// cost contract:
//   provider: Fal flux-pro @ $0.05/image
//   max calls per run: 50
//   max $ per run: $2.50
//   provider hard cap: $50/day (set in Fal dashboard 2026-05-22)
//   concurrency: 3 (Inngest + p-limit, matching)
//   idempotency: key = `${campaignId}:${sha1(prompt)}` — provider-side dedup window 24h
const MAX_IMAGES_PER_RUN = 50;
const limit = pLimit(3);

export const generateCampaign = inngest.createFunction(
  {
    id: 'gen-campaign',
    concurrency: { limit: 3 },
    retries: 2,                                        // attempts = 1 + retries
  },
  { event: 'campaign/start' },
  async ({ event, step }) => {
    const prompts = await step.run('fetch', () => fetchPrompts(event.data.id));
    if (prompts.length > MAX_IMAGES_PER_RUN) {
      throw new NonRetriableError(
        `prompt count ${prompts.length} exceeds MAX_IMAGES_PER_RUN=${MAX_IMAGES_PER_RUN}`
      );
    }
    await Promise.all(prompts.map(p => limit(() => step.run(
      `img:${event.data.id}:${sha1(p)}`,               // idempotency key
      () => fal.run('fal-ai/flux-pro', { input: { prompt: p } })
    ))));
  }
);
```

Note: the bug in `fetchPrompts` is still there. The protocol does not fix that bug — it makes the bug **cost $2.50 instead of $200** while you find it. That is the entire point of defense in depth.

## Common runaway patterns and their wallet invariants

| Pattern | Wallet invariant to write | Hard cap to set |
|---|---|---|
| Fan-out over a list of items | `total_cost ≤ list_len × unit_cost ≤ MAX_$_PER_RUN` | provider daily spend limit |
| Retry on transient error | `total_cost ≤ attempts × unit_cost`, attempts ≤ 5 | provider daily spend limit; alert at 50% |
| Agent loop ("ask model what to do next") | `total_cost ≤ MAX_STEPS × per_step_cost`, depth ≤ MAX_DEPTH | per-agent-run cost ceiling, kill-switch |
| Polling for job completion | `total_cost ≤ ceil(MAX_WAIT_MS / poll_interval) × poll_cost` | absolute deadline + alert |
| Webhook handler → API call | idempotency key required; cycle if webhook is triggered by the same API | provider rate limit per key |
| Stream reconnect | `attempts ≤ MAX_RECONNECTS`, exponential backoff with cap | provider connection cap |
| Cache miss stampede | singleflight → `cost ≤ 1 × unit_cost` per key per window | n/a (deduped in code) |
| Self-scheduling job | recursion depth bounded by ledger row, not by code | scheduler-level dedup + max runs/day |
| Multi-provider fallback | sum across providers ≤ MAX_$_PER_RUN | hard cap on each provider separately |

## Provider-specific cheat sheet

Set these **before** the first deploy. None of them require code changes.

### Fal.ai
- Dashboard → **Billing → Spend Limit**. Daily and monthly hard caps. Hard stop on exceed.
- Use **per-API-key** keys per environment (dev / staging / prod) and set a low limit on dev.
- Webhooks: deliveries are paid; cap retries on your side.

### Anthropic
- Console → **Workspaces** → create a Workspace per environment.
- Each Workspace gets a **Budget** with a **hard limit** (request blocking) and **soft limit** (email alert).
- Use a per-Workspace API key — a leaked dev key cannot exceed the dev Workspace budget.
- Prompt caching reduces cost ~90% for repeated context; cap is on unblended cost so caching extends the budget.

### OpenAI
- ⚠️ **Per-project monthly budgets are soft only.** OpenAI's Help Center documents project budgets as "soft spending thresholds" that send alerts but do **not** enforce a hard cap. A runaway can continue past the documented project budget.
- For a real hard cap, use one of:
  - **Org-level Usage limits** (Org → Settings → Limits) — block requests on exceed.
  - A billing gateway / proxy in front of the API that enforces fail-closed budgets.
  - Your own fail-closed budget check in code that refuses calls past a ledgered $-cap.
- Use separate projects per environment (dev/staging/prod) for attribution and alerting, but do not rely on the project budget as the hard stop.

### Replicate
- Account → **Billing → Spend limit**. Account-wide hard cap.
- Use separate tokens per environment; rotate on leak.

### ElevenLabs
- Workspace → **Usage limits**. Set per API key.
- Voice cloning is billed per character; cap the character count in code AND per key.

### Inngest (queue layer — not paid AI but the multiplier)
- `concurrency: { limit: N }` on every function that calls a paid API.
- `retries: 2` (Inngest default is **4 retries**, i.e. up to 5 attempts including the initial — confirm against current Inngest docs) for paid call functions; fewer attempts on idempotent failures. Worst-case wallet math: `attempts = 1 + retries`, so a default `step.run()` can bill **5×**, not 4×.
- `NonRetriableError` for 4xx — never retry a 4xx into a paid API.
- `idempotency: ...` on events you cannot deduplicate at the call site.

## Edge cases to enumerate before shipping

| Scenario | Expected behavior |
|---|---|
| Empty input list | 0 calls, 0 cost, return early — do not even auth |
| Input list longer than MAX | reject with NonRetriableError, do not partial-process |
| All calls fail with 4xx | 1 attempt each, no retry, surface error |
| All calls fail with 5xx | bounded retries, total cost ≤ attempts × unit, alert on full exhaustion |
| Concurrent invocation of the same job | idempotency key dedups; second invocation costs $0 |
| Network partition mid-batch | partial cost banked; on resume, idempotency key prevents re-charge |
| Provider rate-limit (429) | respect `Retry-After`; do not multiply retries inside SDK and outside |
| Webhook retried by provider | idempotency at the handler boundary |
| Local dev accidentally pointing at prod key | per-env keys + per-env caps make this cost $0.50, not $50 |
| Cron fires while previous run still executing | concurrency limit = 1 OR explicit overlap-tolerant design |

## Output discipline

Code you emit must:

- Have a `// cost contract:` block above each call site with the four numbers (unit cost, max calls, max $/run, provider hard cap setting).
- Use a named constant (`MAX_IMAGES_PER_RUN`, `MAX_AGENT_STEPS`) for the bound — never a magic number inline.
- Wrap fan-out in `p-limit` or equivalent — never raw `Promise.all` over a paid API.
- Pass an idempotency key for every mutating / charging call.
- Set queue-level concurrency and retries in the same file or document it.
- Reject `4xx` retries via `NonRetriableError` or equivalent.
- Reference the provider hard-cap setting by name ("Fal Spend Limit $50/day, set 2026-05-22") so a future reader knows it exists.

## Related Skills

- **invariant-guard** — when the loop or recursion calling the paid API has no written termination measure. Termination is a precondition for a wallet cap; invariant-guard establishes it, runaway-guard bounds the cost.
- **complexity-cuts** — when the runaway has already shipped and you are diagnosing an unexpected bill. Treat the unintended fan-out as a complexity bug, write a characterization test, then transform one step at a time.
- **lemmaly** — when designing a new agent loop or batch pipeline that fans out paid calls. Pick the algorithm and data structure first; come back here for the wallet invariant per step.
- **mathguard** — when the cost driver is compute on a sublinear-algorithm problem (vector search, sketching, FFT) rather than per-call billing; mathguard sets the algorithmic floor that determines per-call work.

## Rationalizations to watch for

| Excuse | Reality |
|---|---|
| "I'm only testing locally." | Local hits the same paid endpoint. A retry bug in test code bills the same dollars. |
| "The list is small, fan-out is fine." | The list is small *today*. Next week it is fetched from a table that grew 50×. The cap exists for next week. |
| "Inngest already retries, so I don't need a retry policy." | Inngest retries × your retry wrapper × SDK retries = 27 attempts. Each one bills. |
| "The API call is cheap, $0.001." | At 10,000 unintended invocations that is $10 — and the count is exactly what you failed to bound. |
| "I'll set the provider cap later." | The bug ships before "later". Set the cap in the 60 seconds it takes; the code can wait. |
| "Idempotency is overkill for this." | Webhooks retry. Load balancers retry. Browsers retry. Without an idempotency key, *something* will duplicate. |
| "We have monitoring, we'll catch it." | Monitoring catches it after $200 is spent. Caps prevent the $200 from being spent. |
| "It obviously terminates." | The $200/night incident also "obviously terminated". Write the integer bound. |

If any of these sound familiar mid-thought: stop, write the cost contract, set the provider cap, then write the code.

## Red flags — STOP and write the cost contract first

- About to write `await Promise.all(items.map(x => paidApi(x)))` with no `p-limit`.
- About to write `while (!done) await paidApi(...)` with no integer bound.
- About to write an agent loop with "the model decides when to stop".
- About to write a retry wrapper around a call that is already retried by Inngest / SDK / framework.
- About to deploy a paid API key without first setting the provider dashboard cap.
- About to commit a paid API key to a `.env` shared across environments.
- About to handle a webhook that calls the API that produced the webhook.
- "Just for tonight" — overnight is exactly when runaway loops bill the most.

All of these mean: stop, write the cost contract, set the provider cap, then write the code.

## Verification checklist

Before shipping any code that calls a paid API:

- [ ] Cost contract comment exists above each call site with unit cost, max calls/run, max $/run, provider cap.
- [ ] The iteration / fan-out bound is a named integer constant, not implicit in list length.
- [ ] Concurrency limit is set in code (`p-limit`) AND at the queue (`Inngest concurrency`).
- [ ] Retry policy is explicit: max attempts, 4xx → no retry, idempotency key per call.
- [ ] Provider dashboard hard cap is set and the value is documented in the file.
- [ ] Per-environment API keys; dev keys have lower caps than prod.
- [ ] Amplifier audit (rule 7) has been performed and either "none apply" or each addressed.
- [ ] A test exists for: empty input, oversized input rejected, 4xx not retried, idempotency key dedups duplicate invocation.
- [ ] In the worst case the code bills ≤ MAX_$_PER_RUN, and even with a bug the provider cap stops loss at MAX_$_PER_DAY.

Cannot check every box? The code is example-correct, not bill-correct. Either fill the gap or do not connect a billing-enabled key.

## Limitations

- **Not a billing system.** runaway-guard enforces *intent* (caps, contracts, audits) at code-write time. It does not meter spend in production — pair it with the provider's hard cap and observability (LLM-cost dashboards, log alerts) for runtime enforcement.
- **Provider-side caps may take minutes to enforce.** Anthropic Workspace Budgets, OpenAI usage limits, and Fal Spend Limits are reconciled on a delay measured in minutes, not milliseconds. A pathological burst within a single window can still exceed the cap modestly.
- **No automated cost estimation for novel models.** The cost-contract numbers (unit cost, $/run) are inputs the author must look up; the skill does not maintain a per-model price table.
- **Streaming and per-token pricing.** For per-token APIs (Anthropic, OpenAI), `max calls` is a proxy — the real cap is `max input tokens × max output tokens × per-token rate`. Adapt the protocol: replace `max calls per run` with `max tokens per run`.
- **Compute-billed providers.** For long-running GPU jobs (training, video encoding) billed in seconds, replace "calls" with "GPU-seconds" in the contract; the discipline transfers but the units differ.
- **Does not replace incident response.** When a bill has already arrived, escalate to `complexity-cuts` for the corrective rewrite — runaway-guard prevents the next one, not the current one.

## The thesis, in one line

> **Time bounds prevent stalls. Space bounds prevent OOMs. Dollar bounds prevent $200 mornings. AI assistants enforce the first two by default and ignore the third. runaway-guard makes them reason about the wallet first.**
