# Regras de Compressão e Arquivamento

## Quando Arquivar

Uma sessão é candidata a arquivamento quando:
- Está há mais de 20 sessões no passado
- Configurable via `ARCHIVE_AFTER_SESSIONS` em `config.py`

## O que Manter no Arquivo

Seções preservadas (informação durável):
- **Tópicos**: sempre mantidos
- **Decisões**: sempre mantidas (formam base de conhecimento)
- **Tarefas pendentes**: mantidas se ainda não completadas
- **Descobertas**: sempre mantidas
- **Erros resolvidos**: sempre mantidos (evita re-trabalho)

Seções removidas (informação efêmera):
- **Métricas**: tokens, contadores (dados transitórios)
- **Arquivos modificados**: detalhes granulares desnecessários a longo prazo
- **Dívida técnica**: frequentemente já resolvida

## Consolidação de Arquivo

Quando `archive/` acumula 5+ sessões individuais, elas são consolidadas
em um único `ARCHIVE_YYYY.md` com formato ultra-compacto:

```markdown
# Arquivo Consolidado — 2026

### Sessão 001 — 2026-01-15
  - Decisão sobre arquitetura
  - Decisão sobre banco de dados

### Sessão 002 — 2026-01-20
  - Decisão sobre API
```

Apenas cabeçalhos e decisões são mantidos na consolidação.

## Manutenção do ACTIVE_CONTEXT.md

Para manter o limite de 150 linhas:

1. **Tarefas completadas**: removidas automaticamente ao salvar nova sessão
2. **Decisões antigas**: podadas após 30 dias (configurable)
3. **Sessões recentes**: mantidas apenas as últimas 5
4. **Bloqueadores resolvidos**: removidos quando não mais mencionados
5. **Convenções**: mantidas permanentemente (raramente mudam)

## Detecção de Drift

O sistema verifica se `ACTIVE_CONTEXT.md` e `MEMORY.md` estão sincronizados.
Se divergirem (edição manual, corrupção), `maintain` corrige automaticamente.

## Fluxo de Auto-Manutenção

```
maintain
  ├── Verificar sessões antigas → arquivar
  ├── Consolidar arquivo se necessário
  ├── Verificar drift ACTIVE_CONTEXT ↔ MEMORY.md → sincronizar
  └── Reindexar busca FTS5
```
