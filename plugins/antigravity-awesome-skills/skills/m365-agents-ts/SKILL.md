---
name: m365-agents-ts
description: Microsoft 365 Agents SDK for TypeScript/Node.js.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Microsoft 365 Agents SDK (TypeScript)

Build enterprise agents for Microsoft 365, Teams, and Copilot Studio using the Microsoft 365 Agents SDK with Express hosting, AgentApplication routing, streaming responses, and Copilot Studio client integrations.

## Before implementation
- Use the microsoft-docs MCP to verify the latest API signatures for AgentApplication, startServer, and CopilotStudioClient.
- Confirm package versions on npm before wiring up samples or templates.

## Installation

```bash
npm install @microsoft/agents-hosting @microsoft/agents-hosting-express @microsoft/agents-activity
npm install @microsoft/agents-copilotstudio-client
```

## Environment Variables

```bash
PORT=3978
AZURE_RESOURCE_NAME=<azure-openai-resource>
AZURE_API_KEY=<azure-openai-key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

TENANT_ID=<tenant-id>
CLIENT_ID=<client-id>
CLIENT_SECRET=<client-secret>

COPILOT_ENVIRONMENT_ID=<environment-id>
COPILOT_SCHEMA_NAME=<schema-name>
COPILOT_CLIENT_ID=<copilot-app-client-id>
COPILOT_BEARER_TOKEN=<copilot-jwt>
```

## Core Workflow: Express-hosted AgentApplication

```typescript
import { AgentApplication, TurnContext, TurnState } from "@microsoft/agents-hosting";
import { startServer } from "@microsoft/agents-hosting-express";

const agent = new AgentApplication<TurnState>();

agent.onConversationUpdate("membersAdded", async (context: TurnContext) => {
  await context.sendActivity("Welcome to the agent.");
});

agent.onMessage("hello", async (context: TurnContext) => {
  await context.sendActivity(`Echo: ${context.activity.text}`);
});

startServer(agent);
```

## Streaming responses with Azure OpenAI

```typescript
import { azure } from "@ai-sdk/azure";
import { AgentApplication, TurnContext, TurnState } from "@microsoft/agents-hosting";
import { startServer } from "@microsoft/agents-hosting-express";
import { streamText } from "ai";

const agent = new AgentApplication<TurnState>();

agent.onMessage("poem", async (context: TurnContext) => {
  context.streamingResponse.setFeedbackLoop(true);
  context.streamingResponse.setGeneratedByAILabel(true);
  context.streamingResponse.setSensitivityLabel({
    type: "https://schema.org/Message",
    "@type": "CreativeWork",
    name: "Internal",
  });

  await context.streamingResponse.queueInformativeUpdate("starting a poem...");

  const { fullStream } = streamText({
    model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o-mini"),
    system: "You are a creative assistant.",
    prompt: "Write a poem about Apollo.",
  });

  try {
    for await (const part of fullStream) {
      if (part.type === "text-delta" && part.text.length > 0) {
        await context.streamingResponse.queueTextChunk(part.text);
      }
      if (part.type === "error") {
        throw new Error(`Streaming error: ${part.error}`);
      }
    }
  } finally {
    await context.streamingResponse.endStream();
  }
});

startServer(agent);
```

## Invoke activity handling

```typescript
import { Activity, ActivityTypes } from "@microsoft/agents-activity";
import { AgentApplication, TurnContext, TurnState } from "@microsoft/agents-hosting";

const agent = new AgentApplication<TurnState>();

agent.onActivity("invoke", async (context: TurnContext) => {
  const invokeResponse = Activity.fromObject({
    type: ActivityTypes.InvokeResponse,
    value: { status: 200 },
  });

  await context.sendActivity(invokeResponse);
  await context.sendActivity("Thanks for submitting your feedback.");
});
```

## Copilot Studio client (Direct to Engine)

```typescript
import { CopilotStudioClient } from "@microsoft/agents-copilotstudio-client";

const settings = {
  environmentId: process.env.COPILOT_ENVIRONMENT_ID!,
  schemaName: process.env.COPILOT_SCHEMA_NAME!,
  clientId: process.env.COPILOT_CLIENT_ID!,
};

const tokenProvider = async (): Promise<string> => {
  return process.env.COPILOT_BEARER_TOKEN!;
};

const client = new CopilotStudioClient(settings, tokenProvider);

const conversation = await client.startConversationAsync();
const reply = await client.askQuestionAsync("Hello!", conversation.id);
console.log(reply);
```

## Copilot Studio WebChat integration

```typescript
import { CopilotStudioWebChat } from "@microsoft/agents-copilotstudio-client";

const directLine = CopilotStudioWebChat.createConnection(client, {
  showTyping: true,
});

window.WebChat.renderWebChat({
  directLine,
}, document.getElementById("webchat")!);
```

## Best Practices

1. Use AgentApplication for routing and keep handlers focused on one responsibility.
2. Prefer streamingResponse for long-running completions and call endStream in finally blocks.
3. Keep secrets out of source code; load tokens from environment variables or secure stores.
4. Reuse CopilotStudioClient instances and cache tokens in your token provider.
5. Validate invoke payloads before logging or persisting feedback.

## Reference Files

| File | Contents |
| --- | --- |
| references/acceptance-criteria.md | Import paths, hosting pipeline, streaming, and Copilot Studio patterns |

## Reference Links

| Resource | URL |
| --- | --- |
| Microsoft 365 Agents SDK | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/ |
| JavaScript SDK overview | https://learn.microsoft.com/en-us/javascript/api/overview/agents-overview?view=agents-sdk-js-latest |
| @microsoft/agents-hosting-express | https://learn.microsoft.com/en-us/javascript/api/%40microsoft/agents-hosting-express?view=agents-sdk-js-latest |
| @microsoft/agents-copilotstudio-client | https://learn.microsoft.com/en-us/javascript/api/%40microsoft/agents-copilotstudio-client?view=agents-sdk-js-latest |
| Integrate with Copilot Studio | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/integrate-with-mcs |
| GitHub samples | https://github.com/microsoft/Agents/tree/main/samples/nodejs |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
