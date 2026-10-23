# HubSpot Integration - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Integration and authority contract

Independent historical sketches, not a complete tested app. Pin HubSpot SDK/API versions and validate actual object properties, association labels, scopes, product entitlements and limits. Initialize required configuration explicitly; non-null assertions do not validate environment values. Protect tokens in server-side tenant-bound storage; do not return them to a browser, log them or share accounts across clients. User authorization must cover CRM reads/writes, associations, archiving, webhooks and schema creation; an installed SDK is not permission. Review code before execution, use synthetic test records, and do not launch other agents automatically from role suggestions.

OAuth requires cryptographically random, expiring, single-use state bound to the initiating session and intended tenant/account, an exact allowed redirect and callback error handling. Verify state before exchanging code; use supported PKCE where applicable. Store tokens with actual expires_in, refresh safely with concurrency control and persist rotated refresh tokens. Validate status/body schema, add timeout/cancellation and redact errors. A callback code alone does not establish account ownership or prevent login CSRF.

## Patterns

### OAuth 2.0 Authentication

Secure authentication for public apps

**When to use**: Building public app or multi-account integration

### Template

// OAuth 2.0 flow for HubSpot
import { Client } from "@hubspot/api-client";

// Environment variables
const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;
const SCOPES = "crm.objects.contacts.read crm.objects.contacts.write";

// Step 1: Generate authorization URL
function getAuthUrl(state: string): string {
  // state is generated/stored server-side and bound to this session; never arbitrary input.
  const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}

// Step 2: Handle OAuth callback
async function handleOAuthCallback(code: string, state: string, sessionId: string) {
  await consumeAndVerifyOAuthState(state, sessionId); // required atomic application adapter
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      code: code,
    }),
  });

  if (!response.ok) throw new Error(`OAuth exchange status ${response.status}`);
  const tokens = await response.json(); // validate token schema before storage
  // {
  //   access_token: "xxx",
  //   refresh_token: "xxx",
  //   expires_in: 1800  // 30 minutes
  // }

  // Store tokens securely
  await storeTokens(tokens);

  return { connected: true }; // do not expose access/refresh tokens to the browser
}

// Step 3: Refresh access token (before expiry)
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) throw new Error(`OAuth refresh status ${response.status}`);
  return response.json(); // validate and atomically persist new tokens/expiry
}

// Step 4: Create authenticated client
function createClient(accessToken: string): Client {
  const hubspotClient = new Client({ accessToken });
  return hubspotClient;
}

### Notes

- Use actual expires_in from the token response; do not hardcode30minutes
- Refresh tokens before expiry
- Store refresh tokens securely
- Follow actual provider/security policy and revoke on compromise; no universal6-month rule

### Private App Token

Authentication for single-account integrations

**When to use**: Building internal integration for one HubSpot account

### Template

// Private App Token - simpler for single account
import { Client } from "@hubspot/api-client";

// Create client with private app token
const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_PRIVATE_APP_TOKEN,
});

// Private app tokens don't expire
// Validate revocation/rotation behavior under the actual app/security policy.

// Example: Get contacts
async function getContacts() {
  try {
    const response = await hubspotClient.crm.contacts.basicApi.getPage(
      100,  // limit
      undefined,  // after cursor
      ["firstname", "lastname", "email", "phone"],  // properties
    );

    return response.results;
  } catch (error) {
    // Do not recursively retry forever. A shared adapter must classify the
    // pinned SDK status/header shape, honor Retry-After and use bounded
    // attempts, jitter and total deadline. Never blindly retry a write.
    throw error;
  }
}

// Python equivalent
// from hubspot import HubSpot
//
// client = HubSpot(access_token=os.environ["HUBSPOT_PRIVATE_APP_TOKEN"])
//
// contacts = client.crm.contacts.basic_api.get_page(
//     limit=100,
//     properties=["firstname", "lastname", "email"]
// )

### Notes

- Private app tokens don't expire
- All private apps share daily rate limit
- Each private app has own burst limit
- Set rotation/revocation under the actual provider/security policy

### CRM Object CRUD Operations

Create, read, update, delete CRM records

**When to use**: Working with contacts, companies, deals, tickets

### Template

import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_TOKEN,
});

// CREATE contact
async function createContact(data: {
  email: string;
  firstname: string;
  lastname: string;
}) {
  const response = await hubspotClient.crm.contacts.basicApi.create({
    properties: {
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname,
    },
  });

  return response;
}

// READ contact by ID
async function getContact(contactId: string) {
  const response = await hubspotClient.crm.contacts.basicApi.getById(
    contactId,
    ["firstname", "lastname", "email", "phone", "company"],
  );

  return response;
}

// UPDATE contact
async function updateContact(contactId: string, properties: Record<string, string>) {
  const response = await hubspotClient.crm.contacts.basicApi.update(
    contactId,
    { properties },
  );

  return response;
}

// DELETE contact
async function deleteContact(contactId: string) {
  await hubspotClient.crm.contacts.basicApi.archive(contactId);
}

// SEARCH contacts
async function searchContacts(query: string) {
  const response = await hubspotClient.crm.contacts.searchApi.doSearch({
    query,
    limit: 100,
    properties: ["firstname", "lastname", "email"],
    sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
  });

  return response.results;
}

// LIST with pagination
async function getAllContacts() {
  const allContacts = [];
  let after = undefined;

  do {
    const response = await hubspotClient.crm.contacts.basicApi.getPage(
      100,
      after,
      ["firstname", "lastname", "email"],
    );

    allContacts.push(...response.results);
    after = response.paging?.next?.after;
  } while (after);

  return allContacts;
}

### Notes

- Use properties param to fetch only needed fields
- Search API has 10k result limit
- Always implement pagination for lists
- Archive (soft delete) vs. GDPR delete available

### Batch Operations

Bulk create, update, or read records efficiently

**When to use**: Processing multiple records (reduce rate limit usage)

### Template

import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_TOKEN,
});

// BATCH CREATE contacts (up to 100 per batch)
async function batchCreateContacts(contacts: Array<{
  email: string;
  firstname: string;
  lastname: string;
}>) {
  const inputs = contacts.map((contact) => ({
    properties: {
      email: contact.email,
      firstname: contact.firstname,
      lastname: contact.lastname,
    },
  }));

  const response = await hubspotClient.crm.contacts.batchApi.create({
    inputs,
  });

  return response.results;
}

// BATCH UPDATE contacts
async function batchUpdateContacts(
  updates: Array<{ id: string; properties: Record<string, string> }>
) {
  const inputs = updates.map(({ id, properties }) => ({
    id,
    properties,
  }));

  const response = await hubspotClient.crm.contacts.batchApi.update({
    inputs,
  });

  return response.results;
}

// BATCH READ contacts by ID
async function batchReadContacts(
  ids: string[],
  properties: string[] = ["firstname", "lastname", "email"]
) {
  const response = await hubspotClient.crm.contacts.batchApi.read({
    inputs: ids.map((id) => ({ id })),
    properties,
  });

  return response.results;
}

// BATCH ARCHIVE contacts
async function batchDeleteContacts(ids: string[]) {
  await hubspotClient.crm.contacts.batchApi.archive({
    inputs: ids.map((id) => ({ id })),
  });
}

// Process large dataset in chunks
async function processLargeDataset(allContacts: any[]) {
  const BATCH_SIZE = 100;
  const results = [];

  for (let i = 0; i < allContacts.length; i += BATCH_SIZE) {
    const batch = allContacts.slice(i, i + BATCH_SIZE);
    const batchResults = await batchCreateContacts(batch);
    results.push(...batchResults);

    // Respect rate limits - wait between batches
    if (i + BATCH_SIZE < allContacts.length) {
      await configuredRateLimiter.wait(); //100ms is not a universal safe quota
    }
  }

  return results;
}

### Notes

- Max 100 items per batch request
- Request savings depend on endpoint, batch size and quota rules; no universal80% gain
- Batch operations are atomic per item (partial success possible)
- Check response.errors for failed items

### Associations v4 API

Create relationships between CRM records

**When to use**: Linking contacts to companies, deals, etc.

### Template

import { Client, AssociationTypes } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_TOKEN,
});

// CREATE association (Contact to Company)
async function associateContactToCompany(
  contactId: string,
  companyId: string
) {
  await hubspotClient.crm.associations.v4.basicApi.create(
    "contacts",
    contactId,
    "companies",
    companyId,
    [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: AssociationTypes.contactToCompany,
      },
    ]
  );
}

// CREATE association (Deal to Contact)
async function associateDealToContact(dealId: string, contactId: string) {
  await hubspotClient.crm.associations.v4.basicApi.create(
    "deals",
    dealId,
    "contacts",
    contactId,
    [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: 3,  // deal_to_contact
      },
    ]
  );
}

// GET associations for a record
async function getContactCompanies(contactId: string) {
  const response = await hubspotClient.crm.associations.v4.basicApi.getPage(
    "contacts",
    contactId,
    "companies",
    undefined,
    500
  );

  return response.results;
}

// CREATE association with custom label
async function createLabeledAssociation(
  contactId: string,
  companyId: string,
  labelId: number  // Custom association label ID
) {
  await hubspotClient.crm.associations.v4.basicApi.create(
    "contacts",
    contactId,
    "companies",
    companyId,
    [
      {
        associationCategory: "USER_DEFINED",
        associationTypeId: labelId,
      },
    ]
  );
}

// BATCH create associations
async function batchAssociateContactsToCompany(
  contactIds: string[],
  companyId: string
) {
  const inputs = contactIds.map((contactId) => ({
    _from: { id: contactId },
    to: { id: companyId },
    types: [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: AssociationTypes.contactToCompany,
      },
    ],
  }));

  await hubspotClient.crm.associations.v4.batchApi.create(
    "contacts",
    "companies",
    { inputs }
  );
}

// Common association type IDs
// Contact to Company: 1
// Company to Contact: 2
// Deal to Contact: 3
// Contact to Deal: 4
// Deal to Company: 5
// Company to Deal: 6

### Notes

- Requires SDK version 9.0.0+ for v4 API
- Association labels supported for custom relationships
- Use batch API for multiple associations
- HUBSPOT_DEFINED for standard, USER_DEFINED for custom labels

### Webhook Handling

Receive real-time notifications from HubSpot

**When to use**: Need instant updates on CRM changes

### Template

import crypto from "crypto";
import { Client } from "@hubspot/api-client";

// v3 signature validation uses actual raw body, method, normalized original URI
// and timestamp, not the historical body-only/v2-mislabeled HMAC recipe.
// This is a verifier fragment: supply raw-body middleware and trusted URI adapter.
function validateV3(
  method: string, normalizedUri: string, rawBody: string,
  timestamp: string, signature: string, clientSecret: string, now = Date.now(),
): boolean {
  if (!/^\d+$/.test(timestamp) || !clientSecret) return false;
  const signedAt = Number(timestamp);
  if (!Number.isSafeInteger(signedAt) || signedAt > now + 30_000 || now - signedAt > 300_000) return false;
  const expected = crypto.createHmac('sha256', clientSecret)
    .update(method + normalizedUri + rawBody + timestamp, 'utf8').digest('base64');
  const actual = Buffer.from(signature, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return actual.length === wanted.length && crypto.timingSafeEqual(actual, wanted);
}

// Handler procedure (application adapters deliberately not invented):
// 1. Read bounded raw bytes before JSON middleware. Reject missing/duplicate headers.
// 2. Reconstruct original public URI from trusted fixed config/proxy rules and
//    apply HubSpot's documented selective URI decoding; not decodeURIComponent all.
// 3. Select the documented signature version for the actual app/event; never
//    downgrade after a failed v3 check. Validate BEFORE parsing/queueing.
// 4. Parse/schema-check a bounded event array; bind appId/portalId to the
//    installed tenant and allowed subscription/object/property scope.
// 5. Atomically persist an idempotent inbox/queue and acknowledge promptly;
//    enqueue failure must not return a false success. Deduplicate repeated delivery.
// 6. Authorize and idempotently apply work; events may be duplicated/out of order.

// Async processor
async function processWebhookEvent(event: any) {
  const { subscriptionType, objectId, propertyName, propertyValue } = event;

  switch (subscriptionType) {
    case "contact.creation":
      await handleContactCreated(objectId);
      break;

    case "contact.propertyChange":
      await handleContactPropertyChange(objectId, propertyName, propertyValue);
      break;

    case "deal.creation":
      await handleDealCreated(objectId);
      break;

    case "contact.deletion":
      await handleContactDeleted(objectId);
      break;

    default:
      console.log(`Unhandled event: ${subscriptionType}`);
  }
}

// Webhook subscription types:
// contact.creation, contact.deletion, contact.propertyChange
// company.creation, company.deletion, company.propertyChange
// deal.creation, deal.deletion, deal.propertyChange

### Notes

- Validate signature before processing
- Respond within 5 seconds
- Queue heavy processing for async
- Max 1000 webhook subscriptions per app

### Custom Objects

Create and manage custom object types

**When to use**: Standard objects don't fit your data model

### Template

import { Client } from "@hubspot/api-client";

const hubspotClient = new Client({
  accessToken: process.env.HUBSPOT_TOKEN,
});

// CREATE custom object schema
async function createCustomObjectSchema() {
  const schema = {
    name: "projects",
    labels: {
      singular: "Project",
      plural: "Projects",
    },
    primaryDisplayProperty: "project_name",
    requiredProperties: ["project_name"],
    properties: [
      {
        name: "project_name",
        label: "Project Name",
        type: "string",
        fieldType: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "enumeration",
        fieldType: "select",
        options: [
          { label: "Active", value: "active" },
          { label: "Completed", value: "completed" },
          { label: "On Hold", value: "on_hold" },
        ],
      },
      {
        name: "budget",
        label: "Budget",
        type: "number",
        fieldType: "number",
      },
      {
        name: "start_date",
        label: "Start Date",
        type: "date",
        fieldType: "date",
      },
    ],
    associatedObjects: ["CONTACT", "COMPANY"],
  };

  const response = await hubspotClient.crm.schemas.coreApi.create(schema);
  return response;
}

// CREATE custom object record
async function createProject(data: {
  project_name: string;
  status: string;
  budget: string; // CRM numeric properties serialize according to actual schema
}) {
  const response = await hubspotClient.crm.objects.basicApi.create(
    configuredObjectTypeId,  // actual schema objectTypeId or supported fullyQualifiedName
    { properties: data }
  );

  return response;
}

// READ custom object by ID
async function getProject(projectId: string) {
  const response = await hubspotClient.crm.objects.basicApi.getById(
    configuredObjectTypeId,
    projectId,
    ["project_name", "status", "budget", "start_date"]
  );

  return response;
}

// UPDATE custom object
async function updateProject(projectId: string, properties: Record<string, string>) {
  const response = await hubspotClient.crm.objects.basicApi.update(
    configuredObjectTypeId,
    projectId,
    { properties }
  );

  return response;
}

// SEARCH custom objects
async function searchProjects(status: string) {
  const response = await hubspotClient.crm.objects.searchApi.doSearch(
    configuredObjectTypeId,
    {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "status",
              operator: "EQ",
              value: status,
            },
          ],
        },
      ],
      properties: ["project_name", "status", "budget"],
      limit: 100,
    }
  );

  return response.results;
}

### Notes

- Verify custom-object entitlement for the actual account and current API
- Verify current custom-object limits and add-ons for the actual account
- Use crm.objects API with object name as parameter
- Can associate with standard and other custom objects


## Pagination, partial success and safety

The simple getContacts/searchContacts/getContactCompanies examples return ONE page, not complete datasets. Every full traversal needs cursor/repeated-cursor detection, page/item/time/memory limits and resumable output; do not accumulate an unbounded CRM into RAM. Search caps and association/batch limits differ by endpoint/version.

Split batches within the actual endpoint count/byte quota and inspect individual results/errors, preserving source correlation. Current examples returning only response.results are incomplete handling and must not mark the entire batch successful. Reconcile ambiguous create outcomes by a stable external key before retrying; do not replay bulk creates blindly. Archive is a soft-delete action and is not erasure/compliance proof; permanent/privacy deletion is a separate authorized process. Update properties need an allowlist/runtime schema and tenant/object ownership checks, not arbitrary object forwarding.

OAuth token examples require timeouts, durable tenant binding and error schemas in the actual application. No script here has been compiled/run; missing sleep/storeTokens/queue/handlers and enum types are application adapters.

## Sharp Edges

### Rate Limits Vary by App Type and Hub Tier

Severity: HIGH

### 5% Error Rate Threshold for Marketplace Apps

Severity: HIGH

### API Keys Deprecated - Use OAuth or Private App Tokens

Severity: CRITICAL

### OAuth expiry must follow the actual token response

Severity: HIGH

### Webhook Requests Must Be Validated

Severity: CRITICAL

### All List Endpoints Require Pagination

Severity: MEDIUM

### Associations v4 API Has Breaking Changes

Severity: HIGH

### Verify the actual app/account/endpoint quota before polling

Severity: MEDIUM


## Validation Checks

### Hardcoded HubSpot API Key

Severity: ERROR

API keys must never be hardcoded

Message: Hardcoded HubSpot API key detected. Use environment variables. Note: API keys are deprecated - use Private App tokens.

### Hardcoded HubSpot Access Token

Severity: ERROR

Access tokens must use environment variables

Message: Hardcoded HubSpot access token. Use environment variables.

### Hardcoded Client Secret

Severity: ERROR

OAuth client secrets must be secured

Message: Hardcoded client secret. Use environment variables.

### Missing Webhook Signature Validation

Severity: ERROR

Webhook endpoints must validate HubSpot signatures

Message: Webhook endpoint without signature validation. Validate X-HubSpot-Signature-v3.

### Missing Rate Limit Handling

Severity: WARNING

API calls should handle 429 responses

Message: HubSpot API calls without rate limit handling. Implement retry logic with backoff.

### Unthrottled Parallel API Calls

Severity: WARNING

Parallel calls can exceed rate limits

Message: Parallel HubSpot API calls without throttling. Use rate limiter.

### Missing Pagination for List Calls

Severity: WARNING

List endpoints return paginated results

Message: API call without pagination handling. Implement cursor-based pagination.

### Individual Operations in Loop

Severity: INFO

Use batch operations for multiple items

Message: Individual API calls in loop. Consider batch operations for better performance.

### Token Storage Without Expiry

Severity: WARNING

OAuth tokens expire and need refresh logic

Message: Token storage without expiry tracking. Store expiresAt for refresh logic.

### Deprecated API Key Usage

Severity: ERROR

API keys are deprecated

Message: Using deprecated API key. Migrate to Private App token or OAuth 2.0.


## Collaboration

Role names below are optional planning suggestions, not installed tooling or permission to spawn agents or transfer CRM data.

### Delegation Triggers

- user needs email marketing automation -> email-marketing (Beyond HubSpot's built-in email tools)
- user needs custom CRM UI -> frontend (Building portal or dashboard)
- user needs data pipeline -> data-engineer (ETL from HubSpot to warehouse)
- user needs Salesforce integration -> salesforce-development (HubSpot + Salesforce sync)
- user needs payment processing -> stripe-integration (Payments beyond HubSpot quotes)
- user needs analytics dashboard -> analytics-specialist (Custom reporting beyond HubSpot)
