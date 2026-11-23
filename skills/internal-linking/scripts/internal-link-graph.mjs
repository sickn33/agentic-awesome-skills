#!/usr/bin/env node
// Usage: SITE=https://deployfast.dev node scripts/internal-link-graph.mjs > seo/internal-link-graph.json
// Before editing, write to seo/internal-link-graph.before.json instead, so the after run does not overwrite it.
import { readFileSync, readdirSync, lstatSync } from 'node:fs'
import { join, sep } from 'node:path'

const ROOTS = ['app', 'pages', 'content', 'src', 'components']
const EXT = /\.(mdx?|[jt]sx?|astro)$/
// Files whose links appear on every page (nav, footer, layouts). Counted as sitewide, not contextual.
const CHROME = /(layout\.[jt]sx?$|(nav|header|footer|sidebar)[^/]*\.[jt]sx?$)/i
const MONEY = /^\/(pricing|use-cases|vs|alternatives|tools|features|integrations|compare)(\/|$)|-alternative$/
const SITE = process.env.SITE ? new URL(process.env.SITE).origin : null

const walk = (dir, out = []) => {
  let names
  try {
    if (!lstatSync(dir).isDirectory()) return out
    names = readdirSync(dir)
  } catch (error) {
    if (error.code === 'ENOENT') return out
    throw error
  }
  for (const n of names) {
    if (n === 'node_modules' || n.startsWith('.')) continue
    const p = join(dir, n)
    const entry = lstatSync(p)
    if (entry.isDirectory()) walk(p, out)
    else if (entry.isFile() && EXT.test(n)) out.push(p)
  }
  return out
}
const norm = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p)

function routeOf(file) {
  const f = file.split(sep).join('/')
  let m
  if ((m = f.match(/^(?:src\/)?content\/(.+)\.mdx?$/))) return norm('/' + m[1].replace(/(^|\/)index$/, ''))
  if ((m = f.match(/^(?:src\/)?app\/(?:(.*)\/)?page\.[jt]sx?$/))) {
    const r = (m[1] ?? '').replace(/\([^)]*\)\/?/g, '')
    return r.includes('[') ? null : norm('/' + r) // dynamic templates are covered by their content files
  }
  if ((m = f.match(/^(?:src\/)?pages\/(.+)\.(?:[jt]sx?|astro|mdx?)$/))) {
    if (/^(_|api\/)/.test(m[1]) || m[1].includes('[')) return null
    return norm('/' + m[1].replace(/(^|\/)index$/, ''))
  }
  return null
}

const pages = new Map(), inbound = new Map(), sitewide = new Set()
for (const file of [...new Set(ROOTS.flatMap((r) => walk(r)))]) {
  const text = readFileSync(file, 'utf8')
  const links = new Set()
  const linkPatterns = [/\]\(([^)\s"'#?]+)/g, /href=\{?\s*["'`]([^"'`#?\s]+)/g]
  for (const pattern of linkPatterns) {
    for (const match of text.matchAll(pattern)) {
      const target = match[1]
      if (target.includes('${')) continue
      if (target.startsWith('/') && !target.startsWith('//')) {
        links.add(norm(target))
      } else if (SITE && URL.canParse(target)) {
        const absolute = new URL(target)
        if (absolute.origin === SITE) links.add(norm(absolute.pathname))
      }
    }
  }
  if (CHROME.test(file)) { links.forEach((l) => sitewide.add(l)); continue }
  const route = routeOf(file)
  if (!route) continue
  pages.set(route, file)
  for (const l of links) if (l !== route) (inbound.get(l) ?? inbound.set(l, new Set()).get(l)).add(route)
}

const rows = [...pages].map(([route, file]) => ({
  route, file,
  contextualInbound: inbound.get(route)?.size ?? 0,
  linkedFrom: [...(inbound.get(route) ?? [])],
  inNavOrFooter: sitewide.has(route),
  money: MONEY.test(route),
})).sort((a, b) => a.contextualInbound - b.contextualInbound)

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  orphanMoneyPages: rows.filter((r) => r.money && r.contextualInbound < 3).map((r) => r.route),
  pages: rows,
}, null, 2))
