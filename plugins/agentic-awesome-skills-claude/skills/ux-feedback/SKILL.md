---
name: ux-feedback
description: Add appropriate user feedback states (loading, success, error, empty) to a component or page
risk: unknown
source: https://github.com/bitjaru/styleseed/tree/main/engine/.claude/skills/ss-feedback
source_repo: bitjaru/styleseed
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/bitjaru/styleseed/blob/main/LICENSE
---

# UX Feedback States Generator
## When to Use

Use this skill when you need add appropriate user feedback states (loading, success, error, empty) to a component or page.


## When NOT to use

- For only the words inside a state → use `/ss-copy`
- For accessibility issues in existing states → use `/ss-a11y`
- For brand-new component creation → use `/ss-component`
- For analytics or error-logging plumbing — UI presentation only

Target: **$ARGUMENTS**

## Instructions

1. Read the target file and identify all data-dependent areas.

2. Read the design language reference:
   - `DESIGN-LANGUAGE.md` sections on Loading States (Skeleton), Empty States, Error States

3. For each data-dependent area, implement ALL 4 states:

### State 1: Loading (Skeleton)
```tsx
// Skeleton must match the final layout shape
<div className="bg-card rounded-2xl p-6 shadow-[var(--shadow-card)]">
  <div className="flex items-center gap-2 mb-3">
    <div className="size-7 bg-surface-muted rounded-lg animate-pulse" />
    <div className="h-3 w-16 bg-surface-muted rounded animate-pulse" />
  </div>
  <div className="h-9 w-24 bg-surface-muted rounded-lg animate-pulse mb-3" />
  <div className="h-3 w-12 bg-surface-muted rounded animate-pulse" />
</div>
```
Rules:
- Show skeleton for 300ms minimum (prevent flash)
- Delay skeleton display by 300ms (fast loads skip skeleton entirely)
- Use `animate-pulse` (1.5s cycle)
- Match skeleton shapes to real content dimensions
- Never use spinners inside cards

### State 2: Empty (Zero Data)
```tsx
<EmptyState
  icon={PackageIcon}
  title="No activity yet"
  description="Create your first project to get started."
  action={<Button>Create Project</Button>}
/>
```
Rules:
- Center-aligned in the card
- Icon: 32px, `text-text-tertiary`
- Title: 14px, `text-text-secondary`
- Always suggest a next action
- Zero values show as "0" (don't hide or dash)

### State 3: Error (Load Failed)
```tsx
<div className="flex flex-col items-center justify-center py-8 text-center">
  <AlertCircle className="size-8 text-destructive mb-3" />
  <p className="text-[14px] text-text-secondary mb-4">Couldn't load the data</p>
  <Button variant="brandGhost" size="sm" onClick={retry}>Try again</Button>
</div>
```
Rules:
- Partial failure: only affected card shows error, rest loads normally
- Full page failure: full-screen EmptyState with retry
- Error message: plain language, blame the system
- Always provide retry button

### State 4: Success (Action Feedback)
```tsx
// Toast notification for action confirmations
toast("Changes saved")

// With undo for destructive actions
toast("Item deleted", { action: { label: "Undo", onClick: handleUndo } })
```
Rules:
- Info toast: 3s display
- Action toast (with undo): 5s display
- Toast position: above BottomNav
- One toast at a time (new replaces old)

4. Implementation pattern:
```tsx
function DataCard({ data, isLoading, error }) {
  if (isLoading) return <DataCardSkeleton />
  if (error) return <DataCardError onRetry={refetch} />
  if (!data || data.length === 0) return <DataCardEmpty />
  return <DataCardContent data={data} />
}
```

5. Check `prefers-reduced-motion` — disable `animate-pulse` when reduced motion is preferred.

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
