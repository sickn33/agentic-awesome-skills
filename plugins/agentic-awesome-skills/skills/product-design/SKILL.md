---
name: product-design
description: "Design de produto nivel Apple — sistemas visuais, UX flows, acessibilidade, linguagem visual proprietaria, design tokens, prototipagem e handoff. Cobre Figma, design systems, tipografia, cor, espacamento, motion design e principios de design cognitivo."
risk: none
source: community
date_added: '2026-03-06'
author: renat
tags:
- design
- ux
- design-systems
- accessibility
- figma
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# PRODUCT DESIGN — Nivel Apple

## Overview

Design de produto nivel Apple — sistemas visuais, UX flows, acessibilidade, linguagem visual proprietaria, design tokens, prototipagem e handoff. Cobre Figma, design systems, tipografia, cor, espacamento, motion design e principios de design cognitivo. Ativar para: criar design system, definir visual language, revisar UX, acessibilidade, tokens de design, branding de produto, UI critique.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to product design
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

> "Design is not just what it looks like and feels like. Design is how it works."
> — Steve Jobs

---

## Os 10 Principios De Jony Ive / Apple

1. **Simplicidade radical** — remova tudo que nao e essencial
2. **Honestidade material** — cada elemento existe por uma razao
3. **Menos e mais** — restraint e uma decisao de design
4. **Coerencia sistemica** — tudo faz parte de um sistema unico
5. **Detalhes importam** — o usuario sente, mesmo sem notar
6. **Funcao define forma** — a estetica serve ao proposito
7. **Durabilidade** — design que envelhece bem
8. **Acessibilidade como padrao** — nao como adicional
9. **Continuidade entre telas** — experiencia unificada
10. **Surpresa deleitosa** — o inesperado que encanta

## Design Cognitivo

- **Carga cognitiva zero** — o usuario nunca deve pensar
- **Affordances claras** — o que e clicavel parece clicavel
- **Feedback imediato** — toda acao tem resposta visual
- **Erros previnem-se** — design que impossibilita erros

---

## Estrutura De Um Design System De Elite

```
design-system/
├── tokens/
│   ├── colors.json       # paleta completa com semantica
│   ├── typography.json   # escala tipografica
│   ├── spacing.json      # grid e espacamento
│   ├── shadows.json      # elevacao e profundidade
│   ├── motion.json       # duracao e easing
│   └── radius.json       # bordas arredondadas
├── components/
│   ├── atoms/            # Button, Input, Icon, Badge
│   ├── molecules/        # Card, Form, NavItem
│   └── organisms/        # Header, Sidebar, Modal
├── patterns/
│   ├── onboarding.md     # primeiro acesso
│   ├── empty-states.md   # estados vazios
│   ├── loading.md        # estados de carregamento
│   └── errors.md         # tratamento de erros
└── guidelines/
    ├── voice-tone.md     # voz e tom
    ├── imagery.md        # fotografia e ilustracao
    └── accessibility.md  # WCAG 2.1 AA
```

## Design Tokens — Exemplo Auri

```json
{
  "color": {
    "brand": {
      "primary": "#6C63FF",
      "primary-dark": "#5A52E0",
      "accent": "#FF6B6B",
      "surface": "#F8F7FF"
    },
    "semantic": {
      "success": "#22C55E",
      "warning": "#F59E0B",
      "error": "#EF4444",
      "info": "#3B82F6"
    },
    "neutral": {
      "900": "#111827",
      "800": "#1F2937",
      "600": "#4B5563",
      "400": "#9CA3AF",
      "200": "#E5E7EB",
      "50":  "#F9FAFB"
    }
  },
  "typography": {
    "display": { "size": "48px", "weight": "700", "line": "1.1" },
    "h1": { "size": "36px", "weight": "700", "line": "1.2" },
    "h2": { "size": "28px", "weight": "600", "line": "1.3" },
    "body": { "size": "16px", "weight": "400", "line": "1.6" },
    "small": { "size": "14px", "weight": "400", "line": "1.5" }
  },
  "spacing": {
    "xs": "4px", "sm": "8px", "md": "16px",
    "lg": "24px", "xl": "32px", "2xl": "48px", "3xl": "64px"
  },
  "radius": {
    "sm": "4px", "md": "8px", "lg": "12px",
    "xl": "16px", "full": "9999px"
  },
  "shadow": {
    "sm": "0 1px 3px rgba(0,0,0,0.12)",
    "md": "0 4px 12px rgba(0,0,0,0.15)",
    "lg": "0 8px 24px rgba(0,0,0,0.18)",
    "xl": "0 20px 60px rgba(0,0,0,0.22)"
  },
  "motion": {
    "fast": "150ms ease-out",
    "normal": "250ms ease-in-out",
    "slow": "400ms cubic-bezier(0.34, 1.56, 0.64, 1)"
  }
}
```

---

## Estrutura De Um Ux Flow

```
1. Entry Point (como o usuario chega)
2. Context (o que o usuario sabe/quer)
3. Action (o que o usuario faz)
4. Feedback (resposta imediata do sistema)
5. Outcome (o que o usuario conseguiu)
6. Next Step (o que vem depois naturalmente)
```

## Onboarding De Elite (Primeiros 5 Minutos)

```
Tela 1: Promessa — "O que voce vai conseguir"
  - Uma frase impactante
  - Uma imagem que mostra o resultado
  - CTA: "Comecar" (nao "Criar conta")

Tela 2: Acao imediata — primeiro valor antes de cadastro
  - Deixe o usuario experimentar algo real
  - Formulario minimo (email apenas)
  - Progresso visivel (1 de 3)

Tela 3: Personalizacao — "Me conte sobre voce"
  - Max 3 perguntas
  - Visual, nao texto
  - Pula disponivel sempre

Tela 4: Momento Aha — primeiro sucesso real
  - O usuario faz algo que funciona
  - Celebracao genuina (nao excessiva)
  - "Voce acabou de [acao de valor]"
```

## Empty States Que Encantam

```
Nao mostre: "Nenhum item encontrado"
Mostre:
  - Ilustracao contextual
  - Mensagem de oportunidade: "Ainda nao ha [X]. Crie o primeiro!"
  - CTA primario
  - Talvez: dica de como comecar
```

---

## Principios Unicos Para Voice Ui

1. **Zero carga visual** — o usuario nao ve nada (apenas ouve)
2. **Reversibilidade facil** — "desfazer" e sempre possivel
3. **Confirmacao opcional** — so para acoes irreversiveis
4. **Variedade de resposta** — nunca a mesma frase duas vezes
5. **Silencio e ok** — pausa de 2s antes de perguntar se precisa de ajuda

## Estrutura De Resposta De Voz

```
[Hook opcional] + [Resposta core] + [Acao ou pergunta]

Ruim: "Desculpe, nao entendi o que voce disse. Pode repetir?"
Bom:  "Nao captei bem. Pode repetir de outro jeito?"

Ruim: "Claro! Posso ajudar com isso. A resposta para sua pergunta e..."
Bom:  "A resposta e: [resposta direta]"
```

## Scripts De Interacao Auri

```
Primeiro uso:
"Oi! Sou a Auri. Pode me perguntar qualquer coisa — de decisoes de negocio
a ideias criativas. Como posso ajudar hoje?"

Retorno (usuario ja conhecido):
"Bem-vindo de volta! Onde paramos foi em [topico]. Quer continuar?"

Nao entendeu:
"Nao peguei bem. Tenta de outro jeito?"

Encerramento:
"Qualquer coisa, e so chamar. Ate logo!"
```

---

## Framework De Critica Construtiva

```
1. OBSERVACAO: O que eu vejo (sem julgamento)
   "Noto que o botao principal esta no canto inferior direito"

2. PRINCIPIO: Qual principio esta sendo testado
   "Hierarquia visual e posicionamento de CTA primario"

3. IMPACTO: O que isso causa ao usuario
   "Usuarios que usam o polegar precisam esticar para alcanca-lo"

4. ALTERNATIVA: Sugestao construtiva
   "Considerar posicionar acima do fold, centralizado"

5. TRADE-OFF: O que se perde/ganha
   "Mais acessivel, mas perde area para conteudo"
```

## Checklist De Critica De Ui

- [ ] Hierarquia visual clara (o olho sabe para onde ir)
- [ ] Contraste adequado (WCAG AA: 4.5:1 para texto)
- [ ] Tamanho de toque minimo (44x44px em mobile)
- [ ] Consistencia com design system
- [ ] Estados interativos definidos (hover/active/disabled/focus)
- [ ] Responsividade (mobile-first)
- [ ] Loading states e empty states
- [ ] Tratamento de erros com mensagem util
- [ ] Acessibilidade (labels, roles ARIA, keyboard nav)
- [ ] Performance percebida (skeleton screens, optimistic UI)

---

## Conceito Visual

A Auri e **inteligencia com calor humano**. Nao e um robo — e uma presenca.
A identidade visual deve comunicar: sofisticacao acessivel.

## Paleta Principal

```
Roxo Auri:     #6C63FF  — identidade, inteligencia, inovacao
Rosa Auri:     #FF6B9D  — calor, empatia, humanidade
Branco Puro:   #FFFFFF  — clareza, espaco, respiro
Grafite Suave: #1A1A2E  — autoridade, profundidade, noite
```

## Tipografia

```
Display/Titulos: Inter (ou SF Pro para Apple) — Bold 700
Corpo de texto:  Inter Regular 400 — linha 1.6
Mono/Codigo:     JetBrains Mono — para elementos tecnicos
```

## Logo Conceito

```
Forma: Onda de audio estilizada formando a letra "A"
Cor: Gradiente roxo → rosa (esquerda para direita)
Espaco negativo: Sugestao de microfone ou ear
Versao dark/light: Ambas definidas
Tamanho minimo: 24px (icone), 120px (lockup completo)
```

---

## Stack De Design

| Ferramenta | Uso |
|-----------|-----|
| Figma | Design de UI, prototipagem, handoff |
| FigJam | User journeys, workshops, ideacao |
| Zeroheight | Documentacao do design system |
| Lottie | Animacoes (exportadas do After Effects/Figma) |
| Mobbin | Referencia de patterns de UI |
| Screenlane | Inspiracao de UI real |

## Processo De Design Sprint (5 Dias)

```
Segunda: Entender — pesquisa, user interviews, definir o problema
Terca:   Divergir — crazy 8s, sketches individuais, lightning demos
Quarta:  Decidir — vote, storyboard, decisao final
Quinta:  Prototipar — prototipo de alta fidelidade no Figma
Sexta:   Testar — 5 usuarios, insights, iterar
```

---

## 8. Comandos

| Comando | Acao |
|---------|------|
| `/design-critique` | Critica estruturada de um design |
| `/design-tokens` | Gera tokens para um projeto |
| `/ux-flow` | Mapeia fluxo de experiencia |
| `/voice-ux` | Design de interacao por voz |
| `/onboarding` | Cria fluxo de onboarding |
| `/design-system` | Estrutura design system completo |
| `/accessibility` | Auditoria de acessibilidade |
| `/visual-identity` | Define identidade visual de produto |

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `analytics-product` - Complementary skill for enhanced analysis
- `growth-engine` - Complementary skill for enhanced analysis
- `monetization` - Complementary skill for enhanced analysis
- `product-inventor` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
