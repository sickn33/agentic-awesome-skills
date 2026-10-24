---
name: paypal-integration
description: Master PayPal payment integration including Express Checkout, IPN handling, recurring billing, and refund workflows.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

## Supporting material availability

The following are external prerequisites, not bundled files: `<support-root>/references/express-checkout.md`, `<support-root>/references/ipn-handling.md`, `<support-root>/references/refund-workflows.md`, `<support-root>/references/billing-agreements.md`, `<support-root>/assets/paypal-client.py`, `<support-root>/assets/ipn-processor.py`, `<support-root>/assets/recurring-billing.py`. Obtain them from the original source or an existing installation and inspect them before use. Do not execute or claim completion of a dependent step until its required file exists; report unavailable steps. The fully documented inline workflow remains usable within the authorized scope.

# PayPal Integration

Master PayPal payment integration including Express Checkout, IPN handling, recurring billing, and refund workflows.

## Do not use this skill when

- The task is unrelated to paypal integration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

## Use this skill when

- Integrating PayPal as a payment option
- Implementing express checkout flows
- Setting up recurring billing with PayPal
- Processing refunds and payment disputes
- Handling PayPal webhooks (IPN)
- Supporting international payments
- Implementing PayPal subscriptions

## Core Concepts

### 1. Payment Products
**PayPal Checkout**
- One-time payments
- Express checkout experience
- Guest and PayPal account payments

**PayPal Subscriptions**
- Recurring billing
- Subscription plans
- Automatic renewals

**PayPal Payouts**
- Send money to multiple recipients
- Marketplace and platform payments

### 2. Integration Methods
**Client-Side (JavaScript SDK)**
- Smart Payment Buttons
- Hosted payment flow
- Minimal backend code

**Server-Side (REST API)**
- Full control over payment flow
- Custom checkout UI
- Advanced features

### 3. IPN (Instant Payment Notification)
- Webhook-like payment notifications
- Asynchronous payment updates
- Verification required

## Quick Start

Use the current JavaScript SDK with Orders v2 endpoints on your authenticated backend. Do not combine browser-side capture with a second backend capture, and do not pass Orders v2 IDs to the legacy Payments v1 SDK.

```javascript
// Browser fragment; include the SDK with the public client ID, never the client secret.
paypal.Buttons({
  async createOrder() {
    const response = await fetch('/api/paypal/orders', {method: 'POST'});
    if (!response.ok) throw new Error('Order creation failed');
    return (await response.json()).id;
  },
  async onApprove(data) {
    const response = await fetch('/api/paypal/capture', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({orderID: data.orderID})
    });
    if (!response.ok) throw new Error('Capture confirmation failed');
    // Backend owns reconciliation/fulfilment; the browser callback is not payment evidence.
  }
}).render('#paypal-button-container');
```

The route handlers are application adapters, not bundled. They must authenticate the user, enforce CSRF/origin controls, bind the order to the owned cart, derive price/currency/payee from trusted data, persist a stable PayPal-Request-Id per operation, and verify capture status/amount/currency/payee before atomic fulfilment. Treat timeout as uncertain; reconcile the existing request rather than create another charge. Store secrets through the server environment/secret manager. Use Decimal/string amounts with currency-specific precision, never binary floats for money. The following fragments are sandbox examples, not a production payment system.

## Express Checkout Implementation

### Server-Side Order Creation
```python
import requests
import json

class PayPalClient:
    def __init__(self, client_id, client_secret, mode='sandbox'):
        if mode not in ('sandbox', 'live'):
            raise ValueError('Explicit sandbox or live mode required')
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = 'https://api-m.sandbox.paypal.com' if mode == 'sandbox' else 'https://api-m.paypal.com'
        self.access_token = self.get_access_token()

    def get_access_token(self):
        """Get OAuth access token."""
        url = f"{self.base_url}/v1/oauth2/token"
        headers = {"Accept": "application/json", "Accept-Language": "en_US"}

        response = requests.post(
            url,
            headers=headers,
            data={"grant_type": "client_credentials"},
            auth=(self.client_id, self.client_secret), timeout=15, allow_redirects=False
        )

        response.raise_for_status()
        return response.json()['access_token']

    def create_order(self, amount, request_id, currency='USD'):
        """Create a PayPal order."""
        url = f"{self.base_url}/v2/checkout/orders"
        headers = {
            "Content-Type": "application/json",
            "PayPal-Request-Id": request_id, # Persisted per operation, unchanged on retry.
            "Authorization": f"Bearer {self.access_token}"
        }

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": currency,
                    "value": str(amount)
                }
            }]
        }

        response = requests.post(url, headers=headers, json=payload, timeout=15, allow_redirects=False)
        response.raise_for_status()
        return response.json()

    def capture_order(self, order_id, request_id):
        """Capture payment for an order."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}/capture"
        headers = {
            "Content-Type": "application/json",
            "PayPal-Request-Id": request_id, # Persisted per operation, unchanged on retry.
            "Authorization": f"Bearer {self.access_token}"
        }

        response = requests.post(url, headers=headers, timeout=15, allow_redirects=False)
        response.raise_for_status()
        return response.json()

    def get_order_details(self, order_id):
        """Get order details."""
        url = f"{self.base_url}/v2/checkout/orders/{order_id}"
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }

        response = requests.get(url, headers=headers, timeout=15, allow_redirects=False)
        response.raise_for_status()
        return response.json()
```

## IPN (Instant Payment Notification) Handling

IPN is a legacy notification protocol, not the REST Webhooks API. For current REST integrations verify webhook signatures with the documented webhook ID and environment. Limit inbound request size. VERIFIED establishes origin only: validate receiver, currency, amount, owned invoice/order and transaction status, then deduplicate atomically with a unique event/transaction record. A check-then-act helper alone races. Process reversals/refunds against original records and acknowledge only after durable recording.

### IPN Verification and Processing
```python
from flask import Flask, request
import requests
from urllib.parse import parse_qs

app = Flask(__name__)

@app.route('/ipn', methods=['POST'])
def handle_ipn():
    """Handle PayPal IPN notifications."""
    # Get IPN message
    raw_ipn = request.get_data(cache=True)
    ipn_data = request.form.to_dict()

    # Verify IPN with PayPal
    if not verify_ipn(raw_ipn):
        return 'IPN verification failed', 400

    # Process IPN based on transaction type
    payment_status = ipn_data.get('payment_status')
    txn_type = ipn_data.get('txn_type')

    if payment_status == 'Completed':
        handle_payment_completed(ipn_data)
    elif payment_status == 'Refunded':
        handle_refund(ipn_data)
    elif payment_status == 'Reversed':
        handle_chargeback(ipn_data)

    return 'IPN processed', 200

def verify_ipn(raw_ipn):
    """Echo original encoded body in order; do not reconstruct it from a dict."""
    paypal_url = 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
    response = requests.post(paypal_url, data=b'cmd=_notify-validate&' + raw_ipn,
                             headers={'Content-Type': 'application/x-www-form-urlencoded'},
                             timeout=15, allow_redirects=False)
    response.raise_for_status()
    return response.text.strip() == 'VERIFIED'

def handle_payment_completed(ipn_data):
    """Process completed payment."""
    txn_id = ipn_data.get('txn_id')
    payer_email = ipn_data.get('payer_email')
    mc_gross = ipn_data.get('mc_gross')
    item_name = ipn_data.get('item_name')

    # Check if already processed (prevent duplicates)
    if is_transaction_processed(txn_id):
        return

    # Update database
    # Send confirmation email
    # Fulfill order
    print(f"Payment completed: {txn_id}, Amount: ${mc_gross}")

def handle_refund(ipn_data):
    """Handle refund."""
    parent_txn_id = ipn_data.get('parent_txn_id')
    mc_gross = ipn_data.get('mc_gross')

    # Process refund in your system
    print(f"Refund processed: {parent_txn_id}, Amount: ${mc_gross}")

def handle_chargeback(ipn_data):
    """Handle payment reversal/chargeback."""
    txn_id = ipn_data.get('txn_id')
    reason_code = ipn_data.get('reason_code')

    # Handle chargeback
    print(f"Chargeback: {txn_id}, Reason: {reason_code}")
```

Mutation examples require a persisted operation-specific PayPal-Request-Id where supported, immutable server-owned amounts and opaque validated resource IDs. Token expiry/refresh, verified merchant identity and durable event processing are required integration work; no fragment implements fulfilment by itself. Refunds and recurring charges require authorization for that exact operation.

## Subscription/Recurring Billing

### Create Subscription Plan
```python
def create_subscription_plan(name, amount, request_id, interval='MONTH'):
    """Create a subscription plan."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v1/billing/plans"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client.access_token}",
        "PayPal-Request-Id": request_id
    }

    payload = {
        "product_id": "PRODUCT_ID",  # Create product first
        "name": name,
        "billing_cycles": [{
            "frequency": {
                "interval_unit": interval,
                "interval_count": 1
            },
            "tenure_type": "REGULAR",
            "sequence": 1,
            "total_cycles": 0,  # Infinite
            "pricing_scheme": {
                "fixed_price": {
                    "value": str(amount),
                    "currency_code": "USD"
                }
            }
        }],
        "payment_preferences": {
            "auto_bill_outstanding": True,
            "setup_fee": {
                "value": "0",
                "currency_code": "USD"
            },
            "setup_fee_failure_action": "CONTINUE",
            "payment_failure_threshold": 3
        }
    }

    response = requests.post(url, headers=headers, json=payload, timeout=15, allow_redirects=False)
    response.raise_for_status()
    return response.json()

def create_subscription(plan_id, subscriber_email, request_id):
    """Create a subscription for a customer."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v1/billing/subscriptions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {client.access_token}",
        "PayPal-Request-Id": request_id
    }

    payload = {
        "plan_id": plan_id,
        "subscriber": {
            "email_address": subscriber_email
        },
        "application_context": {
            "return_url": "https://yourdomain.com/subscription/success",
            "cancel_url": "https://yourdomain.com/subscription/cancel"
        }
    }

    response = requests.post(url, headers=headers, json=payload, timeout=15, allow_redirects=False)
    response.raise_for_status()
    subscription = response.json()

    # Get approval URL
    for link in subscription.get('links', []):
        if link['rel'] == 'approve':
            return {
                'subscription_id': subscription['id'],
                'approval_url': link['href']
            }
```

## Refund Workflows

```python
def create_refund(capture_id, request_id, amount=None, note=None):
    """Create a refund for a captured payment."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v2/payments/captures/{capture_id}/refund"
    headers = {
        "Content-Type": "application/json",
        "PayPal-Request-Id": request_id,
        "Authorization": f"Bearer {client.access_token}"
    }

    payload = {}
    if amount is not None:
        payload["amount"] = {
            "value": str(amount),
            "currency_code": "USD"
        }

    # Validate positive Decimal refund <= remaining captured balance and capture currency first.
    if note:
        payload["note_to_payer"] = note

    response = requests.post(url, headers=headers, json=payload, timeout=15, allow_redirects=False)
    response.raise_for_status()
    return response.json()

def get_refund_details(refund_id):
    """Get refund details."""
    client = PayPalClient(CLIENT_ID, CLIENT_SECRET)

    url = f"{client.base_url}/v2/payments/refunds/{refund_id}"
    headers = {
        "Authorization": f"Bearer {client.access_token}"
    }

    response = requests.get(url, headers=headers, timeout=15, allow_redirects=False)
    response.raise_for_status()
    return response.json()
```

## Error Handling

```python
class PayPalError(Exception):
    """Custom PayPal error."""
    pass

def handle_paypal_api_call(api_function):
    """Wrapper for PayPal API calls with error handling."""
    try:
        result = api_function()
        return result
    except requests.exceptions.RequestException as e:
        # Network error
        raise PayPalError(f"Network error: {str(e)}")
    except Exception as e:
        # Other errors
        raise PayPalError(f"PayPal API error: {str(e)}")

# Usage
try:
    order = handle_paypal_api_call(lambda: client.create_order("25.00", persisted_request_id))
except PayPalError as e:
    # Handle error appropriately
    log_error(e)
```

## Testing

```python
# Use sandbox credentials
import os
SANDBOX_CLIENT_ID = os.environ["PAYPAL_SANDBOX_CLIENT_ID"]
SANDBOX_SECRET = os.environ["PAYPAL_SANDBOX_SECRET"]

# Test accounts
# Create test buyer and seller accounts at developer.paypal.com

def test_payment_flow():
    """Test complete payment flow."""
    client = PayPalClient(SANDBOX_CLIENT_ID, SANDBOX_SECRET, mode='sandbox')

    # Create order
    order = client.create_order("10.00", "sandbox-test-order-001")
    assert 'id' in order

    # Get approval URL
    approval_url = next((link['href'] for link in order['links'] if link['rel'] == 'approve'), None)
    assert approval_url is not None

    # After approval (manual step with test account)
    # Capture order
    # captured = client.capture_order(order['id'], 'sandbox-test-capture-001')
    # assert captured['status'] == 'COMPLETED'
```

## Resources

- **references/express-checkout.md**: Express Checkout implementation guide
- **references/ipn-handling.md**: IPN verification and processing
- **references/refund-workflows.md**: Refund handling patterns
- **references/billing-agreements.md**: Recurring billing setup
- **assets/paypal-client.py**: Production PayPal client
- **assets/ipn-processor.py**: IPN webhook processor
- **assets/recurring-billing.py**: Subscription management

## Best Practices

1. **Always Verify IPN**: Never trust IPN without verification
2. **Idempotent Processing**: Handle duplicate IPN notifications
3. **Error Handling**: Implement robust error handling
4. **Logging**: Log minimal event IDs/statuses; redact tokens, payer identifiers and raw provider errors
5. **Test Thoroughly**: Use sandbox extensively
6. **Webhook Backup**: Don't rely solely on client-side callbacks
7. **Currency Handling**: Always specify currency explicitly

## Common Pitfalls

- **Not Verifying IPN**: Accepting IPN without verification
- **Duplicate Processing**: Not checking for duplicate transactions
- **Wrong Environment**: Mixing sandbox and production URLs/credentials
- **Missing Webhooks**: Not handling all payment states
- **Hardcoded Values**: Not making configurable for different environments

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
