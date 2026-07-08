---
name: hugging-face-datasets
description: Create and manage datasets on Hugging Face Hub. Supports initializing repos, defining configs/system prompts, streaming row updates, and SQL-based dataset querying/transformation. Designed to work alongside HF MCP server for comprehensive dataset workflows.
risk: unknown
source: community
---

# Overview
This skill provides tools to manage datasets on the Hugging Face Hub with a focus on creation, configuration, content management, and SQL-based data manipulation. It is designed to complement the existing Hugging Face MCP server by providing dataset editing and querying capabilities.

## When to Use
- You need to create, configure, or update datasets on the Hugging Face Hub.
- You want SQL-style querying, transformation, or export flows over Hub datasets.
- You are managing dataset content and metadata directly rather than only searching existing datasets.

## Integration with HF MCP Server
- **Use HF MCP Server for**: Dataset discovery, search, and metadata retrieval
- **Use This Skill for**: Dataset creation, content editing, SQL queries, data transformation, and structured data formatting

# Version
2.1.0

# Dependencies
# This skill uses PEP 723 scripts with inline dependency management
# Scripts auto-install requirements when run with: uv run scripts/script_name.py

- uv (Python package manager)
- Getting Started: See "Usage Instructions" below for PEP 723 usage

# Core Capabilities

## 1. Dataset Lifecycle Management
- **Initialize**: Create new dataset repositories with proper structure
- **Configure**: Store detailed configuration including system prompts and metadata
- **Stream Updates**: Add rows efficiently without downloading entire datasets

## 2. SQL-Based Dataset Querying (NEW)
Query any Hugging Face dataset using DuckDB SQL via `scripts/sql_manager.py`:
- **Direct Queries**: Run SQL on datasets using the `hf://` protocol
- **Schema Discovery**: Describe dataset structure and column types
- **Data Sampling**: Get random samples for exploration
- **Aggregations**: Count, histogram, unique values analysis
- **Transformations**: Filter, join, reshape data with SQL
- **Export & Push**: Save results locally or push to new Hub repos

## 3. Multi-Format Dataset Support
Supports diverse dataset types through template system:
- **Chat/Conversational**: Chat templating, multi-turn dialogues, tool usage examples
- **Text Classification**: Sentiment analysis, intent detection, topic classification
- **Question-Answering**: Reading comprehension, factual QA, knowledge bases
- **Text Completion**: Language modeling, code completion, creative writing
- **Tabular Data**: Structured data for regression/classification tasks
- **Custom Formats**: Flexible schema definition for specialized needs

## 4. Quality Assurance Features
- **JSON Validation**: Ensures data integrity during uploads
- **Batch Processing**: Efficient handling of large datasets
- **Error Recovery**: Graceful handling of upload failures and conflicts

# Usage Instructions

The skill includes two Python scripts that use PEP 723 inline dependency management:

> **All paths are relative to the directory containing this SKILL.md
file.**
> Scripts are run with: `uv run scripts/script_name.py [arguments]`

- `scripts/dataset_manager.py` - Dataset creation and management
- `scripts/sql_manager.py` - SQL-based dataset querying and transformation

### Prerequisites
- `uv` package manager installed
- `HF_TOKEN` environment variable must be set with a Write-access token

---

# SQL Dataset Querying (sql_manager.py)

Query, transform, and push Hugging Face datasets using DuckDB SQL. The `hf://` protocol provides direct access to any public dataset (or private with token).

## Quick Start

```bash
# Query a dataset
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --sql "SELECT * FROM data WHERE subject='nutrition' LIMIT 10"

# Get dataset schema
uv run scripts/sql_manager.py describe --dataset "cais/mmlu"

# Sample random rows
uv run scripts/sql_manager.py sample --dataset "cais/mmlu" --n 5

# Count rows with filter
uv run scripts/sql_manager.py count --dataset "cais/mmlu" --where "subject='nutrition'"
```

## SQL Query Syntax

Use `data` as the table name in your SQL - it gets replaced with the actual `hf://` path:

```sql
-- Basic select
SELECT * FROM data LIMIT 10

-- Filtering
SELECT * FROM data WHERE subject='nutrition'

-- Aggregations
SELECT subject, COUNT(*) as cnt FROM data GROUP BY subject ORDER BY cnt DESC

-- Column selection and transformation
SELECT question, choices[answer] AS correct_answer FROM data

-- Regex matching
SELECT * FROM data WHERE regexp_matches(question, 'nutrition|diet')

-- String functions
SELECT regexp_replace(question, '\n', '') AS cleaned FROM data
```

## Common Operations

### 1. Explore Dataset Structure
```bash
# Get schema
uv run scripts/sql_manager.py describe --dataset "cais/mmlu"

# Get unique values in column
uv run scripts/sql_manager.py unique --dataset "cais/mmlu" --column "subject"

# Get value distribution
uv run scripts/sql_manager.py histogram --dataset "cais/mmlu" --column "subject" --bins 20
```

### 2. Filter and Transform
```bash
# Complex filtering with SQL
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --sql "SELECT subject, COUNT(*) as cnt FROM data GROUP BY subject HAVING cnt > 100"

# Using transform command
uv run scripts/sql_manager.py transform \
  --dataset "cais/mmlu" \
  --select "subject, COUNT(*) as cnt" \
  --group-by "subject" \
  --order-by "cnt DESC" \
  --limit 10
```

### 3. Create Subsets and Push to Hub
```bash
# Query and push to new dataset
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --sql "SELECT * FROM data WHERE subject='nutrition'" \
  --push-to "username/mmlu-nutrition-subset" \
  --private

# Transform and push
uv run scripts/sql_manager.py transform \
  --dataset "ibm/duorc" \
  --config "ParaphraseRC" \
  --select "question, answers" \
  --where "LENGTH(question) > 50" \
  --push-to "username/duorc-long-questions"
```

### 4. Export to Local Files
```bash
# Export to Parquet
uv run scripts/sql_manager.py export \
  --dataset "cais/mmlu" \
  --sql "SELECT * FROM data WHERE subject='nutrition'" \
  --output "nutrition.parquet" \
  --format parquet

# Export to JSONL
uv run scripts/sql_manager.py export \
  --dataset "cais/mmlu" \
  --sql "SELECT * FROM data LIMIT 100" \
  --output "sample.jsonl" \
  --format jsonl
```

### 5. Working with Dataset Configs/Splits
```bash
# Specify config (subset)
uv run scripts/sql_manager.py query \
  --dataset "ibm/duorc" \
  --config "ParaphraseRC" \
  --sql "SELECT * FROM data LIMIT 5"

# Specify split
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --split "test" \
  --sql "SELECT COUNT(*) FROM data"

# Query all splits
uv run scripts/sql_manager.py query \
  --dataset "cais/mmlu" \
  --split "*" \
  --sql "SELECT * FROM data LIMIT 10"
```

### 6. Raw SQL with Full Paths
For complex queries or joining datasets:
```bash
uv run scripts/sql_manager.py raw --sql "
  SELECT a.*, b.* 
  FROM 'hf://datasets/dataset1@~parquet/default/train/*.parquet' a
  JOIN 'hf://datasets/dataset2@~parquet/default/train/*.parquet' b
  ON a.id = b.id
  LIMIT 100
"
```

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

## HF Path Format

DuckDB uses the `hf://` protocol to access datasets:
```
hf://datasets/{dataset_id}@{revision}/{config}/{split}/*.parquet
```

Examples:
- `hf://datasets/cais/mmlu@~parquet/default/train/*.parquet`
- `hf://datasets/ibm/duorc@~parquet/ParaphraseRC/test/*.parquet`

The `@~parquet` revision provides auto-converted Parquet files for any dataset format.

## Useful DuckDB SQL Functions

```sql
-- String functions
LENGTH(column)                    -- String length
regexp_replace(col, '\n', '')     -- Regex replace
regexp_matches(col, 'pattern')    -- Regex match
LOWER(col), UPPER(col)           -- Case conversion

-- Array functions  
choices[0]                        -- Array indexing (0-based)
array_length(choices)             -- Array length
unnest(choices)                   -- Expand array to rows

-- Aggregations
COUNT(*), SUM(col), AVG(col)
GROUP BY col HAVING condition

-- Sampling
USING SAMPLE 10                   -- Random sample
USING SAMPLE 10 (RESERVOIR, 42)   -- Reproducible sample

-- Window functions
ROW_NUMBER() OVER (PARTITION BY col ORDER BY col2)
```

---

# Dataset Creation (dataset_manager.py)

### Recommended Workflow

**1. Discovery (Use HF MCP Server):**
```python
# Use HF MCP tools to find existing datasets
search_datasets("conversational AI training")
get_dataset_details("username/dataset-name")
```

**2. Creation (Use This Skill):**
```bash
# Initialize new dataset
uv run scripts/dataset_manager.py init --repo_id "your-username/dataset-name" [--private]

# Configure with detailed system prompt
uv run scripts/dataset_manager.py config --repo_id "your-username/dataset-name" --system_prompt "$(cat system_prompt.txt)"
```

**3. Content Management (Use This Skill):**
```bash
# Quick setup with any template
uv run scripts/dataset_manager.py quick_setup \
  --repo_id "your-username/dataset-name" \
  --template classification

# Add data with template validation
uv run scripts/dataset_manager.py add_rows \
  --repo_id "your-username/dataset-name" \
  --template qa \
  --rows_json "$(cat your_qa_data.json)"
```

### Template-Based Data Structures

**1. Chat Template (`--template chat`)**
```json
{
  "messages": [
    {"role": "user", "content": "Natural user request"},
    {"role": "assistant", "content": "Response with tool usage"},
    {"role": "tool", "content": "Tool response", "tool_call_id": "call_123"}
  ],
  "scenario": "Description of use case",
  "complexity": "simple|intermediate|advanced"
}
```

**2. Classification Template (`--template classification`)**
```json
{
  "text": "Input text to be classified",
  "label": "classification_label",
  "confidence": 0.95,
  "metadata": {"domain": "technology", "language": "en"}
}
```

**3. QA Template (`--template qa`)**
```json
{
  "question": "What is the question being asked?",
  "answer": "The complete answer",
  "context": "Additional context if needed",
  "answer_type": "factual|explanatory|opinion",
  "difficulty": "easy|medium|hard"
}
```

**4. Completion Template (`--template completion`)**
```json
{
  "prompt": "The beginning text or context",
  "completion": "The expected continuation",
  "domain": "code|creative|technical|conversational",
  "style": "description of writing style"
}
```

**5. Tabular Template (`--template tabular`)**
```json
{
  "columns": [
    {"name": "feature1", "type": "numeric", "description": "First feature"},
    {"name": "target", "type": "categorical", "description": "Target variable"}
  ],
  "data": [
    {"feature1": 123, "target": "class_a"},
    {"feature1": 456, "target": "class_b"}
  ]
}
```

### Advanced System Prompt Template

For high-quality training data generation:
```text
You are an AI assistant expert at using MCP tools effectively.

## MCP SERVER DEFINITIONS
[Define available servers and tools]

## TRAINING EXAMPLE STRUCTURE
[Specify exact JSON schema for chat templating]

## QUALITY GUIDELINES
[Detail requirements for realistic scenarios, progressive complexity, proper tool usage]

## EXAMPLE CATEGORIES
[List development workflows, debugging scenarios, data management tasks]
```

### Example Categories & Templates

The skill includes diverse training examples beyond just MCP usage:

**Available Example Sets:**
- `training_examples.json` - MCP tool usage examples (debugging, project setup, database analysis)
- `diverse_training_examples.json` - Broader scenarios including:
  - **Educational Chat** - Explaining programming concepts, tutorials
  - **Git Workflows** - Feature branches, version control guidance
  - **Code Analysis** - Performance optimization, architecture review
  - **Content Generation** - Professional writing, creative brainstorming
  - **Codebase Navigation** - Legacy code exploration, systematic analysis
  - **Conversational Support** - Problem-solving, technical discussions

**Using Different Example Sets:**
```bash
# Add MCP-focused examples
uv run scripts/dataset_manager.py add_rows --repo_id "your-username/dataset-name" \
  --rows_json "$(cat examples/training_examples.json)"

# Add diverse conversational examples
uv run scripts/dataset_manager.py add_rows --repo_id "your-username/dataset-name" \
  --rows_json "$(cat examples/diverse_training_examples.json)"

# Mix both for comprehensive training data
uv run scripts/dataset_manager.py add_rows --repo_id "your-username/dataset-name" \
  --rows_json "$(jq -s '.[0] + .[1]' examples/training_examples.json examples/diverse_training_examples.json)"
```

### Commands Reference

**List Available Templates:**
```bash
uv run scripts/dataset_manager.py list_templates
```

**Quick Setup (Recommended):**
```bash
uv run scripts/dataset_manager.py quick_setup --repo_id "your-username/dataset-name" --template classification
```

**Manual Setup:**
```bash
# Initialize repository
uv run scripts/dataset_manager.py init --repo_id "your-username/dataset-name" [--private]

# Configure with system prompt
uv run scripts/dataset_manager.py config --repo_id "your-username/dataset-name" --system_prompt "Your prompt here"

# Add data with validation
uv run scripts/dataset_manager.py add_rows \
  --repo_id "your-username/dataset-name" \
  --template qa \
  --rows_json '[{"question": "What is AI?", "answer": "Artificial Intelligence..."}]'
```

**View Dataset Statistics:**
```bash
uv run scripts/dataset_manager.py stats --repo_id "your-username/dataset-name"
```

### Error Handling
- **Repository exists**: Script will notify and continue with configuration
- **Invalid JSON**: Clear error message with parsing details
- **Network issues**: Automatic retry for transient failures
- **Token permissions**: Validation before operations begin

---

# Combined Workflow Examples

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
