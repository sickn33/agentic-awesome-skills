# Component-Applicable UI State & Accessibility Matrix

A frequent failure mode in AI-generated user interfaces is applying an uncalibrated checklist: either generating only the "happy path" (neglecting loading, empty, and error states), or forcing irrelevant states onto components where they make no sense (such as demanding an "empty state" for a simple button).

This matrix defines the **applicable interaction states by component archetype**, alongside required visual treatments and **WCAG 2.2 accessibility attributes**.

---

## 1. Interaction States by Component Archetype

| Component Archetype | Applicable States | Irrelevant / Excluded States | Key Accessibility Attributes |
| :--- | :--- | :--- | :--- |
| **Interactive Triggers**<br>(Button, IconButton, Tab, Segmented Control) | • Default<br>• Hover<br>• Focus-Visible<br>• Active / Pressed<br>• Disabled<br>• Loading / Spinner | • Empty<br>• Error (handled by enclosing form/toast) | `disabled`, `aria-disabled="true"`, `aria-busy="true"`, `:focus-visible` ring |
| **Data Displays & Collections**<br>(Data Table, Metric Grid, Card Feed, List) | • Default (Populated)<br>• Loading (Skeleton matching dimensions)<br>• Empty (Zero records in system)<br>• Filtered-Empty (0 search results)<br>• Error (Fetch failed + Retry CTA)<br>• Partial / Degraded | • Active / Pressed<br>• Hover (unless interactive rows)<br>• Disabled | `aria-busy="true"`, `role="status"` on empty, `role="alert"` on fetch error |
| **Input & Form Controls**<br>(Text Input, Select, Textarea, Combobox) | • Default (Empty/Placeholder)<br>• Hover<br>• Focus-Visible<br>• Filled / Valid<br>• Disabled<br>• Read-Only<br>• Validation Error (inline message) | • Loading Skeleton (form fields remain visible)<br>• Empty State Illustration | `aria-invalid="true"`, `aria-describedby="[id]"`, `aria-required="true"`, `aria-disabled="true"` |
| **Modal Overlays**<br>(Modal Dialog, Sheet Drawer) | • Closed / Exited<br>• Opening / Enter Transition<br>• Opened (Focus Trapped within modal)<br>• Closing / Exit Transition<br>• Dismissed via Escape key / Backdrop click | • Disabled overlay root<br>• Empty overlay (must not mount blank) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus trap within modal container, focus restored to trigger on close |
| **Non-Modal Dialogs**<br>(Floating Inspector, Docked Panel, Chat Window) | • Closed / Minimized<br>• Opened (Page remains interactive; no focus trap)<br>• Resized / Dragged<br>• Dismissed via Close CTA or Escape | • Focus trap (must NOT trap focus)<br>• Modal backdrop / `inert` document | `role="dialog"`, `aria-modal="false"` (or omitted), `aria-labelledby`, no focus trap (allows Tab to exit into background document) |
| **Popovers & Disclosures**<br>(Context Card, Tooltip-Popover, Date Picker Popup) | • Closed<br>• Opened (Light dismiss on click-outside or Escape)<br>• Closing | • Focus trap (must NOT trap focus)<br>• `aria-modal="true"`<br>• Blocking backdrop | Native HTML `popover="auto"` or `aria-expanded` + `aria-controls` on trigger; no focus trap; Escape key closes and returns focus to trigger |
| **Dropdown & Context Menus**<br>(Action Menu, Select Options, Context Menu) | • Closed<br>• Opened<br>• Focused item (Active descendant or roving tabindex)<br>• Submenu opened<br>• Dismissed via Escape, Tab, or item activation | • Focus trap (Tab exits menu naturally)<br>• `aria-modal="true"` | `role="menu"`, items `role="menuitem"`, Arrow Up/Down navigation, Home/End keys, Tab exits and closes menu, Escape closes and focuses trigger |
| **Multi-Step Forms & Async Flows**<br>(Onboarding Wizard, Multi-Step Checkout, File Uploader) | • Step In-Progress<br>• Step Completed<br>• Validation Blocked<br>• Async Submitting<br>• Network Error / Offline<br>• Final Success / Receipt | • Keyboard focus trap (in-page forms must NEVER trap focus)<br>• Read-only wizard | `aria-current="step"`, `role="progressbar"`, programmatic focus shift to first interactive input of new step, transient in-memory recovery (no sensitive data in `sessionStorage`) |

---

## 2. Deep-Dive State Specifications & Accessibility Mappings

### A. Focus-Visible (Keyboard Accessibility Invariant)
**Strict Requirement**: Mouse clicks should not show an aggressive focus ring, but keyboard navigation (Tab key) must always render an unmistakable high-contrast ring.

```css
/* Standard Focus-Visible Token */
.focus-ring {
  outline: none;
}
.focus-ring:focus-visible {
  outline: 2px solid var(--ring, #2563EB);
  outline-offset: 2px;
}
```
In Tailwind CSS: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`

### B. Loading Skeletons vs Generic Spinners
For data tables, cards, and feeds, **never** replace the entire interface with a centered spinner (which causes severe Cumulative Layout Shift - CLS). Always render layout-matching shimmer skeletons:

```tsx
// Shimmer Skeleton Pattern
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3" role="status" aria-label="Loading table data" aria-busy="true">
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`th-${i}`} className="h-4 bg-muted animate-pulse rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className="flex gap-4 py-2 border-b border-border/50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`td-${r}-${c}`} className="h-4 bg-muted/60 animate-pulse rounded flex-1" />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading records...</span>
    </div>
  );
}
```

### C. Empty States: System Empty vs Search Filter Empty
Distinguish between:
1. **System Empty**: The database has 0 items. Guide the user to create the first record:
   - Provide an illustrative SVG/icon, a descriptive headline ("No incidents recorded"), and a primary CTA ("Create Incident").
2. **Search / Filter Empty**: The database has records, but current search query or filter tags matched 0 items:
   - Provide a reset action ("No results matching 'keyword'. [Clear Filters]").

### D. Validation Error States (WCAG 3.3.1 & 3.3.2)
When an input fails validation:
1. Border changes to destructive color (`border-destructive`).
2. Input element must carry `aria-invalid="true"`.
3. An explicit error message is displayed directly adjacent to the input.
4. Error message has an ID referenced by `aria-describedby` on the input:

```tsx
<div className="space-y-1.5">
  <label htmlFor="email-input" className="text-sm font-medium text-foreground">
    Work Email <span className="text-destructive">*</span>
  </label>
  <input
    id="email-input"
    type="email"
    name="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
    aria-required="true"
    className={`w-full px-3 py-2 rounded-md border text-sm transition-colors ${
      errors.email ? 'border-destructive focus-visible:ring-destructive' : 'border-input focus-visible:ring-ring'
    }`}
  />
  {errors.email && (
    <p id="email-error" role="alert" className="text-xs text-destructive flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{errors.email}</span>
    </p>
  )}
</div>
```

### E. Error & Recovery State for Async Views
When a network fetch or data mutation fails:
- Display a contextual alert banner (`role="alert"`, `aria-live="assertive"`).
- Explain what happened in human-readable terms.
- Provide an immediate "Retry" button that re-executes the fetch handler.
- Keep previous cached data visible where possible (stale-while-revalidate), rather than replacing the screen with a blank error page.

### F. Overlay & Disclosure Semantics: Modal vs Non-Modal vs Popover vs Menu
Never treat all floating panels identically. Applying `aria-modal="true"` or keyboard traps to popovers or dropdown menus breaks standard keyboard navigation:

1. **Modal Dialogs & Modal Sheets (`role="dialog"`, `aria-modal="true"`)**:
   - **When to use**: Blocking flows requiring explicit user completion or dismissal before returning to the underlying page (e.g., confirmations, destructive actions, checkout modals).
   - **Focus Containment**: Focus MUST be trapped within the dialog container while mounted (`Tab` cycles through dialog controls only).
   - **Background Inertness**: The rest of the document must be marked `inert` or `aria-hidden="true"`.
   - **Dismissal & Restoration**: Pressing `Escape` or clicking the backdrop dismisses the dialog. Focus MUST be programmatically restored to the trigger element that opened it.

2. **Non-Modal Dialogs (`role="dialog"`, `aria-modal="false"`)**:
   - **When to use**: Floating palettes, docked video players, floating inspectors, or scratchpads where the user needs to interact with both the dialog and background page content simultaneously.
   - **Focus Containment**: Focus MUST NOT be trapped. Pressing `Tab` must allow the user to navigate out of the dialog into the rest of the document.
   - **Dismissal**: Provide an explicit close button. Do NOT mark the background document `inert`.

3. **Popovers & Disclosures (`popover="auto"` or `aria-expanded` + `aria-controls`)**:
   - **When to use**: Rich tooltips, contextual info cards, filter flyouts, date picker popups.
   - **Focus Containment**: Focus is NOT trapped. Popovers rely on native "light dismiss" (closing on click-outside or `Escape`).
   - **Semantics**: Do not use `role="dialog"` or `aria-modal="true"`. Use native HTML `popover="auto"` or pair the trigger's `aria-expanded="true|false"` with `aria-controls="[popover-id]"`.

4. **Dropdown & Context Menus (`role="menu"`, `role="menuitem"`)**:
   - **When to use**: Action menus, navigation dropdowns, context menus.
   - **Keyboard Navigation**: Use roving `tabindex` or `aria-activedescendant`. Arrow keys (`ArrowUp` / `ArrowDown`) navigate between menu items.
   - **Tab Key Handling**: The `Tab` key MUST NOT cycle within the menu; pressing `Tab` immediately closes the menu and advances focus to the next sequential interactive element in the document.
   - **Dismissal**: `Escape` closes the menu and returns focus to the menu trigger button.

### G. In-Page Multi-Step Form Navigation & Privacy-Conscious Recovery

1. **No Focus Traps in In-Page Forms (WCAG 2.1.2)**:
   - In-page multi-step forms live in the regular document flow and MUST NOT trap keyboard focus. Users must remain free to Tab to page headers, skip links, main navigation, and help resources.
   - **Step Transitions**: When advancing from Step $N$ to Step $N+1$, programmatically move focus to the step heading (`<h2 tabIndex={-1}>`) or the first interactive input of the new step:
   ```tsx
   // Focus management upon step transition
   const stepHeaderRef = useRef<HTMLHeadingElement>(null);
   useEffect(() => {
     stepHeaderRef.current?.focus();
   }, [currentStep]);
   ```

2. **Privacy-Conscious Form Recovery**:
   - **Zero Sensitive Data in Web Storage**: Never write unencrypted sensitive financial or personal data (IBANs, routing numbers, credit card numbers, tax IDs, passwords) to `localStorage` or `sessionStorage`. Both storage APIs are accessible to any running script and vulnerable to XSS.
   - **Transient In-Memory State**: Maintain form drafts in React component state or context memory during the active user session.
   - **Network Timeout & Error Recovery**: If an API submission times out, keep the in-memory draft intact, mask displayed sensitive fields (e.g. `•••• •••• •••• 1234`), render a contextual banner with a "Retry Submission" button, and prompt for re-authentication if the user session has expired.
