import { useEffect, useRef, useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog = ({ isOpen, message, onConfirm, onCancel }: ConfirmDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isOpen && !dialog.current?.open) dialog.current?.showModal();
    if (!isOpen && dialog.current?.open) dialog.current.close();
  }, [isOpen]);

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm();
    } catch {
      // The parent hook exposes the request error; keep the dialog available for retry.
    } finally {
      setPending(false);
    }
  };

  return (
    <dialog ref={dialog} className="dialog-content" aria-label="Confirm todo deletion"
      aria-describedby="delete-message" onCancel={event => {
        event.preventDefault();
        if (!pending) onCancel();
      }}>
      <p id="delete-message" className="dialog-message">{message}</p>
      <div className="dialog-buttons">
        <button autoFocus onClick={onCancel} disabled={pending} className="cancel-button">Cancel</button>
        <button onClick={() => { void confirm(); }} disabled={pending} className="confirm-button">
          {pending ? 'Deleting...' : 'Confirm'}
        </button>
      </div>
    </dialog>
  );
};
