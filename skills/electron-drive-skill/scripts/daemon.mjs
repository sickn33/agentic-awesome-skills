/**
 * The long-lived half of the driver: launches the app through Playwright,
 * keeps it up between commands, and answers them over loopback HTTP.
 *
 * Started detached by `drive start`; never run by hand.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'

import {
  asFunctionBody,
  childEnv,
  daemonLogPath,
  loadConfig,
  PROJECT_ROOT,
  screenshotDir,
  statePath
} from './lib.mjs'

const [, , mode, profile, dataDir] = process.argv
const config = loadConfig()

const log = (message) => {
  // stdout is daemon.log (drive.mjs redirects it).
  console.log(`${new Date().toISOString()} ${message}`)
}

/** Recent console output from both processes, for `logs`. */
const output = []
const remember = (line) => {
  output.push(line)
  if (output.length > 500) output.shift()
}

let app
let electronPid

/**
 * The app's window, not DevTools. A dev build may open DevTools as a window of
 * its own, and it can be the first one to appear.
 */
const getPage = async (timeoutMs = 30_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const page = app.windows().find((candidate) => !candidate.url().startsWith('devtools://'))
    if (page) return page
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`No app window appeared within ${timeoutMs}ms.`)
}

const watchPage = (page) => {
  page.on('console', (message) => remember(`[renderer:${message.type()}] ${message.text()}`))
  page.on('pageerror', (error) => remember(`[renderer:pageerror] ${error.message}`))
}

const launch = async () => {
  // Both come from the project, not from this skill, so the skill can live
  // anywhere. Outside Electron, `require('electron')` is the binary's path.
  const projectRequire = createRequire(path.join(PROJECT_ROOT, 'package.json'))
  const load = (name) => {
    try {
      return projectRequire(name)
    } catch {
      return null
    }
  }
  const playwright = load('playwright-core') ?? load('playwright')
  if (!playwright) throw new Error(`playwright-core is not installed in ${PROJECT_ROOT}. Run: npm i -D playwright-core`)
  const electronPath = load('electron')
  if (!electronPath) throw new Error(`electron is not installed in ${PROJECT_ROOT}.`)

  const launchConfig = mode === 'dev' ? config.dev : config
  // --user-data-dir moves app.getPath('userData'), and with it localStorage,
  // IndexedDB, cookies and most apps' settings, into the scratch profile.
  const args = [...launchConfig.args, `--user-data-dir=${dataDir}`]
  log(`Launching ${mode}: electron ${args.join(' ')} (profile ${profile})`)
  app = await playwright._electron.launch({
    executablePath: electronPath,
    args,
    cwd: PROJECT_ROOT,
    env: childEnv(process.env, dataDir, mode, { ...config.env, ...(mode === 'dev' ? config.dev.env : {}) }),
    timeout: 90_000
  })

  const child = app.process()
  electronPid = child.pid
  const lines = (tag) => (chunk) =>
    String(chunk).split('\n').filter(Boolean).forEach((line) => remember(`[${tag}] ${line}`))
  child.stdout?.on('data', lines('main'))
  child.stderr?.on('data', lines('main:err'))
  app.on('window', watchPage)
  app.on('close', () => {
    log('The app exited.')
    remember('[driver] the app exited')
  })

  const page = await getPage(90_000)
  watchPage(page)
  await page.waitForLoadState('domcontentloaded')
  log(`Window up: ${await page.title()} (${page.url()})`)
}

const isRunning = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const appExited = () => electronPid !== undefined && !isRunning(electronPid)

const waitForExit = async (pid, ms) => {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    if (!isRunning(pid)) return true
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return !isRunning(pid)
}

/** Every descendant of `pid`, deepest first, via `pgrep -P`. POSIX only. */
const descendants = (pid) => {
  if (process.platform === 'win32') return []
  let children = []
  try {
    children = execFileSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map(Number)
  } catch {
    return []
  }
  return children.flatMap((child) => [...descendants(child), child])
}

const within = (ms, promise) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(resolve, ms))])

/**
 * End the app, and say how. `app.quit()` first, as a user quitting would; then
 * Playwright's close; then SIGKILL on the whole tree, for apps whose quit
 * handlers hang or that ignore SIGTERM.
 */
const stop = async () => {
  if (!electronPid || !isRunning(electronPid)) return 'already exited'
  const pid = electronPid
  const tree = descendants(pid)

  // The quit can tear down the connection before the evaluate returns.
  await within(1000, app.evaluate(({ app: electronApp }) => electronApp.quit())).catch(() => {})
  if (await waitForExit(pid, 5000)) return 'quit via app.quit()'

  await within(3000, app.close()).catch(() => {})
  if (await waitForExit(pid, 2000)) return 'closed by Playwright after app.quit() did not exit within 5s'

  for (const victim of [...tree, pid]) {
    try {
      process.kill(victim, 'SIGKILL')
    } catch {
      // Already gone.
    }
  }
  await waitForExit(pid, 2000)
  return 'SIGKILLed (process tree) after app.quit() and Playwright close both failed'
}

const handlers = {
  async status() {
    const page = appExited() ? null : await getPage(2000).catch(() => null)
    return {
      mode,
      profile,
      dataDir,
      electronPid,
      running: !appExited(),
      window: page ? { title: await page.title(), url: page.url() } : null
    }
  },

  async snapshot() {
    const page = await getPage()
    return page.locator('body').ariaSnapshot()
  },

  async screenshot({ out, selector }) {
    const page = await getPage()
    mkdirSync(screenshotDir(), { recursive: true })
    const file = out ?? path.join(screenshotDir(), `${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
    if (selector) await page.locator(selector).first().screenshot({ path: file })
    else await page.screenshot({ path: file })
    return file
  },

  async click({ target }) {
    const page = await getPage()
    await page.locator(target).first().click({ timeout: 10_000 })
    return `clicked ${target}`
  },

  async fill({ target, text }) {
    const page = await getPage()
    await page.locator(target).first().fill(text, { timeout: 10_000 })
    return `filled ${target}`
  },

  async select({ target, value }) {
    const page = await getPage()
    // A string matches an option's value or its visible label.
    const chosen = await page.locator(target).first().selectOption(value, { timeout: 10_000 })
    return `selected ${chosen.join(', ')} in ${target}`
  },

  async press({ key }) {
    const page = await getPage()
    await page.keyboard.press(key)
    return `pressed ${key}`
  },

  async wait({ target, timeout }) {
    const page = await getPage()
    await page.locator(target).first().waitFor({ timeout: timeout ?? 10_000 })
    return `found ${target}`
  },

  async eval({ code }) {
    const page = await getPage()
    // CDP evaluation, so the page's CSP (no 'unsafe-eval') does not apply to it.
    return page.evaluate(`(async () => { ${asFunctionBody(code)} })()`)
  },

  async main({ code }) {
    // Playwright takes a string as an *expression*, so a function written as a
    // string comes back as the function, not its result. The body is passed as
    // an argument instead and compiled in main, where there is no CSP. In scope:
    // `electron` (the main process's module) and Node's globals (`process`,
    // `Buffer`); `require` is not.
    return app.evaluate(async (electron, body) => {
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
      return new AsyncFunction('electron', body)(electron)
    }, asFunctionBody(code))
  },

  async logs({ lines }) {
    const count = lines ?? 60
    let fileTail = ''
    if (config.logFile) {
      const file = path.resolve(dataDir, config.logFile)
      const tail = existsSync(file)
        ? readFileSync(file, 'utf8').split('\n').slice(-count).join('\n')
        : '(not written yet)'
      fileTail = `--- ${file} (last ${count}) ---\n${tail}\n`
    }
    return `${fileTail}--- console (last ${count}) ---\n${output.slice(-count).join('\n')}`
  }
}

const main = async () => {
  const token = randomBytes(24).toString('hex')

  try {
    await launch()
  } catch (e) {
    log(`Launch failed: ${e?.stack ?? e}`)
    if (electronPid) await stop().catch(() => {})
    process.exit(1)
  }

  const server = http.createServer((request, response) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', async () => {
      const reply = (status, payload) => {
        response.writeHead(status, { 'content-type': 'application/json' })
        response.end(JSON.stringify(payload))
      }
      let parsed
      try {
        parsed = JSON.parse(body)
      } catch {
        reply(400, { ok: false, error: 'Bad request.' })
        return
      }
      if (parsed.token !== token) {
        reply(403, { ok: false, error: 'Bad token.' })
        return
      }

      if (parsed.command === 'stop') {
        const how = await stop()
        log(`Stopped: ${how}`)
        reply(200, { ok: true, result: how })
        rmSync(statePath(), { force: true })
        server.close()
        setTimeout(() => process.exit(0), 100)
        return
      }

      const handler = handlers[parsed.command ?? '']
      if (!handler) {
        reply(404, { ok: false, error: `Unknown command '${parsed.command}'.` })
        return
      }
      if (parsed.command !== 'status' && parsed.command !== 'logs' && appExited()) {
        reply(409, {
          ok: false,
          error: "The app is not running (it exited or crashed). Run 'drive logs', then 'drive stop' and start again."
        })
        return
      }
      try {
        reply(200, { ok: true, result: await handler(parsed.args ?? {}) })
      } catch (e) {
        reply(200, { ok: false, error: e?.message ?? String(e) })
      }
    })
  })

  server.listen(0, '127.0.0.1', () => {
    const state = {
      pid: process.pid,
      port: server.address().port,
      token,
      mode,
      profile,
      dataDir,
      electronPid,
      startedAt: new Date().toISOString()
    }
    writeFileSync(statePath(), JSON.stringify(state, null, 2), { mode: 0o600 })
    log(`Listening on 127.0.0.1:${state.port}`)
  })

  const shutdown = async () => {
    await stop().catch(() => {})
    rmSync(statePath(), { force: true })
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

log(`Daemon ${process.pid} starting; log at ${daemonLogPath()}`)
main()
