---
name: hubspot-integration
description: Expert patterns for HubSpot CRM integration including OAuth
  authentication, CRM objects, associations, batch operations, webhooks, and
  custom objects. Covers Node.js and Python SDKs.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# HubSpot Integration

Expert patterns for HubSpot CRM integration including OAuth authentication,
CRM objects, associations, batch operations, webhooks, and custom objects.
Covers Node.js and Python SDKs.

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
function getAuthUrl(): string {
  const authUrl = new URL("https://app.hubspot.com/oauth/authorize");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  return authUrl.toString();
}

// Step 2: Handle OAuth callback
async function handleOAuthCallback(code: string) {
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

  const tokens = await response.json();
  // {
  //   access_token: "xxx",
  //   refresh_token: "xxx",
  //   expires_in: 1800  // 30 minutes
  // }

  // Store tokens securely
  await storeTokens(tokens);

  return tokens;
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

  return response.json();
}

// Step 4: Create authenticated client
function createClient(accessToken: string): Client {
  const hubspotClient = new Client({ accessToken });
  return hubspotClient;
}

### Notes

- Access tokens expire in 30 minutes
- Refresh tokens before expiry
- Store refresh tokens securely
- Rotate tokens every 6 months

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
// But should be rotated every 6 months for security

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
    if (error.code === 429) {
      // Rate limited - implement backoff
      const retryAfter = error.headers?.["retry-after"] || 10;
      await sleep(retryAfter * 1000);
      return getContacts();
    }
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
- Recommended: Rotate every 6 months

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
async function updateContact(contactId: string, properties: object) {
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
  updates: Array<{ id: string; properties: object }>
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
      await sleep(100);  // 100ms between batches
    }
  }

  return results;
}

### Notes

- Max 100 items per batch request
- Saves up to 80% of rate limit quota
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

// Webhook signature validation
function validateWebhookSignature(
  requestBody: string,
  signature: string,
  clientSecret: string
): boolean {
  // For v2 signature (most common)
  const expectedSignature = crypto
    .createHmac("sha256", clientSecret)
    .update(requestBody)
    .digest("hex");

  return signature === expectedSignature;
}

// Express webhook handler
app.post("/webhooks/hubspot", async (req, res) => {
  const signature = req.headers["x-hubspot-signature-v3"] as string;
  const timestamp = req.headers["x-hubspot-request-timestamp"] as string;
  const requestBody = JSON.stringify(req.body);

  // Validate signature
  const isValid = validateWebhookSignature(
    requestBody,
    signature,
    process.env.HUBSPOT_CLIENT_SECRET
  );

  if (!isValid) {
    console.error("Invalid webhook signature");
    return res.status(401).send("Unauthorized");
  }

  // Check timestamp (prevent replay attacks)
  const timestampAge = Date.now() - parseInt(timestamp);
  if (timestampAge > 300000) {  // 5 minutes
    console.error("Webhook timestamp too old");
    return res.status(401).send("Timestamp expired");
  }

  // Process events - respond quickly!
  const events = req.body;

  // Queue for async processing
  for (const event of events) {
    await queue.add("hubspot-webhook", event);
  }

  // Respond immediately
  res.status(200).send("OK");
});

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
  budget: number;
}) {
  const response = await hubspotClient.crm.objects.basicApi.create(
    "projects",  // Custom object name
    { properties: data }
  );

  return response;
}

// READ custom object by ID
async function getProject(projectId: string) {
  const response = await hubspotClient.crm.objects.basicApi.getById(
    "projects",
    projectId,
    ["project_name", "status", "budget", "start_date"]
  );

  return response;
}

// UPDATE custom object
async function updateProject(projectId: string, properties: object) {
  const response = await hubspotClient.crm.objects.basicApi.update(
    "projects",
    projectId,
    { properties }
  );

  return response;
}

// SEARCH custom objects
async function searchProjects(status: string) {
  const response = await hubspotClient.crm.objects.searchApi.doSearch(
    "projects",
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

- Custom objects require Enterprise tier
- Max 10 custom objects per account
- Use crm.objects API with object name as parameter
- Can associate with standard and other custom objects

## Sharp Edges

### Rate Limits Vary by App Type and Hub Tier

Severity: HIGH

### 5% Error Rate Threshold for Marketplace Apps

Severity: HIGH

### API Keys Deprecated - Use OAuth or Private App Tokens

Severity: CRITICAL

### OAuth Access Tokens Expire in 30 Minutes

Severity: HIGH

### Webhook Requests Must Be Validated

Severity: CRITICAL

### All List Endpoints Require Pagination

Severity: MEDIUM

### Associations v4 API Has Breaking Changes

Severity: HIGH

### Polling Limited to 100,000 Requests Per Day

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

### Delegation Triggers

- user needs email marketing automation -> email-marketing (Beyond HubSpot's built-in email tools)
- user needs custom CRM UI -> frontend (Building portal or dashboard)
- user needs data pipeline -> data-engineer (ETL from HubSpot to warehouse)
- user needs Salesforce integration -> salesforce-development (HubSpot + Salesforce sync)
- user needs payment processing -> stripe-integration (Payments beyond HubSpot quotes)
- user needs analytics dashboard -> analytics-specialist (Custom reporting beyond HubSpot)

## When to Use
- User mentions or implies: hubspot
- User mentions or implies: hubspot api
- User mentions or implies: hubspot crm
- User mentions or implies: hubspot integration
- User mentions or implies: contacts api

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
