import { Badge, Bar, Chart, Icon, LockScreen, Notification, Phone, Stage, Text, Window, WALLPAPER } from '../../kit'
import './payments.css'

// "Get paid anywhere": a device pair. The dashboard is pinned top-left and
// runs off the bottom; the phone straddles its right edge over empty margin
// and placeholder rows, so the revenue figure and its chart stay clear. Real words:
// Revenue, the total, the change, and the notification. Narrow, the sidebar
// goes and both devices keep their true size: the window runs off the right,
// the phone stands a gutter in from it, whole across, its notification whole.

const REVENUE = [18, 22, 20, 27, 25, 31, 29, 36, 34, 41, 39, 47]

const ROWS = [
  { name: 74, amount: 40 },
  { name: 58, amount: 46 },
  { name: 82, amount: 36 },
  { name: 64, amount: 44 },
  { name: 70, amount: 38 },
]

const WALL = WALLPAPER

export default function PaymentsStatic() {
  return (
    <Stage width={640} height={400} compact={{ below: 600, width: 358, height: 400 }} className="ps-section">
      {() => (
        <>
          <Window url="dashboard.northwind.co" className="ps-window">
            <aside className="ps-sidebar">
              <span className="ps-logo">Northwind</span>
              {[46, 58, 40, 52, 36].map((w, i) => (
                <div key={i} className="ps-nav" data-active={i === 0 || undefined}>
                  <Bar w={10} h={10} r={3} tone={i === 0 ? 4 : 2} />
                  <Bar w={w} h={5} tone={i === 0 ? 4 : 2} />
                </div>
              ))}
            </aside>

            <div className="ps-main">
              <div className="ps-top">
                <section className="ps-revenue">
                  <div className="ps-head">
                    <Text className="ps-label">Revenue</Text>
                    <Bar w={48} h={18} r={5} tone={1} />
                  </div>
                  <div className="ps-figure">
                    <Text className="ps-total">$12,604.80</Text>
                    <Badge tone="success">+12.4%</Badge>
                  </div>
                  <Bar w={72} h={5} tone={2} />
                  <Chart data={REVENUE} width={224} height={88} className="ps-chart" />
                  <div className="ps-axis">
                    <Bar w={22} h={4} tone={1} />
                    <Bar w={22} h={4} tone={1} />
                  </div>
                </section>

              </div>

              <div className="ps-list">
                <Bar w={64} h={6} tone={3} style={{ marginBottom: 10 }} />
                {ROWS.map((row, i) => (
                  <div key={i} className="ps-row">
                    <Bar w={16} h={16} r={5} tone={2} />
                    <Bar w={row.name} tone={3} />
                    <Bar w={row.amount} tone={2} style={{ marginLeft: 'auto' }} />
                  </div>
                ))}
              </div>
            </div>
          </Window>

          <Phone width={236} frame="pro" dark wallpaper={WALL} className="ps-phone">
            <LockScreen size="satellite" stack="top">
              {/* The product's own app sends it: the dashboard's bolt, not Mail */}
              <Notification icon={<Icon name="bolt" filled size={20} />} title="Payment received" body="$249.00 from Oak & Ivy" />
            </LockScreen>
          </Phone>
        </>
      )}
    </Stage>
  )
}
