---
name: llm-council
description: "Run Fireworks-hosted open-weight model councils that compare responses and synthesize a final answer."
allowed-tools: Read, Write, Bash, AskUserQuestion
category: "ai-agents"
risk: "safe"
source: "official"
source_repo: "dair-ai/dair-academy-plugins"
source_type: "official"
date_added: "2026-06-19"
author: "DAIR.AI"
license: "MIT"
license_source: "https://github.com/dair-ai/dair-academy-plugins/blob/main/README.md#license"
tags:
  - dair-academy
  - ai
  - workflow
tools:
  - claude-code
  - codex-cli
  - cursor
---

# LLM Council (Fireworks AI)

## When to Use

Use when this workflow matches the user request: Use this skill for its documented workflow.


_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._

This skill implements Karpathy's LLM Council concept where multiple open-weight LLMs deliberate on a query, powered entirely by Fireworks AI:

1. **Phase 1**: All models respond to the query independently (parallel)
2. **Phase 2**: Models rank each other's anonymized responses
3. **Phase 3**: A Chairman LLM synthesizes the final answer

All inference runs through **Fireworks AI** using open-weight models. The speed and pricing of Fireworks makes it practical to run multi-model deliberation that would be slow or expensive on other providers.

## CRITICAL RULES

1. **ALWAYS use AskUserQuestion** to let the user select council models (multiselect) and the Chairman model
2. **ALWAYS save raw responses to files** - never summarize or truncate API outputs
3. **ALWAYS show full transparency** - display all individual responses, all rankings, AND the final synthesis
4. **NEVER skip the ranking phase** - it is essential to the council deliberation process
5. **Read from files for display** - ensures content is shown unmodified
6. **ALWAYS display the final output to the user** after Phase 3 completes

## Pre-flight Check

Before running any phase, verify the Fireworks API key is set:

```bash
if [ -z "$FIREWORKS_API_KEY" ]; then
  echo "ERROR: FIREWORKS_API_KEY is not set."
  echo "Create a Fireworks AI account at: https://fireworks.ai/"
  echo "Then export it in your shell profile (~/.zshrc or ~/.bashrc):"
  echo '  export FIREWORKS_API_KEY="your_api_key_here"'
  exit 1
fi
echo "FIREWORKS_API_KEY is set."
```

## Available Models

Present these options to the user via AskUserQuestion (multiselect):

| Model | Fireworks ID | Provider |
|-------|-------------|----------|
| GLM 5 | accounts/fireworks/models/glm-5 | Z.ai |
| DeepSeek V3.1 | accounts/fireworks/models/deepseek-v3p1 | DeepSeek |
| DeepSeek V3.2 | accounts/fireworks/models/deepseek-v3p2 | DeepSeek |
| MiniMax M2.1 | accounts/fireworks/models/minimax-m2p1 | MiniMax |
| Kimi K2.5 | accounts/fireworks/models/kimi-k2p5 | Moonshot |
| Qwen3 235B | accounts/fireworks/models/qwen3-235b-a22b | Alibaba |
| Llama 4 Maverick | accounts/fireworks/models/llama4-maverick-instruct-basic | Meta |

## Workflow

### Step 1: Gather User Input

Use AskUserQuestion to get:
1. The query/question for the council (or accept it from the conversation)
2. Which models to include (multiselect, recommend 3-5 models)
3. Which model should be the Chairman (single select)

Note: AskUserQuestion supports max 4 options per question. Since there are 7 models, split model selection across two questions, or show the most popular 4 and let the user type "Other" for the rest. A good default is to show 4 models in the first question and note the others are available via "Other". Rotate which models are shown based on variety.

Example AskUserQuestion for model selection (show 4, mention others):
```
question: "Which models should participate in the LLM Council? (Also available via Other: Llama 4 Maverick, Qwen3 235B, GLM 5)"
header: "Models"
multiSelect: true
options:
  - label: "DeepSeek V3.2"
    description: "DeepSeek's newest and most capable model"
  - label: "MiniMax M2.1"
    description: "MiniMax's strong open-weight model"
  - label: "Kimi K2.5"
    description: "Moonshot's strong open-weight model"
  - label: "DeepSeek V3.1"
    description: "DeepSeek's proven reasoning model"
```

Example AskUserQuestion for chairman:
```
question: "Which model should be the Chairman (synthesizes the final answer)?"
header: "Chairman"
multiSelect: false
options:
  - label: "DeepSeek V3.2 (Recommended)"
    description: "Newest DeepSeek, strong at comprehensive analysis"
  - label: "GLM 5"
    description: "Strong reasoning for synthesis"
  - label: "Kimi K2.5"
    description: "Strong at structured synthesis"
  - label: "MiniMax M2.1"
    description: "Strong open-weight model for synthesis"
```

### Model Name to ID Mapping

Use this mapping to convert user selections to Fireworks model IDs:

```python
MODEL_MAP = {
    "GLM 5": "accounts/fireworks/models/glm-5",
    "DeepSeek V3.1": "accounts/fireworks/models/deepseek-v3p1",
    "DeepSeek V3.2": "accounts/fireworks/models/deepseek-v3p2",
    "MiniMax M2.1": "accounts/fireworks/models/minimax-m2p1",
    "Kimi K2.5": "accounts/fireworks/models/kimi-k2p5",
    "Qwen3 235B": "accounts/fireworks/models/qwen3-235b-a22b",
    "Llama 4 Maverick": "accounts/fireworks/models/llama4-maverick-instruct-basic",
}
```

### Step 2: Run Phase 1 - Individual Responses

After gathering input, run this script to get responses from all selected models in parallel:

```bash
QUERY="USER_QUERY_HERE"
MODELS='["accounts/fireworks/models/glm-5", "accounts/fireworks/models/deepseek-v3p1"]'

python3 << 'PYEOF'
import os
import json
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY")
API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

QUERY = os.environ.get("QUERY", "")
MODELS = json.loads(os.environ.get("MODELS", "[]"))

# Create session directory
timestamp = time.strftime("%Y%m%d-%H%M%S")
SESSION_DIR = f"/tmp/llm-council/{timestamp}"
os.makedirs(SESSION_DIR, exist_ok=True)

# Save config
config = {"query": QUERY, "models": MODELS, "timestamp": timestamp}
with open(f"{SESSION_DIR}/config.json", "w") as f:
    json.dump(config, f, indent=2)

def call_model(model_id, query):
    """Call a single model via Fireworks AI"""
    try:
        start = time.time()
        response = requests.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {FIREWORKS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": "You are participating in an LLM council deliberation. Provide your best, most thoughtful response to the query. Be comprehensive but focused."},
                    {"role": "user", "content": query}
                ],
                "max_tokens": 4000,
                "temperature": 1
            },
            timeout=120
        )
        response.raise_for_status()
        elapsed = time.time() - start
        data = response.json()
        usage = data.get("usage", {})
        return {
            "success": True,
            "content": data["choices"][0]["message"]["content"],
            "model": model_id,
            "latency_seconds": round(elapsed, 2),
            "tokens": {
                "prompt": usage.get("prompt_tokens", 0),
                "completion": usage.get("completion_tokens", 0),
                "total": usage.get("total_tokens", 0)
            }
        }
    except Exception as e:
        return {
            "success": False,
            "content": f"[ERROR: {str(e)}]",
            "model": model_id,
            "latency_seconds": 0,
            "tokens": {"prompt": 0, "completion": 0, "total": 0}
        }

print(f"\n{'='*60}")
print("PHASE 1: Collecting Individual Responses")
print(f"{'='*60}")
print(f"Query: {QUERY[:200]}...")
print(f"Models: {', '.join([m.split('/')[-1] for m in MODELS])}")
print(f"Session: {SESSION_DIR}")
print()

# Parallel execution
results = {}
with ThreadPoolExecutor(max_workers=len(MODELS)) as executor:
    futures = {executor.submit(call_model, m, QUERY): m for m in MODELS}
    for future in as_completed(futures):
        model = futures[future]
        result = future.result()
        results[model] = result
        status = "OK" if result["success"] else "FAILED"
        latency = f"{result['latency_seconds']}s" if result["success"] else "N/A"
        print(f"  [{status}] {model.split('/')[-1]} ({latency})")

# Save raw results
with open(f"{SESSION_DIR}/phase1_responses.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nPhase 1 complete. Results saved to: {SESSION_DIR}/phase1_responses.json")
print(f"SESSION_DIR={SESSION_DIR}")
PYEOF
```

### Step 3: Run Phase 2 - Cross-Model Ranking

Each model reviews and ranks the anonymized responses from Phase 1:

```bash
SESSION_DIR="/tmp/llm-council/TIMESTAMP_HERE"

python3 << 'PYEOF'
import os
import json
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY")
API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
SESSION_DIR = os.environ.get("SESSION_DIR")

# Load Phase 1 results
with open(f"{SESSION_DIR}/config.json") as f:
    config = json.load(f)
with open(f"{SESSION_DIR}/phase1_responses.json") as f:
    phase1_results = json.load(f)

QUERY = config["query"]
MODELS = config["models"]

# Create anonymized mapping
labels = ["A", "B", "C", "D", "E", "F", "G"][:len(MODELS)]
model_to_label = dict(zip(MODELS, labels))
label_to_model = {v: k for k, v in model_to_label.items()}

# Format anonymized responses
anonymized_responses = []
for model_id in MODELS:
    label = model_to_label[model_id]
    content = phase1_results[model_id]["content"]
    anonymized_responses.append(f"=== Response {label} ===\n{content}")

anonymized_text = "\n\n".join(anonymized_responses)

def get_rankings(model_id, query, anonymized, own_label):
    """Get rankings from a single model"""
    ranking_prompt = f"""You are evaluating responses from multiple AI models to this query:

QUERY: {query}

Here are the anonymized responses:

{anonymized}

Please rank these responses from BEST to WORST. For each ranking:
1. State the response letter (A, B, C, etc.)
2. Give a brief reason (1-2 sentences)
3. You may skip ranking your own response (labeled {own_label}) or rank it fairly

Format your response EXACTLY as:
RANKINGS:
1. [Letter] - [Brief reason]
2. [Letter] - [Brief reason]
3. [Letter] - [Brief reason]
..."""

    try:
        start = time.time()
        response = requests.post(
            API_URL,
            headers={
                "Authorization": f"Bearer {FIREWORKS_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "messages": [
                    {"role": "system", "content": f"You are ranking AI responses objectively. Your own response is labeled '{own_label}'."},
                    {"role": "user", "content": ranking_prompt}
                ],
                "max_tokens": 1000,
                "temperature": 1
            },
            timeout=90
        )
        response.raise_for_status()
        elapsed = time.time() - start
        return {
            "success": True,
            "content": response.json()["choices"][0]["message"]["content"],
            "model": model_id,
            "latency_seconds": round(elapsed, 2)
        }
    except Exception as e:
        return {
            "success": False,
            "content": f"[ERROR: {str(e)}]",
            "model": model_id,
            "latency_seconds": 0
        }

print(f"\n{'='*60}")
print("PHASE 2: Cross-Model Ranking")
print(f"{'='*60}")
print(f"Label mapping: {json.dumps({v: k.split('/')[-1] for k, v in model_to_label.items()})}")
print()

# Collect rankings from all models in parallel
rankings = {}
with ThreadPoolExecutor(max_workers=len(MODELS)) as executor:
    futures = {
        executor.submit(get_rankings, mid, QUERY, anonymized_text, model_to_label[mid]): mid
        for mid in MODELS
    }
    for future in as_completed(futures):
        model = futures[future]
        result = future.result()
        rankings[model] = result
        status = "OK" if result["success"] else "FAILED"
        latency = f"{result['latency_seconds']}s" if result["success"] else "N/A"
        print(f"  [{status}] {model.split('/')[-1]} ({latency})")

# Save rankings
output = {
    "label_mapping": label_to_model,
    "model_to_label": model_to_label,
    "rankings": rankings
}
with open(f"{SESSION_DIR}/phase2_rankings.json", "w") as f:
    json.dump(output, f, indent=2)

print(f"\nPhase 2 complete. Rankings saved to: {SESSION_DIR}/phase2_rankings.json")
PYEOF
```

### Step 4: Run Phase 3 - Chairman Synthesis

The Chairman model receives all responses and rankings, then produces the final synthesis:

```bash
SESSION_DIR="/tmp/llm-council/TIMESTAMP_HERE"
CHAIRMAN_MODEL="accounts/fireworks/models/glm-5"

python3 << 'PYEOF'
import os
import json
import requests
import time

FIREWORKS_API_KEY = os.environ.get("FIREWORKS_API_KEY")
API_URL = "https://api.fireworks.ai/inference/v1/chat/completions"
SESSION_DIR = os.environ.get("SESSION_DIR")
CHAIRMAN_MODEL = os.environ.get("CHAIRMAN_MODEL")

# Load all previous results
with open(f"{SESSION_DIR}/config.json") as f:
    config = json.load(f)
with open(f"{SESSION_DIR}/phase1_responses.json") as f:
    phase1 = json.load(f)
with open(f"{SESSION_DIR}/phase2_rankings.json") as f:
    phase2 = json.load(f)

QUERY = config["query"]
label_to_model = phase2["label_mapping"]
model_to_label = phase2["model_to_label"]

# Format responses with model names revealed
responses_text = []
for model_id, result in phase1.items():
    label = model_to_label.get(model_id, "?")
    model_name = model_id.split("/")[-1]
    responses_text.append(f"=== {label}: {model_name} ===\n{result['content']}")

# Format rankings
rankings_text = []
for model_id, result in phase2["rankings"].items():
    model_name = model_id.split("/")[-1]
    rankings_text.append(f"[{model_name}'s Rankings]\n{result['content']}")

synthesis_prompt = f"""You are the Chairman of an LLM Council. Your task is to synthesize the best possible answer from multiple AI responses.

ORIGINAL QUERY:
{QUERY}

INDIVIDUAL RESPONSES:
{chr(10).join(responses_text)}

MODEL RANKINGS:
{chr(10).join(rankings_text)}

As Chairman, produce a FINAL SYNTHESIS that:
1. Incorporates the strongest elements from the best-ranked responses
2. Resolves any contradictions between responses
3. Addresses aspects that multiple models agreed on
4. Corrects any errors identified through cross-ranking
5. Provides the most complete, accurate, and helpful answer

Begin your synthesis:"""

print(f"\n{'='*60}")
print("PHASE 3: Chairman Synthesis")
print(f"{'='*60}")
print(f"Chairman: {CHAIRMAN_MODEL.split('/')[-1]}")
print()

try:
    start = time.time()
    response = requests.post(
        API_URL,
        headers={
            "Authorization": f"Bearer {FIREWORKS_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": CHAIRMAN_MODEL,
            "messages": [
                {"role": "system", "content": "You are the Chairman of an LLM Council. Synthesize multiple AI perspectives into a definitive, comprehensive response."},
                {"role": "user", "content": synthesis_prompt}
            ],
            "max_tokens": 4000,
            "temperature": 1
        },
        timeout=180
    )
    response.raise_for_status()
    elapsed = time.time() - start
    synthesis = response.json()["choices"][0]["message"]["content"]

    with open(f"{SESSION_DIR}/phase3_synthesis.txt", "w") as f:
        f.write(synthesis)

    print(f"Phase 3 complete ({elapsed:.2f}s). Synthesis saved to: {SESSION_DIR}/phase3_synthesis.txt")

except Exception as e:
    print(f"ERROR: {e}")
    synthesis = f"[ERROR: {str(e)}]"
    with open(f"{SESSION_DIR}/phase3_synthesis.txt", "w") as f:
        f.write(synthesis)

# Update config with chairman
config["chairman"] = CHAIRMAN_MODEL
with open(f"{SESSION_DIR}/config.json", "w") as f:
    json.dump(config, f, indent=2)
PYEOF
```

### Step 5: Display Full Results

Read all saved files and display the complete council deliberation:

```bash
SESSION_DIR="/tmp/llm-council/TIMESTAMP_HERE"

python3 << 'PYEOF'
import os
import json

SESSION_DIR = os.environ.get("SESSION_DIR")

# Load all data
with open(f"{SESSION_DIR}/config.json") as f:
    config = json.load(f)
with open(f"{SESSION_DIR}/phase1_responses.json") as f:
    phase1 = json.load(f)
with open(f"{SESSION_DIR}/phase2_rankings.json") as f:
    phase2 = json.load(f)
with open(f"{SESSION_DIR}/phase3_synthesis.txt") as f:
    synthesis = f.read()

model_to_label = phase2["model_to_label"]
label_to_model = phase2["label_mapping"]

# Build formatted output
output = []
output.append("=" * 70)
output.append("                  LLM COUNCIL DELIBERATION")
output.append("                  Powered by Fireworks AI")
output.append("=" * 70)
output.append("")
output.append(f"QUERY: {config['query']}")
output.append(f"COUNCIL: {', '.join([m.split('/')[-1] for m in config['models']])}")
output.append(f"CHAIRMAN: {config.get('chairman', 'N/A').split('/')[-1]}")
output.append("")

# Phase 1: Individual Responses
output.append("-" * 70)
output.append("                 PHASE 1: INDIVIDUAL RESPONSES")
output.append("-" * 70)
output.append("")

for model_id, result in phase1.items():
    model_name = model_id.split("/")[-1]
    label = model_to_label.get(model_id, "?")
    latency = result.get("latency_seconds", "N/A")
    tokens = result.get("tokens", {})
    output.append(f"[{label}] {model_name} (latency: {latency}s, tokens: {tokens.get('total', 'N/A')})")
    output.append("-" * 40)
    output.append(result["content"])
    output.append("")

# Phase 2: Cross-Model Rankings
output.append("-" * 70)
output.append("                 PHASE 2: CROSS-MODEL RANKINGS")
output.append("-" * 70)
output.append("")
output.append(f"Label mapping: {json.dumps({v: k.split('/')[-1] for k, v in model_to_label.items()}, indent=2)}")
output.append("")

for model_id, result in phase2["rankings"].items():
    model_name = model_id.split("/")[-1]
    output.append(f"[{model_name}'s Rankings]")
    output.append(result["content"])
    output.append("")

# Phase 3: Chairman Synthesis
output.append("-" * 70)
output.append("                 PHASE 3: CHAIRMAN'S SYNTHESIS")
output.append("-" * 70)
output.append("")
chairman_name = config.get("chairman", "Chairman").split("/")[-1]
output.append(f"[{chairman_name} - Chairman]")
output.append("")
output.append(synthesis)
output.append("")
output.append("=" * 70)
output.append(f"Session files: {SESSION_DIR}/")

# Save formatted output
final_output = "\n".join(output)
with open(f"{SESSION_DIR}/final_output.md", "w") as f:
    f.write(final_output)

print(final_output)
print(f"\nFull output saved to: {SESSION_DIR}/final_output.md")
PYEOF
```

## Important Notes

1. **Session Directory**: Each run creates a unique session in `/tmp/llm-council/{timestamp}/`
2. **Raw Data Preserved**: All API responses are saved as-is to JSON files for full transparency
3. **Cost**: Fireworks pricing is per-token. More models and longer queries cost more. Check current pricing at https://fireworks.ai/pricing
4. **Latency Tracking**: Each API call tracks latency so you can see Fireworks' speed in action
5. **Token Usage**: Phase 1 responses include token counts for cost awareness
6. **Rate Limits**: If you hit rate limits, wait briefly and retry
7. **Model Availability**: Check https://app.fireworks.ai/ for current model status

## Setup

1. Create a Fireworks AI account at https://fireworks.ai/ and grab your API key from the dashboard
2. Export it in your shell profile:
   ```bash
   export FIREWORKS_API_KEY="your_api_key_here"
   ```
3. Restart your terminal or run `source ~/.zshrc`
4. Invoke this skill when you want multiple open-weight AI perspectives on a question


## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
