import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';
import fs from 'node:fs';
const docs: { slug: string }[] = JSON.parse(fs.readFileSync(new URL('./src/data/docs.json', import.meta.url), 'utf8'));

// Unit tests use deterministic metadata; the uncached build verifies real Git provenance.
const metadata = Object.fromEntries(docs.map(({ slug }) => [slug, {
  commit: '0123456789abcdef0123456789abcdef01234567',
  modified: '2026-01-01', sourcePath: `docs/users/${slug}.md`,
}]));

export default mergeConfig(
  viteConfig,
  defineConfig({
    define: { __DOCS_METADATA__: JSON.stringify(metadata) },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: [
          'src/components/**/*.{ts,tsx}',
          'src/context/**/*.{ts,tsx}',
          'src/hooks/**/*.{ts,tsx}',
          'src/pages/**/*.{ts,tsx}',
          'src/utils/**/*.{ts,tsx}',
        ],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/__tests__/**',
          'src/test/**',
        ],
        thresholds: {
          statements: 75,
          lines: 75,
          functions: 70,
          branches: 60,
        },
      },
    },
  })
);
