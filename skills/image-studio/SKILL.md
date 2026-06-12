---
name: image-studio
description: "Studio de geracao de imagens inteligente — roteamento automatico entre ai-studio-image (fotos humanizadas/influencer) e stability-ai (arte/ ilustracao/edicao). Detecta o tipo de imagem solicitada e escolhe o modelo ideal automaticamente."
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- image-generation
- routing
- ai-art
- photography
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# IMAGE-STUDIO: Gerador de Imagens Inteligente

## Overview

Studio de geracao de imagens inteligente — roteamento automatico entre ai-studio-image (fotos humanizadas/influencer) e stability-ai (arte/ ilustracao/edicao). Detecta o tipo de imagem solicitada e escolhe o modelo ideal automaticamente. Geracao, edicao, upscale, remocao de fundo, inpainting e geracao de fotos realistas de pessoas em um unico workflow.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to image studio
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> Voce e o **Diretor Criativo Visual** — escolhe o pincel certo para
> cada obra. Fotos humanizadas com Gemini, arte e edicao com Stability.
> Um comando, o modelo ideal, o resultado perfeito.

---

## 1. Matriz De Decisao

A primeira pergunta e sempre: **qual modelo serve melhor?**

```
PEDIDO DO USUARIO
      ↓
E uma FOTO REALISTA de pessoa/influencer?
  ↓ SIM: ai-studio-image
  ↓ NAO → E uma ILUSTRACAO, ARTE ou DESENHO?
             ↓ SIM: stability-ai (generate/ultra/core)
             ↓ NAO → E uma EDICAO de imagem existente?
                        ↓ SIM: stability-ai (img2img/inpaint/search-replace/erase)
                        ↓ NAO → E um UPSCALE ou REMOCAO DE FUNDO?
                                    ↓ SIM: stability-ai (upscale/remove-bg)
                                    ↓ NAO: perguntar mais detalhes
```

---

## Ai-Studio-Image (Gemini 2.0 Flash — Free)

**Especialidade:** Fotos hiper-realistas de pessoas com toque humano

| Pedido | Exemplo |
|--------|---------|
| Foto de influencer | "foto estilo instagram de mulher em cafe" |
| Foto de perfil profissional | "headshot profissional homem terno" |
| Foto lifestyle | "pessoa na praia com celular, luz dourada" |
| Conteudo educacional humanizado | "professor ensinando com quadro" |
| Foto produto com pessoa | "mulher segurando smartphone" |

**Vantagens:**
- Gratuito (gemini-2.0-flash-exp)
- 5 camadas de humanizacao narrativa (device, lighting, imperfection, authenticity, environment)
- 20 templates pre-configurados (10 influencer + 10 educacional)
- Imperfeicoes sutis que tornam a foto credivel

**Limitacoes:**
- 1 imagem por vez, ~9s
- ~1K resolucao
- Nao suporta aspect_ratio customizado
- 50 imgs/dia free tier

---

## Stability-Ai (Sd3.5 Large — Community)

**Especialidade:** Arte, ilustracao, edicao e manipulacao de imagens

| Pedido | Modo | Exemplo |
|--------|------|---------|
| Arte/ilustracao | `generate` | "dragon flying over mountains, fantasy" |
| Maxima qualidade | `ultra` | "portrait photography, studio lighting" |
| Rapido/iteracao | `core` | "anime cat kawaii" |
| Transformar imagem | `img2img` | "transforme em pintura a oleo" |
| Ampliar resolucao | `upscale` | "aumentar imagem para 4K" |
| Upscale criativo | `upscale-creative` | "ampliar com detalhes adicionais" |
| Remover fundo | `remove-bg` | "fundo transparente (PNG)" |
| Editar area | `inpaint` | "substituir roupa por terno" |
| Substituir objeto | `search-replace` | "trocar carro vermelho por azul" |
| Apagar objeto | `erase` | "remover pessoa do fundo" |

**15 Estilos:**
photorealistic, anime, digital-art, oil-painting, watercolor, pixel-art, 3d-render,
concept-art, comic, minimalist, fantasy, sci-fi, sketch, pop-art, noir

**Limitacoes:**
- Créditos (Community License)
- Nao especializado em fotos realistas de pessoas

---

### 3.1 Geracao Simples

```
Usuario: "crie uma imagem de X"

1. Analisar: tipo de imagem + objetivo
2. Selecionar: modelo ideal (decision matrix acima)
3. Construir prompt: otimizado para o modelo escolhido
4. Gerar: executar com parametros corretos
5. Apresentar: mostrar resultado + metadados
6. Oferecer: variacoes, ajustes, versao alternativa
```

### 3.2 Geracao Com Ai-Studio-Image

Usar sistema de templates e prompt engine:

```bash

## Template Especifico

python generate.py --template "instagram-lifestyle" --customization "cafe, manha, sorriso"

## Prompt Customizado

python generate.py --prompt "mulher jovem em home office, luz natural, laptop"

## Modo Humanizado Maximo (5 Camadas)

python generate.py --prompt "..." --humanization maximum
```

### 3.3 Geracao Com Stability-Ai

Mapear para modo correto:

```bash

## Arte/Ilustracao

python generate.py generate --prompt "..." --style fantasy --aspect-ratio 16:9

## Foto Alta Qualidade

python generate.py ultra --prompt "..." --style photorealistic

## Editar Imagem Existente

python generate.py inpaint --image imagem.jpg --mask mascara.png --prompt "adicionar chapeu"

## Remover Fundo

python generate.py remove-bg --image produto.jpg

## Upscale

python generate.py upscale --image small.jpg --scale 4
```

---

## Para Ai-Studio-Image (Fotos Realistas)

**Estrutura ideal:**
```
[Sujeito principal] + [Acao/pose] + [Ambiente] + [Iluminacao] + [Detalhe humano]

Exemplo:
"jovem mulher brasileira, 25 anos, sorrindo naturalmente,
sentada em cafe moderno, luz natural pela janela,
segurando xicara de cafe, roupa casual chique,
cabelo levemente bagunçado, foco suave no fundo"
```

**Evitar:**
- Termos de arte (oil painting, digital art)
- Nomes de artistas
- Estilos nao-fotograficos

## Para Stability-Ai (Arte/Ilustracao)

**Estrutura ideal:**
```
[Sujeito] + [Acao] + [Estilo artistico] + [Iluminacao cinematica] +
[Qualidade] + [Artista de referencia] + [Cores]

Exemplo:
"majestic dragon soaring over misty mountains,
digital art style, cinematic lighting,
highly detailed, Greg Rutkowski, vibrant colors,
4k, masterpiece"
```

**Negativos uteis:**
```
"blurry, low quality, watermark, text, ugly, deformed,
extra fingers, bad anatomy, worst quality"
```

---

## 2. Formato De Resposta

```
IMAGE-STUDIO — [tipo de geracao]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 Modelo: [ai-studio-image / stability-ai]
📋 Modo: [template / generate / inpaint / etc]
⏱️ Tempo: ~Xs

✅ Imagem gerada!
   📁 Salva em: [caminho]
   📐 Dimensao: XxY px
   💾 Tamanho: X KB

🔧 Prompt usado:
   "[prompt otimizado]"

💡 Variacoes disponiveis:
   1. stability-ai versao arte
   2. ai-studio-image versao humanizada
   3. Ajuste de estilo/iluminacao
```

---

## Post Instagram

```
Usuario: "imagem para post de lancamento do produto Auri"

→ image-studio decide: foto realista de produto com pessoa
→ ai-studio-image: "pessoa segurando dispositivo Alexa,
   ambiente moderno, luz natural, expressao animada"
→ Resultado: foto humanizada pronta para Instagram
```

## Thumbnail Youtube

```
Usuario: "thumbnail para video de IA com impacto"

→ image-studio decide: arte digital de alto impacto
→ stability-ai ultra: "AI robot face, glowing eyes,
   dark background, dramatic lighting, digital art, 4k"
→ Resultado: thumbnail atraente e profissional
```

## Foto De Perfil

```
Usuario: "foto profissional para LinkedIn"

→ image-studio decide: foto realista de pessoa
→ ai-studio-image template "linkedin-headshot":
   "homem profissional, terno azul, fundo neutro,
   luz de estudio, expressao confiante"
→ Resultado: headshot convincente
```

---

## 3. Fallback E Redundancia

```
Se ai-studio-image falha (limite diario, erro de API):
  → Tentar stability-ai modo ultra com prompt adaptado
  → Informar usuario sobre mudanca de modelo

Se stability-ai falha (créditos insuficientes):
  → Tentar ai-studio-image com prompt adaptado
  → Se mesmo tipo nao suportado: orientar sobre recarga

Se ambos falham:
  → Gerar prompt detalhado que usuario pode usar manualmente
  → Sugerir DALL-E, Midjourney, Leonardo AI como alternativas
```

---

## 4. Localizacao Das Skills

```
ai-studio-image:
  Scripts: C:\Users\renat\skills\ai-studio-image\
  Gerar: python generate.py [--template T] [--prompt P]

stability-ai:
  Scripts: C:\Users\renat\skills\stability-ai\
  Gerar: python generate.py [MODE] --prompt P --style S
```

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `ai-studio-image` - Complementary skill for enhanced analysis
- `comfyui-gateway` - Complementary skill for enhanced analysis
- `stability-ai` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
