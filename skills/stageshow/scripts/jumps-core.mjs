// One-frame snaps and drift, shared by film.mjs (every film) and jumps.mjs.
//
// record() runs in the page on the stage element: it records the box of
// every visible element on the stage each animation frame, into
// window.__frames. analyse() reports any element whose position or size
// changes by more than 2px in one frame while it was still the frame before
// and after (a snap), and neighbors that keep their size but not their gap
// while gliding (drift: they run on different curves). Things that appear or
// disappear are not snaps (fades handle those). Carets are skipped; mark
// anything else that should step with data-snap. Frames where a Camera
// moves skip what is inside it.

export function record(stage, options = {}) {
  const { key, ms = Infinity } = typeof options === 'number' ? { ms: options } : options
  const ids = new WeakMap()
  let n = 0
  const label = (el) => {
    const cls = (el.getAttribute('class') || el.tagName.toLowerCase()).split(' ')[0]
    const text = (el.textContent || '').trim().slice(0, 18)
    return `${cls}${text ? ` "${text}"` : ''}`
  }
  const id = (el) => {
    if (!ids.has(el)) ids.set(el, { n: n++, name: label(el) })
    return ids.get(el)
  }
  const frames = []
  if (key) window.__ssVerification.stages[key].frames = frames
  else window.__frames = frames
  const t0 = performance.now()
  const tick = () => {
    if (window.__ssVerification?.stopped || !stage.isConnected) return
    try {
    const box = stage.getBoundingClientRect()
    const s = box.width / stage.offsetWidth || 1
    const items = []
    const cameras = [...stage.querySelectorAll('.ss-camera')]
    const movingCameras = cameras.filter((cam) => document.getAnimations().some((x) => x.playState === 'running' && (x.effect?.target === cam || x.effect?.target === cam.parentElement)))
    for (const el of stage.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width * r.height < 16) continue
      // Carets step a letter at a time, and data-snap marks anything else
      // that is meant to step
      if (el.closest('[data-snap], [data-typing], .ss-caret, .ss-field__caret, .ss-term__caret')) continue
      // The cursor's glyph swaps shape (arrow, hand, crosshair) by design
      if (el.parentElement?.closest('.ss-cursor')) continue
      // Inside a Camera while it moves, everything scales and slides together
      // on purpose: not a jump, and no gap holds still
      if (movingCameras.some((cam) => cam.contains(el))) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden') continue
      // A wrapper that paints nothing and clips nothing can't be seen to jump:
      // only what it holds can, and that is checked on its own (a Roll
      // re-forming around the digits that change, with every glyph in place)
      const paints = (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') || cs.backgroundImage !== 'none' || parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) > 0 || cs.boxShadow !== 'none' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
      const ownText = [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())
      if (!paints && !ownText && el.children.length && el.tagName.toLowerCase() !== 'svg') continue
      // Invisible through any ancestor's opacity counts as invisible: a reset
      // inside a faded-out parent is not a jump anyone sees
      let alpha = 1
      for (let p = el; p && p !== stage && alpha > 0.02; p = p.parentElement) alpha *= +getComputedStyle(p).opacity
      if (alpha <= 0.02) continue
      const { n, name } = id(el)
      // Stage units, so a scaled stage reports the design's pixels
      // The parent and the next sibling, for the drift check
      const pid = el.parentElement ? id(el.parentElement).n : -1
      // Only neighbors in flow: a satellite, toast or keycap row floats over
      // its siblings rather than sitting in a column with them
      const sib = el.nextElementSibling
      const inFlow = (e) => !/absolute|fixed/.test(getComputedStyle(e).position)
      const next = sib && inFlow(el) && inFlow(sib) ? id(sib).n : -1
      const typing = !!el.closest('[data-typing], .ss-field__chars, .ss-field__placeholder, .ss-kb__callout, .ss-kb__suggest, .ss-roll')
      // Geometry cannot decide whether an instant text/icon change is intended.
      const words = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('')
      const drawing = el.tagName.toLowerCase() === 'svg' ? el.innerHTML : ''
      const content = typing ? null : `${words}|${drawing}`
      items.push([n, name, (r.left - box.left) / s, (r.top - box.top) / s, r.width / s, r.height / s, pid, next, content])
    }
    frames.push({ t: performance.now() - t0, mark: stage.dataset.mark, items, cameraMoving: movingCameras.length })
    if (performance.now() - t0 < ms) requestAnimationFrame(tick)
    } catch (error) {
      if (window.__ssVerification) window.__ssVerification.errors.push(`box recorder ${key || ''}: ${error.message}`)
      else throw error
    }
  }
  requestAnimationFrame(tick)
}

export function analyse(frames, slow = 1) {
  if (!Array.isArray(frames)) throw new TypeError('The jump scan requires recorded frames')
  const at = frames.map((f) => new Map(f.items.map((i) => [i[0], i])))
  // A frame that came late (the page busy, as when film takes a screenshot)
  // carries several frames of gliding at once: it can't tell a snap from a
  // glide, so frames around a stall are not judged
  const dts = frames.slice(1).map((fr, i) => fr.t - frames[i].t).sort((a, b) => a - b)
  const frameMs = dts[Math.floor(dts.length / 2)] || 16.7
  const late = (f) => f > 0 && frames[f].t - frames[f - 1].t > frameMs * 1.6
  const found = new Map()
  for (let f = 2; f < frames.length - 1; f++) {
    if (late(f - 1) || late(f) || late(f + 1)) continue
    for (const [n, it] of at[f]) {
      const a = at[f - 2].get(n), b = at[f - 1].get(n), c = at[f + 1].get(n)
      if (!a || !b || !c) continue
      for (const [k, ax] of [['x', 2], ['y', 3], ['width', 4], ['height', 5]]) {
        const d = it[ax] - b[ax]
        const calm = Math.max(Math.abs(b[ax] - a[ax]), Math.abs(c[ax] - it[ax]), 0.4)
        if (Math.abs(d) > 2 && Math.abs(d) > 3 * calm) {
          // One line per element and axis: the first time, and how often
          const key = `${n}:${k}`
          const prev = found.get(key)
          if (prev) prev.count++
          else found.set(key, { id: n, parent: it[6], t: frames[f].t, mark: frames[f].mark, name: it[1], k, d, count: 1 })
        }
      }
    }
  }
  // Drift: neighbors in a column that glide out of step. Two siblings that
  // both keep their size should keep the gap between them; a gap that wobbles
  // for several frames means one runs on a different curve (a timestamp gliding
  // slower than the messages around it). New arrivals are left out: they are
  // meant to move differently while they come in.
  const born = new Map()
  frames.forEach((fr, f) => fr.items.forEach((i) => born.has(i[0]) || born.set(i[0], f)))
  const drift = new Map()
  for (let f = 1; f < frames.length; f++) {
    if (late(f)) continue
    for (const [n, it] of at[f]) {
      const nx = it[7] >= 0 ? at[f].get(it[7]) : null
      const pa = at[f - 1].get(n), pb = nx && at[f - 1].get(nx[0])
      if (!nx || !pa || !pb) continue
      if (f - born.get(n) < 45 || f - born.get(nx[0]) < 45) continue
      const held = Math.abs(it[5] - pa[5]) < 0.3 && Math.abs(nx[5] - pb[5]) < 0.3
      const dg = nx[3] - (it[3] + it[5]) - (pb[3] - (pa[3] + pa[5]))
      if (!held || Math.abs(dg) <= 1) continue
      const key = `${n}>${nx[0]}`
      const d = drift.get(key) ?? { t: frames[f].t, mark: frames[f].mark, a: it[1], b: nx[1], max: 0, count: 0 }
      d.max = Math.max(d.max, Math.abs(dg))
      d.count++
      drift.set(key, d)
    }
  }

  // Anchor drift: an open popover or menu whose top edge moves while its
  // height changes (a filtered list re-centering the box). An open surface
  // holds its anchor; the list grows and shrinks downward from it
  const anchored = new Map()
  for (let f = 1; f < frames.length; f++) {
    if (late(f)) continue
    for (const [n, it] of at[f]) {
      if (!/^ss-(popover|menu|sheet)\b/.test(it[1]) || f - born.get(n) < 30) continue
      const p = at[f - 1].get(n)
      if (!p) continue
      const dy = it[3] - p[3], dh = it[5] - p[5]
      if (Math.abs(dy) < 0.3 || Math.abs(dh) < 0.3) continue
      const a = anchored.get(n) ?? { t: frames[f].t, mark: frames[f].mark, name: it[1], y: 0, h: 0, count: 0 }
      a.y += dy; a.h += dh; a.count++
      anchored.set(n, a)
    }
  }
  const anchors = [...anchored.values()].filter((a) => Math.abs(a.y) >= 1)

  // A parent's snap drags its children with it: report the outermost only
  const lines = [...found.values()].sort((p, q) => p.t - q.t)
  const kept = []
  for (const l of lines) {
    if (kept.some((s) => s.id === l.parent && Math.abs(s.t - l.t) < 40 && s.k === l.k && Math.abs(s.d - l.d) < 0.6)) continue
    kept.push(l)
  }

  const drifts = [...drift.values()].filter((d) => d.count >= 4)
  const t = (ms) => (ms / 1000 / slow).toFixed(2)
  return [
    ...anchors.map((a) => `anchor drift: ${a.name} moves ${a.y > 0 ? 'down' : 'up'} ${Math.abs(a.y).toFixed(1)}px while its height changes by ${a.h.toFixed(0)}px (from ${t(a.t)}s${a.mark ? ` [${a.mark}]` : ''}); an open popover holds its top edge and its list grows and shrinks downward, so anchor it by its top, never center it`),
    ...drifts.map((d) => `drift: ${d.a} and ${d.b} glide out of step (gap changes up to ${d.max.toFixed(1)}px a frame, ${d.count} frames from ${t(d.t)}s${d.mark ? ` [${d.mark}]` : ''})`),
    ...kept.map((l) => `jump: ${l.name} ${l.k} ${l.d > 0 ? '+' : ''}${l.d.toFixed(1)}px in one frame at ${t(l.t)}s${l.mark ? ` [${l.mark}]` : ''}${l.count > 1 ? `, ${l.count} times` : ''}`),
  ]
}

export function contentChanges(frames, slow = 1) {
  const seen = new Map()
  const found = new Map()
  for (const frame of frames) {
    for (const item of frame.items) {
      const old = seen.get(item[0])
      if (old && item[8] != null && old[8] != null && item[8] !== old[8] && item.slice(2, 6).every((n, i) => Math.abs(n - old[i + 2]) < 0.5) && !found.has(item[0])) {
        found.set(item[0], `same-box content change: ${item[1]} changes text or drawing at ${(frame.t / 1000 / slow).toFixed(2)}s${frame.mark ? ` [${frame.mark}]` : ''}; inspect the transition in motion (geometry alone cannot judge it)`)
      }
      seen.set(item[0], item)
    }
  }
  return [...found.values()]
}
