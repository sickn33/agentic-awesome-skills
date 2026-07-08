# Command Reference

`user-thoughts` accepts `/user-thoughts` and `/ustht`. They are equivalent.

## Command Summary

| Command | Meaning |
|---|---|
| `/ustht init` | Initialize `.ustht/` in the current project. |
| `/ustht status` | Show skill state, instant state, raw count, and dimension count. |
| `/ustht skill` | Show `SKILL_STATUS`. |
| `/ustht skill on|off` | Enable or disable write operations. |
| `/ustht instant` | Show `INSTANT_STATUS`. |
| `/ustht instant on|off` | Enable or disable instant capture. |
| `/ustht sortin [--dry]` | Append raw entries into mdbase. |
| `/ustht resort [--dry]` | Reorganize all mdbase content semantically. |
| `/ustht raw` | Show unprocessed raw entries. |
| `/ustht mdbase show [--all|--dimension]` | Show the index, all dimensions, or one dimension. |
| `/ustht mdbase export [--all|--dimension]` | Export mdbase content. |
| `/ustht import <path>` | Import project-relevant decisions from markdown files. |
| `/ustht ignore start|end` | Start or stop a temporary ignore interval. |
| `/ustht ignore --last` | Remove the last raw entry and record it as ignored. |
| `/ustht ignore show` | Show ignored entries. |

## Natural-Language Mapping

Agents may map clear user intent to commands:

- "turn on project memory" -> `/ustht skill on && instant on`
- "stop recording this" -> `/ustht ignore start`
- "start recording again" -> `/ustht ignore end`
- "organize what I said" -> `/ustht sortin`
- "show what you remember" -> `/ustht mdbase show`
- "ignore the last note" -> `/ustht ignore --last`

When intent is ambiguous, ask a short clarification instead of guessing.

## Chained Commands

Commands can be chained with `&&` and should run left to right. Stop only if a command fails in a way that makes the following command unsafe.

Example:

```text
/ustht skill on && instant on && status
```

## Dimension Arguments

Dimension names must pass validation:

- lowercase letters, digits, and hyphens;
- `/` allowed for subdirectories, such as `ui/outline`;
- no spaces, `..`, backslashes, absolute paths, or reserved names.
