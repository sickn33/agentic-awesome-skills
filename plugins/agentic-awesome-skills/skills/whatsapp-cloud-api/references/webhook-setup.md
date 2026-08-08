# Configuracao de Webhooks - WhatsApp Cloud API

> Guia completo para configurar, validar e proteger webhooks da WhatsApp Cloud API.

---

## 1. Visao Geral

Webhooks sao callbacks HTTP que a Meta envia para o seu servidor sempre que um evento
ocorre na sua conta do WhatsApp Business. Sem webhooks, voce nao recebe mensagens,
confirmacoes de entrega nem atualizacoes de status em tempo real.

**Requisitos obrigatorios:**

| Requisito | Detalhe |
|-----------|---------|
| Protocolo | HTTPS com certificado SSL valido (nao aceita auto-assinado) |
| Resposta | HTTP 200 OK em ate **5 segundos** |
| Disponibilidade | Endpoint deve estar acessivel publicamente na internet |
| Idempotencia | A Meta pode reenviar o mesmo evento; trate duplicatas |

Se o seu servidor nao responder 200 dentro de 5 segundos, a Meta reenvia o evento
com backoff exponencial por ate 7 dias. Apos esse periodo, o webhook e desativado
automaticamente.

---

## 2. Configuracao no Meta Developers

### Passo a passo

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Selecione seu App
3. No menu lateral: **WhatsApp > Configuration**
4. Na secao **Webhook**, clique em **Edit**

### Campos obrigatorios

| Campo | Descricao |
|-------|-----------|
| **Callback URL** | URL HTTPS do seu servidor (ex: `https://api.seudominio.com/webhook`) |
| **Verify Token** | String secreta que voce define (ex: `meu_token_secreto_2024`) |

### Campos para inscrever (Webhook Fields)

Marque pelo menos:

- **messages** - Mensagens recebidas, status de entrega, leitura

Campos opcionais uteis:

- **message_template_status_update** - Aprovacao/rejeicao de templates
- **account_update** - Alteracoes na conta Business

> **IMPORTANTE:** O Verify Token NAO e o mesmo que o Access Token da API.
> Escolha um valor forte e unico, e armazene-o como variavel de ambiente.

---

## 3. Verificacao de Webhook (GET)

Quando voce salva a configuracao no painel da Meta, ela envia um GET request para
validar que o endpoint pertence a voce. Esse fluxo e chamado de **challenge-response**.

### Fluxo de verificacao

```
Meta                            Seu Servidor
  |                                  |
  |  GET /webhook?                   |
  |    hub.mode=subscribe            |
  |    hub.verify_token=SEU_TOKEN    |
  |    hub.challenge=RANDOM_STRING   |
  |  ---------------------------->>  |
  |                                  |  1. Verifica hub.verify_token
  |                                  |  2. Se valido, retorna hub.challenge
  |  <<----------------------------  |
  |  HTTP 200 + challenge como body  |
```

### Node.js / Express

```javascript
// GET /webhook - Verification endpoint
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully');
    return res.status(200).send(challenge);
  }

  console.error('Webhook verification failed: invalid token');
  return res.sendStatus(403);
});
```

### Python / Flask

```python
# GET /webhook - Verification endpoint
@app.route('/webhook', methods=['GET'])
def verify_webhook():
    verify_token = os.environ.get('WEBHOOK_VERIFY_TOKEN')

    mode = request.args.get('hub.mode')
    token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')

    if mode == 'subscribe' and token == verify_token:
        print('Webhook verified successfully')
        return challenge, 200

    print('Webhook verification failed: invalid token')
    return 'Forbidden', 403
```

### Erros comuns na verificacao

| Erro | Causa | Solucao |
|------|-------|---------|
| 403 Forbidden | Verify token nao confere | Verifique a variavel de ambiente |
| Webhook nao valida | Challenge retornado como JSON | Retorne como **plain text**, nao JSON |
| Timeout | Servidor demorou mais de 5s | Verifique latencia e middleware |
| SSL Error | Certificado invalido ou expirado | Use Let's Encrypt ou certificado valido |

> **Erro classico:** Retornar `res.json({ challenge })` em vez de `res.send(challenge)`.
> A Meta espera o challenge como texto puro no body da resposta.

---

## 4. Recebimento de Mensagens (POST)

Apos a verificacao, a Meta envia eventos via POST. Cada payload segue a mesma
estrutura base, mas o conteudo varia conforme o tipo de evento.

### Node.js / Express - Handler completo

```javascript
// POST /webhook - Receive events
app.post('/webhook', (req, res) => {
  // SEMPRE responda 200 imediatamente
  res.sendStatus(200);

  const body = req.body;

  if (!body.object || !body.entry) return;

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const metadata = value.metadata;
      const phoneNumberId = metadata.phone_number_id;

      // Status updates (sent, delivered, read, failed)
      if (value.statuses) {
        for (const status of value.statuses) {
          handleStatusUpdate(status);
        }
      }

      // Incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          const from = message.from;
          const timestamp = message.timestamp;

          switch (message.type) {
            case 'text':
              handleTextMessage(from, message.text.body, phoneNumberId);
              break;
            case 'image':
            case 'video':
            case 'audio':
            case 'document':
              handleMediaMessage(from, message.type, message[message.type]);
              break;
            case 'interactive':
              handleInteractiveResponse(from, message.interactive);
              break;
            case 'button':
              handleButtonResponse(from, message.button);
              break;
            case 'location':
              handleLocationMessage(from, message.location);
              break;
            default:
              console.log(`Unhandled message type: ${message.type}`);
          }
        }
      }
    }
  }
});
```

### Python / Flask - Handler completo

```python
# POST /webhook - Receive events
@app.route('/webhook', methods=['POST'])
def receive_webhook():
    body = request.get_json()

    if not body or 'entry' not in body:
        return 'OK', 200

    for entry in body.get('entry', []):
        for change in entry.get('changes', []):
            if change.get('field') != 'messages':
                continue

            value = change.get('value', {})
            metadata = value.get('metadata', {})
            phone_number_id = metadata.get('phone_number_id')

            # Status updates
            for status in value.get('statuses', []):
                handle_status_update(status)

            # Incoming messages
            for message in value.get('messages', []):
                sender = message['from']
                msg_type = message['type']

                if msg_type == 'text':
                    handle_text_message(sender, message['text']['body'], phone_number_id)
                elif msg_type in ('image', 'video', 'audio', 'document'):
                    handle_media_message(sender, msg_type, message[msg_type])
                elif msg_type == 'interactive':
                    handle_interactive_response(sender, message['interactive'])
                elif msg_type == 'button':
                    handle_button_response(sender, message['button'])
                elif msg_type == 'location':
                    handle_location_message(sender, message['location'])

    return 'OK', 200
```

### Exemplos de payload por tipo de evento

**Mensagem de texto recebida:**
```json
{
  "messages": [{
    "from": "5511999887766",
    "id": "wamid.HBgNNTUxMTk5OTg...",
    "timestamp": "1677000000",
    "type": "text",
    "text": { "body": "Ola, preciso de ajuda" }
  }]
}
```

**Resposta de botao interativo (list/button reply):**
```json
{
  "messages": [{
    "from": "5511999887766",
    "type": "interactive",
    "interactive": {
      "type": "button_reply",
      "button_reply": {
        "id": "btn_confirm",
        "title": "Confirmar pedido"
      }
    }
  }]
}
```

**Atualizacao de status (entrega):**
```json
{
  "statuses": [{
    "id": "wamid.HBgNNTUxMTk5OTg...",
    "status": "delivered",
    "timestamp": "1677000030",
    "recipient_id": "5511999887766"
  }]
}
```

---

## 5. Seguranca HMAC-SHA256 (CRITICO)

### Por que e essencial

Sem validacao de assinatura, qualquer pessoa que descubra a URL do seu webhook pode
enviar payloads falsos. Isso permite:

- **Spoofing de mensagens** - Simular que um cliente enviou algo que nunca enviou
- **Execucao de comandos** - Se o webhook dispara acoes (pagamentos, envios), atacantes controlam
- **Exfiltracao de dados** - Payloads maliciosos podem explorar falhas de parsing

> **Incidente real documentado:** Uma empresa de e-commerce sofreu prejuizo de US$ 847 mil
> apos atacantes enviarem payloads falsos de "confirmacao de pagamento" para o webhook
> que nao validava assinatura, disparando envios de mercadoria sem pagamento real.

### Como funciona

A cada request POST, a Meta inclui o header `X-Hub-Signature-256` contendo:

```
sha256=<hmac-sha256-hex-digest>
```

O HMAC e calculado usando o **App Secret** como chave e o **raw body** como mensagem.

### Passo a passo da validacao

```
1. Capture o raw body ANTES do JSON parsing
2. Extraia o header X-Hub-Signature-256
3. Compute HMAC-SHA256(app_secret, raw_body)
4. Compare usando funcao constant-time (previne timing attack)
5. Se nao bater, rejeite com 401
```

### Node.js / Express - Middleware de validacao

```javascript
const crypto = require('crypto');

function validateWebhookSignature(req, res, next) {
  const APP_SECRET = process.env.META_APP_SECRET;

  // CRITICO: raw body deve ser capturado ANTES do json parser
  // Configure o Express assim:
  // app.use(express.json({
  //   verify: (req, _res, buf) => { req.rawBody = buf; }
  // }));

  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    console.error('Missing X-Hub-Signature-256 header');
    return res.sendStatus(401);
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    console.error('Invalid webhook signature');
    return res.sendStatus(401);
  }

  next();
}

// Uso:
// app.post('/webhook', validateWebhookSignature, webhookHandler);
```

### Python / Flask - Decorator de validacao

```python
import hmac
import hashlib
from functools import wraps

def validate_webhook_signature(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        app_secret = os.environ.get('META_APP_SECRET')

        # CRITICO: raw body ANTES do JSON parsing
        raw_body = request.get_data()

        signature = request.headers.get('X-Hub-Signature-256', '')

        if not signature:
            print('Missing X-Hub-Signature-256 header')
            return 'Unauthorized', 401

        expected = 'sha256=' + hmac.new(
            app_secret.encode('utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            print('Invalid webhook signature')
            return 'Unauthorized', 401

        return f(*args, **kwargs)
    return decorated

# Uso:
# @app.route('/webhook', methods=['POST'])
# @validate_webhook_signature
# def receive_webhook():
#     ...
```

### Erro classico: usar body parseado

```javascript
// ERRADO - body ja foi parseado para JSON, altera o conteudo
const hmac = crypto.createHmac('sha256', secret)
  .update(JSON.stringify(req.body))  // NAO FACA ISSO
  .digest('hex');

// CORRETO - usar o raw body original
const hmac = crypto.createHmac('sha256', secret)
  .update(req.rawBody)  // Buffer original do request
  .digest('hex');
```

> **Por que falha:** `JSON.stringify(JSON.parse(raw))` pode produzir output diferente
> do raw original (espacamento, ordem de chaves, encoding de caracteres Unicode).
> A assinatura da Meta foi calculada sobre o raw body exato.

---

## 6. Desenvolvimento Local

Para testar webhooks localmente, voce precisa expor seu servidor local para a internet.
A ferramenta mais usada para isso e o **ngrok**.

### Instalacao e uso do ngrok

```bash
# Instalar (macOS)
brew install ngrok

# Instalar (Windows via Chocolatey)
choco install ngrok

# Instalar (Linux)
snap install ngrok

# Autenticar (necessario uma vez)
ngrok config add-authtoken SEU_AUTH_TOKEN

# Expor porta local 3000
ngrok http 3000
```

### Saida do ngrok

```
Session Status   online
Forwarding       https://a1b2c3d4.ngrok-free.app -> http://localhost:3000
```

### Configurar no Meta Developers

1. Copie a URL HTTPS do ngrok (ex: `https://a1b2c3d4.ngrok-free.app`)
2. No painel da Meta, atualize o Callback URL para: `https://a1b2c3d4.ngrok-free.app/webhook`
3. Salve e valide

> **ATENCAO:** A URL do ngrok muda a cada reinicio (no plano gratuito).
> Voce precisara atualizar no painel da Meta toda vez que reiniciar o ngrok.

### Debugging de payloads

```bash
# O painel web do ngrok mostra todos os requests
# Acesse: http://127.0.0.1:4040

# Alternativa: log detalhado no servidor
app.post('/webhook', (req, res) => {
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});
```

### Dicas para desenvolvimento local

- Use `ngrok http 3000 --log=stdout` para ver logs no terminal
- O Inspector web (`http://127.0.0.1:4040`) permite **replay** de requests
- Adicione um endpoint `/health` para verificar rapidamente se o servidor esta no ar
- Considere usar **localtunnel** como alternativa gratuita ao ngrok

---

## 7. Deploy em Producao

### Requisitos de certificado HTTPS

- Certificado SSL valido emitido por CA reconhecida
- **Let's Encrypt** e aceito e gratuito
- Certificados auto-assinados **NAO** sao aceitos
- Certifique-se de que a cadeia completa (chain) esta configurada
- Configure renovacao automatica (certbot renew via cron)

### Retry logic e idempotencia

A Meta reenvia eventos com backoff exponencial quando nao recebe HTTP 200:

| Tentativa | Intervalo aproximado |
|-----------|---------------------|
| 1a | Imediato |
| 2a | ~1 minuto |
| 3a | ~5 minutos |
| 4a | ~30 minutos |
| Seguintes | Backoff crescente ate 7 dias |

**Implemente idempotencia:**

```javascript
const processedMessages = new Set(); // Em producao, use Redis

function isNewMessage(messageId) {
  if (processedMessages.has(messageId)) {
    return false;
  }
  processedMessages.add(messageId);

  // Limpar mensagens antigas apos 24h (em producao, use TTL do Redis)
  setTimeout(() => processedMessages.delete(messageId), 86400000);
  return true;
}

// No handler:
if (!isNewMessage(message.id)) {
  console.log(`Duplicate message ${message.id}, skipping`);
  return;
}
```

### Scaling e capacidade

A Meta recomenda que o seu servidor suporte:

| Metrica | Recomendacao |
|---------|-------------|
| Capacidade de entrada | **3x** o volume de mensagens enviadas + **1x** mensagens recebidas |
| Tempo de resposta | < 5 segundos (idealmente < 1 segundo) |
| Disponibilidade | 99.9% uptime minimo |

**Arquitetura recomendada para alto volume:**

```
[Meta Webhook] --> [Load Balancer]
                        |
                   [Web Server]  --> Responde 200 imediatamente
                        |
                   [Message Queue] (Redis/SQS/RabbitMQ)
                        |
                   [Workers]  --> Processamento assincrono
```

### Monitoramento de saude do webhook

```javascript
// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Metricas essenciais para monitorar:
// - Taxa de erros 4xx/5xx no endpoint /webhook
// - Latencia media de resposta (deve ser < 1s)
// - Numero de mensagens duplicadas recebidas
// - Fila de processamento (tamanho e tempo medio)
// - Falhas de validacao HMAC (possivel ataque)
```

**Alertas recomendados:**

| Alerta | Threshold | Acao |
|--------|-----------|------|
| Latencia alta | > 3 segundos | Investigar gargalos, escalar workers |
| Taxa de erro | > 1% | Verificar logs, possivel bug no handler |
| Falha HMAC | > 0 por hora | Possivel ataque; verificar APP_SECRET |
| Fila crescendo | > 1000 mensagens | Escalar workers de processamento |
| Webhook desativado | Alerta da Meta | Verificar SSL e disponibilidade |

---

## Checklist Final

- [ ] Endpoint acessivel via HTTPS com certificado valido
- [ ] Verificacao GET retorna challenge como plain text
- [ ] Handler POST responde 200 em menos de 5 segundos
- [ ] Validacao HMAC-SHA256 implementada com raw body
- [ ] Comparacao constant-time (timingSafeEqual / compare_digest)
- [ ] Idempotencia para mensagens duplicadas
- [ ] Processamento assincrono para operacoes demoradas
- [ ] Monitoramento e alertas configurados
- [ ] APP_SECRET e VERIFY_TOKEN em variaveis de ambiente (nunca no codigo)
- [ ] Logs estruturados para debugging em producao
