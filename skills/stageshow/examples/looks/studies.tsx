import { Icon } from '../../kit'
import './studies.css'

// These are quiet, static product studies. Their anatomy changes with the
// product; tokens alone cannot turn an invitation form into a finance tool.
export function ConsoleLook() {
  return <div className="lk-product lk-console">
    <header className="lk-product-head"><span className="lk-console-command">&gt;_</span><strong>Deployments</strong><span className="lk-console-env">production</span></header>
    <div className="lk-console-body">
      <div className="lk-console-title"><strong>account-web</strong><span><i />Ready</span></div>
      <div className="lk-console-commit"><code>8f2c19a</code><span>Update account settings</span></div>
      <div className="lk-console-log">
        <div><Icon name="check" size={12} /><span>Build application</span><span>5s</span></div>
        <div><Icon name="check" size={12} /><span>Run checks</span><span>2s</span></div>
        <div><Icon name="check" size={12} /><span>Publish</span><span>2s</span></div>
      </div>
      <div className="lk-console-footer"><span>Built in 9 seconds</span><span>View deployment <Icon name="external" size={13} /></span></div>
    </div>
  </div>
}

export function FinanceLook() {
  return <div className="lk-product lk-finance">
    <header className="lk-product-head"><strong>Overview</strong><span className="lk-finance-period">This month <Icon name="chevron-down" size={12} /></span></header>
    <div className="lk-finance-body">
      <div className="lk-finance-label">Total balance</div>
      <div className="lk-finance-balance">$48,250<span>.00</span></div>
      <div className="lk-finance-trend">+4.8% <span>from last month</span></div>
      <svg className="lk-finance-chart" viewBox="0 0 276 60" role="img" aria-label="Balance increased steadily during the month">
        <path className="lk-finance-grid" d="M0 52.5H276M0 24.5H276" />
        <path className="lk-finance-area" d="M0 49C14 49 15 44 28 45S42 37 55 39S68 42 82 34S97 35 110 29S125 32 138 25S152 28 166 20S179 23 193 16S207 18 221 11S235 15 248 7S263 9 276 3V60H0Z" />
        <path className="lk-finance-line" d="M0 49C14 49 15 44 28 45S42 37 55 39S68 42 82 34S97 35 110 29S125 32 138 25S152 28 166 20S179 23 193 16S207 18 221 11S235 15 248 7S263 9 276 3" />
      </svg>
      <div className="lk-finance-account"><span className="lk-finance-account-icon"><Icon name="card" size={15} /></span><span>Operating<span>•• 4829</span></span><strong>$36,250.00</strong></div>
      <div className="lk-finance-account"><span className="lk-finance-account-icon"><Icon name="lock" size={15} /></span><span>Reserve<span>•• 9012</span></span><strong>$12,000.00</strong></div>
    </div>
  </div>
}

export function CanvasLook() {
  return <div className="lk-product lk-canvas">
    <header className="lk-product-head"><strong>Untitled canvas</strong><span>100% <Icon name="chevron-down" size={12} /></span></header>
    <div className="lk-canvas-workspace">
      <div className="lk-canvas-tools" aria-hidden="true"><span className="lk-canvas-tool-selected"><svg viewBox="0 0 16 16"><path d="m4 2 9 6-5 1-2 4Z" /></svg></span><span><svg viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="1" /></svg></span><span className="lk-canvas-type">T</span></div>
      <div className="lk-canvas-art" aria-label="Selected blue geometric poster">
        <div className="lk-canvas-art-title">A new<br />perspective.</div>
        <svg className="lk-canvas-shape" viewBox="0 0 160 110" aria-hidden="true"><path d="M14 94 71 8 137 94Z" /><path d="m48 94 39-61 47 61" /></svg>
        <span className="lk-canvas-art-footer">FORM / 01</span>
        <i /><i /><i /><i />
      </div>
      <span className="lk-canvas-size">152 × 184</span>
      <div className="lk-canvas-properties"><span><i />Fill</span><strong>#2E55CC</strong><span>100%</span></div>
    </div>
  </div>
}

export function MessagesLook() {
  return <div className="lk-product lk-messages">
    <header className="lk-product-head"><span className="lk-message-avatar">AL</span><span className="lk-message-person"><strong>Alex Lee</strong><span>Design team</span></span><Icon name="more" size={16} /></header>
    <div className="lk-message-thread">
      <div className="lk-message-time">Today, 10:42</div>
      <div className="lk-message-in">The new cover is ready.<br />What do you think?</div>
      <div className="lk-message-file"><span><Icon name="file" size={17} /></span><span><strong>Cover exploration.pdf</strong><small>2 pages · 1.4 MB</small></span></div>
      <div className="lk-message-out">This is the one. Let’s share it.</div>
      <div className="lk-message-read">Seen <Icon name="check" size={11} /></div>
    </div>
    <div className="lk-message-composer"><Icon name="plus" size={15} /><span>Write a message…</span><span className="lk-message-send"><Icon name="arrow" size={13} /></span></div>
  </div>
}

export function ResearchLook() {
  return <div className="lk-product lk-research">
    <header className="lk-product-head"><Icon name="file" size={14} /><span>Research / Field notes</span><Icon name="more" size={16} /></header>
    <div className="lk-research-body">
      <div className="lk-research-kicker">PRODUCT RESEARCH <span>06</span></div>
      <div className="lk-research-title">Make room<br />for the first idea.</div>
      <p>The best tools get out of the way.<br />Start with space, then add structure.</p>
      <div className="lk-research-note"><span>01</span><div><strong>A quieter starting point</strong><p>Less setup. More time to explore.</p></div></div>
      <div className="lk-research-source"><span>Interview notes</span><span>4 sources <Icon name="arrow" size={12} /></span></div>
    </div>
  </div>
}
