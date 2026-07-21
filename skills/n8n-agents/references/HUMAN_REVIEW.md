# Human review for agent tools

Human review gates a tool behind explicit human approval. Until a human approves, the wrapped tool does not run — no matter how confident the agent is. This is the default safety pattern for any agent tool with user-visible side effects.

n8n names this **HITL** / human-in-the-loop in the node IDs (`slackHitlTool`, `discordHitlTool`, …) and "Human Review" in the UI. Same concept.

**Before adding or skipping review, ask the user.** Whether sign-off is needed is a product/policy call (blast radius, audit requirements, how much they trust the model). Surface the question, recommend based on the criteria below, and let them decide.

---

## Topology

The review node sits **between** the wrapped tool and the agent on the `ai_tool` connection:

```
[wrapped tool]  --ai_tool-->  [review node]  --ai_tool-->  [Agent]
```

- **The agent doesn't know the review node is there.** It sees the wrapped tool by the wrapped tool's name, description, and parameter schema. The review node is a transparent intercept on the execution path.
- When the agent calls the wrapped tool, the review node intercepts: collects the parameters the agent built, pauses, sends an approval prompt to a human, and only on approval does the wrapped tool run with those parameters.

In workflow JSON, the wrapped tool's `ai_tool` output points at the **review node**, and the review node's `ai_tool` output points at the **agent**:

```json
"Refund customer": {
  "ai_tool": [[{ "node": "Slack approval", "type": "ai_tool", "index": 0 }]]
},
"Slack approval": {
  "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
}
```

Do NOT wire the wrapped tool into the agent's `main` input — that flags the wrapped tool as a disconnected node in `validate_workflow`. The wrapped-tool-into-review wiring happens through `ai_tool` only.

---

## Tell the agent the review is there

Because the agent doesn't see the review node, it doesn't know its tool is gated. Models with safety priors hedge on destructive-looking tools (send, delete, refund, charge): they refuse, ask the user for confirmation first, or pick a less-direct option. With review wrapping the tool, that caution doubles up — the model self-censors AND a human reviews, and sometimes the model never even reaches the review step.

If you see the agent over-hedging on a wrapped tool, add a note to the **wrapped tool's description** (per the modular-prompt principle in **SYSTEM_PROMPT.md**):

> This tool is gated by a human review step. Use it freely when relevant. A human will see the exact parameters and approve before anything is sent. Don't ask the user for confirmation first.

Don't pre-emptively add this to every wrapped tool — many agents use the tool freely without it. Deploy when the symptom (hedging, refusing, talking itself out of trying) actually shows up.

---

## When to default to / recommend human review

- **Sends, pays, refunds, account changes** — anything user-visible and hard to roll back.
- **The approver differs from the chatter** — a customer triggers a workflow; support staff approves the refund. The customer never sees the approval.
- **Non-chat triggers** — order received, form submitted, schedule fired. The action is taken on someone's behalf, and a person approves before it runs.
- **Production agent tools** where the cost of a wrong call (money, trust, reputation) outweighs a one-step delay.

Skip review when the tool is read-only, idempotent and cheap to undo, or the deployment is internal/exploratory with mocked services.

---

## Available review tool nodes

| Node | When to use |
|---|---|
| `n8n-nodes-base.slackHitlTool` | Approver is on Slack (the common multi-channel case) |
| `n8n-nodes-base.discordHitlTool` | Approver is on Discord |
| `n8n-nodes-base.telegramHitlTool` | Approver is on Telegram |
| `n8n-nodes-base.gmailHitlTool` | Approval via Gmail |
| `n8n-nodes-base.emailSendHitlTool` | Approval via generic SMTP email |
| `n8n-nodes-base.googleChatHitlTool` | Approval in Google Chat |
| `n8n-nodes-base.microsoftOutlookHitlTool` | Approval via Outlook |

More platforms are added over time — verify with `search_nodes({ query: 'hitl' })`.

---

## Response types

`responseType` chooses the response shape the human sees:

- **`approval`** — button-based, sub-configured via `approvalOptions.values.approvalType`:
  - `'single'` (default): one Approve button. The approver acts or ignores.
  - `'double'`: Approve / Disapprove. For actions where disapproval should be a loud, recordable choice.
- **`freeText`** — the human types a free-form response. For when the agent is genuinely asking a question and any answer is valid.
- **`customForm`** — a multi-field form (text, dropdown, radio, checkbox, file). **This is the practical answer to "editable parameters"**: define a form whose fields match the wrapped tool's parameters and the human can override what the agent picked.

A two-button "semantic choice" ("Schedule today" / "Schedule tomorrow") is NOT a separate type — use `approval` with `approvalType: 'double'` and custom `approveLabel` / `disapproveLabel`.

---

## Wait timeout

`options.limitWaitTime` (seconds) bounds how long the workflow pauses before erroring out. Default is 45 minutes. **Set it explicitly on production workflows** — without it, paused executions sit indefinitely if approvers don't act, and the queue piles up.

---

## Approval message content — show the ACTUAL parameters

The model picked the parameters; the human approves the literal call. Reference the real values via `{{ $tool.parameters.<name> }}`:

```
The agent wants to refund {{ $tool.parameters.amount }} to {{ $tool.parameters.customerId }}.
Reason: {{ $tool.parameters.reason }}.
```

`$tool.name` is the wrapped tool's display name; `$tool.parameters` is the full object the agent built. To avoid silently leaving a new parameter out of the message, iterate over all of them:

```
The agent wants to call {{ $tool.name }}:
{{
  $tool.parameters.keys()
    .map(param => `${param}: ${$tool.parameters[param]}\n`)
    .join('')
}}
```

### Never fill the approval message via `$fromAI()`

`$fromAI()` asks the *model* to produce a value — including, if you let it, the approval text itself. The human would then approve a model-paraphrased description instead of the literal parameters about to be sent. That defeats the entire point of review.

```
// ❌ WRONG — the model paraphrases what it's about to do
message: ={{ $fromAI('approvalText', 'describe the action for approval') }}

// ✅ RIGHT — the literal call is visible
message: =Refund {{ $tool.parameters.amount }} to {{ $tool.parameters.customerId }}?
```

### Put values in the button labels

```json
"approvalOptions": {
  "values": {
    "approvalType": "double",
    "approveLabel": "=Approve {{ $tool.parameters.amount }} refund",
    "disapproveLabel": "Cancel"
  }
}
```

A button that says "Approve $50 refund" is unambiguous; "Approve" alone is not. `slackHitlTool` also exposes `buttonApprovalStyle` / `buttonDisapprovalStyle` (`'primary' | 'secondary'`) for visual emphasis.

---

## Multi-channel pattern: the approver isn't the chatter

A common production shape: a customer chats with an agent on a website (or via email/order/form), and support staff approves sensitive actions in Slack.

```
[customer chat / order trigger]
   → [Agent]
       → [Slack review tool]  →  [refund / cancel / escalate tool]
```

The customer never sees the Slack channel. The Slack review message routes via `slackHitlTool.parameters.user` (a resource locator). On approval, the wrapped tool fires and the agent's response goes back to the customer via the original path. This works without any chat at all — the trigger can be a webhook, schedule, form, or queue; the review tool is the only human-facing surface.

---

## Editable parameters: use customForm

For "approve, but at $40 instead of $50" workflows, use `responseType: 'customForm'`. The human fills a multi-field form whose values feed the wrapped tool. Don't try to build editable approvals on top of the `approval` type — the form mode is the supported path.

> Note: the form mode UX is reported to feel like a workaround. Sometimes it's better UX to have the user decline and respond with the change in chat.

---

## UI quirk: test-data autofill

When building a review tool, click "Approve" once on the canvas test execution. n8n autofills the test data so subsequent runs work without manual input. New builders often think the tool is broken because `$tool.parameters.<name>` shows red — that's just missing test data.

---

## Anti-patterns

| Anti-pattern | What goes wrong | Fix |
|---|---|---|
| Tool that mutates user-visible state without review | Agent fires irreversible action on a wrong inference | Wrap with the right review tool node |
| Approval message via `$fromAI()` | You approve a paraphrase, not the literal call | Use `$tool.parameters.<name>` |
| "Approve" button with no context | Approver clicks without seeing what they approve | Embed actual values in the label |
| Review on a channel the approver doesn't watch | Tool sits indefinitely, executions pile up | Pick a watched channel; set `limitWaitTime` + a fallback |
| Wrapped tool wired into the agent's `main` input | Flags as a disconnected node in validation | Wire wrapped-tool → review → agent via `ai_tool` only |
