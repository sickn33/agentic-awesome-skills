#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { constants } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function packageBin(name) {
  const directory = resolve(root, 'node_modules', name)
  const metadata = JSON.parse(readFileSync(resolve(directory, 'package.json'), 'utf8'))
  const bin = typeof metadata.bin === 'string' ? metadata.bin : metadata.bin?.[name]
  if (!bin) throw new Error(`${name} does not declare its CLI`)
  const path = resolve(directory, bin)
  if (!existsSync(path)) throw new Error(`${name}'s CLI is missing; run npm install in ${root}`)
  return path
}

export function devCommand(platform = process.platform, extra = []) {
  const vite = packageBin('vite')
  const args = ['playground', '--config', 'playground/vite.config.ts', ...extra]
  if (platform === 'darwin' || platform === 'linux') {
    let portless
    try { portless = packageBin('portless') } catch {
      throw new Error('Portless is unavailable. Run npm install --include=optional in this folder on macOS or Linux.')
    }
    // Portless recognizes the basename "vite" and injects its assigned port.
    // Use the local POSIX shim rather than an unrelated executable on PATH.
    const shim = resolve(root, 'node_modules', '.bin', 'vite')
    if (!existsSync(shim)) throw new Error('The local Vite launcher is missing; run npm install in this folder.')
    return { command: process.execPath, args: [portless, 'stageshow', shim, ...args], cwd: root, named: true }
  }
  // Node runs the actual JS bin, so Windows needs neither a .cmd shim nor a shell.
  return { command: process.execPath, args: [vite, ...args], cwd: root, named: false }
}

function main() {
  let command
  try { command = devCommand(process.platform, process.argv.slice(2)) } catch (error) {
    console.error(`Stageshow: ${error.message}`)
    process.exitCode = 1
    return
  }
  if (!command.named) console.log('Stageshow: starting Vite directly. Open the local URL Vite prints below.')
  const child = spawn(command.command, command.args, { cwd: command.cwd, stdio: 'inherit', shell: false })
  const handlers = new Map(['SIGINT', 'SIGTERM'].map((signal) => [signal, () => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  }]))
  for (const [signal, handler] of handlers) process.on(signal, handler)
  const cleanup = () => { for (const [signal, handler] of handlers) process.removeListener(signal, handler) }
  child.once('error', (error) => {
    cleanup()
    console.error(`Stageshow: could not start the dev server: ${error.message}`)
    process.exitCode = 1
  })
  child.once('close', (code, signal) => {
    cleanup()
    process.exitCode = typeof code === 'number' && code >= 0 ? code : signal ? 128 + (constants.signals[signal] ?? 1) : 1
  })
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main()
