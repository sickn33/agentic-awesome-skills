---
name: skill-sentinel
description: Auditoria e evolucao do ecossistema de skills. Qualidade de codigo, seguranca, custos, gaps, duplicacoes, dependencias e relatorios de saude.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- governance
- audit
- quality
- skill-health
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Skill Sentinel

## Overview

Auditoria e evolucao do ecossistema de skills. Qualidade de codigo, seguranca, custos, gaps, duplicacoes, dependencias e relatorios de saude.

## When to Use This Skill

- When the user mentions "auditar skills" or related topics
- When the user mentions "qualidade skills" or related topics
- When the user mentions "verificar skills ecossistema" or related topics
- When the user mentions "saude ecossistema skills" or related topics
- When the user mentions "skills duplicadas" or related topics
- When the user mentions "otimizar skills" or related topics

## Do Not Use This Skill When

- The task is unrelated to skill sentinel
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Meta-agente que monitora, audita e evolui o ecossistema de skills. Analisa
todas as skills em 7 dimensoes, identifica problemas, sugere melhorias
e recomenda novas skills especialistas.

## Resumo Rapido

| Area | Script | O que faz |
|------|--------|-----------|
| **Discovery** | `scanner.py` | Descobre todas as skills automaticamente |
| **Qualidade** | `analyzers/code_quality.py` | Complexidade, docstrings, error handling |
| **Seguranca** | `analyzers/security.py` | Secrets, SQL injection, HTTPS |
| **Performance** | `analyzers/performance.py` | API calls, caching, retry |
| **Governanca** | `analyzers/governance_audit.py` | Rate limits, audit log, confirmacoes |
| **Documentacao** | `analyzers/documentation.py` | SKILL.md, triggers, references |
| **Dependencias** | `analyzers/dependencies.py` | requirements.txt, versoes |
| **Cross-Skill** | `analyzers/cross_skill.py` | Duplicacao, padroes compartilhados |
| **Custos** | `cost_optimizer.py` | Tokens, verbosidade, output |
| **Recomendacoes** | `recommender.py` | Gap analysis, novas skills |
| **Relatorio** | `report_generator.py` | Markdown estruturado |
| **Orquestracao** | `run_audit.py` | CLI principal |

## Localizacao

```
C:\Users\renat\skills\skill-sentinel\
├── SKILL.md
├── scripts/
│   ├── requirements.txt
│   ├── config.py
│   ├── db.py
│   ├── governance.py
│   ├── scanner.py
│   ├── analyzers/
│   │   ├── code_quality.py
│   │   ├── security.py
│   │   ├── performance.py
│   │   ├── governance_audit.py
│   │   ├── documentation.py
│   │   ├── dependencies.py
│   │   └── cross_skill.py
│   ├── recommender.py
│   ├── cost_optimizer.py
│   ├── report_generator.py
│   └── run_audit.py
├── references/
│   ├── analysis_criteria.md
│   ├── security_patterns.md
│   ├── skill_template.md
│   └── schema.md
└── data/
    ├── sentinel.db
    └── reports/
```

## Instalacao

```bash
pip install -r C:\Users\renat\skills\skill-sentinel\scripts\requirements.txt
```

## Comandos Principais

```bash

## Auditoria Completa De Todas As Skills

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py

## Auditar Apenas Uma Skill

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py --skill instagram

## Apenas Recomendacoes De Novas Skills

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py --recommend

## Comparar Com Auditoria Anterior (Tendencias)

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py --compare

## Output Em Json (Para Processamento)

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py --format json

## Ver Historico De Auditorias

python C:\Users\renat\skills\skill-sentinel\scripts\run_audit.py --history

## Descobrir Skills Disponiveis

python C:\Users\renat\skills\skill-sentinel\scripts\scanner.py

## Ver Audit Log Do Sentinel

python C:\Users\renat\skills\skill-sentinel\scripts\governance.py

## Verificar Banco De Dados

python C:\Users\renat\skills\skill-sentinel\scripts\db.py
```

## 1. Qualidade De Codigo (Peso: 20%)

- Complexidade ciclomatica por funcao (limiar: 10)
- Tamanho de funcoes (limiar: 50 linhas)
- Tamanho de arquivos (limiar: 500 linhas)
- Cobertura de docstrings
- Padroes de error handling (bare except, broad except)

## 2. Seguranca (Peso: 20%)

- Secrets hardcoded (tokens, passwords, API keys)
- SQL injection (f-strings em queries)
- URLs HTTP inseguras
- Tokens em logs
- Validacao de input

## 3. Performance (Peso: 15%)

- Retry com backoff para APIs
- Timeouts configurados
- Reuso de conexoes HTTP
- N+1 queries
- Async/concorrencia

## 4. Governanca (Peso: 15%)

- Nivel 0: Nenhuma
- Nivel 1: Action logging
- Nivel 2: Logging + rate limiting
- Nivel 3: Completa (+ confirmacoes 2-step)
- Nivel 4: Avancada (+ alertas e trends)

## 5. Documentacao (Peso: 15%)

- SKILL.md com frontmatter (name, description, version)
- Trigger keywords (PT-BR e EN)
- Secoes obrigatorias e recomendadas
- Reference files

## 6. Dependencias (Peso: 15%)

- requirements.txt presente
- Versoes pinadas
- Deps importadas vs listadas
- Deps listadas vs importadas

## 7. Cross-Skill (Analise Global)

- Modulos duplicados entre skills
- Padroes de Database compartilhados
- Governanca inconsistente
- Oportunidades de extracao

## Otimizacao De Custos

Alem das 7 dimensoes, o sentinel analisa impacto de custo:
- Tamanho do SKILL.md (tokens consumidos por ativacao)
- References grandes sem indice
- Output verboso dos scripts
- Ausencia de output JSON estruturado

## Gap Analysis E Recomendacoes

O recommender identifica capacidades ausentes no ecossistema comparando
com uma taxonomia de 20 categorias e gera templates de SKILL.md prontos
para novas skills sugeridas.

## Governanca Do Sentinel

O proprio sentinel pratica o que prega:
- Todas as auditorias sao registradas em action_log
- Historico de scores em score_history para tendencias
- Relatorios salvos em data/reports/

## Workflows Comuns

**1. Primeira auditoria do ecossistema:**
```
python run_audit.py
```
Gera relatorio completo com scores, findings e recomendacoes.

**2. Monitorar evolucao ao longo do tempo:**
```
python run_audit.py --compare
```
Mostra delta de scores entre auditorias.

**3. Validar uma skill antes de deploy:**
```
python run_audit.py --skill nome-da-skill
```
Auditoria focada com findings especificos.

**4. Identificar proxima skill a criar:**
```
python run_audit.py --recommend
```
Gap analysis com templates prontos.

## Formato Do Relatorio

O relatorio gerado em `data/reports/` contem:
1. Resumo executivo (tabela de scores)
2. Tendencias (se houver auditoria anterior)
3. Findings por severidade (critico/alto/medio/baixo/info)
4. Analise por skill (detalhada)
5. Recomendacoes de novas skills
6. Plano de acao priorizado

## Referencias

Para detalhes tecnicos, consultar:
- `references/analysis_criteria.md` - Rubricas de scoring
- `references/security_patterns.md` - Padroes de seguranca
- `references/skill_template.md` - Template para novas skills
- `references/schema.md` - Schema do banco de dados

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `skill-installer` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
