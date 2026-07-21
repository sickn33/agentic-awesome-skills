# Examples

Three practical node-object snippets for the shell + core + sub-agent topology. These are **community n8n JSON fragments** to adapt, not full importable exports — credential IDs, workflow IDs, and channel/bot IDs are placeholders. Build with `n8n_update_partial_workflow` (`addNode` + `addConnection` on the `ai_*` outputs), then verify with `n8n_get_workflow` and `validate_workflow`.

For the architecture these fit into, see **CHAT_AGENT_PATTERNS.md**.

---

## 1. Stateless agent core

A reusable agent sub-workflow: `chatInput` + `threadId` in, agent output out. Memory keyed on `threadId`, native tools, a sub-agent tool, and Block Kit structured output with an autoFix fixer model. This is the "brain" called by the shell.

```json
{
  "name": "Chat agent core",
  "nodes": [
    {
      "parameters": {
        "workflowInputs": {
          "values": [{ "name": "chatInput" }, { "name": "threadId" }]
        }
      },
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [-480, -96],
      "id": "core-trigger",
      "name": "When Executed by Another Workflow"
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $json.chatInput }}",
        "hasOutputParser": true,
        "options": {
          "systemMessage": "=You are a concise, direct assistant. Be a thinking partner, not an answer machine.\n\nCurrent date: {{ $now.format('DDDD') }}\n\n## Output\nYou are replying in Slack using Block Kit. Your entire response must be valid JSON with a 'blocks' array at the root. Bold is *single asterisks*. Links are <https://url|text>. Max 10 blocks.\n\n## Tool usage\nFact-check verifiable claims with the web search tool before answering. Use the idea database manager for anything about content ideas.",
          "maxIterations": 50
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [-48, -96],
      "id": "core-agent",
      "name": "AI Agent"
    },
    {
      "parameters": { "model": "anthropic/claude-opus-4.6", "options": { "temperature": 0.1 } },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
      "typeVersion": 1,
      "position": [-288, 192],
      "id": "core-main-llm",
      "name": "Main LLM",
      "credentials": { "openRouterApi": { "id": "REPLACE_OPENROUTER_CRED", "name": "OpenRouter" } }
    },
    {
      "parameters": {
        "sessionIdType": "customKey",
        "sessionKey": "={{ $json.threadId }}",
        "contextWindowLength": 50
      },
      "type": "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "typeVersion": 1.3,
      "position": [-128, 192],
      "id": "core-memory",
      "name": "Simple Memory"
    },
    {
      "parameters": {
        "descriptionType": "manual",
        "toolDescription": "Search the web fast to fact-check a claim or find a source. Use for verifying anything from training data.",
        "query": "={{ $fromAI('query', 'The search query, phrased to match relevant sources', 'string') }}",
        "options": { "search_depth": "fast" }
      },
      "type": "@tavily/n8n-nodes-tavily.tavilyTool",
      "typeVersion": 1,
      "position": [32, 192],
      "id": "core-web-search",
      "name": "Search the web",
      "credentials": { "tavilyApi": { "id": "REPLACE_TAVILY_CRED", "name": "Tavily" } }
    },
    {
      "parameters": {},
      "type": "@n8n/n8n-nodes-langchain.toolCalculator",
      "typeVersion": 1,
      "position": [192, 192],
      "id": "core-calc",
      "name": "Calculator"
    },
    {
      "parameters": {
        "description": "Manages the content-ideas database. Use for ANY task about content ideas: querying, creating, dedupe-checks.\n\nIMPORTANT: This tool is stateless. Send all relevant context in a single message. If creating, include ALL required fields upfront. Returns the page URL for anything referenced or created.",
        "workflowId": { "__rl": true, "value": "REPLACE_SUBAGENT_WF_ID", "mode": "list", "cachedResultName": "Notion ideas sub-agent" },
        "workflowInputs": {
          "mappingMode": "defineBelow",
          "value": { "chatInput": "={{ $fromAI('chatInput', 'The full request to the ideas database, with all context', 'string') }}" },
          "schema": [
            { "id": "chatInput", "displayName": "chatInput", "type": "string", "display": true, "canBeUsedToMatch": true }
          ]
        }
      },
      "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
      "typeVersion": 2.2,
      "position": [352, 192],
      "id": "core-idea-tool",
      "name": "Idea database manager"
    },
    {
      "parameters": {
        "schemaType": "manual",
        "inputSchema": "{ \"type\": \"object\", \"properties\": { \"text\": { \"type\": \"string\" }, \"blocks\": { \"type\": \"array\", \"items\": { \"oneOf\": [ { \"type\": \"object\", \"properties\": { \"type\": { \"const\": \"header\" }, \"text\": { \"type\": \"object\" } }, \"required\": [\"type\", \"text\"] }, { \"type\": \"object\", \"properties\": { \"type\": { \"const\": \"section\" }, \"text\": { \"type\": \"object\" } }, \"required\": [\"type\", \"text\"] }, { \"type\": \"object\", \"properties\": { \"type\": { \"const\": \"divider\" } }, \"required\": [\"type\"] } ] } } }, \"required\": [\"text\", \"blocks\"] }",
        "autoFix": true
      },
      "type": "@n8n/n8n-nodes-langchain.outputParserStructured",
      "typeVersion": 1.3,
      "position": [560, 176],
      "id": "core-parser",
      "name": "Structured Output Parser (Block Kit)"
    },
    {
      "parameters": { "model": "anthropic/claude-sonnet-4.6", "options": { "temperature": 0 } },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
      "typeVersion": 1,
      "position": [620, 336],
      "id": "core-fixer-llm",
      "name": "Fixer LLM (coding-capable)",
      "credentials": { "openRouterApi": { "id": "REPLACE_OPENROUTER_CRED", "name": "OpenRouter" } }
    }
  ],
  "connections": {
    "When Executed by Another Workflow": { "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]] },
    "Main LLM": { "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] },
    "Simple Memory": { "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]] },
    "Search the web": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] },
    "Calculator": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] },
    "Idea database manager": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] },
    "Structured Output Parser (Block Kit)": { "ai_outputParser": [[{ "node": "AI Agent", "type": "ai_outputParser", "index": 0 }]] },
    "Fixer LLM (coding-capable)": { "ai_languageModel": [[{ "node": "Structured Output Parser (Block Kit)", "type": "ai_languageModel", "index": 0 }]] }
  }
}
```

What to notice:

- **Memory keyed on `threadId`**, not on a user/channel ID (those cross conversations). The shell supplies `threadId`.
- **`maxIterations: 50`** — raised from the low default because this agent chains several tools per turn.
- **`$now.format('DDDD')`** in the system prompt — no hardcoded date.
- **Two models**: the main model on the agent, a separate coding-capable fixer wired into the parser. Both connect via `ai_languageModel` but to different nodes.
- **`hasOutputParser: true`** on the agent activates the `ai_outputParser` slot.
- The sub-agent tool's description repeats **"This tool is stateless"** — the router can't rely on shared context.

---

## 2. Slack router shell

The "shell": trigger, trigger-level anti-loop filter, event-type Switch, loading reaction, the agent-core call with an error branch, and the Block Kit reply envelope. No LLM here.

```json
{
  "name": "Slack chat router",
  "nodes": [
    {
      "parameters": {
        "trigger": ["message"],
        "watchWorkspace": true,
        "options": { "userIds": "={{ [\"U00000000BOT\"] }}" }
      },
      "type": "n8n-nodes-base.slackTrigger",
      "typeVersion": 1,
      "position": [-288, 48],
      "id": "shell-trigger",
      "name": "Slack Trigger",
      "credentials": { "slackApi": { "id": "REPLACE_SLACK_CRED", "name": "Slack" } }
    },
    {
      "parameters": {
        "rules": {
          "values": [
            {
              "conditions": {
                "options": { "version": 3 },
                "conditions": [{ "leftValue": "={{ $json.user === \"U00000000OWNER\" && $json.type === \"message\" }}", "rightValue": "", "operator": { "type": "boolean", "operation": "true", "singleValue": true } }],
                "combinator": "and"
              },
              "renameOutput": true, "outputKey": "Owner message"
            },
            {
              "conditions": {
                "options": { "version": 3 },
                "conditions": [{ "leftValue": "={{ $json.user !== \"U00000000OWNER\" && $json.type === \"message\" }}", "rightValue": "", "operator": { "type": "boolean", "operation": "true", "singleValue": true } }],
                "combinator": "and"
              },
              "renameOutput": true, "outputKey": "Unknown user"
            }
          ]
        }
      },
      "type": "n8n-nodes-base.switch",
      "typeVersion": 3.4,
      "position": [-32, 48],
      "id": "shell-switch",
      "name": "Switch"
    },
    {
      "parameters": {
        "resource": "reaction",
        "channelId": { "__rl": true, "value": "={{ $json.channel }}", "mode": "id" },
        "timestamp": "={{ $json.ts }}",
        "name": "spinner"
      },
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2.4,
      "position": [240, -64],
      "id": "shell-add-reaction",
      "name": "Add Loading Reaction",
      "credentials": { "slackApi": { "id": "REPLACE_SLACK_CRED", "name": "Slack" } }
    },
    {
      "parameters": {
        "workflowId": { "__rl": true, "value": "REPLACE_AGENT_CORE_WF_ID", "mode": "list", "cachedResultName": "Chat agent core" },
        "workflowInputs": {
          "mappingMode": "defineBelow",
          "value": {
            "chatInput": "={{ $('Slack Trigger').item.json.text }}",
            "threadId": "={{ $('Slack Trigger').item.json.thread_ts || $('Slack Trigger').item.json.ts }}"
          },
          "schema": [
            { "id": "chatInput", "displayName": "chatInput", "type": "string", "display": true },
            { "id": "threadId", "displayName": "threadId", "type": "string", "display": true }
          ]
        }
      },
      "type": "n8n-nodes-base.executeWorkflow",
      "typeVersion": 1.3,
      "position": [480, -64],
      "id": "shell-call-core",
      "name": "Call Agent core",
      "retryOnFail": true,
      "maxTries": 2,
      "waitBetweenTries": 5000,
      "onError": "continueErrorOutput"
    },
    {
      "parameters": {
        "resource": "reaction",
        "operation": "remove",
        "channelId": { "__rl": true, "value": "={{ $('Switch').item.json.channel }}", "mode": "id" },
        "timestamp": "={{ $('Switch').item.json.ts }}",
        "name": "spinner"
      },
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2.4,
      "position": [720, -160],
      "id": "shell-remove-reaction-ok",
      "name": "Remove Loading Reaction (success)",
      "credentials": { "slackApi": { "id": "REPLACE_SLACK_CRED", "name": "Slack" } }
    },
    {
      "parameters": {
        "select": "user",
        "user": { "__rl": true, "value": "={{ $('Slack Trigger').item.json.user }}", "mode": "id" },
        "messageType": "block",
        "blocksUi": "={{ { \"blocks\": $('Call Agent core').item.json.output.blocks } }}",
        "otherOptions": {
          "thread_ts": { "replyValues": { "thread_ts": "={{ $('Slack Trigger').item.json.thread_ts || $('Slack Trigger').item.json.ts }}" } }
        }
      },
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2.4,
      "position": [960, -160],
      "id": "shell-send-reply",
      "name": "Send Block Kit reply",
      "credentials": { "slackApi": { "id": "REPLACE_SLACK_CRED", "name": "Slack" } }
    },
    {
      "parameters": {
        "select": "user",
        "user": { "__rl": true, "value": "={{ $('Slack Trigger').item.json.user }}", "mode": "id" },
        "text": "=There was a workflow error. https://<your-n8n-host>/workflow/<this-workflow-id>/executions/{{ $execution.id }}",
        "otherOptions": {
          "thread_ts": { "replyValues": { "thread_ts": "={{ $('Slack Trigger').item.json.thread_ts || $('Slack Trigger').item.json.ts }}" } }
        }
      },
      "type": "n8n-nodes-base.slack",
      "typeVersion": 2.4,
      "position": [720, 64],
      "id": "shell-send-error",
      "name": "Send error message with execution link",
      "credentials": { "slackApi": { "id": "REPLACE_SLACK_CRED", "name": "Slack" } }
    }
  ],
  "connections": {
    "Slack Trigger": { "main": [[{ "node": "Switch", "type": "main", "index": 0 }]] },
    "Switch": { "main": [[{ "node": "Add Loading Reaction", "type": "main", "index": 0 }], []] },
    "Add Loading Reaction": { "main": [[{ "node": "Call Agent core", "type": "main", "index": 0 }]] },
    "Call Agent core": {
      "main": [
        [{ "node": "Remove Loading Reaction (success)", "type": "main", "index": 0 }],
        [{ "node": "Send error message with execution link", "type": "main", "index": 0 }]
      ]
    },
    "Remove Loading Reaction (success)": { "main": [[{ "node": "Send Block Kit reply", "type": "main", "index": 0 }]] }
  }
}
```

What to notice:

- **Anti-loop at the trigger**: `options.userIds: ["U00000000BOT"]` is an exclusion list — the bot's own posts never enter the workflow. No separate filter node needed.
- **`Call Agent core`** has `onError: 'continueErrorOutput'`, so `main[1]` carries the error branch (→ **n8n-error-handling**). The loading reaction is removed on the success path; the error branch surfaces a link instead of hanging forever.
- **`threadId`** = `thread_ts || ts`, plumbed straight to the core (which keys memory on it).
- **`blocksUi`** is the `{ "blocks": [...] }` envelope, not the bare array — the bare array fails silently.

---

## 3. Domain sub-agent (Notion ideas)

A specialist sub-agent called via `.toolWorkflow` from the core. It fetches its DB schema fresh on every call and runs on a cheaper model than the router.

```json
{
  "name": "Notion ideas sub-agent",
  "nodes": [
    {
      "parameters": { "workflowInputs": { "values": [{ "name": "chatInput" }] } },
      "type": "n8n-nodes-base.executeWorkflowTrigger",
      "typeVersion": 1.1,
      "position": [-240, 0],
      "id": "sub-trigger",
      "name": "When Executed by Another Workflow"
    },
    {
      "parameters": {
        "resource": "database",
        "databaseId": { "__rl": true, "value": "REPLACE_NOTION_DB_ID", "mode": "id" },
        "simple": false
      },
      "type": "n8n-nodes-base.notion",
      "typeVersion": 2.2,
      "position": [-32, 0],
      "id": "sub-get-db",
      "name": "Get a database",
      "credentials": { "notionApi": { "id": "REPLACE_NOTION_CRED", "name": "Notion" } }
    },
    {
      "parameters": {
        "promptType": "define",
        "text": "={{ $('When Executed by Another Workflow').item.json.chatInput }}",
        "options": {
          "systemMessage": "=You manage a Notion ideas database. Query and create idea entries.\n\n## Database schema (fetched fresh this call)\n{{ $('Get a database').first().json.properties.toJsonString() }}\n\n## Rules\n1. Always respond in chat with the result.\n2. Always return the Notion URL for any page created or referenced.\n3. Select/multi-select values must EXACTLY match an existing schema option.\n4. IMPORTANT: you are stateless. If information is missing, list exactly what's needed and remind the caller to resend the complete request with all details.",
          "maxIterations": 15
        }
      },
      "type": "@n8n/n8n-nodes-langchain.agent",
      "typeVersion": 3.1,
      "position": [208, 0],
      "id": "sub-agent",
      "name": "AI Agent"
    },
    {
      "parameters": { "model": "anthropic/claude-haiku-4.6", "options": { "temperature": 0.1 } },
      "type": "@n8n/n8n-nodes-langchain.lmChatOpenRouter",
      "typeVersion": 1,
      "position": [112, 256],
      "id": "sub-llm",
      "name": "Sub-agent LLM (cheaper than router)",
      "credentials": { "openRouterApi": { "id": "REPLACE_OPENROUTER_CRED", "name": "OpenRouter" } }
    },
    {
      "parameters": {
        "descriptionType": "manual",
        "toolDescription": "Returns all ideas that are still active (not rejected, cancelled, or started).",
        "resource": "databasePage",
        "operation": "getAll",
        "databaseId": { "__rl": true, "value": "REPLACE_NOTION_DB_ID", "mode": "id" },
        "returnAll": true,
        "filterType": "manual",
        "filters": { "conditions": [{ "key": "Status|status", "condition": "does_not_equal", "statusValue": "Rejected" }] }
      },
      "type": "n8n-nodes-base.notionTool",
      "typeVersion": 2.2,
      "position": [304, 256],
      "id": "sub-get-active",
      "name": "Get active ideas",
      "credentials": { "notionApi": { "id": "REPLACE_NOTION_CRED", "name": "Notion" } }
    },
    {
      "parameters": {
        "descriptionType": "manual",
        "toolDescription": "Creates an idea entry. Always enters as status 'Idea'. Select fields must match schema options exactly.",
        "resource": "databasePage",
        "databaseId": { "__rl": true, "value": "REPLACE_NOTION_DB_ID", "mode": "id" },
        "title": "={{ $fromAI('Title', 'Short title of the idea', 'string') }}",
        "propertiesUi": {
          "propertyValues": [
            { "key": "Status|status", "statusValue": "Idea" },
            { "key": "Type|select", "selectValue": "={{ $fromAI('type', 'Type column; must EXACTLY match a schema option', 'string') }}" }
          ]
        }
      },
      "type": "n8n-nodes-base.notionTool",
      "typeVersion": 2.2,
      "position": [480, 256],
      "id": "sub-create",
      "name": "Create idea",
      "credentials": { "notionApi": { "id": "REPLACE_NOTION_CRED", "name": "Notion" } }
    }
  ],
  "connections": {
    "When Executed by Another Workflow": { "main": [[{ "node": "Get a database", "type": "main", "index": 0 }]] },
    "Get a database": { "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]] },
    "Sub-agent LLM (cheaper than router)": { "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] },
    "Get active ideas": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] },
    "Create idea": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] }
  }
}
```

What to notice:

- **Fresh schema injection**: `Get a database` runs **before** the agent (on `main`), and its `properties` are templated into the system prompt with `.toJsonString()`. The sub-agent never operates on a stale schema, so it can't pick a select option that was renamed last week.
- **Cheaper model** (`claude-haiku-4.6`) than the router — a focused single-domain agent doesn't need the orchestrator's model.
- **Stateless contract** restated in the system prompt — matching the tool description on the core side.
- **`maxIterations: 15`** — fine for a focused sub-agent (vs 50 on the broad router).
- The `Status|status` / `Type|select` key shape is Notion's `Name|type` convention; match the live schema.

---

## Cross-references

- The topology these fit into → **CHAT_AGENT_PATTERNS.md**
- The `.toolWorkflow` mapping → **SUBWORKFLOW_AS_TOOL.md**
- Block Kit schema and autoFix → **STRUCTURED_OUTPUT.md**
- Error branch on the core call → **n8n-error-handling**
