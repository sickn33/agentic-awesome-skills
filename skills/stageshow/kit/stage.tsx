import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import './stage.css'
import { checkSeam, createAct, Stopped, type Script } from './act'
import { Cursor, ripple as spawnRipple, type CursorKind, type CursorStyle } from './cursor'
import { Keycaps, type Keys, type KeysAt } from './keys'
import { LookContext, type Fidelity, type Layout, type Palette, type Theme } from './looks'
import { EMPTY, nameOf, rectOf, sameRects, stageSpace, targetRectOf, thumb, type Point, type Rect, type Target } from './measure'
import { StillContext, useReducedMotion } from './reduced-motion'
import { clock } from './clock'
import { clamp, easeInOutCubic, isDev, warn } from './util'

// The stage: fits a design-size scene into its container, runs the script
// while it is on screen, and draws the cursor and keycaps over the scene.
// The script API is act.ts, the cursor cursor.tsx, measuring measure.ts and
// the look context looks.ts.

/** loop: repeats while on screen. once: plays when first seen, then holds the end. hover: plays while the pointer is over it, settles back when it leaves; on a screen with no hover (a phone) it plays once. */
export type Play = 'loop' | 'once' | 'hover'

/** Design tokens for a look: `--ss-accent`, `--ss-radius-md`, `--ss-font` and the rest. */
export type LookTokens = { [token: `--ss-${string}`]: string }

export interface StageProps<S> {
  /** Design size. The stage scales down to fit its container, and only grows past it with `fill`. */
  width: number
  height: number
  /** Scene state at the start of each loop. Statics can leave it out. */
  initial?: S
  /** Loops while on screen. Leave out for a static illustration. */
  script?: Script<S>
  /** The still frame shown under reduced motion or with no script. Defaults to initial. */
  poster?: S
  /**
   * Where the cursor rests at the start of each loop, or where it sits in a
   * still. Leave out to hide it. Animated demos hide it in their reduced-motion
   * poster unless `still` is true. `ripple` sends a soft ring out from each
   * click, for demos where clicks need to read at a glance (small stages, the
   * arrow and circle styles). `idle` is how long (ms) the cursor may rest
   * after it has acted before it fades out (4000 by default); it fades back
   * in as it next moves, and never fades while it presses or hovers. Before
   * its first move each loop it waits out of shot instead, coming back just
   * before it moves. false keeps it on screen throughout. `at` can differ by
   * layout: { wide: ..., compact: ... }, for a stage with a compact design.
   */
  cursor?: { at: Target | { wide: Target; compact: Target }; kind?: CursorKind; style?: CursorStyle; still?: boolean; ripple?: boolean; idle?: number | false }
  play?: Play
  /**
   * A second, smaller design for narrow containers. Below `below` px of
   * container width the stage uses this size, the render's `layout` argument
   * (and `useLook().layout` inside the stage) and data-layout become 'compact', and the script restarts. Build the
   * compact scene as a tighter crop around the story, never the wide scene
   * shrunk.
   */
  compact?: { below: number; width: number; height: number }
  /** Where keycaps from act.key appear. */
  keys?: KeysAt | { wide: KeysAt; compact: KeysAt }
  /** Targets shown hovered in a still, since no script is there to hover them. */
  hover?: string[]
  theme?: Theme
  palette?: Palette
  fidelity?: Fidelity
  /** The grays' temperature. `warm` (the default) is a warm canvas and well;
   * `cool` swaps them for cool ones, for a macOS scene or a blue ground, so
   * every gray shares one temperature. Light theme only. */
  greys?: 'warm' | 'cool'
  /** A look as values: any `--ss-*` tokens (color, type, shape, density),
   * set on the stage over its theme's. See `references/looks.md`. */
  tokens?: LookTokens
  /** Grow past the design size to fill the container (up to 2x), for a hero or a docs plate. A host page can set data-ss-fill on any wrapper instead. */
  fill?: boolean
  /** The accent color for this stage (any CSS color). Sets --ss-accent, its soft fill and the gradient's second stop together. */
  accent?: string
  /** What the scene sits on. `orbs`: a pale tile lit by a few huge, soft
   * color orbs behind the UI, so glass has color to take and white cards
   * lift off it. Pass two or three colors to choose them (lavender and
   * orange by default). Leave it out for the plain ground. */
  ground?: 'orbs' | [string, string] | [string, string, string]
  /** Plays the script faster (above 1) or slower (below 1). Waits and tweens divide by it. */
  speed?: number
  className?: string
  /** A specimen sheet of parts (the kit's chrome, controls, phones sheets), not a product frame: film's composition checks (framing, ladders, voids) stand down. */
  specimen?: boolean
  /** No framing, when the developer asks for it: no ground, and the product sits whole with room around it, floating on their page. Film's bleed and floating checks stand down; everything else still applies. */
  unframed?: boolean
  /** `layout` is 'wide' or 'compact' (see `compact`); useLook() also has it, but only in components rendered inside the stage. */
  children: (s: S, rect: (name: string) => Rect, layout: Layout) => ReactNode
}

const NONE = {}

export function Stage<S extends object>({
  width,
  height,
  initial = NONE as S,
  script,
  poster,
  cursor,
  hover,
  play: playProp = 'loop',
  compact,
  keys: keysAt = 'bottom',
  palette = 'accent',
  greys,
  fidelity = 'standard',
  specimen,
  unframed,
  speed: speedProp = 1,
  accent,
  tokens,
  ground,
  fill: fillProp = false,
  theme: themeProp = 'light',
  className,
  children,
}: StageProps<S>) {
  // Hover scripts can hold their ending without returning to the start.
  // On touch, play once rather than assuming the script has a loop seam.
  const play: Play = playProp === 'hover' && typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches ? 'once' : playProp
  const [layout, setLayout] = useState<Layout>('wide')
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  // Where the cursor rests, for the layout showing
  const restAt = (): Target => {
    const at = cursor!.at
    return typeof at === 'object' && 'wide' in at ? at[layoutRef.current] : at
  }
  const [grows, setGrows] = useState(false)
  const designW = layout === 'compact' && compact ? compact.width : width
  const designH = layout === 'compact' && compact ? compact.height : height

  const fitRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const still = !script || reduced

  const [state, setState] = useState<S>(() => (still && poster ? poster : initial))
  const stateRef = useRef(state)
  stateRef.current = state
  const [scale, setScale] = useState(1)
  const scaleRef = useRef(1)
  scaleRef.current = scale
  // film.mjs can slow every stage down (--slow) and film any stage dark (--dark)
  const film = typeof window === 'undefined' ? {} : ((window as unknown as { __stageshow?: { slow?: number; theme?: Theme } }).__stageshow ?? {})
  const speed = speedProp / (film.slow ?? 1)
  const theme = film.theme ?? themeProp
  const [kind, setKind] = useState<CursorKind>(cursor?.kind ?? 'pointer')
  // A ring that spreads from the click point and fades, drawn under the cursor
  const ripple = (at: Point) => {
    const root = rootRef.current
    if (!root || reduced) return
    spawnRipple(root, at)
  }
  const kindRef = useRef(kind)
  kindRef.current = kind
  const [keys, setKeys] = useState<Keys>({ id: 0, caps: [], show: false, down: false })
  const [lastKeys, setLastKeys] = useState<Keys | null>(null)
  const keysRef = useRef(keys)
  keysRef.current = keys
  const pos = useRef<Point>({ x: 0, y: 0 })
  // The cursor's kind follows what's under it after every commit too, so a
  // hand doesn't linger when the link it was over slides away. Not mid-drag:
  // the drag owns the kind until release.
  const autoRef = useRef<((p: Point) => void) | null>(null)
  const [inset, setInset] = useState(0)
  const autoUsed = useRef(false)
  const dragging = useRef(false)
  const hovered = useRef<Element | null>(null)

  // Fit: pick the layout from the container width, then scale its design
  // size into it.
  useLayoutEffect(() => {
    const fit = fitRef.current
    if (!fit) return
    const measure = () => {
      const w = fit.clientWidth
      // A host that sizes the stage by something other than the screen (a
      // bento tile set by its row's height) marks a wrapper data-ss-wide to
      // keep the wide design, scaled, rather than the phone-width one
      const wide = !!fit.parentElement?.closest('[data-ss-wide]')
      const next: Layout = compact && !wide && w < compact.below ? 'compact' : 'wide'
      setLayout(next)
      // fill (or a host wrapper marked data-ss-fill) lets the stage grow past its design size, within reason
      const grow = fillProp || !!fit.parentElement?.closest('[data-ss-fill]')
      setGrows(grow)
      const dw = next === 'compact' ? compact!.width : width
      const s = Math.min(grow ? 2 : 1, w / dw)
      setScale(s)
      // A design narrower than its box (a compact layout, or a stage that has
      // stopped at its design size) sits in the middle of it, not at its left
      setInset(Math.max(0, (w - dw * s) / 2))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(fit)
    // Hosts can switch layout/fill policy without changing this box's
    // width. Observe only those attributes on its ancestors, not the scene.
    const hosts = new MutationObserver(measure)
    for (let host = fit.parentElement; host; host = host.parentElement) {
      hosts.observe(host, { attributes: true, attributeFilter: ['data-ss-wide', 'data-ss-fill'] })
    }
    return () => {
      ro.disconnect()
      hosts.disconnect()
    }
  }, [width, compact?.below, compact?.width, fillProp]) // eslint-disable-line react-hooks/exhaustive-deps

  // Rects of every data-target, in stage pixels, refreshed after each commit.
  const [rects, setRects] = useState<Record<string, Rect>>({})
  const measureAll = useCallback(() => {
    const root = rootRef.current
    if (!root) return {}
    const out: Record<string, Rect> = {}
    const targets = root.querySelectorAll<HTMLElement>('[data-target]')
    if (!targets.length) return out
    const space = stageSpace(root, scaleRef.current)
    targets.forEach((el) => {
      out[el.dataset.target!] = targetRectOf(root, el, scaleRef.current, space)
    })
    return out
  }, [])
  // Something placed from rect() can itself be a target, and the two can
  // chase each other. Allow a few passes per frame, then wait for the next.
  const passes = useRef({ n: 0, frame: 0, owed: false })
  const remeasure = useCallback(() => {
    const p = passes.current
    if (!p.frame)
      p.frame = clock.layoutRaf(() => {
        p.n = 0
        p.frame = 0
        if (!p.owed) return
        p.owed = false
        const next = measureAll()
        setRects((prev) => (sameRects(prev, next) ? prev : next))
      })
    if (p.n >= 4) {
      p.owed = true
      return
    }
    p.n++
    const next = measureAll()
    setRects((prev) => (sameRects(prev, next) ? prev : next))
  }, [measureAll])
  useLayoutEffect(remeasure)
  useLayoutEffect(() => () => {
    clock.cancelLayoutRaf(passes.current.frame)
    passes.current = { n: 0, frame: 0, owed: false }
  }, [])
  // Things that slide or scale into place move after the commit that started
  // them, so measure again once they settle.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.addEventListener('transitionend', remeasure)
    root.addEventListener('animationend', remeasure)
    return () => {
      root.removeEventListener('transitionend', remeasure)
      root.removeEventListener('animationend', remeasure)
    }
  }, [remeasure])
  const rectFor = useCallback((name: string) => rects[name] ?? EMPTY, [rects])

  // Placing: until the first measurements (after fonts load) have painted,
  // and again after a wide/compact switch, nothing transitions. Otherwise
  // anything placed from rect() would visibly travel from 0,0 into place.
  const [settling, setSettling] = useState(true)
  useLayoutEffect(() => {
    setSettling(true)
    let live = true
    let frame = 0
    const release = () => {
      frame = clock.layoutRaf(() => {
        frame = clock.layoutRaf(() => live && setSettling(false))
      })
    }
    if (!document.fonts || document.fonts.status === 'loaded') release()
    else document.fonts.ready.then(() => live && release())
    return () => {
      live = false
      clock.cancelLayoutRaf(frame)
    }
  }, [layout])

  // When the cursor last did something; while a script plays, a cursor that
  // has sat still for longer than `idle` fades out until its next move
  const active = useRef(0)
  // Each loop: when it began, whether the cursor has moved yet, and (learned
  // from the first run) how long it waits before its first move
  const loopAt = useRef(0)
  const moved = useRef(false)
  const firstMove = useRef<number | null>(null)
  const place = useCallback((p: Point) => {
    if (loopAt.current && !moved.current && Math.hypot(p.x - pos.current.x, p.y - pos.current.y) > 0.5) {
      moved.current = true
      firstMove.current ??= performance.now() - loopAt.current
    }
    pos.current = p
    active.current = performance.now()
    const el = cursorRef.current
    if (!el) return
    el.style.transform = `translate(${p.x}px, ${p.y}px)`
    el.removeAttribute('data-idle')
  }, [])

  const resolve = useCallback((t: Target): Point => {
    // One target per layout, as cursor.at takes it
    if (typeof t === 'object' && t !== null && 'wide' in t) t = (layoutRef.current === 'compact' ? t.compact : t.wide)
    const name = nameOf(t)
    if (name === null) return t as Point
    const root = rootRef.current
    const el = root?.querySelector<HTMLElement>(`[data-target="${name}"]`)
    if (!root || !el) {
      warn(`no element with data-target="${name}"`)
      return pos.current
    }
    const r = rectOf(root, el, scaleRef.current)
    const f = typeof t === 'string' ? { x: 0.5, y: 0.5 } : (t as { x: number; y: number })
    return { x: r.x + r.width * f.x, y: r.y + r.height * f.y }
  }, [])

  // Stills have no script to hover things, so mark them here.
  useLayoutEffect(() => {
    if (!still || !hover) return
    const root = rootRef.current
    hover.forEach((name) => root?.querySelector(`[data-target="${name}"]`)?.setAttribute('data-hover', ''))
  })

  // Rest the cursor at its start point, unless a script is running: then the
  // cursor is mid-story, and a resize must not send it back to rest
  useLayoutEffect(() => {
    if (cursor && !loopAt.current) place(resolve(restAt()))
  }, [scale, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // Back to the start. `glide` (a hover stage settling as the pointer leaves)
  // lets the scene's own transitions carry it back and walks the cursor home;
  // otherwise everything jumps, since nobody is watching.
  const glideId = useRef(0)
  const resetFrame = useRef(0)
  const cancelReset = useCallback(() => {
    ++glideId.current
    cancelAnimationFrame(resetFrame.current)
    resetFrame.current = 0
    rootRef.current?.removeAttribute('data-settling')
  }, [])
  const reset = useCallback((glide = false) => {
    cancelReset()
    const id = glideId.current
    dragging.current = false
    setState(initial)
    setKind(cursor?.kind ?? 'pointer')
    setKeys((k) => ({ ...k, show: false, down: false }))
    setLastKeys(null)
    rootRef.current?.querySelectorAll('[data-hover],[data-pressed]').forEach((el) => {
      el.removeAttribute('data-hover')
      el.removeAttribute('data-pressed')
    })
    rootRef.current?.removeAttribute('data-mark')
    rootRef.current?.querySelectorAll<HTMLElement>('[data-scrolled]').forEach((el) => {
      el.scrollTop = 0
      el.removeAttribute('data-scrolled')
      thumb(el)
    })
    rootRef.current?.querySelectorAll('[data-scrolling]').forEach((el) => el.removeAttribute('data-scrolling'))
    cursorRef.current?.removeAttribute('data-pressed')
    hovered.current = null
    if (!cursor) return
    if (!glide) {
      resetFrame.current = requestAnimationFrame(() => {
        resetFrame.current = 0
        place(resolve(restAt()))
        autoRef.current?.(pos.current)
      })
      return
    }
    const root = rootRef.current
    root?.setAttribute('data-settling', '')
    resetFrame.current = requestAnimationFrame(() => {
      const from = { ...pos.current }
      const end = resolve(restAt())
      const ms = clamp(320 + Math.hypot(end.x - from.x, end.y - from.y) * 0.7, 380, 700)
      const t0 = performance.now()
      const step = () => {
        if (glideId.current !== id) return
        const t = Math.min(1, (performance.now() - t0) / ms)
        const e = easeInOutCubic(t)
        place({ x: from.x + (end.x - from.x) * e, y: from.y + (end.y - from.y) * e })
        if (t < 1) resetFrame.current = requestAnimationFrame(step)
        else {
          resetFrame.current = 0
          root?.removeAttribute('data-settling')
        }
      }
      step()
    })
  }, [layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // Each run gets its own act (act.ts), bound to its own signal, so a
  // canceled run can never pick up the next run's signal and keep going.
  const makeAct = useMemo(
    () => (signal: AbortSignal) =>
      createAct<S>(signal, {
        rootRef, cursorRef, pos, hovered, kindRef, keysRef, dragging, autoUsed, autoRef, scaleRef,
        speed, layout, cursor, resolve, place, remeasure, ripple, setState, setKind, setKeys, setLastKeys,
      }),
    [resolve, place, speed, layout], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Run the loop only while the stage is on screen and the tab is visible.
  useEffect(() => {
    const stage = rootRef.current!
    if (still || !script) {
      reset()
      stage.removeAttribute('data-offscreen')
      setState(poster ?? initial)
      return cancelReset
    }
    // A changed script, layout or motion preference starts a fresh scene.
    // Cleanup only releases resources; it never schedules another reset.
    reset()
    const root = fitRef.current!
    let ctrl: AbortController | null = null
    let onScreen = false
    let hovering = false
    let done = false

    // Idle: a cursor waiting to start reads as a stuck one, so before its
    // first move it steps out of the shot. Once it has acted, resting to
    // watch the result is part of the story: only a long stillness fades it,
    // and never while it holds a press or rests on what it hovers.
    const idle = cursor?.idle ?? 4000
    const LEAD = 1200
    let idleTimer = 0
    let revealTimer = 0
    const watchIdle = () => {
      window.clearInterval(idleTimer)
      if (!cursor || idle === false) return
      active.current = performance.now()
      idleTimer = window.setInterval(() => {
        const el = cursorRef.current
        if (!el) return
        const now = performance.now()
        if (!moved.current) {
          // Later loops know when it moves and handle it in beginLoop
          if (firstMove.current === null && now - active.current > LEAD) el.setAttribute('data-idle', '')
          return
        }
        if (el.hasAttribute('data-pressed') || rootRef.current?.querySelector('[data-hover]')) active.current = now
        else if (now - active.current > idle) el.setAttribute('data-idle', '')
      }, 150)
    }
    const beginLoop = () => {
      loopAt.current = performance.now()
      moved.current = false
      window.clearTimeout(revealTimer)
      const el = cursorRef.current
      const wait = firstMove.current
      if (idle === false || !el || wait === null || wait <= LEAD) return
      // A long opening wait: out now, back in just before the first move
      el.setAttribute('data-idle', '')
      revealTimer = window.setTimeout(() => el.removeAttribute('data-idle'), wait - 400)
    }
    const unwatchIdle = () => {
      window.clearInterval(idleTimer)
      window.clearTimeout(revealTimer)
      loopAt.current = 0
      cursorRef.current?.removeAttribute('data-idle')
    }
    const finishIdle = () => {
      window.clearInterval(idleTimer)
      window.clearTimeout(revealTimer)
      // A completed once scene cannot move again. Keep a hovered/pressed
      // cursor visible, or finish its existing idle delay with one timeout.
      // There is no reason to poll the held ending forever.
      const el = cursorRef.current
      const held = () => el?.hasAttribute('data-pressed') || stage.querySelector('[data-hover]')
      if (!cursor || idle === false || !el || el.hasAttribute('data-idle') || held()) return
      const delay = (moved.current ? idle : LEAD) - (performance.now() - active.current)
      revealTimer = window.setTimeout(() => {
        if (!held()) el.setAttribute('data-idle', '')
      }, Math.max(0, delay))
    }

    const start = () => {
      if (ctrl || done || !onScreen || document.hidden) return
      if (play === 'hover' && !hovering) return
      cancelReset()
      if (cursor) place(resolve(restAt()))
      ctrl = new AbortController()
      const signal = ctrl.signal
      watchIdle()
      const act = makeAct(signal)
      ;(async () => {
        do {
          beginLoop()
          try {
            await script(act)
          } catch (e) {
            if (e instanceof Stopped) return
            // A real error in the script: report it once and stand the stage
            // down, so a later start() can run it again
            console.error('[stageshow] script error', e)
            ctrl = null
            unwatchIdle()
            return
          }
          if (play === 'loop' && isDev()) checkSeam(stateRef.current, initial, pos.current, cursor ? resolve(restAt()) : null)
        } while (play === 'loop' && !signal.aborted)
        // Once holds its end state for good; hover holds it until the pointer leaves.
        if (play === 'once' && !signal.aborted) {
          done = true
          finishIdle()
        }
      })()
    }
    const stop = (glide = false) => {
      unwatchIdle()
      if (!ctrl) return
      ctrl.abort()
      ctrl = null
      if (!done) reset(glide)
    }

    const markOffscreen = () => stage.toggleAttribute('data-offscreen', !onScreen || document.hidden)
    markOffscreen()
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      // Off screen its CSS animations pause too, so nothing runs out of view
      markOffscreen()
      onScreen ? start() : stop()
    })
    io.observe(root)
    const onVisibility = () => {
      markOffscreen()
      document.hidden ? stop() : start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const enter = () => {
      hovering = true
      start()
    }
    const leave = () => {
      hovering = false
      stop(true)
    }
    if (play === 'hover') {
      root.addEventListener('pointerenter', enter)
      root.addEventListener('pointerleave', leave)
    }
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      root.removeEventListener('pointerenter', enter)
      root.removeEventListener('pointerleave', leave)
      unwatchIdle()
      ctrl?.abort()
      ctrl = null
      autoRef.current = null
      cancelReset()
    }
  }, [still, script, makeAct, play, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (cursor && !still && !dragging.current) autoRef.current?.(pos.current)
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  const look = useMemo(() => ({ theme, palette, fidelity, layout }), [theme, palette, fidelity, layout])
  const showCursor = cursor && (!script || !still || cursor.still)

  return (
    <div ref={fitRef} className={`ss-fit${className ? ` ${className}` : ''}`} style={{ maxWidth: grows ? undefined : width, height: designH * scale }}>
      <div
        ref={rootRef}
        className="ss-stage"
        data-specimen={specimen || undefined}
        data-unframed={unframed || undefined}
        data-still={still || undefined}
        data-placing={settling || undefined}
        data-theme={theme}
        data-palette={palette}
        data-greys={greys === 'cool' ? 'cool' : undefined}
        data-fidelity={fidelity}
        data-layout={layout}
        style={{
          width: designW,
          height: designH,
          marginLeft: inset || undefined,
          transform: `scale(${scale})`,
          ...tokens,
          ...(accent ? { ['--ss-accent' as string]: accent, ['--ss-accent-2' as string]: accent, ['--ss-accent-soft' as string]: `color-mix(in srgb, ${accent} 14%, transparent)` } : null),
        }}
      >
        {ground && (
          <div
            className="ss-ground"
            aria-hidden
            style={
              Array.isArray(ground)
                ? ({ ['--ss-orb-1' as string]: ground[0], ['--ss-orb-2' as string]: ground[1], ...(ground[2] ? { ['--ss-orb-3' as string]: ground[2] } : null) } as CSSProperties)
                : undefined
            }
          />
        )}
        <StillContext.Provider value={still}>
          <LookContext.Provider value={look}>{children(state, rectFor, layout)}</LookContext.Provider>
        </StillContext.Provider>
        {script && <Keycaps rows={[lastKeys, keys]} at={typeof keysAt === 'string' ? keysAt : keysAt[layout]} />}
        {showCursor && <Cursor cursorRef={cursorRef} style={cursor!.style} kind={kind} />}
      </div>
    </div>
  )
}
