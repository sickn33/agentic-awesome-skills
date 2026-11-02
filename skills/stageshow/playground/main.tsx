import { installVirtualClock } from '../kit/clock'
import { createFrameDriver, createPlayback } from './playback'

const params = new URLSearchParams(location.search)
const errorText = (error: unknown) => error instanceof Error ? error.message : String(error)
function showFailure(error: unknown) {
  const message = document.createElement('p')
  message.setAttribute('role', 'alert')
  message.textContent = `This example could not load: ${errorText(error)}. Check the console for details, then replay after fixing it.`
  document.getElementById('root')!.replaceChildren(message)
}

async function boot() {
  if (params.has('capture')) {
    // Film/jump tools control their own pacing and instrumentation. This
    // direct route keeps the browser's native timers, RAF and CSS clocks.
    const { mount } = await import('./preview')
    await mount(params.get('capture')!, params.get('still') === '1')
    return
  }
  if (!params.has('embed')) {
    const { mount } = await import('./viewer')
    mount()
    return
  }
  // Only the iframe owns virtual time. Capture the native clocks before
  // installing it so the viewer and this driver remain responsive.
  const nativeRaf = window.requestAnimationFrame.bind(window)
  const nativeCancelRaf = window.cancelAnimationFrame.bind(window)
  const realNow = performance.now.bind(performance)
  let wakeLayout = () => {}
  const clock = installVirtualClock({ onLayout: () => wakeLayout() })
  const startedAt = clock.now()
  let failed = false
  let paused = false
  let reported = 0
  let ready = false
  let staticScene = false
  let placingScene = false
  let syncScene = () => {}
  const send = (extra = {}) => parent.postMessage({ type: 'stageshow:status', frame: clock.frame, elapsed: clock.now() - startedAt, staticScene, ...extra }, location.origin)
  const fail = (error: unknown) => {
    if (failed) return
    failed = true
    playback.set({ playing: false })
    driver.sync()
    send({ ready: false, error: errorText(error) })
  }
  const report = () => {
    const now = realNow()
    if (paused || now - reported > 150) { send(); reported = now }
  }
  const playback = createPlayback(clock, { now: realNow, hidden: () => document.hidden, onFrame: report, onError: fail })
  const needsPlacement = () => placingScene || ((staticScene || !playback.isPlaying()) && clock.layoutPending)
  const driver = createFrameDriver({
    running: () => ready && !failed && (needsPlacement() ? playback.isVisible() : !staticScene && playback.isPlaying()),
    request: nativeRaf,
    cancel: nativeCancelRaf,
    tick: async (timestamp) => {
      try {
        if (needsPlacement()) { await playback.place(); syncScene() }
        else await playback.tick(timestamp)
      }
      catch (error) { fail(error) }
    },
  })
  wakeLayout = driver.sync
  const syncVisibility = () => { playback.set({}); driver.sync() }
  document.addEventListener('visibilitychange', syncVisibility)
  window.addEventListener('error', (event) => fail(event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => fail(event.reason))
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'stageshow:control' || failed) return
    const data = event.data
    if (typeof data.playing === 'boolean') paused = !data.playing
    if (data.step) paused = true
    playback.set({ playing: data.playing, visible: data.visible, speed: data.speed })
    if (data.step) void playback.step().then(() => send())
    else if (paused) send()
    driver.sync()
  })
  try {
    const { mount } = await import('./preview')
    await mount(params.get('embed')!, params.get('still') === '1', fail)
    await clock.settle()
    const example = document.getElementById('example')
    if (!example) throw new Error('The example did not mount')
    new ResizeObserver(() => send({ height: example.offsetHeight })).observe(example)
    syncScene = () => {
      const stages = [...example.querySelectorAll('.ss-stage')]
      // Still/reduced scenes need their initial measurement frames before
      // sleeping. Active scenes keep all timers and CSS motion advancing;
      // an empty queue is not evidence that a script has finished.
      const next = stages.length > 0 && stages.every(stage => stage.hasAttribute('data-still'))
      placingScene = stages.some(stage => stage.hasAttribute('data-placing'))
      if (staticScene !== next) { staticScene = next; playback.set({}); send() }
      driver.sync()
    }
    new MutationObserver(syncScene).observe(example, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['data-still', 'data-placing'],
    })
    ready = true
    syncScene()
    if (!failed) send({ ready: true })
  } catch (error) {
    fail(error)
    showFailure(error)
  }
}

void boot().catch(showFailure)
