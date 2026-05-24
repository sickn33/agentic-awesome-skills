---
id: 'radix-ui-design-system'
name: radix-ui-design-system
description: "Build accessible design systems with Radix UI primitives. Headless component customization, theming strategies, and compound component patterns for production-grade UI libraries."
risk: safe
source: self
date_added: "2026-02-27"
category: frontend-frameworks
tags:
- css
- frontend
- html
- react
- tailwind
- ui
tools:
- claude-code
author: 'emanueleodierna'
---

# Radix UI Design System

Build production-ready, accessible design systems using Radix UI primitives with full customization control and zero style opinions.

## Overview

Radix UI provides unstyled, accessible components (primitives) that you can customize to match any design system. This skill guides you through building scalable component libraries with Radix UI, focusing on accessibility-first design, theming architecture, and composable patterns.

**Key Strengths:**
- **Headless by design**: Full styling control without fighting defaults
- **Accessibility built-in**: WAI-ARIA compliant, keyboard navigation, screen reader support
- **Composable primitives**: Build complex components from simple building blocks
- **Framework agnostic**: Works with React, but styles work anywhere

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

## Core Principles

### 1. Accessibility First

Every Radix primitive is built with accessibility as the foundation:

- **Keyboard Navigation**: Full keyboard support (Tab, Arrow keys, Enter, Escape)
- **Screen Readers**: Proper ARIA attributes and live regions
- **Focus Management**: Automatic focus trapping and restoration
- **Disabled States**: Proper handling of disabled and aria-disabled

**Rule**: Never override accessibility features. Enhance, don't replace.

### 2. Headless Architecture

Radix provides **behavior**, you provide **appearance**:

```tsx
// ❌ Don't fight pre-styled components
<Button className="override-everything" />

// ✅ Radix gives you behavior, you add styling
<Dialog.Root>
  <Dialog.Trigger className="your-button-styles" />
  <Dialog.Content className="your-modal-styles" />
</Dialog.Root>
```

### 3. Composition Over Configuration

Build complex components from simple primitives:

```tsx
// Primitive components compose naturally
<Tabs.Root>
  <Tabs.List>
    <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs.Root>
```

---

## Getting Started

### Installation

```bash
# Install individual primitives (recommended)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Or install multiple at once
npm install @radix-ui/react-{dialog,dropdown-menu,tabs,tooltip}

# For styling (optional but common)
npm install clsx tailwind-merge class-variance-authority
```

### Basic Component Pattern

Every Radix component follows this pattern:

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function MyDialog() {
  return (
    <Dialog.Root>
      {/* Trigger the dialog */}
      <Dialog.Trigger asChild>
        <button className="trigger-styles">Open</button>
      </Dialog.Trigger>

      {/* Portal renders outside DOM hierarchy */}
      <Dialog.Portal>
        {/* Overlay (backdrop) */}
        <Dialog.Overlay className="overlay-styles" />
        
        {/* Content (modal) */}
        <Dialog.Content className="content-styles">
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          
          {/* Your content here */}
          
          <Dialog.Close asChild>
            <button>Close</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Theming Strategies

### Strategy 1: CSS Variables (Framework-Agnostic)

**Best for**: Maximum portability, SSR-friendly

```css
/* globals.css */
:root {
  --color-primary: 220 90% 56%;
  --color-surface: 0 0% 100%;
  --radius-base: 0.5rem;
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}

[data-theme="dark"] {
  --color-primary: 220 90% 66%;
  --color-surface: 222 47% 11%;
}
```

```tsx
// Component.tsx
<Dialog.Content 
  className="
    bg-[hsl(var(--color-surface))]
    rounded-[var(--radius-base)]
    shadow-[var(--shadow-lg)]
  "
/>
```

### Strategy 2: Tailwind + CVA (Class Variance Authority)

**Best for**: Tailwind projects, variant-heavy components

```tsx
// button.tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function Button({ variant, size, children }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }))}>
      {children}
    </button>
  );
}
```

### Strategy 3: Stitches (CSS-in-JS)

**Best for**: Runtime theming, scoped styles

```tsx
import { styled } from '@stitches/react';
import * as Dialog from '@radix-ui/react-dialog';

const StyledContent = styled(Dialog.Content, {
  backgroundColor: '$surface',
  borderRadius: '$md',
  padding: '$6',
  
  variants: {
    size: {
      small: { width: '300px' },
      medium: { width: '500px' },
      large: { width: '700px' },
    },
  },
  
  defaultVariants: {
    size: 'medium',
  },
});
```

---

## Component Patterns

### Pattern 1: Compound Components with Context

**Use case**: Share state between primitive parts

```tsx
// Select.tsx
import * as Select from '@radix-ui/react-select';
import { CheckIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export function CustomSelect({ items, placeholder, onValueChange }) {
  return (
    <Select.Root onValueChange={onValueChange}>
      <Select.Trigger className="select-trigger">
        <Select.Value placeholder={placeholder} />
        <Select.Icon>
          <ChevronDownIcon />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content className="select-content">
          <Select.Viewport>
            {items.map((item) => (
              <Select.Item 
                key={item.value} 
                value={item.value}
                className="select-item"
              >
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator>
                  <CheckIcon />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
```

### Pattern 2: Polymorphic Components with `asChild`

**Use case**: Render as different elements without losing behavior

```tsx
// ✅ Render as Next.js Link but keep Radix behavior
<Dialog.Trigger asChild>
  <Link href="/settings">Open Settings</Link>
</Dialog.Trigger>

// ✅ Render as custom component
<DropdownMenu.Item asChild>
  <YourCustomButton icon={<Icon />}>Action</YourCustomButton>
</DropdownMenu.Item>
```

**Why `asChild` matters**: Prevents nested button/link issues in accessibility tree.

### Pattern 3: Controlled vs Uncontrolled

```tsx
// Uncontrolled (Radix manages state)
<Tabs.Root defaultValue="tab1">
  <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
</Tabs.Root>

// Controlled (You manage state)
const [activeTab, setActiveTab] = useState('tab1');

<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
  <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
</Tabs.Root>
```

**Rule**: Use controlled when you need to sync with external state (URL, Redux, etc.).

### Pattern 4: Animation with Framer Motion

```tsx
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';

export function AnimatedDialog({ open, onOpenChange }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="dialog-overlay"
                />
              </Dialog.Overlay>
              
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="dialog-content"
                >
                  {/* Content */}
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## Common Primitives Reference

### Dialog (Modal)

```tsx
<Dialog.Root> {/* State container */}
  <Dialog.Trigger /> {/* Opens dialog */}
  <Dialog.Portal> {/* Renders in portal */}
    <Dialog.Overlay /> {/* Backdrop */}
    <Dialog.Content> {/* Modal content */}
      <Dialog.Title /> {/* Required for a11y */}
      <Dialog.Description /> {/* Required for a11y */}
      <Dialog.Close /> {/* Closes dialog */}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### Dropdown Menu

```tsx
<DropdownMenu.Root>
  <DropdownMenu.Trigger />
  <DropdownMenu.Portal>
    <DropdownMenu.Content>
      <DropdownMenu.Item />
      <DropdownMenu.Separator />
      <DropdownMenu.CheckboxItem />
      <DropdownMenu.RadioGroup>
        <DropdownMenu.RadioItem />
      </DropdownMenu.RadioGroup>
      <DropdownMenu.Sub> {/* Nested menus */}
        <DropdownMenu.SubTrigger />
        <DropdownMenu.SubContent />
      </DropdownMenu.Sub>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

### Tabs

```tsx
<Tabs.Root defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1" />
    <Tabs.Trigger value="tab2" />
  </Tabs.List>
  <Tabs.Content value="tab1" />
  <Tabs.Content value="tab2" />
</Tabs.Root>
```

### Tooltip

```tsx
<Tooltip.Provider delayDuration={200}>
  <Tooltip.Root>
    <Tooltip.Trigger />
    <Tooltip.Portal>
      <Tooltip.Content side="top" align="center">
        Tooltip text
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

### Popover

```tsx
<Popover.Root>
  <Popover.Trigger />
  <Popover.Portal>
    <Popover.Content side="bottom" align="start">
      Content
      <Popover.Arrow />
      <Popover.Close />
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
```

---

## Accessibility Checklist

### Every Component Must Have:

- [ ] **Focus Management**: Visible focus indicators on all interactive elements
- [ ] **Keyboard Navigation**: Full keyboard support (Tab, Arrows, Enter, Esc)
- [ ] **ARIA Labels**: Meaningful labels for screen readers
- [ ] **Color Contrast**: WCAG AA minimum (4.5:1 for text, 3:1 for UI)
- [ ] **Error States**: Clear error messages with `aria-invalid` and `aria-describedby`
- [ ] **Loading States**: Proper `aria-busy` during async operations

### Dialog-Specific:
- [ ] `Dialog.Title` is present (required for screen readers)
- [ ] `Dialog.Description` provides context
- [ ] Focus trapped inside modal when open
- [ ] Escape key closes dialog
- [ ] Focus returns to trigger on close

### Dropdown-Specific:
- [ ] Arrow keys navigate items
- [ ] Type-ahead search works
- [ ] First/last item wrapping behavior
- [ ] Selected state indicated visually and with ARIA

---

## Best Practices

### ✅ Do This

1. **Always use `asChild` to avoid wrapper divs**
   ```tsx
   <Dialog.Trigger asChild>
     <button>Open</button>
   </Dialog.Trigger>
   ```

2. **Provide semantic HTML**
   ```tsx
   <Dialog.Content asChild>
     <article role="dialog" aria-labelledby="title">
       {/* content */}
     </article>
   </Dialog.Content>
   ```

3. **Use CSS variables for theming**
   ```css
   .dialog-content {
     background: hsl(var(--surface));
     color: hsl(var(--on-surface));
   }
   ```

4. **Compose primitives for complex components**
   ```tsx
   function CommandPalette() {
     return (
       <Dialog.Root>
         <Dialog.Content>
           <Combobox /> {/* Radix Combobox inside Dialog */}
         </Dialog.Content>
       </Dialog.Root>
     );
   }
   ```

### ❌ Don't Do This

1. **Don't skip accessibility parts**
   ```tsx
   // ❌ Missing Title and Description
   <Dialog.Content>
     <div>Content</div>
   </Dialog.Content>
   ```

2. **Don't fight the primitives**
   ```tsx
   // ❌ Overriding internal behavior
   <Dialog.Content onClick={(e) => e.stopPropagation()}>
   ```

3. **Don't mix controlled and uncontrolled**
   ```tsx
   // ❌ Inconsistent state management
   <Tabs.Root defaultValue="tab1" value={activeTab}>
   ```

4. **Don't ignore keyboard navigation**
   ```tsx
   // ❌ Disabling keyboard behavior
   <DropdownMenu.Item onKeyDown={(e) => e.preventDefault()}>
   ```

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

## Troubleshooting

### Problem: Dialog doesn't close on Escape key

**Cause**: `onEscapeKeyDown` event prevented or `open` state not synced

**Solution**:
```tsx
<Dialog.Root open={open} onOpenChange={setOpen}>
  {/* Don't prevent default on escape */}
</Dialog.Root>
```

### Problem: Dropdown menu positioning is off

**Cause**: Parent container has `overflow: hidden` or transform

**Solution**:
```tsx
// Use Portal to render outside overflow container
<DropdownMenu.Portal>
  <DropdownMenu.Content />
</DropdownMenu.Portal>
```

### Problem: Animations don't work

**Cause**: Portal content unmounts immediately

**Solution**:
```tsx
// Use forceMount + AnimatePresence
<Dialog.Portal forceMount>
  <AnimatePresence>
    {open && <Dialog.Content />}
  </AnimatePresence>
</Dialog.Portal>
```

### Problem: TypeScript errors with `asChild`

**Cause**: Type inference issues with polymorphic components

**Solution**:
```tsx
// Explicitly type your component
<Dialog.Trigger asChild>
  <button type="button">Open</button>
</Dialog.Trigger>
```

---

## Performance Optimization

### 1. Code Splitting

```tsx
// Lazy load heavy primitives
const Dialog = lazy(() => import('@radix-ui/react-dialog'));
const DropdownMenu = lazy(() => import('@radix-ui/react-dropdown-menu'));
```

### 2. Portal Container Reuse

```tsx
// Create portal container once
<Tooltip.Provider>
  {/* All tooltips share portal container */}
  <Tooltip.Root>...</Tooltip.Root>
  <Tooltip.Root>...</Tooltip.Root>
</Tooltip.Provider>
```

### 3. Memoization

```tsx
// Memoize expensive render functions
const SelectItems = memo(({ items }) => (
  items.map((item) => <Select.Item key={item.value} value={item.value} />)
));
```

---

## Integration with Popular Tools

### shadcn/ui (Built on Radix)

shadcn/ui is a collection of copy-paste components built with Radix + Tailwind.

```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add dialog
```

**When to use shadcn vs raw Radix**:
- Use shadcn: Quick prototyping, standard designs
- Use raw Radix: Full customization, unique designs

### Radix Themes (Official Styled System)

```tsx
import { Theme, Button, Dialog } from '@radix-ui/themes';

function App() {
  return (
    <Theme accentColor="crimson" grayColor="sand">
      <Button>Click me</Button>
    </Theme>
  );
}
```

---

## Related Skills

- `@tailwind-design-system` - Tailwind + Radix integration patterns
- `@react-patterns` - React composition patterns
- `@frontend-design` - Overall frontend architecture
- `@accessibility-compliance` - WCAG compliance testing

---

## Resources

### Official Documentation
- [Radix UI Docs](https://www.radix-ui.com/primitives)
- [Radix Colors](https://www.radix-ui.com/colors) - Accessible color system
- [Radix Icons](https://www.radix-ui.com/icons) - Icon library

### Community Resources
- [shadcn/ui](https://ui.shadcn.com) - Component collection
- [Radix UI Discord](https://discord.com/invite/7Xb99uG) - Community support
- [CVA Documentation](https://cva.style/docs) - Variant management

### Examples
- [Radix Playground](https://www.radix-ui.com/primitives/docs/overview/introduction#try-it-out)
- [shadcn/ui Source](https://github.com/shadcn-ui/ui) - Production examples

---

## Quick Reference

### Installation
```bash
npm install @radix-ui/react-{primitive-name}
```

### Basic Pattern
```tsx
<Primitive.Root>
  <Primitive.Trigger />
  <Primitive.Portal>
    <Primitive.Content />
  </Primitive.Portal>
</Primitive.Root>
```

### Key Props
- `asChild` - Render as child element
- `defaultValue` - Uncontrolled default
- `value` / `onValueChange` - Controlled state
- `open` / `onOpenChange` - Open state
- `side` / `align` - Positioning

---

**Remember**: Radix gives you **behavior**, you give it **beauty**. Accessibility is built-in, customization is unlimited.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
