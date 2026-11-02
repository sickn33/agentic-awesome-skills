// Runs inside the page. Kept self-contained for init-script injection and
// deterministic fixture tests; heuristics report candidates for visual review.
export function watchMotion(selector) {
  const watched = new WeakSet()
  const watch = (root) => {
  const key = window.__ssStageKey(root)
  const seen = new Map()
  const flagged = []
  const ink = []
  const t0 = performance.now()
  const opacityOf = (el, root) => {
    let o = 1
    for (let n = el; n && n !== root.parentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity)
    return o
  }
  const center = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  const label = (el) => `${el.tagName.toLowerCase()}${el.classList.length ? '.' + [...el.classList].join('.') : ''}`
  let lastInk = 0
  // Hard edges: the visible fraction of each cut leaf, last frame
  const cut = new WeakMap()
  const masked = (cs) => (cs.maskImage && cs.maskImage !== 'none') || (cs.webkitMaskImage && cs.webkitMaskImage !== 'none')
  const hardEdges = (root) => {
    const S = root.getBoundingClientRect()
    for (const el of root.querySelectorAll('*')) {
      if (el.children.length && el.tagName.toLowerCase() !== 'svg') continue
      if (el.closest('.ss-cursor, .ss-keys, .ss-roll, .ss-count') || (el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      let found = null
      for (let a = el; a && a !== root; a = a.parentElement) {
        const cs = getComputedStyle(a)
        if (masked(cs)) break
        if (a === el || (cs.overflowX === 'visible' && cs.overflowY === 'visible')) continue
        const c = a.getBoundingClientRect()
        const visH = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top)
        const visW = Math.min(r.right, c.right) - Math.max(r.left, c.left)
        if (visH <= 0 || visW <= 0) break
        const fy = visH / r.height
        const fx = visW / r.width
        // The cutting edge must be inside the stage; the stage's own edge is a deliberate crop
        const edgeIn = (fy < 0.999 && ((r.top < c.top && c.top > S.top + 2) || (r.bottom > c.bottom && c.bottom < S.bottom - 2))) || (fx < 0.999 && ((r.left < c.left && c.left > S.left + 2) || (r.right > c.right && c.right < S.right - 2)))
        // An edge that lines up with an outer clipping surface's edge (a panel
        // sliding out from under a window's side) is a surface boundary, not a slice
        const flush = (b) => {
          const d = b.getBoundingClientRect()
          const near = (x, y) => Math.abs(x - y) < 1.5
          return (r.top < c.top && near(c.top, d.top)) || (r.bottom > c.bottom && near(c.bottom, d.bottom)) || (r.left < c.left && near(c.left, d.left)) || (r.right > c.right && near(c.right, d.right))
        }
        let surfaceEdge = false
        for (let b = a.parentElement; b && b !== root.parentElement; b = b.parentElement) {
          const bs = getComputedStyle(b)
          if ((bs.overflowX !== 'visible' || bs.overflowY !== 'visible' || b === root) && flush(b)) {
            surfaceEdge = true
            break
          }
        }
        if (edgeIn && !surfaceEdge) found = { a, f: Math.min(fy, fx) }
        break
      }
      const prev = cut.get(el)
      if (!found) {
        cut.delete(el)
        continue
      }
      cut.set(el, found.f)
      // Sliced between 10% and 90%, the cut moved since last frame, and still readable
      if (prev === undefined || Math.abs(prev - found.f) < 0.02 || found.f < 0.1 || found.f > 0.9) continue
      if (opacityOf(el, root) < 0.35) continue
      // A single row unfolding from its middle (Collapse reveal="clip") is cut on purpose
      if (found.a.matches?.(".ss-collapse[data-reveal='clip']:not([data-tall]) > .ss-collapse__inner")) continue
      flagged.push(`hard edge: ${label(el)}${(el.textContent || '').trim() ? ` "${el.textContent.trim().slice(0, 20)}"` : ''} is cut by ${label(found.a)}'s edge while it moves; keep it faint until the edge has passed (Collapse does), or keep it whole`)
    }
  }
  // Boxes with text in them, and where each was last frame
  const painted = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c)
  const isBox = (cs) => painted(cs.backgroundColor) || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && painted(cs.borderTopColor))
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  let boxes = []
  let boxesAt = 0
  const was = new WeakMap()
  const stepped = new Set()
  const layered = (el, root) => {
    for (let a = el; a && a !== root.parentElement; a = a.parentElement) if (/transform/.test(getComputedStyle(a).willChange)) return true
    return false
  }
  const stepsInBox = (root, transforming) => {
    const now = performance.now()
    if (now - boxesAt > 400) {
      boxesAt = now
      boxes = []
      for (const el of root.querySelectorAll('*')) {
        if (el.closest('.ss-cursor, .ss-keys, .ss-roll, .ss-count, svg')) continue
        const r = el.getBoundingClientRect()
        if (r.height < 8 || r.height > 64 || r.width > 320) continue
        if (!isBox(getComputedStyle(el))) continue
        // Text in the box itself or in anything inside it
        if (ownText(el) || [...el.querySelectorAll('*')].some(ownText)) boxes.push(el)
      }
    }
    for (const el of boxes) {
      if (!el.isConnected) continue
      const r = el.getBoundingClientRect()
      const p = was.get(el)
      was.set(el, { x: r.left, y: r.top })
      if (!p) continue
      const d = Math.max(Math.abs(r.left - p.x), Math.abs(r.top - p.y))
      if (d < 0.05 || d > 40) continue
      // Moved by a transform, box and text are one layer while it runs
      let t = false
      for (const a of transforming) if (a.contains(el)) t = true
      if (t || layered(el, root) || opacityOf(el, root) < 0.5) continue
      const name = label(el)
      if (stepped.has(name)) continue
      stepped.add(name)
      flagged.push(`steps in its box: ${name} "${(el.textContent || '').trim().slice(0, 20)}" moves by layout, so its text snaps to whole pixels while the box glides, and hops inside it as it lands; give it or a parent a lasting layer (will-change: transform), and glide it by a transform`)
    }
  }
  // Fly sizes: a handoff is one object. The flyer takes off at the size of
  // what it leaves and lands at the size of what replaces it; a mismatch
  // grows or shrinks in flight and snaps when the real element appears.
  const flights = new Map()
  const flyNoted = new Set()
  const twin = (r, fly) => {
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    for (const el of document.elementsFromPoint(cx, cy)) {
      if (fly.contains(el) || el.closest('.ss-cursor')) continue
      const b = el.getBoundingClientRect()
      // The same object: centered together and within about a third in each size
      const kw = b.width / Math.max(1, r.width)
      const kh = b.height / Math.max(1, r.height)
      if (Math.abs(b.left + b.width / 2 - cx) <= 3 && Math.abs(b.top + b.height / 2 - cy) <= 3 && kw > 0.7 && kw < 1.45 && kh > 0.7 && kh < 1.45) return el
    }
    return null
  }
  const flyNote = (key, msg) => {
    if (flyNoted.has(key)) return
    flyNoted.add(key)
    flagged.push(msg)
  }
  const landing = (fly, rec) => {
    const r = rec.last
    const real = twin(r, fly)
    if (real) {
      const b = real.getBoundingClientRect()
      if (Math.abs(b.width - r.width) > 1 || Math.abs(b.height - r.height) > 1) flyNote(`down:${label(real)}`, `fly size: the flyer lands at ${Math.round(r.width)}x${Math.round(r.height)} but ${label(real)}, which replaces it, is ${Math.round(b.width)}x${Math.round(b.height)}, so it snaps on the handoff; pass the landing element's own rect as \`to\`, not its slot's`)
      rec.last = null
    } else if (--rec.wait <= 0) rec.last = null
  }
  const flySizes = (root) => {
    // A flyer unmounted on the landing frame
    for (const [fly, rec] of flights) {
      if (fly.isConnected) continue
      if (rec.last) landing(fly, rec)
      if (!rec.last) flights.delete(fly)
    }
    for (const fly of root.querySelectorAll('.ss-fly')) {
      const rec = flights.get(fly) ?? { up: false, last: null, wait: 0 }
      flights.set(fly, rec)
      const body = fly.querySelector('.ss-fly__lift')?.firstElementChild ?? fly
      const go = fly.hasAttribute('data-go') && opacityOf(fly, root) > 0.5
      if (go) {
        const r = body.getBoundingClientRect()
        if (!rec.up) {
          rec.up = true
          const src = twin(r, fly)
          if (src) {
            const b = src.getBoundingClientRect()
            if (Math.abs(b.width - r.width) > 1 || Math.abs(b.height - r.height) > 1) flyNote(`up:${label(src)}`, `fly size: the flyer takes off at ${Math.round(r.width)}x${Math.round(r.height)} from ${label(src)} drawn at ${Math.round(b.width)}x${Math.round(b.height)}, so it changes size the moment it lifts; draw the flyer at the size of what it leaves`)
          }
        }
        rec.last = r
        rec.wait = 6
      } else if (rec.last) {
        // Just landed: look for what replaces it, for a few frames
        landing(fly, rec)
        rec.up = false
      } else rec.up = false
    }
  }
  // After motion, nothing moves. Two checks on every element, every frame:
  // a handoff (one element hides as a near-identical one shows in its place:
  // a flyer and the real one, a ghost, a crossover) must swap on a frame
  // where both are identical; and an element at rest after motion must not
  // then shift with nothing animating.
  const restAt = new Map()
  let flowBoxes = new Map()
  const gone = []
  const shiftNoted = new Set()
  // What it is: its kind, its own words, and for a wordless mark (an icon)
  // its drawing, so two different icons crossfading are never paired
  const sig = (el) => {
    const words = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join('').slice(0, 30)
    return `${label(el)}|${words}|${words ? '' : el.innerHTML.replace(/\s+/g, '').slice(0, 200)}`
  }
  const handoffs = (root) => {
    const now = performance.now()
    const animations = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target && root.contains(a.effect.target))
    const runningTargets = animations.map((a) => a.effect.target)
    const layoutProperty = /^(?:width|height|min-width|max-width|min-height|max-height|block-size|inline-size|min-block-size|max-block-size|min-inline-size|max-inline-size|grid-template-rows|grid-template-columns|flex-basis|gap|row-gap|column-gap|padding(?:-.+)?|margin(?:-.+)?)$/
    const layoutTargets = [...new Set(animations.filter((animation) => {
      if (animation.transitionProperty) return layoutProperty.test(animation.transitionProperty)
      return (animation.effect.getKeyframes?.() || []).some((frame) => Object.keys(frame).some((name) => layoutProperty.test(name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))))
    }).map((animation) => animation.effect.target))]
    const seen = new Map()
    const boxes = new Map([[root, root.getBoundingClientRect()]])
    const op = new Map()
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('.ss-cursor, .ss-keys') || (el.parentElement && el.parentElement.closest('svg'))) continue
      const cs = getComputedStyle(el)
      // Include zero-height/transparent flow items before their entrance: a
      // receipt can move its siblings on the first frame it starts opening.
      const r = el.getBoundingClientRect()
      boxes.set(el, r)
      const o = (op.get(el.parentElement) ?? 1) * Number(cs.opacity)
      // Meant to step (a terminal adding a line, a caret): not a settle snap
      if (el.closest('[data-snap]')) { op.set(el, o); continue }
      op.set(el, cs.visibility === 'hidden' || cs.display === 'none' ? 0 : o)
      if (op.get(el) < 0.5) continue
      if (r.width < 4 || r.height < 4 || r.width > 500 || r.height > 500) continue
      seen.set(el, r)
    }
    const inFlow = (element) => {
      const style = getComputedStyle(element)
      return !/^(absolute|fixed)$/.test(style.position) && style.display !== 'none' && (!style.cssFloat || style.cssFloat === 'none')
    }
    const carriedByFlow = (el, rect, previous) => {
      if (!previous) return false
      // A sibling must explain the displacement, not a simultaneous resize
      // of this element. Transforms/opacity (including spinners) do not qualify.
      if (Math.abs(rect.width - previous.width) > 0.1 || Math.abs(rect.height - previous.height) > 0.1) return false
      for (const target of layoutTargets) {
        for (let branch = target; branch && branch !== root; branch = branch.parentElement) {
          if (!inFlow(branch)) break
          const parent = branch.parentElement
          if (!parent || !parent.contains(el) || branch.contains(el)) continue
          let subject = el
          while (subject.parentElement && subject.parentElement !== parent) subject = subject.parentElement
          if (!inFlow(subject)) break
          const style = getComputedStyle(parent)
          const flex = /^(inline-)?flex$/.test(style.display)
          // Keep this exemption to simple one-axis flow. Grid placements,
          // wrapping flex rows and distributed gaps need separate evidence.
          if (flex ? style.flexWrap && style.flexWrap !== 'nowrap' : !/^(block|flow-root)$/.test(style.display)) break
          if (style.writingMode && style.writingMode !== 'horizontal-tb') break
          const horizontal = flex && !style.flexDirection.startsWith('column')
          const axis = horizontal ? 'left' : 'top', cross = horizontal ? 'top' : 'left', size = horizontal ? 'width' : 'height'
          const before = flowBoxes.get(branch), after = boxes.get(branch), subjectBefore = flowBoxes.get(subject)
          if (!before || !after || !subjectBefore) break
          const growth = after[size] - before[size]
          if (Math.abs(growth) < 0.05 || Math.abs(rect[cross] - previous[cross]) > 0.1) break
          const reverse = flex && style.flexDirection.endsWith('reverse')
          const ahead = reverse ? before[axis] > subjectBefore[axis] : before[axis] < subjectBefore[axis]
          const justify = flex ? style.justifyContent : 'start'
          let alignment = 0
          if (justify === 'center') alignment = -0.5
          else if (justify === 'flex-end' || justify === 'end') alignment = -1
          else if (justify && !['normal', 'start', 'flex-start', 'stretch'].includes(justify)) break
          const expected = (reverse ? -1 : 1) * ((ahead ? 1 : 0) + alignment) * growth
          const moved = rect[axis] - previous[axis]
          // Compare actual pixels: an active height transition in a fixed-size
          // or unrelated sibling does not waive an independent settle snap.
          if (Math.abs(expected) >= 0.05 && Math.abs(moved - expected) <= Math.max(0.1, Math.abs(expected) * 0.05)) return true
          break
        }
      }
      return false
    }
    // What left this frame first, so a swap within one frame is paired
    for (const [el, rec] of restAt) {
      if (seen.has(el)) continue
      gone.push({ sig: sig(el), r: rec.r, at: now })
      restAt.delete(el)
    }
    for (const [el, r] of seen) {
      const prev = restAt.get(el)
      const running = runningTargets.some((target) => target === el || target.contains(el)) || carriedByFlow(el, r, prev?.r)
      if (!prev) {
        // It just appeared: is it taking over from something that just left?
        const k = sig(el)
        for (const g of gone) {
          if (g.sig !== k || now - g.at > 60) continue
          const d = Math.max(Math.abs(g.r.left - r.left), Math.abs(g.r.top - r.top), Math.abs(g.r.width - r.width), Math.abs(g.r.height - r.height))
          if (d > 6) continue
          if (d >= 0.5 && !shiftNoted.has('h' + k)) {
            shiftNoted.add('h' + k)
            flagged.push(`handoff shift: ${label(el)} replaces an identical element that was last drawn ${(r.left - g.r.left).toFixed(1)}px across, ${(r.top - g.r.top).toFixed(1)}px down and ${(r.width - g.r.width).toFixed(1)}x${(r.height - g.r.height).toFixed(1)}px larger, so it visibly snaps on the swap; measure the element that lands (rect() on it, not its container) and swap on a frame where both are identical`)
          }
          g.used = true
          break
        }
        restAt.set(el, { r, still: 0, moved: running ? now : -1e9, lastAnim: running ? now : -1e9 })
        continue
      }
      const dx = Math.abs(r.left - prev.r.left)
      const dy = Math.abs(r.top - prev.r.top)
      const dw = Math.abs(r.width - prev.r.width)
      const dh = Math.abs(r.height - prev.r.height)
      const moved = Math.max(dx, dy, dw, dh)
      if (running) prev.lastAnim = now
      if (moved < 0.01) prev.still++
      else {
        // Moved with nothing animating, soon after motion, from rest
        if (moved >= 0.5 && !running && now - prev.lastAnim > 20 && prev.still >= 2 && now - prev.moved < 1000) {
          const k = sig(el)
          if (!shiftNoted.has('s' + k)) {
            shiftNoted.add('s' + k)
            flagged.push(`settle snap: ${label(el)} came to rest after moving, then shifted ${moved.toFixed(1)}px with no transition running, so it hops after the motion has ended; land it exactly where it stays (measure the element, mind borders and rounding) or carry the last part in the transition`)
          }
        }
        prev.still = 0
        if (running) prev.moved = now
      }
      prev.r = r
    }
    flowBoxes = boxes
    while (gone.length && (now - gone[0].at > 60 || gone.length > 400)) gone.shift()
  }
  // Pops: an element that shows between two frames already at full opacity
  // and size, with nothing animating it or its ancestors (a chip appearing
  // whole over the value it buds from), or vanishes the same way. Exempt:
  // the cursor and keycaps, what steps on purpose (data-snap, carets),
  // something that shows under a covering surface, and a swap where an
  // identical element leaves as it shows (a flyer taking over from its
  // source), typing (placeholders, typed letters, selections, highlights),
  // anything crossing a clip's edge (a move, not a pop) and a Roll's parts.
  // Also: a dashed or dotted edge whose box changes size, which
  // Chrome re-lays every frame, so the dashes crawl and flicker.
  let vis = new Map()
  let tiny = new Set()
  let popFrom = -1
  let popLast = -1
  const popNoted = new Set()
  const pops = (root) => {
    const now = performance.now()
    if (popFrom < 0) popFrom = now
    // Only an entrance or exit counts: a fade, a clip, a size opening. A
    // move alone (a flyer setting off at full size) still pops in
    const entering = (a) => {
      if (a.transitionProperty) return /opacity|clip|height|width|grid-template|filter/.test(a.transitionProperty) && !(a.transitionProperty === 'filter')
      const kf = a.effect?.getKeyframes?.() ?? []
      return kf.some((f) => 'opacity' in f || 'clipPath' in f || 'height' in f || 'width' in f)
    }
    const busy = new Set(document.getAnimations().filter((a) => a.playState === 'running' && entering(a)).map((a) => a.effect && a.effect.target).filter(Boolean))
    const busyUp = (el) => { for (let a = el; a && a !== root.parentElement; a = a.parentElement) if (busy.has(a)) return true; return false }
    const k = root.getBoundingClientRect().width / (root.offsetWidth || 1) || 1
    const cur = new Map()
    const op = new Map()
    // Shown but too small to judge: a fill that eases to nothing (or grows
    // out of it) crosses the size floor without popping
    const tinyNow = new Set()
    // The box each element is clipped to by its ancestors: a roll's old
    // line slid out of its window has left view before it is removed
    const clipOf = new Map()
    const R = root.getBoundingClientRect()
    clipOf.set(root, { l: R.left, t: R.top, r: R.right, b: R.bottom })
    for (const el of root.querySelectorAll('*')) {
      if (el.closest('.ss-cursor, .ss-keys, [data-snap], .ss-caret, .ss-field__caret, .ss-term__caret, .ss-count__strip') || el.parentElement?.closest('svg')) continue
      const cs = getComputedStyle(el)
      const o = (op.get(el.parentElement) ?? 1) * Number(cs.opacity) * (cs.visibility === 'hidden' || cs.display === 'none' ? 0 : 1)
      op.set(el, o)
      const pc = clipOf.get(el.parentElement) ?? clipOf.get(root)
      if (cs.overflow !== 'visible' || cs.clipPath !== 'none') {
        const b = el.getBoundingClientRect()
        clipOf.set(el, { l: Math.max(pc.l, b.left), t: Math.max(pc.t, b.top), r: Math.min(pc.r, b.right), b: Math.min(pc.b, b.bottom) })
      } else clipOf.set(el, pc)
      if (o < 0.5) continue
      // A flyer is drawn by its scaled inner box, not its take-off box
      const r = (el.matches('.ss-fly') && el.querySelector('.ss-fly__lift')?.getBoundingClientRect()) || el.getBoundingClientRect()
      if (r.width * r.height < 36 * k * k) {
        tinyNow.add(el)
        continue
      }
      // Mostly outside its clip: present but out of view, so crossing the
      // clip's edge is a move, not an entrance or an exit
      const out = Math.max(0, Math.min(r.right, pc.r) - Math.max(r.left, pc.l)) * Math.max(0, Math.min(r.bottom, pc.b) - Math.max(r.top, pc.t)) < r.width * r.height * 0.5
      const sc = el.matches('.ss-fly') ? 1 : el instanceof HTMLElement && el.offsetWidth ? r.width / el.offsetWidth / k : 1
      const dashed = (/dashed|dotted/.test(cs.borderTopStyle) && parseFloat(cs.borderTopWidth) > 0) || (/dashed|dotted/.test(cs.outlineStyle) && parseFloat(cs.outlineWidth) > 0)
      // A flyer shows through its inner box (where it buds and lifts)
      const lift = el.matches('.ss-fly') ? el.querySelector('.ss-fly__lift') : null
      const ov = lift ? o * Number(getComputedStyle(lift).opacity) : o
      cur.set(el, { o: ov, r, sc, busy: busyUp(lift ?? el), parent: el.parentElement, dashed, out, roll: !!el.closest('.ss-roll, .ss-count'), signature: sig(el), typed: !!el.closest('[data-typing], .ss-field__chars, .ss-field__placeholder, .ss-kb__callout, .ss-kb__suggest') })
    }
    const near = (a, b) => Math.abs(a.left + a.width / 2 - b.left - b.width / 2) < 40 * k && Math.abs(a.top + a.height / 2 - b.top - b.height / 2) < 40 * k && Math.abs(a.width - b.width) < Math.max(a.width, b.width) * 0.35
    const left = [...vis].filter(([el]) => !cur.has(el))
    const came = [...cur].filter(([el]) => !vis.has(el))
    // A late frame (the page busy, as while a screenshot is taken) can hide a
    // whole short fade between two samples: not judged
    const late = popLast > 0 && now - popLast > 40
    popLast = now
    if (now > popFrom && !late) {
      const name = (el) => `${label(el)}${(el.textContent || '').trim() ? ` "${el.textContent.trim().slice(0, 20)}"` : ''}`
      // What it paints: its contents at their own opacity (a held flyer
      // whose chip fades in by a keyframe paints nothing yet)
      const paints = (el) => {
        if (!el.children.length) return 1
        let most = 0
        const walk = (n, o) => {
          for (const c of n.children) {
            const co = o * Number(getComputedStyle(c).opacity)
            if (!c.children.length || [...c.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())) most = Math.max(most, co)
            if (c.children.length && most < 0.9) walk(c, co)
          }
        }
        walk(el, 1)
        return most
      }
      // Typing is instant in the real thing: a field's placeholder goes on
      // the first key, letters and the clear button land whole, a key's
      // callout flashes, a text selection or match highlight paints at once.
      // A Roll splits its line into parts on the first change (the part that
      // stays is still painted), so its own pieces aren't judged
      const typed = (el) => el.closest('[data-typing], .ss-field__chars, .ss-field__placeholder, .ss-kb__callout, .ss-kb__suggest')
      for (const [el, c] of came) {
        if (cur.has(c.parent) && !vis.has(c.parent)) continue
        if (typed(el) || c.out || el.closest('.ss-roll') || tiny.has(el)) continue
        if (c.o < 0.9 || c.sc < 0.95 || c.busy) continue
        if (el.getAnimations({ subtree: true }).some((a) => a.playState === 'running' && entering(a)) || paints(el) < 0.9) continue
        if (left.some(([, g]) => g.signature === c.signature && near(g.r, c.r))) continue
        // Shown under a surface that covers it (a card sliding over it)
        // (hit-testing skips pointer-events: none, a flyer's, so that one can't be judged covered)
        const top = getComputedStyle(el).pointerEvents === 'none' ? null : document.elementFromPoint(c.r.left + c.r.width / 2, c.r.top + c.r.height / 2)
        if (top && !el.contains(top) && !top.contains(el) && !top.closest('.ss-cursor')) continue
        const key = 'in' + name(el)
        if (popNoted.has(key)) continue
        popNoted.add(key)
        flagged.push(`appears with no entrance: ${name(el)} shows at full size and opacity in one frame; fade it in, or grow it out of what it comes from (a chip budding off a value scales from it as it fades in: Fly with held), never pop it in whole`)
      }
      for (const [el, g] of left) {
        if (vis.has(g.parent) && !cur.has(g.parent)) continue
        if (g.typed || g.out || g.roll || g.sc < 0.95 || tinyNow.has(el)) continue
        if (g.o < 0.9 || g.busy) continue
        if (came.some(([, c]) => g.signature === c.signature && near(g.r, c.r))) continue
        const key = 'out' + name(el)
        if (popNoted.has(key)) continue
        popNoted.add(key)
        flagged.push(`vanishes with no exit: ${name(el)} goes from full opacity to gone in one frame; fade it out (or move it out of view) before it is removed`)
      }
      for (const [el, c] of cur) {
        const p = vis.get(el)
        if (!p || !c.dashed || !p.dashed) continue
        if (Math.abs(c.r.width - p.r.width) < 0.5 && Math.abs(c.r.height - p.r.height) < 0.5) continue
        const key = 'dash' + label(el)
        if (popNoted.has(key)) continue
        popNoted.add(key)
        flagged.push(`dashed edge resizes: ${label(el)} has a dashed or dotted edge whose box changes size, so the dashes are re-laid every frame and crawl; draw the mark at its full size on its own layer and only fade it`)
      }
    }
    vis = cur
    tiny = tinyNow
  }
  const moving = new Set()
  const landed = new Set()
  const tick = () => {
    if (window.__ssVerification?.stopped || !root.isConnected) return
    try {
    if (root) {
      // Text riding a transform to rest: watch transform transitions finish
      const now0 = new Set()
      for (const a of document.getAnimations()) {
        const el = a.effect && a.effect.target
        if (!el || !root.contains(el) || !/^(transform|translate|scale)$/.test(a.transitionProperty || '')) continue
        // A surface scaling on ::before carries no text: that is the fix, not the fault
        if (a.effect.pseudoElement) continue
        // A camera push-in has to be a transform: it scales the whole scene
        if (el.closest('.ss-cursor, .ss-fly, .ss-keys, .ss-key') || el.matches('.ss-camera, .ss-camera-view')) continue
        now0.add(el)
      }
      for (const el of moving) {
        if (now0.has(el)) continue
        moving.delete(el)
        if (!el.isConnected) continue
        const cs = getComputedStyle(el)
        const t = cs.transform
        // Kept on its own layer for good (will-change: transform), it rests
        // exactly as it would untransformed: nothing re-snaps (Expand's launch)
        if (/transform/.test(cs.willChange)) continue
        const rest = t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t)
        if (!rest || opacityOf(el, root) < 0.5 || !(el.textContent || '').trim()) continue
        const name = label(el)
        if (landed.has(name)) continue
        landed.add(name)
        flagged.push(`lands on a transform: ${name} "${el.textContent.trim().slice(0, 20)}" comes to rest at the end of a transform, so its text hops a fraction of a pixel as it lands; keep it on a layer for good (will-change: transform), or scale only its surface`)
      }
      for (const el of now0) moving.add(el)
      const live = new Set()
      for (const a of document.getAnimations()) {
        const el = a.effect && a.effect.target
        const prop = a.transitionProperty || ''
        // A pen tip (data-lead) shows first on purpose: the draw follows it
        if (!el || !root.contains(el) || !/^(transform|translate|top|left)$/.test(prop) || el.closest('.ss-cursor, [data-lead]')) continue
        live.add(el)
        if (!seen.has(el)) seen.set(el, { from: center(el), o0: opacityOf(el, root), opaqueAt: null })
        const s = seen.get(el)
        if (!s.opaqueAt && s.o0 < 0.5 && opacityOf(el, root) >= 0.95) s.opaqueAt = center(el)
      }
      for (const [el, s] of seen) {
        if (live.has(el)) continue
        seen.delete(el)
        if (!s.opaqueAt || !el.isConnected) continue
        const to = center(el)
        const total = Math.hypot(to.x - s.from.x, to.y - s.from.y)
        const left = Math.hypot(to.x - s.opaqueAt.x, to.y - s.opaqueAt.y)
        if (left > 8 && left > total * 0.4) flagged.push(`appears, then moves: ${label(el)} is fully visible with ${Math.round((left / total) * 100)}% of its travel still to go (fade at least half the move, starting with it)`)
      }
      const now = performance.now()
      if (now - lastInk > 40) {
        lastInk = now
        const S = root.getBoundingClientRect()
        // A camera push-in shows less on purpose: not an empty frame
        const zoomed = !!root.querySelector('.ss-camera-view[data-zoomed]')
        let n = 0
        for (const el of root.querySelectorAll('*')) {
          if (el.children.length && el.tagName.toLowerCase() !== 'svg') continue
          if (el.closest('.ss-cursor') || (el.closest('svg') && el.tagName.toLowerCase() !== 'svg')) continue
          const r = el.getBoundingClientRect()
          if (r.width < 2 || r.height < 2 || r.right < S.left || r.left > S.right || r.bottom < S.top || r.top > S.bottom) continue
          if (opacityOf(el, root) > 0.3) n++
        }
        if (!zoomed) ink.push({ at: now, n })
      }
      hardEdges(root)
      const transforming = new Set()
      for (const a of document.getAnimations()) {
        const el = a.effect && a.effect.target
        if (el && root.contains(el) && /^(transform|translate|scale)$/.test(a.transitionProperty || a.animationName || '')) transforming.add(el)
        else if (el && root.contains(el) && a.animationName) transforming.add(el)
      }
      stepsInBox(root, transforming)
      flySizes(root)
      handoffs(root)
      pops(root)
    }
    window.__ssVerification.stages[key].motion = { flagged, ink, start: t0 }
    requestAnimationFrame(tick)
    } catch (error) { window.__ssVerification.errors.push(`motion ${key}: ${error.message}`) }
  }
  requestAnimationFrame(tick)
  }
  const discover = () => {
    if (window.__ssVerification?.stopped) return
    if (window.__ssVisibleStages && window.__ssStageKey) {
      try {
        for (const root of window.__ssVisibleStages(selector)) {
          if (watched.has(root)) continue
          watched.add(root)
          watch(root)
        }
      } catch (error) { window.__ssVerification.errors.push(`motion discovery: ${error.message}`); return }
    }
    requestAnimationFrame(discover)
  }
  requestAnimationFrame(discover)
}
