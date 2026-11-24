import { categorize } from './a11y.js';
import { describeDependency, type DependencyChange } from './deps.js';
import { onlyEffects } from './elements.js';
import { captureLabel, describeCapture, flowLabel, notCheckedNotice, notCheckedReason, type CaptureResult, type Report, type SideTiming, type Timings } from './report.js';
import { componentLabel } from './components.js';
import { causeText, componentFindings, effectLines, flowFindings, hasStateChanges, isShownChange, measurements, pixelOnlyAreas, verdict, type EffectLine } from './verdict.js';

export { changeText } from './verdict.js';

export const MAX_COMMENT_LENGTH = 65000;

export function stickyMarker(id: string): string {
  return `<!-- ui-diff:sticky id=${id} -->`;
}

const PICK_RE = /^\s*[-*] \[([ xX])\][^\n]*<!-- ui-diff-pick:([^ ]+) -->/gm;

/** Keys of variant checkboxes that reviewers ticked in a previous version of the comment. */
export function extractPicks(body: string | undefined): Set<string> {
  const picks = new Set<string>();
  if (!body) return picks;
  for (const m of body.matchAll(PICK_RE)) if (m[1].toLowerCase() === 'x') picks.add(m[2]);
  return picks;
}

export function code(text: string): string {
  const clean = text.replace(/\r?\n/g, ' ');
  return clean.includes('`') ? `\`\` ${clean} \`\`` : `\`${clean}\``;
}

function cell(text: string): string {
  return text.replace(/\|/g, '\\|');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Escapes text placed in markdown prose (quotes stay readable). */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** "/ (all 4)" or "/ desktop/light, mobile/light" from labels shaped "<route> <viewport>/<theme>". */
export function compressWhere(labels: string[], totals: Map<string, number>): string {
  const byRoute = new Map<string, string[]>();
  for (const label of labels) {
    const i = label.lastIndexOf(' ');
    const route = i > 0 ? label.slice(0, i) : label;
    byRoute.set(route, [...(byRoute.get(route) ?? []), i > 0 ? label.slice(i + 1) : '']);
  }
  return [...byRoute]
    .map(([route, where]) => {
      const total = totals.get(route) ?? 0;
      if (total > 1 && where.length >= total) return `${code(route)} (all ${total})`;
      return `${code(route)} ${where.filter(Boolean).join(', ')}`.trim();
    })
    .join('; ');
}

function captureHeading(c: CaptureResult, themes: number): string {
  return `**${code(c.route.path)}** · ${c.viewport}${themes > 1 || c.theme !== 'light' ? ` · ${c.theme}` : ''}${c.flow ? ` · ${escapeText(flowLabel(c.flow))}` : ''}${c.component ? ` · ${escapeText(componentLabel(c.component))}` : ''}`;
}

function imagesOn(opts: RenderOptions): boolean {
  return opts.images !== false;
}

function img(opts: RenderOptions, src: string, alt: string, width?: number): string {
  if (!imagesOn(opts)) return `_${escapeHtml(alt)} — image not uploaded_`;
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${width ? ` width="${width}"` : ''}>`;
}

export interface RenderOptions {
  id: string;
  title: string;
  link: (relPath: string) => string;
  summary?: string;
  previousBody?: string;
  storageNote?: string;
  showUnchanged?: boolean;
  maxLength?: number;
  /** Rendering tiers: 0 = everything, higher drops detail to fit the size limit. */
  compact?: number;
  /** False for text-only comments (nothing uploaded). */
  images?: boolean;
}

function sideLabel(side: Report['base']): string {
  return side.includesUncommitted ? `${side.label} + uncommitted changes` : side.label;
}

function elementLabel(name: string, selector: string): string {
  return name === selector || selector.length > 40 ? code(name) : `${code(name)} (${code(selector)})`;
}

const MEASURED_VISIBLE = 8;

/**
 * Measured changes grouped by route: element first, then property old → new, biggest first, the
 * same change on several captures once with where it happened when that is not everywhere.
 */
function measuredSection(report: Report, opts: RenderOptions): string[] {
  const routes = measurements(report).filter((r) => r.rows.length || r.unverified.size || r.component?.root);
  if (routes.length === 0) return [];
  const compact = opts.compact ?? 0;
  const out = ['#### Measured changes', ''];
  for (const r of routes) {
    if (r.component) out.push(`**${escapeText(componentLabel(r.component))}** · ${code(r.route)}${r.captures[0].component?.flow ? ` · ${escapeText(flowLabel(r.captures[0].component.flow))}` : ''}${r.component.root ? ` · ${escapeText(r.component.root)}` : ''}`, '');
    else out.push(`**${code(r.route)}**${r.flow ? ` · ${escapeText(flowLabel(r.flow))}` : ''}`, '');
    const line = (row: (typeof r.rows)[number]): string[] => {
      const lines = [`- ${elementLabel(row.name, row.selector)}${row.state ? ` · ${row.state}` : ''}: ${escapeText(row.text)} — ${row.where}`];
      const effects = effectLines(row);
      const text = (e: EffectLine) => `  - ${e.element ? `${elementLabel(e.element.name, e.element.selector)}: ` : ''}${escapeText(e.text)}`;
      const own = effects.filter((e) => !e.element);
      const others = effects.filter((e) => e.element);
      lines.push(...own.map(text));
      // Effects on other elements are always collapsed; the summary says how many.
      const count = `${others.length} effect${others.length === 1 ? '' : 's'} on other elements`;
      if (others.length && compact < 2) lines.push(`  <details><summary>${count}</summary>`, '', ...others.map(text), '', '  </details>', '');
      else if (others.length) lines.push(`  - …and ${count} in \`report.json\``);
      return lines;
    };
    const visible = compact >= 2 ? 3 : MEASURED_VISIBLE;
    out.push(...r.rows.slice(0, visible).flatMap(line));
    if (r.rows.length > visible && compact < 2) {
      out.push('', `<details><summary>${r.rows.length - visible} more measured change${r.rows.length - visible === 1 ? '' : 's'}</summary>`, '', ...r.rows.slice(visible).flatMap(line), '', '</details>');
    } else if (r.rows.length > visible) {
      out.push(`- …and ${r.rows.length - visible} more in \`report.json\``);
    }
    if (r.rows.length === 0) out.push(r.component ? '- no measured change inside it' : '- none verified');
    const repeats = r.rows.filter((row) => row.repeat).length;
    if (repeats) out.push('', `<sub>${repeats === r.rows.length ? 'All' : repeats} also listed under ${code(r.route)}, counted once.</sub>`);
    const omitted = r.captures.reduce((n, c) => n + (c.styleDiff!.omitted ?? 0), 0);
    if (omitted) out.push('', `<sub>${omitted} smaller change${omitted === 1 ? '' : 's'} left out (styleDiff.maxChanges).</sub>`);
    if (r.unverified.size) {
      const list = [...r.unverified].slice(0, 5).map(([text, why]) => `${text} (${why})`).join('; ');
      out.push('', `<sub>Unverified (not matched confidently, or no changed pixels in their area): ${escapeText(list)}${r.unverified.size > 5 ? `; +${r.unverified.size - 5} more in report.json` : ''}</sub>`);
    }
    out.push('');
  }
  return out;
}

/** Flows that stop on one side only: what a reviewer can no longer (or can now) do. */
function flowsSection(report: Report): string[] {
  const findings = flowFindings(report);
  if (findings.length === 0) return [];
  return ['#### Flows', '', ...findings.map((f) => `- ${escapeText(f.text)} — ${f.where}`), ''];
}

/** Components found on one side only, or not comparable there, with a crop of the side that has them. */
function componentsSection(report: Report, opts: RenderOptions): string[] {
  const findings = componentFindings(report);
  if (findings.length === 0) return [];
  const out = ['#### Components', ''];
  for (const f of findings) {
    out.push(`- ${escapeText(f.text)} — ${f.where}`);
    if (f.images.length && (opts.compact ?? 0) < 3) out.push('', img(opts, opts.link(f.images[0]), f.text), '');
  }
  return [...out, ''];
}

/** Changed areas that no measured change explains, after the images. */
function pixelOnlySection(report: Report, opts: RenderOptions): string[] {
  const areas = pixelOnlyAreas(report);
  if (areas.length === 0) return [];
  const limit = (opts.compact ?? 0) >= 2 ? 5 : 20;
  const lines = areas.slice(0, limit).map((a) => {
    const what = [a.element && `inside ${code(a.element)}`, a.note && escapeText(a.note)].filter(Boolean).join(': ') || 'no element explains it';
    return `- ${code(captureLabel(a.capture, report.themes.length))} ${a.box.width}×${a.box.height}px at ${a.box.x},${a.box.y} — ${what}`;
  });
  if (areas.length > limit) lines.push(`- …and ${areas.length - limit} more in \`report.json\``);
  return ['#### Pixel changes with no measured change', '', ...lines, ''];
}

/** One line under a zoomed crop: what the changed areas inside it are. */
function focusCaption(c: CaptureResult, index: number): string | undefined {
  const box = c.diff?.focusBoxes?.[index];
  if (!box || !c.styleDiff) return undefined;
  const scale = c.diff!.scale;
  const parts: string[] = [];
  for (const r of c.styleDiff.regions) {
    const area = { x: r.region.x / scale, y: r.region.y / scale, width: r.region.width / scale, height: r.region.height / scale };
    if (area.x >= box.x + box.width || box.x >= area.x + area.width || area.y >= box.y + box.height || box.y >= area.y + area.height) continue;
    const touching = r.changes.map((i) => c.styleDiff!.changes[i]).filter((x) => x.verified !== false);
    // Name what was changed, not what moved because of it.
    const first = touching.find((x) => !onlyEffects(x)) ?? touching[0];
    if (first) parts.push(`${first.name}: ${causeText(first)}`);
    else if (r.element) parts.push(`${r.element.name}: ${r.note}`);
    else if (r.note) parts.push(r.note);
  }
  const unique = [...new Set(parts)];
  if (unique.length === 0) return undefined;
  return `<sub>${escapeText(unique.slice(0, 2).join('; '))}${unique.length > 2 ? ` (+${unique.length - 2} more)` : ''}</sub>`;
}

function imagesSection(report: Report, captures: CaptureResult[], opts: RenderOptions): string[] {
  const out: string[] = [];
  const themes = report.themes.length;
  for (const c of captures) {
    const statesOnly = !isShownChange(c);
    out.push(`${captureHeading(c, themes)} — ${statesOnly ? 'no change in the default state' : describeCapture(c)}`);
    if (c.urls.head) out.push(`<sub>head: ${c.urls.head}</sub>`);
    out.push('');
    const alt = `${captureLabel(c, themes)}: before, after and highlighted diff`;
    if (statesOnly) {
      // Only hover or focus changed: the pairs below are the whole story.
    } else if (c.images.focus.length && (opts.compact ?? 0) < 3) {
      c.images.focus.forEach((f, i) => {
        const pair = c.images.pairs?.[i];
        const blink = c.images.blinks?.[i];
        // The still pair comes first; the blinking GIF and the diff overlay stay folded away.
        out.push(pair ? img(opts, opts.link(pair), `${captureLabel(c, themes)}: base and head side by side, changed area ${i + 1} outlined`) : img(opts, opts.link(f), `${alt} (zoomed)`), '');
        const caption = focusCaption(c, i);
        if (caption) out.push(caption, '');
        if (pair && (opts.compact ?? 0) < 2) {
          out.push('<details><summary>Blink and diff</summary>', '');
          if (blink) out.push(img(opts, opts.link(blink), `${captureLabel(c, themes)}: area ${i + 1} switching between base and head`), '');
          out.push(img(opts, opts.link(f), `${alt} (zoomed)`), '', '</details>', '');
        }
      });
      if (c.images.compare && (opts.compact ?? 0) < 1) {
        out.push('<details><summary>Full page</summary>', '', img(opts, opts.link(c.images.compare), alt), '', '</details>', '');
      }
    } else if (c.images.compare) {
      out.push(img(opts, opts.link(c.images.compare), alt), '');
    } else if (c.status === 'removed' && c.images.base) {
      out.push(img(opts, opts.link(c.images.base), `${captureLabel(c, themes)} (base; missing on head)`, 480), '');
    } else if (c.images.head) {
      out.push(img(opts, opts.link(c.images.head), `${captureLabel(c, themes)} (head)`, 480), '');
    }
    for (const s of (opts.compact ?? 0) < 3 ? (c.images.states ?? []) : []) {
      out.push(img(opts, opts.link(s.file), `${captureLabel(c, themes)}: ${s.name} on ${s.state}, before and after`), '', `<sub>${escapeText(`${s.name} · ${s.state}: ${s.text}`)}</sub>`, '');
    }
    const env = c.fingerprint?.differences ?? [];
    if (env.length) out.push(`> ⚠️ ${environmentWarning(env)}`, '');
    for (const w of c.warnings.slice(0, INLINE_WARNINGS)) out.push(`> ${w}`, '');
  }
  return out;
}

const INLINE_WARNINGS = 3;

/** "Base and head were captured differently (fonts loaded on / desktop/light; …)": the run is not a clean comparison. */
export function notComparableNotice(report: Report): string {
  const keys = report.notComparable!.map((n) => `${n.key} on ${n.captures.slice(0, 3).join(', ')}${n.captures.length > 3 ? ` +${n.captures.length - 3}` : ''}`);
  return `**Base and head were captured differently** (${escapeText(keys.join('; '))}), so differences may come from the capture environment and an unchanged result is not a clean one.`;
}

export function environmentWarning(differences: string[]): string {
  return `**The capture environment differed between base and head**, so this diff may come from it rather than from the code: ${escapeText(differences.join('; '))}.`;
}
/** Truncation has its own "Partial captures" notice. */
const TRUNCATION_WARNING = /taller than capture\.maxHeight|cut at capture\.maxHeight/;

/**
 * Every warning not already printed next to a changed capture: report-level ones (dev server,
 * detection notes) and those of unchanged or failed captures, grouped by capture.
 */
function warningsSection(report: Report, opts: RenderOptions): string[] {
  const groups: Array<{ label?: string; items: string[] }> = [];
  const general = report.warnings.filter((w) => !TRUNCATION_WARNING.test(w));
  if (general.length) groups.push({ items: general });
  for (const c of report.captures) {
    const items = c.warnings.filter((w) => !TRUNCATION_WARNING.test(w)).slice(isShownChange(c) ? INLINE_WARNINGS : 0);
    if (items.length) groups.push({ label: captureLabel(c, report.themes.length), items });
  }
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  if (total === 0) return [];
  const limit = (opts.compact ?? 0) >= 2 ? 10 : 60;
  const lines: string[] = [];
  let shown = 0;
  for (const g of groups) {
    const items = g.items.slice(0, Math.max(0, limit - shown));
    shown += items.length;
    if (items.length === 0) break;
    if (!g.label) for (const w of items) lines.push(`- ${escapeText(w)}`);
    else if (items.length === 1) lines.push(`- ${code(g.label)}: ${escapeText(items[0])}`);
    else lines.push(`- ${code(g.label)}:`, ...items.map((w) => `  - ${escapeText(w)}`));
  }
  if (total > shown) lines.push(`- …and ${total - shown} more in \`report.json\``);
  if (total > 5) return [`<details><summary>Warnings (${total})</summary>`, '', ...lines, '', '</details>', ''];
  return ['#### Warnings', '', ...lines, ''];
}

function utc(iso: string): string {
  return iso.replace('T', ' ').replace(/\.\d+Z$|Z$/, ' UTC');
}

function distinct(values: string[]): string {
  return [...new Set(values)].join(' / ');
}

/** One user agent, or one per viewport when they differ (mobile viewports send a phone's). */
function userAgents(pairs: Array<[string, string]>): string {
  const byViewport = new Map<string, string>();
  for (const [viewport, ua] of pairs) if (!byViewport.has(viewport)) byViewport.set(viewport, ua);
  const unique = [...new Set(byViewport.values())];
  if (unique.length === 1) return code(unique[0]);
  return [...byViewport].map(([viewport, ua]) => `${viewport} ${code(ua)}`).join('; ');
}

/** One row value per side, summarizing that side's fingerprints across captures. */
function settingsRows(report: Report, side: 'base' | 'head'): Array<[string, string]> | undefined {
  const captures = report.captures.filter((c) => c.fingerprint?.[side]);
  if (captures.length === 0) return undefined;
  const fps = captures.map((c) => c.fingerprint![side]!);
  const viewports = new Map<string, string>();
  for (const c of captures) {
    const v = c.fingerprint![side]!.viewport;
    if (!viewports.has(c.viewport)) viewports.set(c.viewport, `${c.viewport} ${v.width}×${v.height} @${v.deviceScaleFactor}x${v.isMobile ? ' mobile' : ''}`);
  }
  const union = (pick: (f: (typeof fps)[number]) => string[]) => [...new Set(fps.flatMap(pick))].sort();
  const loaded = union((f) => f.fonts.loaded);
  const failed = union((f) => f.fonts.failed);
  const pending = union((f) => f.fonts.pending);
  const fonts = [loaded.length ? loaded.join(', ') : 'none', failed.length && `failed: ${failed.join(', ')}`, pending.length && `still loading: ${pending.join(', ')}`].filter(Boolean).join('; ');
  const commit = fps.find((f) => f.commit)?.commit;
  const frozen = distinct(
    fps.map((f) =>
      [f.freeze.clock ? `clock ${utc(f.freeze.clock)}` : 'clock running', f.freeze.seed === null ? 'not seeded' : `seed ${f.freeze.seed}`, f.freeze.animations ? 'animations off' : 'animations on', f.freeze.fonts ? 'fonts awaited' : 'fonts not awaited'].join(' · '),
    ),
  );
  const schemes = [...new Set(fps.map((f) => f.media.colorScheme))].join('/');
  const media = distinct(fps.map((f) => [f.media.reducedMotion === 'reduce' ? 'reduced motion' : 'motion allowed', schemes, f.media.locale, f.media.timezone].join(' · ')));
  return [
    ['Commit', commit ? code(commit.slice(0, 7)) : 'deployed preview'],
    ['Viewports', [...viewports.values()].join(' · ')],
    ['Browser', distinct(fps.map((f) => `${f.browser.name} ${f.browser.version}`))],
    ['Web fonts', fonts],
    ['Frozen', frozen],
    ['Media', media],
    ['Test data', distinct(fps.map((f) => f.data))],
    ['Base cache', distinct(fps.filter((f) => f.cache).map((f) => `${f.cache!.hit ? 'reused' : 'captured now'} (${code(f.cache!.key)})`))],
    ['User agent', userAgents(captures.map((c) => [c.viewport, c.fingerprint![side]!.browser.userAgent]))],
  ];
}

/** Collapsed table of what base and head were captured with (the fingerprints), "same" where head matches. */
export function captureSettingsSection(report: Report): string[] {
  const table = settingsTable(report);
  if (table.length === 0) return [];
  return ['<details><summary>Capture settings</summary>', '', ...table, '</details>', ''];
}

function settingsTable(report: Report): string[] {
  const base = settingsRows(report, 'base');
  const head = settingsRows(report, 'head');
  if (!base && !head) return [];
  const rows = (base ?? head)!.map(([label], i) => [label, base?.[i][1] ?? '—', head?.[i][1] ?? '—'] as const);
  const table = rows
    .filter(([label, b, h]) => label !== 'User agent' && (b || h))
    .map(([label, b, h]) => `| ${label} | ${cell(b) || '—'} | ${label !== 'Commit' && h === b ? 'same' : cell(h) || '—'} |`);
  const [, uaBase, uaHead] = rows.find(([label]) => label === 'User agent')!;
  const ua = uaBase === uaHead ? `User agent: ${uaBase}` : `User agent: base ${uaBase}; head ${uaHead}`;
  return ['| | Base | Head |', '|---|---|---|', ...table, '', `<sub>${ua}</sub>`, ''];
}

/** The fingerprint table and the timing of the run in one collapsed block, last in the comment. */
export function settingsAndTimingSection(report: Report): string[] {
  const table = settingsTable(report);
  const t = report.timings;
  if (table.length === 0 && !t) return [];
  const summary = [table.length && 'Capture settings', t && 'timing'].filter(Boolean).join(' and ');
  const timing = t ? ['**Timing**', '', timingLine(t), '', ...timingTable(t), ''] : [];
  return [`<details><summary>${summary[0].toUpperCase()}${summary.slice(1)}${t ? ` · ⏱ ${duration(t.totalMs)}` : ''}</summary>`, '', ...table, ...timing, '</details>', ''];
}

/** A measured duration for people: 0.3s, 3.2s, 41s, 1m 12s. */
export function duration(ms: number): string {
  if (ms < 10_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function sideSteps(t: SideTiming): string[] {
  if (t.mode === 'url') return ['deployed preview'];
  if (t.cached) return ['cached: captures restored from the base cache, nothing built or started'];
  return [
    t.checkoutMs !== undefined ? `checkout ${duration(t.checkoutMs)}` : '',
    t.install ? `install ${duration(t.install.ms)} (${t.install.kind}${t.install.retried ? ', after a failed start' : ''})` : '',
    t.buildMs !== undefined ? `build ${duration(t.buildMs)}` : '',
    t.bootMs !== undefined ? `boot ${duration(t.bootMs)}` : '',
  ].filter(Boolean);
}

function sideBrief(t: SideTiming): string {
  if (t.mode === 'url') return 'deployed preview';
  if (t.cached) return `cached ${duration(t.totalMs)}`;
  return [t.install && `${t.install.kind} ${duration(t.install.ms)}`, t.buildMs !== undefined && `build ${duration(t.buildMs)}`, t.bootMs !== undefined && `boot ${duration(t.bootMs)}`].filter(Boolean).join(', ');
}

const EXTRA_LABELS: Array<[keyof NonNullable<Timings['extras']>, string, string]> = [
  ['variantsMs', 'variants', 'variant screenshots'],
  ['motionMs', 'motion', 'motion clips'],
  ['a11yMs', 'a11y', 'axe and focus order (during capture) and the delta'],
  ['tokensMs', 'tokens', 'the token audit'],
  ['elementMapMs', 'element map', 'element maps of every capture (taken during capture)'],
  ['styleDiffMs', 'style diff', 'matching elements, measuring style changes, naming changed areas'],
  ['flowsMs', 'flows', 'flow replays with their checkpoint captures (taken during capture)'],
  ['componentsMs', 'components', 'component captures in their states (taken during capture)'],
];

/** The whole run on one line; every number is measured. */
export function timingLine(t: Timings): string {
  const parts = [`⏱ ${duration(t.totalMs)} total`, `detect ${duration(t.detectMs)}`];
  if (t.prepare) parts.push(`prepare ${duration(t.prepare.wallMs)} (base: ${sideBrief(t.prepare.base)} ‖ head: ${sideBrief(t.prepare.head)})`);
  if (t.browserMs !== undefined) parts.push(`browser ${duration(t.browserMs)}`);
  if (t.capture) parts.push(`capture ${duration(t.capture.ms)} (${t.capture.count} screenshot${t.capture.count === 1 ? '' : 's'}${t.capture.slowest ? `, slowest ${duration(t.capture.slowest.ms)}` : ''})`);
  if (t.diffMs !== undefined) parts.push(`diff ${duration(t.diffMs)}`);
  for (const [key, label] of EXTRA_LABELS) if (t.extras?.[key] !== undefined) parts.push(`${label} ${duration(t.extras[key]!)}`);
  return parts.join(' · ');
}

function timingTable(t: Timings): string[] {
  const rows: Array<[string, number, string]> = [['detect', t.detectMs, 'changed files → routes']];
  if (t.prepare) {
    rows.push(['base', t.prepare.base.totalMs, sideSteps(t.prepare.base).join(' · ')], ['head', t.prepare.head.totalMs, sideSteps(t.prepare.head).join(' · ')]);
    rows.push(['prepare', t.prepare.wallMs, 'base and head at the same time (wall clock)']);
  }
  if (t.browserMs !== undefined) rows.push(['browser', t.browserMs, 'Chromium check and launch']);
  if (t.capture) {
    const slowest = t.capture.slowest ? ` · slowest ${code(t.capture.slowest.id)} (${t.capture.slowest.side}) ${duration(t.capture.slowest.ms)}` : '';
    rows.push(['capture', t.capture.ms, `${t.capture.count} screenshots${slowest}`]);
  }
  if (t.diffMs !== undefined) rows.push(['diff', t.diffMs, 'pixel diffs and composites']);
  for (const [key, label, note] of EXTRA_LABELS) if (t.extras?.[key] !== undefined) rows.push([label, t.extras[key]!, note]);
  rows.push(['total', t.totalMs, 'wall clock until the report was written']);
  return ['| Phase | Time | |', '|---|---|---|', ...rows.map(([phase, ms, note]) => `| ${phase} | ${duration(ms)} | ${cell(note)} |`)];
}

/** timingLine as the summary of a collapsed table with one row per phase. */
export function timingSection(t: Timings): string[] {
  return [`<details><summary>${timingLine(t)}</summary>`, '', ...timingTable(t), '', '</details>', ''];
}

function dependencyList(changes: DependencyChange[], limit: number): string {
  const shown = changes.slice(0, limit).map((c) => code(describeDependency(c)));
  return shown.join(', ') + (changes.length > limit ? `, …and ${changes.length - limit} more in \`report.json\`` : '');
}

/** Dependency changes: UI ones caused captures; the rest, and unreadable lockfiles, were not checked visually. */
function dependencySection(report: Report, opts: RenderOptions): string[] {
  const deps = report.detect?.dependencies ?? [];
  const limit = (opts.compact ?? 0) >= 2 ? 5 : 15;
  const out: string[] = [];
  const ui = deps.filter((d) => d.ui);
  const other = deps.filter((d) => !d.ui);
  if (ui.length) out.push(`UI dependency changes (routes captured because of them): ${dependencyList(ui, limit)}`, '');
  if (other.length) out.push(`Dependency changes not checked visually: ${dependencyList(other, limit)}`, '');
  for (const file of report.detect?.unparsedLockfiles ?? []) out.push(`${code(file)} changed, but its packages could not be read, so UI packages in it were not checked.`, '');
  return out;
}

function unmatchedSection(report: Report): string[] {
  const files = report.detect?.unmatched ?? [];
  if (files.length === 0) return [];
  const label = 'Changed UI files that match no route (not captured)';
  if (files.length <= 8) return [`${label}: ${files.map(code).join(', ')}`, ''];
  return [`<details><summary>${label}: ${files.length}</summary>`, '', ...files.slice(0, 100).map((f) => `- ${code(f)}`), files.length > 100 ? `- …and ${files.length - 100} more` : '', '</details>', ''];
}

function variantSection(report: Report, opts: RenderOptions): string[] {
  if (report.variants.length === 0) return [];
  const picks = extractPicks(opts.previousBody);
  const out: string[] = ['#### Variants', ''];
  for (const group of report.variants) {
    out.push(`**${code(group.route.path)} · ${group.viewport}${report.themes.length > 1 ? ` · ${group.theme}` : ''}** — compare \`?${group.param}=\` and pick one`, '');
    const width = Math.max(140, Math.min(360, Math.floor(880 / Math.max(1, group.items.length))));
    out.push('<table><tr>');
    for (const item of group.items) out.push(`<th>${escapeHtml(`${group.param}=${item.value}`)}</th>`);
    out.push('</tr><tr>');
    for (const item of group.items) {
      if (item.image && !imagesOn(opts)) {
        out.push(`<td valign="top">${img(opts, '', `${group.param}=${item.value}`)}</td>`);
      } else if (item.image) {
        const href = escapeHtml(opts.link(item.image));
        out.push(`<td valign="top"><a href="${href}">${img(opts, opts.link(item.image), `${group.route.path} ${group.param}=${item.value}`, width)}</a></td>`);
      } else {
        out.push(`<td valign="top">capture failed: ${escapeHtml(item.error ?? 'unknown')}</td>`);
      }
    }
    out.push('</tr></table>', '');
    for (const item of group.items) {
      const key = `${group.route.slug}:${group.viewport}:${group.param}=${item.value}`;
      out.push(`- [${picks.has(key) ? 'x' : ' '}] ${code(`${group.param}=${item.value}`)} <!-- ui-diff-pick:${key} -->`);
    }
    out.push('');
  }
  return out;
}

function motionSection(report: Report, opts: RenderOptions): string[] {
  const notes = [
    report.motionNoAnimation?.length && `Motion not recorded for ${report.motionNoAnimation.map(code).join(', ')}: their changed files touch no transition, animation or interaction state.`,
    report.motionSkipped?.length && `Motion not recorded for unchanged routes: ${report.motionSkipped.map(code).join(', ')}.`,
  ].filter((n): n is string => Boolean(n));
  if (report.motion.length === 0) return notes.length ? [...notes.map((n) => `<sub>${n}</sub>`), ''] : [];
  const out: string[] = ['#### Motion', '', ...notes.flatMap((n) => [`<sub>${n}</sub>`, ''])];
  for (const clip of report.motion) {
    const steps = clip.steps.length ? clip.steps.join(', ') : 'page load';
    out.push(`**${code(clip.route.path)}** · ${clip.viewport} — ${escapeText(steps)}`, '');
    if (clip.error) {
      out.push(`> clip failed: ${clip.error}`, '');
      continue;
    }
    if (clip.gif) out.push(img(opts, opts.link(clip.gif), `${clip.route.path} motion: before and after`), '');
    for (const w of clip.warnings ?? []) out.push(`> ⚠️ ${escapeText(w)}`, '');
    const links = imagesOn(opts)
      ? [clip.webm?.base && `[before.webm](${opts.link(clip.webm.base)})`, clip.webm?.head && `[after.webm](${opts.link(clip.webm.head)})`].filter(Boolean)
      : [];
    if (links.length) out.push(links.join(' · '), '');
  }
  return out;
}

function a11ySection(report: Report, opts: RenderOptions): string[] {
  const a = report.a11y;
  if (!a) return [];
  const out: string[] = [`#### Accessibility — ${a.added.length} new, ${a.fixed.length} fixed`, ''];
  if (a.added.length === 0 && a.fixed.length === 0) out.push('No axe issues were introduced or fixed by this change.', '');
  const limit = (opts.compact ?? 0) >= 2 ? 8 : 25;
  const rows = [...a.added.map((i) => ({ kind: 'New', i })), ...a.fixed.map((i) => ({ kind: 'Fixed', i }))];
  const totals = new Map<string, number>();
  for (const id of a.audited) {
    const c = report.captures.find((x) => x.id === id);
    if (c) totals.set(c.route.path, (totals.get(c.route.path) ?? 0) + 1);
  }
  if (rows.length) {
    out.push('| | Issue | Impact | Element | Where |', '|---|---|---|---|---|');
    for (const { kind, i } of rows.slice(0, limit)) {
      const category = categorize(i.rule);
      const label = category === 'other' ? '' : ` _(${category})_`;
      out.push(`| ${kind} | [${cell(i.help)}](${i.helpUrl}) ${code(i.rule)}${label} | ${i.impact ?? '—'} | ${cell(code(i.target))} | ${cell(compressWhere(i.captures, totals))} |`);
    }
    if (rows.length > limit) out.push(`| | …and ${rows.length - limit} more in \`report.json\` | | | |`);
    out.push('');
  }
  for (const { capture, delta } of a.focus) {
    if (!delta.changed && delta.fixedOrderJumps.length === 0) continue;
    const notes: string[] = [];
    if (delta.newOrderJumps.length) notes.push(`focus now jumps against reading order: ${delta.newOrderJumps.slice(0, 3).map(escapeText).join('; ')}`);
    if (delta.reordered) notes.push('tab order of existing controls changed');
    if (delta.added.length) notes.push(`new tab stops: ${delta.added.slice(0, 5).map(escapeText).join(', ')}`);
    if (delta.removed.length) notes.push(`no longer focusable: ${delta.removed.slice(0, 5).map(escapeText).join(', ')}`);
    if (delta.renamed.length) notes.push(`accessible name changed: ${delta.renamed.slice(0, 5).map(escapeText).join(', ')}`);
    if (delta.fixedOrderJumps.length) notes.push(`fixed reading-order jumps: ${delta.fixedOrderJumps.slice(0, 3).map(escapeText).join('; ')}`);
    out.push(`**Focus order** on ${code(capture)}: ${notes.join('; ')}.`, '');
    if ((opts.compact ?? 0) < 2 && (delta.reordered || delta.newOrderJumps.length)) {
      out.push('<details><summary>Tab sequence</summary>', '', `Before: ${delta.before.map(escapeText).join(' → ')}`, '', `After: ${delta.after.map(escapeText).join(' → ')}`, '', '</details>', '');
    }
  }
  if (a.errors.length) out.push(`> axe could not run on: ${a.errors.join(', ')}`, '');
  return out;
}

function tokenSection(report: Report, opts: RenderOptions): string[] {
  const t = report.tokens;
  if (!t) return [];
  const fresh = t.findings.filter((f) => f.isNew);
  const existing = t.findings.filter((f) => !f.isNew);
  const scope = t.scope === 'changed-regions' ? 'changed areas' : 'changed screens';
  const out: string[] = [`#### Design tokens — ${fresh.length} new off-token value${fresh.length === 1 ? '' : 's'}`, ''];
  if (t.audited.length === 0) {
    out.push('No changed screens to audit.', '');
    return out;
  }
  const table = (rows: typeof t.findings, limit: number) => {
    const lines = ['| Property | Value | Nearest token | Elements |', '|---|---|---|---|'];
    for (const f of rows.slice(0, limit)) {
      const more = f.count > f.selectors.length ? ` (+${f.count - f.selectors.length})` : '';
      lines.push(`| ${f.property} | ${code(f.value)} | ${f.nearest ? code(f.nearest) : 'no close token'} | ${cell(f.selectors.map(code).join(', '))}${more} |`);
    }
    if (rows.length > limit) lines.push(`| …${rows.length - limit} more in \`report.json\` | | | |`);
    return lines;
  };
  if (fresh.length) out.push(...table(fresh, (opts.compact ?? 0) >= 2 ? 8 : 20), '');
  else out.push(`Every audited color, spacing and type value in the ${scope} maps to a token.`, '');
  if (existing.length && (opts.compact ?? 0) < 2) {
    out.push(`<details><summary>${existing.length} off-token value${existing.length === 1 ? '' : 's'} that already existed on base</summary>`, '', ...table(existing, 15), '', '</details>', '');
  }
  if (t.skipped.length) {
    out.push(
      `**Not audited:** ${t.skipped.join(', ')}: no tokens of that kind were recognized in ${t.files.map(code).join(', ')}. Name them like \`--space-4\` / \`--font-size-sm\`, or map them with \`tokens.categories\`.`,
      '',
    );
  }
  out.push(`<sub>Audited the ${scope} of ${t.audited.length} capture${t.audited.length === 1 ? '' : 's'}.</sub>`, '');
  return out;
}

interface Section {
  /** Named in the note when the section is left out to fit the size limit. */
  name?: string;
  /** Higher stays longer; sections without a name are never left out. */
  priority: number;
  lines: string[];
}

/**
 * The comment in reading order: the verdict, then measured changes by route, then the image pairs,
 * then pixel changes nothing measured explains, the rest, and last the fingerprint and timing.
 */
function sections(report: Report, opts: RenderOptions): Section[] {
  const compact = opts.compact ?? 0;
  const s = report.stats;
  const notChecked = notCheckedReason(report);
  const head: string[] = [stickyMarker(opts.id), `### ${opts.title} — ${verdict(report).text}`, ''];
  const statesChanged = report.captures.filter(hasStateChanges).length;
  const counts = notChecked
    ? []
    : [`${s.captures} capture${s.captures === 1 ? '' : 's'}`, s.changed && `${s.changed} changed`, s.added && `${s.added} new`, s.removed && `${s.removed} removed`, s.errors && `${s.errors} failed`, `${s.unchanged} unchanged`, statesChanged && `${statesChanged} with hover or focus changes`].filter(Boolean);
  head.push(
    `**Base** ${code(sideLabel(report.base))} → **Head** ${code(sideLabel(report.head))} · ${report.routes.length} route${report.routes.length === 1 ? '' : 's'} · ${report.viewports.join(', ')} · ${report.themes.join(', ')}`,
    '',
  );
  if (counts.length) head.push(`<sub>${counts.join(' · ')}</sub>`, '');
  if (report.regions) {
    const list = (selectors: string[]) => selectors.map(code).join(', ');
    const parts = [report.regions.focus.length && `Focused on ${list(report.regions.focus)} (only changes inside are compared)`, report.regions.ignore.length && `ignored ${list(report.regions.ignore)}`].filter(Boolean);
    const line = parts.join('; ');
    head.push(`<sub>${line[0].toUpperCase()}${line.slice(1)}.</sub>`, '');
  }
  if (report.notComparable) head.push(`> ⚠️ ${notComparableNotice(report)}`, '');
  if (notChecked) head.push(`> ${notCheckedNotice(notChecked)}`, '');
  const out: Section[] = [{ priority: 100, lines: head }];
  const summary = opts.summary?.trim();
  if (summary) out.push({ name: 'summary', priority: 60, lines: ['#### Summary', '', summary, ''] });

  const changed = report.captures.filter(isShownChange);
  // Captures whose default state is unchanged are shown too when their hover or focus states changed.
  const shown = report.captures.filter((c) => isShownChange(c) || c.images.states?.length);
  const failed = report.captures.filter((c) => c.status === 'error');
  const unchanged = report.captures.filter((c) => c.status === 'unchanged' && !c.images.states?.length);
  out.push({ name: 'measured changes', priority: 90, lines: measuredSection(report, opts) });
  out.push({ name: 'flows', priority: 85, lines: flowsSection(report) });
  out.push({ name: 'components', priority: 85, lines: componentsSection(report, opts) });
  if (shown.length) out.push({ name: 'images', priority: 80, lines: ['#### Images', '', ...imagesSection(report, shown, opts)] });
  out.push({ name: 'pixel changes with no measured change', priority: 70, lines: pixelOnlySection(report, opts) });
  if (failed.length) {
    const lines = ['#### Failed captures', '', ...failed.map((c) => `- ${code(captureLabel(c, report.themes.length))}: ${c.error ?? 'unknown error'}`), ''];
    out.push({ name: 'failed captures', priority: 75, lines });
  }
  const cut = report.captures.filter((c) => c.truncated);
  if (cut.length) {
    const line = `> ⚠️ Partial captures: only the top of ${cut.map((c) => code(captureLabel(c, report.themes.length))).join(', ')} was compared (\`capture.maxHeight\`). Changes below that line are not shown.`;
    out.push({ name: 'partial captures', priority: 75, lines: [line, ''] });
  }
  out.push({ name: 'warnings', priority: 50, lines: warningsSection(report, opts) });
  const notCaptured = [...(report.detect?.skippedRoutes ?? []), ...(report.detect?.needsExample ?? []).map((n) => n.route)];
  if (notCaptured.length) out.push({ name: 'routes not captured', priority: 45, lines: [`<sub>Affected but not captured: ${notCaptured.map(code).join(', ')}</sub>`, ''] });
  out.push({ name: 'variants', priority: 40, lines: variantSection(report, opts) });
  out.push({ name: 'motion', priority: 40, lines: motionSection(report, opts) });
  out.push({ name: 'accessibility', priority: 40, lines: a11ySection(report, opts) });
  out.push({ name: 'design tokens', priority: 40, lines: tokenSection(report, opts) });
  out.push({ name: 'unmatched files and dependencies', priority: 30, lines: [...unmatchedSection(report), ...dependencySection(report, opts)] });
  if (unchanged.length && opts.showUnchanged !== false) {
    const list = unchanged.slice(0, compact >= 2 ? 10 : 60).map((c) => `- ${code(captureLabel(c, report.themes.length))}`);
    if (unchanged.length > list.length) list.push(`- …and ${unchanged.length - list.length} more`);
    out.push({ name: 'unchanged list', priority: 20, lines: [`<details><summary>Unchanged (${unchanged.length})</summary>`, '', ...list, '', '</details>', ''] });
  }
  out.push({ name: 'capture settings and timing', priority: 10, lines: settingsAndTimingSection(report) });
  const full = imagesOn(opts) ? `[report.json](${opts.link('report.json')})` : code('.ui-diff/report.json');
  const footer = [`ui-diff ${report.tool.version}`, report.base.shortSha && `base ${code(report.base.shortSha)}`, report.head.shortSha && `head ${code(report.head.shortSha)}`, `full report: ${full}`, opts.storageNote, `generated ${report.createdAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC')}`]
    .filter(Boolean)
    .join(' · ');
  out.push({ priority: 100, lines: [`<sub>${footer}</sub>`, metaLine(report)] });
  return out.filter((x) => x.lines.length);
}

function join(parts: Section[], dropped: string[], opts: RenderOptions): string {
  const lines = parts.flatMap((p) => p.lines);
  if (dropped.length || (opts.compact ?? 0) > 0) {
    const full = imagesOn(opts) ? `[report.json](${opts.link('report.json')})` : code('.ui-diff/report.json');
    const what = dropped.length ? `Left out to fit GitHub’s comment size limit: ${dropped.join(', ')}.` : 'Shortened to fit GitHub’s comment size limit.';
    lines.splice(lines.length - 2, 0, `<sub>${what} Everything is in ${full}.</sub>`, '');
  }
  return `${lines.join('\n')}\n`;
}

function metaLine(report: Report): string {
  const meta = { head: report.head.sha ?? report.head.url ?? null, base: report.base.sha ?? report.base.url ?? null, createdAt: report.createdAt };
  return `<!-- ui-diff:meta ${JSON.stringify(meta)} -->`;
}

const LAST_RESULT = /<!-- ui-diff:last-result head=(\S*) -->/;
const META = /<!-- ui-diff:meta (\{.*\}) -->/;

/** The visible part of the last comment that showed UI changes, and its head, from a previous comment body. */
function lastResult(previous: string | undefined): { body: string; head?: string } | undefined {
  if (!previous) return undefined;
  const kept = LAST_RESULT.exec(previous);
  if (kept) {
    const inner = previous.slice(kept.index + kept[0].length);
    const end = inner.lastIndexOf('</details>');
    return { body: (end >= 0 ? inner.slice(0, end) : inner).trim(), head: kept[1] || undefined };
  }
  const lines = previous.split('\n').filter((l) => !l.startsWith('<!-- ui-diff:sticky ') && !META.test(l));
  const visible = lines.join('\n').trim();
  if (!visible || /^### .* — no UI files changed in /.test(visible.split('\n')[0])) return undefined;
  let head: string | undefined;
  try {
    head = (JSON.parse(META.exec(previous)?.[1] ?? '{}') as { head?: string | null }).head ?? undefined;
  } catch {
    head = undefined;
  }
  return { body: visible, head };
}

/**
 * Replacement for an existing sticky comment once the PR no longer changes UI files: the top
 * line says so, and the last result that had UI changes stays below it, collapsed.
 */
export function noUiChangeComment(report: Report, opts: { id: string; title: string }, previousBody?: string): string {
  const head = report.head.shortSha ?? report.head.sha?.slice(0, 7) ?? report.head.label;
  const out = [stickyMarker(opts.id), `### ${opts.title} — no UI files changed in ${code(head)}`, metaLine(report)];
  const last = lastResult(previousBody);
  if (last) {
    const lastHead = last.head && /^[0-9a-f]{7,40}$/i.test(last.head) ? last.head.slice(0, 7) : undefined;
    out.push(
      '',
      `<details><summary>Last result with UI changes${lastHead ? ` (head ${code(lastHead)})` : ''}</summary>`,
      `<!-- ui-diff:last-result head=${lastHead ?? ''} -->`,
      '',
      last.body,
      '',
      '</details>',
    );
  }
  return `${out.join('\n')}\n`;
}

/**
 * Renders the sticky PR comment. To fit GitHub's size limit it first shortens sections in tiers,
 * then leaves out whole sections, lowest priority first, and says which ones.
 */
export function renderComment(report: Report, opts: RenderOptions): string {
  const max = opts.maxLength ?? MAX_COMMENT_LENGTH;
  let body = '';
  for (let compact = opts.compact ?? 0; compact <= 3; compact++) {
    body = join(sections(report, { ...opts, compact }), [], { ...opts, compact });
    if (body.length <= max) return body;
  }
  const kept = sections(report, { ...opts, compact: 3 });
  const dropped: string[] = [];
  const order = kept.filter((x) => x.name).sort((a, b) => a.priority - b.priority);
  for (const section of order) {
    kept.splice(kept.indexOf(section), 1);
    dropped.push(section.name!);
    body = join(kept, dropped, { ...opts, compact: 3 });
    if (body.length <= max) return body;
  }
  return `${body.slice(0, max - 200)}\n\n<sub>Truncated to fit GitHub’s comment size limit.</sub>\n${stickyMarker(opts.id)}\n`;
}

/** Report-relative image paths referenced by the comment (what needs uploading). */
export function referencedImages(report: Report, opts: Omit<RenderOptions, 'link'>): string[] {
  const refs = new Set<string>();
  renderComment(report, {
    ...opts,
    maxLength: Number.MAX_SAFE_INTEGER,
    link: (p) => {
      refs.add(p);
      return p;
    },
  });
  return [...refs];
}
