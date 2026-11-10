---
name: a2aclear
description: "Settle bilateral agent-to-agent transactions using the A2AClear (RFC-0001) clearinghouse protocol, Ed25519 DIDs, and SHA-256 micro-escrow."
category: development
risk: critical
source: official
source_repo: unnataisolutions-wq/a2aclear
source_type: official
date_added: "2026-11-10"
author: unnataisolutions-wq
tags: [a2aclear, agent-settlement, micro-escrow, multi-agent, clearinghouse, rfc-0001, python]
tools: [claude, cursor, gemini]
license: "BSL-1.1"
license_source: "https://github.com/unnataisolutions-wq/a2aclear/blob/main/LICENSE.md"
---

# A2AClear Agent-to-Agent Settlement & Micro-Escrow Protocol

## Overview

A2AClear (RFC-0001) provides an open, deterministic clearinghouse and atomic settlement rail for autonomous AI agent networks. When an agent delegates compute, web extraction, code review, or inference to an external agent, A2AClear eliminates human billing friction (SMS OTPs, CAPTCHAs, 3D-Secure) and solves counterparty default risk through Ed25519 DIDs, finite-state negotiation, and sub-10ms deliverable-locked micro-escrow.

## When to Use This Skill

- Use when an AI agent needs to delegate a paid task to another autonomous agent or external tool service without human credit card entry.
- Use when implementing the `a2aclear` Python SDK (`pip install a2aclear`) or TypeScript SDK for machine-to-machine micropayments.
- Use when validating signed bilateral task proposals or verifying SHA-256 deliverable proofs before releasing funds.

## Prerequisites

- Python 3.10+ with `a2aclear` installed (`pip install a2aclear`).
- Network access to the clearinghouse API endpoint (`https://unnataisolutions.com/api/a2a/handshake` and `/api/a2a/settle`).
- Ed25519 keypair for autonomous agent identity (`did:a2a:<pubkey>`).

## How It Works

### 1. Establish the inputs

Check whether the local environment has an initialized agent identity. If not, generate a transient or persistent Ed25519 keypair via `AgentIdentity.generate()`. Obtain the counterparty agent's DID, task specification, budget ceiling, and timeout parameter.

### 2. Perform the task

1. **Handshake & Probe:** Verify edge connectivity via `python3 -m a2aclear.cli probe`.
2. **Deterministic Negotiation (ANP):** Initiate proposal with the target agent. The Autonomous Negotiation Protocol enforces a bounded state machine (`PROPOSE` -> `COUNTER_BID` -> `ACCEPT` -> `AGREED`) to prevent negotiation prompt loops.
3. **Lock Micro-Escrow:** Lock the agreed amount into the AP-Vault bounded to the task's expected SHA-256 deliverable hash.
4. **Execution & Proof:** The provider agent completes the task compute and submits the deliverable payload with cryptographic SHA-256 proof.
5. **Atomic Verification & Settlement:** The clearinghouse verifies `SHA256(deliverable) == expected_hash` and releases payout (with 50 bps protocol fee) in < 10 milliseconds.

### 3. Verify the result

Confirm that `ClearinghouseClient.verify_and_settle()` returns status `SETTLED` with a valid transaction hash and sub-10ms latency metrics. If the provider timed out, verify that locked funds reverted to the buyer's balance.

## Examples

### Bilateral Settlement Example

```python
from a2aclear import AgentIdentity, AutonomousNegotiator, MicroEscrowVault

# 1. Initialize Autonomous Ed25519 Identities
buyer = AgentIdentity.generate()
seller = AgentIdentity.generate()

# 2. Negotiate Task Contract
buyer_neg = AutonomousNegotiator(buyer)
proposal = buyer_neg.propose_contract(
    task_id="task_scrape_financial_ledger",
    provider_did=seller.did,
    initial_bid_paise=5000,  # ₹50.00 / 5000 units
    currency="INR"
)

# 3. Lock Micro-Escrow & Atomically Settle in <10ms
vault = MicroEscrowVault()
escrow = vault.lock(
    contract=proposal,
    timeout_seconds=30
)

# 4. Seller delivers deliverable matching expected hash
settlement = vault.release_on_proof(
    escrow_id=escrow.id,
    deliverable_payload=b"verified_extracted_data_payload"
)
assert settlement.is_settled
print(f"Settled in {settlement.latency_ms} ms. Transaction Hash: {settlement.tx_hash}")
```

## Limitations

- Does not support subjective or non-deterministic deliverable grading without a designated oracle or multi-signature verification scheme.
- Requires pre-funded agent balances or an approved enterprise clearing credit line.

## Safety and side effects

- **State changes:** Locks and transfers digital balance units between agent DIDs.
- **Network access:** Transmits signed envelopes over HTTPS to the sovereign clearinghouse cluster.
- **Key management:** Never commit or transmit the private Ed25519 key seed; only the public DID is shared over the wire.
