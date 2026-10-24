# Telegram Mini App - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

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
    // Untrusted display data only; never authenticate with initDataUnsafe.
    document.body.textContent = user?.first_name ? `Hello, ${user.first_name}` : "Open in Telegram";
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
import { useEffect } from 'react';
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

function PaymentButton({ amountNano, to }) {
  const [tonConnectUI] = useTonConnectUI();

  const handlePay = async () => {
    if (!/^[1-9][0-9]*$/.test(amountNano)) throw new Error("Invalid nanoton amount");
    // Validate destination/network and approved amount server-side before wallet confirmation.
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [{
        address: to,
        amount: amountNano, // Validated integer decimal string; never float TON × 1e9
      }]
    };

    await tonConnectUI.sendTransaction(transaction);
  };

  return <button onClick={handlePay}>Review TON payment</button>;
}
```

### Mini App Monetization

Digital goods/services sold inside Telegram apps must use Telegram Stars (XTR), not TON or another currency to bypass that rule. The TON transfer fragment applies only to separately permitted use cases, with explicit recipient/network/amount review. A wallet connection is not authenticated ownership: use the documented server-side TON proof flow when required. Wallet approval/broadcast does not establish final settlement; verify the chain transaction and order before fulfillment. Revenue potential labels below are illustrative, not a forecast.

Making money from Mini Apps

**When to use**: When planning Mini App revenue


## Mini App Monetization

Digital goods/services sold inside Telegram apps must use Telegram Stars (XTR), not TON or another currency to bypass that rule. The TON transfer fragment applies only to separately permitted use cases, with explicit recipient/network/amount review. A wallet connection is not authenticated ownership: use the documented server-side TON proof flow when required. Wallet approval/broadcast does not establish final settlement; verify the chain transaction and order before fulfillment. Revenue potential labels below are illustrative, not a forecast.

### Revenue Streams
| Model | Example | Potential |
|-------|---------|-----------|
| TON payments | Premium features | High |
| In-app purchases | Virtual goods | High |
| Ads (Telegram Ads) | Display ads | Medium |
| In-app ad networks (e.g. TADS) | Native / fullscreen / rewarded ads inside the Mini App | Medium |
| Referral | Share to earn | Medium |
| NFT sales | Digital collectibles | High |

### In-app ads (rewarded and native)

Ad networks built for Mini Apps serve ads inside the app itself, so you keep the user in the flow and can reward them (extra life, coins) for a click or a full view. Example with [TADS](https://tads.me) (`npm install react-tads-widget`):

```jsx
import { TadsWidgetProvider, TadsWidget } from 'react-tads-widget';

// wrap the app once
<TadsWidgetProvider><App /></TadsWidgetProvider>

// native block inside content; onClickReward makes it a rewarded ad
<TadsWidget id="YOUR_WIDGET_ID" type="static"
  onClickReward={() => grantBonus()}
  onAdsNotFound={() => hidePlaceholder()} />
```

Fullscreen ads work the same way with `type="fullscreen"` and `onShowReward`; show them on a user action, never on load. Agent-readable docs: https://tads.me/llms.txt

#### Advertising safety and limitations

- Confirm the network, widget format, reward rules, Telegram requirements, and applicable privacy obligations for the app and audience before deployment. Tell users when content is an ad and what action earns a reward.
- Treat click/show callbacks as client-side UI signals only. Do not use them alone to grant transferable or purchasable value; validate reward events with a trusted server-side source where available, and make grants idempotent and abuse-resistant.
- Keep ad display optional and user-initiated where the format calls for it. Never show a fullscreen ad automatically on app load or make an ad interaction the only way to use a core feature.
- SDK APIs and publisher terms can change. Check the current TADS documentation and package version before copying examples into production.

### Telegram Stars
```javascript
// In your bot
bot.command('premium', (ctx) => {
  ctx.replyWithInvoice({
    title: 'Premium Access',
    description: 'Unlock all features',
    payload: 'server-generated-order-id', // Bind to expected user, price and currency
    provider_token: '', // Empty for Stars
    currency: 'XTR', // Telegram Stars
    prices: [{ label: 'Premium', amount: 100 }], // 100 Stars
  });
});
```

Handle pre_checkout_query within the documented deadline and grant access only after a verified successful_payment update with matching order/user/currency/amount. Deduplicate telegram_payment_charge_id and retain refund/support references; an invoice or client callback is not proof of payment.

### Viral Mechanics
```jsx
// Referral system
function ReferralShare() {
  const { tg, user } = useTelegram();
  if (!user?.id || !tg) return null;
  const referralLink = `https://t.me/your_bot?start=ref_${user.id}`;

  const share = () => {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=Check this out!`
    );
  };

  return <button onClick={share}>Invite Friends</button>;
}
```

Referral rewards must be verified server-side with anti-self-referral and idempotency checks; clicking Share does not prove a new participant joined.

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
  --app-bg: var(--tg-theme-bg-color, #ffffff);
  --app-text: var(--tg-theme-text-color, #000000);
  --app-button: var(--tg-theme-button-color, #3390ec);
}

body {
  background: var(--app-bg);
  color: var(--app-text);
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
  if (typeof initData !== 'string' || initData.length > 16384 || !botToken) return false;
  const params = new URLSearchParams(initData);
  if (new Set(params.keys()).size !== [...params.keys()].length) return false;
  const authDate = Number(params.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(authDate) || authDate > now + 30 || now - authDate > 300) return false;
  const hash = params.get('hash');
  if (!/^[a-fA-F0-9]{64}$/.test(hash || '')) return false;
  params.delete('hash');

  // Sort and join
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
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

  return crypto.timingSafeEqual(Buffer.from(calculatedHash, "hex"), Buffer.from(hash, "hex"));
}
```

The five-minute freshness window above is an application policy example, not Telegram’s mandated duration. After verified initData, create a bounded server session; enforce operation-level authorization and replay/idempotency protection for sensitive actions. Keep the bot token server-side; raw initData is a bearer credential and must not be logged.

### Using in API
```javascript
app.post('/api/action', (req, res) => {
  const { initData } = req.body;

  if (!validateInitData(initData, process.env.BOT_TOKEN)) {
    return res.status(401).json({ error: 'Invalid initData' });
  }

  // Safe to use data
  const params = new URLSearchParams(initData);
  let user;
  try { user = JSON.parse(params.get('user') || 'null'); }
  catch { return res.status(400).json({ error: 'Invalid user data' }); }
  if (!user || !Number.isSafeInteger(user.id)) return res.status(401).end();
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
function hideMainButton(onClick) {
  tg.MainButton.hide();
  tg.MainButton.offClick(onClick); // Remove the exact registered callback
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
6. Audit and test on an authorized test network before separately authorized deployment
```


## Primary Sources and Limits

- [Telegram initData validation and client API](https://core.telegram.org/bots/webapps)
- [Digital goods and Stars](https://core.telegram.org/bots/payments-stars)

React/bot/TON examples need the chosen SDK/version and imports; no complete backend or payment reconciliation service is bundled. TADS behavior is unverified here and its callbacks remain UI-only signals.

## Related Skills

Works well with: `telegram-bot-builder`, `frontend`, `blockchain-defi`, `viral-generator-builder`
