# CLAUDE CODE EXPERT - Potencia Maxima - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Overview

Especialista profundo em Claude Code - CLI da Anthropic. Maximiza produtividade com atalhos, hooks, MCPs, configuracoes avancadas, workflows, CLAUDE.md, memoria, sub-agentes, permissoes e integracao com ecossistemas. Ativar para: configurar Claude Code, criar hooks, otimizar CLAUDE.md, usar MCPs, criar sub-agentes, resolver erros do CLI, workflows avancados, duvidas sobre qualquer feature.


## How It Works

Voce e o especialista definitivo em Claude Code. Seu objetivo e transformar
cada sessão em um fluxo verificável e adequado às permissões e ferramentas disponíveis.

---


## 1. Fundamentos Do Claude Code

Claude Code e a CLI oficial da Anthropic para usar Claude como agente de codigo
diretamente no terminal. Diferente do Claude.ai web, o Claude Code:
- Acessa seu filesystem diretamente
- Executa comandos bash, git, npm, etc.
- Persiste contexto via CLAUDE.md e memory files
- Suporta MCP servers (extensoes de ferramentas)
- Suporta hooks (automacoes pre/pos-acao)
- Pode criar e orquestrar sub-agentes via Task tool


Verifique `claude --version` e `claude --help` antes de copiar flags; consulte a documentação oficial da versão e o ambiente alvo. As instruções abaixo não demonstram instalação ou funcionamento local. Hooks e MCPs executam código com as permissões do processo; revise o código, a origem e o escopo antes de habilitar. Não amplie permissões para resolver um erro sem entender a operação.

## Instalacao E Setup

```bash
npm install -g @anthropic-ai/claude-code
claude                    # iniciar sessao interativa
claude "sua tarefa aqui"  # sessão interativa com prompt inicial
claude --help             # ver todos os flags
```


## Flags Essenciais

```bash
claude -p "prompt"              # print mode, ideal para scripts
claude --model <modelo-disponivel-na-sua-conta>    # especificar modelo
claude --output-format json     # saida em JSON
claude -p --tools "Read" "analise os arquivos indicados"  # restringir ferramentas disponíveis
claude --dangerously-skip-permissions     # pular confirmacoes (cuidado!)
claude -p --max-turns 50 "tarefa"          # limite em print mode
```

---


## 2. Claude.Md - O Cerebro Do Projeto

O arquivo CLAUDE.md na raiz do projeto e carregado automaticamente em TODA sessao.
E a forma mais poderosa de dar contexto e instrucoes persistentes ao Claude Code.


## Hierarquia De Claude.Md

1. ~/.claude/CLAUDE.md          global, carregado em todo projeto
2. /projeto/CLAUDE.md           nivel de projeto
3. /projeto/subpasta/CLAUDE.md  nivel de subpasta, carregado ao navegar


## Estrutura Recomendada

```markdown

## Contexto

O que e este projeto, tecnologias, arquitetura

## Comandos Essenciais

Scripts mais usados: npm run dev, pytest, etc.

## Convencoes De Codigo

Estilo, naming, patterns obrigatorios

## Arquitetura

Estrutura de pastas, responsabilidades de cada modulo

## Regras De Negocio Criticas

O que NUNCA fazer, invariantes do sistema

## Agentes E Skills Disponiveis

Lista de skills, quando usar cada uma

## Fluxo Local

Siga as instruções atuais do repositório; resolva ferramentas opcionais apenas quando disponíveis e pertinentes.
```


## Dicas De Claude.Md De Elite

- Documente o fluxo real do projeto sem impor extensões inexistentes
- Adicione secao Erros Conhecidos com solucoes para problemas recorrentes
- Use secao Memoria como indice para arquivos de memoria detalhados
- Adicione exemplos concretos de output esperado
- Referencie paths absolutos para scripts criticos

---


## Localizacao Dos Arquivos De Memoria

```
~/.claude/projects/<hash-do-path>/memory/
├── MEMORY.md          # indice e contexto rapido (max 200 linhas)
├── ai-personas.md     # detalhes de personas e skills ativas
├── project-X.md       # contexto de projetos especificos
└── decisions.md       # decisoes tecnicas importantes
```


## Memoria Ativa (Em Claude.Md)

Carregar antes de qualquer tarefa: memory/MEMORY.md
Para projetos ativos: memory/ai-personas.md


## Memória e Extensões Opcionais

Os scripts context-agent/context-guardian e o ecossistema Auri citados pelo autor não estão neste bundle. Não os execute nem afirme que salvaram contexto sem uma instalação existente, revisada e autorizada. Leia apenas a memória pertinente; não exponha logs ou credenciais. Respeite as regras atuais de escopo e memória do cliente.

---

## 4. Hooks - Automacao Poderosa

Hooks executam comandos automaticamente em eventos do Claude Code.

## Localizacao Dos Hooks

- Global: ~/.claude/settings.json
- Por projeto: .claude/settings.json (na raiz do projeto)

## Tipos De Hooks Disponiveis

| Hook | Quando Dispara |
|------|----------------|
| PreToolUse | Antes de qualquer ferramenta ser usada |
| PostToolUse | Apos qualquer ferramenta ser usada |
| Notification | Ao receber notificacao do sistema |
| Stop | Quando o agente para de responder |
| SubagentStop | Quando sub-agente para |

## Exemplo: Hook De Beep Ao Terminar

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "powershell -c \"[Console]::Beep(800,300)\""
          }
        ]
      }
    ]
  }
}
```

## Exemplo: Hook De Log De Acoes Bash

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo dated-action >> ~/.claude/action_log.txt"
          }
        ]
      }
    ]
  }
}
```

## Hook de Segurança

Um PreToolUse que pretende bloquear uma ação deve seguir o contrato documentado da versão instalada: saída apropriada e exit code 2 podem bloquear a ferramenta. Não use `|| true`, que transforma falha em sucesso. Nenhum secret_scanner.py está incluído aqui; configure apenas um scanner local revisado, teste sucesso/falha/arquivo ausente e confirme que stderr não vaza segredos. Hooks precisam consumir o JSON documentado do evento, não interpolar comandos ou caminhos recebidos sem validação.

## Ver E Validar Hooks Ativos

```bash
python -m json.tool ~/.claude/settings.json > /dev/null   # sintaxe apenas; não valida o schema nem imprime segredos
```

---

## 5. Mcp Servers - Extensoes De Ferramentas

MCP (Model Context Protocol) permite adicionar ferramentas externas ao Claude Code.
Cada MCP server expoe novas ferramentas que o Claude pode usar nas sessoes.

## Comandos Mcp

```bash
claude mcp add --help          # descobrir transporte, URL/comando e escopo reais
claude mcp list                 # listar MCPs instalados
claude mcp get nome-servidor    # detalhes de um MCP especifico
claude mcp remove nome          # remover um MCP
```

## Mcps Mais Uteis

| MCP | Funcao Principal |
|-----|------------------|
| filesystem | Acesso expandido a arquivos alem do projeto |
| github | PRs, issues, commits, reviews via Claude |
| postgres / sqlite | Consultas SQL diretas sem sair do Claude |
| puppeteer / playwright | Automacao de browser e web scraping |
| slack | Notificacoes e mensagens em canais |
| fetch | HTTP requests diretos para APIs |

## MCP Customizado

Nenhum servidor MCP está incluído. Use a versão revisada do SDK oficial compatível com seu runtime; registre o schema da ferramenta, handler e transporte. Teste initialize, tools/list e tools/call sem segredos, validando entrada/saída e falhas. Um handler tools/call isolado não é uma implementação completa. Ao registrar no cliente, confira `claude mcp add --help`, fixe o executável/URL e limite acesso aos diretórios/serviços necessários.

## 6. Sub-Agentes - Paralelismo Total

O Claude Code pode criar sub-agentes via Task tool para trabalho paralelo.
Cada sub-agente roda de forma independente com seu proprio contexto.

## Padroes De Orquestracao

**Spawn paralelo (multiplas tarefas simultaneas):**
Use Task tool com run_in_background: true para cada tarefa independente.
Exemplo com 3 agentes em paralelo:
- Agente 1: analisa codigo existente
- Agente 2: pesquisa documentacao
- Agente 3: escreve casos de teste
Todos rodam simultaneamente. Resultado chega via TaskOutput.

**Tipos de sub-agente:**
- general-purpose: pesquisa, analise e codigo geral
- Bash: apenas execucao de comandos de terminal
- Explore: exploracao rapida de codebase
- Plan: arquitetura e planejamento de solucoes

**Isolation com git worktree:**
Use isolation: worktree para que o sub-agente trabalhe em branch isolada.
Ideal para: experimentos, refatoracoes arriscadas, POCs sem risco ao main.

## Boas Praticas Com Sub-Agentes

1. Sempre passar CONTEXTO COMPLETO no prompt (o sub-agente nao ve o historico)
2. Especificar exatamente onde salvar outputs (use paths absolutos)
3. Usar run_in_background: true para tarefas longas
4. Verificar resultado com TaskOutput apos conclusao
5. Passar o CLAUDE.md do projeto no contexto inicial do sub-agente

---

## Configurar Permissoes Por Projeto (.Claude/Settings.Json)

```json
{
  "permissions": {
    "allow": [
      "Read(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(sudo *)",
      "Bash(curl *remote-installer*)"
    ]
  }
}
```

O exemplo mínimo não autoriza comandos ou escrita. Regras de prefixo de shell não são um sandbox completo; adicionar git/npm/python amplamente permite scripts e efeitos indiretos. Teste as regras com a versão instalada e use isolamento do sistema operacional para conteúdo não confiável.

## Flags De Permissao Em Linha De Comando

```bash
claude --dangerously-skip-permissions        # pula TODAS as confirmacoes
claude -p --tools "Read" "resuma os arquivos indicados" # somente leitura
claude --disallowedTools "WebFetch"         # bloquear especificas
```

## Quando Usar --Dangerously-Skip-Permissions

Apenas em: CI/CD controlados, scripts automatizados, sandboxes isoladas.
NUNCA usar em: producao, repos com segredos, ambientes compartilhados.

---

## Workflow De Feature Completa (4 Fases)

```bash


## Fase 1: Briefing E Planejamento

claude -p "analise a feature X e crie um plano detalhado de implementacao"


## Fase 2: Implementacao

claude "implemente a feature X seguindo o plano gerado"


## Fase 3: Testes

claude "escreva testes completos para a feature X implementada"


## Fase 4: Code Review

claude "faca code review da feature X, identifique problemas e refine"
```

## Modo Autonomo Para Ciclos Longos

```bash
claude -p --max-turns 100 "complete o ciclo completo de desenvolvimento da feature X"
```

## Script De Inicio De Sessao Produtiva

```bash
#\!/bin/bash
echo "Carregando contexto do projeto..."
claude -p "leia memory/MEMORY.md e me da um briefing completo do estado atual"
```

## Uso em CI

Não execute conteúdo de PR não confiável com tokens de escrita ou segredos de produção. Prepare o diff de forma revisada, limite permissões e orçamento e gere um relatório local; um pedido de code review não autoriza postar comentários. `-p` cria uma execução própria: prompts de fases separados não compartilham necessariamente o plano sem arquivo ou resume explícito. Confirme disponibilidade do CLI e políticas de rede/dados antes de enviar código a um modelo externo.

## Tabela De Problemas Comuns

| Problema | Causa Provavel | Solucao |
|----------|----------------|----------|
| API key not found | ANTHROPIC_API_KEY nao configurada | Configurar token localmente pelo método documentado; não imprimir nem gravar no histórico |
| Timeout em tarefas longas | max-turns insuficiente | Inspecionar timeout, erro, rede e orçamento; aumentar turnos não corrige todo timeout |
| Context window cheio | Muitos arquivos no contexto | Usar sub-agentes com contexto focado |
| Sub-agente nao acha arquivo | Path relativo errado | Usar path absoluto sempre |
| Hook nao executa | JSON invalido em settings.json | python -m json.tool ~/.claude/settings.json |
| MCP nao conecta | Servidor MCP nao iniciado | claude mcp list e checar status |
| Compactacao inesperada | Sessao muito longa | Usar context-guardian skill |
| Erro de permissao em Bash | Tool nao permitida | Verificar a ação e o escopo; adicionar somente a permissão mínima quando autorizada |

## Ver Logs E Historico De Sessoes

```bash
ls ~/.claude/projects/
ls ~/.claude/projects/<hash>/
# JSONL contém um objeto por linha, não um único documento JSON.
# Inspecione somente campos necessários com um leitor JSONL e redija dados sensíveis.
# Não concatene e imprima todo o histórico.
```

---

## Configuração e Dados

Faça backup e edite apenas as configurações pertinentes, sem sobrescrever regras existentes. `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` pode reduzir tráfego não essencial; não é modo offline nem garantia de privacidade. Credenciais ficam no mecanismo local aprovado, não em exemplos export com valores. Evite recomendar uma configuração global com Write(*), Bash(python *) ou Bash(npm *) para todos os projetos.

As extensões Auri, agent-orchestrator, task-intelligence e context-agent são contexto do autor, não dependências instaladas por este bundle. Não execute caminhos fictícios nem alegue garantia contra perda de contexto.

## Quando Esta Skill E Ativada

Esta skill e ativada automaticamente quando o usuario quer:
- Configurar ou otimizar o Claude Code CLI
- Criar, debugar ou otimizar hooks
- Adicionar ou configurar MCP servers
- Criar sub-agentes e orquestracao paralela
- Entender qualquer feature do Claude Code
- Resolver erros ou comportamentos inesperados do CLI
- Otimizar CLAUDE.md e arquivos de memoria
- Configurar permissoes e seguranca

---

## 12. Slash Commands No Claude Code

| Comando | Acao |
|---------|------|
| /status | Ver estado atual da sessao e contexto |
| /clear | Limpar historico da conversa atual |
| /compact | Compactar contexto (Claude resume o historico) |
| /memory | Ver e editar arquivos de memoria |
| /hooks | Ver hooks configurados e ativos |
| /mcp | Ver MCPs conectados e seus status |
| /cost | Ver custo em tokens e USD da sessao |
| /model | Trocar modelo em uso (opus, sonnet, haiku) |
| /help | Ver todos os comandos e atalhos disponiveis |

---

## 13. Referencias Oficiais

- CLI atual: https://code.claude.com/docs/en/cli-reference
- Hooks atuais: https://code.claude.com/docs/en/hooks

- Documentacao principal: https://docs.anthropic.com/claude-code
- Referencia de hooks: https://docs.anthropic.com/claude-code/hooks
- Referencia de settings: https://docs.anthropic.com/claude-code/settings
- MCP SDK e exemplos: https://github.com/modelcontextprotocol/sdk
- Repositorio oficial: https://github.com/anthropics/claude-code
- Release notes: https://docs.anthropic.com/claude-code/changelog

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `007` - Complementary skill for enhanced analysis
- `matematico-tao` - Complementary skill for enhanced analysis
