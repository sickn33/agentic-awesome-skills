# Setup Guide — Stable Diffusion Skill

## 1. Criar Conta na Stability AI

1. Acesse **https://platform.stability.ai**
2. Clique em **Sign Up** (ou Login se ja tem conta)
3. Pode usar Google, GitHub ou email/senha
4. A **Community License** e gratuita e automatica para uso pessoal ou empresas com faturamento < $1M/ano

## 2. Obter API Key

1. Apos login, va para **Account** > **API Keys** (ou acesse direto: https://platform.stability.ai/account/keys)
2. Clique em **Create API Key**
3. De um nome (ex: "claude-skills")
4. Copie a key gerada (comeca com `sk-`)

## 3. Configurar a Key

Edite o arquivo `.env` na raiz da skill (`stable-diffusion/.env`):

```
STABILITY_API_KEY=sk-sua-chave-aqui
```

Alternativa: exportar como variavel de ambiente:

```bash
export STABILITY_API_KEY="sk-sua-chave-aqui"
```

## 4. Instalar Dependencias

```bash
cd stable-diffusion
pip install -r scripts/requirements.txt
```

Unica dependencia externa: **Pillow** (manipulacao de imagens).
As chamadas HTTP usam `urllib` (stdlib do Python).

## 5. Testar Conexao

```bash
python scripts/generate.py --list-models
```

Se a key estiver correta, voce vera a lista de modelos disponiveis.

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
- Community License tem uso generoso mas pode ter restricoes em pico
- Verifique o dashboard para status

### Erro 429 (Rate Limited)
- Limite: 150 requests a cada 10 segundos
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
| Community | 150 | Todos SD3.5, Ultra, Core |

## Seguranca

- A key nunca e logada ou exibida em outputs
- O `.env` esta no `.gitignore` (nao committar!)
- Limite diario configuravel: `SAFETY_MAX_IMAGES_PER_DAY=100` (env var)
- Contador diario em `data/daily_counter.json`
