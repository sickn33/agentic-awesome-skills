---
name: web3-audit
description: Smart contract security audit
category: security
risk: offensive
source: https://github.com/elementalsouls/Claude-BugHunter
source_repo: elementalsouls/Claude-BugHunter
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/elementalsouls/Claude-BugHunter/blob/main/LICENSE
compatibility: Requires explicit written authorization for a target scope plus the
  relevant testing tools for this technique. Docs-only; helper scripts and commands
  not bundled.
sources: public_research, community
---
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# WEB3 SMART CONTRACT AUDIT

10 bug classes. Pre-dive kill signals. Foundry PoC template. Real paid examples.

---

## PRE-DIVE KILL SIGNALS (check BEFORE any code review)

> ZKsync lesson: $322M TVL + OZ audit + 750K LOC + 5 sessions = 0 findings. Large well-audited bridges are extremely hard.

1. **TVL < $500K** → max payout capped too low for effort
2. **2+ top-tier audits** (Halborn, ToB, Cyfrin, OpenZeppelin) on simple protocol → bugs already found
3. **Protocol < 500 lines, single A→B→C flow** → minimal attack surface
4. **Formula**: `max_realistic_payout = min(10% × TVL, program_cap)` — if < $10K, skip

**Soft kill:** OZ/ToB/Cyfrin audit on current version + codebase > 500K LOC → expect 40+ hours for maybe 1 finding. Only proceed if bounty floor > $50K AND you have protocol-specific expertise.

**Target scoring (go if >= 6/10):**
- TVL > $10M: +2
- Immunefi program with Critical >= $50K: +2
- No top-tier audit on current version: +2
- < 30 days since deploy: +1
- Protocol you've hunted before: +1
- Source code + natspec comments: +1
- Upgradeable proxies: +1

---

## THE ONE RULE

> "Read ALL sibling functions. If `vote()` has a modifier, check `poke()`, `reset()`, `harvest()`. The missing modifier on the sibling IS the bug."

This single rule explains 19% of all Critical findings.

---

## 1. ACCOUNTING STATE DESYNCHRONIZATION
> #1 Critical bug class — 28% of all Criticals on Immunefi.

### What It Is
Two state variables supposed to stay in sync. One code path updates A but forgets B. Later code reads both and makes decisions based on stale B.

```
Real Value = A - B
If A updated but B isn't → Real Value appears larger → phantom value
```

### Root Cause Patterns

**Variant 1: Phantom Yield** (Yeet protocol — 35 duplicate reports)
```solidity
function startUnstake(uint256 amount) external {
    totalSupply -= amount;  // decremented BEFORE transfer
    // aToken.balanceOf(this) still reflects old value
    // yieldAmount = aToken.balanceOf - totalSupply = phantom yield
}
```

**Variant 2: Fast Path Skips State Update** (Alchemix V3)
```solidity
function claimRedemption(uint256 tokenId) external {
    if (transmuter.balance >= amount) {
        transmuter.transfer(user, amount);
        _burn(tokenId);
        return;  // EARLY RETURN — cumulativeEarmarked, _redemptionWeight, totalDebt never updated
    }
    // Slow path: updates all state vars correctly
    alchemist.redeem(...);
}
```

**Variant 3: Update Happens in Wrong Order** (Alchemix)
```solidity
function deposit(uint256 amount) external {
    _shares = (amount * totalShares) / totalAssets;  // calculated BEFORE deposit
    totalAssets += amount;   // assets added AFTER shares calculated → wrong rate
}
```

### Grep Patterns
```bash
# Find all accounting variables
grep -rn "totalSupply\|totalShares\|totalAssets\|totalDebt\|cumulativeReward\|rewardPerShare" contracts/

# Find all early returns in claim/redeem functions
grep -rn "\breturn\b" contracts/ -B3 | grep -B3 "if\b"

# For each early return: which state updates in normal path are skipped?
```

---

## 2. ACCESS CONTROL
> #2 Critical — 19% of Criticals. $953M lost in 2024 alone.

### Variant 1: Missing Modifier on Sibling Function
```solidity
function vote(uint256 tokenId) external onlyNewEpoch(tokenId) {  // guarded
function reset(uint256 tokenId) external onlyNewEpoch(tokenId) { // guarded
function poke(uint256 tokenId) external {                         // NO GUARD → infinite FLUX inflation
}
```

### Variant 2: Wrong Check (Existence vs Ownership)
```solidity
function split(uint256 tokenId, uint256 amount) external {
    _requireOwned(tokenId);  // checks if token EXISTS, not if caller OWNS it
    _burn(tokenId);
    _mint(msg.sender, amount);  // attacker steals tokens they don't own
}
```

### Variant 3: Silent Modifier (if vs require)
```solidity
// VULNERABLE — non-admin silently gets through:
modifier onlyAdmin() {
    if (msg.sender == admin) {
        _;  // body only executes for admin, but non-admin doesn't revert
    }
}
// CORRECT: require(msg.sender == admin, "Not admin"); _;
```

### Variant 4: Uninitialized Proxy
```solidity
function initialize(address _owner) public {  // MISSING: initializer modifier
    owner = _owner;  // anyone can call → become owner
}
// Fix: constructor() { _disableInitializers(); }
```

### Grep Patterns
```bash
# Find sibling function families — do ALL have the same modifier set?
grep -rn "function vote\|function poke\|function reset\|function update\|function claim\|function harvest" contracts/ -A2

# Ownership check: existence vs ownership?
grep -rn "_requireOwned\|ownerOf\|_isApprovedOrOwner\|_checkAuthorized" contracts/ -B5

# Silent modifiers
grep -rn "modifier\b" contracts/ -A8 | grep -B3 "if (" | grep -v "require\|revert"

# Uninitialized initializer
grep -rn "function initialize\b" contracts/ -A3
grep -rn "_disableInitializers()" contracts/
```

### Real Paid Examples

| Protocol | Payout | Bug |
|---|---|---|
| Wormhole | $10M | Uninitialized UUPS proxy → anyone calls initialize() |
| ZeroLend | n/a | split() uses existence check, not ownership check |
| Alchemix | n/a | poke() missing onlyNewEpoch → infinite FLUX inflation |
| Parity | $150M frozen | No access control on initWallet() in library |

---

## 3. INCOMPLETE CODE PATH
> #3 Critical — 17% of Criticals.

### The Function Family Comparison Test
```
1. List all state changes in function A (deposit/place/create)
2. List all state changes in function B (withdraw/update/cancel)
3. For each state change in A: does B have the corresponding reverse?
4. For each token transfer in A: does B have the corresponding refund?
If A does X but B doesn't do the reverse of X → BUG.
```

### Variant 1: Update Function Missing Refund (ThunderNFT)
```solidity
function place_order(OrderInput calldata order) external {
    token.safeTransferFrom(msg.sender, address(this), order.price);  // takes tokens
    orders[orderId] = order;
}
function update_order(OrderInput calldata updatedOrder) external {
    // BUG: NO REFUND for sell orders when price decreases → tokens permanently stuck
    orders[orderId] = updatedOrder;
}
```

### Variant 2: Partial Fill Token Stuck (Plume)
```solidity
function swapForETH(uint256 amountIn) external {
    token.safeTransferFrom(msg.sender, address(this), amountIn);
    uint256 filled = dex.swap(amountIn);  // partial fill possible
    _refundExcessEth(amountIn - filled);  // BUG: refunds ETH only, not ERC20
}
```

### Variant 3: mint() Bypasses Check That deposit() Has (MetaPool)
```solidity
function deposit(uint256 assets, address receiver) public override {
    shares = _deposit(assets, receiver);  // includes receipt validation
}
function mint(uint256 shares, address receiver) public override {
    assets = convertToAssets(shares);
    _mint(receiver, shares);  // MISSING: _deposit() validation → mints without receiving assets
}
```

### Grep Patterns
```bash
grep -rn "function place_\|function create_\|function add_\|function open_" contracts/ -A5
grep -rn "function update_\|function modify_\|function cancel_" contracts/ -A5
grep -rn "safeApprove\b" contracts/    # safeApprove without zero-reset before
grep -rn "delete\b" contracts/ -B5 -A5  # delete before operation completes
grep -rn "function deposit\|function mint\|function withdraw\|function redeem" contracts/ -A10
```

---

## 4. OFF-BY-ONE & BOUNDARY CONDITIONS
> #4 High — 22% of Highs. Single character change. Massive impact.

### Root Cause
```solidity
// VeChain Stargate — post-exit reward drain:
function _claimableDelegationPeriods(address delegator) internal view returns (uint256) {
    if (endPeriod > nextClaimablePeriod) {  // BUG: should be >=
        return 0;  // exited users get nothing
    }
    return nextClaimablePeriod - lastClaimedPeriod;  // rewards for period AFTER exit
}
```

### Mental Test for Every Comparison
> For every `if (A > B)`: "What happens when A == B?" Is that correct?

### 6 Boundary Locations to Check
1. Period/Epoch boundaries: `>` vs `>=` at period end
2. Time-based locks: does `block.timestamp == deadline` lock or unlock?
3. Loop break conditions: `break` with `>` vs `>=`
4. Array index boundaries: `i <= array.length` (should be `i < array.length`)
5. Amount/balance boundaries: `>= amount` allows exact full withdrawal?
6. Rounding/precision: can any input produce 0 output that should be non-zero?

### Grep Patterns
```bash
# Boundaries in comparisons
grep -rn "Period\|Epoch\|Round\|Deadline\|period\|epoch\|deadline" contracts/ -A3 | grep "[<>][^=]"

# Loop breaks
grep -rn "\bbreak\b" contracts/ -B10

# Off-by-one in array access
grep -rn "\.length\s*-\s*1\|i\s*<=\s*.*\.length\b" contracts/
```

---

## 5. ORACLE / PRICE MANIPULATION
> 12% of all reports. Largest individual payouts. $117M Mango, $70M Curve.

### Bug A: Missing Staleness Check (most common)
```solidity
// VULNERABLE:
(, int256 price,,,) = priceFeed.latestRoundData();
return uint256(price);  // If Chainlink node goes down, stale price returned indefinitely

// CORRECT:
(, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
require(block.timestamp - updatedAt <= MAX_PRICE_AGE, "Stale price");
require(price > 0, "Invalid price");
```

### Bug B: Missing Confidence Interval (Pyth)
```solidity
// VULNERABLE:
PythStructs.Price memory p = pyth.getPriceUnsafe(priceFeed);
return p.price;  // ignores p.conf (confidence interval)

// CORRECT:
require(p.conf * 10 <= uint64(p.price), "Price too uncertain");
// conf > 10% of price = untrustworthy
```

### Bug C: TWAP Too Short (flash loan manipulatable)
```solidity
// VULNERABLE: 60-second TWAP
uint32[] memory secondsAgos = new uint32[] (2);
secondsAgos[0] = 60; secondsAgos[1] = 0;
// Flash loan can shift price for entire 60s window

// CORRECT: 1800s minimum TWAP (30 min)
```

### Bug D: Single-Source Oracle
```solidity
// VULNERABLE: only Uniswap spot price
uint price = getUniswapSpotPrice(token);  // flash loan manipulatable

// CORRECT: Chainlink primary, Uniswap TWAP as fallback, require close agreement
```

### Grep Patterns
```bash
# Missing staleness check
grep -rn "latestRoundData" contracts/ -A5 | grep -v "updatedAt\|timestamp"

# Pyth price usage — confidence interval checked?
grep -rn "getPriceUnsafe\|getPrice\b" contracts/ -A8 | grep -v "conf\|confidence"

# TWAP windows — short TWAP flag
grep -rn "secondsAgo\|TWAP\|cardinality" contracts/ -A5
```

---

## 6. ERC4626 VAULT ATTACKS

### Exchange Rate Manipulation (near-empty vault)
```solidity
// VULNERABLE — first depositor attack:
// 1. Attacker deposits 1 wei → gets 1 share
// 2. Attacker donates large amount directly (transfer, not deposit)
// 3. Exchange rate: 1 share = (1 + donation) assets
// 4. Victim deposits → rounds down to 0 shares → free donation to attacker

// CORRECT: virtual shares (OpenZeppelin v4.9+)
function _decimalsOffset() internal view virtual override returns (uint8) {
    return 9;  // add 1e9 virtual shares + assets to prevent manipulation
}
```

### ERC4626 Transfer (moves shares but not stake/lock records)
```solidity
// VULNERABLE: shares transferred, but lock records stay with original owner
// → shares stuck, can't redeem → permanent freeze (Belong pattern)
function transfer(address to, uint256 amount) external override {
    _transfer(msg.sender, to, amount);  // moves shares
    // MISSING: transfer lock record from msg.sender to `to`
}
```

### Grep Patterns
```bash
grep -rn "function transfer\|function transferFrom" contracts/ -A15
grep -rn "function deposit\|function mint\|function withdraw\|function redeem" contracts/ -A10
```

---

## 7. REENTRANCY
> 2016–present. CEI pattern prevents it. Still found in DeFi.

### Variants
- **Single-function**: attacker re-enters same function before state updated
- **Cross-function**: re-enters a sibling function with stale state
- **Cross-contract**: re-enters via a callback to another protocol
- **Read-only**: re-enters a view function that returns stale data used by attacker

### Root Cause Pattern
```solidity
// VULNERABLE (effects after interaction):
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool success,) = msg.sender.call{value: amount}("");  // INTERACTION first
    require(success);
    balances[msg.sender] -= amount;  // EFFECT after → reentrancy window
}

// CORRECT (CEI — Checks, Effects, Interactions):
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);  // CHECK
    balances[msg.sender] -= amount;            // EFFECT
    (bool success,) = msg.sender.call{value: amount}("");  // INTERACTION last
    require(success);
}
```

### Grep Patterns
```bash
# External calls before state updates
grep -rn "\.call{value\|safeTransfer\|transfer(" contracts/ -B10 | grep -v "require\|revert"

# Missing nonReentrant modifier on critical functions
grep -rn "function withdraw\|function redeem\|function claim" contracts/ -A2 | grep -v "nonReentrant"

# Storage slot for reentrancy guard
grep -rn "nonReentrant\|ReentrancyGuard\|_notEntered" contracts/
```

---


## Contents

- [8. FLASH LOAN ATTACKS](references/details.md)
- [9. SIGNATURE REPLAY](references/details.md)
- [10. PROXY / UPGRADE ISSUES](references/details.md)
- [FOUNDRY POC TEMPLATE](references/details.md)
- [Related Skills & Chains](references/details.md)
- [Operator Notes (Claude-BugHunter)](references/details.md)

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's vulnerability class or technique within a bug-bounty or penetration-test engagement.
- You need the recon, exploitation, or validation workflow described below — executed strictly inside the approved scope.

## Limitations

- Authorized scope only: the confirmation gate above is mandatory before any probing, exploitation, or credential-access command.
- Docs-only import: upstream helper scripts, commands, engine, and research assets are not bundled; reinstall tooling from the source repo when needed.
- Validate every finding (see `triage-validation`) before reporting; report via `report-writing`. Prefer a sandbox, disposable VM, or controlled lab.

### Example

```bash
# Read-only first step; confirm scope before anything active.
cat scope.txt  # target list from the authorized engagement brief
```

> Adapted from [elementalsouls/Claude-BugHunter](https://github.com/elementalsouls/Claude-BugHunter) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: executable helpers, commands, engine, and research assets not bundled.
