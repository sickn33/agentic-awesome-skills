# Permissões OAuth — Scopes por Feature

## Scopes Necessários

| Scope | Descrição | Features |
|-------|-----------|----------|
| `instagram_basic` | Ler perfil e mídia | Perfil, listar posts, mídia |
| `instagram_content_publish` | Publicar conteúdo | Publicar fotos, vídeos, reels, stories, carrossel |
| `instagram_manage_comments` | Gerenciar comentários | Ler, responder, deletar, ocultar comentários |
| `instagram_manage_insights` | Ler insights | Insights de mídia e conta |
| `instagram_manage_messages` | Gerenciar DMs | Enviar, receber, listar mensagens |
| `pages_show_list` | Listar Facebook Pages | Necessário para descobrir a conta IG vinculada |
| `pages_read_engagement` | Ler engajamento da Page | Necessário para algumas métricas |

## Mapeamento Feature → Scopes

### Leitura (Básico)
```
Ver perfil            → instagram_basic, pages_show_list
Listar mídia          → instagram_basic
Ver comentários       → instagram_basic
```

### Publicação
```
Publicar foto/vídeo   → instagram_content_publish, instagram_basic
Publicar reel         → instagram_content_publish, instagram_basic
Publicar story        → instagram_content_publish, instagram_basic
Publicar carrossel    → instagram_content_publish, instagram_basic
Agendar post          → instagram_content_publish, instagram_basic
```

### Comunidade
```
Responder comentário  → instagram_manage_comments
Deletar comentário    → instagram_manage_comments
Ocultar comentário    → instagram_manage_comments
Ver menções           → instagram_basic
```

### Mensagens
```
Listar conversas      → instagram_manage_messages
Ler mensagens         → instagram_manage_messages
Enviar mensagem       → instagram_manage_messages
```

### Analytics
```
Insights de mídia     → instagram_manage_insights
Insights da conta     → instagram_manage_insights
Pesquisa de hashtag   → instagram_basic
```

## Processo de Aprovação

### Desenvolvimento (Modo de Teste)
- Até 5 testers configurados no Meta App
- Todos os scopes funcionam sem aprovação
- Token de teste funciona normalmente

### Produção (App Review)
Para uso além dos testers, cada scope precisa de aprovação:

1. **instagram_basic** — Aprovação simples (uso básico)
2. **instagram_content_publish** — Requer justificativa de uso
3. **instagram_manage_comments** — Requer justificativa
4. **instagram_manage_insights** — Requer justificativa
5. **instagram_manage_messages** — Aprovação mais rigorosa (privacidade)

### Dicas para App Review
- Gravar screencast mostrando o uso
- Explicar claramente por que cada permissão é necessária
- Demonstrar que os dados são usados de forma responsável
- Para uso pessoal (1 conta), modo de teste é suficiente

## Checklist de Scopes para auth.py

O arquivo `config.py` define os scopes padrão:
```python
OAUTH_SCOPES = [
    "instagram_basic",
    "instagram_content_publish",
    "instagram_manage_comments",
    "instagram_manage_insights",
    "instagram_manage_messages",
    "pages_show_list",
    "pages_read_engagement",
]
```

Se não precisar de todas as features, pode reduzir os scopes durante o setup.
