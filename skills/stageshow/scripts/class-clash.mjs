// Classes defined by more than one demo's CSS. Two demos on one page that both
// define .cp-nav restyle each other, and whichever loads last wins.
//
//   node scripts/class-clash.mjs                 this repo's examples, showcase and site demos
//   node scripts/class-clash.mjs src/demos a.css  any folders or files in your project
//
// Checks namespaces, including nested CSS and @scope. It cannot prove that
// arbitrarily composed roots never overlap; inspect those on the host page.
import { readFileSync, statSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'
import { classDefinitions, findClashes } from './class-clash-core.mjs'

const args = process.argv.slice(2)
if (args.includes('--help')) {
  console.log('usage: node scripts/class-clash.mjs [--bundle directory] [directory|file.css ...]\nDefaults to examples/ and teaching/ when present. --bundle declares one component split across multiple stylesheets; collisions with other components are still checked. Requires postcss. Exit: 0 no overlap detected, 1 potential overlaps, 2 incomplete.')
  process.exit(0)
}
const find = (path) => {
  if (statSync(path).isFile()) return path.endsWith('.css') ? [resolve(path)] : []
  return readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
    if (entry.isSymbolicLink() || ['node_modules', '.git', 'dist', '.next'].includes(entry.name)) return []
    const child = join(path, entry.name)
    return entry.isDirectory() ? find(child) : entry.isFile() && entry.name.endsWith('.css') ? [resolve(child)] : []
  })
}
try {
  const bundles = [], paths = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bundle') {
      const dir = args[++i]
      if (!dir || dir.startsWith('--') || !statSync(dir).isDirectory()) throw new Error('--bundle needs an existing component directory')
      bundles.push(resolve(dir))
    } else if (args[i].startsWith('--')) throw new Error(`unknown option: ${args[i]}`)
    else paths.push(args[i])
  }
  const { default: postcss } = await import('postcss').catch(() => { throw new Error('PostCSS is missing; install the verification dependencies (npm install -D postcss).') })
  const inputs = paths.length ? paths : ['examples', 'teaching'].filter(existsSync)
  const files = [...new Set(inputs.flatMap(find))]
  if (!files.length) throw new Error('no CSS files found; pass the demo directories to inspect')
  const definitions = [], manual = []
  for (const file of files) {
    const result = classDefinitions(readFileSync(file, 'utf8'), file, postcss.parse)
    const owner = bundles.filter(dir => file.startsWith(`${dir}${sep}`)).sort((a, b) => b.length - a.length)[0]
    definitions.push(...result.definitions.map(definition => ({ ...definition, owner })))
    manual.push(...result.manual)
  }
  const clashes = findClashes(definitions)
  for (const clash of clashes) console.log(`.${clash.name}: ${clash.definitions.map((d) => `${d.file}:${d.line} (${d.selector})`).join('  ')}`)
  for (const line of manual) console.log(`manual: ${line}`)
  console.log(`class clash: ${manual.length ? 'inconclusive' : clashes.length ? 'potential overlaps' : 'no overlapping class namespaces detected'} (${files.length} CSS files, ${bundles.length} explicit bundles); composed scopes need host-page review`)
  process.exitCode = manual.length ? 2 : clashes.length ? 1 : 0
} catch (error) { console.error(`class clash: incomplete: ${error.message}`); process.exitCode = 2 }
