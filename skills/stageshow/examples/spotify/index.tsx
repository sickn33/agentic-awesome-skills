import { ChevronLeft, ChevronRight, CirclePlus, Clock3, House, Library, ListMusic, MicVocal, MonitorSpeaker, Pause, Play, Plus, Repeat, Search, Shuffle, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { Bar, Stage, Swap, Text, Window, type Act } from '../../kit'
import './spotify.css'

// Spotify desktop, dark, about 860 wide. A hero loop.
//
// Story: a playlist is open and "Low Tide" is playing from it (green title,
// equaliser in place of its number). The cursor double-clicks "Neon Harbor"
// two rows down: the green and the equaliser move to that row, the
// now-playing bar swaps art, title and artist, the total time changes and
// the progress bar starts again from 0:00 and keeps moving. After a hold the
// cursor double-clicks "Low Tide" again, which restarts it from 0:00: the
// exact frame the loop opens on, so the reset is caused, not a seam.
//
// Real strings: the playlist title, the two songs and their artists, the two
// times. Everything else is a line or album art.
// Icons: Spotify's own set isn't available, so lucide, chosen for its plain
// geometric strokes, which are close to Spotify's; play and pause are filled.

type Id = 'a' | 'b'
type S = { playing: Id; sel: Id; elapsed: number }

const initial: S = { playing: 'a', sel: 'a', elapsed: 0 }

const SONGS: Record<Id, { title: string; artist: string; art: number; dur: number }> = {
  a: { title: 'Low Tide', artist: 'Marlo', art: 2, dur: 196 },
  b: { title: 'Neon Harbor', artist: 'The Vales', art: 4, dur: 168 },
}

// Rows of the playlist. Real text only on the two songs the story plays.
const ROWS: { id?: Id; art: number; t: number; ar: number; al: number }[] = [
  { id: 'a', art: 2, t: 0, ar: 0, al: 58 },
  { art: 3, t: 52, ar: 46, al: 82 },
  { id: 'b', art: 4, t: 0, ar: 0, al: 64 },
  { art: 1, t: 64, ar: 40, al: 70 },
  { art: 5, t: 70, ar: 34, al: 50 },
  { art: 6, t: 58, ar: 44, al: 74 },
]

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

async function script(a: Act<S>) {
  // The song keeps playing under everything the cursor does
  let live = true
  ;(async () => {
    try {
      while (live) {
        await a.wait(1000)
        if (live) a.put((s) => ({ elapsed: s.elapsed + 1 }))
      }
    } catch {
      /* stopped */
    }
  })()

  await a.wait(1400)

  // Play Neon Harbor
  a.mark('play')
  await a.move({ at: 'row-b', x: 0.72, y: 0.5 })
  await a.wait(350)
  await a.click(undefined, { double: true })
  await a.set({ playing: 'b', sel: 'b', elapsed: 0 })
  await a.wait(1100)

  // Down to the player, where the new song is running: hovering the
  // progress bar lights it green and shows its handle, as Spotify does
  a.mark('progress')
  await a.move({ at: 'progress', x: 0.62, y: 0.5 })
  await a.wait(4400)

  // Back to Low Tide, which starts again from the top: the opening frame
  a.mark('back')
  await a.move({ at: 'row-a', x: 0.72, y: 0.5 })
  await a.wait(350)
  await a.click(undefined, { double: true })
  live = false
  await a.set({ playing: 'a', sel: 'a', elapsed: 0 })
}

function Art({ n, className = '' }: { n: number; className?: string }) {
  return <span className={`spt-art spt-art--${n} ${className}`} />
}

function Eq() {
  return (
    <span className="spt-eq" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export default function SpotifyDemo() {
  return (
    <Stage
      width={860}
      height={600}
      compact={{ below: 600, width: 400, height: 520 }}
      initial={initial}
      script={script}
      theme="dark"
      accent="#1ed760"
      cursor={{ at: { at: 'row-a', x: 0.72, y: 0.5 } }}
      className="spt-stage"
    >
      {(s, _rect, layout) => {
        const song = SONGS[s.playing]
        const compact = layout === 'compact'
        return (
          <Window
            className="spt-window"
            data-layout={layout}
            lead={
              <>
                <span className="spt-nav">
                  <ChevronLeft size={18} strokeWidth={2} />
                  <ChevronRight size={18} strokeWidth={2} className="spt-faint" />
                </span>
                <span className="spt-center">
                  <span className="spt-home">
                    <House size={16} strokeWidth={2} />
                  </span>
                  <span className="spt-search">
                    <Search size={15} strokeWidth={2} />
                    <Bar w={compact ? 96 : 196} h={5} tone={3} />
                  </span>
                </span>
              </>
            }
            toolbar={<span className="spt-me" />}
          >
            <div className="spt-panels">
              {/* Your Library */}
              <aside className="spt-library" data-crop>
                {compact ? (
                  <div className="spt-lib-head spt-lib-head--rail">
                    <Library size={18} strokeWidth={2} />
                  </div>
                ) : (
                  <>
                    <div className="spt-lib-head">
                      <Library size={18} strokeWidth={2} />
                      <Text className="spt-lib-title">Your Library</Text>
                      <span className="spt-spacer" />
                      <Plus size={16} strokeWidth={2} />
                    </div>
                    <div className="spt-chips">
                      <Bar w={58} h={24} r={12} tone={2} />
                      <Bar w={48} h={24} r={12} tone={2} />
                    </div>
                  </>
                )}
                <div className="spt-lib-list" data-crop>
                  {[
                    { art: 7, t: 72, m: 50, on: true },
                    { art: 3, t: 54, m: 62 },
                    { art: 8, t: 66, m: 40 },
                    { art: 5, t: 48, m: 56 },
                    { art: 1, t: 60, m: 44 },
                    { art: 6, t: 52, m: 58 },
                    { art: 2, t: 68, m: 42 },
                  ].map((p, i) => (
                    <div key={i} className="spt-lib-row" data-on={p.on || undefined}>
                      <Art n={p.art} className="spt-art--lib" />
                      {!compact && (
                        <span className="spt-lines">
                          <Bar w={p.t} h={5} tone={p.on ? 5 : 3} />
                          <Bar w={p.m} h={4} tone={2} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              {/* The playlist */}
              <main className="spt-main" data-crop>
                <header className="spt-header">
                  <Art n={7} className="spt-art--cover" />
                  <div className="spt-heading">
                    <Bar w={44} h={4} tone={4} />
                    <Text className="spt-title">Late Night Drive</Text>
                    <span className="spt-meta">
                      <span className="spt-meta-dot" />
                      <Bar w={compact ? 60 : 96} h={4} tone={3} />
                    </span>
                  </div>
                </header>

                <div className="spt-actions">
                  <span className="spt-bigplay">
                    <Pause size={18} strokeWidth={0} fill="currentColor" />
                  </span>
                  <Shuffle size={20} strokeWidth={2} className="spt-faint-icon" />
                  <CirclePlus size={20} strokeWidth={2} className="spt-faint-icon" />
                  <span className="spt-more">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>

                <div className="spt-tracks">
                  <div className="spt-row spt-row--head">
                    <span className="spt-num">#</span>
                    <Bar w={30} h={4} tone={3} />
                    {!compact && <Bar w={34} h={4} tone={3} />}
                    <Clock3 size={14} strokeWidth={2} className="spt-faint-icon spt-dur" />
                  </div>
                  {ROWS.map((r, i) => {
                    const real = r.id ? SONGS[r.id] : null
                    const on = r.id === s.playing
                    return (
                      <div
                        key={i}
                        className="spt-row"
                        data-target={r.id ? `row-${r.id}` : undefined}
                        data-playing={on || undefined}
                        data-selected={r.id === s.sel || undefined}
                      >
                        <span className="spt-num">
                          <span className="spt-num__n">{i + 1}</span>
                          <Eq />
                        </span>
                        <span className="spt-song">
                          <Art n={r.art} className="spt-art--row" />
                          {real ? (
                            <span className="spt-song-text">
                              <span className="spt-song-title">{real.title}</span>
                              <span className="spt-song-artist">{real.artist}</span>
                            </span>
                          ) : (
                            <span className="spt-lines">
                              <Bar w={r.t} h={5} tone={4} />
                              <Bar w={r.ar} h={4} tone={2} />
                            </span>
                          )}
                        </span>
                        {!compact && <Bar w={r.al} h={4} tone={2} />}
                        <span className="spt-dur">
                          <Bar w={24} h={4} tone={2} />
                        </span>
                      </div>
                    )
                  })}
                </div>
              </main>
            </div>

            {/* Now playing */}
            <footer className="spt-player">
              <div className="spt-now">
                {/* Both songs sit in the same place and crossfade: the art keeps its
                    edges, and the column is as wide as the longer title, so the
                    + after it stays put */}
                <span className="spt-now-art">
                  {(['a', 'b'] as Id[]).map((id) => (
                    <Art key={id} n={SONGS[id].art} className={`spt-art--now${s.playing === id ? ' is-on' : ''}`} />
                  ))}
                </span>
                <span className="spt-now-text">
                  {(['a', 'b'] as Id[]).map((id) => (
                    <span key={id} className="spt-now-song" data-on={s.playing === id || undefined} aria-hidden={s.playing !== id || undefined}>
                      <span className="spt-now-title">{SONGS[id].title}</span>
                      <span className="spt-now-artist">{SONGS[id].artist}</span>
                    </span>
                  ))}
                </span>
                {!compact && <CirclePlus size={16} strokeWidth={2} className="spt-faint-icon" />}
              </div>

              <div className="spt-transport">
                <div className="spt-controls">
                  <Shuffle size={16} strokeWidth={2} className="spt-faint-icon" />
                  <SkipBack size={16} strokeWidth={0} fill="currentColor" className="spt-ctl" />
                  <span className="spt-playbtn">
                    <Pause size={14} strokeWidth={0} fill="currentColor" />
                  </span>
                  <SkipForward size={16} strokeWidth={0} fill="currentColor" className="spt-ctl" />
                  <Repeat size={16} strokeWidth={2} className="spt-faint-icon" />
                </div>
                <div className="spt-progress">
                  <span className="spt-t spt-t--start">{fmt(s.elapsed)}</span>
                  <span className="spt-track" data-target="progress">
                    <span
                      key={s.playing}
                      className="spt-fill"
                      style={{ clipPath: `inset(0 ${(1 - s.elapsed / song.dur) * 100}% 0 0 round 2px)` }}
                    />
                    <span key={`k${s.playing}`} className="spt-knob" style={{ transform: `translateX(${(s.elapsed / song.dur) * 100}%)` }}>
                      <i />
                    </span>
                  </span>
                  <span className="spt-t">
                    <Swap id={s.playing} duration={500}>
                      {fmt(song.dur)}
                    </Swap>
                  </span>
                </div>
              </div>

              <div className="spt-extras" hidden={compact}>
                <MicVocal size={16} strokeWidth={2} className="spt-faint-icon" />
                <ListMusic size={16} strokeWidth={2} className="spt-faint-icon" />
                <MonitorSpeaker size={16} strokeWidth={2} className="spt-faint-icon" />
                <Volume2 size={16} strokeWidth={2} className="spt-faint-icon" />
                <span className="spt-volume">
                  <span />
                </span>
              </div>
            </footer>
          </Window>
        )
      }}
    </Stage>
  )
}
