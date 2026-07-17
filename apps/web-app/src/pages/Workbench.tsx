import { useId, useMemo, useRef, useState } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  WORKBENCH_MAX_IMPORT_BYTES,
  WORKBENCH_MAX_JSON_DEPTH,
  WorkbenchImportError,
  parseWorkbenchArtifact,
  readWorkbenchFile,
  verifyPlanDigest,
  type PlanReview,
  type StackManifestReview,
  type WorkbenchArtifactKind,
} from '../utils/workbenchReview';

interface ImportState<T> {
  value: T | null;
  error: string | null;
  source: 'paste' | 'file' | null;
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

function PolicyReview({ policy }: { policy: StackManifestReview['policy'] }): React.ReactElement {
  return (
    <DefinitionList entries={[
      ['Allowed risk', policy.allowedRisk.join(', ')],
      ['Known source required', policy.requireKnownSource ? 'Yes' : 'No'],
      ['Manual setup allowed', policy.allowManualSetup ? 'Yes' : 'No'],
    ]} />
  );
}

function StackReview({ stack }: { stack: StackManifestReview }): React.ReactElement {
  return (
    <article className="workbench-review" aria-labelledby="stack-review-title">
      <header className="workbench-review__heading">
        <div>
          <p>Validated stack manifest</p>
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
        <section aria-labelledby="stack-policy-title">
          <h3 id="stack-policy-title">Policy</h3>
          <PolicyReview policy={stack.policy} />
        </section>
      </div>

      <div className="workbench-review__columns">
        <section aria-labelledby="stack-goals-title">
          <h3 id="stack-goals-title">Approved goals</h3>
          <ul className="workbench-review__code-list">
            {stack.intent.goals.map((goal) => <li key={goal}><code>{goal}</code></li>)}
          </ul>
        </section>
        <section aria-labelledby="stack-skills-title">
          <h3 id="stack-skills-title">Exact skills <span>{stack.skills.length}</span></h3>
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
  const unknownCount = payload.overrides.reduce((total, override) => total + override.unknownFields.length, 0);
  return (
    <article className="workbench-review" aria-labelledby="plan-review-title">
      <header className="workbench-review__heading">
        <div>
          <p>Validated immutable plan</p>
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
            ['Metadata schema', payload.versions.metadataSchemaVersion],
            ['Scorer', payload.versions.scorerVersion],
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
          <h3 id="plan-overrides-title">Overrides and unknowns</h3>
          <span>{payload.overrides.length} overrides · {unknownCount} unknown fields</span>
        </div>
        {payload.overrides.length === 0 ? <p className="workbench-review__empty">No overrides recorded.</p> : (
          <ul className="workbench-review__override-list">
            {payload.overrides.map((override) => (
              <li key={`${override.kind}:${override.skillId}`}>
                <header><strong>{override.kind}</strong><code>{override.skillId}</code></header>
                <p><span>Reason codes</span> {override.reasonCodes.join(', ')}</p>
                <p><span>Unknown fields</span> {override.unknownFields.length > 0 ? override.unknownFields.join(', ') : 'None'}</p>
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

  const validateText = async (input: string, source: 'paste' | 'file', attempt: number) => {
    try {
      const artifact = parseWorkbenchArtifact(input, kind);
      if (artifact.kind === 'plan' && !await verifyPlanDigest(artifact.value)) {
        throw new WorkbenchImportError('Plan digest does not match its canonical payload.');
      }
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
        <p>{kind === 'stack' ? '1' : '2'}</p>
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
        placeholder={kind === 'stack' ? '{ "schemaVersion": 1, "name": "…" }' : '{ "schemaVersion": 1, "kind": "aas.stack-plan", … }'}
        rows={8}
        spellCheck={false}
        autoComplete="off"
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
        {state.error ? <p role="alert">{state.error}</p> : null}
        {state.value ? <p>Valid {kind} loaded from {state.source}. Held in this page only.</p> : null}
      </div>
    </section>
  );
}

export function Workbench(): React.ReactElement {
  const [stack, setStack] = useState<ImportState<StackManifestReview>>({ ...EMPTY_IMPORT_STATE });
  const [plan, setPlan] = useState<ImportState<PlanReview>>({ ...EMPTY_IMPORT_STATE });

  usePageMeta(useMemo(() => ({
    title: 'Stack Review Workbench | Agentic Awesome Skills',
    description: 'Review an AAS stack manifest and immutable plan locally in your browser. Imports stay in memory and cannot install or apply changes.',
    canonicalPath: '/workbench',
  }), []));

  return (
    <div className="workbench-page">
      <header className="workbench-header">
        <div>
          <div>
            <h1>Review what your agent chose.</h1>
            <p>Import an <code>aas-stack.json</code> and immutable plan to inspect identities, targets, operations, overrides, and unknowns before approving anything in the CLI.</p>
          </div>
          <dl>
            <div><dt>Privacy</dt><dd>In-memory only</dd></div>
            <div><dt>Writes</dt><dd>None</dd></div>
            <div><dt>Network</dt><dd>Not used</dd></div>
          </dl>
        </div>
      </header>

      <section className="workbench-boundary" aria-labelledby="workbench-boundary-title">
        <h2 id="workbench-boundary-title">Review surface, not an installer</h2>
        <p>This page cannot install, apply, share, or persist an imported artifact. Files are read only after you select them. Validation is structural; catalog identity is displayed as declared unless the plan binds it by digest.</p>
        <p>Limits: {WORKBENCH_MAX_IMPORT_BYTES.toLocaleString('en-US')} UTF-8 bytes per artifact · {WORKBENCH_MAX_JSON_DEPTH} JSON levels.</p>
      </section>

      <div className="workbench-import-grid">
        <ArtifactImporter
          kind="stack"
          title="Import desired state"
          description="Paste or explicitly select the minimal stack manifest your agent proposed."
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
      </div>

      <section className="workbench-review-area" aria-label="Imported artifact review">
        {stack.value ? <StackReview stack={stack.value} /> : null}
        {plan.value ? <PlanReviewView plan={plan.value} /> : null}
        {!stack.value && !plan.value ? (
          <div className="workbench-review-empty">
            <p>No artifact loaded</p>
            <h2>Your review appears here.</h2>
            <p>Nothing is read from your machine until you paste JSON or use a file chooser above.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default Workbench;
