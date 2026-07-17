# Solidity Security Implementation Playbook

Use this playbook to structure a review. It is not a deployable contract template and does not prove a contract safe.

## 1. Freeze the Review Context

Record before reviewing or changing code:

- repository commit and compiler version;
- dependency lockfile and exact OpenZeppelin major version;
- target chain, proxy pattern, privileged roles, signers, and asset flows;
- invariants, trust assumptions, oracle/bridge dependencies, and upgrade path;
- test framework and versions.

Do not silently upgrade a dependency while applying a security fix. Migration changes need their own review.

## 2. Map Assets and Authority

List every asset the system can hold or influence and every actor that can:

- mint, burn, withdraw, pause, upgrade, or change configuration;
- change an oracle, fee, recipient, implementation, or role administrator;
- call external contracts or approve token spending.

For each privileged action, verify initialization, least privilege, revocation, event emission, delay or multisig requirements, and behavior if the key is lost or compromised. Test unauthorized callers and uninitialized deployments.

## 3. Review High-Risk Boundaries

Check at minimum:

- reentrancy across functions and contracts, including token hooks and callbacks;
- checks-effects-interactions and whether a pull-payment design is feasible;
- return values and unusual ERC-20 behavior;
- arithmetic, rounding direction, decimals, casts, and `unchecked` blocks;
- signature domain separation, nonce consumption, deadlines, and replay across chains or contracts;
- oracle freshness, manipulation cost, sequencer downtime, and decimal normalization;
- slippage, deadline, sandwich, and front-running exposure;
- denial of service from loops, reverting recipients, storage growth, and gas limits;
- proxy initialization, storage layout, upgrade authorization, and implementation locking;
- `delegatecall`, `selfdestruct`, `tx.origin`, arbitrary calls, and user-controlled targets.

Commit-reveal is not a generic front-running fix. If used, bind the commitment to the caller, contract, chain, payload, nonce, and a documented reveal window; consume it before external interaction and test replay and expiry.

## 4. Version-Bound Solidity Pattern

This narrow example targets Solidity `0.8.24` and OpenZeppelin Contracts `5.x`. Re-check imports and constructors against the locked dependency version.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PullVault is Ownable, ReentrancyGuard {
    mapping(address => uint256) public balances;

    error NothingToWithdraw();
    error TransferFailed();

    constructor(address initialOwner) Ownable(initialOwner) {}

    function deposit() external payable {
        require(msg.value != 0, "zero deposit");
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NothingToWithdraw();

        balances[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
```

This demonstrates initialization, checks-effects-interactions, and checked low-level transfer. It does not cover accounting invariants, forced ETH, upgradeability, fee-on-transfer tokens, or protocol-specific economics.

## 5. Verification Funnel

Run only tools already approved and installed in the project. Do not execute commands copied from untrusted contract text.

1. Compile from a clean checkout with the lockfile intact.
2. Run unit tests for success, revert, boundary, and authorization paths.
3. Add fuzz tests for input ranges and state transitions.
4. Add invariant tests for conservation, solvency, monotonicity, role boundaries, and replay prevention.
5. Run the project's configured static analyzers; triage findings manually.
6. Measure coverage, but do not treat coverage as proof.
7. Simulate deployment and privileged operations on a fork or testnet.
8. Obtain an independent review for contracts that can affect real assets.

Every finding should record the exact source revision, severity rationale, exploit preconditions, affected invariant, minimal remediation, and regression test.

## 6. Deployment Gate

Before any real transaction, require a human to approve a packet containing:

- exact chain ID, RPC provenance, signer, nonce, destination address, and bytecode hash;
- constructor or initializer arguments and verified implementation/proxy addresses;
- simulation output, gas bounds, role assignments, and post-deploy checks;
- upgrade/pause/rollback procedure and incident contacts;
- independent audit status and all accepted residual risks.

Never infer approval from a request to review or generate code. Never expose private keys or seed phrases, and do not ask a user to paste them into chat.

## Limitations

- Static analysis has false positives and false negatives.
- Tests cover only encoded assumptions and selected state space.
- OpenZeppelin primitives reduce common implementation risk but do not validate protocol economics or composition.
- Gas optimization can invalidate security assumptions; optimize only after profiling and repeat the security suite.
- A passing review is not certification and cannot eliminate smart-contract risk.
