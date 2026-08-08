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
    components?: SendMessagePayload['template']
  ): Promise<SendMessageResponse> {
    return this.sendMessage({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...components,
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
    const nonRetryableCodes = [100, 131026, 131051, 132000, 132001, 132005, 133010];

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.client.post<SendMessageResponse>(
          `/${this.phoneNumberId}/messages`,
          payload
        );
        return response.data;
      } catch (error: any) {
        const errorCode = error.response?.data?.error?.code;
        const errorMessage = error.response?.data?.error?.message || error.message;

        if (nonRetryableCodes.includes(errorCode)) {
          throw new Error(`WhatsApp API Error ${errorCode}: ${errorMessage}`);
        }

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`WhatsApp API Error after ${maxRetries} retries: ${errorMessage}`);
      }
    }

    throw new Error('Unexpected: retry loop exited without return or throw');
  }
}
