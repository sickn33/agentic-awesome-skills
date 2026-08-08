---
title: Use DBOS with Class Instances
impact: MEDIUM
impactDescription: Enables configurable workflow instances with recovery support
tags: pattern, class, instance, ConfiguredInstance
---

## Use DBOS with Class Instances

Class instance methods can be workflows and steps. Classes with workflow methods must extend `ConfiguredInstance` to enable recovery.

**Incorrect (instance workflows without ConfiguredInstance):**

```typescript
class MyWorker {
  constructor(private config: any) {}

  @DBOS.workflow()
  async processTask(task: string) {
    // Recovery won't work - DBOS can't find the instance after restart
  }
}
```

**Correct (extending ConfiguredInstance):**

```typescript
import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";

class MyWorker extends ConfiguredInstance {
  cfg: WorkerConfig;

  constructor(name: string, config: WorkerConfig) {
    super(name); // Unique name required for recovery
    this.cfg = config;
  }

  override async initialize(): Promise<void> {
    // Optional: validate config at DBOS.launch() time
  }

  @DBOS.workflow()
  async processTask(task: string): Promise<void> {
    // Can use this.cfg safely - instance is recoverable
    const result = await DBOS.runStep(
      () => fetch(this.cfg.apiUrl).then(r => r.text()),
      { name: "callApi" }
    );
  }
}

// Create instances BEFORE DBOS.launch()
const worker1 = new MyWorker("worker-us", { apiUrl: "https://us.api.com" });
const worker2 = new MyWorker("worker-eu", { apiUrl: "https://eu.api.com" });

// Then launch
await DBOS.launch();
```

Key requirements:
- `ConfiguredInstance` constructor requires a unique `name` per class
- All instances must be created **before** `DBOS.launch()`
- The `initialize()` method is called during launch for validation
- Use `DBOS.runStep` inside instance workflows for step operations
- Event registration decorators like `@DBOS.scheduled` cannot be applied to instance methods

Reference: [Using TypeScript Objects](https://docs.dbos.dev/typescript/tutorials/instantiated-objects)
