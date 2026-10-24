# AMAZON ALEXA — Voz Inteligente com Claude - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Integration limits

This is a custom-skill architecture, not a way to replace Alexa's system assistant
or obtain Alexa+ capabilities. AURI assets referenced below are not bundled.
CLI commands, voice/locale support and SDK versions must be checked against the
installed ASK/AWS releases. The interaction-model JSON is a fragment; custom
slot types and Smart Home/Routines interfaces require supported regional APIs,
account linking and certification, not merely adding an intent. Smart Home
response/discovery examples omit required correlation/header fields and cannot
be deployed unchanged. Authorization is required before cloud resources, costs,
publication or real device control; use least-privilege IAM and test devices.

## Overview

Integracao completa com Amazon Alexa para criar skills de voz inteligentes, transformar Alexa em assistente com Claude como cerebro (projeto Auri) e integrar com AWS ecosystem (Lambda, DynamoDB, Polly, Transcribe, Lex, Smart Home).


## How It Works

> Voce e o especialista em Alexa e AWS Voice. Missao: transformar
> qualquer dispositivo Alexa em assistente ultra-inteligente usando
> Claude como LLM backend, com voz neural, memoria persistente e
> controle de Smart Home. Projeto-chave: AURI.

---


## 1. Visao Geral Do Ecossistema

```
[Alexa Device] → [Alexa Cloud] → [AWS Lambda] → [Claude API]
    Fala          Transcricao      Logica          Inteligencia
      ↑               ↑               ↑                ↑
   Usuario         Intent        Handler          Anthropic
                               + DynamoDB
                               + Polly TTS
                               + APL Visual
```


## Componentes Da Arquitetura Auri

| Componente | Servico AWS | Funcao |
|-----------|-------------|--------|
| Voz → Texto | Alexa ASR nativo | Reconhecimento de fala |
| NLU | ASK Interaction Model + Lex V2 | Extrair intent e slots |
| Backend | AWS Lambda (Python/Node.js) | Logica e orquestracao |
| LLM | Claude API (Anthropic) | Inteligencia e respostas |
| Persistencia | Amazon DynamoDB | Historico e preferencias |
| Texto → Voz | Amazon Polly (neural) | Fala natural da Auri |
| Interface Visual | APL (Alexa Presentation Language) | Telas em Echo Show |
| Smart Home | Alexa Smart Home API | Controle de dispositivos |
| Automacao | Alexa Routines API | Rotinas inteligentes |

---

### 2.1 Pre-Requisitos

```bash

## Ask Cli

npm install -g ask-cli
ask configure

## Aws Cli

pip install awscli
aws configure
```


## Criar Skill Com Template

ask new \
  --template hello-world \
  --skill-name auri \
  --language pt-BR


## └── .Ask/Ask-Resources.Json

```

## 2.3 Configurar Invocation Name

No arquivo `models/pt-BR.json`:
```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "auri"
    }
  }
}
```

---

## 3.1 Intents Essenciais Para Auri

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "auri",
      "intents": [
        {"name": "AMAZON.HelpIntent"},
        {"name": "AMAZON.StopIntent"},
        {"name": "AMAZON.CancelIntent"},
        {"name": "AMAZON.FallbackIntent"},
        {
          "name": "ChatIntent",
          "slots": [{"name": "query", "type": "AMAZON.SearchQuery"}],
          "samples": [
            "me ajuda com {query}",
            "quero saber sobre {query}",
            "o que voce sabe sobre {query}",
            "explique {query}",
            "pesquise {query}"
          ]
        },
        {
          "name": "SmartHomeIntent",
          "slots": [
            {"name": "device", "type": "AMAZON.Room"},
            {"name": "action", "type": "ActionType"}
          ],
          "samples": [
            "{action} a {device}",
            "controla {device}",
            "acende {device}",
            "apaga {device}"
          ]
        },
        {
          "name": "RoutineIntent",
          "slots": [{"name": "routine", "type": "RoutineType"}],
          "samples": [
            "ativa rotina {routine}",
            "executa {routine}",
            "modo {routine}"
          ]
        }
      ],
      "types": [
        {
          "name": "ActionType",
          "values": [
            {"name": {"value": "liga", "synonyms": ["acende", "ativa", "liga"]}},
            {"name": {"value": "desliga", "synonyms": ["apaga", "desativa", "desliga"]}}
          ]
        },
        {
          "name": "RoutineType",
          "values": [
            {"name": {"value": "bom dia", "synonyms": ["acordar", "manhã"]}},
            {"name": {"value": "boa noite", "synonyms": ["dormir", "descansar"]}},
            {"name": {"value": "trabalho", "synonyms": ["trabalhar", "foco"]}},
            {"name": {"value": "sair", "synonyms": ["saindo", "goodbye"]}}
          ]
        }
      ]
    }
  }
}
```

---

## 4.1 Handler Principal Python

O handler original estava truncado e não definia `sb`, constantes ou resposta.
Este exemplo mínimo responde sem persistir voz nem chamar terceiros:

```python
from html import escape
from ask_sdk_core.skill_builder import SkillBuilder
from ask_sdk_core.utils import is_intent_name

sb = SkillBuilder()

@sb.request_handler(can_handle_func=is_intent_name("ChatIntent"))
def chat_handler(handler_input):
    slots = handler_input.request_envelope.request.intent.slots or {}
    query = slots.get("query")
    text = query.value if query and query.value else "Pode repetir?"
    return handler_input.response_builder.speak(escape(text[:500])).response

handler = sb.lambda_handler()
```

Antes de integrar Claude, defina timeout menor que o prazo Alexa, sem retries que
excedam o prazo; trate todos os blocos de conteúdo e erros com resposta segura.
Escape texto não confiável antes de SSML. Envio à Anthropic e memória persistente
exigem consentimento e retenção mínima; não salve histórico por padrão. Inicialize
um adaptador DynamoDB com chave compatível e invoque `save_persistent_attributes()`;
uma referência a método sem parênteses não salva nada.

### 4.2 Variaveis De Ambiente Lambda

```
ANTHROPIC_SECRET_ID=auri/anthropic-key  # Buscar segredo no servidor, não no modelo
DYNAMODB_TABLE=auri-users
AWS_REGION=us-east-1
```

### 4.3 Requirements.Txt

```
ask-sdk-core>=1.19.0
ask-sdk-dynamodb-persistence-adapter>=1.19.0
anthropic>=0.40.0
boto3>=1.34.0
```

---

### 5.1 Criar Tabela

```bash
aws dynamodb create-table \
  --table-name auri-users \
  --attribute-definitions AttributeName=userId,AttributeType=S \
  --key-schema AttributeName=userId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 5.2 Schema Do Usuario

```json
{
  "userId": "amzn1.ask.account.XXXXX",
  "name": "Joao",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "preferences": {
    "language": "pt-BR",
    "voice": "Vitoria",
    "personality": "assistente profissional"
  },
  "smartHome": {
    "devices": {},
    "routines": {}
  },
  "updatedAt": 1740960000,
  "ttl": 1748736000
}
```

### 5.3 Ttl Automatico (Expirar Dados Antigos)

```python
import time

## Prazo ilustrativo: habilite TTL no atributo da tabela e obtenha consentimento

attrs["ttl"] = int(time.time()) + (180 * 24 * 3600)
```

---

### 6.1 Vozes Disponiveis (Portugues)

| Voice | Idioma | Tipo | Recomendado |
|-------|--------|------|-------------|
| `Vitoria` | pt-BR | Neural | ✅ Auri PT-BR |
| `Camila` | pt-BR | Neural | Alternativa |
| `Ricardo` | pt-BR | Standard | Masculino |
| `Ines` | pt-PT | Neural | Portugal |

### 6.2 Integrar Polly Na Resposta

```python
import boto3
import base64

def synthesize_polly(text: str, voice_id: str = "Vitoria") -> str:
    """Retorna URL de audio Polly para usar em Alexa."""
    client = boto3.client("polly", region_name="us-east-1")
    response = client.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_id,
        Engine="neural"
    )
    # Salvar em S3 e retornar URL
    # (necessario para usar audio customizado no Alexa)
    return upload_to_s3(response["AudioStream"].read())

def speak_with_polly(handler_input, text, voice_id="Vitoria"):
    """Retornar resposta usando voz Polly customizada via SSML."""
    audio_url = synthesize_polly(text, voice_id)
    ssml = f'<speak><audio src="{audio_url}"/></speak>'
    return handler_input.response_builder.speak(ssml)
```

### 6.3 Ssml Para Controle De Voz

```xml
<speak>
  <prosody rate="90%" pitch="+5%">
    Oi! Eu sou a Auri.
  </prosody>
  <break time="0.5s"/>
  <emphasis level="moderate">Como posso ajudar?</emphasis>
</speak>
```

---

### 7.1 Template De Chat

```json
{
  "type": "APL",
  "version": "2023.3",
  "theme": "dark",
  "mainTemplate": {
    "parameters": ["payload"],
    "items": [{
      "type": "Container",
      "width": "100%",
      "height": "100%",
      "backgroundColor": "#1a1a2e",
      "items": [
        {
          "type": "Text",
          "text": "AURI",
          "fontSize": "32px",
          "color": "#e94560",
          "textAlign": "center",
          "paddingTop": "20px"
        },
        {
          "type": "Text",
          "text": "${payload.lastResponse}",
          "fontSize": "24px",
          "color": "#ffffff",
          "padding": "20px",
          "maxLines": 8,
          "grow": 1
        },
        {
          "type": "Text",
          "text": "Diga algo para continuar...",
          "fontSize": "18px",
          "color": "#888888",
          "textAlign": "center",
          "paddingBottom": "20px"
        }
      ]
    }]
  }
}
```

### 7.2 Adicionar Apl Na Resposta

```python
@sb.request_handler(can_handle_func=is_intent_name("ChatIntent"))
def chat_with_apl(handler_input: HandlerInput) -> Response:
    # ... obter reply do Claude ...

    # Verificar se device suporta APL
    supported = handler_input.request_envelope.context.system.device.supported_interfaces
    has_apl = getattr(supported, "alexa_presentation_apl", None) is not None

    if has_apl:
        apl_directive = {
            "type": "Alexa.Presentation.APL.RenderDocument",
            "token": "auri-chat",
            "document": CHAT_APL_DOCUMENT,
            "datasources": {"payload": {"lastResponse": reply}}
        }
        handler_input.response_builder.add_directive(apl_directive)

    return handler_input.response_builder.speak(reply).ask("Mais alguma coisa?").response
```

---

### 8.1 Ativar Smart Home Skill

No `skill.json`, adicionar:
```json
{
  "apis": {
    "smartHome": {
      "endpoint": {
        "uri": "arn:aws:lambda:us-east-1:123456789:function:auri-smart-home"
      }
    }
  }
}
```

### 8.2 Handler De Smart Home

```python
def handle_smart_home_directive(event, context):
    namespace = event["directive"]["header"]["namespace"]
    name = event["directive"]["header"]["name"]
    endpoint_id = event["directive"]["endpoint"]["endpointId"]

    # Validar token de account linking, dono do endpoint, payload e mensagem primeiro.
    if namespace == "Alexa.PowerController" and name in {"TurnOn", "TurnOff"}:
        state = "ON" if name == "TurnOn" else "OFF"
        # Chamar sua API de smart home
        control_device(endpoint_id, {"power": state})
        return build_smart_home_response(endpoint_id, "powerState", state)

    elif namespace == "Alexa.BrightnessController" and name == "SetBrightness":
        brightness = event["directive"]["payload"]["brightness"]
        if not isinstance(brightness, int) or not 0 <= brightness <= 100:
            raise ValueError("Invalid brightness")
        control_device(endpoint_id, {"brightness": brightness})
        return build_smart_home_response(endpoint_id, "brightness", brightness)
```

### 8.3 Discovery De Dispositivos

```python
def handle_discovery(event, context):
    return {
        "event": {
            "header": {
                "namespace": "Alexa.Discovery",
                "name": "Discover.Response",
                "payloadVersion": "3"
            },
            "payload": {
                "endpoints": [
                    {
                        "endpointId": "light-sala-001",
                        "friendlyName": "Luz da Sala",
                        "displayCategories": ["LIGHT"],
                        "capabilities": [
                            {
                                "type": "AlexaInterface",
                                "interface": "Alexa.PowerController",
                                "version": "3"
                            },
                            {
                                "type": "AlexaInterface",
                                "interface": "Alexa.BrightnessController",
                                "version": "3"
                            }
                        ]
                    }
                ]
            }
        }
    }
```

---


## Deploy Completo (Skill + Lambda)

cd auri/
ask deploy


## Verificar Status

ask status


## Testar No Simulador

ask dialog --locale pt-BR


## Teste Especifico De Intent

ask simulate \
  --text "abrir auri" \
  --locale pt-BR \
  --skill-id amzn1.ask.skill.YOUR-SKILL-ID
```

## Criar Lambda Manualmente

aws lambda create-function \
  --function-name auri-skill \
  --runtime python3.11 \
  --role arn:aws:iam::ACCOUNT:role/auri-lambda-role \
  --handler lambda_function.handler \
  --timeout 8 \
  --memory-size 512 \
  --zip-file fileb://function.zip

## Adicionar Trigger Alexa

aws lambda add-permission \
  --function-name auri-skill \
  --statement-id alexa-skill-trigger \
  --action lambda:InvokeFunction \
  --principal alexa-appkit.amazon.com \
  --event-source-token amzn1.ask.skill.YOUR-SKILL-ID
```


## Usar Secrets Manager

aws secretsmanager create-secret \
  --name auri/anthropic-key \
  --secret-string file://PRIVATE_UNTRACKED_SECRET_FILE.json


## Lambda Acessa Via Sdk:

import boto3, json
def get_secret(secret_name):
    client = boto3.client('secretsmanager')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])
```

---

## Fase 1 — Setup (Dia 1)

```
[ ] Conta Amazon Developer criada
[ ] Conta AWS configurada (free tier)
[ ] ASK CLI instalado e configurado
[ ] IAM Role criada com permissoes: Lambda, DynamoDB, Polly, Logs
[ ] Anthropic API key armazenada em Secrets Manager
```

## Fase 2 — Skill Base (Dia 2-3)

```
[ ] ask new --template hello-world --skill-name auri
[ ] Interaction model definido (pt-BR.json)
[ ] LaunchRequest handler funcionando
[ ] ChatIntent handler com Claude integrado
[ ] ask deploy funcionando
[ ] Teste basico no ASK simulator
```

## Fase 3 — Persistencia (Dia 4)

```
[ ] DynamoDB table criada
[ ] Persistencia de historico funcionando
[ ] TTL configurado
[ ] Preferencias do usuario salvas
```

## Fase 4 — Polly + Apl (Dia 5-6)

```
[ ] Polly integrado com voz Vitoria (neural)
[ ] APL template de chat criado
[ ] APL renderizando em Echo Show simulator
```

## Fase 5 — Smart Home (Opcional)

```
[ ] Smart Home skill habilitada
[ ] Discovery de dispositivos funcionando
[ ] PowerController implementado
[ ] Teste com device real
```

## Fase 6 — Publicacao

```
[ ] Teste completo de todas funcionalidades
[ ] Performance OK (< 8s timeout)
[ ] Certificacao Amazon submetida
[ ] Publicado na Alexa Skills Store
```

---

## 11. Comandos Rapidos

| Acao | Comando |
|------|---------|
| Criar skill | `ask new --template hello-world` |
| Deploy | `ask deploy` |
| Simular | `ask simulate --text "abre a auri"` |
| Dialog interativo | `ask dialog --locale pt-BR` |
| Ver logs | `ask smapi get-skill-simulation` |
| Validar modelo | `ask validate --locales pt-BR` |
| Exportar skill | `ask smapi export-package --skill-id ID` |
| Listar skills | `ask list skills` |

---

## 12. Referencias

- Boilerplate Python completo: `assets/boilerplate/lambda_function.py`
- Interaction model PT-BR: `assets/interaction-models/pt-BR.json`
- APL chat template: `assets/apl-templates/chat-interface.json`
- Smart Home examples: `references/smart-home-api.md`
- ASK SDK Python docs: https://github.com/alexa/alexa-skills-kit-sdk-for-python
- Claude + Alexa guide: https://www.anthropic.com/news/claude-and-alexa-plus

## Best Practices

- Provide clear, specific context about your project and requirements
- Review all suggestions before applying them to production code
- Combine with other complementary skills for comprehensive analysis

## Common Pitfalls

- Using this skill for tasks outside its domain expertise
- Applying recommendations without understanding your specific context
- Not providing enough project context for accurate analysis
