# Focus and keyboard

Focus rings, skip links, tabindex, focus trapping and the APG keyboard patterns.

## Focus rings

The browser shows `:focus-visible` for keyboard and assistive-tech focus. It suppresses it for mouse clicks on buttons and links but still shows it in text inputs. An `outline: none` or `focus:outline-none` with no visible replacement leaves sighted keyboard users with no way to see where they are.

The browser's unmodified indicator adapts to platform and forced-color settings without the author predicting every background. Adding only `outline-offset` preserves it. A custom `outline: 2px solid` with no color renders `currentColor`, which may fail against the colors the outline crosses. The preference order:

```css
/* Best: keep the browser ring, just give it breathing room */
:focus-visible {
  outline-offset: 2px;
}

/* Custom ring when the design requires one: use the project's verified token */
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

```tsx
// Tailwind: use the project's focus token or established focus-ring utility
<button className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]">
  Save
</button>
```

Check the whole perimeter of a custom indicator against every adjacent color it crosses. That means component fills, page surfaces, images, gradients and hover and selected states. A token, brand color or `currentColor` passes only when that rendered check does.

In `forced-colors: active` (Windows High Contrast), keep the default color adjustment or name a system color such as `Highlight`. `forced-color-adjust: none` freezes the authored color, so use it only where you have checked the control stays perceivable.

Group focus styles with `:focus-within` when a wrapper should light up while an inner input has focus, such as a search box with an icon inside the border.

## Focus not obscured

Sticky chrome hides whatever scrolls under it, including the element that just received focus. Pad the scroll container by the sticky element's height with `scroll-padding-block-start`, and by a sticky footer or cookie banner's height with `scroll-padding-block-end`. The recipe is `better-layout`'s.

## Skip link

Target `<main id="main">` and visually hide the link until focused:

```css
.skip-link {
  position: absolute;
  inset-inline-start: -999px;
}
.skip-link:focus {
  inset-inline-start: 16px;
  inset-block-start: 16px;
}
```

```html
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>…</header>
  <main id="main">…</main>
</body>
```

Give in-page anchor targets `scroll-margin-block-start`, such as `80px` under a sticky header, so the target isn't hidden when jumped to.

## tabindex rules

- `tabindex="0"`: adds an element to the natural tab order. Only for custom interactive elements that aren't natively focusable.
- `tabindex="-1"`: focusable via JavaScript only (`el.focus()`). Use for headings you move focus to, modal containers and roving-tabindex members.
- Positive `tabindex`: never. It hijacks the tab order for the whole page. Fix the DOM order instead.

### Roving tabindex

Composite widgets, meaning tabs, menus, toolbars and radio groups, occupy one Tab stop. The active item has `tabindex="0"`, all others `tabindex="-1"`, and arrow keys move both focus and the `0`:

```tsx
<div role="tablist">
  {tabs.map((tab, i) => (
    <button
      role="tab"
      tabIndex={i === activeIndex ? 0 : -1}
      aria-selected={i === activeIndex}
      onKeyDown={handleArrowKeys} // ArrowLeft/ArrowRight move activeIndex, wrapping
    >
      {tab.label}
    </button>
  ))}
</div>
```

A combobox keeps DOM focus in its input instead. Point `aria-activedescendant` on the input at the `id` of the highlighted option and update it on arrow keys.

## Focus trapping and restoration

Native `<dialog>` with `showModal()` makes everything behind it inert and closes on Escape:

```tsx
dialogRef.current.showModal(); // on open
dialogRef.current.close(); // on close
triggerRef.current?.focus(); // return focus to the element that opened it
```

A custom overlay that can't use `<dialog>` needs `role="dialog"`, `aria-modal="true"` and an accessible name via `aria-labelledby`. Put `inert` on everything behind it, which removes background content from the tab order and from assistive tech in one move:

```tsx
// On open
document.getElementById("app-content").inert = true;
const dialog = dialogRef.current;
(dialog.querySelector("[autofocus]") ??
  dialog.querySelector("button, [href], input, select, textarea"))?.focus();

// On close
document.getElementById("app-content").inert = false;
triggerRef.current?.focus();
```

Either way:

- On open, focus the first focusable element. For destructive confirmations, focus the least destructive action instead.
- On close, return focus to the trigger, or to the nearest logical container if the trigger is gone.

## Keyboard patterns (ARIA APG)

Native elements come with these behaviors; custom widgets must implement them.

| Widget | Keys |
| --- | --- |
| Dialog | Tab/Shift+Tab cycle inside (wrap at ends); Escape closes |
| Tabs | Arrow keys move between tabs (wrapping); Tab exits to the panel; Home/End jump to first/last |
| Menu button | Enter/Space/ArrowDown opens and focuses first item; ArrowUp opens and focuses last; arrows navigate; Escape closes and refocuses the button |
| Disclosure / accordion | Header is a `<button aria-expanded>`; Enter and Space toggle |
| Combobox | ArrowDown opens/moves into the list; Enter accepts; Escape closes and returns to the input; typing filters |
| Listbox / radio group | Arrow keys move selection; one Tab stop for the whole group |

Universal rules:

- Escape dismisses whatever opened last: tooltip, then menu, then dialog.
- Tabs choose activation mode: automatic (panel switches on arrow focus) when panels render instantly, manual (Enter/Space to activate) when switching is expensive.
- Enter in a single-line text input submits its form natively. In `<textarea>`, Enter inserts a newline, and ⌘/Ctrl+Enter submits only if you implement it.

## SPA route changes

Client-side navigation doesn't reset focus or announce anything. On route change, update `document.title` to match the new context, then move focus to the new view's `<h1>` (given `tabindex="-1"`) or to `<main>`. Restore scroll position on history traversal with back and forward, and scroll to top on a new navigation.
