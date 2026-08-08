import axios, { AxiosInstance } from 'axios';
import { WhatsAppConfig, TemplateInfo } from './types';

export class TemplateManager {
  private client: AxiosInstance;
  private wabaId: string;

  constructor(config: WhatsAppConfig) {
    const version = config.graphApiVersion || 'v21.0';
    this.wabaId = config.wabaId;

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/${version}`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async listTemplates(status?: string): Promise<TemplateInfo[]> {
    const params: Record<string, any> = { limit: 100 };
    if (status) params.status = status;

    const response = await this.client.get(`/${this.wabaId}/message_templates`, { params });
    return response.data.data;
  }

  async createTemplate(
    name: string,
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    language: string,
    components: Array<{
      type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
      format?: string;
      text?: string;
      example?: Record<string, any>;
      buttons?: Array<Record<string, any>>;
    }>
  ): Promise<{ id: string; status: string; category: string }> {
    const response = await this.client.post(`/${this.wabaId}/message_templates`, {
      name,
      category,
      language,
      components,
    });
    return response.data;
  }

  async deleteTemplate(templateName: string): Promise<void> {
    await this.client.delete(`/${this.wabaId}/message_templates`, {
      data: { name: templateName },
    });
  }

  async getApprovedTemplates(): Promise<TemplateInfo[]> {
    return this.listTemplates('APPROVED');
  }

  async getPendingTemplates(): Promise<TemplateInfo[]> {
    return this.listTemplates('PENDING');
  }

  async getRejectedTemplates(): Promise<TemplateInfo[]> {
    return this.listTemplates('REJECTED');
  }
}
