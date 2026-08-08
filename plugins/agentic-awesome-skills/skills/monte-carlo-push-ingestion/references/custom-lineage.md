# Custom Lineage Nodes and Edges

## When to use this

The `send_lineage()` pycarlo method is the right choice for warehouse tables you own.
The **GraphQL mutations** in this document are for:
- Non-warehouse assets: dbt models, Airflow DAGs, Fivetran connectors, custom ETL jobs
- Connecting nodes across different MC resources (warehouses)
- One-off lineage corrections not tied to a collector run
- Fine-grained control over node properties, object types, and expiry

All mutations use the **GraphQL API key** (not the Ingestion key) and the endpoint
`https://api.getmontecarlo.com/graphql`.

## Critical: expireAt

If you don't set `expireAt`, nodes and edges expire after **7 days** and vanish from the
lineage graph silently. For any node or edge that should persist:

```
expireAt: "9999-12-31"
```

This is the same value that `PushLineageProcessor` uses internally for all push-ingested
lineage. Forgetting this is the most common cause of "my lineage disappeared after a week".

---

## createOrUpdateLineageNode

Creates or updates a node in the lineage graph. If a node with the same
`objectType` + `objectId` + `resourceId` already exists, it is updated.

```graphql
mutation CreateOrUpdateLineageNode(
  $objectType: String!
  $objectId:   String!
  $resourceId:   UUID
  $resourceName: String
  $name:       String
  $properties: [ObjectPropertyInput]
  $expireAt:   DateTime
) {
  createOrUpdateLineageNode(
    objectType:   $objectType
    objectId:     $objectId
    resourceId:   $resourceId
    resourceName: $resourceName
    name:         $name
    properties:   $properties
    expireAt:     $expireAt
  ) {
    node {
      mcon
      displayName
      objectType
      isCustom
      expireAt
    }
  }
}
```

**Variables:**
```json
{
  "objectType":  "table",
  "objectId":    "analytics:analytics.orders",
  "resourceId":  "<warehouse-uuid>",
  "name":        "orders",
  "expireAt":    "9999-12-31"
}
```

`objectType` can be any string — common values: `"table"`, `"view"`, `"report"`,
`"dashboard"`, `"job"`, `"model"`.

`objectId` should be a stable unique identifier for the asset within the resource.
For tables, use the `fullTableId` format: `database:schema.table`.

The returned `mcon` is the stable MC identifier for this node — save it if you plan to
reference it in edges or deletions.

---

## createOrUpdateLineageEdge

Creates or updates a directed edge: source → destination (default: IS_DOWNSTREAM).

```graphql
mutation CreateOrUpdateLineageEdge(
  $source:      NodeInput!
  $destination: NodeInput!
  $expireAt:    DateTime
  $edgeType:    EdgeType
) {
  createOrUpdateLineageEdge(
    source:      $source
    destination: $destination
    expireAt:    $expireAt
    edgeType:    $edgeType
  ) {
    edge {
      source      { mcon displayName objectType }
      destination { mcon displayName objectType }
      isCustom
      expireAt
    }
  }
}
```

`NodeInput` shape:
```json
{
  "objectType":   "table",
  "objectId":     "analytics:analytics.orders",
  "resourceId":   "<warehouse-uuid>"
}
```

**Full example — dbt model → warehouse table:**
```json
{
  "source": {
    "objectType": "model",
    "objectId":   "dbt://my_project/models/staging/stg_orders",
    "resourceName": "dbt-production"
  },
  "destination": {
    "objectType": "table",
    "objectId":   "analytics:analytics.orders",
    "resourceId": "<snowflake-warehouse-uuid>"
  },
  "expireAt":  "9999-12-31",
  "edgeType":  "IS_DOWNSTREAM"
}
```

---

## deleteLineageNode

Deletes a node and **all its edges and objects**. This is irreversible.

```graphql
mutation DeleteLineageNode($mcon: String!) {
  deleteLineageNode(mcon: $mcon) {
    objectsDeleted
    nodesDeleted
    edgesDeleted
  }
}
```

Get the MCON from `createOrUpdateLineageNode`'s response, or from:
```graphql
query {
  getTable(fullTableId: "analytics:analytics.orders", dwId: "<warehouse-uuid>") {
    mcon
  }
}
```

---

## Python helper for all three mutations

```python
import requests

GRAPHQL_URL = "https://api.getmontecarlo.com/graphql"
HEADERS = {
    "x-mcd-id":    "<graphql-api-key-id>",
    "x-mcd-token": "<graphql-api-key-secret>",
    "Content-Type": "application/json",
}

def run_mutation(query: str, variables: dict) -> dict:
    resp = requests.post(GRAPHQL_URL, json={"query": query, "variables": variables}, headers=HEADERS)
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(data["errors"])
    return data["data"]

# Example: create a permanent node
result = run_mutation(
    """mutation($objectType: String!, $objectId: String!, $resourceId: UUID, $expireAt: DateTime) {
         createOrUpdateLineageNode(objectType: $objectType, objectId: $objectId,
                                   resourceId: $resourceId, expireAt: $expireAt) {
           node { mcon displayName }
         }
       }""",
    {
        "objectType": "table",
        "objectId":   "analytics:analytics.orders",
        "resourceId": "<warehouse-uuid>",
        "expireAt":   "9999-12-31",
    }
)
print("MCON:", result["createOrUpdateLineageNode"]["node"]["mcon"])
```
