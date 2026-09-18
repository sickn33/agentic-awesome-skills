---
name: n8n-multi-instance
description: Select, verify, and safely switch n8n MCP instances across production, staging, teams, or clients, especially before credential writes.
risk: critical
source: https://github.com/czlonkowski/n8n-skills/tree/main/skills/n8n-multi-instance
source_repo: czlonkowski/n8n-skills
source_type: community
date_added: "2026-07-21"
author: Romuald Czlonkowski
license: MIT
license_source: https://github.com/czlonkowski/n8n-skills/blob/main/LICENSE
---

# Working with multiple n8n instances over MCP

## When to Use

Use this skill whenever one MCP connection can target multiple n8n instances, before instance-specific reads or writes, and whenever results suggest the session is aimed at the wrong environment.

Resolve the target by stable instance ID, verify it with a read-only health check, and state the resolved environment before mutations. Require explicit confirmation for credential create/update/delete operations, never print secret values, and stop on ambiguous targeting rather than guessing.

When the `n8n_instances` tool is available, the user has **multi-instance mode** on: one MCP
connection can reach several n8n instances (e.g. `prod`, `staging`, or one per client/team).
Every other n8n tool (`n8n_get_workflow`, `n8n_list_workflows`, `n8n_update_partial_workflow`,
`n8n_manage_datatable`, `n8n_manage_credentials`, `n8n_executions`, `n8n_test_workflow`, …) runs
against **whichever instance this session is currently targeting**. There is no per-call instance
argument: you change the target only by switching. Target the wrong instance and a read returns the
wrong data and a write lands in the wrong place — usually with **no error** (the one exception is an
ambiguous credential write, which fails closed; see below). So target deliberately.

If the `n8n_instances` tool is **not** present, the account is single-instance: ignore this skill
and use the n8n tools directly.

## Golden rules

Six rules. Each prevents a class of silent misroute.

1. **Discover first.** Call `n8n_instances({mode:"list"})` before acting so you know the instance
   names and which one is `current`.
2. **Switch by name to your target** before doing work on a non-default instance:
   `n8n_instances({mode:"switch", name:"<instance name>"})`. The match is case-insensitive.
3. **Switch in its own turn.** Never put a `switch` and a dependent operation in the **same
   parallel tool-call batch**. Calls in one batch have no guaranteed order, so the dependent call
   can be resolved against the *previous* instance before the switch's session state is visible.
   Switch, let it return, *then* operate.
4. **Verify before high-stakes ops.** Immediately before creating/updating/deleting **credentials**
   (and before destructive workflow edits), confirm `current` is the instance you intend — primary
   check is `n8n_instances({mode:"list"})`. The system fail-closes only the *ambiguous* credential
   case (rule 6); an explicit switch to the **wrong** instance still writes there silently, so this
   check is on you.
5. **An unexpected `NOT_FOUND` is almost always a wrong-instance misroute, not a deletion.** Don't
   recreate the object. Re-check the current instance and retry (see Recovery).
6. **On `INSTANCE_AMBIGUOUS`, switch on *this* session, then retry.** The system is refusing to
   write a secret because this session never picked a target itself. Comply — run `switch` here to
   confirm the instance, then retry the write. Don't work around it or retry blindly.

## Core workflow

```
1. n8n_instances({mode:"list"})                      # see available[] + current + default
2. n8n_instances({mode:"switch", name:"prod"})       # bind THIS session to "prod"
   → returns { previous, current }; confirm current.name == "prod"
3. (do your work) n8n_list_workflows / n8n_get_workflow / n8n_manage_datatable / ...
4. Before a credential write or a delete:
   n8n_instances({mode:"list"})  → re-confirm current, THEN n8n_manage_credentials({action:"create", ...})
```

To move to another instance, just `switch` again. The whole session follows the switch.

## The `n8n_instances` tool

Two modes (`mode` is required and enum-validated):

- `{mode:"list"}` → `{ current, default, available }`, no side effects.
  - `current` and `default` are each one instance `{ id, name, url, isDefault }` (or `null`).
  - `available` is every instance, each with an extra `isCurrent` boolean. Match by **`name`**;
    never hard-code `id`.
- `{mode:"switch", name:"<name>"}` → `{ previous, current }`, and binds this session to the named
  instance. `name` is case-insensitive.

### Error envelope (from the `n8n_instances` tool)

Every error returns `{ error: "<CODE>", message, … }`. The ones you'll actually hit:

| Code | When | What to do |
|---|---|---|
| `UNKNOWN_INSTANCE` | `name` matches no instance | Pick a name from the `available` list in the error payload and retry. |
| `NAME_REQUIRED` | `switch` with no `name` | Re-call with a `name` (the error lists the valid ones in `available`). |
| `MULTI_INSTANCE_DISABLED` | multi-instance mode is off | There's nothing to switch; use the n8n tools directly. The user can enable it at the n8n-mcp dashboard. |
| `NO_SESSION` | the request has **neither** an MCP session id **nor** a credential id | A selection has nowhere to land. Reconnect / initialize a session, then switch. |
| `UNKNOWN_MODE` | `mode` wasn't `list`/`switch` | Use `list` or `switch`. |
| `INVALID_CONTEXT` | server-side metadata missing | A server bug, not your input — report it. |

> Instance names can never be `default`, `current`, `list`, or `switch` (reserved), so you'll never
> see an instance literally named after a mode or field.

### `INSTANCE_AMBIGUOUS` (from the credential-write path, not the tool)

A separate, higher-stakes error. It is **not** returned by `n8n_instances` — it's returned by the
server when you call `n8n_manage_credentials` to **create/update/delete** a credential and the target
instance is ambiguous: this session never switched on its own but inherited a switch made elsewhere
(a fan-out / reconnect), pointing at a **non-default** instance. Rather than risk writing a secret to
the wrong instance, the server **blocks the write** (it never reaches n8n, no quota is charged) and
returns:

```json
{
  "error": "INSTANCE_AMBIGUOUS",
  "message": "… the session issuing this request never switched there itself … Re-run n8n_instances({mode:\"switch\", name:\"…\"}) on this session to confirm the target …",
  "lastSelected": { "id": "…", "name": "…" },
  "default":      { "id": "…", "name": "…" }
}
```

**Fix:** decide which instance you actually want (`lastSelected` is the inherited switch, `default`
is the account default), run `n8n_instances({mode:"switch", name:"…"})` on **this** session, then
retry the write. See rule 6.

## How targeting behaves (mental model)

- A `switch` **binds this session** to the chosen instance. The binding **persists for the rest of
  the session and survives reconnects, idle, and backend deploys** (~24h, the MCP session lifetime)
  — you should not need to re-switch before every call.
- Other sessions / terminals are **independent**: switching here does not move them.
- One session targets **one instance at a time**. There is no per-call instance argument; you
  change the target only via `switch`.
- **Reads and non-credential writes** route to the currently-selected instance, silently — a
  misroute produces wrong data or a `NOT_FOUND`, not an error.
- **Credential writes are the one guarded case.** They route the same way, except the server
  fail-closes the *ambiguous* state (a session that never switched, recovered onto a non-default
  instance) with `INSTANCE_AMBIGUOUS`. This is a safety net, not a substitute for rule 4: an
  explicit switch to the wrong instance still writes there.
- **If your selected instance is deleted** (the user removes it mid-session), the next call silently
  falls back to your **default** instance — no error. So default's data appearing where you expected
  another instance's can look like "my data vanished." Re-list to see where you are.

## Recovery playbook

| Symptom | What it usually means | Do this |
|---|---|---|
| `INSTANCE_AMBIGUOUS` on a credential create/update/delete | This session never switched itself; the system won't guess which instance to write the secret to | Run `n8n_instances({mode:"switch", name:"<target>"})` on this session (the error names `lastSelected` and `default` — pick the one you want), then retry the write. Never retry blindly. |
| `NOT_FOUND` for a workflow/datatable/credential you **know exists** | You're pointed at the wrong instance — **not** that it was deleted | `n8n_instances({mode:"list"})` → check `current`. If it's not your target, `switch` and retry. **Do not recreate the object.** |
| A read returns **empty or unfamiliar** data | Wrong-instance read, or a silent fallback to `default` after your instance was deleted | `n8n_instances({mode:"list"})`, confirm `current`, switch if needed, re-read before drawing conclusions. |
| `UNKNOWN_INSTANCE` on `switch` | The `name` is wrong (typo, or you guessed) | Read the `available` names in the error and switch to one of those. Names are case-insensitive. |
| `n8n_health_check` reports an `instanceName` you didn't expect | This session is on a different instance than you think | `switch` to the intended instance, then proceed. |
| Repeated misroutes within one turn | You batched a `switch` with dependent work | Split them: `switch` alone, await the result, then operate one logical step at a time. |

After any recovery switch, sanity-check with `n8n_instances({mode:"list"})` (read `current`) as the
primary signal. `n8n_health_check` also returns the resolved instance under `details.instanceName`,
but it can be absent on some paths (legacy/chat), so treat it as a secondary confirmation.

## Credential operations (highest stakes)

Credentials hold live secrets, and a misrouted credential write puts a secret on the **wrong
instance**. The server protects the **ambiguous** case automatically — if this session never picked
a target and inherited a switch to a non-default instance, the write fails closed with
`INSTANCE_AMBIGUOUS` (rule 6) and never reaches n8n. But that net is narrow: a credential write on a
session that **did** switch goes through to whatever instance it switched to, with no second
guess. So:

- **Verify `current` immediately before** `n8n_manage_credentials` create/update/delete — call
  `n8n_instances({mode:"list"})` in the same short sequence, not 10 steps earlier where a later
  switch could have moved you.
- **On `INSTANCE_AMBIGUOUS`**, switch on this session to confirm the target, then retry — don't
  work around it.
- Credential **reads** (`action:"list"`/`"get"`/`"getSchema"`) are not gated and don't write a
  secret, but a read off the wrong instance returns the wrong schema or list — so still verify
  `current` if the result looks wrong.
- For the `n8n_manage_credentials` tool itself (CRUD shapes, `getSchema` discovery, never inlining
  secrets into text fields), see `n8n-mcp-tools-expert`.

## Common multi-instance task: copy something between instances

To recreate a credential or workflow from instance A on instance B:

```
1. switch → A;  read the source (n8n_manage_credentials get / n8n_get_workflow)
2. switch → B   (its own call — never batched with the create below)
3. n8n_instances({mode:"list"})  → confirm current == B
4. create on B  (n8n_manage_credentials create / n8n_create_workflow)
```

Do each instance's steps in its own turn; never overlap `switch → B` with the create-on-B call
(rule 3), and switch explicitly on this session before the credential write so it isn't ambiguous
(rules 4 and 6).

## Quick reference

- See instances + where you are: `n8n_instances({mode:"list"})` → `{ current, default, available }`
- Change target: `n8n_instances({mode:"switch", name:"<name>"})` — its own turn, then operate
- Confirm target: `current` from `list` (primary); `details.instanceName` from `n8n_health_check` (secondary, may be absent)
- `UNKNOWN_INSTANCE` → switch to a name from the error's `available` list, then retry
- `INSTANCE_AMBIGUOUS` (credential write) → `switch` on this session to confirm the target, then retry
- Unexpected `NOT_FOUND` → verify the instance, switch, retry; **do not recreate**
- Before credential writes → re-`list`, confirm `current`, then write (the fail-close only covers the ambiguous case)

## Integration with other skills

- **n8n-mcp-tools-expert** — owns `n8n_manage_credentials` (CRUD + `getSchema`) and the rule that
  secrets go through the credential system, never text fields. This skill adds the "which instance?"
  layer on top.
- **using-n8n-mcp-skills** — the router; consult it for which skill owns a given build step.

## Limitations

- Instance discovery and switching depend on the connected n8n MCP server exposing multi-instance tools.
- A successful switch does not authorize mutations or prove that the selected environment is appropriate for the task.
- Unexpected empty or missing data may have causes other than misrouting; verify before changing targets.
