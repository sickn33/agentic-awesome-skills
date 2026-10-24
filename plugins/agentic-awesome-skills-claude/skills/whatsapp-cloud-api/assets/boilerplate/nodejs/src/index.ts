import express from 'express';
import dotenv from 'dotenv';
import { WhatsAppClient } from './whatsapp-client';
import { TemplateManager } from './template-manager';
import {
  validateHMAC,
  rawBodyMiddleware,
  handleWebhookVerification,
  parseWebhookPayload,
  extractMessageContent,
} from './webhook-handler';
import { WhatsAppConfig, IncomingMessage, StatusUpdate } from './types';

dotenv.config();

// === Configuration ===

const config: WhatsAppConfig = {
  token: process.env.WHATSAPP_TOKEN!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
  wabaId: process.env.WABA_ID!,
  appSecret: process.env.APP_SECRET!,
  verifyToken: process.env.VERIFY_TOKEN!,
};

for (const value of [config.token, config.phoneNumberId, config.wabaId, config.appSecret, config.verifyToken]) {
  if (!value || value.startsWith('your_')) throw new Error('Missing or placeholder WhatsApp configuration');
}
const whatsapp = new WhatsAppClient(config);
const templates = new TemplateManager(config);

// === Express Setup ===

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Raw body capture MUST come before express.json()
app.use(express.json({ verify: rawBodyMiddleware, limit: '1mb' }));

// === Webhook Routes ===

// GET - Webhook verification (Meta sends challenge)
app.get('/webhook', handleWebhookVerification(config.verifyToken));

// POST - Receive messages and status updates
app.post('/webhook', validateHMAC(config.appSecret), async (req, res) => {
  if (process.env.DEMO_AUTOREPLY !== 'true') {
    // Disabled demo: no external API effects. Add durable ingest/worker before production.
    res.sendStatus(200);
    return;
  }
  // Local demo only: not durable; do not deploy this ack-before-processing path.
  // Respond 200 immediately (WhatsApp requires response within 5 seconds)
  res.sendStatus(200);

  try {
    const { messages, statuses } = parseWebhookPayload(req.body);

    for (const message of messages) {
      await handleIncomingMessage(message);
    }

    for (const status of statuses) {
      handleStatusUpdate(status);
    }
  } catch (error) {
    console.error('Webhook processing failed (details omitted)');
  }
});

// === Message Handler ===

async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  const from = message.from;
  const content = extractMessageContent(message);

  console.log('WhatsApp message received (personal content omitted)');

  // Mark as read
  await whatsapp.markAsRead(message.id);

  // TODO: Implement your message handling logic here
  // Example: Echo back the message
  switch (content.type) {
    case 'text':
      await whatsapp.sendText(from, 'Recebi sua mensagem.');
      break;

    case 'button':
      await whatsapp.sendText(from, 'Selecao recebida.');
      break;

    case 'list':
      await whatsapp.sendText(from, 'Escolha recebida.');
      break;

    case 'image':
    case 'document':
    case 'video':
    case 'audio':
      await whatsapp.sendText(from, `Recebi sua midia (${content.type}).`);
      break;

    default:
      await whatsapp.sendText(from, 'Desculpe, nao entendi. Como posso ajudar?');
      break;
  }
}

// === Status Handler ===

function handleStatusUpdate(status: StatusUpdate): void {
  console.log(`Status update: ${status.id} -> ${status.status}`);

  if (status.status === 'failed') {
    console.error('Message delivery failed (details omitted)');
  }
}

// === Health Check ===

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// === Start Server ===

app.listen(PORT, () => {
  console.log(`WhatsApp webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export { whatsapp, templates };
