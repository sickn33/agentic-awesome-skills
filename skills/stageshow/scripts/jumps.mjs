#!/usr/bin/env node
// Record every visible Stage from its first rendered frame, on any host page.
// Geometry detects snaps/drift; same-box text/icon changes require visual review.
import { launch } from './browser.mjs'
import { record, analyse, contentChanges } from './jumps-core.mjs'
import { instrumentationSource, coverage, reportResult, printCoverage } from './verification.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const args = process.argv.slice(2)
const options = { ms: 20000, width: 1280, select: null, report: null, strict: false }
let url
try {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help') { console.log('usage: node scripts/jumps.mjs <url> [--ms 20000] [--width 1280] [--select ".demo"] [--report report.json] [--strict]'); process.exit(0) }
    if (arg === '--strict') options.strict = true
    else if (/^--(ms|width|select|report)$/.test(arg)) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`${arg} requires a value`)
      options[arg.slice(2)] = args[++i]
    } else if (arg.startsWith('--') || url) throw new Error(`unexpected argument: ${arg}`)
    else url = arg
  }
  if (!url) throw new Error('a URL is required; use --help')
  for (const name of ['ms', 'width']) {
    options[name] = Number(options[name])
    if (!Number.isInteger(options[name]) || options[name] <= 0) throw new Error(`--${name} must be a positive integer`)
  }
} catch (error) { console.error(`jumps: ${error.message}`); process.exit(2) }
const browser = await launch()
const page = await browser.newPage({ viewport: { width: options.width, height: 900 } })
const errors = []
page.on('pageerror', (error) => errors.push(`page: ${error.message}`))
page.on('response', (response) => { if (response.status() >= 400 && !/\/favicon\./.test(response.url())) errors.push(`resource: ${response.status()} ${response.url()}`) })
await page.addInitScript({ content: instrumentationSource(record, options.select) })
let snapshot
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Object.keys(window.__ssVerification.stages).length || window.__ssVerification.errors.length, null, { timeout: 30000 })
  const started = await page.evaluate(() => window.__ssVerification)
  if (started.errors.length) throw new Error(started.errors.join('; '))
  const token = Math.random().toString(36)
  await page.evaluate((token) => { window.__ssVerification.token = token }, token)
  await page.waitForTimeout(options.ms)
  snapshot = await page.evaluate(() => { window.__ssVerification.stopped = true; return window.__ssVerification })
  if (snapshot.token !== token) errors.push('page navigated during recording; rerun after changes settle')
} catch (error) { errors.push(error.message) }
await browser.close()

const stages = Object.entries(snapshot?.stages || {}).map(([key, stage]) => ({
  key, label: stage.label,
  coverage: coverage(stage.frames, { requestedMs: options.ms }),
  findings: analyse(stage.frames), manual: contentChanges(stage.frames),
}))
const result = reportResult({ stages, errors: [...errors, ...(snapshot?.errors || [])], strict: options.strict })
for (const stage of stages) {
  printCoverage(stage.key, stage.coverage)
  for (const line of stage.findings) console.log(`[${stage.key}] ${line}`)
  for (const line of stage.manual) console.log(`[${stage.key}] manual: ${line}`)
}
for (const error of result.errors) console.error(`incomplete: ${error}`)
console.log(`jumps: ${result.status}; visual motion review is still required`)
if (options.report) {
  const path = resolve(options.report)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n')
}
process.exitCode = result.exitCode
