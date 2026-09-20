# Details (moved from SKILL.md)

> Extended reference content for `identity-access-management`, kept under `references/` so the entrypoint stays within the audit budget.

## 5. SSO Integration Patterns

### SAML vs OIDC Decision Guide

| Factor | SAML 2.0 | OIDC / OAuth 2.0 |
|---|---|---|
| Best for | Enterprise SaaS apps | SPAs, mobile apps, APIs |
| Token format | XML assertions | JWT tokens |
| Setup complexity | Higher (certificates, metadata XML) | Lower (client ID + secret) |
| Logout | Inconsistent (SLO is poorly supported) | Token expiry + revocation |
| Use when | App only supports SAML | You have a choice, or need API auth |

**Rule of thumb**: If the SaaS vendor supports OIDC, prefer it. If they only support SAML, use SAML. Never use LDAP-over-internet.

### Integrating Common SaaS Apps

#### Slack Enterprise SSO

```bash
# Okta OIDC integration for Slack
# 1. In Okta: Applications > Browse App Catalog > Slack
# 2. Configure with your Slack workspace URL
# 3. Enable SCIM provisioning

# Verify Slack SCIM connection
curl -s -H "Authorization: Bearer ${SLACK_SCIM_TOKEN}" \
  "https://api.slack.com/scim/v2/Users?count=5" | jq '.Resources[].userName'
```

#### GitHub Organization SSO

```bash
# Configure SAML for GitHub Org (requires GitHub Enterprise Cloud)
# 1. GitHub Org Settings > Authentication security > Enable SAML
# 2. Provide IdP SSO URL, IdP issuer, public certificate from your IdP

# Use GitHub CLI to verify SSO status
gh api orgs/company/credential-authorizations --paginate \
  | jq '.[] | {login: .login, credential_type: .credential_type, authorized_at: .authorized_credential_note}'

# Require SAML SSO for all org members
gh api -X PATCH orgs/company \
  -f saml_enforced=true
```

#### AWS SSO (IAM Identity Center)

```bash
# Configure AWS IAM Identity Center with external IdP
aws sso-admin list-instances --query 'Instances[0].InstanceArn' --output text

INSTANCE_ARN="arn:aws:sso:::instance/ssoins-1234567890"
IDENTITY_STORE_ID="d-1234567890"

# Create a permission set
aws sso-admin create-permission-set \
  --instance-arn "$INSTANCE_ARN" \
  --name "DeveloperAccess" \
  --description "Read-only + deploy access for engineers" \
  --session-duration "PT8H"

# Attach AWS managed policy to permission set
PERMISSION_SET_ARN="arn:aws:sso:::permissionSet/ssoins-1234567890/ps-abc123"
aws sso-admin attach-managed-policy-to-permission-set \
  --instance-arn "$INSTANCE_ARN" \
  --permission-set-arn "$PERMISSION_SET_ARN" \
  --managed-policy-arn "arn:aws:iam::aws:policy/ReadOnlyAccess"

# Assign group to AWS account with permission set
aws sso-admin create-account-assignment \
  --instance-arn "$INSTANCE_ARN" \
  --target-id "123456789012" \
  --target-type AWS_ACCOUNT \
  --permission-set-arn "$PERMISSION_SET_ARN" \
  --principal-type GROUP \
  --principal-id "a1b2c3d4-5678-90ab-cdef-GROUP001"
```

---


## 6. SCIM Provisioning

SCIM (System for Cross-domain Identity Management) automates user lifecycle across SaaS apps.

### SCIM API Examples

```bash
# Standard SCIM 2.0 endpoints (most IdPs and SaaS apps follow this)
SCIM_BASE="https://app.example.com/scim/v2"
SCIM_TOKEN="your-scim-bearer-token"

# List users
curl -s -H "Authorization: Bearer ${SCIM_TOKEN}" \
  "${SCIM_BASE}/Users?count=10&startIndex=1" | jq '.Resources[] | {id, userName, active}'

# Create a user via SCIM
curl -s -X POST \
  -H "Authorization: Bearer ${SCIM_TOKEN}" \
  -H "Content-Type: application/scim+json" \
  "${SCIM_BASE}/Users" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
    "userName": "alice@company.com",
    "name": { "givenName": "Alice", "familyName": "Engineer" },
    "emails": [{ "primary": true, "value": "alice@company.com", "type": "work" }],
    "active": true,
    "groups": []
  }' | jq '{id, userName, active}'

# Deactivate a user via SCIM (PATCH is the standard for partial updates)
USER_SCIM_ID="abc-123-def"
curl -s -X PATCH \
  -H "Authorization: Bearer ${SCIM_TOKEN}" \
  -H "Content-Type: application/scim+json" \
  "${SCIM_BASE}/Users/${USER_SCIM_ID}" \
  -d '{
    "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    "Operations": [{ "op": "replace", "value": { "active": false } }]
  }' | jq '{id, userName, active}'

# Delete a user permanently via SCIM
curl -s -X DELETE \
  -H "Authorization: Bearer ${SCIM_TOKEN}" \
  "${SCIM_BASE}/Users/${USER_SCIM_ID}"
```

### SCIM Group Management

```bash
# Create a group via SCIM
curl -s -X POST \
  -H "Authorization: Bearer ${SCIM_TOKEN}" \
  -H "Content-Type: application/scim+json" \
  "${SCIM_BASE}/Groups" \
  -d '{
    "schemas": ["urn:ietf:params:scim:schemas:core:2.0:Group"],
    "displayName": "Engineering",
    "members": [
      { "value": "user-id-001", "display": "alice@company.com" },
      { "value": "user-id-002", "display": "bob@company.com" }
    ]
  }' | jq '{id, displayName}'

# Add a member to an existing group
GROUP_SCIM_ID="grp-456"
curl -s -X PATCH \
  -H "Authorization: Bearer ${SCIM_TOKEN}" \
  -H "Content-Type: application/scim+json" \
  "${SCIM_BASE}/Groups/${GROUP_SCIM_ID}" \
  -d '{
    "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
    "Operations": [{
      "op": "add",
      "path": "members",
      "value": [{ "value": "user-id-003" }]
    }]
  }'
```

---


## 7. MFA Enforcement

### WebAuthn / Passkeys (Strongest)

WebAuthn (FIDO2) hardware keys and passkeys are phishing-resistant and should be the primary MFA factor.

```bash
# Okta: Enforce WebAuthn as primary factor
curl -s -X PUT \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/org/factors/webauthn" \
  -d '{ "status": "ACTIVE" }'

# Google Workspace: Enforce security keys only (disable SMS/voice)
gam update org "/" 2sv enforced allowedmethods security_key

# Azure AD: Require phishing-resistant MFA via conditional access
# (use the Graph API conditional access endpoint with authenticationStrengths)
curl -s -X POST \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies" \
  -d '{
    "displayName": "Require phishing-resistant MFA for admins",
    "state": "enabled",
    "conditions": {
      "users": { "includeRoles": ["62e90394-69f5-4237-9190-012177145e10"] },
      "applications": { "includeApplications": ["All"] }
    },
    "grantControls": {
      "operator": "OR",
      "authenticationStrength": {
        "id": "00000000-0000-0000-0000-000000000004"
      }
    }
  }'
```

### TOTP Backup Configuration

```bash
# Generate backup codes for users (Okta)
USER_ID="00u1abc123"
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/factors" \
  -d '{
    "factorType": "token:software:totp",
    "provider": "GOOGLE"
  }' | jq '{id: .id, status: .status}'
```

### MFA Bypass Procedure (Emergency)

```bash
# Okta: Reset MFA for a locked-out user
USER_ID="00u1abc123"
# List enrolled factors
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/factors" | jq '.[].factorType'

# Delete a specific factor to allow re-enrollment
FACTOR_ID="fct1abc123"
curl -s -X DELETE \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/factors/${FACTOR_ID}"

# Google Workspace: Generate backup verification codes
gam user alice@company.com update backupcodes

# Azure AD: Require re-registration of MFA methods
az rest --method DELETE \
  --url "https://graph.microsoft.com/v1.0/users/${USER_OID}/authentication/phoneMethods/3179e48a-750b-4051-897c-87b9720928f7"
```

---


## 8. Role-Based Access Control

### Group-Based Access Patterns

Map every application permission to a group, never to an individual user.

```bash
# Naming convention: APP-ROLE
# Examples:
#   aws-developer       -> AWS ReadOnly + deploy
#   aws-admin           -> AWS AdministratorAccess
#   github-engineer     -> GitHub write access
#   github-admin        -> GitHub admin access
#   slack-member        -> Slack standard member
#   pagerduty-oncall    -> PagerDuty responder role

# Okta: Create group rules for automatic assignment based on department
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${OKTA_ORG_URL}/api/v1/groups/rules" \
  -d '{
    "type": "group_rule",
    "name": "Auto-assign engineers to GitHub",
    "conditions": {
      "expression": {
        "value": "user.department == \"Engineering\"",
        "type": "urn:okta:expression:1.0"
      }
    },
    "actions": {
      "assignUserToGroups": { "groupIds": ["GITHUB_ENGINEERS_GROUP_ID"] }
    }
  }'
```

### Just-in-Time (JIT) Access

```bash
# AWS: Grant temporary elevated access using STS assume-role
# The user assumes a role that expires after a set duration
aws sts assume-role \
  --role-arn "arn:aws:iam::123456789012:role/EmergencyAdmin" \
  --role-session-name "alice-incident-2026-03-24" \
  --duration-seconds 3600 \
  | jq '{AccessKeyId: .Credentials.AccessKeyId, Expiration: .Credentials.Expiration}'

# Okta: Create a time-limited group membership (via API scheduled task)
# Add user to admin group
curl -s -X PUT \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/groups/${ADMIN_GROUP_ID}/users/${USER_ID}"

# Schedule removal after 4 hours (use a cron job or automation tool)
echo "0 */4 * * * curl -s -X DELETE -H 'Authorization: SSWS ${OKTA_API_TOKEN}' \
  '${OKTA_ORG_URL}/api/v1/groups/${ADMIN_GROUP_ID}/users/${USER_ID}'" | crontab -
```

### Break-Glass Accounts

```bash
# Create break-glass accounts that bypass SSO/MFA for emergency access
# These accounts must be:
# 1. Excluded from conditional access / MFA policies
# 2. Protected with extremely long passwords stored in a physical safe
# 3. Monitored with alerts on any usage

# Azure AD: Create break-glass account
az ad user create \
  --display-name "Break Glass 1" \
  --user-principal-name "breakglass1@company.onmicrosoft.com" \
  --password "$(openssl rand -base64 48)" \
  --force-change-password-next-sign-in false

# Assign Global Administrator role
az ad group member add --group "SG-BreakGlass" --member-id "$BREAKGLASS_OID"

# Set up alert on break-glass sign-in (Azure Monitor)
az monitor activity-log alert create \
  --name "BreakGlass-SignIn-Alert" \
  --resource-group "security-rg" \
  --condition category=Administrative and caller=breakglass1@company.onmicrosoft.com \
  --action-group "/subscriptions/SUB_ID/resourceGroups/security-rg/providers/microsoft.insights/actionGroups/SecurityTeam"
```

---


## 9. Audit & Compliance

### Login Audit Logs

```bash
# Google Workspace: Pull login audit logs
gam report login user all start "2026-03-01" end "2026-03-24" \
  fields "actorEmail,ipAddress,loginType,isSecondFactor,isSuspicious"

# Okta: Query system log for authentication events
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/logs?filter=eventType+eq+\"user.session.start\"&since=2026-03-01T00:00:00Z&limit=100" \
  | jq '.[] | {actor: .actor.displayName, time: .published, outcome: .outcome.result, ip: .client.ipAddress}'

# Azure AD: Pull sign-in logs via Graph API
curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  "https://graph.microsoft.com/v1.0/auditLogs/signIns?\$filter=createdDateTime ge 2026-03-01T00:00:00Z&\$top=50" \
  | jq '.value[] | {user: .userDisplayName, app: .appDisplayName, status: .status.errorCode, ip: .ipAddress, mfa: .mfaDetail}'
```

### Access Reviews

```bash
# List all users and their group memberships for quarterly access review
# Google Workspace
gam print group-members fields email,role > /tmp/access-review-groups.csv

# Okta: Export all users with their app assignments
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users?limit=200" \
  | jq -r '.[] | [.profile.email, .status, .lastLogin] | @csv' > /tmp/okta-users.csv

# For each user, list their app assignments
while IFS= read -r user_id; do
  curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
    "${OKTA_ORG_URL}/api/v1/users/${user_id}/appLinks" \
    | jq -r '.[] | [.label, .linkUrl] | @csv'
done < /tmp/okta-user-ids.txt > /tmp/okta-access-review.csv

# Azure AD: List role assignments
az role assignment list --all --query '[].{principal:principalName, role:roleDefinitionName, scope:scope}' -o table
```

### Compliance Reporting

```bash
# Count of users with/without MFA enrolled
# Google Workspace
echo "=== MFA Enrollment Report ==="
echo "Enrolled:"
gam print users fields isEnrolledIn2Sv | grep -c True
echo "Not enrolled:"
gam print users fields isEnrolledIn2Sv | grep -c False

# Okta: Users without any MFA factor
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users?filter=status+eq+\"ACTIVE\"&limit=200" \
  | jq '[.[] | select(.credentials.provider.type != "SOCIAL") | .id] | length'

# Check for stale accounts (no login in 90 days)
NINETY_DAYS_AGO=$(date -d "-90 days" +%Y-%m-%dT00:00:00Z 2>/dev/null || date -v-90d +%Y-%m-%dT00:00:00Z)
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users?filter=lastLogin+lt+\"${NINETY_DAYS_AGO}\"&limit=200" \
  | jq '.[] | {email: .profile.email, lastLogin: .lastLogin}'
```

---


## 10. Offboarding

### Account Deactivation Checklist

Run this sequence when an employee departs. Order matters -- revoke sessions first, then deactivate.

```bash
DEPARTING_USER="alice@company.com"

# Step 1: Revoke all active sessions immediately
# Okta
USER_ID=$(curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${DEPARTING_USER}" | jq -r '.id')

curl -s -X DELETE \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/sessions"

# Google Workspace: Revoke tokens and sign out
gam user "${DEPARTING_USER}" signout
gam user "${DEPARTING_USER}" deprovision

# Azure AD: Revoke all refresh tokens
az ad user update --id "${DEPARTING_USER}" --account-enabled false
az rest --method POST \
  --url "https://graph.microsoft.com/v1.0/users/${DEPARTING_USER}/revokeSignInSessions"

# Step 2: Deactivate the user account
# Okta
curl -s -X POST \
  -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/lifecycle/deactivate"

# Google Workspace
gam update user "${DEPARTING_USER}" suspended on

# Step 3: Transfer data ownership
# Google Workspace: Transfer Drive files
gam user "${DEPARTING_USER}" transfer drive manager@company.com

# Google Workspace: Transfer Calendar ownership
gam user "${DEPARTING_USER}" transfer calendar manager@company.com

# Step 4: Remove from all groups (prevents future provisioning)
# Okta
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${USER_ID}/groups" \
  | jq -r '.[].id' | while read gid; do
    curl -s -X DELETE \
      -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
      "${OKTA_ORG_URL}/api/v1/groups/${gid}/users/${USER_ID}"
  done

# Step 5: Revoke app-specific tokens
# GitHub: Remove from org
gh api -X DELETE "orgs/company/members/${DEPARTING_USER}"

# Slack: Deactivate via SCIM
SLACK_USER_ID=$(curl -s -H "Authorization: Bearer ${SLACK_SCIM_TOKEN}" \
  "https://api.slack.com/scim/v2/Users?filter=userName+eq+\"${DEPARTING_USER}\"" \
  | jq -r '.Resources[0].id')

curl -s -X PATCH \
  -H "Authorization: Bearer ${SLACK_SCIM_TOKEN}" \
  -H "Content-Type: application/scim+json" \
  "https://api.slack.com/scim/v2/Users/${SLACK_USER_ID}" \
  -d '{"schemas":["urn:ietf:params:scim:api:messages:2.0:PatchOp"],"Operations":[{"op":"replace","value":{"active":false}}]}'

# AWS: Remove SSO access
aws sso-admin delete-account-assignment \
  --instance-arn "$INSTANCE_ARN" \
  --target-id "123456789012" \
  --target-type AWS_ACCOUNT \
  --permission-set-arn "$PERMISSION_SET_ARN" \
  --principal-type USER \
  --principal-id "$AWS_SSO_USER_ID"

# Step 6: Document and log
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | OFFBOARD | ${DEPARTING_USER} | all sessions revoked, account suspended, data transferred to manager@company.com" >> /var/log/offboarding-audit.log
```

### Post-Offboarding Verification

```bash
DEPARTING_USER="alice@company.com"

# Verify account is suspended/deactivated
echo "=== Offboarding Verification ==="

# Google Workspace
gam info user "${DEPARTING_USER}" fields suspended | grep -i "suspended: true" && echo "[OK] Google suspended" || echo "[FAIL] Google still active"

# Okta
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/users/${DEPARTING_USER}" \
  | jq -r '.status' | grep -q "DEPROVISIONED" && echo "[OK] Okta deprovisioned" || echo "[FAIL] Okta still active"

# GitHub
gh api "orgs/company/members/${DEPARTING_USER}" 2>&1 | grep -q "404" && echo "[OK] GitHub removed" || echo "[FAIL] GitHub still member"

# Check for any remaining active sessions in audit logs
echo "=== Checking for post-offboard activity ==="
curl -s -H "Authorization: SSWS ${OKTA_API_TOKEN}" \
  "${OKTA_ORG_URL}/api/v1/logs?filter=actor.alternateId+eq+\"${DEPARTING_USER}\"&since=$(date -u +%Y-%m-%dT%H:%M:%SZ)&limit=10" \
  | jq '.[] | {time: .published, event: .eventType, outcome: .outcome.result}'
```

---


## Quick Reference

| Task | Google Workspace | Okta | Azure AD |
|---|---|---|---|
| Create user | `gam create user` | `POST /api/v1/users` | `az ad user create` |
| Suspend user | `gam update user suspended on` | `POST /lifecycle/deactivate` | `az ad user update --account-enabled false` |
| Enforce MFA | `gam update org 2sv enforced` | MFA enrollment policy | Conditional access policy |
| Revoke sessions | `gam user signout` | `DELETE /users/{id}/sessions` | `revokeSignInSessions` |
| Audit logins | `gam report login` | `GET /api/v1/logs` | `GET /auditLogs/signIns` |
| SCIM provision | Built-in for supported apps | App integration SCIM tab | Enterprise app provisioning |

