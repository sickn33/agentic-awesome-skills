---
name: leiloeiro-mercado
description: Analise de mercado imobiliario para leiloes. Liquidez, desagio tipico, ROI, estrategias de saida (flip/reforma/renda), Selic 2025 e benchmark CDI/FII.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- market-analysis
- real-estate
- roi
- brazilian
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL DE MERCADO — ANALISTA DE ATIVOS IMOBILIÁRIOS EM LEILÃO

## Overview

Analise de mercado imobiliario para leiloes. Liquidez, desagio tipico, ROI, estrategias de saida (flip/reforma/renda), Selic 2025 e benchmark CDI/FII.

## When to Use This Skill

- When the user mentions "mercado leilao imovel" or related topics
- When the user mentions "roi leilao" or related topics
- When the user mentions "liquidez imovel leilao" or related topics
- When the user mentions "desagio leilao" or related topics
- When the user mentions "flip imovel leilao" or related topics
- When the user mentions "reforma leilao" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro mercado
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Você é um **Analista Profissional de Mercado Imobiliário** especializado em
ativos estressados (distressed assets) e leilões, com visão estratégica de
investimento, liquidez, retorno e timing de mercado.

---

## Mapa De Liquidez (Tempo Médio De Revenda Pós-Arrematação)

| Segmento | Capital SP/RJ | Capitais Grandes | Interior | Interior Pequeno |
|----------|--------------|-----------------|----------|-----------------|
| Apart. 1-2 quartos | 30-60 dias | 60-90 dias | 90-180 dias | 180-360 dias |
| Apart. 3 quartos | 60-90 dias | 90-150 dias | 120-240 dias | 240+ dias |
| Casa condomínio | 60-120 dias | 90-180 dias | 120-240 dias | 240+ dias |
| Sala comercial | 120-240 dias | 180-360 dias | 360+ dias | 360+ dias |
| Terreno urbano | 90-180 dias | 180-360 dias | 180-360 dias | 360+ dias |
| Galpão logístico | 90-180 dias | 90-180 dias | 180-360 dias | 360+ dias |
| Imóvel rural | 180-360 dias | 360+ dias | 360+ dias | 360+ dias |

**Fatores que aceleram a venda:**
- Preço abaixo do mercado (10-15% de desconto)
- Imóvel reformado e apresentável
- Documentação regularizada
- Boa foto e anúncio em portais (ZAP, Viva Real)
- Corretor CRECI com carteira de clientes

**Fatores que travam a venda:**
- Pendências documentais (ITBI não pago, matrícula não atualizada)
- Imóvel em mau estado / obras inacabadas
- Débitos não quitados que aparecem na matrícula
- Litígio pendente no imóvel (ação real)

---

## Por Modalidade

**Leilões Judiciais (CPC):**
```
1º Leilão (mínimo = avaliação):
  - Frequência de arrematação no 1º: 20-30%
  - Deságio médio nas arrematações do 1º: 0-15% (compram pela avaliação)

2º Leilão (sem mínimo / veda vil preço):
  - Frequência de arrematação no 2º: 50-70%
  - Deságio médio nas arrematações do 2º: 30-50%
  - Deságio máximo observado: até 65-70% (imóveis problemáticos)
```

**Leilões Extrajudiciais (Lei 9.514/97 — Bancos):**
```
1º Leilão (mínimo = valor do imóvel, dado em contrato):
  - Frequência de arrematação: 30-50%
  - Deságio médio: 20-35%
  - CEF: deságio médio histórico ~28%

2º Leilão (mínimo = saldo devedor):
  - Frequência de arrematação: 60-80%
  - Deságio médio: 35-55%
  - Oportunidade: saldo devedor pode ser muito menor que valor de mercado
```

**Venda Direta Bancária:**
```
Negociação direta (sem concorrência):
  - Deságio médio: 15-30%
  - Menos competição que leilão
  - Possibilidade de financiamento pelo próprio banco
  - CEF financia até 80% do valor de avaliação nas vendas diretas
```

## Mapa De Deságio Por Situação Do Imóvel

| Situação | Faixa de Deságio |
|----------|-----------------|
| Desocupado, sem débitos, documentação ok | 15-25% |
| Desocupado, débitos quantificados | 25-35% |
| Ocupado (devedor cooperativo) | 30-40% |
| Ocupado (litigioso) + débitos | 40-55% |
| Irregular documentalmente | 35-50% |
| Imóvel em mau estado | 35-55% |
| Combinação de problemas | 50-70% |

---

## Estratégia A — Flip Rápido (Curto Prazo)

**Perfil:** Investidor com capital e rede de compradores finais.

```
Comprar com deságio de 35%+
↓
Regularizar documentação (1-3 meses)
↓
Reforma leve se necessário (opcional)
↓
Vender com 15-20% de desconto sobre VMP (mais rápido que mercado)
↓
Lucro bruto: 15-20% sobre o investido em 3-9 meses
```

**Análise:**
- Retorno bruto esperado: 15-25%
- Prazo: 3-12 meses
- Risco: médio (se imóvel bem selecionado)
- Capital necessário: 100% do lance + custos

## Estratégia B — Reforma E Valorização (Médio Prazo)

**Perfil:** Investidor com capital e conhecimento em obras.

```
Comprar com deságio de 40%+
↓
Reforma completa (3-6 meses)
↓
Vender pelo valor de mercado de imóvel reformado (premium de 20-30%)
↓
Lucro bruto: 30-50% sobre o investido
```

**Análise:**
- Retorno bruto esperado: 30-50%
- Prazo: 6-18 meses
- Risco: médio-alto (risco de obra e mercado)
- Capital necessário: 100% lance + 20-30% do lance em reforma

## Estratégia C — Renda (Longo Prazo)

**Perfil:** Investidor que busca fluxo de caixa passivo.

```
Comprar com deságio de 25%+
↓
Regularizar e alugar (1-3 meses)
↓
Receber aluguel abaixo do preço de mercado (para locar rápido)
↓
Yield superior ao mercado pela base de custo menor
```

**Yield típico no Brasil:**
- Yield mercado normal: 4-6% a.a. (grandes capitais)
- Yield em imóvel arrematado com 30% de deságio: 6-9% a.a.
- Yield em imóvel arrematado com 40% de deságio: 7-12% a.a.

## Estratégia D — Regularização E Revenda (Especialista)

**Perfil:** Advogado/especialista com capacidade de resolver situações complexas.

```
Comprar imóvel com problemas jurídicos/documentais com deságio de 50%+
↓
Resolver pendências: irregular, sem habite-se, área divergente
↓
Vender regularizado pelo valor de mercado
↓
Lucro bruto: 40-70% sobre o investido
```

---

## Simulação Rápida De Roi

```
DADOS DO LOTE:
Valor de Avaliação (VAN):           R$ _____________
Valor de Mercado Estimado (VMP):    R$ _____________
Lance Pretendido:                   R$ _____________
Deságio sobre VMP:                  ____%

CUSTOS DE AQUISIÇÃO:
Comissão Leiloeiro (5%):            R$ _____________
ITBI (3% sobre VMP):                R$ _____________
Registro + Escritura:               R$ _____________
Advogado (se necessário):           R$ _____________
Débitos (IPTU + Cond.):             R$ _____________
Obras/Reforma:                      R$ _____________
Custo Total:                        R$ _____________

CUSTO TOTAL INVESTIDO:              R$ _____________

CENÁRIO DE SAÍDA:
Valor de Venda Esperado:            R$ _____________
Comissão corretagem (5-6%):         R$ _____________
IRPF Ganho de Capital (15%):        R$ _____________

RESULTADO:
Lucro Bruto:                        R$ _____________
Lucro Líquido:                      R$ _____________
ROI Bruto:                          ____%
ROI Líquido:                        ____%
Prazo Estimado:                     ___ meses
Retorno Anualizado (a.a.):          ____%
```

**Benchmarks de comparação:**
- CDI 2024: ~10.5% a.a.
- IPCA 2024: ~4.5% a.a.
- LCI/LCA isentas: ~9-10% a.a.
- FIIs (yield médio): ~9-11% a.a.
- **Para valer a pena vs. CDI:** ROI anualizado mínimo de 15-20%

---

## Melhor Momento Para Comprar Em Leilão

**Ciclo Imobiliário e Oportunidades:**
```
ALTA DE JUROS (SELIC alta):
  → Crédito mais caro → mais inadimplência → mais leilões
  → Menor concorrência por imóveis → MELHOR MOMENTO PARA COMPRAR
  → Selic acima de 12%: mercado de leilões aquece (oferta sobe)

BAIXA DE JUROS (SELIC baixa):
  → Crédito barato → menos inadimplência → menos leilões
  → Maior competição pelos lotes → preços sobem
  → Selic abaixo de 9%: mercado de leilões se contrai
```

**Sazonalidade:**
- **Dezembro/Janeiro:** Leilões com menos concorrência (férias, festas)
- **Março-Abril:** Início de ano fiscal — leilões da Caixa com novos lotes
- **Julho:** Período de férias — competição reduzida
- **Outubro/Novembro:** Alta temporada de leilões judiciais (fim do ano processual)

## Análise Por Banco

**Caixa Econômica Federal:**
- Maior estoque de imóveis retomados do Brasil (>20.000 imóveis em 2024)
- Programas próprios: Venda Online, Licitação Aberta, Proposta Online
- Forte em imóveis do PMCMV/MCMV — popular/econômico
- Financia arrematação: até 80% do valor de avaliação
- Diferencial: possibilidade de usar FGTS para completar o pagamento

**Santander:**
- Estoque médio, foco em imóveis de médio-alto padrão
- Plataforma santanderx.com.br
- Leilões mensais regulares

**Itaú/Bradesco/BB:**
- Estoques menores, imóveis de todos os padrões
- Leilões extrajudiciais mais frequentes que judiciais
- Tendem a limpar o estoque em dezembro

---

## 6. Análise Do Perfil De Comprador Final

Identificar o perfil correto do comprador final aumenta a velocidade de venda:

| Perfil | Imóvel Ideal | Canal de Venda |
|--------|-------------|----------------|
| Família classe média | Apt 3Q, casa condomínio | ZAP, Viva Real, corretor |
| Jovem casal | Studio, 1-2Q, localização central | Instagram, Quinto Andar |
| Empresário/Investidor | Comercial, galpão, terreno | Indicação, CRECI |
| Locador | Apt bem localizado, studio | Imobiliárias especializadas |
| Incorporador | Terreno em ZEU/ZC | Construtoras, brokers |
| FII/REIT | Galpão, laje corporativa, varejo | B3, gestores de FII |

---

## Riscos Que Afetam A Estratégia De Saída

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Mercado local sofre queda | Médio | Alto | Diversificar geograficamente |
| Imóvel não aluga/vende no prazo | Médio | Médio | Aceitar desconto maior na saída |
| Reforma acima do orçamento | Alto | Médio | Margem de 30% para obras |
| Novo empreendimento concorrente | Baixo | Médio | Verificar alvarás no entorno |
| Aprovação de zoneamento negativo | Baixo | Alto | Verificar plano diretor municipal |
| Desaceleração econômica | Médio | Alto | Priorizar imóveis de necessidade básica |
| Alta súbita da Selic | Baixo | Médio | Saída rápida (flip) vs. renda |

---

## Rotina De Monitoramento Semanal

```
1. ALERTAS ATIVOS:
   - ZAP Imóveis: configurar alertas por bairro, tipo e preço
   - Viva Real: idem
   - CEF Imóveis: acompanhar novos lotes (atualiza ~semanal)
   - Leilão Judicial (TJ): configurar alertas por comarca

2. ANÁLISE DE NOVO LOTE (30 min):
   a) Abrir edital → verificar Bloco 1-8 (SKILL de Edital)
   b) Pesquisar comparáveis no ZAP/Viva Real no bairro
   c) Verificar Google Street View da localização
   d) Calcular ROI na planilha (Bloco 4 desta skill)
   e) Solicitar certidão de ônus no cartório (se interessante)

3. DILIGÊNCIA PRESENCIAL (se ROI > 20%):
   - Visitar o imóvel (ou vizinhança)
   - Conversar com síndico/vizinhos
   - Verificar estado de conservação real
   - Confirmar informações do edital

4. DECISÃO FINAL:
   - Score de Risco do Edital (SKILL de Risco)
   - ROI líquido vs. CDI
   - Capital disponível e prazo
   - Lance máximo definido → ENTRAR NO LEILÃO
```

---

## Indicadores Chave (Atualizar Periodicamente)

```
SELIC Meta (fev/2025):           13,25% a.a.
CDI:                             ~13,15% a.a.
IPCA (12 meses):                 ~5,0% a.a.
IGP-M (12 meses):                ~4,5% a.a.
Dólar (USD/BRL):                 ~5,80-6,00
Poupança (a.a.):                 ~7,7% (quando Selic > 8,5%)
LCI/LCA (isenta IR):             ~10-12% a.a.
FIIs - dividend yield médio:     ~10-12% a.a. (IFIX)
```

**Impacto no Mercado de Leilões (Selic 13,25%):**
- Crédito imobiliário mais caro → mais inadimplência → MAIS LEILÕES
- Taxa de financiamento habitacional: ~11-13% a.a. (TR+10 a TR+12)
- Demanda por imóveis desacelera → mais tempo para vender
- Bancos querem limpar estoques → deságios maiores em venda direta
- **MOMENTO FAVORÁVEL para comprar em leilão (mais oferta, menos concorrência)**

## Análise De Financiamento Pós-Arrematação

**Custo do financiamento em cenário atual:**
```
Valor financiado: R$ 300.000
Prazo: 360 meses
Taxa: 11,5% a.a. (média CEF 2025)
Parcela inicial: ~R$ 3.450
Total pago em 30 anos: ~R$ 700.000

Para valer a pena financiar imóvel de leilão:
→ O deságio precisa ser MAIOR que o custo financeiro adicional
→ Regra prática: só financia se deságio for > 30% E taxa < 12% a.a.
→ Pagamento à vista SEMPRE é mais vantajoso se tiver capital
```

## Benchmark: Quanto O Leilão Precisa Render Para Superar O Cdi?

```
Capital: R$ 500.000
CDI líquido (15% IR sobre 13,15%): ~11,2% a.a. = R$ 56.000/ano

Para superar CDI em 12 meses:
→ Precisa lucrar > R$ 56.000 líquido na arrematação
→ Sobre capital de R$ 500k, precisa de ROI > 11,2% a.a.
→ Considerando custos (ITBI, comissão, registro = ~10%):
→ DESÁGIO MÍNIMO para superar CDI: ~25% sobre VMP
```

---

## Quadro Comparativo De Investimento

| Investimento | Retorno Esperado | Risco | Liquidez | Capital Mín. |
|-------------|-----------------|-------|----------|-------------|
| CDI/Tesouro Selic | 11-13% a.a. | Muito baixo | D+0 a D+1 | R$ 30 |
| FIIs (IFIX) | 10-12% a.a. | Médio | D+2 | R$ 100 |
| LCI/LCA | 10-12% a.a. | Baixo | Carência 90d | R$ 1.000 |
| Imóvel compra direta | 4-8% a.a. (renda) | Médio | 3-12 meses | R$ 200k+ |
| **Leilão — Flip** | **20-50% no período** | **Médio-Alto** | **3-12 meses** | **R$ 50k+** |
| **Leilão — Renda** | **8-15% a.a.** | **Médio** | **12+ meses** | **R$ 100k+** |
| **Leilão — Reforma** | **30-60% no período** | **Alto** | **6-18 meses** | **R$ 150k+** |

**Conclusão:** Leilão só supera CDI de forma consistente com:
1. Deságio mínimo de 25-30%
2. Due diligence completa (reduzir surpresas)
3. Estratégia de saída definida antes do lance
4. Reserva de 15-20% do capital para imprevistos

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

python agent-orchestrator/scripts/match_skills.py "mercado imobiliario leilao"

## "Compare Leilão Vs Cdi"

```

---

## Governança

Esta skill implementa as seguintes políticas de governança:

- **action_log**: Análises de mercado são registradas pelo log_action para rastreabilidade
- **rate_limit**: Controle via check_rate integrado ao ecossistema
- **requires_confirmation**: Projeções de ROI negativo geram confirmation_request ao usuário
- **warning_threshold**: ROI abaixo do CDI dispara warning_threshold com alerta automático

Políticas adicionais:
- **Responsável:** Ecossistema Leiloeiro IA
- **Escopo:** Análise de mercado imobiliário e estratégias de investimento em leilão
- **Limitações:** Projeções e estimativas. Não constitui recomendação de investimento.
- **Auditoria:** Validada por skill-sentinel
- **Dados sensíveis:** Não armazena dados financeiros do usuário

---

## Referências

Fontes e referências de mercado:
- ZAP Imóveis (zapimoveis.com.br) — dados de mercado
- Viva Real (vivareal.com.br) — comparativos de preço
- FIPEZAP — índice de preços imobiliários
- IFIX (B3) — índice de fundos imobiliários
- SINDUSCON-SP — CUB e custos de construção
- Banco Central — Selic, CDI, séries históricas
- CEF — portal de imóveis retomados

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
- `leiloeiro-juridico` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
