// The per-shot checks film.mjs runs inside the page: clips, padding, framing,
// touching, satellites and the rest. One named function per detector, each
// returning its findings, all built on one color parser, one surface test and
// one ancestor-visibility walk. film.mjs injects them with filmChecksSource()
// (the verification.mjs pattern: Function.toString into an init script), so
// every function here is self-contained: no module-scope state, only the
// other functions in this file and the DOM.
//
// Order matters: a stage's findings are keyed by first appearance, so
// checkStage calls the detectors in the order film.mjs always has.

// ---- Primitives -----------------------------------------------------------

// The one color parser: a computed color to its channels and alpha, or null
// when it is not one. Chrome serializes color-mix() results as
// color(srgb r g b / a), so that form is read as well as rgb()/rgba().
export function rgbaOf(color) {
  const m = color && color.match(/rgba?\(([^)]+)\)|color\(srgb\s+([^)]+)\)/)
  if (!m) return null
  const p = (m[1] ?? m[2]).split(/[ ,/]+/).filter(Boolean)
  return { r: Number(p[0]), g: Number(p[1]), b: Number(p[2]), a: p.length > 3 ? parseFloat(p[3]) : 1 }
}

// Alpha of a color, or the fallback when it does not parse. Call sites state
// their own fallback: most treat an unparsed background as painting nothing
// (0); the icon check treats an unparsed stroke as opaque (1), so an unknown
// paint is not reported as translucent.
export function alphaOf(color, fallback) {
  const c = rgbaOf(color)
  return c ? c.a : fallback
}

// The one surface test: a background with alpha over minAlpha, a shadow, and
// when asked an image or a top border (styled: only a border with a style).
// The thresholds below (0.02, 0.03, 0.05) are each check's own, kept as they
// were. A computed box-shadow is 'none' or a value, so the shadow test reads
// the same at every site.
export function paintsSurface(cs, { minAlpha = 0.05, image = false, border = false, styled = false, shadow = true } = {}) {
  if (alphaOf(cs.backgroundColor, 0) > minAlpha) return true
  if (image && cs.backgroundImage !== 'none') return true
  if (border && parseFloat(cs.borderTopWidth) > 0 && (!styled || cs.borderTopStyle !== 'none')) return true
  return shadow && !!cs.boxShadow && cs.boxShadow !== 'none'
}
// A fill or shadow (the near-tangent, pill and padding checks)
function surface(cs) { return paintsSurface(cs) }
// A fill, image, border or shadow (the card and container checks)
function visible(n) { return paintsSurface(getComputedStyle(n), { minAlpha: 0.02, image: true, border: true }) }
// A fill, shadow or top border (the framing and touching checks)
function hasSurface(cs) { return paintsSurface(cs, { border: true }) }

// The one ancestor walk: nothing hidden from the node up to and including
// the stage, and at least half opaque through every layer. With clipped,
// also not clipped away by an overflow-hidden ancestor (a counter's strip of
// figures outside its one-line window, a track scrolled past its mask).
export function visibleThrough(n, root, clipped = false) {
  let f = 1
  const r = clipped ? n.getBoundingClientRect() : null
  for (let a = n; a && a !== root.parentElement; a = a.parentElement) {
    const c = getComputedStyle(a)
    if (c.display === 'none' || c.visibility === 'hidden') return false
    f *= Number(c.opacity)
    if (clipped && a !== n && /hidden|clip/.test(c.overflowX + c.overflowY)) {
      const b = a.getBoundingClientRect()
      if (r.bottom <= b.top + 0.5 || r.top >= b.bottom - 0.5 || r.right <= b.left + 0.5 || r.left >= b.right - 0.5) return false
    }
  }
  return f >= 0.5
}
function painted(n, root) { return visibleThrough(n, root) }
function shown(n, root) { return visibleThrough(n, root, true) }

// Opacity through every layer from the node up to (not including) stop
function fadeThrough(n, stop) {
  let o = 1
  for (let a = n; a && a !== stop; a = a.parentElement) o *= Number(getComputedStyle(a).opacity)
  return o
}

// tag.first-class "first words"
function labelOf(n) {
  const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : ''
  const text = (n.textContent || '').trim().slice(0, 24)
  return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}${text ? ` "${text}"` : ''}`
}
// tag.first-class, for svg too
function tagOf(n) {
  const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : (n.className?.baseVal || '').split(/\s+/)[0]
  return `${n.tagName.toLowerCase()}${cls ? '.' + cls : ''}`
}
function px(v) { return Math.round(v) }
// 1-4px apart, in stage px
function nearTangent(d) { return d > 0.75 && d <= 3 }

// ---- Stage context --------------------------------------------------------

// What every detector reads: the stage, its box, scale and fidelity, and the
// camera's state when it has one
function stageContext(root) {
  const S = root.getBoundingClientRect()
  const cam = root.querySelector('.ss-camera')
  const zoomView = cam?.parentElement?.hasAttribute('data-zoomed') ? cam.parentElement : null
  // The focus on screen, mapped through the zoom
  const focusRect = (() => {
    if (!zoomView?.dataset.focus) return null
    const [fx, fy, fw, fh] = zoomView.dataset.focus.split(',').map(Number)
    const c = cam.getBoundingClientRect()
    const k = c.width / cam.offsetWidth
    return { left: c.left + fx * k, top: c.top + fy * k, right: c.left + (fx + fw) * k, bottom: c.top + (fy + fh) * k, k }
  })()
  const scale = S.width / root.offsetWidth || 1
  const specimen = !!(root.closest('[data-specimen]') || root.querySelector('[data-specimen]'))
  const fidelity = (root.closest('[data-fidelity]') || root.querySelector('[data-fidelity]'))?.getAttribute('data-fidelity') || 'standard'
  const gridish = '.ss-cursor, .ss-keys, .ss-kb, svg, .ss-chart, .ss-code, .ss-keyboard, [role="grid"], .ss-sheet, .ss-calendar, [data-grid]'
  return { root, S, cam, zoomView, focusRect, scale, specimen, fidelity, gridish }
}

// A Camera part way through a move: everything in it scales and slides, so
// no frame of the move is judged (the motion checks watch it). A settled
// zoom is judged against the camera's own crop.
function cameraMoving(cam) {
  return !!cam && document.getAnimations().some((x) => x.playState === 'running' && (x.effect?.target === cam || x.effect?.target === cam.parentElement))
}

// ---- Clips and padding ----------------------------------------------------

// Marks sliced by an overflow container whose cutting edge is inside the
// stage. Leaf elements only (text spans, dots, avatars, icons).
function detectClipped({ root, S }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-roll, .ss-count, .ss-cursor, .ss-keys') || (n.closest('svg') && n.tagName.toLowerCase() !== 'svg')) continue
    if (n.children.length && n.tagName.toLowerCase() !== 'svg') continue
    const r = n.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(n)
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue
    for (let a = n.parentElement; a && root.contains(a); a = a.parentElement) {
      const o = getComputedStyle(a)
      if (Number(o.opacity) === 0 || a.hasAttribute('data-crop')) break
      const c = a.getBoundingClientRect()
      const visW = Math.min(r.right, c.right) - Math.max(r.left, c.left)
      const visH = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top)
      if (visW <= 0 || visH <= 0) break
      const cuts = []
      if (o.overflowX !== 'visible') {
        if (r.left < c.left - 0.5 && c.left > S.left + 2) cuts.push(`left by ${Math.round(c.left - r.left)}px`)
        if (r.right > c.right + 0.5 && c.right < S.right - 2) cuts.push(`right by ${Math.round(r.right - c.right)}px`)
      }
      if (o.overflowY !== 'visible') {
        if (r.top < c.top - 0.5 && c.top > S.top + 2) cuts.push(`top by ${Math.round(c.top - r.top)}px`)
        if (r.bottom > c.bottom + 0.5 && c.bottom < S.bottom - 2) cuts.push(`bottom by ${Math.round(r.bottom - c.bottom)}px`)
      }
      if (cuts.length) {
        out.push(`${labelOf(n)} clipped ${cuts.join(', ')} by ${labelOf(a).split(' "')[0]}`)
        break
      }
      if (a === root) break
    }
  }
  return out
}

// Content in a surface's padding: a leaf that runs into (or past) the
// padding of the card, tile or panel holding it, overflow visible or
// not. A fixed-width bar in a narrow card is the usual cause. Elements
// pulled out on purpose with a negative margin (full-bleed rows) pass.
function detectPaddingRunIns({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-roll, .ss-count, .ss-cursor, .ss-keys, svg') && n.tagName.toLowerCase() !== 'svg') continue
    if (n.children.length && n.tagName.toLowerCase() !== 'svg') continue
    const r = n.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    const ncs = getComputedStyle(n)
    if (ncs.visibility === 'hidden' || Number(ncs.opacity) === 0 || ncs.position === 'absolute' || ncs.position === 'fixed') continue
    // Faded with its container (a card not shown yet, a row still opening)
    if (fadeThrough(n, root) < 0.5) continue
    // Spinning or animating leaves: their box swells as they turn (the motion checks judge them)
    if (ncs.animationName !== 'none' || (ncs.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(ncs.transform))) continue
    let floated = false
    for (let a = n.parentElement; a && root.contains(a) && a !== root; a = a.parentElement) {
      const o = getComputedStyle(a)
      // Past an out-of-flow layer (a popover hanging from a card) the
      // containers above don't own its padding: it is laid over them
      if (floated) break
      floated = o.position === 'absolute' || o.position === 'fixed'
      // Pulled out on purpose, or zoomed (its rects are in another scale)
      if (parseFloat(o.marginLeft) < 0 || parseFloat(o.marginRight) < 0 || parseFloat(o.marginTop) < 0 || (o.zoom && o.zoom !== '1' && o.zoom !== 'normal')) break
      const c = a.getBoundingClientRect()
      // Already hidden by something that clips it (rows scrolled away)
      if (o.overflowX !== 'visible' || o.overflowY !== 'visible') {
        if (r.bottom <= c.top + 1 || r.top >= c.bottom - 1 || r.right <= c.left + 1 || r.left >= c.right - 1) break
      }
      // Padding at the scale the surface is drawn (a phone screen is scaled down)
      const k = a.offsetWidth ? c.width / a.offsetWidth : 1
      const pad = ['Top', 'Right', 'Bottom', 'Left'].map((p) => parseFloat(o['padding' + p]) * k)
      if (!surface(o) || Math.max(...pad) < 4 * k) continue
      // An icon tile or chip centers its glyph by design; its padding is not a gutter
      if (a.offsetWidth < 48 && a.offsetHeight < 48) break
      const sides = []
      if (pad[0] >= 4 * k && r.top < c.top + pad[0] - 2) sides.push('top')
      if (pad[1] >= 4 * k && r.right > c.right - pad[1] + 2) sides.push('right')
      if (pad[2] >= 4 * k && r.bottom > c.bottom - pad[2] + 2) sides.push('bottom')
      if (pad[3] >= 4 * k && r.left < c.left + pad[3] - 2) sides.push('left')
      if (sides.length) out.push(`uneven: ${labelOf(n).split(' "')[0]} runs into the ${sides.join(' and ')} padding of ${labelOf(a).split(' "')[0]}`)
      break
    }
  }
  return out
}

// Covered copy: on a press, the cursor's glyph sits over the label it
// clicks so the words can't be read. Aim inside the target but off its
// text ({ at, x: 0.85, y: 0.6 }). Judged on the drawn glyph, not its box.
function detectCoveredCopy({ root }) {
  const out = []
  const cur = root.querySelector('.ss-cursor[data-pressed]')
  const hit = root.querySelector('[data-pressed]:not(.ss-cursor)')
  if (!cur || !hit) return out
  let g = null
  for (const c of cur.querySelectorAll('svg')) {
    const cs = getComputedStyle(c)
    if (cs.display === 'none' || Number(cs.opacity) === 0) continue
    const b = c.getBoundingClientRect()
    if (b.width < 2) continue
    // The glyph's ink fills roughly the middle of its box
    const ix = b.width * 0.2
    const iy = b.height * 0.15
    g = { l: b.left + ix, r: b.right - ix, t: b.top + iy, b: b.bottom - iy }
    break
  }
  const walker = document.createTreeWalker(hit, NodeFilter.SHOW_TEXT)
  for (let t = g && walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim() || Number(getComputedStyle(t.parentElement).opacity) === 0) continue
    const rg = document.createRange()
    rg.selectNodeContents(t)
    const b = rg.getBoundingClientRect()
    if (b.width < 1) continue
    const w = Math.max(0, Math.min(b.right, g.r) - Math.max(b.left, g.l))
    const h = Math.max(0, Math.min(b.bottom, g.b) - Math.max(b.top, g.t))
    if (w * h > b.width * b.height * 0.12) {
      out.push(`covers: the cursor sits on "${t.textContent.trim().slice(0, 24)}" as it presses; aim off the label`)
      break
    }
  }
  return out
}

// Lopsided pills: a pill or button whose content sits off-center (a
// padding sized for an icon that isn't there). Judged on the content's
// box, so an x with its own hover circle counts as its circle.
function detectLopsidedPills({ root, scale }) {
  const out = []
  const pills = [...root.querySelectorAll('*')].filter((n) => {
    if (n.closest('.ss-cursor, .ss-keys')) return false
    const cs = getComputedStyle(n)
    if (!surface(cs) || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false
    const r = n.getBoundingClientRect()
    // Its own scale (a notification inside a scaled phone screen)
    const k = n.offsetWidth ? r.width / n.offsetWidth : scale
    // A pill, or any rounded control (a chip, a button) whose content
    // should sit centered in it
    const control = n.matches('button, [role=button], [data-target]') || /chip|btn|button|tag|pill|badge/i.test(typeof n.className === 'string' ? n.className : '')
    const round = parseFloat(cs.borderTopLeftRadius) * k >= r.height / 2 - 1 || (control && parseFloat(cs.borderTopLeftRadius) >= 4)
    return r.height >= 14 * k && r.height <= 44 * k && r.width > r.height && round && n.childNodes.length > 0
  })
  // A text field reads from its left on purpose (a search box, a composer,
  // a comment field): only pills that center their content are judged
  const field = (p) => p.matches('input, textarea, [contenteditable], [role=textbox], [role=searchbox]') || !!p.querySelector('input, textarea, [contenteditable], .ss-field__placeholder, .ss-field__caret, .ss-field__chars') || /field|input|search|compos|reply|comment/i.test(p.className && typeof p.className === 'string' ? p.className : '')
  // A menu row or list option reads from its left too, its fill spanning the row
  const row = (p) => p.matches('[role=menuitem], [role=option], [role=menuitemradio], [role=menuitemcheckbox], .ss-menu__item') || !!p.parentElement?.closest('[role=menu], [role=listbox]')
  for (const p of pills) {
    if (field(p) || row(p)) continue
    const r = p.getBoundingClientRect()
    let l = Infinity
    let rt = -Infinity
    // Bare text counts as content too (a badge's label)
    // Faded out anywhere up to the pill (a States option not showing) isn't content
    const hid = (e) => { for (let a = e; a && a !== p; a = a.parentElement) if (Number(getComputedStyle(a).opacity) < 0.05) return true; return false }
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim() || hid(t.parentElement)) continue
      const rg = document.createRange()
      rg.selectNodeContents(t)
      const b = rg.getBoundingClientRect()
      if (b.width < 1) continue
      l = Math.min(l, b.left)
      rt = Math.max(rt, b.right)
    }
    for (const c of p.querySelectorAll('*')) {
      if (c.children.length && c.tagName.toLowerCase() !== 'svg') continue
      if (c.closest('svg') && c.tagName.toLowerCase() !== 'svg') continue
      const b = c.getBoundingClientRect()
      const ccs = getComputedStyle(c)
      // A knob or thumb is placed on purpose (a switch, a slider)
      if (b.width < 1 || Number(ccs.opacity) === 0 || ccs.position === 'absolute' || hid(c)) continue
      l = Math.min(l, b.left)
      rt = Math.max(rt, b.right)
    }
    if (!isFinite(l)) continue
    const off = Math.abs(l - r.left - (r.right - rt)) / scale
    if (off > 3) out.push(`lopsided: ${labelOf(p).split(' "')[0]}${(p.textContent || '').trim() ? ` "${p.textContent.trim().slice(0, 20)}"` : ''} has ${Math.round((l - r.left) / scale)}px on the left and ${Math.round((r.right - rt) / scale)}px on the right${parseFloat(getComputedStyle(p).flexGrow) > 0 ? '; it is stretched by flex-grow to fill its row, so let it hug its content (flex: none) and fix any overflow by fitting the content, not widening the container' : ''}`)
  }
  return out
}

// ---- Near-tangents --------------------------------------------------------

// The raised surfaces the near-tangent checks compare: each with the box
// that is visible of it, nested twins (a phone's band and glass) dropped
function collectSurfaces({ root, scale }) {
  const surfs = [...root.querySelectorAll('*')].filter((n) => {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) return false
    const cs = getComputedStyle(n)
    // Faded out through a parent counts as faded: a parked popup isn't a surface anyone sees
    if (!surface(cs) || cs.visibility === 'hidden' || fadeThrough(n, root.parentElement) < 0.5 || cs.position === 'fixed') return false
    // Tilted (a lifted card): its box is never 'almost aligned' with anything
    if (cs.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(cs.transform)) return false
    const r = n.getBoundingClientRect()
    return r.width >= 40 * scale && r.height >= 24 * scale
  })
    .map((n) => {
      // What is visible: the box cut by every clipping ancestor (a panel running off its card)
      const b = n.getBoundingClientRect()
      let r = { left: b.left, right: b.right, top: b.top, bottom: b.bottom }
      for (let a = n.parentElement; a && root.contains(a); a = a.parentElement) {
        const o = getComputedStyle(a)
        if (o.overflowX === 'visible' && o.overflowY === 'visible') continue
        const c = a.getBoundingClientRect()
        r = { left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) }
      }
      return { n, r }
    })
    .filter((s) => s.r.right - s.r.left > 8 && s.r.bottom - s.r.top > 8)
  // One object, one report: drop a surface nested in another of nearly the same box (a phone's band and glass)
  const same = (a, b) => Math.abs(a.left - b.left) < 8 * scale && Math.abs(a.right - b.right) < 8 * scale && Math.abs(a.top - b.top) < 8 * scale && Math.abs(a.bottom - b.bottom) < 8 * scale
  return surfs.filter((s) => !surfs.some((o) => o !== s && o.n.contains(s.n) && same(o.r, s.r)))
}

// Near-tangents: a surface edge 1-4px from the stage's reads as an
// accident: align them, or part them clearly.
function detectEdgeTangents({ S, scale }, surfs) {
  const out = []
  for (const { n, r } of surfs) {
    const e = [['left', r.left - S.left], ['right', S.right - r.right], ['top', r.top - S.top], ['bottom', S.bottom - r.bottom]].filter(([, d]) => nearTangent(d / scale))
    if (e.length) out.push(`near-tangent: ${labelOf(n).split(' "')[0]} sits ${Math.round(e[0][1] / scale)}px from the stage's ${e[0][0]} edge`)
  }
  return out
}

// A crop nobody made: something runs past the stage but nothing up to the
// stage clips it, so it ends wherever the host page happens to cut it,
// often a few pixels short of a card's edge with its corners showing
function detectUnclipped({ root, S, scale }, surfs) {
  const out = []
  const stageClips = (() => { const o = getComputedStyle(root); return o.overflowX !== 'visible' || o.overflowY !== 'visible' })()
  if (stageClips) return out
  for (const { n, r } of surfs) {
    const past = [['right', r.right - S.right], ['bottom', r.bottom - S.bottom], ['left', S.left - r.left], ['top', S.top - r.top]].filter(([, d]) => d / scale > 4)
    if (past.length) {
      out.push(`unclipped: ${labelOf(n).split(' "')[0]} runs ${Math.round(past[0][1] / scale)}px past the stage's ${past[0][0]} edge and nothing clips it; give the stage overflow: hidden so the crop is yours`)
      break
    }
  }
  return out
}

// Placeholder lines stacked tighter than text lines would be: a bar
// stands in for a line of text, so a pair 1-3px apart reads as one smudge
function detectTightBars({ root, scale }) {
  const out = []
  const bars = [...root.querySelectorAll('.ss-bar')].filter((e) => {
    const r = e.getBoundingClientRect()
    for (let a = e; a && a !== root; a = a.parentElement) if (Number(getComputedStyle(a).opacity) < 0.1) return false
    return r.height / scale <= 9 && r.width / scale > 20
  })
  outer: for (const a of bars)
    for (const c of bars) {
      if (a === c) continue
      const A = a.getBoundingClientRect(), C = c.getBoundingClientRect()
      const k = a.offsetHeight ? A.height / a.offsetHeight : scale
      const gap = (C.top - A.bottom) / k
      const h = Math.min(A.height, C.height) / k
      if (gap >= 0 && gap < h * 0.8 && Math.min(A.right, C.right) - Math.max(A.left, C.left) > 10 && Math.abs(A.left - C.left) < 3) {
        out.push(`tight lines: placeholder bars in ${labelOf(a.parentElement).split(' "')[0]} are ${gap.toFixed(1)}px apart; bars stand in for lines of text, so keep the lines' pitch (about the bar's height plus 6-8px)`)
        break outer
      }
    }
  return out
}

// Two corners on one edge: a rounded clip inside another clip of nearly the
// same box with a different radius cuts a second curve into what runs off
function detectDoubleCorner({ root }) {
  const out = []
  const clips = []
  for (let a = root; a && clips.length < 6; a = a.parentElement) {
    const o = getComputedStyle(a)
    if (o.overflowX !== 'visible' || o.overflowY !== 'visible') clips.push({ a, r: a.getBoundingClientRect(), rad: parseFloat(o.borderTopLeftRadius) || parseFloat(o.borderBottomRightRadius) || 0 })
  }
  for (let i = 0; i + 1 < clips.length; i++) {
    const A = clips[i], B = clips[i + 1]
    const flush = ['left', 'right', 'top', 'bottom'].filter((k) => Math.abs(A.r[k] - B.r[k]) <= 2).length
    if (flush >= 2 && A.rad > 0 && Math.abs(A.rad - B.rad) > 1) {
      out.push(`double corner: ${labelOf(A.a).split(' "')[0]} rounds ${Math.round(A.rad)}px inside a ${Math.round(B.rad)}px clip that shares its edges; give one of them the corner`)
      break
    }
  }
  return out
}

// Near-tangents: two surfaces whose parallel edges sit 1-4px apart
function detectPairTangents({ root, scale }, surfs) {
  const out = []
  const seen = new Set()
  for (let i = 0; i < surfs.length; i++)
    for (let j = i + 1; j < surfs.length; j++) {
      const A = surfs[i], B = surfs[j]
      if (A.n.contains(B.n) || B.n.contains(A.n)) continue
      // Inside a floating layer laid over the other (a popover's field over
      // a table): different layers, so only the layer's own edge can graze it,
      // and that pair is checked on its own
      const over = (x, y) => {
        for (let p = x.parentElement; p && p !== root; p = p.parentElement) {
          if (p.contains(y)) return false
          if (!/absolute|fixed/.test(getComputedStyle(p).position)) continue
          const P = p.getBoundingClientRect(), Y = y.getBoundingClientRect()
          if (P.left < Y.right && P.right > Y.left && P.top < Y.bottom && P.bottom > Y.top) return true
        }
        return false
      }
      if (over(A.n, B.n) || over(B.n, A.n)) continue
      // Items of one list keep their own rhythm
      // (messages of one thread are one list, though each sits in its own row)
      const thread = A.n.closest('.ss-thread')
      const sibs = A.n.parentElement === B.n.parentElement || (!!thread && thread === B.n.closest('.ss-thread'))
      const a = A.r, b = B.r
      const ov = (p, q, P, Q) => Math.min(q, Q) - Math.max(p, P) > 8 * scale
      const pairs = []
      if (ov(a.top, a.bottom, b.top, b.bottom)) pairs.push(['left', a.left - b.left], ['right', a.right - b.right], ['side', b.left - a.right], ['side', a.left - b.right])
      if (ov(a.left, a.right, b.left, b.right)) pairs.push(['top', a.top - b.top], ['bottom', a.bottom - b.bottom], ['gap', b.top - a.bottom], ['gap', a.top - b.bottom])
      const hit = pairs.find(([k, d]) => nearTangent(Math.abs(d) / scale) && !(sibs && (k === 'gap' || k === 'side')))
      if (!hit) continue
      const key = `${labelOf(A.n)}|${labelOf(B.n)}`
      if (seen.has(key)) continue
      seen.add(key)
      const what = hit[0] === 'side' || hit[0] === 'gap' ? 'are only' : `${hit[0]} edges are`
      out.push(`near-tangent: ${labelOf(A.n).split(' "')[0]} and ${labelOf(B.n).split(' "')[0]} ${what} ${Math.round(Math.abs(hit[1]) / scale)}px apart`)
    }
  return out
}

// ---- Icons, lists and rows ------------------------------------------------

// Translucent icons: strokes that overlap or meet paint darker (an
// onion-skin look). Icons must be one opaque color.
function detectTranslucentIcons({ root, S }) {
  const out = []
  for (const svg of root.querySelectorAll('svg')) {
    if (svg.closest('.ss-connector, .ss-spinner, .ss-check, .ss-cursor, .ss-keys, .ss-phone__glyphs')) continue
    const r = svg.getBoundingClientRect()
    // Visible and icon-sized: a drawing (an illustration, a faded-out
    // layer) blends its own strokes on purpose
    const k = S.width / root.offsetWidth || 1
    if (r.width < 6 * k || r.width > 40 * k || r.height > 40 * k || r.width / r.height > 2 || r.height / r.width > 2) continue
    if (fadeThrough(svg, root.parentElement) < 0.5 || getComputedStyle(svg).visibility === 'hidden') continue
    for (const shape of svg.querySelectorAll('path, circle, line, polyline, polygon, rect, ellipse')) {
      const cs = getComputedStyle(shape)
      // An unparsed paint is taken as opaque, so only a known alpha is reported
      const strokeA = cs.stroke !== 'none' ? alphaOf(cs.stroke, 1) * parseFloat(cs.strokeOpacity) : 1
      const fillA = cs.fill !== 'none' ? alphaOf(cs.fill, 1) * parseFloat(cs.fillOpacity) : 1
      if (strokeA < 0.99 || fillA < 0.99) {
        out.push(`translucent icon: ${labelOf(svg.parentElement ?? svg).split(' "')[0]} > svg${svg.getAttribute('class') ? '.' + svg.getAttribute('class').split(' ')[0] : ''} (use an opaque color such as --ss-icon, or opacity on the whole svg)`)
        break
      }
    }
  }
  return out
}

// Skeleton ladder: a column of six or more rows with no words in them
// reads as a wireframe, whatever the hero is doing
function detectSkeletonLadder({ root, S, specimen, fidelity, gridish }) {
  const out = []
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length < 4 || n.closest(gridish) || !painted(n, root)) continue
    const cs = getComputedStyle(n)
    if (!/flex|grid|block/.test(cs.display) || (cs.display.includes('flex') && cs.flexDirection !== 'column')) continue
    // A grid of cells (a sheet, a calendar, a board) is not a column of rows
    if (cs.display.includes('grid') && cs.gridTemplateColumns.split(' ').length >= 3) continue
    // Rows the crop cuts are the list running off, not a ladder
    const kids = [...n.children].filter((k) => { const r = k.getBoundingClientRect(); return r.height >= 16 && r.width >= 60 && painted(k, root) && r.bottom <= S.bottom + 1 && r.top >= S.top - 1 })
    if (kids.length < 4) continue
    // A grid, a sheet or a calendar: rows made of cells, not lines of text
    if (kids.every((k) => k.children.length >= 4)) continue
    // Bars are the product's filler. The list the story touches (it holds a
    // target) is judged; so is a still whose frame is mostly this one list.
    // Every other column of bars is furniture and fine
    // Fidelity sets the bar: minimal is all bars by design; standard shows
    // words where they carry meaning, so only the story's list with no
    // words at all, or a still that is one bar list, is a ladder;
    // realistic is real content everywhere, so any list in frame that is
    // mostly bars is
    if (fidelity !== 'realistic') break
    const wordy = (k) => [...k.querySelectorAll('*'), k].some((e) => !e.closest('.ss-bar') && [...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim().length > 1))
    let run = 0, best = 0, blank = 0, words = 0
    for (const k of kids) { const w = wordy(k); run = w ? 0 : run + 1; best = Math.max(best, run); if (w) words++; else blank++ }
    if (fidelity === 'realistic' && blank >= 3 && blank > words) out.push(`skeleton ladder: ${blank} of ${kids.length} rows inside ${labelOf(n).split(' "')[0]} have no words in them at realistic fidelity, where content is real everywhere; give the rows in frame words (Text filler shows them at this fidelity) or drop to standard`)
  }
  return out
}

// Loose list: rows in a column with more air between them than they are
// tall, a list stretched to fill a pane
function detectLooseList({ root, S, specimen, gridish }) {
  const out = []
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length < 3 || n.closest(gridish) || !painted(n, root)) continue
    const cs = getComputedStyle(n)
    if (!/flex|grid|block/.test(cs.display) || (cs.display.includes('flex') && cs.flexDirection !== 'column')) continue
    if (/^(MAIN|SECTION|ARTICLE|HEADER|FOOTER|FORM)$/.test(n.tagName) || n.classList.contains('ss-thread')) continue
    const rows = [...n.children].map((k) => k.getBoundingClientRect()).filter((r) => r.height >= 14 && r.height <= 64 && r.width >= 100 && r.bottom <= S.bottom + 1 && r.top >= S.top - 1)
    if (rows.length < 3) continue
    // Alike in size, or they are sections, not rows
    const hs = rows.map((r) => r.height), ws = rows.map((r) => r.width)
    if (Math.max(...hs) > Math.min(...hs) * 1.5 || Math.max(...ws) > Math.min(...ws) * 1.3) continue
    rows.sort((a, b) => a.top - b.top)
    const heights = rows.map((r) => r.height).sort((a, b) => a - b), gaps = rows.slice(1).map((r, i) => r.top - rows[i].bottom).sort((a, b) => a - b)
    const h = heights[Math.floor(heights.length / 2)], g = gaps[Math.floor(gaps.length / 2)]
    if (g > Math.max(24, h)) out.push(`loose list: rows inside ${labelOf(n).split(' "')[0]} sit ${Math.round(g)}px apart for ${Math.round(h)}px of row; a list keeps its rows a few pixels apart (the row's padding carries the air) and fills its pane with more rows, not more space`)
  }
  return out
}

// Tight control: a button or chip with no air between it and the field,
// text or card edge above it (a Comment button sitting on the textarea)
function detectTightControl({ root, S, specimen }) {
  const out = []
  // A fill, a styled top border or a shadow
  const surfaced = (cs) => paintsSurface(cs, { minAlpha: 0.02, border: true, styled: true })
  for (const n of specimen ? [] : root.querySelectorAll('button, [role="button"], [class*="btn"], [class*="button"]')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-window__bar, .ss-phone__status') || !painted(n, root) || n.querySelector('button')) continue
    const cs = getComputedStyle(n)
    if (!surfaced(cs)) continue
    const r = n.getBoundingClientRect()
    if (r.width < 24 || r.height < 16 || r.top < S.top || r.bottom > S.bottom) continue
    if (n.getAnimations({ subtree: true }).some((x) => x.playState === 'running')) continue
    // The nearest painted box whose bottom sits just above this control, overlapping it horizontally
    let worst = null
    for (const d of root.querySelectorAll('*')) {
      if (d === n || d.contains(n) || n.contains(d) || d.closest('.ss-cursor, .ss-keys, svg') || !painted(d, root)) continue
      const ds = getComputedStyle(d)
      if (!surfaced(ds) && !(parseFloat(ds.borderBottomWidth) > 0) && !/^(INPUT|TEXTAREA)$/.test(d.tagName)) continue
      const b = d.getBoundingClientRect()
      if (b.width < 24 || b.height < 12 || b.bottom > r.top + 1 || b.bottom < r.top - 8) continue
      if (Math.min(b.right, r.right) - Math.max(b.left, r.left) < 16) continue
      if (d.contains(n) || d.getBoundingClientRect().height > r.height * 6 && d.contains(n)) continue
      const gap = r.top - b.bottom
      if (!worst || gap < worst.gap) worst = { d, gap }
    }
    if (worst && worst.gap < 8) { out.push(`tight control: ${labelOf(n)} sits ${worst.gap.toFixed(1)}px under ${labelOf(worst.d)}; a button keeps 8px or more from the field, line or card edge above it`); break }
  }
  return out
}

// Invented mark: a real company's name beside a one-letter tile in a
// brand color. A real name takes its real mark from the kit, or no name
function detectInventedMark({ root, specimen }) {
  const out = []
  const BRANDS = /\b(chase|wells fargo|bank of america|citi|citibank|barclays|hsbc|monzo|revolut|wise|capital one|goldman|jpmorgan|stripe|paypal|visa|mastercard|amex|american express|slack|figma|notion|linear|github|gitlab|vercel|netlify|shopify|dropbox|google|gmail|apple|microsoft|amazon|aws|spotify|netflix|uber|lyft|airbnb|zoom|discord|twitter|meta|facebook|instagram|tiktok|openai|anthropic)\b/i
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length || n.closest('.ss-brand, svg, .ss-cursor, .ss-keys, .ss-avatar') || !painted(n, root)) continue
    const t = (n.textContent || '').trim()
    if (!/^[A-Z0-9]$/.test(t)) continue
    const r = n.getBoundingClientRect(); if (r.width < 14 || r.width > 44 || r.height < 14 || r.height > 44) continue
    // The tile is the letter's own box or its parent
    const tile = [n, n.parentElement].find((e) => { if (!e) return false; const bg = rgbaOf(getComputedStyle(e).backgroundColor); if (!bg || bg.a < 0.5) return false; return Math.max(bg.r, bg.g, bg.b) - Math.min(bg.r, bg.g, bg.b) > 60 })
    if (!tile) continue
    const row = tile.parentElement
    const words = row ? (row.textContent || '').replace(t, ' ') : ''
    const hit = words.match(BRANDS)
    if (hit) { out.push(`invented mark: a "${t}" tile in a brand color stands beside "${hit[0]}", a real company; a real name takes its real mark from kit/brands, or the scene names a company the kit has or a fictional one with the neutral initial tile`); break }
  }
  return out
}

// Near aligned: two lines of words stacked in one card whose left edges
// miss each other by a few pixels (a body indented by the field's inset
// under a name on the avatar's column): neither one column nor an indent
function detectNearAligned({ root, specimen }) {
  const out = []
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length < 2 || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-code, .ss-term, .ss-chart, table, [role="grid"]') || !painted(n, root)) continue
    const cs = getComputedStyle(n)
    if (!/flex|grid|block/.test(cs.display) || (cs.display.includes('flex') && cs.flexDirection !== 'column')) continue
    if (n.getAnimations({ subtree: true }).some((x) => x.playState === 'running' && !(x.effect?.getTiming?.().iterations === Infinity))) continue
    const firstWords = (k) => { for (const e of [k, ...k.querySelectorAll('*')]) { if (e.closest('svg, .ss-avatar, .ss-bar') || getComputedStyle(e).display === 'none') continue; if ([...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim().length > 1)) { const r = e.getBoundingClientRect(); if (r.width > 8 && getComputedStyle(e).textAlign !== 'center' && getComputedStyle(e).textAlign !== 'right') return { e, r } } } return null }
    // Only a small card (a comment, a note): a head line over a body line on one surface
    if (!visible(n) || n.children.length > 4) continue
    const kids = [...n.children].filter((k) => painted(k, root) && k.getBoundingClientRect().height >= 10)
    for (let i = 1; i < kids.length; i++) {
      const a = firstWords(kids[i - 1]), b = firstWords(kids[i])
      if (!a || !b) continue
      const d = Math.abs(a.r.left - b.r.left)
      // A head line with an avatar, and a body starting under the avatar instead of under the name
      const av = kids[i - 1].querySelector('.ss-avatar, [class*="avatar"]')
      if (av && d > 14 && b.r.left < a.r.left) {
        const ar = av.getBoundingClientRect()
        if (Math.abs(b.r.left - ar.left) <= 4 && ar.right <= a.r.left + 2) { out.push(`avatar alignment: ${labelOf(b.e)} starts under the avatar in ${labelOf(n).split(' "')[0]}, not under ${labelOf(a.e)}; a body under an avatar row starts at the name's edge`); i = kids.length; continue }
      }
      if (d < 3 || d > 14) continue
      // Both start in the container's left half and overlap horizontally
      const nr = n.getBoundingClientRect()
      if (a.r.left > nr.left + nr.width / 2 || b.r.left > nr.left + nr.width / 2) continue
      if (Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left) < 20) continue
      out.push(`near aligned: ${labelOf(a.e)} and ${labelOf(b.e)} start ${d.toFixed(1)}px apart in ${labelOf(n).split(' "')[0]}; lines in a card share one left edge, or one is indented on purpose by a column (an avatar's width and gap), never by a few pixels`)
      i = kids.length
    }
  }
  return out
}

// Uneven inset: a bar, pill or row of controls whose last child sits much
// closer to the right edge than the first sits from the left (an Approve
// button against a window corner, a chevron jammed in a date pill)
function detectUnevenInset({ root, S, specimen }) {
  const out = []
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length < 2 || n.closest('.ss-cursor, .ss-keys, .ss-kb, .ss-phone__status, svg, .ss-chart') || !painted(n, root)) continue
    const br = n.getBoundingClientRect()
    if (br.width < 120 || br.height < 24 || br.height > 80 || br.right > S.right + 1 || br.left < S.left - 1) continue
    const cs = getComputedStyle(n)
    // A fill (over 0.03), a top border or a shadow
    const surfaced = paintsSurface(cs, { minAlpha: 0.03, border: true })
    // A bar is the top strip of a window; a pill is any surfaced row of controls
    const win = n.closest('.ss-window')
    const isBar = win && br.top - win.getBoundingClientRect().top < 64 && br.width >= win.getBoundingClientRect().width * 0.8
    if (!surfaced && !isBar) continue
    const kids = [...n.children].filter((d) => { const r = d.getBoundingClientRect(); return r.width >= 6 && r.height >= 6 && painted(d, root) })
    if (kids.length < 2) continue
    const rows = new Set(kids.map((d) => Math.round(d.getBoundingClientRect().top / 8)))
    if (rows.size > 1) continue
    const leftIn = Math.min(...kids.map((d) => d.getBoundingClientRect().left)) - br.left
    const rightIn = br.right - Math.max(...kids.map((d) => d.getBoundingClientRect().right))
    // Only a row whose children fill it: a left-aligned row with free space on the right is a layout, not a miss
    const fill = (Math.max(...kids.map((d) => d.getBoundingClientRect().right)) - Math.min(...kids.map((d) => d.getBoundingClientRect().left))) / br.width
    if (fill < 0.7) continue
    const lo = Math.min(leftIn, rightIn), hi = Math.max(leftIn, rightIn)
    if (hi >= 16 && lo >= 0 && lo < hi * 0.55 && hi - lo >= 6) { out.push(`uneven inset: ${labelOf(n).split(' "')[0]} holds its children ${Math.round(leftIn)}px from its left edge and ${Math.round(rightIn)}px from its right; a bar, pill or row of controls keeps one inset at both ends`); break }
  }
  return out
}

// Mixed icons: filled and outline glyphs side by side in one nav, list or
// toolbar. One family, one construction
function detectMixedIcons({ root, specimen }) {
  const out = []
  const kind = (svg) => {
    const shapes = [...svg.querySelectorAll('path, rect, circle, ellipse, polygon, line, polyline')]
    if (!shapes.length) return null
    let filled = 0, stroked = 0
    for (const s of shapes) {
      const c = getComputedStyle(s)
      const hasFill = c.fill !== 'none' && !/rgba\(0, 0, 0, 0\)/.test(c.fill)
      const hasStroke = c.stroke !== 'none' && parseFloat(c.strokeWidth) > 0
      if (hasStroke && !hasFill) stroked++
      else if (hasFill && !hasStroke) filled++
    }
    if (filled && !stroked) return 'filled'
    if (stroked && !filled) return 'outline'
    return null
  }
  for (const n of specimen ? [] : root.querySelectorAll('nav, aside, ul, [role="list"], [role="toolbar"], .ss-window__side')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, .ss-chart')) continue
    const icons = [...n.querySelectorAll('svg')].filter((s) => { const r = s.getBoundingClientRect(); return r.width >= 10 && r.width <= 32 && r.height >= 10 && r.height <= 32 && !s.closest('.ss-check, .ss-spinner, .ss-toggle, .ss-brand, .ss-avatar, .ss-phone__glyphs') && painted(s, root) })
    if (icons.length < 3) continue
    const kinds = icons.map(kind).filter(Boolean)
    const f = kinds.filter((k) => k === 'filled').length, o = kinds.filter((k) => k === 'outline').length
    if (f && o && Math.min(f, o) >= 1 && f + o >= 3) { out.push(`mixed icons: ${labelOf(n).split(' "')[0]} has ${f} filled and ${o} outline glyphs side by side; icons share one family and one construction, filled or outline, not both`); break }
  }
  return out
}

// Emoji icon: an emoji standing in for an icon (a row's lead, a tab, a
// tile). Emoji are content: a reaction, a message, a sticker
function detectEmojiIcon({ root, specimen }) {
  const out = []
  const emojiRe = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*$/u
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-bubble, .ss-tapback, .ss-reaction, .ss-thread, [data-emoji], .ss-notification__body, .ss-message')) continue
    const t = (n.textContent || '').trim()
    if (!t || t.length > 3 || !emojiRe.test(t)) continue
    const r = n.getBoundingClientRect()
    if (r.width < 8 || r.height < 8 || !painted(n, root)) continue
    // Standing alone in a small box beside words, or in a tab or tile: an icon's seat
    const box = n.parentElement
    const br = box ? box.getBoundingClientRect() : r
    const seat = box && br.width <= 56 && br.height <= 56 && !/\p{L}/u.test((box.textContent || '').replace(t, ''))
    const row = box && box.parentElement
    const besideWords = row && /\p{L}{3,}/u.test(row.textContent || '')
    if (seat && besideWords) { out.push(`emoji icon: ${labelOf(n)} stands where an icon belongs (a ${Math.round(br.width)}px seat beside words); emoji are content (a reaction, a message), icons are drawn, one family tinted to the look`); break }
  }
  return out
}

// Fat row: a one-line row in a list drawn three or four times taller than
// its own words (a sidebar item 110px tall), air inside the row instead of
// rows in the list
function detectFatRow({ root, S, specimen, gridish }) {
  const out = []
  for (const n of specimen ? [] : root.querySelectorAll('*')) {
    if (n.children.length < 3 || n.closest(gridish) || !painted(n, root)) continue
    const cs = getComputedStyle(n)
    if (!/flex|grid|block/.test(cs.display) || (cs.display.includes('flex') && cs.flexDirection !== 'column')) continue
    if (cs.display.includes('grid') && cs.gridTemplateColumns.split(' ').length >= 2) continue
    let fat = 0, rows = 0, worst = null
    for (const k of n.children) {
      const r = k.getBoundingClientRect()
      if (r.height < 16 || r.width < 100 || r.bottom > S.bottom + 1 || r.top < S.top - 1 || !painted(k, root)) continue
      const leaves = [...k.querySelectorAll('*'), k].filter((e) => [...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim()))
      if (!leaves.length || k.querySelector('.ss-bar, .ss-chart, svg + svg, textarea, input')) continue
      const tops = new Set(leaves.map((e) => Math.round(e.getBoundingClientRect().top / 6)))
      if (tops.size > 1 || k.textContent.trim().length < 4) continue
      rows++
      const fs = Math.max(...leaves.map((e) => parseFloat(getComputedStyle(e).fontSize) || 14))
      const tw = Math.max(...leaves.map((e) => e.getBoundingClientRect().width))
      if (tw < r.width * 0.4 || r.width < 120) continue
      if (r.height > fs * 3.4 && r.height > 48) { fat++; if (!worst || r.height > worst.h) worst = { k, h: r.height, fs } }
    }
    if (rows >= 3 && fat >= 2) out.push(`fat row: ${labelOf(worst.k)} is ${Math.round(worst.h)}px tall for one ${Math.round(worst.fs)}px line (${fat} of ${rows} rows in ${labelOf(n).split(' "')[0]} are); a one-line row is its words plus 8 to 12px of padding each side, and a list fills its pane with more rows, not taller ones`)
  }
  return out
}

// Empty pane: a window pane, sidebar, column or phone screen whose
// painted content stops well above its visible bottom: a void
function detectEmptyPane({ root, S, specimen, fidelity }) {
  const out = []
  for (const n of specimen || root.querySelectorAll('.ss-phone, .ss-window').length > 1 ? [] : root.querySelectorAll('.ss-phone__screen, .ss-phone__content, .ss-window__body, .ss-window aside, .ss-window nav, [data-pane]')) {
    if (!painted(n, root) || n.closest('.ss-cursor')) continue
    const r = n.getBoundingClientRect()
    const bottom = Math.min(r.bottom, S.bottom), top = Math.max(r.top, S.top)
    if (bottom - top < 120 || r.width < 80) continue
    // Clipped away by its own window (a side panel slid shut): not in frame
    let vis = { left: r.left, right: r.right }
    for (let a = n.parentElement; a && a !== root; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (o.overflowX !== 'visible' || o.overflowY !== 'visible') { const c = a.getBoundingClientRect(); vis.left = Math.max(vis.left, c.left); vis.right = Math.min(vis.right, c.right) }
    }
    if (vis.right - vis.left < r.width * 0.5) continue
    let low = top
    for (const d of n.querySelectorAll('*')) {
      if (d.closest('.ss-cursor, .ss-keys, .ss-phone__home, .ss-phone__status, .ss-phone__island, .ss-phone__glyphs, .ss-phone__time-bar')) continue
      const dr = d.getBoundingClientRect()
      if (dr.width < 4 || dr.height < 4 || dr.top >= bottom) continue
      const cs = getComputedStyle(d)
      const text = [...d.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())
      // A fill or an image, shadows aside
      const filled = paintsSurface(cs, { minAlpha: 0.02, image: true, shadow: false })
      const inked = filled || d.tagName === 'svg' || d.tagName === 'IMG' || text
      if (!inked || !painted(d, root)) continue
      // A container's own fill is the pane's surface, not content: only a
      // leaf fill (a bar, a disc, a tile) or something small counts
      const paneBg = getComputedStyle(n).backgroundColor
      if (filled && !text && d.tagName !== 'svg' && d.tagName !== 'IMG' && d.children.length && dr.height > (bottom - top) * 0.25 && (cs.backgroundColor === paneBg || dr.height >= (bottom - top) * 0.9)) continue
      if (dr.height >= (bottom - top) * 0.9 && cs.backgroundColor === paneBg) continue
      low = Math.max(low, Math.min(dr.bottom, bottom))
    }
    const gap = bottom - low
    const tol = fidelity === 'realistic' ? 0.3 : fidelity === 'minimal' ? 0.75 : 0.65
    if (gap > Math.max(100, (bottom - top) * tol)) out.push(`empty pane: ${labelOf(n).split(' "')[0]} has ${Math.round(gap)}px of nothing under its last content (${Math.round((gap / (bottom - top)) * 100)}% of its height); fill it with more of the product (rows, a card, the next section) or crop the pane so its content runs off the edge`)
  }
  return out
}

// Tight inset: typeset words sitting almost on a surface's own edge (an
// hours column 5px from the window's side). Bars and icons may bleed;
// words keep the container's inset
function detectTightInset({ root, S, specimen }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (!n.children.length || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg') || n.hasAttribute('data-crop')) continue
    const isWindow = /^(ss-window|ss-window__body|ss-window__main|ss-window__side|ss-phone__screen|ss-phone__content)$/.test([...n.classList].find((c) => /^ss-(window|phone)/.test(c)) || '')
    const ncs = getComputedStyle(n)
    const card = !isWindow && visible(n) && (ncs.boxShadow !== 'none' || parseFloat(ncs.borderTopWidth) > 0) && parseFloat(ncs.borderTopLeftRadius) >= 6
    if ((!isWindow && !card) || specimen) continue
    const r = n.getBoundingClientRect()
    if (r.width < 160 || r.height < 48 || n.closest('.ss-seg, .ss-segmented, [role="tablist"]') || /seg|tab|pill|chip|toolbar/i.test(typeof n.className === 'string' ? n.className : '')) continue
    if (n.getAnimations({ subtree: true }).some((x) => x.playState === 'running')) continue
    for (const d of n.querySelectorAll('*')) {
      if (d.children.length || !d.textContent.trim() || d.closest('svg, .ss-cursor, .ss-keys, .ss-kb, .ss-bar, .ss-count, [data-crop], .ss-phone__status, .ss-phone__time-bar, .ss-lock, .ss-notification, .ss-island') || !painted(d, root)) continue
      // Only words whose nearest surface is this one
      let a = d.parentElement, owner = null
      while (a && a !== n) { if (visible(a) || a.classList.contains('ss-window') || a.classList.contains('ss-phone__screen')) { owner = a; break } a = a.parentElement }
      if (owner) continue
      const dr = d.getBoundingClientRect()
      if (dr.width < 6 || dr.height < 6) continue
      const left = dr.left - r.left, right = r.right - dr.right
      if (left >= 0 && left < 8 && dr.left > S.left + 2) { out.push(`tight inset: ${labelOf(d)} sits ${left.toFixed(1)}px from the left edge of ${labelOf(n).split(' "')[0]}; words keep the container's inset (12px or more on a row, card or window), only filler bleeds`); break }
      if (right >= 0 && right < 8 && dr.right < S.right - 2) { out.push(`tight inset: ${labelOf(d)} sits ${right.toFixed(1)}px from the right edge of ${labelOf(n).split(' "')[0]}; words keep the container's inset (12px or more on a row, card or window), only filler bleeds`); break }
    }
  }
  return out
}

// Uneven padding: a visible container, fully in the stage, whose content
// sits much closer to its top or bottom edge than to its side. Cards and
// tiles only: not the kit's window panes or phone chrome, and not specimen
// sheets. Inside a phone the screen's cards and tiles are judged like any
// other; only the phone's own chrome is not
function detectUnevenPadding({ root, S, specimen }) {
  const out = []
  if (specimen) return out
  for (const n of root.querySelectorAll('*')) {
    if (!n.children.length || n.hasAttribute('data-crop') || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-phone__status, .ss-phone__island, .ss-phone__home, .ss-phone__glyphs') || /(^| )ss-(window|phone)/.test([...n.classList].join(' '))) continue
    const r = n.getBoundingClientRect()
    if (r.height < 44 || r.width < 44 || r.left < S.left || r.right > S.right || r.top < S.top || r.bottom > S.bottom) continue
    // The plate or scene wrapper that is most of the stage is framing (a gutter), judged elsewhere
    if (r.width * r.height >= S.width * S.height * 0.85) continue
    const cs = getComputedStyle(n)
    if (Number(cs.opacity) < 0.95) continue
    // A clip-path draws a smaller card than the box (an expanding card held
    // in its slot): the box's edges aren't the card's, so padding can't be read
    if (cs.clipPath && cs.clipPath !== 'none') continue
    // Mid-transition (an entrance slide, a fade) isn't a layout: judge it at rest
    const idle = (x) => x.effect?.target?.closest?.('.ss-spinner, .ss-check__arc, .ss-caret, .ss-field__caret, .ss-term__caret, [class*="caret"]') || (x.effect?.getTiming?.().iterations === Infinity)
    if (n.getAnimations({ subtree: true }).some((x) => x.playState === 'running' && !idle(x))) continue
    // The kit's popover paints its surface on ::before, so it reads as bare to visible()
    if (!visible(n) && !n.matches('.ss-popover')) continue
    let u = null
    let svgOnly = true, leaves = 0
    for (const d of n.querySelectorAll('*')) {
      const figure = d.matches('.ss-count, .ss-roll')
      if (d.closest('.ss-count, .ss-roll') && !figure) continue
      if (d.children.length && d.tagName.toLowerCase() !== 'svg' && !figure) continue
      if (d.closest('svg') && d.tagName.toLowerCase() !== 'svg') continue
      const dr = d.getBoundingClientRect()
      const ds = getComputedStyle(d)
      if (dr.width < 2 || dr.height < 2 || ds.visibility === 'hidden' || Number(ds.opacity) === 0) continue
      // Faded out through a parent (a States option not showing) isn't content anyone sees
      let faded = false
      for (let a = d.parentElement; a && a !== n; a = a.parentElement) if (Number(getComputedStyle(a).opacity) < 0.05) { faded = true; break }
      if (faded) continue
      // Wholly outside the box it is an overlay or a hidden piece, not content; an illustration
      // straddling the edge (a mascot on a card's rim) is clamped to the box
      if (dr.bottom <= r.top || dr.top >= r.bottom || dr.right <= r.left || dr.left >= r.right) continue
      leaves++; if (d.tagName.toLowerCase() !== 'svg') svgOnly = false
      // A bare text box (a label with its own padding) is judged by its words, not its box
      let ink = dr
      if (!visible(d) && d.firstChild && [...d.childNodes].every((t) => t.nodeType === 3) && d.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(d); const tr = rg.getBoundingClientRect(); if (tr.width > 0) ink = { left: Math.max(tr.left, dr.left), right: Math.min(tr.right, dr.right), top: Math.max(tr.top, dr.top), bottom: Math.min(tr.bottom, dr.bottom) } }
      const box = d.tagName.toLowerCase() === 'svg' || d.closest('.ss-chart, canvas, img, picture') ? { left: Math.max(dr.left, r.left), right: Math.min(dr.right, r.right), top: Math.max(dr.top, r.top), bottom: Math.min(dr.bottom, r.bottom) } : ink
      u = u ? { l: Math.min(u.l, box.left), r: Math.max(u.r, box.right), t: Math.min(u.t, box.top), b: Math.max(u.b, box.bottom) } : { l: box.left, r: box.right, t: box.top, b: box.bottom }
    }
    if (!u) continue
    // An icon tile or a chip (a small box) is sized by eye, not padded
    if (r.width < 80 && r.height < 80) continue
    // An edge the container's own clip hides (a card running off its tile) is not judged
    let vis = { top: r.top, bottom: r.bottom }
    for (let a = n.parentElement; a && a !== root; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (o.overflowY === 'visible' && !a.hasAttribute('data-crop')) continue
      const c = a.getBoundingClientRect(); vis.top = Math.max(vis.top, c.top); vis.bottom = Math.min(vis.bottom, c.bottom)
    }
    const topHidden = vis.top > r.top + 1, bottomHidden = vis.bottom < r.bottom - 1
    const L = u.l - r.left, T = u.t - r.top, B = r.bottom - u.b
    if (L < 8) continue
    const tight = []
    // A gap a quarter short of the side and at least 3px off reads as a
    // miss, not a choice (14px under a button with 24px at the side)
    // Past the edge counts too: a pill hanging off a card's bottom is the worst case of no padding
    // A quarter of the side inset short, or past the edge by more than 4px
    const short = (v) => (v >= 0 ? v < L * 0.7 && L - v >= 4 : v < -4)
    // Equal top and bottom of 8px or more on a wide, short card is a proportion, not a miss
    // So is a bar or strip (a header, a toolbar): wide and short, its vertical padding is set by its height
    const proportion = (Math.abs(T - B) < 2 && Math.min(T, B) >= 6) || (r.height < 72 && r.width > r.height * 4 && Math.abs(T - B) <= 3)
    if (!proportion && !bottomHidden && short(B)) tight.push(`bottom ${Math.round(B)}px`)
    if (!proportion && !topHidden && short(T)) tight.push(`top ${Math.round(T)}px`)
    if (tight.length) out.push(`uneven padding: ${labelOf(n).split(' "')[0]} has ${tight.join(', ')} against ${Math.round(L)}px at the side; a card pads its content the same on every side (the outer radius is the inner radius plus the padding)`)
  }
  return out
}

// Uneven gutters: a card or device sitting wholly inside a surfaced tile,
// panel or plate with different gaps to the sides it doesn't bleed past
// (68px left, 211px right, 33px below). Either it bleeds off an edge or
// it keeps one gutter; the top is left out, since copy often sits above
function detectUnevenGutters({ root, specimen }) {
  const out = []
  for (const c of specimen ? [] : root.querySelectorAll('*')) {
    if (c.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-popover, .ss-toast') || !visible(c) || !painted(c, root)) continue
    // Cards inside an app's own panes are its layout; only a card, window or phone set on a tile or plate is framed
    if (c.parentElement?.closest('.ss-window, .ss-phone')) continue
    const cr = c.getBoundingClientRect()
    if (cr.width < 120 || cr.height < 60) continue
    // A satellite or overlay laid over another surface (a card straddling a window) is composed, not set on a tile
    const under = document.elementsFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2)
    if (under.some((e) => e !== c && !e.contains(c) && !c.contains(e) && visible(e) && e.getBoundingClientRect().width >= 40)) continue
    // The surface it sits on may be outside the stage: a bento tile holding a stage per picture
    let p = c.parentElement
    while (p && p !== document.body && !visible(p)) p = p.parentElement
    if (!p || p === document.body) continue
    const pr = p.getBoundingClientRect()
    // The window or phone filling its plate is framing, judged elsewhere; a row in a list is a layout
    if (cr.width > pr.width * 0.92 || cr.width < pr.width * 0.3) continue
    // Cut by any clip on the way up (an invisible stage, a cropped tile): a bleed, a deliberate crop
    let cut = false
    for (let a = c.parentElement; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).overflow === 'visible') { if (a === p) break; continue }
      const ar = a.getBoundingClientRect()
      if (cr.left < ar.left - 1 || cr.right > ar.right + 1 || cr.bottom > ar.bottom + 1) { cut = true; break }
      if (a === p) break
    }
    if (cut) continue
    const vis = { left: pr.left, right: pr.right, bottom: pr.bottom }
    const gaps = { left: cr.left - vis.left, right: vis.right - cr.right, bottom: vis.bottom - cr.bottom }
    // Any edge at or past the visible edge is a bleed: a deliberate crop
    if (Object.values(gaps).some((g) => g <= 1)) continue
    const lo = Math.min(gaps.left, gaps.right, gaps.bottom), hi = Math.max(gaps.left, gaps.right, gaps.bottom)
    if (hi - lo >= 14 && hi > lo * 1.6) out.push(`uneven gutters: ${labelOf(c).split(' "')[0]} sits ${Math.round(gaps.left)}px from the left of ${labelOf(p).split(' "')[0]}, ${Math.round(gaps.right)}px from the right and ${Math.round(gaps.bottom)}px from the bottom; bleed it off an edge, or keep one gutter on every side it doesn't bleed`)
  }
  return out
}

// Pill inset: a pill or chip inside a small rounded field, button or bar
// sits the same distance from the side as from the top and bottom
function detectPillInset({ root, specimen }) {
  const out = []
  for (const c of specimen ? [] : root.querySelectorAll('*')) {
    if (c.closest('.ss-cursor, .ss-keys, .ss-kb, svg, table, [role="grid"]') || !visible(c) || !painted(c, root)) continue
    const cr = c.getBoundingClientRect()
    const cs = getComputedStyle(c)
    if (cr.height < 14 || cr.height > 40 || parseFloat(cs.borderTopLeftRadius) < cr.height * 0.4) continue
    if (c.getAnimations({ subtree: true }).some((x) => x.playState === 'running' && !(x.effect?.getTiming?.().iterations === Infinity))) continue
    let p = c.parentElement
    while (p && p !== root && !visible(p)) p = p.parentElement
    if (!p || p === root) continue
    const pr = p.getBoundingClientRect()
    if (pr.height > 52 || pr.height < cr.height + 4 || parseFloat(getComputedStyle(p).borderTopLeftRadius) < 4) continue
    const v = ((cr.top - pr.top) + (pr.bottom - cr.bottom)) / 2
    const l = cr.left - pr.left, r = pr.right - cr.right
    const side = l <= r ? l : r
    // Only a pill at one end of a field, button or bar: a tag in the middle of a row is a layout
    if (side < 0 || v < 0 || side > Math.max(24, v * 3)) continue
    if (Math.abs(side - v) >= 3.5 && Math.max(side, v) > Math.min(side, v) * 1.5) out.push(`uneven inset: ${labelOf(c).split(' "')[0]} sits ${Math.round(side)}px from the ${l <= r ? 'left' : 'right'} of ${labelOf(p).split(' "')[0]} but ${Math.round(v)}px from its top and bottom; a pill inside a field or button keeps one inset all round`)
  }
  return out
}

// Tight stack: two different lines of text stacked with no leading between
// them (a name over a preview, a title over a description). Ink to ink
// under 5px reads as one broken block, whatever the line boxes say.
function detectTightStack({ root }) {
  const out = []
  // A line of text, not a row: nothing beside the words (no bar, avatar
  // or icon), and no taller than a line or two
  const textLeaf = (d) => d.querySelectorAll('*').length <= 4 && d.textContent.trim().length > 1 && !d.querySelector('svg, img, .ss-bar, .ss-avatar, .ss-facepile, [data-target]') && !d.closest('svg, .ss-cursor, .ss-keys, .ss-kb, .ss-count, .ss-roll, .ss-code, .ss-term') && d.getBoundingClientRect().height <= parseFloat(getComputedStyle(d).fontSize) * 3.2
  const seen = new Set()
  // A line wrapped in a States or a slot still has a first line someone
  // sees: judge that, so a preview that swaps its words is still a line
  const showing = (d) => { for (let a = d; a && a !== root; a = a.parentElement) { const c = getComputedStyle(a); if (Number(c.opacity) < 0.05 || c.visibility === 'hidden' || c.display === 'none') return false } return true }
  const leafOf = (d) => {
    if (getComputedStyle(d).display === 'inline') return null
    if (textLeaf(d)) return d
    if (d.querySelector('svg, img') || d.closest('svg, .ss-cursor, .ss-keys, .ss-kb, .ss-count, .ss-roll, .ss-code')) return null
    const r = d.getBoundingClientRect()
    if (r.height > 40) return null
    return [...d.querySelectorAll('*')].find((e) => textLeaf(e) && showing(e) && e.getBoundingClientRect().width >= 8) || null
  }
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-code') || !painted(n, root)) continue
    const kids = [...n.children].map(leafOf).filter(Boolean)
    if (kids.length < 2 || kids.length > 3) continue
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], b = kids[i]
      if (seen.has(b)) continue
      const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect()
      if (ar.width < 8 || br.width < 8 || br.top < ar.bottom - 1 || Math.min(ar.right, br.right) - Math.max(ar.left, br.left) < 8) continue
      // Judge the first words of each line, not a wrapper row (a name beside its time)
      const lead_el = (d) => [d, ...d.querySelectorAll('*')].find((e) => [...e.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())) || d
      const ca = getComputedStyle(lead_el(a)), cb = getComputedStyle(lead_el(b))
      if (ca.fontSize === cb.fontSize && ca.color === cb.color && ca.fontWeight === cb.fontWeight) continue
      const lead = (c) => Math.max(0, (parseFloat(c.lineHeight) || parseFloat(c.fontSize) * 1.2) - parseFloat(c.fontSize)) / 2
      const ink = (br.top - ar.bottom) + lead(ca) + lead(cb)
      if (ink < 3) {
        seen.add(b)
        out.push(`tight stack: ${labelOf(a)} sits ${ink.toFixed(1)}px of ink above ${labelOf(b)}; a name over its preview, a title over its description, wants 4 to 6px of ink between the lines (a 1.3 line height and a 2px gap), with the row's padding carrying the air`)
      } else if (ink > 10 && parseFloat(ca.fontSize) < 15 && n.getBoundingClientRect().height < 80) {
        seen.add(b)
        out.push(`loose stack: ${labelOf(a)} sits ${ink.toFixed(1)}px of ink above ${labelOf(b)}; a name and its preview are one item, 4 to 6px of ink apart, and the row's padding carries the air, not the gap between the lines`)
      }
    }
  }
  return out
}

// Kit override: the example's own stylesheet reaching into a kit part
// (.ss-row__dot, .ss-tapback, .ss-bubble) to move or resize it. The
// part's geometry is the kit's; what the example may style is its own
// classes and the hooks the part documents (tokens, props)
function detectKitOverride() {
  const out = []
  const hits = []
  for (const sheet of document.styleSheets) {
    const owner = sheet.ownerNode
    const id = owner?.getAttribute?.('data-vite-dev-id') || owner?.getAttribute?.('href') || ''
    if (!id || /\/kit\/|\/playground\//.test(id)) continue
    let rules
    try { rules = sheet.cssRules } catch { continue }
    // Nested rules (`.em { & .ss-row__dot {} }`) carry both a selector and
    // children. Only the selector's subject (its last compound) counts: an
    // example styling its own class under `.ss-stage[data-layout]` is fine.
    // An inner part (.ss-row__dot) may not be moved or sized at all; a
    // whole part (.ss-toast) may be placed, but not padded, sized or respaced
    const inner = /\.ss-[a-z0-9-]+__[a-z0-9_-]+/
    // The parts whose geometry the skill guarantees; the window's chrome, a
    // States slot or a Swap layer are the author's to shape
    const guarded = /\.ss-(row|tapback|bubble|facepile|avatar|stamp|receipt|toast|check|kb|keyboard|phone__(status|home|island|screen))/
    const subject = (sel) => sel.split(',')[0].trim().replace(/^&\s*/, '').split(/\s+(?![^(]*\))|>|\+|~/).filter(Boolean).pop() || ''
    const walk = (list) => { for (const r of list) {
      if (r.selectorText && r.style) {
        const subj = subject(r.selectorText).replace(/::?[a-z-]+(\([^)]*\))?/g, '')
        const css = r.style.cssText
        const sized = /(^|[^-])(padding|width|height|gap|font-size|line-height|min-width|min-height)\s*:/.test(css)
        const moved = /(^|[^-])(top|left|right|bottom|transform|position|inset)\s*:/.test(css)
        if (/\.ss-(bar|text)\b/.test(subj)) continue
        // The example's own class on the same element: a variant the author owns
        if (!inner.test(subj) && /\.(?!ss-)[a-z][a-z0-9-]*\.ss-|\.ss-[a-z0-9-]+\.(?!ss-)[a-z]/.test(subj)) continue
        if (!guarded.test(subj)) continue
        if ((inner.test(subj) && (sized || moved)) || (/\.ss-/.test(subj) && sized)) hits.push(r.selectorText.trim().replace(/^&\s*/, '').slice(0, 60))
      }
      if (r.cssRules) walk(r.cssRules)
    } }
    walk(rules)
  }
  for (const sel of [...new Set(hits)].slice(0, 6)) out.push(`kit override: ${sel} is restyled by the example's own CSS (position, size or spacing); a kit part's geometry is the kit's. Style your own class, pass the part's props, or set its tokens`)
  return out
}

// Clipped glyph: an icon whose drawing runs past its own viewBox (or whose
// box clips it), so a stroke is cut off
function detectClippedGlyph({ root }) {
  const out = []
  for (const svg of root.querySelectorAll('svg[viewBox]')) {
    if (svg.closest('.ss-cursor, .ss-keys, .ss-kb, .ss-chart, .ss-connector, .ss-check, .ss-spinner, .ss-icon, .ss-window__bar, .ss-phone, .ss-toggle')) continue
    const r = svg.getBoundingClientRect()
    if (r.width < 8 || r.width > 160 || r.height > 160) continue
    let box
    try { box = svg.getBBox() } catch { continue }
    const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
    if (vb.length !== 4 || !box.width) continue
    const over = Math.max(vb[0] - box.x, vb[1] - box.y, (box.x + box.width) - (vb[0] + vb[2]), (box.y + box.height) - (vb[1] + vb[3]))
    const stroke = parseFloat(getComputedStyle(svg.querySelector('path, circle, rect, line, polyline, polygon') || svg).strokeWidth) || 0
    if (over > stroke / 2 + 0.25) out.push(`clipped glyph: ${labelOf(svg.parentElement ?? svg).split(' "')[0]} > svg draws ${over.toFixed(1)} units past its viewBox, so a stroke is cut off; fit the drawing inside the box`)
  }
  return out
}

// Unit wrapped: a big number whose short unit (ft, ms, %) fell to its own
// line, because the number was sized for the tile without it
function detectUnitWrapped({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('svg, .ss-cursor, .ss-keys, .ss-kb, .ss-count, .ss-roll') || !painted(n, root)) continue
    if (parseFloat(getComputedStyle(n).fontSize) < 28) continue
    const own = [...n.childNodes].find((t) => t.nodeType === 3 && t.textContent.trim().length >= 2)
    if (!own) continue
    for (const u of n.children) {
      const txt = u.textContent.trim()
      if (!txt || txt.length > 4 || u.querySelector('*')) continue
      const range = document.createRange(); range.selectNodeContents(own)
      const num = range.getBoundingClientRect(), ur = u.getBoundingClientRect()
      if (ur.width < 2 || ur.height < 2) continue
      if (ur.top >= num.bottom - 2) out.push(`unit wrapped: "${txt}" fell under ${labelOf(n)}; a stat is one line, so size the number to its tile with the unit on (or put the unit in the lead line) and keep the pair nowrap`)
    }
  }
  return out
}

// Onion skin: two siblings with a translucent fill overlapping, so the
// overlap paints darker (avatars in a pile, chips, cards)
function detectOnionSkin({ root }) {
  const out = []
  const alphaFill = (d) => alphaOf(getComputedStyle(d).backgroundColor, 0)
  const reported = new Set()
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('svg, .ss-cursor, .ss-keys, .ss-kb, .ss-facepile') || !painted(n, root)) continue
    // Judged at rest: a bar fading out over the one fading in is a crossfade, not a fill
    const settled = (d) => fadeThrough(d, root) >= 0.95 && !d.getAnimations({ subtree: true }).some((x) => x.playState === 'running')
    const kids = [...n.children].filter((d) => { const a = alphaFill(d); return a > 0.02 && a < 0.98 && !d.closest('.ss-facepile') && settled(d) })
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect()
      if (a.width < 6 || b.width < 6) continue
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      if (ox > 2 && oy > 2 && !reported.has(kids[j])) {
        reported.add(kids[j])
        out.push(`onion skin: ${labelOf(kids[i])} and ${labelOf(kids[j])} overlap with a see-through fill, so the overlap paints darker; a pile of faces is the kit's Facepile, and anything else that overlaps takes an opaque fill (--ss-fill)`)
      }
    }
  }
  return out
}

// Tight mark: a small dot (an unread marker, a status) jammed against the
// box beside it, or sitting outside the row that owns it
function detectTightMark({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.children.length || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-check, .ss-spinner, .ss-avatar')) continue
    const r = n.getBoundingClientRect()
    if (r.width < 4 || r.width > 10 || r.height < 4 || r.height > 10 || Math.abs(r.width - r.height) > 1) continue
    const cs = getComputedStyle(n)
    if (parseFloat(cs.borderRadius) < r.width / 2 - 0.5 || alphaOf(cs.backgroundColor, 0) < 0.5 || !painted(n, root)) continue
    if (n.closest('.ss-chart, .ss-menu, .ss-badge, .ss-toast, .ss-notification, .ss-phone__glyphs, .ss-segmented, .ss-toggle, .ss-window__bar, .ss-window__lights, .ss-seg')) continue
    const row = n.parentElement
    if (!row) continue
    for (const c of row.children) {
      if (c === n || c.closest('.ss-cursor')) continue
      const cr = c.getBoundingClientRect()
      if (cr.width < 8 || cr.height < 8 || !painted(c, root)) continue
      const vert = Math.min(r.bottom, cr.bottom) - Math.max(r.top, cr.top)
      if (vert <= 0) continue
      const gap = Math.max(cr.left - r.right, r.left - cr.right)
      if (gap >= 0 && gap < 5) { out.push(`tight mark: ${labelOf(n)} is ${gap.toFixed(1)}px from ${labelOf(c)}; a status dot keeps 6px or more from the avatar or text beside it`); break }
    }
    const rr = row.getBoundingClientRect()
    if (visible(row) && (r.left < rr.left + 1 || r.right > rr.right - 1)) out.push(`tight mark: ${labelOf(n)} sits outside ${labelOf(row)}'s fill; a status dot stays inside the row's own inset`)
  }
  return out
}

// Row rhythm: a stack of lines (a name over a subtitle) repeated down a
// list, some real text and some placeholder bars. Every copy leaves the
// same air between its marks, or the real row and the skeletons beside it
// read as two different designs.
function detectRowRhythm({ root, scale }) {
  const out = []
  const stacks = new Map()
  for (const n of root.querySelectorAll('*')) {
    const kids = [...n.children].filter((c) => { const b = c.getBoundingClientRect(); return b.height >= 1 && Number(getComputedStyle(c).opacity) > 0 })
    if (kids.length < 2 || !n.className || typeof n.className !== 'string') continue
    // Its own scale (inside a Camera's zoom, a scaled phone)
    const k = n.offsetWidth ? n.getBoundingClientRect().width / n.offsetWidth : scale
    // Lines, not boxes: a column of cards, a card's head over its plot, is
    // a stack of surfaces; only a text line or a bar (or a row holding
    // bars, judged by the bars) counts as a line
    const line = (c) => {
      if (c.classList.contains('ss-bar')) return c.getBoundingClientRect()
      if (c.children.length === 0 && (c.textContent || '').trim()) return c.getBoundingClientRect()
      if (surface(getComputedStyle(c)) || (c.textContent || '').trim()) return null
      const bars = [...c.querySelectorAll('.ss-bar')].map((x) => x.getBoundingClientRect())
      if (!bars.length) return null
      return { left: Math.min(...bars.map((x) => x.left)), top: Math.min(...bars.map((x) => x.top)), bottom: Math.max(...bars.map((x) => x.bottom)), height: Math.max(...bars.map((x) => x.bottom)) - Math.min(...bars.map((x) => x.top)) }
    }
    const a = line(kids[0])
    const b = line(kids[1])
    if (!a || !b || a.height > 24 * k || b.height > 24 * k) continue
    // Stacked and left-aligned, the way a block of lines sits
    if (Math.abs(a.left - b.left) > 1 || b.top < a.bottom - 1) continue
    const key = n.className.split(' ')[0]
    // Judged on the ink, not the boxes: a bar is all ink, a line of text
    // about its cap height around the line's middle. Equal pitch is wrong:
    // thin bars at a text line's pitch leave a much wider gap
    const ink = (c, r) => {
      if ((c.textContent || '').trim()) { const h = parseFloat(getComputedStyle(c).fontSize) * 0.36 * k; const m = r.top + r.height / 2; return { t: m - h, b: m + h } }
      return { t: r.top, b: r.bottom }
    }
    const gap = (ink(kids[1], b).t - ink(kids[0], a).b) / k
    stacks.set(key, [...(stacks.get(key) ?? []), { gap, real: (n.textContent || '').trim().length > 0 }])
  }
  for (const [key, list] of stacks) {
    if (list.length < 3 || !list.some((x) => x.real) || list.every((x) => x.real)) continue
    const real = list.filter((x) => x.real).map((x) => x.gap)
    const fake = list.filter((x) => !x.real).map((x) => x.gap)
    const r = real.reduce((s, v) => s + v, 0) / real.length
    const f = fake.reduce((s, v) => s + v, 0) / fake.length
    if (Math.abs(r - f) > 1.5) out.push(`tight lines: .${key} leaves ${Math.round(r)}px between the lines' ink in a real row and ${Math.round(f)}px between the bars in a placeholder row; match the air between the marks, not the line pitch`)
  }
  return out
}

// Half-pixel glyphs: an icon centered in a box whose spare room is odd sits
// on a half pixel. While the box scales it draws there; when the motion
// ends it is snapped to a whole pixel and hops sideways (an 11px X in a
// 20px circle). Only boxes that scale or transition, where the hop shows.
function detectHalfPixelGlyph({ root }) {
  const out = []
  for (const g of root.querySelectorAll('svg')) {
    if (g.closest('.ss-cursor, .ss-keys') || g.parentElement?.closest('svg')) continue
    const box = g.parentElement
    if (!box || !shown(g, root)) continue
    const moves = (c) => (c.transitionDuration.split(',').some((d) => parseFloat(d) > 0) && /all|transform|scale/.test(c.transitionProperty)) || c.animationName !== 'none'
    let host = null
    for (let a = box, i = 0; a && i < 3 && a !== root; a = a.parentElement, i++) if (moves(getComputedStyle(a))) { host = a; break }
    if (!host) continue
    const bc = getComputedStyle(box)
    if (!/flex|grid/.test(bc.display)) continue
    const gw = g.width?.baseVal?.value || g.getBoundingClientRect().width
    const gh = g.height?.baseVal?.value || g.getBoundingClientRect().height
    const iw = box.clientWidth - parseFloat(bc.paddingLeft) - parseFloat(bc.paddingRight)
    const ih = box.clientHeight - parseFloat(bc.paddingTop) - parseFloat(bc.paddingBottom)
    const odd = (room) => Number.isInteger(room) && Math.abs(room) % 2 === 1
    if (!Number.isInteger(gw) || !Number.isInteger(iw)) continue
    if (odd(iw - gw) || odd(ih - gh)) {
      const even = gw % 2 ? `${gw - 1} or ${gw + 1}px` : `${gw}px in an even box`
      out.push(`half-pixel glyph: a ${gw}px ${tagOf(g)} centered in the ${iw}x${ih} ${tagOf(box)} sits on a half pixel, so it draws there while ${tagOf(host)} moves and hops sideways when it settles; size it ${even} (even inside even)`)
    }
  }
  return out
}

// Squeezed boxes: a fixed-size flex item (an icon button, a chip) that its
// row shrinks narrower than it was set. Measured by letting it not shrink.
function detectSqueezed({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) continue
    const p = n.parentElement
    if (!p || !/flex/.test(getComputedStyle(p).display)) continue
    const cs = getComputedStyle(n)
    // A Bar line gives way in a narrow row by design (Bar shrink)
    if (cs.flexShrink === '0' || cs.position === 'absolute' || !hasSurface(cs) || !shown(n, root) || n.matches('.ss-bar[data-shrink]')) continue
    if ((n.textContent || '').trim().length > 3) continue
    const now = n.getBoundingClientRect()
    if (now.width < 8 || now.width > 120) continue
    const was = n.style.flexShrink
    n.style.flexShrink = '0'
    const full = n.getBoundingClientRect().width
    n.style.flexShrink = was
    if (full - now.width >= 1.5) out.push(`squeezed: ${tagOf(n)} is set ${Math.round(full)}px wide but its flex row shrinks it to ${Math.round(now.width)}px${Math.abs(full - now.height) < 1.5 ? ', narrower than it is tall' : ''}; give it flex: none`)
  }
  return out
}

// ---- Framing --------------------------------------------------------------

// What the framing checks share: the crop the viewer actually sees (the
// stage, cut again by anything around it that hides overflow), what is in
// flight, and the hero (the largest window or phone)
function frameContext(ctx) {
  const { root, S, specimen } = ctx
  const V = { left: S.left, top: S.top, right: S.right, bottom: S.bottom }
  for (let a = root.parentElement; a && a !== document.documentElement; a = a.parentElement) {
    const o = getComputedStyle(a)
    if (o.overflowX === 'visible' && o.overflowY === 'visible') continue
    const c = a.getBoundingClientRect()
    if (o.overflowX !== 'visible') { V.left = Math.max(V.left, c.left); V.right = Math.min(V.right, c.right) }
    if (o.overflowY !== 'visible') { V.top = Math.max(V.top, c.top); V.bottom = Math.min(V.bottom, c.bottom) }
  }
  // Running transitions and animations: a box on its way in (a satellite
  // rising into place) is judged where it settles, not in flight
  const busy = new Set(document.getAnimations().filter((x) => x.playState === 'running').map((x) => x.effect && x.effect.target).filter(Boolean))
  // A receded window (faded back while another comes forward) is still the
  // hero: the window over it is a satellite
  const heroes = [...root.querySelectorAll('.ss-window, .ss-phone')].filter((w) => !w.parentElement.closest('.ss-window, .ss-phone') && (shown(w, root) || w.hasAttribute('data-receded')))
  const hero = specimen ? null : heroes.sort((x, y) => shownArea(y.getBoundingClientRect(), V) - shownArea(x.getBoundingClientRect(), V))[0]
  return { ...ctx, V, busy, hero, gutter: null }
}

// A box cut by its own clipping ancestors inside the stage (a scrolling
// list, a terminal hiding its lower lines): what is left is what the
// stage's crop can cut. Null when nothing of it shows.
function ownClip(n, r0, root) {
  const r = { left: r0.left, right: r0.right, top: r0.top, bottom: r0.bottom, width: r0.width, height: r0.height }
  for (let a = n.parentElement; a && a !== root; a = a.parentElement) {
    const o = getComputedStyle(a)
    if (o.overflowX === 'visible' && o.overflowY === 'visible') continue
    const c = a.getBoundingClientRect()
    if (o.overflowX !== 'visible') { r.left = Math.max(r.left, c.left); r.right = Math.min(r.right, c.right) }
    if (o.overflowY !== 'visible') { r.top = Math.max(r.top, c.top); r.bottom = Math.min(r.bottom, c.bottom) }
  }
  return r.right - r.left < 2 || r.bottom - r.top < 2 ? null : r
}
function animating(n, busy, root) { for (let a = n; a && a !== root; a = a.parentElement) if (busy.has(a)) return true; return false }
function shownArea(r, V) { return Math.max(0, Math.min(r.right, V.right) - Math.max(r.left, V.left)) * Math.max(0, Math.min(r.bottom, V.bottom) - Math.max(r.top, V.top)) }
// A satellite: an absolute surface with its own shadow, or a phone (its
// positioned wrapper carries no shadow of its own)
function satellite(n, root) {
  if (!shown(n, root)) return false
  if (n.classList?.contains('ss-phone')) return true
  const c = getComputedStyle(n)
  return c.position === 'absolute' && !!c.boxShadow && c.boxShadow !== 'none'
}

// Framing, judged in the visible crop. The hero: whole, with even margins;
// or bled off the right and bottom only (a corner bleed) with the same
// gutter above as to its left; or a centered phone bled off the bottom
// only, even at the sides. Returns the findings and the gutter the rest of
// the framing checks measure from (null when the hero sets none).
// 'SAT_SIDE' in the findings marks a satellite straddling the hero's side.
function detectHeroFraming({ root, V, busy, hero, zoomView }) {
  const out = []
  let gutter = null
  // Twin satellites: two of about one width straddling the same hero edge read as a stack of cards
  const twinSatellites = (edge) => {
    if (!hero) return
    const sats = [...root.querySelectorAll('*')].filter((n) => !hero.contains(n) && !n.contains(hero) && !n.closest('.ss-cursor, .ss-keys, .ss-kb, svg') && satellite(n, root) && !n.classList.contains('ss-phone'))
    const crossing = sats.filter((n) => { const b = n.getBoundingClientRect(); return b.width >= 120 && b.left < edge - 4 && b.right > edge + 4 })
    for (let i = 0; i < crossing.length; i++) for (let j = i + 1; j < crossing.length; j++) {
      if (crossing[i].contains(crossing[j]) || crossing[j].contains(crossing[i])) continue
      const a = crossing[i].getBoundingClientRect(), b = crossing[j].getBoundingClientRect()
      if (Math.abs(a.width - b.width) < Math.max(a.width, b.width) * 0.25 && Math.abs(a.left - b.left) < 40) { out.push(`framing: twin satellites: ${labelOf(crossing[i])} and ${labelOf(crossing[j])} are two cards of one width on the same hero edge, a stack; a second satellite is a different kind and size (a small system banner, a chip, an annotation with a connector), or one of them goes`); return }
    }
  }
  if (!zoomView && hero && !animating(hero, busy, root) && shownArea(hero.getBoundingClientRect(), V) > 0.2 * (V.right - V.left) * (V.bottom - V.top)) {
    const r = hero.getBoundingClientRect()
    const m = { left: r.left - V.left, top: r.top - V.top, right: V.right - r.right, bottom: V.bottom - r.bottom }
    const bled = Object.keys(m).filter((k) => m[k] < -1)
    const name = tagOf(hero)
    let wrong = bled.filter((k) => k === 'left' || k === 'top')
    // A phone may run off the top when the crop falls in its content: its
    // status bar is gone with it (framing.md, Phones)
    if (hero.classList?.contains('ss-phone') && wrong.includes('top')) {
      const status = hero.querySelector('.ss-phone__status, .ss-phone__time, .ss-island, .ss-phone__island')
      if (!status || status.getBoundingClientRect().bottom <= V.top + 1) wrong = wrong.filter((k) => k !== 'top')
    }
    if (wrong.length) out.push(`framing: ${name} is cut on the ${wrong.join(' and ')} (${wrong.map((k) => `${px(-m[k])}px`).join(', ')}); the top-left holds the chrome that says what this is, so a window bleeds off the right and bottom only`)
    // Near misses and slivers: an edge just short of the crop, or just past
    // it, reads as a mistake. Pull it in to a full gutter, or run it well past.
    const g0 = Math.max(m.top, 16)
    for (const k of ['right', 'bottom']) {
      if (m[k] >= 0.5 && m[k] < g0 * 0.75) out.push(`framing: ${name} ends ${px(m[k])}px short of the ${k} edge; give it a full gutter (${px(g0)}px) or run it well past the edge so it is clearly masked`)
      if (m[k] < -1 && m[k] > -24) out.push(`framing: ${name} runs only ${px(-m[k])}px past the ${k} edge, which reads as a mistake, not a bleed; pull it inside or run it well past`)
    }
    // Proportions: a desktop window reads as its device, landscape. Whole,
    // it is clearly wider than tall; bled, what shows is at least square.
    // A chromeless Window (a document, an invoice) is a page, and a page is portrait
    if (hero.classList.contains('ss-window') && [...hero.querySelectorAll('.ss-window__lights')].some((l) => l.getBoundingClientRect().width > 0 && shown(l, root))) {
      const vw = Math.min(r.right, V.right) - Math.max(r.left, V.left)
      const vh = Math.min(r.bottom, V.bottom) - Math.max(r.top, V.top)
      const whole = !bled.length
      if ((whole && vw / vh < 1.25) || (!whole && vw / vh < 1)) out.push(`framing: ${name} shows ${px(vw)}x${px(vh)}, ${whole ? 'nearly square' : 'narrower than tall'} for a desktop window; change the crop (bleed it) or the layout rather than squash the app`)
    }
    if (!bled.length) {
      gutter = Math.min(m.left, m.top)
      // A hero's window carries the frame: it bleeds off an edge or fills
      // the stage. Whole, centered, with air on four sides, it floats
      const stageW = V.right - V.left, stageH = V.bottom - V.top
      if (!root.querySelector('[data-specimen], [data-unframed]') && !root.closest('[data-specimen], [data-unframed]') && stageW >= 560 && Math.min(m.left, m.right, m.top, m.bottom) >= 12 && (r.right - r.left) * (r.bottom - r.top) < stageW * stageH * 0.82) out.push(`framing: ${name} floats whole in the stage with ${px(m.left)}/${px(m.right)}/${px(m.top)}/${px(m.bottom)}px of air around it; a hero's window bleeds off one or two edges with one gutter, or fills the stage, so the product carries the frame (see examples/hero-demo, examples/chat-diff)`)
      if (Math.abs(m.left - m.right) > 2 || Math.abs(m.top - m.bottom) > 2) out.push(`framing: ${name} is whole but off center (left ${px(m.left)}, right ${px(m.right)}, top ${px(m.top)}, bottom ${px(m.bottom)}px in the visible crop); a whole window gets even margins`)
    } else if (!wrong.length && bled.includes('right')) {
      gutter = m.top
      // A satellite living in the left column (straddling the window's
      // left edge, at any point in the loop) is why that column is wider:
      // noted here, and the equal-gutter line is dropped for the whole film
      const straddles = [...root.querySelectorAll('*')].some((n) => {
        if (hero.contains(n) || n.contains(hero) || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) return false
        if (!satellite(n, root)) return false
        const b = n.getBoundingClientRect()
        return b.left < r.left - 4 && b.right > r.left + 4 && b.bottom > r.top && b.top < V.bottom
      })
      if (straddles) out.push('SAT_SIDE')
      twinSatellites(r.left)
      // A hero inside one cell of a grid (a bento tile among tiles) takes the tile's own padding, not the stage's gutter
      const cell = hero.closest('[data-crop]')
      const inTile = !!cell && cell !== root && !!cell.parentElement && [...cell.parentElement.children].filter((c) => c.hasAttribute('data-crop')).length >= 2
      if (!inTile && Math.abs(m.top - m.left) > 2) out.push(`framing: corner bleed with a ${px(m.top)}px gutter above ${name} but ${px(m.left)}px to its left, as seen in the final crop; one gutter, the same on both (check any wrapper that trims the stage)`)
    } else if (!wrong.length) {
      gutter = m.top
      // The same waiver for a satellite on either side of a window bled off
      // the bottom (a phone beside a dashboard)
      const straddles = [...root.querySelectorAll('*')].some((n) => {
        if (hero.contains(n) || n.contains(hero) || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) return false
        if (!satellite(n, root)) return false
        const b = n.getBoundingClientRect()
        // Only on the side with the wider column: that is what it explains
        const edge = m.left > m.right ? r.left : r.right
        return b.left < edge - 4 && b.right > edge + 4 && b.bottom > r.top && b.top < V.bottom
      })
      if (straddles) out.push('SAT_SIDE')
      twinSatellites(m.left > m.right ? r.left : r.right)
      if (Math.abs(m.left - m.right) > 2) out.push(`framing: ${name} runs off the bottom but sits off center (left ${px(m.left)}, right ${px(m.right)}px); bled off the bottom alone it is centered with equal side gutters. Run it off the right as well (a corner bleed, the default), center it, or fill the wider column with a satellite straddling that edge (a device pair)`)
    }
  }
  return { out, gutter }
}

// Satellites: other raised surfaces near an edge sit one gutter from it
function detectSatelliteGutters({ root, V, busy, hero, gutter }) {
  const out = []
  if (!(gutter !== null && gutter > 4)) return out
  for (const n of root.querySelectorAll('*')) {
    if (n === hero || hero?.contains(n) || n.contains(hero) || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-popover')) continue
    const cs = getComputedStyle(n)
    if (cs.position !== 'absolute' || !cs.boxShadow || cs.boxShadow === 'none' || !shown(n, root) || animating(n, busy, root)) continue
    const r = n.getBoundingClientRect()
    if (r.width * r.height < 0.03 * (V.right - V.left) * (V.bottom - V.top)) continue
    const d = { left: r.left - V.left, top: r.top - V.top, right: V.right - r.right, bottom: V.bottom - r.bottom }
    const [edge, dist] = Object.entries(d).filter(([, v]) => v >= 0).sort((x, y) => x[1] - y[1])[0] ?? []
    if (edge && dist < gutter * 1.6 && Math.abs(dist - gutter) > 2) out.push(`framing: satellite ${tagOf(n)} sits ${px(dist)}px from the ${edge} edge where the gutter is ${px(gutter)}px; satellites keep the one gutter`)
  }
  return out
}

// Other boxes (cards, panels, a dashed frame) obey the same edges: a
// full gutter in, or well past. Contents of the hero bleed with it.
// Pushed in, everything round the focus is cropped by design.
function detectBoxEdges({ root, V, busy, hero, gutter, zoomView }) {
  const out = []
  if (zoomView) return out
  const near = gutter && gutter > 4 ? gutter * 0.75 : 12
  for (const n of root.querySelectorAll('*')) {
    if (n === hero || hero?.contains(n) || n.contains(hero) || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, .ss-popover, [data-crop]')) continue
    const cs = getComputedStyle(n)
    if (!(hasSurface(cs) || cs.borderTopStyle === 'dashed') || !shown(n, root) || animating(n, busy, root)) continue
    const r = n.getBoundingClientRect()
    if (r.width * r.height < 0.03 * (V.right - V.left) * (V.bottom - V.top)) continue
    if (n.parentElement && n.parentElement !== root && n.parentElement.closest('[class]') && hasSurface(getComputedStyle(n.parentElement))) continue
    const d = { left: r.left - V.left, top: r.top - V.top, right: V.right - r.right, bottom: V.bottom - r.bottom }
    for (const [k, v] of Object.entries(d)) {
      if (v >= 0.5 && v < near) out.push(`framing: ${tagOf(n)} ends ${px(v)}px short of the ${k} edge; give it a full gutter or run it well past so it is masked`)
      else if (v < -1 && v > -24) out.push(`framing: ${tagOf(n)} runs only ${px(-v)}px past the ${k} edge, a sliver that reads as a mistake; pull it inside or run it well past`)
    }
  }
  return out
}

// A column bled off the right that shows only a sliver (a details pane
// whose divider lands near the edge): too thin to read as UI, it reads
// as a mistake. Show enough of it to read, or none.
function detectSliverColumn({ root, V, busy, zoomView }) {
  const out = []
  if (zoomView) return out
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, [data-crop], .ss-count') || !shown(n, root) || animating(n, busy, root)) continue
    const cs = getComputedStyle(n)
    if (!(hasSurface(cs) || parseFloat(cs.borderLeftWidth) > 0)) continue
    const r = n.getBoundingClientRect()
    const vis = V.right - r.left
    if (r.height < 0.3 * (V.bottom - V.top) || r.right < V.right + 1 || vis < 1 || r.width < vis + 8) continue
    const k = n.offsetWidth ? r.width / n.offsetWidth : 1
    if (vis / k < 56) { out.push(`framing: only ${px(vis / k)}px of ${tagOf(n)} shows at the right edge, a sliver too thin to read as UI; move its edge in so a readable part of it shows (a third or more), or past the crop so none does`); break }
  }
  return out
}

// What the story opens or brings in (a popover, menu, toast, tooltip,
// sheet, notification) sits wholly inside the stage, a gutter from every
// edge, on every frame it shows. Place the trigger so it has room, or
// open it the other way; never let the crop take it.
function detectOverlayRoom({ root, S, V, hero, gutter, zoomView }) {
  const out = []
  const OVERLAY = '.ss-popover, .ss-menu, .ss-toast, .ss-notification, [role=menu], [role=tooltip], [role=dialog], [role=status], [data-overlay]'
  // Pushed in, the edges feather: clear of the feather as well
  const room = Math.max(gutter && gutter > 4 ? gutter : 16, zoomView ? (Number(zoomView.dataset.feather) || 0) * (S.width / root.offsetWidth || 1) + 4 : 0)
  for (const n of root.querySelectorAll(OVERLAY)) {
    if (n.parentElement?.closest(OVERLAY) || !shown(n, root)) continue
    const r = n.getBoundingClientRect()
    if (r.width < 8 || r.height < 8) continue
    const d = { top: r.top - V.top, left: r.left - V.left, right: V.right - r.right, bottom: V.bottom - r.bottom }
    const [edge, v] = Object.entries(d).sort((x, y) => x[1] - y[1])[0]
    // Inside a window that bleeds through that edge, the popover needs air, not the hero's gutter
    const hr = hero ? hero.getBoundingClientRect() : null
    const heroBleeds = hr && (edge === 'top' ? hr.top < V.top - 2 : edge === 'left' ? hr.left < V.left - 2 : edge === 'right' ? hr.right > V.right + 2 : hr.bottom > V.bottom + 2)
    const need = heroBleeds && hero.contains(n) ? 16 : room
    if (v < need - 2) out.push(`framing: ${tagOf(n)} opens ${v < 0 ? 'past' : 'within a gutter of'} the stage's ${edge} edge; what the story opens sits wholly inside, a gutter (${px(need)}px) clear, so place its trigger where it has room or open it the other way`)
    // Keycaps showing over what is open (a short stage, a menu reaching the bottom)
    for (const k of root.querySelectorAll('.ss-keys')) {
      if (Number(getComputedStyle(k).opacity) < 0.5) continue
      for (const c of k.children) {
        const b = c.getBoundingClientRect()
        if (b.width < 4 || !(b.left < r.right + 6 && b.right > r.left - 6 && b.top < r.bottom + 6 && b.bottom > r.top - 6)) continue
        // Riding the popover's bottom edge (center on or below it) is a placement; inside it is a collision
        if ((b.top + b.bottom) / 2 >= r.bottom - 2) continue
        out.push(`framing: keycaps overlap ${tagOf(n)}; move them clear (Stage keys="top", "bottom-left" or "bottom-right") or give the stage the room`)
        break
      }
    }
  }
  return out
}

// Text never touches a neighboring box. A label beside its field, a
// value beside its icon: a fixed gap holds them apart, never leftover
// space (space-between with no gap, a full row, the label 1px off).
// A parent with its own gap is the fixed gap, so only overlaps count there.
function detectTouchingText({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) continue
    const texts = [...n.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim())
    if (!texts.length || !shown(n, root)) continue
    const range = document.createRange()
    range.setStart(texts[0], 0)
    range.setEnd(texts[texts.length - 1], texts[texts.length - 1].length)
    const t = range.getBoundingClientRect()
    if (t.width < 2) continue
    const p = n.parentElement
    const pairs = [...(p ? [...p.children].filter((c) => c !== n).map((c) => [c, p]) : []), ...[...n.children].map((c) => [c, n])]
    for (const [c, holder] of pairs) {
      const cc = getComputedStyle(c)
      if (cc.display === 'inline' || cc.position === 'absolute' || c.closest('.ss-cursor') || !shown(c, root)) continue
      // Turning or scaled (a spinner): its drawn box swells past its slot,
      // so the slot is judged by the gap, not the ink
      if (cc.transform !== 'none' || c.getAnimations().some((x) => x.playState === 'running')) continue
      // A Roll's own pieces (the rolling part and the text around it) are one run of text
      if (n.closest('.ss-roll, .ss-count') && c.closest('.ss-roll, .ss-count')) continue
      // An empty cell (a gutter column with nothing in it on this line) paints nothing to touch
      if (!hasSurface(cc) && c.tagName.toLowerCase() !== 'svg' && !(c.textContent || '').trim() && !c.querySelector('svg, img, .ss-bar')) continue
      // A repeated set (a facepile, a row of chips) is spaced by design
      if (tagOf(c) === tagOf(n) && typeof n.className === 'string' && n.className) continue
      // A bare cell (a grid column, a span of words) is judged by its words,
      // a surface (a field, a chip) by its box
      let b = c.getBoundingClientRect()
      if (!hasSurface(cc) && c.tagName !== 'svg' && (c.textContent || '').trim()) {
        const rr = document.createRange()
        rr.selectNodeContents(c)
        b = rr.getBoundingClientRect()
      }
      if (b.width < 4 || b.height < 4 || c.contains(n)) continue
      // On one line: overlapping and centered alike (a big clock's glyph box
      // reaches up past the date above it without sharing its line)
      const sameLine = Math.min(t.bottom, b.bottom) - Math.max(t.top, b.top) > 0.5 * Math.min(t.height, b.height) && Math.abs((t.top + t.bottom) / 2 - (b.top + b.bottom) / 2) < 0.5 * Math.min(t.height, b.height)
      if (!sameLine) continue
      const d = b.left >= t.right - 1 ? b.left - t.right : t.left >= b.right - 1 ? t.left - b.right : -1
      const fixed = parseFloat(getComputedStyle(holder).columnGap) >= 4
      if (d < 5 && !(fixed && d >= 2)) out.push(`touching: ${tagOf(n)} "${n.textContent.trim().slice(0, 18)}" is ${d < 0 ? 'overlapping' : `${px(d)}px from`} ${tagOf(c)}; text never touches a neighboring box, so hold the pair apart with a fixed gap (gap: 8-12px), not leftover space`)
    }
  }
  return out
}

// Placeholders follow the text rule: a bar (a line or a disc) never runs
// into or under a neighbor on its line (a name bar under an absolute
// avatar disc in a card's corner). Neighbors are any box near it in its
// card, absolutely positioned ones included.
function detectTouchingBars({ root }) {
  const out = []
  const noted = new Set()
  for (const bar of root.querySelectorAll('.ss-bar')) {
    if (bar.closest('.ss-cursor, .ss-keys') || !shown(bar, root)) continue
    const B = bar.getBoundingClientRect()
    if (B.width < 4 || B.height < 2) continue
    let box = bar.parentElement
    for (let i = 0; box && box !== root && i < 4 && !hasSurface(getComputedStyle(box)); i++) box = box.parentElement
    if (!box || box === root) box = bar.parentElement?.parentElement ?? root
    for (const c of box.querySelectorAll('*')) {
      if (c === bar || c.contains(bar) || bar.contains(c) || c.closest('.ss-cursor, .ss-keys') || (c.parentElement?.closest('svg'))) continue
      const leaf = c.classList.contains('ss-bar') || c.tagName.toLowerCase() === 'svg' || !c.children.length || (hasSurface(getComputedStyle(c)) && c.querySelectorAll('*').length <= 4)
      if (!leaf || !shown(c, root)) continue
      let b = c.getBoundingClientRect()
      if ((c.textContent || '').trim() && !c.classList.contains('ss-bar') && !hasSurface(getComputedStyle(c))) {
        const rr = document.createRange()
        rr.selectNodeContents(c)
        b = rr.getBoundingClientRect()
      }
      if (b.width < 4 || b.height < 4) continue
      // A box this bar sits inside (a tinted row) or one round it is its ground, not a neighbor
      if (b.left <= B.left + 1 && b.right >= B.right - 1 && b.top <= B.top + 1 && b.bottom >= B.bottom - 1) continue
      if (B.left <= b.left + 1 && B.right >= b.right - 1 && B.top <= b.top + 1 && B.bottom >= b.bottom - 1 && !c.classList.contains('ss-bar')) continue
      const shared = Math.min(B.bottom, b.bottom) - Math.max(B.top, b.top) > 0.5 * Math.min(B.height, b.height)
      if (!shared) continue
      const d = b.left >= B.right - 0.5 ? b.left - B.right : B.left >= b.right - 0.5 ? B.left - b.right : -1
      if (d >= 6) continue
      const key = `${tagOf(box)}|${tagOf(c)}`
      if (noted.has(key)) continue
      noted.add(key)
      out.push(`touching: placeholder ${tagOf(bar)} in ${tagOf(box)} is ${d < 0 ? 'running into' : `${px(d)}px from`} ${tagOf(c)}${getComputedStyle(c).position === 'absolute' ? ' (absolutely positioned)' : ''}; a bar is text, so size it to the room left beside its neighbor or put both in a flex row with a gap`)
    }
  }
  return out
}

// One theme per scene: a large near-black box (a build log, a code block)
// inside a light window reads as a hole. A terminal window is its own frame.
function detectDarkSlab({ root }) {
  const out = []
  // Relative luminance of an opaque enough fill, null for none
  const lum = (color) => {
    const c = rgbaOf(color)
    if (!c || c.a < 0.6) return null
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  for (const w of root.querySelectorAll('.ss-window')) {
    if (w.matches('[data-chrome="terminal"]') || !shown(w, root)) continue
    const g = lum(getComputedStyle(w).backgroundColor)
    if (g === null || g < 0.6) continue
    const W = w.getBoundingClientRect()
    for (const n of w.querySelectorAll('*')) {
      const l = lum(getComputedStyle(n).backgroundColor)
      if (l === null || l > 0.06 || !shown(n, root)) continue
      const r = n.getBoundingClientRect()
      if (r.width * r.height < 0.06 * W.width * W.height || r.height < 40) continue
      // A slab holds UI text (a log's lines); a dark block of a slide
      // or an image is the document's content, not the app's chrome
      if (!(n.textContent || '').trim()) continue
      out.push(`dark slab: ${tagOf(n)} is a near-black box inside the light ${tagOf(w)}; one theme per scene, so a log or code block in a light UI is a light surface (the well or a tinted panel, mono text in the normal inks); a dark panel belongs in a dark scene or a terminal window of its own`)
      break
    }
  }
  return out
}

// A satellite whose edge lands just by the window's traffic lights reads
// as a near miss: cover them clearly or clear them by a gutter
function detectLightsTangent({ root }) {
  const out = []
  for (const l of root.querySelectorAll('.ss-window__lights')) {
    if (!shown(l, root)) continue
    const L = l.getBoundingClientRect()
    for (const n of root.querySelectorAll('*')) {
      if (n.contains(l) || l.contains(n) || n.closest('.ss-window')?.contains(l) || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg')) continue
      const cs = getComputedStyle(n)
      if (cs.position !== 'absolute' || !cs.boxShadow || cs.boxShadow === 'none' || !shown(n, root)) continue
      const r = n.getBoundingClientRect()
      if (r.width * r.height < 2000) continue
      const overlapsY = r.bottom > L.top - 6 && r.top < L.bottom + 6
      const overlapsX = r.right > L.left - 6 && r.left < L.right + 6
      const gaps = [overlapsY && Math.abs(r.left - L.right), overlapsY && Math.abs(r.right - L.left), overlapsX && Math.abs(r.top - L.bottom), overlapsX && Math.abs(r.bottom - L.top)].filter((g) => g !== false)
      const g = Math.min(...gaps)
      if (gaps.length && g < 6) out.push(`near-tangent: ${tagOf(n)}'s edge lands ${px(g)}px from the window's traffic lights; cover the chrome clearly or clear it by a gutter`)
    }
  }
  return out
}

// Shadows live on the shape with the outline. A wrapper that casts its
// own shadow round a rounder child (a phone) shows its tighter corners
// past the child's curves as a pale halo, and doubles the shadow.
function detectShadowHalo({ root }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    const cs = getComputedStyle(n)
    if (!cs.boxShadow || cs.boxShadow === 'none' || n.closest('.ss-cursor, .ss-keys, .ss-kb, svg') || !shown(n, root)) continue
    const r = n.getBoundingClientRect()
    if (r.width < 24 || r.height < 24) continue
    const rad = parseFloat(cs.borderTopLeftRadius) || 0
    for (const c of n.children) {
      const b = c.getBoundingClientRect()
      if (Math.abs(b.left - r.left) > 3 || Math.abs(b.top - r.top) > 3 || Math.abs(b.width - r.width) > 6 || Math.abs(b.height - r.height) > 6) continue
      const cc = getComputedStyle(c)
      const crad = Math.max(parseFloat(cc.borderTopLeftRadius) || 0, ...[...c.querySelectorAll(':scope > svg rect, :scope > svg path')].slice(0, 1).map((x) => parseFloat(x.getAttribute('rx')) || 0))
      if (crad > rad + 2) {
        out.push(`framing: ${tagOf(n)} casts a shadow with ${px(rad)}px corners round ${tagOf(c)}, whose outline is rounded ${px(crad)}px, so its corners show past the curve as a halo${cc.boxShadow && cc.boxShadow !== 'none' ? ' and the shadow is doubled' : ''}; put the shadow on the shape itself (drop the wrapper's) or match the radius`)
        break
      }
    }
  }
  return out
}

// A settled zoom: what the camera pushed in on sits wholly in its crop,
// clear of the feathered edge (a focus the zoom can't fit, or a pad
// smaller than the feather, leaves the subject fading out at the edge)
function detectFocusFeather({ root, S, V, zoomView, focusRect }) {
  const out = []
  if (!focusRect) return out
  const f = (Number(zoomView.dataset.feather) || 0) * (S.width / root.offsetWidth || 1)
  const d = { left: focusRect.left - V.left, top: focusRect.top - V.top, right: V.right - focusRect.right, bottom: V.bottom - focusRect.bottom }
  const [edge, v] = Object.entries(d).sort((x, y) => x[1] - y[1])[0]
  if (v < f - 1) out.push(`framing: the camera's focus sits ${px(v)}px from the ${edge} edge of its crop, inside the ${px(f)}px feather; zoomed in, what it pushed in on is whole and clear of the soft edge, so raise pad, lower max or focus on a smaller rect`)
  return out
}

// The story's own marks never cut: anything it aims at. Judged at rest: a
// control part way through its own opening is moving. A target is judged
// when the story is at it (the cursor on or beside it); one prepared for a
// later beat may still sit below the crop
function detectTargetsCut({ root, V, busy, focusRect }) {
  const out = []
  const inFocus = (r) => !focusRect || (r.right > focusRect.left && r.left < focusRect.right && r.bottom > focusRect.top && r.top < focusRect.bottom)
  const curEl = root.querySelector('.ss-cursor')
  const curR = curEl && shown(curEl, root) ? curEl.getBoundingClientRect() : null
  const nearCursor = (r) => !curR || (curR.right > r.left - 24 && curR.left < r.right + 24 && curR.bottom > r.top - 24 && curR.top < r.bottom + 24)
  for (const n of window.__ssStill ? [] : root.querySelectorAll('[data-target]')) {
    if (n.closest('.ss-cursor') || !shown(n, root) || animating(n, busy, root)) continue
    const r0 = n.getBoundingClientRect()
    if (!nearCursor(r0)) continue
    if (r0.width < 4 || r0.height < 4 || r0.width > 260 * (focusRect?.k ?? 1) || r0.height > 120 * (focusRect?.k ?? 1) || !inFocus(r0)) continue
    // Hidden by its own scroller is the scroller's business, not the crop's
    const r = ownClip(n, r0, root)
    if (!r || r.bottom - r.top < r0.height - 1 || r.right - r.left < r0.width - 1) continue
    const out1 = r.left < V.left - 1 || r.top < V.top - 1 || r.right > V.right + 1 || r.bottom > V.bottom + 1
    const in1 = r.right > V.left + 2 && r.left < V.right - 2 && r.bottom > V.top + 2 && r.top < V.bottom - 2
    if (out1 && in1) out.push(`framing: target ${tagOf(n)}${n.dataset.target ? ` "${n.dataset.target}"` : ''} is cut by the crop; what the story touches stays whole in frame`)
  }
  return out
}

// Real words never cut by the crop: only filler bleeds
function detectWordsCut({ root, V, busy, zoomView }) {
  const out = []
  for (const n of root.querySelectorAll('*')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg, [data-crop], .ss-count')) continue
    const texts = [...n.childNodes].filter((c) => c.nodeType === 3 && c.textContent.trim().length > 1)
    if (!texts.length || !shown(n, root) || animating(n, busy, root) || zoomView) continue
    // The words themselves, not the block they sit in
    const range = document.createRange()
    range.setStart(texts[0], 0)
    range.setEnd(texts[texts.length - 1], texts[texts.length - 1].length)
    const r0 = range.getBoundingClientRect()
    if (r0.width < 4) continue
    // What its own clipping boxes leave (lines a terminal hides below its
    // edge are inside the window, not cut by the stage)
    const r = { left: r0.left, right: r0.right, top: r0.top, bottom: r0.bottom }
    for (let a = n; a && a !== root; a = a.parentElement) {
      const o = getComputedStyle(a)
      if (o.overflowX === 'visible' && o.overflowY === 'visible') continue
      const c = a.getBoundingClientRect()
      if (o.overflowX !== 'visible') { r.left = Math.max(r.left, c.left); r.right = Math.min(r.right, c.right) }
      if (o.overflowY !== 'visible') { r.top = Math.max(r.top, c.top); r.bottom = Math.min(r.bottom, c.bottom) }
    }
    if (r.right - r.left < 4 || r.bottom - r.top < 2) continue
    const cutR = r.left < V.right - 2 && r.right > V.right + 1
    let cutB = r.top < V.bottom - 2 && r.bottom > V.bottom + 1
    const cutL = r.right > V.left + 2 && r.left < V.left - 1
    // A single line of a list, a diff or a terminal running off the bottom
    // edge its window bleeds through is the product continuing, not a slice
    if (cutB) {
      const fs = parseFloat(getComputedStyle(n).fontSize) || 14
      const win = n.closest('.ss-window, .ss-phone')
      const wb = win ? win.getBoundingClientRect().bottom : 0
      if (win && wb > V.bottom + 2 && r0.bottom - r0.top <= fs * 1.7) cutB = false
    }
    if (cutR || cutB || cutL) out.push(`framing: real words ${tagOf(n)} "${n.textContent.trim().slice(0, 20)}" are cut by the crop; only filler bleeds, so pull them inside or make them a placeholder`)
  }
  return out
}

// Controls cut by the crop: a button or chip half off the stage's edge.
// Filler running off is the point of a bleed; an action is read whole or
// not at all, so a sliced one looks like a mistake.
function detectControlsCut({ root, V, zoomView }) {
  const out = []
  for (const n of root.querySelectorAll('[data-target], [role=button], button, [class*="btn"], [class*="button"], *')) {
    if (n.closest('.ss-cursor, .ss-keys, .ss-kb, svg') || n === root || zoomView) continue
    const cs = getComputedStyle(n)
    const r = n.getBoundingClientRect()
    const systemObject = n.matches('.ss-notification, .ss-toast, .ss-menu, .ss-popover, [class*="notification"], [class*="toast"]')
    if (r.width < 12 || r.height < 12 || (!systemObject && (r.height > 56 || r.width > 220))) continue
    const named = systemObject || n.hasAttribute('data-target') || n.getAttribute('role') === 'button' || n.tagName === 'BUTTON' || /btn|button/i.test(typeof n.className === 'string' ? n.className : '')
    // Unnamed, it has to look like a button: a rounded surface wider than
    // tall, with a word or an icon on it (an avatar or a dot is filler)
    const label = (n.textContent || '').trim()
    const chip = hasSurface(cs) && parseFloat(cs.borderTopLeftRadius) >= 4 && n.querySelectorAll('*').length <= 6 && r.width > r.height * 1.3 && (label.length >= 2 || !!n.querySelector('svg'))
    if (!named && !chip) continue
    const cut = []
    if (r.left < V.right - 2 && r.right > V.right + 2) cut.push(['right', r.right - V.right, r.width])
    if (r.top < V.bottom - 2 && r.bottom > V.bottom + 2) cut.push(['bottom', r.bottom - V.bottom, r.height])
    if (r.right > V.left + 2 && r.left < V.left - 2) cut.push(['left', V.left - r.left, r.width])
    if (!cut.length || !shown(n, root)) continue
    // Cut by its own scroller first (a list row below the fold): not the crop's cut
    const own = ownClip(n, r, root)
    if (!own || own.bottom - own.top < r.height - 1 || own.right - own.left < r.width - 1) continue
    // A parent chip already reported covers its children
    if (out.some((f) => f.startsWith('cut by the crop') && n.parentElement && f.includes(tagOf(n.parentElement)))) continue
    const [edge, off, size] = cut[0]
    // Siblings of its kind running off the same edge: the row bleeds, as filler does
    const offEdge = (s) => edge === 'right' ? s.getBoundingClientRect().right > V.right + 2 : edge === 'left' ? s.getBoundingClientRect().left < V.left - 2 : s.getBoundingClientRect().bottom > V.bottom + 2
    const kin = typeof n.className === 'string' && n.className ? [...root.querySelectorAll('.' + n.className.trim().split(/\s+/).join('.'))].filter((s) => s !== n && offEdge(s)) : []
    if (kin.length >= 1 && !n.hasAttribute('data-target')) continue
    const win = n.closest('.ss-window, .ss-phone')
    if (win && off <= 10 && !n.hasAttribute('data-target') && offEdge(win)) continue
    out.push(`cut by the crop: ${tagOf(n)} runs off the stage's ${edge} edge (${Math.round(off)}px of its ${Math.round(size)}px); filler can bleed but an action reads whole or not at all, so bring it inside the crop or remove it`)
  }
  return out
}

// ---- Per-shot entry points ------------------------------------------------

// Every check for one shot of one stage, in the order film.mjs has always
// reported them. ['CAMERA_MOVING'] while a Camera is mid-move; 'SAT_SIDE'
// among the findings when a satellite straddles the hero's side.
export function checkStage(root) {
  const ctx = stageContext(root)
  if (cameraMoving(ctx.cam)) return ['CAMERA_MOVING']
  const out = []
  out.push(...detectClipped(ctx))
  out.push(...detectPaddingRunIns(ctx))
  out.push(...detectCoveredCopy(ctx))
  out.push(...detectLopsidedPills(ctx))
  const surfs = collectSurfaces(ctx)
  out.push(...detectEdgeTangents(ctx, surfs))
  out.push(...detectUnclipped(ctx, surfs))
  out.push(...detectTightBars(ctx))
  out.push(...detectDoubleCorner(ctx))
  out.push(...detectPairTangents(ctx, surfs))
  out.push(...detectTranslucentIcons(ctx))
  out.push(...detectSkeletonLadder(ctx))
  out.push(...detectLooseList(ctx))
  out.push(...detectTightControl(ctx))
  out.push(...detectInventedMark(ctx))
  out.push(...detectNearAligned(ctx))
  out.push(...detectUnevenInset(ctx))
  out.push(...detectMixedIcons(ctx))
  out.push(...detectEmojiIcon(ctx))
  out.push(...detectFatRow(ctx))
  out.push(...detectEmptyPane(ctx))
  out.push(...detectTightInset(ctx))
  out.push(...detectUnevenPadding(ctx))
  out.push(...detectUnevenGutters(ctx))
  out.push(...detectPillInset(ctx))
  out.push(...detectTightStack(ctx))
  out.push(...detectKitOverride(ctx))
  out.push(...detectClippedGlyph(ctx))
  out.push(...detectUnitWrapped(ctx))
  out.push(...detectOnionSkin(ctx))
  out.push(...detectTightMark(ctx))
  out.push(...detectRowRhythm(ctx))
  out.push(...detectHalfPixelGlyph(ctx))
  out.push(...detectSqueezed(ctx))
  const frame = frameContext(ctx)
  const hero = detectHeroFraming(frame)
  out.push(...hero.out)
  frame.gutter = hero.gutter
  out.push(...detectSatelliteGutters(frame))
  out.push(...detectBoxEdges(frame))
  out.push(...detectSliverColumn(frame))
  out.push(...detectOverlayRoom(frame))
  out.push(...detectTouchingText(frame))
  out.push(...detectTouchingBars(frame))
  out.push(...detectDarkSlab(frame))
  out.push(...detectLightsTangent(frame))
  out.push(...detectShadowHalo(frame))
  out.push(...detectFocusFeather(frame))
  out.push(...detectTargetsCut(frame))
  out.push(...detectWordsCut(frame))
  out.push(...detectControlsCut(frame))
  return out
}

// Phone widths: the smallest visible text as drawn, through every scale.
// Null when nothing is under 9.5px.
export function smallestText(root) {
  let min = null
  for (const el of root.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement) || !el.offsetWidth) continue
    if (![...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) continue
    // An avatar's initial or a key's glyph is a mark, not a line to read
    if (el.textContent.trim().length <= 2) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || el.closest('[aria-hidden="true"], .ss-cursor')) continue
    if (fadeThrough(el, root.parentElement) < 0.5) continue
    const r = el.getBoundingClientRect()
    const S = root.getBoundingClientRect()
    if (r.right < S.left || r.left > S.right || r.bottom < S.top || r.top > S.bottom) continue
    const px = parseFloat(cs.fontSize) * (r.width / el.offsetWidth)
    if (!min || px < min.px) min = { px, el: `${el.tagName.toLowerCase()}${el.classList[0] ? '.' + el.classList[0] : ''} "${el.textContent.trim().slice(0, 20)}"` }
  }
  return min && min.px < 9.5 ? min : null
}

// A control that spills the slot it was laid out in: its box runs past its
// parent, or closes the declared gap to the box beside it. A flex or grid
// slot only lets that happen when content outgrows it (a chip opening, a
// label swapping), and the eye reads it as the field shoving its neighbor.
// Overlays (absolute, fixed) and anything that opens as the story are laid
// out on their own, so they never match.
export function detectSpills(root) {
  const out = []
  const S = root.getBoundingClientRect()
  const name = (e) => `${e.tagName.toLowerCase()}${e.classList[0] ? '.' + e.classList[0] : ''}`
  // Its own walk: more than half opaque (not at least half), and only the
  // element's own visibility, as this check has always judged it
  const seen = (e) => fadeThrough(e, root.parentElement) > 0.5 && getComputedStyle(e).visibility !== 'hidden'
  const inFlow = (e) => !/^(absolute|fixed)$/.test(getComputedStyle(e).position) && !e.closest('.ss-cursor, [aria-hidden="true"]')
  const control = (e) => {
    const r = e.getBoundingClientRect()
    if (r.height < 18 || r.height > 56 || r.width < 24) return false
    return /^(BUTTON|INPUT|TEXTAREA|SELECT)$/.test(e.tagName) || e.hasAttribute('data-target') ||
      /(^|[-_\s])(field|input|btn|button|control|chip|pill|search|select)/i.test(typeof e.className === 'string' ? e.className : '')
  }
  const scaled = (e) => { for (let a = e; a && a !== root; a = a.parentElement) { const t = getComputedStyle(a).transform; if (t && t !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(t)) return true; const sc = getComputedStyle(a).scale; if (sc && sc !== 'none' && sc !== '1') return true } return false }
  const flagged = new Set()
  for (const el of root.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement) || !el.offsetWidth || !control(el) || !inFlow(el) || !seen(el)) continue
    const p = el.parentElement
    if (!p || p === root) continue
    const pc = getComputedStyle(p)
    if (pc.overflowX !== 'visible' || /^(inline|contents)$/.test(pc.display)) continue
    const r = el.getBoundingClientRect(), pr = p.getBoundingClientRect()
    if (r.right < S.left || r.left > S.right || pr.width < 24 || scaled(el)) continue
    const ml = parseFloat(getComputedStyle(el).marginLeft), mr = parseFloat(getComputedStyle(el).marginRight)
    if (ml < 0 || mr < 0) continue
    const over = Math.max(r.right - pr.right, pr.left - r.left)
    if (over >= 3) { flagged.add(p); out.push(`spills its slot: ${name(el)} runs ${Math.round(over)}px past ${name(p)}, the width it was laid out in; give the slot room for its widest state, or let the content clip inside the box (minmax(0, 1fr), min-width: 0), never the box grow into its neighbor`) }
  }
  for (const row of root.querySelectorAll('*')) {
    if (!(row instanceof HTMLElement) || !row.offsetWidth) continue
    const cs = getComputedStyle(row)
    if (!/flex/.test(cs.display) || !/^row/.test(cs.flexDirection)) continue
    const gap = parseFloat(cs.columnGap)
    if (!(gap >= 4)) continue
    const kids = [...row.children].filter((k) => k instanceof HTMLElement && k.offsetWidth && inFlow(k) && seen(k))
    if (kids.length < 2 || scaled(row)) continue
    const extent = (k) => {
      const r = k.getBoundingClientRect()
      let L = r.left, R = r.right
      for (const d of k.querySelectorAll('*')) if (d instanceof HTMLElement && d.offsetWidth && control(d) && inFlow(d)) { const q = d.getBoundingClientRect(); L = Math.min(L, q.left); R = Math.max(R, q.right) }
      return { L, R, k }
    }
    const xs = kids.map(extent)
    for (let i = 0; i + 1 < xs.length; i++) {
      const a = xs[i], b = xs[i + 1]
      const g = b.L - a.R
      if (g > gap - 3 || [...flagged].some((f) => a.k.contains(f) || b.k.contains(f))) continue
      if (!control(a.k) && !a.k.querySelector('*')) continue
      out.push(`spills its slot: ${name(a.k)} comes ${Math.round(g)}px from ${name(b.k)} in ${name(row)}, which sets a ${Math.round(gap)}px gap; something inside it outgrew its slot and closed the gap`)
    }
  }
  return out
}

// ---- Injection ------------------------------------------------------------

// The script film.mjs installs in the page: every function above, scoped
// together so they see each other, exposed as window.__ssFilmChecks
export function filmChecksSource() {
  const fns = [
    rgbaOf, alphaOf, paintsSurface, surface, visible, hasSurface, visibleThrough, painted, shown, fadeThrough, labelOf, tagOf, px, nearTangent,
    stageContext, cameraMoving,
    detectClipped, detectPaddingRunIns, detectCoveredCopy, detectLopsidedPills,
    collectSurfaces, detectEdgeTangents, detectUnclipped, detectTightBars, detectDoubleCorner, detectPairTangents,
    detectTranslucentIcons, detectSkeletonLadder, detectLooseList, detectTightControl, detectInventedMark, detectNearAligned, detectUnevenInset, detectMixedIcons, detectEmojiIcon, detectFatRow, detectEmptyPane, detectTightInset, detectUnevenPadding, detectUnevenGutters, detectPillInset, detectTightStack, detectKitOverride, detectClippedGlyph, detectUnitWrapped, detectOnionSkin, detectTightMark, detectRowRhythm, detectHalfPixelGlyph, detectSqueezed,
    frameContext, ownClip, animating, shownArea, satellite,
    detectHeroFraming, detectSatelliteGutters, detectBoxEdges, detectSliverColumn, detectOverlayRoom, detectTouchingText, detectTouchingBars, detectDarkSlab, detectLightsTangent, detectShadowHalo, detectFocusFeather, detectTargetsCut, detectWordsCut, detectControlsCut,
    checkStage, smallestText, detectSpills,
  ]
  return `(() => {\n${fns.map((fn) => fn.toString()).join('\n')}\nwindow.__ssFilmChecks = { checkStage, smallestText, detectSpills }\n})()`
}
