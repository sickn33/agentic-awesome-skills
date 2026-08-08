# Naming and Functions — Clean Code Chapters 2 and 3

Source: Robert C. Martin, *Clean Code*. Sample chapters online at the Pearson PDF; chapter summaries at Vivek Khatri's Ch. 2 notes and Herberto Graça's Ch. 3 summary.

## Contents

- Meaningful names
  - N1. Intention-revealing
  - N2. No disinformation, no encodings
  - N3. Meaningful distinctions
  - N4. Searchable, pronounceable
  - N5. Class names are nouns, method names are verbs
  - N6. Banned generic names
- Functions
  - F1. Small. Then smaller.
  - F2. Do one thing
  - F3. One level of abstraction per function
  - F4. Step-down rule
  - F5. Few arguments
  - F6. No flag arguments
  - F7. No output arguments / Command-Query Separation
  - F8. No side effects in queries
  - F9. Prefer exceptions to return codes
  - F10. Duplication is the root evil
- Self-check for naming and functions

## Meaningful names

### N1. Intention-revealing

A name should tell you *why it exists, what it does, and how it's used*. If you need a comment to explain a name, the name is wrong.

**Bad:**
```text
d  // elapsed time in days
ts = []
fn(xs)
```

**Good:**
```text
elapsedDays
timestamps
filterOverdueInvoices(invoices)
```

### N2. No disinformation, no encodings

No Hungarian notation (`strName`, `iCount`). No interface-prefix `I` (`IUserService`). No member prefix `m_`. No "List" suffix unless the type is actually a list (`accountList` for a `set` is disinformation).

**Bad:** `strFirstName`, `IUserRepo`, `m_count`, `userArray` (when it is not an array).

**Good:** `first_name`, `UserRepo`, `count`, `users_by_id`.

### N3. Meaningful distinctions

Do not differentiate names by adding noise words. `ProductInfo`, `ProductData`, `Product` — what's the difference? Same with `getActiveAccount` vs. `getActiveAccountInfo`. If the distinction is real, name the distinction.

### N4. Searchable, pronounceable

Single-letter names are acceptable inside short loop scope (`for i in range(...)`). Anywhere else they hurt grep. `MAX_RETRIES` is searchable; `7` is not.

If you can't read the name aloud in a code review, it's a bad name. `genymdhms` is a real-world example from the book — `generation_timestamp` is the fix.

### N5. Class names are nouns, method names are verbs

`User`, `Invoice`, `Account` — classes are things. `saveInvoice`, `computeTotal`, `notifyUser` — methods are actions. A class named `ProcessInvoice` and a method named `Invoice` are both wrong.

### N6. Banned generic names

Without a qualifier, these names always violate intention-revealing:

- `data`, `data2`, `data_final`
- `result`, `result_final`
- `item`, `value`, `temp`, `obj`, `info`
- `helper`, `manager`, `utils`, `common`
- `handle_*`, `process_*`, `do_*` (when `*` is also generic)

Qualified versions are fine: `raw_csv_bytes`, `parsed_invoice`, `dedup_by_email`.

---

## Functions

### F1. Small. Then smaller.

Target ≤20 lines. Uncle Bob's harder pass says 2–4 lines is the goal. If a function does not fit on a screen, it does too much. Extract.

### F2. Do one thing

A function does one thing when you cannot extract another function from it with a name that is not a restatement of its body. If `compute_invoice` contains a 10-line block that you could meaningfully call `apply_discount`, the original was doing more than one thing.

### F3. One level of abstraction per function

Mixing levels is the most common subtle defect. Do not put an HTTP call, a SQL query, a regex parse, and a business rule in the same function — those are four levels.

**Bad:**
```text
renderUserReport(userId):
  connection = openDatabaseConnection()
  row = queryUserRow(connection, userId)
  displayName = row.firstName + " " + row.lastName
  markup = "<h1>" + displayName + "</h1>"
  return markup
```
Four levels: connection, query, formatting, presentation.

**Good:**
```text
renderUserReport(userId):
  user = userRepository.findById(userId)
  return userReportView.render(user)
```

### F4. Step-down rule

Read a file top-to-bottom; each function is followed by functions one level of abstraction below. Callers above callees. Confirmed by Uncle Bob himself on X.

### F5. Few arguments

Zero is best. One is fine. Two is OK. Three "should be avoided." Four or more "requires very special justification" — usually means you should pass a config object.

At five parameters, stop and extract a request/config object: record, struct, DTO, or equivalent.

### F6. No flag arguments

A boolean parameter that switches behavior is always wrong. Split into two functions.

**Bad:**
```text
render(invoice, asHtml):
  if asHtml:
    ...
  else:
    ...
```

**Good:**
```text
renderInvoiceHtml(invoice)
renderInvoicePdf(invoice)
```

The same applies to `mode="x"` string enums when the mode changes behavior. If `mode` parameterizes data (locale, currency), it's fine. If it parameterizes *which function runs*, split.

### F7. No output arguments / Command-Query Separation

A function either returns a value (query) or has a side effect (command). Never both.

**Bad:**
```text
save(record) -> boolean
// Returns true if saved, false if record was not found.
```
What does the bool mean? Success? Found-ness? The caller can't tell.

**Good:**
```text
save(record)
recordExists(recordId) -> boolean
```

### F8. No side effects in queries

A getter-style, finder-style, or predicate-style function must not mutate state. If it caches, log the cache write at debug level; do not change observable behavior.

### F9. Prefer exceptions to return codes

`if save(x):` is a code smell. Either save succeeds (returns nothing) or it raises (`InvoiceSaveError`). Return codes proliferate up the call stack and get forgotten; exceptions can't be ignored silently.

### F10. Duplication is the root evil

If two functions share a non-trivial block, extract it. But — see [dry-kiss-yagni.md](dry-kiss-yagni.md) for when this is wrong (Sandi Metz's "wrong abstraction" caveat).

---

## Self-check for naming and functions

Before you ship code:

1. Do all names answer "what does this represent" without a comment?
2. Are functions ≤20 lines?
3. Are functions doing one thing? (Can you extract another function with a non-restating name? If yes, you're doing more than one.)
4. Are mixed abstraction levels eliminated?
5. Are there any functions with >4 parameters? Extract a config object.
6. Are there boolean flag arguments? Split.
7. Do any functions both return a value *and* mutate state in a way callers depend on? Split.
