import dotenv from 'dotenv';
dotenv.config();

import { TelegramBotClient } from './bot-client';
import { registerHandlers } from './handlers';

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('ERROR: Set TELEGRAM_BOT_TOKEN in .env file');
    process.exit(1);
  }

  const useWebhook = !!process.env.WEBHOOK_URL;
  const client = new TelegramBotClient(token, useWebhook);

  // Register all command and message handlers
  registerHandlers(client);

  if (useWebhook) {
    const port = parseInt(process.env.PORT || '3000');
    const webhookUrl = process.env.WEBHOOK_URL!;
    const secret = process.env.WEBHOOK_SECRET;
    await client.startWebhook(port, webhookUrl, secret);
    console.log(`Bot running in webhook mode on port ${port}`);
  } else {
    await client.startPolling();
    console.log('Bot running in polling mode. Press Ctrl+C to stop.');
  }
}

main().catch(console.error);
