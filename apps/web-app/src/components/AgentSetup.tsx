import { useRef, useState } from 'react';
import setups from '../data/agentSetups.json';
const agents = [['Codex', 'openai'], ['Claude Code', 'claude'], ['Cursor', 'cursor'], ['T3 Code', 't3'], ['Antigravity', 'antigravity']] as const;
export default function AgentSetup() {
  const [selected, setSelected] = useState<keyof typeof setups | null>(null);
  const [status, setStatus] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const trigger = useRef<HTMLAnchorElement | null>(null);
  const setup = selected ? setups[selected] : null;
  return <section className="agent-setup" aria-label="Agent setup">
    <div className="agent-strip"><p>Use AAS with</p><div>{agents.map(([name, icon]) => <a key={name} className="agent-brand" href={setups[name].url || '#app-setup'} onClick={(event) => {
      trigger.current = event.currentTarget; setSelected(name); setStatus('');
      if (!setups[name].url) { event.preventDefault(); window.setTimeout(() => field.current?.focus(), 0); }
    }} aria-label={`Set up AAS in ${name}`}><img src={`${import.meta.env.BASE_URL}agents/${icon}.svg`} alt="" width="24" height="24" />{name}</a>)}</div></div>
    {setup && selected && <div className="setup-sheet" id="app-setup">
      <div className="section-line"><h2>Set up AAS in {selected}</h2><button onClick={() => { setSelected(null); trigger.current?.focus(); }} aria-label="Close setup">Close</button></div>
      <p>{setup.url ? 'Allow your browser to open the installed app. Review and send the request there. If it does not open, copy the prompt below.' : selected === 'T3 Code' ? 'Copy this request into your agent chat in T3 Code. An app launch link is not available here.' : 'Copy the request, open Antigravity, and paste it into a new agent chat.'}</p>
      <label htmlFor="setup-prompt">Installation request</label><textarea ref={field} id="setup-prompt" readOnly value={setup.prompt} rows={5} />
      <div className="action-row"><button className="brand-button" onClick={async () => { try { await navigator.clipboard.writeText(setup.prompt); setStatus('Prompt copied. Paste it into your agent chat.'); } catch { field.current?.focus(); field.current?.select(); setStatus('Copy the selected text manually.'); } }}>Copy prompt</button>
      {(setup.url || selected === 'Antigravity') && <a className="text-action" href={setup.url || 'antigravity://'}>Open {selected}</a>}<a className="text-action" href={setup.guide}>Setup guide</a></div><p role="status">{status}</p>
    </div>}
  </section>;
}
