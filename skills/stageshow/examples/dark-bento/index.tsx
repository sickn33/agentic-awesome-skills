import { Avatar, Bar, Facepile, Stage, Text, Window } from '../../kit'
import './bento.css'

// The bar for a dark, grayscale still: a bento card (360 × 280) for a music
// app, in a dark section of the page. Feature: shared playlists.
//
// Why it works: "shared" is said once, by one link. One row carries Mara's
// badge and the satellite explains it; nothing else repeats the idea. The rows
// keep album art, the thing that makes it a music app. The header is compact
// (cover beside title), so the list has room. Depth on dark comes from a
// lighter raised surface, not shadow.
//
// Story: a playlist that more than one person fills. The window shows the
// playlist with its listeners stacked beside the title; one row is new, and a
// satellite over the sidebar names who added it. Real strings: the playlist
// title and "Added by Mara". Everything else is a line or a shape.

const TRACKS = [
  { title: 62, artist: 40, art: 1 },
  { title: 48, artist: 54, art: 2 },
  { added: true, art: 3 },
  { title: 70, artist: 36, art: 4 },
  { title: 56, artist: 46, art: 5 },
]

export default function DarkBento() {
  return (
    <>
      <Stage width={360} height={280} compact={{ below: 360, width: 358, height: 280 }} theme="dark" palette="mono" className="db-card">
        {() => (
          <>
            <Window className="db-window" lights="grey">
              <aside className="db-sidebar">
                {[46, 52, 40].map((w, i) => (
                  <div key={i} className="db-nav">
                    <Bar w={10} h={10} r={3} tone={i === 2 ? 4 : 2} />
                    <Bar w={w} h={5} tone={i === 2 ? 4 : 2} />
                  </div>
                ))}
              </aside>

              <div className="db-main">
                <header className="db-header">
                  <span className="db-art db-art--cover" />
                  <div className="db-heading">
                    <Text className="db-title">Sunday Slow</Text>
                    <div className="db-people">
                      {/* Cut out, not ringed: the gap shows the window behind */}
                      <Facepile names={['', '', '', '']} tones={['ink', 'ink', 'ink', 'ink']} size={18} overlap={4} className="db-pile" />
                    </div>
                  </div>
                </header>

                <div className="db-list">
                  {TRACKS.map((t, i) =>
                    t.added ? (
                      <div key={i} className="db-row" data-new>
                        <span className="db-row-art">
                          <span className={`db-art db-art--${t.art} db-art--row`} />
                          <Avatar name="Mara" size={14} className="db-face db-face--row" style={{ color: '#111113' }} />
                        </span>
                        <div className="db-lines">
                          <Bar w={58} h={5} tone={5} />
                          <Bar w={38} h={4} tone={3} />
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="db-row">
                        <span className={`db-art db-art--${t.art} db-art--row`} />
                        <div className="db-lines">
                          <Bar w={t.title!} h={5} tone={3} />
                          <Bar w={t.artist!} h={4} tone={2} />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </Window>

            {/* Satellite: the song Mara just added, over the sidebar */}
            <div className="db-detail">
              <div className="db-detail-track">
                <span className="db-art db-art--3 db-art--detail" />
                <div className="db-lines">
                  <Bar w={58} h={5} tone={5} />
                  <Bar w={38} h={4} tone={3} />
                </div>
              </div>
              <div className="db-detail-by">
                <Avatar name="Mara" size={20} className="db-face db-face--detail" style={{ color: '#111113' }} />
                <Text className="db-by">Added by Mara</Text>
              </div>
            </div>
          </>
        )}
      </Stage>
    </>
  )
}
