# Docs Guard — Docstring, PHPDoc, and JSDoc Rules

In-code documentation has one extra constraint the other surfaces lack: it sits next to the truth. There is no excuse for a docstring that disagrees with the signature three lines below it.

## Contents

- When a docstring is justified
- The paraphrase test
- What a good docstring contains
- Tag accuracy (PHPDoc/JSDoc)
- Generated-docs hygiene

## When a docstring is justified

- Public API surface: always — it feeds IDEs, generated references, and agents.
- Internal helpers: only when the contract is not expressible in the signature (units, invariants, side effects, "why"). An internal one-liner with an intention-revealing name usually needs nothing — and clean-code-guard's comment rules apply.

## The paraphrase test

Delete any docstring whose entire information content is recoverable from the signature:

```php
// Fails the test — restates the obvious, documents nothing.
/**
 * Gets the user by ID.
 *
 * @param int $user_id The user ID.
 * @return WP_User The user.
 */
function get_user_by_id( $user_id ) { /* … */ }
```

AI generators emit these by the thousand; they are comment pollution wearing a suit. Either say something the signature cannot, or say nothing.

## What a good docstring contains

The contract the types cannot express:

- Units and ranges (`$timeout` in seconds? milliseconds? what happens at 0?)
- Error behavior: which exceptions/returns on failure, and when (verify the raise/return sites)
- Side effects: writes, cache invalidation, events fired, global state touched
- Null/empty semantics: what `null` means here, what an empty array does
- Ordering, idempotency, concurrency guarantees when callers depend on them
- The "why" for surprising design ("returns 1.0 on API failure so prices never disappear")

## Tag accuracy (PHPDoc/JSDoc)

- `@param` names and order match the signature exactly — drift here actively lies to IDEs.
- `@param` and `@return` types match the real types, including nullability (`int|WP_Error`, `?string`) and generics where the project uses them.
- `@throws` lists what the body actually throws — verify each raise site; remove what no longer throws.
- `@since` matches the changelog/tag where the project versions its API.
- `@deprecated` always names the replacement.

## Generated-docs hygiene

When docstrings feed a generated reference (phpDocumentor, JSDoc, Sphinx, TypeDoc):

- A wrong docstring becomes a published wrong reference page — Rule 1 severity applies as if it were the README.
- Check that examples inside docstrings obey [code-samples.md](code-samples.md) — they are the least-reviewed samples in any codebase.
- Markup must be valid for the generator in use; broken tags silently truncate published pages.
