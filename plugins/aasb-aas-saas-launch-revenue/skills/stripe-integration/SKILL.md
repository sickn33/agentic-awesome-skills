---
name: stripe-integration
description: Implement and verify Stripe checkout, subscriptions, webhooks and refunds with explicit server-side authorization and retry boundaries.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Stripe Integration

Implement and verify Stripe checkout, subscriptions, webhooks and refunds with explicit server-side authorization and retry boundaries.

## Do not use this skill when

- The task is unrelated to stripe integration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- Inspect the installed Stripe SDK and pinned API/webhook version. This single-file skill has no bundled playbook or production wrapper.

## Use this skill when

- Implementing payment processing in web/mobile applications
- Setting up subscription billing systems
- Handling one-time payments and recurring charges
- Processing refunds and disputes
- Managing customer payment methods
- Implementing SCA (Strong Customer Authentication) for European payments
- Building marketplace payment flows with Stripe Connect

## Core Concepts

### 1. Payment Flows
**Checkout Session (Hosted)**
- Stripe-hosted payment page
- Reduced direct card-data handling
- Fastest implementation
- Supports one-time and recurring payments

**Payment Intents (Custom UI)**
- Full control over payment UI
- Uses Stripe.js/Elements to avoid handling raw card data directly
- More complex implementation
- Better customization options

**Setup Intents (Save Payment Methods)**
- Collect payment method without charging
- Used for subscriptions and future payments
- Requires customer confirmation

### 2. Webhooks
**Critical Events:**
- `payment_intent.succeeded`: Payment completed
- `payment_intent.payment_failed`: Payment failed
- `customer.subscription.updated`: Subscription changed
- `customer.subscription.deleted`: Subscription canceled
- `charge.refunded`: Refund processed
- `invoice.payment_succeeded`: Subscription payment successful

### 3. Subscriptions
**Components:**
- **Product**: What you're selling
- **Price**: How much and how often
- **Subscription**: Customer's recurring payment
- **Invoice**: Generated for each billing cycle

### 4. Customer Management
- Create and manage customer records
- Store multiple payment methods
- Track customer metadata
- Manage billing details

## Inputs and safety boundary

Use an explicitly authorized Stripe test account/sandbox, server-owned order and customer records, the installed SDK/API version and expected webhook types. Amounts, currencies, price/customer IDs and refund permissions must come from authenticated server policy, not arbitrary client parameters. Checkout/Elements can reduce card-data exposure; they do not establish PCI compliance by themselves.

The snippets are integration sketches. Test secret keys and webhook signing secrets are different; load them from the project secret mechanism and never print them. No live payment, refund, customer update or account configuration is authorized merely by reading this skill.

## Quick Start

```python
import os
import stripe

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

# Create a checkout session
session = stripe.checkout.Session.create(
    payment_method_types=['card'],
    line_items=[{
        'price_data': {
            'currency': 'usd',
            'product_data': {
                'name': 'Premium Subscription',
            },
            'unit_amount': 2000,  # $20.00
            'recurring': {
                'interval': 'month',
            },
        },
        'quantity': 1,
    }],
    mode='subscription',
    success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url='https://yourdomain.com/cancel',
)

# Redirect user to session.url
print(session.url)
```

## Payment Implementation Patterns

### Pattern 1: One-Time Payment (Hosted Checkout)
```python
def create_checkout_session(amount, order_attempt_id, currency='usd'):
    """Create a one-time payment checkout session."""
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': currency,
                    'product_data': {
                        'name': 'Purchase',
                        'images': ['https://example.com/product.jpg'],
                    },
                    'unit_amount': amount,  # Amount in cents
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url='https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url='https://yourdomain.com/cancel',
            metadata={
                'order_id': 'order_123',
                'user_id': 'user_456'
            },
            idempotency_key=order_attempt_id
        )
        return session
    except stripe.error.StripeError as e:
        # Handle error
        print(f"Stripe error: {e.user_message}")
        raise
```

### Pattern 2: Custom Payment Intent Flow
```python
def create_payment_intent(amount, order_attempt_id, currency='usd', customer_id=None):
    """Create a payment intent for custom checkout UI."""
    intent = stripe.PaymentIntent.create(
        amount=amount,
        currency=currency,
        customer=customer_id,
        automatic_payment_methods={
            'enabled': True,
        },
        metadata={
            'integration_check': 'accept_a_payment'
        },
        idempotency_key=order_attempt_id
    )
    return intent.client_secret  # Only to the authenticated client for this order; never log it

# Frontend (JavaScript)
"""
const stripe = Stripe('pk_test_...');
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

const {error, paymentIntent} = await stripe.confirmCardPayment(
    clientSecret,
    {
        payment_method: {
            card: cardElement,
            billing_details: {
                name: 'Customer Name'
            }
        }
    }
);

if (error) {
    // Handle error
} else if (paymentIntent.status === 'succeeded') {
    // Update display only; server fulfillment still verifies payment state
}
"""
```

### Pattern 3: Subscription creation contract

Use the flow documented for the account’s pinned API version. Do not assume `latest_invoice.payment_intent` exists in every version or that every invoice has an immediately confirmable payment. Resolve an authorized customer and allowed price, create the incomplete subscription with an idempotency key, and handle the returned confirmation state through that version’s API. Grant access from verified subscription/invoice state; test trials, zero-amount invoices, delayed payments, cancellation and retries.

See [Stripe subscription integration](https://docs.stripe.com/billing/subscriptions/build-subscriptions). The customer portal below also requires ownership checks before accepting a customer ID.

### Pattern 4: Customer Portal
```python
def create_customer_portal_session(customer_id):
    """Create a portal session for customers to manage subscriptions."""
    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url='https://yourdomain.com/account',
    )
    return session.url  # Redirect customer here
```

## Webhook Handling

### Secure Webhook Endpoint
```python
import os
from flask import Flask, request
import stripe

app = Flask(__name__)

endpoint_secret = os.environ["STRIPE_WEBHOOK_SECRET"]

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(cache=False)  # Exact raw bytes; enforce an ingress body-size limit
    sig_header = request.headers.get('Stripe-Signature')
    if not sig_header:
        return 'Missing signature', 400

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.SignatureVerificationError:
        # Invalid signature
        return 'Invalid signature', 400

    # Integration sketch: durable deduplication/queueing below must precede effects.
    # Bind account, mode, order, amount/currency and expected current state first.
    # Handle the event
    if event['type'] == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_successful_payment(payment_intent)
    elif event['type'] == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_failed_payment(payment_intent)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        handle_subscription_canceled(subscription)

    return 'Success', 200

def handle_successful_payment(payment_intent):
    """Process successful payment."""
    customer_id = payment_intent.get('customer')
    amount = payment_intent['amount']
    metadata = payment_intent.get('metadata', {})

    # Update your database
    # Send confirmation email
    # Fulfill order
    print(f"Payment succeeded: {payment_intent['id']}")

def handle_failed_payment(payment_intent):
    """Handle failed payment."""
    error = payment_intent.get('last_payment_error', {})
    print(f"Payment failed: {error.get('message')}")
    # Notify customer
    # Update order status

def handle_subscription_canceled(subscription):
    """Handle subscription cancellation."""
    customer_id = subscription['customer']
    # Update user access
    # Send cancellation email
    print(f"Subscription canceled: {subscription['id']}")
```

### Signature, duplication and fulfillment

Use `stripe.Webhook.construct_event` with the raw bytes, full `Stripe-Signature` header and correct endpoint secret. A bare HMAC over the body does not implement Stripe’s timestamped header format or replay tolerance. Keep the SDK’s timestamp check and verify both invalid and stale signatures. See [Stripe webhook documentation](https://docs.stripe.com/webhooks).

```text
Verify signature and event/account/mode before accepting the event.
Atomically insert event.id into a durable inbox with a unique constraint.
Return 2xx only after durable acceptance; retryable storage failure remains a failure.
A worker reconciles current payment/order state and applies a guarded transition.
Use a unique order/fulfillment key as well: different events can describe the same payment.
Commit the state change and an outbox entry together; downstream effects are idempotent.
Duplicate/concurrent delivery returns the recorded result without fulfilling twice.
```

A check-then-handle-then-mark sequence is not atomic and does not provide exactly-once effects. Events can arrive out of order. The sample Flask handlers above are placeholders, not a complete durable processor; do not deploy them as fulfillment. Checkout success redirects are UI signals, not proof of payment. Consult [fulfillment guidance](https://docs.stripe.com/checkout/fulfillment) and [request idempotency](https://docs.stripe.com/api/idempotent_requests).

## Customer Management

```python
def create_customer(email, name, payment_method_id=None):
    """Create a Stripe customer."""
    customer = stripe.Customer.create(
        email=email,
        name=name,
        payment_method=payment_method_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        } if payment_method_id else None,
        metadata={
            'user_id': '12345'
        }
    )
    return customer

def attach_payment_method(customer_id, payment_method_id):
    """Attach a payment method to a customer."""
    stripe.PaymentMethod.attach(
        payment_method_id,
        customer=customer_id
    )

    # Set as default
    stripe.Customer.modify(
        customer_id,
        invoice_settings={
            'default_payment_method': payment_method_id
        }
    )

def list_customer_payment_methods(customer_id):
    """List all payment methods for a customer."""
    payment_methods = stripe.PaymentMethod.list(
        customer=customer_id,
        type='card'
    )
    return payment_methods.data
```

## Refund Handling

```python
def create_refund(payment_intent_id, refund_attempt_id, amount=None, reason=None):
    """Create a refund."""
    refund_params = {
        'payment_intent': payment_intent_id
    }

    if amount is not None:
        if type(amount) is not int or amount <= 0:
            raise ValueError("Refund amount must be a positive minor-unit integer")
        refund_params['amount'] = amount  # Partial refund

    if reason:
        refund_params['reason'] = reason  # 'duplicate', 'fraudulent', 'requested_by_customer'

    refund = stripe.Refund.create(**refund_params, idempotency_key=refund_attempt_id)
    return refund

def handle_dispute(dispute_id, evidence):
    """Update dispute with evidence."""
    stripe.Dispute.modify(
        dispute_id,
        evidence={
            'customer_name': evidence.get('customer_name'),
            'customer_email_address': evidence.get('customer_email'),
            'shipping_documentation': evidence.get('shipping_proof'),
            'customer_communication': evidence.get('communication'),
        }
    )
```

## Testing

```python
# Use test mode keys
import os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

# Test card numbers
TEST_CARDS = {
    'success': '4242424242424242',
    'declined': '4000000000000002',
    '3d_secure': '4000002500003155',
    'insufficient_funds': '4000000000009995'
}

def test_payment_flow():
    """Test complete payment flow."""
    # Create test customer
    customer = stripe.Customer.create(
        email="test@example.com"
    )

    # Create payment intent
    intent = stripe.PaymentIntent.create(
        amount=1000,
        currency='usd',
        customer=customer.id,
        payment_method_types=['card']
    )

    # Confirm with test card
    confirmed = stripe.PaymentIntent.confirm(
        intent.id,
        payment_method='pm_card_visa'  # Test payment method
    )

    assert confirmed.status == 'succeeded'
```

## Worked verification case

For an authorized test order, deliver the same valid payment event twice and concurrently, then a stale/invalid signature and an older out-of-order state event. Expected: one durable fulfillment, rejected invalid signatures, and no rollback of a newer state. Simulate a storage failure before inbox commit; it must not return a success that loses the event. Assert a zero-amount refund is rejected rather than silently becoming a full refund.

These are acceptance checks to implement in the project. This skill records no live transaction result and includes no hidden client wrapper or extra reference files.

## Best Practices

1. **Always Use Webhooks**: Don't rely solely on client-side confirmation
2. **Idempotency**: Handle webhook events idempotently
3. **Error Handling**: Gracefully handle all Stripe errors
4. **Test Mode**: Thoroughly test with test keys before production
5. **Metadata**: Use metadata to link Stripe objects to your database
6. **Monitoring**: Track payment success rates and errors
7. **PCI Compliance**: Never handle raw card data on your server
8. **SCA Ready**: Implement 3D Secure for European payments

## Common Pitfalls

- **Not Verifying Webhooks**: Always verify webhook signatures
- **Missing Webhook Events**: Handle all relevant webhook events
- **Hardcoded Amounts**: Use cents/smallest currency unit
- **No Retry Logic**: Implement retries for API calls
- **Ignoring Test Mode**: Test all edge cases with test cards

## Limitations

- API versions, event payloads and SDK exception namespaces differ; verify the installed version rather than combining examples from different releases.
- Request idempotency keys must stay bound to the same logical operation and parameters; a new key on every retry can duplicate a charge or refund.
- Webhook deduplication alone does not prevent duplicate business effects from different events.
- Client success, test-card success and a signature check do not establish full fulfillment, tax, compliance or subscription correctness.
- Customer, payment-method, dispute and refund mutations require server-side ownership/role checks and explicit task authorization.
