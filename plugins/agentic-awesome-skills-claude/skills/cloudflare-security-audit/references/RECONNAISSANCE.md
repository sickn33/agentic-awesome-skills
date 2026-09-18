# Reconnaissance

### Phase 1: Understand the application

Before using prior-run context, verify the current run's `target.json` against the candidate run: canonical physical path, normalized origin owner/repository URL, and derived target ID must all match exactly. A repository basename is never a target identity. Ignore mismatched or missing manifests rather than importing their findings.

Before looking for bugs, understand what you're auditing. This requires depth, not just a directory listing. Launch **multiple `research` agents in parallel** to map different aspects of the codebase:

**Agent 1a: Overview, tech stack, and comparable baseline**
```
Explore the codebase at <path>. Answer:
1. What is this application? What kind of software? (web app, API, CLI tool, library, daemon, desktop app, mobile backend, etc.)
2. Who uses it and how? (end users, developers, operators, other services)
3. What's the tech stack? (languages, frameworks, databases, runtime, deployment model)
4. What comparable mainstream software exists? What security tradeoffs does the comparable accept?
5. What's the high-level directory structure?
Return specific file paths for key entry points.
```

**Agent 1b: Trust boundaries and access control**
```
Explore the codebase at <path>. Find and read ALL code related to:
1. Trust boundaries — where does untrusted input enter the system? (HTTP requests, CLI args, file reads, IPC, message queues, environment variables, config files, etc.)
2. Authentication — how do callers prove identity? (sessions, tokens, API keys, mTLS, Unix sockets, etc.) If there's no authentication, note that.
3. Authorization — how are permissions enforced? (middleware, decorators, capability checks, file permissions, etc.) If there's no authorization model, note that.
4. Privilege separation — does the code run as root? Drop privileges? Use sandboxing? Fork workers?
5. Any bypass mechanisms (dev-only modes, test helpers, setup flows, debug flags)
Return the trust model: who are the actors, what can each do by design, and which code enforces it. Include specific file paths and line numbers.
```

**Agent 1c: Input surface inventory**
```
Explore the codebase at <path>. Produce a complete inventory of where external input enters the system:
1. Network-facing surfaces (HTTP endpoints, gRPC services, WebSocket handlers, TCP/UDP listeners, etc.) — list each with method/verb and purpose
2. File-based input (file uploads, config file parsing, log ingestion, import/export, etc.)
3. IPC and inter-service input (message queues, shared memory, Unix sockets, environment variables, CLI arguments)
4. User-generated content surfaces (anywhere users provide content that is stored and later rendered, served, or processed)
5. External integrations (OAuth, webhooks, third-party APIs, plugin loading, dynamic code execution)
6. All places where input reaches dangerous sinks (SQL/query builders, HTML/template output, file paths, shell commands, deserialization, eval, dynamic imports)
Return specific file paths. Be exhaustive.
```

Collect all three agents' outputs and synthesize them into `<output-dir>/architecture.md`:
- 1-2 page structured summary covering application type, tech stack, trust model, input surfaces, and baseline comparable
- Include the key file paths from all agents — these become the starting points for Phase 2
- This document is injected verbatim into every Phase 2 agent prompt

If Phase 1 agents reveal the codebase is larger or more complex than expected (e.g., plugin system, multi-tenant architecture, complex auth chains, multiple deployment targets), launch additional `research` agents to map those areas before proceeding. The quality of Phase 2 depends entirely on the quality of Phase 1.
