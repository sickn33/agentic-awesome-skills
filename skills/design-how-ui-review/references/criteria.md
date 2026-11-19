# Review criteria

A starting set. Replace it with the criteria your team agreed on, because an unagreed criterion becomes a finding someone has to defend.

## Severity

**blocking.** The user cannot finish the task, or is likely to lose data, spend money or take an irreversible action without meaning to. A user who believes the task finished when it did not cannot finish.

**should-fix.** The user gets there but loses time to confusion or detours, or may end up with an outcome they did not want.

**note.** A small inconsistency, or a pattern worth settling before other screens copy it.

When a finding could go either way, choose the milder level and say why in one sentence. The exception is shown versus sent. When a field shows one value while the request sends another, and the hidden value grants access, spends money or picks a recipient, it is `blocking`. Otherwise `should-fix`.

## Sorting

- Merge repeats into one finding with a count. When one finding's recovery lands in another, rank them together.
- Flag `system-caused` when the root is a token, preset or component (every menu opening on a slow preset). It merges every screen it hits, and its fix goes to the system.
- Taste goes to Left out. A deliberate departure, or a problem no criterion covers, goes to For a person to decide.

## Criteria

1. **The purpose is clear on arrival.** Title, main heading and primary action name the same task.
2. **One action leads.** The likeliest next step has the most visual weight, and no two actions compete for first.
3. **Visual order follows importance.** Blur the capture and name the one element that still reads first. None is a finding.
4. **Related things sit together.** A label sits closer to its own field than to the next one.
5. **Labels name the result.** A button says what happens when it is used. Nothing needs a tooltip or a guess.
6. **The user knows where they are.** The step, list item or section is visible, and so is the way back.
7. **The screen shows what is happening.** Loading, saving, success and failure look different, and feedback sits at its trigger. A copy shows a brief inline check on its button, not a notification. A form error marks the field itself. An optimistic update that fails puts the change back and says so where it happened.
8. **Mistakes are hard to make and easy to fix.** Irreversible actions ask for confirmation. Reversible ones offer undo, and a confirm on a reversible action is a note. Errors say what went wrong and how to fix it, next to the cause, and keep what was entered. A field shows the value that will be sent.
9. **The task asks for no more than it needs.** A value the app already knows is prefilled.
10. **It matches the rest of the product.** Patterns that look the same behave the same. A departure has a reason in code, a spec or a comment, or it is a finding. Optical misalignment and oversized icons are findings here.
11. **Content holds up at the extremes.** The longest realistic names, large numbers, translated text, missing values, very short content. Text the user chose to identify something, such as a name, wraps and never truncates (`trap/chosen-text-truncated`).
12. **It works at every reviewed width.** Nothing essential is cut off or hidden without a way to reach it. Controls stay reachable at 390 and at the widths where the layout switches.
13. **It answers the hand.** Every press shows feedback within 100 ms. Input motion tracks the pointer. Nothing waits on an animation before taking the next input. Focus and selection land where the hand expects. Evidence is measured, never a screenshot. Cite the trap, such as `trap/press-delayed` or `trap/motion-blocks-input`.

## Edge cases

Mark each shown or not shown. A case not shown is a question for the designer, not a mistake.

Empty. Loading, and slow loading. Error, including a failed save. Partial data. Long and very short content. Narrowest and widest width, and one where the layout switches. First use and a returning user with lots of data. No permission, or a read-only role. Offline. Success after the main action. An empty state that says what goes here and offers the first action. Stand-in content that is the kind of thing it stands for, at a realistic length. On touch: no hover that flashes or sticks, no input zoom on focus, no keyboard before the user asked. Motion: reduced motion on, the same action repeated quickly, a throttled CPU.

## What not to report

- Preferences no criterion supports.
- Token use, component choice or a spec's completeness. `design-how-token-mapping` and the project's check cover them. An installed system's rule is the exception because it is an agreed criterion.
- Rewritten copy. Flag the unclear text and say what is unclear.
- Code defects such as console errors. Mention once under For a person to decide so they reach QA.
- Motion that uses a named preset correctly and still looks wrong. Hand it over with a slow-playback capture.
