# Criterios de Analise - Skill Sentinel

## Scoring por Dimensao

Cada dimensao inicia com score 100 e sofre deducoes por violacoes encontradas.
Score final: max(0, min(100, score)).

### Qualidade de Codigo

| Criterio | Penalidade | Limiar |
|----------|-----------|---------|
| Complexidade ciclomatica > 10 | -5 por funcao | CC > 10 |
| Funcao > 50 linhas | -3 por funcao | > 50 linhas |
| Arquivo > 500 linhas | -5 por arquivo | > 500 linhas |
| Funcao publica sem docstring | -1 por funcao | Publicas (sem _) |
| Bare except | -8 por ocorrencia | `except:` |
| except Exception sem log | -3 por ocorrencia | Sem logging |
| Erro de sintaxe | -15 por arquivo | SyntaxError |

### Seguranca

| Criterio | Penalidade |
|----------|-----------|
| Secret hardcoded (critical) | -20 |
| SQL injection (high) | -15 |
| Token em log (high) | -10 |
| URL HTTP insegura (medium) | -5 |
| Input validation fraca (low) | -2 |
| Bonus: modulo auth | +5 |
| Bonus: usa env vars | +5 |

### Performance

| Criterio | Penalidade |
|----------|-----------|
| Sem retry/backoff | -10 |
| Sem timeout | -5 |
| Sem connection reuse | -3 |
| N+1 query | -8 |
| Conexao em loop | -5 |
| Bonus: retry | +5 |
| Bonus: async/concurrency | +5 |
| Bonus: caching | +3 |

### Governanca

Score direto baseado no nivel de maturidade:
- Nivel 0 (nenhuma): 0 pts
- Nivel 1 (action log): 25 pts
- Nivel 2 (+ rate limit): 50 pts
- Nivel 3 (+ confirmacoes): 75 pts
- Nivel 4 (+ alertas): 100 pts

### Documentacao

| Criterio | Penalidade |
|----------|-----------|
| Sem campo name no frontmatter | -20 |
| Sem campo description | -20 |
| Sem campo version | -3 |
| Triggers fracas (< 10 palavras) | -10 |
| Secao recomendada faltando | -3 cada |
| References vazio | -5 |
| SKILL.md < 20 linhas | -10 |

### Dependencias

| Criterio | Penalidade |
|----------|-----------|
| Sem requirements.txt | -15 |
| Versao nao pinada | -2 por dep |
| Dep importada nao listada | -2 por dep |

## Score Composto

```
overall = sum(score_dimensao * peso_dimensao) / sum(pesos)
```

Pesos padrao:
- code_quality: 0.20
- security: 0.20
- performance: 0.15
- governance: 0.15
- documentation: 0.15
- dependencies: 0.15

## Labels

| Range | Label |
|-------|-------|
| 90-100 | Excelente |
| 75-89 | Bom |
| 50-74 | Adequado |
| 25-49 | Precisa melhorar |
| 0-24 | Critico |
