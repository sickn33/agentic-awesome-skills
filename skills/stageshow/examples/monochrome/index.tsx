import { Bar, Stage, Text, Window } from '../../kit'
import './mono.css'

// Monochrome customers: three customers' sites side by side in grayscale,
// fading out at the foot. A still, for a "built on" or showcase section.
//
// What makes a wall of other people's products read as one picture:
// - One treatment for all of them: grayscale and a little lift in contrast.
//   Their brand colors would fight each other and the page's own accent.
// - Same height, same top, one gap, every site whole across: each has a real
//   headline, and the stage may only cut filler. It is the row of windows
//   layout, quiet: no focus, no hero shadow.
// - Fade at the foot with a mask (framing.md's fade crop), over filler, so
//   the row sinks into the page instead of stopping at a line.
// - Each site has one real line, its own headline, so they read as
//   different products; everything else is placeholder at the right sizes.
//
// Real strings: the three URLs and headlines.

const SITES = [
  { url: 'lumen.studio', head: 'Light for small rooms', hue: '#d97706', tone: 'warm' },
  { url: 'halvorsen.co', head: 'Accounting, without the paperwork', hue: '#2563eb', tone: 'cool' },
  { url: 'tidepool.app', head: 'Swim lessons, booked in a tap', hue: '#059669', tone: 'fresh' },
]

export default function Monochrome() {
  return (
    <Stage width={720} height={320} compact={{ below: 600, width: 358, height: 320 }} className="mn">
      {() => (
        <div className="mn-fade">
          <div className="mn-row">
            {SITES.map((site) => (
              <Window key={site.url} url={site.url} className="mn-win">
                <div className="mn-site" style={{ ['--mn-hue' as string]: site.hue }}>
                  <div className="mn-nav">
                    <Bar w={18} h={18} r={5} style={{ background: site.hue }} />
                    <Bar w={40} h={6} r={3} tone={2} />
                    <Bar w={34} h={6} r={3} tone={2} />
                  </div>
                  <Text className="mn-head">{site.head}</Text>
                  <Bar w={150} h={7} r={3.5} tone={2} />
                  <span className="mn-cta" />
                  <div className="mn-hero" />
                </div>
              </Window>
            ))}
          </div>
        </div>
      )}
    </Stage>
  )
}
