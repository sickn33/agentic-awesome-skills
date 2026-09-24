// node --test scripts/
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

const project = mkdtempSync(path.join(tmpdir(), 'drive-test-'))
writeFileSync(path.join(project, 'package.json'), '{}')
process.env.DRIVE_PROJECT_ROOT = project
delete process.env.DRIVE_ROOT
const lib = await import('./lib.mjs')

test('parses commands, valued and boolean flags, and --', () => {
  assert.deepEqual(lib.parseArgs(['fill', 'role=textbox', 'hello', 'world']), {
    command: 'fill',
    positional: ['role=textbox', 'hello', 'world'],
    flags: {}
  })
  assert.deepEqual(lib.parseArgs(['start', '--dev', '--profile', 'x', '--fresh']).flags, {
    dev: true,
    profile: 'x',
    fresh: true
  })
  assert.deepEqual(lib.parseArgs(['eval', '--', '--x', '1']).positional, ['--x', '1'])
  assert.equal(lib.parseArgs([]).command, 'help')
})

test('keeps profiles inside the driver root', () => {
  assert.ok(lib.profileDir('default').startsWith(lib.driveRoot()))
  for (const bad of ['../../Library', 'a/b', '']) assert.throws(() => lib.profileDir(bad), /Invalid profile/)
})

test('child env drops ELECTRON_RUN_AS_NODE and fills {profile}', () => {
  const env = lib.childEnv({ ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'test', KEEP: 'me' }, '/scratch', 'built', {
    APP_DATA: '{profile}/data'
  })
  assert.deepEqual(env, { KEEP: 'me', APP_DATA: '/scratch/data' })
  assert.equal(lib.childEnv({}, '/s', 'dev', {}).NODE_ENV, 'development')
})

test('config defaults to electron . with no file', () => {
  assert.deepEqual(lib.loadConfig(project).args, ['.'])
  assert.deepEqual(lib.loadConfig(project).dev.args, ['.'])
})

test('a malformed config names the file', () => {
  const broken = mkdtempSync(path.join(tmpdir(), 'drive-test-'))
  writeFileSync(path.join(broken, 'drive.config.json'), '{ "args": [".",] }')
  assert.throws(() => lib.loadConfig(broken), /drive\.config\.json is not valid JSON/)
})

test('wraps bare expressions, keeps bodies with return', () => {
  assert.equal(lib.asFunctionBody('1 + 1'), 'return (1 + 1)')
  assert.equal(lib.asFunctionBody('return 2'), 'return 2')
})
