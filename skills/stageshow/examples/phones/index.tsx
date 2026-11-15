import { Stage, Phone, LockScreen, Notification, Bar, WALLPAPER } from '../../kit'
import { mail } from '../../assets/app-icons'

// Every phone frame in the kit, at the same width. Narrow, a 150 phone's
// notification can't be read, so each frame is drawn at 300 and cropped to
// the half that shows it: the notification and the frame's bottom corners
// (the top, for the frames with an app on screen).

const WALL = WALLPAPER


function Checkout() {
  return (
    <div style={{ display: 'grid', gap: 14, padding: '72px 28px' }}>
      <div style={{ width: 96, height: 96, borderRadius: 20, background: '#f1f2f6', justifySelf: 'center' }} />
      <div style={{ font: '500 22px system-ui', textAlign: 'center', color: '#55607a' }}>Oak dining chair</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div style={{ height: 64, borderRadius: 14, background: '#000' }} />
        <div style={{ height: 64, borderRadius: 14, background: '#00d66f' }} />
      </div>
      {[70, 52, 64].map((w, i) => (
        <Bar key={i} w={`${w}%`} h={14} r={7} tone={2} />
      ))}
    </div>
  )
}

export default function Phones() {
  return (
    <Stage specimen width={720} height={860} compact={{ below: 600, width: 358, height: 2862 }}>
      {(_, __, layout) => (
        <div style={{ display: 'grid', gridTemplateColumns: layout === 'compact' ? '300px' : 'repeat(4, 150px)', justifyContent: 'space-between', rowGap: 28, padding: layout === 'compact' ? 16 : 28, background: 'var(--ss-well)', height: '100%' }}>
          {(['pro', 'silver', 'bezel', 'android', 'soft', 'clay', 'outline', 'bare'] as const).map((frame) => {
            const app = frame === 'soft' || frame === 'outline'
            const phone = (
              <Phone width={layout === 'compact' ? 300 : 150} frame={frame} dark={frame !== 'soft' && frame !== 'outline'} wallpaper={frame === 'soft' || frame === 'outline' ? undefined : WALL}>
                {frame === 'soft' || frame === 'outline' ? (
                  <Checkout />
                ) : (
                  <LockScreen>
                    <Notification icon={<img src={mail} alt="" />} title="Payment received" body="$249.00 from Jackson Hot Yoga" />
                  </LockScreen>
                )}
              </Phone>
            )
            return (
              <div key={frame} style={{ display: 'grid', gap: 10, justifyItems: 'center', font: '500 12px system-ui', color: 'var(--ss-text)' }}>
                {layout === 'compact' ? (
                  <div style={{ display: 'flex', alignItems: app ? 'flex-start' : 'flex-end', height: 300, overflow: 'hidden', paddingBottom: app ? 0 : 12 }}>{phone}</div>
                ) : (
                  phone
                )}
                {frame}
              </div>
            )
          })}
        </div>
      )}
    </Stage>
  )
}
