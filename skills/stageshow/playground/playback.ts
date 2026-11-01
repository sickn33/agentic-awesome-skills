type Clock = { fps: number; step(frames?: number): Promise<void>; advance(milliseconds: number): Promise<void>; flushLayout(): Promise<void> }
type Controls = { playing?: boolean; visible?: boolean; speed?: number }

/** One virtual frame at a time, so a control received during a frame takes
 * effect before the next. Manual steps share the same queue as playback. */
export function createPlayback(clock: Clock, {
  now, hidden, onFrame, onError,
}: {
  now: () => number
  hidden: () => boolean
  onFrame: () => void
  onError: (error: unknown) => void
}) {
  let playing = true
  let visible = false
  let speed = 1
  let previous = now()
  let failed = false
  let ticking = false
  let queue = Promise.resolve()
  const canRender = () => visible && !hidden() && !failed
  const canPlay = () => playing && canRender()
  const resetTime = () => { previous = now() }
  const advance = (kind: 'play' | 'step' | 'layout', elapsed = 0) => {
    queue = queue.then(async () => {
      if (failed || (kind === 'play' && !canPlay()) || (kind === 'layout' && !canRender())) return
      try {
        if (kind === 'layout') await clock.flushLayout()
        else {
          if (kind === 'play') await clock.advance(elapsed)
          else await clock.step(1)
          onFrame()
        }
      } catch (error) {
        failed = true
        playing = false
        onError(error)
      }
    })
    return queue
  }
  return {
    isPlaying: canPlay,
    isVisible: canRender,
    set(controls: Controls) {
      if (typeof controls.playing === 'boolean') playing = controls.playing
      if (typeof controls.visible === 'boolean') visible = controls.visible
      if (controls.speed !== undefined && [0.25, 0.5, 1, 2].includes(controls.speed)) speed = controls.speed
      resetTime()
    },
    step() {
      playing = false
      resetTime()
      return advance('step')
    },
    place() {
      // Measurement work shares the motion queue, but changes neither the
      // user's play preference nor the scene's virtual clock.
      resetTime()
      return advance('layout')
    },
    async tick(timestamp = now()) {
      if (ticking || failed) return
      ticking = true
      // Native RAF timestamps share one paint clock. Callback-entry times
      // include task jitter and can turn steady paints into repeated/skipped
      // fixed frames. Live playback advances once by the actual elapsed time.
      const elapsed = Math.max(0, timestamp - previous)
      previous = timestamp
      try {
        if (!canPlay() || elapsed === 0) return
        // Bound a stalled tab's work; pause never waits behind a catch-up
        // batch. Recording and manual Step retain their fixed frame size.
        await advance('play', Math.min(100, elapsed * speed))
      } finally {
        ticking = false
      }
    },
  }
}

/** Keep at most one native frame scheduled. A sleeping driver wakes only
 * when controls, visibility or the scene's static state actually change. */
export function createFrameDriver({ running, tick, request, cancel }: {
  running: () => boolean
  tick: (timestamp: number) => Promise<void>
  request: (callback: FrameRequestCallback) => number
  cancel: (id: number) => void
}) {
  let frame: number | null = null
  let ticking = false
  let disposed = false
  const sync = () => {
    if (disposed || !running()) {
      if (frame !== null) cancel(frame)
      frame = null
    } else if (frame === null && !ticking) {
      frame = request(async (timestamp) => {
        frame = null
        ticking = true
        try { await tick(timestamp) }
        finally { ticking = false; sync() }
      })
    }
  }
  return {
    sync,
    dispose() { disposed = true; sync() },
  }
}
