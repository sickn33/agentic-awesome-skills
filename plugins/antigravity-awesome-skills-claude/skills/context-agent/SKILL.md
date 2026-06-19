---
name: context-agent
description: Agente de contexto para continuidade entre sessoes. Salva resumos, decisoes, tarefas pendentes e carrega briefing automatico na sessao seguinte.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- context
- session-management
- continuity
- memory
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Context Agent

## Overview

Agente de contexto para continuidade entre sessoes. Salva resumos, decisoes, tarefas pendentes e carrega briefing automatico na sessao seguinte.

## When to Use This Skill

- When the user mentions "salvar contexto" or related topics
- When the user mentions "salva o contexto" or related topics
- When the user mentions "proxima sessao" or related topics
- When the user mentions "briefing sessao" or related topics
- When the user mentions "resumo sessao" or related topics
- When the user mentions "continuidade sessao" or related topics

## Do Not Use This Skill When

- The task is unrelated to context agent
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Continuidade perfeita entre sessões do Claude Code. Captura, comprime e
restaura contexto automaticamente — tópicos, decisões, tarefas, erros,
arquivos modificados e descobertas técnicas.

## Localização

```
C:\Users\renat\skills\context-agent\
├── SKILL.md
├── scripts/
│   ├── config.py               # Paths e constantes
│   ├── models.py               # Dataclasses
│   ├── session_parser.py       # Parser JSONL do Claude Code
│   ├── session_summary.py      # Gerador de resumos
│   ├── active_context.py       # Gerencia ACTIVE_CONTEXT.md
│   ├── project_registry.py     # Registro de projetos
│   ├── compressor.py           # Compressão e arquivamento
│   ├── search.py               # Busca FTS5
│   ├── context_loader.py       # Carrega contexto
│   └── context_manager.py      # CLI entry point
├── references/
│   ├── context-format.md       # Especificação de formatos
│   └── compression-rules.md    # Regras de compressão
└── data/
    ├── sessions/               # session-001.md, session-002.md, ...
    ├── archive/                # Sessões arquivadas
    ├── ACTIVE_CONTEXT.md       # Contexto consolidado (max 150 linhas)
    ├── PROJECT_REGISTRY.md     # Status de todos os projetos
    └── context.db              # SQLite FTS5 para busca
```

## Inicialização (Primeira Vez)

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py init
```

## Salvar Contexto Da Sessão Atual

Quando a sessão está terminando ou antes de uma tarefa longa, salvar o contexto:

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py save
```

O que faz:
1. Encontra o arquivo JSONL mais recente da sessão
2. Analisa todas as mensagens, tool calls e resultados
3. Gera resumo estruturado (session-NNN.md)
4. Atualiza ACTIVE_CONTEXT.md com novas informações
5. Sincroniza com MEMORY.md (carregado no system prompt)
6. Indexa para busca full-text

## Carregar Contexto (Briefing)

No início de uma nova sessão, carregar o contexto:

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py load
```

Gera briefing com: projetos ativos, tarefas pendentes (por prioridade),
bloqueadores, decisões recentes, convenções e resumo das últimas sessões.

## Status Rápido

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py status
```

Resumo em poucas linhas: projetos, pendências críticas, bloqueadores.

## Buscar No Histórico

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py search "rate limit"
```

Busca full-text (SQLite FTS5) em todas as sessões — tópicos, decisões,
erros, arquivos, etc.

## Manutenção

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py maintain
```

Arquiva sessões antigas, comprime arquivo, ressincroniza MEMORY.md,
reconstrói índice de busca.

## Fluxo De Trabalho

```
[Sessão termina]
  → save → session-NNN.md + ACTIVE_CONTEXT.md + MEMORY.md

[Nova sessão começa]
  → MEMORY.md já está no system prompt (automático)
  → load → briefing detalhado com tudo que precisa saber

[Contexto cresce demais]
  → maintain → arquiva sessões antigas, comprime, otimiza
```

## O Que É Capturado Em Cada Sessão

- **Tópicos**: assuntos discutidos
- **Decisões**: escolhas técnicas e de arquitetura
- **Tarefas concluídas**: o que foi feito
- **Tarefas pendentes**: o que falta (com prioridade)
- **Arquivos modificados**: quais arquivos foram editados/criados
- **Descobertas**: insights técnicos importantes
- **Erros resolvidos**: problemas e suas soluções
- **Questões em aberto**: perguntas sem resposta
- **Métricas**: tokens consumidos, mensagens, tool calls

## Integração Com Memory.Md

O ACTIVE_CONTEXT.md é automaticamente copiado para:
`C:\Users\renat\.claude\projects\C--Users-renat-skills\memory\MEMORY.md`

Como o MEMORY.md é incluído no system prompt de toda sessão, o Claude
sempre começa sabendo o estado atual dos projetos, tarefas pendentes
e decisões tomadas — sem precisar de nenhuma ação manual.

## Referências

- Para formato detalhado dos arquivos: `references/context-format.md`
- Para regras de compressão e arquivamento: `references/compression-rules.md`

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `context-guardian` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
