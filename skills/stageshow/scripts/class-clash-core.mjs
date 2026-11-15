// PostCSS owns CSS syntax (including nesting, comments, strings and at-rules).
// This checker compares class namespaces, not the full CSS cascade. Different
// explicit root scopes and CSS Modules are isolated; an unscoped class overlaps
// every scope with that class. Composed/overlapping scopes still need review.
export function splitSelectors(value) {
  const parts = []
  let start = 0, depth = 0, quote = null, escaped = false
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (escaped) { escaped = false; continue }
    if (char === '\\') { escaped = true; continue }
    if (quote) { if (char === quote) quote = null; continue }
    if (char === '"' || char === "'") { quote = char; continue }
    if (char === '(' || char === '[') depth++
    else if (char === ')' || char === ']') depth--
    else if (char === ',' && depth === 0) { parts.push(value.slice(start, i).trim()); start = i + 1 }
  }
  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

function withoutConditions(selector) {
  // :not() and :has() filter matches; their argument classes are not classes
  // being styled. Ignore those conditions conservatively when finding a root.
  let result = ''
  for (let i = 0; i < selector.length; i++) {
    const match = selector.slice(i).match(/^:(?:not|has)\(/)
    if (!match) { result += selector[i]; continue }
    i += match[0].length
    let depth = 1, quote = null
    for (; i < selector.length && depth; i++) {
      const char = selector[i]
      if (char === '\\') { i++; continue }
      if (quote) { if (char === quote) quote = null; continue }
      if (char === '"' || char === "'") quote = char
      else if (char === '(') depth++
      else if (char === ')') depth--
    }
    i--
  }
  return result
}

function unwrapAttributeWhere(selector) {
  // A single plain attribute does not branch. Unwrap it, then let the normal
  // attribute stripping below discard it; attribute values are not exclusive
  // namespace roots. Escapes, compounds and selector lists still need review.
  const simple = /^:where\(\s*(\[\s*-?[_a-zA-Z][\w-]*(?:\s*[~|^$*]?=\s*(?:"[^"\\\[\]]*"|'[^'\\\[\]]*'|-?[_a-zA-Z][\w-]*)(?:\s+[is])?)?\s*\])\s*\)/
  let result = '', attributeDepth = 0, quote = null
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]
    if (char === '\\') { result += selector.slice(i, i + 2); i++; continue }
    if (quote) { result += char; if (char === quote) quote = null; continue }
    if (char === '"' || char === "'") quote = char
    if (!attributeDepth && char === ':') {
      const match = selector.slice(i).match(simple)
      if (match) { result += match[1]; i += match[0].length - 1; continue }
    }
    if (char === '[') attributeDepth++
    else if (char === ']') attributeDepth--
    result += char
  }
  return result
}

export function classDefinitions(css, file, parse) {
  const root = parse(css, { from: file })
  const definitions = []
  const manual = []
  const selectorsFor = (node) => {
    if (!node || node.type === 'root') return ['']
    const parents = selectorsFor(node.parent)
    if (node.type === 'rule') {
      return parents.flatMap((parent) => splitSelectors(node.selector).map((selector) => selector.includes('&') ? selector.replaceAll('&', parent || ':root') : `${parent} ${selector}`.trim()))
    }
    if (node.type === 'atrule' && node.name.toLowerCase() === 'scope') {
      const match = node.params.match(/^\s*\(([^()]*)\)/)
      if (!match) { manual.push(`@scope at ${file}:${node.source.start.line} has a complex/implicit root; inspect its isolation`); return parents }
      return parents.flatMap((parent) => splitSelectors(match[1]).map((scope) => `${parent} ${scope}`.trim()))
    }
    return parents
  }
  root.walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return
    // A nesting-only block doesn't itself paint a selector.
    if (!rule.nodes.some((node) => node.type === 'decl')) return
    for (const selector of selectorsFor(rule)) {
      const stripped = withoutConditions(unwrapAttributeWhere(selector))
      const branch = stripped.search(/:(?:is|where)\(/)
      const scopedBranch = branch >= 0 && /[.#](-?[_a-zA-Z][\w-]*)/.test(stripped.slice(0, branch))
      if (/\\|:(?:global|local)\(/.test(stripped) || branch >= 0 && !scopedBranch) manual.push(`selector at ${file}:${rule.source.start.line} uses escapes or branching logic without a clear root; inspect namespace overlap: ${selector}`)
      // Quoted attribute values may contain dots that are not classes.
      const structural = stripped.replace(/\[[^\]]*\]/g, '')
      const classes = [...structural.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)]
      for (let i = 0; i < classes.length; i++) {
        const name = classes[i][1]
        if (name.startsWith('ss-')) continue
        const before = structural.slice(0, classes[i].index)
        const anchor = before.match(/[.#](-?[_a-zA-Z][\w-]*)/)?.[0] || ''
        definitions.push({ name, scope: /\.module\.css$/i.test(file) && !selector.includes(':global(') ? `module:${file}` : anchor, file, line: rule.source.start.line, selector })
      }
    }
  })
  return { definitions, manual: [...new Set(manual)] }
}

export function findClashes(definitions) {
  const groups = new Map()
  for (const definition of definitions) {
    const list = groups.get(definition.name) || []
    list.push(definition)
    groups.set(definition.name, list)
  }
  const findings = []
  for (const [name, group] of groups) {
    const overlaps = new Map()
    for (let a = 0; a < group.length; a++) for (let b = a + 1; b < group.length; b++) {
      const left = group[a], right = group[b]
      if (left.file === right.file) continue
      // Explicit stylesheet bundles are one component's cascade. They may
      // share selectors internally, but still collide with another bundle.
      if (left.owner && left.owner === right.owner) continue
      if (left.scope.startsWith('module:') || right.scope.startsWith('module:')) continue
      if (left.scope && right.scope && left.scope !== right.scope) continue
      for (const item of [left, right]) overlaps.set(`${item.file}:${item.line}`, item)
    }
    if (overlaps.size) findings.push({ name, definitions: [...overlaps.values()] })
  }
  return findings.sort((a, b) => a.name.localeCompare(b.name))
}
