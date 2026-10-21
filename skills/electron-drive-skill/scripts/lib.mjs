/**
 * The pure half of the driver: project discovery, config, argument parsing,
 * paths and the state file. No Playwright and no Electron here, so it can be
 * tested without launching anything (`node --test scripts/`).
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, lstatSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

/** The nearest directory at or above `from` with a package.json. */
export const findProjectRoot = (from = process.cwd()) => {
  let dir = path.resolve(from)
  for (;;) {
    if (existsSync(path.join(dir, 'package.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error(`No package.json at or above ${from}. Run the driver from inside your Electron project.`)
    dir = parent
  }
}

export const PROJECT_ROOT = process.env.DRIVE_PROJECT_ROOT
  ? path.resolve(process.env.DRIVE_PROJECT_ROOT)
  : findProjectRoot()

/**
 * `drive.config.json` at the project root, over the defaults. Every field is
 * optional; with no file at all, `start` runs `electron .` on the last build.
 */
export const loadConfig = (root = PROJECT_ROOT) => {
  const file = path.join(root, 'drive.config.json')
  let config = {}
  if (existsSync(file)) {
    try {
      config = JSON.parse(readFileSync(file, 'utf8'))
    } catch (e) {
      throw new Error(`${file} is not valid JSON: ${e.message}`)
    }
  }
  return {
    build: config.build ?? null,
    args: config.args ?? ['.'],
    env: config.env ?? {},
    logFile: config.logFile ?? null,
    dev: {
      args: config.dev?.args ?? config.args ?? ['.'],
      env: config.dev?.env ?? {},
      url: config.dev?.url ?? null
    }
  }
}

/**
 * Everything the driver owns lives under here, never in the real profile. One
 * directory per project, so two apps never share a scratch profile.
 */
const assertPrivateStatePath = (target) => {
  const stat = lstatSync(target)
  if (stat.isSymbolicLink()) throw new Error('Driver state symlink')
  if (process.platform === 'win32') {
    // Query Windows ACLs, not POSIX mode bits (which do not enforce privacy there).
    const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    const script = "$ErrorActionPreference='Stop'; $sid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $allowed=@($sid,'S-1-5-18','S-1-5-32-544'); $acl=Get-Acl -LiteralPath $env:AAS_DRIVER_STATE_PATH; if ($allowed -notcontains $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value) { throw 'Untrusted state owner' }; foreach ($rule in $acl.Access) { if ($rule.AccessControlType -eq 'Allow' -and ($rule.PropagationFlags -band [Security.AccessControl.PropagationFlags]::InheritOnly) -eq 0 -and $allowed -notcontains $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value) { throw 'Shared state ACL' } }"
    execFileSync(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], {
      env: { ...process.env, AAS_DRIVER_STATE_PATH: target }, timeout: 10000, stdio: 'pipe'
    })
  } else if ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) {
    throw new Error('Driver state must be owned and private')
  }
}

export const driveRoot = (root = PROJECT_ROOT) => {
  const hash = createHash('sha256').update(root).digest('hex').slice(0, 16)
  const target = path.resolve(process.env.DRIVE_ROOT || path.join(homedir(), '.electron-drive', hash))
  // Refuse pre-existing redirected or shared state before reading/writing tokens.
  let current = path.parse(target).root
  for (const part of target.slice(current.length).split(path.sep)) {
    current = path.join(current, part)
    try { if (lstatSync(current).isSymbolicLink()) throw new Error('Driver state symlink') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  mkdirSync(target, { recursive: true, mode: 0o700 })
  const stat = lstatSync(target)
  if (!stat.isDirectory()) throw new Error('Driver state must be a directory')
  assertPrivateStatePath(target)
  return target
}

export const statePath = () => path.join(driveRoot(), 'daemon.json')
export const daemonLogPath = () => path.join(driveRoot(), 'daemon.log')
export const screenshotDir = () => path.join(driveRoot(), 'screenshots')

/**
 * A profile name becomes a directory name, so it is restricted to something
 * that cannot climb out of `profiles/`.
 */
export const profileDir = (profile) => {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(profile)) {
    throw new Error(`Invalid profile name '${profile}': letters, digits, '-' and '_' only.`)
  }
  return path.join(driveRoot(), 'profiles', profile)
}

export const readState = () => {
  const file = statePath()
  if (!existsSync(file)) return null
  try {
    const stat = lstatSync(file)
    if (!stat.isFile()) throw new Error('Unsafe daemon state')
    assertPrivateStatePath(file)
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

export const isAlive = (pid) => {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return e?.code === 'EPERM'
  }
}

const BOOLEAN_FLAGS = new Set(['dev', 'build', 'fresh'])

/**
 * `drive <command> [positional...] [--flag [value]]`.
 *
 * Flags known to be boolean take no value, so `start --dev --fresh` is two
 * flags rather than `dev = '--fresh'`. Everything after a bare `--` is
 * positional, for JavaScript that itself starts with dashes.
 */
export const parseArgs = (argv) => {
  const [command = 'help', ...rest] = argv
  const positional = []
  const flags = {}

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i]
    if (arg === '--') {
      positional.push(...rest.slice(i + 1))
      break
    }
    if (arg.startsWith('--')) {
      const name = arg.slice(2)
      const next = rest[i + 1]
      if (BOOLEAN_FLAGS.has(name) || next === undefined || next.startsWith('--')) {
        flags[name] = true
      } else {
        flags[name] = next
        i += 1
      }
    } else {
      positional.push(arg)
    }
  }

  return { command, positional, flags }
}

export const startOptions = (flags) => ({
  mode: flags.dev ? 'dev' : 'built',
  build: flags.build === true,
  profile: typeof flags.profile === 'string' ? flags.profile : 'default',
  fresh: flags.fresh === true
})

/**
 * The child's environment: the caller's, minus the variables that break a
 * launch, plus the config's, where `{profile}` becomes the scratch profile
 * directory.
 *
 * `ELECTRON_RUN_AS_NODE=1` makes Electron start as plain Node, where `app` is
 * undefined and nothing works, and some shells set it.
 */
export const childEnv = (base, dataDir, mode, extra) => {
  const env = { ...base }
  delete env.ELECTRON_RUN_AS_NODE
  if (mode === 'dev') env.NODE_ENV = 'development'
  else delete env.NODE_ENV
  for (const [key, value] of Object.entries(extra)) {
    env[key] = String(value).replaceAll('{profile}', dataDir)
  }
  return env
}

/**
 * JavaScript from the command line, made into an async function body: a bare
 * expression is returned, anything with its own `return` is used as written.
 */
export const asFunctionBody = (code) => (/\breturn\b/.test(code) ? code : `return (${code})`)
