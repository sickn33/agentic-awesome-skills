# Radix UI Design System - Skill Examples

This folder contains practical examples demonstrating how to use Radix UI primitives to build accessible, customizable components.

## Examples

### `dialog-example.tsx`

Demonstrates Dialog (Modal) component patterns:
- **BasicDialog**: Standard modal with form
- **ControlledDialog**: Externally controlled modal state

**Key Concepts**:
- Portal rendering outside DOM hierarchy
- Overlay (backdrop) handling
- Accessibility requirements (Title, Description)
- Custom styling with CSS

### `dropdown-example.tsx`

Complete dropdown menu implementation:
- **CompleteDropdown**: Full-featured menu with all Radix primitives
  - Regular items
  - Separators and labels
  - Checkbox items
  - Radio groups
  - Sub-menus
- **ActionsMenu**: Simple actions menu for data tables/cards

**Key Concepts**:
- Compound component architecture
- Keyboard navigation
- Item indicators (checkboxes, radio buttons)
- Nested sub-menus

## Usage

```tsx
import { BasicDialog } from './examples/dialog-example';
import { CompleteDropdown } from './examples/dropdown-example';

function App() {
  return (
    <>
      <BasicDialog />
      <CompleteDropdown />
    </>
  );
}
```

## Styling

These examples use CSS classes. You can:
1. Copy the CSS from each file
2. Replace with Tailwind classes
3. Use CSS-in-JS (Stitches, Emotion, etc.)

## Learn More

- [Main SKILL.md](../SKILL.md) - Complete guide
- [Component Template](../templates/component-template.tsx.template) - Boilerplate
- [Radix UI Docs](https://www.radix-ui.com/primitives)
