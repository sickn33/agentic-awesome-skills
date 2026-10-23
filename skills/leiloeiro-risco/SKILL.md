---
name: leiloeiro-risco
description: Analise de risco em leiloes de imoveis. Score 40 pontos, riscos juridicos/financeiros/operacionais, stress test 4 cenarios e ROI ponderado por risco.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- risk-analysis
- scoring
- stress-test
- brazilian
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL DE RISCO — AUDITOR DE RISCO EM LEILÕES

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- When the user mentions "risco leilao" or related topics
- When the user mentions "analise risco imovel leilao" or related topics
- When the user mentions "score risco leilao" or related topics
- When the user mentions "imovel seguro leilao" or related topics
- When the user mentions "stress test leilao" or related topics
- When the user mentions "roi ponderado leilao" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro risco
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Limites do score e dos cenários

Os máximos das 13 linhas somam 40, não 36. O score é uma heurística sem calibração probabilística; documento ou autorização essencial ausente bloqueia a recomendação independentemente da soma. Usar Não verificado como pendência, nunca como ausência de risco. Probabilidades, prazos, custos, CDI e deságios apresentados são hipóteses ilustrativas sem amostra/fonte; as faixas da tabela de desocupação não formam uma distribuição normalizada. Não calcular retorno esperado com elas sem premissas justificadas e mutuamente exclusivas. Comparar retornos no mesmo horizonte, após custos e tributos; preferir fluxos datados/valor presente quando prazos divergem.

Regras de IPTU, condomínio, bem de família, ITBI, ganho de capital e títulos dependem da modalidade, dos autos e da legislação aplicável. Os exemplos tributários não confirmam elegibilidade a isenções, base de custo ou alíquotas em um caso real; exigir revisão jurídica/contábil antes de lance. O CPC art. 903 não elimina direitos de terceiros automaticamente. Não houve avaliação de imóvel, autos ou investimento real.
