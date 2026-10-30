import { defineConfig, searchForWorkspaceRoot } from 'vite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import refreshSkillsPlugin from './refresh-skills-plugin.js';
import { docsRuntimePlugin } from './scripts/docs-runtime.js';

// https://vite.dev/config/
// VITE_BASE_PATH set in CI for GitHub Pages (e.g. /agentic-awesome-skills/); default / for local dev
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: { __CATALOG_COUNT__: JSON.parse(fs.readFileSync(new URL('../../skills_index.json', import.meta.url), 'utf8')).length, __DOCS_METADATA__: 'globalThis.__AAS_DOCS_METADATA__' },
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        fileURLToPath(new URL('../../docs/users', import.meta.url)),
      ],
    },
  },
  plugins: [react(), refreshSkillsPlugin(), docsRuntimePlugin()],
});
