# Prerequisites

## Two keys, two purposes

Push ingestion requires **two separate Monte Carlo API keys** — one for pushing data, one
for reading/verifying it. They use identical header names but different endpoints.

| Key | Purpose | Endpoint |
|---|---|---|
| **Ingestion key** (scope=`Ingestion`) | Push metadata, lineage, query logs | `https://integrations.getmontecarlo.com` |
| **GraphQL API key** | Verify pushed data, run management mutations | `https://api.getmontecarlo.com/graphql` |

Both authenticate with:
```
x-mcd-id:    <key-id>
x-mcd-token: <key-secret>
```

The secret for both is shown **only once** at creation time — store it securely immediately.

---

## Create the Ingestion key (for pushing)

Use the Monte Carlo CLI:

```bash
montecarlo integrations create-key \
  --scope Ingestion \
  --description "Push ingestion key"
```

Output:
```
Key id:     <id>
Key secret: <secret>    ← only shown once
```

Install the CLI if needed:
```bash
pip install montecarlodata
montecarlo configure   # enter your API key when prompted
```

**Optional — restrict to a specific warehouse:**
If you want the key to only work for one warehouse UUID, use the GraphQL mutation instead:

```graphql
mutation {
  createIntegrationKey(
    description: "Push key for warehouse XYZ"
    scope: Ingestion
    warehouseIds: ["<warehouse-uuid>"]
  ) {
    key { id secret }
  }
}
```

---

## Create the GraphQL API key (for verification)

1. Go to **https://getmontecarlo.com/settings/api**
2. Click **Add**
3. Choose key type (personal or account-level — account-level requires Account Owner role)
4. Copy the **Key ID** and **Secret** immediately

The GraphQL endpoint is: `https://api.getmontecarlo.com/graphql`

Test it:
```bash
curl -s -X POST https://api.getmontecarlo.com/graphql \
  -H "x-mcd-id: <id>" \
  -H "x-mcd-token: <secret>" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ getUser { email } }"}' | python3 -m json.tool
```

---

## Find your warehouse (resource) UUID

The Ingestion key needs to reference the correct MC resource UUID. To find it:

```graphql
query {
  getUser {
    account {
      warehouses {
        uuid
        name
        connectionType
      }
    }
  }
}
```

Or in the MC UI: **Settings → Integrations** → click the warehouse → copy the UUID from the URL.

---

## Install pycarlo (optional)

The pycarlo SDK simplifies push calls, but is not required. You can also call the push APIs
directly via HTTP/curl — see `references/direct-http-api.md`.

```bash
pip install pycarlo
```

Initialize the ingestion client in your script:

```python
from pycarlo.core import Client, Session
from pycarlo.features.ingestion import IngestionService

client = Client(session=Session(
    mcd_id="<ingestion-key-id>",
    mcd_token="<ingestion-key-secret>",
    scope="Ingestion",
))
service = IngestionService(mc_client=client)
```

Load credentials from environment variables (recommended):

```python
import os
service = IngestionService(mc_client=Client(session=Session(
    mcd_id=os.environ["MCD_INGEST_ID"],
    mcd_token=os.environ["MCD_INGEST_TOKEN"],
    scope="Ingestion",
)))
```

---

## Environment variable conventions

The script templates use these env var names by default:

| Variable | Key type | Used by |
|---|---|---|
| `MCD_INGEST_ID` | Ingestion key ID | push and collect_and_push scripts |
| `MCD_INGEST_TOKEN` | Ingestion key secret | push and collect_and_push scripts |
| `MCD_ID` | GraphQL API key ID | verification scripts, slash commands |
| `MCD_TOKEN` | GraphQL API key secret | verification scripts, slash commands |
| `MCD_RESOURCE_UUID` | Warehouse UUID | all scripts |
