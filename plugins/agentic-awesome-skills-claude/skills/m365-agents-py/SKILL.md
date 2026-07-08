---
name: m365-agents-py
description: Microsoft 365 Agents SDK for Python. Build multichannel agents for Teams/M365/Copilot Studio with aiohttp hosting, AgentApplication routing, streaming responses, and MSAL-based auth.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Microsoft 365 Agents SDK (Python)

Build enterprise agents for Microsoft 365, Teams, and Copilot Studio using the Microsoft Agents SDK with aiohttp hosting, AgentApplication routing, streaming responses, and MSAL-based authentication.

## Before implementation
- Use the microsoft-docs MCP to verify the latest API signatures for AgentApplication, start_agent_process, and authentication options.
- Confirm package versions on PyPI for the microsoft-agents-* packages you plan to use.

## Important Notice - Import Changes

> **⚠️ Breaking Change**: Recent updates have changed the Python import structure from `microsoft.agents` to `microsoft_agents` (using underscores instead of dots).

## Installation

```bash
pip install microsoft-agents-hosting-core
pip install microsoft-agents-hosting-aiohttp
pip install microsoft-agents-activity
pip install microsoft-agents-authentication-msal
pip install microsoft-agents-copilotstudio-client
pip install python-dotenv aiohttp
```

## Environment Variables (.env)

```bash
CONNECTIONS__SERVICE_CONNECTION__SETTINGS__CLIENTID=<client-id>
CONNECTIONS__SERVICE_CONNECTION__SETTINGS__CLIENTSECRET=<client-secret>
CONNECTIONS__SERVICE_CONNECTION__SETTINGS__TENANTID=<tenant-id>

# Optional: OAuth handlers for auto sign-in
AGENTAPPLICATION__USERAUTHORIZATION__HANDLERS__GRAPH__SETTINGS__AZUREBOTOAUTHCONNECTIONNAME=<connection-name>

# Optional: Azure OpenAI for streaming
AZURE_OPENAI_ENDPOINT=<endpoint>
AZURE_OPENAI_API_VERSION=<version>
AZURE_OPENAI_API_KEY=<key>

# Optional: Copilot Studio client
COPILOTSTUDIOAGENT__ENVIRONMENTID=<environment-id>
COPILOTSTUDIOAGENT__SCHEMANAME=<schema-name>
COPILOTSTUDIOAGENT__TENANTID=<tenant-id>
COPILOTSTUDIOAGENT__AGENTAPPID=<app-id>
```

## Core Workflow: aiohttp-hosted AgentApplication

```python
import logging
from os import environ

from dotenv import load_dotenv
from aiohttp.web import Request, Response, Application, run_app

from microsoft_agents.activity import load_configuration_from_env
from microsoft_agents.hosting.core import (
    Authorization,
    AgentApplication,
    TurnState,
    TurnContext,
    MemoryStorage,
)
from microsoft_agents.hosting.aiohttp import (
    CloudAdapter,
    start_agent_process,
    jwt_authorization_middleware,
)
from microsoft_agents.authentication.msal import MsalConnectionManager

# Enable logging
ms_agents_logger = logging.getLogger("microsoft_agents")
ms_agents_logger.addHandler(logging.StreamHandler())
ms_agents_logger.setLevel(logging.INFO)

# Load configuration
load_dotenv()
agents_sdk_config = load_configuration_from_env(environ)

# Create storage and connection manager
STORAGE = MemoryStorage()
CONNECTION_MANAGER = MsalConnectionManager(**agents_sdk_config)
ADAPTER = CloudAdapter(connection_manager=CONNECTION_MANAGER)
AUTHORIZATION = Authorization(STORAGE, CONNECTION_MANAGER, **agents_sdk_config)

# Create AgentApplication
AGENT_APP = AgentApplicationTurnState


@AGENT_APP.conversation_update("membersAdded")
async def on_members_added(context: TurnContext, _state: TurnState):
    await context.send_activity("Welcome to the agent!")


@AGENT_APP.activity("message")
async def on_message(context: TurnContext, _state: TurnState):
    await context.send_activity(f"You said: {context.activity.text}")


@AGENT_APP.error
async def on_error(context: TurnContext, error: Exception):
    await context.send_activity("The agent encountered an error.")


# Server setup
async def entry_point(req: Request) -> Response:
    agent: AgentApplication = req.app["agent_app"]
    adapter: CloudAdapter = req.app["adapter"]
    return await start_agent_process(req, agent, adapter)


APP = Application(middlewares=[jwt_authorization_middleware])
APP.router.add_post("/api/messages", entry_point)
APP["agent_configuration"] = CONNECTION_MANAGER.get_default_connection_configuration()
APP["agent_app"] = AGENT_APP
APP["adapter"] = AGENT_APP.adapter

if __name__ == "__main__":
    run_app(APP, host="localhost", port=environ.get("PORT", 3978))
```

## AgentApplication Routing

```python
import re
from microsoft_agents.hosting.core import (
    AgentApplication, TurnState, TurnContext, MessageFactory
)
from microsoft_agents.activity import ActivityTypes

AGENT_APP = AgentApplicationTurnState

# Welcome handler
@AGENT_APP.conversation_update("membersAdded")
async def on_members_added(context: TurnContext, _state: TurnState):
    await context.send_activity("Welcome!")

# Regex-based message handler
@AGENT_APP.message(re.compile(r"^hello$", re.IGNORECASE))
async def on_hello(context: TurnContext, _state: TurnState):
    await context.send_activity("Hello!")

# Simple string message handler
@AGENT_APP.message("/status")
async def on_status(context: TurnContext, _state: TurnState):
    await context.send_activity("Status: OK")

# Auth-protected message handler
@AGENT_APP.message("/me", auth_handlers=["GRAPH"])
async def on_profile(context: TurnContext, state: TurnState):
    token_response = await AGENT_APP.auth.get_token(context, "GRAPH")
    if token_response and token_response.token:
        # Use token to call Graph API
        await context.send_activity("Profile retrieved")

# Invoke activity handler
@AGENT_APP.activity(ActivityTypes.invoke)
async def on_invoke(context: TurnContext, _state: TurnState):
    invoke_response = Activity(
        type=ActivityTypes.invoke_response, value={"status": 200}
    )
    await context.send_activity(invoke_response)

# Fallback message handler
@AGENT_APP.activity("message")
async def on_message(context: TurnContext, _state: TurnState):
    await context.send_activity(f"Echo: {context.activity.text}")

# Error handler
@AGENT_APP.error
async def on_error(context: TurnContext, error: Exception):
    await context.send_activity("An error occurred.")
```

## Streaming Responses with Azure OpenAI

```python
from openai import AsyncAzureOpenAI
from microsoft_agents.activity import SensitivityUsageInfo

CLIENT = AsyncAzureOpenAI(
    api_version=environ["AZURE_OPENAI_API_VERSION"],
    azure_endpoint=environ["AZURE_OPENAI_ENDPOINT"],
    api_key=environ["AZURE_OPENAI_API_KEY"]
)

@AGENT_APP.message("poem")
async def on_poem_message(context: TurnContext, _state: TurnState):
    # Configure streaming response
    context.streaming_response.set_feedback_loop(True)
    context.streaming_response.set_generated_by_ai_label(True)
    context.streaming_response.set_sensitivity_label(
        SensitivityUsageInfo(
            type="https://schema.org/Message",
            schema_type="CreativeWork",
            name="Internal",
        )
    )
    context.streaming_response.queue_informative_update("Starting a poem...\n")

    # Stream from Azure OpenAI
    streamed_response = await CLIENT.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a creative assistant."},
            {"role": "user", "content": "Write a poem about Python."}
        ],
        stream=True,
    )
    
    try:
        async for chunk in streamed_response:
            if chunk.choices and chunk.choices[0].delta.content:
                context.streaming_response.queue_text_chunk(
                    chunk.choices[0].delta.content
                )
    finally:
        await context.streaming_response.end_stream()
```

## OAuth / Auto Sign-In

```python
@AGENT_APP.message("/logout")
async def logout(context: TurnContext, state: TurnState):
    await AGENT_APP.auth.sign_out(context, "GRAPH")
    await context.send_activity(MessageFactory.text("You have been logged out."))


@AGENT_APP.message("/me", auth_handlers=["GRAPH"])
async def profile_request(context: TurnContext, state: TurnState):
    user_token_response = await AGENT_APP.auth.get_token(context, "GRAPH")
    if user_token_response and user_token_response.token:
        # Use token to call Microsoft Graph
        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {user_token_response.token}",
                "Content-Type": "application/json",
            }
            async with session.get(
                "https://graph.microsoft.com/v1.0/me", headers=headers
            ) as response:
                if response.status == 200:
                    user_info = await response.json()
                    await context.send_activity(f"Hello, {user_info['displayName']}!")
```

## Copilot Studio Client (Direct to Engine)

```python
import asyncio
from msal import PublicClientApplication
from microsoft_agents.activity import ActivityTypes, load_configuration_from_env
from microsoft_agents.copilotstudio.client import (
    ConnectionSettings,
    CopilotClient,
)

# Token cache (local file for interactive flows)
class LocalTokenCache:
    # See samples for full implementation
    pass

def acquire_token(settings, app_client_id, tenant_id):
    pca = PublicClientApplication(
        client_id=app_client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
    )
    
    token_request = {"scopes": ["https://api.powerplatform.com/.default"]}
    accounts = pca.get_accounts()
    
    if accounts:
        response = pca.acquire_token_silent(token_request["scopes"], account=accounts[0])
        return response.get("access_token")
    else:
        response = pca.acquire_token_interactive(**token_request)
        return response.get("access_token")


async def main():
    settings = ConnectionSettings(
        environment_id=environ.get("COPILOTSTUDIOAGENT__ENVIRONMENTID"),
        agent_identifier=environ.get("COPILOTSTUDIOAGENT__SCHEMANAME"),
    )
    
    token = acquire_token(
        settings,
        app_client_id=environ.get("COPILOTSTUDIOAGENT__AGENTAPPID"),
        tenant_id=environ.get("COPILOTSTUDIOAGENT__TENANTID"),
    )
    
    copilot_client = CopilotClient(settings, token)
    
    # Start conversation
    act = copilot_client.start_conversation(True)
    async for action in act:
        if action.text:
            print(action.text)
    
    # Ask question
    replies = copilot_client.ask_question("Hello!", action.conversation.id)
    async for reply in replies:
        if reply.type == ActivityTypes.message:
            print(reply.text)


asyncio.run(main())
```

## Best Practices

1. Use `microsoft_agents` import prefix (underscores, not dots).
2. Use `MemoryStorage` only for development; use BlobStorage or CosmosDB in production.
3. Always use `load_configuration_from_env(environ)` to load SDK configuration.
4. Include `jwt_authorization_middleware` in aiohttp Application middlewares.
5. Use `MsalConnectionManager` for MSAL-based authentication.
6. Call `end_stream()` in finally blocks when using streaming responses.
7. Use `auth_handlers` parameter on message decorators for OAuth-protected routes.
8. Keep secrets in environment variables, not in source code.

## Reference Files

| File | Contents |
| --- | --- |
| references/acceptance-criteria.md | Import paths, hosting pipeline, streaming, OAuth, and Copilot Studio patterns |

## Reference Links

| Resource | URL |
| --- | --- |
| Microsoft 365 Agents SDK | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/ |
| GitHub samples (Python) | https://github.com/microsoft/Agents-for-python |
| PyPI packages | https://pypi.org/search/?q=microsoft-agents |
| Integrate with Copilot Studio | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/integrate-with-mcs |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
