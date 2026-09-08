import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { SelectionFeedback } from '../components/SelectionFeedback';
import { InstallationHandoff } from '../components/InstallationHandoff';
import OutcomeExplorer from '../components/OutcomeExplorer';
import { Link } from 'react-router';
import { releaseFileUrl } from '../utils/catalogRelease';
import exampleStack from '../../../../docs/examples/workflows/mcp-contract/aas-stack.json';
import examplePlan from '../../../../docs/examples/workflows/mcp-contract/plan.json';
import exampleEvidence from '../../../../docs/examples/workflows/mcp-contract/aas-selection-evidence.json';
import {
  WORKBENCH_MAX_IMPORT_BYTES,
  WORKBENCH_MAX_JSON_DEPTH,
  WorkbenchImportError,
  parseWorkbenchArtifact,
  readWorkbenchFile,
  reviewWorkbenchPair,
  reviewWorkbenchEvidencePair,
  verifySelectionEvidence,
  type SelectionEvidenceReview,
  sha256WorkbenchDigest,
  verifyPlanDigest,
  type PlanReview,
  type StackManifestReview,
  type WorkbenchArtifactKind,
} from '../utils/workbenchReview';

interface ImportState<T> {
  value: T | null;
  error: string | null;
  source: 'paste' | 'file' | 'example' | null;
}

const EMPTY_IMPORT_STATE = { value: null, error: null, source: null } as const;

function displayError(error: unknown): string {
  return error instanceof WorkbenchImportError ? error.message : 'The artifact could not be reviewed.';
}

function shortDigest(value: string): string {
  return `${value.slice(0, 18)}…${value.slice(-12)}`;
}

function DefinitionList({ entries }: { entries: Array<[string, React.ReactNode]> }): React.ReactElement {
  return (
    <dl className="workbench-review__facts">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProfileReview({ profile }: { profile: StackManifestReview['profile'] }): React.ReactElement {
  return (
    <DefinitionList entries={[
      ['Project type', profile.projectType ?? 'Not declared'],
      ['Languages', profile.languages.length > 0 ? profile.languages.join(', ') : 'None declared'],
      ['Frameworks', profile.frameworks.length > 0 ? profile.frameworks.join(', ') : 'None declared'],
      ['Constraints', profile.constraints.length > 0 ? profile.constraints.join(', ') : 'None declared'],
    ]} />
  );
}

function StackReview({ stack }: { stack: StackManifestReview }): React.ReactElement {
  return (
    <article className="workbench-review" aria-labelledby="stack-review-title">
      <header className="workbench-review__heading">
        <div>
          <p>Structurally valid stack manifest</p>
          <h2 id="stack-review-title">{stack.name}</h2>
        </div>
        <span>Schema v{stack.schemaVersion}</span>
      </header>

      <section aria-labelledby="stack-catalog-title">
        <h3 id="stack-catalog-title">Pinned catalog</h3>
        <p className="workbench-review__note">Declared identity only. This browser view does not download catalog bytes or prove their integrity.</p>
        <DefinitionList entries={[
          ['Package', <code>{stack.catalog.package}</code>],
          ['Version', <code>{stack.catalog.version}</code>],
          ['Integrity', <code title={stack.catalog.integrity}>{shortDigest(stack.catalog.integrity)}</code>],
        ]} />
      </section>

      <div className="workbench-review__columns">
        <section aria-labelledby="stack-targets-title">
          <h3 id="stack-targets-title">Targets</h3>
          <ul className="workbench-review__rows">
            {stack.targets.map((target) => <li key={`${target.host}:${target.scope}`}><strong>{target.host}</strong><span>{target.scope}</span></li>)}
          </ul>
        </section>
        <section aria-labelledby="stack-profile-title">
          <h3 id="stack-profile-title">Agent-saved project profile</h3>
          <ProfileReview profile={stack.profile} />
        </section>
      </div>

      <div className="workbench-review__columns">
        <section aria-labelledby="stack-goals-title">
          <h3 id="stack-goals-title">Project goals</h3>
          <ul className="workbench-review__code-list">
            {stack.profile.goals.map((goal) => <li key={goal}><code>{goal}</code></li>)}
          </ul>
        </section>
        <section aria-labelledby="stack-skills-title">
          <h3 id="stack-skills-title">Agent-selected skills <span>{stack.skills.length}</span></h3>
          {stack.skills.length === 0 ? <p className="workbench-review__empty">No skills selected.</p> : (
            <ol className="workbench-review__code-list">
              {stack.skills.map((skill) => <li key={skill.id}><code>{skill.id}</code></li>)}
            </ol>
          )}
        </section>
      </div>
    </article>
  );
}

function PlanReviewView({ plan }: { plan: PlanReview }): React.ReactElement {
  const { payload } = plan;
  return (
    <article className="workbench-review" aria-labelledby="plan-review-title">
      <header className="workbench-review__heading">
        <div>
          <p>Structurally valid plan · digest verified</p>
          <h2 id="plan-review-title">Single-target change review</h2>
        </div>
        <span>Schema v{plan.schemaVersion}</span>
      </header>

      <section aria-labelledby="plan-bindings-title">
        <h3 id="plan-bindings-title">Bound identities</h3>
        <DefinitionList entries={[
          ['Plan digest (verified)', <code title={plan.digest}>{shortDigest(plan.digest)}</code>],
          ['Manifest digest', <code title={payload.manifestDigest}>{shortDigest(payload.manifestDigest)}</code>],
          ['Catalog', <><code>{payload.catalog.package}@{payload.catalog.version}</code><br /><code title={payload.catalog.integrity}>{shortDigest(payload.catalog.integrity)}</code></>],
          ['Runtime', <><code>{payload.runtime.package}@{payload.runtime.version}</code><br /><code title={payload.runtime.closureDigest}>{shortDigest(payload.runtime.closureDigest)}</code></>],
          ['Installed state', <code title={payload.installedState.digest}>{shortDigest(payload.installedState.digest)}</code>],
        ]} />
      </section>

      <div className="workbench-review__columns">
        <section aria-labelledby="plan-version-title">
          <h3 id="plan-version-title">Producer versions</h3>
          <DefinitionList entries={[
            ['Protocol', payload.versions.protocolVersion],
            ['Core', payload.versions.coreVersion],
            ['Catalog schema', payload.versions.catalogSchemaVersion],
          ]} />
        </section>
        <section aria-labelledby="plan-target-title">
          <h3 id="plan-target-title">Target</h3>
          <DefinitionList entries={[
            ['Host', payload.target.host],
            ['Scope', payload.target.scope],
            ['Adapter', payload.target.adapterVersion],
            ['Identity', <code title={payload.target.identityDigest}>{shortDigest(payload.target.identityDigest)}</code>],
          ]} />
        </section>
      </div>

      <section aria-labelledby="plan-profile-title">
        <h3 id="plan-profile-title">Bound project profile</h3>
        <ProfileReview profile={payload.profile} />
        <ul className="workbench-review__code-list">
          {payload.profile.goals.map((goal) => <li key={goal}><code>{goal}</code></li>)}
        </ul>
      </section>

      <section aria-labelledby="plan-operations-title">
        <div className="workbench-review__section-heading">
          <h3 id="plan-operations-title">Operations</h3>
          <span>{payload.operations.length}</span>
        </div>
        {payload.operations.length === 0 ? <p className="workbench-review__empty">No filesystem operations planned.</p> : (
          <ol className="workbench-review__operation-list">
            {payload.operations.map((operation) => (
              <li key={`${operation.kind}:${operation.skillId}`}>
                <header><strong>{operation.kind}</strong><code>{operation.skillId}</code>{operation.backupRequired ? <span>backup required</span> : null}</header>
                <DefinitionList entries={[
                  ['Source', operation.sourceTreeDigest ? <code title={operation.sourceTreeDigest}>{shortDigest(operation.sourceTreeDigest)}</code> : 'None'],
                  ['Expected', operation.expectedTreeDigest ? <code title={operation.expectedTreeDigest}>{shortDigest(operation.expectedTreeDigest)}</code> : 'None'],
                  ['Result', operation.resultTreeDigest ? <code title={operation.resultTreeDigest}>{shortDigest(operation.resultTreeDigest)}</code> : 'None'],
                ]} />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="plan-overrides-title" className={payload.overrides.length > 0 ? 'workbench-review__attention' : ''}>
        <div className="workbench-review__section-heading">
          <h3 id="plan-overrides-title">Managed drift overrides</h3>
          <span>{payload.overrides.length} overrides</span>
        </div>
        {payload.overrides.length === 0 ? <p className="workbench-review__empty">No overrides recorded.</p> : (
          <ul className="workbench-review__override-list">
            {payload.overrides.map((override) => (
              <li key={`${override.kind}:${override.skillId}`}>
                <header><strong>{override.kind}</strong><code>{override.skillId}</code></header>
                <p><span>Reason codes</span> {override.reasonCodes.join(', ')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="plan-commit-title">
        <h3 id="plan-commit-title">Final state commit</h3>
        <DefinitionList entries={[
          ['Previous', <code title={payload.stateCommit.previousDigest}>{shortDigest(payload.stateCommit.previousDigest)}</code>],
          ['Next', <code title={payload.stateCommit.nextDigest}>{shortDigest(payload.stateCommit.nextDigest)}</code>],
          ['Commit position', payload.stateCommit.position],
        ]} />
      </section>
    </article>
  );
}

function PairReview({ stack, plan, evidence, allowInstallation }: { allowInstallation: boolean; stack: StackManifestReview; plan: PlanReview | null; evidence: SelectionEvidenceReview | null }): React.ReactElement {
  const [checked, setChecked] = useState<{ stack: StackManifestReview; plan: PlanReview | null; evidence: SelectionEvidenceReview | null; review?: ReturnType<typeof reviewWorkbenchPair>; error?: string } | null>(null);
  useEffect(() => {
    let active = true;
    void sha256WorkbenchDigest(stack).then((manifestDigest) => {
      const checks = [
        ...(plan ? reviewWorkbenchPair(stack, plan, manifestDigest).checks : []),
        ...(evidence ? reviewWorkbenchEvidencePair(stack, evidence, manifestDigest).checks : []),
      ];
      if (active) setChecked({ stack, plan, evidence, review: { status: checks.every((check) => check.status === 'match') ? 'consistent' : 'inconsistent', checks } });
    }).catch((reason: unknown) => {
      if (active) setChecked({ stack, plan, evidence, error: displayError(reason) });
    });
    return () => { active = false; };
  }, [stack, plan, evidence]);
  if (!checked || checked.stack !== stack || checked.plan !== plan || checked.evidence !== evidence) return <section className="workbench-pair-review" aria-live="polite"><h2>Artifact consistency</h2><p>Checking bindings…</p></section>;
  if (checked.error) return <section className="workbench-pair-review workbench-pair-review--error"><h2>Artifact consistency</h2><p role="alert">{checked.error}</p></section>;
  const review = checked.review!;
  const consistent = review.status === 'consistent';
  return (
    <section className={`workbench-pair-review ${consistent ? 'workbench-pair-review--consistent' : 'workbench-pair-review--inconsistent'}`} aria-labelledby="pair-review-title">
      <header>
        <div>
          <p>{consistent ? 'All bindings match' : 'Bindings need attention'}</p>
          <h2 id="pair-review-title">Artifact consistency</h2>
        </div>
        <span>{consistent ? 'Ready to compare' : `${review.checks.filter((check) => check.status === 'mismatch').length} mismatches`}</span>
      </header>
      {consistent && allowInstallation ? <InstallationHandoff key={JSON.stringify(stack)} ids={stack.skills.map((skill) => skill.id)} version={stack.catalog.version} packageName={stack.catalog.package} /> : null}
      <ul aria-label="Artifact consistency checks">
        {review.checks.map((check) => (
          <li key={check.id}>
            <span>{check.label}</span>
            <strong>{check.status === 'match' ? 'Match' : 'Mismatch'}</strong>
          </li>
        ))}
      </ul>
      <p className="workbench-pair-review__note">This comparison uses only the imported artifacts and stays in page memory.</p>
    </section>
  );
}

function EvidenceReview({ evidence }: { evidence: SelectionEvidenceReview }): React.ReactElement {
  const { payload } = evidence;
  return (
    <article className="workbench-review" aria-labelledby="evidence-review-title">
      <header className="workbench-review__heading"><div><p>Schema, digests and references checked</p><h2 id="evidence-review-title">Selection evidence</h2></div></header>
      <p className="workbench-review__note">The capability ledger is the agent's declaration. These checks do not authenticate its author, prove skill suitability, or certify project coverage. Use Core's inspect_selection_evidence for the full trace contract. Runtime timings are outside the evidence digest.</p>
      <DefinitionList entries={[
        ['Evidence digest', <code title={evidence.digest}>{shortDigest(evidence.digest)}</code>],
        ['Project fingerprint', <code title={payload.project.fingerprint}>{shortDigest(payload.project.fingerprint)}</code>],
        ['Project files', payload.project.files.length],
        ['Client', payload.client ? `${payload.client.name} ${payload.client.version}` : 'Not recorded'],
        ['Recorded calls', payload.processTrace.calls.length],
      ]} />
      <h3>Declared capabilities</h3>
      <ul className="workbench-review__code-list">{payload.dimensions.map((dimension) => <li key={dimension.id}><strong>{dimension.id}</strong> · {dimension.status}<ul>{dimension.capabilityIds.map((id) => {
        const capability = payload.capabilities.find((item) => item.id === id)!;
        return <li key={id}><code>{id}</code> · {capability.status} · {capability.selectedSkillIds.join(', ') || 'No selected skills'}</li>;
      })}</ul></li>)}</ul>
      <details><summary>Inspect recorded search and selection calls</summary><ol className="workbench-review__code-list">{payload.processTrace.calls.map((call) => <li key={call.sequence}><strong>{call.sequence}. {call.tool}</strong> · {call.output.ok ? 'Succeeded' : 'Failed'}<pre>{JSON.stringify(call.input, null, 2)}</pre></li>)}</ol></details>
      <details><summary>Inspect project file references</summary><ul className="workbench-review__code-list">{payload.project.files.map((file) => <li key={file.path}><code>{file.path}</code> · {file.size} bytes · <code>{file.sha256}</code></li>)}</ul></details>
    </article>
  );
}

function ArtifactImporter<T>({
  kind,
  title,
  description,
  state,
  onState,
}: {
  kind: WorkbenchArtifactKind;
  title: string;
  description: string;
  state: ImportState<T>;
  onState: (state: ImportState<T>) => void;
}): React.ReactElement {
  const textareaId = useId();
  const fileId = useId();
  const [draft, setDraft] = useState('');
  const importAttempt = useRef(0);
  useEffect(() => () => { importAttempt.current += 1; }, []);

  const validateText = async (input: string, source: 'paste' | 'file', attempt: number) => {
    try {
      const artifact = parseWorkbenchArtifact(input, kind);
      if (artifact.kind === 'plan' && !await verifyPlanDigest(artifact.value)) {
        throw new WorkbenchImportError('Plan digest does not match its canonical payload.');
      }
      if (artifact.kind === 'evidence') await verifySelectionEvidence(artifact.value);
      if (attempt !== importAttempt.current) return;
      onState({ value: artifact.value as T, error: null, source });
    } catch (error) {
      if (attempt !== importAttempt.current) return;
      onState({ value: null, error: displayError(error), source: null });
    }
  };

  const importText = async (input: string, source: 'paste') => {
    const attempt = importAttempt.current + 1;
    importAttempt.current = attempt;
    await validateText(input, source, attempt);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const attempt = importAttempt.current + 1;
    importAttempt.current = attempt;
    try {
      const input = await readWorkbenchFile(file);
      if (attempt !== importAttempt.current) return;
      setDraft(input);
      await validateText(input, 'file', attempt);
    } catch (error) {
      if (attempt !== importAttempt.current) return;
      onState({ value: null, error: displayError(error), source: null });
    }
  };

  return (
    <section className="workbench-importer" aria-labelledby={`${textareaId}-title`}>
      <div>
        <p>{kind === 'stack' ? '1' : kind === 'plan' ? '2' : '3'}</p>
        <div>
          <h2 id={`${textareaId}-title`}>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <label htmlFor={textareaId}>Paste JSON</label>
      <textarea
        id={textareaId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={kind === 'stack' ? '{ "schemaVersion": 2, "name": "…" }' : kind === 'plan' ? '{ "schemaVersion": 2, "kind": "aas.stack-plan", … }' : '{ "schemaVersion": 1, "kind": "aas.selection-evidence", … }'}
        rows={8}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={Boolean(state.error)}
        aria-describedby={state.error ? `${textareaId}-error` : undefined}
      />
      <div className="workbench-importer__actions">
        <button type="button" onClick={() => void importText(draft, 'paste')}>Review pasted {kind}</button>
        <label htmlFor={fileId}>Choose {kind} JSON</label>
        <input
          id={fileId}
          type="file"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            void importFile(file);
          }}
        />
        {(state.value || state.error || draft) ? (
          <button type="button" className="workbench-importer__clear" onClick={() => { importAttempt.current += 1; setDraft(''); onState({ ...EMPTY_IMPORT_STATE }); }}>Clear</button>
        ) : null}
      </div>
      <div aria-live="polite" className="workbench-importer__status">
        {state.error ? <p id={`${textareaId}-error`} role="alert">{state.error}</p> : null}
        {state.value ? <p>Valid {kind} loaded from {state.source}. Held in this page only.</p> : null}
      </div>
    </section>
  );
}

export function Workbench(): React.ReactElement {
  const [stack, setStack] = useState<ImportState<StackManifestReview>>({ ...EMPTY_IMPORT_STATE });
  const [plan, setPlan] = useState<ImportState<PlanReview>>({ ...EMPTY_IMPORT_STATE });
  const [evidence, setEvidence] = useState<ImportState<SelectionEvidenceReview>>({ ...EMPTY_IMPORT_STATE });
  const [exampleLoading, setExampleLoading] = useState(false);
  const [exampleError, setExampleError] = useState<string | null>(null);
  const exampleAttempt = useRef(0);
  useEffect(() => () => { exampleAttempt.current += 1; }, []);

  const loadExample = async () => {
    const attempt = ++exampleAttempt.current;
    setExampleLoading(true); setExampleError(null);
    setStack({ ...EMPTY_IMPORT_STATE }); setPlan({ ...EMPTY_IMPORT_STATE }); setEvidence({ ...EMPTY_IMPORT_STATE });
    try {
      const parsedStack = parseWorkbenchArtifact(JSON.stringify(exampleStack), 'stack');
      const parsedPlan = parseWorkbenchArtifact(JSON.stringify(examplePlan), 'plan');
      const parsedEvidence = parseWorkbenchArtifact(JSON.stringify(exampleEvidence), 'evidence');
      if (parsedStack.kind !== 'stack' || parsedPlan.kind !== 'plan' || !await verifyPlanDigest(parsedPlan.value)) throw new WorkbenchImportError('The recorded example failed verification.');
      if (parsedEvidence.kind !== 'evidence') throw new WorkbenchImportError('The recorded evidence failed verification.');
      await verifySelectionEvidence(parsedEvidence.value);
      if (attempt !== exampleAttempt.current) return;
      setStack({ value: parsedStack.value, error: null, source: 'example' });
      setPlan({ value: parsedPlan.value, error: null, source: 'example' });
      setEvidence({ value: parsedEvidence.value, error: null, source: 'example' });
    } catch (error) {
      if (attempt === exampleAttempt.current) setExampleError(displayError(error));
    } finally {
      if (attempt === exampleAttempt.current) setExampleLoading(false);
    }
  };

  usePageMeta(useMemo(() => ({
    title: 'AAS Core Stack Review | Agentic Awesome Skills',
    description: 'Review an AAS Core stack, immutable preview plan and selection evidence locally in your browser. Imports stay in memory.',
    canonicalPath: '/workbench',
  }), []));

  return (
    <div className="workbench-page">
      <header className="workbench-header">
        <div>
          <div>
            <h1>Review what your agent selected.</h1>
            <p>Review the exact skills, project profile and proposed changes saved by your agent. Import <code>aas-stack.json</code>, an immutable CLI plan, and optional selection evidence, or explore the recorded example below.</p>
          </div>
          <dl>
            <div><dt>Imported artifacts</dt><dd>In-memory only</dd></div>
            <div><dt>Target changes</dt><dd>None</dd></div>
            <div><dt>Artifact review</dt><dd>No network</dd></div>
          </dl>
        </div>
      </header>

      <OutcomeExplorer />

      <section className="workbench-boundary" aria-labelledby="workbench-start-title">
        <h2 id="workbench-start-title">Need a stack to review?</h2>
        <ol>
          <li><Link to="/">Compare skills in the catalog</Link> and copy an agent brief with your goal and target.</li>
          <li>Give the brief to your coding agent with AAS MCP configured. Let it inspect your project and select exact IDs; review its choices before saving <code>aas-stack.json</code>.</li>
          <li>Validate the manifest and generate a preview plan with the CLI, then import both files and optional <code>aas-selection-evidence.json</code> below.</li>
        </ol>
        <a href={releaseFileUrl('docs/users/aas-core.md')}>Configuration and preview commands</a>
      </section>

      <section className="workbench-boundary workbench-example" aria-labelledby="workbench-example-title">
        <h2 id="workbench-example-title">Explore a recorded review</h2>
        <p>A seven-skill MCP contract review, composed through Codex and planned with the published AAS 16.7.0 CLI. Loading it replaces the current review in page memory.</p>
        <div><button type="button" disabled={exampleLoading} onClick={() => void loadExample()}>{exampleLoading ? 'Checking example…' : 'Load recorded example'}</button><a href={releaseFileUrl('docs/examples/workflows/mcp-contract/README.md')}>Inputs, commands and limits</a></div>
        {exampleError ? <p role="alert">{exampleError}</p> : null}
      </section>

      <section className="workbench-boundary" aria-labelledby="workbench-boundary-title">
        <h2 id="workbench-boundary-title">Review surface, not an installer</h2>
        <p>This page cannot install, apply, share, or persist an imported artifact. Files are read only after you select them. Digests check artifact consistency, not author identity or skill suitability; catalog bytes are not downloaded.</p>
        <p>Limits: {WORKBENCH_MAX_IMPORT_BYTES.toLocaleString('en-US')} UTF-8 bytes per artifact · {WORKBENCH_MAX_JSON_DEPTH} JSON levels.</p>
      </section>

      {exampleLoading ? <p role="status">Checking example artifacts…</p> : <div className="workbench-import-grid">
        <ArtifactImporter
          kind="stack"
          title="Import desired state"
          description="Paste or explicitly select the stack manifest containing your agent's exact skill choices."
          state={stack}
          onState={setStack}
        />
        <ArtifactImporter
          kind="plan"
          title="Import immutable plan"
          description="Paste or explicitly select the single-target plan generated after validation."
          state={plan}
          onState={setPlan}
        />
        <ArtifactImporter kind="evidence" title="Import selection evidence" description="Optionally inspect the agent-declared capability ledger and recorded MCP calls in aas-selection-evidence.json." state={evidence} onState={setEvidence} />
      </div>}

      <section className="workbench-review-area" aria-label="Imported artifact review">
        {stack.value && (plan.value || evidence.value) ? <PairReview allowInstallation={!plan.error && !evidence.error} stack={stack.value} plan={plan.value} evidence={evidence.value} /> : null}
        {stack.value && !plan.value && !plan.error && !evidence.value && !evidence.error ? <InstallationHandoff key={JSON.stringify(stack.value)} ids={stack.value.skills.map((skill) => skill.id)} version={stack.value.catalog.version} packageName={stack.value.catalog.package} /> : null}
        {stack.value ? <StackReview stack={stack.value} /> : null}
        {plan.value ? <PlanReviewView plan={plan.value} /> : null}
        {evidence.value ? <EvidenceReview evidence={evidence.value} /> : null}
        {!stack.value && !plan.value && !evidence.value ? (
          <div className="workbench-review-empty">
            <p>No artifact loaded</p>
            <h2>Your review appears here.</h2>
            <p>Nothing is read from your machine until you paste JSON or use a file chooser above.</p>
          </div>
        ) : null}
      </section>
      <SelectionFeedback />
    </div>
  );
}

export default Workbench;
