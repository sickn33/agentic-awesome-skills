import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  plugins: [react(), { name: 'ui-license-inventory', generateBundle() { const directory = fileURLToPath(new URL('../../.tmp/aas-plugin/', import.meta.url)); mkdirSync(directory, { recursive: true }); writeFileSync(`${directory}/ui-modules.json`, JSON.stringify([...this.getModuleIds()].filter((id) => id.includes('node_modules')))); } }],
  publicDir: false,
  build: {
    outDir: '../../.tmp/aas-plugin', emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: { input: fileURLToPath(new URL('./workbench.html', import.meta.url)) },
  },
});
