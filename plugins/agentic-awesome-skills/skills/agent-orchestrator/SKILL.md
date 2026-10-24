---
name: agent-orchestrator
description: Meta-skill que orquestra todos os agentes do ecossistema. Scan automatico de skills, match por capacidades, coordenacao de workflows multi-skill e registry management.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- orchestration
- multi-agent
- workflow
- automation
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Agent Orchestrator

## Overview

Meta-skill que orquestra todos os agentes do ecossistema. Scan automatico de skills, match por capacidades, coordenacao de workflows multi-skill e registry management.

## When to Use This Skill

- Quando o usuario pede um inventario local de skills ou um plano de coordenacao para uma tarefa com varias capacidades.
- Quando e necessario comparar candidatos explicitamente, sem executar suas instrucoes nem iniciar agentes.

## Do Not Use This Skill When

- The task is unrelated to agent orchestrator
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Meta-skill que funciona como camada central de decisao e coordenacao para todo
o ecossistema de skills. Faz varredura automatica, identifica agentes relevantes
e orquestra multiplos skills para tarefas complexas.

## Principio: Descoberta Solicitada e Plano Revisavel

- Faz varredura somente no escopo solicitado; esta skill nao deve interceptar todas as solicitacoes
- Novas skills sao detectadas na proxima varredura explicita, dentro dos roots e do limite de profundidade
- Skills removidas sao **auto-excluidas** do registry
- Execute a varredura explicitamente; o matcher nao inicia uma varredura automaticamente

---

## Workflow Para Descoberta Solicitada

Execute estes passos apenas quando a tarefa pede esta ferramenta. Scores sao heuristicas locais, nao prova de seguranca, compatibilidade ou autorizacao. Um plano nao executa skills; delegacao, mensagens e publicacao exigem autorizacao do usuario.
Os scripts localizam arquivos a partir da propria instalacao, mas os comandos abaixo pressupõem que o diretorio pai de `agent-orchestrator` seja o diretorio atual. De outro local, use o caminho absoluto do script.

## Dependencia

Use Python 3.10+ e instale `scripts/requirements.txt` em um ambiente virtual revisado; o parser requer PyYAML. Os comandos abaixo apenas inventariam metadados e produzem planos; nao executam skills.

## Passo 1: Auto-Discovery (Varredura)

```bash
python agent-orchestrator/scripts/scan_registry.py
```

Usa cache de hashes SHA-256 para reprocessar arquivos alterados. O tempo depende do tamanho da arvore; nao ha garantia de 100ms.
Retorna JSON com resumo de todos os skills encontrados.

## Passo 2: Match De Skills

```bash
python agent-orchestrator/scripts/match_skills.py "<solicitacao do usuario>"
```

Retorna JSON com skills ranqueadas por relevancia. Interpretar o resultado:

| Resultado              | Acao                                                    |
|:-----------------------|:--------------------------------------------------------|
| `matched: 0`          | Nenhum candidato acima do limite heuristico; nao prova ausencia de skills relevantes.  |
| `matched: 1`          | Um candidato. Inspecionar escopo, arquivos, dependencias e autorizacao antes de selecionar.     |
| `matched: 2+`         | Multiplos candidatos. Propor um plano somente se a tarefa pede coordenacao.      |

## Passo 3: Orquestracao (Se Matched >= 2)

```bash
python agent-orchestrator/scripts/orchestrate.py --skills skill1,skill2 --query "<solicitacao>"
```

Retorna plano de execucao com padrao, ordem dos steps e data flow entre skills.

## Passo Rapido (Atalho)

Para queries simples, os passos 1+2 podem ser combinados em sequencia:
```bash
python agent-orchestrator/scripts/scan_registry.py && python agent-orchestrator/scripts/match_skills.py "<solicitacao>"
```

---

## Skill Registry

Antes de executar, defina `AGENT_ORCHESTRATOR_DATA_DIR` como caminho absoluto de
um diretorio privado autorizado fora da instalacao da skill. Registry, hashes e
atribuicoes de projeto ficam nesse diretorio. Nao use um diretorio compartilhado
ou uma arvore com links simbolicos; inspecione o conteudo antes de reutilizar.

```bash
export AGENT_ORCHESTRATOR_DATA_DIR="<diretorio-absoluto-autorizado>"
```

Execute a varredura explicitamente antes do matcher. Falha de leitura, JSON
invalido ou registry ausente nao significa que nenhuma skill existe. Caminhos
distintos permanecem no inventario mesmo com nomes iguais; selecao por nome
ambiguo deve parar. O limite de profundidade do scanner torna o inventario parcial.

## Locais De Busca

O scanner procura SKILL.md em:
1. `.claude/skills/*/` (skills registradas no Claude Code)
2. `*/` (skills standalone no top-level)
3. Subpastas ate a profundidade 3 (cobertura parcial)

## Metadata Por Skill

Cada entrada no registry contem:

| Campo          | Descricao                                          |
|:---------------|:---------------------------------------------------|
| name           | Nome da skill (do frontmatter YAML)                |
| description    | Descricao completa (triggers inclusos)             |
| location       | Caminho absoluto do diretorio                      |
| skill_md       | Caminho absoluto do SKILL.md                       |
| registered     | Se esta em .claude/skills/ (true/false); nao prova carregamento pelo host            |
| capabilities   | Tags de capacidade (auto-extraidas + explicitas)   |
| triggers       | Keywords de ativacao extraidas da description      |
| language       | Linguagem principal (python/nodejs/bash/none)      |
| status         | active / incomplete / missing                      |

## Comandos Do Registry

```bash

## Scan Rapido (Usa Cache De Hashes)

python agent-orchestrator/scripts/scan_registry.py

## Tabela De Status Detalhada

python agent-orchestrator/scripts/scan_registry.py --status

## Re-Scan Completo (Ignora Cache)

python agent-orchestrator/scripts/scan_registry.py --force
```

---

## Algoritmo De Matching

Para cada solicitacao, o matcher pontua skills usando:

| Criterio                     | Pontos | Exemplo                               |
|:-----------------------------|:-------|:--------------------------------------|
| Nome do skill na query       | +15    | "use web-scraper" -> web-scraper      |
| Keyword trigger exata        | +10    | "scrape" -> web-scraper               |
| Categoria de capacidade      | +5     | data-extraction -> web-scraper        |
| Sobreposicao de palavras     | +1     | Palavras da query na description      |
| Boost de projeto             | +20    | Skill atribuida ao projeto ativo      |

Threshold minimo: 5 pontos. Skills abaixo disso sao ignoradas.

## Match Com Projeto

```bash
python agent-orchestrator/scripts/match_skills.py --project meu-projeto "query aqui"
```

Skills atribuidas ao projeto recebem +20 de boost automatico.

---

## Padroes De Orquestracao

Quando multiplos skills sao relevantes, o orchestrator classifica o padrao:

## 1. Pipeline Sequencial

Skills formam uma cadeia onde o output de uma alimenta a proxima.

**Quando:** Mix de skills "produtoras" (data-extraction, government-data) e "consumidoras" (messaging, social-media).

**Exemplo:** web-scraper coleta precos -> whatsapp-cloud-api envia alerta

```
user_query -> web-scraper -> whatsapp-cloud-api -> result
```

## 2. Execucao Paralela

Skills trabalham independentemente em aspectos diferentes da solicitacao.

**Quando:** Todas as skills tem o mesmo papel (todas produtoras ou todas consumidoras).

**Exemplo:** instagram publica post + whatsapp envia notificacao (ambos recebem o mesmo conteudo)

```
user_query -> [instagram, whatsapp-cloud-api] -> aggregated_result
```

## 3. Primario + Suporte

Uma skill principal lidera; outras fornecem dados de apoio.

**Quando:** Uma skill tem score muito superior as demais (>= 2x).

**Exemplo:** whatsapp-cloud-api envia mensagem (primario) + web-scraper fornece dados (suporte)

```
user_query -> whatsapp-cloud-api (primary) + web-scraper (support) -> result
```

## Detalhes em [orchestration-patterns.md](references/orchestration-patterns.md)

---

## Gerenciamento De Projetos

Atribuir skills a projetos permite boost de relevancia e contexto persistente.

## Arquivo De Projetos

```
$AGENT_ORCHESTRATOR_DATA_DIR/projects.json
```

## Operacoes

**Criar projeto:**
Adicionar entrada ao array `projects` em projects.json:
```json
{"projects": [{
  "name": "nome-do-projeto",
  "created_at": "2026-02-25T12:00:00",
  "skills": ["web-scraper", "whatsapp-cloud-api"],
  "description": "Descricao do projeto"
}]}
```

**Adicionar skill a projeto:** Atualizar o array `skills` do projeto.

**Remover skill de projeto:** Remover do array `skills`.

**Consultar skills do projeto:** Ler o projects.json e listar skills atribuidas.

---

## Adicionando Novas Skills

Para adicionar uma nova skill ao ecossistema:

1. Criar uma pasta em qualquer lugar sob `skills root:`
2. Criar um `SKILL.md` com frontmatter YAML:
```yaml
---
name: minha-nova-skill
description: "Descricao com keywords de ativacao..."
---

## Documentacao Da Skill

```
3. Execute a varredura explicita para atualizar o inventario parcial.

Opcionalmente, para discovery nativo do Claude Code:
4. Copiar o SKILL.md para `.claude/skills/<nome>/SKILL.md`

## Tags De Capacidade Explicitas (Opcional)

Adicionar ao frontmatter para matching mais preciso:
```yaml
capabilities: [data-extraction, web-automation]
```

---

## Ver Status De Todos Os Skills

```bash
python agent-orchestrator/scripts/scan_registry.py --status
```

## Interpretar Status

| Status     | Significado                                        |
|:-----------|:---------------------------------------------------|
| active     | name + description presentes; nao significa revisao, seguranca ou completude operacional          |
| incomplete | SKILL.md existe mas falta name ou description      |
| missing    | Diretorio existe mas sem SKILL.md                  |

---

## Skills Atuais Do Ecossistema

| Skill              | Capacidades                           | Status  |
|:-------------------|:--------------------------------------|:--------|
| web-scraper        | data-extraction, web-automation       | active  |
| junta-leiloeiros   | government-data, data-extraction      | active  |
| whatsapp-cloud-api | messaging, api-integration            | active  |
| instagram          | social-media, api-integration         | partial |

*Tabela ilustrativa do ecossistema original; o scanner imprime seu inventario atual, mas nao altera esta tabela. Os nomes nao garantem instalacao em AAS.*

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `multi-advisor` - Complementary skill for enhanced analysis
- `task-intelligence` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
