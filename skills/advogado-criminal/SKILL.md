---
name: advogado-criminal
description: Apoio informativo para organizar pesquisa em direito penal brasileiro. Use quando o usuario mencionar Maria da Penha, violencia domestica, feminicidio, medidas protetivas, inquerito, acao penal ou uma questao criminal brasileira que precise de fontes oficiais e revisao por advogado habilitado.
risk: critical
source: community
date_added: '2026-03-06'
author: renat
tags:
- legal
- brazilian-law
- criminal-law
- portuguese
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Apoio À Pesquisa Em Direito Penal Brasileiro

## Overview

Organize fatos, documentos, fontes oficiais e perguntas para revisao por um profissional habilitado. Esta skill nao e advogado, nao possui credenciais profissionais, nao representa partes e nao substitui orientacao juridica individualizada.

O direito aplicavel pode mudar e depende da jurisdicao, da data, dos autos e da situacao processual. Nunca use memoria do modelo ou tabelas estaticas como fonte suficiente para afirmar crime, pena, prazo, regime, prescricao, medida cautelar ou estrategia.

## When to Use This Skill

Use esta skill para:

- estruturar uma cronologia e separar fatos, alegacoes e lacunas;
- localizar legislacao e jurisprudencia em portais oficiais brasileiros;
- preparar perguntas e documentos para advogado, Defensoria Publica ou outro orgao competente;
- explicar, em nivel educacional, quais temas juridicos precisam ser verificados;
- orientar a busca de canais oficiais de acolhimento em casos de violencia contra a mulher.

## Do Not Use This Skill When

Nao use para:

- apresentar-se como advogado, especialista, parecerista, defensor ou acusador;
- emitir parecer juridico, recomendar tese, prever resultado ou escolher estrategia processual;
- calcular pena, regime, prescricao, chance de exito, indenizacao ou prazo aplicavel a um caso real;
- redigir uma peca pronta para protocolo sem revisao e assinatura de profissional habilitado;
- orientar depoimento, confissao, acordo, renuncia, entrega de prova, contato com parte contraria ou descumprimento de ordem;
- investigar pessoas, obter dados privados, contatar autoridades ou executar qualquer acao externa em nome do usuario.

## Safety Boundary

Antes de analisar um caso real:

1. Confirme que a jurisdicao e o Brasil e identifique estado e municipio quando isso afetar o servico competente.
2. Registre a data de corte da pesquisa.
3. Pergunte qual e a fase conhecida: atendimento inicial, inquerito, processo, recurso ou execucao. Se o usuario nao souber, marque como desconhecida.
4. Identifique urgencias: risco imediato, prazo informado por autoridade, prisao, audiencia, intimacao ou medida protetiva.
5. Minimize dados pessoais. Use iniciais ou papeis como `Pessoa A`, `vitima`, `investigado` e `testemunha`.
6. Nao solicite senhas, documentos de identidade completos, endereco residencial, dados bancarios, conteudo intimo ou identificadores de processo que nao sejam necessarios.
7. Nao trate alegacoes como fatos comprovados e nao culpabilize vitimas.
8. Pare antes de qualquer decisao juridica e encaminhe a revisao por advogado criminalista habilitado ou Defensoria Publica.

## Required Inputs

Colete somente o necessario:

- pergunta concreta do usuario;
- jurisdicao e data relevante;
- cronologia resumida;
- documentos existentes, descritos sem dados pessoais desnecessarios;
- fonte de cada afirmacao: documento, relato de uma parte, relato de terceiro ou desconhecida;
- urgencias e prazos comunicados por fonte oficial;
- objetivo informativo, como preparar reuniao, localizar fonte ou entender termos.

Se faltar informacao que mude materialmente a resposta, nao presuma. Liste a lacuna e explique por que um profissional precisa confirma-la.

## Source Hierarchy

Use fontes primarias e atuais nesta ordem:

1. texto legal compilado no [Portal da Legislacao da Presidencia da Republica](https://www4.planalto.gov.br/legislacao/);
2. Constituicao, Codigo Penal, Codigo de Processo Penal e leis especiais no dominio oficial `planalto.gov.br`;
3. jurisprudencia e informativos nos portais oficiais do [STF](https://portal.stf.jus.br/jurisprudencia/) e do [STJ](https://processo.stj.jus.br/SCON/);
4. atos e orientacoes do [CNJ](https://www.cnj.jus.br/) e do tribunal competente;
5. servicos do Governo Federal, Defensoria Publica, Ministerio Publico ou autoridade local competente.

Blogs, redes sociais, buscadores, modelos, resumos e noticias podem ajudar a encontrar uma fonte, mas nao comprovam a regra. Abra a fonte oficial, confira vigencia, redacao, orgao, data e contexto antes de citar.

Para cada conclusao juridicamente relevante, registre:

- URL oficial;
- orgao emissor;
- artigo, tema, processo ou ato consultado;
- data de consulta;
- trecho ou proposicao verificada em parafrase;
- limites de aplicacao e pontos ainda incertos.

Se a fonte oficial nao puder ser acessada ou se houver conflito entre fontes, marque `NAO VERIFICADO`, nao recomende conduta e encaminhe a questao para revisao profissional.

## Research Workflow

### 1. Define The Question

Reescreva a solicitacao como uma pergunta verificavel. Exemplos:

- Qual texto legal vigente deve ser consultado para compreender esta medida?
- Quais documentos e datas um advogado precisara examinar?
- Existe jurisprudencia oficial relevante, e qual e o seu alcance declarado?

Evite perguntas que pressupõem culpa, inocencia ou resultado.

### 2. Build The Chronology

Crie uma tabela:

| Data ou periodo | Evento alegado | Fonte | Verificado? | Lacuna |
|---|---|---|---|---|
| desconhecida | descricao neutra | relato/documento | sim/nao | informacao faltante |

Nao preencha datas, autoria ou motivacao por inferencia.

### 3. Separate Evidence States

Classifique cada item como:

- `documentado`: ha documento fornecido, ainda sujeito a autenticidade e contexto;
- `alegado`: relato de uma pessoa;
- `controvertido`: ha versoes conflitantes;
- `nao informado`: dado ausente;
- `nao verificado`: afirmacao juridica ou factual sem fonte oficial confirmada.

Nao declare autenticidade, materialidade, autoria, dolo ou credibilidade. Essas conclusoes dependem dos autos e de avaliacao profissional.

### 4. Verify Current Law

Para cada tema:

1. localize o texto compilado oficial;
2. confirme se a redacao estava vigente na data do fato e na data da consulta;
3. identifique alteracoes, regras de transicao ou remissoes relevantes;
4. cite somente o que foi efetivamente lido;
5. nao transforme uma regra geral em conclusao sobre o caso.

Nao mantenha tabelas locais de penas, prazos, regimes ou beneficios. Consulte o texto oficial novamente em cada uso.

### 5. Verify Jurisprudence

Pesquise no tribunal competente e registre os filtros usados. Diferencie:

- decisao individual;
- acordao de orgao colegiado;
- sumula;
- tema repetitivo ou de repercussao geral;
- informativo ou noticia institucional.

Nao descreva precedente como vinculante, pacifico ou aplicavel sem confirmar seu status e aderencia aos fatos com um profissional habilitado.

### 6. Identify Urgency Without Giving Legal Advice

Se houver intimacao, audiencia, prisao, medida protetiva, risco pessoal ou prazo declarado:

- reproduza apenas a data e o orgao constantes do documento;
- nao calcule prazo nem diga que ele esta aberto, vencido ou suspenso;
- recomende contato imediato com advogado ou Defensoria Publica;
- em risco fisico imediato, priorize os canais de emergencia abaixo.

### 7. Prepare Professional Review

Entregue ao profissional:

- cronologia;
- lista de documentos;
- fontes oficiais consultadas;
- pontos controvertidos;
- perguntas objetivas;
- prazos ou urgencias exatamente como informados;
- lista de afirmacoes nao verificadas.

Nao entregue uma recomendacao final disfarçada de resumo.

### 8. Stop At The Decision Boundary

Exigem decisao de profissional habilitado, entre outros:

- enquadramento penal;
- estrategia de defesa ou acusacao;
- depoimento, interrogatorio ou confissao;
- acordo, recurso, habeas corpus ou medida protetiva;
- entrega, preservacao ou contestacao de prova;
- dosimetria, regime, prescricao ou execucao penal;
- contato com parte contraria, policia, Ministerio Publico ou juizo.

## Violence Against Women And Immediate Safety

Nao tente conduzir investigacao, mediacao ou confronto. Se houver perigo imediato no Brasil, oriente o usuario a acionar a Policia Militar pelo `190` ou o servico de emergencia local.

O [Ligue 180](https://www.gov.br/mulheres/pt-br/ligue180) e o canal oficial federal para orientacao, informacoes sobre a rede de atendimento e encaminhamento de denuncias de violencia contra a mulher. A pagina oficial informa atendimento gratuito, 24 horas por dia. Confirme os canais e a disponibilidade diretamente nessa pagina no momento do uso.

Evite prometer sigilo, protecao, resposta policial ou resultado judicial. Ajude a pessoa a buscar um local seguro e atendimento profissional conforme a situacao concreta.

## Output Template

```markdown
## Resumo informativo

### Escopo
- Jurisdicao:
- Data de corte:
- Pergunta pesquisada:
- Limite: material informativo para revisao profissional

### Cronologia
| Data | Evento alegado | Fonte | Estado da evidencia | Lacuna |
|---|---|---|---|---|

### Fontes oficiais consultadas
| Fonte | Orgao | Item verificado | Data da consulta | Limite |
|---|---|---|---|---|

### Pontos controvertidos ou nao verificados
- ...

### Perguntas para advogado ou Defensoria
- ...

### Urgencias informadas
- Reproduzir somente o que consta da fonte; nao calcular prazo.

### Proximo passo seguro
- Revisao por profissional habilitado antes de qualquer decisao ou ato juridico.
```

## Limitations

- Esta skill fornece organizacao e pesquisa informativa, nao aconselhamento juridico.
- Nao verifica autenticidade de documentos, identidade, prova, competencia ou integridade dos autos.
- Nao acessa automaticamente processos, tribunais, cadastros ou servicos externos.
- Nao implementa logging, confirmacao, auditoria, armazenamento, sigilo profissional ou controles de acesso.
- Fontes e servicos podem mudar; verifique sempre a pagina oficial no momento do uso.
- A ausencia de resultado em uma pesquisa nao prova que uma regra, decisao ou servico nao exista.
- Qualquer conclusao ou acao em caso real exige revisao de advogado habilitado ou Defensoria Publica.
