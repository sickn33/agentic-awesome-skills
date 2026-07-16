# Protocolo de Extracao Detalhado

Guia passo a passo para extrair TODAS as informacoes criticas de uma sessao
antes da compactacao. Siga na ordem — cada secao depende da anterior.

## Passo 1: Inventario de Arquivos

Listar TODOS os arquivos que foram:
- **Criados**: caminho absoluto, proposito, tamanho aproximado
- **Modificados**: caminho, secao alterada (linhas), natureza da mudanca
- **Lidos** (para referencia): caminho, por que foi lido, informacao extraida
- **Deletados**: caminho, motivo

Formato:

```markdown
### Arquivos Tocados
| Arquivo | Acao | Detalhes |
|---------|------|----------|
| C:\path\file.py | EDIT L40-119 | Adicionou 5 categorias a CAPABILITY_KEYWORDS |
| C:\path\new.md | CREATE | Nova skill com 14 modulos |
| C:\path\old.bak | DELETE | Backup obsoleto |
```

## Passo 2: Decisoes e Seus Motivos

Para cada decisao tecnica tomada na sessao:

```markdown
### Decisoes
- **O que**: [descricao da decisao]
  **Por que**: [motivo tecnico]
  **Alternativas descartadas**: [opcoes que nao foram escolhidas e por que]
  **Impacto**: [o que muda por causa dessa decisao]
```

Decisoes incluem: escolha de tecnologia, padrao de codigo, arquitetura,
naming conventions, estrategia de teste, prioridade de tarefas.

## Passo 3: Bugs e Correcoes

Para cada bug encontrado e corrigido:

```markdown
### Correcoes
- **Sintoma**: [como o bug se manifestou]
  **Causa raiz**: [por que acontecia]
  **Arquivo**: [caminho:linha]
  **Correcao**: [o que foi feito, em 1-2 linhas de codigo se relevante]
  **Verificacao**: [como confirmou que esta corrigido]
```

## Passo 4: Estado de Progresso

```markdown
### Progresso
- Total de tarefas: X
- Concluidas: Y (lista)
- Em andamento: Z (lista com % e proximo passo)
- Pendentes: W (lista com prioridade e dependencias)
- Bloqueadas: V (lista com motivo do bloqueio)
```

## Passo 5: Codigo Critico

Trechos de codigo que sao FUNDAMENTAIS para o entendimento do projeto.
Nao copiar arquivos inteiros — apenas os trechos que representam decisoes
ou logica nao-obvia.

```markdown
### Trechos Criticos
**match_skills.py:40-119** — Categorias de capacidade:
- legal: ~70 keywords cobrindo todas as areas do direito brasileiro
- auction: leilao judicial/extrajudicial
- security: owasp, pentest, vulnerabilidades
- image-generation: stable diffusion, comfyui, midjourney
- monitoring: health, status, audit, sentinel
```

## Passo 6: Padroes e Convencoes

```markdown
### Padroes Observados
- [padrao]: [descricao] — [onde se aplica]
```

Exemplos: "ZIPs devem conter {skill-name}/ E .claude/skills/{skill-name}/",
"SQL usa ? placeholders, nunca f-strings", "Tokens mascarados com [:8]...masked".

## Passo 7: Dependencias Criticas

Conexoes entre componentes que NAO sao obvias:

```markdown
### Dependencias
- scan_registry.py CAPABILITY_MAP === match_skills.py CAPABILITY_KEYWORDS
  (devem ser identicos, senao matching quebra)
- SKILL.md frontmatter DEVE ter: name, version, description
  (scan_registry.py valida esses campos)
```

## Passo 8: Contexto do Usuario

```markdown
### Contexto
- Objetivo do usuario: [o que ele quer alcançar no macro]
- Nivel tecnico: [como interage, que termos usa]
- Preferencias: [idioma, formato, nivel de detalhe]
- Proxima acao esperada: [o que o usuario provavelmente vai pedir]
```

## Formato do Snapshot Final

O arquivo `snapshot-YYYYMMDD-HHMMSS.md` deve conter TODAS as secoes acima
nesta ordem, precedidas por um cabecalho:

```markdown
# Context Guardian Snapshot — YYYY-MM-DD HH:MM:SS
**Sessao**: [identificador ou slug]
**Projeto**: [nome do projeto]
**Modelo**: [claude-opus-4-6 etc]
**Contexto consumido**: ~X% (estimativa)

[Todas as secoes do Passo 1-8]

---
*Snapshot gerado por context-guardian v1.0.0*
*Para restaurar: leia este arquivo + MEMORY.md + context_manager.py load*
```
