# Gerenciamento de Templates via API - WhatsApp Cloud API

Guia completo para criar, listar, deletar e gerenciar templates de mensagem programaticamente via WhatsApp Business Management API.

---

## Indice

1. [Visao Geral](#visao-geral)
2. [Categorias de Templates](#categorias-de-templates)
3. [Criar Template](#criar-template)
4. [Listar Templates](#listar-templates)
5. [Deletar Template](#deletar-template)
6. [Templates com Variaveis](#templates-com-variaveis)
7. [Templates com Midia](#templates-com-midia)
8. [Templates com Botoes](#templates-com-botoes)
9. [Enviar Template Message](#enviar-template-message)
10. [Boas Praticas](#boas-praticas)

---

## Visao Geral

Templates sao mensagens pre-aprovadas pela WhatsApp. Sao a **unica forma** de iniciar conversa com um cliente (fora da janela de 24h).

**Limites:**
- Ate 6,000 traducoes de templates por conta WABA
- Aprovacao leva de minutos a poucas horas
- Templates **nao podem ser editados** apos submissao (delete e crie novo)
- Template body: max 1,600 caracteres

**Endpoint base:** `https://graph.facebook.com/v21.0/{waba-id}/message_templates`

---

## Categorias de Templates

| Categoria      | Uso                                          | Custo              |
|----------------|----------------------------------------------|---------------------|
| MARKETING      | Promocoes, campanhas, lancamentos             | $0.025-$0.1365/msg  |
| UTILITY        | Confirmacoes de pedido, atualizacoes, tracking| $0.004-$0.0456/msg  |
| AUTHENTICATION | OTP, reset de senha, verificacao em 2 etapas  | $0.004-$0.0456/msg  |

A categoria afeta o custo e as regras de aprovacao. Templates de marketing tem regras mais rigorosas.

---

## Criar Template

### Node.js

```typescript
interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: { header_handle?: string[]; body_text?: string[][] };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
    example?: string[];
  }>;
}

async function createTemplate(
  name: string,
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
  language: string,
  components: TemplateComponent[]
): Promise<any> {
  const response = await axios.post(
    `${GRAPH_API}/${process.env.WABA_ID}/message_templates`,
    { name, category, language, components },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
  return response.data;
  // { id: "template_id", status: "PENDING", category: "UTILITY" }
}

// Exemplo: Criar template de confirmacao de pedido
await createTemplate(
  'order_confirmation_v1',
  'UTILITY',
  'pt_BR',
  [
    {
      type: 'HEADER',
      format: 'TEXT',
      text: 'Pedido Confirmado!'
    },
    {
      type: 'BODY',
      text: 'Ola {{1}}, seu pedido #{{2}} foi confirmado!\n\nValor: R$ {{3}}\nPrevisao de entrega: {{4}}',
      example: {
        body_text: [['Joao', '12345', '99,90', '3 dias uteis']]
      }
    },
    {
      type: 'FOOTER',
      text: 'Obrigado por comprar conosco!'
    }
  ]
);
```

### Python

```python
async def create_template(
    name: str,
    category: str,
    language: str,
    components: list[dict]
) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GRAPH_API}/{os.environ['WABA_ID']}/message_templates",
            json={
                "name": name,
                "category": category,
                "language": language,
                "components": components
            },
            headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}
        )
        return response.json()

# Exemplo: Criar template de boas-vindas
await create_template(
    name="welcome_v1",
    category="MARKETING",
    language="pt_BR",
    components=[
        {
            "type": "BODY",
            "text": "Ola {{1}}, bem-vindo a nossa loja! 🎉\n\nConfira nossas ofertas exclusivas.",
            "example": {"body_text": [["Maria"]]}
        },
        {
            "type": "BUTTONS",
            "buttons": [
                {
                    "type": "URL",
                    "text": "Ver Ofertas",
                    "url": "https://example.com/ofertas"
                },
                {
                    "type": "QUICK_REPLY",
                    "text": "Falar com Vendedor"
                }
            ]
        }
    ]
)
```

---

## Listar Templates

### Node.js

```typescript
async function listTemplates(status?: string): Promise<any[]> {
  const params = new URLSearchParams({ limit: '100' });
  if (status) params.append('status', status);

  const response = await axios.get(
    `${GRAPH_API}/${process.env.WABA_ID}/message_templates?${params}`,
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );

  return response.data.data;
}

// Listar apenas templates aprovados
const approved = await listTemplates('APPROVED');

// Listar todos
const all = await listTemplates();
```

### Python

```python
async def list_templates(status: str | None = None) -> list[dict]:
    params = {"limit": 100}
    if status:
        params["status"] = status

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{GRAPH_API}/{os.environ['WABA_ID']}/message_templates",
            params=params,
            headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}
        )
        return response.json()["data"]
```

### Status de Template

| Status     | Significado                          |
|------------|--------------------------------------|
| APPROVED   | Aprovado e pronto para uso           |
| PENDING    | Em revisao pela WhatsApp             |
| REJECTED   | Rejeitado (ver motivo na response)   |
| PAUSED     | Pausado por baixa qualidade          |
| DISABLED   | Desabilitado                         |

---

## Deletar Template

### Node.js

```typescript
async function deleteTemplate(templateName: string): Promise<void> {
  await axios.delete(
    `${GRAPH_API}/${process.env.WABA_ID}/message_templates`,
    {
      data: { name: templateName },
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }
    }
  );
}

await deleteTemplate('old_template_v1');
```

### Python

```python
async def delete_template(template_name: str) -> None:
    async with httpx.AsyncClient() as client:
        await client.request(
            "DELETE",
            f"{GRAPH_API}/{os.environ['WABA_ID']}/message_templates",
            json={"name": template_name},
            headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}
        )
```

**Nota:** Deletar um template remove TODAS as traducoes associadas.

---

## Templates com Variaveis

Variaveis sao representadas por `{{N}}` (1-indexed) no texto do template.

### Regras

- Variaveis devem ser sequenciais: `{{1}}`, `{{2}}`, `{{3}}`
- Ao criar, fornecer `example` com valores de exemplo
- Ao enviar, fornecer `parameters` com valores reais
- Nao pule numeros: `{{1}}`, `{{3}}` sem `{{2}}` e invalido

### Exemplo Completo

**Criar:**
```json
{
  "type": "BODY",
  "text": "Ola {{1}}, seu pedido #{{2}} sera entregue em {{3}}.",
  "example": { "body_text": [["Joao", "12345", "2 dias"]] }
}
```

**Enviar:**
```json
{
  "type": "body",
  "parameters": [
    { "type": "text", "text": "Maria" },
    { "type": "text", "text": "67890" },
    { "type": "text", "text": "3 dias uteis" }
  ]
}
```

---

## Templates com Midia

### Header com Imagem

**Criar:**
```json
{
  "type": "HEADER",
  "format": "IMAGE",
  "example": {
    "header_handle": ["4::aW1hZ2UvanBlZw==:ARb..."]
  }
}
```

Para obter o `header_handle`, faca upload da imagem de exemplo primeiro:
```
POST /{app-id}/uploads?file_type=image/jpeg&file_length=12345
```

**Enviar:**
```json
{
  "type": "header",
  "parameters": [
    {
      "type": "image",
      "image": { "link": "https://example.com/image.jpg" }
    }
  ]
}
```

### Header com Documento

**Criar:**
```json
{
  "type": "HEADER",
  "format": "DOCUMENT",
  "example": {
    "header_handle": ["4::YXBwbGljYXRpb24vcGRm:ARb..."]
  }
}
```

**Enviar:**
```json
{
  "type": "header",
  "parameters": [
    {
      "type": "document",
      "document": {
        "link": "https://example.com/invoice.pdf",
        "filename": "Nota_Fiscal_12345.pdf"
      }
    }
  ]
}
```

---

## Templates com Botoes

### Quick Reply (ate 3 botoes)

```json
{
  "type": "BUTTONS",
  "buttons": [
    { "type": "QUICK_REPLY", "text": "Sim, confirmo" },
    { "type": "QUICK_REPLY", "text": "Nao, cancelar" },
    { "type": "QUICK_REPLY", "text": "Falar com atendente" }
  ]
}
```

### URL Button

```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "URL",
      "text": "Rastrear Pedido",
      "url": "https://example.com/tracking/{{1}}",
      "example": ["12345"]
    }
  ]
}
```

### Phone Number Button

```json
{
  "type": "BUTTONS",
  "buttons": [
    {
      "type": "PHONE_NUMBER",
      "text": "Ligar para Suporte",
      "phone_number": "+5511999999999"
    }
  ]
}
```

### Enviar Template com Botao URL Dinamico

```typescript
await sendMessage({
  messaging_product: 'whatsapp',
  to: '5511999999999',
  type: 'template',
  template: {
    name: 'order_tracking_v1',
    language: { code: 'pt_BR' },
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Maria' },
          { type: 'text', text: '67890' }
        ]
      },
      {
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          { type: 'text', text: '67890' } // substitui {{1}} na URL
        ]
      }
    ]
  }
});
```

---

## Enviar Template Message

### Exemplo Completo - Node.js

```typescript
async function sendTemplate(
  to: string,
  templateName: string,
  language: string,
  components?: Array<{
    type: string;
    parameters?: Array<{ type: string; text?: string; image?: any; document?: any }>;
    sub_type?: string;
    index?: number;
  }>
): Promise<any> {
  const payload: any = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language }
    }
  };

  if (components) {
    payload.template.components = components;
  }

  return sendWithRetry(payload);
}

// Uso simples (sem variaveis)
await sendTemplate('5511999999999', 'hello_world', 'pt_BR');

// Com variaveis no body
await sendTemplate('5511999999999', 'order_confirmation_v1', 'pt_BR', [
  {
    type: 'body',
    parameters: [
      { type: 'text', text: 'Joao' },
      { type: 'text', text: '12345' },
      { type: 'text', text: '99,90' },
      { type: 'text', text: '3 dias uteis' }
    ]
  }
]);
```

### Exemplo Completo - Python

```python
async def send_template(
    to: str,
    template_name: str,
    language: str,
    components: list[dict] | None = None
) -> dict:
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language}
        }
    }

    if components:
        payload["template"]["components"] = components

    return await send_with_retry(payload)

# Uso simples
await send_template("5511999999999", "hello_world", "pt_BR")

# Com variaveis
await send_template("5511999999999", "order_confirmation_v1", "pt_BR", [
    {
        "type": "body",
        "parameters": [
            {"type": "text", "text": "Maria"},
            {"type": "text", "text": "67890"},
            {"type": "text", "text": "149,90"},
            {"type": "text", "text": "5 dias uteis"}
        ]
    }
])
```

---

## Boas Praticas

### Nomenclatura

Use um padrao consistente para nomes de templates:
```
{finalidade}_{descricao}_v{versao}
```

Exemplos:
- `order_confirmation_v1`
- `welcome_new_customer_v2`
- `payment_reminder_v1`
- `nps_survey_v3`

### Versionamento

Como templates nao podem ser editados:
1. Crie nova versao: `template_name_v2`
2. Teste a nova versao
3. Quando aprovada, migre o codigo para usar a v2
4. Delete a v1 quando nao mais necessaria

### Dicas de Aprovacao

- Evite linguagem excessivamente promocional no corpo
- Inclua exemplos claros e reais no `example`
- Nao use URLs encurtadas (bit.ly, etc.)
- Nao inclua conteudo que possa ser interpretado como spam
- Utility templates tem aprovacao mais rapida que marketing
- Use variaveis para personalizar (nome do cliente, numero do pedido)

### Monitoramento

```typescript
// Verificar status de templates periodicamente
async function monitorTemplates(): Promise<void> {
  const templates = await listTemplates();

  for (const template of templates) {
    if (template.status === 'REJECTED') {
      console.warn(`Template rejeitado: ${template.name}`);
      console.warn(`Motivo: ${template.rejected_reason}`);
    }
    if (template.status === 'PAUSED') {
      console.warn(`Template pausado por qualidade: ${template.name}`);
    }
  }
}
```
