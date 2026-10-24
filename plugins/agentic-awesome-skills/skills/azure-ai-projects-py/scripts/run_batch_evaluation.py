#!/usr/bin/env python3
"""
Batch Evaluation CLI Tool

Run batch evaluations on test datasets using Azure AI Projects SDK.
Supports quality, safety, agent evaluators, and OpenAI graders.

Usage:
    python run_batch_evaluation.py --data test_data.jsonl --evaluators coherence relevance
    python run_batch_evaluation.py --data test_data.jsonl --evaluators coherence --output results.json
    python run_batch_evaluation.py --data test_data.jsonl --safety
    python run_batch_evaluation.py --data test_data.jsonl --agent --evaluators intent_resolution task_adherence

Environment Variables:
    AZURE_AI_PROJECT_ENDPOINT     - Azure AI project endpoint (required)
    AZURE_AI_MODEL_DEPLOYMENT_NAME - Explicit authorized model deployment name (no default)
"""

import argparse
import json
import os
import sys
import time
import math
import re
import stat
from urllib.parse import urlsplit
from copy import deepcopy
from pathlib import Path
from typing import Any

# Built-in evaluators by category
QUALITY_EVALUATORS = [
    "coherence",
    "relevance",
    "fluency",
    "groundedness",
]
SAFETY_EVALUATORS = [
    "violence",
    "sexual",
    "self_harm",
    "hate_unfairness",
]
AGENT_EVALUATORS = [
    "intent_resolution",
    "response_completeness",
    "task_adherence",
    "tool_call_accuracy",
]
NLP_EVALUATORS = ["f1", "rouge", "bleu", "gleu", "meteor"]


def load_jsonl(path: str, max_rows: int = 1000, max_bytes: int = 10 * 1024 * 1024) -> list[dict]:
    """Validate a bounded regular JSONL input before creating any remote resource."""
    if max_rows <= 0 or max_bytes <= 0:
        raise ValueError("Input limits must be positive")
    flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_NONBLOCK", 0)
    fd = os.open(path, flags)
    with os.fdopen(fd, "rb") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > max_bytes:
            raise ValueError("Input must be a regular file within the byte limit")
        raw = handle.read(max_bytes + 1)
    if len(raw) > max_bytes:
        raise ValueError("Input exceeds byte limit")
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("Duplicate JSON key")
            result[key] = value
        return result
    def invalid_constant(value):
        raise ValueError("Non-finite JSON constant")
    data = []
    for line_number, line in enumerate(raw.decode("utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            item = json.loads(line, object_pairs_hook=pairs, parse_constant=invalid_constant)
        except (ValueError, RecursionError):
            raise ValueError(f"Invalid JSON on line {line_number}; content omitted") from None
        if not isinstance(item, dict) or not item:
            raise ValueError(f"Expected a non-empty object on line {line_number}")
        data.append(item)
        if len(data) > max_rows:
            raise ValueError("Input exceeds row limit")
    if not data:
        raise ValueError("Dataset is empty")
    return data


def validate_endpoint(endpoint: str):
    url = urlsplit(endpoint)
    if (url.scheme != "https" or not url.hostname or
        not url.hostname.endswith(".services.ai.azure.com") or url.username or
        url.password or url.port not in (None, 443) or url.query or url.fragment or
        not re.fullmatch(r"/api/projects/[A-Za-z0-9_.-]+/?", url.path)):
        raise ValueError("Expected the authorized Azure AI project HTTPS endpoint")


def build_data_source(
    data: list[dict],
    is_agent: bool = False,
) -> dict:
    """Build data source from loaded data."""
    content = []
    for original in data:
        item = deepcopy(original)
        if is_agent:
            # Agent data: extract sample fields from item
            sample = {
                "output_text": item.pop("output_text", item.get("response", "")),
            }
            if "output_items" in item:
                sample["output_items"] = item.pop("output_items")
            content.append(dict(item=item, sample=sample))
        else:
            content.append(dict(item=item, sample={}))

    return dict(
        type="jsonl",
        source=dict(type="file_content", content=content),
    )


def build_data_source_config(
    data: list[dict],
    is_agent: bool = False,
) -> dict:
    """Build data source config based on data schema."""
    source = build_data_source(data, is_agent=is_agent)
    items = [row["item"] for row in source["source"]["content"]]
    def schema(value, depth=0):
        if depth > 20:
            raise ValueError("Input nesting exceeds supported depth")
        if value is None: return {"type": "null"}
        if isinstance(value, bool): return {"type": "boolean"}
        if isinstance(value, int): return {"type": "integer"}
        if isinstance(value, float):
            if not math.isfinite(value): raise ValueError("Non-finite input")
            return {"type": "number"}
        if isinstance(value, str): return {"type": "string"}
        if isinstance(value, list):
            choices = []
            for item in value:
                option = schema(item, depth + 1)
                if option not in choices: choices.append(option)
            return {"type": "array", "items": {"anyOf": choices} if choices else {}}
        if isinstance(value, dict):
            return {"type": "object", "properties": {k: schema(v, depth + 1) for k, v in value.items()},
                    "required": sorted(value), "additionalProperties": False}
        raise ValueError("Unsupported input type")
    if not items: raise ValueError("Data is empty")
    item_schema = schema(items[0])
    for item in items[1:]:
        if schema(item) != item_schema:
            raise ValueError("All rows must share one consistent item schema; normalize explicitly")
    return dict(type="custom", item_schema=item_schema, include_sample_schema=is_agent)


def build_testing_criteria(
    evaluator_names: list[str],
    deployment_name: str,
    is_agent: bool = False,
) -> list[dict]:
    """Build testing criteria for the specified evaluators."""
    criteria = []

    for name in evaluator_names:
        # Determine data mapping based on evaluator type
        if name in QUALITY_EVALUATORS:
            if name in {"groundedness", "relevance"}:
                data_mapping = {
                    "query": "{{item.query}}",
                    "context": "{{item.context}}",
                    "response": "{{item.response}}",
                }
            else:
                data_mapping = {
                    "query": "{{item.query}}",
                    "response": "{{item.response}}",
                }
            needs_model = True

        elif name in SAFETY_EVALUATORS:
            data_mapping = {
                "query": "{{item.query}}",
                "response": "{{item.response}}",
            }
            needs_model = False  # Safety evaluators may not need deployment

        elif name in AGENT_EVALUATORS:
            if is_agent:
                if name == "tool_call_accuracy":
                    data_mapping = {
                        "query": "{{item.query}}",
                        "response": "{{sample.output_items}}",
                    }
                else:
                    data_mapping = {
                        "query": "{{item.query}}",
                        "response": "{{sample.output_text}}",
                    }
            else:
                data_mapping = {
                    "query": "{{item.query}}",
                    "response": "{{item.response}}",
                }
            needs_model = True

        elif name in NLP_EVALUATORS:
            data_mapping = {
                "response": "{{item.response}}",
                "ground_truth": "{{item.ground_truth}}",
            }
            needs_model = False

        else:
            raise ValueError("Unknown evaluator; no remote evaluation created")

        if is_agent and name not in NLP_EVALUATORS:
            data_mapping["response"] = "{{sample.output_items}}" if name in {"task_adherence", "tool_call_accuracy"} else "{{sample.output_text}}"

        criterion = {
            "type": "azure_ai_evaluator",
            "name": name,
            "evaluator_name": "builtin." + ({"f1": "f1_score", "bleu": "bleu_score", "rouge": "rouge_score", "gleu": "gleu_score", "meteor": "meteor_score"}.get(name, name)),
            "data_mapping": data_mapping,
        }

        if needs_model:
            criterion["initialization_parameters"] = {"deployment_name": deployment_name}

        criteria.append(criterion)

    return criteria


def run_evaluation(
    endpoint: str,
    data_path: str,
    evaluator_names: list[str],
    deployment_name: str,
    is_agent: bool = False,
    *, allow_paid: bool = False, timeout_seconds: int = 600, max_rows: int = 1000, max_bytes: int = 10485760,
) -> dict[str, Any]:
    """Run batch evaluation using Azure AI Projects SDK."""
    if not allow_paid:
        raise PermissionError("Remote upload and paid evaluation require --allow-paid")
    if timeout_seconds <= 0:
        raise ValueError("Timeout must be positive")
    validate_endpoint(endpoint)
    # Load and validate the whole selected dataset before remote work.
    data = load_jsonl(data_path, max_rows=max_rows, max_bytes=max_bytes)
    print(f"Loaded {len(data)} items from {data_path}")

    # Build data source and config
    data_source = build_data_source(data, is_agent=is_agent)
    data_source_config = build_data_source_config(data, is_agent=is_agent)

    # Build testing criteria
    testing_criteria = build_testing_criteria(
        evaluator_names,
        deployment_name,
        is_agent=is_agent,
    )

    if not testing_criteria:
        raise ValueError("No valid testing criteria configured")

    print(f"Configured {len(testing_criteria)} evaluators")

    # Validate mappings before uploading. Schema discovery is still required for the installed service version.
    for row in data_source["source"]["content"]:
        for criterion in testing_criteria:
            for mapping in criterion["data_mapping"].values():
                namespace, field = mapping.strip("{}").split(".", 1)
                if field not in row[namespace]:
                    raise ValueError("Dataset lacks an evaluator input; no remote resources created")
    if any("initialization_parameters" in c for c in testing_criteria) and not deployment_name:
        raise ValueError("An explicit model deployment is required")
    if os.environ.get("AZURE_AI_PROJECTS_CONSOLE_LOGGING", "false").lower() == "true":
        raise ValueError("Disable verbose SDK logging before uploading sensitive evaluation data")
    from azure.ai.projects import AIProjectClient
    from azure.identity import DefaultAzureCredential

    # Create client and run evaluation
    with (
        DefaultAzureCredential() as credential,
        AIProjectClient(endpoint=endpoint, credential=credential) as project_client,
        project_client.get_openai_client(timeout=60, max_retries=0) as openai_client,
    ):
        # Disable automatic request retries: a timed-out creation has an unknown outcome.

        # Create evaluation definition
        eval_object = openai_client.evals.create(
            name=f"Batch Evaluation - {Path(data_path).stem}",
            data_source_config=data_source_config,
            testing_criteria=testing_criteria,
        )
        print(f"Created evaluation: {eval_object.id}")

        # Create and run evaluation
        run = openai_client.evals.runs.create(
            eval_id=eval_object.id,
            name="CLI Run",
            data_source=data_source,
        )
        print(f"Started run: {run.id}")

        # Poll for completion
        deadline = time.monotonic() + timeout_seconds
        while run.status not in ["completed", "failed", "cancelled", "canceled", "expired"]:
            if time.monotonic() >= deadline:
                raise TimeoutError(f"Polling deadline reached; run {run.id} may still be active. Inspect/cancel it explicitly; do not recreate.")
            print(f"Status: {run.status}...")
            time.sleep(5)
            run = openai_client.evals.runs.retrieve(
                eval_id=eval_object.id,
                run_id=run.id,
            )

        if run.status != "completed":
            raise RuntimeError("Evaluation failed; inspect the protected run in Azure")

        print(f"Run completed: {run.status}")

        # Retrieve results
        output_items = list(
            openai_client.evals.runs.output_items.list(
                eval_id=eval_object.id,
                run_id=run.id,
            )
        )

        # Aggregate metrics
        metrics: dict[str, list[float]] = {}
        rows = []

        for output_item in output_items:
            row_results = {}
            for result in output_item.results:
                if isinstance(result.score, (int, float)) and not isinstance(result.score, bool) and math.isfinite(result.score):
                    if result.name not in metrics:
                        metrics[result.name] = []
                    metrics[result.name].append(result.score)
                    row_results[result.name] = result.score
            rows.append(row_results)

        # Calculate averages
        avg_metrics = {}
        for name, scores in metrics.items():
            avg_metrics[name] = sum(scores) / len(scores) if scores else 0.0

        return {
            "eval_id": eval_object.id,
            "run_id": run.id,
            "status": run.status,
            "metrics": avg_metrics,
            "rows": rows,
            "total_items": len(output_items),
            "input_items": len(data),
            "scored_counts": {name: len(values) for name, values in metrics.items()},
            "complete_row_count": len(output_items) == len(data),
        }


def main():
    parser = argparse.ArgumentParser(
        description="Run batch evaluation on test datasets using Azure AI Projects SDK",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument("--data", "-d", required=True, help="Path to JSONL data file")
    parser.add_argument(
        "--evaluators",
        "-e",
        nargs="+",
        default=["coherence", "relevance"],
        help=f"Evaluators to run. Quality: {QUALITY_EVALUATORS}, "
        f"Safety: {SAFETY_EVALUATORS}, Agent: {AGENT_EVALUATORS}, NLP: {NLP_EVALUATORS}",
    )
    parser.add_argument(
        "--safety",
        action="store_true",
        help="Include all safety evaluators",
    )
    parser.add_argument(
        "--agent",
        action="store_true",
        help="Include all agent evaluators (uses sample.output_text for response)",
    )
    parser.add_argument(
        "--output",
        "-o",
        help="Output file for results (JSON)",
    )
    parser.add_argument(
        "--deployment",
        default=None,
        help="Model deployment name (overrides AZURE_AI_MODEL_DEPLOYMENT_NAME)",
    )

    parser.add_argument("--allow-paid", action="store_true", help="Authorize upload of this exact file and cloud/model charges")
    parser.add_argument("--timeout-seconds", type=int, default=600)
    parser.add_argument("--max-rows", type=int, default=1000)
    parser.add_argument("--max-bytes", type=int, default=10485760)
    args = parser.parse_args()
    if not args.allow_paid:
        parser.error("Review data/endpoint/deployment/evaluators/cost, then use --allow-paid for remote execution")

    # Validate environment
    endpoint = os.environ.get("AZURE_AI_PROJECT_ENDPOINT")
    if not endpoint:
        print("Error: AZURE_AI_PROJECT_ENDPOINT environment variable required")
        sys.exit(1)

    deployment = args.deployment or os.environ.get("AZURE_AI_MODEL_DEPLOYMENT_NAME")

    # Validate data file
    data_path = Path(args.data)
    if not data_path.exists():
        print(f"Error: Data file not found: {args.data}")
        sys.exit(1)

    # Build evaluator list
    evaluator_names = list(args.evaluators)
    if args.safety:
        evaluator_names.extend(SAFETY_EVALUATORS)
    if args.agent:
        evaluator_names.extend(AGENT_EVALUATORS)

    # Remove duplicates while preserving order
    seen = set()
    unique_evaluators = []
    for e in evaluator_names:
        if e not in seen:
            seen.add(e)
            unique_evaluators.append(e)
    evaluator_names = unique_evaluators

    print(f"Running evaluation with: {evaluator_names}")
    print(f"Data file: {args.data}")
    print(f"Deployment: {deployment}")
    print(f"Agent mode: {args.agent}")

    # Fail before paid work when the requested result path cannot be safely created.
    if args.output:
        output_candidate = Path(args.output)
        if output_candidate.exists() or output_candidate.is_symlink():
            parser.error("Output must be a new file")
        if not output_candidate.parent.is_dir() or any(parent.is_symlink() for parent in output_candidate.parents):
            parser.error("Output parent must exist and not be symlinked")

    # Run evaluation
    try:
        result = run_evaluation(
            endpoint=endpoint,
            data_path=str(data_path),
            evaluator_names=evaluator_names,
            deployment_name=deployment,
            is_agent=args.agent,
            allow_paid=args.allow_paid, timeout_seconds=args.timeout_seconds,
            max_rows=args.max_rows, max_bytes=args.max_bytes,
        )
    except Exception:
        print("Evaluation did not complete. Inspect any printed remote run ID; details omitted to protect dataset and credentials.")
        sys.exit(1)

    # Output results
    print("\n=== Evaluation Results ===")
    print(f"Eval ID: {result['eval_id']}")
    print(f"Run ID: {result['run_id']}")
    print(f"Status: {result['status']}")
    print(f"Total Items: {result['total_items']}")
    print("\nMetrics:")
    for metric, value in sorted(result["metrics"].items()):
        print(f"  {metric}: {value:.4f}")

    # Save to file if requested
    if args.output:
        output_path = Path(args.output)
        if output_path.is_symlink() or any(parent.is_symlink() for parent in output_path.parents):
            raise OSError("Refusing symlinked output path")
        fd = os.open(output_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, allow_nan=False)
        print(f"\nResults saved to: {args.output}")

    print("\nEvaluation complete!")


if __name__ == "__main__":
    main()
