---
name: identity-access-management
description: Set up and manage SSO, SCIM provisioning, and MFA for startup teams using
  Google Workspace, Okta, or Azure AD.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Identity & Access Management for Startups

Centralized identity management is not optional once your team exceeds a handful of people. This skill covers practical, production-ready configurations for SSO, SCIM provisioning, MFA enforcement, and access governance using the three most common identity providers for startups: Google Workspace, Okta, and Azure AD (Entra ID).

---

## 2. Google Workspace as Identity Provider

Google Workspace is the most common starting IdP for startups. Combined with the GAM CLI tool, it provides powerful automation.

### Install GAM (Google Apps Manager)

```bash
# Install GAM on Linux/macOS
curl -s -S -L https://gam-shortn.appspot.com/gam-install -o /tmp/gam-install.sh && bash /tmp/gam-install.sh && rm /tmp/gam-install.sh

# Authorize GAM with your Workspace domain
gam oauth create

# Verify connection
gam info domain
```

### Create Organizational Units

Organizational units (OUs) control policy inheritance and app access.

```bash
# Create OUs for team structure
gam create org "Engineering"
gam create org "Engineering/Backend"
gam create org "Engineering/Frontend"
gam create org "Operations"
gam create org "Operations/IT"
gam create org "Finance"
gam create org "Contractors"

# Move a user into an OU
gam update user alice@company.com org "Engineering/Backend"

# List all OUs
gam print orgs
```

### Configure a SAML App in Google Workspace

```bash
# Export the Google IdP metadata (download from Admin Console or use GAM)
# Admin Console: Apps > Web and mobile apps > Add app > Search for app > Download IdP metadata

# For a custom SAML app, you need:
# 1. ACS URL (from the service provider)
# 2. Entity ID (from the service provider)
# 3. Name ID format (usually EMAIL)

# Example: Add a custom SAML app via Admin Console API
gam create samlapp "Internal Dashboard" \
  acs_url "https://dashboard.company.com/saml/acs" \
  entity_id "https://dashboard.company.com" \
  name_id_format "EMAIL" \
  name_id "user.primaryEmail"

# Assign the app to an OU
gam update samlapp "Internal Dashboard" org "Engineering" enabled on

# Verify SAML app status
gam print samlappinfo "Internal Dashboard"
```

### SCIM Provisioning with Google Workspace

```bash
# Enable auto-provisioning for supported apps
# Google Workspace supports automatic user provisioning for apps like:
# Slack, Zoom, Box, Dropbox, Asana, GitHub Enterprise

# List provisioned apps
gam print tokens

# Force sync provisioning for an app
gam sync samlapp "Slack" users

# Bulk create users from CSV
# users.csv format: firstname,lastname,email,org,password
gam csv users.csv gam create user ~email \
  firstname ~firstname lastname ~lastname \
  password ~password org ~org \
  changepassword on
```

### Enforce MFA at the Workspace Level

```bash
# Enforce 2-step verification for the entire domain
gam update org "/" 2sv enforced

# Enforce 2SV for a specific OU
gam update org "Engineering" 2sv enforced

# Set enforcement date (give users time to enroll)
gam update org "/" 2sv enforced enforceddate 2026-04-15

# Check 2SV enrollment status for all users
gam print users fields isEnforcedIn2Sv,isEnrolledIn2Sv

# Find users who have NOT enrolled in 2SV
gam print users query "isEnrolledIn2Sv=false" fields primaryEmail,name
```

---

## 3. Okta Setup

Okta offers a free tier for startups (Okta for Startups program -- up to 100 users) making it an excellent choice for teams that need a dedicated IdP.

### Initial Okta Configuration via API

```bash
# Set your Okta domain and API token
export OKTA_ORG_URL="https://company.okta.com"
export OKTA_API_TOKEN="your-api-token"

# Verify connectivity
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/org" | jq '.companyName'

# Create a user
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/users?activate=true" \
  -d '{
    "profile": {
      "firstName": "Alice",
      "lastName": "Engineer",
      "email": "alice@company.com",
      "login": "alice@company.com"
    },
    "credentials": {
      "password": { "value": "TempP@ss123!" }
    }
  }' | jq '.id'
```

### Create Groups for RBAC

```bash
# Create groups
for group in "Engineering" "Operations" "Finance" "Contractors" "AdminAccess"; do
  curl -s -X POST \
    -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
    -H "Content-Type: application/json" \
    "${OKTA_ORG_URL}/api/v1/groups" \
    -d "{\"profile\": {\"name\": \"${group}\", \"description\": \"${group} team group\"}}" \
    | jq '{id: .id, name: .profile.name}'
done

# Add user to group
USER_ID="00u1abc123"
GROUP_ID="00g1def456"
curl -s -X PUT \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/groups/${GROUP_ID}/users/${USER_ID}"
```

### Add a SAML Application in Okta

```bash
# Create a SAML 2.0 application
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/apps" \
  -d '{
    "name": "custom_saml_app",
    "label": "Internal Dashboard",
    "signOnMode": "SAML_2_0",
    "settings": {
      "signOn": {
        "defaultRelayState": "",
        "ssoAcsUrl": "https://dashboard.company.com/saml/acs",
        "audience": "https://dashboard.company.com",
        "recipient": "https://dashboard.company.com/saml/acs",
        "destination": "https://dashboard.company.com/saml/acs",
        "subjectNameIdFormat": "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
        "attributeStatements": [
          {
            "type": "EXPRESSION",
            "name": "email",
            "namespace": "urn:oasis:names:tc:SAML:2.0:attrname-format:basic",
            "values": ["user.email"]
          },
          {
            "type": "EXPRESSION",
            "name": "groups",
            "namespace": "urn:oasis:names:tc:SAML:2.0:attrname-format:basic",
            "values": ["getFilteredGroups({\"00g1def456\"}, \"group.name\", 50)"]
          }
        ]
      }
    }
  }' | jq '{id: .id, label: .label, status: .status}'

# Assign group to application
APP_ID="0oa1xyz789"
curl -s -X PUT \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/apps/${APP_ID}/groups/${GROUP_ID}"
```

### Okta MFA Policy

```bash
# Create an MFA enrollment policy requiring WebAuthn + TOTP
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/policies" \
  -d '{
    "type": "MFA_ENROLL",
    "name": "Require Strong MFA",
    "status": "ACTIVE",
    "settings": {
      "factors": {
        "webauthn": { "enroll": { "self": "REQUIRED" } },
        "google_otp": { "enroll": { "self": "OPTIONAL" } },
        "okta_email": { "enroll": { "self": "NOT_ALLOWED" } },
        "okta_sms": { "enroll": { "self": "NOT_ALLOWED" } }
      }
    }
  }' | jq '{id: .id, name: .name, status: .status}'
```

---

## 4. Azure AD / Entra ID

Azure AD (now Microsoft Entra ID) is common at startups using Microsoft 365 or Azure cloud.

### Azure CLI Setup

```bash
# Install Azure CLI and sign in
az login

# Set the default tenant
az account set --subscription "your-subscription-id"

# Verify tenant
az ad signed-in-user show --query '{name:displayName, email:userPrincipalName}'
```

### Create Users and Groups

```bash
# Create a user
az ad user create \
  --display-name "Alice Engineer" \
  --user-principal-name "alice@company.onmicrosoft.com" \
  --password "TempP@ss123!" \
  --force-change-password-next-sign-in true

# Create security groups
for group in "SG-Engineering" "SG-Operations" "SG-Finance" "SG-Admins"; do
  az ad group create --display-name "$group" --mail-nickname "$group"
done

# Add user to group
USER_OID=$(az ad user show --id "alice@company.onmicrosoft.com" --query id -o tsv)
GROUP_OID=$(az ad group show --group "SG-Engineering" --query id -o tsv)
az ad group member add --group "$GROUP_OID" --member-id "$USER_OID"

# List group members
az ad group member list --group "SG-Engineering" --query '[].{name:displayName, email:userPrincipalName}' -o table
```

### Conditional Access Policies via Graph API

```bash
# Require MFA for all users accessing cloud apps
# Uses Microsoft Graph API
ACCESS_TOKEN=$(az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv)

curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  -d '{
    "displayName": "Require MFA for all users",
    "state": "enabledForReportingButNotEnforced",
    "conditions": {
      "users": {
        "includeUsers": ["All"],
        "excludeGroups": ["'${BREAKGLASS_GROUP_OID}'"]
      },
      "applications": {
        "includeApplications": ["All"]
      }
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["mfa"]
    }
  }'

# Block legacy authentication (critical for security)
curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  -d '{
    "displayName": "Block legacy authentication",
    "state": "enabled",
    "conditions": {
      "users": { "includeUsers": ["All"] },
      "applications": { "includeApplications": ["All"] },
      "clientAppTypes": ["exchangeActiveSync", "other"]
    },
    "grantControls": {
      "operator": "OR",
      "builtInControls": ["block"]
    }
  }'
```

---


## Contents

- [5. SSO Integration Patterns](references/details.md)
- [6. SCIM Provisioning](references/details.md)
- [7. MFA Enforcement](references/details.md)
- [8. Role-Based Access Control](references/details.md)
- [9. Audit & Compliance](references/details.md)
- [10. Offboarding](references/details.md)
- [Quick Reference](references/details.md)

## When to Use This Skill

Reach for this skill when:

- **First SSO setup** -- You are moving from individual app logins to centralized authentication.
- **Compliance audit preparation** -- SOC 2, ISO 27001, or HIPAA requires documented access controls, MFA enforcement, and audit logs.
- **Team growth inflection** -- You are crossing 15-20 employees and manual onboarding/offboarding is becoming error-prone.
- **Vendor security questionnaires** -- Customers are asking about your identity posture and you need to demonstrate controls.
- **Incident response** -- You need to revoke access quickly across all systems for a departing or compromised user.

Signs you are overdue:

- Shared passwords in a spreadsheet or chat channel.
- No central audit log of who accessed what and when.
- Offboarding takes more than one business day.
- Developers have standing admin access to production.

---

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

