---
name: mailtrap-managing-contacts
description: Manage Mailtrap contacts, lists, segments, custom fields, imports, CRM syncs, and campaign audiences through the UI or API.
risk: critical
source: community
date_added: "2026-06-19"
---

# Managing Mailtrap contacts

## Overview

**Before generating API request bodies:** check the [Contacts OpenAPI spec](https://github.com/mailtrap/mailtrap-openapi/blob/main/specs/contacts.openapi.yml) for current field names, required parameters, and nested structures.

**Contacts** are the marketing database: lists, segments, custom fields, and imports for **campaign audiences** and related workflows. The **Contacts API** automates create/update and can feed **CRM or CDP sync** (your code, or tools like Zapier, Make, n8n — see [Import contacts](https://docs.mailtrap.io/email-marketing/contacts/import-contacts.md)).

**Suppressions** (hard bounces, spam complaints, unsubscribes on the **sending** side) live in the sending product and **block delivery** for those addresses on your streams. That is applied separately from **marketing** filters (segments, list membership, consent flags) that decide who is eligible for campaigns. For sending-side blocks, see [Suppressions](https://docs.mailtrap.io/developers/email-sending/suppressions.md) and `mailtrap-sending-emails`.

**Related skills:** `mailtrap-sending-emails` (live send paths).

## When to use

- Programmatic contact management (create, update, [bulk import](https://docs.mailtrap.io/developers/promotional/contacts/bulk-import.md))
- Sync with CRMs or data warehouses
- Contact list cleanup and CSV import
- Updating contacts with **custom fields** or firing **custom events** for [automations](https://docs.mailtrap.io/email-marketing/automations.md)
- Segments and [custom fields](https://docs.mailtrap.io/email-marketing/contacts/custom-fields.md) for audience building

## Authorization

All endpoints below need `Authorization: Bearer $MAILTRAP_API_TOKEN` and an `$MAILTRAP_ACCOUNT_ID` in the path. Resolve `$MAILTRAP_ACCOUNT_ID` from `GET https://mailtrap.io/api/accounts`, and store tokens in environment variables or a secrets manager.

## Endpoints (replace placeholders)

| Action                                 | Method  | URL                                                                                       | Reference                                                                                      |
| -------------------------------------- | ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Create / get / update / delete contact | various | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts`                          | [Contacts](https://docs.mailtrap.io/developers/promotional/contacts/contacts.md)               |
| Bulk import (async job)                | `POST`  | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/imports`                  | [Bulk import](https://docs.mailtrap.io/developers/promotional/contacts/bulk-import.md)         |
| Contact lists                          | various | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/lists`                    | [Contact lists](https://docs.mailtrap.io/developers/promotional/contacts/contact-lists.md)     |
| Custom fields                          | various | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/fields`                   | [Contact fields](https://docs.mailtrap.io/developers/promotional/contacts/contact-fields.md)   |
| Custom events                          | `POST`  | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/{contact_identifier}/events` | [Contact events](https://docs.mailtrap.io/developers/promotional/contacts/contact-events.md)   |
| Export contacts                        | various | `https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/exports`                  | [Export contacts](https://docs.mailtrap.io/developers/promotional/contacts/export-contacts.md) |

- Rate limit (typical): **200 requests per 60 seconds** per account — prefer bulk import for large loads.
- **Bulk import limit:** up to **50,000** contacts per import request (async job); poll import status with `GET .../contacts/imports/{import_id}`. See [Bulk import](https://docs.mailtrap.io/developers/promotional/contacts/bulk-import.md).

## Examples (`curl`)

### Single contact create (with custom fields)

```bash
curl -X POST "https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts" \
  -H "Authorization: Bearer $MAILTRAP_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "contact": {
      "email": "john.smith@example.com",
      "fields": {"first_name": "John", "last_name": "Smith", "company": "Example Inc"},
      "list_ids": [1, 2, 3]
    }
  }'
```

### Bulk import (array of contacts)

```bash
curl -X POST "https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/imports" \
  -H "Authorization: Bearer $MAILTRAP_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "contacts": [
      {"email": "user1@example.com", "fields": {"first_name": "John"}, "list_ids_included": [1, 2]},
      {"email": "user2@example.com", "fields": {"first_name": "Jane"}, "list_ids_included": [1]}
    ]
  }'
```

### Custom event (event name + payload)

```bash
curl -X POST "https://mailtrap.io/api/accounts/$MAILTRAP_ACCOUNT_ID/contacts/{contact_identifier}/events" \
  -H "Authorization: Bearer $MAILTRAP_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name": "UserLogin", "params": {"user_id": 101, "is_active": true}}'
```

## Concepts

- **Lists** — explicitly defined list of contacts.
- **Segments** — dynamic groups; see [Segments](https://docs.mailtrap.io/email-marketing/contacts/segments.md).
- **Custom fields** — properties like first and last name or membership level; see [Custom fields](https://docs.mailtrap.io/email-marketing/contacts/custom-fields.md).
- **Custom events** — `POST .../events` with an event `name` and `params` object for [automations](https://docs.mailtrap.io/email-marketing/automations.md).

## CRM and sync

- **API:** suitable for real-time or scheduled sync from your CRM or database.
- **No-code:** Zapier, Make.com, n8n per [Import contacts – third-party tools](https://docs.mailtrap.io/email-marketing/contacts/import-contacts.md).

## Campaigns use case

Contacts power **marketing campaigns**: you maintain clean lists, consent, and attributes here; campaign authoring and scheduling are product features documented in [Campaigns](https://docs.mailtrap.io/email-marketing/campaigns.md).

## Common mistakes

| Mistake                                             | Fix                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hitting rate limits with one-by-one creates         | Use `/contacts/imports` for bulk loads (respect 50k per request) and backoff |
| Treating marketing contacts as sending suppressions | Use **Suppressions** for blocked recipients on send streams                  |

## Limitations

- Contact API shapes can change; check Mailtrap's current OpenAPI spec before generating request bodies.
