import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const picomatch = require('picomatch');

describe('web tooling glob matcher', () => {
  it('rejects both repeated extended group operators', () => {
    for (const operator of ['+', '*']) {
      expect(() => picomatch(`files/${operator}(red|blue).txt`)).toThrow(
        'Repeated extended glob groups are disabled',
      );
    }
  });

  it('retains standard matching and non-repeating groups used in test discovery', () => {
    expect(picomatch('src/**/*.{ts,tsx}')('src/ui/Panel.tsx')).toBe(true);
    const match = picomatch('**/*.test.?(c|m)[jt]s?(x)');
    expect(match('src/ui/Panel.test.tsx')).toBe(true);
    expect(match('src/ui/Panel.tsx')).toBe(false);
  });
});
