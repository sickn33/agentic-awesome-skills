# The switcher

The control that switches states. It sits beside the thing being judged, so build the spec below and leave it alone.

## Deliberately outside the design system

Never style the switcher with the project's tokens, fonts or colors. One that looks native to the product becomes part of what you are looking at.

One dark neutral surface, the system font stack and no project variables. It does not follow the theme, because dark reads as chrome over both light and dark pages.

## A grouped list, so it scales

States sit in a vertical list under the group headings from **Find the states in the code**. A row of tabs runs off the screen past about seven states; a grouped list stays scannable at thirty.

- Every group has a heading, even when there is only one, and every heading carries the same small arrow icon.
- States and groups keep the order they were written down in.

## Behavior

- It sets a `__state` search param and reads the active state back from it. The URL is the source of truth, so every state is a link.
- The arrow keys, up and down or left and right, step through every state in list order, across groups.
- `H` hides and shows the switcher, list and select alike, for screenshots and screen recordings.
- Key handling ignores events with a modifier key, events already `defaultPrevented` and events from inputs, textareas, selects and contenteditable elements.
- The active button carries `aria-pressed="true"` and scrolls into view inside the list. The list carries a label, and each group is a `role="group"` labelled by its heading.
- The component switches instantly and keeps the scroll position. Only the active label eases its font weight.
- The list and the select are both always rendered, and a container query shows one, so the active state survives a resize.

## Structure

```html
<div class="state-page">
  <div class="state-layout">
    <nav class="state-switcher" aria-label="States">
      <!-- one group per heading -->
      <div class="state-switcher-group" role="group" aria-labelledby="states-data">
        <span class="state-switcher-heading" id="states-data">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v4a3 3 0 0 0 3 3h7" /><path d="m10 7 3 3-3 3" /></svg>
          Data
        </span>
        <button type="button" data-state="loading" aria-pressed="false">Loading</button>
        <button type="button" data-state="empty" aria-pressed="true">Empty</button>
      </div>
    </nav>

    <div class="state-switcher-select">
      <select aria-label="State">
        <optgroup label="Data">
          <option value="loading">Loading</option>
          <option value="empty" selected>Empty</option>
        </optgroup>
      </select>
      <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4" /></svg>
    </div>

    <div class="state-stage">
      <!-- the component, in a container as wide as it is in production -->
    </div>
  </div>
</div>
```

## Placement and styling

A container query on the page picks the layout:

- **Room for the list beside the component:** two columns, the list then the component at its production width. The list is sticky and scrolls inside itself once it outgrows the viewport, so it stays put while you flip states.
- **No room:** the select sits above the component, in the page flow. A phone opens its native menu for it, which suits a long list.

The page spans the full viewport width, because an app's layout often caps content near the component's own width. The query measures the page inside its padding, so the breakpoint is the list and the gap plus the component, which is 232px plus the production width. The CSS below uses a 644px component. Put the production width in `max-width` and the grid column, and set the query to 232px plus it.

The list's 6px padding keeps its own scrolling from clipping focus rings. The reset strips the select's native arrow, so the chevron is what shows it opens.

```css
.state-page {
  container: state-page / inline-size;
  margin-inline: calc(50% - 50vw);
  padding: 24px;
}

.state-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 644px;
  margin-inline: auto;
}

.state-switcher {
  all: unset;
  display: none;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  scrollbar-width: none;
  padding: 6px;
  border-radius: 14px;
  background: rgb(20 20 20 / 0.92);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  font: 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  user-select: none;
}

.state-switcher-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.state-switcher-heading {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 6px;
  font-size: 11px;
  font-weight: 500;
  color: rgb(255 255 255 / 0.45);
}

.state-switcher button {
  all: unset;
  flex: none;
  padding: 8px 10px;
  border-radius: 8px;
  font: inherit;
  color: rgb(255 255 255 / 0.6);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 200ms ease-out;
}

.state-switcher button:hover {
  color: rgb(255 255 255 / 0.85);
}

.state-switcher button[aria-pressed="true"] {
  background: rgb(255 255 255 / 0.14);
  color: rgb(255 255 255);
}

.state-switcher button:focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.7);
  outline-offset: 2px;
}

.state-switcher-select {
  position: relative;
  align-self: flex-start;
  max-width: 100%;
  color: rgb(255 255 255);
}

.state-switcher-select select {
  all: unset;
  box-sizing: border-box;
  max-width: 100%;
  padding: 10px 36px 10px 16px;
  border-radius: 999px;
  background: rgb(20 20 20 / 0.92);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.1);
  font: 500 13px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  cursor: pointer;
}

.state-switcher-select select:focus-visible {
  outline: 2px solid rgb(255 255 255 / 0.7);
  outline-offset: 2px;
}

.state-switcher-select svg {
  position: absolute;
  top: 50%;
  right: 14px;
  translate: 0 -50%;
  pointer-events: none;
  color: rgb(255 255 255 / 0.6);
}

/* 208px list + 24px gap + 644px component */
@container state-page (min-width: 876px) {
  .state-layout {
    display: grid;
    grid-template-columns: 208px 644px;
    justify-content: center;
    gap: 24px;
    align-items: start;
    max-width: none;
  }

  .state-switcher {
    display: flex;
    position: sticky;
    top: 24px;
  }

  .state-switcher-select {
    display: none;
  }
}
```

`all: unset` keeps the project's global button, nav and select styles out. In a framework, keep the class names and the structure and change only the rendering syntax.
