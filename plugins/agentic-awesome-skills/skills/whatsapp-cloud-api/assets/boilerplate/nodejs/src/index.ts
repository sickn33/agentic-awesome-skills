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

const whatsapp = new WhatsAppClient(config);
const templates = new TemplateManager(config);

// === Express Setup ===

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Raw body capture MUST come before express.json()
app.use(express.json({ verify: rawBodyMiddleware }));

// === Webhook Routes ===

// GET - Webhook verification (Meta sends challenge)
app.get('/webhook', handleWebhookVerification(config.verifyToken));

// POST - Receive messages and status updates
app.post('/webhook', validateHMAC(config.appSecret), async (req, res) => {
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
    console.error('Error processing webhook:', error);
  }
});

// === Message Handler ===

async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
  const from = message.from;
  const content = extractMessageContent(message);

  console.log(`Message from ${from}: [${content.type}] ${content.text || content.buttonId || ''}`);

  // Mark as read
  await whatsapp.markAsRead(message.id);

  // TODO: Implement your message handling logic here
  // Example: Echo back the message
  switch (content.type) {
    case 'text':
      await whatsapp.sendText(from, `Recebi sua mensagem: "${content.text}"`);
      break;

    case 'button':
      await whatsapp.sendText(from, `Voce selecionou: ${content.text}`);
      break;

    case 'list':
      await whatsapp.sendText(from, `Voce escolheu: ${content.text}`);
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
    console.error(`Message delivery failed:`, status.errors);
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
