# Catálogo de Problemas por Domínio

## Skills e Orchestrator

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| YAML inválido no SKILL.md | Alta | `python -c "import yaml; yaml.safe_load(open('SKILL.md').read())"` |
| `name` ou `description` duplicados no YAML | Média | Grep por `^name:` no arquivo — deve ter 1 ocorrência |
| skill-installer falha silenciosamente | Média | Usar `--force` e ler output completo |
| scan_registry.py bug com sets/dicts | Baixa | Atualizar registry manualmente via JSON |
| Skill no .claude mas não em skills/ | Média | Sempre instalar via skill-installer, não copiar manual |

## APIs e Integrações

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| Token/API key expirado | Alta | Verificar validade antes de executar |
| Rate limit atingido | Média | Implementar retry com backoff exponencial |
| Endpoint mudou (breaking change) | Baixa | Fixar versão da API, checar changelog antes |
| HMAC-SHA256 inválido em webhooks | Média | Testar com payload de exemplo antes de ir live |
| Credencial hardcoded commitada | Baixa mas crítica | `.env` obrigatório + `.gitignore` configurado |

## Arquivos e Paths

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| Path não existe | Alta | `os.path.exists()` antes de qualquer operação |
| Permissão negada | Média | Verificar com `os.access(path, os.W_OK)` |
| Encoding errado (pt-BR com acentos) | Alta | `open(f, encoding='utf-8')` explícito sempre |
| ZIP corrompido | Baixa | Verificar com `zipfile.is_zipfile()` após geração |
| Arquivo aberto por outro processo | Baixa | Fechar handles explicitamente com `with` |

## ZIPs e Builds do Ecossistema

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| ecosystem-completo.zip desatualizado | Alta | Executar build_ecosystem.py após cada nova skill |
| Skill numerada fora de ordem | Média | Verificar contagem total antes de atribuir número |
| ZIP muito grande (>50MB) | Baixa | Excluir __pycache__, .pyc, node_modules |

## Git

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| Commit na branch errada | Alta | `git branch --show-current` antes de commits |
| Uncommitted changes perdidos | Média | `git status` antes de operações destrutivas |
| Merge conflict | Média | `git pull --rebase` antes de push |
| Push de secrets | Baixa mas crítica | `git diff --staged` antes de commit |

## Python / Scripts

| Problema | Frequência | Solução Preventiva |
|----------|-----------|-------------------|
| ModuleNotFoundError | Alta | `pip install -r requirements.txt` primeiro |
| Python 2 vs 3 | Baixa | Usar `python3` explicitamente |
| Subprocess sem timeout | Média | Sempre `subprocess.run(..., timeout=30)` |
| JSON decode error | Média | Tratar `json.JSONDecodeError` explicitamente |
| UnicodeDecodeError | Alta | `encoding='utf-8', errors='replace'` em files |
