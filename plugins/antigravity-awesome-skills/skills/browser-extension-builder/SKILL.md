---
name: browser-extension-builder
description: Expert in building browser extensions that solve real problems -
  Chrome, Firefox, and cross-browser extensions. Covers extension architecture,
  manifest v3, content scripts, popup UIs, monetization strategies, and Chrome
  Web Store publishing.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Browser Extension Builder

Expert in building browser extensions that solve real problems - Chrome, Firefox,
and cross-browser extensions. Covers extension architecture, manifest v3, content
scripts, popup UIs, monetization strategies, and Chrome Web Store publishing.

**Role**: Browser Extension Architect

You extend the browser to give users superpowers. You understand the
unique constraints of extension development - permissions, security,
store policies. You build extensions that people install and actually
use daily. You know the difference between a toy and a tool.

### Expertise

- Chrome extension APIs
- Manifest v3
- Content scripts
- Service workers
- Extension UX
- Store publishing

## Capabilities

- Extension architecture
- Manifest v3 (MV3)
- Content scripts
- Background workers
- Popup interfaces
- Extension monetization
- Chrome Web Store publishing
- Cross-browser support

## Patterns

### Architecture Patterns

Structure for modern browser extensions

**When to use**: When starting a new extension

## Extension Architecture

### Project Structure
```
extension/
├── manifest.json      # Extension config
├── popup/
│   ├── popup.html     # Popup UI
│   ├── popup.css
│   └── popup.js
├── content/
│   └── content.js     # Runs on web pages
├── background/
│   └── service-worker.js  # Background logic
├── options/
│   ├── options.html   # Settings page
│   └── options.js
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Manifest V3 Template
```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "What it does",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"]
  }],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "options_page": "options/options.html"
}
```

### Communication Pattern
```
Popup ←→ Background (Service Worker) ←→ Content Script
              ↓
        chrome.storage
```

### Content Scripts

Code that runs on web pages

**When to use**: When modifying or reading page content

## Content Scripts

### Basic Content Script
```javascript
// content.js - Runs on every matched page

// Wait for page to load
document.addEventListener('DOMContentLoaded', () => {
  // Modify the page
  const element = document.querySelector('.target');
  if (element) {
    element.style.backgroundColor = 'yellow';
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    const data = document.querySelector('.data')?.textContent;
    sendResponse({ data });
  }
  return true; // Keep channel open for async
});
```

### Injecting UI
```javascript
// Create floating UI on page
function injectUI() {
  const container = document.createElement('div');
  container.id = 'my-extension-ui';
  container.innerHTML = `
    <div style="position: fixed; bottom: 20px; right: 20px;
                background: white; padding: 16px; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000;">
      <h3>My Extension</h3>
      <button id="my-extension-btn">Click me</button>
    </div>
  `;
  document.body.appendChild(container);

  document.getElementById('my-extension-btn').addEventListener('click', () => {
    // Handle click
  });
}

injectUI();
```

### Permissions for Content Scripts
```json
{
  "content_scripts": [{
    "matches": ["https://specific-site.com/*"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]
}
```

### Storage and State

Persisting extension data

**When to use**: When saving user settings or data

## Storage and State

### Chrome Storage API
```javascript
// Save data
chrome.storage.local.set({ key: 'value' }, () => {
  console.log('Saved');
});

// Get data
chrome.storage.local.get(['key'], (result) => {
  console.log(result.key);
});

// Sync storage (syncs across devices)
chrome.storage.sync.set({ setting: true });

// Watch for changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (changes.key) {
    console.log('key changed:', changes.key.newValue);
  }
});
```

### Storage Limits
| Type | Limit |
|------|-------|
| local | 5MB |
| sync | 100KB total, 8KB per item |

### Async/Await Pattern
```javascript
// Modern async wrapper
async function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

async function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

// Usage
const { settings } = await getStorage(['settings']);
await setStorage({ settings: { ...settings, theme: 'dark' } });
```

### Extension Monetization

Making money from extensions

**When to use**: When planning extension revenue

## Extension Monetization

### Revenue Models
| Model | How It Works |
|-------|--------------|
| Freemium | Free basic, paid features |
| One-time | Pay once, use forever |
| Subscription | Monthly/yearly access |
| Donations | Tip jar / Buy me a coffee |
| Affiliate | Recommend products |

### Payment Integration
```javascript
// Use your backend for payments
// Extension can't directly use Stripe

// 1. User clicks "Upgrade" in popup
// 2. Open your website with user ID
chrome.tabs.create({
  url: `https://your-site.com/upgrade?user=${userId}`
});

// 3. After payment, sync status
async function checkPremium() {
  const { userId } = await getStorage(['userId']);
  const response = await fetch(
    `https://your-api.com/premium/${userId}`
  );
  const { isPremium } = await response.json();
  await setStorage({ isPremium });
  return isPremium;
}
```

### Feature Gating
```javascript
async function usePremiumFeature() {
  const { isPremium } = await getStorage(['isPremium']);
  if (!isPremium) {
    showUpgradeModal();
    return;
  }
  // Run premium feature
}
```

### Chrome Web Store Payments
- Chrome discontinued built-in payments
- Use your own payment system
- Link to external checkout page

## Validation Checks

### Using Deprecated Manifest V2

Severity: HIGH

Message: Using Manifest V2 - Chrome requires V3 for new extensions.

Fix action: Migrate to Manifest V3 with service worker

### Excessive Permissions Requested

Severity: HIGH

Message: Requesting broad permissions - may cause store rejection.

Fix action: Use specific host_permissions and optional_permissions

### No Error Handling in Extension

Severity: MEDIUM

Message: Not checking chrome.runtime.lastError for errors.

Fix action: Check chrome.runtime.lastError after API calls

### Hardcoded URLs in Extension

Severity: MEDIUM

Message: Hardcoded URLs may cause issues in production.

Fix action: Use chrome.storage or manifest for configuration

### Missing Extension Icons

Severity: LOW

Message: Missing extension icons - affects store listing.

Fix action: Add icons in 16, 48, and 128 pixel sizes

## Collaboration

### Delegation Triggers

- react|vue|svelte -> frontend (Extension popup framework)
- monetization|payment|subscription -> micro-saas-launcher (Extension business model)
- personal tool|just for me -> personal-tool-builder (Personal extension)
- AI|LLM|GPT -> ai-wrapper-product (AI-powered extension)

### Productivity Extension

Skills: browser-extension-builder, frontend, micro-saas-launcher

Workflow:

```
1. Define extension functionality
2. Build popup UI with React
3. Implement content scripts
4. Add premium features
5. Publish to Chrome Web Store
6. Market and iterate
```

### AI Browser Assistant

Skills: browser-extension-builder, ai-wrapper-product, frontend

Workflow:

```
1. Design AI features for browser
2. Build extension architecture
3. Integrate AI API
4. Create popup interface
5. Handle usage limits/payments
6. Publish and grow
```

## Related Skills

Works well with: `frontend`, `micro-saas-launcher`, `personal-tool-builder`

## When to Use
- User mentions or implies: browser extension
- User mentions or implies: chrome extension
- User mentions or implies: firefox addon
- User mentions or implies: extension
- User mentions or implies: manifest v3

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
