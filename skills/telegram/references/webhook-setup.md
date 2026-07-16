# Webhook Setup - Telegram Bot

## Table of Contents
1. [Conceitos](#conceitos)
2. [Express.js (Node.js)](#expressjs)
3. [Flask (Python)](#flask)
4. [FastAPI (Python)](#fastapi)
5. [ngrok (desenvolvimento)](#ngrok)
6. [Deploy em producao](#deploy)
7. [Seguranca](#seguranca)
8. [Troubleshooting](#troubleshooting)

---

## Conceitos

Webhooks sao a forma recomendada para producao. O Telegram envia updates via HTTP POST para sua URL HTTPS.

**Requisitos:**
- URL HTTPS valida (certificado SSL)
- Portas suportadas: 443, 80, 88, 8443
- Responder com HTTP 200 em ate 60 segundos
- Se nao responder, Telegram retenta com backoff exponencial

**Registrar webhook:**
```
POST https://api.telegram.org/bot<TOKEN>/setWebhook
{
  "url": "https://seu-dominio.com/webhook/<TOKEN>",
  "allowed_updates": ["message", "callback_query", "inline_query"],
  "max_connections": 40,
  "secret_token": "seu_token_secreto_256chars_max"
}
```

**Verificar webhook:**
```
GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Remover webhook:**
```
POST https://api.telegram.org/bot<TOKEN>/deleteWebhook
{"drop_pending_updates": true}
```

---

## Express.js

```typescript
import express from 'express';
import { Telegraf } from 'telegraf';

const app = express();
const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!; // https://seu-dominio.com
const SECRET_TOKEN = process.env.WEBHOOK_SECRET || 'meu-secret-seguro';

const bot = new Telegraf(TOKEN);

app.use(express.json());

// Validar secret token
app.post('/webhook', async (req, res) => {
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (secretHeader !== SECRET_TOKEN) {
    return res.sendStatus(403);
  }

  await bot.handleUpdate(req.body, res);
  if (!res.headersSent) res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Registrar webhook na inicializacao
async function start() {
  await bot.telegram.setWebhook(`${WEBHOOK_URL.replace(/\/+$/, '')}/webhook`, {
    max_connections: 40,
    allowed_updates: ['message', 'callback_query'],
    secret_token: SECRET_TOKEN,
  });

  const info = await bot.telegram.getWebhookInfo();
  console.log('Webhook info:', info);

  app.listen(3000, () => console.log('Server rodando na porta 3000'));
}

// Handlers
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'Bot ativo via webhook!');
});

start();
```

---

## Flask

```python
import os
from flask import Flask, request, jsonify
from telegram import Update, Bot
from telegram.ext import Application, CommandHandler, MessageHandler, filters

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')
SECRET_TOKEN = os.getenv('WEBHOOK_SECRET', 'meu-secret-seguro')

flask_app = Flask(__name__)

# Criar application do telegram
application = Application.builder().token(TOKEN).build()

async def start(update: Update, context):
    await update.message.reply_text('Bot ativo via webhook!')

application.add_handler(CommandHandler('start', start))

@flask_app.route(f'/webhook/{TOKEN}', methods=['POST'])
async def webhook():
    # Validar secret token
    secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
    if secret != SECRET_TOKEN:
        return 'Forbidden', 403

    update = Update.de_json(request.get_json(), application.bot)
    await application.process_update(update)
    return 'OK', 200

@flask_app.route('/health')
def health():
    return jsonify(status='ok')

# Registrar webhook
import requests
requests.post(
    f'https://api.telegram.org/bot{TOKEN}/setWebhook',
    json={
        'url': f'{WEBHOOK_URL}/webhook/{TOKEN}',
        'allowed_updates': ['message', 'callback_query'],
        'secret_token': SECRET_TOKEN,
        'max_connections': 40
    }
)
```

---

## FastAPI

```python
import os
from fastapi import FastAPI, Request, HTTPException
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
WEBHOOK_URL = os.getenv('WEBHOOK_URL')
SECRET_TOKEN = os.getenv('WEBHOOK_SECRET', 'meu-secret-seguro')

app = FastAPI()
application = Application.builder().token(TOKEN).build()

async def start(update: Update, context):
    await update.message.reply_text('Bot ativo via FastAPI webhook!')

application.add_handler(CommandHandler('start', start))

@app.on_event("startup")
async def on_startup():
    await application.initialize()
    await application.bot.set_webhook(
        url=f'{WEBHOOK_URL}/webhook/{TOKEN}',
        allowed_updates=['message', 'callback_query'],
        secret_token=SECRET_TOKEN
    )

@app.on_event("shutdown")
async def on_shutdown():
    await application.shutdown()

@app.post(f'/webhook/{TOKEN}')
async def webhook(request: Request):
    secret = request.headers.get('x-telegram-bot-api-secret-token')
    if secret != SECRET_TOKEN:
        raise HTTPException(status_code=403, detail='Forbidden')

    data = await request.json()
    update = Update.de_json(data, application.bot)
    await application.process_update(update)
    return {'status': 'ok'}

@app.get('/health')
def health():
    return {'status': 'ok'}
```

---

## ngrok (desenvolvimento)

Para desenvolvimento local, use ngrok para expor sua porta local via HTTPS:

```bash
# Instalar ngrok: https://ngrok.com/download
ngrok http 3000
```

ngrok fornece URL tipo `https://abc123.ngrok-free.app`. Use essa URL para registrar o webhook.

```bash
curl -X POST "https://api.telegram.org/bot$TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://abc123.ngrok-free.app/webhook/$TOKEN\"}"
```

**Alternativa gratuita:** localtunnel
```bash
npx localtunnel --port 3000
```

---

## Deploy em Producao

### Railway
```bash
# railway.json
{
  "build": { "builder": "nixpacks" },
  "deploy": { "startCommand": "npm start" }
}
```

### Render
```yaml
# render.yaml
services:
  - type: web
    name: telegram-bot
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
```

### Vercel (Serverless)
```typescript
// api/webhook.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (secretHeader !== process.env.WEBHOOK_SECRET) {
      return res.status(403).send('Forbidden');
    }

    await bot.handleUpdate(req.body, res);
    if (!res.writableEnded) res.status(200).send('OK');
  } else {
    res.status(200).json({ status: 'ok' });
  }
}
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Seguranca

1. **Secret Token:** Sempre use `secret_token` ao registrar webhook e valide o header `X-Telegram-Bot-Api-Secret-Token`
2. **URL com token:** Inclua o token na URL do webhook para uma camada extra de seguranca
3. **IP whitelist:** Telegram envia webhooks dos IPs:
   - `149.154.160.0/20`
   - `91.108.4.0/22`
4. **HTTPS obrigatorio:** Nunca use HTTP em producao
5. **Nao exponha o token:** Use variaveis de ambiente, nunca hardcode

---

## Troubleshooting

| Problema | Causa | Solucao |
|----------|-------|---------|
| Webhook nao recebe updates | URL incorreta ou SSL invalido | Verifique com `getWebhookInfo` |
| Erro 409 Conflict | Polling e webhook ativos | Delete webhook ou pare polling |
| Erro 401 Unauthorized | Token invalido | Verifique token com `/getMe` |
| Updates duplicados | Nao retorna 200 | Garanta HTTP 200 no handler |
| `last_error_message` | Diversas | Verifique o campo em `getWebhookInfo` |
| Timeout | Handler demora >60s | Processe async, responda 200 rapido |
