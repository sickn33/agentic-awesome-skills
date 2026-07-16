---
name: skill-installer
description: Instala, valida, registra e verifica novas skills no ecossistema. 10 checks de seguranca, copia, registro no orchestrator e verificacao pos-instalacao.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- skill-management
- deployment
- validation
- installation
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Skill Installer v3.0

## Overview

Instala, valida, registra e verifica novas skills no ecossistema. 10 checks de seguranca, copia, registro no orchestrator e verificacao pos-instalacao.

## When to Use This Skill

- When the user mentions "instalar skill" or related topics
- When the user mentions "install skill" or related topics
- When the user mentions "registrar skill" or related topics
- When the user mentions "nova skill" or related topics
- When the user mentions "new skill" or related topics
- When the user mentions "adicionar skill ao ecossistema" or related topics

## Do Not Use This Skill When

- The task is unrelated to skill installer
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Agente instalador enterprise-grade que garante que toda skill criada (via skill-creator
ou manualmente) seja corretamente instalada, registrada e verificada no ecossistema.
Inclui auto-repair, rollback, dry-run, dashboard, e diagnostico avancado.

## Principio: Redundancia Maxima

Seis camadas de validacao garantem que nenhuma skill fique mal-instalada:

| Camada | Script | O que valida |
|--------|--------|-------------|
| 1 | detect_skills.py | SKILL.md existe + tem frontmatter |
| 2 | validate_skill.py | 10 checks profundos |
| 3 | install_skill.py (pre) | Conflitos, permissoes, espaco, versao |
| 4 | install_skill.py (pos) | Arquivos copiados corretamente |
| 5 | scan_registry.py | Skill aparece no registry (com deduplicacao) |
| 6 | package_skill.py | ZIP valido sem backslashes, nao-vazio, integrity check |

---

## Localizacao

```
C:\Users\renat\skills\skill-installer\
├── SKILL.md              <- este arquivo
├── scripts/
│   ├── install_skill.py  <- instalador principal (11 passos) + todos os comandos
│   ├── detect_skills.py  <- scanner de skills nao-instaladas
│   ├── validate_skill.py <- validacao profunda (10 checks)
│   ├── package_skill.py  <- empacotador ZIP + verificador de integridade
│   └── requirements.txt
├── references/
│   └── known-locations.md
└── data/
    ├── install_log.json  <- log de operacoes (auto-gerado, com rotacao)
    ├── backups/          <- backups antes de sobrescrever
    └── staging/          <- area temporaria para copias seguras
```

---

## Workflow Principal

Quando esta skill for ativada, siga estes passos na ordem:

## Cenario 1: Apos Skill-Creator Finalizar

O skill-creator acabou de criar uma skill em algum diretorio. Execute:

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --source "<caminho-da-skill-criada>" --force
```

Substitua `<caminho-da-skill-criada>` pelo diretorio onde o skill-creator salvou a skill.

## Cenario 2: Usuario Pede Para Instalar Uma Skill Especifica

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --source "<caminho>" [--name "nome-override"] [--force]
```

## Cenario 3: Simular Instalacao Sem Fazer Nada (Dry-Run)

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --source "<caminho>" --dry-run
```

Mostra exatamente o que seria feito em cada um dos 11 passos, sem alterar nenhum arquivo.

## Cenario 4: Detectar E Instalar Skills Pendentes

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --detect
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --detect --auto
```

Escaneia locais conhecidos (Desktop, Downloads, Temp, workspaces) e apresenta
candidatos com timestamps e tamanho. Com --auto instala todos automaticamente.

## Cenario 5: Desinstalar Uma Skill

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --uninstall "nome-da-skill"
```

Remove de `skills/`, `.claude/skills/`, atualiza o registry e remove ZIP do Desktop.
Backup automatico e feito antes da remocao.

## Cenario 6: Health Check + Auto-Repair

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --health
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --health --repair
```

`--health` verifica TODAS as skills: frontmatter, registro, registry, duplicatas.
`--health --repair` encontra problemas E os corrige automaticamente:
- Skills nao registradas -> registra
- Skills faltando no registry -> atualiza
- Duplicatas -> remove

## Cenario 7: Rollback (Restaurar De Backup)

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --rollback "nome-da-skill"
```

Encontra o backup mais recente da skill e restaura para o estado anterior.
Re-registra e atualiza o registry automaticamente.

## Cenario 8: Reinstalar Todas As Skills

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --reinstall-all
```

Re-registra TODAS as skills em `.claude/skills/`, re-empacota todos os ZIPs,
e atualiza o registry. Util apos mudancas em massa ou migracao.

## Cenario 9: Dashboard De Status

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --status
```

Exibe dashboard rico com: nome, versao, saude, registro, backups de cada skill,
estatisticas de operacoes (installs, uninstalls, rollbacks).

## Cenario 10: Ver Historico De Operacoes

```bash
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --log
python C:\Users\renat\skills\skill-installer\scripts\install_skill.py --log 50
```

Mostra as ultimas N operacoes com timestamp, tipo, skill e resultado.

---

## Validar Uma Skill

```bash
python C:\Users\renat\skills\skill-installer\scripts\validate_skill.py "C:\caminho\para\skill"
python C:\Users\renat\skills\skill-installer\scripts\validate_skill.py "C:\caminho\para\skill" --strict
```

Retorna JSON com `valid` (bool), `checks`, `warnings`, `errors`.

## Detectar Skills Nao-Instaladas

```bash
python C:\Users\renat\skills\skill-installer\scripts\detect_skills.py
python C:\Users\renat\skills\skill-installer\scripts\detect_skills.py --path "C:\diretorio\especifico"
python C:\Users\renat\skills\skill-installer\scripts\detect_skills.py --all
```

Retorna JSON com candidatos incluindo: `name`, `source_path`, `already_installed`,
`valid_frontmatter`, `last_modified`, `size_kb`, `file_count`.

## Empacotar Zip Para Claude.Ai

```bash
python C:\Users\renat\skills\skill-installer\scripts\package_skill.py --source "C:\caminho"
python C:\Users\renat\skills\skill-installer\scripts\package_skill.py --all
python C:\Users\renat\skills\skill-installer\scripts\package_skill.py --all --output "C:\Users\renat\Desktop"
```

## Verificar Integridade De Zips Existentes

```bash
python C:\Users\renat\skills\skill-installer\scripts\package_skill.py --verify
python C:\Users\renat\skills\skill-installer\scripts\package_skill.py --verify --output "C:\Users\renat\Desktop"
```

---

## Install_Skill.Py

| Comando | Descricao |
|---------|-----------|
| `--source <path>` | Instalar skill de caminho |
| `--source <path> --force` | Sobrescrever se existir |
| `--source <path> --name <nome>` | Nome customizado |
| `--source <path> --dry-run` | Simular sem alterar |
| `--detect` | Auto-detectar skills pendentes |
| `--detect --auto` | Detectar e instalar automaticamente |
| `--uninstall <nome>` | Desinstalar (com backup) |
| `--rollback <nome>` | Restaurar do ultimo backup |
| `--reinstall-all` | Re-registrar + re-empacotar todas |
| `--health` | Health check de todas as skills |
| `--health --repair` | Health check + auto-correcao |
| `--status` | Dashboard rico com versoes, saude, backups |
| `--log [N]` | Ultimas N operacoes (padrao: 20) |
| `--json` | Saida JSON em vez de texto formatado |

---

## O Que O Instalador Faz (11 Passos)

1. **Resolver fonte** - identifica o diretorio da skill
2. **Validar** - roda 10 checks no SKILL.md e estrutura
3. **Determinar nome** - extrai do frontmatter ou usa --name, compara versoes
4. **Verificar conflitos** - checa se ja existe no destino
5. **Backup** - se sobrescrevendo, faz backup timestamped (exclui backups/ e staging/)
6. **Copiar via staging** - copia para area temp, valida hash, depois move
7. **Registrar no Claude Code CLI** - copia SKILL.md para .claude/skills/<nome>/
8. **Atualizar registry** - roda scan_registry.py --force (com deduplicacao por nome)
9. **Verificar instalacao** - confirma arquivos, registry, registro (5 checks)
10. **Empacotar ZIP** - cria ZIP para upload no Claude.ai web/desktop (validado)
11. **Logar operacao** - append em install_log.json (com rotacao automatica)

**IMPORTANTE**: Skills no Claude Code (CLI) e Claude.ai (web/desktop) sao SEPARADAS.
O instalador cobre ambas superficies automaticamente.

---

## Seguranca

- **Backups automaticos**: antes de qualquer sobrescrita, backup em `data/backups/<nome>_<timestamp>/`
- **Staging area**: copia para temp primeiro, valida hash, depois move (minimiza corrupcao)
- **Idempotencia**: rodar 2x com mesma source detecta hashes identicos, nao duplica
- **Arquivos proibidos**: bloqueia instalacao se encontrar .env, *.key, *.pem, credentials.*
- **Log com rotacao**: toda operacao logada; mantem ultimas 500 entradas
- **Limite de backups**: mantem ultimos 5 por skill, limpa automaticamente
- **Anti-recursao**: backup e staging excluem seus proprios subdiretorios
- **Deduplicacao no registry**: scan_registry.py deduplica por nome (case-insensitive)
- **ZIP validado**: verifica ausencia de backslashes, conteudo nao-vazio, integridade
- **Dry-run**: simula instalacao completa sem tocar nenhum arquivo
- **Rollback**: restaura de backup com re-registro automatico
- **Comparacao de versao**: detecta upgrade/downgrade/same antes de sobrescrever
- **Hash normalizado**: md5_dir usa forward slashes e exclui dirs de sistema

---

## Integracao Com Orchestrator

Esta skill e auto-detectada pelo `scan_registry.py` e matchada pelo `match_skills.py`
quando o usuario menciona keywords de instalacao. Nenhuma configuracao manual necessaria.

Alem disso, o CLAUDE.md global contem instrucao para rodar o instalador automaticamente
apos o skill-creator finalizar uma skill.

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `skill-sentinel` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
