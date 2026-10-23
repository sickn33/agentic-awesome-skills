# Padroes de Seguranca

> Catalog review: exemplos e scores consultivos, nao prova de seguranca, cobertura total, conformidade ou autoridade de merge. Nomes e palavras-chave exigem confirmacao semantica; a ausencia de um sinal pode ser falso negativo. Estado privado fica fora da skill instalada.


## Padroes Bons (Referencia)

### Queries parametrizadas (como instagram/scripts/db.py)
```python
# BOM: usar ? como placeholder
conn.execute("SELECT * FROM posts WHERE id = ?", [post_id])
conn.execute(
    "INSERT INTO accounts (ig_user_id, username) VALUES (?, ?)",
    [ig_user_id, username]
)
```

### Variaveis de ambiente para secrets
```python
# BOM: secrets em env vars
import os
API_KEY = os.environ.get("API_KEY")
APP_SECRET = os.getenv("APP_SECRET")
```

### Token refresh com validacao
```python
# BOM: verificar expiracao antes de usar
if token_expires_at and datetime.now() >= token_expires_at:
    token = refresh_token(refresh_token_value)
```

### Rate limiting com threshold
```python
# BOM: padrão GovernanceManager
if requests_used >= LIMIT * 0.9:
    warnings.append("Proximo do limite")
if requests_used >= LIMIT:
    raise RateLimitExceeded(...)
```

## Padroes Ruins (Detectados pelo Sentinel)

### Secrets hardcoded
```python
# RUIM: secret direto no codigo
API_KEY = "sk-abc123def456"
PASSWORD = "minha_senha_123"
```

### SQL injection via f-string
```python
# RUIM: interpolacao em SQL
cursor.execute(f"SELECT * FROM users WHERE name = '{name}'")
cursor.execute("SELECT * FROM users WHERE name = '%s'" % name)
```

### URL HTTP insegura
```python
# RUIM: HTTP sem TLS
API_URL = "http://api.external.com/data"
```

### Token em log
```python
# RUIM: logando credencial
print(f"Token: {access_token}")
logging.info(f"Usando key: {api_key}")
```

### Bare except
```python
# RUIM: engolindo todos os erros
try:
    do_something()
except:
    pass
```

## Excecoes Conhecidas

Alguns valores parecem secrets mas sao publicos:
- Nao ha supressao global por substring: um ID publico numa linha nao pode esconder outra credencial.
- Exemplos sinteticos devem ser confirmados manualmente antes de descartar um alerta.
