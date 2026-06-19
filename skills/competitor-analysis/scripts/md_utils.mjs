// Shared markdown parsing helpers for competitor-analysis scripts.
// Used by compile_report.mjs, merge_partials.mjs, and capture_screenshots.mjs.

// Parses YAML-ish frontmatter delimited by `---` lines.
// Returns an object of fields, or null if no frontmatter delimiter is found.
export function parseFrontmatter(content) {
  content = content.replace(/\r\n/g, '\n'); // tolerate CRLF — anchors below assume LF
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (k && v) fields[k] = v;
    }
  }
  return fields;
}

// Returns the body text after the closing `---` of the frontmatter, trimmed.
// If no frontmatter is present, returns the full content trimmed — so callers
// that don't gate on parseFrontmatter still get usable text.
export function parseBody(content) {
  content = content.replace(/\r\n/g, '\n'); // tolerate CRLF — anchors below assume LF
  const m = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)/);
  return m ? m[1].trim() : content.trim();
}

// Splits a markdown body into sections keyed by `## Heading` line.
// Content before the first `## ` is dropped (matches existing behavior).
export function parseSections(body) {
  const sections = {};
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  let currentKey = null;
  let buffer = [];
  for (const line of lines) {
    const m = line.match(/^## (.+)$/);
    if (m) {
      if (currentKey !== null) sections[currentKey] = buffer.join('\n').trim();
      currentKey = m[1].trim();
      buffer = [];
    } else if (currentKey !== null) {
      buffer.push(line);
    }
  }
  if (currentKey !== null) sections[currentKey] = buffer.join('\n').trim();
  return sections;
}
