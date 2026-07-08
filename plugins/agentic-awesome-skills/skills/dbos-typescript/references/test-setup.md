---
title: Use Proper Test Setup for DBOS
impact: LOW-MEDIUM
impactDescription: Ensures consistent test results with proper DBOS lifecycle management
tags: testing, jest, setup, integration, mock
---

## Use Proper Test Setup for DBOS

DBOS applications can be tested with unit tests (mocking DBOS) or integration tests (real Postgres database).

**Incorrect (no lifecycle management between tests):**

```typescript
// Tests share state - results are inconsistent!
describe("tests", () => {
  it("test one", async () => {
    await myWorkflow("input");
  });
  it("test two", async () => {
    // Previous test's state leaks into this test
    await myWorkflow("input");
  });
});
```

**Correct (unit testing with mocks):**

```typescript
// Mock DBOS - no Postgres required
jest.mock("@dbos-inc/dbos-sdk", () => ({
  DBOS: {
    registerWorkflow: jest.fn((fn) => fn),
    runStep: jest.fn((fn) => fn()),
    setEvent: jest.fn(),
    recv: jest.fn(),
    startWorkflow: jest.fn(),
    workflowID: "test-workflow-id",
  },
}));

describe("workflow unit tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process data", async () => {
    jest.mocked(DBOS.recv).mockResolvedValue("success");
    await myWorkflow("input");
    expect(DBOS.setEvent).toHaveBeenCalledWith("status", "done");
  });
});
```

Mock `registerWorkflow` to return the function directly (not wrapped with durable workflow code).

**Correct (integration testing with Postgres):**

```typescript
import { DBOS, DBOSConfig } from "@dbos-inc/dbos-sdk";
import { Client } from "pg";

async function resetDatabase(databaseUrl: string) {
  const dbName = new URL(databaseUrl).pathname.slice(1);
  const postgresDatabaseUrl = new URL(databaseUrl);
  postgresDatabaseUrl.pathname = "/postgres";
  const client = new Client({ connectionString: postgresDatabaseUrl.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
    await client.query(`CREATE DATABASE ${dbName}`);
  } finally {
    await client.end();
  }
}

describe("integration tests", () => {
  beforeEach(async () => {
    const databaseUrl = process.env.DBOS_TEST_DATABASE_URL;
    if (!databaseUrl) throw Error("DBOS_TEST_DATABASE_URL must be set");
    await DBOS.shutdown();
    await resetDatabase(databaseUrl);
    DBOS.setConfig({ name: "my-integration-test", systemDatabaseUrl: databaseUrl });
    await DBOS.launch();
  }, 10000);

  afterEach(async () => {
    await DBOS.shutdown();
  });

  it("should complete workflow", async () => {
    const result = await myWorkflow("test-input");
    expect(result).toBe("expected-output");
  });
});
```

Key points:
- Call `DBOS.shutdown()` before resetting and reconfiguring
- Reset the database between tests for isolation
- Set a generous `beforeEach` timeout (10s) for database setup
- Use `DBOS.shutdown({ deregister: true })` if re-registering functions

Reference: [Testing & Mocking](https://docs.dbos.dev/typescript/tutorials/testing)
