import Workflow from './stageshow/examples/aas-workflow';

/** Authored Stageshow illustration; no agent calls or installations. */
export function WorkflowDemo() {
  return <figure className="workflow-demo" aria-label="Agent workflow demo">
    <div className="workflow-demo-surface">
      <Workflow />
    </div>
  </figure>;
}
