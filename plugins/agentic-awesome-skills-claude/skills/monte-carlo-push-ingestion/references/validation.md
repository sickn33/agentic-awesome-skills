# Validating Pushed Data

All verification queries use the **GraphQL API key** at `https://api.getmontecarlo.com/graphql`.

---

## Resolve a table's MCON and fullTableId

Before running most queries you need either the `mcon` or `fullTableId`.

`fullTableId` format: `<database>:<schema>.<table>` — e.g. `analytics:public.orders`

```graphql
query GetTable($fullTableId: String!, $dwId: UUID!) {
  getTable(fullTableId: $fullTableId, dwId: $dwId) {
    mcon
    fullTableId
    displayName
  }
}
```

Variables:
```json
{
  "fullTableId": "analytics:public.orders",
  "dwId": "<warehouse-uuid>"
}
```

---

## Verify metadata (schema + columns)

```graphql
query GetTableMetadata($mcon: String!) {
  getTable(mcon: $mcon) {
    mcon
    fullTableId
    versions {
      edges {
        node {
          fields {
            name
            fieldType
          }
        }
      }
    }
  }
}
```

Check that the fields list matches your pushed schema.

---

## Verify volume and freshness metrics

Use `getMetricsV4` to fetch row counts and last-modified timestamps:

```graphql
query GetMetrics(
  $mcon: String!
  $metricName: String!
  $startTime: DateTime!
  $endTime: DateTime!
) {
  getMetricsV4(
    dwId: null
    mcon: $mcon
    metricName: $metricName
    startTime: $startTime
    endTime: $endTime
  ) {
    metricsJson
  }
}
```

Variables (row count):
```json
{
  "mcon": "<table-mcon>",
  "metricName": "total_row_count",
  "startTime": "2024-03-01T00:00:00Z",
  "endTime": "2024-03-02T00:00:00Z"
}
```

`metricsJson` is a JSON string. Parse it and look for `value` and `measurementTimestamp`
(camelCase) in each data point.

Other useful metric names:
- `"total_row_count"` — row count
- `"total_byte_count"` — byte size
- `"total_row_count_last_changed_on"` — Unix epoch float of when the row count last changed

---

## Verify table lineage

```graphql
query GetTableLineage($mcon: String!) {
  getTableLineage(mcon: $mcon, direction: "upstream", hops: 1) {
    connectedNodes {
      mcon
      displayName
      objectType
    }
    flattenedEdges {
      directlyConnectedMcons
    }
  }
}
```

Check that your expected source tables appear in `connectedNodes` or
`flattenedEdges[].directlyConnectedMcons`.

---

## Verify column lineage

```graphql
query GetColumnLineage($mcon: String!, $column: String!) {
  getDerivedTablesPartialLineage(mcon: $mcon, column: $column, pageSize: 1000) {
    destinations {
      table { mcon displayName }
      columns { columnName }
    }
  }
}
```

Variables: `mcon` = source table MCON, `column` = source column name.

Check that each destination table and column appears in the response.

---

## Verify query logs

```graphql
query GetAggregatedQueries(
  $mcon: String!
  $queryType: String!
  $startTime: DateTime!
  $endTime: DateTime!
  $first: Int
  $after: String
) {
  getAggregatedQueries(
    mcon: $mcon
    queryType: $queryType
    startTime: $startTime
    endTime: $endTime
    first: $first
    after: $after
  ) {
    edges { node { queryHash queryCount lastSeen } }
    pageInfo { hasNextPage endCursor }
  }
}
```

Variables:
```json
{
  "mcon": "<table-mcon>",
  "queryType": "read",
  "startTime": "2024-03-01T00:00:00Z",
  "endTime": "2024-03-02T00:00:00Z",
  "first": 100
}
```

**Remember**: query logs take up to 1 hour to process after push. If you see 0 results
immediately after pushing, wait and try again.

---

## Check detector thresholds (anomaly detection status)

```graphql
query GetDetectorStatus($mcon: String!) {
  getTable(mcon: $mcon) {
    thresholds {
      freshness {
        lower { value }
        upper { value }
        status
      }
      size {
        lower { value }
        upper { value }
        status
      }
    }
  }
}
```

`status` will be `"no data"` or `"inactive"` on a newly-pushed table. Detectors need
historical data to train — see `references/anomaly-detection.md` for requirements.

---

## Table management operations

### Delete push-ingested tables

Only works on push-ingested tables — pull-collected tables are excluded by default.

```graphql
mutation DeletePushTables($mcons: [String!]!) {
  deletePushIngestedTables(mcons: $mcons) {
    success
    deletedCount
  }
}
```

Variables:
```json
{
  "mcons": ["<mcon-1>", "<mcon-2>"]
}
```

Resolve MCONs first with `getTable(fullTableId: ..., dwId: ...)`.

---

## Python helper

```python
import requests, json

GRAPHQL_URL = "https://api.getmontecarlo.com/graphql"

def graphql(query: str, variables: dict, key_id: str, key_token: str) -> dict:
    resp = requests.post(
        GRAPHQL_URL,
        json={"query": query, "variables": variables},
        headers={
            "x-mcd-id": key_id,
            "x-mcd-token": key_token,
            "Content-Type": "application/json",
        },
    )
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(json.dumps(data["errors"], indent=2))
    return data["data"]
```
