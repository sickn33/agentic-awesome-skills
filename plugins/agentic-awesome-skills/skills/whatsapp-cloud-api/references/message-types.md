# WhatsApp Cloud API - Tipos de Mensagem (Referencia Completa)

> Referencia completa de todos os tipos de mensagem suportados pela WhatsApp Cloud API v21.0.
> Exemplos em Node.js/TypeScript (axios) e Python (httpx async).

**Base URL:** `https://graph.facebook.com/v21.0`

**Variaveis de ambiente necessarias:**

```env
WHATSAPP_TOKEN=seu_token_aqui
PHONE_NUMBER_ID=seu_phone_number_id
```

---

## 1. Mensagem de Texto (Text Message)

Mensagem de texto simples. Suporta ate 4096 caracteres. A opcao `preview_url` gera uma
pre-visualizacao automatica quando a mensagem contem um link.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "text",
  "text": {
    "preview_url": true,
    "body": "Confira nosso site: https://exemplo.com.br"
  }
}
```

### Node.js / TypeScript

```typescript
import axios from "axios";

interface TextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    preview_url?: boolean;
    body: string;
  };
}

async function sendTextMessage(to: string, body: string, previewUrl = false): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: TextMessage = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: previewUrl, body },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
import os
import httpx

async def send_text_message(to: str, body: str, preview_url: bool = False) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {"preview_url": preview_url, "body": body},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
        return data["messages"][0]["id"]
```

### Resposta esperada

```json
{
  "messaging_product": "whatsapp",
  "contacts": [{ "input": "5511999999999", "wa_id": "5511999999999" }],
  "messages": [{ "id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ..." }]
}
```

### Notas

- Limite de 4096 caracteres no campo `body`.
- `preview_url: true` exige que o corpo contenha uma URL valida para gerar a pre-visualizacao.
- Formatacao suportada: `*negrito*`, `_italico_`, `~tachado~`, `` `monoespaco` ``.

---

## 2. Mensagem de Template (Template Message)

Templates sao mensagens pre-aprovadas pela Meta. Obrigatorias para iniciar conversas (fora da
janela de 24h). Suportam variaveis, cabecalhos com midia e botoes.

### 2a. Template com variaveis

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "pedido_confirmado",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "Renato" },
          { "type": "text", "text": "#12345" }
        ]
      }
    ]
  }
}
```

### 2b. Template com cabecalho de imagem

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "promo_imagem",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "header",
        "parameters": [
          {
            "type": "image",
            "image": { "link": "https://exemplo.com/banner.jpg" }
          }
        ]
      },
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "20%" }]
      }
    ]
  }
}
```

### 2c. Template com botoes (Quick Reply + CTA)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "acompanhar_pedido",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [{ "type": "text", "text": "#12345" }]
      },
      {
        "type": "button",
        "sub_type": "quick_reply",
        "index": "0",
        "parameters": [{ "type": "payload", "payload": "SIM_CONFIRMAR" }]
      },
      {
        "type": "button",
        "sub_type": "url",
        "index": "1",
        "parameters": [{ "type": "text", "text": "12345" }]
      }
    ]
  }
}
```

### Node.js / TypeScript

```typescript
interface TemplateParameter {
  type: "text" | "image" | "document" | "video" | "payload";
  text?: string;
  payload?: string;
  image?: { link: string };
}

interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "quick_reply" | "url";
  index?: string;
  parameters: TemplateParameter[];
}

interface TemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components: TemplateComponent[];
  };
}

async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  components: TemplateComponent[]
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: TemplateMessage = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_template_message(
    to: str,
    template_name: str,
    language_code: str,
    components: list[dict],
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components,
        },
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Templates precisam ser aprovados no Meta Business Manager antes do uso.
- O campo `language.code` deve corresponder exatamente ao idioma aprovado (ex: `pt_BR`).
- Botoes do tipo `url` usam sufixos dinamicos: o parametro e concatenado ao final da URL base definida no template.
- Botoes do tipo `quick_reply` retornam o `payload` configurado no webhook quando clicados.
- Limite de 3 botoes quick_reply ou 2 botoes CTA por template.

---

## 3. Mensagem de Imagem (Image Message)

Envia uma imagem para o destinatario. Pode ser por URL publica ou por media ID
(apos upload previo para a API de midia).

### 3a. Via URL

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "image",
  "image": {
    "link": "https://exemplo.com/foto.jpg",
    "caption": "Foto do produto"
  }
}
```

### 3b. Via Media ID

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "image",
  "image": {
    "id": "1234567890",
    "caption": "Foto do produto"
  }
}
```

### Node.js / TypeScript

```typescript
interface ImageMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "image";
  image: {
    link?: string;
    id?: string;
    caption?: string;
  };
}

async function sendImageMessage(
  to: string,
  source: { link: string } | { id: string },
  caption?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: ImageMessage = {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { ...source, caption },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_image_message(
    to: str,
    source: dict,  # {"link": "..."} ou {"id": "..."}
    caption: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    image_payload = {**source}
    if caption:
        image_payload["caption"] = caption

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "image",
        "image": image_payload,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Formatos suportados: JPEG, PNG.
- Tamanho maximo: 5 MB.
- A URL precisa ser publica e acessivel (sem autenticacao).
- `caption` e opcional, ate 1024 caracteres.

---

## 4. Mensagem de Documento (Document Message)

Envia documentos como PDFs, planilhas, etc. O campo `filename` define o nome exibido
para download no dispositivo do destinatario.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "document",
  "document": {
    "link": "https://exemplo.com/relatorio.pdf",
    "caption": "Relatorio mensal - Janeiro 2026",
    "filename": "relatorio-janeiro-2026.pdf"
  }
}
```

### Node.js / TypeScript

```typescript
interface DocumentMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "document";
  document: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
}

async function sendDocumentMessage(
  to: string,
  source: { link: string } | { id: string },
  filename: string,
  caption?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: DocumentMessage = {
    messaging_product: "whatsapp",
    to,
    type: "document",
    document: { ...source, filename, caption },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_document_message(
    to: str,
    source: dict,
    filename: str,
    caption: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    doc_payload = {**source, "filename": filename}
    if caption:
        doc_payload["caption"] = caption

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "document",
        "document": doc_payload,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Formatos suportados: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT e outros.
- Tamanho maximo: 100 MB.
- `filename` e exibido no dispositivo do destinatario como nome do arquivo para download.
- `caption` e opcional, ate 1024 caracteres.

---

## 5. Mensagem de Video (Video Message)

Envia um video com legenda opcional. Util para tutoriais, demonstracoes de produto, etc.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "video",
  "video": {
    "link": "https://exemplo.com/demo.mp4",
    "caption": "Demonstracao do produto"
  }
}
```

### Node.js / TypeScript

```typescript
interface VideoMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "video";
  video: {
    link?: string;
    id?: string;
    caption?: string;
  };
}

async function sendVideoMessage(
  to: string,
  source: { link: string } | { id: string },
  caption?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: VideoMessage = {
    messaging_product: "whatsapp",
    to,
    type: "video",
    video: { ...source, caption },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_video_message(
    to: str,
    source: dict,
    caption: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    video_payload = {**source}
    if caption:
        video_payload["caption"] = caption

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "video",
        "video": video_payload,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Formatos suportados: MP4, 3GPP (somente codecs H.264 e AAC).
- Tamanho maximo: 16 MB.
- `caption` e opcional, ate 1024 caracteres.

---

## 6. Mensagem de Audio (Audio Message)

Envia uma mensagem de voz ou arquivo de audio. Reproduzido diretamente no chat como
mensagem de voz.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "audio",
  "audio": {
    "link": "https://exemplo.com/audio.ogg"
  }
}
```

### Node.js / TypeScript

```typescript
interface AudioMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "audio";
  audio: {
    link?: string;
    id?: string;
  };
}

async function sendAudioMessage(
  to: string,
  source: { link: string } | { id: string }
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: AudioMessage = {
    messaging_product: "whatsapp",
    to,
    type: "audio",
    audio: source,
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_audio_message(
    to: str,
    source: dict,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "audio",
        "audio": source,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Formatos suportados: OGG (com codec OPUS), MP3, AMR, AAC, M4A.
- Tamanho maximo: 16 MB.
- Audio NAO suporta `caption`.
- Arquivos `.ogg` com codec OPUS sao reproduzidos como mensagem de voz (com icone de microfone).

---

## 7. Botoes Interativos - Quick Reply (Interactive Buttons)

Exibe ate 3 botoes de resposta rapida. Quando o usuario toca em um botao, a resposta
e enviada automaticamente como mensagem de texto e o `id` do botao e retornado no webhook.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "header": {
      "type": "text",
      "text": "Confirmacao de Pedido"
    },
    "body": {
      "text": "Seu pedido #12345 esta pronto. Deseja confirmar a entrega?"
    },
    "footer": {
      "text": "Responda em ate 24h"
    },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "btn_confirmar", "title": "Confirmar" } },
        { "type": "reply", "reply": { "id": "btn_reagendar", "title": "Reagendar" } },
        { "type": "reply", "reply": { "id": "btn_cancelar", "title": "Cancelar" } }
      ]
    }
  }
}
```

### Node.js / TypeScript

```typescript
interface ReplyButton {
  type: "reply";
  reply: { id: string; title: string };
}

interface InteractiveButtonMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: { buttons: ReplyButton[] };
  };
}

async function sendButtonMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>,
  header?: string,
  footer?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const interactive: InteractiveButtonMessage["interactive"] = {
    type: "button",
    body: { text: body },
    action: {
      buttons: buttons.map((b) => ({
        type: "reply" as const,
        reply: { id: b.id, title: b.title },
      })),
    },
  };

  if (header) interactive.header = { type: "text", text: header };
  if (footer) interactive.footer = { text: footer };

  const payload: InteractiveButtonMessage = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive,
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_button_message(
    to: str,
    body: str,
    buttons: list[dict],  # [{"id": "btn_1", "title": "Opcao 1"}, ...]
    header: str | None = None,
    footer: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    interactive: dict = {
        "type": "button",
        "body": {"text": body},
        "action": {
            "buttons": [
                {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                for b in buttons
            ]
        },
    }

    if header:
        interactive["header"] = {"type": "text", "text": header}
    if footer:
        interactive["footer"] = {"text": footer}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": interactive,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Maximo de 3 botoes por mensagem.
- Titulo do botao: ate 20 caracteres.
- ID do botao: ate 256 caracteres.
- `body` e obrigatorio; `header` e `footer` sao opcionais.
- O `header` tambem pode ser do tipo `image`, `video` ou `document`.

---

## 8. Lista Interativa (Interactive List)

Exibe um menu com secoes e opcoes selecionaveis. Ideal para catalogos, menus de atendimento,
selecao de horarios, etc.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "header": {
      "type": "text",
      "text": "Cardapio do Dia"
    },
    "body": {
      "text": "Escolha uma opcao do nosso cardapio:"
    },
    "footer": {
      "text": "Entrega em ate 40min"
    },
    "action": {
      "button": "Ver opcoes",
      "sections": [
        {
          "title": "Pratos Principais",
          "rows": [
            { "id": "prato_1", "title": "Frango Grelhado", "description": "Com arroz e salada - R$32" },
            { "id": "prato_2", "title": "Peixe Assado", "description": "Com pure e legumes - R$38" }
          ]
        },
        {
          "title": "Bebidas",
          "rows": [
            { "id": "bebida_1", "title": "Suco Natural", "description": "Laranja, limao ou maracuja - R$8" },
            { "id": "bebida_2", "title": "Agua Mineral", "description": "Com ou sem gas - R$5" }
          ]
        }
      ]
    }
  }
}
```

### Node.js / TypeScript

```typescript
interface ListRow {
  id: string;
  title: string;
  description?: string;
}

interface ListSection {
  title: string;
  rows: ListRow[];
}

interface InteractiveListMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    header?: { type: "text"; text: string };
    body: { text: string };
    footer?: { text: string };
    action: {
      button: string;
      sections: ListSection[];
    };
  };
}

async function sendListMessage(
  to: string,
  body: string,
  buttonText: string,
  sections: ListSection[],
  header?: string,
  footer?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const interactive: InteractiveListMessage["interactive"] = {
    type: "list",
    body: { text: body },
    action: { button: buttonText, sections },
  };

  if (header) interactive.header = { type: "text", text: header };
  if (footer) interactive.footer = { text: footer };

  const payload: InteractiveListMessage = {
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive,
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_list_message(
    to: str,
    body: str,
    button_text: str,
    sections: list[dict],
    header: str | None = None,
    footer: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    interactive: dict = {
        "type": "list",
        "body": {"text": body},
        "action": {"button": button_text, "sections": sections},
    }

    if header:
        interactive["header"] = {"type": "text", "text": header}
    if footer:
        interactive["footer"] = {"text": footer}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": interactive,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- Maximo de 10 secoes.
- Maximo de 10 opcoes (rows) no total entre todas as secoes.
- Titulo da row: ate 24 caracteres.
- Descricao da row: ate 72 caracteres (opcional).
- Texto do botao (`action.button`): ate 20 caracteres.
- `header` so suporta tipo `text` em listas (sem midia).

---

## 9. Mensagem de Localizacao (Location Message)

Compartilha uma localizacao geografica com coordenadas, nome e endereco.
Util para enviar endereco de lojas, pontos de encontro, etc.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "location",
  "location": {
    "latitude": -23.5505,
    "longitude": -46.6333,
    "name": "Loja Centro SP",
    "address": "Av. Paulista, 1000 - Bela Vista, Sao Paulo - SP"
  }
}
```

### Node.js / TypeScript

```typescript
interface LocationMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

async function sendLocationMessage(
  to: string,
  latitude: number,
  longitude: number,
  name?: string,
  address?: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: LocationMessage = {
    messaging_product: "whatsapp",
    to,
    type: "location",
    location: { latitude, longitude, name, address },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_location_message(
    to: str,
    latitude: float,
    longitude: float,
    name: str | None = None,
    address: str | None = None,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    location_data: dict = {"latitude": latitude, "longitude": longitude}
    if name:
        location_data["name"] = name
    if address:
        location_data["address"] = address

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "location",
        "location": location_data,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- `latitude` e `longitude` sao obrigatorios.
- `name` e `address` sao opcionais mas recomendados para melhor experiencia do usuario.
- A localizacao e exibida com um mapa integrado no WhatsApp.

---

## 10. Mensagem de Contato (Contact Message)

Compartilha um cartao de contato (vCard) com informacoes como nome, telefone, email, etc.
O destinatario pode salvar o contato diretamente na agenda.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "contacts",
  "contacts": [
    {
      "name": {
        "formatted_name": "Suporte TechCo",
        "first_name": "Suporte",
        "last_name": "TechCo"
      },
      "phones": [
        { "phone": "+5511988887777", "type": "WORK", "wa_id": "5511988887777" }
      ],
      "emails": [
        { "email": "suporte@techco.com.br", "type": "WORK" }
      ],
      "org": {
        "company": "TechCo Solucoes"
      },
      "urls": [
        { "url": "https://techco.com.br", "type": "WORK" }
      ]
    }
  ]
}
```

### Node.js / TypeScript

```typescript
interface ContactName {
  formatted_name: string;
  first_name?: string;
  last_name?: string;
}

interface ContactPhone {
  phone: string;
  type?: "CELL" | "MAIN" | "IPHONE" | "HOME" | "WORK";
  wa_id?: string;
}

interface ContactInfo {
  name: ContactName;
  phones?: ContactPhone[];
  emails?: Array<{ email: string; type?: string }>;
  org?: { company: string };
  urls?: Array<{ url: string; type?: string }>;
}

interface ContactMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "contacts";
  contacts: ContactInfo[];
}

async function sendContactMessage(
  to: string,
  contacts: ContactInfo[]
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: ContactMessage = {
    messaging_product: "whatsapp",
    to,
    type: "contacts",
    contacts,
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_contact_message(
    to: str,
    contacts: list[dict],
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "contacts",
        "contacts": contacts,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- O campo `name.formatted_name` e obrigatorio.
- Pode enviar multiplos contatos em uma unica mensagem (array `contacts`).
- `wa_id` permite que o destinatario inicie conversa direto com o contato no WhatsApp.
- Campos suportados: `addresses`, `birthday`, `emails`, `name`, `org`, `phones`, `urls`.

---

## 11. Mensagem de Reacao (Reaction Message)

Reage a uma mensagem existente com um emoji. Para remover a reacao, envie com `emoji` vazio.

### Payload JSON (adicionar reacao)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "reaction",
  "reaction": {
    "message_id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ...",
    "emoji": "\ud83d\udc4d"
  }
}
```

### Payload JSON (remover reacao)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "reaction",
  "reaction": {
    "message_id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ...",
    "emoji": ""
  }
}
```

### Node.js / TypeScript

```typescript
interface ReactionMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "reaction";
  reaction: {
    message_id: string;
    emoji: string;
  };
}

async function sendReaction(
  to: string,
  messageId: string,
  emoji: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: ReactionMessage = {
    messaging_product: "whatsapp",
    to,
    type: "reaction",
    reaction: { message_id: messageId, emoji },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}

async function removeReaction(to: string, messageId: string): Promise<string> {
  return sendReaction(to, messageId, "");
}
```

### Python

```python
async def send_reaction(to: str, message_id: str, emoji: str) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "reaction",
        "reaction": {"message_id": message_id, "emoji": emoji},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]


async def remove_reaction(to: str, message_id: str) -> str:
    return await send_reaction(to, message_id, "")
```

### Notas

- `message_id` deve ser o ID da mensagem original a qual se deseja reagir.
- Para remover uma reacao, envie `emoji` como string vazia `""`.
- Apenas um emoji por reacao por remetente por mensagem.
- Qualquer emoji Unicode e suportado.

---

## 12. Mensagem com Contexto / Resposta (Reply / Context Message)

Responde a uma mensagem especifica usando o `message_id` como contexto. A mensagem
aparece no chat do destinatario com a citacao visual da mensagem original.

Funciona com qualquer tipo de mensagem (texto, imagem, botoes, etc.) adicionando o campo `context`.

### Payload JSON (resposta de texto)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "context": {
    "message_id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ..."
  },
  "type": "text",
  "text": {
    "body": "Obrigado pela sua mensagem! Vamos verificar e retornar em breve."
  }
}
```

### Payload JSON (resposta com imagem)

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "context": {
    "message_id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ..."
  },
  "type": "image",
  "image": {
    "link": "https://exemplo.com/resposta.jpg",
    "caption": "Aqui esta a imagem solicitada"
  }
}
```

### Node.js / TypeScript

```typescript
interface ContextPayload {
  message_id: string;
}

async function sendReplyMessage(
  to: string,
  replyToMessageId: string,
  body: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    context: { message_id: replyToMessageId } as ContextPayload,
    type: "text",
    text: { body },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}

// Funcao generica que adiciona contexto a qualquer payload de mensagem
async function sendWithContext<T extends Record<string, unknown>>(
  basePayload: T,
  replyToMessageId: string
): Promise<string> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload = {
    ...basePayload,
    context: { message_id: replyToMessageId },
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.messages[0].id;
}
```

### Python

```python
async def send_reply_message(
    to: str,
    reply_to_message_id: str,
    body: str,
) -> str:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "context": {"message_id": reply_to_message_id},
        "type": "text",
        "text": {"body": body},
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]


async def send_with_context(
    base_payload: dict,
    reply_to_message_id: str,
) -> str:
    """Adiciona contexto de resposta a qualquer payload de mensagem."""
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {**base_payload, "context": {"message_id": reply_to_message_id}}

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()["messages"][0]["id"]
```

### Notas

- O campo `context.message_id` deve conter o ID da mensagem original.
- Funciona com todos os tipos de mensagem: texto, imagem, video, documento, interativos, etc.
- A mensagem original e exibida como citacao visual no chat.
- O `message_id` e obtido atraves do webhook ao receber mensagens.

---

## 13. Marcar como Lido (Mark as Read)

Marca uma mensagem recebida como lida, exibindo as marcas azuis (blue checkmarks)
no dispositivo do remetente. Tambem aciona o evento de "digitando" brevemente.

**Nota:** Este endpoint usa uma acao diferente (`"read"`) e NAO e um tipo de mensagem.

### Payload JSON

```json
{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "wamid.HBgLNTUxMTk5OTk5OTk5FQ..."
}
```

### Node.js / TypeScript

```typescript
interface MarkAsReadPayload {
  messaging_product: "whatsapp";
  status: "read";
  message_id: string;
}

async function markAsRead(messageId: string): Promise<boolean> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const payload: MarkAsReadPayload = {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };

  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });

  return data.success === true;
}
```

### Python

```python
async def mark_as_read(message_id: str) -> bool:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}

    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json().get("success", False)
```

### Resposta esperada

```json
{
  "success": true
}
```

### Notas

- O `message_id` deve ser de uma mensagem RECEBIDA (nao enviada).
- Marcar como lido e idempotente: chamar mais de uma vez nao causa erro.
- Tambem dispara um breve indicador de "digitando" no chat do remetente.
- Recomenda-se marcar mensagens como lidas ao processa-las no webhook para boa experiencia do usuario.

---

## Referencia Rapida - Limites e Formatos

| Tipo          | Tamanho Max | Formatos                          | Caption |
|---------------|-------------|-----------------------------------|---------|
| Texto         | 4096 chars  | -                                 | -       |
| Imagem        | 5 MB        | JPEG, PNG                         | 1024 ch |
| Documento     | 100 MB      | PDF, DOC, XLS, PPT, TXT, etc.    | 1024 ch |
| Video         | 16 MB       | MP4, 3GPP (H.264 + AAC)          | 1024 ch |
| Audio         | 16 MB       | OGG/OPUS, MP3, AMR, AAC, M4A     | N/A     |
| Sticker       | 100 KB (s) / 500 KB (a) | WEBP                 | N/A     |

| Interativo    | Limite                                              |
|---------------|-----------------------------------------------------|
| Botoes        | 3 botoes, titulo ate 20 chars                       |
| Lista         | 10 secoes, 10 rows total, titulo ate 24 chars       |
| Reacao        | 1 emoji por remetente por mensagem                  |

---

## Tratamento de Erros Comum

Todas as funcoes acima podem lancar erros da API. Estrutura padrao de erro:

```json
{
  "error": {
    "message": "(#131030) Recipient phone number not in allowed list",
    "type": "OAuthException",
    "code": 131030,
    "error_subcode": 2655007,
    "fbtrace_id": "AbCdEfGhIjKlMnOp"
  }
}
```

### Codigos de erro frequentes

| Codigo  | Significado                                          |
|---------|------------------------------------------------------|
| 131030  | Numero do destinatario nao esta na lista permitida   |
| 131031  | Conta do remetente bloqueada                         |
| 131047  | Re-engagement message (mais de 24h sem janela)       |
| 131051  | Tipo de mensagem nao suportado                       |
| 131053  | Upload de midia falhou                               |
| 130429  | Limite de taxa (rate limit) excedido                 |
| 132000  | Quantidade de parametros do template nao confere     |
| 132015  | Template pausado/desativado                          |

### Wrapper com tratamento de erro (Node.js)

```typescript
import axios, { AxiosError } from "axios";

interface WhatsAppError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

async function sendWhatsAppRequest<T>(payload: T): Promise<Record<string, unknown>> {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      const waError = err.response.data as WhatsAppError;
      throw new Error(
        `WhatsApp API Error [${waError.error.code}]: ${waError.error.message}`
      );
    }
    throw err;
  }
}
```

### Wrapper com tratamento de erro (Python)

```python
import httpx


class WhatsAppAPIError(Exception):
    def __init__(self, code: int, message: str, fbtrace_id: str):
        self.code = code
        self.fbtrace_id = fbtrace_id
        super().__init__(f"WhatsApp API Error [{code}]: {message}")


async def send_whatsapp_request(payload: dict) -> dict:
    url = f"https://graph.facebook.com/v21.0/{os.environ['PHONE_NUMBER_ID']}/messages"
    headers = {
        "Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)

        if response.status_code != 200:
            error_data = response.json().get("error", {})
            raise WhatsAppAPIError(
                code=error_data.get("code", response.status_code),
                message=error_data.get("message", "Unknown error"),
                fbtrace_id=error_data.get("fbtrace_id", ""),
            )

        return response.json()
```
