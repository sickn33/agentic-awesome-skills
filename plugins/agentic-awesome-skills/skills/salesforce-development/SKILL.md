---
name: salesforce-development
description: Expert patterns for Salesforce platform development including
  Lightning Web Components (LWC), Apex triggers and classes, REST/Bulk APIs,
  Connected Apps, and Salesforce DX with scratch orgs and 2nd generation
  packages (2GP).
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Salesforce Development

Expert patterns for Salesforce platform development including Lightning Web
Components (LWC), Apex triggers and classes, REST/Bulk APIs, Connected Apps,
and Salesforce DX with scratch orgs and 2nd generation packages (2GP).

## Patterns

### Lightning Web Component with Wire Service

Use @wire decorator for reactive data binding with Lightning Data Service
or Apex methods. @wire fits LWC's reactive architecture and enables
Salesforce performance optimizations.

// myComponent.js
import { LightningElement, wire, api } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getRelatedRecords from '@salesforce/apex/MyController.getRelatedRecords';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import ACCOUNT_INDUSTRY from '@salesforce/schema/Account.Industry';

const FIELDS = [ACCOUNT_NAME, ACCOUNT_INDUSTRY];

export default class MyComponent extends LightningElement {
  @api recordId;  // Passed from parent or record page

  // Wire to Lightning Data Service (preferred for single records)
  @wire(getRecord, { recordId: '$recordId', fields: FIELDS })
  account;

  // Wire to Apex method (for complex queries)
  @wire(getRelatedRecords, { accountId: '$recordId' })
  wiredRecords({ error, data }) {
    if (data) {
      this.relatedRecords = data;
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.relatedRecords = undefined;
    }
  }

  get accountName() {
    return getFieldValue(this.account.data, ACCOUNT_NAME);
  }

  get isLoading() {
    return !this.account.data && !this.account.error;
  }

  // Reactive: changing recordId automatically re-fetches
}

// myComponent.html
<template>
  <lightning-card title={accountName}>
    <template if:true={isLoading}>
      <lightning-spinner alternative-text="Loading"></lightning-spinner>
    </template>

    <template if:true={account.data}>
      <p>Industry: {industry}</p>
    </template>

    <template if:true={error}>
      <p class="slds-text-color_error">{error.body.message}</p>
    </template>
  </lightning-card>
</template>

// MyController.cls
public with sharing class MyController {
  @AuraEnabled(cacheable=true)
  public static List<Contact> getRelatedRecords(Id accountId) {
    return [
      SELECT Id, Name, Email, Phone
      FROM Contact
      WHERE AccountId = :accountId
      WITH SECURITY_ENFORCED
      LIMIT 100
    ];
  }
}

### Context

- building LWC components
- fetching Salesforce data
- reactive UI

### Bulkified Apex Trigger with Handler Pattern

Apex triggers must be bulkified to handle 200+ records per transaction.
Use handler pattern for separation of concerns, testability, and
recursion prevention.

// AccountTrigger.trigger
trigger AccountTrigger on Account (
  before insert, before update, before delete,
  after insert, after update, after delete, after undelete
) {
  new AccountTriggerHandler().run();
}

// TriggerHandler.cls (base class)
public virtual class TriggerHandler {
  // Recursion prevention
  private static Set<String> executedHandlers = new Set<String>();

  public void run() {
    String handlerName = String.valueOf(this).split(':')[0];

    // Prevent recursion
    String contextKey = handlerName + '_' + Trigger.operationType;
    if (executedHandlers.contains(contextKey)) {
      return;
    }
    executedHandlers.add(contextKey);

    switch on Trigger.operationType {
      when BEFORE_INSERT { this.beforeInsert(); }
      when BEFORE_UPDATE { this.beforeUpdate(); }
      when BEFORE_DELETE { this.beforeDelete(); }
      when AFTER_INSERT { this.afterInsert(); }
      when AFTER_UPDATE { this.afterUpdate(); }
      when AFTER_DELETE { this.afterDelete(); }
      when AFTER_UNDELETE { this.afterUndelete(); }
    }
  }

  // Override in child classes
  protected virtual void beforeInsert() {}
  protected virtual void beforeUpdate() {}
  protected virtual void beforeDelete() {}
  protected virtual void afterInsert() {}
  protected virtual void afterUpdate() {}
  protected virtual void afterDelete() {}
  protected virtual void afterUndelete() {}
}

// AccountTriggerHandler.cls
public class AccountTriggerHandler extends TriggerHandler {
  private List<Account> newAccounts;
  private List<Account> oldAccounts;
  private Map<Id, Account> newMap;
  private Map<Id, Account> oldMap;

  public AccountTriggerHandler() {
    this.newAccounts = (List<Account>) Trigger.new;
    this.oldAccounts = (List<Account>) Trigger.old;
    this.newMap = (Map<Id, Account>) Trigger.newMap;
    this.oldMap = (Map<Id, Account>) Trigger.oldMap;
  }

  protected override void afterInsert() {
    createDefaultContacts();
    notifySlack();
  }

  protected override void afterUpdate() {
    handleIndustryChange();
  }

  // BULKIFIED: Query once, update once
  private void createDefaultContacts() {
    List<Contact> contactsToInsert = new List<Contact>();

    for (Account acc : newAccounts) {
      if (acc.Type == 'Prospect') {
        contactsToInsert.add(new Contact(
          AccountId = acc.Id,
          LastName = 'Primary Contact',
          Email = 'contact@' + acc.Website
        ));
      }
    }

    if (!contactsToInsert.isEmpty()) {
      insert contactsToInsert;  // Single DML for all
    }
  }

  private void handleIndustryChange() {
    Set<Id> changedAccountIds = new Set<Id>();

    for (Account acc : newAccounts) {
      Account oldAcc = oldMap.get(acc.Id);
      if (acc.Industry != oldAcc.Industry) {
        changedAccountIds.add(acc.Id);
      }
    }

    if (!changedAccountIds.isEmpty()) {
      // Queue async processing for heavy work
      System.enqueueJob(new IndustryChangeQueueable(changedAccountIds));
    }
  }

  private void notifySlack() {
    // Offload callouts to async
    List<Id> accountIds = new List<Id>(newMap.keySet());
    System.enqueueJob(new SlackNotificationQueueable(accountIds));
  }
}

### Context

- apex triggers
- data operations
- automation

### Queueable Apex for Async Processing

Use Queueable Apex for async processing with support for non-primitive
types, monitoring via AsyncApexJob, and job chaining. Limit: 50 jobs
per transaction, 1 child job when chaining.

// IndustryChangeQueueable.cls
public class IndustryChangeQueueable implements Queueable, Database.AllowsCallouts {
  private Set<Id> accountIds;
  private Integer retryCount;

  public IndustryChangeQueueable(Set<Id> accountIds) {
    this(accountIds, 0);
  }

  public IndustryChangeQueueable(Set<Id> accountIds, Integer retryCount) {
    this.accountIds = accountIds;
    this.retryCount = retryCount;
  }

  public void execute(QueueableContext context) {
    try {
      // Query with fresh data
      List<Account> accounts = [
        SELECT Id, Name, Industry, OwnerId
        FROM Account
        WHERE Id IN :accountIds
        WITH SECURITY_ENFORCED
      ];

      // Process and make callout
      for (Account acc : accounts) {
        syncToExternalSystem(acc);
      }

      // Update records
      updateRelatedOpportunities(accountIds);

    } catch (Exception e) {
      handleError(e);
    }
  }

  private void syncToExternalSystem(Account acc) {
    HttpRequest req = new HttpRequest();
    req.setEndpoint('callout:ExternalCRM/accounts');
    req.setMethod('POST');
    req.setHeader('Content-Type', 'application/json');
    req.setBody(JSON.serialize(new Map<String, Object>{
      'salesforceId' => acc.Id,
      'name' => acc.Name,
      'industry' => acc.Industry
    }));

    Http http = new Http();
    HttpResponse res = http.send(req);

    if (res.getStatusCode() != 200 && res.getStatusCode() != 201) {
      throw new CalloutException('Sync failed: ' + res.getBody());
    }
  }

  private void updateRelatedOpportunities(Set<Id> accIds) {
    List<Opportunity> oppsToUpdate = [
      SELECT Id, Industry__c, AccountId
      FROM Opportunity
      WHERE AccountId IN :accIds
      WITH SECURITY_ENFORCED
    ];

    Map<Id, Account> accountMap = new Map<Id, Account>([
      SELECT Id, Industry FROM Account WHERE Id IN :accIds
    ]);

    for (Opportunity opp : oppsToUpdate) {
      opp.Industry__c = accountMap.get(opp.AccountId).Industry;
    }

    if (!oppsToUpdate.isEmpty()) {
      update oppsToUpdate;
    }
  }

  private void handleError(Exception e) {
    // Log error
    System.debug(LoggingLevel.ERROR, 'Queueable failed: ' + e.getMessage());

    // Retry with exponential backoff (max 3 retries)
    if (retryCount < 3) {
      // Chain new job for retry
      System.enqueueJob(new IndustryChangeQueueable(accountIds, retryCount + 1));
    } else {
      // Create error record for monitoring
      insert new Integration_Error__c(
        Type__c = 'Industry Sync',
        Message__c = e.getMessage(),
        Stack_Trace__c = e.getStackTraceString(),
        Record_Ids__c = String.join(new List<Id>(accountIds), ',')
      );
    }
  }
}

### Context

- async processing
- long-running operations
- callouts from triggers

### REST API Integration with Connected App

External integrations use Connected Apps with OAuth 2.0. JWT Bearer flow
for server-to-server, Web Server flow for user-facing apps. Always use
Named Credentials for secure callout configuration.

// Node.js - JWT Bearer Flow (server-to-server)
import jwt from 'jsonwebtoken';
import fs from 'fs';

class SalesforceClient {
  private accessToken: string | null = null;
  private instanceUrl: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private clientId: string,
    private username: string,
    private privateKeyPath: string,
    private loginUrl: string = 'https://login.salesforce.com'
  ) {}

  async authenticate(): Promise<void> {
    // Check if token is still valid (5 min buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return;
    }

    const privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');

    // Create JWT assertion
    const claim = {
      iss: this.clientId,
      sub: this.username,
      aud: this.loginUrl,
      exp: Math.floor(Date.now() / 1000) + 300  // 5 minutes
    };

    const assertion = jwt.sign(claim, privateKey, { algorithm: 'RS256' });

    // Exchange JWT for access token
    const response = await fetch(`${this.loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Auth failed: ${error.error_description}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.instanceUrl = data.instance_url;
    this.tokenExpiry = Date.now() + 7200000;  // 2 hours
  }

  async query(soql: string): Promise<any> {
    await this.authenticate();

    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json();
  }

  async createRecord(sobject: string, data: object): Promise<any> {
    await this.authenticate();

    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/sobjects/${sobject}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json();
  }

  private async handleError(response: Response): Promise<never> {
    const error = await response.json();

    if (response.status === 401) {
      // Token expired, clear and retry
      this.accessToken = null;
      throw new Error('Session expired, retry required');
    }

    throw new Error(`API Error: ${JSON.stringify(error)}`);
  }
}

// Usage
const sf = new SalesforceClient(
  process.env.SF_CLIENT_ID!,
  process.env.SF_USERNAME!,
  './certificates/server.key'
);

const accounts = await sf.query(
  "SELECT Id, Name FROM Account WHERE CreatedDate = TODAY"
);

### Context

- external integration
- REST API access
- connected apps

### Bulk API 2.0 for Large Data Operations

Use Bulk API 2.0 for operations on 10K+ records. Asynchronous processing
with job-based workflow. Part of REST API with streamlined interface
compared to original Bulk API.

// Node.js - Bulk API 2.0 insert
class SalesforceBulkClient extends SalesforceClient {

  async bulkInsert(sobject: string, records: object[]): Promise<any> {
    await this.authenticate();

    // Step 1: Create job
    const job = await this.createBulkJob(sobject, 'insert');

    try {
      // Step 2: Upload data (CSV format)
      await this.uploadJobData(job.id, records);

      // Step 3: Close job to start processing
      await this.closeJob(job.id);

      // Step 4: Poll for completion
      return await this.waitForJobCompletion(job.id);

    } catch (error) {
      // Abort job on error
      await this.abortJob(job.id);
      throw error;
    }
  }

  private async createBulkJob(sobject: string, operation: string): Promise<any> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          object: sobject,
          operation,
          contentType: 'CSV',
          lineEnding: 'LF'
        })
      }
    );

    return response.json();
  }

  private async uploadJobData(jobId: string, records: object[]): Promise<void> {
    // Convert to CSV
    const csv = this.recordsToCSV(records);

    await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}/batches`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'text/csv'
        },
        body: csv
      }
    );
  }

  private async closeJob(jobId: string): Promise<void> {
    await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: 'UploadComplete' })
      }
    );
  }

  private async waitForJobCompletion(jobId: string): Promise<any> {
    const maxWaitTime = 10 * 60 * 1000;  // 10 minutes
    const pollInterval = 5000;  // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const response = await fetch(
        `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}`,
        {
          headers: { 'Authorization': `Bearer ${this.accessToken}` }
        }
      );

      const job = await response.json();

      if (job.state === 'JobComplete') {
        // Get results
        return {
          success: job.numberRecordsProcessed - job.numberRecordsFailed,
          failed: job.numberRecordsFailed,
          failedResults: job.numberRecordsFailed > 0
            ? await this.getFailedResults(jobId)
            : []
        };
      }

      if (job.state === 'Failed' || job.state === 'Aborted') {
        throw new Error(`Bulk job failed: ${job.state}`);
      }

      await new Promise(r => setTimeout(r, pollInterval));
    }

    throw new Error('Bulk job timeout');
  }

  private async getFailedResults(jobId: string): Promise<any[]> {
    const response = await fetch(
      `${this.instanceUrl}/services/data/v59.0/jobs/ingest/${jobId}/failedResults`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );

    const csv = await response.text();
    return this.parseCSV(csv);
  }

  private recordsToCSV(records: object[]): string {
    if (records.length === 0) return '';

    const headers = Object.keys(records[0]);
    const rows = records.map(r =>
      headers.map(h => this.escapeCSV(r[h])).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  private escapeCSV(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

### Context

- large data volumes
- data migration
- bulk operations

### Salesforce DX with Scratch Orgs

Source-driven development with disposable scratch orgs for isolated
testing. Scratch orgs exist 7-30 days and can be created throughout
the day, unlike sandbox refresh limits.

// project-scratch-def.json - Scratch org definition
{
  "orgName": "MyApp Dev Org",
  "edition": "Developer",
  "features": ["EnableSetPasswordInApi", "Communities"],
  "settings": {
    "lightningExperienceSettings": {
      "enableS1DesktopEnabled": true
    },
    "mobileSettings": {
      "enableS1EncryptedStoragePref2": false
    },
    "securitySettings": {
      "passwordPolicies": {
        "enableSetPasswordInApi": true
      }
    }
  }
}

// sfdx-project.json - Project configuration
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "MyPackage",
      "versionName": "ver 1.0",
      "versionNumber": "1.0.0.NEXT",
      "dependencies": [
        {
          "package": "SomePackage@2.0.0"
        }
      ]
    }
  ],
  "namespace": "myns",
  "sfdcLoginUrl": "https://login.salesforce.com",
  "sourceApiVersion": "59.0"
}

# Development workflow commands
# 1. Create scratch org
sf org create scratch \
  --definition-file config/project-scratch-def.json \
  --alias myapp-dev \
  --duration-days 7 \
  --set-default

# 2. Push source to scratch org
sf project deploy start --target-org myapp-dev

# 3. Assign permission set
sf org assign permset --name MyApp_Admin --target-org myapp-dev

# 4. Import sample data
sf data import tree --plan data/sample-data-plan.json --target-org myapp-dev

# 5. Open org
sf org open --target-org myapp-dev

# 6. Run tests
sf apex run test \
  --code-coverage \
  --result-format human \
  --wait 10 \
  --target-org myapp-dev

# 7. Pull changes back
sf project retrieve start --target-org myapp-dev

### Context

- development workflow
- CI/CD
- testing

### 2nd Generation Package (2GP) Development

2GP replaces 1GP with source-driven, modular packaging. Requires Dev Hub
with 2GP enabled, namespace linked, and 75% code coverage for promoted
packages.

# Enable Dev Hub and 2GP in Setup:
# Setup > Dev Hub > Enable Dev Hub
# Setup > Dev Hub > Enable Unlocked Packages and 2GP

# Link namespace (required for managed packages)
sf package create \
  --name "MyManagedPackage" \
  --package-type Managed \
  --path force-app \
  --target-dev-hub DevHub

# Create package version (beta)
sf package version create \
  --package "MyManagedPackage" \
  --installation-key-bypass \
  --wait 30 \
  --code-coverage \
  --target-dev-hub DevHub

# Check version status
sf package version list --packages "MyManagedPackage" --target-dev-hub DevHub

# Promote to released (requires 75% coverage)
sf package version promote \
  --package "MyManagedPackage@1.0.0-1" \
  --target-dev-hub DevHub

# Install in sandbox for testing
sf package install \
  --package "MyManagedPackage@1.0.0-1" \
  --target-org MySandbox \
  --wait 20

# CI/CD Pipeline (GitHub Actions)
# .github/workflows/salesforce-ci.yml
name: Salesforce CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Salesforce CLI
        run: npm install -g @salesforce/cli

      - name: Authenticate Dev Hub
        run: |
          echo "${{ secrets.SFDX_AUTH_URL }}" > auth.txt
          sf org login sfdx-url --sfdx-url-file auth.txt --alias DevHub --set-default-dev-hub

      - name: Create Scratch Org
        run: |
          sf org create scratch \
            --definition-file config/project-scratch-def.json \
            --alias ci-scratch \
            --duration-days 1 \
            --set-default

      - name: Deploy Source
        run: sf project deploy start --target-org ci-scratch

      - name: Run Tests
        run: |
          sf apex run test \
            --code-coverage \
            --result-format human \
            --wait 20 \
            --target-org ci-scratch

      - name: Delete Scratch Org
        if: always()
        run: sf org delete scratch --target-org ci-scratch --no-prompt

### Context

- packaging
- ISV development
- AppExchange

## Sharp Edges

### Governor Limits Apply Per Transaction, Not Per Record

Severity: CRITICAL

### @wire Results Are Cached and May Be Stale

Severity: HIGH

### LWC Properties Are Case-Sensitive

Severity: MEDIUM

### Null Pointer Exceptions in Apex Collections

Severity: HIGH

### Trigger Recursion Causes Infinite Loops

Severity: CRITICAL

### Cannot Make Callouts from Synchronous Triggers

Severity: HIGH

### Cannot Mix Setup and Non-Setup DML

Severity: HIGH

### Dynamic SOQL Is Vulnerable to Injection

Severity: CRITICAL

### Scratch Orgs Expire and Lose All Data

Severity: MEDIUM

### API Version Mismatches Cause Silent Failures

Severity: MEDIUM

## Validation Checks

### SOQL Query Inside Loop

Severity: ERROR

SOQL in loops causes governor limit exceptions with bulk data

Message: SOQL query inside loop. Query once outside the loop and use a Map.

### DML Operation Inside Loop

Severity: ERROR

DML in loops hits 150 statement limit

Message: DML operation inside loop. Collect records and perform single DML outside loop.

### HTTP Callout in Trigger

Severity: ERROR

Synchronous triggers cannot make callouts

Message: Callout in trigger. Use @future(callout=true) or Queueable with Database.AllowsCallouts.

### Potential SOQL Injection

Severity: ERROR

Dynamic SOQL with string concatenation is vulnerable

Message: Dynamic SOQL with concatenation. Use bind variables or String.escapeSingleQuotes().

### Missing WITH SECURITY_ENFORCED

Severity: WARNING

SOQL should enforce FLS/CRUD permissions

Message: SOQL without security enforcement. Add WITH SECURITY_ENFORCED.

### Hardcoded Salesforce ID

Severity: WARNING

Record IDs differ between orgs

Message: Hardcoded Salesforce ID. Query by DeveloperName or ExternalId instead.

### Hardcoded Credentials

Severity: ERROR

Credentials must use Named Credentials or Custom Metadata

Message: Hardcoded credentials. Use Named Credentials or Custom Metadata.

### Direct DOM Manipulation in LWC

Severity: WARNING

LWC uses shadow DOM, direct manipulation breaks encapsulation

Message: Direct DOM access in LWC. Use this.template.querySelector() or data binding.

### Reactive Property Without @track

Severity: INFO

Complex object properties need @track for reactivity

Message: Object assignment may need @track for reactivity (post-Spring '20 objects are auto-tracked).

### Wire Without Refresh After DML

Severity: WARNING

Cached wire data becomes stale after updates

Message: DML after @wire without refreshApex. Data may be stale.

## Collaboration

### Delegation Triggers

- user needs external API integration -> backend (REST API design, external system sync)
- user needs complex UI beyond LWC -> frontend (Custom portal with React/Next.js)
- user needs HubSpot integration -> hubspot-integration (Salesforce-HubSpot sync patterns)
- user needs data warehouse sync -> data-engineer (ETL from Salesforce to warehouse)
- user needs payment processing -> stripe-integration (Beyond Salesforce Billing)
- user needs advanced auth -> auth-specialist (SSO, SAML, custom portals)

## When to Use
- User mentions or implies: salesforce
- User mentions or implies: sfdc
- User mentions or implies: apex
- User mentions or implies: lwc
- User mentions or implies: lightning web components
- User mentions or implies: sfdx
- User mentions or implies: scratch org
- User mentions or implies: visualforce
- User mentions or implies: soql
- User mentions or implies: governor limits
- User mentions or implies: connected app

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
