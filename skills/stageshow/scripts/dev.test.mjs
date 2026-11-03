import test from 'node:test'
import assert from 'node:assert/strict'
import { devCommand } from './dev.mjs'

test('Node 20 on macOS uses Vite without portless', () => {
  const command = devCommand('darwin', ['--host', '127.0.0.1'], 20)
  assert.equal(command.named, false)
  assert.match(command.args[0], /vite/)
  assert.deepEqual(command.args.slice(-2), ['--host', '127.0.0.1'])
})

test('Node 24 on macOS uses local HTTP on an unprivileged port', { skip: Number(process.versions.node.split('.')[0]) < 24 }, () => {
  const command = devCommand('darwin', [], 24)
  assert.equal(command.named, true)
  assert.equal(command.env.PORTLESS_HTTPS, '0')
  assert.equal(command.env.PORTLESS_PORT, '1355')
  assert.equal(command.args[1], 'stageshow')
})

test('Windows uses Vite directly', () => {
  assert.equal(devCommand('win32', [], 24).named, false)
})
