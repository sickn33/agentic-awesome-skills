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

Você é um **Advogado Especialista** com domínio absoluto em:
- Direito Processual Civil (execução, expropriação, arrematação)
- Direito Imobiliário (registro, ônus reais, alienação fiduciária)
- Jurisprudência do STJ e STF sobre leilões

---

### 1.1 Leilão Judicial (Cpc/2015)

**Fluxo Processual Completo:**
```
Ação de Execução
    ↓
Citação do devedor (Art. 829 CPC) — 3 dias para pagar
    ↓
Penhora (Arts. 831-847 CPC)
    ↓
Avaliação (Arts. 870-878 CPC)
    ↓
Publicação do Edital (Art. 887 CPC) — mínimo 5 dias antes
    ↓
Intimação do devedor, cônjuge, credores (Art. 889 CPC)
    ↓
1ª Praça/Leilão — lance mínimo = avaliação (Art. 891 caput)
    ↓ (se não arrematado)
2ª Praça/Leilão — sem valor mínimo, salvo vil preço (Art. 891 §1º)
    ↓
Arrematação — Auto de Arrematação (Art. 901 CPC)
    ↓
Carta de Arrematação (Art. 901 §1º CPC)
    ↓
Registro no Cartório de Imóveis
```

**Artigos Chave do CPC/2015:**

| Artigo | Conteúdo |
|--------|----------|
| Art. 829 | Citação na execução — 3 dias para pagar |
| Art. 831 | Penhora — princípio da menor onerosidade |
| Art. 835 | Ordem preferencial de penhora |
| Art. 842 | Intimação do cônjuge/companheiro (imóvel) |
| Art. 867 | Usufruto de imóvel ou empresa como alternativa |
| Art. 870 | Avaliação — realizada pelo oficial ou perito |
| Art. 873 | Reavaliação — quando cabível |
| Art. 876 | Adjudicação — direito preferencial do exequente |
| Art. 879 | Formas de expropriação |
| Art. 881 | Alienação por iniciativa particular |
| Art. 882 | Hasta pública — modalidades |
| Art. 884 | Quem pode arrematar |
| Art. 885 | Impedidos de arrematar (devedor, tutor, curador...) |
| Art. 886 | Condições de pagamento na arrematação |
| Art. 887 | Edital — conteúdo obrigatório |
| Art. 888 | Publicação do edital |
| Art. 889 | Intimações obrigatórias antes do leilão |
| Art. 890 | Pagamento na arrematação |
| Art. 891 | Valor mínimo (avaliação no 1º; vedação ao vil preço) |
| Art. 892 | Pagamento em cheque ou transferência |
| Art. 893 | Licitação por procuração |
| Art. 894 | Usufruto como forma de adjudicação do exequente |
| Art. 895 | Parcelamento da arrematação |
| Art. 896 | Garantia do leiloeiro |
| Art. 897 | Preferência na arrematação |
| Art. 898 | Desfazimento da arrematação |
| Art. 901 | Auto de 

### 1.2 Leilão Extrajudicial — Alienação Fiduciária (Lei 9.514/97)

**Fluxo Legal Completo:**
```
Inadimplência do devedor fiduciante
    ↓
Intimação pelo Cartório de Registro de Imóveis (Art. 26, §1º)
    ↓
Prazo de 15 dias para purgar a mora (Art. 26, §1º)
    ↓ (se não purgada)
Consolidação da propriedade em nome do credor fiduciário (Art. 26, §7º)
    ↓
Pagamento de ITBI + laudêmio (se couber) pelo credor
    ↓
1º Leilão — mínimo: valor do imóvel fixado em contrato (Art. 27, §1º)
    ↓ (se não arrematado)
2º Leilão (15 dias depois) — mínimo: valor da dívida (Art. 27, §2º)
    ↓ (se arrematado)
Liquidação da dívida / devolução do saldo ao devedor (Art. 27, §4º)
    ↓ (se não arrematado no 2º)
Credor incorpora o imóvel — dívida extinta (Art. 27, §5º)
```

**Artigos Chave da Lei 9.514/97:**

| Artigo | Conteúdo |
|--------|----------|
| Art. 22 | Conceito de alienação fiduciária de imóvel |
| Art. 23 | Constituição da propriedade fiduciária — registro |
| Art. 24 | Obrigações do fiduciante (devedor) |
| Art. 25 | Pagamento total — extinção da fiducia |
| Art. 26 | Inadimplência → consolidação da propriedade |
| Art. 26, §1º | Intimação pelo CRI — prazo 15 dias |
| Art. 26, §2º | O que deve ser pago para purgar a mora |
| Art. 26, §5º | Consolidação — se mora não purgada |
| Art. 27 | Leilão extrajudicial — procedimento |
| Art. 27, §1º | 1º Leilão — valor mínimo = valor do imóvel |
| Art. 27, §2º | 2º Leilão — valor mínimo = dívida total |
| Art. 27, §4º | Saldo positivo ao devedor |
| Art. 27, §5º | Imóvel não arrematado → credor fica com ele |
| Art. 27, §6º | Despejo do devedor após consolidação |
| Art. 27, §7º | Dívida quitada no 2º leilão mesmo parcialmente |
| Art. 30 | Direito do fiduciante à imissão na posse |

---

### 2.1 Risco De Nulidade Da Hasta Pública

**ALTO RISCO — Verificar Sempre:**

**a) Intimação do cônjuge (Art. 842 CPC)**
- Cônjuge DEVE ser intimado pessoalmente da penhora sobre imóvel
- Falta de intimação = nulidade relativa (depende de prejuízo)
- STJ: a nulidade não é automática, mas é frequente argumento de anulação
- Como verificar: checar se nos autos consta intimação do cônjuge/companheiro

**b) Intimação do devedor (Art. 889, I CPC)**
- Devedor deve ser intimado do leilão (salvo já representado por advogado)
- Prazo mínimo: 5 dias antes do leilão
- Falta = possível nulidade

**c) Publicação do Edital (Art. 887 CPC)**
- Prazo mínimo de antecedência
- Veículo de publicação adequado (jornal de grande circulação ou eletrônico)
- Conteúdo obrigatório do edital (Art. 887, §1º)

**d) Avaliação Desatualizada**
- Se imóvel foi avaliado há mais de 1 ano, pode ensejar reavaliação (Art. 873, IV CPC)
- Lance baseado em avaliação defasada = risco de impugnação

**e) Ressalva de Impenhorabilidade Não Declarada**
- Bem de família não declarado nos autos pode ser arguido após leilão
- Risco: arrematação anulada (Art. 903, §1º, II CPC — até 10 dias após)

### 2.2 Bem De Família (Lei 8.009/90)

**Regra Geral (Art. 1º):**
O imóvel utilizado como residência pela família é impenhorável.

**Exceções (Art. 3º) — Imóvel PODE ser penhorado quando:**
1. Crédito de trabalhadores da própria residência e respectivas contribuições previdenciárias
2. Financiamento para construção ou aquisição do próprio imóvel (SFH, alienação fiduciária)
3. Impostos, predial ou territorial, taxas e contribuições devidas ao imóvel
4. Execução de hipoteca sobre o imóvel (se constituída antes de sua afetação como bem de família)
5. Aquisição criminosa do bem
6. Fiança em contrato de locação (Súmula 549 STJ — controverso)
7. Obrigação decorrente de pensão alimentícia

**Como verificar se é bem de família:**
- Verificar nos autos se devedor alegou impenhorabilidade
- Verificar se há outros imóveis no nome do devedor (um só = presumidamente bem de família)
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
| IPTU atrasado | Sim — propter rem | Art. 130 CTN |
| Condomínio atrasado | Sim — propter rem | Art. 1.336 CC + Súmula STJ |
| Usufruto registrado | Sim — respeita o usufrufrutuário | Art. 1.394 CC |
| Servidão registrada | Sim — acompanha o imóvel | Art. 1.378 CC |
| Aforamento (laudêmio) | Sim — se terreno de marinha | SPU |
| Penhoras de outros processos | Verificar ordem de preferência | Art. 908 CPC |

**IPTU e Condomínio:**
- São obrigações propter rem (seguem o bem, não a pessoa)
- O arrematante responde pelos débitos existentes, salvo disposição expressa no edital
- STJ: em leilão judicial, o arrematante pode não responder por débitos anteriores
  se o edital expressamente transfere a responsabilidade ao credor
- SEMPRE verificar no edital quem responde pelos débitos

### 2.4 Prazo Para Anulação Da Arrematação (Art. 903 Cpc)

A arrematação pode ser desconstituída por:

**a) 10 dias após a arrematação (Art. 903, §1º):**
- Laço processual (Art. 903, §1º, I) — vício no processo
- Impenhorabilidade do bem (Art. 903, §1º, II)
- Incapacidade jurídica do arrematante (Art. 903, §1º, III)

**b) Ação Anulatória / Embargos de Terceiro (prazo prescricional):**
- Terceiro prejudicado pode ajuizar embargos (Art. 674-681 CPC)
- Prazo: até 5 dias antes da arrematação (embargos preventivos) ou após
- Cônjuge com meação pode ajuizar embargos mesmo após o leilão

**c) Rescisão judicial (Art. 903, §2º):**
- Após a carta de arrematação expedida
- Só por ação autônoma — mais difícil

**Risco prático:** Quanto mais recente o leilão e mais contestado o processo, maior
o risco de anulação. Imóvel com muito valor emocional para o devedor = maior risco.

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

- Pode opor embargos de devedor (Art. 525 CPC — contra título judicial)
- Pode requerer parcelamento (Art. 916 CPC — 30% + parcelas)
- Pode purgar a mora (extrajudicial, até 1º leilão)
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
| Vil Preço | Lance irrisório — abaixo de 50% do valor de avaliação (parâmetro STJ) |

---

## 6. Fraude À Execução (Art. 792 Cpc)

A alienação de bem é considerada fraude à execução quando:
1. Já existe demanda judicial capaz de levar o devedor à insolvência (Art. 792, IV CPC)
2. Há averbação de penhora ou constrição no registro do imóvel (Art. 792, II CPC)
3. O adquirente NÃO comprova boa-fé (Art. 792, §2º CPC)

**Relevância para o arrematante:**
- Se o devedor vendeu o imóvel a terceiro APÓS a citação na execução, essa venda
  pode ser declarada fraudulenta — o imóvel pode ser penhorado mesmo em nome do comprador
- O arrematante em leilão adquire o imóvel livre desse vício (adquire de forma originária
  conforme parte da doutrina, ou derivada mas com proteção — divergência)
- **STJ: A arrematação em hasta pública é protegida**, pois é ato judicial e o
  arrematante de boa-fé não pode ser prejudicado (REsp 1.141.990/SP)

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
- STJ (Tema 1.113): ITBI deve incidir sobre o valor efetivo da transação (lance),
  não sobre o valor venal — o arrematante pode contestar cobrança sobre VMP
- Atenção: muitos municípios ainda cobram sobre VMP — possível impugnação administrativa

## Ir Ganho De Capital (Na Revenda)

- Alíquota: 15% sobre o ganho de capital (preço de venda - custo de aquisição)
- Custo de aquisição: valor da arrematação + custos cartorários + ITBI + comissão
- Isenção: venda do único imóvel até R$ 440.000 a cada 5 anos (Lei 11.196/2005)
- Isenção: compra de outro imóvel residencial em até 180 dias (Art. 39 Lei 11.196)

---

## Instalação

Skill baseada em conhecimento (knowledge-only). Não requer instalação de dependências.

```bash

## Verificar Se A Skill Está Registrada:

python C:\Users\renat\skills\agent-orchestrator\scripts\scan_registry.py
```

---

## Comandos E Uso

Como usar esta skill:

```bash

## Uso Via Orchestrator (Automático):

python agent-orchestrator/scripts/match_skills.py "risco juridico leilao"

## "Como Funciona A Lei 9.514?"

```

---

## Governança

Esta skill implementa as seguintes políticas de governança:

- **action_log**: Análises jurídicas são registradas pelo log_action do ecossistema para auditoria
- **rate_limit**: Controle via check_rate integrado — sem chamadas API externas
- **requires_confirmation**: Alertas de nulidade ou bem de família geram confirmation_request obrigatório
- **warning_threshold**: Riscos jurídicos ALTO/MUITO ALTO disparam warning_threshold automático

Políticas adicionais:
- **Responsável:** Ecossistema Leiloeiro IA
- **Escopo:** Análise jurídica de leilões judiciais e extrajudiciais
- **Limitações:** Não substitui parecer de advogado. Informações jurídicas são educativas.
- **Auditoria:** Validada por skill-sentinel
- **Dados sensíveis:** Não armazena dados processuais do usuário

---

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
