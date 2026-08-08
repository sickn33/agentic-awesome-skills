# Instagram Graph API — Referência de Endpoints

Base URL: `https://graph.instagram.com/v21.0`

## Índice

1. [Perfil do Usuário](#perfil-do-usuário)
2. [Mídia](#mídia)
3. [Publicação (2-Step)](#publicação)
4. [Comentários](#comentários)
5. [Insights de Mídia](#insights-de-mídia)
6. [Insights do Usuário](#insights-do-usuário)
7. [Hashtags](#hashtags)
8. [Mensagens (DMs)](#mensagens)
9. [Menções](#menções)
10. [Erros Comuns](#erros-comuns)

---

## Perfil do Usuário

### GET /{user-id}

Retorna informações do perfil.

**Campos disponíveis:**
- `id`, `username`, `name`, `account_type`
- `biography`, `followers_count`, `follows_count`, `media_count`
- `profile_picture_url`, `website`

**Exemplo:**
```
GET /me?fields=id,username,name,account_type,biography,followers_count,follows_count,media_count&access_token=TOKEN
```

**Resposta:**
```json
{
  "id": "17841400000000",
  "username": "minha_conta",
  "name": "Meu Nome",
  "account_type": "BUSINESS",
  "biography": "Bio aqui",
  "followers_count": 1500,
  "follows_count": 200,
  "media_count": 45
}
```

---

## Mídia

### GET /{user-id}/media

Lista mídia publicada pelo usuário.

**Parâmetros:**
- `fields`: id, caption, media_type, media_url, permalink, timestamp, thumbnail_url
- `limit`: 1-100 (default 25)
- `after`/`before`: cursor de paginação

**Media types:** IMAGE, VIDEO, CAROUSEL_ALBUM

### GET /{media-id}

Detalhes de uma mídia específica.

**Campos adicionais:** `like_count`, `comments_count`, `is_shared_to_feed`

### GET /{media-id}/children

Para CAROUSEL_ALBUM — retorna itens do carrossel.

---

## Publicação

### Processo de 2 Etapas

**Etapa 1 — Criar Container:**

```
POST /{user-id}/media
```

| Tipo | Parâmetros obrigatórios |
|------|------------------------|
| Foto | `image_url`, `caption` (opcional) |
| Vídeo | `video_url`, `caption`, `media_type=VIDEO` |
| Reel | `video_url`, `caption`, `media_type=REELS` |
| Story (foto) | `image_url`, `media_type=STORIES` |
| Story (vídeo) | `video_url`, `media_type=STORIES` |
| Carousel item | `image_url` ou `video_url`, `is_carousel_item=true` |
| Carousel container | `media_type=CAROUSEL`, `children=[id1,id2,...]`, `caption` |

**Resposta:** `{"id": "container_id"}`

**Etapa 1.5 — Verificar Status (vídeos):**

```
GET /{container-id}?fields=status_code
```

Status: `IN_PROGRESS`, `FINISHED`, `ERROR`

Aguardar até `FINISHED` antes de publicar. Poll a cada 5-10s.

**Etapa 2 — Publicar:**

```
POST /{user-id}/media_publish
  creation_id={container_id}
```

**Resposta:** `{"id": "ig_media_id"}`

### Agendamento via API

```
POST /{user-id}/media
  image_url=URL
  caption=texto
  published=false
  scheduled_publish_time=UNIX_TIMESTAMP
```

- Timestamp deve ser entre 10 min e 75 dias no futuro
- Apenas contas Business (Creator não suporta scheduling nativo)

---

## Comentários

### GET /{media-id}/comments

Lista comentários de uma mídia.

**Campos:** `id`, `text`, `username`, `timestamp`, `like_count`
**Parâmetros:** `limit` (max 50), paginação com cursors

### POST /{media-id}/comments

Responder no post (novo comentário de primeiro nível).

**Body:** `message=texto`

### POST /{comment-id}/replies

Responder a um comentário específico.

**Body:** `message=texto`

### DELETE /{comment-id}

Deleta um comentário (apenas comentários na sua mídia ou seus próprios).

### POST /{comment-id}

Ocultar/mostrar comentário.

**Body:** `hide=true` ou `hide=false`

---

## Insights de Mídia

### GET /{media-id}/insights

**Métricas para IMAGE/CAROUSEL:**
- `impressions` — Vezes que a mídia foi exibida
- `reach` — Contas únicas que viram
- `engagement` — Likes + comments + saves
- `saved` — Vezes que foi salva

**Métricas adicionais para VIDEO/REELS:**
- `video_views` — Visualizações do vídeo
- `plays` — Vezes que o reel foi reproduzido

**Parâmetros:**
```
metric=impressions,reach,engagement,saved
```

**Resposta:**
```json
{
  "data": [
    {
      "name": "impressions",
      "period": "lifetime",
      "values": [{"value": 250}],
      "title": "Impressions"
    }
  ]
}
```

---

## Insights do Usuário

### GET /{user-id}/insights

Métricas agregadas da conta.

**Métricas por período `day`:**
- `impressions` — Total de impressões
- `reach` — Contas únicas alcançadas
- `follower_count` — Total de seguidores (só `day`)
- `profile_views` — Visualizações do perfil

**Métricas por período `week` / `days_28`:**
- `impressions`, `reach`

**Parâmetros:**
```
metric=impressions,reach,follower_count,profile_views
period=day
since=UNIX_TIMESTAMP
until=UNIX_TIMESTAMP
```

**Limite:** máximo 30 dias por request. `since` e `until` devem ser alinhados ao fuso.

---

## Hashtags

### GET /ig_hashtag_search

Busca o ID de uma hashtag.

**Parâmetros:**
- `user_id`: ID da conta
- `q`: nome da hashtag (sem #)

**Resposta:** `{"data": [{"id": "17843853986012965"}]}`

**Limite:** 30 hashtags únicas por conta por semana (janela de 7 dias rolling).

### GET /{hashtag-id}/recent_media

Posts recentes com a hashtag.

**Campos:** `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`
**Parâmetros:** `user_id` (obrigatório), `fields`, `limit`

### GET /{hashtag-id}/top_media

Top posts (ordenados por popularidade).

Mesmos campos e parâmetros que `recent_media`.

---

## Mensagens

### GET /{user-id}/conversations

Lista conversas do Instagram Messaging.

**Campos:** `id`, `participants`, `updated_time`
**Requer:** scope `instagram_manage_messages`

### GET /{conversation-id}/messages

Mensagens de uma conversa.

**Campos:** `id`, `message`, `from`, `created_time`

### POST /me/messages

Enviar mensagem.

**Body:**
```json
{
  "recipient": {"id": "user_ig_scoped_id"},
  "message": {"text": "Olá!"}
}
```

**Restrições:**
- Apenas responder a conversas existentes (dentro de janela de 24hrs)
- Ou usar Message Templates aprovados (requer aprovação Meta)

---

## Menções

### GET /{user-id}/tags

Mídias em que o usuário foi mencionado/tagueado.

**Campos:** `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`, `username`

---

## Erros Comuns

| Código | Subcódigo | Significado | Ação |
|--------|-----------|-------------|------|
| 4 | - | Rate limit atingido | Backoff 1 hora |
| 10 | - | Permissão negada | Verificar scopes |
| 17 | - | Rate limit da conta | Esperar período indicado |
| 24 | - | Webhook inválido | Verificar URL/certificado |
| 100 | - | Parâmetro inválido | Verificar request |
| 190 | - | Token expirado/inválido | Refresh token |
| 200 | - | Permissão insuficiente | Verificar app review |
| 368 | - | Conteúdo bloqueado | Política de conteúdo |

**Formato de erro padrão:**
```json
{
  "error": {
    "message": "Descrição do erro",
    "type": "OAuthException",
    "code": 190,
    "fbtrace_id": "AbCdEfG"
  }
}
```
