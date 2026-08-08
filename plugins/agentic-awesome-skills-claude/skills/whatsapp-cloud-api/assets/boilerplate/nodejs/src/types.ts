// WhatsApp Cloud API TypeScript Types

// === Configuration ===

export interface WhatsAppConfig {
  token: string;
  phoneNumberId: string;
  wabaId: string;
  appSecret: string;
  verifyToken: string;
  graphApiVersion?: string;
}

// === Outgoing Messages ===

export interface SendMessagePayload {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
  type: MessageType;
  text?: { preview_url?: boolean; body: string };
  template?: TemplatePayload;
  image?: MediaPayload;
  document?: DocumentPayload;
  video?: MediaPayload;
  audio?: MediaPayload;
  location?: LocationPayload;
  contacts?: ContactPayload[];
  interactive?: InteractivePayload;
  reaction?: ReactionPayload;
  context?: { message_id: string };
}

export type MessageType =
  | 'text' | 'template' | 'image' | 'document' | 'video'
  | 'audio' | 'location' | 'contacts' | 'interactive'
  | 'reaction' | 'sticker';

export interface TemplatePayload {
  name: string;
  language: { code: string };
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  sub_type?: 'url' | 'quick_reply';
  index?: number;
  parameters?: TemplateParameter[];
}

export interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video';
  text?: string;
  image?: { link: string };
  document?: { link: string; filename?: string };
  video?: { link: string };
}

export interface MediaPayload {
  id?: string;
  link?: string;
  caption?: string;
}

export interface DocumentPayload extends MediaPayload {
  filename?: string;
}

export interface LocationPayload {
  longitude: number;
  latitude: number;
  name?: string;
  address?: string;
}

export interface ContactPayload {
  name: { formatted_name: string; first_name?: string; last_name?: string };
  phones?: Array<{ phone: string; type?: string }>;
  emails?: Array<{ email: string; type?: string }>;
}

export interface InteractivePayload {
  type: 'button' | 'list' | 'product' | 'product_list' | 'flow';
  header?: { type: 'text' | 'image' | 'video' | 'document'; text?: string };
  body: { text: string };
  footer?: { text: string };
  action: InteractiveAction;
}

export interface InteractiveAction {
  buttons?: Array<{
    type: 'reply';
    reply: { id: string; title: string };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  catalog_id?: string;
  product_retailer_id?: string;
  name?: string;
  parameters?: Record<string, any>;
}

export interface ReactionPayload {
  message_id: string;
  emoji: string;
}

// === API Responses ===

export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// === Webhook Events ===

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: IncomingMessage[];
  statuses?: StatusUpdate[];
  errors?: WebhookError[];
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  document?: { id: string; mime_type: string; filename: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: ContactPayload[];
  interactive?: {
    type: 'button_reply' | 'list_reply' | 'nfm_reply';
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { response_json: string };
  };
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string };
  referral?: {
    source_url: string;
    source_type: string;
    source_id: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
}

export interface StatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: { type: string };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{ code: number; title: string; message: string }>;
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: { details: string };
}

// === Template Management ===

export interface TemplateInfo {
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: Array<{
    type: string;
    format?: string;
    text?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
  }>;
  id: string;
  rejected_reason?: string;
}
