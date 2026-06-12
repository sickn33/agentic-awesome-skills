---
name: whatsapp-cloud-api
description: Integracao com WhatsApp Business Cloud API (Meta). Mensagens, templates, webhooks HMAC-SHA256, automacao de atendimento. Boilerplates Node.js e Python.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- messaging
- whatsapp
- meta
- webhooks
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# WhatsApp Cloud API - Integracao Profissional

## Overview

Integracao com WhatsApp Business Cloud API (Meta). Mensagens, templates, webhooks HMAC-SHA256, automacao de atendimento. Boilerplates Node.js e Python.

## When to Use This Skill

- When the user mentions "whatsapp" or related topics
- When the user mentions "whatsapp business" or related topics
- When the user mentions "api whatsapp" or related topics
- When the user mentions "chatbot whatsapp" or related topics
- When the user mentions "mensagem whatsapp" or related topics
- When the user mentions "template whatsapp" or related topics

## Do Not Use This Skill When

- The task is unrelated to whatsapp cloud api
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Skill para implementar integracoes profissionais com WhatsApp Business usando a Cloud API oficial da Meta. Suporta Node.js/TypeScript e Python.

### Overview

A WhatsApp Cloud API e a API oficial da Meta para envio e recebimento de mensagens via WhatsApp Business. Desde outubro 2025, e a unica opcao suportada (a API On-Premises foi descontinuada).

**Versao da API:** Graph API v21.0 (2026)
**Base URL:** `https://graph.facebook.com/v21.0/{phone-number-id}/messages`
**Autenticacao:** Bearer Token (System User Token para producao)

**Pricing 2026 (por mensagem):**

| Categoria      | Custo             | Quando cobrado                          |
|----------------|-------------------|-----------------------------------------|
| Marketing      | $0.025-$0.1365    | Campanhas, promocoes                    |
| Utility        | $0.004-$0.0456    | Confirmacoes de pedido, atualizacoes    |
| Authentication | $0.004-$0.0456    | OTP, reset de senha                     |
| Service        | GRATIS            | Resposta dentro da janela de 24h        |

**Pre-requisitos:**
- Conta Meta Business Suite (gratuita)
- App no Meta for Developers com produto WhatsApp
- Numero de telefone verificado
- System User Token (permanente)

Se o usuario nao tem conta Meta Business, leia `references/setup-guide.md` para o guia completo de setup do zero.

---

## Decision Tree

Use esta arvore para determinar o proximo passo:

```
O usuario precisa de setup inicial?
├── SIM → Leia references/setup-guide.md
└── NAO → Qual linguagem?
    ├── Node.js/TypeScript
    └── Python
    → O que quer fazer?
       ├── Enviar mensagens → Secao "Tipos de Mensagem" abaixo
       ├── Receber mensagens → Secao "Webhooks" abaixo
       ├── Automatizar atendimento → Secao "Automacao" abaixo
       ├── WhatsApp Flows / Commerce → Secao "Features Avancados" abaixo
       ├── Gerenciar templates → references/template-management.md
       └── Compliance / limites → Secao "Compliance & Quality" abaixo
```

Para iniciar um projeto do zero com boilerplate pronto, use o script:
```bash
python scripts/setup_project.py --language nodejs --path ./meu-projeto

## Ou

python scripts/setup_project.py --language python --path ./meu-projeto
```

---

## 1. Configurar Variaveis De Ambiente

```env
WHATSAPP_TOKEN=seu_access_token_aqui
PHONE_NUMBER_ID=seu_phone_number_id
WABA_ID=seu_whatsapp_business_account_id
APP_SECRET=seu_app_secret
VERIFY_TOKEN=token_customizado_para_webhook
```

## 2. Enviar Mensagem De Texto Simples

**Node.js/TypeScript:**
```typescript
import axios from 'axios';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

async function sendText(to: string, message: string) {
  const response = await axios.post(
    `${GRAPH_API}/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    },
    { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } }
  );
  return response.data; // { messaging_product, contacts, messages: [{ id }] }
}
```

**Python:**
```python
import httpx
import os

GRAPH_API = "https://graph.facebook.com/v21.0"

async def send_text(to: str, message: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{GRAPH_API}/{os.environ['PHONE_NUMBER_ID']}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": message}
            },
            headers={"Authorization": f"Bearer {os.environ['WHATSAPP_TOKEN']}"}
        )
        return response.json()  # {"messaging_product", "contacts", "messages": [{"id"}]}
```

## 3. Enviar Template Message (Fora Da Janela De 24H)

Templates sao a unica forma de iniciar conversa com um cliente. Devem ser aprovados pela WhatsApp antes do uso.

```json
{
  "messaging_product": "whatsapp",
  "to": "5511999999999",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": { "code": "pt_BR" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "João" }
        ]
      }
    ]
  }
}
```

## 4. Verificar Entrega

Use o script de teste para validar:
```bash
python scripts/send_test_message.py --to 5511999999999 --message "Teste de integracao"
```

---

## Tipos De Mensagem

| Tipo               | Uso                                   | Limite           |
|--------------------|---------------------------------------|------------------|
| Text               | Mensagens simples de texto            | 4096 chars       |
| Template           | Iniciar conversa / fora da janela 24h | 1600 chars body  |
| Image              | Fotos e imagens                       | 5MB              |
| Document           | PDFs, planilhas, docs                 | 100MB            |
| Video              | Videos                                | 16MB             |
| Audio              | Mensagens de voz                      | 16MB             |
| Interactive Button | Botoes de resposta rapida             | Max 3 botoes     |
| Interactive List   | Menu com opcoes em secoes             | Max 10 opcoes    |
| Location           | Compartilhar localizacao              | lat/long         |
| Contact            | Compartilhar contato                  | vCard format     |
| Reaction           | Reagir com emoji a mensagem           | 1 emoji          |

**Exemplo - Botoes interativos (Node.js):**
```typescript
async function sendButtons(to: string, body: string, buttons: Array<{id: string, title: string}>) {
  return axios.post(`${GRAPH_API}/${process.env.PHONE_NUMBER_ID}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map(b => ({
          type: 'reply',
          reply: { id: b.id, title: b.title }
        }))
      }
    }
  }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } });
}

// Uso:
await sendButtons('5511999999999', 'Como posso ajudar?', [
  { id: 'suporte', title: 'Suporte' },
  { id: 'vendas', title: 'Vendas' },
  { id: 'info', title: 'Informacoes' }
]);
```

**Para exemplos completos de todos os tipos em Node.js e Python**, leia `references/message-types.md`.

---

## Webhooks

Webhooks permitem receber mensagens e atualizacoes de status em tempo real.

## Verificacao (Get) - Obrigatorio

Quando voce configura o webhook no Meta Developers, a Meta envia um GET para verificar:

```typescript
// Node.js (Express)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});
```

## Recebimento (Post) - Com Seguranca Hmac-Sha256

Toda notificacao de webhook vem assinada no header `X-Hub-Signature-256`. Valide SEMPRE antes de processar:

```typescript
import crypto from 'crypto';

function validateSignature(rawBody: Buffer, signature: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', process.env.APP_SECRET!)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(`sha256=${expectedSig}`),
    Buffer.from(signature)
  );
}
```

**Importante:** Usar `crypto.timingSafeEqual` (Node.js) ou `hmac.compare_digest` (Python) para prevenir timing attacks. Nunca use comparacao simples de strings.

## Eventos Recebidos

- **messages** - Mensagem do cliente (texto, midia, botao, localizacao)
- **statuses** - Atualizado de status (sent → delivered → read)
- **errors** - Erros de entrega

**Requisitos:**
- Endpoint HTTPS com certificado SSL valido
- Responder com HTTP 200 em ate 5 segundos
- Dev: use ngrok para teste local

**Para setup completo com exemplos Node.js e Python**, leia `references/webhook-setup.md`.

---

## Menu Principal Interativo

Use botoes ou listas para criar um menu de opcoes na primeira interacao:

```python

## Python - Menu Com Lista Interativa

async def send_main_menu(to: str):
    await send_interactive_list(
        to=to,
        header="Bem-vindo!",
        body="Selecione o que precisa:",
        button_text="Ver opcoes",
        sections=[{
            "title": "Atendimento",
            "rows": [
                {"id": "suporte", "title": "Suporte Tecnico", "description": "Ajuda com problemas"},
                {"id": "vendas", "title": "Vendas", "description": "Conhecer nossos produtos"},
                {"id": "financeiro", "title": "Financeiro", "description": "Boletos e pagamentos"},
            ]
        }]
    )
```

## State Machine Para Fluxos

Gerencie conversas com uma maquina de estados. Cada cliente tem um estado atual que determina como a proxima mensagem sera processada:

```
INICIO → MENU_PRINCIPAL → SUPORTE → AGUARDANDO_DETALHES → ESCALACAO_HUMANO
                        → VENDAS → CATALOGO → CHECKOUT
                        → FINANCEIRO → SEGUNDA_VIA_BOLETO
```

## Janela De 24 Horas

- **Dentro da janela (24h apos ultima mensagem do cliente):** Pode enviar qualquer tipo de mensagem gratuitamente
- **Fora da janela:** Apenas template messages (cobradas por categoria)

## Integracao Com Ia (Claude Api)

Combine WhatsApp com Claude para respostas inteligentes:
1. Receba mensagem via webhook
2. Envie para Claude API com contexto da conversa
3. Retorne resposta via WhatsApp
4. Mantenha escalacao para humano disponivel

**Para padroes completos de automacao**, leia `references/automation-patterns.md`.

---

## Whatsapp Flows

Formularios interativos multi-tela dentro do WhatsApp. O cliente preenche campos sem sair do app. Definidos em JSON com screens, components e actions.

Use cases: cadastros, agendamentos, pesquisas NPS, selecao de produtos.

## Commerce & Catalogo

Ate 500 produtos no catalogo WhatsApp. Envie mensagens de produto individual ou multi-produto com checkout in-app.

## Template Management Api

Crie, liste e delete templates programaticamente. Ate 6000 traducoes por conta. Aprovacao em minutos.

## Whatsapp Channels

Broadcasting unidirecional para subscribers ilimitados. Localizado na aba "Atualizacoes" do WhatsApp.

## Click-To-Whatsapp Ads

Anuncios no Facebook/Instagram com botao que abre conversa no WhatsApp. 99% de taxa de abertura.

## Status Tracking

Rastreie entrega: pending → server → device → read. Receba via webhook de status updates.

**Para detalhes completos de features avancados**, leia `references/advanced-features.md`.
**Para gerenciamento de templates via API**, leia `references/template-management.md`.

---

## Checklist Essencial

- [ ] Opt-in explicito obtido antes de enviar mensagens
- [ ] Mecanismo de opt-out implementado (keyword "SAIR" ou "STOP")
- [ ] Registro de consentimento com timestamp, metodo e proposito
- [ ] Conteudo dentro das politicas do WhatsApp (sem spam, sem conteudo proibido)
- [ ] LGPD/GDPR compliance (base legal definida, direitos do titular)
- [ ] Frequencia de mensagens adequada (nao excessiva)
- [ ] Templates aprovados antes do uso
- [ ] Verificacao de negocio completa (para limites maiores)

## Quality Rating

O WhatsApp monitora a qualidade das suas mensagens e atribui um rating:

| Rating    | Significado                        | Acao                              |
|-----------|------------------------------------|-----------------------------------|
| Verde     | Boa qualidade, poucos bloqueios    | Manter — elegivel para upgrade    |
| Amarelo   | Qualidade media, atencao necessaria| Revisar conteudo e frequencia     |
| Vermelho  | Qualidade baixa, risco de suspensao| Acao imediata: reduzir volume     |

**Sinais positivos:** Alta taxa de resposta, engajamento, poucos bloqueios
**Sinais negativos:** Bloqueios, reports de spam, baixo engajamento

## Tier System (Limites De Mensagem)

Desde outubro 2025, limites sao por **Business Portfolio** (nao por numero):

| Tier         | Conversas/24h | Como alcancar                           |
|--------------|---------------|------------------------------------------|
| Inicial      | 250           | Conta nova / nao verificada              |
| Tier 1       | 1,000         | Auto-upgrade: 50%+ do limite por 7 dias  |
| Tier 2       | 10,000        | Auto-upgrade: 50%+ do limite por 7 dias  |
| Tier 3       | 100,000       | Auto-upgrade: 50%+ do limite por 7 dias  |
| Unlimited    | Ilimitado     | Auto-upgrade: 50%+ do limite por 7 dias  |

**Mudancas 2026:** Tiers 2K e 10K serao removidos. Apos verificacao de negocio, limite imediato de 100K.

**Para guia completo de compliance**, leia `references/compliance.md`.

---

## Troubleshooting

| Problema                       | Causa Provavel                     | Solucao                                    |
|--------------------------------|------------------------------------|--------------------------------------------|
| 401 Unauthorized               | Token expirado ou invalido         | Gerar novo System User Token               |
| 400 Bad Request                | Payload malformado                 | Verificar JSON contra exemplos             |
| Template rejeitado             | Conteudo viola politicas           | Revisar e resubmeter com alteracoes        |
| Webhook nao recebe             | URL invalida ou sem HTTPS          | Usar ngrok (dev) ou certificado SSL (prod) |
| Rate limit exceeded            | Ultrapassou 80 msg/s              | Implementar queue com retry                |
| Quality rating baixo           | Muitos bloqueios/reports           | Reduzir volume, melhorar conteudo          |
| Mensagem nao entregue          | Numero invalido ou nao no WhatsApp | Validar numero antes de enviar             |
| Numero nao verificado          | OTP nao completado                 | Repetir verificacao via SMS ou ligacao      |

Para validar sua configuracao:
```bash
python scripts/validate_config.py
```

---

## Referencias (Leia Conforme Necessidade)

| Arquivo                        | Quando ler                                        |
|--------------------------------|---------------------------------------------------|
| `references/setup-guide.md`    | Setup inicial — criar conta Meta, configurar API  |
| `references/message-types.md`  | Exemplos completos de todos os tipos de mensagem   |
| `references/webhook-setup.md`  | Configurar webhooks com seguranca HMAC             |
| `references/automation-patterns.md` | Chatbot, filas, state machine, integracao IA  |
| `references/compliance.md`     | LGPD/GDPR, opt-in, quality rating, tier system    |
| `references/api-reference.md`  | Endpoints, erros, rate limits, pricing 2026        |
| `references/advanced-features.md` | Flows, Commerce, Channels, Ads, Status Tracking|
| `references/template-management.md` | CRUD de templates via API                     |

## Scripts

| Script                         | O que faz                                         |
|--------------------------------|---------------------------------------------------|
| `scripts/setup_project.py`     | Cria projeto com boilerplate (Node.js ou Python)   |
| `scripts/validate_config.py`   | Valida credenciais e conexao com a API             |
| `scripts/send_test_message.py` | Envia mensagem teste para validar setup            |

## Boilerplate

| Diretorio                      | Conteudo                                          |
|--------------------------------|---------------------------------------------------|
| `assets/boilerplate/nodejs/`   | Projeto TypeScript/Express completo                |
| `assets/boilerplate/python/`   | Projeto Python/Flask completo                      |
| `assets/examples/`             | Exemplos de payloads JSON (templates, webhooks, flows) |

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `instagram` - Complementary skill for enhanced analysis
- `social-orchestrator` - Complementary skill for enhanced analysis
- `telegram` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
