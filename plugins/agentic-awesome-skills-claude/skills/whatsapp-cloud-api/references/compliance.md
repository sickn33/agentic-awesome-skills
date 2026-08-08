# Compliance e Boas Praticas - WhatsApp Cloud API

Guia completo de compliance para integracoes WhatsApp Business, cobrindo LGPD, GDPR, politicas do WhatsApp, opt-in/opt-out, quality rating e tier system.

---

## Indice

1. [LGPD - Brasil](#lgpd---brasil)
2. [GDPR - Uniao Europeia](#gdpr---uniao-europeia)
3. [Politicas do WhatsApp](#politicas-do-whatsapp)
4. [Opt-in e Opt-out](#opt-in-e-opt-out)
5. [Quality Rating Dashboard](#quality-rating-dashboard)
6. [Tier System - Limites de Mensagem](#tier-system---limites-de-mensagem)
7. [Retencao e Exclusao de Dados](#retencao-e-exclusao-de-dados)
8. [Checklist de Compliance Pre-Lancamento](#checklist-de-compliance-pre-lancamento)

---

## LGPD - Brasil

A Lei Geral de Protecao de Dados (Lei 13.709/2018) se aplica a qualquer tratamento de dados pessoais realizado no Brasil.

### Base Legal para Mensagens WhatsApp

| Base Legal           | Quando Usar                                    | Exemplo                          |
|----------------------|------------------------------------------------|----------------------------------|
| Consentimento        | Marketing, promocoes, newsletters               | Campanha de Black Friday         |
| Execucao de contrato | Notificacoes de pedido, entrega, pagamento       | Confirmacao de compra            |
| Interesse legitimo   | Atendimento ao cliente, suporte                  | Resposta a duvida do cliente     |
| Obrigacao legal      | Notificacoes regulatorias                        | Aviso de recall de produto       |

### Direitos do Titular (LGPD Art. 18)

Sua integracao deve suportar:

1. **Confirmacao de tratamento** - Informar quais dados sao processados
2. **Acesso aos dados** - Fornecer copia dos dados armazenados
3. **Correcao** - Permitir atualizacao de dados incorretos
4. **Anonimizacao/exclusao** - Apagar dados quando solicitado
5. **Portabilidade** - Exportar dados em formato legivel
6. **Revogacao do consentimento** - Opt-out a qualquer momento

### Implementacao Tecnica

```typescript
// Registrar consentimento com detalhes completos
interface ConsentRecord {
  phone: string;
  consentType: 'marketing' | 'transactional' | 'support';
  method: 'whatsapp_optin' | 'website_form' | 'sms' | 'verbal';
  timestamp: Date;
  ipAddress?: string;
  message?: string; // texto exato do consentimento
  legalBasis: 'consent' | 'contract' | 'legitimate_interest';
}

async function recordConsent(record: ConsentRecord): Promise<void> {
  await db.consents.create({
    ...record,
    timestamp: new Date(),
    active: true
  });
}

// Revogar consentimento
async function revokeConsent(phone: string, type: string): Promise<void> {
  await db.consents.update(
    { phone, consentType: type },
    { active: false, revokedAt: new Date() }
  );
}
```

---

## GDPR - Uniao Europeia

Se voce atende clientes na UE, o GDPR (Regulamento 2016/679) se aplica.

### Requisitos Especificos

1. **Opt-in Duplo (Double Opt-in)**
   - Primeiro opt-in: cliente fornece numero (site, formulario, QR code)
   - Segundo opt-in: enviar mensagem de confirmacao via WhatsApp
   - Cliente responde com keyword (ex: "SIM") para confirmar

2. **BSP Certificado EU**
   - Use apenas Business Solution Providers com servidores na EU
   - A WhatsApp Cloud API da Meta e hospedada nos EUA — verifique se ha adequacao para seu caso

3. **DPA (Data Processing Agreement)**
   - Contrato formal com a Meta sobre processamento de dados
   - Disponivel em Meta Business Settings

4. **Informacao Clara ao Usuario**
   - Antes do opt-in, informar: quais dados, para que finalidade, por quanto tempo
   - Link para politica de privacidade

### Implementacao de Double Opt-in

```python
async def handle_optin_flow(phone: str, stage: str) -> None:
    if stage == "initial":
        # Primeiro contato - enviar template de confirmacao
        await send_template(
            to=phone,
            template_name="optin_confirmation",
            language="pt_BR",
            components=[{
                "type": "body",
                "parameters": [{"type": "text", "text": "mensagens promocionais"}]
            }]
        )
        await save_optin_stage(phone, "awaiting_confirmation")

    elif stage == "awaiting_confirmation":
        # Cliente respondeu - verificar keyword
        # (chamado pelo webhook handler)
        pass

async def process_optin_response(phone: str, message: str) -> None:
    keyword = message.strip().upper()
    if keyword in ["SIM", "YES", "ACEITO", "CONFIRMO"]:
        await record_consent(ConsentRecord(
            phone=phone,
            consent_type="marketing",
            method="whatsapp_double_optin",
            timestamp=datetime.now(),
            message=f"Usuario respondeu: {message}"
        ))
        await send_text(phone, "Obrigado! Voce foi inscrito com sucesso. Envie SAIR a qualquer momento para cancelar.")
    else:
        await send_text(phone, "Opt-in nao confirmado. Voce nao recebera mensagens promocionais.")
```

---

## Politicas do WhatsApp

### Conteudo Proibido

O WhatsApp proibe mensagens contendo:
- Produtos ilegais (drogas, armas, documentos falsos)
- Conteudo adulto explicito
- Jogos de azar nao regulamentados
- Esquemas de piramide ou fraude
- Conteudo que incite violencia ou odio
- Venda de dados pessoais
- Medicamentos controlados sem prescricao

### Regras de Frequencia

- Nao envie mais de 1 mensagem de marketing por semana para o mesmo usuario
- Respeite preferencias de frequencia do usuario
- Mensagens transacionais podem ser mais frequentes (conforme necessidade)
- Nunca envie mensagens em massa sem segmentacao

### Spam Signals

O WhatsApp monitora estes sinais para detectar spam:
- Taxa alta de bloqueios por usuarios
- Envio em massa para numeros que nunca interagiram
- Mensagens identicas para muitos destinatarios
- Baixa taxa de resposta/engajamento
- Reports de spam por usuarios

---

## Opt-in e Opt-out

### Metodos Validos de Opt-in

1. **Website/Landing Page** - Formulario com checkbox explicito
2. **QR Code** - Link wa.me que inicia conversa
3. **SMS** - Enviar keyword para numero curto
4. **Presencial** - Consentimento verbal registrado
5. **WhatsApp** - Double opt-in via mensagem

### Implementacao de Opt-out

```typescript
const OPTOUT_KEYWORDS = ['sair', 'stop', 'cancelar', 'parar', 'descadastrar', 'unsubscribe'];

function isOptOutRequest(message: string): boolean {
  return OPTOUT_KEYWORDS.includes(message.trim().toLowerCase());
}

async function handleOptOut(phone: string): Promise<void> {
  // 1. Revogar consentimento
  await revokeConsent(phone, 'marketing');

  // 2. Confirmar ao usuario
  await sendText(phone,
    'Voce foi descadastrado com sucesso e nao recebera mais mensagens promocionais. ' +
    'Mensagens transacionais (pedidos, entregas) continuarao sendo enviadas conforme necessario. ' +
    'Para se inscrever novamente, envie ATIVAR.'
  );

  // 3. Registrar evento
  await logEvent('optout', { phone, timestamp: new Date() });
}
```

### Registro de Comprovacao

Para cada opt-in, registre:
- **Telefone** do usuario
- **Timestamp** exato (com timezone)
- **Metodo** usado (website, QR, SMS, WhatsApp)
- **Texto exato** do consentimento apresentado
- **IP** (se via web)
- **Finalidade** especifica (marketing, transacional, suporte)

---

## Quality Rating Dashboard

### Como Acessar

WhatsApp Manager → Overview → Insights tab

### Sistema de Cores

| Cor       | Significado                          | Impacto                                  |
|-----------|--------------------------------------|------------------------------------------|
| Verde     | Alta qualidade                       | Elegivel para upgrade de tier             |
| Amarelo   | Qualidade media, atencao necessaria  | Nao perde tier, mas nao avanca            |
| Vermelho  | Qualidade baixa                      | Risco de restricao, nao avanca de tier    |

### Sinais Monitorados (ultimos 7 dias)

**Positivos:**
- Alta taxa de resposta dos clientes
- Engajamento com botoes/listas
- Conversas longas (multiplas mensagens)
- Baixa taxa de bloqueio

**Negativos:**
- Bloqueios frequentes
- Reports de spam
- Baixo engajamento
- Mensagens nao lidas

### Acoes por Rating

**Verde:** Continue como esta. Foque em manter a qualidade.

**Amarelo:**
- Revise o conteudo das mensagens de marketing
- Reduza a frequencia de envio
- Melhore a segmentacao (envie apenas para quem tem interesse)
- Verifique se o opt-out esta funcionando

**Vermelho:**
- Pare imediatamente de enviar marketing
- Revise toda a base de contatos (remova inativos)
- Verifique se ha problemas tecnicos (mensagens duplicadas)
- Foque apenas em mensagens transacionais ate recuperar

---

## Tier System - Limites de Mensagem

### Estrutura de Tiers (Atualizado Outubro 2025)

Desde outubro 2025, os limites sao por **Business Portfolio**, nao por numero individual.

| Tier         | Conversas/24h | Throughput      |
|--------------|---------------|-----------------|
| Inicial      | 250           | 80 msg/s        |
| Tier 1       | 1,000         | 80 msg/s        |
| Tier 2       | 10,000        | 80 msg/s        |
| Tier 3       | 100,000       | 80 msg/s        |
| Unlimited    | Ilimitado     | 1,000 msg/s     |

### Auto-Upgrade

O WhatsApp faz upgrade automatico quando:
1. Quality rating e verde ou amarelo
2. Voce envia para 50%+ do limite atual por 7 dias consecutivos
3. Tempo de upgrade: 6 horas (antes era 24h)

**Exemplo:** Se seu limite e 1,000, envie para 500+ clientes unicos por 7 dias para subir para 10,000.

### Mudancas 2026

- **Q1 2026:** Tiers 2K e 10K serao removidos para parceiros selecionados
- **Q2 2026:** Remocao completa — apos verificacao de negocio, limite imediato de 100K
- **Business Portfolio Pacing:** Novo recurso para campanhas em massa com pausa automatica baseada em feedback

### Regra Importante

Uma vez que voce alcanca um tier, **nao perde** mesmo se a qualidade cair. O rating afeta apenas a capacidade de subir para tiers maiores.

Se um numero no Business Portfolio ja esta em Unlimited, **todos** os novos numeros adicionados iniciam em Unlimited.

---

## Retencao e Exclusao de Dados

### Politica Recomendada

| Tipo de Dado           | Retencao Recomendada | Justificativa                    |
|------------------------|----------------------|----------------------------------|
| Mensagens de conversa  | 90 dias              | Suporte e auditoria              |
| Dados de consentimento | Enquanto ativo + 5 anos | Comprovacao legal             |
| Dados de opt-out       | 5 anos               | Evitar reenvio + comprovacao     |
| Logs de webhook        | 30 dias              | Debug e monitoramento            |
| Metricas agregadas     | 2 anos               | Analytics e melhoria             |

### Exclusao Automatica

```typescript
// Cron job diario para limpar dados antigos
async function cleanupOldData(): Promise<void> {
  const now = new Date();

  // Mensagens > 90 dias
  await db.messages.deleteMany({
    createdAt: { $lt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) }
  });

  // Logs > 30 dias
  await db.webhookLogs.deleteMany({
    createdAt: { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
  });

  // Sessoes expiradas
  await db.sessions.deleteMany({
    lastActivity: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
  });
}
```

### Atender Pedido de Exclusao (LGPD/GDPR)

```typescript
async function handleDataDeletionRequest(phone: string): Promise<void> {
  // 1. Anonimizar mensagens (manter para analytics, sem PII)
  await db.messages.updateMany(
    { phone },
    { $set: { phone: 'ANONIMIZADO', content: '[REMOVIDO]' } }
  );

  // 2. Deletar dados pessoais
  await db.customers.deleteOne({ phone });
  await db.sessions.deleteOne({ phone });

  // 3. Manter registro de opt-out (para nao enviar novamente)
  await db.optouts.create({ phone, deletedAt: new Date() });

  // 4. Confirmar ao usuario
  await sendText(phone,
    'Seus dados pessoais foram removidos conforme solicitado. ' +
    'Seu número será mantido apenas em nossa lista de exclusão para garantir que não enviaremos mais mensagens.'
  );

  // 5. Log de auditoria
  await logEvent('data_deletion', { phone, timestamp: new Date() });
}
```

---

## Checklist de Compliance Pre-Lancamento

Use esta checklist antes de colocar sua integracao em producao:

### Consentimento
- [ ] Mecanismo de opt-in implementado e testado
- [ ] Double opt-in para EU/GDPR (se aplicavel)
- [ ] Registro de consentimento com timestamp, metodo e finalidade
- [ ] Consentimento especifico para cada tipo (marketing, transacional)

### Opt-out
- [ ] Keywords de opt-out reconhecidas (SAIR, STOP, CANCELAR, etc.)
- [ ] Confirmacao enviada apos opt-out
- [ ] Opt-out processado em tempo real (nao no dia seguinte)
- [ ] Base atualizada imediatamente apos opt-out

### Dados
- [ ] Politica de retencao definida e implementada
- [ ] Rotina de exclusao automatica funcionando
- [ ] Processo para atender pedidos de exclusao (LGPD Art. 18)
- [ ] Dados armazenados com seguranca (encriptacao em repouso)

### WhatsApp
- [ ] Templates aprovados antes do primeiro envio
- [ ] Verificacao de negocio completa (para limites maiores)
- [ ] Quality rating monitorado semanalmente
- [ ] Conteudo dentro das politicas do WhatsApp
- [ ] Frequencia de marketing adequada (max 1x/semana)

### Seguranca
- [ ] HMAC-SHA256 validation no webhook (OBRIGATORIO)
- [ ] Tokens armazenados em variaveis de ambiente (nunca no codigo)
- [ ] HTTPS com certificado SSL valido
- [ ] Access control: apenas pessoal autorizado acessa dados

### Documentacao
- [ ] Politica de privacidade atualizada mencionando WhatsApp
- [ ] Termos de uso incluem uso do canal WhatsApp
- [ ] DPA assinado com a Meta (para GDPR)
