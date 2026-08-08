# Gerenciamento de Chats - Telegram Bot

## Table of Contents
1. [Tipos de Chat](#tipos-de-chat)
2. [Informacoes do Chat](#informacoes)
3. [Gerenciamento de Membros](#membros)
4. [Moderacao](#moderacao)
5. [Configuracoes do Chat](#configuracoes)
6. [Convites](#convites)
7. [Canais](#canais)
8. [Forum Topics](#forum)

---

## Tipos de Chat

| Tipo | `chat.type` | Caracteristicas |
|------|-------------|-----------------|
| Privado | `private` | 1:1 com usuario |
| Grupo | `group` | Ate 200 membros, basico |
| Supergrupo | `supergroup` | Ate 200k membros, historico persistente |
| Canal | `channel` | Broadcast, membros ilimitados |

---

## Informacoes do Chat

```python
# Obter informacoes completas
chat = await bot.get_chat(chat_id)
print(f"Titulo: {chat.title}")
print(f"Tipo: {chat.type}")
print(f"Membros: {await bot.get_chat_member_count(chat_id)}")
print(f"Descricao: {chat.description}")

# Obter membro especifico
member = await bot.get_chat_member(chat_id, user_id)
print(f"Status: {member.status}")  # creator, administrator, member, restricted, left, kicked

# Listar administradores
admins = await bot.get_chat_administrators(chat_id)
for admin in admins:
    print(f"{admin.user.first_name}: {admin.status}")
```

---

## Gerenciamento de Membros

```python
# Banir membro (remove do grupo)
await bot.ban_chat_member(chat_id, user_id)

# Banir temporario (volta apos until_date)
from datetime import datetime, timedelta
until = datetime.now() + timedelta(hours=24)
await bot.ban_chat_member(chat_id, user_id, until_date=until)

# Desbanir
await bot.unban_chat_member(chat_id, user_id, only_if_banned=True)

# Restringir permissoes
from telegram import ChatPermissions
await bot.restrict_chat_member(
    chat_id, user_id,
    permissions=ChatPermissions(
        can_send_messages=True,
        can_send_photos=False,
        can_send_videos=False,
        can_send_other_messages=False,
        can_add_web_page_previews=False,
        can_invite_users=False
    ),
    until_date=until  # opcional: restricao temporaria
)

# Promover a administrador
await bot.promote_chat_member(
    chat_id, user_id,
    can_manage_chat=True,
    can_delete_messages=True,
    can_restrict_members=True,
    can_invite_users=True,
    can_pin_messages=True,
    can_manage_video_chats=True
)

# Titulo customizado para admin
await bot.set_chat_administrator_custom_title(chat_id, user_id, "Moderador")
```

---

## Moderacao

### Bot de moderacao automatica

```python
from telegram import Update, ChatPermissions
from telegram.ext import MessageHandler, filters, ContextTypes

# Lista de palavras proibidas
BANNED_WORDS = ["spam", "proibido", "blocked"]

async def moderate(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    if not msg or not msg.text:
        return

    text_lower = msg.text.lower()

    # Verificar palavras proibidas
    for word in BANNED_WORDS:
        if word in text_lower:
            await msg.delete()
            await context.bot.restrict_chat_member(
                msg.chat.id, msg.from_user.id,
                permissions=ChatPermissions(can_send_messages=False),
                until_date=datetime.now() + timedelta(minutes=5)
            )
            await context.bot.send_message(
                msg.chat.id,
                f"Mensagem de {msg.from_user.first_name} removida por conteudo proibido. "
                f"Silenciado por 5 minutos."
            )
            return

    # Anti-flood: max 5 msgs em 10 segundos
    user_key = f"flood_{msg.from_user.id}"
    msgs = context.bot_data.get(user_key, [])
    now = datetime.now().timestamp()
    msgs = [t for t in msgs if now - t < 10]  # ultimos 10 segundos
    msgs.append(now)
    context.bot_data[user_key] = msgs

    if len(msgs) > 5:
        await msg.delete()
        await context.bot.send_message(
            msg.chat.id,
            f"{msg.from_user.first_name}, por favor nao envie tantas mensagens seguidas."
        )

app.add_handler(MessageHandler(filters.TEXT & filters.ChatType.GROUPS, moderate))
```

### Boas-vindas automaticas

```python
async def welcome(update: Update, context: ContextTypes.DEFAULT_TYPE):
    for member in update.message.new_chat_members:
        if member.is_bot:
            continue
        await update.message.reply_text(
            f"Bem-vindo(a), {member.first_name}! "
            f"Leia as regras com /regras antes de participar."
        )

app.add_handler(MessageHandler(filters.StatusUpdate.NEW_CHAT_MEMBERS, welcome))
```

---

## Configuracoes do Chat

```python
# Alterar titulo
await bot.set_chat_title(chat_id, "Novo Titulo do Grupo")

# Alterar descricao
await bot.set_chat_description(chat_id, "Descricao atualizada do grupo")

# Alterar foto
with open("grupo_foto.jpg", "rb") as photo:
    await bot.set_chat_photo(chat_id, photo)

# Fixar mensagem
await bot.pin_chat_message(chat_id, message_id, disable_notification=True)

# Desfixar
await bot.unpin_chat_message(chat_id, message_id)

# Desfixar todas
await bot.unpin_all_chat_messages(chat_id)

# Definir permissoes padrao
await bot.set_chat_permissions(chat_id, ChatPermissions(
    can_send_messages=True,
    can_send_photos=True,
    can_send_videos=True,
    can_send_other_messages=True,
    can_add_web_page_previews=True,
    can_invite_users=True
))
```

---

## Convites

```python
# Gerar link de convite padrao
link = await bot.export_chat_invite_link(chat_id)

# Criar link customizado
invite = await bot.create_chat_invite_link(
    chat_id,
    name="Link da Campanha Janeiro",
    expire_date=datetime(2026, 2, 28),
    member_limit=100,
    creates_join_request=False  # True = requer aprovacao
)
print(f"Link: {invite.invite_link}")

# Editar link
await bot.edit_chat_invite_link(
    chat_id,
    invite.invite_link,
    name="Link Atualizado",
    member_limit=200
)

# Revogar link
await bot.revoke_chat_invite_link(chat_id, invite.invite_link)

# Aprovar pedido de entrada
async def handle_join_request(update: Update, context: ContextTypes.DEFAULT_TYPE):
    request = update.chat_join_request
    # Auto-aprovar (ou implementar logica customizada)
    await request.approve()
    await context.bot.send_message(
        request.from_user.id,
        f"Bem-vindo ao grupo {request.chat.title}!"
    )

app.add_handler(ChatJoinRequestHandler(handle_join_request))
```

---

## Canais

Bots em canais podem postar, editar e deletar mensagens:

```python
# Postar em canal (use o @username ou chat_id)
await bot.send_message("@meu_canal", "Post no canal!")

# Postar com botoes
from telegram import InlineKeyboardButton, InlineKeyboardMarkup
keyboard = InlineKeyboardMarkup([
    [InlineKeyboardButton("Leia mais", url="https://example.com")]
])
await bot.send_message("@meu_canal", "Novo artigo!", reply_markup=keyboard)

# Editar post do canal
await bot.edit_message_text(
    "Texto atualizado",
    chat_id="@meu_canal",
    message_id=123
)

# Encaminhar do canal para grupo
await bot.forward_message(
    chat_id=group_id,
    from_chat_id="@meu_canal",
    message_id=123
)
```

---

## Forum Topics

Supergrupos com topics habilitados (tipo forum):

```python
# Criar topic
topic = await bot.create_forum_topic(
    chat_id, name="Duvidas Gerais",
    icon_color=0x6FB9F0  # Azul
)

# Enviar mensagem em topic especifico
await bot.send_message(
    chat_id, "Mensagem no topic",
    message_thread_id=topic.message_thread_id
)

# Fechar topic
await bot.close_forum_topic(chat_id, topic.message_thread_id)

# Reabrir topic
await bot.reopen_forum_topic(chat_id, topic.message_thread_id)

# Editar topic
await bot.edit_forum_topic(
    chat_id, topic.message_thread_id,
    name="Duvidas Tecnicas"
)

# Deletar topic
await bot.delete_forum_topic(chat_id, topic.message_thread_id)
```
