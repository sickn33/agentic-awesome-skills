# Documentation format

Replace this file with your team's format. The skill treats it as agreed. The order follows a component page in the Geist design system. It gives the job and examples to copy first, then variants and states, then the API, usage and accessibility.

## Headings, in order

Every entry uses these nine H2s. Usage holds six fixed H3s, Examples holds `### Example files`, Variants holds one H3 per axis named after its prop, and Description may hold `### Parts`. Add, drop or rename nothing else.

1. `## Description`
2. `## Examples`
3. `## Variants`
4. `## States`
5. `## Props`
6. `## Usage`: `### When to use`, `### When not to use`, `### Rules`, `### Content`, `### Anti-slop`, `### Limits`
7. `## Accessibility`
8. `## Tokens`
9. `## Related`

## What goes in each

**Description.** One sentence on the job the component does, never how it looks. Under it, one plain line with the import, whether it is client or server code, the source path and its registry status.

**Examples.** The default example first, copied verbatim from a story or example file, with its path above it. With none, use the most common real call site, simplified by dropping unrelated props and nothing else, and say `simplified from <path>`. Then `### Example files`, a table of file, covers and caption: the default, every variant value and state that looks or behaves differently, and one composition inside a parent.

**Variants.** One H3 per axis. One line per value with the job it covers. When two values cover the same job, say so. No variant prop means `None.` and the reason.

**States.** One line per state that exists, saying what the user can do in it. Check default, hover, focus, pressed, disabled, pending and error and drop the ones it lacks. A state whose only cue is visual names the cue. State precedence goes here when states can overlap.

**Props.** From code only: name, type, default, when to change it. `NOT SUPPLIED` when no props type was read.

**Usage.** Rules a designer or agent follows before reaching for the component.
- *When to use, when not to use.* Two to four lines each. A situation the designer is in, never a property of the component. Each "when not" names the other component and says "instead".
- *Rules.* States over time, input methods, focus, feedback, composition, placement, density.
- *Content.* Rules per copy slot: casing, template, length, forbidden words.
- *Anti-slop.* What an agent writes by default that this app does not. Find it by giving one fresh agent a task with the component and comparing its code with the call sites. `Not applicable: <reason>` when nothing differs.
- *Limits.* A number set below a measured break, or `NEEDS REVIEW (not measured)` and what to measure.

**Accessibility.** The native element or primitive it rests on, the role, which keys operate it, where focus goes after, the accessible name in every variant. Say which facts came from code and which from a rendered story.

**Tokens.** Token names grouped by what they control, spelled as the source spells them, read from named references in the styles and never from a raw value.

**Related.** Components people mix up with this one, each with when to pick it instead.

## Rule shape

```
- `rule/<component>-<slug>`: When <condition>, <action> instead of <alternative>, because <reason>. Evidence: <ground>. Check: <lint | test | probe | review> <what runs>.
  - Don't: <one line of real code that breaks it>
  - Do: <the fix>
```

Test each rule before it ships. Write a violating snippet and confirm the check or a reviewer catches it. Negate the rule and sharpen it if the opposite sounds just as fine. Sweep every call site: each follows it or is a listed exception.

## Worked example

A Toast from a fictional task tracker, cut to the parts that teach most.

````markdown
## Description
Toast confirms the result of something the user just did, without moving them off the screen.

`import { Toast } from "@/components/toast"`, client only, `src/components/toast/Toast.tsx`, status NOT SUPPLIED (no registry in this repo).

## Variants

### tone
- Success: an action finished and can often be undone
- Error: an action failed and may be retried
- Warning: NEEDS REVIEW. In the stories, missing from the `tone` type. See Conflicts

## States
- Visible: the timer runs, the action and close button can be activated
- Paused: focus or pointer is inside, the timer stops
- Leaving: input is ignored. Leaving wins over Paused. Error toasts have no timer

## Usage

### Rules
- `rule/toast-error-persists`: When `tone` is `"error"`, keep the toast until it is closed or its action runs, because its Retry is the only path back to the failed request. Evidence: single use `RemoveMember.tsx:41`. Check: review.
  - Don't: `<Toast tone="error" duration={6000} message="Could not remove Dana" />`
  - Do: `<Toast tone="error" message="Could not remove Dana" action={{ label: "Retry", onAction: retry }} />`

### Anti-slop
Not applicable: a fresh agent given "confirm that a card moved" wrote the same call as the Board screen.
````
