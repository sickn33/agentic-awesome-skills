---
name: m365-agents-dotnet
description: Microsoft 365 Agents SDK for .NET. Build multichannel agents for Teams/M365/Copilot Studio with ASP.NET Core hosting, AgentApplication routing, and MSAL-based auth.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Microsoft 365 Agents SDK (.NET)

## Overview
Build enterprise agents for Microsoft 365, Teams, and Copilot Studio using the Microsoft.Agents SDK with ASP.NET Core hosting, agent routing, and MSAL-based authentication.

## Before implementation
- Use the microsoft-docs MCP to verify the latest APIs for AddAgent, AgentApplication, and authentication options.
- Confirm package versions in NuGet for the Microsoft.Agents.* packages you plan to use.

## Installation

```bash
dotnet add package Microsoft.Agents.Hosting.AspNetCore
dotnet add package Microsoft.Agents.Authentication.Msal
dotnet add package Microsoft.Agents.Storage
dotnet add package Microsoft.Agents.CopilotStudio.Client
dotnet add package Microsoft.Identity.Client.Extensions.Msal
```

## Configuration (appsettings.json)

```json
{
  "TokenValidation": {
    "Enabled": true,
    "Audiences": [
      "{{ClientId}}"
    ],
    "TenantId": "{{TenantId}}"
  },
  "AgentApplication": {
    "StartTypingTimer": false,
    "RemoveRecipientMention": false,
    "NormalizeMentions": false
  },
  "Connections": {
    "ServiceConnection": {
      "Settings": {
        "AuthType": "ClientSecret",
        "ClientId": "{{ClientId}}",
        "ClientSecret": "{{ClientSecret}}",
        "AuthorityEndpoint": "https://login.microsoftonline.com/{{TenantId}}",
        "Scopes": [
          "https://api.botframework.com/.default"
        ]
      }
    }
  },
  "ConnectionsMap": [
    {
      "ServiceUrl": "*",
      "Connection": "ServiceConnection"
    }
  ],
  "CopilotStudioClientSettings": {
    "DirectConnectUrl": "",
    "EnvironmentId": "",
    "SchemaName": "",
    "TenantId": "",
    "AppClientId": "",
    "AppClientSecret": ""
  }
}
```

## Core Workflow: ASP.NET Core agent host

```csharp
using Microsoft.Agents.Builder;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Storage;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient();
builder.AddAgentApplicationOptions();
builder.AddAgent<MyAgent>();
builder.Services.AddSingleton<IStorage, MemoryStorage>();

builder.Services.AddControllers();
builder.Services.AddAgentAspNetAuthentication(builder.Configuration);

WebApplication app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => "Microsoft Agents SDK Sample");

var incomingRoute = app.MapPost("/api/messages",
    async (HttpRequest request, HttpResponse response, IAgentHttpAdapter adapter, IAgent agent, CancellationToken ct) =>
    {
        await adapter.ProcessAsync(request, response, agent, ct);
    });

if (!app.Environment.IsDevelopment())
{
    incomingRoute.RequireAuthorization();
}
else
{
    app.Urls.Add("http://localhost:3978");
}

app.Run();
```

## AgentApplication routing

```csharp
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.App;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Core.Models;
using System;
using System.Threading;
using System.Threading.Tasks;

public sealed class MyAgent : AgentApplication
{
    public MyAgent(AgentApplicationOptions options) : base(options)
    {
        OnConversationUpdate(ConversationUpdateEvents.MembersAdded, WelcomeAsync);
        OnActivity(ActivityTypes.Message, OnMessageAsync, rank: RouteRank.Last);
        OnTurnError(OnTurnErrorAsync);
    }

    private static async Task WelcomeAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken ct)
    {
        foreach (ChannelAccount member in turnContext.Activity.MembersAdded)
        {
            if (member.Id != turnContext.Activity.Recipient.Id)
            {
                await turnContext.SendActivityAsync(
                    MessageFactory.Text("Welcome to the agent."),
                    ct);
            }
        }
    }

    private static async Task OnMessageAsync(ITurnContext turnContext, ITurnState turnState, CancellationToken ct)
    {
        await turnContext.SendActivityAsync(
            MessageFactory.Text($"You said: {turnContext.Activity.Text}"),
            ct);
    }

    private static async Task OnTurnErrorAsync(
        ITurnContext turnContext,
        ITurnState turnState,
        Exception exception,
        CancellationToken ct)
    {
        await turnState.Conversation.DeleteStateAsync(turnContext, ct);

        var endOfConversation = Activity.CreateEndOfConversationActivity();
        endOfConversation.Code = EndOfConversationCodes.Error;
        endOfConversation.Text = exception.Message;
        await turnContext.SendActivityAsync(endOfConversation, ct);
    }
}
```

## Copilot Studio direct-to-engine client

### DelegatingHandler for token acquisition (interactive flow)

```csharp
using System.Net.Http.Headers;
using Microsoft.Agents.CopilotStudio.Client;
using Microsoft.Identity.Client;

internal sealed class AddTokenHandler : DelegatingHandler
{
    private readonly SampleConnectionSettings _settings;

    public AddTokenHandler(SampleConnectionSettings settings) : base(new HttpClientHandler())
    {
        _settings = settings;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        if (request.Headers.Authorization is null)
        {
            string[] scopes = [CopilotClient.ScopeFromSettings(_settings)];

            IPublicClientApplication app = PublicClientApplicationBuilder
                .Create(_settings.AppClientId)
                .WithAuthority(AadAuthorityAudience.AzureAdMyOrg)
                .WithTenantId(_settings.TenantId)
                .WithRedirectUri("http://localhost")
                .Build();

            AuthenticationResult authResponse;
            try
            {
                var account = (await app.GetAccountsAsync()).FirstOrDefault();
                authResponse = await app.AcquireTokenSilent(scopes, account).ExecuteAsync(cancellationToken);
            }
            catch (MsalUiRequiredException)
            {
                authResponse = await app.AcquireTokenInteractive(scopes).ExecuteAsync(cancellationToken);
            }

            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authResponse.AccessToken);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
```

### Console host with CopilotClient

```csharp
using Microsoft.Agents.CopilotStudio.Client;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

HostApplicationBuilder builder = Host.CreateApplicationBuilder(args);

var settings = new SampleConnectionSettings(
    builder.Configuration.GetSection("CopilotStudioClientSettings"));

builder.Services.AddHttpClient("mcs").ConfigurePrimaryHttpMessageHandler(() =>
{
    return new AddTokenHandler(settings);
});

builder.Services
    .AddSingleton(settings)
    .AddTransient<CopilotClient>(sp =>
    {
        var logger = sp.GetRequiredService<ILoggerFactory>().CreateLogger<CopilotClient>();
        return new CopilotClient(settings, sp.GetRequiredService<IHttpClientFactory>(), logger, "mcs");
    });

IHost host = builder.Build();
var client = host.Services.GetRequiredService<CopilotClient>();

await foreach (var activity in client.StartConversationAsync(emitStartConversationEvent: true))
{
    Console.WriteLine(activity.Type);
}

await foreach (var activity in client.AskQuestionAsync("Hello!", null))
{
    Console.WriteLine(activity.Type);
}
```

## Best Practices

1. Use AgentApplication subclasses to centralize routing and error handling.
2. Use MemoryStorage only for development; use persisted storage in production.
3. Enable TokenValidation in production and require authorization on /api/messages.
4. Keep auth secrets in configuration providers (Key Vault, managed identity, env vars).
5. Reuse HttpClient from IHttpClientFactory and cache MSAL tokens.
6. Prefer async handlers and pass CancellationToken to SDK calls.

## Reference Files

| File | Contents |
| --- | --- |
| references/acceptance-criteria.md | Import paths, hosting pipeline, Copilot Studio client patterns, anti-patterns |

## Reference Links

| Resource | URL |
| --- | --- |
| Microsoft 365 Agents SDK | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/ |
| AddAgent API | https://learn.microsoft.com/en-us/dotnet/api/microsoft.agents.hosting.aspnetcore.servicecollectionextensions.addagent?view=m365-agents-sdk |
| AgentApplication API | https://learn.microsoft.com/en-us/dotnet/api/microsoft.agents.builder.app.agentapplication?view=m365-agents-sdk |
| Auth configuration options | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/microsoft-authentication-library-configuration-options |
| Copilot Studio integration | https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/integrate-with-mcs |
| GitHub samples | https://github.com/microsoft/agents |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
