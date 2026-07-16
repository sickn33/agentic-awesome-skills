---
name: auri-core
description: "Auri: assistente de voz inteligente (Alexa + Claude claude-opus-4-20250805). Visao do produto, persona Vitoria Neural, stack AWS, modelo Free/Pro/Business/Enterprise, roadmap 4 fases, GTM, north star WAC e analise competitiva."
risk: none
source: community
date_added: '2026-03-06'
author: renat
tags:
- voice-assistant
- product-vision
- alexa
- aws
tools:
- claude-code
- antigravity
- cursor
- gemini-cli
- codex-cli
---

# Auri - Core Product Skill

## Overview

Auri: assistente de voz inteligente (Alexa + Claude claude-opus-4-20250805). Visao do produto, persona Vitoria Neural, stack AWS, modelo Free/Pro/Business/Enterprise, roadmap 4 fases, GTM, north star WAC e analise competitiva.

## When to Use This Skill

- When you need specialized assistance with this domain

## Do Not Use This Skill When

- The task is unrelated to auri core
- A simpler, more specific tool can handle the request
- The user needs general-purpose assistance without domain expertise

## How It Works

| Atributo | Definicao |
|----------|-----------|
| Nome | Auri |
| Voz | Amazon Polly Vitoria Neural pt-BR |
| Tom | Caloroso, inteligente, direto |
| Personalidade | Curiosa, empatica, confiavel |
| Linguagem | Portugues brasileiro natural |
| Atitude | Proativa, mas nunca invasiva |

## Auri - Core Product Skill

>  A voz que pensa com voce.

Auri e um assistente de voz de nova geracao construido sobre Amazon Alexa + Claude claude-opus-4-20250805.
Enquanto a Alexa tradicional executa comandos, a Auri conduz conversas reais e raciocina sobre contexto.

---

## O Que E A Auri

A Auri e uma Alexa Skill avancada que substitui o motor de respostas padrao pelo modelo
Claude claude-opus-4-20250805 da Anthropic. O resultado: um assistente de voz capaz de:

- Conduzir conversas multi-turno com memoria contextual
- Raciocinar sobre problemas complexos em linguagem natural
- Adaptar tom e profundidade ao perfil do usuario
- Operar 100% em portugues brasileiro com nuances culturais
- Integrar com o ecossistema Amazon (calendario, compras, smart home, musica)

## Proposta De Valor Unica

ANTES: Alexa, qual a previsao do tempo? -> Amanha, 28 graus e nublado.

DEPOIS: Auri, devo levar guarda-chuva amanha?
  -> Amanha 70% de chuva a tarde mas a manha estara limpa. Reuniao as 14h? Leve guarda-chuva.

## Diferencial Estrategico

1. Continuidade conversacional - Lembra contexto entre sessoes via DynamoDB
2. Personalidade consistente - Voz Vitoria Neural + persona calibrada
3. Raciocinio profundo - Claude claude-opus-4-20250805 como motor principal
4. Ecossistema integrado - Native no hardware Alexa (Echo, Echo Dot, Echo Show)
5. Privacidade by design - Dados na AWS, sem compartilhamento com terceiros

---

## Valores Da Marca

- Clareza - Respostas objetivas, sem rodeios
- Empatia - Entende contexto emocional, adapta o tom
- Inteligencia - Nunca simula saber o que nao sabe
- Respeito - Mantem privacidade, nunca julga
- Continuidade - Lembra conversas, evolui com o usuario

## Guia De Linguagem

Fazer:
- Falar na primeira pessoa
- Confirmar entendimento antes de responder
- Reconhecer incerteza e oferecer alternativa

Evitar:
- Respostas roboticas
- Formalidade excessiva
- Evasao sem alternativa

## Exemplo De Interacao

Usuario: Auri, me explica criptomoeda de um jeito simples.

Auri: Pensa assim: imagina que voce e seus amigos criam uma moeda propria para pagar
      entre voces sem banco no meio. Criptomoeda e exatamente isso, mas para milhoes
      de pessoas. O Bitcoin foi o primeiro, criado em 2009. Quer entender melhor?

## Ssml - Voz Otimizada

Exemplo de marcacao SSML para Amazon Polly Vitoria Neural:
  <voice name=Vitoria><prosody rate=medium pitch=+2%>Ola! Eu sou a Auri.</prosody>
  <break time=300ms/><prosody>Como posso te ajudar hoje?</prosody></voice>

---

## Visao Geral Da Arquitetura

Fluxo de dados: Echo -> ASK SDK (Python v2) -> Lambda Python 3.12 -> Claude claude-opus-4-20250805
Componentes AWS: DynamoDB (memoria), Polly Vitoria Neural (voz), CloudWatch (logs), Secrets Manager (keys)

### 3.1 Dependencias

ask-sdk-core==1.19.0 | ask-sdk-model==1.85.0 | boto3==1.34.0 | anthropic==0.25.0 | python-dotenv==1.0.0

### 3.2 Lambda Handler Principal

Codigo Python - lambda_function.py:
  sb = CustomSkillBuilder()
  sb.add_request_handler(ConversationIntentHandler())
  sb.add_global_request_interceptor(MemoryLoadInterceptor())
  sb.add_global_response_interceptor(MemorySaveInterceptor())
  lambda_handler = sb.lambda_handler()

### 3.3 Handler De Conversa Com Claude

Codigo Python - handlers/conversation.py:
  class ConversationIntentHandler(AbstractRequestHandler):
      Recebe user_speech via slot query
      Carrega historico de conversas da sessao DynamoDB
      Chama anthropic.Anthropic().messages.create(
          model=claude-opus-4-20250805, max_tokens=300,
          system=system_prompt, messages=history+[user_speech])
      Salva resposta no historico, retorna SSML com voz Vitoria

### 3.4 Dynamodb Schema

Tabela: auri-user-memory | PK: user_id | SK: session_date | TTL: 90 dias
Campos: profile (name, plan, preferences), long_term_memory[], usage_stats{}
BillingMode: PAY_PER_REQUEST | TimeToLive: habilitado (auto-expira)

### 3.5 Interaction Model

invocationName: auri
ConversationIntent: slot query (AMAZON.SearchQuery)
Samples: {query}, me fala sobre {query}, o que e {query}, explica {query}
StopIntent: tchau, ate mais, encerrar

### 3.6 Configuracao Lambda

FunctionName: auri-core-handler | Runtime: python3.12 | Timeout: 15s | Memory: 512MB
Env vars: ANTHROPIC_API_KEY_SECRET, DYNAMODB_TABLE=auri-user-memory, POLLY_VOICE=Vitoria
          CLAUDE_MODEL=claude-opus-4-20250805, MAX_TOKENS_VOICE=300

---

### 3.7 Exemplos De Codigo Completos

Handler de Conversa (handlers/conversation.py):

DynamoDB Schema:

---

## Planos E Precos

| Plano | Preco | Limites | Target |
|-------|-------|---------|--------|
| Free | R$ 0 | 10 perguntas/dia | Experimentacao |
| Pro | R$ 29/mes | Ilimitado, memoria 90 dias | Usuario individual |
| Business | R$ 99/mes | Multi-usuario ate 5, 1 ano | Familia/PME |
| Enterprise | Sob consulta | Ilimitado, SLA | Corporativo |

## Detalhamento

Free: 10 perguntas/dia, sem memoria entre sessoes, voz Vitoria Neural.
Pro: Conversas ilimitadas, memoria 90 dias, perfil personalizado, suporte email.
Business: Tudo do Pro + ate 5 usuarios, memoria compartilhada, dashboard, relatorio.
Enterprise: Ilimitado, persona customizavel, integracao CRM/ERP, SLA 99.9%.

## Projecao De Receita (Ano 1)

Meta conservadora: Pro 250 x R\9 = R$ 7.250/mes | Business 25 x R\9 = R$ 2.475/mes
MRR Ano 1: R$ 9.725/mes (~R$ 117k ARR)

Meta otimista: Pro 800 = R$ 23.200/mes | Business 80 = R$ 7.920/mes
MRR Ano 1: R$ 31.120/mes (~R$ 373k ARR)

## Unit Economics

| Metrica | Pro | Business |
|---------|-----|----------|
| CAC | R$ 45 | R$ 120 |
| LTV | R$ 522 (18m) | R$ 2.376 (24m) |
| LTV/CAC | 11.6x | 19.8x |
| Churn | 5%/mes | 3%/mes |
| Margem bruta | ~86% | ~90% |

---

## Fase 1 - Lancamento Mvp (Meses 1-3)

Objetivo: Validar product-market fit com early adopters brasileiros.

| Entrega | Descricao | Status |
|---------|-----------|--------|
| Core Handler | Lambda + ASK SDK + Claude | Em desenvolvimento |
| Persona Vitoria | SSML otimizado, Polly Neural | Em desenvolvimento |
| Free Plan | Rate limiting 10 perguntas/dia | Planejado |
| DynamoDB Session | Memoria intra-sessao | Planejado |
| Alexa Store | Publicacao na Alexa Skills Store BR | Planejado |
| Landing Page | auri.com.br com CTA | Planejado |

KPIs Fase 1: 500 habilitacoes, 40% retornam semana 2, NPS > 50, latencia < 2s.

## Fase 2 - Personalizacao (Meses 4-6)

| Entrega | Descricao |
|---------|-----------|
| Long-term Memory | DynamoDB persistente 90 dias (Pro) |
| User Profiling | Nome, preferencias, contexto |
| Pro Plan Launch | Via Amazon In-Skill Purchasing |
| Analytics Dashboard | Usuario Pro ve padroes de uso |

KPIs Fase 2: 200 conversoes Free->Pro, WAC > 150, sessao > 4min, churn < 7%.

## Fase 3 - Multi-Modal (Meses 7-12)

| Entrega | Descricao |
|---------|-----------|
| Echo Show Support | Respostas visuais para displays |
| Calendar Integration | Agenda via voz |
| Auri Web App | Interface web para historico |
| Business Plan Launch | Multi-usuario, dashboard familiar |

KPIs Fase 3: WAC > 1.000, MRR > R$ 15.000, Business: 50 clientes, rating > 4.5.

## Fase 4 - Ecossistema (Ano 2+)

| Entrega | Descricao |
|---------|-----------|
| Auri SDK | Developers constroem skills na Auri |
| WhatsApp Bridge | Persona Auri no WhatsApp |
| Mobile App | App iOS/Android com voz |
| Marketplace | Skills de terceiros |
| Enterprise Launch | SSO e compliance |
| B2B Skills | Auri Saude, Educacao, Financas |

---

## Segmentos Alvo

**Primario: Tech-savvy Brasileiros (25-45 anos)**
- Ja possuem Echo (~2M no Brasil), frustrados com Alexa padrao.
- Canais: Reddit, Twitter/X tech, YouTube tech BR.

**Secundario: Familias com Echo**
- Assistente educativo para filhos, calendario familiar.
- Canais: Facebook Groups, Instagram parenting.

**Terciario: PMEs e Profissionais**
- Advogados, medicos, consultores com necessidade de pesquisa rapida.
- Canais: LinkedIn, eventos de negocios.

## Canais De Aquisicao

| Canal | Custo | Potencial | Prazo |
|-------|-------|-----------|-------|
| Alexa Store organico | R$ 0 | Alto | Imediato |
| SEO + Blog | Baixo | Alto | 3-6 meses |
| YouTube demos | Medio | Alto | 1-3 meses |
| Influenciadores Tech BR | Medio | Alto | 1-2 meses |
| Paid Ads | Alto | Alto | Testavel |

## Mensagem Central

Tagline: A voz que pensa com voce.

Elevator Pitch: Voce ja ficou frustrado com respostas roboticas da Alexa?
A Auri tem a inteligencia real por dentro. Ela lembra o que voce conversou,
entende contexto e responde como uma pessoa inteligente. Gratis para comecar.

Value Props:
- Para o curioso: IA de voz que realmente entende portugues
- Para o produtivo: Assistente pessoal que evolui com voce
- Para a familia: Presenca inteligente em casa para todos
- Para o profissional: Pesquisa em segundos, sem tirar as maos do teclado

## Calendario De Lancamento

D-30: Lista de espera (auri.com.br) | D-15: Beta 50 usuarios | D-0: Alexa Store
D+14: Influenciadores | D+60: Pro launch | D+90: Avaliacao Phase 1

---

## Wac - Weekly Active Conversationalists

**Definicao precisa:**
Numero de usuarios unicos com >= 3 sessoes de >= 2 minutos cada na ultima semana.
Periodo: segunda-domingo, 00:00-23:59 BRT.

**Por que WAC e nao DAU/MAU:**
- DAU banaliza engajamento com acessos de 10 segundos.
- MAU e muito longa para feedback rapido de produto.
- WAC captura habito real: voltou 3x e ficou 2min = genuinamente engajado.
- Correlaciona com retencao 30 dias e conversao Free->Pro.

## Hierarquia De Metricas

NORTH STAR: WAC
|
+-- Aquisicao: Enablements, First Session Completion, Day-1 Retention
+-- Ativacao: Sessions/User/Week, Avg Duration, Questions/Session
+-- Retencao: Week-2, Month-1, Churn Rate Pro
+-- Receita: Conversion Rate, MRR, ARPU, LTV/CAC
+-- Recomendacao: NPS, Organic Share, App Store Rating

## Metas Wac Por Fase

| Fase | Mes | WAC Meta | WAC Stretch |
|------|-----|----------|-------------|
| Fase 1 | M3 | 150 | 300 |
| Fase 2 | M6 | 500 | 1.000 |
| Fase 3 | M12 | 2.000 | 5.000 |
| Fase 4 | M24 | 10.000 | 25.000 |

## Como Calcular Wac

1. Registrar session_start com user_id e timestamp no DynamoDB.
2. Ao encerrar sessao, registrar duracao em segundos.
3. Query semanal: users com session_count >= 3 AND avg_duration >= 120.
4. Publicar metrica no CloudWatch namespace Auri/ProductMetrics.
5. Alertar queda > 20% semana a semana.

## Dashboard Cloudwatch (Exemplo De Estrutura)

Metricas customizadas publicadas:
- SessionStart (Count por Plan: free/pro/business)
- SessionDuration (None - minutos)
- MessagesPerSession (Count)
- WAC semanal (Gauge)
- FreeToProConversions (Count)

---

## Tabela Comparativa

| Feature | Auri | Alexa Pura | Siri | Google Assistant | ChatGPT Voice |
|---------|------|------------|------|------------------|---------------|
| Idioma PT-BR nativo | Alta | Media | Media | Alta | Media |
| Raciocinio profundo | Alta | Baixa | Media | Media | Alta |
| Memoria multi-sessao | Alta | Baixa | Media | Media | Alta |
| Integracao smart home | Alta | Maxima | Media | Alta | Baixa |
| Personalidade consistente | Alta | Media | Media | Media | Alta |
| Hardware proprio | Usa Echo | Echo | HomePod | Nest | App only |
| Modelo base | Claude Opus 4 | Alexa LLM | Apple LLM | Gemini | GPT-4o |
| Privacidade | Alta | Media | Maxima | Baixa | Media |
| Preco | R\/usr/bin/bash-99/mes | Gratis | Gratis | Gratis | R /mes |
| Disponivel no Brasil | Sim | Sim | Sim | Sim | Sim |

## Posicionamento No Mapa Competitivo

Eixo X: Integracao com Hardware | Eixo Y: Profundidade de Inteligencia

Quadrante UNICO da Auri: Alta Inteligencia + Alta Integracao Hardware.
Nenhum concorrente ocupa esse quadrante simultaneamente:
- Alexa pura: Alta integracao, baixa inteligencia.
- ChatGPT Voice: Alta inteligencia, sem hardware proprio.
- Google/Siri: Posicionamento intermediario em ambos os eixos.

## Objecoes Frequentes E Respostas

| Objecao | Resposta Auri |
|---------|---------------|
| Por que nao ChatGPT? | ChatGPT e app, sem voz-first. Auri e native no Echo. |
| Alexa ja resolve | Para comandos sim. Para conversas reais, nao. |
| R\9 e caro | Menos que 1 cafe/dia por assistente pessoal 24/7. |
| E a privacidade? | Dados na sua AWS, retencao configuravel, LGPD compliant. |
| Amazon vai copiar? | Amazon incentiva ecossistema de skills. Somos parceiros. |

---

## Brand Identity

- Nome: Auri
- Origem: Aura (presenca intangivel) + IA. Sugere presenca, sabedoria, leveza.
- Tagline: A voz que pensa com voce.

## Taglines Alternativas

- Alem dos comandos. Muito alem.
- A IA que mora no seu Echo.
- Conversas reais. Inteligencia real.
- Fala com quem realmente ouve.

## Brand Values

1. Inteligencia Autentica - Nunca simula. Quando nao sabe, diz honestamente.
2. Presenca Calorosa - Tecnologia avancada com calor humano.
3. Respeito pelo Tempo - Respostas diretas, sem rodeios.
4. Crescimento Continuo - Evolui com o usuario, aprende com interacoes.
5. Privacidade como Direito - Dados do usuario pertencem ao usuario.

## Brand Voice Guidelines

Tom:
- Caloroso mas nao piegas.
- Inteligente mas nao pedante.
- Direto mas nao grosseiro.
- Divertido mas nao futil.

Nunca: Robotico, corporativo, evasivo, condescendente, ansioso para agradar.

Exemplo OK: Nao sei a resposta exata, mas posso te ajudar a encontrar de outra forma.
Exemplo ERRADO: Desculpe, nao tenho essa informacao em meu banco de dados.

## Aplicacoes Da Marca

- App Icon: Forma de onda de voz estilizada em gradiente verde-azul.
- Paleta: Verde-teal principal, branco neutro, cinza escuro para texto.
- Tipografia: Sans-serif moderna (similar a produto Apple/Spotify).
- Motion: Animacao de ondas suaves ao falar (Echo Show).

---

## 10. Comandos Do Skill

Estes comandos ativam modos especificos quando mencionados no contexto de uso do skill.

## /Auri-Status

Exibe status atual: versao, WAC vs meta, MRR, proxima entrega, status componentes.

Campos retornados:
- Versao atual do produto (ex: v1.0.0)
- WAC atual vs meta da fase atual
- MRR atual em R$
- Proxima entrega do roadmap
- Status: Lambda (OK/Degraded), DynamoDB (OK), Claude API (OK)

## /Auri-Roadmap [Fase]

Exibe roadmap completo. Argumento opcional: 1, 2, 3 ou 4 para detalhar fase.
Output: Tabela de entregas com status, KPIs e datas estimadas.

## /Auri-Metrics [Periodo]

Dashboard de metricas. Argumento: semana | mes | trimestre. Default: semana.
Output: WAC, Sessions/User, Avg Duration, Conversion Rate, MRR e crescimento.

## /Auri-Persona [Aspecto]

Guidelines da persona. Argumento: voz | tom | linguagem | valores | exemplos.
Output: Guidelines detalhadas, exemplos de dialogo, templates SSML.

## /Auri-Pricing [Plano]

Planos e precos. Argumento: free | pro | business | enterprise.
Output: Tabela comparativa, projecoes de receita, unit economics.

## /Auri-Gtm [Canal]

Go-to-market strategy. Argumento: organico | pago | influenciadores | parcerias.
Output: Plano por canal, mensagens centrais, calendario de lancamento.

## /Auri-Competitive [Competidor]

Analise competitiva. Argumento: alexa | siri | google | chatgpt.
Output: Tabela comparativa, mapa de posicionamento, objecoes e respostas.

---

## Deployment Via Aws Sam

Comandos de deploy:
  sam build --use-container
  sam deploy --stack-name auri-core --region us-east-1 --capabilities CAPABILITY_IAM

Verificar deployment:
  aws lambda invoke --function-name auri-core-handler --payload file://test.json response.json

## Monitoramento Cloudwatch Alarms

| Alarme | Threshold | Acao |
|--------|-----------|------|
| high_latency | Duration > 6000ms | PagerDuty |
| error_rate | Errors > 5 em 5min | Slack #auri-alerts |
| claude_api_failures | AnthropicAPIErrors > 3 | Slack + fallback |
| wac_drop | WAC queda > 20% semana | Product team Slack |

## Fallback Strategy (Claude Api Indisponivel)

Se a API da Anthropic estiver indisponivel, o sistema retorna respostas pre-configuradas:
- api_down: Estou com instabilidade. Pode tentar em alguns minutinhos?
- timeout: Preciso de mais tempo nessa pergunta. Me faz de novo daqui a pouco?
- rate_limit: Muitas conversas simultaneas. Tente em alguns segundos!

## Gestao De Custos

| Componente | Custo Estimado (1000 usuarios Pro) |
|-----------|-----------------------------------|
| Claude API | R$ 4.000/mes (R$4/usuario) |
| Lambda | R$ 50/mes |
| DynamoDB | R$ 80/mes |
| CloudWatch | R$ 30/mes |
| Total infraestrutura | R$ 4.160/mes |
| Receita 1000 Pro | R$ 29.000/mes |
| Margem bruta | ~86% |

---

## Lgpd (Lei 13.709/2018)

- Base legal: Execucao de contrato (Art. 7, V) para usuarios Pro/Business.
- Consentimento: Coletado no onboarding da skill via voz + confirmacao.
- Dados coletados: Texto de conversas, preferencias, dados de uso anonimizados.
- Retencao: Free = 0 dias | Pro = 90 dias | Business = 365 dias.
- Direito de exclusao: Comando de voz Auri apaga meus dados -> DynamoDB delete.
- DPO: Designar antes do lancamento publico.

## Alexa Skills Store - Politicas

- Skill deve seguir Alexa Skills Kit Policies integralmente.
- Proibido coletar dados sensiveis (saude, financeiros, criancas < 13 anos).
- In-Skill Purchasing exige aprovacao previa da Amazon.
- Privacy Policy URL obrigatoria na submissao da skill.
- Monetizacao: Amazon retira 30% via In-Skill Purchasing.

---

## 11. Glossario

| Termo | Definicao |
|-------|-----------|
| WAC | Weekly Active Conversationalists - North Star Metric da Auri |
| ASK | Alexa Skills Kit - SDK oficial Amazon para Skills |
| SSML | Speech Synthesis Markup Language - markup para controle de voz |
| Intent | Acao que o usuario quer executar (ex: me explica X) |
| Slot | Variavel dentro de um intent (ex: query em me explica {query}) |
| Utterance | Frase de exemplo que aciona um intent |
| Session | Uma conversa continua com a Auri (inicio ate encerrar) |
| Long-term Memory | Dados persistidos no DynamoDB entre sessoes |
| In-Skill Purchasing | Sistema de cobranca nativo da Alexa Skills Store |
| Vitoria Neural | Voz Amazon Polly pt-BR de alta qualidade usada pela Auri |
| Claude claude-opus-4-20250805 | Modelo de linguagem Anthropic usado como motor da Auri |
| DynamoDB | Banco NoSQL AWS usado para memoria persistente dos usuarios |
| Lambda | Funcao AWS serverless que processa as requisicoes da Auri |
| Anthropic | Empresa criadora do Claude, fornecedora da API de IA |
| MRR | Monthly Recurring Revenue - Receita Mensal Recorrente |
| LTV | Lifetime Value - Valor do ciclo de vida do cliente |
| CAC | Customer Acquisition Cost - Custo de aquisicao de cliente |

---

## 12. Links E Recursos

| Recurso | URL / Localizacao |
|---------|-------------------|
| Alexa Skills Kit Docs | https://developer.amazon.com/en-US/alexa/alexa-skills-kit |
| ASK SDK Python | https://github.com/alexa/alexa-skills-kit-sdk-for-python |
| Amazon Polly Vitoria Neural | https://docs.aws.amazon.com/polly/latest/dg/voicelist.html |
| Anthropic Claude API | https://docs.anthropic.com/en/api/getting-started |
| Claude claude-opus-4-20250805 Docs | https://docs.anthropic.com/en/docs/models-overview |
| Alexa Skills Store Brasil | https://www.amazon.com.br/alexa-skills |
| DynamoDB Best Practices | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html |
| In-Skill Purchasing | https://developer.amazon.com/en-US/docs/alexa/in-skill-purchase/isp-overview.html |
| Codigo-fonte Auri | C:/Users/renat/skills/auri-core/ |
| Amazon Alexa Skill (skill tecnica) | C:/Users/renat/skills/amazon-alexa/SKILL.md |

---

*Auri Core Skill - v1.0.0 | Criado em 2026-03-03 | Skills Ecosystem*

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
