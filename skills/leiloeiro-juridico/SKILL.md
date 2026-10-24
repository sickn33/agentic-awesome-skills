---
name: leiloeiro-juridico
description: 'Analise juridica de leiloes: nulidades, bem de familia, alienacao fiduciaria, CPC arts 829-903, Lei 9514/97, onus reais, embargos e jurisprudencia.'
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- legal
- auction-law
- brazilian
- judicial
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL JURÍDICA — LEILÕES DE IMÓVEIS

## Overview

Analise juridica de leiloes: nulidades, bem de familia, alienacao fiduciaria, CPC arts 829-903, Lei 9514/97, onus reais, embargos e jurisprudencia.

## When to Use This Skill

- When the user mentions "juridico leilao" or related topics
- When the user mentions "nulidade leilao" or related topics
- When the user mentions "bem de familia leilao" or related topics
- When the user mentions "alienacao fiduciaria leilao" or related topics
- When the user mentions "cpc 829" or related topics
- When the user mentions "fraude execucao" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro juridico
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Forneça apoio educativo para revisão por advogado habilitado, sem alegar credenciais ou domínio absoluto, nos temas:
- Direito Processual Civil (execução, expropriação, arrematação)
- Direito Imobiliário (registro, ônus reais, alienação fiduciária)
- Jurisprudência do STJ e STF sobre leilões

---

### 1.1 Leilão Judicial (Cpc/2015)

**Roteiro de conferência:** identificar título e rito, citação, penhora/intimações, avaliação, edital, condições do juiz, habilitação, pagamento, auto e título registrável. Conferir a redação vigente e os autos, sem presumir que todo rito usa o mesmo calendário.

O art. 891 usa o mínimo judicial constante do edital; na falta dele, o parâmetro é 50% da avaliação. O art. 895 tem regras próprias para propostas parceladas. A tabela anterior atribuía conteúdos a artigos errados e estava truncada; usar os tópicos oficiais: 880 iniciativa particular, 881 leilão, 884 atribuições do leiloeiro, 885 condições, 886 edital, 887 publicação, 889 ciência, 890 impedimentos, 892 pagamento, 895 parcelamento e 901 auto/carta.

### 1.2 Leilão Extrajudicial — Alienação Fiduciária (Lei 9.514/97)

**Roteiro após a Lei 14.711/2023:** verificar contrato, intimação, purga, consolidação e se incide a regra residencial especial do art. 26-A ou o regime geral do art. 27. Este prevê leilão em 60 dias da consolidação e segundo leilão nos 15 dias seguintes ao primeiro frustrado; os mínimos incluem encargos e hipóteses específicas. Não presumir extinção de toda dívida: o art. 27 §5º-A admite saldo remanescente, ressalvada a exceção do art. 26-A §4º. Art. 30 prevê reintegração em favor do fiduciário/sucessores, incluindo adquirente, não um direito do devedor à imissão. Conferir direito intertemporal e decisão aplicável com advogado.

---

### 2.1 Risco De Nulidade Da Hasta Pública

**ALTO RISCO — Verificar Sempre:**

**a) Intimação do cônjuge (Art. 842 CPC)**
- Verificar intimação do cônjuge na penhora de imóvel e a exceção do regime de separação absoluta do art. 842
- Falta de intimação = nulidade relativa (depende de prejuízo)
- STJ: a nulidade não é automática, mas é frequente argumento de anulação
- Como verificar: checar se nos autos consta intimação do cônjuge/companheiro

**b) Intimação do devedor (Art. 889, I CPC)**
- Verificar ciência do executado, inclusive por seu advogado quando constituído, conforme art. 889
- Prazo mínimo: 5 dias antes do leilão
- Falta = possível nulidade

**c) Publicação do Edital (Art. 887 CPC)**
- Prazo mínimo de antecedência
- Veículo de publicação adequado (jornal de grande circulação ou eletrônico)
- Conteúdo do edital: art. 886; publicação: art. 887

**d) Avaliação Desatualizada**
- Art. 873 não tem inciso IV nem validade automática de um ano: avaliar erro/dolo, alteração de valor ou dúvida fundada nos termos do artigo
- Lance baseado em avaliação defasada = risco de impugnação

**e) Ressalva de Impenhorabilidade Não Declarada**
- Bem de família não declarado nos autos pode ser arguido após leilão
- Risco: arrematação anulada (Art. 903, §1º, II CPC — até 10 dias após)

### 2.2 Bem De Família (Lei 8.009/90)

**Regra Geral (Art. 1º):**
O imóvel utilizado como residência pela família é impenhorável.

**Exceções (Art. 3º) — Imóvel PODE ser penhorado quando:**
1. O antigo inciso sobre trabalhadores domésticos foi revogado pela LC 150/2015; não aplicar como exceção vigente
2. Financiamento para construção ou aquisição do próprio imóvel (SFH, alienação fiduciária)
3. Impostos, predial ou territorial, taxas e contribuições devidas ao imóvel
4. Execução de hipoteca sobre o imóvel (nas condições do art. 3º V e jurisprudência aplicável; não há essa regra temporal genérica)
5. Aquisição criminosa do bem
6. Fiança em contrato de locação (Súmula 549 STJ — controverso)
7. Obrigação decorrente de pensão alimentícia

**Como verificar se é bem de família:**
- Verificar nos autos se devedor alegou impenhorabilidade
- Verificar se há outros imóveis no nome do devedor (um só não prova residência, titularidade ou todas as condições legais)
- Solteiros e viúvos também têm proteção (Súmula 364 STJ)

**ATENÇÃO:** Se o bem de família não foi arguido antes do leilão e o arrematante está
de boa-fé, jurisprudência tende a preservar a arrematação (Art. 903, §1º CPC).
Mas o risco existe — avaliar caso a caso.

### 2.3 Ônus Reais Que Acompanham O Imóvel

**O que o arrematante herda:**

| Ônus | Acompanha? | Base Legal |
|------|-----------|-----------|
| Hipoteca anterior à penhora | ⚠️ Pode acompanhar | Depende da ordem e purga |
| Hipoteca posterior à penhora | Não acompanha | Art. 908 CPC |
| IPTU atrasado | Verificar sub-rogação sobre preço na hasta pública | Art. 130, parágrafo único CTN |
| Condomínio atrasado | Verificar regime da alienação e sub-rogação | CPC art. 908 §1º e caso concreto |
| Usufruto registrado | Sim — respeita o usufrufrutuário | Art. 1.394 CC |
| Servidão registrada | Sim — acompanha o imóvel | Art. 1.378 CC |
| Aforamento (laudêmio) | Sim — se terreno de marinha | SPU |
| Penhoras de outros processos | Verificar ordem de preferência | Art. 908 CPC |

**IPTU e condomínio:** distinguir obrigação ordinária e efeito da alienação judicial. CTN art. 130, parágrafo único, prevê sub-rogação dos tributos na hasta pública sobre o preço; CPC art. 908 §1º trata de créditos sobre o bem, inclusive propter rem. Não transferir débitos anteriores automaticamente ao arrematante nem supor que o edital prevalece sobre norma obrigatória. Obter parecer para a modalidade concreta.

### 2.4 Contestação da arrematação

Art. 903 §1º distingue invalidação por preço vil/vício, ineficácia por art. 804 e resolução por falta de pagamento/caução. O §2º prevê provocação em dez dias do aperfeiçoamento; o §4º trata de ação autônoma após carta/ordem. Embargos de terceiro têm regra própria no art. 675: na execução, até cinco dias após arrematação, sempre antes da assinatura da carta. Não confundir esses marcos ou inferir risco de anulação apenas por valor emocional.

---

### 3.1 Leitura De Matrícula (Certidão De Ônus)

**O que verificar:**
1. Identificação do imóvel (número, área, confrontações)
2. Titularidade atual — quem é o proprietário
3. Ônus e gravames registrados:
   - Hipotecas e sua ordem
   - Penhoras já registradas (outros processos)
   - Usufruto, servidão, habitação
   - Cláusulas de inalienabilidade, impenhorabilidade, incomunicabilidade
   - Alienação fiduciária em favor de banco
4. Histórico de proprietários — rastrear vício de origem
5. Área de preservação permanente, faixa de marinha (laudêmio)
6. Existência de ação de usucapião, retificação, etc.

### 3.2 Leitura Do Processo Judicial

**O que buscar nos autos:**
- Petição inicial da execução — valor do débito original
- Certidão de penhora registrada
- Laudo de avaliação — data e valor
- Intimações realizadas — cônjuge, devedor, credores
- Edital publicado — verificar conformidade com Art. 887 CPC
- Embargos opostos e sua situação
- Certidões do distribuidor do foro

---

## Para O Arrematante/Investidor:

1. Solicitar certidão de inteiro teor dos autos antes do leilão
2. Verificar intimações do cônjuge
3. Confirmar que não há embargos com efeito suspensivo
4. Checar se há alegação de bem de família nos autos
5. Obter certidões de IPTU e condomínio para quantificar débitos
6. Analisar matrícula atualizada (certidão de ônus reais)
7. Após arrematação: protocolar pedido de imissão na posse imediatamente

## Para O Devedor/Executado:

- Pode apresentar impugnação ao cumprimento de sentença no art. 525; embargos à execução seguem outro regime
- Pode requerer parcelamento (Art. 916 CPC — 30% + parcelas)
- Verificar prazo de purga e eventual direito de preferência após consolidação; não são o mesmo instituto
- Pode requerer adjudicação para parentes (Art. 876, §5º CPC)
- Pode arguir bem de família antes do leilão

---

## 5. Glossário Jurídico Essencial

| Termo | Definição |
|-------|-----------|
| Adjudicação | Transferência forçada do bem ao credor como pagamento (Art. 876 CPC) |
| Arrematação | Compra do bem em leilão por terceiro |
| Auto de Arrematação | Documento que formaliza a compra em leilão |
| Carta de Arrematação | Título para registro do imóvel em cartório |
| Consolidação | Transferência da propriedade fiduciária ao credor após inadimplência |
| Embargos de Terceiro | Ação para proteger direito de quem não é parte na execução |
| Hasta Pública | Leilão judicial de bens penhorados |
| Imissão na Posse | Ação para tomar posse do imóvel arrematado |
| Penhora | Constrição judicial de bem para garantir a execução |
| Praça | Leilão de imóvel em execução |
| Propter Rem | Obrigação que segue o bem (IPTU, condomínio) |
| Purga da Mora | Pagamento do débito para impedir a perda do imóvel |
| Usufruto | Direito real de uso e fruição de bem alheio |
| Vil Preço | Lance irrisório — inferior ao mínimo judicial do edital; sem mínimo fixado, inferior a 50% da avaliação (CPC art. 891) |

---

## 6. Fraude À Execução (Art. 792 Cpc)

A alienação de bem é considerada fraude à execução quando:
1. Já existe demanda judicial capaz de levar o devedor à insolvência (Art. 792, IV CPC)
2. Há averbação de penhora ou constrição no registro do imóvel (Art. 792, II CPC)
3. O adquirente NÃO comprova boa-fé (Art. 792, §2º CPC)

**Relevância para o arrematante:**
- Se o devedor vendeu o imóvel a terceiro APÓS a citação na execução, essa venda
  pode ser declarada fraudulenta — o imóvel pode ser penhorado mesmo em nome do comprador
- Não concluir automaticamente que o arrematante adquire livre de todo vício (adquire de forma originária
  conforme parte da doutrina, ou derivada mas com proteção — divergência)
- **Não usar REsp 1.141.990/SP como garantia geral:** conferir objeto, tese e aplicabilidade do julgado; a boa-fé não afasta automaticamente vícios e direitos de terceiros

---

## 7. Regularização Fundiária (Lei 13.465/2017 — Reurb)

**Relevância para leilões:**
- Imóveis sem matrícula plena ou em ocupação informal podem ser regularizados via REURB
- REURB-S (Social): moradores de baixa renda — gratuita
- REURB-E (Específica): demais situações — custos do interessado

**Quando considerar:**
- Imóvel de leilão sem habite-se, com área divergente ou em loteamento irregular
- REURB pode abrir caminho para registro que seria impossível pela via convencional
- Custo e prazo da REURB variam muito por município (6-24 meses)

---

## 8. Adjudicação Compulsória (Art. 1.418 Cc + Lei 6.766/79)

**Para o arrematante:**
- Se após arrematação o devedor se recusa a assinar escritura ou há impedimento
  registral, o arrematante pode usar a carta de arrematação como título judicial
  para registro direto (Art. 901 CPC)
- Em contratos de promessa de compra e venda não cumpridos, a adjudicação
  compulsória é a via para obter a escritura

**Para imóveis de leilão extrajudicial:**
- O credor fiduciário já tem a propriedade consolidada — não precisa de adjudicação
- O arrematante recebe escritura diretamente do credor fiduciário

---

## 9. Penhora Online E Bens Digitais

**Evolução recente:**
- SISBAJUD (antigo Bacen Jud): juiz pode bloquear contas em segundos
- Penhora de criptoativos e cotas de FII: possível, mas regulação em evolução
- Penhora de domínios e patrimônio digital: ainda rara, mas crescente
- Implicação: devedor pode ter bens bloqueados antes mesmo da penhora do imóvel

---

## Itbi

- Base de cálculo: divergência — alguns municípios cobram sobre o VALOR DE MERCADO
  e não sobre o valor da arrematação
- STJ (Tema 1.113): valor declarado tem presunção relativa de valor de mercado, afastável em processo próprio; vedado valor de referência unilateral prévio — o arrematante pode contestar cobrança sobre VMP
- Atenção: muitos municípios ainda cobram sobre VMP — possível impugnação administrativa

## Ir Ganho De Capital (Na Revenda)

- Pessoa física: verificar alíquotas progressivas, base e isenções aplicáveis; 15% não é universal sobre todo ganho de capital (preço de venda - custo de aquisição)
- Custo de aquisição: valor da arrematação + custos cartorários + ITBI + comissão
- Isenção: venda do único imóvel até R$ 440.000 a cada 5 anos (Lei 11.196/2005)
- Isenção: compra de outro imóvel residencial em até 180 dias (Art. 39 Lei 11.196)

---

## Disponibilidade e governança

O orquestrador, scan_registry.py, match_skills.py e skill-sentinel não estão incluídos. scripts/governance.py contém helpers manuais; não realiza parecer, aprovação, confirmação humana ou alerta automático integrado. Não há evidência de auditoria skill-sentinel. Registrar evidências e pendências em ambiente aprovado; não prometer que cliente/serviço não retém dados.

## Referências

Fontes normativas e referências:
- CPC/2015 (Lei 13.105/2015) — Arts. 774-925 (Execução completa)
- Lei 9.514/1997 — Alienação Fiduciária de Imóvel (Art. 22-30)
- Lei 8.009/1990 — Bem de Família
- Lei 13.465/2017 — REURB (Regularização Fundiária)
- Lei 6.766/1979 — Parcelamento do Solo Urbano
- Código Civil/2002 — Arts. 1.227-1.247 (registro), Arts. 1.361-1.368 (propriedade fiduciária)
- Lei 6.015/1973 — Lei de Registros Públicos
- Lei 11.196/2005 — Isenção IR ganho de capital (Art. 39)
- CTN Art. 130 — Responsabilidade por tributos propter rem
- Decreto 21.981/1932 — Regulamento de Leiloeiros
- STJ — Informativos de Jurisprudência sobre arrematação e leilão
- STJ Tema 1.113 — ITBI sobre valor da transação efetiva

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Related Skills

- `junta-leiloeiros` - Complementary skill for enhanced analysis
- `leiloeiro-avaliacao` - Complementary skill for enhanced analysis
- `leiloeiro-edital` - Complementary skill for enhanced analysis
- `leiloeiro-ia` - Complementary skill for enhanced analysis
- `leiloeiro-mercado` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Limites de aplicação

Não há parecer jurídico de caso concreto. Nenhuma referência de jurisprudência sem inteiro teor e aderência fática deve sustentar recomendação de lance ou defesa. Conferir vigência, modalidade, contrato, registro, edital e decisões antes de calcular prazo ou responsabilidade. Os exemplos de tributação, isenção, REURB e título extrajudicial são apenas tópicos para revisão profissional, sem elegibilidade ou prazo garantido. Ausência de documento essencial é pendência impeditiva, não risco baixo. Os helpers de log não são controle atômico de taxa, integridade de auditoria ou sistema de retenção; não incluir segredos ou dados processuais desnecessários. Não houve consulta de autos, operação em tribunal ou execução do script.

## Example — revisão documental

> Revise o edital e a matrícula fornecidos, identifique documentos ausentes e separe fatos comprovados de questões para o advogado. Não calcule prazo nem recomende lance sem os documentos e a regra aplicável.
