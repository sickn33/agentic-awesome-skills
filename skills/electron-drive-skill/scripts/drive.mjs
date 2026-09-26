#!/usr/bin/env node
/**
 * Start an Electron app under Playwright and operate it from the command line,
 * one command per call. Written for coding agents, usable by anyone.
 *
 * Run it from anywhere inside the project; see SKILL.md and README.md.
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  daemonLogPath,
  driveRoot,
  isAlive,
  loadConfig,
  parseArgs,
  profileDir,
  PROJECT_ROOT,
  readState,
  startOptions,
  statePath
} from './lib.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

const USAGE = `drive <command>

  start [--dev] [--build] [--profile <name>] [--fresh]
        Launch the app on a scratch profile. Default: the last build
        ('build' in drive.config.json runs first with --build). --dev: the
        dev launch, against a renderer dev server you started yourself.
        --fresh wipes the profile first (first-run state).
  status                           whether the app is up, its profile and window
  snapshot                         accessibility tree of the window
  screenshot [--out <png>] [--selector <css>]
  click <target>                   Playwright selector: 'text=Settings', 'role=button[name="Save"]', css
  fill <target> <text>
  select <target> <value|label>    a <select>, by option value or visible label
  press <key>                      e.g. Enter, Escape, Control+K
  wait <target> [--timeout <ms>]
  eval <js | ->                    in the renderer; an expression, or a body with 'return'
  main <js | ->                    in the main process; 'electron' and 'process' are in scope
                                   '-' reads the code from stdin
  logs [--lines <n>]               recent console output, plus 'logFile' from the config
  stop                             quit the app and the daemon
`

const fail = (message) => {
  console.error(message)
  process.exit(1)
}

const send = (command, args = {}) => {
  const state = readState()
  if (!state || !isAlive(state.pid)) {
    if (state) rmSync(statePath(), { force: true })
    return fail("Nothing is running. Start it with 'drive start'.")
  }

  const body = JSON.stringify({ token: state.token, command, args })
  return new Promise((resolve, reject) => {
    const request = http.request(
      { host: '127.0.0.1', port: state.port, method: 'POST', headers: { 'content-type': 'application/json' } },
      (response) => {
        let data = ''
        response.on('data', (chunk) => {
          data += chunk
        })
        response.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (parsed.ok) resolve(parsed.result)
            else reject(new Error(parsed.error))
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    request.on('error', reject)
    request.end(body)
  })
}

const print = (result) => {
  if (typeof result === 'string') console.log(result)
  else console.log(JSON.stringify(result, null, 2))
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const urlUp = (url) =>
  new Promise((resolve) => {
    const request = http.get(url, { timeout: 1000 }, (response) => {
      response.resume()
      resolve(true)
    })
    request.on('error', () => resolve(false))
    request.on('timeout', () => {
      request.destroy()
      resolve(false)
    })
  })

/** The file Electron will run for `args[0]`: the file itself, or a package's `main`. */
const entryFile = (target) => {
  const resolved = path.resolve(PROJECT_ROOT, target)
  if (!existsSync(resolved) || !statSync(resolved).isDirectory()) return resolved
  const pkg = JSON.parse(readFileSync(path.join(resolved, 'package.json'), 'utf8'))
  return path.join(resolved, pkg.main ?? 'index.js')
}

const start = async (flags) => {
  const options = startOptions(flags)
  const config = loadConfig()
  const existing = readState()
  if (existing && isAlive(existing.pid)) {
    fail(`Already driving the app (profile '${existing.profile}', ${existing.mode}). Run 'drive stop' first.`)
  }
  if (existing) rmSync(statePath(), { force: true })

  if (options.mode === 'dev') {
    if (options.build) fail("--build applies to the built app only. With --dev, the dev server rebuilds the renderer.")
    if (config.dev.url && !(await urlUp(config.dev.url))) {
      fail(`The renderer dev server is not up at ${config.dev.url}. Start it first, without letting it launch its own Electron.`)
    }
  } else {
    if (options.build) {
      if (!config.build) fail("--build needs a 'build' command in drive.config.json.")
      console.log(`Building (${config.build})...`)
      const built = spawnSync(config.build, { cwd: PROJECT_ROOT, stdio: 'inherit', shell: true })
      if (built.status !== 0) fail(`'${config.build}' failed.`)
    }
    const entry = entryFile(config.args[0] ?? '.')
    if (!existsSync(entry)) fail(`No built app: ${entry} does not exist. Run 'drive start --build'.`)
    const ageMinutes = Math.round((Date.now() - statSync(entry).mtimeMs) / 60000)
    console.log(`Using the build from ${ageMinutes} minute(s) ago. Pass --build to rebuild.`)
  }

  const dataDir = profileDir(options.profile)
  if (options.fresh) rmSync(dataDir, { recursive: true, force: true })
  mkdirSync(dataDir, { recursive: true })
  mkdirSync(driveRoot(), { recursive: true })

  const logFd = openSync(daemonLogPath(), 'w')
  const daemon = spawn(
    process.execPath,
    [path.join(here, 'daemon.mjs'), options.mode, options.profile, dataDir],
    {
      cwd: PROJECT_ROOT,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: { ...process.env, DRIVE_PROJECT_ROOT: PROJECT_ROOT }
    }
  )
  daemon.unref()

  console.log(`Starting (${options.mode}, profile '${options.profile}')...`)
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    if (readState()) break
    if (!isAlive(daemon.pid)) {
      console.error(readFileSync(daemonLogPath(), 'utf8'))
      fail('The driver failed to start the app (log above).')
    }
    await sleep(500)
  }
  if (!readState()) fail(`Timed out waiting for the app. See ${daemonLogPath()}.`)
  print(await send('status'))
}

/** The code argument, or stdin when it is '-'. */
const codeFrom = (positional) =>
  positional.length === 1 && positional[0] === '-' ? readFileSync(0, 'utf8') : positional.join(' ')

const run = async () => {
  const { command, positional, flags } = parseArgs(process.argv.slice(2))
  const need = (count, what) => {
    if (positional.length < count) fail(`Usage: drive ${command} ${what}`)
  }

  switch (command) {
    case 'start':
      return start(flags)
    case 'status': {
      const state = readState()
      if (!state || !isAlive(state.pid)) return print('Not running.')
      return print(await send('status'))
    }
    case 'stop': {
      const state = readState()
      if (!state || !isAlive(state.pid)) {
        rmSync(statePath(), { force: true })
        if (state?.electronPid && isAlive(state.electronPid)) {
          process.kill(state.electronPid, 'SIGKILL')
          return print('The daemon was gone but the app was not; killed it.')
        }
        return print('Not running.')
      }
      return print(await send('stop'))
    }
    case 'snapshot':
      return print(await send('snapshot'))
    case 'screenshot':
      return print(
        await send('screenshot', {
          out: typeof flags.out === 'string' ? path.resolve(flags.out) : undefined,
          selector: typeof flags.selector === 'string' ? flags.selector : undefined
        })
      )
    case 'click':
      need(1, '<target>')
      return print(await send('click', { target: positional[0] }))
    case 'fill':
      need(2, '<target> <text>')
      return print(await send('fill', { target: positional[0], text: positional.slice(1).join(' ') }))
    case 'select':
      need(2, '<target> <value|label>')
      return print(await send('select', { target: positional[0], value: positional.slice(1).join(' ') }))
    case 'press':
      need(1, '<key>')
      return print(await send('press', { key: positional[0] }))
    case 'wait':
      need(1, '<target>')
      return print(
        await send('wait', {
          target: positional[0],
          timeout: typeof flags.timeout === 'string' ? Number(flags.timeout) : undefined
        })
      )
    case 'eval':
      need(1, '<js>')
      return print(await send('eval', { code: codeFrom(positional) }))
    case 'main':
      need(1, '<js>')
      return print(await send('main', { code: codeFrom(positional) }))
    case 'logs':
      return print(await send('logs', { lines: typeof flags.lines === 'string' ? Number(flags.lines) : undefined }))
    case 'help':
    case '--help':
      return print(USAGE)
    default:
      return fail(`Unknown command '${command}'.\n\n${USAGE}`)
  }
}

run().catch((e) => fail(e.message))
