# Referencia tecnica: raciocinio com premissas explicitas

Este material auxilia o exercicio ficticio de estilo; nao e uma ficha atualizada
de produtos de empresas. A antiga compilacao misturava metas e resultados,
variantes de motores, custos/precos, datas e dados medicos incompatíveis. Nao
use suas antigas tabelas como fonte tecnica ou orientacao clinica.

## Foguetes

Para um modelo ideal de exaustao constante, use:

```text
delta_v = Isp * g0 * ln(m0 / mf)
g0 = 9.80665 m/s^2
```

Isp esta em segundos; m0 e mf precisam de unidades identicas, massas positivas
e m0 >= mf. O resultado e delta-v ideal, nao velocidade final, alcance ou
capacidade de uma missao. Acrescente gravidade, arrasto, desempenho variavel,
estagiamento e restricoes de trajetoria para uma analise de voo. Velocidade de
escape nao e um orcamento universal de delta-v de lancamento. Nao deduza reserva
de pouso real a partir de uma unica variacao ideal de velocidade.

Exemplo sintetico: Isp=300 s e m0/mf=2 dao aproximadamente 2039 m/s ideais.
Esse numero nao descreve um veiculo real. Maior pressao de camara por si so nao
determina Isp; propelentes, temperatura, bocal e ambiente tambem importam.

[Derivacao da equacao ideal pela NASA](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/)

## Energia e manufatura

Separe energia (Wh), potencia (W), capacidade acumulada (TWh) e taxa de producao
(TWh/ano). Compare celulas com celulas e packs com packs. Dimensao de celula nao
determina quimica, seguranca, densidade ou vida util. Precos e densidades precisam
de data, unidade, nivel do sistema e metodologia. Custo de lancamento, preco
contratual e preco por kg vendido tambem nao sao a mesma metrica.

O custo de materia-prima e apenas parte do custo total. Retorne um intervalo com
sensibilidade a rendimento, volume, certificacao, capital, trabalho e perdas;
nao chame a diferenca inteira de desperdicio. Uma melhoria em energia por celula
nao equivale automaticamente a melhoria percentual de autonomia do veiculo.

## Autonomia e interfaces neurais

Nomes comerciais e demonstracoes nao provam autonomia sem supervisao. Identifique
versao, dominio operacional, supervisao e metodologia antes de comparar sensores
ou taxas de acidente. Taxas de intervencao e acidentes nao sao intercambiaveis;
comparacoes precisam controlar exposicao, tipo de via e condicoes.

Para implantes e interfaces neurais, diferencie canais, fios, amostragem de sinais,
bitrate bruto e informacao efetivamente comunicada. Nenhum deles prova leitura
livre de pensamentos. Nao afirme compatibilidade com MRI, ausencia de bateria,
beneficio clinico, indicacao aprovada, cirurgia ou risco com base nesta persona.
Exija rotulagem oficial do dispositivo, protocolo de estudo, regulador e equipe
clinica; autorizacao de estudo nao e aprovacao para todos os tratamentos.

## Uso de fontes e limites

Para uma pergunta sobre uma empresa real, obtenha fonte primaria, data e versao;
se nao conseguir verificar, marque a informacao como desconhecida. Nao forneca
especificacoes, cotacoes ou cronogramas atuais a partir desta referencia. Nao
ha execucao de simulacao de voo, teste de hardware, avaliacao medica ou previsao
financeira validada neste bundle.
