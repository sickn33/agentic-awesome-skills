// Film a stage: shots at a fixed interval, laid out as one contact sheet.
// Prints any console warnings (loop seams, missing targets) and errors.
//
//   node scripts/film.mjs <url> [--out shots/film.png] [--every 500] [--count 36]
//        [--delay 0] [--at <mark>] [--select "#example .ss-fit"] [--width 1280]
//        [--cols auto] [--zoom x,y,w,h] [--scale auto] [--pad 16]
//        [--reduced] [--dark] [--still] [--slow 1]
//        [--hover] [--hover-for 4000] [--leave-for 1600]
//        [--gate] [--states] [--states-for 20000]
//        [--report findings.json] [--strict] [--help]
//
//   --out        output PNG, relative to the current directory; the absolute
//                path written is printed
//   --every      ms between frames
//   --count      frames in a contact sheet (ignored by --hover, which uses the
//                --hover-for / --leave-for windows instead)
//   --delay      wait this many ms after the stage appears before the first shot
//   --at <mark>  wait until the stage's data-mark equals <mark> (set by
//                act.mark('<mark>') in a script), then start shooting. Times out
//                after 30s. Stacks with --delay (delay runs after the mark).
//   --select     CSS selector for stages or their containers. Defaults to all
//                visible .ss-fit / .ss-stage elements on any host page.
//   --report     write a JSON report with per-stage findings and coverage.
//                Layout fit checks cover selected stages. For ordinary host
//                controls outside them, also run scripts/layout.mjs <url>.
//   --strict     exit 1 for findings. Incomplete scans always exit 2.
//   --gate       the rehearsal gate: ends `rehearsal passed` only when every
//                never-intentional line (the table in references/rehearse.md,
//                from framing and cut by the crop to spills its slot) is at 0, otherwise prints the
//                count and exits 1. A missing favicon or a sampling gap does
//                not fail the gate; those lines do. Nor does a kit warning, except
//                selection drift (a text selection that isn't under the I-beam).
//   --states     one sheet of every state: the opening, each act.mark() as the
//                stage reaches it and 0.7s after, and the end of the window
//                (--states-for ms, default 20000). Nothing is predicted.
//   --width      viewport width in CSS px. Frames are always captured at 2x and
//                shown 1:1 in the sheet, never scaled up, so a --width 390 sheet
//                reads exactly as a phone would show it.
//   --cols       sheet columns. Default: as many as fit in ~1800 CSS px (wide
//                stages: enough for a sheet about twice as wide as tall).
//   --zoom x,y,w,h  close-up of a region in STAGE coordinates: the stage's own
//                design pixels (the width/height passed to <Stage>), origin at
//                the stage's top-left corner. --pad does not count and is not
//                added. The region is captured at a high device scale so it is
//                genuinely enlarged (works with --still and sheets).
//   --zoom target:<name>[,pad]  close-up that follows [data-target=name]
//                wherever it is drawn, through a Camera's zoom too, refound
//                every frame; pad in stage px (default 16).
//   --scale      device scale for --zoom (default: enough to make the crop
//                ~1200 px wide, between 3 and 8)
//   --pad        CSS px of page around the stage (not used with --zoom)
//   --still      one clean PNG of the stage at 2x (or the --zoom crop), no sheet
//   --hover      for play="hover" stages: a 'rest' frame with the pointer off
//                the stage, then the real pointer moves onto it and frames are
//                taken every --every ms for --hover-for ms ('hover 0.40s'),
//                then it moves off and frames continue for --leave-for ms
//                ('left 0.80s') while the stage settles.
//   --reduced    emulate prefers-reduced-motion: reduce (shows the poster)
//   --dark       emulate prefers-color-scheme: dark
//   --slow N     run the stage's clock and every CSS animation and transition
//                N times slower, so a landing or a press gets every frame.
//                Timestamps stay in scene time. Pair with a short --every
//                (--slow 6 --every 40).
//
// Scale check: the stage's scale at --width is reported when it isn't 1:1.
// Below about 0.85 its type reads small next to other figures; give it a
// compact design for that width instead of letting it shrink. Under 600 wide
// (a phone) the bar is 0.85, and any visible text drawn under about 10px is
// flagged on the shot it shows in.
//
// Clip check: every shot is also checked for marks sliced by a container
// that hides overflow (an avatar half outside its window, a status halo cut
// by a column, text cut mid-word). Crops at the stage's own edge are
// deliberate and ignored, as is any container marked data-crop (an inner
// crop you chose on purpose). Anything reported as "clipped" needs fixing.
// It also flags uneven padding: content in a visible container sitting much
// closer to its top or bottom than its side (a button 14px off a preview's
// bottom with 24px at the left). Padding is even unless you mark the
// container data-crop.
//
// Framing check, every shot, judged in the crop the viewer sees (the stage
// cut again by any wrapper that hides overflow). "framing:" lines: the hero
// window or phone cut on the top or left; a corner bleed whose top and left
// gutters differ by more than 2px (waived when a satellite straddles the
// window's side at any shot); a whole window with uneven margins; an edge a
// few px to most of a gutter short of the stage edge, or past it by a
// sliver under 24px (any box, bottom included); a desktop window that is
// near-square or narrow; a satellite off the gutter; a wrapper shadow with
// tighter corners than the shape inside it (a halo round a phone); and a
// data-target or real words cut by the crop; and anything the story opens
// (popover, menu, toast, tooltip, notification) closer than a gutter to any
// edge, on any frame it shows; a bottom-only bleed off center (waived when
// a satellite, a phone included, straddles the wider side); a column bled
// off the right showing under 56px. Boxes in flight are judged once settled.
// Under a Camera: frames while it moves are skipped, and a settled zoom is
// judged on its focus (whole, clear of the feather), the rest free to crop.
// "touching:" is text within 5px of a neighboring box on its line, or over
// it (a label beside its field in a space-between row with no gap); a parent
// with its own CSS gap only flags overlaps. A satellite edge within 6px of
// a window's traffic lights prints as near-tangent.
//
// Jump scan, every frame of every film including hover/leave (not --still): "jump:" is
// an element that moves or resizes over 2px in one frame instead of gliding,
// "drift:" neighbors gliding out of step (see jumps-core.mjs).
//
// Handoff check, every frame of every film (the motion line): "handoff
// shift:" is an element that hides as an identical one shows in its place
// (same kind, words or drawing) but drawn 0.5px or more away; "settle snap:"
// is an element at rest after motion that shifts 0.5px or more with nothing
// animating; "fly size:" is a Fly that takes off or lands at a different size
// from the element it leaves or becomes.
// "cut by the crop:" is a button or chip half off the edge (remove it or
// bring it in). "half-pixel glyph:" is an odd icon in an even box that
// scales or transitions, so it hops as the motion ends. "squeezed:" is a
// fixed-size flex item its row shrinks; give it flex: none.

import { launch } from './browser.mjs'
import { record, analyse, contentChanges } from './jumps-core.mjs'
import { watchMotion } from './motion-watch.mjs'
import { auditLayout } from './layout-core.mjs'
import { instrumentationSource, coverage, reportResult, printCoverage, motionFindings } from './verification.mjs'
import { filmChecksSource } from './film-checks.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

// The dev server reloads whenever a file changes, and other work may be saving
// files while this films. A reload mid-film (or Vite's error overlay showing
// up) restarts the whole film, a few times with a pause between, instead of
// failing. If it never gets a quiet run it says so: nothing was written.
if (!process.env.FILM_CHILD) {
  const TRIES = 6
  let last
  let reloaded = false
  for (let attempt = 1; attempt <= TRIES; attempt++) {
    last = spawnSync(process.execPath, process.argv.slice(1), { env: { ...process.env, FILM_CHILD: '1' }, encoding: 'utf8' })
    const output = `${last.stdout}${last.stderr}`
    reloaded = last.status !== 0 && (last.status === 3 || /FILM_RELOADED|Execution context was destroyed|Target page, context or browser has been closed|frame was detached/.test(output))
    if (!reloaded) break
    if (attempt < TRIES) {
      console.error(`film: the page reloaded mid-film, filming again (${attempt + 1} of ${TRIES})`)
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500 * attempt)
    }
  }
  if (reloaded) {
    console.error(`film: the page kept reloading (other work is saving files); nothing was written. Try again once it is quiet.`)
    process.exit(3)
  }
  process.stdout.write((last.stdout || '').replace(/^FILM_RELOADED.*\n?/m, ''))
  process.stderr.write(last.stderr || last.error?.message || '')
  process.exit(last.status ?? 1)
}

const args = process.argv.slice(2)
const FLAGS = new Set(['reduced', 'dark', 'still', 'hover', 'strict', 'help', 'gate', 'states'])
const url = args.find((a, i) => !a.startsWith('--') && (i === 0 || !args[i - 1].startsWith('--') || FLAGS.has(args[i - 1].slice(2))))
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const has = (name) => args.includes(`--${name}`)
const VALUE_OPTIONS = new Set(['out', 'every', 'count', 'delay', 'at', 'select', 'width', 'cols', 'zoom', 'scale', 'pad', 'slow', 'hover-for', 'leave-for', 'report', 'states-for'])
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) continue
  const name = args[i].slice(2)
  if (FLAGS.has(name)) continue
  if (!VALUE_OPTIONS.has(name) || !args[i + 1] || args[i + 1].startsWith('--')) {
    console.error(`film: unknown option or missing value: ${args[i]}`)
    process.exit(2)
  }
  i++
}

if (!url || has('help')) {
  // Print the flag reference from this file's header comment
  const head = (await import('node:fs')).readFileSync(new URL(import.meta.url), 'utf8').split('\n')
  const doc = []
  for (const line of head) {
    if (!line.startsWith('//')) break
    doc.push(line.replace(/^\/\/ ?/, ''))
  }
  console.log(doc.join('\n'))
  process.exit(has('help') ? 0 : 2)
}

const out = resolve(process.cwd(), opt('out', 'shots/film.png'))
const every = Number(opt('every', 500))
const count = Number(opt('count', 36))
let select = opt('select', null)
// On the playground, `#example` is scoped to the example the URL names, so a
// reload that lands on another build's page is never mistaken for this one
{
  const url = args.find((a) => /^https?:/.test(a)) || ''
  const slug = (url.match(/[?&]example=([^&#]+)/) || [])[1]
  if (select === '#example' && slug) select = `#example[data-example="${decodeURIComponent(slug)}"]`
}
const width = Number(opt('width', 1280))
const colsOpt = opt('cols', null)
const zoomOpt = opt('zoom', null)
// --zoom target:<name>[,pad]: follows a data-target wherever it is drawn
const zoomTarget = zoomOpt?.startsWith('target:') ? { name: zoomOpt.slice(7).split(',')[0], pad: Number(zoomOpt.split(',')[1] ?? 16) } : null
const zoom = zoomOpt && !zoomTarget ? zoomOpt.split(',').map(Number) : null
const delay = Number(opt('delay', 0))
const pad = Number(opt('pad', 16))
const at = opt('at', null)
const still = has('still')
const hover = has('hover')
const hoverFor = Number(opt('hover-for', 4000))
const leaveFor = Number(opt('leave-for', 1600))
const reportPath = opt('report', null)
const statesFor = Number(opt('states-for', 20000))
for (const [name, value, minimum] of [['every', every, 1], ['count', count, 1], ['width', width, 1], ['delay', delay, 0], ['pad', pad, 0], ['hover-for', hoverFor, 0], ['leave-for', leaveFor, 0], ['states-for', statesFor, 0], ['slow', Number(opt('slow', 1)), 1]]) {
  if (!Number.isFinite(value) || value < minimum || (['count', 'width'].includes(name) && !Number.isInteger(value))) {
    console.error(`film: invalid --${name}: ${value}`)
    process.exit(2)
  }
}
if (still && hover) { console.error('film: --still and --hover are separate capture modes'); process.exit(2) }
if (colsOpt && (!Number.isInteger(Number(colsOpt)) || Number(colsOpt) < 1)) { console.error('film: --cols must be a positive integer'); process.exit(2) }
if (zoomTarget && (!zoomTarget.name || !Number.isFinite(zoomTarget.pad) || zoomTarget.pad < 0)) { console.error('film: target zoom needs a name and a nonnegative padding'); process.exit(2) }
if (has('scale') && (!Number.isFinite(Number(opt('scale'))) || Number(opt('scale')) <= 0)) { console.error('film: --scale must be positive'); process.exit(2) }

if (zoom && (zoom.length !== 4 || zoom.some((n) => !Number.isFinite(n)) || zoom[2] <= 0 || zoom[3] <= 0)) {
  console.error('--zoom wants x,y,w,h in stage coordinates, e.g. --zoom 40,60,200,120, or target:<data-target name>[,pad]')
  process.exit(2)
}
// Device scale is fixed per page, so pick it before opening one.
const dsf = zoom ? Number(opt('scale', 0)) || Math.min(8, Math.max(3, Math.ceil(1200 / zoom[2]))) : zoomTarget ? Number(opt('scale', 0)) || 4 : 2

const browser = await launch()
const fail = async (msg) => {
  console.error(msg)
  await browser.close()
  process.exit(2)
}
const page = await browser.newPage({
  viewport: { width, height: 900 },
  deviceScaleFactor: dsf,
  reducedMotion: has('reduced') ? 'reduce' : 'no-preference',
  colorScheme: has('dark') ? 'dark' : 'light',
})

// Motion watch, running in the page every frame while a sheet is filmed:
//  - appears, then moves: an entrance (a moving element that starts mostly
//    transparent) that is fully visible while most of its travel is still
//    ahead. Arrivals should already be moving on their first visible frame.
//  - near-empty frames: the stage's visible content dropping far below its
//    usual amount (a loop resting on an empty frame, a hole between beats).
//  - hard edge: content being cut by a straight container edge while the
//    cut moves (a row sliced as a panel opens, a line scrolled under a
//    header). Checked on every frame, since it only lasts a few. Keep the
//    content faint while the edge passes (Collapse does), or keep it whole.
//  - lands on a transform: text that comes to rest at the end of a transform
//    transition (translate, scale). Chrome draws text unsnapped while a
//    transform runs and redraws it on the pixel grid when it ends, so it hops
//    a fraction of a pixel as it lands. Keep it on a layer for good
//    (will-change: transform), or scale only its surface.
//  - steps in its box: a box with text in it (a pill, a badge, a bubble, an
//    avatar's initials) moving by layout: pushed by a height opening, or
//    glided by top or margin. Its fill and border glide smoothly but its text
//    snaps to whole pixels, so the text hops about inside the box, last of
//    all just after it seems to have landed. A lasting layer (will-change:
//    transform on the box or a parent) moves box and text as one picture.
// --slow N: the stage's clock and every CSS animation and transition run N
// times slower, so fast beats (a landing, a press) get every frame. Sheet
// timestamps stay in scene time. --dark films the stage in its dark theme.
const slow = Math.max(1, Number(opt('slow', 1)))
await page.addInitScript(([slow, dark, stillRun]) => {
  window.__stageshow = { slow, ...(dark ? { theme: 'dark' } : {}) }
  window.__ssStill = stillRun
}, [slow, has('dark'), still])
await page.addInitScript({ content: instrumentationSource(record, select) })
// The per-shot checks (film-checks.mjs), installed the same way
await page.addInitScript({ content: filmChecksSource() })
if (slow > 1) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Animation.enable')
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / slow })
}
await page.addInitScript(watchMotion, select)

let notes = []
let serverErrors = []
const noise = /favicon/
page.on('console', (m) => {
  if (!['warning', 'error'].includes(m.type()) || noise.test(m.text())) return
  // A 500 while Vite is still compiling is usually transient; judged after the load.
  if (/Failed to load resource.*(5\d\d|Internal Server Error)/.test(m.text())) serverErrors.push(m.text())
  else notes.push(`${m.type()}: ${m.text()}`)
})
page.on('response', (r) => r.status() >= 500 && serverErrors.push(`${r.status()} ${r.url()}`))
page.on('pageerror', (e) => notes.push(`exception: ${e.message}`))

// Find the stage: the first match that is actually laid out and visible.
const findStage = () =>
  page.waitForFunction(
    (sel) => {
      const stages = window.__ssVisibleStages(sel)
      if (!stages.length) {
        if (!document.querySelector('.ss-stage') && document.querySelector('iframe')) throw new Error('This page embeds its scene in an iframe. Film the scene URL directly (the playground uses ?capture=<example>), not the surrounding viewer.')
        if (sel && [...document.querySelectorAll(sel)].some(el => !el.matches('.ss-stage') && !el.querySelector('.ss-stage') && el.closest('.ss-stage'))) throw new Error('--select matches content inside a Stage. Select the .ss-stage itself or its .ss-fit container.')
        return false
      }
      document.querySelectorAll('[data-film-target]').forEach((el) => el.removeAttribute('data-film-target'))
      for (const stage of stages) {
        const target = sel ? [...document.querySelectorAll(sel)].find((el) => el === stage || el.contains(stage)) : stage.closest('.ss-fit') || stage
        target.setAttribute('data-film-target', '')
      }
      return true
    },
    select,
    { timeout: 30000, polling: 100 },
  )

// The first load after a new example appears can stall or 500 while Vite
// compiles it. Retry a timeout once, and reload through transient 500s; only
// report them if they survive the retries.
const MAX_LOADS = 3
let loaded = false
let timeouts = 0
for (let attempt = 1; attempt <= MAX_LOADS && !loaded; attempt++) {
  notes = []
  serverErrors = []
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
    await findStage()
    if (serverErrors.length && attempt < MAX_LOADS) {
      await page.waitForTimeout(800)
      continue
    }
    loaded = true
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || /Timeout/.test(e.message)
    if (timedOut && ++timeouts < 2) continue
    if (!timedOut && serverErrors.length && attempt < MAX_LOADS) {
      await page.waitForTimeout(800)
      continue
    }
    const why = timedOut ? `no visible stages in "${select ?? '.ss-fit, .ss-stage'}" after retrying` : e.message
    await fail([`film: ${why}`, ...serverErrors.map((s) => `server: ${s}`), ...notes].join('\n'))
  }
}
if (!loaded) await fail(`film: page never loaded cleanly\n${[...serverErrors, ...notes].join('\n')}`)
// Never shoot a stage before it has measured and fitted (a first frame of a
// half-placed, tiled stage)
await page.waitForFunction(() => !document.querySelector('[data-film-target] .ss-stage[data-placing], [data-film-target].ss-stage[data-placing]'), null, { timeout: 10000 }).catch(() => notes.push('incomplete: stage placement did not settle within 10s'))
// The page must show the example asked for, not whatever the tab had before
{
  const want = new URL(url).searchParams.get('example')
  const got = await page.evaluate(() => document.querySelector('#example')?.getAttribute('data-example'))
  if (want && got && got !== want) await fail(`film: asked for ${want} but the page shows ${got}`)
}
notes.push(...[...new Set(serverErrors)].map((s) => `server error: ${s}`))
// How big the design shows at this width
const scaleNotes = await page.evaluate((phone) => window.__ssVisibleStages(window.__ssVerification.selector).flatMap((st) => {
  if (!st.offsetWidth) return []
  const k = st.getBoundingClientRect().width / st.offsetWidth
  const lay = st.getAttribute('data-layout')
  let message
  if (phone && k < 0.85) message = `shrunk, not laid out for the phone: drawn at ${k.toFixed(2)} (${lay} design, ${st.offsetWidth}px wide); design compact at the column's width and draw it 1:1`
  else if (k < 0.85) message = `scale: ${k.toFixed(2)} (${lay} design, ${st.offsetWidth}px wide); type reads small below about 0.85`
  else if (k > 1.01) message = `scale: ${k.toFixed(2)}, grown past the design size`
  return message ? [{ key: st.getAttribute('data-ss-verification-stage'), message }] : []
}), width < 600)

// From here on a navigation means the dev server reloaded under the film
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) {
    console.log('FILM_RELOADED')
    process.exit(3)
  }
})
const overlaid = async () => {
  if (await page.$('vite-error-overlay')) {
    console.log('FILM_RELOADED (vite error overlay)')
    process.exit(3)
  }
}

const el = await page.$('[data-film-target]')
const stageCount = await page.evaluate((selector) => window.__ssVisibleStages(selector).length, select)
if (stageCount > 1 && (zoom || zoomTarget || at)) await fail('film: --zoom and --at require one visible stage; narrow --select')
// Let fonts settle and the stage measure itself before the first shot.
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(150)

// Make the viewport tall enough to hold the stage, then put it in view, so the
// clip is in viewport coordinates and the pointer can reach it.
const docBottom = await page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-film-target]')].map((el) => el.getBoundingClientRect().bottom + window.scrollY)))
if (docBottom + pad + 32 > 900) await page.setViewportSize({ width, height: Math.ceil(docBottom + pad + 32) })
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(50)

const stageRoot = async () =>
  (await el.evaluateHandle((n) => (n.classList.contains('ss-stage') ? n : n.querySelector('.ss-stage') ?? n))).asElement()
const stageRoots = async () => {
  const handles = await page.locator('[data-ss-verification-stage]').elementHandles()
  const roots = []
  for (const handle of handles) if (await handle.evaluate((node) => window.__ssVisibleStages(window.__ssVerification.selector).includes(node))) roots.push(handle)
  return roots
}

const waitForMark = async () => {
  if (!at) return
  const root = await stageRoot()
  try {
    await page.waitForFunction(([r, name]) => r.getAttribute('data-mark') === name, [root, at], { timeout: 30000 * slow, polling: 16 })
  } catch {
    const seen = await root.getAttribute('data-mark')
    await fail(`film: stage never reached data-mark="${at}" in 30s (last seen: ${seen ?? 'none'}). Does the script call act.mark('${at}')?`)
  }
}

const clipFor = async () => {
  // The example may still be compiling or animating in; wait for a real box
  let bounds = await el.boundingBox()
  for (let i = 0; !bounds && i < 50; i++) {
    await page.waitForTimeout(200)
    bounds = await el.boundingBox()
  }
  if (!bounds) await fail('film: the stage has no box after 10s. Is it rendered and visible?')
  if (!zoom && !zoomTarget) {
    const boxes = await page.locator('[data-film-target]').evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom } }))
    const x = Math.max(0, Math.min(...boxes.map((r) => r.x)) - pad)
    const y = Math.max(0, Math.min(...boxes.map((r) => r.y)) - pad)
    return { x, y, width: Math.max(...boxes.map((r) => r.right)) + pad - x, height: Math.max(...boxes.map((r) => r.bottom)) + pad - y }
  }
  if (zoomTarget) {
    // Where the target is drawn now (inside a Camera, as zoomed), padded in
    // stage pixels at the same scale
    const root = await stageRoot()
    const t = await root.$(`[data-target="${zoomTarget.name}"]`)
    const tb = t && (await t.boundingBox())
    if (!tb) await fail(`film: --zoom target:${zoomTarget.name} found no visible [data-target="${zoomTarget.name}"] in the stage`)
    const k = await t.evaluate((n) => { const r = n.getBoundingClientRect(); return n.offsetWidth ? r.width / n.offsetWidth : 1 })
    const p = zoomTarget.pad * k
    return { x: tb.x - p, y: tb.y - p, width: tb.width + p * 2, height: tb.height + p * 2 }
  }
  if (!zoom) return { x: bounds.x - pad, y: bounds.y - pad, width: bounds.width + pad * 2, height: bounds.height + pad * 2 }
  // Stage coordinates: undo the fit scale the stage renders at.
  const root = await stageRoot()
  const box = (await root.boundingBox()) ?? bounds
  const designW = await root.evaluate((n) => n.offsetWidth || n.getBoundingClientRect().width)
  const s = box.width / designW
  return { x: box.x + zoom[0] * s, y: box.y + zoom[1] * s, width: zoom[2] * s, height: zoom[3] * s }
}

// What the per-shot checks (film-checks.mjs) found, keyed by stage and
// message, with the shots each was seen at
const clipped = new Map()
const cameraSkipped = []
const clipSamples = new Map()
const layoutDeferred = new Map()
const layoutSamples = new Map()
// A satellite seen beside the hero window at any shot (see Framing)
const sideSatellites = new Set()
const checkClipsForStage = async (label, root) => {
  const stageKey = await root.getAttribute('data-ss-verification-stage')
  // Every per-shot check, in page context (film-checks.mjs): clips, padding,
  // near-tangents, icons, lists, framing, touching and the crop
  const found = await root.evaluate((root) => window.__ssFilmChecks.checkStage(root))
  // Phone widths: the smallest visible text as drawn, through every scale
  if (width < 600) {
    const small = await root.evaluate((root) => window.__ssFilmChecks.smallestText(root))
    if (small) found.push(`small text: ${small.el} renders at ${small.px.toFixed(1)}px on a phone; the floor is about 10px, so lay compact out at the column's width and set its type for it, not shrunk from the wide design`)
  }
  // Controls that spill the slot they were laid out in
  found.push(...await root.evaluate((root) => window.__ssFilmChecks.detectSpills(root)))
  const layout = await root.evaluate(auditLayout)
  layoutSamples.set(stageKey, layout.checked)
  found.push(...layout.findings.map((finding) => finding.message))
  if (layout.deferred.length) layoutDeferred.set(stageKey, layout.deferred)
  else layoutDeferred.delete(stageKey)
  if (found.includes('SAT_SIDE')) sideSatellites.add(stageKey)
  if (found.includes('CAMERA_MOVING')) cameraSkipped.push({ stageKey, label })
  else clipSamples.set(stageKey, (clipSamples.get(stageKey) || 0) + 1)
  for (const message of found) if (message !== 'SAT_SIDE' && message !== 'CAMERA_MOVING') {
    const key = `${stageKey}: ${message}`
    const entry = clipped.get(key) || { stageKey, message, at: [] }
    entry.at.push(label)
    clipped.set(key, entry)
  }
}
const checkClips = async (label) => {
  for (const root of await stageRoots()) await checkClipsForStage(label, root)
}
const clipFindings = (stageKey, minFrames) => [...clipped.values()]
  .filter((entry) => entry.stageKey === stageKey)
  .filter(({ message: f }) => !(sideSatellites.has(stageKey) && (f.startsWith('framing: corner bleed') || f.includes('runs off the bottom but sits off center'))))
  .filter(({ message: f, at }) => at.length >= minFrames || /^(translucent|covers|framing|small text)/.test(f))
  .map(({ message: f, at }) => `${/^(layout|uneven|translucent|lopsided|near-tangent|covers|unclipped|double corner|tight lines|tight stack|loose stack|tight mark|tight inset|skeleton ladder|onion skin|kit override|unit wrapped|clipped glyph|loose list|empty pane|fat row|emoji icon|anchor drift|uneven padding|mixed icons|tight control|invented mark|uneven inset|uneven gutters|avatar alignment|spills its slot|half-pixel|squeezed|cut by the crop|framing|touching|dark slab|small text)/.test(f) ? '' : 'clipped: '}${f} (${at.length > 3 ? `${at.length} frames from ${at[0]}` : at.join(', ')})`)

const finishReport = (snapshot, requestedMs = 0) => {
  const errors = [...notes, ...(snapshot?.errors || [])]
  if (!snapshot) errors.push('recording was unavailable')
  const stages = Object.entries(snapshot?.stages || {}).map(([key, stage]) => {
    const sample = still ? { status: 'complete', frames: 1, durationMs: 0, maxGapMs: 0, reasons: [] } : coverage(stage.frames, { requestedMs, slow })
    if (!still && !stage.motion) { sample.status = 'inconclusive'; sample.reasons.push('motion watcher produced no samples') }
    sample.framingSamples = clipSamples.get(key) || 0
    sample.layout = layoutSamples.get(key) || { controls: 0, paddedContainers: 0 }
    if (!sample.framingSamples) { sample.status = 'inconclusive'; sample.reasons.push('no framing sample was judged for this stage') }
    const manual = still ? [] : contentChanges(stage.frames, slow)
    if (layoutDeferred.has(key)) {
      sample.status = 'inconclusive'
      sample.reasons.push('some layout geometry was still moving at the final shot')
      manual.push(`Layout checks remain deferred: ${layoutDeferred.get(key).join('; ')}. Capture a settled state.`)
    }
    if (stage.frames.some((frame) => frame.cameraMoving)) manual.push('Camera contents were omitted from geometry checks while moving; inspect the full push-in and return.')
    const cameraShots = cameraSkipped.filter((frame) => frame.stageKey === key).length
    if (cameraShots) manual.push(`Framing checks omitted ${cameraShots} shot(s) while the camera moved.`)
    return { key, label: stage.label, coverage: sample, findings: [...scaleNotes.filter((note) => note.key === key).map((note) => note.message), ...clipFindings(key, still ? 1 : 2), ...(!still ? [...analyse(stage.frames, slow), ...motionFindings(stage.motion, slow)] : [])], manual }
  })
  const result = reportResult({ stages, errors, strict: has('strict'), still })
  for (const stage of stages) {
    printCoverage(stage.key, stage.coverage)
    for (const line of stage.findings) console.log(`[${stage.key}] ${line}`)
    for (const line of stage.manual) console.log(`[${stage.key}] manual: ${line}`)
  }
  for (const error of errors) console.error(`incomplete: ${error}`)
  console.log(`film: ${result.status}; ${still ? 'still capture only, motion was not judged' : 'watch the motion and inspect every image before approval'}`)
  if (has('gate')) {
    const NEVER = /^(clipped: )?(framing|cut by the crop|tight stack|loose stack|tight mark|tight inset|skeleton ladder|onion skin|kit override|unit wrapped|clipped glyph|loose list|empty pane|fat row|emoji icon|anchor drift|uneven padding|mixed icons|tight control|invented mark|uneven inset|uneven gutters|avatar alignment|spills its slot):/
    const bad = [...stages.flatMap((stage) => stage.findings.filter((line) => NEVER.test(line))), ...notes.filter((line) => /\[stageshow\] selection drift:/.test(line))]
    if (bad.length) { console.log(`rehearsal failed: ${bad.length} never-intentional line(s) above`); process.exitCode = 1 }
    else console.log('rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)')
  }
  if (reportPath) {
    const path = resolve(reportPath)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(result, null, 2) + '\n')
  }
  process.exitCode = result.exitCode
}

const shots = []
const shoot = async (label) => {
  await overlaid()
  // A target followed through a Camera: re-found every frame (the sheet
  // shows each at one width; a uniform zoom keeps its shape)
  if (zoomTarget) clip = await clipFor()
  await checkClips(label)
  const buf = await page.screenshot({ clip })
  shots.push({ label, src: `data:image/png;base64,${buf.toString('base64')}`, w: clip.width, h: clip.height })
}
const secs = (ms) => `${(ms / 1000).toFixed(2)}s`

// A series of frames on a fixed clock, labeled from the series start.
const series = async (ms, prefix) => {
  const n = Math.max(1, Math.floor(ms / every) + 1)
  const start = Date.now()
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(Math.max(0, start + i * every * slow - Date.now()))
    await shoot(`${prefix}${secs((Date.now() - start) / slow)}`)
  }
}

let clip
// Measure the requested interval on the same browser clock as the samples.
// Serializing a large trace back to Node happens after recording has stopped
// and must not turn complete browser coverage into an artificial shortfall.
const captureStarted = await page.evaluate(() => performance.now())
if (hover) {
  // Park the pointer outside the stage first.
  await page.mouse.move(1, 1)
  await page.waitForTimeout(150 + delay)
  clip = await clipFor()
  await shoot('rest')
  for (const root of await stageRoots()) {
    const key = await root.getAttribute('data-ss-verification-stage')
    const box = await root.boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 })
    await waitForMark()
    await series(hoverFor, `${key} hover `)
    await page.mouse.move(1, 1, { steps: 8 })
    await series(leaveFor, `${key} left `)
  }
} else {
  await waitForMark()
  await page.waitForTimeout(delay)
  clip = await clipFor()
  if (still) {
    await overlaid()
    // A number part way through its roll isn't the poster: wait for it to land
    await page.waitForFunction(() => !document.querySelector('[data-film-target] .ss-count[data-rolling], [data-film-target].ss-stage .ss-count[data-rolling]'), null, { timeout: 4000 * slow, polling: 16 }).catch(() => notes.push('incomplete: number roll did not settle before the still'))
    mkdirSync(dirname(out), { recursive: true })
    await page.screenshot({ path: out, clip })
    await checkClips('still')
    const snapshot = await page.evaluate(() => { window.__ssVerification.stopped = true; return window.__ssVerification }).catch(() => null)
    await browser.close()
    console.log(`still${zoom || zoomTarget ? ` (zoom ${dsf}x)` : ''} -> ${out}`)
    finishReport(snapshot)
    process.exit(process.exitCode)
  }
  await page.evaluate(() => (window.__filmStart = performance.now()))
  if (has('states')) {
    // Every state the script passes through: the opening, each mark as the
    // stage reaches it and again 0.7s on when it has settled, then the end
    const roots = await stageRoots()
    // data-mark lives on the stage itself, which may sit inside the selected fit box
    const root = (await roots[0].$('.ss-stage')) ?? roots[0]
    const start = Date.now()
    let last = await root.getAttribute('data-mark')
    await shoot('open')
    const pending = []
    while (Date.now() - start < statesFor * slow) {
      await page.waitForTimeout(40)
      const mark = await root.getAttribute('data-mark')
      if (mark && mark !== last) { last = mark; await shoot(`${mark}`); pending.push({ mark, at: Date.now() + 700 * slow }) }
      while (pending.length && pending[0].at <= Date.now()) { const p = pending.shift(); await shoot(`${p.mark} +0.7s`) }
    }
    await shoot(`end ${secs((Date.now() - start) / slow)}`)
  } else {
    // The jump scan has been running since the first stage render, including
    // once-only beats that happened before fonts and the first shot settled.
    const start = Date.now()
    for (let i = 0; i < count; i++) {
      await page.waitForTimeout(Math.max(0, start + i * every * slow - Date.now()))
      await shoot(`${(Math.max(0, Date.now() - start) / slow / 1000).toFixed(slow > 1 ? 2 : 1)}s`)
    }
  }
}

const stopped = await page.evaluate(() => {
  window.__ssVerification.stopped = true
  return { at: performance.now(), snapshot: window.__ssVerification }
}).catch(() => null)
const snapshot = stopped?.snapshot
const captureMs = stopped ? stopped.at - captureStarted : 0

// Lay the frames out in the browser itself, so there is nothing else to install.
// The sheet renders at 2x and each frame is drawn at its natural pixel size
// (CSS width = pixels / 2), so nothing is ever scaled up or down.
// A followed target varies in size: frame them all at the widest
if (zoomTarget) clip = shots.reduce((a, s) => (s.w > a.width ? { width: s.w, height: s.h } : a), { width: 0, height: 0 })
const frameW = Math.round((clip.width * dsf) / 2)
const gap = 12
// Columns: as many as fit in ~1800px, but a wide stage that fits only one or
// two still gets a sheet about twice as wide as it is tall, not a long strip
const frameH = Math.round((clip.height * dsf) / 2)
const fit = Math.floor(1800 / (frameW + gap))
const even = Math.round(Math.sqrt((shots.length * 2 * (frameH + gap)) / (frameW + gap)))
const cols = colsOpt ? Number(colsOpt) : Math.max(1, Math.min(shots.length, fit >= 3 ? fit : Math.max(fit, even)))
const sheetHeight = Math.ceil(shots.length / cols) * (frameH + gap) + gap
const sheet = await browser.newPage({ viewport: { width: cols * (frameW + gap) + gap, height: Math.min(400, sheetHeight) }, deviceScaleFactor: 2 })
await sheet.setContent(`<body style="margin:0;background:#e9e9e9;font:11px system-ui">
  <div style="display:grid;grid-template-columns:repeat(${cols},${frameW}px);gap:${gap}px;padding:${gap}px">
  ${shots
    .map(
      (s) => `<figure style="margin:0;position:relative">
        <img src="${s.src}" style="width:${frameW}px;display:block;background:#fff">
        <figcaption style="position:absolute;left:4px;top:4px;padding:1px 4px;background:#000c;color:#fff;border-radius:3px">${s.label}</figcaption>
      </figure>`,
    )
    .join('')}
  </div></body>`)
await sheet.waitForLoadState('load')
mkdirSync(dirname(out), { recursive: true })
await sheet.screenshot({ path: out, fullPage: true })
await browser.close()

const what = hover ? `${shots.length} frames (rest, hover ${hoverFor}ms, leave ${leaveFor}ms) every ${every}ms` : `${shots.length} frames every ${every}ms`
console.log(`${what}${zoom || zoomTarget ? `, zoom ${dsf}x` : ''} -> ${out}`)
finishReport(snapshot, captureMs)
