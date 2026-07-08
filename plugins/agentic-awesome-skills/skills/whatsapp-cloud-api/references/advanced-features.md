# Features Avancados - WhatsApp Cloud API

Guia dos recursos avancados da WhatsApp Business Platform: Flows, Commerce, Channels, Click-to-WhatsApp Ads e Status Tracking.

---

## Indice

1. [WhatsApp Flows](#whatsapp-flows)
2. [Commerce e Catalogo](#commerce-e-catalogo)
3. [WhatsApp Channels](#whatsapp-channels)
4. [Click-to-WhatsApp Ads](#click-to-whatsapp-ads)
5. [Status Tracking](#status-tracking)
6. [Analytics e Reporting](#analytics-e-reporting)

---

## WhatsApp Flows

WhatsApp Flows permite criar formularios interativos multi-tela dentro do WhatsApp. O cliente preenche campos, seleciona opcoes e envia dados sem sair do app.

### Quando Usar

- Cadastros e registros
- Agendamentos e reservas
- Pesquisas NPS e feedback
- Selecao de produtos com opcoes
- Formularios de suporte com campos estruturados
- Questionarios de qualificacao de leads

### Estrutura JSON de um Flow

Um Flow e composto por **screens** (telas) com **components** (campos):

```json
{
  "version": "3.0",
  "screens": [
    {
      "id": "SCREEN_1",
      "title": "Agendamento",
      "data": {},
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Agende sua consulta"
          },
          {
            "type": "TextInput",
            "name": "customer_name",
            "label": "Seu nome completo",
            "required": true,
            "input-type": "text"
          },
          {
            "type": "DatePicker",
            "name": "appointment_date",
            "label": "Data desejada",
            "required": true,
            "min-date": "1709251200000",
            "max-date": "1711929600000"
          },
          {
            "type": "Dropdown",
            "name": "service_type",
            "label": "Tipo de servico",
            "required": true,
            "data-source": [
              { "id": "consulta", "title": "Consulta" },
              { "id": "retorno", "title": "Retorno" },
              { "id": "exame", "title": "Exame" }
            ]
          },
          {
            "type": "Footer",
            "label": "Confirmar",
            "on-click-action": {
              "name": "navigate",
              "next": { "type": "screen", "name": "SCREEN_2" },
              "payload": {
                "customer_name": "${form.customer_name}",
                "appointment_date": "${form.appointment_date}",
                "service_type": "${form.service_type}"
              }
            }
          }
        ]
      }
    },
    {
      "id": "SCREEN_2",
      "title": "Confirmacao",
      "terminal": true,
      "layout": {
        "type": "SingleColumnLayout",
        "children": [
          {
            "type": "TextHeading",
            "text": "Confirme seus dados"
          },
          {
            "type": "TextBody",
            "text": "Nome: ${data.customer_name}\nData: ${data.appointment_date}\nServico: ${data.service_type}"
          },
          {
            "type": "Footer",
            "label": "Confirmar Agendamento",
            "on-click-action": {
              "name": "complete",
              "payload": {
                "customer_name": "${data.customer_name}",
                "appointment_date": "${data.appointment_date}",
                "service_type": "${data.service_type}"
              }
            }
          }
        ]
      }
    }
  ]
}
```

### Componentes Disponiveis

| Componente       | Descricao                          | Campos principais              |
|------------------|------------------------------------|--------------------------------|
| TextHeading      | Titulo de secao                    | text                           |
| TextBody         | Texto descritivo                   | text                           |
| TextInput        | Campo de texto                     | name, label, input-type        |
| TextArea         | Area de texto multi-linha          | name, label                    |
| DatePicker       | Seletor de data                    | name, label, min-date, max-date|
| Dropdown         | Lista suspensa                     | name, label, data-source       |
| RadioButtonsGroup| Botoes de opcao                    | name, label, data-source       |
| CheckboxGroup    | Caixas de selecao                  | name, label, data-source       |
| OptIn            | Checkbox de aceite                 | name, label                    |
| Footer           | Botao de acao/navegacao            | label, on-click-action         |

### Enviar Flow via API

```typescript
async function sendFlow(to: string, flowId: string, screenId: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: 'Agendar Consulta' },
      body: { text: 'Preencha o formulário abaixo para agendar.' },
      footer: { text: 'Seus dados são protegidos' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_id: flowId,
          flow_cta: 'Agendar',
          flow_action: 'navigate',
          flow_action_payload: {
            screen: screenId,
            data: {}
          }
        }
      }
    }
  });
}
```

### Receber Resposta do Flow

```typescript
function handleFlowResponse(message: IncomingMessage): Record<string, any> | null {
  if (message.interactive?.type === 'nfm_reply') {
    return JSON.parse(message.interactive.nfm_reply.response_json);
    // Ex: { customer_name: "João", appointment_date: "2026-03-01", service_type: "consulta" }
  }
  return null;
}
```

### Criar Flows

Flows podem ser criados de duas formas:
1. **Visual Builder** - No WhatsApp Manager, arrastar e soltar componentes
2. **JSON Editor** - Editar diretamente o JSON para controle total

---

## Commerce e Catalogo

### Configurar Catalogo

O catalogo WhatsApp suporta ate **500 produtos** vinculados ao seu perfil de negocio.

**Configuracao:**
1. Abra o WhatsApp Manager
2. Va para Account Tools → Catalog
3. Adicione produtos com: nome, descricao, preco, imagem, URL

### Enviar Mensagem de Produto Unico

```typescript
async function sendSingleProduct(to: string, catalogId: string, productId: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'product',
      body: { text: 'Confira este produto!' },
      footer: { text: 'Responda para comprar' },
      action: {
        catalog_id: catalogId,
        product_retailer_id: productId
      }
    }
  });
}
```

### Enviar Mensagem Multi-Produto

```typescript
async function sendMultiProduct(
  to: string,
  catalogId: string,
  sections: Array<{ title: string; product_items: Array<{ product_retailer_id: string }> }>
): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'product_list',
      header: { type: 'text', text: 'Nossos Produtos' },
      body: { text: 'Selecione os produtos que deseja:' },
      footer: { text: 'Adicione ao carrinho' },
      action: {
        catalog_id: catalogId,
        sections
      }
    }
  });
}

// Uso:
await sendMultiProduct('5511999999999', 'CATALOG_ID', [
  {
    title: 'Eletronicos',
    product_items: [
      { product_retailer_id: 'SKU_001' },
      { product_retailer_id: 'SKU_002' }
    ]
  },
  {
    title: 'Acessorios',
    product_items: [
      { product_retailer_id: 'SKU_003' },
      { product_retailer_id: 'SKU_004' }
    ]
  }
]);
```

### Checkout In-App

Quando o cliente seleciona produtos e faz checkout, voce recebe via webhook:

```json
{
  "type": "order",
  "order": {
    "catalog_id": "CATALOG_ID",
    "product_items": [
      {
        "product_retailer_id": "SKU_001",
        "quantity": 2,
        "item_price": 99.90,
        "currency": "BRL"
      }
    ],
    "text": "Quero esses produtos"
  }
}
```

### Sync com Inventario

Para manter o catalogo atualizado:

```python
async def sync_inventory(catalog_id: str, products: list[dict]) -> None:
    """Sincroniza inventario com o catalogo WhatsApp via Commerce Manager API."""
    for product in products:
        await update_product(
            catalog_id=catalog_id,
            product_id=product["sku"],
            data={
                "availability": "in stock" if product["stock"] > 0 else "out of stock",
                "price": product["price"] * 100,  # Em centavos
                "currency": "BRL"
            }
        )
```

---

## WhatsApp Channels

WhatsApp Channels e um recurso de broadcasting unidirecional. Voce envia atualizacoes para subscribers ilimitados na aba "Atualizacoes" do WhatsApp.

### Caracteristicas

- **Unidirecional:** Apenas o admin envia, subscribers recebem
- **Privacidade do admin:** Followers nao veem seu numero pessoal
- **Privacidade do subscriber:** Admin nao ve numeros dos followers (a menos que salvos como contatos)
- **Conteudo:** Texto, imagens, videos, stickers, polls

### Analytics Disponiveis (30 dias)

| Metrica           | Descricao                              |
|-------------------|----------------------------------------|
| Crescimento       | Novos followers vs unfollows           |
| Alcance           | Quantos viram suas mensagens           |
| Engajamento       | Reacoes com emoji                      |
| Resultados de polls| Votos em enquetes                     |

### Melhores Praticas

- Publique conteudo relevante e nao promocional em excesso
- Use polls para engajamento
- Frequencia ideal: 2-5 postagens por semana
- Conteudo exclusivo incentiva follows

---

## Click-to-WhatsApp Ads

Anuncios no Facebook e Instagram com botao que abre conversa no WhatsApp.

### Setup no Meta Ads Manager

1. Criar campanha com objetivo "Messaging", "Leads" ou "Sales"
2. Selecionar "Click to WhatsApp" como destino
3. Vincular conta WhatsApp Business
4. Configurar mensagem pre-preenchida (greeting + pre-filled message)

### Pre-filled Messages

Configure a mensagem que o cliente ve quando abre o chat:

```
Greeting: "Olá! Obrigado por clicar no nosso anúncio."
Pre-filled: "Oi, vi o anúncio sobre [produto] e gostaria de saber mais!"
```

### Integracao no Webhook

Quando um cliente vem de um anuncio, o webhook inclui dados de referral:

```json
{
  "messages": [{
    "from": "5511999999999",
    "type": "text",
    "text": { "body": "Oi, vi o anúncio..." },
    "referral": {
      "source_url": "https://fb.me/...",
      "source_type": "ad",
      "source_id": "AD_ID",
      "headline": "Titulo do Anuncio",
      "body": "Texto do anuncio",
      "ctwa_clid": "click_id_para_tracking"
    }
  }]
}
```

### Tracking de Conversao

```typescript
function handleAdReferral(message: IncomingMessage): void {
  if (message.referral) {
    const adData = {
      adId: message.referral.source_id,
      clickId: message.referral.ctwa_clid,
      headline: message.referral.headline,
      customerPhone: message.from,
      timestamp: new Date()
    };

    // Registrar lead vindo do anuncio
    trackConversion(adData);

    // Personalizar atendimento com contexto do anuncio
    customizeGreeting(message.from, adData.headline);
  }
}
```

### Metricas

- **Taxa de abertura:** ~99% (mensagens WhatsApp)
- **Reducao de custo:** Ate 32% menor custo por lead vs formularios
- **Aumento:** Ate 46% mais mensagens de clientes

---

## Status Tracking

### Ciclo de Vida da Mensagem

```
Enviada (sent) → Entregue ao servidor (delivered) → Entregue ao dispositivo (delivered) → Lida (read)
```

### Status via Webhook

```json
{
  "statuses": [
    {
      "id": "wamid.HBgNNTUxMTk5...",
      "status": "delivered",
      "timestamp": "1709251200",
      "recipient_id": "5511999999999",
      "conversation": {
        "id": "CONVERSATION_ID",
        "origin": { "type": "business_initiated" },
        "expiration_timestamp": "1709337600"
      },
      "pricing": {
        "billable": true,
        "pricing_model": "CBP",
        "category": "utility"
      }
    }
  ]
}
```

### Status Possiveis

| Status      | Descricao                              | Confiabilidade      |
|-------------|----------------------------------------|---------------------|
| `sent`      | Mensagem enviada para servidores Meta  | Alta                |
| `delivered` | Entregue ao dispositivo do cliente     | Alta                |
| `read`      | Cliente leu a mensagem (blue check)    | Media (pode ser off)|
| `failed`    | Falha na entrega                       | Alta                |

### Limitacao Importante

O status `read` depende de o usuario ter **read receipts ativados** nas configuracoes do WhatsApp. Muitos usuarios desativam. Use `delivered` como confirmacao confiavel de entrega.

### Implementacao de Tracking

```typescript
interface MessageStatus {
  messageId: string;
  to: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

async function processStatusUpdate(status: WebhookStatus): Promise<void> {
  const update: Partial<MessageStatus> = {};

  switch (status.status) {
    case 'sent':
      update.sentAt = new Date(parseInt(status.timestamp) * 1000);
      break;
    case 'delivered':
      update.deliveredAt = new Date(parseInt(status.timestamp) * 1000);
      break;
    case 'read':
      update.readAt = new Date(parseInt(status.timestamp) * 1000);
      break;
    case 'failed':
      update.failedAt = new Date(parseInt(status.timestamp) * 1000);
      update.failureReason = status.errors?.[0]?.message;
      break;
  }

  await db.messageStatuses.updateOne(
    { messageId: status.id },
    { $set: update }
  );
}
```

---

## Analytics e Reporting

### Metricas Essenciais para Atendimento

| Metrica                        | Como Calcular                          | Meta Ideal          |
|-------------------------------|----------------------------------------|---------------------|
| Tempo Primeira Resposta (FRT) | Timestamp resposta - timestamp mensagem| < 5 minutos         |
| Tempo Medio de Resolucao      | Timestamp fechamento - timestamp inicio| < 30 minutos        |
| Taxa de Resolucao no Bot      | Resolvidos pelo bot / total            | > 60%               |
| Taxa de Escalacao              | Escalados para humano / total          | < 40%               |
| CSAT (Satisfacao)              | Pesquisa NPS pos-atendimento           | > 4.0 / 5.0         |
| Taxa de Entrega                | Delivered / sent                       | > 95%               |
| Taxa de Leitura                | Read / delivered                       | > 70%               |
| Taxa de Opt-out               | Optouts / total da base                | < 2% por campanha   |

### Pesquisa NPS via WhatsApp

```typescript
async function sendNPSSurvey(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: 'De 1 a 5, como voce avalia nosso atendimento?\n\n' +
              '1 = Muito ruim\n5 = Excelente'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'nps_1_2', title: '1-2 Ruim' } },
          { type: 'reply', reply: { id: 'nps_3', title: '3 Regular' } },
          { type: 'reply', reply: { id: 'nps_4_5', title: '4-5 Bom' } }
        ]
      }
    }
  });
}
```

### Dashboard de Analytics

Para analytics avancados, considere integrar com:
- **Infobip** - Dashboard completo com APIs de reporting
- **Trengo** - CSAT tracking, response times, trending topics
- **Wassenger** - Comparacao de agentes, exportacao CSV/JSON/PDF
- **Solucao propria** - MongoDB/PostgreSQL + Grafana/Metabase
