#!/usr/bin/env node
'use strict';

// Minimal CLI wrapper for cron-engine.js. Zero dependencies.
// Usage:
//   node cli.js describe "<cron>"
//   node cli.js validate "<cron>"
//   node cli.js next "<cron>" [count]

const cron = require('./cron-engine.js');
const expr = process.argv[3];
const cmd = process.argv[2];

if (!cmd || !expr) {
  console.error('Usage: node cli.js <describe|validate|next> "<cron-expr>" [count]');
  console.error('Examples:');
  console.error('  node cli.js describe "*/5 * * * *"');
  console.error('  node cli.js validate "0 0 30 2 *"');
  console.error('  node cli.js next "0 9 * * 1-5" 5');
  process.exit(2);
}

function safe(fn) {
  try {
    fn();
  } catch (e) {
    console.error('Error: ' + (e.message || e));
    process.exit(1);
  }
}

switch (cmd) {
  case 'describe':
    safe(() => {
      const d = cron.describe(expr);
      console.log(d.text || d.description || JSON.stringify(d));
    });
    break;

  case 'validate':
    safe(() => {
      const r = cron.validate(expr);
      console.log('valid: ' + r.valid);
      if (r.description) console.log('description: ' + r.description);
      if (r.warnings && r.warnings.length) {
        console.log('warnings:');
        r.warnings.forEach((w) => console.log('  - ' + w));
      }
      if (r.observations && r.observations.length) {
        console.log('observations:');
        r.observations.forEach((o) => console.log('  [' + (o.level || 'info') + '] ' + o.message));
      }
      if (r.suggestions && r.suggestions.length) {
        console.log('suggestions:');
        r.suggestions.forEach((s) => console.log('  [' + (s.level || 'info') + '] ' + s.message));
      }
    });
    break;

  case 'next':
    safe(() => {
      const count = parseInt(process.argv[4] || '5', 10);
      const runs = cron.nextRuns(expr, new Date(), count);
      const formatted = cron.formatNextRuns(runs, new Date());
      formatted.forEach((f) =>
        console.log(f.relative + '\t' + f.formatted + '\t' + f.date.toString())
      );
    });
    break;

  default:
    console.error('Unknown command: ' + cmd);
    console.error('Commands: describe, validate, next');
    process.exit(2);
}
