---
name: aomi-transact
description: "Build natural-language crypto/DeFi agents and EVM MCP plugins (Claude Code, Cursor, Codex, Gemini). Aomi turns prompts into wallet-signed txs on Ethereum, Base, Arbitrum, Optimism, Polygon, Linea — non-custodial, fork-simulated. 40+ apps: Uniswap, Aave, Lido, Morpho, GMX, Hyperliquid, Polymarket."
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

> **Authorized use only.** This skill signs and broadcasts on-chain transactions on the user's behalf. The user must explicitly request each signing step. The skill will not run `aomi tx sign` without an explicit user request and a corresponding `tx-N` queued by `aomi tx list`.
>
> **Signing gate.** Do not include `aomi tx sign` in a copied or runnable multi-command block. Stop after listing or simulating queued transactions, summarize the tx ids, chain, value, recipient, calldata purpose, and simulation result, then ask the user for an explicit signing instruction such as `sign tx-1`. Only run the exact signing command after that separate approval.

## Overview

`aomi-transact` is a procedure for driving the Aomi CLI ([`@aomi-labs/client`](https://www.npmjs.com/package/@aomi-labs/client)) from natural-language prompts. The user types something like *"swap 1 ETH for USDC on Uniswap"*; the agent picks the right protocol and contract, stages the approve+swap as a batch, simulates it on a forked chain, and returns a queued wallet request for the user to sign. The wallet only ever sees calldata that already passed simulation.

The CLI is **account-abstraction-first**: by default it signs through a zero-config Alchemy proxy (no provider credentials needed), using EIP-7702 on Ethereum mainnet and ERC-4337 on L2s. Each `aomi <subcommand>` invocation starts, runs, and exits — there is no long-running process.

The full skill including references (`account-abstraction.md`, `apps.md`, `examples.md`, `session.md`, `troubleshooting.md`, `drain-vectors.md`), templates (`aomi-workflow.sh`), and per-host metadata (`agents/openai.yaml`) lives upstream at [`aomi-labs/skills`](https://github.com/aomi-labs/skills/tree/main/aomi-transact). This entry is the canonical SKILL.md only — clone the upstream for the full bundle.

## When to Use This Skill

- The user wants to chat with the Aomi agent from the terminal.
- The user wants balances, prices, routes, quotes, or transaction status.
- The user wants to build, simulate, confirm, sign, or broadcast wallet requests.
- The user wants to simulate a batch of pending transactions before signing.
- The user wants to inspect or switch apps, models, chains, or sessions.
- The user wants to inspect or change Account Abstraction settings (EIP-7702 / ERC-4337).
- The user wants to sign EIP-712 typed-data payloads (off-chain agreements, intent fillers).

## Examples

### Read-only — price check

```bash
aomi --prompt "what is the price of ETH?" --new-session
```

Returns a quote with no wallet request queued. Use `aomi tx list` to confirm there's nothing pending.

### Single-tx flow — Lido stake

```bash
aomi chat "Stake 0.01 ETH with Lido to get stETH" \
  --public-key 0xUserAddress --chain 1 --new-session
aomi tx list
```

`submit(address(0))` on Lido stETH `0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84`, `value = 0.01 ETH`. No approve, single tx. Stop here, show the queued transaction details, and wait for the user's explicit instruction before signing.

### Multi-step batch — Uniswap V3 swap

```bash
aomi chat "swap 1 USDC for WETH on Uniswap V3, send to my wallet" \
  --public-key 0xUserAddress --chain 1 --new-session
aomi tx list                        # tx-1 = approve, tx-2 = swap
aomi tx simulate tx-1 tx-2          # mandatory for multi-step
```

The simulator runs each tx sequentially on a forked chain so the swap step sees the approve's state changes. Don't sign step 2 independently — it would revert. Stop after simulation, summarize the batch, and wait for an explicit user instruction naming both tx ids before signing.

### Cross-chain — CCTP Ethereum → Base

```bash
aomi chat "Bridge 50 USDC from Ethereum to Base via CCTP. Recipient is my wallet." \
  --public-key 0xUserAddress --chain 1 --new-session
aomi tx list
aomi tx simulate tx-1 tx-2
```

Stop after simulation and wait for the user to explicitly approve signing the named tx ids. After signing, source-chain burn confirms in 1-2 blocks; destination mint requires Circle's off-chain attestation (~13-19 minutes).

## Limitations

- **Requires `@aomi-labs/client` v0.1.30 or newer.** Older versions lack `--aa`, `--aa-provider`, `--aa-mode` and the simulation gate. Install with `npm install -g @aomi-labs/client` or run on demand via `npx @aomi-labs/client@0.1.30 ...`.
- **Active backend connection.** The skill drives a CLI that talks to `api.aomi.dev`. Without network access, only local read commands (`aomi tx list`, `aomi session log`) work.
- **AA sponsorship on L2s is not guaranteed.** The zero-config proxy path does not reliably sponsor on Base/Arbitrum/Optimism in v0.1.30. If the EOA has 0 native gas on the destination chain, `aomi tx sign` returns viem's `insufficient funds for transfer`. Either fund the EOA with a small amount of native gas, or configure a real BYOK Alchemy/Pimlico provider with a sponsorship policy. Do not retry with `--eoa` — that path also needs gas.
- **Per-session secret ingestion.** Apps that require provider tokens (`binance`, `polymarket`, `dune`, etc.) must have credentials configured by the user in their own shell or via `aomi secret add NAME=<value>`. The skill never sets credentials on its own initiative.
- **Drain vectors are guard-blocked.** The agent rejects calldata where `recipient`/`onBehalfOf`/`mintRecipient` ≠ `msg.sender`. This is a security feature, not a bug — surface the block to the user rather than reformulating the prompt.
- **Network/RPC failures.** Public RPCs may rate-limit (`429`) or fail auth (`401`). The user must supply a reliable chain-matching RPC via `--rpc-url` for production signing.
- **Slippage and deadlines on live transactions.** Quotes from deadline-bearing routes (Across, Khalani fillers) can expire while the user is reviewing; the agent self-heals by rebuilding with fresh deadlines, but the user should re-check `aomi tx list` for the latest passing batch.

## Best Practices

- **Default `--new-session` on the first command of a new task.** Reusing it mid-task starts a fresh conversation and the agent loses the quote it just gave you.
- **Always `aomi tx list` before `aomi tx sign`.** Never assume a chat response queued a transaction.
- **Always `aomi tx simulate tx-1 tx-2 ...` before signing a multi-step batch.** Single-tx flows are simulation-optional but never wrong to simulate.
- **Keep signing commands out of runnable examples.** Show or run `aomi tx sign` only after the user gives a separate, explicit approval naming the exact queued `tx-N` ids.
- **Sign only `Batch [...] passed` txs.** Skip orphans from earlier failed attempts (`failed at step N: 0x...`).
- **Match `--rpc-url` to the queued tx's chain**, not the session chain (`--chain`) — they are independent controls.
- **Never echo credential values.** The skill confirms credential setup with handle name or derived address only.

## Authorization Disclaimer

This skill can sign and broadcast on-chain transactions worth real value. Use only on accounts you own and on networks you trust. The skill does not custody funds; the user retains full control of signing keys via `--public-key` and the underlying wallet. Review every queued `tx-N` before running `aomi tx sign`.

## Source

- **Upstream**: [aomi-labs/skills](https://github.com/aomi-labs/skills) — MIT licensed
- **Author**: [Aomi Labs](https://aomi.dev)
- **CLI**: [`@aomi-labs/client`](https://www.npmjs.com/package/@aomi-labs/client) on npm
- **Security review**: [aomi-transact/SECURITY.md](https://github.com/aomi-labs/skills/blob/main/aomi-transact/SECURITY.md) — OWASP AST01–AST10 walkthrough plus captured scanner reports

## Additional Resources

For the full skill including per-flow examples (CCTP bridge, Aave supply, Lido stake, Uniswap swap), AA mode reference, drain-vector table, troubleshooting guide, and the bash workflow template, see the upstream repo:

- [Account Abstraction reference](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/account-abstraction.md)
- [App catalog (25+ apps)](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/apps.md)
- [Flow examples](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/examples.md)
- [Drain-vector reference](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/drain-vectors.md)
- [Troubleshooting](https://github.com/aomi-labs/skills/blob/main/aomi-transact/references/troubleshooting.md)
- [aomi-workflow.sh template](https://github.com/aomi-labs/skills/blob/main/aomi-transact/templates/aomi-workflow.sh)
