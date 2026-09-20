---
name: meme-coin-audit
description: Meme coin and token security audit
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
sources: public_research
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

# MEME COIN & TOKEN SECURITY AUDIT

Fast-kill rug pull detection and deep token security analysis for EVM and Solana meme coins.

---

## PRE-DIVE KILL SIGNALS

Check these BEFORE reading a single line of code. If any are true, skip the audit — the token is likely a rug or not worth the time.

### Hard Kills (Skip Immediately)
- **Contract not verified** on Etherscan/Solscan → Cannot audit source = cannot trust
- **Deployer wallet** has history of rug pulls (check Etherscan deployer page)
- **Token age < 1 hour** AND no known team → Too early, wait for more data
- **Mint authority retained** (Solana) AND no cap → Infinite mint = certain rug
- **Freeze authority retained** (Solana) on meme coin → Honeypot confirmed
- **Transfer hook present** (Token-2022) with mutable hook program → Honeypot vector
- **Permanent delegate** extension (Token-2022) → Can steal all holder tokens

### Soft Kills (Proceed with Extreme Caution)
- Top holder > 20% of supply (excluding DEX pools)
- LP not burned or locked in verified contract
- Contract is upgradeable / proxy with retained admin
- Less than $5K liquidity in the pool
- No social presence / anonymous deployer with no history

---

## THE ONE RULE

> **"Check ALL authorities and owner functions. The retained authority IS the rug vector."**
>
> Every rug pull requires a privileged operation: mint, blacklist, fee change, LP removal, or authority abuse. If you find the privilege, you found the bug.

---

## BUG CLASSES (8 TOKEN-SPECIFIC)

### 1. HIDDEN MINT / UNLIMITED SUPPLY
> Common rug pattern. Deployer mints tokens post-launch, dumps on LP.

**Quick grep (EVM):**
```bash
grep -rn "function mint\|_mint(\|_balances\[.*\] +=" src/ --include="*.sol" | grep -v "test\|lib\|node_modules"
```

**Quick grep (Solana):**
```bash
grep -rn "MintTo\|mint_to\|mint_authority" src/ --include="*.rs" | grep -v "test\|target"
```

**Kill if:** MAX_SUPPLY enforced in every mint path, or mint function removed entirely.

### 2. HONEYPOT / TRANSFER RESTRICTION
> Common scam pattern. Buy works, sell blocked.

**Quick grep:**
```bash
grep -rn "blacklist\|isBlacklisted\|_bots\|maxTxAmount\|approve.*override\|tradingEnabled" src/ --include="*.sol"
```

**Solana equivalent:**
```bash
grep -rn "freeze_authority\|transfer_hook\|TransferHook\|permanent_delegate" src/ --include="*.rs"
```

**Kill if:** No blacklist mapping, no transfer hooks, no freeze authority.

### 3. FEE MANIPULATION
> Common rug pattern. Sell fee set to 99% after initial buys.

**Quick grep:**
```bash
grep -rn "setFee\|setSellFee\|_taxFee\|_sellFee" src/ --include="*.sol"
grep -rn "function set.*Fee" -A5 src/ --include="*.sol" | grep -v "require\|MAX\|<="
```

**Kill if:** Fee setter has `require(fee <= MAX_FEE)` with MAX_FEE <= 10%.

### 4. LIQUIDITY POOL DRAIN
> LP removal, migration, or manipulation to crash price.

**Quick grep:**
```bash
grep -rn "migrateLP\|emergencyWithdraw\|\.sync()\|setPair\|setRouter" src/ --include="*.sol"
```

**Kill if:** LP tokens burned to dead address, no migration function, no pair setter.

### 5. BONDING CURVE MANIPULATION
> Exploits in pump.fun-style bonding curves.

**Quick grep:**
```bash
grep -rn "virtualReserve\|setCurve\|graduate\|bonding_curve" src/ --include="*.sol" --include="*.rs"
```

**Kill if:** Curve parameters immutable, graduation permissionless.

### 6. AUTHORITY RETENTION (SOLANA)
> Retained mint/freeze/update authorities on Solana tokens.

**Quick grep:**
```bash
grep -rn "mint_authority\|freeze_authority\|update_authority\|close_authority" src/ --include="*.rs"
grep -rn "set_authority.*None" src/ --include="*.rs"  # Good sign: revocation
```

**Kill if:** All authorities = None, verified on-chain.

### 7. FAKE RENOUNCE / HIDDEN OWNERSHIP
> Ownership appears renounced but backdoor control retained.

**Quick grep:**
```bash
grep -rn "renounceOwnership.*override\|_shadowAdmin\|_backupOwner\|selfdestruct" src/ --include="*.sol"
```

**Kill if:** renounceOwnership NOT overridden, no second admin role, no selfdestruct.

### 8. SANDWICH AMPLIFICATION BY DESIGN
> Contract makes holders maximally sandwichable.

**Quick grep:**
```bash
grep -rn "swapExactTokensForETH" -A5 src/ --include="*.sol" | grep "0,"
grep -rn "swapThreshold\|_rebase\|mandatoryPool" src/ --include="*.sol"
```

**Kill if:** Auto-swap has proper slippage, no rebase mechanics.

---

## FAST RED-FLAG SWEEP

Run the 8 bug-class greps above across the source tree for fast red-flag detection. Together they catch:
- Direct mint/balance manipulation
- Blacklist and transfer restriction patterns
- Unbounded fee setters
- LP migration and emergency withdraw functions
- Fake renounce overrides
- Zero slippage auto-swaps
- All Solana authority patterns
- Token-2022 dangerous extensions

**Source grep does NOT check** (verify these out-of-band):
- On-chain state (use Etherscan/Solscan for authority verification)
- Holder distribution (use DEXTools/Birdeye)
- LP lock status (use Unicrypt/PinkLock/Solscan)
- Deployer wallet history (manual check)

---

## FOUNDRY POC TEMPLATE (TOKEN EXPLOITS)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/Token.sol";

contract TokenExploitTest is Test {
    Token token;
    address owner = makeAddr("owner");
    address victim = makeAddr("victim");
    address attacker = makeAddr("attacker");

    // Uniswap V2 router (mainnet fork)
    address constant ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    function setUp() public {
        vm.createSelectFork("mainnet");
        // Deploy token as owner
        vm.startPrank(owner);
        token = new Token();
        // Add liquidity...
        vm.stopPrank();
    }

    function test_hiddenMint_rug() public {
        // Step 1: Victim buys tokens
        vm.startPrank(victim);
        // ... buy tokens on Uniswap
        vm.stopPrank();

        // Step 2: Owner mints and dumps
        vm.startPrank(owner);
        uint256 supplyBefore = token.totalSupply();
        token.mint(owner, 1_000_000_000e18);
        assertGt(token.totalSupply(), supplyBefore, "Supply should increase");
        // ... sell minted tokens
        vm.stopPrank();

        // Step 3: Victim's tokens are now worthless
        // Assert token price crashed
    }

    function test_honeypot_blacklist() public {
        // Step 1: Victim buys
        vm.startPrank(victim);
        // ... buy tokens
        vm.stopPrank();

        // Step 2: Owner blacklists victim
        vm.startPrank(owner);
        token.blacklist(victim);
        vm.stopPrank();

        // Step 3: Victim cannot sell
        vm.startPrank(victim);
        vm.expectRevert("Blacklisted");
        token.transfer(address(1), 100e18);
        vm.stopPrank();
    }

    function test_fee_manipulation_rug() public {
        // Step 1: Verify initial fee is low
        assertEq(token.sellFee(), 3); // 3%

        // Step 2: Owner sets fee to 99%
        vm.prank(owner);
        token.setFees(3, 99); // Buy 3%, Sell 99%

        // Step 3: Victim sells — loses 99% to fees
        vm.startPrank(victim);
        uint256 balanceBefore = address(victim).balance;
        // ... sell tokens
        // Assert: received almost nothing
        vm.stopPrank();
    }
}
```

---

## SOLANA QUICK CHECKS (NO SOURCE CODE NEEDED)

When you don't have source code, check on-chain:

```
1. MINT AUTHORITY → solana account <MINT> --output json | check mint_authority
   - Should be null
   - If Some(pubkey) → CRITICAL: can mint infinite tokens

2. FREEZE AUTHORITY → same as above, check freeze_authority
   - Should be null
   - If Some(pubkey) → CRITICAL: honeypot

3. LP STATUS → Check Raydium/Orca pool
   - LP burned? (tokens sent to 1111...1111)
   - LP locked? (in verified locker with no backdoor)
   - LP held by deployer? → CRITICAL: instant rug

4. TOP HOLDERS → Birdeye/Solscan holders tab
   - Top 10 < 30% of supply (excluding pools)
   - Creator wallets (check first transactions)

5. PROGRAM UPGRADEABILITY
   - Is the program upgradeable? → can change any logic
   - Upgrade authority should be None for immutable programs

6. TOKEN-2022 EXTENSIONS
   - Any transfer hook? → potential honeypot
   - Permanent delegate? → CRITICAL
```

---

## Related Skills & Chains

- **`web3-audit`** — When the target is a DeFi protocol (not just a token). Workflow primitive: this skill's 8 token-specific bug classes are a subset of `web3-audit`'s scope; if the target has lending / vault / oracle logic beyond the token contract itself, also load `web3-audit` for the broader 10 DeFi bug classes.
- **`triage-validation`** — When deciding if a rug-pull finding qualifies as a bug bounty submission. Workflow primitive: many "rug vector" observations are pre-rug warnings, not exploitable bugs in a deployed protocol; run 7Q gate to distinguish "the deployer COULD rug" (informational) from "the contract IS exploitable now" (reportable).
- **`report-writing`** — When writing up a confirmed token security finding for Immunefi / private bounty. Workflow primitive: Foundry PoC template here feeds into `report-writing`'s Immunefi body template.
- **`offensive-osint`** — When the token has off-chain infrastructure (project website, Telegram, deployer doxxing). Workflow primitive: on-chain audit is this skill's domain; deployer wallet history, social presence, and project legitimacy checks route to `offensive-osint`.
- **`bb-methodology`** — When confirming engagement mode. Workflow primitive: PART 0 separates "pre-investment due diligence" (this skill's primary use) from "Immunefi bug bounty submission" (different reporting + severity standards); the answer routes which post-audit handoff is correct.

---

## Operator Notes (Claude-BugHunter)

> Engagement-derived + 2026-specific additions to the vendored foundation.
> Wisdom from real authorized engagements + Phase 2 verification across
> this repo's 31+ skill-area live tests. The upstream content covers the WHAT;
> this layer covers the WHEN-IT-WORKS-vs-WHEN-IT-DOESN'T.

### Solana-specific signals — 2025-2026 reality

Token-2022 transfer hooks are the new rug-pull vector. Hook authority can be set to a single key; that key can pause / blacklist / fee-on-transfer arbitrary addresses post-launch. Always check hook authority + permanent-delegate authority for Token-2022 mints:

```bash
# get mint extensions for a Token-2022 mint
spl-token display <MINT_ADDRESS> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
# look for: TransferHook { authority: ... }, PermanentDelegate { delegate: ... }
```

If TransferHook authority is non-null → the holder of that key can revoke transfer rights mid-trade. If PermanentDelegate is non-null → that delegate can move any holder's tokens at any time (effectively a built-in confiscation). Either alone is rug-class.

pump.fun bonding curves can be manipulated via the curve's K-parameter; mint authority retained beyond bonding-curve completion is the classic exit-scam shape. Check `mintAuthority` AFTER the curve completes — legitimate launches null it, scams retain it for the post-graduation dump.

### Honeypot detection — beyond the obvious

`transfer()` succeeds in dry-run but fails on certain addresses (sender allowlist / blocklist). Test with: simulated buy → simulated transfer to a different address → simulated sell. If buy + transfer succeed but sell fails, it's a honeypot.

Quick triage matrix:

| Test | Honeypot Signal |
|------|----------------|
| Buy from random wallet | Succeeds (must — or no one would touch it) |
| Transfer to second random wallet | Often fails on honeypot |
| Sell from original wallet | Fails or applies > 50% tax |
| Sell from team-controlled wallet | Succeeds (the giveaway) |

Cross-source verification: solana-rugcheck, rugcheck.xyz, dexscreener risk signals, honeypot.is (EVM). Never trust a single source — rug-checkers can be fooled by deferred-malice patterns (clean for first 7 days, hook activates later).

### LP lock claims — verify, don't trust

LP-lock badges on DexScreener mean nothing without on-chain verification. Check the actual lock contract (Unicrypt, TeamFinance, Bonkbot, PinkLock) for:

- **Unlock date** — the on-chain timestamp, not the badge text
- **Lock owner** — is it the deployer's wallet? Are there multiple lockers fragmenting the LP?
- **Extension / shortening permission** — some lock contracts allow the owner to SHORTEN the lock; that's an exit hatch dressed as a lock
- **Lock contract bytecode** — verify it's the canonical locker, not a fork with backdoors

Some "locked" LPs are 1-day locks renewed weekly — visually the same as a year lock to the buyer, but the deployer can let it lapse on any Tuesday. Always read the lock contract source on the chain explorer.

### Pre-investment due diligence in under 5 minutes

The 6-question fast filter:

1. Mint authority null?
2. Freeze authority null?
3. Update authority null (for metadata immutability)?
4. LP locked in a verified contract for > 6 months?
5. Top 10 holders concentration < 30% (excluding pools/burn addresses)?
6. Bonding curve completed (for pump.fun) AND post-completion mint authority null?

Five "no"s = walk away. Three "no"s = high risk, only enter with size you'd walk away from. Two "no"s with strong narrative + thin liquidity = the canonical retail trap.

### MEV / sandwich amplification on illiquid mints

Buying into a mint with < $50K liquidity guarantees you'll be sandwiched. The bot infrastructure on Solana and Ethereum is institutionalized in 2026 — Jito MEV-share and private order-flow auctions. If your trade size > 1% of available liquidity, expect sandwich loss > 5%; > 5% of liquidity, expect > 20% slippage from sandwich alone.

Mitigations (rank by 2026 effectiveness):

1. **Jito bundles** (Solana) — submit with priority tip, atomic with no MEV window
2. **Flashbots Protect RPC** (Ethereum) — private mempool submission
3. **MEV-protected DEX aggregators** — Jupiter's slippage protection, 1inch Fusion, CoWSwap
4. **Splitting orders** — N smaller trades vs 1 large; reduces sandwich profitability per trade

If the mint is so illiquid that even split orders sandwich — that's the signal to skip the trade, not the signal to use better tooling.

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
