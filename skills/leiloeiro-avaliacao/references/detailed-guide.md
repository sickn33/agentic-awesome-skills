# Avaliação indicativa de imóvel em leilão

## Escopo e responsabilidade

Ajude a organizar evidências e cenários; não alegue ser engenheiro/arquiteto credenciado, perito ou emitir laudo com conformidade ABNT. Um profissional habilitado deve verificar método, vistoria, responsabilidade técnica e requisitos aplicáveis. Não existe auditoria skill-sentinel nem integração automática com um orquestrador neste pacote.

Não há dados de mercado, anúncios, CUB atualizado ou textos licenciados das normas incluídos. As edições no arquivo fontes.md são referências históricas a verificar no catálogo ABNT, não prova de vigência ou conformidade. Não derive Grau I/II/III apenas de3 ou5 amostras: requisitos dependem do método, variáveis, tratamento e versão aplicável.

## 1. Definir o objeto

Registre finalidade, data-base, moeda, localização, tipo, área e sua fonte, estado/ocupação, documentação disponível e limites de vistoria. Preço de oferta, preço transacionado, avaliação judicial, valor de mercado e valor de liquidação não são intercambiáveis. Venda sob prazo/condições restritas exige cenário próprio; não aplique um deságio universal de20–40%.

## 2. Comparativo de mercado

Colete apenas dados permitidos e mínimos, com fonte/data, tipo de preço, área comparável, características e incerteza. Elimine anúncios duplicados e confirme se área privativa, construída ou total é a mesma medida. Distinga o mesmo anúncio replicado em portais de transações independentes. Anúncios são evidência de oferta, não venda confirmada; não desconte10–15% automaticamente.

Escolha comparáveis por semelhança relevante, não por uma quota que simule rigor. Ajustes de área, localização, conservação, andar e vagas precisam de calibração/evidência e direção explícita em relação ao objeto. Não use multiplicadores genéricos como se fossem tabelas ABNT. Investigue pontos discrepantes; não descarte automaticamente além de2 desvios para melhorar o resultado.

Uma síntese indicativa pode multiplicar preço unitário ajustado pela área correspondente, com fontes e intervalo de cenários justificados. Sem dados suficientes, entregue lacunas e próximos passos, não um valor ou precisão inventados.

## 3. Renda e custo

Para renda, explicite aluguel, vacância/inadimplência, despesas recuperáveis/não recuperáveis, manutenção e taxa de capitalização da mesma data/mercado. Taxa e renda devem usar o mesmo horizonte/base; valor = renda operacional líquida estabilizada anual / cap rate anual é uma simplificação, não um fluxo descontado completo.

Exemplo SOMENTE sintético: receita potencial mensal10.000, vacância5% sobre a receita e despesas fixas1.300 implicam renda líquida8.200/mês ou98.400/ano. Usando cap rate hipotético8%, o valor simplificado é1.230.000. Esse cálculo não valida a taxa, a vacância, o valor de mercado nem despesas reais. Não reduza despesas fixas pela vacância sem justificativa.

Para custo, separe terreno, benfeitorias, itens especiais, depreciação e demais componentes/fator de comercialização que o método aplicável exigir. CUB é um indicador parcial por projeto-padrão/UF/mês, não orçamento completo ou preço de venda; identifique regime/desoneração e itens não incluídos. Não copie tabelas2024/2025 como dados atuais, nem uma matriz genérica de idade/estado como Ross-Heidecke validado.

## 4. Revisar laudo e liquidez

Verifique identificação/habilitação adequada, data-base e vistoria (ou limitações), documentos, objeto/área, fontes, método, ajustes, tratamento, fundamento e precisão efetivamente demonstrados. Divergência não prova fraude; registre exatamente a informação ausente ou contraditória.

Infraestrutura, zoneamento, restrições, ocupação, mercado e prazo de venda são fatores a investigar, não uma nota0–50 que prevê liquidez. Não declare revenda fácil ou deságio ideal por faixa de preço/cidade. Imagens de rua podem estar antigas e não substituem vistoria, matrícula ou análise urbanística. Restrições legais exigem fonte oficial e profissional competente.

## 5. Cenário de aquisição

Identifique edital/processo, preço/base de comissão, tributos/emolumentos, possíveis débitos e sua responsabilidade, financiamento, obras, ocupação/desocupação, prazo, custos de manutenção/venda e reserva. Cada valor deve ter fonte/data ou ser marcado hipótese. Incidência de dívidas e possibilidade de financiamento dependem do caso, não de uma tabela universal de bancos. Não pagar, dar lance ou contatar partes sem autorização.

Se o usuário pede um limite de orçamento, explicite a equação: com teto totalB, custos fixosC e encargos proporcionais ao lancef, limite simplificado L=(B-C)/(1+f), quando f>=0 e B>=C. Se a reserva/margem é baseada no valor de saída, deriveB desse cenário antes. Faça sensibilidade; não apresente o resultado como recomendação de investimento ou garantia de lucro.

O art.895 do CPC trata propostas de aquisição parcelada com condições e decisão aplicáveis ao processo: o §1º menciona pelo menos25% à vista e restante em até30meses. Não estabelece um juro simples universal de1% ao mês; índice/modalidade/condições e consequências do inadimplemento precisam da norma completa, edital e revisão jurídica. Não confundir proposta com financiamento aprovado.

## Governança e dados

O helper governance.py é opcional e stdlib-only; não é chamado automaticamente, não autoriza ações e não impõe um orçamento/API limit atômico. Logging fica desativado sem LEILOEIRO_LOG_DIR; não envie documentos, nomes ou dados de imóveis para logs. Uma função que retorna confirmed:false não verifica aprovação humana. Warning threshold do helper é proporção técnica, não alerta jurídico ou deságio de leilão.

## Saída

```text
Objetivo/data-base/objeto e fontes:
Dados confirmados versus hipóteses:
Método indicativo e cálculo reproduzível:
Comparáveis e ajustes justificados:
Cenários de prazo, custos e sensibilidade:
Lacunas de vistoria, título, norma e responsabilidade:
Revisão profissional necessária e próximos passos autorizados:
```

## Referências

- [CPC, texto oficial, art.895 e disposições correlatas](https://planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105compilada.htm)
- [Sinduscon-DF: CUB e custos adicionais](https://sinduscondf.org.br/indicadores-cub/)
- [Fontes históricas/normativas a verificar](fontes.md)

Não foram executadas avaliações, consultas, vistorias ou testes de conformidade.
