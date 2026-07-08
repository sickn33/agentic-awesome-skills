---
name: azure-monitor-query-py
description: Azure Monitor Query SDK for Python. Use for querying Log Analytics workspaces and Azure Monitor metrics.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Monitor Query SDK for Python

Query logs and metrics from Azure Monitor and Log Analytics workspaces.

## Installation

```bash
pip install azure-monitor-query
```

## Environment Variables

```bash
# Log Analytics
AZURE_LOG_ANALYTICS_WORKSPACE_ID=<workspace-id>

# Metrics
AZURE_METRICS_RESOURCE_URI=/subscriptions/<sub>/resourceGroups/<rg>/providers/<provider>/<type>/<name>
```

## Authentication

```python
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
```

## Logs Query Client

### Basic Query

```python
from azure.monitor.query import LogsQueryClient
from datetime import timedelta

client = LogsQueryClient(credential)

query = """
AppRequests
| where TimeGenerated > ago(1h)
| summarize count() by bin(TimeGenerated, 5m), ResultCode
| order by TimeGenerated desc
"""

response = client.query_workspace(
    workspace_id=os.environ["AZURE_LOG_ANALYTICS_WORKSPACE_ID"],
    query=query,
    timespan=timedelta(hours=1)
)

for table in response.tables:
    for row in table.rows:
        print(row)
```

### Query with Time Range

```python
from datetime import datetime, timezone

response = client.query_workspace(
    workspace_id=workspace_id,
    query="AppRequests | take 10",
    timespan=(
        datetime(2024, 1, 1, tzinfo=timezone.utc),
        datetime(2024, 1, 2, tzinfo=timezone.utc)
    )
)
```

### Convert to DataFrame

```python
import pandas as pd

response = client.query_workspace(workspace_id, query, timespan=timedelta(hours=1))

if response.tables:
    table = response.tables[0]
    df = pd.DataFrame(data=table.rows, columns=[col.name for col in table.columns])
    print(df.head())
```

### Batch Query

```python
from azure.monitor.query import LogsBatchQuery

queries = [
    LogsBatchQuery(workspace_id=workspace_id, query="AppRequests | take 5", timespan=timedelta(hours=1)),
    LogsBatchQuery(workspace_id=workspace_id, query="AppExceptions | take 5", timespan=timedelta(hours=1))
]

responses = client.query_batch(queries)

for response in responses:
    if response.tables:
        print(f"Rows: {len(response.tables[0].rows)}")
```

### Handle Partial Results

```python
from azure.monitor.query import LogsQueryStatus

response = client.query_workspace(workspace_id, query, timespan=timedelta(hours=24))

if response.status == LogsQueryStatus.PARTIAL:
    print(f"Partial results: {response.partial_error}")
elif response.status == LogsQueryStatus.FAILURE:
    print(f"Query failed: {response.partial_error}")
```

## Metrics Query Client

### Query Resource Metrics

```python
from azure.monitor.query import MetricsQueryClient
from datetime import timedelta

metrics_client = MetricsQueryClient(credential)

response = metrics_client.query_resource(
    resource_uri=os.environ["AZURE_METRICS_RESOURCE_URI"],
    metric_names=["Percentage CPU", "Network In Total"],
    timespan=timedelta(hours=1),
    granularity=timedelta(minutes=5)
)

for metric in response.metrics:
    print(f"{metric.name}:")
    for time_series in metric.timeseries:
        for data in time_series.data:
            print(f"  {data.timestamp}: {data.average}")
```

### Aggregations

```python
from azure.monitor.query import MetricAggregationType

response = metrics_client.query_resource(
    resource_uri=resource_uri,
    metric_names=["Requests"],
    timespan=timedelta(hours=1),
    aggregations=[
        MetricAggregationType.AVERAGE,
        MetricAggregationType.MAXIMUM,
        MetricAggregationType.MINIMUM,
        MetricAggregationType.COUNT
    ]
)
```

### Filter by Dimension

```python
response = metrics_client.query_resource(
    resource_uri=resource_uri,
    metric_names=["Requests"],
    timespan=timedelta(hours=1),
    filter="ApiName eq 'GetBlob'"
)
```

### List Metric Definitions

```python
definitions = metrics_client.list_metric_definitions(resource_uri)
for definition in definitions:
    print(f"{definition.name}: {definition.unit}")
```

### List Metric Namespaces

```python
namespaces = metrics_client.list_metric_namespaces(resource_uri)
for ns in namespaces:
    print(ns.fully_qualified_namespace)
```

## Async Clients

```python
from azure.monitor.query.aio import LogsQueryClient, MetricsQueryClient
from azure.identity.aio import DefaultAzureCredential

async def query_logs():
    credential = DefaultAzureCredential()
    client = LogsQueryClient(credential)
    
    response = await client.query_workspace(
        workspace_id=workspace_id,
        query="AppRequests | take 10",
        timespan=timedelta(hours=1)
    )
    
    await client.close()
    await credential.close()
    return response
```

## Common Kusto Queries

```kusto
// Requests by status code
AppRequests
| summarize count() by ResultCode
| order by count_ desc

// Exceptions over time
AppExceptions
| summarize count() by bin(TimeGenerated, 1h)

// Slow requests
AppRequests
| where DurationMs > 1000
| project TimeGenerated, Name, DurationMs
| order by DurationMs desc

// Top errors
AppExceptions
| summarize count() by ExceptionType
| top 10 by count_
```

## Client Types

| Client | Purpose |
|--------|---------|
| `LogsQueryClient` | Query Log Analytics workspaces |
| `MetricsQueryClient` | Query Azure Monitor metrics |

## Best Practices

1. **Use timedelta** for relative time ranges
2. **Handle partial results** for large queries
3. **Use batch queries** when running multiple queries
4. **Set appropriate granularity** for metrics to reduce data points
5. **Convert to DataFrame** for easier data analysis
6. **Use aggregations** to summarize metric data
7. **Filter by dimensions** to narrow metric results

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
