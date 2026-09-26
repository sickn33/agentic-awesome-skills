import { useRef, useState, type ComponentPropsWithoutRef } from 'react';

export default function DocsCodeBlock({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const code = useRef<HTMLPreElement>(null);
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(code.current?.textContent ?? '');
      setMessage('Code copied.');
    } catch {
      setMessage('Clipboard unavailable. Select and copy the code below.');
    }
  }
  return <div className="docs-code">
    <div className="docs-code-toolbar">
      <button type="button" onClick={() => void copy()} aria-label="Copy code">Copy</button>
      <span role="status">{message}</span>
    </div>
    <pre {...props} ref={code} tabIndex={0}>{children}</pre>
  </div>;
}
