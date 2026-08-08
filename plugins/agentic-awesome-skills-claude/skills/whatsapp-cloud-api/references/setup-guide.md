# Guia Completo de Setup - WhatsApp Business Cloud API

> Do zero absoluto ate o envio da primeira mensagem em producao.
> Tempo estimado: 1-2 horas (sem verificacao de negocio) | 3-7 dias (com verificacao)

---

## Pre-requisitos

- Email valido (preferencialmente corporativo)
- Documento de identidade pessoal
- Numero de telefone que **NAO esteja registrado** no WhatsApp pessoal
- CNPJ ou documento da empresa (para verificacao de negocio)
- Navegador atualizado (Chrome recomendado)

---

## Passo 1 - Criar Conta no Meta Business Suite

### URL
```
https://business.facebook.com/overview
```

### Procedimento

1. Acesse `https://business.facebook.com/overview`
2. Clique em **"Criar conta"**
3. Se voce ja tem Facebook pessoal, faca login primeiro. Caso contrario, sera pedido para criar um
4. Preencha os campos:
   - **Nome da empresa**: Use o nome oficial/fantasia do seu negocio
   - **Seu nome**: Nome do administrador da conta
   - **Email comercial**: Preferencialmente email corporativo (ex: `contato@suaempresa.com.br`)
5. Clique em **"Enviar"**
6. Acesse seu email e clique no link de confirmacao enviado pela Meta
7. Apos confirmar, voce sera redirecionado ao painel do Meta Business Suite

### Erros Comuns

| Erro | Solucao |
|------|---------|
| "Este email ja esta associado a outra conta" | Use outro email ou recupere o acesso da conta existente em `business.facebook.com/settings` |
| "Nao foi possivel criar a conta" | Desative extensoes de bloqueio de anuncios (uBlock, AdBlock) e tente novamente |
| Nao recebeu email de confirmacao | Verifique pasta de spam. Tente reenviar apos 5 minutos. Se persistir, use outro email |
| Conta bloqueada imediatamente apos criacao | Conta nova em perfil Facebook recente pode ser flagrada. Aguarde 24h e tente novamente |

### Pronto

Voce deve ter:
- Acesso ao painel em `business.facebook.com`
- Um **Business ID** visivel em `Business Settings > Business Info` (numero tipo `123456789012345`)
- Email confirmado

---

## Passo 2 - Criar App no Meta for Developers

### URL
```
https://developers.facebook.com/apps
```

### Procedimento

1. Acesse `https://developers.facebook.com/apps`
2. Se for sua primeira vez, clique em **"Comecar"** e aceite os termos de desenvolvedor
3. Clique no botao **"Criar aplicativo"**
4. Selecione o tipo de app: **"Empresa"** (Business)
   - NAO selecione "Nenhum", "Consumidor" ou "Jogos"
5. Preencha:
   - **Nome do aplicativo**: Ex: `MeuApp WhatsApp API`
   - **Email de contato**: Seu email corporativo
   - **Conta empresarial**: Selecione a conta criada no Passo 1
6. Clique em **"Criar aplicativo"**
7. Pode ser solicitado que voce digite sua senha do Facebook novamente

### Erros Comuns

| Erro | Solucao |
|------|---------|
| "Voce atingiu o limite de aplicativos" | Contas novas tem limite. Delete apps de teste antigos em `developers.facebook.com/apps` |
| Tipo "Empresa" nao aparece | Certifique-se de que sua conta Business foi criada corretamente no Passo 1 |
| "Conta empresarial nao encontrada" | Volte ao Passo 1 e verifique se a conta Business esta ativa. Tente vincular manualmente em Business Settings > Accounts > Apps |
| Erro de permissao ao criar | Verifique se voce e administrador da conta Business |

### Pronto

Voce deve ter:
- App criado e visivel em `developers.facebook.com/apps`
- Um **App ID** (numero tipo `1234567890123456`)
- Status do app como **"Em desenvolvimento"**

---

## Passo 3 - Adicionar Produto WhatsApp

### URL
```
https://developers.facebook.com/apps/{SEU_APP_ID}/dashboard/
```

### Procedimento

1. No painel do seu app, role a pagina ate a secao **"Adicionar produtos ao seu aplicativo"**
2. Localize o card **"WhatsApp"** e clique em **"Configurar"**
3. Aceite os **Termos de Servico do WhatsApp Business**
4. Selecione a **Conta empresarial** vinculada (a mesma do Passo 1)
5. Clique em **"Continuar"**
6. Voce sera redirecionado para o painel do WhatsApp dentro do seu app

### Erros Comuns

| Erro | Solucao |
|------|---------|
| Card do WhatsApp nao aparece | Verifique se o tipo do app e "Empresa". Se nao for, crie um novo app com o tipo correto |
| "Voce nao tem permissao" | Confirme que voce e admin da conta Business vinculada |
| Termos de servico nao carregam | Limpe o cache do navegador ou tente em aba anonima |
| "WhatsApp Business Account could not be created" | Sua conta Business pode ter restricoes. Verifique notificacoes em `business.facebook.com` |

### Pronto

Voce deve ter:
- Menu lateral com opcao **"WhatsApp > Configuracao"** (ou "Getting Started")
- Uma **WhatsApp Business Account (WABA)** criada automaticamente
- Acesso a pagina de Getting Started do WhatsApp

---

## Passo 4 - Obter Phone Number ID e WABA ID

### URL
```
https://developers.facebook.com/apps/{SEU_APP_ID}/whatsapp-business/wa-dev-console/
```

### Procedimento

1. No menu lateral do seu app, clique em **"WhatsApp" > "Configuracao da API"** (ou "API Setup")
2. Na secao **"Informacoes do numero de telefone"**, voce encontrara:
   - **Phone Number ID**: Identificador unico do numero (ex: `109876543210987`)
   - **WhatsApp Business Account ID (WABA ID)**: Identificador da conta Business do WhatsApp (ex: `102345678901234`)
3. Anote ambos os valores. Voce vai precisar deles para todas as chamadas de API

### Onde encontrar cada ID

```
App Dashboard
  └── WhatsApp
       └── Configuracao da API (API Setup)
            ├── Phone Number ID .... campo "Phone number ID" ou "ID do numero"
            └── WABA ID ........... campo "WhatsApp Business Account ID"
```

Alternativa para o WABA ID:
```
https://business.facebook.com/settings/whatsapp-business-accounts/
```
O ID aparece na URL ao clicar na conta ou na coluna de detalhes.

### Erros Comuns

| Erro | Solucao |
|------|---------|
| Phone Number ID nao aparece | Certifique-se de que completou o Passo 3. Tente recarregar a pagina |
| WABA ID nao visivel | Acesse via Business Settings > Accounts > WhatsApp Business Accounts |
| Valores diferentes em paginas diferentes | Use sempre os IDs que aparecem na pagina de API Setup do seu app |
| "No phone numbers" | O numero de teste ainda nao foi provisionado. Aguarde alguns minutos e recarregue |

### Pronto

Voce deve ter anotado:
- **Phone Number ID**: `___________________________`
- **WABA ID**: `___________________________`
- **App ID**: `___________________________` (do Passo 2)

---

## Passo 5 - Gerar Token Temporario de Teste

### URL
```
https://developers.facebook.com/apps/{SEU_APP_ID}/whatsapp-business/wa-dev-console/
```

### Procedimento

1. Na pagina **"Configuracao da API"** (API Setup), localize a secao **"Token de acesso temporario"**
2. Clique em **"Gerar token de acesso"** (ou o botao ao lado do campo de token)
3. Pode ser solicitado login adicional ou confirmacao
4. O token sera exibido - **copie imediatamente**

### Sobre o Token Temporario

```
IMPORTANTE:
- Expira em 24 horas (algumas vezes em 1 hora)
- Serve APENAS para testes iniciais
- NAO use em producao
- Para token permanente, veja o Passo 9
```

### Testando o token via cURL

```bash
curl -X GET \
  "https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer {SEU_TOKEN_TEMPORARIO}"
```

Resposta esperada (resumida):
```json
{
  "id": "109876543210987",
  "display_phone_number": "+1 555-XXX-XXXX",
  "verified_name": "Seu Nome de Teste"
}
```

### Erros Comuns

| Erro | Solucao |
|------|---------|
| Token nao aparece apos clicar | Desative pop-up blockers. Tente em outro navegador |
| "Error validating access token" | Token expirou. Gere um novo |
| "Invalid OAuth access token" | Copie o token novamente, sem espacos extras no inicio/fim |
| Botao de gerar desabilitado | Verifique se o produto WhatsApp foi adicionado corretamente (Passo 3) |

### Pronto

Voce deve ter:
- Um **access token temporario** copiado e salvo em local seguro
- Confirmacao via cURL de que o token funciona

---

## Passo 6 - Testar com Numero de Teste (Sandbox)

### URL
```
https://developers.facebook.com/apps/{SEU_APP_ID}/whatsapp-business/wa-dev-console/
```

### Procedimento

A Meta fornece um **numero de teste** para que voce envie mensagens sem precisar de um numero real.

1. Na pagina de API Setup, localize a secao **"Enviar e receber mensagens"**
2. O campo **"De"** ja deve mostrar o numero de teste da Meta
3. Na secao **"Para"**, clique em **"Gerenciar lista de numeros de telefone"** (ou "Manage phone number list")
4. Clique em **"Adicionar numero de telefone"**
5. Digite o numero do destinatario com codigo do pais (ex: `+5511999998888`)
6. Voce recebera um **codigo de verificacao via WhatsApp** nesse numero
7. Insira o codigo para confirmar
8. Agora envie a mensagem de teste clicando em **"Enviar mensagem"**

### Enviando via cURL

```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer {SEU_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999998888",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

Resposta esperada:
```json
{
  "messaging_product": "whatsapp",
  "contacts": [
    {
      "input": "5511999998888",
      "wa_id": "5511999998888"
    }
  ],
  "messages": [
    {
      "id": "wamid.XXXXXXXXXXXXXXXX"
    }
  ]
}
```

### Limitacoes do Sandbox

- Maximo de **5 numeros de destinatario** cadastrados
- Apenas templates pre-aprovados (como `hello_world`)
- Numero remetente e o numero de teste da Meta (nao personalizavel)
- Mensagens podem demorar ate 1 minuto para chegar

### Erros Comuns

| Erro | Solucao |
|------|---------|
| `131030` - "User's phone number is part of an experiment" | Numero do destinatario pode ter restricao. Tente outro numero |
| `131026` - "Message failed to send" | Verifique se o numero do destinatario tem WhatsApp ativo |
| `100` - "Invalid parameter" | Confira o formato do numero: apenas digitos, com codigo do pais, sem `+` no JSON |
| `130429` - "Rate limit hit" | Aguarde 1 minuto e tente novamente. Sandbox tem limites rigorosos |
| Codigo de verificacao nao chega | O numero destino deve ter WhatsApp instalado e ativo |
| Template `hello_world` nao encontrado | Verifique se o idioma esta como `en_US`. Esse template vem pre-instalado |

### Pronto

Voce deve ter:
- Recebido a mensagem de teste no WhatsApp do destinatario
- Um `message_id` (wamid) retornado pela API
- Confianca de que a API esta funcionando corretamente

---

## Passo 7 - Adicionar Numero de Telefone Real

### URL
```
https://business.facebook.com/settings/whatsapp-business-accounts/{WABA_ID}/phone-numbers
```

Ou via App Dashboard:
```
https://developers.facebook.com/apps/{SEU_APP_ID}/whatsapp-business/wa-dev-console/
```

### Pre-requisito Critico

```
O numero de telefone que voce vai adicionar:
  - NAO pode estar registrado no WhatsApp pessoal
  - NAO pode estar registrado no WhatsApp Business App
  - DEVE ser capaz de receber SMS ou chamada de voz
  - PODE ser fixo (verificacao por chamada) ou movel (SMS ou chamada)

Se o numero esta no WhatsApp pessoal:
  1. Abra o WhatsApp no celular
  2. Va em Configuracoes > Conta > Excluir conta
  3. Confirme a exclusao
  4. Aguarde 5 minutos antes de prosseguir
```

### Procedimento

1. Na pagina de API Setup, clique em **"Adicionar numero de telefone"** (ou va pela URL do Business Settings)
2. Preencha as informacoes do perfil comercial:
   - **Nome de exibicao**: Nome que aparecera no WhatsApp (ex: `Minha Empresa`)
   - **Categoria**: Selecione a categoria do seu negocio
   - **Descricao** (opcional): Breve descricao da empresa
3. Clique em **"Proximo"**
4. Digite o numero com codigo do pais: `+55 11 99999-8888`
5. Selecione o metodo de verificacao (Passo 8)

### Regras do Nome de Exibicao

- Deve representar sua empresa de forma clara
- Nao pode conter apenas caracteres genericos ("Teste", "Admin")
- Nao pode violar marcas registradas
- Deve ter entre 3 e 512 caracteres
- A Meta pode rejeitar e pedir alteracao

### Erros Comuns

| Erro | Solucao |
|------|---------|
| "Este numero ja esta registrado" | O numero ainda esta no WhatsApp pessoal. Exclua a conta conforme descrito acima e aguarde |
| "Numero invalido" | Use formato internacional completo com codigo do pais |
| "Nome de exibicao rejeitado" | Use o nome oficial da empresa. Evite abreviacoes excessivas |
| "Limite de numeros atingido" | Contas nao verificadas podem ter apenas 2 numeros. Complete o Passo 10 |
| Numero fixo nao aceito | Numeros fixos sao aceitos. Selecione "Chamada de voz" como metodo de verificacao |

### Pronto

Voce deve ter:
- Numero adicionado na lista de telefones da WABA
- Proximo passo: verificacao via OTP (Passo 8)

---

## Passo 8 - Verificar Numero via OTP

### Procedimento

Continuando diretamente do Passo 7:

1. Selecione o metodo de verificacao:
   - **Mensagem de texto (SMS)**: Recomendado para numeros moveis
   - **Chamada de voz**: Necessario para numeros fixos
2. Clique em **"Enviar codigo"**
3. Aguarde receber o codigo de 6 digitos
4. Digite o codigo no campo de verificacao
5. Clique em **"Verificar"**

### Verificacao via API (alternativa)

Solicitar codigo:
```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/request_code" \
  -H "Authorization: Bearer {SEU_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "code_method": "SMS",
    "language": "pt_BR"
  }'
```

Confirmar codigo:
```bash
curl -X POST \
  "https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/verify_code" \
  -H "Authorization: Bearer {SEU_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456"
  }'
```

### Erros Comuns

| Erro | Solucao |
|------|---------|
| Codigo nao chega por SMS | Tente "Chamada de voz". Verifique se o numero nao bloqueia mensagens de servicos |
| "Codigo invalido" | Verifique se digitou corretamente. Codigos expiram em 10 minutos |
| "Muitas tentativas" | Aguarde 1 hora antes de tentar novamente. Limite de tentativas por periodo |
| Chamada de voz nao chega | Verifique se o numero aceita chamadas de numeros internacionais |
| "Phone number verification failed" | Certifique-se de que o numero nao esta em outro WhatsApp Business Account |

### Pronto

Voce deve ter:
- Numero com status **"Verificado"** (ou "Connected") no painel
- Novo **Phone Number ID** para o numero real (diferente do numero de teste)
- Capacidade de enviar mensagens usando seu proprio numero

---

## Passo 9 - Criar System User e Token Permanente

### URL
```
https://business.facebook.com/settings/system-users
```

### Por que System User?

O token temporario do Passo 5 expira rapidamente. Para producao, voce precisa de um **token permanente** vinculado a um **System User** (usuario de sistema), que nao depende de um login pessoal.

### Procedimento

#### 9.1 - Criar System User

1. Acesse `https://business.facebook.com/settings`
2. No menu lateral, clique em **"Usuarios" > "Usuarios do sistema"** (System Users)
3. Clique em **"Adicionar"**
4. Preencha:
   - **Nome**: Ex: `whatsapp-api-bot`
   - **Funcao**: Selecione **"Admin"** (necessario para permissoes completas)
5. Clique em **"Criar usuario do sistema"**

#### 9.2 - Atribuir Ativos ao System User

1. Clique no System User criado
2. Clique em **"Atribuir ativos"** (Assign Assets)
3. Selecione **"Apps"** no menu lateral
4. Encontre seu app (criado no Passo 2) e selecione-o
5. Ative **"Controle total"** (Full Control)
6. Clique em **"Salvar alteracoes"**
7. Repita para **"Contas do WhatsApp"**:
   - Selecione sua WABA
   - Ative **"Controle total"**
   - Salve

#### 9.3 - Gerar Token Permanente

1. Na pagina do System User, clique em **"Gerar novo token"**
2. Selecione o **App** (criado no Passo 2)
3. Em **"Permissoes disponíveis"**, marque:
   - `whatsapp_business_messaging` - Para enviar e receber mensagens
   - `whatsapp_business_management` - Para gerenciar conta, templates e configuracoes
4. Clique em **"Gerar token"**
5. **COPIE O TOKEN IMEDIATAMENTE** - Ele so sera exibido uma vez
6. Armazene em local seguro (gerenciador de senhas, variavel de ambiente, vault)

### Seguranca do Token

```
ATENCAO:
- O token NUNCA deve ser commitado em repositorios Git
- Use variaveis de ambiente (.env) ou servicos de secrets
- Rotacione o token periodicamente
- Se o token for comprometido, revogue imediatamente em Business Settings
```

### Testando o Token Permanente

```bash
curl -X GET \
  "https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}" \
  -H "Authorization: Bearer {TOKEN_PERMANENTE}"
```

### Erros Comuns

| Erro | Solucao |
|------|---------|
| "Usuarios do sistema" nao aparece no menu | Voce precisa ser Admin da conta Business. Verifique suas permissoes |
| Permissoes `whatsapp_*` nao aparecem na lista | O produto WhatsApp nao foi adicionado ao app (volte ao Passo 3) |
| "Insufficient permissions" ao usar o token | Verifique se os ativos (App + WABA) foram atribuidos corretamente ao System User |
| Token nao funciona apos gerar | Aguarde 1-2 minutos para propagacao. Tente novamente |
| "User does not have permission" | Confira se o System User tem funcao "Admin" e controle total nos ativos |

### Pronto

Voce deve ter:
- System User criado com nome descritivo
- Ativos (App + WABA) atribuidos com controle total
- **Token permanente** copiado e armazenado com seguranca
- Token validado via chamada de API

---

## Passo 10 - Verificacao de Negocio

### URL
```
https://business.facebook.com/settings/security
```

### Por que Verificar?

Sem verificacao de negocio:
- Limite de **250 conversas iniciadas por empresa** em periodo de 24h
- Nao pode solicitar aumento de limites
- Algumas funcionalidades ficam restritas

Com verificacao:
- Limites podem ser aumentados ate **ilimitado** (progressivamente)
- Acesso a funcionalidades avancadas
- Maior confiabilidade perante a Meta

### Procedimento

1. Acesse `https://business.facebook.com/settings`
2. No menu lateral, clique em **"Central de seguranca"** (Security Center)
3. Localize a secao **"Verificacao de negocio"** e clique em **"Comecar verificacao"**
4. Preencha os dados da empresa:
   - **Nome legal da empresa**: Conforme consta no CNPJ
   - **Endereco**: Endereco oficial da empresa
   - **Telefone da empresa**: Numero comercial
   - **Site**: URL do site da empresa
   - **CNPJ**: Numero do cadastro nacional
5. Faca upload dos **documentos comprobatorios** (pelo menos um):
   - Cartao CNPJ
   - Conta de utilidade (luz, agua) no nome da empresa
   - Extrato bancario com nome e endereco da empresa
   - Alvara de funcionamento
   - Contrato social
6. Selecione o **metodo de verificacao de contato**:
   - Email do dominio da empresa (mais rapido)
   - Telefone da empresa
   - Documento adicional
7. Clique em **"Enviar"**

### Dicas para Aprovacao Rapida

- Use email com dominio da empresa (ex: `admin@suaempresa.com.br`) em vez de Gmail/Hotmail
- Certifique-se de que o nome da empresa no cadastro Meta corresponde EXATAMENTE ao nome nos documentos
- O site da empresa deve estar ativo e acessivel
- Documentos devem ser legíveis e em formato PDF ou imagem
- Documentos devem ter menos de 90 dias de emissao (para contas e extratos)

### Prazos

| Cenario | Prazo Estimado |
|---------|---------------|
| Documentacao correta + email corporativo | 1-3 dias uteis |
| Documentacao correta + verificacao por telefone | 3-5 dias uteis |
| Documentacao incompleta / rejeicao + reenvio | 5-14 dias uteis |

### Erros Comuns

| Erro | Solucao |
|------|---------|
| "Documentos rejeitados" | Verifique se o nome no documento corresponde ao nome cadastrado. Envie documentos mais recentes |
| "Nao foi possivel verificar" | Tente outro tipo de documento. Adicione mais de um documento |
| Verificacao travada ha mais de 7 dias | Abra um ticket de suporte em `business.facebook.com/help` |
| "Dominio nao verificado" | Adicione o registro TXT de verificacao no DNS do seu dominio |
| Email de verificacao nao chega | Verifique spam. Tente o metodo por telefone |

### Pronto

Voce deve ter:
- Status de verificacao como **"Verificado"** (badge verde) no Security Center
- Acesso a limites de mensagens progressivos
- Possibilidade de escalar para 1K, 10K, 100K e ilimitado

---

## Niveis de Limite de Mensagens (Pos-Verificacao)

| Nivel | Conversas Iniciadas (24h) | Como Alcancar |
|-------|---------------------------|---------------|
| Nao verificado | 250 | Padrao inicial |
| Nivel 1 | 1.000 | Verificacao de negocio completa |
| Nivel 2 | 10.000 | Enviar 2x o limite atual em 7 dias com qualidade boa |
| Nivel 3 | 100.000 | Manter qualidade e volume |
| Nivel 4 | Ilimitado | Manter qualidade consistente |

---

## Checklist Pos-Setup

Apos completar todos os 10 passos, voce deve ter os seguintes valores. Preencha e armazene em um arquivo `.env`:

```bash
# ===================================
# WhatsApp Cloud API - Variaveis de Ambiente
# ===================================

# Passo 1 - Meta Business Suite
META_BUSINESS_ID=          # ID da conta Business (15 digitos)

# Passo 2 - App no Meta for Developers
META_APP_ID=               # ID do aplicativo
META_APP_SECRET=           # Segredo do app (em App Settings > Basic)

# Passo 4 - IDs do WhatsApp
WHATSAPP_PHONE_NUMBER_ID=  # Phone Number ID (do numero real, nao do teste)
WHATSAPP_WABA_ID=          # WhatsApp Business Account ID

# Passo 9 - Token Permanente
WHATSAPP_API_TOKEN=        # Token do System User (permanente)

# Configuracoes da API
WHATSAPP_API_VERSION=v21.0
WHATSAPP_API_URL=https://graph.facebook.com

# Webhook (configurar separadamente)
WEBHOOK_VERIFY_TOKEN=      # Token que VOCE define para validar o webhook
WEBHOOK_URL=               # URL publica do seu servidor (HTTPS obrigatorio)
```

### Validacao Final

Execute este comando para validar que tudo esta funcionando:

```bash
# Substitua as variaveis pelos seus valores reais
curl -X POST \
  "https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WHATSAPP_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "NUMERO_DESTINATARIO",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

Se voce receber um JSON com `"messages": [{"id": "wamid.XXXX"}]`, seu setup esta completo.

---

## Links Uteis

| Recurso | URL |
|---------|-----|
| Documentacao oficial | `https://developers.facebook.com/docs/whatsapp/cloud-api` |
| Referencia da API | `https://developers.facebook.com/docs/whatsapp/cloud-api/reference` |
| Status da plataforma | `https://metastatus.com` |
| Suporte Business | `https://business.facebook.com/help` |
| Comunidade de desenvolvedores | `https://developers.facebook.com/community` |
| Changelog da API | `https://developers.facebook.com/docs/whatsapp/cloud-api/changelog` |
| Guia de templates | `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates` |
| Guia de webhooks | `https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks` |

---

> **Proximo passo**: Configure os webhooks para receber mensagens. Consulte o guia de webhooks na documentacao do projeto.
