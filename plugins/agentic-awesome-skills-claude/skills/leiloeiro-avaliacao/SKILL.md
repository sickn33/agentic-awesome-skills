---
name: leiloeiro-avaliacao
description: Avaliacao pericial de imoveis em leilao. Valor de mercado, liquidacao forcada, ABNT NBR 14653, metodos comparativo/renda/custo, CUB e margem de seguranca.
risk: safe
source: community
date_added: '2026-03-06'
author: renat
tags:
- real-estate
- valuation
- appraisal
- brazilian
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# SKILL DE AVALIAÇÃO DE IMÓVEL — PERITO AVALIADOR

## Overview

Avaliacao pericial de imoveis em leilao. Valor de mercado, liquidacao forcada, ABNT NBR 14653, metodos comparativo/renda/custo, CUB e margem de seguranca.

## When to Use This Skill

- When the user mentions "avaliar imovel leilao" or related topics
- When the user mentions "valor de mercado leilao" or related topics
- When the user mentions "laudo avaliacao leilao" or related topics
- When the user mentions "abnt nbr 14653" or related topics
- When the user mentions "valor venal imovel" or related topics
- When the user mentions "preco imovel leilao" or related topics

## Do Not Use This Skill When

- The task is unrelated to leiloeiro avaliacao
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

Você é um **Engenheiro/Arquiteto Avaliador Sênior** credenciado, com domínio na ABNT NBR 14653
e experiência em laudos periciais judiciais e extrajudiciais para leilões.

---

## Tipos De Valor (Abnt Nbr 14653-1)

| Conceito | Definição | Uso em Leilão |
|----------|-----------|--------------|
| **Valor de Mercado** | Quantia mais provável de transação livre, entre partes conscientes e sem coerção | Base do edital (avaliação judicial) |
| **Valor de Liquidação Forçada** | Quantia em venda compulsória em prazo curto | Estima o preço real de arrematação |
| **Valor de Uso** | Valor para um uso ou usuário específico | Análise do comprador final |
| **Custo de Reedição** | Custo de reproduzir o bem em condições similares | Avaliação de imóveis especiais/industriais |

**Relação prática:**
```
Valor de Mercado (VMP)
    × (1 - fator de liquidação)
= Valor de Liquidação Forçada (VLF)

Fator de liquidação típico: 0,20 a 0,40 (20% a 40% de deságio)
```

---

## Método 1 — Comparativo Direto (Principal)

Usado para: imóveis residenciais e comerciais com amostras de mercado disponíveis.

## Passo A Passo

**1. Pesquisa de Amostras**

Coletar mínimo 5 imóveis comparáveis (para Grau II/III ABNT):
- Mesmo bairro ou região comparável
- Mesmo tipo (apartamento, casa, sala comercial)
- Mesma faixa de área (±30%)
- Transações recentes (últimos 12 meses — idealmente 6)

**Fontes de dados:**
- ZAP Imóveis (zap.com.br) — anúncios ativos
- Viva Real (vivareal.com.br)
- OLX Imóveis
- Quinto Andar (quintoandar.com)
- Cartório de Imóveis — escrituras (mais confiável, mas acesso restrito)
- Avaliações de corretores locais (CRECI)

**2. Homogeneização das Amostras**

Ajustar cada amostra para torná-la comparável ao imóvel avaliando:

**Fatores de Homogeneização (multiplicadores):**

```
Fator Área:
- Imóveis menores tendem a ter valor unitário maior (R$/m²)
- Fórmula: Fa = (Área Padrão / Área Amostra)^0,25

Fator Padrão Construtivo (NBR 12721):
Luxo/Alto:    1,30
Normal/Médio: 1,00
Simples:      0,80
Mínimo:       0,65

Fator Estado de Conservação:
Novo/Reformado:  1,00
Bom:             0,90
Regular:         0,80
Mau:             0,65
Ruim:            0,50

Fator Localização (relativo à amostra):
Superior:    > 1,00
Similar:     1,00
Inferior:    < 1,00
(Calibrar pela infraestrutura local, comércio, transporte)

Fator Andar (apartamentos):
Andar baixo (1-3):   0,95
Andar médio (4-9):   1,00
Andar alto (10+):    1,05 a 1,15
Cobertura:           1,20 a 1,50

Fator Vaga de Garagem:
Sem vaga:  0,90 a 0,95
1 vaga:    1,00
2 vagas:   1,05 a 1,10
```

**3. Tratamento Estatístico**

Após homogeneização, calcular:
- Média dos valores unitários homogeneizados (R$/m²)
- Campo de arbítrio: ±15% (Grau I) / ±10% (Grau II)
- Eliminar outliers (amostras > 2 desvios padrão)

**4. Calcular o Valor Final**

```
Valor de Mercado = Valor Unitário Homogeneizado (R$/m²) × Área do Imóvel (m²)
```

---

## Método 2 — Renda (Imóveis Com Geração De Renda)

Usado para: shoppings, hotéis, lajes corporativas, postos de combustível, imóveis locados.

## Fórmula Básica

```
Renda Líquida Anual = Renda Bruta - Despesas Operacionais
Taxa de Capitalização (Cap Rate) = Renda Líquida / Valor de Mercado
Valor de Mercado = Renda Líquida / Cap Rate
```

**Cap Rates Típicos no Brasil (2024):**

| Segmento | Cap Rate |
|----------|---------|
| Residencial alto padrão SP/RJ | 4% - 6% |
| Residencial padrão médio | 5% - 8% |
| Salas comerciais | 7% - 10% |
| Galpões logísticos | 8% - 12% |
| Retail / Varejo | 8% - 12% |
| Hotéis | 10% - 15% |

**Exemplo:**
- Imóvel comercial locado por R$ 10.000/mês
- Despesas: IPTU R$ 500/mês + condomínio R$ 800/mês + vacância 5%
- Renda líquida: R$ (10.000 - 500 - 800) × (1 - 0,05) = R$ 8.265/mês → R$ 99.180/ano
- Cap Rate local: 8%
- Valor estimado: R$ 99.180 / 0,08 = **R$ 1.239.750**

---

## Método 3 — Evolutivo / Custo (Imóveis Especiais)

Usado para: imóveis industriais, galpões, hospitais, colégios, imóveis sem comparativos.

## Fórmula

```
Valor Total = Valor do Terreno + Valor das Benfeitorias (depreciadas)

Valor das Benfeitorias = Custo de Reprodução × (1 - Depreciação)
```

**Custo de Reprodução (CUB — SINDUSCON, atualizado mensalmente por estado):**

| Padrão | CUB aproximado (R$/m²) — Referência SP 2024 |
|--------|----------------------------------------------|
| Residencial Baixo (R1-B) | R$ 1.800 - 2.200 |
| Residencial Normal (R1-N) | R$ 2.200 - 2.800 |
| Residencial Alto (R1-A) | R$ 2.800 - 3.800 |
| Comercial (CSL-8) | R$ 2.500 - 3.500 |
| Galpão (GI) | R$ 1.200 - 1.800 |

*Verificar CUB atualizado em: www.sindusconsp.com.br*

**Depreciação (Ross-Heidecke):**

| Idade / Estado | Novo | Bom | Regular | Mau |
|---------------|------|-----|---------|-----|
| 0-10 anos | 100% | 85% | 70% | 55% |
| 11-20 anos | 85% | 72% | 59% | 46% |
| 21-30 anos | 70% | 59% | 49% | 38% |
| 31-40 anos | 55% | 47% | 38% | 30% |
| > 40 anos | 45% | 38% | 31% | 24% |

---

## Análise Do Laudo Pericial Judicial

Quando receber um laudo de avaliação para análise, verificar:

## Checklist Do Laudo

**Formalidades:**
- [ ] Avaliador identificado com CREA/CAU
- [ ] Data da vistoria (não da emissão)
- [ ] Descrição física do imóvel
- [ ] Método utilizado declarado
- [ ] Fundamentação e Precisão (Grau I, II ou III — ABNT)

**Conteúdo técnico:**
- [ ] Amostras utilizadas (mínimo 3 para Grau I; 5 para Grau II)
- [ ] Fontes das amostras indicadas
- [ ] Homogeneização demonstrada (ou justificativa)
- [ ] Campo de arbítrio aplicado
- [ ] Valor unitário R$/m² resultante
- [ ] Cálculo final claro

**Sinais de laudo fraco/suspeito:**
- ⚠️ Menos de 3 amostras (Grau I insuficiente para leilão relevante)
- ⚠️ Amostras de bairros muito distantes ou diferentes
- ⚠️ Sem data de vistoria (quando foi o imóvel visitado?)
- ⚠️ Valor muito distante do mercado sem justificativa
- ⚠️ Laudo copiado de processo anterior sem atualização
- ⚠️ Avaliador sem CREA/CAU válido no estado do imóvel

---

## Análise De Localização (Score De Localização)

Atribuir pontuação de 0 a 5 para cada fator:

```
INFRAESTRUTURA:
[ ] Transporte público (metro, BRT, ônibus): 0-5
[ ] Comércio e serviços no entorno: 0-5
[ ] Escolas e hospitais próximos: 0-5
[ ] Parques e áreas de lazer: 0-5

URBANISMO:
[ ] Zoneamento favorável (residencial, ZEU, ZEIS...): 0-5
[ ] Potencial construtivo (coeficiente aproveitamento): 0-5
[ ] Restrições (APP, faixa de marinha, tombamento): 0-5

MERCADO:
[ ] Valorização histórica da região: 0-5
[ ] Presença de empreendimentos novos: 0-5
[ ] Liquidez estimada (facilidade de revenda): 0-5

TOTAL: ___ / 50
```

**Interpretação:**
- 40-50: Localização excelente — premium
- 30-39: Localização boa — acima da média
- 20-29: Localização média — mercado normal
- 10-19: Localização abaixo da média — liquidez reduzida
- 0-9: Localização ruim — alto risco de iliquidez

---

## Cálculo De Margem De Segurança

```
Valor de Mercado Estimado (VMP):        R$ _______________
(-) Custos de aquisição (ITBI + Cart.): R$ _______________  (aprox. 4-5% do valor)
(-) Comissão leiloeiro (5%):            R$ _______________
(-) Débitos IPTU + Condomínio:          R$ _______________
(-) Custo de desocupação (se necessário): R$ _____________
(-) Obras/regularização estimada:       R$ _______________
(-) Margem de segurança (10-20%):       R$ _______________
= LANCE MÁXIMO RECOMENDADO:             R$ _______________

DESÁGIO MÍNIMO ACEITÁVEL: ____% do VMP
```

---

## Análise Por Tipo

**Apartamento Residencial:**
- Verificar: vagas, andar, face (sol manhã/tarde), churrasqueira, depósito
- Liquidez: muito alta (SP, RJ, BH, Curitiba) — fácil revenda

**Casa em Condomínio:**
- Verificar: área de lazer, segurança, taxa condominial, restrições construtivas
- Liquidez: alta — demanda constante por famílias

**Terreno Urbano:**
- Verificar: zoneamento (coeficiente de aproveitamento, taxa de ocupação)
- Verificar: possibilidade de incorporação (VGV potencial)
- Liquidez: média — depende muito da localização

**Sala Comercial:**
- Verificar: padrão, rua, fluxo pedestres, vaga, autuações
- Liquidez: baixa a média — mercado mais restrito

**Galpão Logístico/Industrial:**
- Verificar: pé-direito (mínimo 8m para logística), docas, acesso caminhão, AVCB
- Liquidez: média-alta em eixos logísticos (Rodovias Dutra, Castelo Branco, BR-381)

**Imóvel Rural:**
- Verificar: ITR, CAR, reserva legal, acesso, água, energia
- Liquidez: baixa — mercado especializado

---

## Pesquisa De Mercado Online — Passo A Passo

Quando precisar estimar o VMP de um imóvel sem laudo disponível:

## Roteiro De Pesquisa Rápida (15 Min)

```
1. ABRIR ZAP IMÓVEIS (zapimoveis.com.br):
   - Buscar pelo bairro e tipo do imóvel
   - Filtrar por área similar (±20%)
   - Filtrar por nº de quartos similar
   - Anotar: 5 imóveis com preço de VENDA (não aluguel)
   - Anotar: R$/m² de cada amostra

2. ABRIR VIVA REAL (vivareal.com.br):
   - Repetir a mesma busca
   - Cruzar com dados do ZAP (evitar duplicatas)
   - Anotar: 3-5 amostras adicionais

3. APLICAR FATOR DE ELASTICIDADE:
   - Anúncios têm margem de negociação média de 10-15%
   - Valor real de venda ≈ preço anunciado × 0,85 a 0,90
   - Em mercado fraco: × 0,80
   - Em mercado aquecido: × 0,92

4. CALCULAR VMP ESTIMADO:
   - Média dos R$/m² das amostras ajustadas
   - Multiplicar pela área do imóvel do leilão
   - RESULTADO = VMP estimado (±15% de margem)

5. VALIDAÇÃO COM GOOGLE STREET VIEW:
   - Abrir o endereço no Google Maps
   - Verificar: entorno, comércio, transporte
   - Estado aparente das fachadas vizinhas
   - Confirmar se bairro corresponde ao padrão das amostras
```

## Cub Referência 2025 (Sinduscon/Sp — Atualizar Mensalmente)

| Padrão | CUB R$/m² (ref. Jan/2025) |
|--------|--------------------------|
| R1-B (Residencial Baixo) | R$ 2.000 - 2.400 |
| R1-N (Residencial Normal) | R$ 2.400 - 3.100 |
| R1-A (Residencial Alto) | R$ 3.100 - 4.200 |
| R8-N (Prédio Normal) | R$ 2.100 - 2.700 |
| R8-A (Prédio Alto) | R$ 2.800 - 3.600 |
| R16-N (Prédio 16 Pavtos) | R$ 2.200 - 2.900 |
| CSL-8 (Comercial) | R$ 2.700 - 3.800 |
| GI (Galpão Industrial) | R$ 1.400 - 2.000 |

*Fonte: SINDUSCON-SP. Consultar atualização mensal em www.sindusconsp.com.br/indices-e-custos/cub/*

---

## Imóveis Populares (Até R$ 300K)

- Margem de erro aceitável na avaliação: ±15%
- Liquidez: ALTA — muitos compradores nessa faixa
- Fator de liquidação: 0,20 (VLF = 80% VMP)
- Deságio ideal em leilão: ≥30%

## Imóveis Médios (R$ 300K - R$ 800K)

- Margem de erro aceitável: ±10%
- Liquidez: MÉDIA-ALTA
- Fator de liquidação: 0,25
- Deságio ideal em leilão: ≥35%

## Imóveis De Alto Padrão (R$ 800K - R$ 2M)

- Margem de erro aceitável: ±10%
- Liquidez: MÉDIA — prazo maior de venda
- Fator de liquidação: 0,30
- Deságio ideal em leilão: ≥40%

## Imóveis De Luxo (> R$ 2M)

- Margem de erro aceitável: ±15% (menos amostras)
- Liquidez: BAIXA — mercado restrito
- Fator de liquidação: 0,35 a 0,45
- Deságio ideal em leilão: ≥45%
- Investidor precisa ter capital para segurar por 12-24 meses

---

## Quando É Possível Financiar Imóvel De Leilão?

| Modalidade | Financiamento Possível? | Obs |
|-----------|------------------------|-----|
| Venda Direta CEF | SIM — pelo próprio banco | Até 80% VMAV, FGTS permitido |
| Venda Direta BB/Santander | SIM — pelo próprio banco | Condições variam |
| Leilão Extrajudicial (banco) | DEPENDE — consultar edital | Alguns aceitam financiamento |
| Leilão Judicial | Geralmente NÃO | Pagamento no ato ou parcelamento curto (Art. 895) |

## Parcelamento No Leilão Judicial (Art. 895 Cpc)

- Sinal de 25% no ato
- Restante em até 30 parcelas (máximo)
- Correção: juros simples de 1% ao mês (geralmente)
- Garantia: hipoteca sobre o próprio bem arrematado
- **Risco:** se não pagar, perde o imóvel E o sinal

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

python agent-orchestrator/scripts/match_skills.py "avaliar imovel leilao"

## "Qual O Valor De Mercado Desse Apartamento?"

```

---

## Governança

Esta skill implementa as seguintes políticas de governança:

- **action_log**: Avaliações realizadas são registradas pelo log_action do ecossistema
- **rate_limit**: Controle via check_rate integrado — sem chamadas API externas diretas
- **requires_confirmation**: Avaliações com margem negativa geram confirmation_request obrigatório
- **warning_threshold**: Deságio <15% ou avaliação defasada disparam warning_threshold automático

Políticas adicionais:
- **Responsável:** Ecossistema Leiloeiro IA
- **Escopo:** Avaliação pericial de imóveis para leilão
- **Limitações:** Estimativas indicativas. Não substitui laudo pericial de engenheiro/arquiteto.
- **Auditoria:** Validada por skill-sentinel
- **Dados sensíveis:** Não armazena dados de avaliações

---

## Referências

Fontes normativas e referências:
- **ABNT NBR 14653-1:2019** — Procedimentos gerais
- **ABNT NBR 14653-2:2011** — Imóveis urbanos
- **ABNT NBR 14653-3:2004** — Imóveis rurais
- **ABNT NBR 12721** — Avaliação de custos de construção
- **CUB** — Custo Unitário Básico (SINDUSCON por estado, atualização mensal)
- **COFECI** — Conselho Federal de Corretores (pareceres de avaliação)
- **IBAPE** — Instituto Brasileiro de Avaliações e Perícias de Engenharia
- **FIPEZAP** — Índice de preços de imóveis (fipe.org.br/indices/fipezap)

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
- `leiloeiro-edital` - Complementary skill for enhanced analysis
- `leiloeiro-ia` - Complementary skill for enhanced analysis
- `leiloeiro-juridico` - Complementary skill for enhanced analysis
- `leiloeiro-mercado` - Complementary skill for enhanced analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
