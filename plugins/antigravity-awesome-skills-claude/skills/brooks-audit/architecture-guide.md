# Architecture Audit Guide — Mode 2

**Purpose:** Analyze the module and dependency structure of a system for decay risks that
operate at the architectural level. Every finding must follow the Iron Law:
Symptom → Source → Consequence → Remedy.

**Monorepo note:** Treat each deployable service or library as a top-level module. Draw
dependencies between services, not between their internal packages. Apply the Conway's Law
check at the service ownership level. Within a single service, apply standard module-level analysis.

---

## Analysis Process

Work through these six steps in order.

### Step 0: Gather Codebase Context

Before drawing anything, establish what you can see.

**If the user provided a full directory tree or pasted relevant file contents:** skip the
proactive reading below and proceed to Step 1.

**Otherwise, proactively read the project using these tools:**

1. **Top-level structure** — glob top two levels to identify module boundaries:
   ```
   Glob: **/*(depth 2, directories only)
   ```
2. **Entry points** — read the package manifest or main config file (e.g., `package.json`,
   `go.mod`, `pom.xml`, `Cargo.toml`, `pyproject.toml`) to confirm language, framework,
   and declared dependencies.
3. **Dependency edges** — grep import statements to discover inter-module calls. Run once
   per language present; limit to the first 200 matches to avoid token overrun:
   ```
   Grep: "^\s*(import|from|require\(|use )" across *.ts|*.py|*.go|*.rs|*.java
   ```
4. **Large modules** — for any top-level directory with > 10 files, read the file matching
   `index.*`, `main.*`, or `__init__.*` to understand its stated responsibility.

**Stop when you can answer all three:**
- What are the top-level modules (names and count)?
- Which modules import from which other modules?
- Which module has the highest fan-in or fan-out?

If the project has > 100 top-level files or > 4 levels of nesting, note which areas were
sampled vs. inferred, and flag this in the report scope line.

### Step 1: Draw the Module Dependency Graph (Mermaid)

Before evaluating any risk, map the dependencies as a Mermaid diagram. Use this format:

````mermaid
graph TD
  subgraph UI
    WebApp
    MobileApp
  end

  subgraph Domain
    AuthService
    OrderService
    PaymentService
  end

  subgraph Infrastructure
    Database
    MessageQueue
  end

  WebApp --> AuthService
  WebApp --> OrderService
  MobileApp --> AuthService
  MobileApp --> OrderService
  OrderService --> PaymentService
  OrderService --> Database
  OrderService --> MessageQueue
  PaymentService --> Database
  AuthService -.->|circular| OrderService

  classDef critical fill:#ff6b6b,stroke:#c92a2a,color:#fff
  classDef warning fill:#ffd43b,stroke:#e67700
  classDef clean fill:#51cf66,stroke:#2b8a3e,color:#fff

  class PaymentService critical
  class OrderService warning
  class Database,MessageQueue,AuthService,WebApp,MobileApp clean
````

Draw the graph structure first — nodes, subgraphs, and edges — without any `classDef` or
`class` lines. You cannot assign colors until you have completed the risk scan in Steps 2–4.

**After completing Step 4**, return to this graph and add the `classDef` and `class` lines
based on findings. The example above shows the final colored output.

Rules:
1. **Nodes** — Use top-level directories or services as nodes, not individual files
2. **Grouping** — One `subgraph` per architectural layer or top-level directory (e.g., UI, Domain, Infrastructure)
3. **Edges** — Solid arrows (`-->`) point FROM the depending module TO the dependency; use dotted arrows with label (`-.->|circular|`) for circular dependencies. If no circular dependencies exist, use only solid arrows
4. **Node limit** — Keep the graph to ~50 nodes maximum; collapse low-risk leaf modules into their parent if needed
5. **Fan-out** — For any node with fan-out > 5, use a descriptive label: `HighFanOutModule["ModuleName (fan-out: 7)"]`
6. **Colors** — Apply `classDef` colors AFTER completing Steps 2-4: `critical` (red `#ff6b6b`) for nodes with Critical findings, `warning` (yellow `#ffd43b`) for Warning findings, `clean` (green `#51cf66`) for nodes with no findings or only Suggestions. If no findings at all, classify all nodes as `clean`
7. **Direction** — Default to `graph TD` (top-down); use `graph LR` only if the architecture is clearly a left-to-right pipeline

### Step 2: Scan for Dependency Disorder

*The most architecturally consequential risk — scan this first.*

Look for:
- Circular dependencies (any `-.->|circular|` edge in the map above)
- Arrows flowing upward (high-level domain depending on low-level infrastructure)
- Stable, widely-depended-on modules that import from frequently-changing modules
- Modules with fan-out > 5
- Absence of a clear layering rule (no consistent answer to "what depends on what?")

### Step 3: Scan for Domain Model Distortion

Look for:
- Do module names match the business domain vocabulary?
- Is there a layer called "services" that contains all the business logic while domain objects
  are pure data structures?
- Are there modules that cross bounded context boundaries (e.g., billing logic in the user module)?
- Is there an anti-corruption layer where external systems interface with the domain?

### Step 4: Scan for Remaining Four Risks

Check each in turn:

**Knowledge Duplication:**
- Are there multiple modules implementing the same concept independently?
- Does the same domain concept appear under different names in different modules?

**Accidental Complexity:**
- Are there entire layers in the architecture that do not add value?
- Are there modules whose responsibility cannot be stated in one sentence?

**Change Propagation:**
- Which modules are "blast radius hotspots"? (A change here requires changes in many other modules)
- Does the dependency map reveal why certain features are slow to develop?

**Cognitive Overload:**
- Can the module responsibility of each module be stated in one sentence from its name alone?
- Would a new developer know which module to add a new feature to?

### Step 5: Testability Seam Assessment

A *seam* is a place in the architecture where behavior can be altered without editing source
code — typically an interface, a configuration point, or a dependency injection boundary.
Seam density is a proxy for testability and evolvability.

Scan for:
- **No seam at the infrastructure boundary**: can you replace a real database, file system,
  or HTTP client with a test double without editing the module under test? If not, the
  architecture forces integration tests where unit tests would suffice.
- **Seam collapse**: a module that was once testable in isolation has had its seams removed
  (e.g., direct constructor instantiation replaced a dependency injection point, or a global
  singleton replaced an injected collaborator).
- **Missing seam in legacy areas**: modules without an obvious injection point or interface
  boundary — any change requires touching the entire call stack to substitute behavior.

If all modules have clear seams at their infrastructure boundaries → no finding.

If seams are absent or collapsed: flag as 🟡 Warning with a Remedy pointing to the specific
module and the injection point that needs to be restored or introduced.

Source: Feathers — Working Effectively with Legacy Code, Ch. 4: The Seam Model

### Step 6: Conway's Law Check

After the six-risk scan, assess the relationship between architecture and team structure:

- Does the module/service structure reflect the team structure?
  (Conway's Law: "Organizations design systems that mirror their communication structure")
- If yes: is this intentional design or accidental coupling?
- A mismatch that causes cross-team coordination overhead for every feature is 🔴 Critical.
- A mismatch that is theoretical but not yet causing pain is 🟡 Warning.
- If team structure is unknown, note this as context missing and skip the check.

**Calibration examples:**
- 🔴 Critical: the Payments module is owned by Team A but contains auth logic owned by Team B —
  every Payments change requires a sync meeting with Team B
- 🟡 Warning: two separate teams own the `utils/` and `helpers/` directories which do the same
  things — theoretically painful but not yet causing release coordination issues
- Not a finding: a single team owns a monorepo with multiple logical modules — Conway's Law
  misalignment requires *separate teams* to be meaningful

---

## Output

Use the standard Report Template from `../_shared/common.md`. Mode: Architecture Audit.

Place the Mermaid dependency graph FIRST under "Module Dependency Graph". Reference
relevant node names in findings. Add `classDef` color assignments LAST, after all
findings are identified.
