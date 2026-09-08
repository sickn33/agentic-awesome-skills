---
name: radix-ui-design-system
description: "Build accessible design systems with Radix UI primitives. Headless component customization, theming strategies, and compound component patterns for production-grade UI libraries."
risk: safe
source: self
date_added: "2026-02-27"
---

# Radix UI Design System

Build production-ready, accessible design systems using Radix UI primitives with full customization control and zero style opinions.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Creating a custom design system from scratch
- Building accessible UI component libraries
- Implementing complex interactive components (Dialog, Dropdown, Tabs, etc.)
- Migrating from styled component libraries to unstyled primitives
- Setting up theming systems with CSS variables or Tailwind
- Need full control over component behavior and styling
- Building applications requiring WCAG 2.1 AA/AAA compliance

## Do not use this skill when

- You need pre-styled components out of the box (use shadcn/ui, Mantine, etc.)
- Building simple static pages without interactivity
- The project doesn't use React 16.8+ (Radix requires hooks)
- You need components for frameworks other than React

---

## Real-World Examples

### Example 1: Command Palette (Combo Dialog)

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Command>
            <Command.Input placeholder="Type a command..." />
            <Command.List>
              <Command.Empty>No results found.</Command.Empty>
              <Command.Group heading="Suggestions">
                <Command.Item>Calendar</Command.Item>
                <Command.Item>Search Emoji</Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Example 2: Dropdown Menu with Icons

```tsx
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';

export function ActionsMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-button" aria-label="Actions">
          <DotsHorizontalIcon />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" align="end">
          <DropdownMenu.Item className="dropdown-item">
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item">
            Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="dropdown-separator" />
          <DropdownMenu.Item className="dropdown-item text-red-500">
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

### Example 3: Form with Radix Select + React Hook Form

```tsx
import * as Select from '@radix-ui/react-select';
import { useForm, Controller } from 'react-hook-form';

interface FormData {
  country: string;
}

export function CountryForm() {
  const { control, handleSubmit } = useForm<FormData>();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <Controller
        name="country"
        control={control}
        render={({ field }) => (
          <Select.Root onValueChange={field.onChange} value={field.value}>
            <Select.Trigger className="select-trigger">
              <Select.Value placeholder="Select a country" />
              <Select.Icon />
            </Select.Trigger>
            
            <Select.Portal>
              <Select.Content className="select-content">
                <Select.Viewport>
                  <Select.Item value="us">United States</Select.Item>
                  <Select.Item value="ca">Canada</Select.Item>
                  <Select.Item value="uk">United Kingdom</Select.Item>
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
