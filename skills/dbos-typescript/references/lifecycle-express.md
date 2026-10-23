---
title: Integrate DBOS with Express
impact: CRITICAL
impactDescription: Proper integration ensures workflows survive server restarts
tags: express, http, integration, server
---

## Integrate DBOS with Express

Configure and launch DBOS before starting your Express server. Register all workflows and steps before calling `DBOS.launch()`.

**Incorrect (DBOS not launched before server starts):**

```typescript
import express from "express";
import { DBOS } from "@dbos-inc/dbos-sdk";

const app = express();

async function processTaskFn(data: string) {
  // ...
}
const processTask = DBOS.registerWorkflow(processTaskFn);

// Server starts without launching DBOS!
app.listen(3000);
```

**Correct (launch DBOS first, then start Express):**

```typescript
import express from "express";
import { DBOS } from "@dbos-inc/dbos-sdk";

const app = express();
app.use(express.json({ limit: "64kb" }));

async function processTaskFn(data: string) {
  // ...
}
const processTask = DBOS.registerWorkflow(processTaskFn);

app.post("/process", async (req, res) => {
  if (typeof req.body?.data !== "string") {
    res.status(400).json({ error: "data must be a string" });
    return;
  }
  const handle = await DBOS.startWorkflow(processTask)(req.body.data);
  res.json({ workflowID: handle.workflowID });
});

async function main() {
  DBOS.setConfig({
    name: "my-app",
    systemDatabaseUrl: process.env.DBOS_SYSTEM_DATABASE_URL,
  });
  await DBOS.launch();
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

main().catch(error => { console.error(error); process.exitCode = 1; });
```

Reference: [Integrating DBOS](https://docs.dbos.dev/typescript/integrating-dbos)
