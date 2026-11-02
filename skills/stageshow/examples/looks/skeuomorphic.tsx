import './skeuomorphic.css'

/** Dimensional software UI: a paper receipt inside a lightly raised frame.
 * Material supports the hierarchy; the information leads. */
export function DimensionalLook() {
  return <div className="lk-transfer-frame">
    <div className="lk-transfer-paper">
      <header className="lk-transfer-head">
        <span className="lk-transfer-symbol" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 7h12m-3-3 3 3-3 3M16 13H4m3-3-3 3 3 3" /></svg></span>
        <span>Bank transfer</span><span className="lk-transfer-id">TR–1048</span>
      </header>
      <div className="lk-transfer-amount"><span>Amount sent</span><strong>$2,400<span>.00</span></strong><span>USD · No transfer fee</span></div>
      <dl className="lk-transfer-details">
        <div><dt>From</dt><dd>Operating <span>•• 1842</span></dd></div>
        <div><dt>To</dt><dd>Avery Studio</dd></div>
        <div><dt>Reference</dt><dd>October services</dd></div>
      </dl>
    </div>
    <footer className="lk-transfer-status"><span className="lk-transfer-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m4 8 2.5 2.5L12 5" /></svg></span><span>Transfer complete</span><span className="lk-transfer-date">Oct 24</span></footer>
  </div>
}
