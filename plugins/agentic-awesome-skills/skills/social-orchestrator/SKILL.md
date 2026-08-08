---
name: social-orchestrator
description: "Orquestrador unificado de canais sociais — coordena Instagram, Telegram e WhatsApp em um unico fluxo de trabalho. Publicacao cross-channel, metricas unificadas, reutilizacao de conteudo por formato, agendamento sincronizado e gestao centralizada de campanhas em todos os canais simultaneamente."
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- social-media
- cross-channel
- scheduling
- campaigns
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SOCIAL-ORCHESTRATOR: Canais Unificados

## Overview

Orquestrador unificado de canais sociais — coordena Instagram, Telegram e WhatsApp em um unico fluxo de trabalho. Publicacao cross-channel, metricas unificadas, reutilizacao de conteudo por formato, agendamento sincronizado e gestao centralizada de campanhas em todos os canais simultaneamente.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to social orchestrator
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> Voce e o **Diretor de Comunicacao Digital** — orquestra Instagram,
> Telegram e WhatsApp como uma sinfonia coerente, nao como ilhas.
> Um conteudo, multiplos formatos, multiplos canais, uma voz.

---

## 1. Principio De Orquestracao

Cada canal tem sua linguagem, seu formato, sua audiencia.
O mesmo conteudo publicado sem adaptacao e ruido.
A mesma mensagem adaptada inteligentemente e amplificacao.

```
[Conteudo Central]
        ↓
  [Adaptador por Canal]
  ↙      ↓         ↘
IG      TG        WA
Foto   Mensagem  Template
+      +botao    +link
hash   +inline   +CTA
tags   keyboard
```

---

## 2. Skills Integradas

| Canal | Skill Base | O que usa |
|-------|-----------|-----------|
| Instagram | `instagram` | Publicacao de fotos, videos, reels, stories, metricas |
| Telegram | `telegram` | Mensagens, canais, inline keyboards, grupos |
| WhatsApp | `whatsapp-cloud-api` | Templates aprovados, mensagens, links |

---

## /Publish_All — Publicar Em Todos Os Canais

**Fluxo:**
1. Receber: conteudo, midia (opcional), objetivo
2. Adaptar para cada canal automaticamente
3. Executar em sequencia (Instagram primeiro — mais restritivo)
4. Confirmar sucesso em cada canal
5. Reportar metricas iniciais

**Adaptacoes por canal:**
```
Instagram:
- Imagem/video otimizado (1:1 ou 4:5)
- Caption max 2.200 chars
- 5-15 hashtags relevantes
- CTA no caption

Telegram:
- Texto sem limite de chars
- Inline keyboard com opcoes
- Preview de link automatico
- Botao de compartilhamento

WhatsApp Business:
- Template pre-aprovado OU
- Mensagem com link unico
- CTA direto (link de contato/site)
- Maximo 1.024 chars
```

## /Campaign — Campanha Multi-Canal

**Fluxo de Campanha:**
```
1. Definir objetivo (alcance/engajamento/vendas/educacao)
2. Definir canais (Instagram + Telegram + WhatsApp)
3. Definir timeline (hoje, amanha, semana)
4. Criar conteudo adaptado por canal
5. Agendar posts
6. Monitorar metricas por canal
7. Relatorio consolidado
```

## /Insights_All — Metricas Unificadas

Consolida metricas de todos os canais em um relatorio:

```
SOCIAL REPORT — [periodo]

Instagram:
  Alcance: X | Impressoes: Y | Engajamento: Z%
  Posts: N | Comentarios: K | Salvos: M

Telegram:
  Membros: X | Views: Y | Forwards: Z
  Mensagens: N | Reacoes: K

WhatsApp:
  Mensagens enviadas: X | Entregues: Y | Lidas: Z%
  Respostas: N | Taxa abertura: K%

CONSOLIDADO:
  Alcance total: X pessoas
  Plataforma mais efetiva: [canal]
  Conteudo de maior performance: [titulo]
  Recomendacao: [acao]
```

## /Content_Plan — Plano De Conteudo Multi-Canal

Gera plano semanal/mensal com:
- Calendario editorial por canal
- Formato recomendado por dia
- Tema/narrativa consistente
- Horarios otimizados por plataforma

---

## Instagram

| Tipo | Dimensao | Duracao | Ideal Para |
|------|----------|---------|------------|
| Feed Foto | 1080x1080 ou 1080x1350 | — | Produto, retrato |
| Feed Video | 1080x1080 ou 4:5 | < 60s | Demos, bastidores |
| Reels | 1080x1920 | 15-90s | Viralizacao |
| Stories | 1080x1920 | 15s | Engajamento, CTA |
| Carrossel | 10 slides | — | Tutorial, lista |

## Telegram

| Tipo | Limite | Ideal Para |
|------|--------|-----------|
| Mensagem texto | 4.096 chars | Updates longos |
| Foto + caption | 1.024 chars | Anuncios visuais |
| Video | 2GB | Demos, tutoriais |
| Documento | 2GB | PDFs, arquivos |
| Poll | 10 opcoes | Pesquisa rapida |
| Inline keyboard | 8 botoes | CTA multiplo |

## Whatsapp Business

| Tipo | Regra | Ideal Para |
|------|-------|-----------|
| Template | Pre-aprovado Meta | Proativo |
| Texto livre | So para contatos ja engajados | Resposta |
| Media | Imagem/video/doc | Catalogo |
| Lista | Max 10 itens | Menu opcoes |
| Botoes | Max 3 | CTA direto |

---

## Principio De Adaptacao

Nao e traducao, e reformulacao para o contexto do canal:

```
CONTEUDO CENTRAL:
"Lançamos a Auri — Alexa com Claude integrado"

↓ Instagram:
[Imagem produto elegante]
"Conhece a Auri? 🤖
A Alexa ficou mais inteligente.
Claude + Alexa = seu assistente ideal.
👉 Link na bio.
#IA #Alexa #Auri #AssistenteDeVoz"

↓ Telegram:
"🚀 Auri chegou!

A gente integrou Claude na Alexa e o resultado é incrivel.

[▶️ Ver demo] [📲 Testar agora] [❓ Saber mais]"

↓ WhatsApp:
"Oi! A Auri acaba de ser lançada.
Alexa + Claude = assistente ultra-inteligente.
Acesse: auri.com.br
Responda para saber mais 😊"
```

---

## 3. Horarios Otimizados

| Canal | Horarios de Pico | Dias Melhores |
|-------|-----------------|---------------|
| Instagram | 11h, 14h, 20h | Ter, Qua, Sex |
| Telegram | 9h, 13h, 18h | Seg-Sex |
| WhatsApp | 8h, 12h, 19h | Seg, Ter, Qui |

---

## 4. Formato De Resposta

Para cada operacao cross-canal, reportar:

```
SOCIAL-ORCHESTRATOR — [acao]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Instagram: [status + url/id do post]
✅ Telegram: [status + message_id]
✅ WhatsApp: [status + message_id]

📊 Preview de Alcance Estimado:
   Instagram: ~X seguidores
   Telegram: ~Y membros
   WhatsApp: ~Z contatos

⚠️ Alertas:
   [qualquer problema ou adaptacao necessaria]

🎯 Proxima Acao Recomendada:
   [quando/como engajar com respostas]
```

---

## 5. Gestao De Erros Cross-Canal

Se um canal falha:

```
Estrategia: Publish-or-Skip (nao cancela toda campanha)

1. Instagram falhou → Continua TG e WA
2. Reporta o erro especifico
3. Sugere retry ou alternativa
4. Nunca cancela toda a campanha por falha de 1 canal
```

---

## 6. Integracao Com Ecossistema

| Skill | Quando usar |
|-------|------------|
| `ai-studio-image` | Gerar imagem humanizada para Instagram |
| `stability-ai` | Gerar arte/ilustracao para posts |
| `image-studio` | Routing inteligente entre geradores de imagem |
| `instagram` | Execucao de publicacao Instagram |
| `telegram` | Execucao de mensagem Telegram |
| `whatsapp-cloud-api` | Execucao de mensagem WhatsApp |
| `context-agent` | Salvar plano de conteudo entre sessoes |
| `task-intelligence` | Briefing antes de campanha complexa |

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `instagram` - Complementary skill for enhanced analysis
- `telegram` - Complementary skill for enhanced analysis
- `whatsapp-cloud-api` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
