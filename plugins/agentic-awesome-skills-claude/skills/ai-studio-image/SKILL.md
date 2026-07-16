---
name: ai-studio-image
description: Geracao de imagens humanizadas via Google AI Studio (Gemini). Fotos realistas estilo influencer ou educacional com iluminacao natural e imperfeicoes sutis.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- image-generation
- ai-studio
- google
- photography
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# AI Studio Image — Especialista em Imagens Humanizadas

## Overview

Geracao de imagens humanizadas via Google AI Studio (Gemini). Fotos realistas estilo influencer ou educacional com iluminacao natural e imperfeicoes sutis.

## When to Use This Skill

- When the user mentions "gera imagem" or related topics
- When the user mentions "gerar foto" or related topics
- When the user mentions "criar imagem" or related topics
- When the user mentions "foto realista" or related topics
- When the user mentions "imagem humanizada" or related topics
- When the user mentions "foto influencer" or related topics

## Do Not Use This Skill When

- The task is unrelated to ai studio image
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

A diferenca entre uma imagem de IA e uma foto real esta nos detalhes imperceptiveis:
a leve granulacao de um sensor de celular, a iluminacao que nao e perfeita, o enquadramento
ligeiramente descentralizado, a profundidade de campo caracteristica de uma lente pequena.
Esta skill injeta sistematicamente essas qualidades em cada geracao.

## Ai Studio Image — Especialista Em Imagens Humanizadas

Skill de geracao de imagens via Google AI Studio que transforma qualquer prompt em fotos
com aparencia genuinamente humana. Cada imagem gerada parece ter sido tirada por uma
pessoa real com seu celular — nao por uma IA.

## 1. Configurar Api Key

O usuario precisa de uma API key do Google AI Studio:
- Acesse https://aistudio.google.com/apikey
- Crie ou copie sua API key
- Configure como variavel de ambiente:

```bash

## Windows

set GEMINI_API_KEY=sua-api-key-aqui

## Linux/Mac

export GEMINI_API_KEY=sua-api-key-aqui
```

Ou crie um arquivo `.env` em `C:\Users\renat\skills\ai-studio-image\`:
```
GEMINI_API_KEY=sua-api-key-aqui
```

## 2. Instalar Dependencias

```bash
pip install -r C:\Users\renat\skills\ai-studio-image\scripts\requirements.txt
```

## 3. Gerar Sua Primeira Imagem

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\generate.py --prompt "mulher jovem tomando cafe em cafeteria" --mode influencer --format square
```

## Workflow Principal

Quando o usuario pedir para gerar uma imagem, siga este fluxo:

## Passo 1: Identificar O Modo

Pergunte ou deduza pelo contexto:

| Modo | Quando Usar | Caracteristicas |
|------|-------------|-----------------|
| **influencer** | Posts de redes sociais, lifestyle, branding pessoal | Estetica atraente mas natural, cores vibrantes sem saturacao excessiva, composicao que prende atencao |
| **educacional** | Material de curso, tutorial, apresentacao, infografico | Visual limpo, profissional, foco no conteudo, elementos claros e legiveis |

Se o usuario nao especificar, use **influencer** como padrao para conteudo de redes sociais
e **educacional** para qualquer coisa relacionada a ensino/apresentacao.

## Passo 2: Identificar O Formato

| Formato | Aspect Ratio | Uso Ideal |
|---------|-------------|-----------|
| `square` | 1:1 | Feed Instagram, Facebook, perfis |
| `portrait` | 3:4 | Instagram portrait, Pinterest |
| `landscape` | 16:9 | YouTube thumbnails, banners, desktop |
| `stories` | 9:16 | Instagram/Facebook Stories, TikTok, Reels |

Se nao especificado, deduza pelo contexto (stories → 9:16, feed → 1:1, etc).

## Passo 3: Transformar O Prompt

**Esta e a etapa mais importante.** Nunca envie o prompt do usuario diretamente para a API.
Sempre passe pelo motor de humanizacao:

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\prompt_engine.py --prompt "prompt do usuario" --mode influencer
```

O motor de humanizacao adiciona camadas de realismo:

**Camada 1 — Dispositivo e Tecnica:**
- Fotografado com smartphone (iPhone/Samsung Galaxy)
- Lente de celular com profundidade de campo natural
- Sem flash — apenas luz ambiente
- Leve ruido de sensor (ISO elevado em baixa luz)

**Camada 2 — Iluminacao Natural:**
- Luz do sol indireta / golden hour / luz de janela
- Sombras suaves e organicas
- Sem iluminacao de estudio
- Reflexos naturais em superficies

**Camada 3 — Imperfeicoes Humanas:**
- Enquadramento ligeiramente imperfeito (nao centralizado matematicamente)
- Foco seletivo natural (algo levemente fora de foco no background)
- Micro-tremor de maos (nitidez nao e absoluta)
- Elementos aleatorios do ambiente real

**Camada 4 — Autenticidade:**
- Expressoes faciais genuinas (nao poses de estudio)
- Roupas e cenarios do dia-a-dia
- Textura de pele real (poros, marcas sutis — sem pele de porcelana)
- Proporcoes corporais realistas

**Camada 5 — Contexto Ambiental:**
- Cenarios reais (nao fundos genericos de stock)
- Objetos do cotidiano no ambiente
- Iluminacao consistente com o cenario
- Hora do dia coerente com a atividade

## Passo 4: Gerar A Imagem

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\generate.py \
  --prompt "prompt humanizado gerado no passo anterior" \
  --mode influencer \
  --format square \
  --model gemini-2-flash-exp \
  --output C:\Users\renat\skills\ai-studio-image\data\outputs\
```

**Modelos disponiveis (em ordem de recomendacao):**

| Modelo | Velocidade | Qualidade | Custo | Uso Ideal |
|--------|-----------|-----------|-------|-----------|
| `gemini-2-flash-exp` | Rapido | Alta | **GRATIS** | **Padrao — usar sempre** |
| `imagen-4` | Medio | Alta | $0.03/img | Alta qualidade (requer --force-paid) |
| `imagen-4-ultra` | Lento | Maxima | $0.06/img | Impressao, 2K (requer --force-paid) |
| `imagen-4-fast` | Rapido | Boa | $0.02/img | Volume alto (requer --force-paid) |
| `gemini-flash-image` | Rapido | Alta | $0.039/img | Edicao de imagem (requer --force-paid) |
| `gemini-pro-image` | Medio | Maxima+4K | $0.134/img | Referencia, 4K (requer --force-paid) |

## Passo 5: Apresentar E Iterar

Mostre o resultado ao usuario. Se precisar ajustar:
- Reluz: Ajustar iluminacao
- Reenquadrar: Mudar composicao
- Mais/menos natural: Ajustar nivel de imperfeicoes
- Mudar cenario: Alterar ambiente

## Templates Pre-Configurados

Para cenarios comuns, use templates prontos. Execute:

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\templates.py --list
```

Templates disponiveis:

## Modo Influencer

| Template | Descricao |
|----------|-----------|
| `cafe-lifestyle` | Pessoa em cafeteria/restaurante com bebida/comida |
| `outdoor-adventure` | Atividade ao ar livre, natureza, viagem |
| `workspace-minimal` | Mesa de trabalho elegante, home office |
| `fitness-natural` | Exercicio/wellness com visual natural |
| `food-flat-lay` | Comida vista de cima, flat lay casual |
| `urban-street` | Cenario urbano, street style |
| `golden-hour-portrait` | Retrato com luz dourada do por-do-sol |
| `mirror-selfie` | Selfie no espelho, casual e espontaneo |
| `product-in-use` | Produto sendo usado naturalmente por pessoa |
| `behind-scenes` | Bastidores, making of, dia-a-dia real |

## Modo Educacional

| Template | Descricao |
|----------|-----------|
| `tutorial-step` | Pessoa demonstrando passo de tutorial |
| `whiteboard-explain` | Pessoa explicando em quadro/lousa |
| `hands-on-demo` | Maos fazendo demonstracao pratica |
| `before-after` | Comparacao antes/depois |
| `tool-showcase` | Ferramenta/software sendo utilizado |
| `classroom-natural` | Ambiente de aula/workshop |
| `infographic-human` | Pessoa apontando para dados/graficos |
| `interview-setup` | Setup de entrevista/podcast natural |
| `screen-recording-human` | Pessoa com notebook mostrando tela |
| `team-collaboration` | Equipe trabalhando junta naturalmente |

Usar template:
```bash
python C:\Users\renat\skills\ai-studio-image\scripts\generate.py \
  --template cafe-lifestyle \
  --custom "mulher ruiva, 30 anos, lendo livro" \
  --format square
```

## Nivel De Humanizacao

Controle quanto "imperfeicao" injetar:

| Nivel | Efeito |
|-------|--------|
| `ultra` | Maximo realismo — parece 100% foto de celular |
| `natural` (padrao) | Equilibrio perfeito entre qualidade e realismo |
| `polished` | Mais limpo, ainda natural mas com mais cuidado estetico |
| `editorial` | Estilo revista, natural mas com producao |

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\generate.py \
  --prompt "..." --humanization natural
```

## Hora Do Dia

A iluminacao muda drasticamente:

| Opcao | Descricao |
|-------|-----------|
| `morning` | Luz matinal suave, tons frios-quentes |
| `golden-hour` | Por-do-sol/nascer, tons dourados |
| `midday` | Luz dura do meio-dia, sombras marcadas |
| `overcast` | Dia nublado, luz difusa uniforme |
| `night` | Iluminacao artificial, tons quentes |
| `indoor` | Luz de interiores, mista |

## Geracao Em Lote

Para gerar multiplas variacoes:

```bash
python C:\Users\renat\skills\ai-studio-image\scripts\generate.py \
  --prompt "..." --variations 4 --format square
```

## Instagram Skill

Gere imagens e publique diretamente:
1. Use `ai-studio-image` para gerar a foto
2. Use `instagram` skill para publicar com caption otimizada

## Canva Integration

As imagens geradas podem ser enviadas para o Canva para adicao de texto/branding.

## Troubleshooting

| Problema | Solucao |
|----------|---------|
| `GEMINI_API_KEY not found` | Configure a variavel de ambiente ou crie `.env` |
| `quota exceeded` | Aguarde reset do rate limit ou upgrade do plano |
| `image blocked` | Ajuste o prompt — pode conter conteudo restrito |
| `low quality output` | Aumente humanization para `ultra`, tente outro modelo |

## Referencias

Para guias detalhados, consulte:
- `references/setup-guide.md` — Instalacao e configuracao completa
- `references/prompt-engineering.md` — Tecnicas avancadas de prompt para imagens humanizadas
- `references/api-reference.md` — Documentacao da API do Google AI Studio

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `comfyui-gateway` - Complementary skill for enhanced analysis
- `image-studio` - Complementary skill for enhanced analysis
- `stability-ai` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
