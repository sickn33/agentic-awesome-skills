---
name: odoo-rpc-api
description: "Expert on Odoo's external JSON-RPC and XML-RPC APIs. Covers authentication, model calls, record CRUD, and real-world integration examples in Python, JavaScript, and curl."
risk: critical
source: "self"
date_added: "2026-03-04"
---

# Odoo RPC API

## Overview

Odoo exposes a powerful external API via JSON-RPC and XML-RPC, allowing any external application to read, create, update, and delete records. This skill guides you through authenticating, calling models, and building robust integrations.

## When to Use This Skill

- Connecting an external app (e.g., Django, Node.js, a mobile app) to Odoo.
- Running automated scripts to import/export data from Odoo.
- Building a middleware layer between Odoo and a third-party platform.
- Debugging API authentication or permission errors.

## How It Works

1. **Activate**: Mention `@odoo-rpc-api` and describe the integration you need.
2. **Generate**: Get copy-paste ready RPC call code in Python, JavaScript, or curl.
3. **Debug**: Paste an error and get a diagnosis with a corrected call.

## Examples

### Example 1: Authenticate and Read Records (Python)

```python
import os
import xmlrpc.client

url = 'https://myodoo.example.com'
db = 'my_database'
username = 'integration-user'
password = os.environ["ODOO_API_KEY"]  # Use API keys, not passwords, in production

# Step 1: Authenticate
common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
uid = common.authenticate(db, username, password, {})
if not uid:
    raise RuntimeError("Odoo authentication failed")

# Step 2: Call models
models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')

# Search confirmed sale orders
orders = models.execute_kw(db, uid, password,
    'sale.order', 'search_read',
    [[['state', '=', 'sale']]],
    {'fields': ['name', 'partner_id', 'amount_total'], 'limit': 10}
)
for order in orders:
    print(order)
```

### Example 2: Create a Record (Python)

This mutates business data. Use an authorized test database and an approved integration user; reuse the authenticated objects from Example 1.

```python
new_partner_id = models.execute_kw(db, uid, password,
    'res.partner', 'create',
    [{'name': 'Acme Corp', 'email': 'info@acme.com', 'is_company': True}]
)
print(f"Created partner ID: {new_partner_id}")
```

### Example 3: Session-based JSON-RPC fragment

The web endpoint below requires a separately authenticated Odoo session cookie, unlike the XML-RPC API-key example. No session is established here; without it the request fails. Prefer the documented external API for the exact deployed Odoo version.

```bash
curl -X POST https://myodoo.example.com/web/dataset/call_kw \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "call",
    "id": 1,
    "params": {
      "model": "res.partner",
      "method": "search_read",
      "args": [[["is_company", "=", true]]],
      "kwargs": {"fields": ["name", "email"], "limit": 5}
    }
  }'
# Supply an authorized session through your HTTP client’s protected cookie store.
# Do not paste session cookies or API keys into logs or shared examples.
```

## Best Practices

- ✅ **Do:** Use **API Keys** (Settings → Technical → API Keys) instead of passwords — available from Odoo 14+.
- ✅ **Do:** Use `search_read` instead of `search` + `read` to reduce network round trips.
- ✅ **Do:** Handle connection errors with bounded backoff for safe reads. After an ambiguous create/write timeout, reconcile using a stable external identifier before retrying to avoid duplicate business records.
- ✅ **Do:** Store credentials in environment variables or a secrets manager (e.g., AWS Secrets Manager, `.env` file).
- ❌ **Don't:** Hardcode passwords or API keys directly in scripts — rotate them and use env vars.
- ❌ **Don't:** Call the API in a tight loop without batching — bulk operations reduce server load significantly.
- ❌ **Don't:** Use the master admin password for API integrations — create a dedicated integration user with minimum required permissions.

## Limitations

- Does not implement OAuth2 or session login. XML-RPC examples use an API key; the web JSON-RPC fragment requires a session established separately.
- **Rate limiting** is not built into the Odoo XMLRPC layer; you must implement throttling client-side.
- Attachments are model records: encode binary field contents as base64 when calling `ir.attachment` through an authorized RPC model call. JSON-RPC is not a REST upload endpoint; respect payload limits and access rules.
- Verify hosting, subscription and exact-version external API support before choosing an endpoint. Odoo Online and Odoo.sh are distinct offerings. See [Odoo external API](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html).
