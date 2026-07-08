# Setup Walkthrough — Meta App e OAuth

## Pré-requisitos

1. Conta Instagram Business ou Creator
2. Facebook Page vinculada à conta IG (obrigatório para Business, recomendado para Creator)
3. Conta de desenvolvedor Meta (developers.facebook.com)

## Passo 1: Criar Meta App

1. Acesse [Meta for Developers](https://developers.facebook.com/apps/)
2. Clique "Create App"
3. Escolha "Business" como tipo
4. Preencha:
   - **App name**: Nome do seu app (ex: "Meu Instagram Manager")
   - **Contact email**: Seu email
   - **Business account**: Selecione ou crie
5. Clique "Create App"

## Passo 2: Adicionar Instagram API

1. No dashboard do app, vá em "Add Products"
2. Encontre "Instagram" e clique "Set Up"
3. Em "Instagram Graph API", clique "Configure"

## Passo 3: Configurar OAuth

### Redirect URI
1. Vá em Settings → Basic
2. Em "Valid OAuth Redirect URIs", adicione:
   ```
   http://localhost:8765/callback
   ```
   (Esta é a porta padrão do auth.py)

### Obter Credenciais
1. Anote o **App ID** (visível no topo do dashboard)
2. Vá em Settings → Basic → **App Secret** (clique "Show")
3. Guarde ambos — serão usados no setup

## Passo 4: Adicionar Testers (Modo de Desenvolvimento)

Em modo de desenvolvimento, apenas testers podem usar o app:

1. App Dashboard → Roles → Roles
2. Clique "Add Testers"
3. Adicione a conta Instagram que será gerenciada
4. O tester precisa aceitar o convite via Settings → Apps and Websites no Instagram

## Passo 5: Configurar Permissões

1. App Dashboard → App Review → Permissions and Features
2. Request as seguintes permissões:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_comments`
   - `instagram_manage_insights`
   - `instagram_manage_messages`
   - `pages_show_list`
   - `pages_read_engagement`

**Nota:** Em modo de desenvolvimento, permissões funcionam para testers sem aprovação formal.

## Passo 6: Executar auth.py

Com App ID e App Secret em mãos:

```bash
python C:\Users\renat\skills\instagram\scripts\auth.py --setup
```

O script vai:
1. Pedir App ID e App Secret
2. Abrir o navegador na página de autorização do Facebook
3. Você autoriza o app e as permissões
4. O navegador redireciona para `localhost:8765/callback`
5. O script captura o código, troca por token curto, depois longo
6. Descobre a conta IG vinculada via Facebook Pages API
7. Salva tudo no banco SQLite

### Resultado esperado:
```json
{
  "status": "success",
  "account": {
    "ig_user_id": "17841400000000",
    "username": "sua_conta",
    "account_type": "BUSINESS",
    "token_expires_at": "2026-04-26T..."
  }
}
```

## Passo 7: Verificar

```bash
# Verificar token e conta
python C:\Users\renat\skills\instagram\scripts\auth.py --status

# Testar leitura de perfil
python C:\Users\renat\skills\instagram\scripts\profile.py --view

# Testar listagem de mídia
python C:\Users\renat\skills\instagram\scripts\media.py --list --limit 3
```

## Troubleshooting

### "No Instagram Business Account found"
- Verifique se a conta IG é Business ou Creator (não Personal)
- Verifique se a Facebook Page está vinculada à conta IG
- Execute: `python scripts/account_setup.py --check`

### "Invalid OAuth redirect_uri"
- Confirme que `http://localhost:8765/callback` está nas Redirect URIs do app
- Verifique se não há espaço extra na URL

### "App not approved"
- Em modo de desenvolvimento, adicione seu perfil como Tester
- Para produção, submeta para App Review

### Token expirado
```bash
python C:\Users\renat\skills\instagram\scripts\auth.py --refresh
```
O token longo dura 60 dias e é renovado automaticamente quando faltam 7 dias.

### "Permission denied" (code 10/200)
- Verifique se o scope necessário foi autorizado
- Consulte `references/permissions.md` para o scope correto
- Pode ser necessário re-autorizar: `python scripts/auth.py --setup`

## Variáveis de Ambiente (Opcional)

Em vez de digitar no setup, pode usar env vars:
```bash
export INSTAGRAM_APP_ID="seu_app_id"
export INSTAGRAM_APP_SECRET="seu_app_secret"
export IMGUR_CLIENT_ID="seu_imgur_client_id"
```

O `config.py` checa env vars antes de pedir input.
