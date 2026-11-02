import { useLayoutEffect, useEffect, useRef, useState, type HTMLAttributes } from 'react'
import { useReducedMotion } from '../reduced-motion'
import './Count.css'

export interface CountProps extends HTMLAttributes<HTMLSpanElement> {
  value: number
  /** How a number is written, e.g. n => `$${n.toFixed(2)}` */
  format?: (n: number) => string
  /** ms for a digit to roll from the old figure to the new one. */
  duration?: number
  /** ms between one digit starting and the next, from the right. */
  stagger?: number
}

// Three decades of figures, so a digit can roll on past 9 into 0 (or back
// past 0 into 9) without ever running off the end of the strip
const STRIP = '012345678901234567890123456789'.split('')
const MIDDLE = 10

// A unit after the figure ("21°", "240ms", "40%", "12 min"): the run of
// letters or signs that ends the text, after its last digit. It gets a box of
// its own, a hair from the digits (a word space when the format writes one),
// so the pair reads as one figure without the unit sitting on the last digit
const unitOf = (text: string) => {
  const m = /^(.*\d)(\s*)([^\d\s.,]+)$/.exec(text)
  return m ? { head: m[1], space: m[2].length > 0, unit: m[3] } : { head: text, space: false, unit: '' }
}

const digitsFromRight = (text: string) => {
  const out: number[] = []
  for (let i = text.length - 1; i >= 0; i--) {
    const c = text[i]
    if (c >= '0' && c <= '9') out.push(Number(c))
  }
  return out
}

/**
 * A number whose digits roll to each new value, the way a counter does:
 * each changed digit turns from the old figure to the new one, the last digit
 * first, so a total settles from the right. A rise rolls the figures up, a
 * fall rolls them down, and a digit passing 9 carries on into 0 rather than
 * spinning back. Unchanged digits and the punctuation hold still. Tabular
 * figures keep every column the same width. A unit the format writes after
 * the figure ("21°", "240ms", "40%") sits in a box of its own
 * (`.ss-count__unit`), a hair from the last digit, or a word space when the
 * format has one ("12 min"); restyle it there for a smaller or lighter unit,
 * and set `--ss-count-unit-gap` to widen the hair. Inside an `act.snap` or an
 * offscreen reset it jumps to the value, so unseen resets stay unseen.
 */
export function Count({ value, format = (n) => Math.round(n).toLocaleString('en-US'), duration = 700, stagger = 45, className, style, ...rest }: CountProps) {
  const reduced = useReducedMotion()
  const el = useRef<HTMLSpanElement>(null)
  const text = format(value)
  const { head, space, unit } = unitOf(text)
  const chars = head.split('')
  const digits = digitsFromRight(text)
  // Where each column's strip sits, by column from the right. Starts in the
  // middle decade; a change moves it by the shortest turn in the value's
  // direction, and it is put back in the middle once the roll has settled
  const [idx, setIdx] = useState<number[]>(() => digits.map((d) => MIDDLE + d))
  const shown = useRef({ text, value, idx })
  shown.current.idx = idx
  const homing = useRef(false)

  useLayoutEffect(() => {
    const node = el.current
    if (!node) return
    const prev = shown.current
    if (prev.text === text) return
    const instant = reduced || duration <= 0 || !!node.closest('[data-instant], [data-offscreen]')
    const before = digitsFromRight(prev.text)
    const up = value >= prev.value
    const next = digits.map((d, c) => {
      const was = before[c]
      const at = prev.idx[c]
      if (was === undefined || at === undefined || instant) return MIDDLE + d
      if (was === d) return at
      return up ? at + ((d - was + 10) % 10) : at - ((was - d + 10) % 10)
    })
    node.toggleAttribute('data-snap', instant)
    if (!instant) {
      // Settle the old transforms in the browser first, so the new ones transition
      for (const strip of Array.from(node.querySelectorAll<HTMLElement>('.ss-count__strip'))) void getComputedStyle(strip).transform
      node.setAttribute('data-rolling', '')
    }
    shown.current = { text, value, idx: next }
    setIdx(next)
  }, [text, value, reduced, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  // Once every digit has landed, put the strips back in the middle decade
  // without a transition, and drop the rolling mark a still waits on
  useEffect(() => {
    const node = el.current
    if (!node || !node.hasAttribute('data-rolling')) return
    const id = window.setTimeout(() => {
      node.setAttribute('data-snap', '')
      homing.current = true
      const home = digits.map((d) => MIDDLE + d)
      shown.current.idx = home
      setIdx(home)
      node.removeAttribute('data-rolling')
    }, duration + stagger * digits.length + 60)
    return () => window.clearTimeout(id)
  }, [idx]) // eslint-disable-line react-hooks/exhaustive-deps

  // The snap comes off only after the home transforms are in the DOM (a
  // frame callback could run before React commits them, and the strips
  // would then roll a whole decade back to the middle)
  useLayoutEffect(() => {
    const node = el.current
    if (!node || !homing.current) return
    homing.current = false
    for (const strip of Array.from(node.querySelectorAll<HTMLElement>('.ss-count__strip'))) void getComputedStyle(strip).transform
    node.removeAttribute('data-snap')
  }, [idx])

  // Columns are keyed from the right, so a total that gains a digit keeps the
  // digits it already had rolling in place and only the new leading one appears
  let fromRight = digits.length
  return (
    <span {...rest} ref={el} className={`ss-count${className ? ` ${className}` : ''}`} style={style} aria-label={text}>
      {chars.map((c, i) => {
        if (c < '0' || c > '9') return <span key={`s${i}-${c}`} className="ss-count__char" aria-hidden>{c}</span>
        const column = --fromRight
        const at = idx[column] ?? MIDDLE + Number(c)
        return (
          <span key={`d${column}`} className="ss-count__digit" data-crop aria-hidden>
            <span
              className="ss-count__strip"
              style={{ transform: `translateY(${-at}em)`, transitionDuration: `${duration}ms`, transitionDelay: `${column * stagger}ms` }}
            >
              {STRIP.map((n, k) => <span key={k}>{n}</span>)}
            </span>
          </span>
        )
      })}
      {unit && <span className="ss-count__unit" data-space={space || undefined} aria-hidden>{unit}</span>}
    </span>
  )
}
