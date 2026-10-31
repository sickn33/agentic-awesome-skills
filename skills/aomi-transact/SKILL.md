---
name: aomi-transact
description: "Use Aomi's standalone CLI or hosted Agent/Pipeline MCP to read chain state and prepare user-authorized transactions. Review durable Commit simulation before a designated signer executes. Use for swaps, lending, bridging, staking, perps and account queries."
risk: critical
source: "aomi-labs/skills (MIT)"
source_repo: "aomi-labs/skills"
license: MIT
license_source: "https://github.com/aomi-labs/skills/blob/main/LICENSE"
date_added: "2026-05-06"
tags:
  - defi
  - wallet
  - account-abstraction
  - cli
  - eip-712
  - onchain
  - agent
  - intent
---

# Aomi Transact

> **Authorized use only.** This skill can sign and broadcast on-chain transactions. The user must explicitly request each signing step and name the reviewed Commit or legacy Action.
>
> **Signing gate.** Keep signing commands out of runnable multi-command examples. First summarize the exact identifier, sender, chain, token, amount, recipient, fees, approval limits, calldata purpose, and simulation evidence. Wait for the user's separate instruction before signing those exact reviewed bytes.

## When to Use

Use when a user wants chain reads, quotes, balances, transaction preparation,
wallet review, or an explicitly authorized execution through Aomi. For App
construction, use the separate Aomi Build skill.

## Installation

The `aomi` terminal command belongs to `@aomi-labs/cli`. `@aomi-labs/client` is
the TypeScript SDK; its old terminal entry prints migration instructions.
For user-requested CLI setup:

```bash
npm install -g @aomi-labs/cli@latest
aomi --version
aomi tx --help
```

Require standalone CLI `0.2.0` or newer and verify the needed commands. The CLI
and older embedded-client package have separate version histories. Installing a
skill does not upgrade an existing global binary. For one-shot use, substitute
`npx @aomi-labs/cli@latest` for `aomi`.

The default backend is `https://chat.aomi.dev`. Account authorization and the
RPC or designated wallet signer are separate boundaries. Keep credentials
opaque and use only the existing signer authorized by the user.

## Procedure

1. Resolve the exact recipient, amount, token contract, source and destination
   chains, funding, native gas, and route fees before preparing a payment.
2. Start a new session only for a new task. Continue the original session on
   follow-ups and preserve the full durable Commit ID.
3. Export that Commit, then match its review and simulation evidence to the
   approved intent. `tx simulate` accepts legacy EVM Action IDs; a Commit's
   simulation belongs to its durable review.
4. Summarize the exact review and wait for a separate user signing instruction.
   Only then execute the named Commit through the available designated signer.
   A prepared AA payload does not imply local gas sponsorship.
5. Refresh the same Commit before retrying. Keep the original session, Commit
   ID, approved intent and transaction hash together. A known hash or outstanding
   wallet attempt needs reconciliation. Confirmation requires a successful
   receipt; bridges also require destination settlement and spendable output.

## Examples

Read-only request:

```bash
aomi chat "what is the price of ETH?" --new-session
```

Prepare and inspect a user-requested transaction without signing:

```bash
aomi chat "swap 1 USDC for WETH on Base" --new-session --public-key 0xYourAddress --chain 8453
aomi tx list --json
aomi tx export <commit-id> --format commit
```

Show the reviewed terms and simulation to the user. Signing is a separate
command after explicit approval, using that exact Commit ID.

## Hosted MCP

When the user requests hosted MCP setup, connect each resource separately:

```bash
codex mcp add aomi-agent --url https://chat.aomi.dev/v1/agent/mcp
codex mcp add aomi-pipeline --url https://chat.aomi.dev/v1/pipeline/mcp
```

Each OAuth grant must have the exact connected resource URL as its audience.
Agent, Pipeline, REST and guest tokens are not interchangeable. Codex derives
`resource` from the URL; omit `--oauth-resource` to avoid sending it twice.
If the browser reports a CIMD metadata-fetch failure, retry that server's login
with `--oauth-client-registration dcr`. Open a fresh client session and verify
one harmless session-list or catalog call for each resource.

A plain GET can return 404 because the MCP resources accept POST and OPTIONS.
OAuth grants tool access; wallet execution still uses the user's review and
signing policy.

## Limitations

Network access and a compatible backend are required. A chat response is not
proof that a transaction exists, simulation is not settlement, and a source
bridge receipt is not destination completion. Check live balances, chain IDs,
RPC endpoints, current quotes and the exact prepared bytes. Stop a missing
capability branch rather than guessing commands or reconstructing calldata.

Use the maintained [command reference](https://github.com/aomi-labs/skills/blob/c3f7ed922fc2762b1a23a49552e2ab7c86caf7de/aomi-transact/references/commands.md),
[workflow](https://github.com/aomi-labs/skills/blob/c3f7ed922fc2762b1a23a49552e2ab7c86caf7de/aomi-transact/references/workflows.md),
and [credential rules](https://github.com/aomi-labs/skills/blob/c3f7ed922fc2762b1a23a49552e2ab7c86caf7de/aomi-transact/references/gotchas.md)
when that branch is needed. This update follows Aomi's MIT-licensed canonical
source at `c3f7ed922fc2762b1a23a49552e2ab7c86caf7de` and retains this catalog's
separate signing-approval gate.

## Signing evidence boundaries

Simulation cannot guarantee live execution, slippage, MEV protection or safe approvals. Independently inspect chain, token/contract addresses, recipient, amounts, approval limits, fees, deadlines and EIP-712 domain/message, including account-delegation effects. Any rebuilt quote/calldata after approval invalidates that approval and needs a fresh exact-request review. Do not put real provider secrets in `aomi secret add NAME=value` command arguments/history; use the installed version’s protected credential mechanism. This catalog does not attest the upstream security report or drain guard as a security guarantee.

## Best Practices

- **Default `--new-session` on the first command of a new task.** Reusing it mid-task starts a fresh conversation and the agent loses the quote it just gave you.
- **Review the exact durable Commit and its simulation evidence before signing.** For legacy EVM Actions, use the supported Action simulation workflow; do not treat that command as Commit simulation.
- **Keep signing commands out of runnable examples.** Sign only after separate explicit approval of the exact reviewed Commit or legacy Action.
- **Match the configured RPC to the transaction's chain.** Never assume the session chain proves the execution chain.
- **Never echo credential values.** The skill confirms credential setup with handle name or derived address only.

## Authorization Disclaimer

This skill can sign and broadcast on-chain transactions worth real value. Use only on accounts you own and on networks you trust. The skill does not custody funds; the user retains full control of signing keys via `--public-key` and the underlying wallet. Review every queued `tx-N` before running `aomi tx sign`.

## Source

- **Upstream**: [aomi-labs/skills](https://github.com/aomi-labs/skills) — MIT licensed
- **Author**: [Aomi Labs](https://aomi.dev)
- **CLI**: [`@aomi-labs/cli`](https://www.npmjs.com/package/@aomi-labs/cli) on npm; `@aomi-labs/client` is the SDK
- **Security review**: [aomi-transact/SECURITY.md](https://github.com/aomi-labs/skills/blob/main/aomi-transact/SECURITY.md) — OWASP AST01–AST10 walkthrough plus captured scanner reports

## Additional Resources

For the full skill including per-flow examples (CCTP bridge, Aave supply, Lido stake, Uniswap swap), AA mode reference, drain-vector table, troubleshooting guide, and the bash workflow template, see the upstream repo:

- [Account Abstraction reference](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/account-abstraction.md)
- [App catalog (25+ apps)](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/apps.md)
- [Flow examples](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/examples.md)
- [Drain-vector reference](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/drain-vectors.md)
- [Troubleshooting](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/troubleshooting.md)
- [aomi-workflow.sh template](https://github.com/aomi-labs/skills/blob/main/aomi-transact/templates/aomi-workflow.sh)
