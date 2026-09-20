---
name: ai-pipeline-orchestration
description: Orchestrate AI/ML pipelines for data ingestion, model training, batch
  inference, and RAG indexing using Prefect, Airflow, or Dagster.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# AI Pipeline Orchestration

Build reliable, observable AI workflows — from document ingestion to batch inference to model training pipelines.

## When to Use This Skill

Use this skill when:
- Scheduling recurring RAG document ingestion and re-indexing
- Orchestrating multi-step batch LLM processing workflows
- Running nightly model evaluation and fine-tuning jobs
- Building ETL pipelines that feed into AI models
- Managing dependencies between data preparation and model serving

## Tool Selection

| Tool | Best For | Complexity | GPU Jobs |
|------|----------|------------|----------|
| **Prefect** | Modern Python-first; easy to adopt | Low | Good |
| **Airflow** | Complex DAGs; large teams; existing usage | High | Good |
| **Dagster** | Asset-centric; strong data lineage | Medium | Excellent |
| **Temporal** | Long-running workflows; reliability-first | Medium | Good |

## Prefect — Quick Start

```bash
pip install prefect prefect-kubernetes

# Start Prefect server (or use Prefect Cloud)
prefect server start

# In another terminal
prefect worker start --pool default-agent-pool
```

## Prefect: RAG Ingestion Pipeline

```python
from prefect import flow, task, get_run_logger
from prefect.tasks import task_input_hash
from datetime import timedelta
import hashlib

@task(cache_key_fn=task_input_hash, cache_expiration=timedelta(hours=24))
def fetch_documents(source_url: str) -> list[dict]:
    """Fetch documents from source; cached to avoid re-fetching."""
    logger = get_run_logger()
    logger.info(f"Fetching from {source_url}")
    # ... fetch logic
    return documents

@task(retries=3, retry_delay_seconds=30)
def chunk_and_embed(documents: list[dict]) -> list[dict]:
    """Chunk documents and generate embeddings with retry on failure."""
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("BAAI/bge-large-en-v1.5")
    chunks = []
    for doc in documents:
        doc_chunks = chunk_text(doc["content"])
        embeddings = model.encode(doc_chunks, batch_size=64)
        for chunk, emb in zip(doc_chunks, embeddings):
            chunks.append({"text": chunk, "embedding": emb.tolist(),
                           "source": doc["url"], "doc_hash": doc["hash"]})
    return chunks

@task(retries=2)
def upsert_to_vector_store(chunks: list[dict]) -> int:
    """Upsert embeddings to Qdrant, skip unchanged documents."""
    from qdrant_client import QdrantClient
    client = QdrantClient("http://qdrant:6333")
    client.upsert(collection_name="knowledge-base", points=[...])
    return len(chunks)

@flow(name="rag-ingestion", log_prints=True)
def rag_ingestion_pipeline(sources: list[str]):
    """Full RAG ingestion flow — runs daily."""
    logger = get_run_logger()
    total = 0
    for source in sources:
        docs = fetch_documents(source)
        chunks = chunk_and_embed(docs)
        count = upsert_to_vector_store(chunks)
        total += count
        logger.info(f"Ingested {count} chunks from {source}")
    logger.info(f"Pipeline complete: {total} total chunks indexed")

if __name__ == "__main__":
    rag_ingestion_pipeline.serve(
        name="daily-rag-ingestion",
        cron="0 2 * * *",          # 2 AM daily
        parameters={"sources": ["https://docs.myapp.com", "https://api.myapp.com/kb"]},
    )
```

## Prefect: Batch LLM Inference Pipeline

```python
from prefect import flow, task
from prefect.concurrency.sync import concurrency
import asyncio
from openai import AsyncOpenAI

@task(retries=3, retry_delay_seconds=60)
async def process_batch(items: list[dict], model: str = "gpt-4o-mini") -> list[dict]:
    """Process a batch of items through LLM with rate limit protection."""
    client = AsyncOpenAI()
    async with concurrency("openai-api", occupy=len(items)):  # rate limit
        tasks = [
            client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": item["prompt"]}],
                max_tokens=256,
            )
            for item in items
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for item, response in zip(items, responses):
        if isinstance(response, Exception):
            results.append({**item, "error": str(response), "output": None})
        else:
            results.append({**item, "output": response.choices[0].message.content})
    return results

@flow(name="batch-llm-inference")
async def batch_inference_flow(input_file: str, output_file: str, batch_size: int = 50):
    import json
    items = [json.loads(line) for line in open(input_file)]
    batches = [items[i:i+batch_size] for i in range(0, len(items), batch_size)]

    all_results = []
    for batch in batches:
        results = await process_batch(batch)
        all_results.extend(results)

    with open(output_file, "w") as f:
        for result in all_results:
            f.write(json.dumps(result) + "\n")
    return len(all_results)
```

## Airflow: Model Training DAG

```python
from airflow.decorators import dag, task
from airflow.providers.cncf.kubernetes.operators.pod import KubernetesPodOperator
from datetime import datetime
from kubernetes.client import models as k8s

@dag(
    dag_id="llm_fine_tuning",
    schedule="@weekly",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["ai", "training"],
)
def llm_fine_tuning_dag():

    @task
    def prepare_dataset() -> str:
        """Download and preprocess training data."""
        # ... data prep logic
        return "s3://my-bucket/training-data/2025-03-01/"

    train = KubernetesPodOperator(
        task_id="train_model",
        name="llm-training-job",
        namespace="ml",
        image="nvcr.io/nvidia/pytorch:24.05-py3",
        cmds=["accelerate", "launch", "-m", "axolotl.cli.train", "/config/config.yaml"],
        resources=k8s.V1ResourceRequirements(
            limits={"nvidia.com/gpu": "4", "memory": "320Gi"},
            requests={"nvidia.com/gpu": "4"},
        ),
        node_selector={"nvidia.com/gpu.product": "A100-SXM4-80GB"},
        volumes=[...],
        volume_mounts=[...],
        get_logs=True,
        is_delete_operator_pod=True,
    )

    @task
    def evaluate_model(dataset_path: str) -> dict:
        """Run evals; fail pipeline if quality drops."""
        metrics = run_evals()
        if metrics["accuracy"] < 0.85:
            raise ValueError(f"Model quality too low: {metrics}")
        return metrics

    @task
    def deploy_model(metrics: dict):
        """Push merged model to HF Hub and update vLLM config."""
        update_serving_config(new_model="org/fine-tuned-v2")

    dataset = prepare_dataset()
    train.set_upstream(dataset)
    eval_result = evaluate_model(dataset)
    eval_result.set_upstream(train)
    deploy_model(eval_result)

llm_fine_tuning_dag()
```

## Dagster: Asset-Based AI Pipeline

```python
from dagster import asset, AssetExecutionContext, define_asset_job, ScheduleDefinition

@asset(description="Raw documents fetched from knowledge sources")
def raw_documents(context: AssetExecutionContext) -> list[dict]:
    context.log.info("Fetching documents...")
    return fetch_all_documents()

@asset(
    deps=[raw_documents],
    description="Chunked and embedded document vectors",
)
def document_embeddings(context: AssetExecutionContext, raw_documents) -> int:
    chunks = process_and_embed(raw_documents)
    context.log.info(f"Generated {len(chunks)} embeddings")
    upsert_to_qdrant(chunks)
    return len(chunks)

@asset(
    deps=[document_embeddings],
    description="RAG system quality metrics",
)
def rag_quality_metrics(context: AssetExecutionContext) -> dict:
    metrics = evaluate_rag_system()
    context.add_output_metadata({"ragas_score": metrics["ragas_score"]})
    return metrics

# Schedule: refresh embeddings nightly
nightly_refresh = ScheduleDefinition(
    job=define_asset_job("rag_refresh_job", [raw_documents, document_embeddings]),
    cron_schedule="0 1 * * *",
)
```

## Best Practices

- Use task-level retries for API calls; use flow-level retries for transient infra failures.
- Cache expensive steps (embedding generation, data fetching) to speed up reruns.
- Emit custom metrics from pipelines (chunk count, error rate, cost) to your observability stack.
- Use `concurrency` limits in Prefect or `pool` slots in Airflow to respect external rate limits.
- Separate ingestion, training, and deployment pipelines — don't couple them in one giant DAG.

## Related Skills

- rag-infrastructure (`rag-infrastructure`) - RAG system setup
- llm-fine-tuning (`llm-fine-tuning`) - Training jobs
- agent-observability (`agent-observability`) - Pipeline monitoring
- kubernetes-ops (`kubernetes-ops`) - Running pipeline pods on K8s

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
