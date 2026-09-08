import { useId, useState } from 'react';
import { buildInstallationPreview, type CommandShell } from '../utils/installationHandoff';

interface Props { ids: string[]; version: string; packageName?: string }

export function InstallationHandoff({ ids, version, packageName }: Props): React.ReactElement {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [shell, setShell] = useState<CommandShell>('posix');
  const [message, setMessage] = useState('');
  let command = '';
  let error = '';
  try { command = buildInstallationPreview(ids, version, destination, shell, packageName); }
  catch (cause) { error = (cause as Error).message; }
  return <section className="installation-handoff">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Prepare installation preview</button>
    {open ? <div>
      <p>Use these {ids.length} exact IDs from AAS {version}. Run the preview in your project, inspect the changes, and remove <code>--dry-run</code> only when you approve installation.</p>
      <p>The direct installer produces its own preview; it does not apply a Core plan. Confirm the directory your agent uses and any prerequisites before proceeding.</p>
      <label htmlFor={`${id}-directory`}>Skill directory<input id={`${id}-directory`} value={destination} placeholder="For example: .agents/skills or .claude/skills" onChange={(event) => { setDestination(event.target.value); setMessage(''); }} /></label>
      <label htmlFor={`${id}-shell`}>Terminal<select id={`${id}-shell`} value={shell} onChange={(event) => { setShell(event.target.value as CommandShell); setMessage(''); }}><option value="posix">macOS / Linux · bash or zsh</option><option value="powershell">Windows · PowerShell</option></select></label>
      {command ? <><textarea aria-label="Installation preview command" readOnly value={command} rows={5} /><button type="button" onClick={() => { void navigator.clipboard.writeText(command).then(() => setMessage('Preview command copied.'), () => setMessage('Clipboard unavailable. Select and copy the command above.')); }}>Copy preview command</button></> : <p>{error}</p>}
      {message ? <p role="status">{message}</p> : null}
    </div> : null}
  </section>;
}
