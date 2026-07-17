---
name: microsoft-azure-webjobs-extensions-authentication-events-dotnet
description: Microsoft Entra Authentication Events SDK for .NET. Azure Functions triggers for custom authentication extensions.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents (.NET)

Azure Functions extension for handling Microsoft Entra ID custom authentication events.

## Installation

```bash
dotnet add package Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents
```

**Current Version**: v1.1.0 (stable)

## Supported Events

| Event | Purpose |
|-------|---------|
| `OnTokenIssuanceStart` | Add custom claims to tokens during issuance |

This WebJobs extension guide is limited to `OnTokenIssuanceStart`. Do not infer support for attribute-collection or OTP events from similarly named Microsoft Entra features; use the official package API surface for the pinned version.

## Core Workflows

### 1. Token Enrichment (Add Custom Claims)

Add custom claims to access or ID tokens during sign-in.

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.TokenIssuanceStart;
using Microsoft.Extensions.Logging;

public static class TokenEnrichmentFunction
{
    [FunctionName("OnTokenIssuanceStart")]
    public static WebJobsAuthenticationEventResponse Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsTokenIssuanceStartRequest request,
        ILogger log)
    {
        log.LogInformation("Token issuance event for user: {UserId}", 
            request.Data?.AuthenticationContext?.User?.Id);

        request.Response.Actions.Add(new WebJobsProvideClaimsForToken
        {
            Claims = new Dictionary<string, string>
            {
                { "customClaim1", "customValue1" },
                { "department", "Engineering" },
                { "costCenter", "CC-12345" },
                { "apiVersion", "v2" }
            }
        });

        return request.Completed();
    }
}
```

### 2. Token Enrichment with External Data

Fetch claims from external systems (databases, APIs).

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.TokenIssuanceStart;
using Microsoft.Extensions.Logging;
using System.Net.Http;
using System.Text.Json;

public static class TokenEnrichmentWithExternalData
{
    private static readonly HttpClient _httpClient = new();

    [FunctionName("OnTokenIssuanceStartExternal")]
    public static async Task<WebJobsAuthenticationEventResponse> Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsTokenIssuanceStartRequest request,
        ILogger log)
    {
        string? userId = request.Data?.AuthenticationContext?.User?.Id;
        
        if (string.IsNullOrEmpty(userId))
        {
            log.LogWarning("No user ID in request");
            return request.Completed();
        }

        // Fetch user data from external API
        var userProfile = await GetUserProfileAsync(userId);
        
        request.Response.Actions.Add(new WebJobsProvideClaimsForToken
        {
            Claims = new Dictionary<string, string>
            {
                { "employeeId", userProfile.EmployeeId },
                { "department", userProfile.Department },
                { "roles", string.Join(",", userProfile.Roles) }
            }
        });

        return request.Completed();
    }

    private static async Task<UserProfile> GetUserProfileAsync(string userId)
    {
        var response = await _httpClient.GetAsync($"https://api.example.com/users/{userId}");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<UserProfile>(json)!;
    }
}

public record UserProfile(string EmployeeId, string Department, string[] Roles);
```

### Unsupported historical examples: attribute collection and OTP

The following legacy sketches are retained only as negative migration evidence. They are not part of the supported WebJobs extension contract and must not be copied or deployed. For these event families, select a currently documented Microsoft product/API and start from its official sample instead.

### 3. Unsupported: Attribute Collection Start

Customize the attribute collection page before it's displayed.

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.Framework;
using Microsoft.Extensions.Logging;

public static class AttributeCollectionStartFunction
{
    [FunctionName("OnAttributeCollectionStart")]
    public static WebJobsAuthenticationEventResponse Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsAttributeCollectionStartRequest request,
        ILogger log)
    {
        log.LogInformation("Attribute collection start for correlation: {CorrelationId}",
            request.Data?.AuthenticationContext?.CorrelationId);

        var response = new WebJobsAttributeCollectionStartResponse();

        // Option 1: Continue with default behavior
        response.Actions.Add(new WebJobsContinueWithDefaultBehavior());

        // Option 2: Prefill attributes
        // response.Actions.Add(new WebJobsSetPrefillValues
        // {
        //     Attributes = new Dictionary<string, string>
        //     {
        //         { "city", "Seattle" },
        //         { "country", "USA" }
        //     }
        // });

        // Option 3: Show blocking page (prevent sign-up)
        // response.Actions.Add(new WebJobsShowBlockPage
        // {
        //     Message = "Sign-up is currently disabled."
        // });

        return response;
    }
}
```

### 4. Unsupported: Attribute Collection Submit

Validate and modify attributes after user submission.

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.Framework;
using Microsoft.Extensions.Logging;

public static class AttributeCollectionSubmitFunction
{
    [FunctionName("OnAttributeCollectionSubmit")]
    public static WebJobsAuthenticationEventResponse Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsAttributeCollectionSubmitRequest request,
        ILogger log)
    {
        var response = new WebJobsAttributeCollectionSubmitResponse();

        // Access submitted attributes
        var attributes = request.Data?.UserSignUpInfo?.Attributes;
        
        string? email = attributes?["email"]?.ToString();
        string? displayName = attributes?["displayName"]?.ToString();

        // Validation example: block certain email domains
        if (email?.EndsWith("@blocked.com") == true)
        {
            response.Actions.Add(new WebJobsShowBlockPage
            {
                Message = "Sign-up from this email domain is not allowed."
            });
            return response;
        }

        // Validation example: show validation error
        if (string.IsNullOrEmpty(displayName) || displayName.Length < 3)
        {
            response.Actions.Add(new WebJobsShowValidationError
            {
                Message = "Display name must be at least 3 characters.",
                AttributeErrors = new Dictionary<string, string>
                {
                    { "displayName", "Name is too short" }
                }
            });
            return response;
        }

        // Modify attributes before saving
        response.Actions.Add(new WebJobsModifyAttributeValues
        {
            Attributes = new Dictionary<string, string>
            {
                { "displayName", displayName.Trim() },
                { "city", attributes?["city"]?.ToString()?.ToUpperInvariant() ?? "" }
            }
        });

        return response;
    }
}
```

### 5. Unsupported: Custom OTP Delivery

Send one-time passwords via custom channels (SMS, email, push notification).

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents;
using Microsoft.Azure.WebJobs.Extensions.AuthenticationEvents.Framework;
using Microsoft.Extensions.Logging;

public static class CustomOtpFunction
{
    [FunctionName("OnOtpSend")]
    public static async Task<WebJobsAuthenticationEventResponse> Run(
        [WebJobsAuthenticationEventsTrigger] WebJobsOnOtpSendRequest request,
        ILogger log)
    {
        var response = new WebJobsOnOtpSendResponse();

        string? phoneNumber = request.Data?.OtpContext?.Identifier;
        string? otp = request.Data?.OtpContext?.OneTimeCode;

        if (string.IsNullOrEmpty(phoneNumber) || string.IsNullOrEmpty(otp))
        {
            log.LogError("Missing phone number or OTP");
            response.Actions.Add(new WebJobsOnOtpSendFailed
            {
                Error = "Missing required data"
            });
            return response;
        }

        try
        {
            // Send OTP via your SMS provider
            await SendSmsAsync(phoneNumber, $"Your verification code is: {otp}");
            
            response.Actions.Add(new WebJobsOnOtpSendSuccess());
            log.LogInformation("OTP sent successfully to {PhoneNumber}", phoneNumber);
        }
        catch (Exception ex)
        {
            log.LogError(ex, "Failed to send OTP");
            response.Actions.Add(new WebJobsOnOtpSendFailed
            {
                Error = "Failed to send verification code"
            });
        }

        return response;
    }

    private static async Task SendSmsAsync(string phoneNumber, string message)
    {
        // Implement your SMS provider integration (Twilio, Azure Communication Services, etc.)
        await Task.CompletedTask;
    }
}
```

### 6. Function App Configuration (in-process WebJobs model)

Configure the Function App for authentication events.

```csharp
// Do not combine this WebJobs extension with isolated-worker bootstrap.
// Use the in-process Azure Functions/WebJobs project template supported by
// the pinned package version and its official sample.
```

```json
// host.json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  },
  "extensions": {
    "http": {
      "routePrefix": ""
    }
  }
}
```

```json
// local.settings.json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet"
  }
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `WebJobsAuthenticationEventsTriggerAttribute` | Function trigger attribute |
| `WebJobsTokenIssuanceStartRequest` | Token issuance event request |
| `WebJobsTokenIssuanceStartResponse` | Token issuance event response |
| `WebJobsProvideClaimsForToken` | Action to add claims |

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

```csharp
[FunctionName("OnTokenIssuanceStart")]
public static WebJobsAuthenticationEventResponse Run(
    [WebJobsAuthenticationEventsTrigger] WebJobsTokenIssuanceStartRequest request,
    ILogger log)
{
    try
    {
        // Your logic here
        var response = new WebJobsTokenIssuanceStartResponse();
        response.Actions.Add(new WebJobsProvideClaimsForToken
        {
            Claims = new Dictionary<string, string> { { "claim", "value" } }
        });
        return response;
    }
    catch (Exception ex)
    {
        log.LogError(ex, "Error processing token issuance event");
        
        // Return empty response - authentication continues without custom claims
        // Do NOT throw - this would fail the authentication
        return new WebJobsTokenIssuanceStartResponse();
    }
}
```

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
