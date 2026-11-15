import { Badge, Bar, Chart, Icon, Popover, Menu, Stage, Window } from '../../kit'
import './glass.css'

// The glass theme: frosted, translucent surfaces over a soft color field
// drawn from the accent. Window, popovers and anything with class ss-glass
// blur what's behind them; text and icons stay opaque.

export default function Glass() {
  return (
    <Stage specimen width={640} height={400} compact={{ below: 560, width: 350, height: 400 }} theme="glass" className="gl">
      {(_, __, layout) => (
        <>
          <Window title="Revenue" className="gl-window">
            <div className="gl-body">
              <div className="gl-head">
                <span className="gl-label">This month</span>
                <span className="gl-value">$9,412</span>
                <Badge tone="success">+12.4%</Badge>
              </div>
              <Chart data={[14, 18, 16, 22, 21, 27, 25, 31, 34]} width={layout === 'compact' ? 270 : 392} height={110} />
              <div className="gl-rows">
                {[120, 96].map((w, i) => (
                  <div key={i} className="gl-row">
                    <Bar w={16} h={16} r={8} tone={3} />
                    <Bar w={w} h={6} tone={3} />
                    <Bar w={40} h={6} tone={2} />
                  </div>
                ))}
              </div>
            </div>
          </Window>
          <div className="gl-chip ss-glass">
            <Icon name="bolt" size={14} />
            Payout sent
          </div>
          <Popover show className="gl-menu">
            <Menu items={['Export CSV', 'Share link', 'Schedule report']} value={1} />
          </Popover>
        </>
      )}
    </Stage>
  )
}
