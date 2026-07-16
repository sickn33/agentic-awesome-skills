'use strict';

// ============================================================================
// cron.js — Cron expression parser, describer, validator, and next-run engine.
// Zero dependencies. Extracted from the DevRef Cron Expression Generator
// (battle-tested in browser) and extended with validate() for Pro insights.
// ============================================================================

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const FIELDS = [
  { name: 'minute',  min: 0, max: 59,  key: 'minute' },
  { name: 'hour',    min: 0, max: 23,  key: 'hour' },
  { name: 'dom',     min: 1, max: 31,  key: 'dom' },
  { name: 'month',   min: 1, max: 12,  key: 'month', named: MONTH_NAMES },
  { name: 'dow',     min: 0, max: 7,   key: 'dow',   named: DAY_NAMES },
];

class CronError extends Error {
  constructor(message, fieldIndex) {
    super(message);
    this.name = 'CronError';
    this.fieldIndex = fieldIndex;
  }
}

// ---- Name resolution ----
function resolveName(token, names) {
  if (!names) return null;
  const up = token.toUpperCase();
  const idx = names.indexOf(up);
  return idx === -1 ? null : idx;
}

// ---- Field parsing ----
function parseField(raw, fieldDef, fieldIndex) {
  const trimmed = String(raw).trim();
  if (trimmed === '') throw new CronError(`Field ${fieldIndex + 1} (${fieldDef.name}) is empty`, fieldIndex);

  const out = { raw: trimmed, values: null, special: null };

  // Special: day-of-week "#" (nth weekday)
  if (fieldDef.key === 'dow' && trimmed.includes('#')) {
    const m = trimmed.match(/^([0-7A-Za-z]+)#([1-5])$/);
    if (!m) throw new CronError(`Invalid "#" syntax in day-of-week: "${trimmed}"`, fieldIndex);
    let dowNum = parseSingleNum(m[1], fieldDef, fieldIndex);
    if (dowNum === 7) dowNum = 0;
    out.special = { kind: 'hash', dow: dowNum, nth: parseInt(m[2], 10) };
    return out;
  }

  // Special: day-of-week "L" (last weekday)
  if (fieldDef.key === 'dow' && /L$/i.test(trimmed)) {
    const m = trimmed.match(/^([0-7A-Za-z]+)L$/i);
    if (!m) throw new CronError(`Invalid "L" syntax in day-of-week: "${trimmed}"`, fieldIndex);
    let dowNum = parseSingleNum(m[1], fieldDef, fieldIndex);
    if (dowNum === 7) dowNum = 0;
    out.special = { kind: 'dowLast', dow: dowNum };
    return out;
  }

  // Special: day-of-month "L" (last day)
  if (fieldDef.key === 'dom' && /^L/i.test(trimmed)) {
    const m = trimmed.match(/^L(?:-(\d+))?$/i);
    if (!m) throw new CronError(`Invalid "L" syntax in day-of-month: "${trimmed}"`, fieldIndex);
    out.special = { kind: 'domLast', offset: m[1] ? parseInt(m[1], 10) : 0 };
    return out;
  }

  // Special: day-of-month "W" (nearest weekday)
  if (fieldDef.key === 'dom' && /W$/i.test(trimmed)) {
    const m = trimmed.match(/^(\d+)W$/i);
    if (!m) throw new CronError(`Invalid "W" syntax in day-of-month: "${trimmed}"`, fieldIndex);
    const day = parseInt(m[1], 10);
    if (day < fieldDef.min || day > fieldDef.max) {
      throw new CronError(`Day-of-month "${day}W" out of range (${fieldDef.min}-${fieldDef.max})`, fieldIndex);
    }
    out.special = { kind: 'weekday', day: day };
    return out;
  }

  // Standard parsing
  const values = new Set();
  const items = trimmed.split(',');
  for (const item of items) {
    parseItem(item, fieldDef, fieldIndex, values);
  }
  out.values = values;
  return out;
}

function parseSingleNum(token, fieldDef, fieldIndex) {
  const value = String(token).trim();
  if (/^\d+$/.test(value)) return Number(value);
  const named = resolveName(value, fieldDef.named);
  if (named !== null) {
    return fieldDef.key === 'month' ? named + 1 : named;
  }
  throw new CronError(`Invalid value "${value}" in ${fieldDef.name}`, fieldIndex);
}

function parseItem(item, fieldDef, fieldIndex, values) {
  const t = item.trim();
  if (t === '') throw new CronError(`Empty item in ${fieldDef.name}`, fieldIndex);

  if (t === '*') {
    addRange(values, fieldDef.min, fieldDef.max, fieldDef);
    return;
  }

  if (t.includes('/')) {
    const stepParts = t.split('/');
    if (stepParts.length !== 2) throw new CronError(`Invalid step syntax "${t}" in ${fieldDef.name}`, fieldIndex);
    const [base, stepStr] = stepParts;
    if (!/^\d+$/.test(stepStr)) throw new CronError(`Invalid step "${stepStr}" in ${fieldDef.name}`, fieldIndex);
    const step = Number(stepStr);
    if (step < 1) throw new CronError(`Invalid step "${stepStr}" in ${fieldDef.name}`, fieldIndex);
    let lo, hi;
    if (base === '*' || base === '') {
      lo = fieldDef.min; hi = fieldDef.max;
    } else if (base.includes('-')) {
      const [a, b] = base.split('-');
      lo = parseSingleNum(a.trim(), fieldDef, fieldIndex);
      hi = parseSingleNum(b.trim(), fieldDef, fieldIndex);
    } else {
      lo = parseSingleNum(base.trim(), fieldDef, fieldIndex);
      hi = fieldDef.max;
    }
    if (lo > hi) [lo, hi] = [hi, lo];
    for (let v = lo; v <= hi; v += step) addOne(values, v, fieldDef, fieldIndex);
    return;
  }

  if (t.includes('-')) {
    const parts = t.split('-');
    if (parts.length !== 2) throw new CronError(`Invalid range "${t}" in ${fieldDef.name}`, fieldIndex);
    const a = parseSingleNum(parts[0].trim(), fieldDef, fieldIndex);
    const b = parseSingleNum(parts[1].trim(), fieldDef, fieldIndex);
    addRange(values, a, b, fieldDef);
    return;
  }

  const v = parseSingleNum(t, fieldDef, fieldIndex);
  addOne(values, v, fieldDef, fieldIndex);
}

function addOne(values, v, fieldDef, fieldIndex) {
  if (fieldDef.key === 'dow' && v === 7) { values.add(0); return; }
  if (v < fieldDef.min || v > fieldDef.max) {
    throw new CronError(`Value ${v} out of range for ${fieldDef.name} (${fieldDef.min}-${fieldDef.max})`, fieldIndex);
  }
  values.add(v);
}

function addRange(values, lo, hi, fieldDef) {
  if (lo > hi) [lo, hi] = [hi, lo];
  if (lo < fieldDef.min || hi > fieldDef.max) {
    throw new CronError(`Range ${lo}-${hi} out of bounds for ${fieldDef.name} (${fieldDef.min}-${fieldDef.max})`, -1);
  }
  for (let v = lo; v <= hi; v++) {
    if (fieldDef.key === 'dow' && v === 7) { values.add(0); continue; }
    values.add(v);
  }
}

// ---- Full expression parser ----
function parseCron(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new CronError(`Expected 5 fields (got ${parts.length}). Format: minute hour day-of-month month day-of-week`, -1);
  }
  const parsed = {};
  for (let i = 0; i < 5; i++) {
    parsed[FIELDS[i].key] = parseField(parts[i], FIELDS[i], i);
  }
  parsed.domRestricted = !/^\s*\*\s*$/.test(parts[2]);
  parsed.dowRestricted = !/^\s*\*\s*$/.test(parts[4]);
  parsed.parts = parts;
  return parsed;
}

// ---- Human-readable description ----
function describe(expr) {
  let parsed;
  try { parsed = parseCron(expr); } catch (e) { return { text: e.message, error: true }; }
  return { text: describeParsed(parsed), error: false, parsed };
}

function describeParsed(p) {
  const monthDesc = describeFieldMonth(p.month);
  const domDesc = describeFieldDom(p.dom);
  const dowDesc = describeFieldDow(p.dow);

  const isEveryMin = p.parts[0] === '*';
  const isEveryHour = p.parts[1] === '*';

  let timePart = '';
  if (isEveryMin && isEveryHour) {
    timePart = 'At every minute';
  } else if (isEveryMin && !isEveryHour) {
    const hours = [...(p.hour.values || [])].sort((a, b) => a - b);
    if (hours.length > 0) {
      timePart = 'Every minute during the ' + hours.map(h => pad2(h)).join(', ') + ' hour' + (hours.length > 1 ? 's' : '');
    } else {
      timePart = 'Every minute';
    }
  } else {
    timePart = 'At ' + describeTimes(p.minute, p.hour);
  }

  let dayPart = '';
  const domAny = !p.domRestricted;
  const dowAny = !p.dowRestricted;

  if (domAny && dowAny) {
    if (monthDesc.restricted) {
      dayPart = ', ' + monthDesc.text + ' of every year';
    } else {
      dayPart = ', every day';
    }
  } else if (!domAny && dowAny) {
    dayPart = ', on ' + domDesc.text;
    if (monthDesc.restricted) dayPart += ' in ' + monthDesc.text;
  } else if (domAny && !dowAny) {
    dayPart = ', on ' + dowDesc.text;
    if (monthDesc.restricted) dayPart += ' in ' + monthDesc.text;
  } else {
    dayPart = ', on ' + domDesc.text + ' and on ' + dowDesc.text;
    if (monthDesc.restricted) dayPart += ' in ' + monthDesc.text;
  }

  return capitalize(timePart + dayPart);
}

function describeTimes(minuteField, hourField) {
  const mins = [...(minuteField.values || [])].sort((a, b) => a - b);
  const hours = [...(hourField.values || [])].sort((a, b) => a - b);

  if (pIsWildcard(hourField) && !pIsWildcard(minuteField)) {
    if (mins.length === 1) return `minute ${mins[0]} of every hour`;
    return `minutes ${listJoin(mins)} of every hour`;
  }
  if (pIsWildcard(minuteField) && pIsWildcard(hourField)) return 'every minute of every hour';

  if (pIsWildcard(minuteField)) {
    return `every minute during the ${hours.map(h => pad2(h)).join(', ')} hour${hours.length > 1 ? 's' : ''}`;
  }

  const combos = [];
  for (const h of hours) {
    for (const m of mins) {
      combos.push(formatHM(h, m));
    }
  }
  return listJoin(combos);
}

function describeFieldMonth(field) {
  if (pIsWildcard(field)) return { restricted: false, text: 'every month' };
  const vals = [...(field.values || [])].sort((a, b) => a - b);
  return { restricted: true, text: 'in ' + listJoin(vals.map(v => capitalize(MONTH_NAMES[v - 1]))) };
}

function describeFieldDom(field) {
  if (pIsWildcard(field)) return { text: 'every day-of-month' };
  if (field.special) {
    if (field.special.kind === 'domLast') {
      return { text: field.special.offset === 0 ? 'the last day of the month' : `the last day of the month minus ${field.special.offset} days` };
    }
    if (field.special.kind === 'weekday') {
      return { text: `the nearest weekday to day ${field.special.day}` };
    }
  }
  const vals = [...(field.values || [])].sort((a, b) => a - b);
  return { text: `day-of-month ${listJoin(vals)}` };
}

function describeFieldDow(field) {
  if (pIsWildcard(field)) return { text: 'every day-of-week' };
  if (field.special) {
    if (field.special.kind === 'hash') {
      return { text: `the ${ordinal(field.special.nth)} ${capitalize(DAY_NAMES[field.special.dow])} of the month` };
    }
    if (field.special.kind === 'dowLast') {
      return { text: `the last ${capitalize(DAY_NAMES[field.special.dow])} of the month` };
    }
  }
  const vals = [...(field.values || [])].sort((a, b) => a - b);
  return { text: listJoin(vals.map(v => capitalize(DAY_NAMES[v]))) };
}

function pIsWildcard(field) { return field.raw === '*'; }

// ---- Next run calculator ----
function nextRuns(expr, fromDate, count) {
  count = count || 10;
  const p = parseCron(expr);
  const runs = [];
  let d = new Date(fromDate.getTime());
  d.setSeconds(0, 0);
  d = new Date(d.getTime() + 60000);

  let maxScan = 600000; // ~416 days ceiling
  while (runs.length < count && maxScan-- > 0) {
    if (matches(d, p)) {
      runs.push(new Date(d.getTime()));
    }
    d = new Date(d.getTime() + 60000);
  }
  return runs;
}

function matches(d, p) {
  if (!p.minute.values || !p.minute.values.has(d.getMinutes())) return false;
  if (!p.hour.values || !p.hour.values.has(d.getHours())) return false;
  if (!p.month.values || !p.month.values.has(d.getMonth() + 1)) return false;

  const domAny = !p.domRestricted;
  const dowAny = !p.dowRestricted;

  let domMatch = false, dowMatch = false;
  if (domAny) {
    domMatch = true;
  } else if (p.dom.special) {
    domMatch = matchDomSpecial(d, p.dom.special);
  } else if (p.dom.values && p.dom.values.has(d.getDate())) {
    domMatch = true;
  }
  if (dowAny) {
    dowMatch = true;
  } else if (p.dow.special) {
    dowMatch = matchDowSpecial(d, p.dow.special);
  } else if (p.dow.values) {
    dowMatch = p.dow.values.has(d.getDay());
  }

  if (domAny && dowAny) return true;
  if (!domAny && !dowAny) return domMatch || dowMatch; // OR semantics
  return domMatch && dowMatch;
}

function matchDomSpecial(d, special) {
  if (special.kind === 'domLast') {
    const lastDay = lastDayOfMonth(d.getFullYear(), d.getMonth());
    const target = special.offset === 0 ? lastDay : lastDay - special.offset;
    return d.getDate() === target;
  }
  if (special.kind === 'weekday') {
    return d.getDate() === nearestWeekday(d.getFullYear(), d.getMonth(), special.day);
  }
  return false;
}

function matchDowSpecial(d, special) {
  if (special.kind === 'hash') {
    return nthWeekdayMatches(d, special.dow, special.nth);
  }
  if (special.kind === 'dowLast') {
    return lastWeekdayMatches(d, special.dow);
  }
  return false;
}

function nthWeekdayMatches(d, dow, nth) {
  if (d.getDay() !== dow) return false;
  const dayOfMonth = d.getDate();
  const occurrence = Math.ceil(dayOfMonth / 7);
  return occurrence === nth;
}

function lastWeekdayMatches(d, dow) {
  if (d.getDay() !== dow) return false;
  const lastDay = lastDayOfMonth(d.getFullYear(), d.getMonth());
  return d.getDate() + 7 > lastDay;
}

function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function nearestWeekday(year, month, day) {
  const lastDay = lastDayOfMonth(year, month);
  const target = Math.min(day, lastDay);
  const dt = new Date(year, month, target);
  const wd = dt.getDay();
  let result = target;
  if (wd === 0) {
    if (target + 1 <= lastDay) result = target + 1;
    else result = target - 2;
  } else if (wd === 6) {
    if (target - 1 >= 1) result = target - 1;
    else result = target + 2;
  }
  return result;
}

// ============================================================================
// validate() — Pro-tier feature: deeper analysis of a cron expression.
// Returns warnings, observations, and optimization suggestions.
// ============================================================================

function validate(expr) {
  let parsed;
  try {
    parsed = parseCron(expr);
  } catch (e) {
    return {
      valid: false,
      error: e.message,
      fieldIndex: e.fieldIndex,
      warnings: [],
      observations: [],
      suggestions: [],
    };
  }

  const warnings = [];
  const observations = [];
  const suggestions = [];

  const desc = describeParsed(parsed);

  // Check: day-of-month and day-of-week both restricted (OR semantics surprise)
  if (parsed.domRestricted && parsed.dowRestricted) {
    warnings.push({
      level: 'high',
      message: 'Both day-of-month and day-of-week are restricted. Cron uses OR semantics for these fields — the job will run when EITHER matches, not both. This is a common source of bugs.',
    });
  }

  // Check: impossible day-of-month values (e.g., 31 in Feb)
  const domValues = [...(parsed.dom.values || [])];
  if (!parsed.domRestricted && parsed.month.values && ![...parsed.month.values].every(m => m === 2)) {
    // skip
  } else if (parsed.domRestricted && !parsed.dom.special && domValues.includes(31)) {
    const monthsWith31 = [1, 3, 5, 7, 8, 10, 12]; // Jan, Mar, May, Jul, Aug, Oct, Dec
    const monthValues = parsed.month.values ? [...parsed.month.values] : [];
    const restrictedMonths = parsed.parts[3] !== '*';
    if (restrictedMonths) {
      const problemMonths = monthValues.filter(m => !monthsWith31.includes(m));
      if (problemMonths.length > 0) {
        warnings.push({
          level: 'medium',
          message: `Day 31 is specified but months ${problemMonths.map(m => capitalize(MONTH_NAMES[m - 1])).join(', ')} have fewer than 31 days. The job will never run in those months.`,
        });
      }
    } else {
      observations.push({
        level: 'info',
        message: 'Day 31 will only match in months with 31 days (7 of 12 months). The job effectively skips Feb, Apr, Jun, Sep, and Nov.',
      });
    }
  }

  // Check: high-frequency schedules
  if (parsed.parts[0] === '*' && parsed.parts[1] === '*') {
    observations.push({
      level: 'info',
      message: 'This expression runs every minute. For production jobs, consider if this frequency is intentional.',
    });
  }

  // Check: step values that don't divide evenly
  for (let i = 0; i < 2; i++) {
    const part = parsed.parts[i];
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      const range = i === 0 ? 60 : 24;
      if (range % step !== 0) {
        observations.push({
          level: 'info',
          message: `Step value */${step} in ${FIELDS[i].name} doesn't divide evenly into ${range}. The last interval will be shorter than the rest (e.g., */7 in minutes goes 0,7,14,...,56, then 0 again — not 63).`,
        });
      }
    }
  }

  // Check: February 29th edge case
  if (parsed.domRestricted && !parsed.dom.special) {
    const domVals = [...(parsed.dom.values || [])];
    const monthVals = parsed.month.values ? [...parsed.month.values] : [];
    if (domVals.includes(29) && monthVals.length === 1 && monthVals[0] === 2) {
      warnings.push({
        level: 'medium',
        message: 'February 29th only occurs in leap years. This job will not run at all in non-leap years (3 out of every 4 years).',
      });
    }
  }

  // Check: midnight rush
  if (parsed.parts[0] === '0' && parsed.parts[1] === '0') {
    suggestions.push({
      level: 'info',
      message: 'Midnight (00:00) is a common schedule and many systems have concurrent job spikes at this time. Consider offsetting to a few minutes past midnight (e.g., 02 0 * * *) to avoid resource contention.',
    });
  }

  // Check: weekend vs weekday
  if (parsed.parts[4] === '1-5') {
    observations.push({
      level: 'info',
      message: 'Weekdays only (Mon-Fri). This job will not run on weekends.',
    });
  }

  // Compute frequency estimate
  const freq = estimateFrequency(parsed);
  if (freq) {
    observations.push({
      level: 'info',
      message: `Approximate frequency: ${freq.description} (~${freq.runsPerYear} runs per year).`,
    });
  }

  return {
    valid: true,
    description: desc,
    warnings,
    observations,
    suggestions,
    parsed,
  };
}

function estimateFrequency(parsed) {
  try {
    // Count runs over a sample year
    const start = new Date(2025, 0, 1, 0, 0, 0, 0);
    const end = new Date(2026, 0, 1, 0, 0, 0, 0);
    let count = 0;
    let d = new Date(start.getTime());
    let maxScan = 540000; // ~375 days
    while (d < end && maxScan-- > 0) {
      if (matches(d, parsed)) count++;
      d = new Date(d.getTime() + 60000);
    }

    let description = '';
    if (count >= 525600) description = 'every minute';
    else if (count >= 500000) description = 'multiple times per minute';
    else if (count >= 8000) description = 'hourly or more';
    else if (count >= 300) description = 'daily or more';
    else if (count >= 40) description = 'weekly or more';
    else if (count >= 8) description = 'monthly or more';
    else if (count >= 1) description = 'yearly or less';
    else description = 'never (impossible schedule)';

    return { description, runsPerYear: count };
  } catch (e) {
    return null;
  }
}

// ---- Presets ----
const PRESETS = [
  { label: 'Every minute', cron: '* * * * *' },
  { label: 'Every 5 min', cron: '*/5 * * * *' },
  { label: 'Every 10 min', cron: '*/10 * * * *' },
  { label: 'Every 15 min', cron: '*/15 * * * *' },
  { label: 'Every 30 min', cron: '*/30 * * * *' },
  { label: 'Hourly', cron: '0 * * * *' },
  { label: 'Every 2 hours', cron: '0 */2 * * *' },
  { label: 'Every 6 hours', cron: '0 */6 * * *' },
  { label: 'Every 12 hours', cron: '0 */12 * * *' },
  { label: 'Daily at midnight', cron: '0 0 * * *' },
  { label: 'Daily 9am', cron: '0 9 * * *' },
  { label: 'Twice daily', cron: '0 9,21 * * *' },
  { label: 'Weekdays 9am', cron: '0 9 * * 1-5' },
  { label: 'Weekends 10am', cron: '0 10 * * 0,6' },
  { label: 'Every Monday', cron: '0 0 * * 1' },
  { label: 'Every Friday', cron: '0 0 * * 5' },
  { label: 'Monthly 1st', cron: '0 0 1 * *' },
  { label: 'Quarterly', cron: '0 0 1 */3 *' },
  { label: 'Yearly Jan 1', cron: '0 0 1 1 *' },
];

const COMMON = [
  { label: 'At 14:30', cron: '30 14 * * *' },
  { label: '9am weekdays', cron: '0 9 * * 1-5' },
  { label: 'Every Mon 8am', cron: '0 8 * * 1' },
  { label: 'Last day of month', cron: '0 0 L * *' },
  { label: '15th, weekday', cron: '0 0 15W * *' },
  { label: '3rd Thursday', cron: '0 0 * * 4#3' },
  { label: 'Last Friday', cron: '0 0 * * 5L' },
  { label: 'Business hours', cron: '0 9-17 * * 1-5' },
  { label: 'Backup nightly', cron: '0 2 * * *' },
];

// ---- Helpers ----
function pad2(n) { return String(n).padStart(2, '0'); }
function formatHM(h, m) { return `${pad2(h)}:${pad2(m)}`; }
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function listJoin(arr) {
  if (arr.length === 0) return '';
  if (arr.length === 1) return String(arr[0]);
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`;
  return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
}

function formatNextRuns(runs, fromDate) {
  return runs.map(r => {
    const diff = r.getTime() - fromDate.getTime();
    const mins = Math.round(diff / 60000);
    let rel;
    if (mins < 60) rel = `+${mins}m`;
    else if (mins < 2880) rel = `+${Math.round(mins / 60)}h`;
    else rel = `+${Math.round(mins / 1440)}d`;
    return { date: r, relative: rel, formatted: r.toISOString() };
  });
}

module.exports = {
  CronError,
  FIELDS,
  MONTH_NAMES,
  DAY_NAMES,
  PRESETS,
  COMMON,
  parseCron,
  describe,
  describeParsed,
  nextRuns,
  matches,
  validate,
  estimateFrequency,
  formatNextRuns,
  parseField,
  parseItem,
  parseSingleNum,
  resolveName,
  lastDayOfMonth,
  nearestWeekday,
  nthWeekdayMatches,
  lastWeekdayMatches,
};
