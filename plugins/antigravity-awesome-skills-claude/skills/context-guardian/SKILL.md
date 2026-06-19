---
name: context-guardian
description: Guardiao de contexto que preserva dados criticos antes da compactacao automatica. Snapshots, verificacao de integridade e zero perda de informacao.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- context
- data-integrity
- snapshots
- verification
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Context Guardian

## Overview

Guardiao de contexto que preserva dados criticos antes da compactacao automatica. Snapshots, verificacao de integridade e zero perda de informacao.

## When to Use This Skill

- When the user mentions "compactacao contexto" or related topics
- When the user mentions "perda de contexto" or related topics
- When the user mentions "snapshot contexto" or related topics
- When the user mentions "preservar contexto" or related topics
- When the user mentions "contexto critico" or related topics
- When the user mentions "antes de compactar" or related topics

## Do Not Use This Skill When

- The task is unrelated to context guardian
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Sistema de integridade de contexto que protege projetos tecnicoss complexos contra
perda de informacao durante compactacao automatica do Claude Code. Enquanto o
`context-agent` atua APOS as sessoes (save/load), o context-guardian atua DURANTE
a sessao, detectando quando a compactacao esta proxima e executando protocolos de
preservacao com verificacao redundante.

## Por Que Isto Existe

O Claude Code compacta automaticamente mensagens antigas quando o contexto se
aproxima do limite da janela. Essa compactacao e heuristica — ela resume mensagens
para liberar espaco, mas inevitavelmente perde detalhes. Para projetos simples,
isso funciona bem. Mas para projetos tecnicos pesados (como ecossistemas com 21+
skills, auditorias de seguranca, refatoracoes de arquitetura), a perda de um unico
detalhe pode causar regressoes, re-trabalho ou inconsistencias graves.

O context-guardian resolve isso criando uma camada de protecao PRE-compactacao:
extrai, classifica, verifica e persiste todas as informacoes criticas ANTES que a
compactacao automatica as destrua.

## Localizacao

```
C:\Users\renat\skills\context-guardian\
├── SKILL.md                          # Este arquivo
├── references/
│   ├── extraction-protocol.md        # Protocolo detalhado de extracao
│   └── verification-checklist.md     # Checklist de verificacao e redundancia
└── scripts/
    └── context_snapshot.py           # Script de snapshot automatico
```

## Integracao Com O Ecossistema

```
context-guardian (PRE-compactacao)    context-agent (POS-sessao)
         │                                    │
         ├── Detecta contexto grande          ├── Salva resumo ao final
         ├── Extrai dados criticos            ├── Atualiza ACTIVE_CONTEXT.md
         ├── Verifica integridade             ├── Sincroniza MEMORY.md
         ├── Salva snapshot verificado        ├── Indexa busca FTS5
         └── Gera briefing de transicao       └── Arquiva sessoes antigas
```

O context-guardian e o context-agent sao complementares:
- **context-guardian**: protecao em tempo real, DURANTE a sessao
- **context-agent**: persistencia entre sessoes, APOS a sessao

## Ativacao Automatica (O Claude Deve Iniciar Sozinho)

1. **Limite de contexto**: quando perceber que ja consumiu ~60-70% da janela de
   contexto (indicadores: mensagens comecando a ser resumidas, aviso de compactacao)
2. **Projetos pesados**: sessoes com muitos arquivos editados, muitas tool calls,
   ou projetos com dependencias complexas entre componentes
3. **Antes de tarefas longas**: quando uma proxima tarefa pode gerar output extenso
   que empurraria o contexto para alem do limite

## Ativacao Manual (Usuario Solicita)

- "salva o estado antes de comprimir"
- "faz um checkpoint"
- "snapshot do contexto"
- "nao quero perder nada dessa sessao"
- "prepara pra compactacao"
- "o contexto ta grande, protege"

## Fase 1: Extracao Estruturada

Percorrer toda a conversa ate o momento e extrair categorias criticas.
Para cada categoria, classificar por prioridade (P0 = perda fatal, P1 = perda grave,
P2 = perda toleravel).

**P0 — Perda Fatal (preservar com redundancia tripla)**

| Categoria | O que extrair | Exemplo |
|-----------|--------------|---------|
| Decisoes tecnicas | Escolhas de arquitetura, padrao, tecnologia E motivo | "Usamos parameterized queries porque f-strings causam SQL injection" |
| Estado de tarefas | O que foi feito, o que falta, dependencias | "18/18 match OK, falta ZIP" |
| Correcoes aplicadas | Bug, causa raiz, solucao exata, arquivos afetados | "instagram/db.py: SQL injection via f-string → ? placeholders" |
| Codigo gerado/modificado | Caminho exato, linhas alteradas, natureza da mudanca | "match_skills.py:40-119: adicionou 5 categorias" |
| Erros encontrados | Mensagem exata, stack trace relevante, como resolveu | "TypeError at line 45 → cast para int" |
| Comandos que funcionaram | Comando completo que produziu resultado correto | "python verify_zips.py → 22/22 OK" |

**P1 — Perda Grave (preservar com verificacao)**

| Categoria | O que extrair |
|-----------|--------------|
| Padroes descobertos | Convencoes, patterns de codigo observados |
| Dependencias entre componentes | "scan_registry.py E match_skills.py devem ter categorias identicas" |
| Preferencias do usuario | Idioma, estilo, nivel de detalhe, workflow preferido |
| Contexto de projeto | Estrutura de diretorios, arquivos-chave, proposito |
| Questoes em aberto | Perguntas sem resposta, ambiguidades nao resolvidas |

**P2 — Perda Toleravel (resumo compacto)**

| Categoria | O que extrair |
|-----------|--------------|
| Historico de tentativas | "Tentei X, nao funcionou por Y, entao Z" |
| Metricas de progresso | Contadores, tempos, tamanhos |
| Discussoes exploratórias | Brainstorm, opcoes consideradas e descartadas |

## Fase 2: Verificacao De Integridade

Apos extrair, verificar que NADA critico foi omitido.

**Checklist de Verificacao (executar mentalmente para cada item):**

```
□ Cada arquivo modificado tem: caminho, natureza da mudanca, motivo
□ Cada bug corrigido tem: sintoma, causa raiz, solucao, arquivo
□ Cada decisao tem: o que, por que, alternativas descartadas
□ Cada tarefa pendente tem: descricao, prioridade, dependencias
□ Cada padrao/convencao tem: regra, motivo, exemplos
□ Nenhuma informacao de uma secao contradiz outra
□ Referencias cruzadas estao consistentes (ex: "18 queries testadas" aparece em
  multiplos lugares com o mesmo numero)
□ Caminhos de arquivo estao completos (absolutos, nao relativos)
```

Se qualquer item falhar, voltar a Fase 1 e re-extrair a informacao faltante.

Para detalhes sobre verificacao avancada, ler `references/verification-checklist.md`.

## Fase 3: Persistencia Redundante

Salvar as informacoes extraidas em 3 camadas de redundancia:

**Camada 1 — Snapshot estruturado (arquivo .md)**

```bash
python C:\Users\renat\skills\context-guardian\scripts\context_snapshot.py save
```

Gera `C:\Users\renat\skills\context-guardian\data\snapshot-YYYYMMDD-HHMMSS.md` com
todas as informacoes extraidas em formato estruturado.

Se o script nao estiver disponivel, criar manualmente o arquivo seguindo o formato
descrito em `references/extraction-protocol.md`.

**Camada 2 — MEMORY.md atualizado**

Atualizar `C:\Users\renat\.claude\projects\C--Users-renat-Skill-JUD\memory\MEMORY.md`
com as informacoes P0 mais criticas em formato ultra-compacto. O MEMORY.md e carregado
automaticamente em toda nova sessao, entao ele e a ultima linha de defesa.

**Camada 3 — Context-agent save**

```bash
python C:\Users\renat\skills\context-agent\scripts\context_manager.py save
```

Aciona o context-agent para salvar sessao completa com indexacao FTS5.

## Fase 4: Briefing De Transicao

Gerar um bloco de texto formatado que serve como "cartao de visita" para o Claude
que continuar apos a compactacao. Este briefing deve ser a ULTIMA coisa escrita antes
da compactacao, para que fique no topo do contexto compactado.

**Formato do briefing:**

```markdown

## Estado Atual

- Projeto: [nome]
- Fase: [fase atual]
- Progresso: [X/Y tarefas completas]

## O Que Foi Feito Nesta Sessao

1. [tarefa 1 — resultado]
2. [tarefa 2 — resultado]
...

## O Que Falta Fazer

1. [tarefa pendente — prioridade] [dependencia se houver]
2. ...

## Decisoes Criticas (Nao Alterar Sem Motivo)

- [decisao 1]: [motivo]
- [decisao 2]: [motivo]

## Correcoes Aplicadas (Nao Reverter)

- [arquivo]: [correcao] — [motivo]

## Caminhos Importantes

- [caminho 1]: [proposito]
- [caminho 2]: [proposito]

## Alertas

- [qualquer armadilha, edge case, ou cuidado especial]

## Onde Recuperar Mais Informacoes

- Snapshot: C:\Users\renat\skills\context-guardian\data\snapshot-[timestamp].md
- MEMORY.md: carregado automaticamente
- Context-agent: `python context_manager.py load`
- Busca historica: `python context_manager.py search "termo"`
```

## Protocolo Rapido (Quando O Tempo E Curto)

Se a compactacao esta iminente e nao ha tempo para o protocolo completo de 4 fases:

1. **30 segundos** — Escrever um mini-briefing com: tarefas pendentes, decisoes
   criticas, caminhos de arquivo modificados
2. **1 minuto** — Atualizar MEMORY.md com informacoes P0
3. **2 minutos** — Executar context-agent save

Mesmo o protocolo rapido e melhor que nenhuma protecao.

## Deteccao De Completude Pos-Compactacao

Quando uma sessao continuar apos compactacao, verificar se o contexto preservado
esta completo:

1. Ler MEMORY.md (ja estara carregado automaticamente)
2. Se disponivel, ler o snapshot mais recente em `data/`
3. Comparar com o briefing de transicao (se visivel no contexto compactado)
4. Se encontrar lacunas, executar:
   ```bash
   python C:\Users\renat\skills\context-agent\scripts\context_manager.py load
   ```
5. Se ainda houver lacunas, buscar por termo:
   ```bash
   python C:\Users\renat\skills\context-agent\scripts\context_manager.py search "termo"
   ```

## Exemplo De Uso Real

**Cenario**: Sessao longa criando advogado-especialista (46KB), corrigindo match_skills
(5 categorias novas), auditando seguranca (10 vulnerabilidades), gerando 22 ZIPs.

**Sem context-guardian**:
Compactacao resume tudo em "criou skill juridica, corrigiu bugs, gerou zips".
Proximo Claude nao sabe quais categorias foram adicionadas, quais vulnerabilidades
foram corrigidas, qual o estado de cada ZIP, ou por que certas decisoes foram tomadas.
Resultado: re-trabalho, inconsistencias, regressoes.

**Com context-guardian**:
Antes da compactacao, executa protocolo completo:
- Snapshot com 5 categorias novas listadas (legal, auction, security, image-generation, monitoring)
- 10 vulnerabilidades catalogadas com arquivo, tipo, e correcao exata
- 22 ZIPs verificados com checksums
- Decisoes documentadas ("removeu 'saude' de monitoring porque causava false positive")
- Briefing de transicao no topo do contexto
Proximo Claude continua com precisao total, zero re-trabalho.

## Consideracoes De Performance

- O protocolo completo leva 2-5 minutos de trabalho do Claude
- Para projetos simples, usar apenas o protocolo rapido
- Nao ativar para sessoes curtas ou conversas casuais
- A persistencia em 3 camadas (snapshot + MEMORY.md + context-agent) garante que
  mesmo se uma camada falhar, as outras duas preservam a informacao
- Snapshots antigos (>10) podem ser podados manualmente

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `context-agent` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
