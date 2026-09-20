---
name: azure-monitor-audit
description: Configure Azure Monitor and Activity Log for auditing. Set up diagnostic
  settings and log analytics. Use when auditing Azure activity.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# Azure Monitor Audit

Audit Azure activity with Monitor, Activity Logs, and Log Analytics for compliance, security, and operational visibility.

## When to Use

- Enabling centralized audit logging across Azure subscriptions
- Meeting compliance requirements for SOC 2, HIPAA, PCI DSS, or ISO 27001
- Investigating security incidents or unauthorized activity in Azure
- Setting up alerting on administrative and security events
- Building compliance dashboards and automated evidence collection

## Create Log Analytics Workspace

```bash
# Create resource group for audit resources
az group create \
  --name rg-audit \
  --location eastus

# Create Log Analytics workspace
az monitor log-analytics workspace create \
  --resource-group rg-audit \
  --workspace-name audit-workspace \
  --location eastus \
  --retention-time 365 \
  --sku PerGB2018

# Get workspace ID for later use
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group rg-audit \
  --workspace-name audit-workspace \
  --query id -o tsv)

# Enable audit solutions
az monitor log-analytics solution create \
  --resource-group rg-audit \
  --solution-type SecurityCenterFree \
  --workspace audit-workspace
```

## Configure Diagnostic Settings for Subscription Activity Log

```bash
# Export subscription activity log to Log Analytics
az monitor diagnostic-settings subscription create \
  --name activity-log-to-workspace \
  --location global \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category": "Administrative", "enabled": true},
    {"category": "Security", "enabled": true},
    {"category": "ServiceHealth", "enabled": true},
    {"category": "Alert", "enabled": true},
    {"category": "Recommendation", "enabled": true},
    {"category": "Policy", "enabled": true},
    {"category": "Autoscale", "enabled": true},
    {"category": "ResourceHealth", "enabled": true}
  ]'

# Also archive to storage account for long-term retention
az storage account create \
  --name auditlogsarchive \
  --resource-group rg-audit \
  --location eastus \
  --sku Standard_GRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false

az monitor diagnostic-settings subscription create \
  --name activity-log-to-storage \
  --location global \
  --storage-account /subscriptions/{sub}/resourceGroups/rg-audit/providers/Microsoft.Storage/storageAccounts/auditlogsarchive \
  --logs '[
    {"category": "Administrative", "enabled": true, "retentionPolicy": {"enabled": true, "days": 2555}},
    {"category": "Security", "enabled": true, "retentionPolicy": {"enabled": true, "days": 2555}}
  ]'
```

## Resource-Level Diagnostic Settings

```bash
# Enable diagnostics for Azure Key Vault
az monitor diagnostic-settings create \
  --name keyvault-audit \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault} \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category": "AuditEvent", "enabled": true, "retentionPolicy": {"enabled": true, "days": 365}},
    {"category": "AzurePolicyEvaluationDetails", "enabled": true}
  ]' \
  --metrics '[
    {"category": "AllMetrics", "enabled": true}
  ]'

# Enable diagnostics for Azure SQL Database
az monitor diagnostic-settings create \
  --name sql-audit \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Sql/servers/{server}/databases/{db} \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category": "SQLSecurityAuditEvents", "enabled": true},
    {"category": "SQLInsights", "enabled": true},
    {"category": "AutomaticTuning", "enabled": true}
  ]'

# Enable diagnostics for Azure App Service
az monitor diagnostic-settings create \
  --name appservice-audit \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app} \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category": "AppServiceHTTPLogs", "enabled": true},
    {"category": "AppServiceAuditLogs", "enabled": true},
    {"category": "AppServiceIPSecAuditLogs", "enabled": true},
    {"category": "AppServicePlatformLogs", "enabled": true}
  ]'

# Enable diagnostics for Network Security Groups
az monitor diagnostic-settings create \
  --name nsg-flow-logs \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/networkSecurityGroups/{nsg} \
  --workspace "$WORKSPACE_ID" \
  --logs '[
    {"category": "NetworkSecurityGroupEvent", "enabled": true},
    {"category": "NetworkSecurityGroupRuleCounter", "enabled": true}
  ]'
```

## Azure Policy for Diagnostic Settings Enforcement

```bash
# Assign built-in policy to require diagnostic settings on Key Vaults
az policy assignment create \
  --name require-kv-diagnostics \
  --policy "951af2fa-529b-416e-ab6e-066fd85ac459" \
  --scope /subscriptions/{sub} \
  --params '{
    "logAnalytics": {"value": "'$WORKSPACE_ID'"},
    "effect": {"value": "DeployIfNotExists"}
  }'

# Assign policy to require diagnostic settings on SQL databases
az policy assignment create \
  --name require-sql-diagnostics \
  --policy "b79fa14e-238a-4c2d-b376-442ce508fc84" \
  --scope /subscriptions/{sub} \
  --params '{
    "logAnalyticsWorkspaceId": {"value": "'$WORKSPACE_ID'"}
  }'
```

## KQL Queries for Security Investigation

```kusto
// Failed sign-in attempts with location and device details
SigninLogs
| where TimeGenerated > ago(24h)
| where ResultType != "0"
| summarize FailureCount = count(),
            DistinctIPs = dcount(IPAddress),
            Locations = make_set(LocationDetails.city)
    by UserPrincipalName, ResultDescription, AppDisplayName
| where FailureCount > 5
| order by FailureCount desc

// Successful sign-ins from unusual locations
SigninLogs
| where TimeGenerated > ago(7d)
| where ResultType == "0"
| extend City = tostring(LocationDetails.city),
         Country = tostring(LocationDetails.countryOrRegion)
| summarize LoginCount = count(),
            Cities = make_set(City),
            Countries = make_set(Country)
    by UserPrincipalName
| where array_length(Countries) > 2

// Risky sign-ins requiring investigation
SigninLogs
| where TimeGenerated > ago(7d)
| where RiskLevelDuringSignIn in ("medium", "high")
| project TimeGenerated, UserPrincipalName, IPAddress,
          LocationDetails.city, RiskLevelDuringSignIn,
          RiskEventTypes_V2, AppDisplayName
| order by TimeGenerated desc

// Administrative operations across subscriptions
AzureActivity
| where TimeGenerated > ago(24h)
| where CategoryValue == "Administrative"
| where OperationNameValue contains "write" or OperationNameValue contains "delete"
| where ActivityStatusValue == "Success"
| project TimeGenerated, Caller, OperationNameValue,
          ResourceGroup, Resource, SubscriptionId
| order by TimeGenerated desc

// Key Vault access patterns
AzureDiagnostics
| where ResourceType == "VAULTS"
| where TimeGenerated > ago(24h)
| where OperationName in ("SecretGet", "SecretSet", "SecretDelete",
                           "KeySign", "KeyDecrypt", "CertificateGet")
| project TimeGenerated, CallerIPAddress, identity_claim_upn_s,
          OperationName, id_s, ResultType
| order by TimeGenerated desc

// Detect changes to Network Security Groups
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue has_any ("securityRules/write", "securityRules/delete",
                                     "networkSecurityGroups/write")
| where ActivityStatusValue == "Success"
| project TimeGenerated, Caller, OperationNameValue,
          ResourceGroup, Properties
| order by TimeGenerated desc

// Azure Policy compliance drift
PolicyInsights
| where TimeGenerated > ago(7d)
| where ComplianceState == "NonCompliant"
| summarize NonCompliantCount = count() by PolicyDefinitionName, ResourceType
| order by NonCompliantCount desc

// Privileged role assignments (PIM)
AuditLogs
| where TimeGenerated > ago(30d)
| where OperationName has_any ("Add member to role", "Add eligible member to role")
| extend RoleName = tostring(TargetResources[0].displayName),
         AssignedUser = tostring(TargetResources[2].displayName),
         AssignedBy = InitiatedBy.user.userPrincipalName
| project TimeGenerated, AssignedBy, AssignedUser, RoleName, OperationName
| order by TimeGenerated desc
```

## Alert Rules

```bash
# Create action group for security notifications
az monitor action-group create \
  --resource-group rg-audit \
  --name security-team \
  --short-name SecTeam \
  --email-receivers name=SecurityLead email=security@example.com \
  --webhook-receivers name=PagerDuty uri=https://events.pagerduty.com/integration/{key}/enqueue

# Alert on multiple failed sign-ins (brute force detection)
az monitor scheduled-query create \
  --resource-group rg-audit \
  --name brute-force-detection \
  --scopes "$WORKSPACE_ID" \
  --condition "count > 10" \
  --condition-query "SigninLogs | where ResultType != '0' | summarize count() by UserPrincipalName, bin(TimeGenerated, 5m) | where count_ > 10" \
  --evaluation-frequency 5m \
  --window-size 5m \
  --severity 2 \
  --action-groups /subscriptions/{sub}/resourceGroups/rg-audit/providers/Microsoft.Insights/actionGroups/security-team

# Alert on Key Vault secret access outside business hours
az monitor scheduled-query create \
  --resource-group rg-audit \
  --name keyvault-offhours-access \
  --scopes "$WORKSPACE_ID" \
  --condition "count > 0" \
  --condition-query "AzureDiagnostics | where ResourceType == 'VAULTS' | where OperationName in ('SecretGet','SecretList') | where hourofday(TimeGenerated) < 6 or hourofday(TimeGenerated) > 22" \
  --evaluation-frequency 15m \
  --window-size 15m \
  --severity 3 \
  --action-groups /subscriptions/{sub}/resourceGroups/rg-audit/providers/Microsoft.Insights/actionGroups/security-team

# Alert on subscription-level administrative changes
az monitor activity-log alert create \
  --resource-group rg-audit \
  --name critical-admin-changes \
  --condition category=Administrative and operationName="Microsoft.Authorization/roleAssignments/write" \
  --action-group /subscriptions/{sub}/resourceGroups/rg-audit/providers/Microsoft.Insights/actionGroups/security-team \
  --description "Alert on new role assignments"
```

## Workbook for Compliance Dashboard (ARM Template Snippet)

```json
{
  "type": "Microsoft.Insights/workbooks",
  "apiVersion": "2022-04-01",
  "name": "[guid('compliance-dashboard')]",
  "location": "[resourceGroup().location]",
  "kind": "shared",
  "properties": {
    "displayName": "Compliance Audit Dashboard",
    "serializedData": "{\"version\":\"Notebook/1.0\",\"items\":[{\"type\":1,\"content\":{\"json\":\"## Compliance Audit Dashboard\"},\"name\":\"title\"},{\"type\":3,\"content\":{\"version\":\"KqlItem/1.0\",\"query\":\"SigninLogs | where TimeGenerated > ago(24h) | where ResultType != '0' | summarize count() by bin(TimeGenerated, 1h)\",\"size\":0,\"title\":\"Failed Sign-ins (24h)\",\"timeContext\":{\"durationMs\":86400000},\"queryType\":0},\"name\":\"failed-signins\"}]}"
  }
}
```

## Setup Checklist

```yaml
azure_monitor_checklist:
  workspace_setup:
    - [ ] Log Analytics workspace created in appropriate region
    - [ ] Retention period configured (minimum per compliance framework)
    - [ ] Daily cap configured to prevent cost overruns
    - [ ] RBAC permissions set (Log Analytics Reader for auditors)

  diagnostic_settings:
    - [ ] Subscription activity log exported to Log Analytics
    - [ ] Subscription activity log archived to storage account
    - [ ] Key Vault audit events enabled
    - [ ] Azure SQL audit logging enabled
    - [ ] NSG flow logs enabled
    - [ ] App Service audit logs enabled
    - [ ] Azure AD sign-in and audit logs connected

  policy_enforcement:
    - [ ] Azure Policy assigned to enforce diagnostic settings
    - [ ] DeployIfNotExists policies for critical resource types
    - [ ] Compliance state monitored via Policy Insights

  alerting:
    - [ ] Action groups configured for security and operations teams
    - [ ] Alert on brute force sign-in attempts
    - [ ] Alert on privileged role assignments
    - [ ] Alert on Key Vault sensitive operations
    - [ ] Alert on NSG rule changes
    - [ ] Alert on resource deletions in production

  reporting:
    - [ ] Compliance workbook deployed
    - [ ] Weekly automated query reports exported
    - [ ] Quarterly access review queries prepared
    - [ ] Evidence collection queries documented for auditors
```

## Best Practices

- Centralize all audit data into a single Log Analytics workspace per tenant
- Archive logs to immutable storage for long-term retention and compliance
- Use Azure Policy with DeployIfNotExists to enforce diagnostic settings on new resources
- Create saved KQL queries for common investigation and compliance scenarios
- Set up scheduled query alerts for security-critical events
- Assign Log Analytics Reader role to auditors without granting broader access
- Monitor the diagnostic settings pipeline itself for delivery failures
- Use workbooks for visual compliance dashboards shared with stakeholders
- Export query results on a schedule for compliance evidence packages
- Separate operational and security alerting to avoid alert fatigue

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
