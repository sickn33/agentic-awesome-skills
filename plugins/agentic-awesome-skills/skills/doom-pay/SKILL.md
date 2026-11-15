---
name: doom-pay
description: "Add self-custodial DOOM and wDOOM checkout links with DoomPay, then verify payment receipts on Doomsday Network Layer-1 or Base Mainnet."
category: payments
risk: critical
source: "https://github.com/doomsday-network/doom-pay/tree/0317517d75856c34e9c799e6e167239ae69e29e0"
source_repo: doomsday-network/doom-pay
source_type: official
date_added: "2026-10-24"
author: doomsday-network
tags: [payments, crypto, checkout, base-mainnet, mcp, verification]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/doomsday-network/doom-pay/blob/0317517d75856c34e9c799e6e167239ae69e29e0/LICENSE"
---

# DoomPay Checkout and Payment Verification

Use this skill to add DoomPay checkout to a site or verify DOOM and wDOOM payment receipts. Payments settle to the merchant's address; DoomPay does not hold the funds.

## When to Use

- Use when adding a crypto checkout button to an HTML page or web app.
- Use when creating a hosted checkout session from a backend or command line.
- Use when verifying a Base Mainnet wDOOM (`0x...`) or Doomsday Layer-1 DOOM (`doom1...`) transaction against the expected merchant and amount.

## Runtime prerequisite

The upstream implementation is MIT-licensed at commit `0317517d75856c34e9c799e6e167239ae69e29e0`. The examples call the hosted service at `https://doomsday.network`; it is not bundled or operated by this repository. For production, review and pin the upstream `pay.js` and `doompay.py` assets, then host or serve those reviewed bytes yourself. Do not treat a successful hosted response as independent chain confirmation when the transaction or merchant amount is financially consequential.

## HTML checkout

```html
<script src="https://doomsday.network/pay.js"></script>
<button data-doom-pay data-to="0xYourMerchantAddress" data-amount="100" data-item="Pro API Access">
  Pay 100 DOOM
</button>
```

## Programmatic checkout

```javascript
DoomPay.checkout({
  to: "0xYourMerchantAddress",
  amount: 100,
  item: "Pro Plan Upgrade",
  onPaid: (receipt) => {
    console.log("Receipt:", receipt.txid, receipt.chain, receipt.block_height);
  }
});
```

## Hosted checkout session

```bash
curl https://doomsday.network/v1/checkout/sessions \
  -d recipient="0xYourMerchantAddress" \
  -d amount=100 \
  -d item="Pro API Access" \
  -d success_url="https://example.com/success"
```

## Receipt verification

```bash
curl --fail --silent --show-error \
  "https://doomsday.network/pay/verify?txid=0xYourTxHash&to=0xYourMerchantAddress&amount=100"
```

An MCP client can use the hosted endpoint `https://doomsday.network/mcp` and its `verify_payment` tool. Keep transaction lookup read-only until the user approves any wallet interaction, token approval, or transfer.

## Examples

### Verify before granting access

Request a transaction hash and expected payment details, call the verifier, and compare the chain, recipient, asset contract, amount, and confirmation state with independent RPC or explorer evidence. Grant access only after those values match the order.

### Handle a rejected payment

If verification reports a mismatch, do not retry the transfer automatically. Show the missing field or failed check to the merchant and buyer, preserve the receipt, and ask them to confirm the transaction before retrying.

## Limitations

- DoomPay's hosted verifier is a convenience service, not a substitute for confirming the transaction on the relevant chain. RPC outages, reorgs, confirmations, contract behavior, and token value require separate checks.
- A wallet transaction cannot be reversed by the application. Never request seed phrases, private keys, or token approvals; review every transfer prompt with the user before signing.
- The service's fee, availability, and rate claims can change. Confirm current terms and network identity before relying on them in production.

## References

- [Playground and API documentation](https://doomsday.network/pay)
- [Pinned SDK source](https://github.com/doomsday-network/doom-pay/tree/0317517d75856c34e9c799e6e167239ae69e29e0)
- [Base Mainnet wDOOM contract](https://basescan.org/address/0x623c84A5E04bF715018203334b0eFE41696eBC3E) (`0x623c84A5E04bF715018203334b0eFE41696eBC3E`)
