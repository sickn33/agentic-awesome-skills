---
name: azure-monitor-query-java
description: Azure Monitor Query SDK for Java. Execute Kusto queries against Log Analytics workspaces and query metrics from Azure resources.
risk: safe
source: community
date_added: '2026-02-27'
---

# Azure Monitor Query SDK for Java

> **DEPRECATION NOTICE**: This package is deprecated in favor of:
> - `azure-monitor-query-logs` — For Log Analytics queries
> - `azure-monitor-query-metrics` — For metrics queries
>
> See migration guides: [Logs Migration](https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/monitor/azure-monitor-query-logs/migration-guide.md) | [Metrics Migration](https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/monitor/azure-monitor-query-metrics/migration-guide.md)

Client library for querying Azure Monitor Logs and Metrics.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-monitor-query</artifactId>
    <version>1.5.9</version>
</dependency>
```

Or use Azure SDK BOM:

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.azure</groupId>
            <artifactId>azure-sdk-bom</artifactId>
            <version>{bom_version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>com.azure</groupId>
        <artifactId>azure-monitor-query</artifactId>
    </dependency>
</dependencies>
```

## Prerequisites

- Log Analytics workspace (for logs queries)
- Azure resource (for metrics queries)
- TokenCredential with appropriate permissions

## Environment Variables

```bash
LOG_ANALYTICS_WORKSPACE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_RESOURCE_ID=/subscriptions/{sub}/resourceGroups/{rg}/providers/{provider}/{resource}
```

## Client Creation

### LogsQueryClient (Sync)

```java
import com.azure.identity.DefaultAzureCredentialBuilder;
import com.azure.monitor.query.LogsQueryClient;
import com.azure.monitor.query.LogsQueryClientBuilder;

LogsQueryClient logsClient = new LogsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

### LogsQueryAsyncClient

```java
import com.azure.monitor.query.LogsQueryAsyncClient;

LogsQueryAsyncClient logsAsyncClient = new LogsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildAsyncClient();
```

### MetricsQueryClient (Sync)

```java
import com.azure.monitor.query.MetricsQueryClient;
import com.azure.monitor.query.MetricsQueryClientBuilder;

MetricsQueryClient metricsClient = new MetricsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildClient();
```

### MetricsQueryAsyncClient

```java
import com.azure.monitor.query.MetricsQueryAsyncClient;

MetricsQueryAsyncClient metricsAsyncClient = new MetricsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildAsyncClient();
```

### Sovereign Cloud Configuration

```java
// Azure China Cloud - Logs
LogsQueryClient logsClient = new LogsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint("https://api.loganalytics.azure.cn/v1")
    .buildClient();

// Azure China Cloud - Metrics
MetricsQueryClient metricsClient = new MetricsQueryClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint("https://management.chinacloudapi.cn")
    .buildClient();
```

## Key Concepts

| Concept | Description |
|---------|-------------|
| Logs | Log and performance data from Azure resources via Kusto Query Language |
| Metrics | Numeric time-series data collected at regular intervals |
| Workspace ID | Log Analytics workspace identifier |
| Resource ID | Azure resource URI for metrics queries |
| QueryTimeInterval | Time range for the query |

## Logs Query Operations

### Basic Query

```java
import com.azure.monitor.query.models.LogsQueryResult;
import com.azure.monitor.query.models.LogsTableRow;
import com.azure.monitor.query.models.QueryTimeInterval;
import java.time.Duration;

LogsQueryResult result = logsClient.queryWorkspace(
    "{workspace-id}",
    "AzureActivity | summarize count() by ResourceGroup | top 10 by count_",
    new QueryTimeInterval(Duration.ofDays(7))
);

for (LogsTableRow row : result.getTable().getRows()) {
    System.out.println(row.getColumnValue("ResourceGroup") + ": " + row.getColumnValue("count_"));
}
```

### Query by Resource ID

```java
LogsQueryResult result = logsClient.queryResource(
    "{resource-id}",
    "AzureMetrics | where TimeGenerated > ago(1h)",
    new QueryTimeInterval(Duration.ofDays(1))
);

for (LogsTableRow row : result.getTable().getRows()) {
    System.out.println(row.getColumnValue("MetricName") + " " + row.getColumnValue("Average"));
}
```

### Map Results to Custom Model

```java
// Define model class
public class ActivityLog {
    private String resourceGroup;
    private String operationName;
    
    public String getResourceGroup() { return resourceGroup; }
    public String getOperationName() { return operationName; }
}

// Query with model mapping
List<ActivityLog> logs = logsClient.queryWorkspace(
    "{workspace-id}",
    "AzureActivity | project ResourceGroup, OperationName | take 100",
    new QueryTimeInterval(Duration.ofDays(2)),
    ActivityLog.class
);

for (ActivityLog log : logs) {
    System.out.println(log.getOperationName() + " - " + log.getResourceGroup());
}
```

### Batch Query

```java
import com.azure.monitor.query.models.LogsBatchQuery;
import com.azure.monitor.query.models.LogsBatchQueryResult;
import com.azure.monitor.query.models.LogsBatchQueryResultCollection;
import com.azure.core.util.Context;

LogsBatchQuery batchQuery = new LogsBatchQuery();
String q1 = batchQuery.addWorkspaceQuery("{workspace-id}", "AzureActivity | count", new QueryTimeInterval(Duration.ofDays(1)));
String q2 = batchQuery.addWorkspaceQuery("{workspace-id}", "Heartbeat | count", new QueryTimeInterval(Duration.ofDays(1)));
String q3 = batchQuery.addWorkspaceQuery("{workspace-id}", "Perf | count", new QueryTimeInterval(Duration.ofDays(1)));

LogsBatchQueryResultCollection results = logsClient
    .queryBatchWithResponse(batchQuery, Context.NONE)
    .getValue();

LogsBatchQueryResult result1 = results.getResult(q1);
LogsBatchQueryResult result2 = results.getResult(q2);
LogsBatchQueryResult result3 = results.getResult(q3);

// Check for failures
if (result3.getQueryResultStatus() == LogsQueryResultStatus.FAILURE) {
    System.err.println("Query failed: " + result3.getError().getMessage());
}
```

### Query with Options

```java
import com.azure.monitor.query.models.LogsQueryOptions;
import com.azure.core.http.rest.Response;

LogsQueryOptions options = new LogsQueryOptions()
    .setServerTimeout(Duration.ofMinutes(10))
    .setIncludeStatistics(true)
    .setIncludeVisualization(true);

Response<LogsQueryResult> response = logsClient.queryWorkspaceWithResponse(
    "{workspace-id}",
    "AzureActivity | summarize count() by bin(TimeGenerated, 1h)",
    new QueryTimeInterval(Duration.ofDays(7)),
    options,
    Context.NONE
);

LogsQueryResult result = response.getValue();

// Access statistics
BinaryData statistics = result.getStatistics();
// Access visualization data
BinaryData visualization = result.getVisualization();
```

### Query Multiple Workspaces

```java
import java.util.Arrays;

LogsQueryOptions options = new LogsQueryOptions()
    .setAdditionalWorkspaces(Arrays.asList("{workspace-id-2}", "{workspace-id-3}"));

Response<LogsQueryResult> response = logsClient.queryWorkspaceWithResponse(
    "{workspace-id-1}",
    "AzureActivity | summarize count() by TenantId",
    new QueryTimeInterval(Duration.ofDays(1)),
    options,
    Context.NONE
);
```

## Metrics Query Operations

### Basic Metrics Query

```java
import com.azure.monitor.query.models.MetricsQueryResult;
import com.azure.monitor.query.models.MetricResult;
import com.azure.monitor.query.models.TimeSeriesElement;
import com.azure.monitor.query.models.MetricValue;
import java.util.Arrays;

MetricsQueryResult result = metricsClient.queryResource(
    "{resource-uri}",
    Arrays.asList("SuccessfulCalls", "TotalCalls")
);

for (MetricResult metric : result.getMetrics()) {
    System.out.println("Metric: " + metric.getMetricName());
    for (TimeSeriesElement ts : metric.getTimeSeries()) {
        System.out.println("  Dimensions: " + ts.getMetadata());
        for (MetricValue value : ts.getValues()) {
            System.out.println("    " + value.getTimeStamp() + ": " + value.getTotal());
        }
    }
}
```

### Metrics with Aggregations

```java
import com.azure.monitor.query.models.MetricsQueryOptions;
import com.azure.monitor.query.models.AggregationType;

Response<MetricsQueryResult> response = metricsClient.queryResourceWithResponse(
    "{resource-id}",
    Arrays.asList("SuccessfulCalls", "TotalCalls"),
    new MetricsQueryOptions()
        .setGranularity(Duration.ofHours(1))
        .setAggregations(Arrays.asList(AggregationType.AVERAGE, AggregationType.COUNT)),
    Context.NONE
);

MetricsQueryResult result = response.getValue();
```

### Query Multiple Resources (MetricsClient)

```java
import com.azure.monitor.query.MetricsClient;
import com.azure.monitor.query.MetricsClientBuilder;
import com.azure.monitor.query.models.MetricsQueryResourcesResult;

MetricsClient metricsClient = new MetricsClientBuilder()
    .credential(new DefaultAzureCredentialBuilder().build())
    .endpoint("{endpoint}")
    .buildClient();

MetricsQueryResourcesResult result = metricsClient.queryResources(
    Arrays.asList("{resourceId1}", "{resourceId2}"),
    Arrays.asList("{metric1}", "{metric2}"),
    "{metricNamespace}"
);

for (MetricsQueryResult queryResult : result.getMetricsQueryResults()) {
    for (MetricResult metric : queryResult.getMetrics()) {
        System.out.println(metric.getMetricName());
        metric.getTimeSeries().stream()
            .flatMap(ts -> ts.getValues().stream())
            .forEach(mv -> System.out.println(
                mv.getTimeStamp() + " Count=" + mv.getCount() + " Avg=" + mv.getAverage()));
    }
}
```

## Response Structure

### Logs Response Hierarchy

```
LogsQueryResult
├── statistics (BinaryData)
├── visualization (BinaryData)
├── error
└── tables (List<LogsTable>)
    ├── name
    ├── columns (List<LogsTableColumn>)
    │   ├── name
    │   └── type
    └── rows (List<LogsTableRow>)
        ├── rowIndex
        └── rowCells (List<LogsTableCell>)
```

### Metrics Response Hierarchy

```
MetricsQueryResult
├── granularity
├── timeInterval
├── namespace
├── resourceRegion
└── metrics (List<MetricResult>)
    ├── id, name, type, unit
    └── timeSeries (List<TimeSeriesElement>)
        ├── metadata (dimensions)
        └── values (List<MetricValue>)
            ├── timeStamp
            ├── count, average, total
            ├── maximum, minimum
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;
import com.azure.monitor.query.models.LogsQueryResultStatus;

try {
    LogsQueryResult result = logsClient.queryWorkspace(workspaceId, query, timeInterval);
    
    // Check partial failure
    if (result.getStatus() == LogsQueryResultStatus.PARTIAL_FAILURE) {
        System.err.println("Partial failure: " + result.getError().getMessage());
    }
} catch (HttpResponseException e) {
    System.err.println("Query failed: " + e.getMessage());
    System.err.println("Status: " + e.getResponse().getStatusCode());
}
```

## Best Practices

1. **Use batch queries** — Combine multiple queries into a single request
2. **Set appropriate timeouts** — Long queries may need extended server timeout
3. **Limit result size** — Use `top` or `take` in Kusto queries
4. **Use projections** — Select only needed columns with `project`
5. **Check query status** — Handle PARTIAL_FAILURE results gracefully
6. **Cache results** — Metrics don't change frequently; cache when appropriate
7. **Migrate to new packages** — Plan migration to `azure-monitor-query-logs` and `azure-monitor-query-metrics`

## Reference Links

| Resource | URL |
|----------|-----|
| Maven Package | https://central.sonatype.com/artifact/com.azure/azure-monitor-query |
| GitHub | https://github.com/Azure/azure-sdk-for-java/tree/main/sdk/monitor/azure-monitor-query |
| API Reference | https://learn.microsoft.com/java/api/com.azure.monitor.query |
| Kusto Query Language | https://learn.microsoft.com/azure/data-explorer/kusto/query/ |
| Log Analytics Limits | https://learn.microsoft.com/azure/azure-monitor/service-limits#la-query-api |
| Troubleshooting | https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/monitor/azure-monitor-query/TROUBLESHOOTING.md |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
