---
name: azure-ai-language-conversations-py
description: Implement Conversational Language Understanding (CLU) using the azure-ai-language-conversations Python SDK. Use when working with ConversationAnalysisClient to analyze conversation intent and entities, building NLP features, or integrating language understanding into applications.
risk: unknown
source: https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-python/skills/azure-ai-language-conversations-py
source_repo: microsoft/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/microsoft/skills/blob/main/LICENSE
---

# Azure AI Language Conversations for Python
## When to Use

Use this skill when you need implement Conversational Language Understanding (CLU) using the azure-ai-language-conversations Python SDK. Use when working with ConversationAnalysisClient to analyze conversation intent and entities, building NLP features, or integrating language understanding into applications.


## System Prompt
You are an expert Python developer specializing in Azure AI Services and Natural Language Processing.
Your task is to help users implement Conversational Language Understanding (CLU) using the `azure-ai-language-conversations` SDK.

When responding to requests about Azure AI Language Conversations:
1. Always use the latest version of the `azure-ai-language-conversations` SDK.
2. Emphasize the use of `ConversationAnalysisClient` with `DefaultAzureCredential`.
3. Provide clear code examples demonstrating how to structure the conversation payload.
4. Handle exceptions properly.

## Authentication & Lifecycle

> **🔑 Two rules apply to every code sample below:**
>
> 1. **Prefer `DefaultAzureCredential`.** It works locally (Azure CLI / VS Code / Developer CLI) and in Azure (managed identity, workload identity) with no code change. Avoid connection strings, account/API keys — they bypass Entra audit and rotation.
>    - Local dev: `DefaultAzureCredential` works as-is.
>    - Production: set `AZURE_TOKEN_CREDENTIALS=prod` (or `AZURE_TOKEN_CREDENTIALS=<specific_credential>`) to constrain the credential chain to production-safe credentials.
> 2. **Wrap every client in a context manager** so HTTP transports, sockets, and token caches are released deterministically:
>    - Sync: `with <Client>(...) as client:`
>    - Async: `async with <Client>(...) as client:` **and** `async with DefaultAzureCredential() as credential:` (from `azure.identity.aio`)
>
> Snippets may abbreviate this setup, but production code should always follow both rules.

`ConversationAnalysisClient` accepts a `TokenCredential` such as `DefaultAzureCredential`. Use the token credential — it works locally (Azure CLI / VS Code / Developer CLI) and in Azure (managed identity, workload identity) with no code change.

### Legacy: API Key (existing keyed deployments)

New code should use `DefaultAzureCredential`. Use `AzureKeyCredential` only if you have an existing keyed deployment that hasn't been migrated to Entra ID yet — for example, regulated environments still completing their Entra rollout.

```python
import os
from azure.core.credentials import AzureKeyCredential
from azure.ai.language.conversations import ConversationAnalysisClient

endpoint = os.environ["AZURE_CONVERSATIONS_ENDPOINT"]
key = os.environ["AZURE_CONVERSATIONS_KEY"]

with ConversationAnalysisClient(endpoint, AzureKeyCredential(key)) as client:
    # See "Basic Conversation Analysis" below for the analyze_conversation payload
    ...
```

## Best Practices
- **Pick sync OR async and stay consistent.** Do not mix `azure.ai.language.conversations` sync clients with `azure.ai.language.conversations.aio` async clients in the same call path. Choose one mode per module.
- **Always use context managers for clients and async credentials.** Wrap every client in `with ConversationAnalysisClient(...) as client:` (sync) or `async with ConversationAnalysisClient(...) as client:` (async). For async `DefaultAzureCredential` from `azure.identity.aio`, also use `async with credential:` so tokens and transports are cleaned up.
- **Use `DefaultAzureCredential`** for portable auth across local dev and Azure (avoid API keys; they bypass Entra audit and rotation).
- Use environment variables for the endpoint, project name, and deployment name.
- Clearly map the `participantId` and `id` in the `conversationItem` payload.

## Examples

### Basic Conversation Analysis
```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.language.conversations import ConversationAnalysisClient

endpoint = os.environ["AZURE_CONVERSATIONS_ENDPOINT"]
project_name = os.environ["AZURE_CONVERSATIONS_PROJECT"]
deployment_name = os.environ["AZURE_CONVERSATIONS_DEPLOYMENT"]

# DefaultAzureCredential works locally and in Azure with no code change.
credential = DefaultAzureCredential()

with ConversationAnalysisClient(endpoint, credential) as client:
    query = "Send an email to Carol about the tomorrow's meeting"
    result = client.analyze_conversation(
        task={
            "kind": "Conversation",
            "analysisInput": {
                "conversationItem": {
                    "participantId": "1",
                    "id": "1",
                    "modality": "text",
                    "language": "en",
                    "text": query
                },
                "isLoggingEnabled": False
            },
            "parameters": {
                "projectName": project_name,
                "deploymentName": deployment_name,
                "verbose": True
            }
        }
    )

    print(f"Top intent: {result['result']['prediction']['topIntent']}")

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
