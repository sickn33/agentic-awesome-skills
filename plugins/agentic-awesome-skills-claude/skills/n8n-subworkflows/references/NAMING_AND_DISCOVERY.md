# Naming and discovery

A sub-workflow nobody can find gets rebuilt. The community MCP can't read, write, or filter by tags — tags are a UI-only concept — so the **only searchable surface is the workflow's name and description**, via `n8n_list_workflows` (scan the library) and `n8n_get_workflow` (read a candidate's inputs/outputs and body). That makes naming the discovery mechanism, not a cosmetic nicety. Put your discovery hooks in the name and description deliberately.

---

## Tags don't help here

n8n has tags in the UI, but the MCP can't see them. Don't rely on tags for AI-side discovery — anything you want re-found later has to be findable by name or description.

---

## The naming convention is the discovery mechanism

Use verb-first prefix names. The prefix groups the library; the verb + object says what it does:

```
Subworkflow: <verb> <object>      # stateless, generic, reusable anywhere
<Domain>: <verb> <object>         # domain-specific (Customer, Billing, Notification, …)
Tool: <description>               # exposed as an AI-agent tool
```

Examples:

- `Subworkflow: Parse RFC2822 date`
- `Subworkflow: Compute MRR from subscription`
- `Subworkflow: Format invoice as HTML`
- `Customer: hydrate from Stripe`
- `Customer: write to billing table`
- `Billing: compute MRR`
- `Notification: send + log`
- `Tool: list available credentials`

Why this works when the only search is name/description matching:

- Scanning the list for `Subworkflow:` surfaces every reusable sub-workflow.
- Scanning for `Customer:` surfaces every customer-domain sub-workflow.
- Scanning for `Tool:` surfaces every agent-callable tool.
- Scanning for `date` surfaces anything with "date" in its name or description, regardless of prefix.

Put a prefix on **every** sub-workflow, at create time. It's far easier than retrofitting once callers exist.

---

## Search-before-build, in practice

Before writing logic for a generic problem, scan the library:

```
n8n_list_workflows()                          # then filter the results by name
n8n_get_workflow({ id: "<candidate>" })       # read description + inputs/outputs + body
```

When to look: any time you're about to build something that fits a domain or an operation keyword. About to parse a date? Look for `date`. Format an invoice? `invoice`. Send a Slack notification? `Slack` and `Notification`. Two scans is cheap; a duplicate is not.

If a candidate matches, fetch it with `n8n_get_workflow` and read the `description` first — that's the contract. If the inputs/outputs fit, use it. If it's close-but-not-quite, decide whether to extend the existing one or build a deliberate variant (and name the variant so *it* is findable too).

If you expected to find a workflow and it isn't showing up, the most common cause isn't naming — it's that the workflow isn't exposed to the MCP at all. Confirm it exists and is reachable before assuming it's missing.

---

## The description as a discoverability tool

After a name match, the reader reads the `description`. Make it scan well — what it does, the output shape, the typical caller:

```
Parses an RFC2822-formatted date string into ISO format.
Returns { ok: true, iso: "..." } or { ok: false, error: "invalid_format" }.
Used by webhook handlers that receive email-style timestamps.
```

The description also feeds name/description matching, so seed it with representative keywords ("RFC2822", "date", "ISO", "webhook") so varied scans surface it. A sub-workflow with no description forces the reader to open and inspect every node to figure out what it is — which usually ends in them rebuilding it.

---

## Naming at create time

Set the name and description when you create the workflow, not later:

```
n8n_update_partial_workflow({
  id: "<new workflow id>",
  operations: [
    { type: "updateSettings", /* name + description carried on the workflow object */ }
  ]
})
```

In practice you'll set `name` and `description` on the workflow when you create it, then add the trigger and body nodes via `addNode` / `addConnection`. The point is: don't let a new sub-workflow ship without the prefix and a real description.

---

## What a healthy library looks like

Roughly:

- 5–20 `Subworkflow:` entries for common shapes (date parsing, ID generation, formatting…).
- A handful of domain sub-workflows per main domain (`Customer:`, `Billing:`, `Notification:`).
- Fewer per-domain "operations" sub-workflows (write to billing table, send email + log).

Counter-signals:

- **100 sub-workflows** → likely lots of near-duplicates to merge.
- **0 sub-workflows** → no extraction; logic is being duplicated inline.
- **50 entries named `Helper`, `Util1`, `Helper2`** → discoverability is broken. Rename to the prefix convention.

When the user asks "what sub-workflows do we have?", scan with `n8n_list_workflows`, filter by prefix, and return a list with each name plus a one-line summary pulled from its description. That's also a good moment to spot duplicates and propose consolidating.

---

## Cross-project sub-workflows

On Cloud or project-enabled instances, sub-workflows live inside a project, and by default a workflow can only call sub-workflows in its own project. Sharing across projects is opt-in.

Only share cross-project when **both** hold:

- **Stateless** — no project-scoped credentials, Data Tables, or other state that wouldn't make sense outside the owning project.
- **Generic problem** — date parsing, ID generation, signature validation, formatting. Clearly not coupled to one project's domain.

A stateful sub-workflow (`Customer: get by id`) shared across projects would pull one project's data into another's workflows, which is almost never intended. Keep those in-project and let each project own its repository layer. For ones that meet the bar, tell the user — they share via the n8n UI — and note the cross-project intent in the description.

---

## Renaming and reorganizing

For duplicates or poorly-named sub-workflows:

- **Renaming preserves the workflow ID**, so existing Execute Workflow callers (which reference the ID, not the name) keep working. The new name shows up in scans immediately.
- n8n has no alias mechanism — just rename, update any sticky-note references inside callers, and move on.
- For a mass rename, audit callers first: `n8n_list_workflows` to find candidates, then `n8n_get_workflow` on each to check its Execute Workflow node for the old workflow ID before you touch anything.
