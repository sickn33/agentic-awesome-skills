# Removed signals

What to look for on the `-` side of a hunk and which skill owns the judgement.

| Removed from the `-` side | Owner | What to check |
| --- | --- | --- |
| `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-live`, `role=` | `better-accessibility` | The control or region lost its accessible name, description or announcement |
| `alt=`, `<label`, `for=`, `htmlFor`, `scope=` | `better-accessibility` | Image, field or table cell lost its programmatic association |
| `<button>`, `<a>`, `<nav>`, `<main>`, `<ul>` replaced by `div` or `span` | `better-accessibility` | Keyboard and assistive-technology behavior was traded for styling |
| `:focus-visible`, `:focus`, `outline`, `tabindex` | `better-accessibility` | Keyboard users lost the focus indicator or the element left the tab order |
| `prefers-reduced-motion` | `better-accessibility` | Motion now ignores the user's system preference |
| `prefers-contrast` | `better-colors` | Colors now ignore the user's contrast preference |
| Logical properties swapped for `left` / `right` | `better-layout` | Direction-aware layout was dropped |
| `lang=`, `dir=` | `better-typography` | Language metadata or text direction was dropped |
| `text-wrap`, `line-clamp`, `overflow-wrap`, `tabular-nums`, `font-feature-settings` | `better-typography` | Text rendering, wrapping or numeral alignment silently changed |
| A color token swapped for a literal, or a token swapped for a lighter one | `better-colors` | The rendered contrast pair may now fail; measure it |
| A user-facing string deleted or shortened | `better-writing` | A label, error or empty state lost the information it carried |

## Equivalent replacements

These clear the signal. Drop a removal one of them explains before routing anything:

- `aria-label` giving way to `aria-labelledby` pointing at visible text.
- An explicit `role` dropped because the element became the native equivalent, such as `role="button"` going when a `div` becomes a `<button>`.
- `outline` replaced by a `box-shadow` ring on the same `:focus-visible` selector.
- `tabindex="0"` dropped from an element that is now natively focusable.
- A color literal replaced by a token with the same value.
- A physical property replaced by its logical counterpart, which is the fix rather than the regression.
- A string moved into the translation catalogue rather than deleted.

## Searching the removed side

Restrict the search to deleted lines so additions do not mask a removal. Pass the exclusion pathspecs from [Excluded paths](scope-resolution.md#excluded-paths) after `--`:

```bash
git diff -U0 "$BASE" <head-ref> -- . <exclusions> \
  | grep -E '^-' | grep -vE '^--- (a/|/dev/null)' \
  | grep -E 'aria-|role=|alt=|htmlFor|for=|scope=|focus|outline|tabindex|prefers-|lang=|dir=|text-wrap|line-clamp|overflow-wrap|tabular-nums|font-feature|inset-|-inline|-block'
```

Leave `<head-ref>` off for a target that includes uncommitted work, so the diff runs against the working tree. Removed strings and swapped color tokens have no pattern; read those hunks.

Read the surrounding hunk before deciding. A removed attribute is meaningless without the element it came from, and `-U0` deliberately hides that context.
