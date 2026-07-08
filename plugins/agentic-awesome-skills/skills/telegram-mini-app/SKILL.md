---
name: telegram-mini-app
description: Expert in building Telegram Mini Apps (TWA) - web apps that run
  inside Telegram with native-like experience. Covers the TON ecosystem,
  Telegram Web App API, payments, user authentication, and building viral mini
  apps that monetize.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Telegram Mini App

Expert in building Telegram Mini Apps (TWA) - web apps that run inside Telegram
with native-like experience. Covers the TON ecosystem, Telegram Web App API,
payments, user authentication, and building viral mini apps that monetize.

**Role**: Telegram Mini App Architect

You build apps where 800M+ Telegram users already are. You understand
the Mini App ecosystem is exploding - games, DeFi, utilities, social
apps. You know TON blockchain and how to monetize with crypto. You
design for the Telegram UX paradigm, not traditional web.

### Expertise

- Telegram Web App API
- TON blockchain
- Mini App UX
- TON Connect
- Viral mechanics
- Crypto payments

## Capabilities

- Telegram Web App API
- Mini App architecture
- TON Connect integration
- In-app payments
- User authentication via Telegram
- Mini App UX patterns
- Viral Mini App mechanics
- TON blockchain integration

## Patterns

### Mini App Setup

Getting started with Telegram Mini Apps

**When to use**: When starting a new Mini App

## Mini App Setup

### Basic Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
  <script>
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    // User data
    const user = tg.initDataUnsafe.user;
    console.log(user.first_name, user.id);
  </script>
</body>
</html>
```

### React Setup
```jsx
// hooks/useTelegram.js
export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  return {
    tg,
    user: tg?.initDataUnsafe?.user,
    queryId: tg?.initDataUnsafe?.query_id,
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    ready: () => tg?.ready(),
  };
}

// App.jsx
function App() {
  const { tg, user, expand, ready } = useTelegram();

  useEffect(() => {
    ready();
    expand();
  }, []);

  return <div>Hello, {user?.first_name}</div>;
}
```

### Bot Integration
```javascript
// Bot sends Mini App
bot.command('app', (ctx) => {
  ctx.reply('Open the app:', {
    reply_markup: {
      inline_keyboard: [[
        { text: '🚀 Open App', web_app: { url: 'https://your-app.com' } }
      ]]
    }
  });
});
```

### TON Connect Integration

Wallet connection for TON blockchain

**When to use**: When building Web3 Mini Apps

## TON Connect Integration

### Setup
```bash
npm install @tonconnect/ui-react
```

### React Integration
```jsx
import { TonConnectUIProvider, TonConnectButton } from '@tonconnect/ui-react';

// Wrap app
function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://your-app.com/tonconnect-manifest.json">
      <MainApp />
    </TonConnectUIProvider>
  );
}

// Use in components
function WalletSection() {
  return (
    <TonConnectButton />
  );
}
```

### Manifest File
```json
{
  "url": "https://your-app.com",
  "name": "Your Mini App",
  "iconUrl": "https://your-app.com/icon.png"
}
```

### Send TON Transaction
```jsx
import { useTonConnectUI } from '@tonconnect/ui-react';

function PaymentButton({ amount, to }) {
  const [tonConnectUI] = useTonConnectUI();

  const handlePay = async () => {
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [{
        address: to,
        amount: (amount * 1e9).toString(), // TON to nanoton
      }]
    };

    await tonConnectUI.sendTransaction(transaction);
  };

  return <button onClick={handlePay}>Pay {amount} TON</button>;
}
```

### Mini App Monetization

Making money from Mini Apps

**When to use**: When planning Mini App revenue

## Mini App Monetization

### Revenue Streams
| Model | Example | Potential |
|-------|---------|-----------|
| TON payments | Premium features | High |
| In-app purchases | Virtual goods | High |
| Ads (Telegram Ads) | Display ads | Medium |
| Referral | Share to earn | Medium |
| NFT sales | Digital collectibles | High |

### Telegram Stars (New!)
```javascript
// In your bot
bot.command('premium', (ctx) => {
  ctx.replyWithInvoice({
    title: 'Premium Access',
    description: 'Unlock all features',
    payload: 'premium',
    provider_token: '', // Empty for Stars
    currency: 'XTR', // Telegram Stars
    prices: [{ label: 'Premium', amount: 100 }], // 100 Stars
  });
});
```

### Viral Mechanics
```jsx
// Referral system
function ReferralShare() {
  const { tg, user } = useTelegram();
  const referralLink = `https://t.me/your_bot?start=ref_${user.id}`;

  const share = () => {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Check this out!`
    );
  };

  return <button onClick={share}>Invite Friends (+10 coins)</button>;
}
```

### Gamification for Retention
- Daily rewards
- Streak bonuses
- Leaderboards
- Achievement badges
- Referral bonuses

### Mini App UX Patterns

UX specific to Telegram Mini Apps

**When to use**: When designing Mini App interfaces

## Mini App UX

### Platform Conventions
| Element | Implementation |
|---------|----------------|
| Main Button | tg.MainButton |
| Back Button | tg.BackButton |
| Theme | tg.themeParams |
| Haptics | tg.HapticFeedback |

### Main Button
```javascript
const tg = window.Telegram.WebApp;

// Show main button
tg.MainButton.setText('Continue');
tg.MainButton.show();
tg.MainButton.onClick(() => {
  // Handle click
  submitForm();
});

// Loading state
tg.MainButton.showProgress();
// ...
tg.MainButton.hideProgress();
```

### Theme Adaptation
```css
:root {
  --tg-theme-bg-color: var(--tg-theme-bg-color, #ffffff);
  --tg-theme-text-color: var(--tg-theme-text-color, #000000);
  --tg-theme-button-color: var(--tg-theme-button-color, #3390ec);
}

body {
  background: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
}
```

### Haptic Feedback
```javascript
// Light feedback
tg.HapticFeedback.impactOccurred('light');

// Success
tg.HapticFeedback.notificationOccurred('success');

// Selection
tg.HapticFeedback.selectionChanged();
```

## Sharp Edges

### Not validating initData from Telegram

Severity: HIGH

Situation: Backend trusts user data without verification

Symptoms:
- Trusting client data blindly
- No server-side validation
- Using initDataUnsafe directly
- Security audit failures

Why this breaks:
initData can be spoofed.
Security vulnerability.
Users can impersonate others.
Data tampering possible.

Recommended fix:

## Validating initData

### Why Validate
- initData contains user info
- Must verify it came from Telegram
- Prevent spoofing/tampering

### Node.js Validation
```javascript
import crypto from 'crypto';

function validateInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  // Sort and join
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Create secret key
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return calculatedHash === hash;
}
```

### Using in API
```javascript
app.post('/api/action', (req, res) => {
  const { initData } = req.body;

  if (!validateInitData(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid initData' });
  }

  // Safe to use data
  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));
  // ...
});
```

### TON Connect not working on mobile

Severity: HIGH

Situation: Wallet connection fails on mobile Telegram

Symptoms:
- Works on desktop, fails mobile
- Wallet app doesn't open
- Connection stuck
- Users can't pay

Why this breaks:
Deep linking issues.
Wallet app not opening.
Return URL problems.
Different behavior iOS vs Android.

Recommended fix:

## TON Connect Mobile Issues

### Common Problems
1. Wallet doesn't open
2. Return to Mini App fails
3. Transaction confirmation lost

### Fixes
```jsx
// Use correct manifest
const manifestUrl = 'https://your-domain.com/tonconnect-manifest.json';

// Ensure HTTPS
// Localhost won't work on mobile

// Handle connection states
const [tonConnectUI] = useTonConnectUI();

useEffect(() => {
  return tonConnectUI.onStatusChange((wallet) => {
    if (wallet) {
      console.log('Connected:', wallet.account.address);
    }
  });
}, []);
```

### Testing
- Test on real devices
- Test with multiple wallets (Tonkeeper, OpenMask)
- Test both iOS and Android
- Use ngrok for local dev + mobile test

### Fallback
```jsx
// Show QR for desktop
// Show wallet list for mobile
<TonConnectButton />
// Automatically handles this
```

### Mini App feels slow and janky

Severity: MEDIUM

Situation: App lags, slow transitions, poor UX

Symptoms:
- Slow initial load
- Laggy interactions
- Users complaining about speed
- High bounce rate

Why this breaks:
Too much JavaScript.
No code splitting.
Large bundle size.
No loading optimization.

Recommended fix:

## Mini App Performance

### Bundle Size
- Target < 200KB gzipped
- Use code splitting
- Lazy load routes
- Tree shake dependencies

### Quick Wins
```jsx
// Lazy load heavy components
const HeavyChart = lazy(() => import('./HeavyChart'));

// Optimize images
<img loading="lazy" src="..." />

// Use CSS instead of JS animations
```

### Loading Strategy
```jsx
function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Show skeleton immediately
    // Load data in background
    Promise.all([
      loadUserData(),
      loadAppConfig(),
    ]).then(() => setReady(true));
  }, []);

  if (!ready) return <Skeleton />;
  return <MainApp />;
}
```

### Vite Optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        }
      }
    }
  }
};
```

### Custom buttons instead of MainButton

Severity: MEDIUM

Situation: App has custom submit buttons that feel non-native

Symptoms:
- Custom submit buttons
- MainButton never used
- Inconsistent UX
- Users confused about actions

Why this breaks:
MainButton is expected UX.
Custom buttons feel foreign.
Inconsistent with Telegram.
Users don't know what to tap.

Recommended fix:

## Using MainButton Properly

### When to Use MainButton
- Form submission
- Primary actions
- Continue/Next flows
- Checkout/Payment

### Implementation
```javascript
const tg = window.Telegram.WebApp;

// Show for forms
function showMainButton(text, onClick) {
  tg.MainButton.setText(text);
  tg.MainButton.onClick(onClick);
  tg.MainButton.show();
}

// Hide when not needed
function hideMainButton() {
  tg.MainButton.hide();
  tg.MainButton.offClick();
}

// Loading state
function setMainButtonLoading(loading) {
  if (loading) {
    tg.MainButton.showProgress();
    tg.MainButton.disable();
  } else {
    tg.MainButton.hideProgress();
    tg.MainButton.enable();
  }
}
```

### React Hook
```jsx
function useMainButton(text, onClick, visible = true) {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (!tg) return;

    if (visible) {
      tg.MainButton.setText(text);
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    } else {
      tg.MainButton.hide();
    }

    return () => {
      tg.MainButton.offClick(onClick);
    };
  }, [text, onClick, visible]);
}
```

## Validation Checks

### No initData Validation

Severity: HIGH

Message: Not validating initData - security vulnerability.

Fix action: Implement server-side initData validation with hash verification

### Missing Telegram Web App Script

Severity: HIGH

Message: Telegram Web App script not included.

Fix action: Add <script src='https://telegram.org/js/telegram-web-app.js'></script>

### Not Calling tg.ready()

Severity: MEDIUM

Message: Not calling tg.ready() - Telegram may show loading state.

Fix action: Call window.Telegram.WebApp.ready() when app is ready

### Not Using Telegram Theme

Severity: MEDIUM

Message: Not adapting to Telegram theme colors.

Fix action: Use CSS variables from tg.themeParams for colors

### Missing Viewport Meta Tag

Severity: MEDIUM

Message: Missing viewport meta tag for mobile.

Fix action: Add <meta name='viewport' content='width=device-width, initial-scale=1.0'>

## Collaboration

### Delegation Triggers

- bot|command|handler -> telegram-bot-builder (Bot integration)
- TON|smart contract|blockchain -> blockchain-defi (TON blockchain features)
- react|vue|frontend -> frontend (Frontend framework)
- viral|referral|share -> viral-generator-builder (Viral mechanics)
- game|gamification -> gamification-loops (Game mechanics)

### Tap-to-Earn Game

Skills: telegram-mini-app, gamification-loops, telegram-bot-builder

Workflow:

```
1. Design game mechanics
2. Build Mini App with tap mechanics
3. Add referral/viral features
4. Integrate TON payments
5. Bot for notifications/onboarding
6. Launch and grow
```

### DeFi Mini App

Skills: telegram-mini-app, blockchain-defi, frontend

Workflow:

```
1. Design DeFi feature (swap, stake, etc.)
2. Integrate TON Connect
3. Build transaction UI
4. Add wallet management
5. Implement security measures
6. Deploy and audit
```

## Related Skills

Works well with: `telegram-bot-builder`, `frontend`, `blockchain-defi`, `viral-generator-builder`

## When to Use
- User mentions or implies: telegram mini app
- User mentions or implies: TWA
- User mentions or implies: telegram web app
- User mentions or implies: TON app
- User mentions or implies: mini app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
