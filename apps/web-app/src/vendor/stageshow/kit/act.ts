import { flushSync } from 'react-dom'
import type { Dispatch, SetStateAction } from 'react'
import type { CursorKind } from './cursor'
import { capsOf, type Keys } from './keys'
import type { Layout } from './looks'
import { EMPTY, drawnScale, nameOf, layoutRectOf, rectOf, thumb, type Point, type Rect, type Target } from './measure'
import { bezier } from './ease'
import { clamp, easeInOutCubic, hash, warn } from './util'

// The touch dot lingers a beat after a lift, then goes
const fingerGone = (el: HTMLElement | null | undefined) => { if (!el) return; window.setTimeout(() => el.removeAttribute('data-touching'), 240) }

// The script API: the act a demo's script is handed each run. It drives the
// scene state and the cursor, measures targets, and stops the moment its
// signal aborts (the stage left the screen, or the layout changed).

export interface Act<S> {
  /** Merge a patch into scene state. Resolves once it has painted, so rects are fresh. */
  set(patch: Partial<S> | ((s: S) => Partial<S>)): Promise<void>
  /** Like set, without waiting. For per-frame updates inside drag. */
  put(patch: Partial<S> | ((s: S) => Partial<S>)): void
  wait(ms: number): Promise<void>
  /**
   * Where a target is now, in stage pixels. With `layout`, where it sits in
   * the layout, ignoring transforms: use that to aim at something that is
   * still scaling or sliding in.
   */
  rect(name: string, opts?: { layout?: boolean }): Rect
  /**
   * The character offset a text selection reaches with the pointer at `at`,
   * the way the OS works it out: above the text is its start, below is its
   * end, beside a line clamps to that line, between lines takes the nearer.
   * Call it in a drag's onMove and the highlight stays under the I-beam from
   * the first pixel: `a.drag(end, (at) => a.put({ sel: a.caret('para', at) }))`.
   */
  caret(name: string, at: Point): number
  center(name: string): Point
  /** Move the cursor in a hand-like arc. Hovering a target marks it data-hover. */
  /**
   * `path` sets the route in stage coordinates (eased 0 to 1 progress, the
   * same contract as drag's) instead of the shallow arc: a hand running
   * along a chart line. `onMove(at, from, t)` gets each point on the way, as drag's does, for anything
   * that follows the pointer (a scrubbed day, a hover readout).
   */
  move(to: Target, opts?: { duration?: number; path?: (progress: number, from: Point, to: Point) => Point; onMove?: (at: Point, from: Point, t: number) => void }): Promise<void>
  /**
   * Move (if given a target) and press. `double` presses twice, as a double
   * click does (open a file, select a word). `right` is a secondary click: it
   * looks like any press, so what opens at the pointer (a context menu) is
   * what tells it; pressed elements get data-pressed="right" to tell them apart.
   */
  click(to?: Target, opts?: { double?: boolean; right?: boolean }): Promise<void>
  /**
   * Scroll a target that clips its content (give it the class ss-scroll), the
   * way a trackpad does: the cursor stays put and the content moves. `to` is
   * a scroll offset in px, or the name of a target inside it to bring to the
   * top (less `offset`). Once scrolled, its edges fade over what's hidden.
   * A visible cursor moves into the area first if it isn't over it already,
   * and holds still while the content scrolls under it.
   */
  scroll(name: string, to: number | string, opts?: { duration?: number; offset?: number }): Promise<void>
  cursor(kind: CursorKind): Promise<void>
  /**
   * Apply a patch with transitions off, for resets nothing on screen should
   * explain. Pass a target name to switch transitions off only inside it.
   */
  snap(patch: Partial<S> | ((s: S) => Partial<S>), scope?: string): Promise<void>
  /**
   * Show a keystroke as keycaps: 'cmd+k', 'enter', 'shift+cmd+p'. Resolves
   * as the key comes back up, the moment an app would react; the caps fade
   * on their own.
   */
  key(combo: string): Promise<void>
  /**
   * Start fn for each item, `gap` ms apart (60 by default), and wait for them all. Staggered
   * starts read as organic where a single block reads as mechanical.
   */
  stagger<T>(items: T[], fn: (item: T, i: number) => Promise<void> | void, gap?: number): Promise<void>
  /** Name the current beat. Sets data-mark on the stage so a film can start there (film.mjs --at). */
  mark(name: string): void
  /** Type text into a string key of state, one character at a time, `interval` ms apart on average (35 by default). */
  type(key: keyof S, text: string, opts?: { interval?: number }): Promise<void>
  /** Press, hold and move in the same shallow, hand-like arc as move(), reporting each frame. The cursor
   * dips as it presses and closes into the grab hand at the bottom of the dip, and opens on release by itself:
   * don't switch to 'grab' before a drag, a hovering cursor is never a fist.
   * I-beam and crosshair selections keep their kind. Use cursor: 'preserve'
   * when the product keeps its current cursor during a drag, such as an arrow
   * creating a calendar event. This changes the cursor only, not the path.
   * For constrained mechanics, path receives eased progress (0..1) and returns
   * stage coordinates shared by the hand and onMove. Its endpoints must match
   * from and to. Use a circular path for a dial, or a straight path for a rail. */
  drag(to: Target, onMove?: (at: Point, from: Point, t: number) => void, opts?: { duration?: number; cursor?: 'preserve'; path?: (progress: number, from: Point, to: Point) => Point }): Promise<void>
  /** Put the cursor there at once, with no travel. Only behind a cut, where nothing on screen has to explain it. */
  place(to: Target): void
  /**
   * Bring the cursor in from outside the frame, already moving, and settle
   * it on `to`: it starts past the frame edge nearest the target and never
   * fades in mid-frame. The frame is the stage.
   */
  enter(to: Target, opts?: { duration?: number }): Promise<void>
  readonly signal: AbortSignal
  /** 'wide' or 'compact': which design is showing, so a script can aim or pace per layout. */
  readonly layout: Layout
}

export type Script<S> = (act: Act<S>) => Promise<void>

export class Stopped extends Error {}

type Ref<T> = { current: T }

/** What an act works with: the stage's elements, refs and setters, read when the act is made. */
export interface ActEnv<S> {
  rootRef: { readonly current: HTMLDivElement | null }
  cursorRef: { readonly current: HTMLDivElement | null }
  pos: Ref<Point>
  hovered: Ref<Element | null>
  kindRef: Ref<CursorKind>
  keysRef: Ref<Keys>
  dragging: Ref<boolean>
  autoUsed: Ref<boolean>
  autoRef: Ref<((p: Point) => void) | null>
  scaleRef: Ref<number>
  speed: number
  layout: Layout
  cursor?: { ripple?: boolean; style?: string }
  resolve: (t: Target) => Point
  place: (p: Point) => void
  remeasure: () => void
  ripple: (at: Point) => void
  setState: Dispatch<SetStateAction<S>>
  setKind: Dispatch<SetStateAction<CursorKind>>
  setKeys: Dispatch<SetStateAction<Keys>>
  setLastKeys: Dispatch<SetStateAction<Keys | null>>
}

// Each run gets its own act, bound to its own signal, so a canceled run can
// never pick up the next run's signal and keep going.
export function createAct<S>(signal: AbortSignal, env: ActEnv<S>): Act<S> {
  const { rootRef, cursorRef, pos, hovered, kindRef, keysRef, dragging, autoUsed, autoRef, scaleRef, speed, layout, cursor, resolve, place, remeasure, ripple, setState, setKind, setKeys, setLastKeys } = env
  const entering = bezier('enter')
  const check = () => {
    if (signal.aborted) throw new Stopped()
  }
  // Both clocks belong to this run. A settled wait releases its listener;
  // abort cancels the pending work before another run can take over.
  const pause = <T,>(schedule: (done: () => void) => T, cancel: (id: T) => void) =>
    new Promise<void>((res, rej) => {
      check()
      const abort = () => {
        cancel(id)
        signal.removeEventListener('abort', abort)
        rej(new Stopped())
      }
      const id = schedule(() => {
        signal.removeEventListener('abort', abort)
        if (signal.aborted) rej(new Stopped())
        else res()
      })
      signal.addEventListener('abort', abort, { once: true })
    })
  const frame = () => pause((done) => requestAnimationFrame(done), cancelAnimationFrame)
  const wait = (ms: number) => pause((done) => setTimeout(done, ms / speed), clearTimeout)
  // Release transient DOM/ref state synchronously on abort. The guarded
  // finally call cannot then clear a new run's press or drag ownership.
  const own = (release: () => void) => {
    let live = true
    const done = () => {
      if (!live) return
      live = false
      signal.removeEventListener('abort', done)
      release()
    }
    signal.addEventListener('abort', done, { once: true })
    return done
  }
  const tween = async (ms: number, step: (t: number) => void) => {
    const start = performance.now()
    const dur = ms / speed
    for (;;) {
      check()
      const t = Math.min(1, (performance.now() - start) / dur)
      step(t)
      if (t === 1) return
      await frame()
    }
  }
  // Hover is the target and every data-target around it, as in a browser:
  // a row stays hovered while the cursor is on a button inside it.
  const chain = (el: Element | null) => {
    const out: Element[] = []
    for (let n = el; n && n !== rootRef.current; n = n.parentElement) if (n.hasAttribute('data-target')) out.push(n)
    return out
  }
  // Kind from what's under the cursor, as a real one works: any element
  // marked data-cursor="hand" | "ibeam" | ... sets the kind while the cursor
  // is over it, switching the moment it crosses the edge. Stages that mark
  // nothing keep the kind the script sets.
  const auto = (p: Point) => {
    const root = rootRef.current
    if (!root) return
    const marked = root.querySelectorAll<HTMLElement>('[data-cursor]')
    // A stage that never marks anything keeps the script's kind. One that
    // did falls back to the pointer once its marked elements are gone, so
    // a hand doesn't outlive the thing it was over.
    if (!marked.length && !autoUsed.current) return
    if (marked.length) autoUsed.current = true
    const box = root.getBoundingClientRect()
    const s = box.width / root.offsetWidth || 1
    // What it shows over anything unmarked: the pointer, or the stage's own
    // base kind (a launch film keeps the hand throughout)
    const base = (root.dataset.cursorBase as CursorKind | undefined) ?? 'pointer'
    let next: CursorKind = base
    // What is actually on top under the point decides, as a real pointer
    // works: a button in a popover over a text area is not text. Walk up
    // from the topmost element to the nearest marked one.
    // Every layer, with pointer-events forced on for the test: demos turn
    // them off on overlays (a menu, margin buttons), and the cursor must
    // still read what is visibly on top, not the text beneath it. Layers
    // that are see-through (faded out) are skipped.
    root.setAttribute('data-hit', '')
    const stack = document.elementsFromPoint(box.left + p.x * s, box.top + p.y * s)
    root.removeAttribute('data-hit')
    const top = stack.find((el) => {
      if (!root.contains(el) || el.closest('.ss-cursor, .ss-keys, .ss-ripple')) return false
      // A layer that turned pointer-events off counts only where it is a
      // control or a target; a bare overlay (connectors, a flight layer)
      // must not cover what is under it
      if (getComputedStyle(el).pointerEvents === 'none' && !el.closest('[data-cursor], [data-target], button, a[href], [role="button"], [role="menuitem"], [role="option"], [role="tab"]')) return false
      let o = 1
      for (let n: Element | null = el; n && n !== root.parentElement; n = n.parentElement) {
        const cs = getComputedStyle(n)
        if (cs.visibility === 'hidden') return false
        o *= Number(cs.opacity)
      }
      return o > 0.15
    })
    if (top) {
      // A control inside a marked area (a button over text) is the pointer
      // again unless it's marked itself, as on a real screen
      const n = top.closest<HTMLElement>('[data-cursor], button, a[href], [role="button"], [role="menuitem"], [role="option"], [role="tab"]')
      next = n && root.contains(n) && n.dataset.cursor ? (n.dataset.cursor as CursorKind) : base
      if (next !== kindRef.current) setKind(next)
      return
    }
    // Off screen (nothing to hit-test): judge by boxes alone
    marked.forEach((n) => {
      const r = n.getBoundingClientRect()
      const x = (r.left - box.left) / s
      const y = (r.top - box.top) / s
      // Later (inner) matches win, so a link inside a text block is a hand
      if (p.x >= x && p.x <= x + r.width / s && p.y >= y && p.y <= y + r.height / s) next = n.dataset.cursor as CursorKind
    })
    if (next !== kindRef.current) setKind(next)
  }
  autoRef.current = auto
  // A run starts in the kind of what the cursor rests on, so a loop's first
  // frame matches its last
  if (!dragging.current) auto(pos.current)
  const hover = (el: Element | null) => {
    if (hovered.current === el) return
    const next = chain(el)
    chain(hovered.current).forEach((n) => next.includes(n) || n.removeAttribute('data-hover'))
    next.forEach((n) => n.setAttribute('data-hover', ''))
    hovered.current = el
  }
  // Stage keeps the last key row through resets; a new Act must not reuse its identity.
  let keyId = keysRef.current.id
  let carets = 0
  const targetEl = (t: Target) => {
    const name = nameOf(t)
    return name === null ? null : rootRef.current?.querySelector(`[data-target="${name}"]`) ?? null
  }

  const a: Act<S> = {
    get signal() {
      return signal
    },
    put(patch) {
      if (!signal.aborted) setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
    },
    async set(patch) {
      check()
      a.put(patch)
      await frame()
      await frame()
      // The scene changed under a still pointer: a button that left, a menu
      // that opened. Re-read what is under it now, as a real cursor would
      autoRef.current?.(pos.current)
      check()
    },
    wait: async (ms) => {
      check()
      await wait(ms)
    },
    rect: (name, opts) => {
      const root = rootRef.current
      const el = root?.querySelector<HTMLElement>(`[data-target="${name}"]`)
      if (!root || !el) {
        warn(`no element with data-target="${name}"`)
        return EMPTY
      }
      return opts?.layout ? layoutRectOf(root, el) : rectOf(root, el, scaleRef.current)
    },
    center: (name) => resolve(name),
    caret(name, at) {
      carets++
      const el = targetEl(name) as HTMLElement | null
      const root = rootRef.current
      if (!el || !root) return 0
      const box = root.getBoundingClientRect()
      const k = box.width / root.offsetWidth || 1
      const x = box.left + at.x * k
      const y = box.top + at.y * k
      // Measure the element's own characters rather than hit-testing, so
      // overlays (a rewrite, a highlight layer, the cursor) never get in the way
      const chars: { left: number; right: number; mid: number; top: number; bottom: number; at: number }[] = []
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const r = document.createRange()
      let offset = 0
      // Text that can't be seen isn't selectable: a rewrite waiting at opacity 0
      // over the original would otherwise pull the caret onto its own lines
      const hidden = (node: Node) => {
        for (let p = node.parentElement; p; p = p === el ? null : p.parentElement) {
          const cs = getComputedStyle(p)
          if (cs.opacity === '0' || cs.visibility === 'hidden' || cs.display === 'none') return true
        }
        return false
      }
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent ?? ''
        if (hidden(n)) continue
        for (let c = 0; c < text.length; c++) {
          r.setStart(n, c)
          r.setEnd(n, c + 1)
          const b = r.getBoundingClientRect()
          if (b.width || b.height) chars.push({ left: b.left, right: b.right, mid: (b.left + b.right) / 2, top: b.top, bottom: b.bottom, at: offset + c })
        }
        offset += text.length
      }
      if (!chars.length) return 0
      if (y < chars[0].top) return 0
      if (y > chars[chars.length - 1].bottom) return offset
      // The visual line nearest the pointer, then the boundary nearest it on that line
      let line = chars[0]
      for (const ch of chars) if (Math.abs((ch.top + ch.bottom) / 2 - y) < Math.abs((line.top + line.bottom) / 2 - y)) line = ch
      const row = chars.filter((ch) => Math.abs(ch.top - line.top) < (line.bottom - line.top) / 2)
      const next = row.find((ch) => ch.mid > x)
      return next ? next.at : row[row.length - 1].at + 1
    },
    async move(to, opts) {
      check()
      const from = { ...pos.current }
      const end = resolve(to)
      const dist = Math.hypot(end.x - from.x, end.y - from.y)
      if (dist < 0.5) return hover(targetEl(to))
      // Leave hover only on what the cursor actually leaves: moving from a
      // row onto a button inside it keeps the row hovered all the way
      const dest = chain(targetEl(to))
      hover(chain(hovered.current).find((n) => dest.includes(n)) ?? null)
      // A hand travels in a shallow arc, quicker over short hops
      const ms = opts?.duration ?? clamp(260 + dist * 0.9, 300, 650)
      const curve = easeInOutCubic
      const bow = Math.min(dist * 0.08, 24)
      const nx = -(end.y - from.y) / dist
      const ny = (end.x - from.x) / dist
      await tween(ms, (t) => {
        const e = curve(t)
        const lift = Math.sin(Math.PI * e) * bow
        const p = opts?.path ? opts.path(e, from, end) : { x: from.x + (end.x - from.x) * e + nx * lift, y: from.y + (end.y - from.y) * e + ny * lift }
        place(p)
        auto(p)
        if (opts?.onMove) flushSync(() => opts.onMove!(p, from, t))
      })
      check()
      hover(targetEl(to))
    },
    async click(to, opts) {
      check()
      if (to !== undefined) {
        await a.move(to)
        await wait(120)
      }
      check()
      const el = to !== undefined ? targetEl(to) : hovered.current
      const cursorEl = cursorRef.current
      const finger = cursor?.style === 'touch'
      const release = own(() => {
        cursorEl?.removeAttribute('data-pressed')
        el?.removeAttribute('data-pressed')
        if (finger) fingerGone(cursorEl)
      })
      try {
        // A finger is only there when it touches: it shows just before, and goes after it lifts
        if (finger) { cursorEl?.setAttribute('data-touching', ''); await wait(140); check() }
        for (let i = 0; i < (opts?.double ? 2 : 1); i++) {
          if (i) await wait(70)
          check()
          cursorEl?.setAttribute('data-pressed', 'true')
          if (cursor?.ripple) ripple(pos.current)
          el?.setAttribute('data-pressed', opts?.right ? 'right' : '')
          await wait(opts?.double ? 80 : 100)
          check()
          cursorEl?.removeAttribute('data-pressed')
          el?.removeAttribute('data-pressed')
        }
      } finally {
        release()
      }
    },
    async scroll(name, to, opts) {
      check()
      const el = targetEl(name) as HTMLElement | null
      if (!el) return
      const from = el.scrollTop
      let end = typeof to === 'number' ? to : from
      if (typeof to === 'string') {
        const t = targetEl(to) as HTMLElement | null
        if (t) end = from + (t.getBoundingClientRect().top - el.getBoundingClientRect().top) / drawnScale(rootRef.current, scaleRef.current) - (opts?.offset ?? 0)
      }
      end = clamp(end, 0, el.scrollHeight - el.clientHeight)
      // You can only scroll what the pointer is over: a visible cursor
      // outside the area moves into it first, then holds still while the
      // content moves under it
      if (cursor) {
        const box = rectOf(rootRef.current!, el, scaleRef.current || 1)
        const p = pos.current
        const inside = p.x >= box.x + 8 && p.x <= box.x + box.width - 8 && p.y >= box.y + 8 && p.y <= box.y + box.height - 8
        if (!inside) {
          await this.move({ x: box.x + box.width * 0.6, y: box.y + box.height * 0.55 })
          await this.wait(120)
        }
      }
      // A Scroll's overlay bar shows while it moves and fades once it rests
      const wrap = el.parentElement?.classList.contains('ss-scroller') ? el.parentElement : null
      wrap?.setAttribute('data-scrolling', '')
      const release = own(() => wrap?.removeAttribute('data-scrolling'))
      try {
        await tween(opts?.duration ?? clamp(420 + Math.abs(end - from) * 1.2, 500, 1400), (t) => {
          el.scrollTop = from + (end - from) * easeInOutCubic(t)
          el.toggleAttribute('data-scrolled', el.scrollTop > 0.5)
          thumb(el)
        })
        check()
      } finally {
        release()
      }
      remeasure()
      autoRef.current?.(pos.current)
    },
    async snap(patch, scope) {
      check()
      const el = scope ? rootRef.current?.querySelector(`[data-target="${scope}"]`) : rootRef.current
      el?.setAttribute('data-instant', '')
      const release = own(() => el?.removeAttribute('data-instant'))
      try {
        a.put(patch)
        await frame()
        await frame()
        check()
      } finally {
        release()
      }
    },
    async key(combo) {
      check()
      const caps = capsOf(combo)
      const id = ++keyId
      const k = keysRef.current
      setLastKeys(k.caps.length ? { ...k, show: false, down: false } : null)
      setKeys({ id, caps, show: false, down: false })
      await frame()
      await frame()
      check()
      setKeys({ id, caps, show: true, down: false })
      await wait(180)
      check()
      setKeys({ id, caps, show: true, down: true })
      await wait(140)
      check()
      setKeys({ id, caps, show: true, down: false })
      // The caps linger and fade without holding up the script.
      void wait(600).then(() => {
        if (keyId === id && !signal.aborted) setKeys({ id, caps, show: false, down: false })
      }, (error) => {
        if (!(error instanceof Stopped)) console.error('[stageshow] script error', error)
      })
    },
    async stagger(items, fn, gap = 60) {
      await Promise.all(
        items.map(async (item, i) => {
          if (i) await wait(gap * i)
          check()
          await fn(item, i)
        }),
      )
    },
    mark(name) {
      if (!signal.aborted) rootRef.current?.setAttribute('data-mark', name)
    },
    async cursor(k) {
      check()
      setKind(k)
      await frame()
    },
    async type(key, text, opts) {
      const interval = opts?.interval ?? 35
      for (let i = 0; i <= text.length; i++) {
        check()
        setState((s) => ({ ...s, [key]: text.slice(0, i) }))
        // Uneven but repeatable rhythm, so every loop types the same way
        await wait(interval * (0.7 + 0.6 * hash(i)))
      }
    },
    place(to) {
      if (signal.aborted) return
      const p = resolve(to)
      place(p)
      autoRef.current?.(p)
    },
    async enter(to, opts) {
      check()
      const end = resolve(to)
      // The frame: the stage, in stage px
      const root = rootRef.current!
      const f = { x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight }
      // Out past the edge nearest the target, far enough that the hand is hidden
      const out = 40
      const gaps = [end.x - f.x, f.x + f.w - end.x, end.y - f.y, f.y + f.h - end.y]
      const side = gaps.indexOf(Math.min(...gaps))
      const from = side === 0 ? { x: f.x - out, y: end.y + f.h * 0.12 } : side === 1 ? { x: f.x + f.w + out * 0.4, y: end.y + f.h * 0.12 } : side === 2 ? { x: end.x - f.w * 0.06, y: f.y - out } : { x: end.x + f.w * 0.06, y: f.y + f.h + out * 0.4 }
      place(from)
      hover(null)
      await tween(opts?.duration ?? 700, (t) => {
        const e = entering(t)
        const p = { x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e }
        place(p)
        auto(p)
      })
      check()
      hover(targetEl(to))
    },
    async drag(to, onMove, opts) {
      check()
      const from = { ...pos.current }
      const end = resolve(to)
      const dist = Math.hypot(end.x - from.x, end.y - from.y)
      hover(null)
      // The hand closes only while the button is held, as a real cursor's
      // does: on press here, and back to what it was on release. Over text
      // (I-beam) or a canvas (crosshair) a drag selects, so it keeps its kind.
      const before = kindRef.current
      const selects = before === 'ibeam' || before === 'crosshair'
      const closesHand = !selects && opts?.cursor !== 'preserve'
      // A finger swipes in one motion: it lands and is already moving, fast
      // first and slowing as it goes. A mouse presses, then carries.
      const finger = cursor?.style === 'touch'
      // Gathers speed over the first quarter, then one speed to the lift,
      // still moving when it leaves so the throw carries straight on
      const fingerEase = (t: number) => { const a = 0.25, k = 1 / (1 - a / 2); return t < a ? (t * t) / (2 * a) * k : (t - a / 2) * k }
      if (finger) { cursorRef.current?.setAttribute('data-touching', ''); await wait(140); check() }
      // The trail: one streak from where the finger was a few frames ago to
      // where it is now, turned along the motion and fading toward its tail
      const streak = finger ? cursorRef.current?.querySelector<HTMLElement>('.ss-cursor__streak') ?? null : null
      const trail: Point[] = []
      const drawTrail = (at: Point) => {
        trail.unshift({ ...at })
        if (trail.length > 9) trail.pop()
        const h = trail[trail.length - 1]!
        const dx = at.x - h.x, dy = at.y - h.y
        const len = Math.min(Math.hypot(dx, dy), 100)
        if (!streak) return
        streak.style.width = `${len}px`
        streak.style.left = `${-len}px`
        streak.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`
      }
      dragging.current = true
      const cursorEl = cursorRef.current
      const release = own(() => {
        dragging.current = false
        cursorEl?.removeAttribute('data-pressed')
        cursorEl?.removeAttribute('data-swiping')
        if (finger) fingerGone(cursorEl)
      })
      try {
        // The press dips first and the hand closes at the bottom of it, so
        // the change of shape sits inside the press
        cursorEl?.setAttribute('data-pressed', 'true')
        // A finger presses first, seen as a press, and then swipes
        await wait(finger ? 170 : 60)
        if (finger) { if (streak) streak.style.width = '0px'; cursorEl?.setAttribute('data-swiping', '') }
        check()
        if (closesHand && !finger) setKind('grab')
        if (!finger) await wait(70)
        check()
        cursorEl?.removeAttribute('data-pressed')
        // Carried by a hand: the same shallow arc and ease as a move, a little
        // slower for the weight, never a ruler-straight slide
        // A selection is precise: straight, so the caret never leaves the text
        const bow = selects ? 0 : Math.min(dist * 0.06, 18)
        const nx = dist ? -(end.y - from.y) / dist : 0
        const ny = dist ? (end.x - from.x) / dist : 0
        // A selection across lines drops into its last line first, then
        // sweeps along it, as a hand does. A straight diagonal runs back past
        // the anchor on the first line (selecting nothing, or backwards) and
        // then fills everything at once as it crosses into the next.
        const lines = selects && Math.abs(end.y - from.y) > 6
        // Ending left of where it started, no path reads right: the beam runs
        // back along the first line or past the end on the last
        if (lines && end.y > from.y && end.x < from.x - 2) warn('a text selection that ends left of where it starts overshoots and shrinks back; select text that starts a line, or fits on one')
        const caretsBefore = carets
        // A flick is brief, about a quarter second; the throw does the rest
        await tween(finger ? (opts?.duration ?? clamp(180 + dist * 0.5, 240, 300)) : (opts?.duration ?? clamp(360 + dist * 1.1, 450, 900)), (t) => {
          // A finger gathers speed for a few frames and then runs at one
          // speed until it lifts, still moving: what it threw carries on at
          // that speed and eases off. A finger that slows before it lifts
          // makes the throw jolt; one that eases out early reads as a pause
          const e = finger ? fingerEase(t) : easeInOutCubic(t)
          const lift = Math.sin(Math.PI * e) * bow
          // The drop: y arrives early, x mostly late (a curve through (from.x, end.y))
          const ey = lines ? 1 - (1 - e) * (1 - e) : e
          const ex = lines ? e * e : e
          const at = opts?.path?.(e, from, end) ?? { x: from.x + (end.x - from.x) * ex + nx * lift, y: from.y + (end.y - from.y) * ey + ny * lift }
          // The cursor and whatever follows it (a card, a selection) paint in
          // the same frame: render the scene now, not a frame behind
          flushSync(() => onMove?.(at, from, t))
          place(at)
          if (finger) drawTrail(at)
        })
        // A selection grown by time or a word count drifts off the I-beam,
        // ahead of it on one line and behind on the next
        if (selects && onMove && carets === caretsBefore) warn('selection drift: a text selection drag never read a.caret(), so the highlight is not under the I-beam; set it from a.caret(name, at) in onMove')
        check()
        if (closesHand && !finger) setKind(before === 'grab' ? 'pointer' : before)
      } finally {
        release()
      }
      // What's under the cursor now decides (the thing it was over may have moved or gone)
      autoRef.current?.(end)
    },
    layout,
  }
  // A beat started without await (a move alongside other beats) rejects
  // with Stopped when the stage stops; that is expected, so it must not
  // surface as an unhandled rejection. Any other error is reported here,
  // since nobody may be awaiting it. Awaited calls still see the rejection.
  for (const k of Object.keys(a) as (keyof Act<S>)[]) {
    const fn = a[k]
    if (typeof fn !== 'function') continue
    ;(a as unknown as Record<string, unknown>)[k] = (...args: unknown[]) => {
      const out = (fn as (...x: unknown[]) => unknown).apply(a, args)
      if (out instanceof Promise)
        out.catch((e) => {
          if (!(e instanceof Stopped)) console.error('[stageshow] script error', e)
        })
      return out
    }
  }
  return a
}

// A loop that doesn't end where it began jumps on every repeat.
export function checkSeam(end: object, initial: object, at: Point, rest: Point | null) {
  const changed = Object.keys(initial).filter(
    (k) => JSON.stringify((end as Record<string, unknown>)[k]) !== JSON.stringify((initial as Record<string, unknown>)[k]),
  )
  if (changed.length) warn(`loop seam: state still differs from initial at the end of the script (${changed.join(', ')})`)
  if (rest && Math.hypot(at.x - rest.x, at.y - rest.y) > 1) warn('loop seam: cursor does not end where it starts')
}
