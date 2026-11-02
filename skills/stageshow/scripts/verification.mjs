// Shared reporting and page discovery. Browser functions below are deliberately
// self-contained: Playwright installs their source before application code runs.
export function visibleStages(selector = null) {
  const targets = [...document.querySelectorAll(selector || '.ss-fit, .ss-stage')]
  const stages = new Set()
  for (const target of targets) {
    for (const stage of target.matches('.ss-stage') ? [target] : target.querySelectorAll('.ss-stage')) {
      const r = stage.getBoundingClientRect()
      const cs = getComputedStyle(stage)
      if (r.width && r.height && cs.display !== 'none' && cs.visibility !== 'hidden' && stage.checkVisibility?.({ visibilityProperty: true, opacityProperty: false }) !== false) stages.add(stage)
    }
  }
  return [...stages]
}

export function watchStages({ selector = null } = {}) {
  const keys = new WeakMap()
  let next = 1
  const state = window.__ssVerification = { selector, stages: {}, stopped: false, errors: [] }
  window.__ssStageKey = (stage) => {
    if (!keys.has(stage)) {
      const key = `stage-${next++}`
      keys.set(stage, key)
      stage.setAttribute('data-ss-verification-stage', key)
      state.stages[key] = { label: stage.getAttribute('aria-label') || stage.parentElement?.className || key, startedAt: performance.now(), frames: [] }
      window.__ssRecord(stage, { key })
    }
    return keys.get(stage)
  }
  const discover = () => {
    if (state.stopped) return
    try {
      for (const stage of window.__ssVisibleStages(selector)) window.__ssStageKey(stage)
    } catch (error) {
      state.errors.push(String(error))
      state.stopped = true
      return
    }
    requestAnimationFrame(discover)
  }
  requestAnimationFrame(discover)
}

export function instrumentationSource(record, selector = null) {
  return `window.__ssVisibleStages = ${visibleStages.toString()};\nwindow.__ssRecord = ${record.toString()};\n(${watchStages.toString()})(${JSON.stringify({ selector })});`
}

export function coverage(frames = [], { requestedMs = 0, slow = 1 } = {}) {
  const intervals = frames.slice(1).map((frame, i) => frame.t - frames[i].t)
  const sorted = intervals.filter((ms) => ms > 0 && Number.isFinite(ms)).sort((a, b) => a - b)
  const medianMs = sorted[Math.floor(sorted.length / 2)] || 16.7
  const late = intervals.filter((ms) => ms > medianMs * 1.6)
  const durationMs = frames.length > 1 ? frames.at(-1).t - frames[0].t : 0
  const reasons = []
  if (frames.length < 4) reasons.push(`only ${frames.length} animation frames recorded`)
  if (requestedMs && durationMs + Math.max(100, medianMs * 3) < requestedMs) reasons.push(`recorded ${Math.round(durationMs)}ms of the requested ${Math.round(requestedMs)}ms`)
  if (late.length) reasons.push(`${late.length} sampling gap(s) exceeded ${Math.round(medianMs * 1.6)}ms; motion during those gaps was not judged`)
  if (medianMs > 40) reasons.push(`typical sampling interval was ${Math.round(medianMs)}ms; too sparse to judge short motion`)
  if (intervals.some((ms) => !Number.isFinite(ms) || ms <= 0)) reasons.push('recording contained invalid or non-increasing frame timestamps')
  if (frames.length && !frames.some((frame) => frame.items?.length)) reasons.push('no visible elements were sampled')
  const cameraFrames = frames.filter((frame) => frame.cameraMoving).length
  return { status: reasons.length ? 'inconclusive' : 'complete', frames: frames.length, durationMs: durationMs / slow, medianMs, maxGapMs: Math.max(0, ...intervals), skippedGaps: late.length, cameraFrames, reasons }
}

export function reportResult({ stages = [], errors = [], strict = false, still = false } = {}) {
  const incomplete = errors.length > 0 || stages.length === 0 || stages.some((stage) => stage.coverage?.status !== 'complete')
  const findings = stages.reduce((n, stage) => n + (stage.findings?.length || 0), 0)
  const manual = stages.reduce((n, stage) => n + (stage.manual?.length || 0), 0)
  const status = incomplete ? 'inconclusive' : findings ? 'issues' : 'no-issues-detected'
  return { status, mode: still ? 'still' : 'motion', stages, errors, manualReviewRequired: !still || manual > 0, exitCode: incomplete ? 2 : strict && findings ? 1 : 0 }
}

export function printCoverage(key, sample) {
  console.log(`coverage ${key}: ${sample.frames} frames, ${(sample.durationMs / 1000).toFixed(2)}s, largest gap ${sample.maxGapMs.toFixed(1)}ms (${sample.status})`)
  for (const reason of sample.reasons) console.log(`  incomplete: ${reason}`)
  if (sample.cameraFrames) console.log(`  manual: camera contents excluded during ${sample.cameraFrames} moving-camera frames`)
}

export function motionFindings(motion, slow = 1) {
  if (!motion) return []
  const lines = [...new Set(motion.flagged)]
  const ink = motion.ink.filter((i) => i.at >= motion.start).map((i) => ({ n: i.n, t: (i.at - motion.start) / 1000 / slow }))
  const most = Math.max(0, ...ink.map((i) => i.n))
  const runs = []
  // An initial fade may start with no ink. Judge a loss of established
  // content, not the baseline before the first entrance has appeared.
  const firstContent = ink.findIndex((sample) => sample.n >= most * 0.2 && sample.n > 0)
  for (const sample of firstContent < 0 ? [] : ink.slice(firstContent)) {
    const last = runs.at(-1)
    if (sample.n < most * 0.2 && last && !last.done) { last.end = sample.t; last.min = Math.min(last.min, sample.n) }
    else if (sample.n < most * 0.2) runs.push({ start: sample.t, end: sample.t, min: sample.n })
    else if (last) last.done = true
  }
  const low = runs.filter((r) => r.end - r.start >= 0.12)
  if (most && low.length) lines.push(`near-empty frames: visible content falls to ${Math.min(...low.map((r) => r.min))} of ${most} elements around ${low[0].start.toFixed(1)}s for ${Math.round((low[0].end - low[0].start) * 1000)}ms${low.length > 1 ? ` (${low.length} times)` : ''}; inspect the handoff and overlap the old and new content`)
  return lines
}
