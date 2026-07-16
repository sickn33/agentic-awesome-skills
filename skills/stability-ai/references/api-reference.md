# API Reference — Stability AI v2beta

## Indice

1. [Autenticacao](#autenticacao)
2. [Endpoints de Geracao](#endpoints-de-geracao)
3. [Endpoints de Edicao](#endpoints-de-edicao)
4. [Endpoints de Upscale](#endpoints-de-upscale)
5. [Parametros Comuns](#parametros-comuns)
6. [Respostas](#respostas)
7. [Erros](#erros)

---

## Autenticacao

Todas as requests usam header `Authorization`:

```
Authorization: Bearer sk-sua-chave-aqui
```

Base URL: `https://api.stability.ai/v2beta`

Formato: Todas as requests usam `multipart/form-data` (nao JSON).

## Endpoints de Geracao

### POST /stable-image/generate/sd3

Gera imagens com Stable Diffusion 3.5.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `prompt` | string | Sim | Prompt de texto (max 10000 chars) |
| `model` | string | Nao | `sd3.5-large` (default), `sd3.5-large-turbo`, `sd3.5-medium` |
| `aspect_ratio` | string | Nao | Ratio como `1:1`, `16:9`, etc. Default: `1:1` |
| `negative_prompt` | string | Nao | O que evitar na geracao |
| `seed` | int | Nao | Seed para reproducibilidade (0 a 4294967294) |
| `output_format` | string | Nao | `png` (default), `jpeg`, `webp` |
| `image` | file | Nao | Imagem base para img2img |
| `strength` | float | Nao | Forca da transformacao img2img (0.0-1.0, default 0.7) |
| `mode` | string | Nao | `text-to-image` (default) ou `image-to-image` |

**Modelos disponiveis:**
- `sd3.5-large` — Melhor qualidade geral (recomendado)
- `sd3.5-large-turbo` — Rapido, menos passos
- `sd3.5-medium` — Balanco velocidade/qualidade

### POST /stable-image/generate/ultra

Geracao premium com maxima qualidade.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `prompt` | string | Sim | Prompt de texto |
| `aspect_ratio` | string | Nao | Default: `1:1` |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed para reproducibilidade |
| `output_format` | string | Nao | `png`, `jpeg`, `webp` |

Nao aceita `model` (modelo fixo Ultra).

### POST /stable-image/generate/core

Geracao rapida e eficiente.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `prompt` | string | Sim | Prompt de texto |
| `aspect_ratio` | string | Nao | Default: `1:1` |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed para reproducibilidade |
| `output_format` | string | Nao | `png`, `jpeg`, `webp` |
| `style_preset` | string | Nao | Preset de estilo (ex: `cinematic`) |

## Endpoints de Edicao

### POST /stable-image/edit/inpaint

Edita parte de uma imagem usando mascara.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem original |
| `prompt` | string | Sim | O que gerar na area mascarada |
| `mask` | file | Nao | Mascara (branco = area a editar) |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |

Se `mask` nao for enviada, o modelo tenta inferir automaticamente.

### POST /stable-image/edit/search-and-replace

Encontra e substitui objetos na imagem.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem original |
| `prompt` | string | Sim | O que colocar no lugar |
| `search_prompt` | string | Sim | O que procurar/substituir |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |

### POST /stable-image/edit/erase

Apaga parte de uma imagem (preenche com contexto).

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem original |
| `mask` | file | Nao | Mascara da area a apagar |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |

### POST /stable-image/edit/outpaint

Expande a imagem alem das bordas originais.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem original |
| `prompt` | string | Nao | Descricao do conteudo a gerar |
| `left` | int | Nao | Pixels a expandir para esquerda (0-2000) |
| `right` | int | Nao | Pixels a expandir para direita (0-2000) |
| `up` | int | Nao | Pixels a expandir para cima (0-2000) |
| `down` | int | Nao | Pixels a expandir para baixo (0-2000) |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |

Pelo menos uma direcao deve ser > 0.

### POST /stable-image/edit/remove-background

Remove o fundo da imagem.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem para remover fundo |
| `output_format` | string | Nao | `png` (com transparencia) |

Retorna imagem com fundo transparente (PNG).

## Endpoints de Upscale

### POST /stable-image/upscale/conservative

Aumenta resolucao mantendo fidelidade maxima ao original.

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem para upscale |
| `prompt` | string | Sim | Descricao da imagem |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |
| `creativity` | float | Nao | Nivel de liberdade criativa (0.2-0.5) |

### POST /stable-image/upscale/creative

Aumenta resolucao adicionando detalhes criativamente.

Fluxo em 2 etapas:
1. POST para iniciar — retorna `generation_id`
2. GET para buscar resultado (pode demorar)

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `image` | file | Sim | Imagem para upscale |
| `prompt` | string | Sim | Descricao da imagem |
| `negative_prompt` | string | Nao | O que evitar |
| `seed` | int | Nao | Seed |
| `output_format` | string | Nao | Formato de saida |
| `creativity` | float | Nao | Nivel de liberdade criativa (0.2-0.5) |

## Parametros Comuns

### aspect_ratio
Ratios suportados: `1:1`, `2:3`, `3:2`, `4:5`, `5:4`, `9:16`, `16:9`, `9:21`, `21:9`

### output_format
- `png` — Sem perda, maior arquivo
- `jpeg` — Comprimido, menor arquivo
- `webp` — Moderno, bom balanco

### seed
- Range: 0 a 4294967294
- Mesma seed + mesmo prompt = mesma imagem (reproducibilidade)
- 0 ou omitido = aleatorio

## Respostas

### Sucesso (200)
- Header `Content-Type: image/png` (ou jpeg/webp)
- Body: bytes da imagem
- Header `seed`: seed usada na geracao
- Header `finish-reason`: `SUCCESS` ou `CONTENT_FILTERED`

### Sucesso com JSON
Se `Accept: application/json`:
```json
{
  "image": "base64_encoded_image_data",
  "seed": 12345,
  "finish_reason": "SUCCESS"
}
```

## Erros

| Codigo | Significado | Acao |
|--------|-------------|------|
| 400 | Bad Request | Verificar parametros |
| 401 | Unauthorized | Verificar API key |
| 402 | Payment Required | Verificar creditos/plano |
| 403 | Forbidden | Conteudo bloqueado por moderacao |
| 404 | Not Found | Endpoint incorreto |
| 429 | Rate Limited | Aguardar e retentar (retry automatico) |
| 500 | Internal Error | Retentar apos alguns segundos |

### Formato de Erro
```json
{
  "id": "error-id",
  "name": "bad_request",
  "errors": ["prompt must not be empty"]
}
```

## Headers Importantes

### Request
```
Authorization: Bearer sk-...
Content-Type: multipart/form-data
Accept: image/* (ou application/json)
```

### Response
```
Content-Type: image/png
seed: 12345
finish-reason: SUCCESS
```
