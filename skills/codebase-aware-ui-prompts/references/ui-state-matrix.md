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
| **Overlays & Dialogs**<br>(Modal Dialog, Sheet Drawer, Popover, Menu) | • Closed / Exited<br>• Opening / Enter Transition<br>• Opened (Focus Trapped)<br>• Closing / Exit Transition<br>• Dismissed via Escape key / Backdrop | • Disabled overlay root<br>• Empty overlay (must not mount blank) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus trap |
| **Multi-Step & Async Flows**<br>(Checkout Wizard, Multi-File Uploader) | • Step In-Progress<br>• Step Completed<br>• Validation Blocked<br>• Async Submitting<br>• Network Error / Offline<br>• Final Success / Receipt | • Read-only wizard | `aria-current="step"`, `role="progressbar"`, `aria-valuenow`, `role="alert"` |

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
