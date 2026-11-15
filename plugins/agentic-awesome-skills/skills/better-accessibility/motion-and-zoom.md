# Motion and zoom

`prefers-reduced-motion`, timed UI, zoom and reflow.

## prefers-reduced-motion

Wrap animations in `@media (prefers-reduced-motion: no-preference)`, so users who asked for reduced motion get the static version without an override per animation.

```css
/* Good: motion is opt-in */
.card {
  /* static styles */
}
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 200ms ease-out;
  }
}
```

```tsx
// Tailwind: motion-safe / motion-reduce variants
<div className="motion-safe:transition-transform motion-safe:hover:-translate-y-1" />
```

### What to disable vs reduce

Reduced motion targets vestibular triggers, not feedback.

| Disable entirely | Replace | Keep |
| --- | --- | --- |
| Parallax scrolling | Slide/scale/zoom transitions → opacity cross-fade | Loading spinners and progress |
| Autoplaying video, GIFs, looping decoration | Smooth scrolling → instant jump | Instant state changes (hover color, focus ring) |
| Spinning, large-scale movement across the screen | Auto-rotating carousels → start paused | Brief functional feedback (button press) |

## Autoplay and timed UI

- **Visible controls on anything that moves on its own** (2.2.2). Anything moving, blinking or updating on its own for more than 5 seconds needs a visible pause or stop control, muted looping hero videos included.
- **Explicit dismissal over timers.** Auto-dismissal suits low-stakes confirmations and nothing else. A toast carrying an action, an error or information the user may need stays until dismissed.
- **Pause on attention.** Where a toast must time out, give it at least 5 seconds, and pause the timer while it is hovered or focused.
- **Never put critical information only in a timed element.** A vanished toast with the only link to an undo action is data loss on a schedule.

## Zoom and reflow

- **200% text resize** (1.4.4). All content and functionality survives text scaled to 200%.
- **Reflow at 320px** (1.4.10). At 400% zoom on a 1280px viewport, equivalent to a 320px one, the page must work with vertical scrolling alone. Genuinely 2D content is the exception: tables, maps and code blocks scroll inside their own container.

Write media queries in `rem` or `em` where the codebase allows. At a larger browser font size such a query switches to the narrow layout when the text needs it, and a `px` query does not. Breakpoint placement belongs to `better-layout`.
