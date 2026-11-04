import CoreDemo from '../components/stageshow/examples/aas-core';
import { CoreRecordedExample } from './CoreRecordedExample';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Terminal } from '@phosphor-icons/react';
import { usePageMeta } from '../hooks/usePageMeta';
import './CoreOverview.css';

const selectionPrompt = 'Inspect this repository and identify its capability areas. Use AAS Core to search the complete catalog and read candidate skills and their requirements. Compare candidates for each area, report gaps, and choose non-redundant skill IDs. Do not optimize for the smallest stack. Use compose_stack and inspect_stack to return a validated manifest and explain your choices. Do not install or apply anything.';

const coreAgents = [['Codex', 'openai'], ['Claude Code', 'claude'], ['Cursor', 'cursor'], ['T3 Code', 't3'], ['Antigravity', 'antigravity'], ['Other agent', null]] as const;
type CoreAgent = typeof coreAgents[number][0];

export function CoreOverview() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash === '#recorded-example' || hash === '#connect') {
      document.getElementById(hash.slice(1))?.scrollIntoView?.({ block: 'start' });
    }
  }, [hash]);
  usePageMeta({ title: 'AAS Core | AAS', description: 'Let your coding agent explore the AAS catalog, choose skills and return a selection you can review.', canonicalPath: '/aas-core/', jsonLd: (url: string) => ({ '@context': 'https://schema.org', '@type': 'WebPage', name: 'AAS Core', url }) });
  const [host, setHost] = useState<CoreAgent>('Codex');
  const managedHost = host === 'Codex' || host === 'Claude Code';
  const prompt = managedHost ? selectionPrompt : `Help me use AAS Core in ${host === 'Other agent' ? 'this coding agent' : host}. First identify the actual agent and version and check whether it supports local stdio MCP. Read https://aaskills.tech/docs/aas-core/ and verify the supported configuration for this client. The built-in configuration adapters are for Codex and Claude; do not invent a --host value or use another client's configuration. Show the proposed configuration and ask before changing it. If MCP is unavailable, explain that clearly rather than claiming Core is connected. Once Core is connected: ${selectionPrompt}`;
  const [copyState, setCopyState] = useState('');
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef<HTMLDetailsElement>(null);
  async function copyPrompt() {
    try { await navigator.clipboard.writeText(prompt); setCopyState('Prompt copied'); }
    catch { if (requestRef.current) requestRef.current.open = true; promptRef.current?.focus(); promptRef.current?.select(); setCopyState('Select and copy the prompt below.'); }
  }
  return <div className="core-page">
    <section className="core-hero brand-wrap">
      <div className="core-intro"><h1>AAS Core</h1><p>Your agent finds and chooses skills. Core checks the selection and returns a stack for you to review.</p><div className="core-actions"><a className="brand-button" href="#connect">Connect your agent</a><Link className="text-action" to="/workbench/">See a real selection</Link></div></div>
      <figure className="core-demo"><CoreDemo /><figcaption>Illustrated workflow · <Link to="/workbench/">Based on a recorded selection</Link></figcaption></figure>
    </section>
    <section className="core-process brand-wrap" aria-labelledby="core-how-title">
      <header><h2 id="core-how-title">From your project<br/>to a selection you can review.</h2><p>A stack is a saved list of skills for your project.</p></header>
      <div className="core-process-track">
        <article><span className="core-step-label">01 / Your agent</span><h3>Find the right skills</h3><p>Reads your project, explores the catalog and compares the instructions.</p><div className="core-process-output">Project context <span>+</span> Skill instructions</div></article>
        <article><span className="core-step-label">02 / AAS Core</span><h3>Check the selection</h3><p>Checks the selected skill IDs and records the catalog version and project target.</p><div className="core-process-output"><code>aas-stack.json</code><span>Saved selection</span></div></article>
        <article><span className="core-step-label">03 / You</span><h3>Review before applying</h3><p>See the chosen skills and inspect planned changes before installing anything.</p><Link className="core-inline-link" to="/workbench/">Review a selection in Workbench</Link></article>
      </div>
      <p className="core-boundary">Core validates structure and references. Your agent judges which skills fit. The local MCP does not install skills or run their scripts.</p>
    </section>
    <CoreRecordedExample />
    <section className="core-connect" id="connect" aria-labelledby="core-connect-title">
      <div className="brand-wrap">
        <header className="core-connect-heading"><h2 id="core-connect-title">Start in your agent</h2><p>Choose where you work.</p></header>
        <div className="core-hosts" role="group" aria-label="Choose your coding agent">{coreAgents.map(([name, icon])=><button key={name} type="button" aria-pressed={host===name} onClick={()=>{setHost(name);setCopyState('');}}>{icon ? <img src={`${import.meta.env.BASE_URL}agents/${icon}.svg`} alt="" width="28" height="28"/> : <Terminal size={28} aria-hidden="true"/>}{name}</button>)}</div>
        <div className="core-connect-steps">
          <div className="core-setup"><span className="core-step-label">01 / Connect</span><h3>{managedHost ? `Add Core to ${host}` : 'Check MCP support'}</h3><p>{managedHost ? 'Follow the local MCP setup guide, then approve the configuration in your agent.' : `Check whether ${host === 'Other agent' ? 'your agent' : host} supports local stdio MCP before configuring Core.`}</p><Link className="brand-button" to="/docs/aas-core/#configure-the-local-mcp">{managedHost ? `Set up ${host}` : 'Core setup guide'}</Link></div>
          <div className="core-prompt"><span className="core-step-label">02 / Start a task</span><h3>{managedHost ? 'Ask your agent to choose' : 'Prepare the connection'}</h3><blockquote>{managedHost ? 'Inspect this project. Find suitable skills with AAS Core and show me your selection before installing anything.' : 'Check whether this agent can connect to AAS Core. Show me the configuration before changing anything.'}</blockquote><div className="core-prompt-actions"><div className="core-copy-row"><button className="text-action" onClick={copyPrompt}>Copy prompt</button><span role="status">{copyState}</span></div><details className="core-request" ref={requestRef}><summary>Read the full prompt</summary><label className="sr-only" htmlFor="core-selection-prompt">Selection request</label><textarea ref={promptRef} id="core-selection-prompt" value={prompt} readOnly rows={7}/></details></div></div>
        </div>
      </div>
    </section>
    <section className="brand-wrap core-review" aria-labelledby="core-review-title">
      <div className="core-review-copy"><span className="core-step-label">Workbench</span><h2 id="core-review-title">See what your agent chose.</h2><p>Open a saved selection to inspect its skills, catalog version and target. Add a plan to review the proposed file changes.</p><Link className="brand-button" to="/workbench/">Open Workbench</Link><p className="core-review-help">Try the included example, or load your own selection. Opening it does not install anything.</p></div>
      <figure className="core-review-art"><picture><source media="(max-width: 1000px)" srcSet={`${import.meta.env.BASE_URL}illustrations/aas-workbench-selection-mobile.png`} width="680" height="700"/><img src={`${import.meta.env.BASE_URL}illustrations/aas-workbench-selection.png`} width="1100" height="720" alt="Recorded AAS MCP contract review selection: 7 skills, including mcp-builder, javascript-pro and invariant-guard. Target: Codex project. Catalog version: 16.7.0." loading="lazy"/></picture></figure>
    </section>
  </div>;
}
