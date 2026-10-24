# Setup Guide — Stable Diffusion Skill

## 1. Criar Conta na Stability AI

1. Acesse **https://platform.stability.ai**
2. Clique em **Sign Up** (ou Login se ja tem conta)
3. Pode usar Google, GitHub ou email/senha
4. Verifique os termos e precos atuais da API. Licencas de pesos/modelos e creditos de API sao produtos diferentes.

## 2. Obter API Key

1. Apos login, va para **Account** > **API Keys** (ou acesse direto: https://platform.stability.ai/account/keys)
2. Clique em **Create API Key**
3. De um nome (ex: "claude-skills")
4. Copie a key gerada (comeca com `sk-`)

## 3. Configurar a Key

Edite o arquivo `.env` na raiz da skill (`stability-ai/.env`):

```
STABILITY_API_KEY=sk-sua-chave-aqui
```

Alternativa: exportar como variavel de ambiente:

```bash
export STABILITY_API_KEY="sk-sua-chave-aqui"
```

## 4. Instalar Dependencias

```bash
cd stability-ai
pip install -r scripts/requirements.txt
```

Unica dependencia externa: **Pillow** (manipulacao de imagens).
As chamadas HTTP usam `urllib` (stdlib do Python).

## 5. Testar Conexao

```bash
python scripts/generate.py --list-models
```

Este comando imprime apenas a configuracao local; nao usa a chave nem testa a conexao. So uma chamada autorizada a API pode verificar acesso, e pode consumir creditos.

## 6. Primeira Geracao

```bash
python scripts/generate.py --prompt "a beautiful sunset over mountains" --mode generate
```

A imagem sera salva em `data/outputs/`.

## Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se a key esta correta no `.env`
- Verifique se nao ha espacos extras na key
- Gere uma nova key no dashboard

### Erro 402 (Payment Required)
- Sua conta pode ter excedido limites de credito
- A API hospedada requer creditos conforme as regras atuais da conta.
- Verifique o dashboard para status

### Erro 429 (Rate Limited)
- Verifique o rate limit atual da conta/documentacao oficial
- O script ja faz retry automatico com backoff
- Se persistir, aguarde alguns minutos

### Erro 400 (Bad Request)
- Verifique se o prompt nao esta vazio
- Verifique se o aspect ratio e valido (use `--list-models` para ver opcoes)
- Para img2img/inpaint, verifique se o arquivo de imagem existe

### Imagem nao salva
- Verifique permissoes de escrita em `data/outputs/`
- O diretorio e criado automaticamente, mas pode falhar em ambientes restritos

## Rate Limits Detalhados

| Plano | Requests/10s | Modelos |
|-------|-------------|---------|
| API hospedada | Depende da conta/servico | Verificar disponibilidade atual |

## Seguranca

- A key nunca e logada ou exibida em outputs
- Verifique que `.env` e outputs privados estao ignorados antes de escrever segredos; nunca committar credenciais.
- Limite diario configuravel: `SAFETY_MAX_IMAGES_PER_DAY=100` (env var)
- Contador diario em `data/daily_counter.json`
