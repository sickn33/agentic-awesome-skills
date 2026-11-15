import './keys.css'

// Keystrokes shown as keycaps (act.key): the caps for a combo, and the rows
// the stage draws them in.

/** Where keycaps show. Give `{ wide, compact }` to place them per layout. */
export type KeysAt = 'bottom' | 'top' | 'bottom-left' | 'bottom-right'

// Each keystroke is its own row of caps, so one still fading out never
// changes or recenters when the next arrives
export type Keys = { id: number; caps: string[]; show: boolean; down: boolean }

const KEYCAPS: Record<string, string> = { cmd: '⌘', shift: '⇧', alt: '⌥', option: '⌥', ctrl: '⌃', enter: '↵', return: '↵', esc: 'esc', tab: '⇥', up: '↑', down: '↓', left: '←', right: '→', backspace: '⌫' }

/** 'cmd+k' as caps: ['⌘', 'K']. */
export const capsOf = (combo: string) => combo.split('+').map((k) => KEYCAPS[k.trim().toLowerCase()] ?? k.trim().toUpperCase())

/** The last row (fading out) and the current one. */
export function Keycaps({ rows, at }: { rows: (Keys | null)[]; at: KeysAt }) {
  return (
    <>
      {rows.map(
        (row) =>
          row && (
            <div key={row.id} className="ss-keys" data-show={row.show} data-at={at} aria-hidden>
              {row.caps.map((c, i) => (
                <kbd key={i} className="ss-key" data-down={row.down}>
                  {c}
                </kbd>
              ))}
            </div>
          ),
      )}
    </>
  )
}
