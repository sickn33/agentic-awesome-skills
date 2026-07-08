# Rate Limits — Instagram Graph API

## Limites Principais

| Recurso | Limite | Janela | Notas |
|---------|--------|--------|-------|
| API calls gerais | 200 requests | 1 hora | Por usuário/token |
| Publicação de conteúdo | 25 posts | 24 horas | Por conta IG |
| Pesquisa de hashtags | 30 hashtags únicas | 7 dias (rolling) | Por conta IG |
| DMs (envio) | 200 mensagens | 1 hora | Human Agent messaging |
| Stories | Sem limite oficial | — | Mas recomenda-se < 25/dia |

## Como a Skill Rastreia

### Sliding Window (SQLite)
O `governance.py` usa a tabela `action_log` para contar ações dentro da janela:

```sql
-- Requests na última hora
SELECT COUNT(*) FROM action_log
WHERE account_id = ? AND created_at >= datetime('now', '-1 hour')

-- Publicações nas últimas 24h
SELECT COUNT(*) FROM action_log
WHERE account_id = ? AND action IN ('publish_photo','publish_video',...)
AND created_at >= datetime('now', '-24 hours')

-- Hashtags únicas na última semana
SELECT COUNT(DISTINCT hashtag) FROM hashtag_searches
WHERE account_id = ? AND searched_at >= datetime('now', '-7 days')
```

### Thresholds de Warning
- **80%**: Info log — "Approaching rate limit"
- **90%**: Warning — "Near rate limit, consider slowing down"
- **100%**: Block — Retorna erro com tempo de espera estimado

## Respostas de Rate Limit da API

### Erro code 4 (Application-level)
```json
{
  "error": {
    "message": "Application request limit reached",
    "type": "OAuthException",
    "code": 4
  }
}
```
**Ação:** Backoff de 1 hora. O `api_client.py` detecta e faz retry automático.

### Erro code 17 (User-level)
```json
{
  "error": {
    "message": "(#17) User request limit reached",
    "type": "OAuthException",
    "code": 17
  }
}
```
**Ação:** Backoff de 1 hora por conta.

### HTTP 429 (Too Many Requests)
Alguns endpoints retornam HTTP 429 em vez de erro JSON.
**Ação:** Respeitar header `Retry-After` se presente, senão backoff padrão.

## Estratégias de Backoff

### api_client.py — Exponential Backoff
```
Tentativa 1: espera 2s
Tentativa 2: espera 4s
Tentativa 3: espera 8s
Após 3 falhas: desiste e reporta
```

### Rate limit específico
```
Code 4/17: espera 3600s (1 hora)
Code 190 (token): fail imediato (refresh necessário)
Code 10/200 (permission): fail imediato
```

## Otimizações

### Batch Requests
Para reduzir contagem de requests, usar fields parameter para buscar múltiplos campos em uma chamada:
```
GET /me?fields=id,username,followers_count,media{id,caption,media_type,permalink}
```

### Caching Local
O `db.py` persiste dados em SQLite — evita refazer chamadas para dados recentes.

### Sync Inteligente
O `run_all.py` processa em ordem de prioridade:
1. Profile (1 request)
2. Media (1 request, batch)
3. Insights (N requests, 1 por post)
4. Comments (N requests, 1 por post)

Use `--limit` para controlar quantos posts processar por sync.

## Monitoramento

```bash
# Ver rate limit restante (estimativa baseada em logs)
python scripts/auth.py --status

# Ver ações recentes no audit log
python scripts/export.py --type actions --format json
```
