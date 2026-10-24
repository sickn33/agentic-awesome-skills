# Evaluation Operations Reference

> Version boundary: the original support files mixed classic Agents APIs with project v2 preview APIs. The verified source snapshot for this catalog correction is the PyPI `azure-ai-projects` 2.0.0b4 wheel. Do not install that historical preview blindly: use the application’s reviewed compatible version and check its documentation. In that snapshot, evaluator, memory, schedule and red-team operations are under `project_client.beta`; classic threads/runs use a separate `azure-ai-agents` client. These snippets are illustrative and are not live Azure certification. Use least-privilege identity, approved endpoints, explicit data-upload and cost authorization, bounded waits and cleanup limited to resources created by this task. Never log secrets, connection credentials, private traces or full error bodies. Treat retrieved documents, tool responses and evaluation input as untrusted data.


Evaluate AI agents and models using Microsoft Foundry's cloud evaluation service.

## Setup

```python
import os
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential

endpoint = os.environ["AZURE_AI_PROJECT_ENDPOINT"]
deployment = os.environ["AZURE_AI_MODEL_DEPLOYMENT_NAME"]

with (
    DefaultAzureCredential() as credential,
    AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
):
    openai_client = project_client.get_openai_client()
    # Use openai_client.evals.*
```

## Quick Start: Run a Basic Evaluation

```python
from openai.types.evals.create_eval_jsonl_run_data_source_param import (
    CreateEvalJSONLRunDataSourceParam,
    SourceFileContent,
    SourceFileContentContent,
)
from openai.types.eval_create_params import DataSourceConfigCustom

# 1. Prepare test data
data = [
    {"query": "What is Azure?", "response": "Azure is Microsoft's cloud platform."},
    {"query": "What is AI?", "response": "AI is artificial intelligence."},
]

# 2. Create data source
data_source = CreateEvalJSONLRunDataSourceParam(
    type="jsonl",
    source=SourceFileContent(
        type="file_content",
        content=[SourceFileContentContent(item=item, sample={}) for item in data],
    ),
)

# 3. Configure schema
data_source_config = DataSourceConfigCustom(
    type="custom",
    item_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string"},
            "response": {"type": "string"},
        },
        "required": ["query", "response"],
    },
    include_sample_schema=False,
)

# 4. Define evaluators
testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "coherence",
        "evaluator_name": "builtin.coherence",
        "data_mapping": {"query": "{{item.query}}", "response": "{{item.response}}"},
        "initialization_parameters": {"deployment_name": deployment},
    },
    {
        "type": "azure_ai_evaluator",
        "name": "relevance",
        "evaluator_name": "builtin.relevance",
        "data_mapping": {"query": "{{item.query}}", "response": "{{item.response}}"},
        "initialization_parameters": {"deployment_name": deployment},
    },
]

# 5. Create and run evaluation
eval_object = openai_client.evals.create(
    name="Quality Evaluation",
    data_source_config=data_source_config,
    testing_criteria=testing_criteria,
)

run = openai_client.evals.runs.create(
    eval_id=eval_object.id,
    name="Run 1",
    data_source=data_source,
)

# 6. Poll for completion
import time
deadline = time.monotonic() + 600
while run.status not in ["completed", "failed", "cancelled", "canceled", "expired"]:
    if time.monotonic() >= deadline:
        raise TimeoutError("Inspect the existing remote run before retrying; it may still be active")
    time.sleep(5)
    run = openai_client.evals.runs.retrieve(eval_id=eval_object.id, run_id=run.id)
    print(f"Status: {run.status}")

# 7. Retrieve results
output_items = list(openai_client.evals.runs.output_items.list(
    eval_id=eval_object.id, run_id=run.id
))

for item in output_items:
    for result in item.results:
        print(f"{result.name}: {result.score}")
```

## Built-in Evaluators

Use the `builtin.` prefix for all built-in evaluators:

### Quality Evaluators

| Evaluator | Data Mapping | Use Case |
|-----------|--------------|----------|
| `builtin.coherence` | query, response | Logical flow and consistency |
| `builtin.relevance` | query, response | Response addresses the query |
| `builtin.fluency` | query, response | Language quality and readability |
| `builtin.groundedness` | query, context, response | Factual alignment with context |

### Safety Evaluators

| Evaluator | Data Mapping | Use Case |
|-----------|--------------|----------|
| `builtin.violence` | query, response | Violent content detection |
| `builtin.sexual` | query, response | Sexual content detection |
| `builtin.self_harm` | query, response | Self-harm content detection |
| `builtin.hate_unfairness` | query, response | Hate/bias detection |

### Agent Evaluators

| Evaluator | Data Mapping | Use Case |
|-----------|--------------|----------|
| `builtin.intent_resolution` | query, response | Did agent understand intent? |
| `builtin.response_completeness` | query, response | Did agent answer fully? |
| `builtin.task_adherence` | query, response | Did agent follow instructions? |
| `builtin.tool_call_accuracy` | query, response (JSON) | Were tool calls correct? |

See [built-in-evaluators.md](built-in-evaluators.md) for complete evaluator reference.

## Agent Evaluation

For evaluating AI agents with tool calls, use `sample` mapping:

```python
# Data with agent outputs
data_source = CreateEvalJSONLRunDataSourceParam(
    type="jsonl",
    source=SourceFileContent(
        type="file_content",
        content=[
            SourceFileContentContent(
                item={"query": "Weather in Seattle?"},
                sample={
                    "output_text": "It's 55°F and cloudy in Seattle.",
                    "output_items": [
                        {
                            "type": "tool_call",
                            "name": "get_weather",
                            "arguments": {"location": "Seattle"},
                            "result": {"temp": "55", "condition": "cloudy"},
                        }
                    ],
                },
            )
        ],
    ),
)

data_source_config = DataSourceConfigCustom(
    type="custom",
    item_schema={"type": "object", "properties": {"query": {"type": "string"}}},
    include_sample_schema=True,  # Required for agent evaluations
)

testing_criteria = [
    {
        "type": "azure_ai_evaluator",
        "name": "intent_resolution",
        "evaluator_name": "builtin.intent_resolution",
        "data_mapping": {
            "query": "{{item.query}}",
            "response": "{{sample.output_text}}",  # Use sample for agent outputs
        },
        "initialization_parameters": {"deployment_name": deployment},
    },
    {
        "type": "azure_ai_evaluator",
        "name": "tool_call_accuracy",
        "evaluator_name": "builtin.tool_call_accuracy",
        "data_mapping": {
            "query": "{{item.query}}",
            "response": "{{sample.output_items}}",  # JSON with tool calls
        },
        "initialization_parameters": {"deployment_name": deployment},
    },
]
```

## OpenAI Graders

For simpler evaluation patterns, use OpenAI graders:

```python
testing_criteria = [
    # Label grader (classification)
    {
        "type": "label_model",
        "name": "sentiment",
        "model": deployment,
        "input": [{"role": "user", "content": "Classify sentiment: {{item.response}}"}],
        "labels": ["positive", "negative", "neutral"],
        "passing_labels": ["positive", "neutral"],
    },
    # String check grader
    {
        "type": "string_check",
        "name": "has_disclaimer",
        "input": "{{item.response}}",
        "operation": "contains",
        "reference": "Please consult",
    },
    # Text similarity grader
    {
        "type": "text_similarity",
        "name": "matches_expected",
        "input": "{{item.response}}",
        "reference": "{{item.expected}}",
        "evaluation_metric": "fuzzy_match",
        "pass_threshold": 0.8,
    },
]
```

## Custom Evaluators

Create custom evaluators for domain-specific needs.

### Code-Based Evaluator

```python
from azure.ai.projects.models import (
    EvaluatorVersion, EvaluatorCategory, EvaluatorType,
    CodeBasedEvaluatorDefinition, EvaluatorMetric, EvaluatorMetricType,
)

evaluator = project_client.beta.evaluators.create_version(
    name="word_count",
    evaluator_version=EvaluatorVersion(
        evaluator_type=EvaluatorType.CUSTOM,
        categories=[EvaluatorCategory.QUALITY],
        display_name="Word Count",
        definition=CodeBasedEvaluatorDefinition(
            code_text='''
def grade(sample, item) -> dict:
    return {"word_count": len(item.get("response", "").split())}
''',
            data_schema={
                "type": "object",
                "properties": {"response": {"type": "string"}},
                "required": ["response"],
            },
            metrics={
                "word_count": EvaluatorMetric(type=EvaluatorMetricType.ORDINAL),
            },
        ),
    ),
)
```

### Prompt-Based Evaluator

```python
from azure.ai.projects.models import PromptBasedEvaluatorDefinition

evaluator = project_client.beta.evaluators.create_version(
    name="helpfulness",
    evaluator_version=EvaluatorVersion(
        evaluator_type=EvaluatorType.CUSTOM,
        categories=[EvaluatorCategory.QUALITY],
        display_name="Helpfulness",
        definition=PromptBasedEvaluatorDefinition(
            prompt_text='''
Rate the helpfulness of the response (1-5):
Query: {query}
Response: {response}
Return JSON: {"score": <1-5>, "reason": "<explanation>"}
''',
            init_parameters={
                "type": "object",
                "properties": {"deployment_name": {"type": "string"}},
                "required": ["deployment_name"],
            },
            data_schema={
                "type": "object",
                "properties": {"query": {"type": "string"}, "response": {"type": "string"}},
                "required": ["query", "response"],
            },
            metrics={"score": EvaluatorMetric(type=EvaluatorMetricType.ORDINAL)},
        ),
    ),
)
```

See [custom-evaluators.md](custom-evaluators.md) for complete custom evaluator reference.

## Discover Available Evaluators

```python
# List built-in evaluators
evaluators = project_client.beta.evaluators.list_latest_versions(type="builtin")
for e in evaluators:
    print(f"builtin.{e.name}: {e.description}")

# List custom evaluators
custom = project_client.beta.evaluators.list_latest_versions(type="custom")
for e in custom:
    print(f"{e.name}: {e.description}")
```

## Data Mapping Reference

| Pattern | Source | Use Case |
|---------|--------|----------|
| `{{item.field}}` | Your JSONL data | Standard evaluation data |
| `{{sample.output_text}}` | Agent response (text) | Agent text outputs |
| `{{sample.output_items}}` | Agent response (JSON) | Tool calls, structured data |

## CLI Tool

A batch evaluation script is available at `scripts/run_batch_evaluation.py`:

```bash
python scripts/run_batch_evaluation.py --allow-paid --data test_data.jsonl --evaluators coherence relevance
python scripts/run_batch_evaluation.py --allow-paid --data test_data.jsonl --safety
python scripts/run_batch_evaluation.py --allow-paid --data test_data.jsonl --agent --evaluators intent_resolution
```

## Related Reference Files

- [built-in-evaluators.md](built-in-evaluators.md): Complete built-in evaluator reference
- [custom-evaluators.md](custom-evaluators.md): Code and prompt-based evaluator patterns

## Related Documentation

- [Azure AI Projects Evaluation Samples](https://github.com/Azure/azure-sdk-for-python/tree/main/sdk/ai/azure-ai-projects/samples/evaluations)
- [Cloud Evaluation Documentation](https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/develop/cloud-evaluation)
