---
name: claude-monitor
description: Monitor de performance do Claude Code e sistema local. Diagnostica lentidao, mede CPU/RAM/disco, verifica API latency e gera relatorios de saude do sistema.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- monitoring
- performance
- diagnostics
- system-health
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Claude Monitor — Diagnóstico de Performance

## Overview

Monitor de performance do Claude Code e sistema local. Diagnostica lentidao, mede CPU/RAM/disco, verifica API latency e gera relatorios de saude do sistema.

## When to Use This Skill

- When the user mentions "lento" or related topics
- When the user mentions "lentidao" or related topics
- When the user mentions "lag" or related topics
- When the user mentions "lagado" or related topics
- When the user mentions "travando" or related topics
- When the user mentions "claude lento" or related topics

## Do Not Use This Skill When

- The task is unrelated to claude monitor
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Skill para diagnosticar e resolver problemas de lentidão no Claude Code e no sistema.
Determina se o gargalo é local (PC) ou remoto (API Claude) e sugere ações corretivas.

## Quando Usar

- Usuário reclama que o Claude Code está lento ou travando
- Troca de sessões de conversa demora para carregar
- Respostas do Claude demoram muito
- PC parece lento enquanto usa o Claude Code
- Qualquer menção a performance, lag, lentidão

## 1. Diagnóstico Rápido (Health_Check.Py)

Rode SEMPRE como primeiro passo:

```bash
python C:\Users\renat\skills\claude-monitor\scripts\health_check.py
```

O script analisa em ~3 segundos:
- **CPU**: Uso atual e por core. >80% = gargalo provável
- **RAM**: Total, usada, disponível. >85% = pressão de memória
- **Browsers**: Processos e RAM por browser. >5GB total = excesso de abas
- **Claude Code**: Processos e RAM consumida
- **Disco**: Espaço livre. <10% = impacto em swap/performance
- **Rede**: Latência ao endpoint da API Claude
- **Diagnóstico**: Classificação automática do problema com sugestões

## 2. Interpretar O Resultado

O script retorna um JSON com `diagnosis` contendo:

- `bottleneck`: "cpu" | "ram" | "browsers" | "disk" | "network" | "claude_api" | "ok"
- `severity`: "critical" | "warning" | "ok"
- `suggestions`: Lista de ações recomendadas
- `summary`: Resumo em português para mostrar ao usuário

**Mostre o `summary` ao usuário** e ofereça executar as sugestões.

## 3. Ações Corretivas Automáticas

Baseado no diagnóstico, ofereça ao usuário:

#### Se CPU alta (>80%):
- Listar processos consumindo mais CPU
- Sugerir fechar processos pesados desnecessários
- Verificar se Windows Update está rodando em background

#### Se browsers pesados (>5GB RAM ou >40 processos):
```bash
python C:\Users\renat\skills\claude-monitor\scripts\health_check.py --browsers-detail
```
Mostra RAM por browser e sugere quais fechar. **Nunca fechar processos sem permissão explícita do usuário.**

#### Se disco cheio (>85%):
- Mostrar pastas maiores
- Sugerir limpeza de Temp, cache de browsers, lixeira

#### Se rede lenta (latência >500ms):
- Testar conexão com api.anthropic.com
- Sugerir verificar VPN, proxy, ou conexão WiFi

## 4. Monitor Contínuo (Opcional)

Se o usuário quiser monitoramento em background:

```bash
python C:\Users\renat\skills\claude-monitor\scripts\monitor.py --interval 30 --duration 300
```

Parâmetros:
- `--interval`: Segundos entre cada amostra (default: 30)
- `--duration`: Duração total em segundos (default: 300 = 5 min)
- `--output`: Caminho do arquivo de log (default: monitor_log.json)
- `--alert-cpu`: Threshold de CPU para alerta (default: 80)
- `--alert-ram`: Threshold de RAM % para alerta (default: 85)

O monitor salva snapshots periódicos e gera um relatório ao final com:
- Picos de CPU e RAM
- Tendência (melhorando/piorando/estável)
- Eventos de alerta detectados
- Recomendação final

## 5. Benchmark Da Api Claude (Opcional)

Para testar se a lentidão é da API:

```bash
python C:\Users\renat\skills\claude-monitor\scripts\api_bench.py
```

Mede o tempo de resposta do processo Claude Code local (não faz chamadas à API).
Compara com tempos típicos e indica se está dentro do esperado.

## Thresholds De Referência

| Métrica | OK | Warning | Critical |
|---------|-----|---------|----------|
| CPU % | <60% | 60-85% | >85% |
| RAM usada % | <70% | 70-85% | >85% |
| RAM browsers | <3 GB | 3-6 GB | >6 GB |
| Processos browser | <30 | 30-60 | >60 |
| Disco livre | >15% | 10-15% | <10% |
| Latência rede | <200ms | 200-500ms | >500ms |

## Dicas Para O Usuário

Quando apresentar o diagnóstico, inclua estas dicas contextuais:

- **Muitas abas = muito CPU/RAM**: Cada aba de browser é um processo separado.
  50 abas = 50 processos competindo por recursos.
- **Claude Code é pesado**: Ele roda vários processos Electron. É normal consumir 3-5 GB.
  Mas se estiver usando >6 GB com várias sessões, considere fechar sessões antigas.
- **Troca de sessão lenta**: Geralmente causada por CPU alta ou muitos processos competindo.
  A sessão precisa carregar o histórico da conversa, e se o CPU está ocupado, demora.
- **Disco quase cheio**: Afeta a velocidade do swap (memória virtual) e pode causar
  lentidão generalizada.

## Dependências

- Python 3.10+
- psutil (instalado automaticamente pelo script se não disponível)
- Nenhuma API key necessária

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
