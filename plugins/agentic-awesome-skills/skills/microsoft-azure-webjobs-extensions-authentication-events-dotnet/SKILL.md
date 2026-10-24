---
name: microsoft-azure-webjobs-extensions-authentication-events-dotnet
description: Microsoft Entra Authentication Events SDK for .NET. Azure Functions triggers for custom authentication extensions.
risk: critical
source: community
date_added: '2026-02-27'
---

# Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents (.NET)

Azure Functions extension for handling Microsoft Entra ID custom authentication events.

## Installation

```bash
dotnet add package Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents
```

Pin a reviewed package version compatible with the chosen Functions host. The Microsoft setup guide describes this NuGet integration as preview; do not infer stability from this example.

## Supported Events

| Event | Purpose |
|-------|---------|
| `OnTokenIssuanceStart` | Add custom claims to tokens during issuance |
| `OnAttributeCollectionStart` | Customize attribute collection UI before display |
| `OnAttributeCollectionSubmit` | Validate/modify attributes after user submission |
| `OnOtpSend` | Custom OTP delivery (SMS, email, etc.) |

## Authentication and response prerequisites

Configure AuthenticationEvents__AudienceAppId, AuthenticationEvents__AuthorityUrl and AuthenticationEvents__AuthorizedPartyAppId from the actual tenant/extension using the official setup. Validate the request authentication/status before accessing data or returning claims; do not assume trigger invocation implies successful token/schema validation. Reject invalid requests using the SDK’s documented response/error pattern. Graph User.Read is not a substitute for authenticating Entra callbacks.

Examples are independent fragments needing package-version-specific namespaces, request types, System/Collections/Tasks imports and required SDK action collection initialization. Verify supported event names/types in the installed SDK; no build is established here. Claims and roles must come from an authorized tenant-bound source; sample Engineering/roles are synthetic, not user entitlements. Do not log OTP, phone numbers, tokens or raw exception payloads. Apply tenant/user/version-aware caching and bounded authenticated external calls. Missing/invalid required claims must fail closed at the relying application, not silently grant access.

## Core Workflows

### 1. Token Enrichment (Add Custom Claims)

Add custom claims to access or ID tokens during sign-in.

```csharp
using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.TokenIssuanceStart;

public static class TokenEnrichmentFunction
{
    [FunctionName("OnTokenIssuanceStart")]
    public static WebJobsAuthenticationEventResponse Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsTokenIssuanceStartRequest request)
    {
        try
        {
            if (request.RequestStatus != WebJobsAuthenticationEventsRequestStatusType.Successful)
                return request.Completed(); // SDK preserves validation failure; do not add claims.
            request.Response.Actions.Add(new WebJobsProvideClaimsForToken(
                new WebJobsAuthenticationEventsTokenClaim("apiVersion", "v2")));
            return request.Completed();
        }
        catch (Exception ex)
        {
            return request.Failed(ex);
        }
    }
}
```

The apiVersion value is a synthetic non-entitlement example. Required claims must be mapped in the Entra extension/application and enforced by the relying application. No raw user/exception logging is needed.

### 2. Token Enrichment with External Data

Fetch claims from external systems (databases, APIs).

Use the authenticated request gate above before reading user context. Resolve the tenant and user ID from the validated event; query an authorized tenant-bound profile adapter with a timeout within the callback budget, bounded response and validated schema. Add each approved value with WebJobsAuthenticationEventsTokenClaim and request.Response.Actions, then return request.Completed(). On missing/invalid required profile data return request.Failed(exception) and require the relying app to deny absent claims. Do not concatenate role strings from untrusted input or return a new empty success response. The profile adapter, authentication and role mapping are application code, not supplied here.

### 3. Attribute collection and OTP delivery

These events are tenant/product/version dependent. The previous examples assumed unverified request/action constructors and a no-op SMS adapter; they must not be copied as compiled SDK integrations. For the installed package, use its official event-specific samples and verify the request authentication/status gate before accessing attributes or OTP context.

- Start: only prefill approved attributes; do not trust a client-supplied identity or turn prefill into an authorization decision.
- Submit: validate the complete event schema and allowed attribute fields, return the event’s documented validation/block action, and preserve the user’s ability to correct input. A display message alone does not enforce a policy.
- OTP: deliver only through an authenticated configured provider, validate the destination and challenge context, bound attempts and timeouts, and report success only after provider acceptance. Never log or persist OTP values or silently claim delivery from Task.CompletedTask.
- Use synthetic local fixtures. Keep AuthenticationEvents__BypassTokenValidation disabled in every deployed environment; local bypass tests do not verify production authentication.

## Key Types Reference

The verified token-issuance pattern uses WebJobsTokenIssuanceStartRequest, WebJobsAuthenticationEventsRequestStatusType, WebJobsProvideClaimsForToken and WebJobsAuthenticationEventsTokenClaim through request.Response, request.Completed() and request.Failed(exception). Confirm all other event-specific names in the installed package rather than infer them from event labels.

## Entra ID Configuration

After deploying your Function App, configure the custom extension in Entra ID:

1. **Register the API** in Entra ID → App registrations
2. **Create Custom Authentication Extension** in Entra ID → External Identities → Custom authentication extensions
3. **Link to User Flow** in Entra ID → External Identities → User flows

### Required App Registration Settings

```
Expose an API:
  - Application ID URI: api://<your-function-app-name>.azurewebsites.net
  - Scope: CustomAuthenticationExtension.Receive.Payload

API Permissions:
  - Microsoft Graph: User.Read (delegated)
```

## Best Practices

1. **Validate all inputs** — Never trust request data; validate before processing
2. **Handle errors gracefully** — Return appropriate error responses
3. **Log correlation IDs** — Use `CorrelationId` for troubleshooting
4. **Keep functions fast** — Authentication events have timeout limits
5. **Use managed identity** — Access Azure resources securely
6. **Cache external data** — Avoid slow lookups on every request
7. **Test locally** — Use Azure Functions Core Tools with sample payloads
8. **Monitor with App Insights** — Track function execution and errors

## Error Handling

Use the guarded token-issuance function above: preserve SDK validation status, populate request.Response only for Successful requests, and use request.Failed(exception) for processing failures. Do not replace failures with new WebJobsTokenIssuanceStartResponse() or log raw callback/exception payloads.

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents` | Auth events (this SDK) | `dotnet add package Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents` |
| `Microsoft.Identity.Web` | Web app authentication | `dotnet add package Microsoft.Identity.Web` |
| `Azure.Identity` | Azure authentication | `dotnet add package Azure.Identity` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents |
| Custom Extensions Overview | https://learn.microsoft.com/entra/identity-platform/custom-extension-overview |
| Token Issuance Events | https://learn.microsoft.com/entra/identity-platform/custom-extension-tokenissuancestart-setup |
| Attribute Collection Events | https://learn.microsoft.com/entra/identity-platform/custom-extension-attribute-collection |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/entra/Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

Verified token-issuance API shape: [Microsoft setup guide](https://learn.microsoft.com/en-us/entra/identity-platform/custom-extension-tokenissuancestart-setup). Other event workflows remain procedural integration requirements, not a compiled implementation.
