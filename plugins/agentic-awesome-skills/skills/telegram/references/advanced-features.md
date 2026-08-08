# Recursos Avancados - Telegram Bot

## Table of Contents
1. [Inline Mode](#inline-mode)
2. [Pagamentos (Telegram Stars)](#pagamentos)
3. [Mini Apps (WebApps)](#mini-apps)
4. [Conversation Handlers (FSM)](#conversation-handlers)
5. [Stickers](#stickers)
6. [Games](#games)
7. [Passport](#passport)
8. [Business Bots](#business-bots)
9. [Message Drafts (Streaming)](#streaming)

---

## Inline Mode

Permite que usuarios usem o bot em qualquer chat digitando `@seubot consulta`.

**Habilitar:** Fale com @BotFather e envie `/setinline`.

```python
from telegram import Update, InlineQueryResultArticle, InputTextMessageContent
from telegram.ext import InlineQueryHandler

async def inline_query(update: Update, context):
    query = update.inline_query.query
    if not query:
        return

    results = [
        InlineQueryResultArticle(
            id="1",
            title=f"Resultado para: {query}",
            input_message_content=InputTextMessageContent(
                message_text=f"Voce buscou: {query}"
            ),
            description="Clique para enviar"
        ),
        InlineQueryResultArticle(
            id="2",
            title="Busca em maiusculas",
            input_message_content=InputTextMessageContent(
                message_text=query.upper()
            )
        )
    ]

    await update.inline_query.answer(results, cache_time=10)

app.add_handler(InlineQueryHandler(inline_query))
```

### Tipos de resultado inline

- `InlineQueryResultArticle` - texto generico
- `InlineQueryResultPhoto` - foto com preview
- `InlineQueryResultGif` - GIF
- `InlineQueryResultVideo` - video
- `InlineQueryResultAudio` - audio
- `InlineQueryResultDocument` - documento
- `InlineQueryResultLocation` - localizacao
- `InlineQueryResultVenue` - local/estabelecimento
- `InlineQueryResultContact` - contato
- `InlineQueryResultCachedPhoto` - foto ja no servidor Telegram

---

## Pagamentos (Telegram Stars)

Telegram permite pagamentos via Stars (moeda interna) para bens digitais.

```python
from telegram import LabeledPrice

# Enviar invoice
await bot.send_invoice(
    chat_id=chat_id,
    title="Assinatura Premium",
    description="Acesso premium por 30 dias",
    payload="premium_30days",
    currency="XTR",  # XTR = Telegram Stars
    prices=[LabeledPrice("Assinatura Premium", 100)],  # 100 Stars
)

# Handler de pre-checkout
async def precheckout(update: Update, context):
    query = update.pre_checkout_query
    if query.invoice_payload == "premium_30days":
        await query.answer(ok=True)
    else:
        await query.answer(ok=False, error_message="Payload invalido")

# Handler de pagamento concluido
async def successful_payment(update: Update, context):
    payment = update.message.successful_payment
    await update.message.reply_text(
        f"Pagamento recebido! {payment.total_amount} Stars. "
        f"Seu acesso premium foi ativado."
    )

app.add_handler(PreCheckoutQueryHandler(precheckout))
app.add_handler(MessageHandler(filters.SUCCESSFUL_PAYMENT, successful_payment))
```

### Provedores de pagamento externos

Para bens fisicos, use provedores como Stripe, YooMoney, etc:

```python
await bot.send_invoice(
    chat_id=chat_id,
    title="Camiseta Bot Telegram",
    description="Camiseta tamanho M, algodao",
    payload="tshirt_m",
    provider_token="SEU_PROVIDER_TOKEN",  # do BotFather
    currency="BRL",
    prices=[
        LabeledPrice("Camiseta", 5990),  # R$ 59.90 (em centavos)
        LabeledPrice("Frete", 1500)       # R$ 15.00
    ],
    need_shipping_address=True,
    need_name=True,
    need_phone_number=True
)
```

---

## Mini Apps (WebApps)

Mini Apps sao aplicacoes web que rodam dentro do Telegram.

```python
from telegram import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup

# Botao que abre Mini App
keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton(
        "Abrir App",
        web_app=WebAppInfo(url="https://seu-app.com")
    )]
])
await bot.send_message(chat_id, "Clique para abrir:", reply_markup=keyboard)

# Via Reply Keyboard
from telegram import ReplyKeyboardMarkup, KeyboardButton
keyboard = ReplyKeyboardMarkup([
    [KeyboardButton("Abrir App", web_app=WebAppInfo(url="https://seu-app.com"))]
])
```

### Receber dados do Mini App

```python
async def web_app_data(update: Update, context):
    data = update.effective_message.web_app_data.data
    # data e uma string JSON enviada pelo Mini App
    import json
    parsed = json.loads(data)
    await update.message.reply_text(f"Recebi do app: {parsed}")

app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, web_app_data))
```

---

## Conversation Handlers (FSM)

Para dialogos multi-passo (formularios, wizards):

```python
from telegram.ext import ConversationHandler, CommandHandler, MessageHandler, filters

# Estados
NAME, AGE, CONFIRM = range(3)

async def start_form(update: Update, context):
    await update.message.reply_text("Qual seu nome?")
    return NAME

async def get_name(update: Update, context):
    context.user_data['name'] = update.message.text
    await update.message.reply_text("Qual sua idade?")
    return AGE

async def get_age(update: Update, context):
    context.user_data['age'] = update.message.text
    name = context.user_data['name']
    age = context.user_data['age']
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("Confirmar", callback_data="confirm"),
         InlineKeyboardButton("Cancelar", callback_data="cancel")]
    ])
    await update.message.reply_text(
        f"Nome: {name}\nIdade: {age}\n\nConfirma?",
        reply_markup=keyboard
    )
    return CONFIRM

async def confirm(update: Update, context):
    query = update.callback_query
    await query.answer()
    if query.data == "confirm":
        await query.edit_message_text("Cadastro realizado com sucesso!")
    else:
        await query.edit_message_text("Cadastro cancelado.")
    return ConversationHandler.END

async def cancel(update: Update, context):
    await update.message.reply_text("Operacao cancelada.")
    return ConversationHandler.END

conv_handler = ConversationHandler(
    entry_points=[CommandHandler('cadastro', start_form)],
    states={
        NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_name)],
        AGE: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_age)],
        CONFIRM: [CallbackQueryHandler(confirm)],
    },
    fallbacks=[CommandHandler('cancel', cancel)],
    conversation_timeout=300  # 5 minutos timeout
)
app.add_handler(conv_handler)
```

---

## Stickers

```python
# Enviar sticker por file_id
await bot.send_sticker(chat_id, sticker="CAACAgIAAxkBAAI...")

# Obter sticker set
sticker_set = await bot.get_sticker_set("set_name")
for sticker in sticker_set.stickers:
    print(f"Emoji: {sticker.emoji}, ID: {sticker.file_id}")

# Criar sticker set (requer imagem 512x512 PNG/WEBP)
await bot.create_new_sticker_set(
    user_id=user_id,
    name="meupack_by_meubot",
    title="Meu Sticker Pack",
    stickers=[InputSticker(
        sticker=open("sticker.webp", "rb"),
        emoji_list=["😀"],
        format="static"
    )]
)

# Adicionar sticker ao set
await bot.add_sticker_to_set(
    user_id=user_id,
    name="meupack_by_meubot",
    sticker=InputSticker(
        sticker=open("sticker2.webp", "rb"),
        emoji_list=["😎"],
        format="static"
    )
)
```

---

## Games

```python
# Enviar jogo (precisa registrar no BotFather com /newgame)
await bot.send_game(chat_id, game_short_name="meu_jogo")

# Handler de callback para jogo
async def game_callback(update: Update, context):
    query = update.callback_query
    await query.answer(url="https://seu-jogo.com/?user_id=" + str(query.from_user.id))

# Salvar score
await bot.set_game_score(
    user_id=user_id,
    score=150,
    chat_id=chat_id,
    message_id=game_message_id
)

# Obter high scores
scores = await bot.get_game_high_scores(
    user_id=user_id,
    chat_id=chat_id,
    message_id=game_message_id
)
```

---

## Business Bots

Bots para contas Business do Telegram:

```python
# Receber conexao business
async def business_connection(update: Update, context):
    conn = update.business_connection
    if conn.is_enabled:
        print(f"Bot conectado ao business de {conn.user.first_name}")
    else:
        print(f"Bot desconectado do business de {conn.user.first_name}")

# Receber mensagens business
async def business_message(update: Update, context):
    msg = update.business_message
    # Responder em nome do business
    await context.bot.send_message(
        chat_id=msg.chat.id,
        text="Obrigado pela mensagem! Responderemos em breve.",
        business_connection_id=msg.business_connection_id
    )

app.add_handler(BusinessConnectionHandler(business_connection))
app.add_handler(BusinessMessagesHandler(business_message))
```

---

## Message Drafts (Streaming)

Para respostas longas (como de IA), use drafts para dar feedback em tempo real:

```python
import requests

TOKEN = "SEU_TOKEN"
BASE = f"https://api.telegram.org/bot{TOKEN}"

def stream_response(chat_id, full_text):
    """Simula streaming enviando drafts parciais."""
    words = full_text.split()
    partial = ""

    # Enviar draft inicial
    for i, word in enumerate(words):
        partial += word + " "
        if i % 5 == 0:  # Atualizar a cada 5 palavras
            requests.post(f"{BASE}/sendMessageDraft", json={
                "chat_id": chat_id,
                "text": partial.strip() + "..."
            })

    # Enviar mensagem final
    requests.post(f"{BASE}/sendMessage", json={
        "chat_id": chat_id,
        "text": full_text
    })
```

**Nota:** `sendMessageDraft` e um metodo recente. Verifique disponibilidade na versao da API que esta usando.
