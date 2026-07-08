---
name: azure-monitor-ingestion-py
description: Azure Monitor Ingestion SDK for Python. Use for sending custom logs to Log Analytics workspace via Logs Ingestion API.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Monitor Ingestion SDK for Python

Send custom logs to Azure Monitor Log Analytics workspace using the Logs Ingestion API.

## Installation

```bash
pip install azure-monitor-ingestion
pip install azure-identity
```

## Environment Variables

```bash
# Data Collection Endpoint (DCE)
AZURE_DCE_ENDPOINT=https://<dce-name>.<region>.ingest.monitor.azure.com

# Data Collection Rule (DCR) immutable ID
AZURE_DCR_RULE_ID=dcr-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stream name from DCR
AZURE_DCR_STREAM_NAME=Custom-MyTable_CL
```

## Prerequisites

Before using this SDK, you need:

1. **Log Analytics Workspace** — Target for your logs
2. **Data Collection Endpoint (DCE)** — Ingestion endpoint
3. **Data Collection Rule (DCR)** — Defines schema and destination
4. **Custom Table** — In Log Analytics (created via DCR or manually)

## Authentication

```python
from azure.monitor.ingestion import LogsIngestionClient
from azure.identity import DefaultAzureCredential
import os

client = LogsIngestionClient(
    endpoint=os.environ["AZURE_DCE_ENDPOINT"],
    credential=DefaultAzureCredential()
)
```

## Upload Custom Logs

```python
from azure.monitor.ingestion import LogsIngestionClient
from azure.identity import DefaultAzureCredential
import os

client = LogsIngestionClient(
    endpoint=os.environ["AZURE_DCE_ENDPOINT"],
    credential=DefaultAzureCredential()
)

rule_id = os.environ["AZURE_DCR_RULE_ID"]
stream_name = os.environ["AZURE_DCR_STREAM_NAME"]

logs = [
    {"TimeGenerated": "2024-01-15T10:00:00Z", "Computer": "server1", "Message": "Application started"},
    {"TimeGenerated": "2024-01-15T10:01:00Z", "Computer": "server1", "Message": "Processing request"},
    {"TimeGenerated": "2024-01-15T10:02:00Z", "Computer": "server2", "Message": "Connection established"}
]

client.upload(rule_id=rule_id, stream_name=stream_name, logs=logs)
```

## Upload from JSON File

```python
import json

with open("logs.json", "r") as f:
    logs = json.load(f)

client.upload(rule_id=rule_id, stream_name=stream_name, logs=logs)
```

## Custom Error Handling

Handle partial failures with a callback:

```python
failed_logs = []

def on_error(error):
    print(f"Upload failed: {error.error}")
    failed_logs.extend(error.failed_logs)

client.upload(
    rule_id=rule_id,
    stream_name=stream_name,
    logs=logs,
    on_error=on_error
)

# Retry failed logs
if failed_logs:
    print(f"Retrying {len(failed_logs)} failed logs...")
    client.upload(rule_id=rule_id, stream_name=stream_name, logs=failed_logs)
```

## Ignore Errors

```python
def ignore_errors(error):
    pass  # Silently ignore upload failures

client.upload(
    rule_id=rule_id,
    stream_name=stream_name,
    logs=logs,
    on_error=ignore_errors
)
```

## Async Client

```python
import asyncio
from azure.monitor.ingestion.aio import LogsIngestionClient
from azure.identity.aio import DefaultAzureCredential

async def upload_logs():
    async with LogsIngestionClient(
        endpoint=endpoint,
        credential=DefaultAzureCredential()
    ) as client:
        await client.upload(
            rule_id=rule_id,
            stream_name=stream_name,
            logs=logs
        )

asyncio.run(upload_logs())
```

## Sovereign Clouds

```python
from azure.identity import AzureAuthorityHosts, DefaultAzureCredential
from azure.monitor.ingestion import LogsIngestionClient

# Azure Government
credential = DefaultAzureCredential(authority=AzureAuthorityHosts.AZURE_GOVERNMENT)
client = LogsIngestionClient(
    endpoint="https://example.ingest.monitor.azure.us",
    credential=credential,
    credential_scopes=["https://monitor.azure.us/.default"]
)
```

## Batching Behavior

The SDK automatically:
- Splits logs into chunks of 1MB or less
- Compresses each chunk with gzip
- Uploads chunks in parallel

No manual batching needed for large log sets.

## Client Types

| Client | Purpose |
|--------|---------|
| `LogsIngestionClient` | Sync client for uploading logs |
| `LogsIngestionClient` (aio) | Async client for uploading logs |

## Key Concepts

| Concept | Description |
|---------|-------------|
| **DCE** | Data Collection Endpoint — ingestion URL |
| **DCR** | Data Collection Rule — defines schema, transformations, destination |
| **Stream** | Named data flow within a DCR |
| **Custom Table** | Target table in Log Analytics (ends with `_CL`) |

## DCR Stream Name Format

Stream names follow patterns:
- `Custom-<TableName>_CL` — For custom tables
- `Microsoft-<TableName>` — For built-in tables

## Best Practices

1. **Use DefaultAzureCredential** for authentication
2. **Handle errors gracefully** — use `on_error` callback for partial failures
3. **Include TimeGenerated** — Required field for all logs
4. **Match DCR schema** — Log fields must match DCR column definitions
5. **Use async client** for high-throughput scenarios
6. **Batch uploads** — SDK handles batching, but send reasonable chunks
7. **Monitor ingestion** — Check Log Analytics for ingestion status
8. **Use context manager** — Ensures proper client cleanup

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
