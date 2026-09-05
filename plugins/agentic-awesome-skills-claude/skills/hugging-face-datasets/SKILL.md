---
name: hugging-face-datasets
description: Create and manage datasets on Hugging Face Hub. Supports initializing repos, defining configs/system prompts, streaming row updates, and SQL-based dataset querying/transformation. Designed to work alongside HF MCP server for comprehensive dataset workflows.
risk: critical
source: community
date_added: "2026-09-04"
---

# Overview
This skill provides tools to manage datasets on the Hugging Face Hub with a focus on creation, configuration, content management, and SQL-based data manipulation. It is designed to complement the existing Hugging Face MCP server by providing dataset editing and querying capabilities.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use
- You need to create, configure, or update datasets on the Hugging Face Hub.
- You want SQL-style querying, transformation, or export flows over Hub datasets.
- You are managing dataset content and metadata directly rather than only searching existing datasets.

## Python API Usage

```python
from sql_manager import HFDatasetSQL

sql = HFDatasetSQL()

# Query
results = sql.query("cais/mmlu", "SELECT * FROM data WHERE subject='nutrition' LIMIT 10")

# Get schema
schema = sql.describe("cais/mmlu")

# Sample
samples = sql.sample("cais/mmlu", n=5, seed=42)

# Count
count = sql.count("cais/mmlu", where="subject='nutrition'")

# Histogram
dist = sql.histogram("cais/mmlu", "subject")

# Filter and transform
results = sql.filter_and_transform(
    "cais/mmlu",
    select="subject, COUNT(*) as cnt",
    group_by="subject",
    order_by="cnt DESC",
    limit=10
)

# Push to Hub
url = sql.push_to_hub(
    "cais/mmlu",
    "username/nutrition-subset",
    sql="SELECT * FROM data WHERE subject='nutrition'",
    private=True
)

# Export locally
sql.export_to_parquet("cais/mmlu", "output.parquet", sql="SELECT * FROM data LIMIT 100")

sql.close()
```

## Example 1: Create Training Subset from Existing Dataset
```bash
# 1. Explore the source dataset
uv run scripts/sql_manager.py describe --dataset "cais/mmlu"
uv run scripts/sql_manager.py histogram --dataset "cais/mmlu" --column "subject"

# 2. Query and create subset
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --sql "SELECT * FROM data WHERE subject IN ('nutrition', 'anatomy', 'clinical_knowledge')" \
  --push-to "username/mmlu-medical-subset" \
  --private
```

## Example 2: Transform and Reshape Data
```bash
# Transform MMLU to QA format with correct answers extracted
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --sql "SELECT question, choices[answer] as correct_answer, subject FROM data" \
  --push-to "username/mmlu-qa-format"
```

## Example 3: Merge Multiple Dataset Splits
```bash
# Export multiple splits and combine
uv run scripts/sql_manager.py export \
  --dataset "cais/mmlu" \
  --split "*" \
  --output "mmlu_all.parquet"
```

## Example 4: Quality Filtering
```bash
# Filter for high-quality examples
uv run scripts/sql_manager.py query \
  --dataset "squad" \
  --sql "SELECT * FROM data WHERE LENGTH(context) > 500 AND LENGTH(question) > 20" \
  --push-to "username/squad-filtered"
```

## Example 5: Create Custom Training Dataset
```bash
# 1. Query source data
uv run scripts/sql_manager.py export \
  --dataset "cais/mmlu" \
  --sql "SELECT question, subject FROM data WHERE subject='nutrition'" \
  --output "nutrition_source.jsonl" \
  --format jsonl

# 2. Process with your pipeline (add answers, format, etc.)

# 3. Push processed data
uv run scripts/dataset_manager.py init --repo_id "username/nutrition-training"
uv run scripts/dataset_manager.py add_rows \
  --repo_id "username/nutrition-training" \
  --template qa \
  --rows_json "$(cat processed_data.json)"
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
