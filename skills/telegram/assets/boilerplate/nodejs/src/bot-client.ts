import { Telegraf } from 'telegraf';
import express from 'express';

export class TelegramBotClient {
  public bot: Telegraf;

  constructor(token: string, webhookMode: boolean = false) {
    this.bot = new Telegraf(token);
    if (webhookMode) {
      this.bot.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => undefined);
    }
  }

  async startPolling(): Promise<void> {
    await this.bot.launch();
    const me = await this.bot.telegram.getMe();
    console.log(`Bot @${me.username} (${me.first_name}) started with polling`);
  }

  async startWebhook(port: number, webhookUrl: string, secret?: string): Promise<void> {
    const app = express();
    app.use(express.json());

    app.post('/webhook', async (req, res) => {
      if (secret) {
        const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
        if (headerSecret !== secret) {
          return res.sendStatus(403);
        }
      }

      await this.bot.handleUpdate(req.body, res);
      if (!res.headersSent) {
        res.sendStatus(200);
      }
    });

    // Health check
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok', bot: 'running' });
    });

    // Register webhook with Telegram
    const normalizedWebhookUrl = webhookUrl.replace(/\/+$/, '');
    await this.bot.telegram.setWebhook(`${normalizedWebhookUrl}/webhook`, {
      max_connections: 40,
      secret_token: secret,
    } as any);

    const info = await this.bot.telegram.getWebhookInfo();
    console.log('Webhook registered:', info.url);

    app.listen(port, () => {
      console.log(`Express server listening on port ${port}`);
    });

    const me = await this.bot.telegram.getMe();
    console.log(`Bot @${me.username} (${me.first_name}) started with webhook`);
  }

  /**
   * Send a text message with automatic retry on rate limit.
   */
  async sendMessageSafe(
    chatId: number | string,
    text: string,
    options?: Record<string, unknown>
  ): Promise<unknown | null> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.bot.telegram.sendMessage(chatId, text, options as any);
      } catch (error: any) {
        if (error?.response?.error_code === 429) {
          const retryAfter = error.response.parameters?.retry_after || 5;
          console.warn(`Rate limited. Retrying after ${retryAfter}s...`);
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        if (error?.response?.error_code === 403) {
          console.warn(`Bot blocked by user ${chatId}`);
          return null;
        }
        throw error;
      }
    }
    return null;
  }
}
