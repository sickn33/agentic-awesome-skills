/** Authored Stageshow illustration; no agent calls or installations. */
export function WorkflowDemo() {
  return <figure className="workflow-demo" aria-label="Agent workflow demo">
    <div className="workflow-demo-surface">
      <iframe src={`${import.meta.env.BASE_URL}workflow-demo/index.html`} title="Illustrative agent workflow animation" loading="lazy" />
    </div>
  </figure>;
}
