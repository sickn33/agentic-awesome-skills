---
name: screenshots
description: "Generate marketing screenshots of your app using Playwright. Use when the user wants to create screenshots for Product Hunt, social media, landing pages, or documentation."
risk: safe
source: "https://github.com/Shpigford/skills/tree/main/screenshots"
date_added: "2026-02-27"
---

# Screenshots

Generate marketing-quality screenshots of your app using Playwright directly. Screenshots are captured at true HiDPI (2x retina) resolution using `deviceScaleFactor: 2`.

## When to Use This Skill

Use this skill when:
- User wants to create screenshots for Product Hunt
- Creating screenshots for social media
- Generating images for landing pages
- Creating documentation screenshots
- User requests marketing-quality app screenshots

## Prerequisites

Playwright must be available. Check for it:
```bash
npx playwright --version 2>/dev/null || npm ls playwright 2>/dev/null | grep playwright
```

If not found, inform the user:
> Playwright is required. Install it with: `npm install -D playwright` or `npm install -D @playwright/test`

## Step 1: Determine App URL

If `$1` is provided, use it as the app URL.

If no URL is provided:
1. Check if a dev server is likely running by looking for `package.json` scripts
2. Use `AskUserQuestion` to ask the user for the URL or offer to help start the dev server

Common default URLs to suggest:
- `http://localhost:3000` (Next.js, Create React App, Rails)
- `http://localhost:5173` (Vite)
- `http://localhost:4000` (Phoenix)
- `http://localhost:8080` (Vue CLI, generic)

## Step 2: Gather Requirements

Use `AskUserQuestion` with the following questions:

**Question 1: Screenshot count**
- Header: "Count"
- Question: "How many screenshots do you need?"
- Options:
  - "3-5" - Quick set of key features
  - "5-10" - Comprehensive feature coverage
  - "10+" - Full marketing suite

**Question 2: Purpose**
- Header: "Purpose"
- Question: "What will these screenshots be used for?"
- Options:
  - "Product Hunt" - Hero shots and feature highlights
  - "Social media" - Eye-catching feature demos
  - "Landing page" - Marketing sections and benefits
  - "Documentation" - UI reference and tutorials

**Question 3: Authentication**
- Header: "Auth"
- Question: "Does the app require login to access the features you want to screenshot?"
- Options:
  - "No login needed" - Public pages only
  - "Yes, I'll provide credentials" - Need to log in first

If user selects "Yes, I'll provide credentials", ask follow-up questions:
- "What is the login page URL?" (e.g., `/login`, `/sign-in`)
- "What is the email/username?"
- "What is the password?"

The script will automatically detect login form fields using Playwright's smart locators.

## Step 3: Analyze Codebase for Features

Thoroughly explore the codebase to understand the app and identify screenshot opportunities.

### 3.1: Read Documentation First

**Always start by reading these files** to understand what the app does:

1. **README.md** (and any README files in subdirectories) - Read the full README to understand:
   - What the app is and what problem it solves
   - Key features and capabilities
   - Screenshots or feature descriptions already documented

2. **CHANGELOG.md** or **HISTORY.md** - Recent features worth highlighting

3. **docs/** directory - Any additional documentation about features

### 3.2: Analyze Routes to Find Pages

Read the routing configuration to discover all available pages:

| Framework | File to Read | What to Look For |
|-----------|--------------|------------------|
| **Next.js App Router** | `app/` directory structure | Each folder with `page.tsx` is a route |
| **Next.js Pages Router** | `pages/` directory | Each file is a route |
| **Rails** | `config/routes.rb` | Read the entire file for all routes |
| **React Router** | Search for `createBrowserRouter` or `<Route` | Route definitions with paths |
| **Vue Router** | `src/router/index.js` or `router.js` | Routes array with path definitions |
| **SvelteKit** | `src/routes/` directory | Each folder with `+page.svelte` is a route |
| **Remix** | `app/routes/` directory | File-based routing |
| **Laravel** | `routes/web.php` | Route definitions |
| **Django** | `urls.py` files | URL patterns |
| **Express** | Search for `app.get`, `router.get` | Route handlers |

**Important**: Actually read these files, don't just check if they exist. The route definitions tell you what pages are available for screenshots.

### 3.3: Identify Key Components

Look for components that represent screenshottable features:

- Dashboard components
- Feature sections with distinct UI
- Forms and interactive inputs
- Data visualizations (charts, graphs, tables)
- Modals and dialogs
- Navigation and sidebars
- Settings panels
- User profile sections

### 3.4: Check for Marketing Assets

Look for existing marketing content that hints at key features:
- Landing page components (often in `components/landing/` or `components/marketing/`)
- Feature list components
- Pricing tables
- Testimonial sections

### 3.5: Build Feature List

Create a comprehensive list of discovered features with:
- Feature name (from README or component name)
- URL path (from routes)
- CSS selector to focus on (from component structure)
- Required UI state (logged in, data populated, modal open, specific tab selected)

## Step 4: Plan Screenshots with User

Present the discovered features to the user and ask them to confirm or modify the list.

Use `AskUserQuestion`:
- Header: "Features"
- Question: "I found these features in your codebase. Which would you like to screenshot?"
- Options: List 3-4 key features discovered, plus "Let me pick specific ones"

If user wants specific ones, ask follow-up questions to clarify exactly what to capture.

## Step 5: Create Screenshots Directory

```bash
mkdir -p screenshots
```

## Step 6: Generate and Run Playwright Script

Create a Node.js script that uses Playwright with proper HiDPI settings. The script should:

1. **Use `deviceScaleFactor: 2`** for true retina resolution
2. **Set viewport to 1440x900** (produces 2880x1800 pixel images)
3. **Handle authentication** if credentials were provided
4. **Navigate to each page** and capture screenshots

### Script Template

Write this script to a temporary file (e.g., `screenshot-script.mjs`) and execute it:

```javascript
import { chromium } from 'playwright';

const BASE_URL = '[APP_URL]';
const SCREENSHOTS_DIR = './screenshots';

// Authentication config (if needed)
const AUTH = {
  needed: [true|false],
  loginUrl: '[LOGIN_URL]',
  email: '[EMAIL]',
  password: '[PASSWORD]',
};

// Screenshots to capture
const SCREENSHOTS = [
  { name: '01-feature-name', url: '/path', waitFor: '[optional-selector]' },
  { name: '02-another-feature', url: '/another-path' },
  // ... add all planned screenshots
];

async function main() {
  const browser = await chromium.launch();

  // Create context with HiDPI settings
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,  // This is the key for true retina screenshots
  });

  const page = await context.newPage();

  // Handle authentication if needed
  if (AUTH.needed) {
    console.log('Logging in...');
    await page.goto(AUTH.loginUrl);

    // Smart login: try multiple common patterns for email/username field
    const emailField = page.locator([
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email" i]',
      'input[name="username"]',
      'input[id="username"]',
      'input[type="text"]',
    ].join(', ')).first();
    await emailField.fill(AUTH.email);

    // Smart login: try multiple common patterns for password field
    const passwordField = page.locator([
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
    ].join(', ')).first();
    await passwordField.fill(AUTH.password);

    // Smart login: try multiple common patterns for submit button
    const submitButton = page.locator([
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Login")',
      'button:has-text("Submit")',
    ].join(', ')).first();
    await submitButton.click();

    await page.waitForLoadState('networkidle');
    console.log('Login complete');
  }

  // Capture each screenshot
  for (const shot of SCREENSHOTS) {
    console.log(`Capturing: ${shot.name}`);
    await page.goto(`${BASE_URL}${shot.url}`);
    await page.waitForLoadState('networkidle');

    // Optional: wait for specific element
    if (shot.waitFor) {
      await page.waitForSelector(shot.waitFor);
    }

    // Optional: perform actions before screenshot
    if (shot.actions) {
      for (const action of shot.actions) {
        if (action.click) await page.click(action.click);
        if (action.fill) await page.fill(action.fill.selector, action.fill.value);
        if (action.wait) await page.waitForTimeout(action.wait);
      }
    }

    await page.screenshot({
      path: `${SCREENSHOTS_DIR}/${shot.name}.png`,
      fullPage: shot.fullPage || false,
    });
    console.log(`  Saved: ${shot.name}.png`);
  }

  await browser.close();
  console.log('Done!');
}

main().catch(console.error);
```

### Running the Script

```bash
node screenshot-script.mjs
```

After running, clean up the temporary script:
```bash
rm screenshot-script.mjs
```

## Step 7: Advanced Screenshot Options

### Element-Focused Screenshots

To screenshot a specific element instead of the full viewport:

```javascript
const element = await page.locator('[CSS_SELECTOR]');
await element.screenshot({ path: `${SCREENSHOTS_DIR}/element.png` });
```

### Full Page Screenshots

For scrollable content, capture the entire page:

```javascript
await page.screenshot({
  path: `${SCREENSHOTS_DIR}/full-page.png`,
  fullPage: true
});
```

### Waiting for Animations

If the page has animations, wait for them to complete:

```javascript
await page.waitForTimeout(500); // Wait 500ms for animations
```

### Clicking Elements Before Screenshot

To capture a modal, dropdown, or hover state:

```javascript
await page.click('button.open-modal');
await page.waitForSelector('.modal-content');
await page.screenshot({ path: `${SCREENSHOTS_DIR}/modal.png` });
```

### Dark Mode Screenshots

If the app supports dark mode:

```javascript
// Set dark mode preference
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
```

## Step 8: File Naming Convention

Use descriptive, kebab-case filenames with numeric prefixes for ordering:

| Feature | Filename |
|---------|----------|
| Dashboard overview | `01-dashboard-overview.png` |
| Link management | `02-link-inbox.png` |
| Edition editor | `03-edition-editor.png` |
| Analytics | `04-analytics.png` |
| Settings | `05-settings.png` |

## Step 9: Verify and Summarize

After capturing all screenshots, verify the results:

```bash
ls -la screenshots/*.png
sips -g pixelWidth -g pixelHeight screenshots/*.png 2>/dev/null || file screenshots/*.png
```

Provide a summary to the user:

1. List all generated files with their paths
2. Confirm the resolution (should be 2880x1800 for 2x retina at 1440x900 viewport)
3. Mention total file sizes
4. Suggest any follow-up actions

Example output:
```
Generated 5 marketing screenshots:

screenshots/
├── 01-dashboard-overview.png (1.2 MB, 2880x1800 @ 2x)
├── 02-link-inbox.png (456 KB, 2880x1800 @ 2x)
├── 03-edition-editor.png (890 KB, 2880x1800 @ 2x)
├── 04-analytics.png (567 KB, 2880x1800 @ 2x)
└── 05-settings.png (234 KB, 2880x1800 @ 2x)

All screenshots are true retina-quality (2x deviceScaleFactor) and ready for marketing use.
```

## Error Handling

- **Playwright not found**: Suggest `npm install -D playwright`
- **Page not loading**: Check if the dev server is running, suggest starting it
- **Login failed**: The smart locators try common patterns but may fail on unusual login forms. If login fails, analyze the login page HTML to find the correct selectors and customize the script.
- **Element not found**: Verify the CSS selector, offer to take a full page screenshot instead
- **Screenshot failed**: Check disk space, verify write permissions to screenshots directory

## Tips for Best Results

1. **Clean UI state**: Use demo/seed data for realistic content
2. **Consistent sizing**: Use the same viewport for all screenshots
3. **Wait for content**: Use `waitForLoadState('networkidle')` to ensure all content loads
4. **Hide dev tools**: Ensure no browser extensions or dev overlays are visible
5. **Dark mode variants**: Consider capturing both light and dark mode if supported

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
