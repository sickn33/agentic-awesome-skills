import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './ios.css'

// The iOS 27 keyboard, at true points inside a Phone: the Liquid Glass sheet
// with its predictive bar, softly rounded keys with wide gaps, special keys
// the same color as the letters, a ↵ return key, and the emoji and dictation
// buttons below the keys. Measured from iOS 27 screenshots.

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm']

export interface KeyboardProps {
  /**
   * The text typed so far. Each new character pops its key, and shift follows
   * iOS's auto-capitalisation (on at the start and after a sentence ends).
   */
  typed?: string
  /** Force shift on or off instead of following the text. */
  shift?: boolean
  /** The three words in the predictive bar. */
  suggestions?: [string, string, string]
  /** A key held down: a letter, or 'shift', 'delete', 'return', 'space', '123'. */
  pressed?: string | null
  dark?: boolean
  className?: string
  style?: CSSProperties
}

function Glyph({ name }: { name: 'shift' | 'shift-on' | 'delete' | 'return' | 'emoji' | 'mic' }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  switch (name) {
    case 'shift':
    case 'shift-on':
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path d="M12 3.6 3.4 12.4H8v7.4h8v-7.4h4.6Z" {...common} fill={name === 'shift-on' ? 'currentColor' : 'none'} />
        </svg>
      )
    case 'delete':
      return (
        <svg viewBox="0 0 26 24" width="24" height="22" aria-hidden>
          <path d="M8.6 4.5h13.2a2.2 2.2 0 0 1 2.2 2.2v10.6a2.2 2.2 0 0 1-2.2 2.2H8.6L2 12Z" {...common} />
          <path d="m11.4 8.6 6.8 6.8m0-6.8-6.8 6.8" {...common} />
        </svg>
      )
    case 'return':
      return (
        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
          <path d="M19.5 5.5v6.2a2.3 2.3 0 0 1-2.3 2.3H5" {...common} />
          <path d="m9.2 9.6-4.4 4.4 4.4 4.4" {...common} />
        </svg>
      )
    case 'emoji':
      return (
        <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden>
          <circle cx="14" cy="14" r="12.5" fill="currentColor" />
          <ellipse cx="10" cy="10.6" rx="1.5" ry="2.1" fill="var(--ss-kb-sheet)" />
          <ellipse cx="18" cy="10.6" rx="1.5" ry="2.1" fill="var(--ss-kb-sheet)" />
          <path d="M7.4 15.2c.9 3.6 3.6 5.8 6.6 5.8s5.7-2.2 6.6-5.8Z" fill="var(--ss-kb-sheet)" />
        </svg>
      )
    case 'mic':
      return (
        <svg viewBox="0 0 24 28" width="22" height="26" aria-hidden>
          <rect x="7.6" y="2" width="8.8" height="15" rx="4.4" fill="currentColor" />
          <path d="M4.2 12.8a7.8 7.8 0 0 0 15.6 0M12 20.6V26M8 26h8" {...common} strokeWidth={1.9} />
        </svg>
      )
  }
}

/**
 * The iOS keyboard. Put it at the bottom of a Phone's screen, under the
 * composer; pass `typed` and it pops each key as the text grows.
 */
export function Keyboard({ typed = '', shift, suggestions = ['I', 'The', 'I’m'], pressed, dark, className, style }: KeyboardProps) {
  // The key that just landed, shown in its callout for a moment
  const [pop, setPop] = useState<{ ch: string; n: number } | null>(null)
  const last = useRef(typed)
  useEffect(() => {
    const was = last.current
    last.current = typed
    if (typed.length <= was.length || !typed.startsWith(was)) return
    const ch = typed[typed.length - 1].toLowerCase()
    setPop((p) => ({ ch, n: (p?.n ?? 0) + 1 }))
    const id = setTimeout(() => setPop(null), 140)
    return () => clearTimeout(id)
  }, [typed])
  const auto = typed === '' || /[.!?]\s$/.test(typed)
  const upper = shift ?? auto
  const down = (k: string) => pressed === k || (k.length === 1 && pop?.ch === k)
  return (
    <div className={`ss-kb${className ? ` ${className}` : ''}`} data-dark={dark || undefined} style={style}>
      <div className="ss-kb__suggest">
        {suggestions.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      {ROWS.map((row, r) => (
        <div key={r} className="ss-kb__row" data-row={r}>
          {r === 2 && (
            <span className="ss-kb__key ss-kb__key--wide" data-down={down('shift') || undefined}>
              <Glyph name={upper ? 'shift-on' : 'shift'} />
            </span>
          )}
          {row.split('').map((k) => (
            <span key={k} className="ss-kb__key" data-down={down(k) || undefined}>
              {upper ? k.toUpperCase() : k}
              {pop?.ch === k && (
                <span key={pop.n} className="ss-kb__callout" aria-hidden>
                  {upper ? k.toUpperCase() : k}
                </span>
              )}
            </span>
          ))}
          {r === 2 && (
            <span className="ss-kb__key ss-kb__key--wide" data-down={down('delete') || undefined}>
              <Glyph name="delete" />
            </span>
          )}
        </div>
      ))}
      <div className="ss-kb__row ss-kb__row--bottom">
        <span className="ss-kb__key ss-kb__key--mode" data-down={down('123') || undefined}>
          123
        </span>
        <span className="ss-kb__key ss-kb__key--space" data-down={down('space') || down(' ') || undefined} />
        <span className="ss-kb__key ss-kb__key--mode" data-down={down('return') || undefined}>
          <Glyph name="return" />
        </span>
      </div>
      <div className="ss-kb__below">
        <Glyph name="emoji" />
        <Glyph name="mic" />
      </div>
    </div>
  )
}
