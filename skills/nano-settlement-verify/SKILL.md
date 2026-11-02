---
name: nano-settlement-verify
description: "Check that a Nano (XNO) payment settled before a seller serves a paid call: one inline read-only script asks a public node about a send block and returns a verdict. No seed, no wallet."
category: finance
risk: safe
source: self
source_type: self
date_added: "2026-11-02"
author: dhyabi2
tags: [nano, xno, payments, settlement, x402]
---

# nano-settlement-verify

## Overview

A buyer who pays a pay-per-call endpoint in Nano (XNO) hands the seller a block hash. This skill answers the one
question that decides whether to serve: did that block pay this account exactly the quoted amount, and has the
network confirmed it? It reads the public ledger and nothing else. It holds no seed, signs nothing and sends nothing.

Nearby skills: `x402-express-wrapper` describes taking USDC on Base; no skill here checks a Nano settlement. To hold
or spend Nano, use a wallet skill; this one is the seller side.

## When to Use

- A buyer presents a Nano block hash and you must decide whether to serve a paid call.
- You are writing the settlement check behind an HTTP 402 route priced in XNO.
- A payment "looks paid" and you need to tell confirmed from merely broadcast.
- Do not use it to send a payment or manage keys.

## Prerequisites

Python 3 standard library and network access to one Nano node RPC. The script below is the whole tool; there is
nothing to download. The only data sent is the block hash, to the node you choose (default `https://rpc.nano.to`).

## How It Works

### 1. Save the checker

Save this as `verify.py` (read it first: it makes one `block_info` request and does integer comparisons):

```python
import json, sys, urllib.request, urllib.error

def verdict(block, expect_raw, account, rpc="https://rpc.nano.to"):
    """Return (exit_code, dict). Integers only; 'could not ask' is never 'invalid'."""
    if not (len(block) == 64 and all(c in "0123456789abcdefABCDEF" for c in block)):
        return 3, {"settled": False, "verdict": "invalid_block"}
    if not expect_raw.isdigit() or int(expect_raw) <= 0:
        return 3, {"settled": False, "verdict": "invalid_amount"}
    body = json.dumps({"action": "block_info", "json_block": "true", "hash": block}).encode()
    req = urllib.request.Request(rpc, body, {"Content-Type": "application/json", "User-Agent": "nano-verify-inline"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            info = json.load(r)
    except (urllib.error.URLError, OSError, ValueError):
        return 4, {"settled": False, "verdict": "node_unreachable"}
    if "error" in info:
        return 3, {"settled": False, "verdict": "no_such_block"}
    c = info.get("contents", {})
    ok = (c.get("type") == "state" and info.get("subtype", c.get("subtype")) == "send"
          and c.get("link_as_account") == account and int(info.get("amount", "0")) == int(expect_raw))
    if not ok:
        return 3, {"settled": False, "verdict": "mismatch"}
    if info.get("confirmed") != "true":
        return 2, {"settled": False, "verdict": "unconfirmed"}
    return 0, {"settled": True, "verdict": "settled", "block": block.upper()}

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("usage: verify.py BLOCK_HASH EXPECT_RAW ACCOUNT [RPC_URL]", file=sys.stderr); sys.exit(64)
    code, out = verdict(*sys.argv[1:5])
    print(json.dumps(out)); sys.exit(code)
```

### 2. Ask about the block

```bash
python3 verify.py BLOCK_HASH EXPECT_RAW ACCOUNT [RPC_URL]
```

- `BLOCK_HASH`: the 64-hex send block the buyer gave you.
- `EXPECT_RAW`: the amount you quoted, in raw, as an integer. 1 XNO is 10^30 raw, so 0.001 XNO is
  `1000000000000000000000000000`. Never use a decimal or float: it has about 15 significant digits and a raw amount
  has 30, so the low digits, where an underpayment hides, would be lost. Decimals are refused as `invalid_amount`.
- `ACCOUNT`: the `nano_` account you expected to be paid (the block's destination, not the chain it sits on).

### 3. Act on the verdict

| exit | verdict | what to do |
| --- | --- | --- |
| 0 | `settled` | serve the call |
| 2 | `unconfirmed` | the node has the block but it is not confirmed: wait briefly, ask again |
| 3 | `mismatch`, `no_such_block`, `invalid_amount`, `invalid_block` | do not serve |
| 4 | `node_unreachable` | nothing was checked: retry or use another RPC; not a refusal |
| 64 | usage | fix the call |

Exit 4 is not a bad payment. Treating it as a refusal cheats an honest buyer; treating it as success serves for free.
Only a `send` block settles anything: receive, open and change blocks are refused however well the amount matches.

## Examples

```text
User request: "A caller says they paid 0.001 XNO for /api/summary, block hash B749B757EE750FC9AEA72F33CB429EACCD2ABEC9F2CCF59BF17AFAC304C9A58F. Serve it?"
Inputs: expected raw 500000000000000000000000000 (0.0005 XNO) to nano_1yo6c1t64ahfjdw1dxizmbbnpdmbrckwhw9phbg5pdkeubrizga4qhnjmnx7
Expected result (measured 2026-11-02 against rpc.nano.to): {"settled": true, "verdict": "settled", ...} and exit 0.
Changing the last digit of the amount gives {"verdict": "mismatch"} and exit 3.
```

## Limitations

- Single-node read: a node can be wrong or lagging. For high value, run it against two independent RPC URLs and require both to agree.
- A block hash is public once broadcast, so anyone can present someone else's payment. Record every hash you have served and refuse it the second time, or quote a unique amount per order.
- Nano blocks carry no memo, so the check cannot tell which order a payment was for.

## Safety and side effects

Read-only. One HTTPS POST to the RPC you name, containing the block hash. No file writes, no secrets, no state changes.
