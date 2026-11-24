import path from 'node:path';
import { timingLine } from './markdown.js';
import { captureLabel, describeCapture, flowLabel, notCheckedReason, type Report } from './report.js';
import { componentLabel } from './components.js';
import { componentFindings, effectLines, flowFindings, isShownChange, measurements, pixelOnlyAreas, verdict, type CheckVerdict } from './verdict.js';

export type { CheckVerdict } from './verdict.js';

/** Exit codes of `ui-diff check`: usable as a pre-push gate. */
export const CHECK_EXIT = { clean: 0, changes: 1, error: 2 } as const;

export interface CheckSummary {
  verdict: CheckVerdict;
  exitCode: number;
  /** Plain text for the terminal. */
  text: string;
}

function rel(file: string): string {
  const r = path.relative(process.cwd(), file);
  return r.startsWith('..') ? file : r || '.';
}

/**
 * The terminal summary of a local check, in the order of the PR comment: the verdict, measured
 * changes by route, the image pairs, pixel changes nothing measured explains, failures and
 * warnings, then the fingerprint and timing. Exit code 0 when nothing changed visually (or nothing
 * UI-related changed), 1 when something did, 2 when a capture failed.
 */
export function checkSummary(report: Report, outDir: string): CheckSummary {
  const s = report.stats;
  const notChecked = notCheckedReason(report);
  const changed = report.captures.filter(isShownChange);
  const v = verdict(report);
  const exitCode = s.errors ? CHECK_EXIT.error : v.kind === 'visual changes' ? CHECK_EXIT.changes : CHECK_EXIT.clean;
  const themes = report.themes.length;
  const where = (c: (typeof report.captures)[number]) => `${c.viewport}${themes > 1 ? `/${c.theme}` : ''}${c.flow ? ` · ${flowLabel(c.flow)}` : ''}${c.component ? ` · ${componentLabel(c.component)}` : ''}`;
  const lines = [`ui-diff check: ${v.text} (exit ${exitCode})`];
  const head = report.head.includesUncommitted ? `${report.head.label} + uncommitted changes` : report.head.label;
  lines.push(`base ${report.base.label} → head ${head} · ${report.routes.length} route${report.routes.length === 1 ? '' : 's'} · ${report.viewports.join(', ')} · ${report.themes.join(', ')}`);
  if (notChecked) lines.push('', `Nothing was checked: ${notChecked}.`);
  if (report.notComparable) lines.push('', `Base and head were captured differently (${report.notComparable.map((n) => n.key).join(', ')}): not a clean result.`);

  for (const r of measurements(report)) {
    if (r.rows.length === 0 && r.unverified.size === 0 && !r.component?.root) continue;
    if (r.component) lines.push('', `Measured changes in ${componentLabel(r.component)} on ${r.route}${r.component.root ? ` · ${r.component.root}` : ''}`);
    else lines.push('', `Measured changes on ${r.route}${r.flow ? ` · ${flowLabel(r.flow)}` : ''}`);
    const label = (e: { name: string; selector: string }) => `${e.name}${e.name === e.selector ? '' : ` (${e.selector})`}`;
    for (const row of r.rows) {
      lines.push(`  - ${label(row)}${row.state ? ` · ${row.state}` : ''}: ${row.text} — ${row.where}${row.repeat ? ` (also under ${r.route})` : ''}`);
      const effects = effectLines(row);
      const own = effects.filter((e) => !e.element);
      const others = effects.filter((e) => e.element);
      for (const e of [...own, ...others.slice(0, 3)]) lines.push(`      ${e.element ? `${label(e.element)}: ` : ''}${e.text}`);
      if (others.length > 3) lines.push(`      …and ${others.length - 3} more effects on other elements in report.json`);
    }
    if (r.rows.length === 0) lines.push('  none verified');
    if (r.unverified.size) lines.push(`  unverified: ${[...r.unverified].map(([text, why]) => `${text} (${why})`).join('; ')}`);
  }
  const broken = flowFindings(report);
  if (broken.length) lines.push('', 'Flows', ...broken.map((f) => `  - ${f.text} — ${f.where}`));
  const missing = componentFindings(report);
  if (missing.length) lines.push('', 'Components', ...missing.flatMap((f) => [`  - ${f.text} — ${f.where}`, ...f.images.slice(0, 1).map((i) => `    ${rel(path.join(outDir, i))}`)]));
  const shown = report.captures.filter((c) => isShownChange(c) || c.images.states?.length);
  if (shown.length) {
    lines.push('', `Images (${changed.length} of ${s.captures} capture${s.captures === 1 ? '' : 's'} changed${shown.length > changed.length ? `, ${shown.length - changed.length} more with hover or focus changes` : ''})`);
    for (const c of shown) {
      lines.push(`  ${c.route.path}  ${where(c)}  ${isShownChange(c) ? describeCapture(c) : 'no change in the default state'}`);
      const pictures = c.images.pairs?.length ? c.images.pairs : c.images.compare ? [c.images.compare] : [];
      for (const p of [...pictures, ...(c.images.states ?? []).map((x) => x.file)]) lines.push(`    ${rel(path.join(outDir, p))}`);
    }
  }
  const pixelOnly = pixelOnlyAreas(report);
  if (pixelOnly.length) {
    lines.push('', 'Pixel changes with no measured change');
    for (const a of pixelOnly.slice(0, 10)) {
      const what = [a.element && `inside ${a.element}`, a.note].filter(Boolean).join(': ') || 'no element explains it';
      lines.push(`  ${captureLabel(a.capture, themes)}  ${a.box.width}×${a.box.height}px at ${a.box.x},${a.box.y}  ${what}`);
    }
    if (pixelOnly.length > 10) lines.push(`  …and ${pixelOnly.length - 10} more in report.json`);
  }
  const failed = report.captures.filter((c) => c.status === 'error');
  if (failed.length) {
    lines.push('', `Failed (${failed.length})`);
    for (const c of failed) lines.push(`  ${c.route.path}  ${where(c)}  ${c.error ?? 'unknown error'}`);
  }
  const warnings = [...report.warnings, ...report.captures.flatMap((c) => c.warnings.map((w) => `${c.route.path} ${where(c)}: ${w}`))];
  if (warnings.length) {
    lines.push('', `Warnings (${warnings.length})`);
    for (const w of warnings.slice(0, 10)) lines.push(`  ${w}`);
    if (warnings.length > 10) lines.push(`  …and ${warnings.length - 10} more in report.json`);
  }
  const fp = report.captures.find((c) => c.fingerprint?.head)?.fingerprint?.head;
  if (fp || report.timings) lines.push('');
  if (fp) lines.push(`Captured with ${fp.browser.name} ${fp.browser.version} · ${fp.freeze.clock ? `clock ${fp.freeze.clock}` : 'clock running'} · ${fp.media.locale} ${fp.media.timezone}`);
  if (report.timings) lines.push(`${timingLine(report.timings)}`);
  lines.push(`Report: ${rel(path.join(outDir, 'report.json'))} · images: ${rel(path.join(outDir, 'compare'))}${path.sep} · preview: ${rel(path.join(outDir, 'comment.local.md'))}`);
  return { verdict: v.kind as CheckVerdict, exitCode, text: `${lines.join('\n')}\n` };
}
