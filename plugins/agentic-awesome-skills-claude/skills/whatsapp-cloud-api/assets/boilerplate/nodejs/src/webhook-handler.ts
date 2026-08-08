import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { WebhookPayload, IncomingMessage, StatusUpdate } from './types';

const SAFE_CHALLENGE_RE = /^[A-Za-z0-9._-]{1,200}$/;
const SIGNATURE_RE = /^sha256=[a-f0-9]{64}$/i;

/**
 * Middleware para validar assinatura HMAC-SHA256 dos webhooks do WhatsApp.
 *
 * A Meta assina cada request com o App Secret. Validar esta assinatura
 * previne que requests falsificados sejam processados. Usar comparacao
 * constant-time previne timing attacks.
 *
 * IMPORTANTE: Este middleware deve ser aplicado ANTES de qualquer body parser
 * que altere o raw body (express.json() por exemplo).
 */
export function validateHMAC(appSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      console.warn('Webhook request without signature header');
      res.sendStatus(401);
      return;
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      console.error('Raw body not available. Ensure rawBody middleware is configured.');
      res.sendStatus(500);
      return;
    }

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    if (!SIGNATURE_RE.test(signature)) {
      console.warn('Invalid webhook signature format');
      res.sendStatus(401);
      return;
    }

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'utf8');
    const isValid =
      signatureBuffer.length === expectedSignatureBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer);

    if (!isValid) {
      console.warn('Invalid webhook signature');
      res.sendStatus(401);
      return;
    }

    next();
  };
}

/**
 * Middleware para capturar o raw body antes do JSON parse.
 * Necessario para validacao HMAC.
 */
export function rawBodyMiddleware(req: Request, _res: Response, buf: Buffer): void {
  (req as any).rawBody = buf;
}

/**
 * Handler de verificacao do webhook (GET).
 * A Meta envia um challenge que deve ser retornado para confirmar o endpoint.
 */
export function handleWebhookVerification(verifyToken: string) {
  return (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    if (mode === 'subscribe' && token === verifyToken && SAFE_CHALLENGE_RE.test(challenge)) {
      console.log('Webhook verified successfully');
      res.type('text/plain').status(200).send(challenge);
    } else {
      console.warn('Webhook verification failed: invalid token');
      res.status(mode === 'subscribe' && token === verifyToken ? 400 : 403).send();
    }
  };
}

/**
 * Extrai mensagens e status updates do payload do webhook.
 */
export function parseWebhookPayload(payload: WebhookPayload): {
  messages: IncomingMessage[];
  statuses: StatusUpdate[];
} {
  const messages: IncomingMessage[] = [];
  const statuses: StatusUpdate[] = [];

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.value.messages) {
        messages.push(...change.value.messages);
      }
      if (change.value.statuses) {
        statuses.push(...change.value.statuses);
      }
    }
  }

  return { messages, statuses };
}

/**
 * Extrai o texto ou ID de selecao de uma mensagem recebida.
 */
export function extractMessageContent(message: IncomingMessage): {
  type: string;
  text?: string;
  buttonId?: string;
  listId?: string;
  mediaId?: string;
  location?: { latitude: number; longitude: number };
  reaction?: { emoji: string; messageId: string };
} {
  switch (message.type) {
    case 'text':
      return { type: 'text', text: message.text?.body };

    case 'interactive':
      if (message.interactive?.type === 'button_reply') {
        return {
          type: 'button',
          buttonId: message.interactive.button_reply?.id,
          text: message.interactive.button_reply?.title,
        };
      }
      if (message.interactive?.type === 'list_reply') {
        return {
          type: 'list',
          listId: message.interactive.list_reply?.id,
          text: message.interactive.list_reply?.title,
        };
      }
      if (message.interactive?.type === 'nfm_reply') {
        return {
          type: 'flow',
          text: message.interactive.nfm_reply?.response_json,
        };
      }
      return { type: 'interactive' };

    case 'image':
      return { type: 'image', mediaId: message.image?.id };

    case 'document':
      return { type: 'document', mediaId: message.document?.id };

    case 'video':
      return { type: 'video', mediaId: message.video?.id };

    case 'audio':
      return { type: 'audio', mediaId: message.audio?.id };

    case 'location':
      return {
        type: 'location',
        location: message.location
          ? { latitude: message.location.latitude, longitude: message.location.longitude }
          : undefined,
      };

    case 'reaction':
      return {
        type: 'reaction',
        reaction: message.reaction
          ? { emoji: message.reaction.emoji, messageId: message.reaction.message_id }
          : undefined,
      };

    default:
      return { type: message.type };
  }
}
