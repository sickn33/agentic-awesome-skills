// Named curves, as numbers (for tweens on the clock) and as CSS. The video
// ones are measured from product launch films: one house curve for moves
// inside a shot, a steeper one for moves that end in a cut, and an expo-out
// settle for the shot that picks the move up.

export type Bezier = readonly [number, number, number, number]

export const EASE = {
  /** Moves inside a shot (push-in, pan, a long cursor trip): peak at about 40%, long soft tail. 1.4 to 2.7 s. */
  house: [0.65, 0, 0.1, 1],
  /** The outgoing half of a move that ends in a cut: accelerates into it. */
  through: [0.8, 0, 0.1, 1],
  /** The incoming half after a cut: arrives at speed, settles. 0.6 to 0.8 s (1.6 s for a big pull-out). */
  settle: [0.05, 0.85, 0.3, 1],
  /** A cursor arriving from off-frame, already moving. */
  enter: [0.1, 0.8, 0.3, 0.95],
  /** One long cursor trip across the frame. */
  trip: [0.78, 0, 0.17, 1],
  /** The kit's camera push-in (Camera). */
  camera: [0.45, 0, 0.1, 1],
} as const satisfies Record<string, Bezier>

export type EaseName = keyof typeof EASE

export const css = (e: EaseName | Bezier) => {
  const [a, b, c, d] = typeof e === 'string' ? EASE[e] : e
  return `cubic-bezier(${a}, ${b}, ${c}, ${d})`
}

/** cubic-bezier(x1, y1, x2, y2) as a function of time 0..1, as CSS works it out. */
export function bezier(e: EaseName | Bezier): (t: number) => number {
  const [x1, y1, x2, y2] = typeof e === 'string' ? EASE[e] : e
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  const x = (u: number) => ((ax * u + bx) * u + cx) * u
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    // Newton, falling back to bisection where the slope is flat
    let u = t
    for (let i = 0; i < 8; i++) {
      const d = dx(u)
      if (Math.abs(d) < 1e-6) break
      const next = u - (x(u) - t) / d
      if (next < 0 || next > 1) break
      u = next
    }
    if (Math.abs(x(u) - t) > 1e-6) {
      let lo = 0, hi = 1
      for (let i = 0; i < 40; i++) {
        u = (lo + hi) / 2
        if (x(u) < t) lo = u
        else hi = u
      }
    }
    return ((ay * u + by) * u + cy) * u
  }
}

/** The curve's slope as it starts (progress per unit time at t = 0). */
export const startSlope = (e: EaseName | Bezier) => {
  const [x1, y1] = typeof e === 'string' ? EASE[e] : e
  return x1 > 0 ? y1 / x1 : 1e3
}
