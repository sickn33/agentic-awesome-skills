import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
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
