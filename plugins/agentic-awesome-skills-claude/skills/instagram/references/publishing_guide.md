# Guia de Publicação — Specs de Mídia e Fluxos

## Specs de Mídia

### Foto (IMAGE)
| Propriedade | Requisito |
|-------------|-----------|
| Formato | JPEG (obrigatório — PNG/WebP são convertidos automaticamente pelo publish.py via Pillow) |
| Resolução mínima | 320 x 320 px |
| Resolução máxima | 1080 x 1350 px (recomendado) |
| Aspect ratio | 4:5 (portrait) a 1.91:1 (landscape) |
| Tamanho máximo | 8 MB |
| Color space | sRGB |

### Vídeo (VIDEO)
| Propriedade | Requisito |
|-------------|-----------|
| Formato | MP4 (H.264 codec) |
| Resolução mínima | 640 x 640 px |
| Resolução máxima | 1920 x 1080 px |
| Duração | 3 segundos a 60 minutos |
| Tamanho máximo | 250 MB (recomendado < 100 MB) |
| Frame rate | 23-60 fps |
| Audio | AAC, 48kHz sample rate |

### Reel (REELS)
| Propriedade | Requisito |
|-------------|-----------|
| Formato | MP4 (H.264 codec) |
| Aspect ratio | 9:16 (vertical, obrigatório) |
| Resolução recomendada | 1080 x 1920 px |
| Duração | 3 segundos a 15 minutos |
| Tamanho máximo | 250 MB |
| Audio | Obrigatório (pode ser mudo, mas track precisa existir) |

### Story (STORIES)
| Propriedade | Requisito |
|-------------|-----------|
| Formato foto | JPEG |
| Formato vídeo | MP4 |
| Aspect ratio | 9:16 (1080 x 1920 px recomendado) |
| Duração vídeo | Até 60 segundos |
| Desaparece | Após 24 horas |

### Carrossel (CAROUSEL_ALBUM)
| Propriedade | Requisito |
|-------------|-----------|
| Itens | 2 a 10 imagens/vídeos |
| Tipos permitidos | Mix de fotos e vídeos |
| Cada item segue specs | De IMAGE ou VIDEO acima |
| Aspect ratio | Todos os itens devem ter o mesmo aspect ratio |

## Fluxo de Publicação (2-Step)

### Fluxo Completo para Foto

```
1. Upload local → Imgur (se path local)
   POST https://api.imgur.com/3/image
   → Retorna URL pública

2. Criar Container
   POST /{user-id}/media
     image_url=<URL_publica>
     caption=<texto>
   → Retorna container_id

3. Publicar Container
   POST /{user-id}/media_publish
     creation_id=<container_id>
   → Retorna ig_media_id + permalink
```

### Fluxo Completo para Vídeo/Reel

```
1. Upload local → Imgur (se path local)

2. Criar Container
   POST /{user-id}/media
     video_url=<URL_publica>
     caption=<texto>
     media_type=VIDEO (ou REELS)
   → Retorna container_id

3. Aguardar Processamento (POLL)
   GET /{container_id}?fields=status_code
   Repetir a cada 10s até status = FINISHED
   (Timeout: 5 minutos)

4. Publicar Container
   POST /{user-id}/media_publish
     creation_id=<container_id>
   → Retorna ig_media_id
```

### Fluxo Completo para Carrossel

```
1. Para cada item (2-10):
   POST /{user-id}/media
     image_url=<URL> (ou video_url)
     is_carousel_item=true
   → Retorna item_container_id

2. Criar Container do Carrossel
   POST /{user-id}/media
     media_type=CAROUSEL
     children=[item1_id, item2_id, ...]
     caption=<texto>
   → Retorna carousel_container_id

3. Publicar
   POST /{user-id}/media_publish
     creation_id=<carousel_container_id>
   → Retorna ig_media_id
```

## Pipeline de Status (publish.py)

```
draft → approved → scheduled → container_created → published
                                      ↓
                                    failed
```

| Status | Significado | Próxima ação |
|--------|-------------|--------------|
| `draft` | Rascunho, não será publicado automaticamente | `--approve --id X` |
| `approved` | Aprovado para publicação | `schedule.py --process` |
| `scheduled` | Agendado para data futura | Aguardar horário |
| `container_created` | Container criado na API, aguardando publish | Recovery automático |
| `published` | Publicado com sucesso | Concluído |
| `failed` | Erro na publicação | Verificar error_msg, retry possível |

## Recovery de Crash

Se o processo crashar entre `container_created` e `published`:
1. O `schedule.py --process` detecta posts com status `container_created`
2. Verifica se o container ainda é válido via API
3. Se válido → publica
4. Se inválido → recria container e republica

## Upload Local via Imgur

O `publish.py` detecta se o caminho é local (não começa com http):

1. Lê o arquivo local
2. Converte para JPEG se necessário (via Pillow)
3. Faz upload anônimo para Imgur (POST https://api.imgur.com/3/image)
4. Usa a URL retornada como `image_url` na Graph API

**Configuração:** `IMGUR_CLIENT_ID` em config.py ou variável de ambiente.

## Captions e Hashtags

### Limites
- Caption: máximo 2.200 caracteres
- Hashtags: máximo 30 por post
- Menções (@): sem limite oficial

### Templates (via templates.py)
```python
caption_template = "Nova promoção: {produto}! {desconto}% OFF"
# Com variáveis: produto="Tênis", desconto=30
# Resultado: "Nova promoção: Tênis! 30% OFF"
```

### Hashtags em Templates
Hashtags são armazenadas como JSON array e adicionadas ao final da caption:
```
Caption renderizada + "\n\n" + " ".join(hashtags)
```
