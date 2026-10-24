# Skill Creator - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## About Skills

Skills are modular knowledge packages that transform general-purpose agents into specialized experts:

1. **Procedural knowledge** — Multi-step workflows for specific domains
2. **SDK expertise** — API patterns, authentication, error handling for Azure services
3. **Domain context** — Schemas, business logic, company-specific patterns
4. **Bundled resources** — Scripts, references, templates for complex tasks

---


## Core Principles

### 1. Concise is Key

The context window is a shared resource. Challenge each piece: "Does this justify its token cost?"

**Default assumption: Agents are already capable.** Only add what they don't already know.

### 2. Fresh Documentation First

**Azure SDKs change constantly.** Skills should instruct agents to verify documentation:

```markdown
## Before Implementation

Search `microsoft-docs` MCP for current API patterns:
- Query: "[SDK name] [operation] python"
- Verify: Parameters match your installed SDK version
```

### 3. Degrees of Freedom

Match specificity to task fragility:

| Freedom | When | Example |
|---------|------|---------|
| **High** | Multiple valid approaches | Text guidelines |
| **Medium** | Preferred pattern with variation | Pseudocode |
| **Low** | Must be exact | Specific scripts |

### 4. Progressive Disclosure

Skills load in three levels:

1. **Metadata** (~100 words) — Always in context
2. **SKILL.md body** (<5k words) — When skill triggers
3. **References** (bounded relevant reads) — As needed

**Keep SKILL.md under 500 lines.** Split into reference files when approaching this limit.

---


## Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/      — Executable code
    ├── references/   — Documentation loaded as needed
    └── assets/       — Output resources (templates, images)
```

### SKILL.md

- **Frontmatter**: `name` and `description`. The description is the trigger mechanism.
- **Body**: Instructions loaded only after triggering.

### Bundled Resources

| Type | Purpose | When to Include |
|------|---------|-----------------|
| `scripts/` | Deterministic operations | Same code rewritten repeatedly |
| `references/` | Detailed patterns | API docs, schemas, detailed guides |
| `assets/` | Output resources | Templates, images, boilerplate |

Include supporting documentation only when useful and required by the host repository; preserve upstream license/attribution files.

---


## Creating Azure SDK Skills

When creating skills for Azure SDKs, follow these patterns consistently.

### Skill Section Order

Follow this structure (based on existing Azure SDK skills):

1. **Title** — `# SDK Name`
2. **Installation** — `pip install`, `npm install`, etc.
3. **Environment Variables** — Required configuration
4. **Authentication** — Supported credential flow for the service and deployment
5. **Core Workflow** — Minimal viable example
6. **Feature Tables** — Clients, methods, tools
7. **Best Practices** — Numbered list
8. **Reference Links** — Table linking to `/references/*.md`

### Authentication Pattern (All Languages)

Prefer an appropriate Microsoft Entra credential when the SDK supports it.
DefaultAzureCredential can help local development; production should select the
intended managed/workload identity explicitly and constrain tenant/scopes/RBAC.
Browser/public clients require their supported interactive flow, never a server
secret. The ServiceClient identifiers below are pseudocode, not real package APIs.

```python
# Python
from azure.identity import DefaultAzureCredential
credential = DefaultAzureCredential()
client = ServiceClient(endpoint, credential)
```

```csharp
// C#
var credential = new DefaultAzureCredential();
var client = new ServiceClient(new Uri(endpoint), credential);
```

```java
// Java
TokenCredential credential = new DefaultAzureCredentialBuilder().build();
ServiceClient client = new ServiceClientBuilder()
    .endpoint(endpoint)
    .credential(credential)
    .buildClient();
```

```typescript
// TypeScript
import { DefaultAzureCredential } from "@azure/identity";
const credential = new DefaultAzureCredential();
const client = new ServiceClient(endpoint, credential);
```

**Never hardcode credentials. Use environment variables.**

### Standard Verb Patterns

These are naming tendencies, not cross-service contracts. Verify each actual
method, language, operation result, retry and idempotency semantics:

| Verb | Behavior |
|------|----------|
| `create` | Create new; fail if exists |
| `upsert` | Create or update |
| `get` | Retrieve; error if missing |
| `list` | Return collection |
| `delete` | May return not-found or another error; service-specific |
| `begin` | Start long-running operation |

### Language-Specific Patterns

See the SDK's official versioned documentation for detailed patterns (the upstream `azure-sdk-patterns.md` is not bundled) including:

- **Python**: `ItemPaged`, `LROPoller`, context managers, Sphinx docstrings
- **.NET**: `Response<T>`, `Pageable<T>`, `Operation<T>`, mocking support
- **Java**: Builder pattern, `PagedIterable`/`PagedFlux`, Reactor types
- **TypeScript**: `PagedAsyncIterableIterator`, `AbortSignal`, browser considerations

### Example: Azure SDK Skill Structure

```markdown
---
name: skill-creator
description: |
  Azure AI Example SDK for Python. Use for [specific service features].
  Triggers: "example service", "create example", "list examples".
---

# Azure AI Example SDK

## Installation

\`\`\`bash
# Pseudocode package name, do not install azure-ai-example
\`\`\`

## Environment Variables

\`\`\`bash
AZURE_EXAMPLE_ENDPOINT=https://<resource>.example.azure.com
\`\`\`

## Authentication

\`\`\`python
import os
from azure.identity import DefaultAzureCredential
from azure.ai.example import ExampleClient

credential = DefaultAzureCredential()
client = ExampleClient(
    endpoint=os.environ["AZURE_EXAMPLE_ENDPOINT"],
    credential=credential
)
\`\`\`

## Core Workflow

\`\`\`python
# Create
item = client.create_item(name="example", data={...})

# List (pagination handled automatically)
for item in client.list_items():
    print(item.name)

# Long-running operation
poller = client.begin_process(item_id)
result = poller.result()

# Cleanup
client.delete_item(item_id)
\`\`\`

## Reference Files

| File | Contents |
|------|----------|
| references/tools.md | Tool integrations |
| references/streaming.md | Event streaming patterns |
```

---


## Skill Creation Process

1. **Gather SDK Context** — Identify package, target language and installed version from the user/project before asking for missing essentials
2. **Understand** — Research SDK patterns from official docs
3. **Plan** — Identify reusable resources and product area category
4. **Create** — Use the destination repository canonical skill path
5. **Categorize** — Follow its supported metadata/layout
6. **Test** — Create acceptance criteria and test scenarios
7. **Document** — Update README.md skill catalog
8. **Iterate** — Refine based on real usage

### Step 1: Gather SDK Context (REQUIRED)

**Before writing concrete SDK calls, establish from project/user evidence:**

| Required | Example | Purpose |
|----------|---------|---------|
| **SDK Package** | `azure-ai-agents`, `Azure.AI.OpenAI` | Identifies the exact SDK |
| **Documentation URL** | `https://learn.microsoft.com/en-us/azure/ai-services/...` | Primary source of truth |
| **Repository** (optional) | `Azure/azure-sdk-for-python` | For code patterns |

**Prompt the user if not provided:**
```
To create this skill, I need:
1. The SDK package name (e.g., azure-ai-projects)
2. The Microsoft Learn documentation URL or GitHub repo
3. The target language (py/dotnet/ts/java)
```

**Search official docs first:**
```bash
# Use microsoft-docs MCP to get current API patterns
# Query: "[SDK name] [operation] [language]"
# Verify: Parameters match the latest SDK version
```

### Step 2: Understand the Skill

Gather concrete examples:

- "What SDK operations should this skill cover?"
- "What triggers should activate this skill?"
- "What errors do developers commonly encounter?"

| Example Task | Reusable Resource |
|--------------|-------------------|
| Same auth code each time | Code example in SKILL.md |
| Complex streaming patterns | `references/streaming.md` |
| Tool configurations | `references/tools.md` |
| Error handling patterns | `references/error-handling.md` |

### Step 3: Plan Product Area Category

Skills are organized by **language** and **product area** in the `skills/` directory via symlinks.

**Product Area Categories:**

| Category | Description | Examples |
|----------|-------------|----------|
| `foundry` | AI Foundry, agents, projects, inference | `azure-ai-agents-py`, `azure-ai-projects-py` |
| `data` | Storage, Cosmos DB, Tables, Data Lake | `azure-cosmos-py`, `azure-storage-blob-py` |
| `messaging` | Event Hubs, Service Bus, Event Grid | `azure-eventhub-py`, `azure-servicebus-py` |
| `monitoring` | OpenTelemetry, App Insights, Query | `azure-monitor-opentelemetry-py` |
| `identity` | Authentication, DefaultAzureCredential | `azure-identity-py` |
| `security` | Key Vault, secrets, keys, certificates | `azure-keyvault-py` |
| `integration` | API Management, App Configuration | `azure-appconfiguration-py` |
| `compute` | Batch, ML compute | `azure-compute-batch-java` |
| `container` | Container Registry, ACR | `azure-containerregistry-py` |

**Determine the category** based on:
1. Azure service family (Storage → `data`, Event Hubs → `messaging`)
2. Primary use case (AI agents → `foundry`)
3. Existing skills in the same service area

### Step 4: Create the Skill

**Location in this catalog:** `skills/<skill-name>/SKILL.md`

**Naming convention:**
- `azure-<service>-<subservice>-<language>`
- Examples: `azure-ai-agents-py`, `azure-cosmos-java`, `azure-storage-blob-ts`

**For Azure SDK skills:**

1. Search `microsoft-docs` MCP for current API patterns
2. Verify against installed SDK version
3. Follow the section order above
4. Include cleanup code in examples
5. Add feature comparison tables

**Write bundled resources first**, then SKILL.md.

**Frontmatter:**

```yaml
---
name: skill-name-py
description: |
  Azure Service SDK for Python. Use for [specific features].
  Triggers: "service name", "create resource", "specific operation".
---
```

### Step 5: Follow the destination repository layout

The upstream used `.github/skills/` and language/category symlinks. This catalog
uses `skills/<skill-id>/SKILL.md`; follow its exact-base AGENTS, template and
maintenance contract. Do not create aliases/symlinks or copy generated indexes
from an unrelated repository. Categorization is metadata, not proof of quality.

### Step 6: Create Tests

**Every skill MUST have acceptance criteria and test scenarios.**

#### 6.1 Create Acceptance Criteria

**Location:** `.github/skills/<skill-name>/references/acceptance-criteria.md`

**Source materials** (in priority order):
1. Official Microsoft Learn docs (via `microsoft-docs` MCP)
2. SDK source code from the repository
3. Existing reference files in the skill

**Format:**
```markdown
# Acceptance Criteria: <skill-name>

**SDK**: `package-name`
**Repository**: https://github.com/Azure/azure-sdk-for-<language>
**Purpose**: Skill testing acceptance criteria

---

## 1. Correct Import Patterns

### 1.1 Client Imports

#### ✅ CORRECT: Main Client
\`\`\`python
from azure.ai.mymodule import MyClient
from azure.identity import DefaultAzureCredential
\`\`\`

#### ❌ INCORRECT: Wrong Module Path
\`\`\`python
from azure.ai.mymodule.models import MyClient  # Wrong - Client is not in models
\`\`\`

## 2. Authentication Patterns

#### ✅ CORRECT: DefaultAzureCredential
\`\`\`python
credential = DefaultAzureCredential()
client = MyClient(endpoint, credential)
\`\`\`

#### ❌ INCORRECT: Hardcoded Credentials
\`\`\`python
client = MyClient(endpoint, credential="[redacted API key]")  # Security risk
\`\`\`
```

**Critical patterns to document:**
- Import paths (these vary significantly between Azure SDKs)
- Authentication patterns
- Client initialization
- Async variants (`.aio` modules)
- Common anti-patterns

#### 6.2 Create Test Scenarios

**Location:** `tests/scenarios/<skill-name>/scenarios.yaml`

```yaml
config:
  model: gpt-4
  max_tokens: 2000
  temperature: 0.3

scenarios:
  - name: basic_client_creation
    prompt: |
      Create a basic example using the Azure SDK.
      Include proper authentication and client initialization.
    expected_patterns:
      - "DefaultAzureCredential"
      - "MyClient"
    forbidden_patterns:
      - "api_key="
      - "hardcoded"
    tags:
      - basic
      - authentication
    mock_response: |
      import os
      from azure.identity import DefaultAzureCredential
      from azure.ai.mymodule import MyClient

      credential = DefaultAzureCredential()
      client = MyClient(
          endpoint=os.environ["AZURE_ENDPOINT"],
          credential=credential
      )
      # ... rest of working example
```

**Scenario design principles:**
- Each scenario tests ONE specific pattern or feature
- `expected_patterns` — patterns that MUST appear
- `forbidden_patterns` — common mistakes that must NOT appear
- `mock_response` — complete, working code that passes all checks
- `tags` — for filtering (`basic`, `async`, `streaming`, `tools`)

#### 6.3 Verify honestly

The upstream `pnpm harness`, Ralph loop, tests/scenarios and docs-site extraction
scripts are not bundled here. Do not install/run them from another checkout or
invent a pass. Run only checks present and required on the destination exact base.
Mock/pattern checks test a fixture, not real SDK compatibility or authentication.
Add negative authorization, invalid inputs, paging/timeouts and cleanup boundaries
where actual runtime testing is authorized. Record SDK version, test scope and
unexecuted cloud/provider steps; use synthetic fixtures with no live secrets.

### Step 7: Update source documentation

Follow the host repository's source-only PR workflow. Generated catalog/counts,
mirrors and Pages outputs belong to its prescribed synchronization process; do
not hand-edit guessed README line numbers or run absent Astro extraction tooling.

---

## Progressive Disclosure Patterns

### Pattern 1: High-Level Guide with References

```markdown
# SDK Name

## Quick Start
[Minimal example]

## Advanced Features
- **Streaming**: See references/streaming.md
- **Tools**: See references/tools.md
```

### Pattern 2: Language Variants

```
azure-service-skill/
├── SKILL.md (overview + language selection)
└── references/
    ├── python.md
    ├── dotnet.md
    ├── java.md
    └── typescript.md
```

### Pattern 3: Feature Organization

```
azure-ai-agents/
├── SKILL.md (core workflow)
└── references/
    ├── tools.md
    ├── streaming.md
    ├── async-patterns.md
    └── error-handling.md
```

---


## Design Pattern References

| Reference | Contents |
|-----------|----------|
| `references/workflows.md` | Sequential and conditional workflows |
| `references/output-patterns.md` | Templates and examples |
| `references/azure-sdk-patterns.md` | Language-specific Azure SDK patterns |

---


## Anti-Patterns

| Don't | Why |
|-------|-----|
| Create skill without SDK context | Users must provide package name/docs URL |
| Put "when to use" in body | Body loads AFTER triggering |
| Hardcode credentials | Security risk |
| Skip authentication section | Agents will improvise poorly |
| Use outdated SDK patterns | APIs change; search docs first |
| Include README.md | Agents don't need meta-docs |
| Deeply nest references | Keep one level deep |
| Skip acceptance criteria | Skills without tests can't be validated |
| Assume upstream symlink layout | Destination catalog discovery may use different canonical paths |
| Use wrong import paths | Azure SDKs have specific module structures |

---


## Checklist

Before completing a skill:

**Prerequisites:**
- [ ] User provided SDK package name or documentation URL
- [ ] Verified SDK patterns via `microsoft-docs` MCP

**Skill Creation:**
- [ ] Description includes what AND when (trigger phrases)
- [ ] SKILL.md under 500 lines
- [ ] Authentication fits the actual supported service/deployment and least-privilege identity
- [ ] Cleanup targets only resources created in the example; deletion requires the authorized scope
- [ ] References organized by feature

**Categorization:**
- [ ] Canonical destination path and metadata match exact-base instructions.
- [ ] No unrequested aliases, generated files or absent upstream harness commands.

**Testing:**
- [ ] Concrete examples and limitations cover selected operations and failure cases.
- [ ] Required current-base checks actually run, with results and unrun SDK/cloud steps distinguished.
- [ ] Import paths/package versions and provenance recorded without invented test evidence.

**Documentation:**
- [ ] Source docs and attribution updated within authorized scope.
- [ ] Primary reference URLs/version checked; no missing file claimed as bundled.
