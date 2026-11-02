import { useCallback, type ReactNode } from 'react'
import { Popover, Stage, Swap, Window, type Act, type Layout } from '../../kit'
import './wiki.css'

// Wikipedia (Vector 2022) in a browser, for a docs page (800 wide). Story:
// search as you go. The reader is on Mount Fuji, clicks into the search
// field and types "lake"; Wikipedia's typeahead drops under the field with
// thumbnails and short descriptions. They keep typing, "kaw", and the list
// refines in place until Lake Kawaguchi sits on top, with its photo. One
// click and the page is the lake. The browser's back button returns to Mount
// Fuji, which is the loop's caused reset.
//
// Realistic fidelity, as the prompt asks for "exactly like Wikipedia": the
// suggestions are the ones Wikipedia really returns for "lake kaw", the
// rows use Codex's geometry (60px rows, 40px thumbnails, a placeholder
// thumbnail for an article without an image, the "Search for pages
// containing" footer), and the icons are Codex's own paths.

type Page = 'fuji' | 'lake'
type S = {
  focus: boolean
  q: string
  menu: boolean
  // Which result set each row shows, so the refine can ripple down the list
  rows: number[]
  // The field after navigating: the query fades and the placeholder returns
  cleared: boolean
  page: Page
}
const initial: S = { focus: false, q: '', menu: false, rows: [0, 0, 0, 0], cleared: false, page: 'fuji' }

const REST = { wide: { x: 300, y: 470 }, compact: { x: 200, y: 470 } }

type Thumb = 'photo' | 'baikal' | 'tahoe' | 'victoria' | 'superior' | 'kaweah' | 'kawaupaka' | 'none'
type Result = { title: string; desc: string; thumb: Thumb }

// What Wikipedia suggests for "lake", then for "lake kaw" (October 2026).
const RESULTS: Result[][] = [
  [
    { title: 'Lake Baikal', desc: 'Freshwater rift lake in Russia', thumb: 'baikal' },
    { title: 'Lake Tahoe', desc: 'Lake in California and Nevada, US', thumb: 'tahoe' },
    { title: 'Lake Victoria', desc: 'African Great Lake', thumb: 'victoria' },
    { title: 'Lake Superior', desc: 'Largest of the Great Lakes of North America', thumb: 'superior' },
  ],
  [
    { title: 'Lake Kawaguchi', desc: 'Lake in Yamanashi prefecture, Japan', thumb: 'photo' },
    { title: 'Lake Kaweah', desc: 'Reservoir in Tulare County, California', thumb: 'kaweah' },
    { title: 'Lake Kawaupaka', desc: 'Lake in New Zealand', thumb: 'kawaupaka' },
    { title: 'The Lake (Kawabata novel)', desc: '1954 novel by Yasunari Kawabata', thumb: 'none' },
  ],
]

// A person's typing: uneven, but the same every loop
const RHYTHM = [1.1, 0.8, 1.3, 0.9, 1.6, 1, 0.75, 1.2]

async function typeOn(a: Act<S>, from: string, to: string) {
  for (let i = from.length + 1; i <= to.length; i++) {
    await a.set({ q: to.slice(0, i) })
    await a.wait(105 * RHYTHM[i % RHYTHM.length])
  }
}

async function script(a: Act<S>) {
  const rest = REST[a.layout]
  await a.wait(900)

  // 1. Into the search field
  a.mark('search')
  await a.click({ at: 'field', x: 0.72, y: 0.55 })
  await a.set({ focus: true })
  await a.wait(350)

  // 2. "lake": suggestions drop under the field
  await typeOn(a, '', 'lake')
  await a.wait(140)
  await a.set({ menu: true })
  await a.wait(900)

  // 3. "kaw": the list refines in place, top row first
  a.mark('refine')
  await typeOn(a, 'lake', 'lake kaw')
  await a.wait(120)
  await a.stagger([0, 1, 2, 3], (i) => a.set((s) => ({ rows: s.rows.map((r, j) => (j === i ? 1 : r)) })), 50)
  await a.wait(900)

  // 4. Pick Lake Kawaguchi: the menu closes and the page becomes the lake
  a.mark('pick')
  await a.move({ at: 'result', x: 0.74, y: 0.3 })
  await a.wait(250)
  await a.click()
  await a.set({ menu: false })
  await a.wait(140)
  await a.set({ page: 'lake', focus: false, cleared: true })
  a.mark('lake')
  await a.move({ x: rest.x + 40, y: rest.y - 20 })
  await a.wait(2600)

  // 5. Back to Mount Fuji, the way a reader would
  a.mark('back')
  await a.click('back')
  await a.set({ page: 'fuji' })
  await a.snap({ q: '', cleared: false, rows: [0, 0, 0, 0] }, 'field')
  await a.move(rest)
  await a.wait(700)
}

export default function WikipediaSearch() {
  return (
    <Stage
      width={800}
      height={560}
      compact={{ below: 600, width: 400, height: 560 }}
      initial={initial}
      poster={{ ...initial, focus: true, q: 'lake kaw', menu: true, rows: [1, 1, 1, 1] }}
      script={script}
      fidelity="realistic"
      cursor={{ at: REST }}
      className="wk-stage"
    >
      {(s, _rect, layout) => <Scene s={s} layout={layout} />}
    </Stage>
  )
}

function Scene({ s, layout }: { s: S; layout: Layout }) {
  const compact = layout === 'compact'
  // The kit's browser chrome draws its back arrow without a target; name it
  // here so the script can aim at it (see the report: a kit gap).
  const nameBack = useCallback((el: HTMLSpanElement | null) => {
    el?.closest('.ss-stage')?.querySelector('.ss-window__nav .ss-window__chev')?.setAttribute('data-target', 'back')
  }, [])
  return (
    <Window url={`en.wikipedia.org/wiki/${s.page === 'fuji' ? 'Mount_Fuji' : 'Lake_Kawaguchi'}`} nav className="wk-window">
      <span ref={nameBack} hidden />
      <div className="wk-page">
        <Header s={s} compact={compact} />
        <div className="wk-pages" data-crop>
          <div className="wk-pg" data-show={s.page === 'fuji' || undefined}>
            <Fuji compact={compact} />
          </div>
          <div className="wk-pg" data-show={s.page === 'lake' || undefined}>
            <Lake compact={compact} />
          </div>
        </div>
      </div>
    </Window>
  )
}

/* ---- Header and search ---- */

function Header({ s, compact }: { s: S; compact: boolean }) {
  const typed = s.q.length > 0 && !s.cleared
  return (
    <header className="wk-header">
      <CdxIcon name="menu" />
      <Logo compact={compact} />
      <div className="wk-search">
        <div className="wk-field" data-target="field" data-cursor="ibeam" data-focus={s.focus || undefined} data-menu={s.menu || undefined}>
          <CdxIcon name="search" size={20} className="wk-field__icon" />
          <span className="wk-field__text">
            <span className="wk-ph" data-hide={typed || undefined}>
              Search Wikipedia
            </span>
            <span className="wk-q" data-show={typed || undefined} data-snap>
              {s.q}
              <span className="wk-caret" data-on={(s.focus && !s.cleared) || undefined} data-typing={(s.q.length > 0 && s.q.length < 8) || undefined} />
            </span>
          </span>
        </div>
        {!compact && <div className="wk-button">Search</div>}

        <Popover show={s.menu} origin="top center" className="wk-menu">
          <div className="wk-menu__list">
            {s.rows.map((set, i) => {
              const r = RESULTS[set][i]
              return (
                <div key={i} className="wk-result" data-target={i === 0 ? 'result' : undefined} data-cursor="hand">
                  <Swap id={set} duration={360} className="wk-swap" style={{ width: '100%' }}>
                    <span className="wk-result__inner">
                      <ThumbImage kind={r.thumb} />
                      <span className="wk-result__text">
                        <span className="wk-result__title">{r.title}</span>
                        <span className="wk-result__desc">{r.desc}</span>
                      </span>
                    </span>
                  </Swap>
                </div>
              )
            })}
          </div>
          <div className="wk-menu__footer">
            <span className="wk-menu__footer-icon">
              <CdxIcon name="articleSearch" size={20} />
            </span>
            <span className="wk-menu__footer-text" data-snap>
              Search for pages containing <b>{s.q}</b>
            </span>
          </div>
        </Popover>
      </div>
      <span className="wk-spacer" />
      {!compact && <span className="wk-userlink">Log in</span>}
      <CdxIcon name="ellipsis" />
    </header>
  )
}

/* ---- The two articles ---- */

function Titlebar({ title, langs, compact }: { title: string; langs: number; compact: boolean }) {
  return (
    <>
      <div className="wk-titlebar">
        <CdxIcon name="listBullet" />
        <div className="wk-title">{title}</div>
        <span className="wk-spacer" />
        <span className="wk-lang">
          <CdxIcon name="language" size={18} />
          {!compact && <span>{langs} languages</span>}
          <CdxIcon name="expand" size={12} />
        </span>
      </div>
      <nav className="wk-tabs">
        <span className="wk-tab" data-selected>
          Article
        </span>
        <span className="wk-tab wk-blue">Talk</span>
        <span className="wk-spacer" />
        <span className="wk-tab" data-selected>
          Read
        </span>
        <span className="wk-tab wk-blue">Edit</span>
        {!compact && <span className="wk-tab wk-blue">View history</span>}
        <span className="wk-tab wk-more">
          <CdxIcon name="ellipsis" size={16} className="wk-kebab" />
        </span>
      </nav>
    </>
  )
}

function Fuji({ compact }: { compact: boolean }) {
  return (
    <>
      <Titlebar title="Mount Fuji" langs={129} compact={compact} />
      <div className="wk-content">
        {!compact && (
          <Infobox
            name="Mount Fuji"
            tone="mountain"
            img="fuji"
            caption="Mount Fuji from Lake Kawaguchi"
            rows={[
              ['Elevation', '3,776 m (12,388 ft)'],
              ['Prominence', '3,776 m (12,388 ft)'],
              ['Coordinates', <a className="wk-link" data-cursor="hand">35°21′N 138°43′E</a>],
              ['Native name', '富士山'],
              ['Country', 'Japan'],
            ]}
          />
        )}
        <div className="wk-tagline">From Wikipedia, the free encyclopedia</div>
        {compact && <div className="wk-figure" data-img="fuji" />}
        <p data-cursor="ibeam">
          <b>Mount Fuji</b> is an active <a className="wk-link" data-cursor="hand">stratovolcano</a> located on the Japanese island of{' '}
          <a className="wk-link" data-cursor="hand">Honshu</a>, with a summit elevation of 3,776.24 m (12,389 ft). It is the highest
          mountain in Japan, and the second-highest <a className="wk-link" data-cursor="hand">volcano</a> on any Asian island.
        </p>
        <p data-cursor="ibeam">
          It is located about 100 km southwest of <a className="wk-link" data-cursor="hand">Tokyo</a>, from which it is visible on clear
          days. It has an exceptionally symmetrical cone, which is covered in snow for about five months of the year.
        </p>
        <div className="wk-h2">Etymology</div>
        <p data-cursor="ibeam">
          The current <a className="wk-link" data-cursor="hand">kanji</a> for Mount Fuji, 富 and 士, mean wealth or abundant and a man of a
          certain status respectively.
        </p>
      </div>
    </>
  )
}

function Lake({ compact }: { compact: boolean }) {
  return (
    <>
      <Titlebar title="Lake Kawaguchi" langs={24} compact={compact} />
      <div className="wk-content">
        {!compact && (
          <Infobox
            name="Lake Kawaguchi"
            tone="water"
            img="lake"
            caption="Lake Kawaguchi with Mount Fuji"
            rows={[
              ['Location', <a className="wk-link" data-cursor="hand">Yamanashi Prefecture</a>],
              ['Surface area', '6.13 km² (2.37 sq mi)'],
              ['Max. depth', '15.2 m (50 ft)'],
              ['Basin countries', 'Japan'],
              ['Surface elevation', '833 m (2,733 ft)'],
            ]}
          />
        )}
        <div className="wk-tagline">From Wikipedia, the free encyclopedia</div>
        {compact && <div className="wk-figure" data-img="lake" />}
        <p data-cursor="ibeam">
          <b>Lake Kawaguchi</b> (河口湖, <i>Kawaguchi-ko</i>) is located in the town of{' '}
          <a className="wk-link" data-cursor="hand">Fujikawaguchiko</a> in southern <a className="wk-link" data-cursor="hand">Yamanashi Prefecture</a> near{' '}
          <a className="wk-link" data-cursor="hand">Mount Fuji</a>, Japan. It is the second largest of the{' '}
          <a className="wk-link" data-cursor="hand">Fuji Five Lakes</a> in terms of surface area.
        </p>
        <p data-cursor="ibeam">
          The lake is within the borders of the <a className="wk-link" data-cursor="hand">Fuji-Hakone-Izu National Park</a>, and has the
          longest shoreline of any of the Fuji Five Lakes.
        </p>
        <div className="wk-h2">History</div>
        <p data-cursor="ibeam">
          The lake has no natural outlet, and flooding of settlements on its shores was a problem until a canal was
          completed in 1914 to connect it to a tributary of the <a className="wk-link" data-cursor="hand">Sagami River</a>.
        </p>
      </div>
    </>
  )
}

function Infobox({ name, tone, img, caption, rows }: { name: string; tone: 'mountain' | 'water'; img: 'fuji' | 'lake'; caption: string; rows: [string, ReactNode][] }) {
  return (
    <aside className="wk-infobox">
      <div className="wk-infobox__name" data-tone={tone}>
        {name}
      </div>
      <div className="wk-infobox__img" data-img={img} role="img" aria-label={caption} />
      <div className="wk-infobox__caption">{caption}</div>
      <table>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th>{k}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  )
}

/* ---- Thumbnails ---- */

// Every suggestion has a photo, as on wikipedia.org. Lake Kawaguchi's is
// the real one its article opens with; the others are tight crops of the
// demo's two photos (a hillside, open water, a shoreline at dusk), which at
// 40px read as their own photos. Kawaupaka's real thumbnail is black and
// white, so its crop is too. The novel has Codex's placeholder, as an
// article without an image does.
const CROPS: Record<Exclude<Thumb, 'photo' | 'none'>, { img: 'lake' | 'fuji'; size: number; at: string; filter?: string }> = {
  baikal: { img: 'lake', size: 320, at: '0% 46%', filter: 'saturate(0.75)' },
  tahoe: { img: 'lake', size: 260, at: '100% 88%' },
  victoria: { img: 'fuji', size: 360, at: '0% 30%', filter: 'brightness(1.1)' },
  superior: { img: 'fuji', size: 460, at: '100% 100%' },
  kaweah: { img: 'lake', size: 380, at: '92% 52%' },
  kawaupaka: { img: 'fuji', size: 320, at: '100% 72%', filter: 'grayscale(1) contrast(1.1)' },
}

function ThumbImage({ kind }: { kind: Thumb }) {
  if (kind === 'photo') return <span className="wk-thumb" data-img="lake" />
  if (kind === 'none')
    return (
      <span className="wk-thumb" data-empty>
        <CdxIcon name="image" size={20} />
      </span>
    )
  const c = CROPS[kind]
  return <span className="wk-thumb" data-img={c.img} style={{ backgroundSize: `${c.size}% auto`, backgroundPosition: c.at, filter: c.filter }} />
}

/* ---- Logo and icons ---- */

/* Wikipedia's mark, drawn small and plain: a globe with a few puzzle seams,
   next to the wordmark set in a serif. */
function Logo({ compact }: { compact: boolean }) {
  return (
    <div className="wk-logo">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#72777d" strokeWidth="1">
        <circle cx="15" cy="15" r="13" fill="#f8f9fa" />
        <path d="M6 7.5c3 2 15 2 18 0M3 14c4 1.6 20 1.6 24 0M4 21c4-1.4 18-1.4 22 0" />
        <path d="M15 2c-4 4-5 22 0 26M15 2c4 4 5 22 0 26" />
        <path d="M9.5 4.5l1 3.2M20 7.6l.8 6.6M11 15.4l-.6 6" />
      </svg>
      {!compact && (
        <div className="wk-wordmark">
          <span className="wk-wordmark__name">
            W<small>IKIPEDI</small>A
          </span>
          <span className="wk-wordmark__tag">The Free Encyclopedia</span>
        </div>
      )}
    </div>
  )
}

// Codex, Wikimedia's icon set (MIT), at its native 20px grid
const CDX: Record<string, ReactNode> = {
  menu: <path d="M1 3h18v2H1zm0 6h18v2H1zm0 6h18v2H1z" />,
  search: <path d="M8 1a7 7 0 015.605 11.191l5.102 5.102-1.414 1.414-5.102-5.102A7 7 0 118 1m0 2a5 5 0 100 10A5 5 0 008 3" />,
  ellipsis: <path d="M4 11.5H1v-3h3zm7.5 0h-3v-3h3zm7.5 0h-3v-3h3z" />,
  listBullet: <path d="M1 3h2v2H1zm0 6h2v2H1zm0 6h2v2H1zM5 3h14v2H5zm0 6h14v2H5zm0 6h14v2H5z" />,
  expand: <path d="m16.7 8-6 6H9.3l-6-6 1.4-1.4 5.3 5.3 5.3-5.3z" />,
  language: (
    <path d="m17.835 19-1.248-3h-4.174l-1.248 3.001H9l4.577-11.005h1.846L20 19zm-4.59-5h2.51L14.5 10.982zM7.618 3H12v2H9.991a8.5 8.5 0 01-1.423 4.02q-.24.358-.528.707.634.367 1.379.711l.908.42-.839 1.816-.907-.42a18 18 0 01-2.026-1.09c-1.255.979-2.912 1.8-5.076 2.31l-.973.228-.458-1.946.973-.23c1.631-.383 2.885-.954 3.85-1.608C3.29 8.527 2.317 6.884 2.065 5H0V3h5.382l-.724-1.447 1.79-.895L7.617 3ZM4.094 5c.243 1.282.974 2.489 2.29 3.586A6.54 6.54 0 007.98 5z" />
  ),
  image: (
    <>
      <path d="M15 15H5l3.5-4 2 2L15 8z" />
      <path d="M19 19H1V1h18zM3 17h14V3H3z" />
      <circle cx="6.5" cy="6.5" r="1.5" />
    </>
  ),
  articleSearch: <path d="M18 20H2V0h16zM4 18h10.969l-3.343-4.347a4 4 0 111.565-1.244L16 16.06V2H4zm6-10a2 2 0 100 4 2 2 0 000-4" />,
}

function CdxIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={`wk-icon${className ? ` ${className}` : ''}`} width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      {CDX[name]}
    </svg>
  )
}
