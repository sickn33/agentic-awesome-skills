# Padroes de Automacao de Atendimento - WhatsApp Cloud API

Guia completo para implementar automacao de atendimento profissional via WhatsApp, incluindo chatbots, filas de atendimento, state machines e integracao com IA.

---

## Indice

1. [Arquitetura de Automacao](#arquitetura-de-automacao)
2. [Menu Principal Interativo](#menu-principal-interativo)
3. [State Machine para Fluxos](#state-machine-para-fluxos)
4. [Gerenciamento de Sessao](#gerenciamento-de-sessao)
5. [Fila de Atendimento](#fila-de-atendimento)
6. [Escalacao para Humano](#escalacao-para-humano)
7. [Respostas Fora do Horario](#respostas-fora-do-horario)
8. [Integracao com IA (Claude API)](#integracao-com-ia-claude-api)
9. [WhatsApp Flows para Formularios](#whatsapp-flows-para-formularios)
10. [Fluxo End-to-End Completo](#fluxo-end-to-end-completo)

---

## Arquitetura de Automacao

```
Cliente WhatsApp
       │
       ▼
   Webhook POST
       │
       ▼
  HMAC Validation
       │
       ▼
  Session Manager ──► Busca/cria sessao do cliente
       │
       ▼
  State Router ──► Determina handler baseado no estado atual
       │
       ├── INICIO → Menu Principal
       ├── MENU → Router de opcoes
       ├── SUPORTE → Fluxo de suporte
       ├── VENDAS → Catalogo/checkout
       ├── HUMANO → Fila de atendimento
       └── IA → Claude API handler
```

---

## Menu Principal Interativo

### Com Botoes (ate 3 opcoes)

**Node.js:**
```typescript
async function sendMainMenuButtons(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      header: { type: 'text', text: 'Bem-vindo!' },
      body: { text: 'Olá! Como posso ajudar você hoje?' },
      footer: { text: 'Selecione uma opção abaixo' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'btn_suporte', title: 'Suporte' } },
          { type: 'reply', reply: { id: 'btn_vendas', title: 'Vendas' } },
          { type: 'reply', reply: { id: 'btn_info', title: 'Informações' } }
        ]
      }
    }
  });
}
```

### Com Lista (ate 10 opcoes em secoes)

**Python:**
```python
async def send_main_menu_list(to: str) -> None:
    await send_message({
        "messaging_product": "whatsapp",
        "to": to,
        "type": "interactive",
        "interactive": {
            "type": "list",
            "header": {"type": "text", "text": "Menu Principal"},
            "body": {"text": "Selecione o departamento:"},
            "footer": {"text": "Horário: Seg-Sex 8h-18h"},
            "action": {
                "button": "Ver opções",
                "sections": [
                    {
                        "title": "Atendimento",
                        "rows": [
                            {"id": "suporte_tecnico", "title": "Suporte Técnico", "description": "Problemas com produto ou serviço"},
                            {"id": "suporte_financeiro", "title": "Financeiro", "description": "Boletos, pagamentos, reembolsos"},
                            {"id": "suporte_comercial", "title": "Comercial", "description": "Novos pedidos e orçamentos"}
                        ]
                    },
                    {
                        "title": "Informações",
                        "rows": [
                            {"id": "info_horario", "title": "Horário de Funcionamento"},
                            {"id": "info_endereco", "title": "Endereço e Contato"},
                            {"id": "info_faq", "title": "Perguntas Frequentes"}
                        ]
                    }
                ]
            }
        }
    })
```

---

## State Machine para Fluxos

### Modelo de Estados

```typescript
enum ConversationState {
  INICIO = 'INICIO',
  MENU_PRINCIPAL = 'MENU_PRINCIPAL',
  SUPORTE_TECNICO = 'SUPORTE_TECNICO',
  SUPORTE_AGUARDANDO_DETALHES = 'SUPORTE_AGUARDANDO_DETALHES',
  SUPORTE_AGUARDANDO_ANEXO = 'SUPORTE_AGUARDANDO_ANEXO',
  VENDAS_CATALOGO = 'VENDAS_CATALOGO',
  VENDAS_CHECKOUT = 'VENDAS_CHECKOUT',
  FINANCEIRO = 'FINANCEIRO',
  FINANCEIRO_SEGUNDA_VIA = 'FINANCEIRO_SEGUNDA_VIA',
  ATENDIMENTO_HUMANO = 'ATENDIMENTO_HUMANO',
  ATENDIMENTO_IA = 'ATENDIMENTO_IA',
  PESQUISA_NPS = 'PESQUISA_NPS',
  FINALIZADO = 'FINALIZADO'
}
```

### Router de Estados

```typescript
interface Session {
  phone: string;
  state: ConversationState;
  data: Record<string, any>;
  lastActivity: Date;
  agentId?: string;
}

async function routeMessage(session: Session, message: IncomingMessage): Promise<void> {
  const handlers: Record<ConversationState, MessageHandler> = {
    [ConversationState.INICIO]: handleInicio,
    [ConversationState.MENU_PRINCIPAL]: handleMenuPrincipal,
    [ConversationState.SUPORTE_TECNICO]: handleSuporteTecnico,
    [ConversationState.SUPORTE_AGUARDANDO_DETALHES]: handleAguardandoDetalhes,
    [ConversationState.VENDAS_CATALOGO]: handleVendasCatalogo,
    [ConversationState.FINANCEIRO]: handleFinanceiro,
    [ConversationState.ATENDIMENTO_HUMANO]: handleAtendimentoHumano,
    [ConversationState.ATENDIMENTO_IA]: handleAtendimentoIA,
    [ConversationState.PESQUISA_NPS]: handlePesquisaNPS,
    // ... demais estados
  };

  const handler = handlers[session.state] || handleInicio;
  await handler(session, message);
}
```

### Exemplo de Handler

```typescript
async function handleMenuPrincipal(session: Session, message: IncomingMessage): Promise<void> {
  const selectedId = message.interactive?.button_reply?.id
    || message.interactive?.list_reply?.id
    || message.text?.body?.toLowerCase();

  switch (selectedId) {
    case 'btn_suporte':
    case 'suporte_tecnico':
      session.state = ConversationState.SUPORTE_TECNICO;
      await sendText(session.phone, 'Entendido! Descreva seu problema e nossa equipe vai ajudar.');
      session.state = ConversationState.SUPORTE_AGUARDANDO_DETALHES;
      break;

    case 'btn_vendas':
    case 'suporte_comercial':
      session.state = ConversationState.VENDAS_CATALOGO;
      await sendProductCatalog(session.phone);
      break;

    case 'btn_info':
    case 'info_faq':
      await sendFAQ(session.phone);
      // Mantem no menu apos FAQ
      break;

    default:
      await sendText(session.phone, 'Desculpe, não entendi. Vou mostrar o menu novamente.');
      await sendMainMenuButtons(session.phone);
      break;
  }

  session.lastActivity = new Date();
  await saveSession(session);
}
```

---

## Gerenciamento de Sessao

### Com Redis (Producao)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
const SESSION_TTL = 86400; // 24 horas (janela do WhatsApp)

async function getSession(phone: string): Promise<Session> {
  const data = await redis.get(`wa_session:${phone}`);
  if (data) {
    return JSON.parse(data);
  }
  return createNewSession(phone);
}

async function saveSession(session: Session): Promise<void> {
  session.lastActivity = new Date();
  await redis.set(
    `wa_session:${session.phone}`,
    JSON.stringify(session),
    'EX',
    SESSION_TTL
  );
}

function createNewSession(phone: string): Session {
  return {
    phone,
    state: ConversationState.INICIO,
    data: {},
    lastActivity: new Date()
  };
}
```

### Com In-Memory (Desenvolvimento)

```python
from datetime import datetime, timedelta
from typing import Dict, Optional

sessions: Dict[str, dict] = {}
SESSION_TTL = timedelta(hours=24)

def get_session(phone: str) -> dict:
    session = sessions.get(phone)
    if session and datetime.now() - session["last_activity"] < SESSION_TTL:
        return session
    return create_new_session(phone)

def save_session(session: dict) -> None:
    session["last_activity"] = datetime.now()
    sessions[session["phone"]] = session

def create_new_session(phone: str) -> dict:
    session = {
        "phone": phone,
        "state": "INICIO",
        "data": {},
        "last_activity": datetime.now()
    }
    sessions[phone] = session
    return session
```

**Importante:** A janela de 24h do WhatsApp permite respostas gratuitas por 24h apos a ultima mensagem do cliente. Use o TTL da sessao alinhado com esta janela.

---

## Fila de Atendimento

### Modelo de Fila com Prioridade

```typescript
interface QueueItem {
  phone: string;
  department: string;
  priority: 'alta' | 'media' | 'baixa';
  enteredAt: Date;
  estimatedWait: number; // minutos
}

class AttendanceQueue {
  private queues: Map<string, QueueItem[]> = new Map();

  async addToQueue(item: QueueItem): Promise<number> {
    const dept = item.department;
    if (!this.queues.has(dept)) this.queues.set(dept, []);

    const queue = this.queues.get(dept)!;
    queue.push(item);

    // Ordenar por prioridade e depois por tempo de entrada
    queue.sort((a, b) => {
      const priorityOrder = { alta: 0, media: 1, baixa: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.enteredAt.getTime() - b.enteredAt.getTime();
    });

    const position = queue.indexOf(item) + 1;

    // Notificar cliente da posicao
    await sendText(item.phone,
      `Você está na posição ${position} da fila do setor ${dept}. ` +
      `Tempo estimado: ~${position * 5} minutos. Aguarde!`
    );

    return position;
  }

  async getNext(department: string): Promise<QueueItem | undefined> {
    const queue = this.queues.get(department);
    return queue?.shift();
  }
}
```

### SLA e Monitoramento

```typescript
const SLA_CONFIG = {
  suporte: { maxWaitMinutes: 15, alertAfterMinutes: 10 },
  vendas: { maxWaitMinutes: 5, alertAfterMinutes: 3 },
  financeiro: { maxWaitMinutes: 20, alertAfterMinutes: 15 }
};

async function checkSLABreaches(): Promise<void> {
  for (const [dept, config] of Object.entries(SLA_CONFIG)) {
    const queue = attendanceQueue.getQueue(dept);
    for (const item of queue) {
      const waitMinutes = (Date.now() - item.enteredAt.getTime()) / 60000;
      if (waitMinutes > config.maxWaitMinutes) {
        await alertSupervisor(dept, item, waitMinutes);
      }
    }
  }
}
```

---

## Escalacao para Humano

### Detectar Necessidade de Escalacao

```typescript
const ESCALATION_TRIGGERS = [
  'falar com humano', 'falar com atendente', 'atendente',
  'pessoa real', 'humano', 'reclamacao', 'reclamar',
  'cancelar', 'cancelamento', 'insatisfeito', 'gerente'
];

function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_TRIGGERS.some(trigger => lower.includes(trigger));
}

async function escalateToHuman(session: Session): Promise<void> {
  session.state = ConversationState.ATENDIMENTO_HUMANO;

  // Notificar cliente
  await sendText(session.phone,
    'Entendi! Vou transferir você para um de nossos atendentes. ' +
    'Por favor, aguarde um momento.'
  );

  // Adicionar a fila
  await attendanceQueue.addToQueue({
    phone: session.phone,
    department: session.data.department || 'geral',
    priority: session.data.isVIP ? 'alta' : 'media',
    enteredAt: new Date(),
    estimatedWait: 5
  });

  // Notificar painel de atendentes
  await notifyAgentPanel({
    type: 'new_customer',
    phone: session.phone,
    context: session.data,
    conversationHistory: session.data.history || []
  });

  await saveSession(session);
}
```

### Transferencia de Contexto

Quando um humano assume, ele deve ver o historico da conversa automatizada:

```typescript
async function buildHandoffContext(session: Session): string {
  return `
📋 Contexto da conversa:
- Cliente: ${session.phone}
- Departamento: ${session.data.department}
- Estado anterior: ${session.state}
- Problema relatado: ${session.data.problemDescription || 'Não especificado'}
- Tentativas do bot: ${session.data.botAttempts || 0}
- Tempo na conversa: ${getElapsedTime(session.data.startedAt)}

📝 Histórico resumido:
${session.data.history?.map(h => `[${h.from}] ${h.text}`).join('\n') || 'Sem histórico'}
  `.trim();
}
```

---

## Respostas Fora do Horario

```typescript
interface BusinessHours {
  timezone: string;
  schedule: Record<string, { open: string; close: string } | null>;
}

const BUSINESS_HOURS: BusinessHours = {
  timezone: 'America/Sao_Paulo',
  schedule: {
    monday: { open: '08:00', close: '18:00' },
    tuesday: { open: '08:00', close: '18:00' },
    wednesday: { open: '08:00', close: '18:00' },
    thursday: { open: '08:00', close: '18:00' },
    friday: { open: '08:00', close: '17:00' },
    saturday: { open: '09:00', close: '13:00' },
    sunday: null // fechado
  }
};

function isWithinBusinessHours(): boolean {
  const now = new Date().toLocaleString('en-US', { timeZone: BUSINESS_HOURS.timezone });
  const date = new Date(now);
  const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hours = BUSINESS_HOURS.schedule[day];

  if (!hours) return false;

  const currentTime = date.toTimeString().slice(0, 5);
  return currentTime >= hours.open && currentTime <= hours.close;
}

async function handleOffHours(phone: string): Promise<void> {
  // Enviar template (fora da janela de 24h pode nao ter sessao ativa)
  await sendText(phone,
    '⏰ Nosso horário de atendimento é:\n' +
    'Seg-Qui: 8h às 18h\n' +
    'Sex: 8h às 17h\n' +
    'Sáb: 9h às 13h\n\n' +
    'Deixe sua mensagem que retornaremos assim que possível!'
  );
}
```

---

## Integracao com IA (Claude API)

### Chatbot Inteligente com Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `Você é um assistente virtual da empresa [NOME]. Sua função é:
- Responder dúvidas sobre produtos e serviços
- Ajudar com problemas técnicos simples
- Encaminhar para atendente humano quando necessário
- Ser cordial, profissional e objetivo
- Responder em português brasileiro

Regras:
- Máximo 300 caracteres por resposta (limite do WhatsApp para boa leitura)
- Se não souber a resposta, diga que vai transferir para um especialista
- Nunca invente informações sobre preços ou disponibilidade
- Use emojis com moderação`;

async function getAIResponse(
  session: Session,
  userMessage: string
): Promise<{ text: string; shouldEscalate: boolean }> {
  const messages = (session.data.aiHistory || []).concat([
    { role: 'user', content: userMessage }
  ]);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages
  });

  const aiText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Detectar se a IA sugere escalacao
  const shouldEscalate = aiText.toLowerCase().includes('transferir')
    || aiText.toLowerCase().includes('especialista')
    || aiText.toLowerCase().includes('atendente');

  // Salvar historico
  session.data.aiHistory = messages.concat([
    { role: 'assistant', content: aiText }
  ]);

  return { text: aiText, shouldEscalate };
}

async function handleAtendimentoIA(session: Session, message: IncomingMessage): Promise<void> {
  const userText = message.text?.body || '[mídia recebida]';
  const { text, shouldEscalate } = await getAIResponse(session, userText);

  await sendText(session.phone, text);

  if (shouldEscalate) {
    await escalateToHuman(session);
  }
}
```

### Limite de Tentativas do Bot

```typescript
const MAX_BOT_ATTEMPTS = 3;

async function handleWithFallback(session: Session, message: IncomingMessage): Promise<void> {
  session.data.botAttempts = (session.data.botAttempts || 0) + 1;

  if (session.data.botAttempts >= MAX_BOT_ATTEMPTS) {
    await sendText(session.phone,
      'Parece que não estou conseguindo ajudar. Vou transferir para um atendente.'
    );
    await escalateToHuman(session);
    return;
  }

  await handleAtendimentoIA(session, message);
}
```

---

## WhatsApp Flows para Formularios

WhatsApp Flows permite criar formularios interativos multi-tela. Exemplo de Flow de agendamento:

### Enviar Flow

```typescript
async function sendAppointmentFlow(to: string, flowId: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      header: { type: 'text', text: 'Agendar Consulta' },
      body: { text: 'Preencha o formulário para agendar sua consulta.' },
      footer: { text: 'Seus dados estão protegidos' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          flow_id: flowId,
          flow_cta: 'Agendar agora',
          flow_action: 'navigate',
          flow_action_payload: {
            screen: 'APPOINTMENT_SCREEN',
            data: {
              available_dates: ['2026-03-01', '2026-03-02', '2026-03-03']
            }
          }
        }
      }
    }
  });
}
```

### Receber Resposta do Flow

As respostas do Flow chegam via webhook como mensagem interativa:

```typescript
function handleFlowResponse(message: IncomingMessage): void {
  if (message.type === 'interactive' && message.interactive?.type === 'nfm_reply') {
    const flowResponse = JSON.parse(message.interactive.nfm_reply.response_json);
    // flowResponse contem os dados preenchidos pelo usuario
    console.log('Dados do flow:', flowResponse);
    // Ex: { date: '2026-03-01', time: '14:00', name: 'João Silva' }
  }
}
```

Para mais detalhes sobre WhatsApp Flows, leia `references/advanced-features.md`.

---

## Fluxo End-to-End Completo

### Webhook Handler Principal

```typescript
app.post('/webhook', validateHMAC, async (req, res) => {
  // Responder 200 imediatamente (requisito: < 5 segundos)
  res.sendStatus(200);

  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    // Processar mensagens
    if (value?.messages) {
      for (const message of value.messages) {
        await processIncomingMessage(message);
      }
    }

    // Processar status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        await processStatusUpdate(status);
      }
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Nao retornar erro - ja respondeu 200
  }
});

async function processIncomingMessage(message: IncomingMessage): Promise<void> {
  const phone = message.from;
  const session = await getSession(phone);

  // Marcar como lida
  await markAsRead(message.id);

  // Verificar horario de funcionamento
  if (!isWithinBusinessHours() && session.state === ConversationState.INICIO) {
    await handleOffHours(phone);
    return;
  }

  // Verificar triggers de escalacao
  if (message.text?.body && shouldEscalate(message.text.body)) {
    await escalateToHuman(session);
    await saveSession(session);
    return;
  }

  // Se e uma nova conversa, enviar menu
  if (session.state === ConversationState.INICIO) {
    session.state = ConversationState.MENU_PRINCIPAL;
    await sendMainMenuButtons(phone);
    await saveSession(session);
    return;
  }

  // Rotear para o handler correto
  await routeMessage(session, message);
}
```

Este fluxo garante:
1. Resposta HTTP 200 imediata (requisito WhatsApp)
2. Validacao HMAC de seguranca
3. Gerenciamento de sessao com estado
4. Verificacao de horario de funcionamento
5. Deteccao de escalacao
6. Roteamento por estado da conversa
7. Marcacao automatica como lida
