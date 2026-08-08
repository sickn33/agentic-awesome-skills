---
name: leiloeiro-edital
description: Analise e auditoria de editais de leilao judicial e extrajudicial. Riscos ocultos, clausulas perigosas, debitos, ocupante e classificacao da oportunidade.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- auction
- legal-analysis
- risk
- brazilian
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL DE EDITAL — ANÁLISE PERICIAL DE EDITAIS DE LEILÃO

## Overview

Analise e auditoria de editais de leilao judicial e extrajudicial. Riscos ocultos, clausulas perigosas, debitos, ocupante e classificacao da oportunidade.

## When to Use This Skill

- When the user mentions "edital leilao" or related topics
- When the user mentions "analise edital leilao" or related topics
- When the user mentions "riscos edital" or related topics
- When the user mentions "clausulas edital" or related topics
- When the user mentions "debitos imovel leilao" or related topics
- When the user mentions "ler edital" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro edital
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Você é um **Perito Especializado em Editais de Leilão**, com capacidade de extrair
e analisar cada cláusula crítica de qualquer edital de leilão judicial ou extrajudicial.

---

## Protocolo De Análise De Edital

Ao receber um edital (ou informações dele), execute SEMPRE os 8 blocos abaixo:

---

## Bloco 1 — Identificação E Enquadramento

**Extrair do edital:**
- Número do processo (se judicial)
- Nome do leiloeiro e habilitação (CRC/Junta Comercial)
- Plataforma de leilão (presencial / online — qual portal)
- Data, hora e local do 1º leilão
- Data, hora e local do 2º leilão
- Comitente (quem manda leiloar): banco, exequente, cartório
- Tipo: JUDICIAL (CPC) ou EXTRAJUDICIAL (Lei 9.514/97)

**Classificação inicial:**
```
Tipo: [ ] Judicial  [ ] Extrajudicial - Alienação Fiduciária  [ ] Venda Direta
Modalidade: [ ] 1º Leilão  [ ] 2º Leilão  [ ] Único
Plataforma: ___________
Data/Hora: ___________
```

---

## Bloco 2 — Descrição E Localização Do Imóvel

**Verificar:**
- Endereço completo e preciso (CEP, número, complemento)
- Tipo: casa, apartamento, terreno, sala comercial, galpão, rural
- Área total e área construída (comparar com matrícula)
- Nº da matrícula e cartório de registro
- Número do IPTU / código municipal
- Padrão construtivo descrito no edital
- Estado de conservação declarado
- Vaga de garagem inclusa (se sim, matrícula própria ou vinculada?)

**Alertas:**
- ⚠️ Área declarada no edital ≠ área da matrícula → possível irregularidade
- ⚠️ Sem número de matrícula → pesquisar antes de arrematar
- ⚠️ Descrição vaga ("imóvel no seguinte endereço...") → solicitar laudo de avaliação

---

## Bloco 3 — Valor De Avaliação E Lance Mínimo

**Extrair e calcular:**
```
Valor de Avaliação (VAN):          R$ _____________
Lance Mínimo 1º Leilão:            R$ _____________  (= VAN em judicial / VAN em extraJ)
Lance Mínimo 2º Leilão:            R$ _____________  (50% VAN em judicial / dívida em extraJ)
Data da Avaliação:                 _______________
Avaliador responsável:             _______________
```

**Análise de Deságio:**
- Deságio sobre VAN no lance mínimo do 1º: ____%
- Deságio sobre VAN no lance mínimo do 2º: ____%
- Deságio real (comparado ao valor de mercado estimado): ____%

**Alertas:**
- ⚠️ Avaliação com mais de 12 meses → risco de defasagem — pedir reavaliação possível (Art. 873 CPC)
- ⚠️ VAN muito abaixo do mercado → investigar laudos ou favorecimento
- ⚠️ VAN muito acima do mercado → leilão não vai arrematar no 1º; aguardar 2º
- ⚠️ Leilão extrajudicial 2º: lance mínimo = dívida → pode ser MUITO abaixo do valor de mercado (ótima oportunidade)

---

## Bloco 4 — Situação Do Imóvel (Posse E Ocupação)

**Verificar no edital:**
- [ ] Imóvel desocupado (pronto para uso)
- [ ] Imóvel ocupado pelo executado/devedor
- [ ] Imóvel ocupado por terceiro (locatário ou invasor)
- [ ] Situação omissa no edital (⚠️ RISCO)

**Impacto da Ocupação:**

| Situação | Risco | Custo Estimado | Prazo |
|----------|-------|----------------|-------|
| Desocupado | Baixo | Zero | Imediato |
| Devedor cooperativo | Médio-Baixo | Negociação | 30-90 dias |
| Devedor resistente | Alto | R$ 5-15k (ação) | 6-18 meses |
| Locatário com contrato | Médio | Indenização | 3-6 meses |
| Terceiro invasor | Alto | Ação reintegração | 6-24 meses |

**Se ocupado, verificar:**
- Há previsão no edital de quem responde pela desocupação?
- Há liminar de imissão na posse já concedida?
- O arrematante recebe com ou sem assistência jurídica do banco/credor?
- Locação registrada na matrícula? (Locação com prazo vigente pode ter de ser respeitada)

---

### 5.1 Responsabilidade Por Débitos — O Que Diz O Edital?

**Verificar especificamente:**
- [ ] IPTU — valor dos débitos e quem responde
- [ ] Condomínio — valor dos débitos e quem responde
- [ ] Taxa de lixo, iluminação pública
- [ ] Débitos de água/esgoto (SABESP, CEDAE etc.)
- [ ] Taxas de melhoria e obras municipais

**Leitura crítica das cláusulas:**

| Redação no Edital | Interpretação | Risco |
|-------------------|---------------|-------|
| "O imóvel é vendido no estado em que se encontra" | Débitos podem acompanhar | Alto |
| "Livre de ônus" | Arrematante não responde | Baixo |
| "Débitos a cargo do arrematante" | Você paga tudo | Alto — quantificar |
| "Edital silente sobre débitos" | Regra propter rem se aplica | Médio |
| "Débitos a serem pagos com o produto da arrematação" | Juiz reserva verba | Baixo |

**QUANTIFICAR SEMPRE:**
Antes de arrematar, obter:
1. Certidão de débitos de IPTU (prefeitura)
2. Extrato de débitos de condomínio (síndico/administradora)
3. Declaração de débitos de água/gás

### 5.2 Ônus Reais Registrados Na Matrícula

**Verificar no edital e na matrícula:**
- [ ] Hipoteca (qual banco, qual valor, qual data)
- [ ] Alienação fiduciária anterior (antes da penhora)
- [ ] Usufruto registrado (quem é o usufrutuário? vida útil estimada?)
- [ ] Servidão (de passagem, de utilidade pública)
- [ ] Cláusula de inalienabilidade (herança com cláusula)
- [ ] Aforamento — terreno de marinha (laudêmio: 5% do valor a cada transmissão)
- [ ] Penhoras anteriores (outro processo — qual é a preferência?)

**Atenção especial:**
- Usufruto vitalício → arrematante não tem direito de uso enquanto o usufrutuário viver
- Aforamento → pagar laudêmio + foro anual à SPU
- Hipoteca anterior à penhora → verificar se foi citada na execução (sub-rogação)

---

## Bloco 6 — Condições De Pagamento

**Extrair do edital:**
- Forma de pagamento aceita (dinheiro, TED, cheque, carta de crédito)
- Prazo para pagamento à vista
- Possibilidade de parcelamento — Art. 895 CPC:
  - 25% à vista no ato da arrematação
  - Saldo em até 30 dias (ou conforme determinado)
- Financiamento bancário aceito? Qual banco?
- Comissão do leiloeiro: ____% (padrão: 5%)
- Incide sobre o valor do lance ou separadamente?
- ITBI (imposto municipal de transmissão): ___% (varia por município — média 2-3%)
  - São Paulo: 3%
  - Rio de Janeiro: 3%
  - Belo Horizonte: 3%
- Custas de registro e escritura: _____ (tabela do cartório)

**Custo Total Estimado:**
```
Lance arrematado:                  R$ _____________
(+) Comissão leiloeiro (5%):       R$ _____________
(+) ITBI (2-3%):                   R$ _____________
(+) Registro cartório:             R$ _____________
(+) Advogado (imissão, se necessário): R$ ________
(+) Débitos IPTU acumulados:       R$ _____________
(+) Débitos condomínio:            R$ _____________
(+) Obras/adequações estimadas:    R$ _____________
= CUSTO TOTAL REAL:                R$ _____________
```

---

## Bloco 7 — Regularidade Documental E Jurídica

**Verificar itens de conformidade do edital:**

**a) Publicação do edital (Art. 887 CPC / Art. 27 Lei 9.514):**
- [ ] Publicado no Diário Oficial?
- [ ] Publicado em jornal de grande circulação?
- [ ] Publicado no portal do tribunal (se judicial)?
- [ ] Antecedência mínima de 5 dias respeitada?

**b) Intimações obrigatórias (Art. 889 CPC):**
- [ ] Devedor/fiduciante intimado?
- [ ] Cônjuge/companheiro intimado?
- [ ] Credor hipotecário intimado (se houver)?
- [ ] Usufrutuário intimado (se houver)?
- [ ] Titular de direito de preferência intimado?

**c) Leiloeiro habilitado:**
- [ ] Nome e matrícula na Junta Comercial
- [ ] Credenciado no juízo (se judicial)
- [ ] Leilão extrajudicial: leiloeiro nomeado pelo credor fiduciário

**d) Edital completo (Art. 887, §1º CPC):**
- [ ] Descrição do bem
- [ ] Valor de avaliação
- [ ] Ônus existentes
- [ ] Condições de pagamento
- [ ] Local, dia e hora do leilão

---

## Matriz De Risco Do Edital

**Pontuação (somar pontos):**

| Fator | Baixo Risco (0) | Médio Risco (1) | Alto Risco (2) |
|-------|----------------|----------------|----------------|
| Posse | Desocupado | Ocupado (cooperativo) | Ocupado (litigioso) |
| Débitos | Livres de ônus | Informados e quantificados | Omissos ou altos |
| Ônus Reais | Nenhum | Hipoteca subrogada | Usufruto/penhoras |
| Documentação | Perfeita | Pequenas irregularidades | Sem habite-se/averbação |
| Processo | Sem embargos | Embargos sem suspensão | Embargos com suspensão |
| Avaliação | Atualizada e justa | Defasada | Superfaturada/subfaturada |
| Deságio | > 40% | 20-40% | < 20% |

```
SCORE DE RISCO: ____ / 14

0-2: BAIXO RISCO ✅
3-6: MÉDIO RISCO ⚠️
7-10: ALTO RISCO 🔴
11-14: MUITO ALTO RISCO ❌
```

## Veredicto Final Do Edital

```
EDITAL #_______________
Imóvel: _______________
Data do Leilão: ___________

SCORE DE RISCO: [  ] / 14
CLASSIFICAÇÃO: [ ] BAIXO  [ ] MÉDIO  [ ] ALTO  [ ] MUITO ALTO

DESÁGIO POTENCIAL: ____%
CUSTO TOTAL ESTIMADO: R$ ___________
VALOR DE MERCADO ESTIMADO: R$ ___________
MARGEM DE SEGURANÇA: R$ ___________

PRINCIPAIS PONTOS POSITIVOS:
✅ _______________
✅ _______________

PRINCIPAIS ALERTAS:
⚠️ _______________
⚠️ _______________

AÇÃO RECOMENDADA:
[ ] ARREMATAR — Oportunidade clara
[ ] ARREMATAR com cautelas (descrever)
[ ] AGUARDAR 2º LEILÃO
[ ] NÃO ARREMATAR — Risco supera oportunidade
[ ] DILIGÊNCIAS NECESSÁRIAS ANTES DE DECIDIR
```

---

## Prazos Importantes

| Prazo | Evento | Base Legal |
|-------|--------|-----------|
| 5 dias | Antecedência mínima de publicação do edital | Art. 887 CPC |
| 15 dias | Purga da mora (extrajudicial) | Art. 26, §1º Lei 9.514/97 |
| 10 dias | Prazo para anular arrematação por vício | Art. 903 CPC |
| 30 dias | 1º ao 2º leilão extrajudicial | Art. 27 Lei 9.514/97 |
| 60 dias | Prazo para imissão na posse (judicial) | Art. 894 CPC |
| 15 dias | Pagamento do saldo após arrematação | Art. 890 CPC |

## Custos Típicos Por Estado (Itbi)

| Município | ITBI |
|-----------|------|
| São Paulo (SP) | 3% |
| Rio de Janeiro (RJ) | 3% |
| Belo Horizonte (MG) | 3% |
| Curitiba (PR) | 2,7% |
| Porto Alegre (RS) | 3% |
| Salvador (BA) | 3% |
| Brasília (DF) | 3% |
| Fortaleza (CE) | 2% |
| Recife (PE) | 3% |
| Manaus (AM) | 2% |

*Verificar sempre no site da prefeitura — alíquotas podem mudar*

---

## Bloco Extra — Editais De Venda Direta (Cef, Bb, Santander)

Os editais de venda direta bancária têm formato diferente dos judiciais. Pontos específicos:

## Venda Online Caixa (Caixavbr.Com.Br)

**Estrutura do edital CEF:**
```
1. Identificação do lote (número, endereço, matrícula)
2. Valor mínimo de venda (VMAV — Valor Mínimo de Aquisição e Venda)
3. Forma de pagamento aceita:
   - À vista (desconto de 5-10%)
   - Financiamento pela própria CEF (até 80% do VMAV)
   - FGTS: pode ser usado para parte do pagamento
4. Estado do imóvel: "no estado em que se encontra"
5. Responsabilidade por débitos: geralmente a cargo do arrematante
6. Comissão do leiloeiro/intermediário: 5%
7. Prazo para desocupação (se ocupado): responsabilidade do comprador
```

**Diferenciais CEF:**
- Possibilidade de usar FGTS (desde que atenda requisitos SFH)
- Financiamento até 360 meses pelo próprio banco
- Desconto adicional para pagamento à vista
- Imóveis do PMCMV/MCMV: valores populares, alta demanda
- Edital não precisa cumprir CPC (não é leilão judicial)

## Venda Direta Bb / Santander / Itaú

**Padrão comum:**
- Edital simplificado (não segue CPC)
- Valor de venda definido pelo banco (laudo interno)
- Comissão de intermediação: 5-6%
- Financiamento pelo próprio banco pode ser oferecido
- Imóvel vendido "no estado em que se encontra e ônus"
- **ATENÇÃO:** "e ônus" = arrematante assume TUDO (IPTU, condomínio, obras, ocupação)

## Checklist Específico Para Venda Direta

- [ ] VMAV é razoável comparado ao mercado? (pesquisar ZAP/VivaReal)
- [ ] Aceita financiamento? Qual percentual?
- [ ] Aceita FGTS?
- [ ] Prazo para proposta e pagamento
- [ ] Comissão de intermediação (embutida ou separada)
- [ ] Responsabilidade explícita por débitos de IPTU/Condomínio
- [ ] Imóvel listado como ocupado ou desocupado
- [ ] Existe vistoria disponível (fotos/laudo do banco)

---

## Modelo De Planilha De Custos Do Arrematante

Preencher para cada lote analisado:

```
╔══════════════════════════════════════════════════════════╗
║             PLANILHA DE CUSTOS — LOTE #_______          ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  VALOR DO LANCE PRETENDIDO:          R$ ______________   ║
║                                                          ║
║  CUSTOS DE AQUISIÇÃO:                                    ║
║  (+) Comissão leiloeiro (5%):        R$ ______________   ║
║  (+) ITBI (3% sobre VMP ou lance):   R$ ______________   ║
║  (+) Escritura pública:              R$ ______________   ║
║  (+) Registro no CRI:                R$ ______________   ║
║  (+) Certidões (CND, ônus):          R$ ______________   ║
║  (+) Advogado (se necessário):       R$ ______________   ║
║                                                          ║
║  PASSIVOS DO IMÓVEL:                                     ║
║  (+) IPTU em atraso:                 R$ ______________   ║
║  (+) Condomínio em atraso:           R$ ______________   ║
║  (+) Água/gás em atraso:             R$ ______________   ║
║  (+) Laudêmio (se foreiro):          R$ ______________   ║
║                                                          ║
║  CUSTOS OPERACIONAIS:                                    ║
║  (+) Desocupação (estimativa):       R$ ______________   ║
║  (+) Reforma estimada:               R$ ______________   ║
║  (+) Regularização documental:       R$ ______________   ║
║                                                          ║
║  ═══════════════════════════════════════════════════════  ║
║  CUSTO TOTAL INVESTIDO:              R$ ______________   ║
║                                                          ║
║  VALOR DE MERCADO ESTIMADO (VMP):    R$ ______________   ║
║  MARGEM DE SEGURANÇA:                R$ ______________   ║
║  MARGEM (%):                         _____%             ║
║                                                          ║
║  VERED

## Instalação

Skill baseada em conhecimento (knowledge-only). Não requer instalação de dependências.

```bash

### Verificar Se A Skill Está Registrada:

python C:\Users\renat\skills\agent-orchestrator\scripts\scan_registry.py
```

---

## Comandos E Uso

Como usar esta skill:

```bash

### Uso Via Orchestrator (Automático):

python agent-orchestrator/scripts/match_skills.py "analisar edital leilao"

## "O Que Verificar Nesse Edital Da Caixa?"

```

---

## Governança

Esta skill implementa as seguintes políticas de governança:

- **action_log**: Cada análise de edital é registrada pelo log_action para rastreabilidade
- **rate_limit**: Controle via check_rate integrado ao ecossistema
- **requires_confirmation**: Veredicto "NÃO ARREMATAR" gera confirmation_request ao usuário
- **warning_threshold**: Score de risco >10/14 dispara warning_threshold com alerta automático

Políticas adicionais:
- **Responsável:** Ecossistema Leiloeiro IA
- **Escopo:** Análise pericial de editais de leilão judicial e extrajudicial
- **Limitações:** Análise baseada em informações fornecidas. Não acessa processos judiciais.
- **Auditoria:** Validada por skill-sentinel
- **Dados sensíveis:** Não armazena dados de editais analisados

---

## Armadilhas Comuns Em Editais — Top 10

| # | Armadilha | Como Detectar | Impacto |
|---|-----------|---------------|---------|
| 1 | "No estado em que se encontra e ônus" | Leitura atenta da cláusula de responsabilidade | Débitos surpresa |
| 2 | Edital silente sobre ocupação | Não menciona se ocupado/desocupado | Custo de desocupação |
| 3 | Avaliação de 3+ anos atrás | Data do laudo no edital | Valor defasado |
| 4 | Condomínio alto não informado | Não menciona valor da cota | Despesa fixa elevada |
| 5 | Imóvel em faixa de marinha | Descrição menciona "aforamento" ou "terreno de marinha" | Laudêmio de 5% |
| 6 | Fração ideal de garagem separada | Edital diz "exceto box" ou "garagem não inclusa" | Perde a vaga |
| 7 | Área construída não averbada | Matrícula com área menor que a real | Custo de regularização |
| 8 | 2º leilão = valor da dívida (não do mercado) | Extrajudicial — mínimo pode ser 20% do VMP | Parece ótimo, mas verificar débitos |
| 9 | Comissão não incluída no lance | "Comissão a cargo do arrematante ALÉM do lance" | 5% extra sobre o valor |
| 10 | Parcelamento com juros altíssimos | Ler cláusula de parcelamento (IGP-M, IPCA, 1% a.m.) | Custo financeiro oculto |

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
- `leiloeiro-ia` - Complementary skill for enhanced analysis
- `leiloeiro-juridico` - Complementary skill for enhanced analysis
- `leiloeiro-mercado` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
