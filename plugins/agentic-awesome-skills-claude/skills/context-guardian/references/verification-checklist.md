# Checklist de Verificacao e Redundancia

## Principio Fundamental

Em projetos tecnicos complexos, a perda de um unico detalhe pode causar horas de
re-trabalho. Este checklist garante que a extracao pre-compactacao esta completa
e consistente. Execute CADA item — nao pule nenhum.

## Verificacao de Completude

### Arquivos

```
□ Cada arquivo criado nesta sessao esta listado com caminho absoluto
□ Cada arquivo modificado tem a natureza exata da modificacao
□ Nenhum arquivo foi esquecido (verificar tool calls de Write/Edit/Read)
□ Caminhos usam barras corretas para o OS (\ no Windows)
```

### Decisoes

```
□ Toda decisao tecnica tem um "por que" documentado
□ Alternativas descartadas estao registradas
□ Nenhuma decisao contradiz outra decisao listada
□ Decisoes que REVERTEM decisoes anteriores estao marcadas como tal
```

### Bugs e Correcoes

```
□ Cada bug tem: sintoma, causa raiz, correcao, arquivo afetado
□ A correcao foi verificada (teste rodou, output confirmou)
□ Nenhum bug "parcialmente corrigido" — se nao terminou, esta em pendentes
□ Vulnerabilidades de seguranca tem classificacao (SQLi, XSS, token leak, etc)
```

### Tarefas

```
□ Tarefas concluidas tem prova de conclusao (output, teste, verificacao)
□ Tarefas pendentes tem prioridade (P0/P1/P2) e dependencias
□ Nenhuma tarefa esta "em andamento" sem proximo passo definido
□ Tarefas bloqueadas tem motivo do bloqueio documentado
```

### Numeros e Metricas

```
□ Numeros mencionados em diferentes secoes sao consistentes
  (ex: "18/18 queries" aparece igual em progresso E em testes)
□ Contadores estao atualizados (nao usar numeros de iteracoes anteriores)
□ Tamanhos de arquivo estao em unidades consistentes
```

### Codigo

```
□ Trechos de codigo criticos estao preservados (nao dependem da memoria)
□ Numeros de linha estao corretos (verificar contra o arquivo atual)
□ Nomes de funcoes/variaveis estao exatos (sem typos)
```

## Verificacao de Consistencia Cruzada

Apos completar a extracao, fazer estas verificacoes cruzadas:

1. **Arquivo ↔ Decisao**: toda modificacao de arquivo corresponde a uma decisao?
2. **Bug ↔ Correcao ↔ Arquivo**: todo bug tem correcao e arquivo afetado?
3. **Tarefa ↔ Progresso**: tarefas completas batem com o progresso reportado?
4. **Dependencia ↔ Codigo**: dependencias criticas estao refletidas no codigo?

## Verificacao de Redundancia Tripla

Para informacoes P0 (perda fatal), verificar que aparecem em TODAS as 3 camadas:

| Informacao P0 | Snapshot | MEMORY.md | Context-Agent |
|---------------|----------|-----------|---------------|
| Decisao X     | □        | □         | □             |
| Correcao Y    | □        | □         | □             |
| Tarefa Z      | □        | □         | □             |

Se qualquer informacao P0 estiver em menos de 2 camadas, corrigir antes de prosseguir.

## Red Flags (parar e re-extrair)

Se detectar QUALQUER um destes, a extracao esta incompleta:

- "Acho que fizemos algo com X, mas nao lembro exatamente..."
- Numeros inconsistentes entre secoes
- Arquivo mencionado sem caminho completo
- Decisao sem motivo ("decidimos usar X" sem "porque Y")
- Bug corrigido sem descricao da correcao
- Tarefa "concluida" sem evidencia

## Pos-Verificacao

Apos todas as verificacoes passarem:

1. Gerar snapshot com timestamp
2. Atualizar MEMORY.md com P0s ultra-compactos
3. Executar context-agent save
4. Escrever briefing de transicao como ultima mensagem

O briefing de transicao e a peca mais importante — ele fica no topo do contexto
compactado e e a primeira coisa que o proximo Claude le.
