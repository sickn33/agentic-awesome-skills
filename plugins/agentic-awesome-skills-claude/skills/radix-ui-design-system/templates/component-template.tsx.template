/**
 * Radix UI Component Template
 * 
 * This template provides a starting point for creating
 * custom components with Radix UI primitives.
 * 
 * Replace [PRIMITIVE] with actual primitive name:
 * Dialog, DropdownMenu, Select, Tabs, Tooltip, etc.
 */

import * as [PRIMITIVE] from '@radix-ui/react-[primitive]';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// ============================================================================
// Variants Definition (using CVA)
// ============================================================================

const [component]Variants = cva(
  // Base styles (always applied)
  "base-styles-here",
  {
    variants: {
      // Define your variants
      variant: {
        default: "default-styles",
        secondary: "secondary-styles",
        destructive: "destructive-styles",
      },
      size: {
        sm: "small-size-styles",
        md: "medium-size-styles",
        lg: "large-size-styles",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// ============================================================================
// TypeScript Interfaces
// ============================================================================

interface [Component]Props 
  extends React.ComponentPropsWithoutRef<typeof [PRIMITIVE].Root>,
          VariantProps<typeof [component]Variants> {
  // Add custom props here
}

// ============================================================================
// Component Implementation
// ============================================================================

export function [Component]({
  variant,
  size,
  className,
  children,
  ...props
}: [Component]Props) {
  return (
    <[PRIMITIVE].Root {...props}>
      {/* Trigger */}
      <[PRIMITIVE].Trigger asChild>
        <button className={cn([component]Variants({ variant, size }), className)}>
          {children}
        </button>
      </[PRIMITIVE].Trigger>

      {/* Portal (if needed) */}
      <[PRIMITIVE].Portal>
        {/* Overlay (for Dialog, etc.) */}
        <[PRIMITIVE].Overlay className="overlay-styles" />
        
        {/* Content */}
        <[PRIMITIVE].Content className="content-styles">
          {/* Required accessibility parts */}
          <[PRIMITIVE].Title className="title-styles">
            Title
          </[PRIMITIVE].Title>
          
          <[PRIMITIVE].Description className="description-styles">
            Description
          </[PRIMITIVE].Description>

          {/* Your content */}
          <div className="content-body">
            {/* ... */}
          </div>

          {/* Close button */}
          <[PRIMITIVE].Close asChild>
            <button className="close-button">Close</button>
          </[PRIMITIVE].Close>
        </[PRIMITIVE].Content>
      </[PRIMITIVE].Portal>
    </[PRIMITIVE].Root>
  );
}

// ============================================================================
// Sub-components (if needed)
// ============================================================================

[Component].[SubComponent] = function [SubComponent]({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof [PRIMITIVE].[SubComponent]>) {
  return (
    <[PRIMITIVE].[SubComponent]
      className={cn("subcomponent-styles", className)}
      {...props}
    />
  );
};

// ============================================================================
// Usage Example
// ============================================================================

/*
import { [Component] } from './[component]';

function App() {
  return (
    <[Component] variant="default" size="md">
      Trigger Content
    </[Component]
  );
}
*/

// ============================================================================
// Accessibility Checklist
// ============================================================================

/*
[ ] Keyboard navigation works (Tab, Arrow keys, Enter, Esc)
[ ] Focus visible on all interactive elements
[ ] Screen reader announces all states
[ ] ARIA attributes are correct
[ ] Color contrast meets WCAG AA (4.5:1 for text)
[ ] Focus trapped when needed (modals)
[ ] Focus restored after close
*/
