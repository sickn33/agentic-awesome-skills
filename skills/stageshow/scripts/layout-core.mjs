// Runs in the browser. Deliberately checks CSS box constraints, not glyph ink
// centering or the visual balance of arbitrary shapes. Shared by film and layout.
export function auditLayout(root) {
  const findings = [], deferred = [], manual = []
  const checked = { controls: 0, paddedContainers: 0, compositionCrops: 0 }
  const px = (value) => parseFloat(value) || 0
  const round = (value) => Math.round(value * 100) / 100
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`
  const all = [root, ...root.querySelectorAll('*')]
  const animations = document.getAnimations().filter((a) => a.playState === 'running')
  const geometry = /^(?:transform|translate|rotate|scale|width|height|minWidth|maxWidth|minHeight|maxHeight|blockSize|inlineSize|gridTemplateRows|gridTemplateColumns|flexBasis|gap|rowGap|columnGap|padding.*|margin.*|top|left|right|bottom)$/
  const moving = (el) => animations.some((a) => {
    const target = a.effect?.target
    // Only motion of this box or an ancestor. A spinning descendant cannot
    // excuse a broken outer control or a compressed window's bottom gutter.
    return target instanceof Element && (target === el || target.contains(el)) &&
      a.effect.getKeyframes().some((frame) => Object.keys(frame).some((property) => geometry.test(property)))
  })
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return false
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < .05) return false
    }
    return true
  }
  const inFlow = (el, boundary) => {
    for (let a = el; a && a !== boundary; a = a.parentElement) {
      if (['absolute', 'fixed'].includes(getComputedStyle(a).position)) return false
    }
    return true
  }
  const control = (el) => el.matches('button, [role="button"], [data-layout-control]') ||
    typeof el.className === 'string' && el.className.split(/\s+/).some((cls) => /(?:^|[-_])(?:button|btn)(?:$|[-_])/.test(cls))
  const metrics = (el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    // Computed sizes retain fractions; offsetHeight rounds them. Remove an
    // axis-aligned stage scale without inventing an error from that rounding.
    const w = px(cs.width) + (cs.boxSizing === 'border-box' ? 0 : px(cs.paddingLeft) + px(cs.paddingRight) + px(cs.borderLeftWidth) + px(cs.borderRightWidth))
    const h = px(cs.height) + (cs.boxSizing === 'border-box' ? 0 : px(cs.paddingTop) + px(cs.paddingBottom) + px(cs.borderTopWidth) + px(cs.borderBottomWidth))
    return { cs, r, sx: w > 0 ? r.width / w : 1, sy: h > 0 ? r.height / h : 1, h: h || r.height }
  }
  const add = (rule, el, message, evidence) => findings.push({ rule, element: name(el), message: `layout: ${name(el)} ${message}`, evidence })
  for (const el of all.filter(control)) {
    if (!visible(el)) continue
    if (moving(el)) { deferred.push(`${name(el)}: control geometry is moving`); continue }
    const { cs, r, sx, sy, h } = metrics(el)
    if (cs.writingMode !== 'horizontal-tb') { deferred.push(`${name(el)}: non-horizontal writing mode`); continue }
    const atoms = []
    let movingText = false
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let text; (text = walker.nextNode());) {
      if (!text.textContent.trim() || !visible(text.parentElement) || !inFlow(text.parentElement, el)) continue
      movingText ||= moving(text.parentElement)
      const range = document.createRange(); range.selectNodeContents(text)
      const line = px(getComputedStyle(text.parentElement).lineHeight)
      for (const box of range.getClientRects()) {
        if (box.width < .1 || box.height < .1) continue
        const height = Math.max(box.height / sy, line)
        atoms.push({ left: box.left, right: box.right, top: (box.top + box.bottom) / 2 - height * sy / 2, bottom: (box.top + box.bottom) / 2 + height * sy / 2 })
      }
    }
    for (const child of el.querySelectorAll('svg, img, canvas')) {
      if (visible(child) && inFlow(child, el)) {
        const box = child.getBoundingClientRect(), style = getComputedStyle(child)
        // A rotated plus still occupies its authored 24px layout box. Its
        // 34px axis-aligned drawing envelope is a contour, not extra layout
        // height. Treat contours as visual review, never as a padding defect.
        const height = px(style.height) + (style.boxSizing === 'border-box' ? 0 : px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth))
        atoms.push({ left: box.left, right: box.right, top: (box.top + box.bottom - height * sy) / 2, bottom: (box.top + box.bottom + height * sy) / 2 })
      }
    }
    if (!atoms.length) continue
    checked.controls++
    // A label's outgoing/incoming copies may overlap inside one clipped line.
    // Their moving paint bounds are not extra layout rows. Still enforce the
    // tallest authored line (so motion cannot hide height+padding overflow),
    // but defer the full union and edge judgment until the text has settled.
    const contentHeight = movingText
      ? Math.max(...atoms.map(a => (a.bottom - a.top) / sy))
      : (Math.max(...atoms.map((a) => a.bottom)) - Math.min(...atoms.map((a) => a.top))) / sy
    const top = px(cs.paddingTop), bottom = px(cs.paddingBottom)
    const borders = px(cs.borderTopWidth) + px(cs.borderBottomWidth)
    const needed = contentHeight + top + bottom + borders
    // A full line box must fit even when its ink looks optically centered.
    // One CSS pixel of tolerance covers font metrics and fractional rounding.
    if (needed > h + 1) add('control-block-fit', el,
      `is ${round(h)}px high but its content, padding and borders need ${round(needed)}px`,
      { height: round(h), contentHeight: round(contentHeight), paddingTop: top, paddingBottom: bottom, borders, requiredHeight: round(needed) })
    if (movingText) { deferred.push(`${name(el)}: text is moving; checked minimum line fit, deferred combined bounds`); continue }
    const left = px(cs.paddingLeft), right = px(cs.paddingRight)
    const leftGap = (Math.min(...atoms.map((a) => a.left)) - r.left) / sx - px(cs.borderLeftWidth)
    const rightGap = (r.right - Math.max(...atoms.map((a) => a.right))) / sx - px(cs.borderRightWidth)
    // Narrow evidence: near-zero CSS padding AND visible content against that
    // edge, with a real inset at the opposite edge. Ordinary optical 1–2px
    // adjustments, icon-only buttons and asymmetric dropdown affordances pass.
    if ((left <= 1 && right >= 6 && leftGap <= 2 && rightGap >= 5) ||
        (right <= 1 && left >= 6 && rightGap <= 2 && leftGap >= 5)) {
      add('control-edge-inset', el, `puts content ${round(leftGap)}px from the left and ${round(rightGap)}px from the right (CSS padding ${left}px / ${right}px)`,
        { paddingLeft: left, paddingRight: right, leftGap: round(leftGap), rightGap: round(rightGap) })
    }
  }
  for (const el of all) {
    if (control(el) || !el.children.length || !visible(el) || el.matches('html, body, .ss-stage, .ss-fit') || el.closest('[data-crop]')) continue
    const { cs, r, sy } = metrics(el)
    const padding = px(cs.paddingBottom)
    if (padding < 6 || cs.display === 'inline' || ['auto', 'scroll'].includes(cs.overflowY)) continue
    const children = [...el.children].filter((child) => visible(child) && inFlow(child, el))
    if (!children.length) continue
    const last = children.reduce((a, b) => a.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom ? a : b)
    if (moving(el) || moving(last)) { deferred.push(`${name(el)}: bottom content geometry is moving`); continue }
    let edge = r.bottom - px(cs.borderBottomWidth) * sy, boundary = el
    // Respect the closest real frame, including .ss-window. Stage/viewport
    // crops are composition choices and do not redefine a body's padding.
    for (let a = el.parentElement; a && a !== root.parentElement; a = a.parentElement) {
      if (a.matches('.ss-stage, .ss-fit') || a.hasAttribute('data-crop')) break
      const ac = getComputedStyle(a)
      if (['auto', 'scroll'].includes(ac.overflowY)) break
      if (['hidden', 'clip'].includes(ac.overflowY)) {
        const ar = a.getBoundingClientRect(), asy = metrics(a).sy
        const lower = ar.bottom - px(ac.borderBottomWidth) * asy
        if (lower < edge) { edge = lower; boundary = a }
      }
      if (a === root) break
    }
    checked.paddedContainers++
    const available = (edge - last.getBoundingClientRect().bottom) / sy
    if (available < padding - 2) add('container-block-inset', el,
      `leaves ${round(available)}px below its last child inside ${name(boundary)}, short of its ${padding}px bottom padding`,
      { paddingBottom: padding, availableBottom: round(available), boundary: name(boundary), lastChild: name(last) })
  }
  // A deliberate outer crop does not excuse a second, unexplained cut inside
  // it. A complete small window is fine; only a window actually crossing the
  // inner Stage's clip is a candidate. Transparent object margins are ignored.
  for (const window of all.filter(el => el.matches('.ss-window') && visible(el))) {
    const stage = window.closest('.ss-stage')
    const tile = stage?.parentElement?.closest('[data-crop]')
    if (!stage || !tile || !root.contains(tile)) continue
    if (moving(window) || moving(stage)) { deferred.push(`${name(window)}: composition crop geometry is moving`); continue }
    const w = window.getBoundingClientRect(), s = stage.getBoundingClientRect(), t = tile.getBoundingClientRect(), cs = getComputedStyle(stage)
    checked.compositionCrops++
    const axes = []
    if (['hidden', 'clip'].includes(cs.overflowX) && w.right > s.right + 2 && t.right > s.right + 4) axes.push('right')
    if (['hidden', 'clip'].includes(cs.overflowY) && w.bottom > s.bottom + 2 && t.bottom > s.bottom + 4) axes.push('bottom')
    if (axes.length) add('nested-composition-crop', window,
      `is cut at the inner Stage's ${axes.join(' and ')} edge before the outer composition ends; inspect this internal crop`,
      { axes, stage: name(stage), tile: name(tile), rightRemainder: round(t.right - s.right), bottomRemainder: round(t.bottom - s.bottom) })
  }
  const frames = all.filter((el) => el.tagName === 'IFRAME' && visible(el)).length
  if (frames) manual.push(`${frames} visible iframe(s) were not inspected; check their direct content URLs separately.`)
  manual.push('This snapshot checks box fit and authored insets; inspect optical centering, shape contours, interaction states and motion visually.')
  return { findings, checked, deferred: [...new Set(deferred)], manual }
}

export function layoutResult(scopes, errors = [], strict = false) {
  const count = scopes.reduce((n, scope) => n + scope.checked.controls + scope.checked.paddedContainers + (scope.checked.compositionCrops || 0), 0)
  const incomplete = errors.length > 0 || count === 0 || scopes.some((scope) => scope.deferred.length > 0)
  const issues = scopes.some((scope) => scope.findings.length > 0)
  return { status: incomplete ? 'inconclusive' : issues ? 'issues' : 'no-issues-detected', exitCode: incomplete ? 2 : strict && issues ? 1 : 0, scopes, errors: count ? errors : [...errors, 'no supported visible controls or padded containers were checked'], manualReviewRequired: true }
}
