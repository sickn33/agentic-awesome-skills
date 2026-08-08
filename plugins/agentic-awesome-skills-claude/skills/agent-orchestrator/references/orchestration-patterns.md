# Padroes de Orquestracao Multi-Skill

Guia detalhado para coordenar multiplos skills em workflows complexos.

---

## 1. Pipeline Sequencial

Output de um skill alimenta o input do proximo.

### Quando Usar
- Mix de skills "produtoras" (data-extraction, government-data, analytics) e "consumidoras" (messaging, social-media, content-management)
- A tarefa tem etapas distintas: coletar -> processar -> entregar

### Fluxo
```
user_query -> Skill A (produtora) -> dados -> Skill B (consumidora) -> resultado
```

### Exemplo Concreto
**Solicitacao:** "Coletar precos de leiloeiros de SP e enviar por WhatsApp"
```
1. junta-leiloeiros: Executar scraper para SP, exportar dados
2. whatsapp-cloud-api: Formatar dados como mensagem e enviar
```

### Regras de Contexto
- O output de cada step deve ser passado como contexto para o proximo
- Formatos comuns de passagem: JSON, tabela Markdown, texto resumido
- Se um step falhar, interromper o pipeline e reportar ao usuario

---

## 2. Execucao Paralela

Skills trabalham independentemente em aspectos diferentes.

### Quando Usar
- Todas as skills tem o mesmo papel (todas produtoras OU todas consumidoras)
- Os aspectos da tarefa sao independentes entre si
- Nao ha dependencia de dados entre skills

### Fluxo
```
              ┌─> Skill A ─> output A ─┐
user_query ──>├─> Skill B ─> output B ─├──> resultado agregado
              └─> Skill C ─> output C ─┘
```

### Exemplo Concreto
**Solicitacao:** "Publicar a promocao no Instagram e enviar por WhatsApp"
```
1. (paralelo) instagram: Criar e publicar post da promocao
1. (paralelo) whatsapp-cloud-api: Enviar mensagem da promocao
-> Agregar: reportar status de ambas as publicacoes
```

### Regras de Contexto
- Cada skill recebe a query original completa
- Os outputs sao agregados em uma resposta unificada
- Se um skill falhar, os outros continuam normalmente
- Reportar sucesso/falha de cada skill individualmente

---

## 3. Primario + Suporte

Uma skill principal lidera; outras fornecem dados de apoio.

### Quando Usar
- Uma skill tem score de relevancia muito superior (>= 2x a proxima)
- A tarefa principal e clara, mas pode se beneficiar de dados adicionais
- Skills de suporte sao opcionais / "nice to have"

### Fluxo
```
user_query -> Skill A (primaria) ──────────────> resultado
                  ↑
              Skill B (suporte) ─> dados extras
```

### Exemplo Concreto
**Solicitacao:** "Configurar chatbot WhatsApp para responder com dados de leiloeiros"
```
1. (primaria) whatsapp-cloud-api: Configurar webhook e logica do chatbot
2. (suporte) junta-leiloeiros: Fornecer endpoint/dados para o chatbot consultar
```

### Regras de Contexto
- A skill primaria conduz o workflow
- Skills de suporte sao consultadas sob demanda
- Se skill de suporte falhar, a primaria deve continuar (graceful degradation)

---

## Tratamento de Erros

### Regras Gerais
1. **Falha em skill individual**: Reportar ao usuario qual skill falhou e por que
2. **Falha em pipeline**: Interromper e mostrar ate onde chegou
3. **Falha parcial em paralelo**: Continuar com as demais, reportar falha(s)
4. **Skill incomplete**: Avisar que a skill esta com status incompleto antes de tentar usa-la

### Fallback
- Se uma skill falha, verificar se outra skill tem capacidade similar
- Se nao houver alternativa, operar sem a skill e informar o usuario

---

## Serializacao de Contexto

Formato padrao para passar dados entre skills:

```json
{
  "source_skill": "web-scraper",
  "target_skill": "whatsapp-cloud-api",
  "data_type": "table",
  "data": [
    {"nome": "Joao Silva", "uf": "SP", "registro": "12345"},
    {"nome": "Maria Santos", "uf": "RJ", "registro": "67890"}
  ],
  "metadata": {
    "total_items": 2,
    "collected_at": "2026-02-25T12:00:00",
    "query": "leiloeiros de SP e RJ"
  }
}
```
