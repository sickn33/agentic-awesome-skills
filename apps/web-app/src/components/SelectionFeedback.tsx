import { useId, useState } from 'react';

export function SelectionFeedback(): React.ReactElement {
  const errorId = useId();
  const [minutes, setMinutes] = useState('');
  const [friction, setFriction] = useState('not-tried');
  const [reused, setReused] = useState('not-yet');
  const [notes, setNotes] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const invalidate = () => { setPreview(null); setError(null); };

  const review = (event: React.FormEvent) => {
    event.preventDefault();
    const duration = minutes.trim() ? Number(minutes) : null;
    if (duration !== null && (!Number.isFinite(duration) || duration < 0 || duration > 10080)) {
      setError('Enter a duration between 0 and 10,080 minutes, or leave it empty.'); return;
    }
    setPreview(JSON.stringify({ schemaVersion: 1, kind: 'aas.voluntary-feedback',
      minutesToUsefulSelection: duration, installationFriction: friction, reusedSelection: reused,
      ...(notes.trim() ? { notes: notes.trim() } : {}) }, null, 2));
    setError(null);
  };

  const save = () => {
    if (!preview) return;
    const url = URL.createObjectURL(new Blob([`${preview}\n`], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'aas-feedback.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <section className="workbench-boundary selection-feedback" aria-labelledby="selection-feedback-title">
    <h2 id="selection-feedback-title">Was this selection useful?</h2>
    <p>Optional, self-reported feedback. Preview and save a local JSON file to keep or share yourself. Nothing is sent; no imported IDs, paths, queries, or project details are copied into it.</p>
    <details><summary>Record feedback locally</summary>
      <form className="selection-feedback-form" onSubmit={review}>
        <label>Minutes to a useful selection (your estimate)<input type="number" min="0" max="10080" step="0.1" value={minutes} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} onChange={(event) => { setMinutes(event.target.value); invalidate(); }} /></label>
        <label>Installation experience<select value={friction} onChange={(event) => { setFriction(event.target.value); invalidate(); }}>
          <option value="not-tried">Not tried</option><option value="none">Worked without friction</option><option value="setup">Setup was difficult</option><option value="selection">It was hard to choose skills</option><option value="error">Installation failed</option>
        </select></label>
        <label>Have you reused this selection?<select value={reused} onChange={(event) => { setReused(event.target.value); invalidate(); }}>
          <option value="not-yet">Not yet</option><option value="yes">Yes</option><option value="no">No, I chose different skills</option>
        </select></label>
        <label>Notes (optional; avoid private information)<textarea maxLength={1000} rows={3} value={notes} onChange={(event) => { setNotes(event.target.value); invalidate(); }} /></label>
        <button type="submit">Preview feedback JSON</button>
        {error && <p id={errorId} role="alert">{error}</p>}
        {preview && <div><pre aria-label="Feedback JSON preview">{preview}</pre><button type="button" onClick={save}>Save feedback JSON</button></div>}
      </form>
    </details>
  </section>;
}
