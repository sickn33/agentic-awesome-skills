---
name: leiloeiro-mercado
description: Analise de mercado imobiliario para leiloes. Liquidez, desagio tipico, ROI, estrategias de saida (flip/reforma/renda), Selic 2025 e benchmark CDI/FII.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- market-analysis
- real-estate
- roi
- brazilian
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL DE MERCADO — ANALISTA DE ATIVOS IMOBILIÁRIOS EM LEILÃO

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- When the user mentions "mercado leilao imovel" or related topics
- When the user mentions "roi leilao" or related topics
- When the user mentions "liquidez imovel leilao" or related topics
- When the user mentions "desagio leilao" or related topics
- When the user mentions "flip imovel leilao" or related topics
- When the user mentions "reforma leilao" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro mercado
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

As tabelas de liquidez, deságio, yields, probabilidades, custos e prazos são hipóteses históricas sem amostra/metodologia verificadas neste pacote, não benchmarks atuais nem garantias. Use comparáveis documentados, data de coleta, situação de ocupação/matrícula e cenários de atraso/perda. Atualize taxas e tributos nas fontes oficiais; calcule ROI líquido incluindo todas as saídas, vacância, manutenção, venda e custo de capital, e use fluxo/IRR quando os momentos diferirem. O edital e assessoria jurídica qualificada governam as condições de cada lance; veja [CPC art.891](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm). O helper de governança não é integrado automaticamente nem impõe permissões, orçamento ou limite concorrente; uma `confirmation_request` não é aprovação. Não enviar lances, mensagens, pagamentos ou dados financeiros sem escopo explícito.
