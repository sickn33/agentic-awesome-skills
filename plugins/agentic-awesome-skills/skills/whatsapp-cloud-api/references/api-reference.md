# API Reference - WhatsApp Cloud API

Referencia tecnica completa dos endpoints, autenticacao, codigos de erro, rate limits e pricing da WhatsApp Cloud API (Graph API v21.0).

---

## Indice

1. [Autenticacao](#autenticacao)
2. [Base URL e Headers](#base-url-e-headers)
3. [Endpoints - Mensagens](#endpoints---mensagens)
4. [Endpoints - Midia](#endpoints---midia)
5. [Endpoints - Templates](#endpoints---templates)
6. [Endpoints - Phone Numbers](#endpoints---phone-numbers)
7. [Endpoints - Business Profile](#endpoints---business-profile)
8. [Webhook Events](#webhook-events)
9. [Codigos de Erro](#codigos-de-erro)
10. [Rate Limits](#rate-limits)
11. [Pricing 2026](#pricing-2026)
12. [Versionamento](#versionamento)

---

## Autenticacao

### Token Temporario (Desenvolvimento)

Obtido no Meta Developers Dashboard. Expira em 24 horas.

### System User Token (Producao)

Token permanente criado via Business Settings:
1. Business Settings → System Users → Add
2. Atribuir role "Admin" ao app
3. Gerar token com permissoes:
   - `whatsapp_business_messaging` (enviar/receber mensagens)
   - `whatsapp_business_management` (gerenciar templates, perfil)

### Header de Autenticacao

```
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

---

## Base URL e Headers

```
Base URL: https://graph.facebook.com/v21.0
```

Headers obrigatorios em todas as requests:
```http
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

### IDs Necessarios

| ID                  | Onde encontrar                           | Formato          |
|---------------------|------------------------------------------|------------------|
| Phone Number ID     | WhatsApp > API Setup no dashboard        | Numerico         |
| WABA ID             | WhatsApp > API Setup no dashboard        | Numerico         |
| App Secret          | App Settings > Basic                      | String hex       |
| Business ID         | Business Settings > Business Info         | Numerico         |

---

## Endpoints - Mensagens

### Enviar Mensagem

```
POST /{phone-number-id}/messages
```

**Request Body (texto):**
```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5511999999999",
  "type": "text",
  "text": {
    "preview_url": false,
    "body": "Olá! Como posso ajudar?"
  }
}
```

**Response (sucesso):**
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    { "input": "5511999999999", "wa_id": "5511999999999" }
  ],
  "messages": [
    { "id": "wamid.HBgNNTUxMTk5..." }
  ]
}
```

**Tipos suportados no campo `type`:**
- `text` - Mensagem de texto
- `template` - Template message
- `image` - Imagem
- `document` - Documento
- `video` - Video
- `audio` - Audio
- `sticker` - Sticker
- `location` - Localizacao
- `contacts` - Contatos
- `interactive` - Botoes, listas, flows
- `reaction` - Reacao com emoji

### Marcar como Lida

```
POST /{phone-number-id}/messages
```

```json
{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "wamid.HBgNNTUxMTk5..."
}
```

---

## Endpoints - Midia

### Upload de Midia

```
POST /{phone-number-id}/media
Content-Type: multipart/form-data
```

**Form fields:**
- `messaging_product`: "whatsapp"
- `file`: arquivo binario
- `type`: MIME type (ex: "image/jpeg")

**Response:**
```json
{
  "id": "media_id_aqui"
}
```

### Download de Midia

```
GET /{media-id}
```

**Response:**
```json
{
  "url": "https://lookaside.fbsbx.com/...",
  "mime_type": "image/jpeg",
  "sha256": "hash_aqui",
  "file_size": 12345,
  "id": "media_id"
}
```

Depois, faca GET na `url` retornada com o mesmo Authorization header para baixar o arquivo.

### Deletar Midia

```
DELETE /{media-id}
```

### Limites de Midia

| Tipo      | Formatos Aceitos                    | Tamanho Max |
|-----------|-------------------------------------|-------------|
| Image     | JPEG, PNG                           | 5 MB        |
| Document  | PDF, DOC, DOCX, XLS, XLSX, PPT, TXT| 100 MB      |
| Video     | MP4, 3GP                            | 16 MB       |
| Audio     | AAC, AMR, MP3, MP4, OGG             | 16 MB       |
| Sticker   | WEBP                                | 500 KB      |

---

## Endpoints - Templates

### Listar Templates

```
GET /{waba-id}/message_templates
```

**Query parameters:**
- `limit` - Numero de resultados (default: 25)
- `status` - Filtrar por status: APPROVED, PENDING, REJECTED

**Response:**
```json
{
  "data": [
    {
      "name": "hello_world",
      "status": "APPROVED",
      "category": "UTILITY",
      "language": "pt_BR",
      "components": [
        {
          "type": "BODY",
          "text": "Olá {{1}}, seu pedido {{2}} foi confirmado!"
        }
      ],
      "id": "template_id"
    }
  ],
  "paging": { "cursors": { "before": "...", "after": "..." } }
}
```

### Criar Template

```
POST /{waba-id}/message_templates
```

```json
{
  "name": "order_confirmation",
  "category": "UTILITY",
  "language": "pt_BR",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Confirmação de Pedido"
    },
    {
      "type": "BODY",
      "text": "Olá {{1}}, seu pedido #{{2}} foi confirmado! Valor: R$ {{3}}",
      "example": {
        "body_text": [["João", "12345", "99,90"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Obrigado por comprar conosco!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "URL",
          "text": "Rastrear Pedido",
          "url": "https://example.com/track/{{1}}",
          "example": ["12345"]
        }
      ]
    }
  ]
}
```

### Deletar Template

```
DELETE /{waba-id}/message_templates
```

```json
{
  "name": "template_name_to_delete"
}
```

**Nota:** Nao e possivel editar um template apos submissao. Para alterar, delete e crie um novo.

**Limite:** Ate 6,000 traducoes de templates por conta.

Para guia completo de gerenciamento de templates, leia `references/template-management.md`.

---

## Endpoints - Phone Numbers

### Listar Numeros

```
GET /{waba-id}/phone_numbers
```

**Response:**
```json
{
  "data": [
    {
      "verified_name": "Minha Empresa",
      "code_verification_status": "VERIFIED",
      "display_phone_number": "+55 11 99999-9999",
      "quality_rating": "GREEN",
      "id": "phone_number_id"
    }
  ]
}
```

### Obter Info do Numero

```
GET /{phone-number-id}?fields=verified_name,code_verification_status,display_phone_number,quality_rating,messaging_limit_tier
```

---

## Endpoints - Business Profile

### Obter Perfil

```
GET /{phone-number-id}/whatsapp_business_profile?fields=about,address,description,email,websites,profile_picture_url
```

### Atualizar Perfil

```
POST /{phone-number-id}/whatsapp_business_profile
```

```json
{
  "messaging_product": "whatsapp",
  "about": "Atendimento de Seg a Sex, 8h-18h",
  "address": "Rua Example, 123 - São Paulo, SP",
  "description": "Empresa líder em soluções digitais",
  "email": "contato@empresa.com",
  "websites": ["https://www.empresa.com"]
}
```

---

## Webhook Events

### Estrutura do Payload

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WABA_ID",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "5511999999999",
              "phone_number_id": "PHONE_NUMBER_ID"
            },
            "contacts": [
              { "profile": { "name": "João" }, "wa_id": "5511888888888" }
            ],
            "messages": [...],
            "statuses": [...]
          },
          "field": "messages"
        }
      ]
    }
  ]
}
```

### Tipos de Mensagem Recebida

| Campo `type`     | Conteudo                    | Campos relevantes               |
|------------------|-----------------------------|----------------------------------|
| `text`           | Mensagem de texto           | `text.body`                      |
| `image`          | Imagem                      | `image.id`, `image.mime_type`    |
| `document`       | Documento                   | `document.id`, `document.filename`|
| `video`          | Video                       | `video.id`, `video.mime_type`    |
| `audio`          | Audio/voz                   | `audio.id`, `audio.mime_type`    |
| `location`       | Localizacao                 | `location.latitude`, `.longitude`|
| `contacts`       | Contato compartilhado       | `contacts[].name`, `.phones`     |
| `interactive`    | Resposta de botao/lista     | `interactive.button_reply.id` ou `interactive.list_reply.id` |
| `reaction`       | Reacao com emoji            | `reaction.emoji`, `.message_id`  |
| `sticker`        | Sticker                     | `sticker.id`, `sticker.mime_type`|

### Status Updates

```json
{
  "statuses": [
    {
      "id": "wamid.HBgNNTUxMTk5...",
      "status": "delivered",
      "timestamp": "1234567890",
      "recipient_id": "5511999999999"
    }
  ]
}
```

Valores de `status`: `sent` → `delivered` → `read` → `failed`

---

## Codigos de Erro

### Erros Comuns

| Codigo | Mensagem                          | Causa                            | Solucao                              |
|--------|-----------------------------------|----------------------------------|--------------------------------------|
| 0      | AuthException                     | Token invalido ou expirado        | Gerar novo token                     |
| 3      | API Method                        | Metodo HTTP incorreto             | Verificar POST vs GET                |
| 4      | Too many calls                    | Rate limit excedido               | Implementar retry com backoff        |
| 10     | Permission denied                 | Token sem permissao necessaria    | Adicionar permissao ao System User   |
| 100    | Invalid parameter                 | Payload malformado                | Verificar JSON contra documentacao   |
| 131026 | Message undeliverable             | Numero nao esta no WhatsApp       | Validar numero antes de enviar       |
| 131047 | Re-engagement message             | Fora da janela de 24h sem template| Usar template message                |
| 131051 | Unsupported message type          | Tipo de mensagem nao suportado    | Verificar campo `type`               |
| 131053 | Media upload error                | Arquivo invalido ou muito grande  | Verificar formato e tamanho          |
| 132000 | Template param count mismatch     | Numero errado de parametros       | Conferir template e parametros       |
| 132001 | Template does not exist           | Template nao encontrado           | Verificar nome e idioma do template  |
| 132005 | Template hydration failed         | Erro ao preencher variaveis       | Verificar formato dos parametros     |
| 133010 | Phone number not registered       | Numero nao verificado             | Completar verificacao OTP            |
| 135000 | Generic error                     | Erro interno do WhatsApp          | Retry apos alguns segundos           |

### Tratamento de Erros

```typescript
async function sendWithRetry(payload: any, maxRetries = 3): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(
        `${GRAPH_API}/${process.env.PHONE_NUMBER_ID}/messages`,
        payload,
        { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
      );
      return response.data;
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      // Erros que nao devem ser retentados
      if ([100, 131026, 131051, 132000, 132001].includes(errorCode)) {
        throw new Error(`WhatsApp API Error ${errorCode}: ${errorMessage}`);
      }

      // Rate limit ou erro temporario - retry com backoff
      if (attempt < maxRetries && [4, 135000].includes(errorCode)) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}
```

---

## Rate Limits

### Throughput (Mensagens por Segundo)

| Tier              | Limite          |
|-------------------|-----------------|
| Standard          | 80 msg/s        |
| Unlimited tier    | 1,000 msg/s     |

### Conversas por 24 Horas

| Tier         | Limite/24h | Como alcancar                         |
|--------------|-----------|----------------------------------------|
| Inicial      | 250       | Conta nova ou nao verificada           |
| Tier 1       | 1,000     | 50%+ do limite por 7 dias + quality ok |
| Tier 2       | 10,000    | 50%+ do limite por 7 dias + quality ok |
| Tier 3       | 100,000   | 50%+ do limite por 7 dias + quality ok |
| Unlimited    | Ilimitado | 50%+ do limite por 7 dias + quality ok |

**Importante:** Limites sao por Business Portfolio (desde outubro 2025), nao por numero.

### Outros Limites

- Templates: 6,000 traducoes por conta
- Botoes interativos: max 3 por mensagem
- Lista interativa: max 10 opcoes, max 3 secoes
- Texto: max 4,096 caracteres
- Template body: max 1,600 caracteres
- Webhooks: responder 200 em ate 5 segundos

---

## Pricing 2026

Desde julho 2025, o modelo e **por mensagem** (nao mais por conversa).

### Custos por Categoria

| Categoria      | Faixa de Preco      | Desconto Volume | Janela 24h    |
|----------------|---------------------|-----------------|---------------|
| Marketing      | $0.025 - $0.1365    | Nao             | Cobrado       |
| Utility        | $0.004 - $0.0456    | Sim             | GRATIS        |
| Authentication | $0.004 - $0.0456    | Sim             | Cobrado       |
| Service        | GRATIS              | N/A             | GRATIS        |

### Exemplos por Regiao (Marketing)

| Regiao          | Custo/msg |
|-----------------|-----------|
| Brasil          | ~$0.05    |
| India           | ~$0.01    |
| EUA/Canada      | ~$0.025   |
| Europa Ocidental| ~$0.10+   |

### Janela de 24 Horas

- Abre quando o cliente envia uma mensagem
- Durante a janela: templates de **utility** sao GRATIS
- Service messages (respostas) sao SEMPRE gratis
- Marketing e authentication sao cobrados mesmo na janela

### Mudancas Janeiro 2026

- Franca e Egito: reducao nos custos de marketing
- India: aumento nos custos de marketing
- America do Norte: reducao em utility e authentication

---

## Versionamento

### Versao Atual

**Graph API v21.0** (lancada janeiro 2026)

### Compatibilidade

- Meta mantem backward compatibility por pelo menos 12 meses
- Versoes antigas recebem aviso de deprecacao antes da remocao
- Sempre especifique a versao na URL: `https://graph.facebook.com/v21.0/`

### Mudancas Planejadas 2026

| Feature                   | Timeline | Descricao                                      |
|---------------------------|----------|-------------------------------------------------|
| BSUID                     | 2026     | Business-Scoped User ID substitui phone numbers |
| Usernames                 | 2026     | WhatsApp introduz usernames para privacidade     |
| Tier removal (2K/10K)     | Q2 2026  | Limite imediato de 100K apos verificacao         |
| Business Portfolio Pacing | Q1 2026  | Pausa automatica de campanhas baseada em feedback|

### Boas Praticas de Versionamento

- Monitore o blog de desenvolvedores da Meta para mudancas
- Teste em sandbox antes de atualizar versao em producao
- Use variaveis de ambiente para a versao da API (facil rollback)
- Mantenha logs de chamadas para debug de compatibilidade
