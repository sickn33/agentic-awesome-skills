# Tipos de Conta Instagram — Business vs Creator

## Comparação

| Feature | Personal | Creator | Business |
|---------|----------|---------|----------|
| Graph API | Sem acesso | Acesso completo | Acesso completo |
| Publicar via API | Proibido | Sim | Sim |
| Insights de mídia | Proibido | Sim | Sim |
| Insights de conta | Proibido | Sim | Sim |
| DMs via API | Proibido | Sim | Sim |
| Comentários via API | Proibido | Sim | Sim |
| Agendamento nativo API | Proibido | Limitado | Sim |
| Hashtag search | Proibido | Sim | Sim |
| Shopping/Catalog | Proibido | Proibido | Sim |
| Facebook Page link | Não necessário | Opcional | Obrigatório |

## Quando Usar Cada Tipo

### Business
Recomendado para:
- Empresas, lojas, marcas
- Precisa de agendamento nativo via API
- Quer usar Shopping/Catalog
- Já tem Facebook Page da empresa

### Creator
Recomendado para:
- Influenciadores, artistas, criadores de conteúdo
- Indivíduos que querem analytics
- Não quer vincular a uma Facebook Page obrigatoriamente

### Personal
**Não suportada pela Graph API.** Migração necessária.

## Migração: Personal → Business/Creator

### Pré-requisitos
1. Conta Instagram ativa
2. Para Business: Facebook Page vinculada (pode criar uma nova)
3. Para Creator: não precisa de Page (opcional)

### Passo a Passo (no app Instagram)

#### Para Business:
1. Abrir Instagram → Configurações
2. Conta → Mudar tipo de conta profissional
3. Escolher "Empresa"
4. Selecionar categoria do negócio
5. Vincular a uma Facebook Page (ou criar nova)
6. Confirmar

#### Para Creator:
1. Abrir Instagram → Configurações
2. Conta → Mudar tipo de conta profissional
3. Escolher "Criador de conteúdo"
4. Selecionar categoria
5. Confirmar

### O que acontece na migração
- **Preservado:** Posts, followers, following, DMs, bio
- **Adicionado:** Insights, botões de contato, categoria
- **Mudança:** Perfil público (se era privado, será convertido)

### Reversão
É possível voltar para Personal, mas:
- Perde acesso à API imediatamente
- Perde histórico de insights
- Posts e followers permanecem

## Migração: Business ↔ Creator

Também é possível alternar entre Business e Creator:
1. Configurações → Conta → Mudar tipo de conta
2. Escolher o outro tipo profissional
3. Histórico de insights pode ser reiniciado

## Detecção Automática (account_setup.py)

O script `account_setup.py --check` detecta o tipo via:
```
GET /me?fields=account_type
```

Possíveis valores: `BUSINESS`, `MEDIA_CREATOR`, `PERSONAL`

Se `PERSONAL`, guia o usuário pela migração com `--guide`.

## Vinculação com Facebook Page

### Por que é necessária (Business)
- A Graph API acessa o Instagram via Facebook Pages API
- O token OAuth autoriza a Page, que dá acesso à conta IG vinculada
- Sem Page vinculada → sem acesso API

### Fluxo de descoberta (auth.py)
```
1. GET /me/accounts → lista Facebook Pages do usuário
2. Para cada Page: GET /{page-id}?fields=instagram_business_account
3. Retorna o IG user ID vinculado
```

### Conta Creator sem Page
Contas Creator podem funcionar sem Page, mas o fluxo de autenticação
ainda precisa de pelo menos uma Page para o OAuth funcionar. Recomendação:
criar uma Page básica (não precisa de conteúdo) apenas para a vinculação.
