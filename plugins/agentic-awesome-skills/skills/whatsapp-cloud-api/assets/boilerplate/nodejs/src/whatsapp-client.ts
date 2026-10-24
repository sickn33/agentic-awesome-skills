import axios, { AxiosInstance } from 'axios';
import { WhatsAppConfig, SendMessagePayload, SendMessageResponse } from './types';

export class WhatsAppClient {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private wabaId: string;

  constructor(config: WhatsAppConfig) {
    const version = config.graphApiVersion || 'v21.0';
    this.phoneNumberId = config.phoneNumberId;
    this.wabaId = config.wabaId;

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${version}`,
      timeout: 30000,
      maxRedirects: 0,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(payload: SendMessagePayload): Promise<SendMessageResponse> {
    return this.sendWithRetry(payload);
  }

  async sendText(to: string, body: string, previewUrl = false): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body, preview_url: previewUrl },
    });
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    components?: NonNullable<SendMessagePayload['template']>['components']
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components ? { components } : {}),
      },
    });
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: { link: imageUrl, caption },
    });
  }

  async sendDocument(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: documentUrl, filename, caption },
    });
  }

  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          buttons: buttons.map((b) => ({
            type: 'reply' as const,
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
  }

  async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: { button: buttonText, sections },
      },
    });
  }

  async sendReaction(to: string, messageId: string, emoji: string): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'location',
      location: { latitude, longitude, name, address },
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.client.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }

  private async sendWithRetry(
    payload: SendMessagePayload,
    maxRetries = 3
  ): Promise<SendMessageResponse> {
    // A timeout/server error may follow acceptance. Do not retry a non-idempotent send blindly.
    try {
      const response = await this.client.post<SendMessageResponse>(`/${this.phoneNumberId}/messages`, payload);
      return response.data;
    } catch {
      throw new Error('WhatsApp send failed or outcome unknown; reconcile before retrying');
    }
  }
}
