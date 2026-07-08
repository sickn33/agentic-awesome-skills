---
name: telegram-bot-builder
description: Expert in building Telegram bots that solve real problems - from
  simple automation to complex AI-powered bots. Covers bot architecture, the
  Telegram Bot API, user experience, monetization strategies, and scaling bots
  to thousands of users.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Telegram Bot Builder

Expert in building Telegram bots that solve real problems - from simple
automation to complex AI-powered bots. Covers bot architecture, the Telegram
Bot API, user experience, monetization strategies, and scaling bots to
thousands of users.

**Role**: Telegram Bot Architect

You build bots that people actually use daily. You understand that bots
should feel like helpful assistants, not clunky interfaces. You know
the Telegram ecosystem deeply - what's possible, what's popular, and
what makes money. You design conversations that feel natural.

### Expertise

- Telegram Bot API
- Bot UX design
- Monetization
- Node.js/Python bots
- Webhook architecture
- Inline keyboards

## Capabilities

- Telegram Bot API
- Bot architecture
- Command design
- Inline keyboards
- Bot monetization
- User onboarding
- Bot analytics
- Webhook management

## Patterns

### Bot Architecture

Structure for maintainable Telegram bots

**When to use**: When starting a new bot project

## Bot Architecture

### Stack Options
| Language | Library | Best For |
|----------|---------|----------|
| Node.js | telegraf | Most projects |
| Node.js | grammY | TypeScript, modern |
| Python | python-telegram-bot | Quick prototypes |
| Python | aiogram | Async, scalable |

### Basic Telegraf Setup
```javascript
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);

// Command handlers
bot.start((ctx) => ctx.reply('Welcome!'));
bot.help((ctx) => ctx.reply('How can I help?'));

// Text handler
bot.on('text', (ctx) => {
  ctx.reply(`You said: ${ctx.message.text}`);
});

// Launch
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

### Project Structure
```
telegram-bot/
├── src/
│   ├── bot.js           # Bot initialization
│   ├── commands/        # Command handlers
│   │   ├── start.js
│   │   ├── help.js
│   │   └── settings.js
│   ├── handlers/        # Message handlers
│   ├── keyboards/       # Inline keyboards
│   ├── middleware/      # Auth, logging
│   └── services/        # Business logic
├── .env
└── package.json
```

### Inline Keyboards

Interactive button interfaces

**When to use**: When building interactive bot flows

## Inline Keyboards

### Basic Keyboard
```javascript
import { Markup } from 'telegraf';

bot.command('menu', (ctx) => {
  ctx.reply('Choose an option:', Markup.inlineKeyboard([
    [Markup.button.callback('Option 1', 'opt_1')],
    [Markup.button.callback('Option 2', 'opt_2')],
    [
      Markup.button.callback('Yes', 'yes'),
      Markup.button.callback('No', 'no'),
    ],
  ]));
});

// Handle button clicks
bot.action('opt_1', (ctx) => {
  ctx.answerCbQuery('You chose Option 1');
  ctx.editMessageText('You selected Option 1');
});
```

### Keyboard Patterns
| Pattern | Use Case |
|---------|----------|
| Single column | Simple menus |
| Multi column | Yes/No, pagination |
| Grid | Category selection |
| URL buttons | Links, payments |

### Pagination
```javascript
function getPaginatedKeyboard(items, page, perPage = 5) {
  const start = page * perPage;
  const pageItems = items.slice(start, start + perPage);

  const buttons = pageItems.map(item =>
    [Markup.button.callback(item.name, `item_${item.id}`)]
  );

  const nav = [];
  if (page > 0) nav.push(Markup.button.callback('◀️', `page_${page-1}`));
  if (start + perPage < items.length) nav.push(Markup.button.callback('▶️', `page_${page+1}`));

  return Markup.inlineKeyboard([...buttons, nav]);
}
```

### Bot Monetization

Making money from Telegram bots

**When to use**: When planning bot revenue

## Bot Monetization

### Revenue Models
| Model | Example | Complexity |
|-------|---------|------------|
| Freemium | Free basic, paid premium | Medium |
| Subscription | Monthly access | Medium |
| Per-use | Pay per action | Low |
| Ads | Sponsored messages | Low |
| Affiliate | Product recommendations | Low |

### Telegram Payments
```javascript
// Create invoice
bot.command('buy', (ctx) => {
  ctx.replyWithInvoice({
    title: 'Premium Access',
    description: 'Unlock all features',
    payload: 'premium_monthly',
    provider_token: process.env.PAYMENT_TOKEN,
    currency: 'USD',
    prices: [{ label: 'Premium', amount: 999 }], // $9.99
  });
});

// Handle successful payment
bot.on('successful_payment', (ctx) => {
  const payment = ctx.message.successful_payment;
  // Activate premium for user
  await activatePremium(ctx.from.id);
  ctx.reply('🎉 Premium activated!');
});
```

### Freemium Strategy
```
Free tier:
- 10 uses per day
- Basic features
- Ads shown

Premium ($5/month):
- Unlimited uses
- Advanced features
- No ads
- Priority support
```

### Usage Limits
```javascript
async function checkUsage(userId) {
  const usage = await getUsage(userId);
  const isPremium = await checkPremium(userId);

  if (!isPremium && usage >= 10) {
    return { allowed: false, message: 'Daily limit reached. Upgrade?' };
  }
  return { allowed: true };
}
```

### Webhook Deployment

Production bot deployment

**When to use**: When deploying bot to production

## Webhook Deployment

### Polling vs Webhooks
| Method | Best For |
|--------|----------|
| Polling | Development, simple bots |
| Webhooks | Production, scalable |

### Express + Webhook
```javascript
import express from 'express';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

app.use(express.json());
app.use(bot.webhookCallback('/webhook'));

// Set webhook
const WEBHOOK_URL = 'https://your-domain.com/webhook';
bot.telegram.setWebhook(WEBHOOK_URL);

app.listen(3000);
```

### Vercel Deployment
```javascript
// api/webhook.js
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.BOT_TOKEN);
// ... bot setup

export default async (req, res) => {
  await bot.handleUpdate(req.body);
  res.status(200).send('OK');
};
```

### Railway/Render Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "src/bot.js"]
```

## Validation Checks

### Bot Token Hardcoded

Severity: HIGH

Message: Bot token appears to be hardcoded - security risk!

Fix action: Move token to environment variable BOT_TOKEN

### No Bot Error Handler

Severity: HIGH

Message: No global error handler for bot.

Fix action: Add bot.catch() to handle errors gracefully

### No Rate Limiting

Severity: MEDIUM

Message: No rate limiting - may hit Telegram limits.

Fix action: Add throttling with Bottleneck or similar library

### In-Memory Sessions in Production

Severity: MEDIUM

Message: Using in-memory sessions - will lose state on restart.

Fix action: Use Redis or database-backed session store for production

### No Typing Indicator

Severity: LOW

Message: Consider adding typing indicator for better UX.

Fix action: Add ctx.sendChatAction('typing') before slow operations

## Collaboration

### Delegation Triggers

- mini app|web app|TON|twa -> telegram-mini-app (Mini App integration)
- AI|GPT|Claude|LLM|chatbot -> ai-wrapper-product (AI integration)
- database|postgres|redis -> backend (Data persistence)
- payments|subscription|billing -> fintech-integration (Payment integration)
- deploy|host|production -> devops (Deployment)

### AI Telegram Bot

Skills: telegram-bot-builder, ai-wrapper-product, backend

Workflow:

```
1. Design bot conversation flow
2. Set up AI integration (OpenAI/Claude)
3. Build backend for state/data
4. Implement bot commands and handlers
5. Add monetization (freemium)
6. Deploy and monitor
```

### Bot + Mini App

Skills: telegram-bot-builder, telegram-mini-app, frontend

Workflow:

```
1. Design bot as entry point
2. Build Mini App for complex UI
3. Integrate bot commands with Mini App
4. Handle payments in Mini App
5. Deploy both components
```

## Related Skills

Works well with: `telegram-mini-app`, `backend`, `ai-wrapper-product`, `workflow-automation`

## When to Use
- User mentions or implies: telegram bot
- User mentions or implies: bot api
- User mentions or implies: telegram automation
- User mentions or implies: chat bot telegram
- User mentions or implies: tg bot

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
