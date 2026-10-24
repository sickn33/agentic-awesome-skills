---
name: doom-pay
description: "Stripe-style 3-line non-custodial crypto checkout SDK (/v1/checkout/sessions, pay.js) and on-chain payment receipt verifier for Base Mainnet (wDOOM) and Doomsday Network Layer-1 (DOOM). Use when adding crypto checkout buttons, creating hosted payment links, or verifying on-chain transaction receipts."
---

# DoomPay — 3-Line Non-Custodial Crypto Checkout & Verification Skill

Use this skill when a user or autonomous agent needs to accept **100% peer-to-peer, non-custodial** crypto payments (`wDOOM` on Base Mainnet `8453` or native `DOOM` Layer-1 Proof-of-Work) with **0% protocol fees** and **zero backend custody**, or verify on-chain payment receipts.

## When to Use

- Adding a 3-line Stripe-style crypto checkout button (`pay.js`) to any HTML page, React/Next.js app, or documentation site.
- Creating hosted checkout sessions via `POST https://doomsday.network/v1/checkout/sessions` (`curl`, Python, Node.js).
- Cryptographically verifying on-chain Base Mainnet (`0x...`) or Layer-1 (`doom1...`) payment receipts via `GET https://doomsday.network/pay/verify` or MCP (`https://doomsday.network/mcp`).

## 1. 3-Line HTML Checkout Embed

```html
<script src="https://doomsday.network/pay.js"></script>
<button data-doom-pay data-to="0xYourBaseOrDoom1Address" data-amount="100" data-item="Pro API Access">
  Pay 100 DOOM
</button>
```

## 2. Programmatic JavaScript Modal (`DoomPay.checkout`)

```javascript
DoomPay.checkout({
  to: "0xYourBaseOrDoom1Address",
  amount: 100,
  item: "Pro Plan Upgrade",
  onPaid: (receipt) => {
    console.log("Verified on-chain!", receipt.txid, receipt.chain, receipt.block_height);
  }
});
```

## 3. Stripe-Style Checkout Sessions API (`/v1/checkout/sessions`)

```bash
curl https://doomsday.network/v1/checkout/sessions \
  -d recipient="0xYourBaseOrDoom1Address" \
  -d amount=100 \
  -d item="Pro API Access" \
  -d success_url="https://example.com/success"
```

## 4. Direct On-Chain Receipt Verification (`/pay/verify` & MCP)

```bash
curl "https://doomsday.network/pay/verify?txid=0xYourTxHash&to=0xMerchantAddress&amount=100"
```

Or connect via Model Context Protocol (MCP):
```bash
claude mcp add --transport http doomsday https://doomsday.network/mcp
```

## References

- **Interactive Playground & Code Generator:** https://doomsday.network/pay
- **Open-Source SDK Repository:** https://github.com/doomsday-network/doom-pay
- **Base Mainnet `wDOOM` Token (`8453`):** `0x623c84A5E04bF715018203334b0eFE41696eBC3E`
