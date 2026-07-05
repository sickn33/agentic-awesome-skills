---
name: electron-development
description: "Master Electron desktop app development with secure IPC, contextIsolation, preload scripts, multi-process architecture, electron-builder packaging, code signing, and auto-update."
risk: safe
source: community
date_added: "2026-03-12"
---

# Electron Development

You are a senior Electron engineer specializing in secure, production-grade desktop application architecture. You have deep expertise in Electron's multi-process model, IPC security patterns, native OS integration, application packaging, code signing, and auto-update strategies.

## Use this skill when

- Building new Electron desktop applications from scratch
- Securing an Electron app (contextIsolation, sandbox, CSP, nodeIntegration)
- Setting up IPC communication between main, renderer, and preload processes
- Packaging and distributing Electron apps with electron-builder or electron-forge
- Implementing auto-update with electron-updater
- Debugging main process issues or renderer crashes
- Managing multiple windows and application lifecycle
- Integrating native OS features (menus, tray, notifications, file system dialogs)
- Optimizing Electron app performance and bundle size

## Do not use this skill when

- Building web-only applications without desktop distribution → use `react-patterns`, `nextjs-best-practices`
- Building Tauri apps (Rust-based desktop alternative) → use `tauri-development` if available
- Building Chrome extensions → use `chrome-extension-developer`
- Implementing deep backend/server logic → use `nodejs-backend-patterns`
- Building mobile apps → use `react-native-architecture` or `flutter-expert`

## Instructions

1. Analyze the project structure and identify process boundaries.
2. Enforce security defaults: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
3. Design IPC channels with explicit whitelisting in the preload script.
4. Implement, test, and build with appropriate tooling.
5. Validate against the Production Security Checklist before shipping.

---

## Core Expertise Areas

### 1. Project Structure & Architecture

**Recommended project layout:**
```
my-electron-app/
├── package.json
├── electron-builder.yml        # or forge.config.ts
├── src/
│   ├── main/
│   │   ├── main.ts             # Main process entry
│   │   ├── ipc-handlers.ts     # IPC channel handlers
│   │   ├── menu.ts             # Application menu
│   │   ├── tray.ts             # System tray
│   │   └── updater.ts          # Auto-update logic
│   ├── preload/
│   │   └── preload.ts          # Bridge between main ↔ renderer
│   ├── renderer/
│   │   ├── index.html          # Entry HTML
│   │   ├── App.tsx             # UI root (React/Vue/Svelte/vanilla)
│   │   ├── components/
│   │   └── styles/
│   └── shared/
│       ├── constants.ts        # IPC channel names, shared enums
│       └── types.ts            # Shared TypeScript interfaces
├── resources/
│   ├── icon.png                # App icon (1024x1024)
│   └── entitlements.mac.plist  # macOS entitlements
├── tests/
│   ├── unit/
│   └── e2e/
└── tsconfig.json
```

**Key architectural principles:**
- **Separate entry points**: Main, preload, and renderer each have their own build configuration.
- **Shared types, not shared modules**: The `shared/` directory contains only types, constants, and enums — never executable code imported across process boundaries.
- **Keep main process lean**: Main should orchestrate windows, handle IPC, and manage app lifecycle. Business logic belongs in the renderer or dedicated worker processes.

---

### 2. Process Model (Main / Renderer / Preload / Utility)

Electron runs **multiple processes** that are isolated by design:

| Process | Role | Node.js Access | DOM Access |
|---------|------|----------------|------------|
| **Main** | App lifecycle, windows, native APIs, IPC hub | ✅ Full | ❌ None |
| **Renderer** | UI rendering, user interaction | ❌ None (by default) | ✅ Full |
| **Preload** | Secure bridge between main and renderer | ✅ Limited (via contextBridge) | ✅ Before page loads |
| **Utility** | CPU-intensive tasks, background work | ✅ Full | ❌ None |

**BrowserWindow with security defaults (MANDATORY):**
```typescript
import { BrowserWindow } from 'electron';
import path from 'node:path';

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // ── SECURITY DEFAULTS (NEVER CHANGE THESE) ──
      contextIsolation: true,     // Isolates preload from renderer context
      nodeIntegration: false,     // Prevents require() in renderer
      sandbox: true,              // OS-level process sandboxing
      
      // ── PRELOAD SCRIPT ──
      preload: path.join(__dirname, '../preload/preload.js'),
      
      // ── ADDITIONAL HARDENING ──
      webSecurity: true,          // Enforce same-origin policy
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;"
        ],
      },
    });
  });

  return win;
}
```

> ⚠️ **CRITICAL**: Never set `nodeIntegration: true` or `contextIsolation: false` in production. These settings expose the renderer to remote code execution (RCE) attacks through XSS vulnerabilities.

---

### 3. Secure IPC Communication

IPC is the **only** safe channel for communication between main and renderer processes. All IPC must flow through the preload script.

**Preload script (contextBridge + explicit whitelisting):**
```typescript
// src/preload/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

// ── WHITELIST: Only expose specific channels ──
const ALLOWED_SEND_CHANNELS = [
  'file:save',
  'file:open',
  'app:get-version',
  'dialog:show-open',
] as const;

const ALLOWED_RECEIVE_CHANNELS = [
  'file:saved',
  'file:opened',
  'app:version',
  'update:available',
  'update:progress',
  'update:downloaded',
  'update:error',
] as const;

type SendChannel = typeof ALLOWED_SEND_CHANNELS[number];
type ReceiveChannel = typeof ALLOWED_RECEIVE_CHANNELS[number];

contextBridge.exposeInMainWorld('electronAPI', {
  // One-way: renderer → main
  send: (channel: SendChannel, ...args: unknown[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  // Two-way: renderer → main → renderer (request/response)
  invoke: (channel: SendChannel, ...args: unknown[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
  },

  // One-way: main → renderer (subscriptions)
  on: (channel: ReceiveChannel, callback: (...args: unknown[]) => void) => {
    if (ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});
```

**Main process IPC handlers:**
```typescript
// src/main/ipc-handlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';

export function registerIpcHandlers(): void {
  // invoke() pattern: returns a value to the renderer
  ipcMain.handle('file:open', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }],
    });
    
    if (canceled || filePaths.length === 0) return null;
    
    const content = await readFile(filePaths[0], 'utf-8');
    return { path: filePaths[0], content };
  });

  ipcMain.handle('file:save', async (_event, filePath: string, content: string) => {
    // VALIDATE INPUTS — never trust renderer data blindly
    if (typeof filePath !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid arguments');
    }
    await writeFile(filePath, content, 'utf-8');
    return { success: true };
  });

  ipcMain.handle('app:get-version', () => {
    return process.versions.electron;
  });
}
```

**Renderer usage (type-safe):**
```typescript
// src/renderer/App.tsx — or any renderer code
// The electronAPI is globally available via contextBridge

declare global {
  interface Window {
    electronAPI: {
      send: (channel: string, ...args: unknown[]) => void;
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
    };
  }
}

// Open a file via IPC
async function openFile() {
  const result = await window.electronAPI.invoke('file:open');
  if (result) {
    console.log('File content:', result.content);
  }
}

// Subscribe to updates from main process
const unsubscribe = window.electronAPI.on('update:available', (version) => {
  console.log('Update available:', version);
});

// Cleanup on unmount
// unsubscribe();
```

**IPC Pattern Summary:**

| Pattern | Method | Use Case |
|---------|--------|----------|
| **Fire-and-forget** | `ipcRenderer.send()` → `ipcMain.on()` | Logging, telemetry, non-critical notifications |
| **Request/Response** | `ipcRenderer.invoke()` → `ipcMain.handle()` | File operations, dialogs, data queries |
| **Push to renderer** | `webContents.send()` → `ipcRenderer.on()` | Progress updates, download status, auto-update |

> ⚠️ **Never** use `ipcRenderer.sendSync()` in production — it blocks the renderer's event loop and freezes the UI.

---

### 4. Security Hardening

#### Production Security Checklist

```
── MANDATORY ──
[ ] contextIsolation: true
[ ] nodeIntegration: false
[ ] sandbox: true
[ ] webSecurity: true
[ ] allowRunningInsecureContent: false

── IPC ──
[ ] Preload uses contextBridge with explicit channel whitelisting
[ ] All IPC inputs are validated in the main process
[ ] No raw ipcRenderer exposed to renderer context
[ ] No use of ipcRenderer.sendSync()

── CONTENT ──
[ ] Content Security Policy (CSP) headers set on all windows
[ ] No use of eval(), new Function(), or innerHTML with untrusted data
[ ] Remote content (if any) loaded in separate BrowserView with restricted permissions
[ ] protocol.registerSchemesAsPrivileged() uses minimal permissions

── NAVIGATION ──
[ ] webContents 'will-navigate' event intercepted — block unexpected URLs
[ ] webContents 'new-window' event intercepted — prevent pop-up exploitation
[ ] No shell.openExternal() with unsanitized URLs

── PACKAGING ──
[ ] ASAR archive enabled (protects source from casual inspection)
[ ] No sensitive credentials or API keys bundled in the app
[ ] Code signing configured for both Windows and macOS
[ ] Auto-update uses HTTPS and verifies signatures
```

**Preventing Navigation Hijacking:**
```typescript
// In main process, after creating a BrowserWindow
win.webContents.on('will-navigate', (event, url) => {
  const parsedUrl = new URL(url);
  // Only allow navigation within your app
  if (parsedUrl.origin !== 'http://localhost:5173') { // dev server
    event.preventDefault();
    console.warn(`Blocked navigation to: ${url}`);
  }
});

// Prevent new windows from being opened
win.webContents.setWindowOpenHandler(({ url }) => {
  try {
    const externalUrl = new URL(url);
    const allowedHosts = new Set(['example.com', 'docs.example.com']);

    // Never forward raw renderer-controlled URLs to the OS.
    // Unvalidated links can enable phishing or abuse platform URL handlers.
    if (externalUrl.protocol === 'https:' && allowedHosts.has(externalUrl.hostname)) {
      require('electron').shell.openExternal(externalUrl.toString());
    } else {
      console.warn(`Blocked external URL: ${url}`);
    }
  } catch {
    console.warn(`Rejected invalid external URL: ${url}`);
  }

  return { action: 'deny' }; // Block all new Electron windows
});
```

**Custom Protocol Registration (secure):**
```typescript
import { protocol } from 'electron';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';

// Register a custom protocol for loading local assets securely
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

app.whenReady().then(() => {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const baseDir = path.resolve(__dirname, '../renderer');
    // Strip the leading slash so path.resolve keeps baseDir as the root.
    const relativePath = path.normalize(decodeURIComponent(url.pathname).replace(/^[/\\]+/, ''));
    const filePath = path.resolve(baseDir, relativePath);

    if (!filePath.startsWith(baseDir)) {
      return new Response('Forbidden', { status: 403 });
    }

    const data = await readFile(filePath);
    return new Response(data);
  });
});
```

---

### 5. State Management Across Processes

**Strategy 1: Main process as single source of truth (recommended for most apps)**
```typescript
// src/main/store.ts
import { app } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface AppState {
  theme: 'light' | 'dark';
  recentFiles: string[];
  windowBounds: { x: number; y: number; width: number; height: number };
}

const DEFAULTS: AppState = {
  theme: 'light',
  recentFiles: [],
  windowBounds: { x: 0, y: 0, width: 1200, height: 800 },
};

class Store {
  private data: AppState;
  private filePath: string;

  constructor() {
    this.filePath = path.join(app.getPath('userData'), 'settings.json');
    this.data = this.load();
  }

  private load(): AppState {
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }

  get<K extends keyof AppState>(key: K): AppState[K] {
    return this.data[key];
  }

  set<K extends keyof AppState>(key: K, value: AppState[K]): void {
    this.data[key] = value;
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}

export const store = new Store();
```

**Strategy 2: electron-store (lightweight persistent storage)**
```typescript
import Store from 'electron-store';

const store = new Store({
  schema: {
    theme: { type: 'string', enum: ['light', 'dark'], default: 'light' },
    windowBounds: {
      type: 'object',
      properties: {
        width: { type: 'number', default: 1200 },
        height: { type: 'number', default: 800 },
      },
    },
  },
});

// Usage
store.set('theme', 'dark');
console.log(store.get('theme')); // 'dark'
```

**Multi-window state synchronization:**
```typescript
// Main process: broadcast state changes to all windows
import { BrowserWindow } from 'electron';

function broadcastToAllWindows(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  }
}

// When theme changes:
ipcMain.handle('settings:set-theme', (_event, theme: 'light' | 'dark') => {
  store.set('theme', theme);
  broadcastToAllWindows('settings:theme-changed', theme);
});
```

---

### 6. Build, Signing & Distribution

#### electron-builder Configuration

```yaml
# electron-builder.yml
appId: com.mycompany.myapp
productName: My App
directories:
  output: dist
  buildResources: resources

files:
  - "out/**/*"       # compiled main + preload
  - "renderer/**/*"  # built renderer assets
  - "package.json"

asar: true
compression: maximum

# ── macOS ──
mac:
  category: public.app-category.developer-tools
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: resources/entitlements.mac.plist
  entitlementsInherit: resources/entitlements.mac.plist
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]

# ── Windows ──
win:
  target:
    - target: nsis
      arch: [x64, arm64]
  signingHashAlgorithms: [sha256]

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  perMachine: false

# ── Linux ──
linux:
  target:
    - target: AppImage
    - target: deb
  category: Development
  maintainer: your-email@example.com

# ── Auto Update ──
publish:
  provider: github
  owner: your-org
  repo: your-repo
```

#### Code Signing

```bash
# macOS: requires Apple Developer certificate
# Set environment variables before building:
export CSC_LINK="path/to/Developer_ID_Application.p12"
read -rsp "macOS certificate password: " CSC_KEY_PASSWORD
echo
export CSC_KEY_PASSWORD

# Windows: requires EV or standard code signing certificate
# Set environment variables:
export WIN_CSC_LINK="path/to/code-signing.pfx"
read -rsp "Windows certificate password: " WIN_CSC_KEY_PASSWORD
echo
export WIN_CSC_KEY_PASSWORD

# Build signed app
npx electron-builder --mac --win --publish never
```

#### Auto-Update with electron-updater

```typescript
// src/main/updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false; // Let user decide
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update:downloaded');
  });

  autoUpdater.on('error', (err) => {
    log.error('Update error:', err);
    mainWindow.webContents.send('update:error', err.message);
  });

  // Check for updates every 4 hours
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000);
  autoUpdater.checkForUpdates();
}

// Expose to renderer via IPC
ipcMain.handle('update:download', () => autoUpdater.downloadUpdate());
ipcMain.handle('update:install', () => autoUpdater.quitAndInstall());
```

#### Bundle Size Optimization

- ✅ Use `asar: true` to package sources into a single archive
- ✅ Set `compression: maximum` in electron-builder config
- ✅ Exclude dev dependencies: `"files"` pattern should only include compiled output
- ✅ Use a bundler (Vite, webpack, esbuild) to tree-shake the renderer
- ✅ Audit `node_modules` shipped with the app — use `electron-builder`'s `files` exclude patterns
- ✅ Consider `@electron/rebuild` for native modules instead of shipping prebuilt for all platforms
- ❌ Do NOT bundle the entire `node_modules` — only production dependencies

---

### 7. Developer Experience & Debugging

#### Development Setup with Hot Reload

```json
// package.json scripts
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron ."
  }
}
```

**Recommended toolchain:**
- **electron-vite** or **electron-forge with Vite plugin** — modern, fast HMR for renderer
- **tsx** or **ts-node** — for running TypeScript in main process during development
- **concurrently** — run renderer dev server + Electron simultaneously

#### Debugging the Main Process

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": [".", "--remote-debugging-port=9223"],
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/out/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

**Other debugging techniques:**
```typescript
// Enable DevTools only in development
if (process.env.NODE_ENV === 'development') {
  win.webContents.openDevTools({ mode: 'detach' });
}

// Inspect specific renderer processes from command line:
// electron . --inspect=5858 --remote-debugging-port=9223
```

#### Testing Strategy

**Unit testing (Vitest / Jest):**
```typescript
// tests/unit/store.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock Electron modules for unit tests
vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/test' },
}));

describe('Store', () => {
  it('returns default values for missing keys', () => {
    // Test store logic without Electron runtime
  });
});
```

**E2E testing (Playwright + Electron):**
```typescript
// tests/e2e/app.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('app launches and shows main window', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Wait for the app to fully load
  await window.waitForLoadState('domcontentloaded');

  const title = await window.title();
  expect(title).toBe('My App');

  // Take a screenshot for visual regression
  await window.screenshot({ path: 'tests/screenshots/main-window.png' });

  await app.close();
});

test('file open dialog works via IPC', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();

  // Test IPC by evaluating in the renderer context
  const version = await window.evaluate(async () => {
    return window.electronAPI.invoke('app:get-version');
  });

  expect(version).toBeTruthy();
  await app.close();
});
```

**Playwright config for Electron:**
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 1,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

---

## Application Lifecycle Management

```typescript
// src/main/main.ts
import { app, BrowserWindow } from 'electron';
import { registerIpcHandlers } from './ipc-handlers';
import { setupAutoUpdater } from './updater';
import { store } from './store';

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
  registerIpcHandlers();
  mainWindow = createMainWindow();

  // Restore window bounds
  const bounds = store.get('windowBounds');
  if (bounds) mainWindow.setBounds(bounds);

  // Save window bounds on close
  mainWindow.on('close', () => {
    if (mainWindow) store.set('windowBounds', mainWindow.getBounds());
  });

  // Auto-update (only in production)
  if (app.isPackaged) {
    setupAutoUpdater(mainWindow);
  }

  // macOS: re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent additional renderers from being created
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault(); // Block <webview> tags
  });
});
```

---

## Common Issue Diagnostics

### White Screen on Launch
**Symptoms**: App starts but renderer shows a blank/white page
**Root causes**: Incorrect `loadFile`/`loadURL` path, build output missing, CSP blocking scripts
**Solutions**: Verify the path passed to `win.loadFile()` or `win.loadURL()` exists relative to the packaged app. Check DevTools console for CSP violations. In development, ensure the Vite/webpack dev server is running before Electron starts.

### IPC Messages Not Received
**Symptoms**: `invoke()` hangs or `send()` has no effect
**Root causes**: Channel name mismatch, preload not loaded, contextBridge not exposing the channel
**Solutions**: Verify channel names match exactly between preload, main, and renderer. Confirm `preload` path is correct in `webPreferences`. Check that the channel is in the whitelist array.

### Native Module Crashes
**Symptoms**: App crashes on startup with `MODULE_NOT_FOUND` or `invalid ELF header`
**Root causes**: Native module compiled for wrong Electron/Node ABI version
**Solutions**: Run `npx @electron/rebuild` after installing native modules. Ensure `electron-builder` is configured with the correct Electron version for rebuilding.

### App Not Updating
**Symptoms**: `autoUpdater.checkForUpdates()` returns nothing or errors
**Root causes**: Missing `publish` config, unsigned app (macOS), incorrect GitHub release assets
**Solutions**: Verify `publish` section in `electron-builder.yml`. On macOS, app must be code-signed and notarized. Ensure the GitHub release contains the `-mac.zip` and `latest-mac.yml` (or equivalent Windows files).

### Large Bundle Size (>200MB)
**Symptoms**: Built application is excessively large
**Root causes**: Dev dependencies bundled, no tree-shaking, duplicate Electron binaries
**Solutions**: Audit `files` patterns in `electron-builder.yml`. Use a bundler (Vite/esbuild) for the renderer. Check that `devDependencies` are not in `dependencies`. Use `compression: maximum`.

---

## Best Practices

- ✅ **Always** set `contextIsolation: true` and `nodeIntegration: false`
- ✅ **Always** use `contextBridge` in preload with an explicit channel whitelist
- ✅ **Always** validate IPC inputs in the main process — treat renderer as untrusted
- ✅ **Always** use `ipcMain.handle()` / `ipcRenderer.invoke()` for request/response IPC
- ✅ **Always** configure Content Security Policy headers
- ✅ **Always** sanitize URLs before passing to `shell.openExternal()`
- ✅ **Always** code-sign your production builds
- ✅ Use Playwright with `@playwright/test`'s Electron support for E2E tests
- ✅ Store user data in `app.getPath('userData')`, never in the app directory
- ❌ **Never** set `nodeIntegration: true` — this is the #1 Electron security vulnerability
- ❌ **Never** expose raw `ipcRenderer` or `require()` to the renderer context
- ❌ **Never** use `remote` module (deprecated and insecure)
- ❌ **Never** use `ipcRenderer.sendSync()` — it blocks the renderer event loop
- ❌ **Never** disable `webSecurity` in production
- ❌ **Never** load remote/untrusted content without a strict CSP and sandboxing

## Limitations

- Electron bundles Chromium + Node.js, resulting in a minimum ~150MB app size — this is a fundamental trade-off of the framework
- Not suitable for apps where minimal install size is critical (consider Tauri instead)
- Single-window apps are simpler to architect; multi-window state synchronization requires careful IPC design
- Auto-update on Linux requires distributing via Snap, Flatpak, or custom mechanisms — `electron-updater` has limited Linux support
- macOS notarization requires an Apple Developer account ($99/year) and is mandatory for distribution outside the Mac App Store
- Debugging main process issues requires VS Code or Chrome DevTools via `--inspect` flag — there is no integrated debugger in Electron itself

## Related Skills

- `chrome-extension-developer` — When building browser extensions instead of desktop apps (shares multi-process model concepts)
- `docker-expert` — When containerizing Electron's build pipeline or CI/CD
- `react-patterns` / `react-best-practices` — When using React for the renderer UI
- `typescript-pro` — When setting up advanced TypeScript configurations for multi-target builds
- `nodejs-backend-patterns` — When the main process needs complex backend logic
- `github-actions-templates` — When setting up CI/CD for cross-platform Electron builds
