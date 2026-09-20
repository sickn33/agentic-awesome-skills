---
name: convex-backend
description: Build reactive backends with Convex functions, schema validation, auth
  integration, and deployment workflows. Use when building real-time apps with type-safe
  server functions and automatic caching.
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

# Convex Backend

Use Convex to build type-safe backend logic with realtime data sync.

## When to Use This Skill

Use this skill when:
- Building real-time collaborative apps (chat, dashboards, multiplayer)
- Need a backend with zero infrastructure management
- Want type-safe server functions with automatic caching
- Building AI apps that need reactive data (agent status, streaming results)
- Prototyping quickly with a managed database + functions

## Prerequisites

- Node.js 18+
- npm or pnpm
- Convex account (free tier: 1M function calls/month)

## Quick Start

```bash
# Initialize Convex in an existing project
npm install convex
npx convex dev     # Start local development (syncs with cloud)

# In a new project
npm create convex@latest
```

## Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  messages: defineTable({
    userId: v.id("users"),
    channelId: v.id("channels"),
    body: v.string(),
    attachments: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_channel", ["channelId", "createdAt"])
    .index("by_user", ["userId"]),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  }),
});
```

## Queries (Real-Time Reads)

```typescript
// convex/messages.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listByChannel = query({
  args: {
    channelId: v.id("channels"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_channel", (q) => q.eq("channelId", args.channelId))
      .order("desc")
      .take(args.limit ?? 50);

    // Resolve user data for each message
    return Promise.all(
      messages.map(async (msg) => {
        const user = await ctx.db.get(msg.userId);
        return { ...msg, user: user ? { name: user.name, avatarUrl: user.avatarUrl } : null };
      })
    );
  },
});
```

## Mutations (Writes)

```typescript
// convex/messages.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const send = mutation({
  args: {
    channelId: v.id("channels"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create user
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .unique();
    if (!user) throw new Error("User not found");

    return await ctx.db.insert("messages", {
      userId: user._id,
      channelId: args.channelId,
      body: args.body,
      createdAt: Date.now(),
    });
  },
});
```

## Actions (External APIs, AI)

```typescript
// convex/ai.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const generateResponse = action({
  args: { prompt: v.string(), channelId: v.id("channels") },
  handler: async (ctx, args) => {
    // Call external AI API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: args.prompt }],
      }),
    });

    const data = await response.json();
    const aiMessage = data.content[0].text;

    // Save AI response as a message via mutation
    await ctx.runMutation(api.messages.send, {
      channelId: args.channelId,
      body: aiMessage,
    });

    return aiMessage;
  },
});
```

## Scheduled Functions (Cron Jobs)

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every hour
crons.interval("cleanup old messages", { hours: 1 }, internal.maintenance.cleanupOldMessages);

// Run daily at midnight UTC
crons.cron("daily report", "0 0 * * *", internal.reports.generateDailyReport);

export default crons;
```

## Auth Integration

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.AUTH_DOMAIN,
      applicationID: "convex",
    },
  ],
};
```

```typescript
// React client setup
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";

function App() {
  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <MyApp />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

## React Client Usage

```typescript
// src/components/Chat.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function Chat({ channelId }: { channelId: string }) {
  // Real-time query — auto-updates when data changes
  const messages = useQuery(api.messages.listByChannel, { channelId });
  const sendMessage = useMutation(api.messages.send);

  const handleSend = async (body: string) => {
    await sendMessage({ channelId, body });
  };

  if (messages === undefined) return <div>Loading...</div>;

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg._id}>
          <strong>{msg.user?.name}</strong>: {msg.body}
        </div>
      ))}
    </div>
  );
}
```

## Deployment

```bash
# Deploy to production
npx convex deploy

# Deploy with environment variables
npx convex deploy --env-file .env.production

# Set environment variables
npx convex env set ANTHROPIC_API_KEY sk-ant-...
npx convex env list

# View logs
npx convex logs
npx convex logs --follow

# Run a function manually
npx convex run messages:listByChannel '{"channelId": "abc123"}'
```

## File Storage

```typescript
// convex/files.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

## Best Practices

- Define schema and validation before writing functions
- Keep mutations idempotent where possible
- Use auth identity checks in every privileged query/mutation
- Add indexes early for high-read collections
- Use `internal` functions for server-only logic (crons, webhooks)
- Store secrets in Convex environment variables, never in code
- Use optimistic updates in the React client for instant UI feedback

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Function timeout | Actions have 10min limit; break into smaller steps |
| Query too slow | Add database index matching your query pattern |
| Type errors | Run `npx convex dev` to regenerate types |
| Auth not working | Check `auth.config.ts` and provider domain |
| Deploy fails | Check `npx convex logs`, verify env vars are set |

## Related Skills

- firebase-app-platform (`firebase-app-platform`) — Alternative managed backend
- vercel-deployments (`vercel-deployments`) — Frontend hosting
- agent-observability (`agent-observability`) — Instrument AI-driven backend flows

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

