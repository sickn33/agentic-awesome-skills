---
name: azure-ai-projects-py
description: "Build AI applications on Microsoft Foundry using the azure-ai-projects SDK."
risk: critical
source: community
date_added: "2026-02-27"
---

# Azure AI Projects Python SDK

## When to Use

Use for Microsoft Foundry project connections, model deployments, versioned agents, evaluation datasets and cloud evaluation workflows. Identify the installed SDK generation first; do not apply classic thread/run recipes to a v2 project client.

## Setup and version boundary

Use an isolated environment and the application’s locked, reviewed compatible `azure-ai-projects`, `azure-identity` and `openai` versions. Historical support files came from Microsoft’s pinned repository; see [UPSTREAM-NOTICE.md](UPSTREAM-NOTICE.md) and [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). Local corrections are documented there.

Set `AZURE_AI_PROJECT_ENDPOINT` to the exact authorized HTTPS project URL and `AZURE_AI_MODEL_DEPLOYMENT_NAME` to an actual deployment name, not an assumed model alias. Use the intended tenant/identity with least privilege; inspect the credential chain without printing credentials. Do not fetch connection secrets for a listing task.

The checked 2.0.0b4 source snapshot uses versioned agents, OpenAI conversations/responses, and `beta` namespaces for evaluators/memory/schedules. Classic agents belong to `azure-ai-agents`. Later versions can differ; consult the installed SDK and [Microsoft migration guide](https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/migrate).

## Example: create one explicitly requested versioned agent

```python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from azure.ai.projects.models import PromptAgentDefinition

with DefaultAzureCredential() as credential:
    with AIProjectClient(endpoint=os.environ["AZURE_AI_PROJECT_ENDPOINT"], credential=credential) as project:
        agent = project.agents.create_version(
            agent_name="requested-agent",
            definition=PromptAgentDefinition(
                model=os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"],
                instructions="Answer the user’s question using authorized information.",
            ),
        )
        with project.get_openai_client(timeout=60, max_retries=0) as openai:
            response = openai.responses.create(
                input="Hello",
                extra_body={"agent_reference": {"type": "agent_reference", "name": agent.name, "version": agent.version}},
            )
            # Inspect authorized output; do not log private traces or credentials.
```

## Safe workflow

1. Establish the exact tenant/project, installed versions, requested resources and data classification.
2. Read deployment/connection metadata before selecting a model; do not auto-select the first vaguely matching deployment.
3. Enable only needed tools. Model tool calls are proposals: validate arguments, authorization, destinations and effects before execution. Remote MCP endpoints must be reachable from the cloud; localhost is not the user’s machine.
4. Upload only the selected approved files. Folder extension filters do not exclude secrets or enforce access rights. Persistent memory needs scoped tenant/user isolation, retention and deletion rules.
5. Bound request timeouts, polling, concurrency, rows and spend. If resource creation times out, reconcile its outcome before retrying. Delete only task-created resources specifically intended for cleanup.

## Batch evaluation helper

`scripts/run_batch_evaluation.py` uploads the complete selected JSONL file, creates an evaluation and a run, and may incur cloud/model charges. `--allow-paid` is an execution opt-in after the user has authorized this exact file, endpoint, evaluators, deployment and budget. It is not an estimate or spend enforcement mechanism.

```bash
python scripts/run_batch_evaluation.py --data approved.jsonl --evaluators coherence --deployment approved-deployment --max-rows 100 --max-bytes 1048576 --timeout-seconds 600 --allow-paid --output new-private-results.json
```

Input rows must have consistent schemas; agent mode uses sample outputs without mutating source records. Unknown evaluators or missing mapped fields fail before upload. Poll timeout does not cancel remote execution: inspect the printed evaluation/run IDs and cancel through the installed service’s documented API if needed. Local output is new-only and mode 0600. Evaluator names/schemas remain service-version dependent; inspect the registry before a live run.

## References

- [Agent operations](references/agents.md) and [tool boundaries](references/tools.md)
- [Evaluation](references/evaluation.md), [built-ins](references/built-in-evaluators.md), [custom evaluators](references/custom-evaluators.md)
- [Connections](references/connections.md), [deployments](references/deployments.md), [datasets/indexes](references/datasets-indexes.md)
- [Async patterns](references/async-patterns.md), [checked API snapshot](references/api-reference.md)

## Limitations

No local check proves live Azure availability, model quality, legal compliance or safe autonomous tool use. Evaluation scores are sampled, version-specific judgments; report failures, missing scores, sample count and judge configuration. Keyword checks are format checks, not compliance certification. JSON output must be parsed and schema-validated. Do not run cloud evaluation during documentation review.
