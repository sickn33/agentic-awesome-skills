# Telegram Bot API - Referencia Completa

## Table of Contents
1. [Autenticacao](#autenticacao)
2. [Metodos de Envio](#envio)
3. [Metodos de Edicao](#edicao)
4. [Metodos de Chat](#chat)
5. [Metodos de Membro](#membros)
6. [Updates e Webhooks](#updates)
7. [Bot Config](#config)
8. [Tipos Principais](#tipos)
9. [Parse Modes](#parse-modes)
10. [Codigos de Erro](#erros)

---

## Autenticacao

**Base URL:** `https://api.telegram.org/bot<TOKEN>/<METHOD>`
**File URL:** `https://api.telegram.org/file/bot<TOKEN>/<file_path>`
**Metodos:** GET e POST

Formas de enviar parametros:
- Query string: `?chat_id=123&text=hello`
- JSON body: `Content-Type: application/json`
- Form data: `Content-Type: application/x-www-form-urlencoded`
- Multipart: `Content-Type: multipart/form-data` (obrigatorio para upload de arquivos)

---

## Metodos de Envio

| Metodo | Descricao | Parametros obrigatorios |
|--------|-----------|------------------------|
| `sendMessage` | Texto | `chat_id`, `text` |
| `sendPhoto` | Foto | `chat_id`, `photo` |
| `sendVideo` | Video | `chat_id`, `video` |
| `sendAnimation` | GIF | `chat_id`, `animation` |
| `sendAudio` | Audio/musica | `chat_id`, `audio` |
| `sendDocument` | Documento | `chat_id`, `document` |
| `sendVoice` | Mensagem de voz | `chat_id`, `voice` |
| `sendVideoNote` | Video circular | `chat_id`, `video_note` |
| `sendSticker` | Sticker | `chat_id`, `sticker` |
| `sendLocation` | Localizacao | `chat_id`, `latitude`, `longitude` |
| `sendVenue` | Local | `chat_id`, `latitude`, `longitude`, `title`, `address` |
| `sendContact` | Contato | `chat_id`, `phone_number`, `first_name` |
| `sendPoll` | Enquete | `chat_id`, `question`, `options` |
| `sendDice` | Dado animado | `chat_id` |
| `sendMediaGroup` | Grupo de midias | `chat_id`, `media` |
| `sendChatAction` | Acao de digitacao | `chat_id`, `action` |
| `sendInvoice` | Fatura/pagamento | `chat_id`, `title`, `description`, `payload`, `currency`, `prices` |

### Parametros comuns a todos os metodos de envio

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `chat_id` | Integer/String | ID do chat ou @username |
| `message_thread_id` | Integer | ID do topic (em forums) |
| `parse_mode` | String | `HTML`, `MarkdownV2`, `Markdown` |
| `reply_parameters` | Object | Para responder a uma mensagem |
| `reply_markup` | Object | InlineKeyboard ou ReplyKeyboard |
| `disable_notification` | Boolean | Enviar sem notificacao |
| `protect_content` | Boolean | Impedir encaminhamento |
| `effect_id` | String | Efeito visual na mensagem |

### sendChatAction - Acoes disponiveis

`typing`, `upload_photo`, `record_video`, `upload_video`, `record_voice`, `upload_voice`, `upload_document`, `find_location`, `record_video_note`, `upload_video_note`, `choose_sticker`

---

## Metodos de Edicao

| Metodo | Descricao |
|--------|-----------|
| `editMessageText` | Editar texto |
| `editMessageCaption` | Editar legenda |
| `editMessageMedia` | Editar midia |
| `editMessageReplyMarkup` | Editar botoes |
| `deleteMessage` | Deletar mensagem |
| `deleteMessages` | Deletar varias |
| `forwardMessage` | Encaminhar |
| `forwardMessages` | Encaminhar varias |
| `copyMessage` | Copiar (sem "encaminhado de") |
| `copyMessages` | Copiar varias |

---

## Metodos de Chat

| Metodo | Descricao |
|--------|-----------|
| `getChat` | Info completa do chat |
| `getChatMemberCount` | Qtd de membros |
| `getChatAdministrators` | Lista admins |
| `setChatTitle` | Alterar titulo |
| `setChatDescription` | Alterar descricao |
| `setChatPhoto` | Alterar foto |
| `deleteChatPhoto` | Remover foto |
| `setChatPermissions` | Permissoes padrao |
| `setChatStickerSet` | Set de stickers |
| `pinChatMessage` | Fixar mensagem |
| `unpinChatMessage` | Desfixar mensagem |
| `unpinAllChatMessages` | Desfixar todas |
| `leaveChat` | Sair do chat |
| `exportChatInviteLink` | Gerar link |
| `createChatInviteLink` | Criar link customizado |
| `editChatInviteLink` | Editar link |
| `revokeChatInviteLink` | Revogar link |

---

## Metodos de Membro

| Metodo | Descricao |
|--------|-----------|
| `getChatMember` | Info de membro |
| `banChatMember` | Banir |
| `unbanChatMember` | Desbanir |
| `restrictChatMember` | Restringir |
| `promoteChatMember` | Promover a admin |
| `setChatAdministratorCustomTitle` | Titulo custom |
| `approveChatJoinRequest` | Aprovar entrada |
| `declineChatJoinRequest` | Recusar entrada |

---

## Updates e Webhooks

| Metodo | Descricao |
|--------|-----------|
| `getUpdates` | Long polling |
| `setWebhook` | Registrar webhook |
| `deleteWebhook` | Remover webhook |
| `getWebhookInfo` | Status do webhook |

### Tipos de update

`message`, `edited_message`, `channel_post`, `edited_channel_post`, `inline_query`, `chosen_inline_result`, `callback_query`, `shipping_query`, `pre_checkout_query`, `poll`, `poll_answer`, `my_chat_member`, `chat_member`, `chat_join_request`, `message_reaction`, `message_reaction_count`

---

## Bot Config

| Metodo | Descricao |
|--------|-----------|
| `getMe` | Info do bot |
| `setMyCommands` | Definir comandos |
| `getMyCommands` | Listar comandos |
| `deleteMyCommands` | Remover comandos |
| `setMyName` | Alterar nome |
| `setMyDescription` | Alterar descricao |
| `setMyShortDescription` | Descricao curta |
| `setMyDefaultAdministratorRights` | Direitos padrao |
| `setChatMenuButton` | Botao do menu |
| `setMyProfilePhoto` | Foto de perfil |

---

## Tipos Principais

### Update
```json
{
  "update_id": 123,
  "message": { ... },
  "callback_query": { ... },
  "inline_query": { ... }
}
```

### Message
```json
{
  "message_id": 1,
  "from": { "id": 123, "first_name": "User" },
  "chat": { "id": 123, "type": "private" },
  "date": 1709000000,
  "text": "Hello",
  "entities": [{ "type": "bot_command", "offset": 0, "length": 6 }]
}
```

### CallbackQuery
```json
{
  "id": "query123",
  "from": { "id": 123 },
  "message": { ... },
  "data": "callback_data_string"
}
```

### InlineKeyboardMarkup
```json
{
  "inline_keyboard": [
    [{ "text": "Button", "callback_data": "data" }],
    [{ "text": "URL", "url": "https://example.com" }]
  ]
}
```

### ReplyKeyboardMarkup
```json
{
  "keyboard": [
    [{ "text": "Option 1" }, { "text": "Option 2" }],
    [{ "text": "Send Location", "request_location": true }]
  ],
  "resize_keyboard": true,
  "one_time_keyboard": true
}
```

---

## Parse Modes

### HTML
```html
<b>bold</b>
<i>italic</i>
<u>underline</u>
<s>strikethrough</s>
<tg-spoiler>spoiler</tg-spoiler>
<code>inline code</code>
<pre>preformatted</pre>
<pre><code class="language-python">python code</code></pre>
<a href="https://example.com">link</a>
<a href="tg://user?id=123">user mention</a>
<blockquote>quote</blockquote>
```

### MarkdownV2
```
*bold*
_italic_
__underline__
~strikethrough~
||spoiler||
`inline code`
```pre block```
```python
python code
```
[link](https://example\.com)
[user](tg://user?id=123)
>blockquote
```

**Caracteres a escapar no MarkdownV2:** `_ * [ ] ( ) ~ ` > # + - = | { } . !`

---

## Codigos de Erro

| Codigo | Descricao | Acao |
|--------|-----------|------|
| 400 | Bad Request - parametros invalidos | Verificar parametros |
| 401 | Unauthorized - token invalido | Verificar token |
| 403 | Forbidden - bot bloqueado | Usuario bloqueou o bot |
| 404 | Not Found - metodo invalido | Verificar nome do metodo |
| 409 | Conflict - webhook e polling | Usar apenas um metodo |
| 429 | Too Many Requests - rate limit | Esperar `retry_after` segundos |

### Mensagens de erro comuns

- `"chat not found"` - Chat ID invalido ou bot nao foi iniciado
- `"bot was blocked by the user"` - Usuario bloqueou o bot
- `"message to edit not found"` - Mensagem ja deletada
- `"query is too old"` - Callback query expirou (responder em ate 10s)
- `"message is not modified"` - Texto igual ao anterior
- `"BUTTON_DATA_INVALID"` - callback_data > 64 bytes
- `"have no rights to send a message"` - Bot sem permissao no grupo
