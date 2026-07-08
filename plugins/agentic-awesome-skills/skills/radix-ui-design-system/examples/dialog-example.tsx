import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon } from '@radix-ui/react-icons';
import './dialog.css';

/**
 * Example: Basic Dialog Component
 * 
 * Demonstrates:
 * - Compound component pattern
 * - Portal rendering
 * - Accessibility features (Title, Description)
 * - Custom styling with CSS
 */
export function BasicDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="button-primary">
          Open Dialog
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        {/* Overlay (backdrop) */}
        <Dialog.Overlay className="dialog-overlay" />
        
        {/* Content (modal) */}
        <Dialog.Content className="dialog-content">
          {/* Title - Required for accessibility */}
          <Dialog.Title className="dialog-title">
            Edit Profile
          </Dialog.Title>

          {/* Description - Recommended for accessibility */}
          <Dialog.Description className="dialog-description">
            Make changes to your profile here. Click save when you're done.
          </Dialog.Description>

          {/* Form Content */}
          <form className="dialog-form">
            <fieldset className="fieldset">
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                className="input"
                id="name"
                defaultValue="John Doe"
              />
            </fieldset>

            <fieldset className="fieldset">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                className="input"
                id="email"
                type="email"
                defaultValue="john@example.com"
              />
            </fieldset>

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <button className="button-secondary" type="button">
                  Cancel
                </button>
              </Dialog.Close>
              <button className="button-primary" type="submit">
                Save Changes
              </button>
            </div>
          </form>

          {/* Close button */}
          <Dialog.Close asChild>
            <button className="icon-button" aria-label="Close">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Example: Controlled Dialog
 * 
 * Use when you need to:
 * - Sync dialog state with external state
 * - Programmatically open/close dialog
 * - Track dialog open state
 */
export function ControlledDialog() {
  const [open, setOpen] = React.useState(false);

  const handleSave = () => {
    // Your save logic here
    console.log('Saving...');
    setOpen(false); // Close after save
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="button-primary">
          Open Controlled Dialog
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>Controlled Dialog</Dialog.Title>
          <Dialog.Description>
            This dialog's state is managed externally.
          </Dialog.Description>

          <p>Dialog is {open ? 'open' : 'closed'}</p>

          <button onClick={handleSave}>Save and Close</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
