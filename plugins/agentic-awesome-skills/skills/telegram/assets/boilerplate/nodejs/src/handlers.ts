import { TelegramBotClient } from './bot-client';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function registerHandlers(client: TelegramBotClient): void {
  const bot = client.bot;

  bot.start(async (ctx) => {
    const name = escapeHtml(ctx.from?.first_name || 'usuario');
    await client.sendMessageSafe(
      ctx.chat.id,
      `Ola, ${name}! Bem-vindo ao bot.\n\nComandos disponiveis:\n/start - Iniciar\n/help - Ajuda\n/about - Sobre`,
      { parse_mode: 'HTML' }
    );
  });

  bot.help(async (ctx) => {
    await client.sendMessageSafe(
      ctx.chat.id,
      '<b>Comandos:</b>\n' +
        '/start - Iniciar o bot\n' +
        '/help - Ver esta mensagem\n' +
        '/about - Informacoes sobre o bot\n' +
        '/echo &lt;texto&gt; - Repetir texto',
      { parse_mode: 'HTML' }
    );
  });

  bot.command('about', async (ctx) => {
    const me = await bot.telegram.getMe();
    const firstName = escapeHtml(me.first_name);
    const username = escapeHtml(me.username || 'sem_username');
    await client.sendMessageSafe(
      ctx.chat.id,
      `<b>${firstName}</b>\n@${username}\n\nBot criado com Telegram Bot API`,
      { parse_mode: 'HTML' }
    );
  });

  bot.hears(/^\/echo (.+)/, async (ctx) => {
    const text = ctx.match?.[1] || '';
    await client.sendMessageSafe(ctx.chat.id, text);
  });

  bot.on('callback_query', async (ctx) => {
    const data = 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    await ctx.answerCbQuery(`Opcao: ${data}`);

    if (ctx.callbackQuery.message) {
      await ctx.editMessageText(`Voce escolheu: ${data}`);
    }
  });

  bot.on('text', async (ctx) => {
    if (ctx.message.text.startsWith('/')) return;

    await client.sendMessageSafe(ctx.chat.id, `Voce disse: ${ctx.message.text}`);
  });

  bot.catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Telegram bot error:', message);
  });

  console.log('All handlers registered');
}
