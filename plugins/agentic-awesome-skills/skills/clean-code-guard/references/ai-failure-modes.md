# AI Failure Modes — the unique value of this skill

This file catalogs 15 systematic ways LLMs produce bad code, each backed by published research or widely-documented engineering observations. Read this first if you are an AI agent applying this skill — these are the patterns most likely to enter your own output.

For each failure mode you get:
- **Pattern:** one-line description.
- **Source:** the research or post documenting it as systematic, not incidental.
- **Bad / Good:** short before-and-after.
- **Rule:** the imperative for your own self-check.

## Contents

- 1. Catch-all error handling that swallows failures
- 2. Defensive guards for impossible cases
- 3. Premature abstraction
- 4. Comment pollution
- 5. Code duplication instead of reuse
- 6. Hallucinated APIs and packages
- 7. Generic, intent-less naming
- 8. Long functions doing many things
- 9. Parameter explosion
- 10. Inconsistency with surrounding code
- 11. Dead code, unused imports, half-implementations
- 12. Declares success with mock fallbacks in production code
- 13. Plausible-but-wrong code
- 14. YAGNI violations through speculative configurability
- 15. New dependency for trivial work
- Cross-cutting observation
- Where this skill differs from generic clean-code rules

---

## 1. Catch-all error handling that swallows failures

**Pattern.** Wrapping operations in broad catch-all handlers or returning null/empty success on any caught error, hiding real bugs.

**Source.** Karpathy directly observed that LLMs are unusually afraid of exceptions. Reinforced by field reports on LLM error suppression. Root cause is the reward signal during training — propagating exceptions penalizes the model, so the model learns to suppress them.

**Bad:**
```text
getEmail(userId):
  attempt:
    user = userStore.get(userId)
    return user.email
  catch anyError:
    return null
```
Looks safe. In practice, a database outage is now indistinguishable from "user has no email."

**Good:**
```text
getEmail(userId):
  user = userStore.get(userId)  // storage errors propagate
  return user.email             // null only means the user has no email
```

**Rule.** Catch only the specific error type you can recover from. Never use broad catch-all handling without a documented recovery path. Returning null/empty success from a handler is forbidden unless the function's contract says so.

---

## 2. Defensive guards for impossible cases

**Pattern.** Adding null checks, runtime type checks, or truthiness checks for conditions the type system or call graph already prevents.

**Source.** arXiv 2409.19182, "AI-Generated Code Considered Harmful"; HN discussion of defensive code overuse. Same reward-shaping mechanism as #1.

**Bad:**
```text
total(orderItems):
  if orderItems is null: return 0
  if orderItems is not a collection: return 0
  return sum(order.amount for each non-null order in orderItems)
```
The contract says `orderItems` is a collection of orders. None of these guards can fire under normal call paths.

**Good:**
```text
total(orderItems):
  return sum(order.amount for each order in orderItems)
```

**Rule.** Do not add null checks, runtime type checks, or truthiness checks for values whose type annotation or caller contract already excludes that case. Trust the contract. This applies *inside* a trust boundary; at the boundary itself — external input, payloads, deserialized or cross-process data — validation is required, not defensive bloat.

---

## 3. Premature abstraction

**Pattern.** Factories, strategy classes, base classes, plugin hooks, dependency-injection scaffolding introduced before a second concrete user exists.

**Source.** Martin Fowler, "Patterns for Reducing Friction in AI-Assisted Development" — names "overeagerness (adding unrequested features)" as a documented AI pattern. Fowler, "I still care about the code". Fowler, "Conversation: LLMs and Building Abstractions".

**Bad:**
```text
PaymentProcessor interface
  charge(amount)

CardPaymentProcessor implements PaymentProcessor
  charge(amount):
    return paymentProvider.createCharge(amount).id

PaymentProcessorFactory
  create():
    return new CardPaymentProcessor()
```
There is exactly one payment processor. The abstract interface, the factory, and the indirection are pure ceremony.

**Good:**
```text
charge(amount):
  return paymentProvider.createCharge(amount).id
```

**Rule.** Do not introduce an interface, abstract class, factory, registry, strategy, or plugin pattern unless two or more concrete implementations exist today or the spec explicitly requires extensibility. One implementation = inline it.

---

## 4. Comment pollution

**Pattern.** Line-by-line comments restating the code in English; step-number scaffolding comments left in; documentation comments that paraphrase the signature.

**Source.** HN thread #43929768 — *"The most common thing that makes agentic code ugly is the overuse of comments."* arXiv 2402.13013, "Code Needs Comments" and arXiv on multi-intent comment generation — LLM-generated comments answer "what?" rather than "why?", averaging ~5 descriptive words versus 19-word mixed-intent author comments.

**Bad:**
```text
// Increment counter by one
counter += 1

// Step 3: return the result
return result
```

**Good:**
```text
counter += 1

// Reset counter at midnight UTC to align with billing periods.
if counter > daily_limit:
    counter = 0
```

**Rule.** Comments explain *why*, never *what*. Strip restating-code comments and any leftover "Step N" scaffolding before finalizing. Keep comments only where the rationale wouldn't be obvious to a reader of the code.

---

## 5. Code duplication instead of reuse

**Pattern.** Inline copies of logic that already exists in a helper, instead of importing it.

**Source.** GitClear, AI Copilot Code Quality 2025 — 211M-LoC longitudinal analysis. Copy-pasted 5+ line blocks increased **8x** between 2021 and 2024. Copy/pasted lines rose from 8.3% to 12.3%. Refactoring share dropped from 25% to under 10%. This is the strongest quantitative result on LLM code quality available.

**Rule.** Before writing a function, search the codebase for a similar existing one. If a block of ≥5 lines matches existing code in the repo, extract or call the existing function.

---

## 6. Hallucinated APIs and packages

**Pattern.** Imports, method names, or signatures that don't exist in the version of the library actually installed.

**Source.** Spracklen et al., USENIX Security '25, "Package Hallucinations" — 16 models tested; average hallucination rate 19.6% (commercial ~5%, open source ~21%). arXiv 2409.20550 "LLM Hallucinations in Practical Code Generation" gives a taxonomy. arXiv 2407.09726, "Mitigating Code LLM Hallucinations with API Documentation".

**Rule.** Every import and external API call must be verified against the actual installed version — read the package, check the lockfile, or import and inspect. Do not call a method based on what "should exist."

---

## 7. Generic, intent-less naming

**Pattern.** `data`, `result`, `item`, `temp`, `value`, `obj`, `info`, `helper`, `manager`, `utils`, `process_*`, `handle_*`, `do_*`.

**Source.** arXiv 2512.01141, "Neural Variable Name Repair" — generic identifiers are an explicit target of name-repair models because LLM code over-produces them. arXiv 2510.03178, "When Names Disappear" — semantic names act as anchors during generation.

**Bad:**
```text
processData(data):
  result = []
  for item in data:
    temp = item.value * 2
    result.add(temp)
  return result
```

**Good:**
```text
doublePrices(orders):
  return orders.map(order -> order.priceCents * 2)
```

**Rule.** Identifiers must reveal intent. Ban `data`, `result`, `item`, `temp`, `value`, `obj`, `info`, `helper`, `manager`, `handle_*`, `process_*`, `do_*` unless qualified (`raw_csv_bytes`, `parsed_invoice`).

---

## 8. Long functions doing many things

**Pattern.** A single function mixing I/O, business logic, formatting, and side effects — often because the prompt asked for several things in one breath.

**Source.** arXiv 2512.11922, "Vibe Coding in Practice" — documents how AI-assisted "vibe coding" accumulates technical debt through architectural inconsistencies; the canonical symptom is a single function hundreds of lines long handling several unrelated concerns, assembled from multiple AI-generated fragments. GitClear 2025 — file size 142→267 LoC, cyclomatic complexity 4.2→8.1 in AI-assisted commits. arXiv 2304.10778 compares Copilot/CodeWhisperer/ChatGPT quality.

**Rule.** A function does one thing. If the prompt asks for N things, produce N functions and a small composer. Refactor ceiling: ~50 lines (target ≤20), ≤4 parameters, cyclomatic complexity ≤10 — refactor before exceeding.

---

## 9. Parameter explosion

**Pattern.** Functions taking 6+ positional or keyword args that should have been a typed config object.

**Source.** arXiv 2304.10778 quality study and Fowler's overeagerness pattern. The triggering behavior is "AI does not pause to extract a config struct."

**Bad:**
```text
sendEmail(to, subject, body, retry=true, backoff="exp",
          html=false, fromAddress=null, encoding="utf-8",
          internal=false, verbose=false)
```

**Good:**
```text
EmailRequest
  to
  subject
  body
  html = false

sendEmail(request: EmailRequest)
```

**Rule.** When a function reaches 5 parameters, stop and introduce a typed request/config object: record, struct, DTO, or equivalent. Do not keep adding positional args.

---

## 10. Inconsistency with surrounding code

**Pattern.** Introduces snake_case in a camelCase file, a new HTTP client when the repo has one, a new error type when an existing taxonomy exists, a new logging style.

**Source.** Pullflow, "The Context Illusion"; Honeycomb, "How I Code With LLMs These Days"; Stripe Minions architecture writeups (anup.io, Stripe blog). The explicit production fix is forcing the agent to read repo-local conventions before writing.

**Rule.** Before writing in a file, read the file and at least one neighbor. Match casing, import style, error handling pattern, and logging style. Reuse the project's existing HTTP, database, and logging utilities rather than introducing new ones.

---

## 11. Dead code, unused imports, half-implementations

**Pattern.** Imports never referenced, helper functions never called, branches never reachable, "just in case" exports.

**Source.** arXiv 2411.01414, "A Deep Dive Into LLM Code Generation Mistakes" — 7-category taxonomy of non-syntactic mistakes including specification-deviation patterns that leave half-implemented code. GitClear's "added-code dominates moved/deleted" finding is the quantitative version.

**Rule.** Before finalizing, run a linter or static check for unused imports, unused symbols, and unreachable branches; remove them. Do not leave a function defined unless something calls it now.

---

## 12. "Declares success" — mock fallbacks in production code

**Pattern.** Returning hardcoded success values, fixture data, or empty defaults instead of doing the actual work, then claiming the task is done.

**Source.** Fowler, "Patterns for Reducing Friction" — names "declaring success despite failing tests" and "brute-force fixes." claude-code issue #6984 "Systematic Mock Data Generation Bias". Anthropic Claude Code best practices explicitly tell agents: no mock implementations.

**Bad:**
```text
getUserBalance(userId):
  return 1000  // TODO: actual provider call
```
Shipped as the implementation, function body is fiction.

**Good:**
```text
getUserBalance(userId):
  raise NotImplemented("Wire to billing.getBalance() after auth is available")
```

**Rule.** Never return hardcoded "success" values or fixture data from a function the spec says should perform real work. Never disable, skip, or change a test to make it pass. If you cannot implement, fail explicitly with an unimplemented error and say what is missing.

---

## 13. Plausible-but-wrong code

**Pattern.** Code that compiles and reads correctly but encodes a slightly wrong formula, range, or null semantic — often lifted from a similar-but-different function.

**Source.** arXiv 2411.01414 — 4 of the 7 mistake categories are non-syntactic semantic mistakes prior work had missed; root cause is "misunderstanding of specification." Katanaquant, "Your LLM Doesn't Write Correct Code. It Writes Plausible Code". Simon Willison: hallucinations in code are *less* dangerous because they fail loudly — the corollary is that the dangerous class is plausible-but-wrong semantic code that runs.

**Bad:**
```text
# Compute median
median = (values[values.length / 2] + values[values.length / 2 + 1]) / 2
// off-by-one for odd length

# Iterate items
for index from 1 to items.length - 1:
  ...  // silently drops items[0]
```

**Rule.** For any boundary, range, off-by-one, or null-semantic question, write the case enumeration in a comment first (`cases: empty / one / even / odd / null`) and verify each case before the code. Never copy a similar function and adapt — re-derive from the spec.

---

## 14. YAGNI violations — speculative configurability

**Pattern.** Config flags, env vars, optional parameters, and feature toggles for use cases that don't exist.

**Source.** Fowler's overeagerness pattern and the HN defensive-code thread. Anecdotal but widely observed.

**Bad:**
```text
renderInvoice(invoice,
              format="pdf", template=null, locale="en",
              includeQr=false, currencyOverride=null,
              debug=false, legacyMode=false)
```
Only one caller exists. It passes `(invoice,)`.

**Good:**
```text
renderInvoice(invoice)
```

**Rule.** No optional parameter, config flag, env var, or feature toggle without a present-day caller. If you find yourself adding `enable_*`, `use_*`, or `*_mode` arguments, delete them and rely on the single concrete behavior.

---

## 15. New dependency for trivial work

**Pattern.** Adding a third-party package to do what the standard library, an already-installed dependency, or a few lines of code already cover — a micro-dependency for a one-line helper, or a heavy library pulled in for a single function.

**Source.** Field reports on AI over-building (Fowler's overeagerness pattern) and long-standing supply-chain guidance: every dependency is permanent maintenance surface — version churn, transitive vulnerabilities, audit and licensing weight — that a small local function never carries. Same emit-more bias as modes 3 and 14.

**Bad:**
```text
# add a package to sum a column of numbers
import stats_helpers
total = stats_helpers.sum_column(rows, "amount")
```

**Good:**
```text
total = sum(row.amount for row in rows)
```

**Rule.** Before adding a package, check the stdlib, the already-installed dependencies, and whether a few lines solve it. Add a dependency only when it owns real complexity you should not re-implement (cryptography, parsing, time zones — illustrative, not exhaustive), never to avoid a short function. This is the inverse of mode 5 and of [dry-kiss-yagni.md](dry-kiss-yagni.md) ranked item 8: don't re-implement what the platform gives you — and don't import what a few lines already cover.

---

## Cross-cutting observation

Nine of the 15 failure modes (1, 2, 3, 9, 12, 14, 15, plus pieces of 8 and 11) trace to one root cause: **the model is biased toward emitting more code, more parameters, more guards, more abstractions** — anything but the minimum required by the spec. The cure is restraint, not knowledge. Before writing each line, ask: *does the spec require this, today?* If no, do not write it.

## Where this skill differs from generic clean-code rules

Sections in [naming-and-functions.md](naming-and-functions.md), [solid.md](solid.md), and [dry-kiss-yagni.md](dry-kiss-yagni.md) cover the classic principles. They are necessary but not sufficient — an LLM that "knows" SOLID can still produce code that fails for the reasons in this file. The 15 patterns above are the high-leverage check. Walk them before delivery.
