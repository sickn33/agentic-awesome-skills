import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import refreshSkillsPlugin from './refresh-skills-plugin.js';
import { getDocsMetadata } from './scripts/docs-metadata.js';

// https://vite.dev/config/
// VITE_BASE_PATH set in CI for GitHub Pages (e.g. /agentic-awesome-skills/); default / for local dev
const base = process.env.VITE_BASE_PATH ?? '/';

export default defineConfig({
  base,
  define: { __DOCS_METADATA__: JSON.stringify(getDocsMetadata()) },
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
        fileURLToPath(new URL('../../docs/users', import.meta.url)),
      ],
    },
  },
  plugins: [react(), refreshSkillsPlugin()],
});
