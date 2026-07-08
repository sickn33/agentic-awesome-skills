# Billing Automation Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

## Core Concepts

### 1. Billing Cycles
**Common Intervals:**
- Monthly (most common for SaaS)
- Annual (discounted long-term)
- Quarterly
- Weekly
- Custom (usage-based, per-seat)

### 2. Subscription States
```
trial → active → past_due → canceled
              → paused → resumed
```

### 3. Dunning Management
Automated process to recover failed payments through:
- Retry schedules
- Customer notifications
- Grace periods
- Account restrictions

### 4. Proration
Adjusting charges when:
- Upgrading/downgrading mid-cycle
- Adding/removing seats
- Changing billing frequency

## Quick Start

```python
from billing import BillingEngine, Subscription

# Initialize billing engine
billing = BillingEngine()

# Create subscription
subscription = billing.create_subscription(
    customer_id="cus_123",
    plan_id="plan_pro_monthly",
    billing_cycle_anchor=datetime.now(),
    trial_days=14
)

# Process billing cycle
billing.process_billing_cycle(subscription.id)
```

## Subscription Lifecycle Management

```python
from datetime import datetime, timedelta
from enum import Enum

class SubscriptionStatus(Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    PAUSED = "paused"

class Subscription:
    def __init__(self, customer_id, plan, billing_cycle_day=None):
        self.id = generate_id()
        self.customer_id = customer_id
        self.plan = plan
        self.status = SubscriptionStatus.TRIAL
        self.current_period_start = datetime.now()
        self.current_period_end = self.current_period_start + timedelta(days=plan.trial_days or 30)
        self.billing_cycle_day = billing_cycle_day or self.current_period_start.day
        self.trial_end = datetime.now() + timedelta(days=plan.trial_days) if plan.trial_days else None

    def start_trial(self, trial_days):
        """Start trial period."""
        self.status = SubscriptionStatus.TRIAL
        self.trial_end = datetime.now() + timedelta(days=trial_days)
        self.current_period_end = self.trial_end

    def activate(self):
        """Activate subscription after trial or immediately."""
        self.status = SubscriptionStatus.ACTIVE
        self.current_period_start = datetime.now()
        self.current_period_end = self.calculate_next_billing_date()

    def mark_past_due(self):
        """Mark subscription as past due after failed payment."""
        self.status = SubscriptionStatus.PAST_DUE
        # Trigger dunning workflow

    def cancel(self, at_period_end=True):
        """Cancel subscription."""
        if at_period_end:
            self.cancel_at_period_end = True
            # Will cancel when current period ends
        else:
            self.status = SubscriptionStatus.CANCELED
            self.canceled_at = datetime.now()

    def calculate_next_billing_date(self):
        """Calculate next billing date based on interval."""
        if self.plan.interval == 'month':
            return self.current_period_start + timedelta(days=30)
        elif self.plan.interval == 'year':
            return self.current_period_start + timedelta(days=365)
        elif self.plan.interval == 'week':
            return self.current_period_start + timedelta(days=7)
```

## Billing Cycle Processing

```python
class BillingEngine:
    def process_billing_cycle(self, subscription_id):
        """Process billing for a subscription."""
        subscription = self.get_subscription(subscription_id)

        # Check if billing is due
        if datetime.now() < subscription.current_period_end:
            return

        # Generate invoice
        invoice = self.generate_invoice(subscription)

        # Attempt payment
        payment_result = self.charge_customer(
            subscription.customer_id,
            invoice.total
        )

        if payment_result.success:
            # Payment successful
            invoice.mark_paid()
            subscription.advance_billing_period()
            self.send_invoice(invoice)
        else:
            # Payment failed
            subscription.mark_past_due()
            self.start_dunning_process(subscription, invoice)

    def generate_invoice(self, subscription):
        """Generate invoice for billing period."""
        invoice = Invoice(
            customer_id=subscription.customer_id,
            subscription_id=subscription.id,
            period_start=subscription.current_period_start,
            period_end=subscription.current_period_end
        )

        # Add subscription line item
        invoice.add_line_item(
            description=subscription.plan.name,
            amount=subscription.plan.amount,
            quantity=subscription.quantity or 1
        )

        # Add usage-based charges if applicable
        if subscription.has_usage_billing:
            usage_charges = self.calculate_usage_charges(subscription)
            invoice.add_line_item(
                description="Usage charges",
                amount=usage_charges
            )

        # Calculate tax
        tax = self.calculate_tax(invoice.subtotal, subscription.customer)
        invoice.tax = tax

        invoice.finalize()
        return invoice

    def charge_customer(self, customer_id, amount):
        """Charge customer using saved payment method."""
        customer = self.get_customer(customer_id)

        try:
            # Charge using payment processor
            charge = stripe.Charge.create(
                customer=customer.stripe_id,
                amount=int(amount * 100),  # Convert to cents
                currency='usd'
            )

            return PaymentResult(success=True, transaction_id=charge.id)
        except stripe.error.CardError as e:
            return PaymentResult(success=False, error=str(e))
```

## Dunning Management

```python
class DunningManager:
    """Manage failed payment recovery."""

    def __init__(self):
        self.retry_schedule = [
            {'days': 3, 'email_template': 'payment_failed_first'},
            {'days': 7, 'email_template': 'payment_failed_reminder'},
            {'days': 14, 'email_template': 'payment_failed_final'}
        ]

    def start_dunning_process(self, subscription, invoice):
        """Start dunning process for failed payment."""
        dunning_attempt = DunningAttempt(
            subscription_id=subscription.id,
            invoice_id=invoice.id,
            attempt_number=1,
            next_retry=datetime.now() + timedelta(days=3)
        )

        # Send initial failure notification
        self.send_dunning_email(subscription, 'payment_failed_first')

        # Schedule retries
        self.schedule_retries(dunning_attempt)

    def retry_payment(self, dunning_attempt):
        """Retry failed payment."""
        subscription = self.get_subscription(dunning_attempt.subscription_id)
        invoice = self.get_invoice(dunning_attempt.invoice_id)

        # Attempt payment again
        result = self.charge_customer(subscription.customer_id, invoice.total)

        if result.success:
            # Payment succeeded
            invoice.mark_paid()
            subscription.status = SubscriptionStatus.ACTIVE
            self.send_dunning_email(subscription, 'payment_recovered')
            dunning_attempt.mark_resolved()
        else:
            # Still failing
            dunning_attempt.attempt_number += 1

            if dunning_attempt.attempt_number < len(self.retry_schedule):
                # Schedule next retry
                next_retry_config = self.retry_schedule[dunning_attempt.attempt_number]
                dunning_attempt.next_retry = datetime.now() + timedelta(days=next_retry_config['days'])
                self.send_dunning_email(subscription, next_retry_config['email_template'])
            else:
                # Exhausted retries, cancel subscription
                subscription.cancel(at_period_end=False)
                self.send_dunning_email(subscription, 'subscription_canceled')

    def send_dunning_email(self, subscription, template):
        """Send dunning notification to customer."""
        customer = self.get_customer(subscription.customer_id)

        email_content = self.render_template(template, {
            'customer_name': customer.name,
            'amount_due': subscription.plan.amount,
            'update_payment_url': f"https://app.example.com/billing"
        })

        send_email(
            to=customer.email,
            subject=email_content['subject'],
            body=email_content['body']
        )
```

## Proration

```python
class ProrationCalculator:
    """Calculate prorated charges for plan changes."""

    @staticmethod
    def calculate_proration(old_plan, new_plan, period_start, period_end, change_date):
        """Calculate proration for plan change."""
        # Days in current period
        total_days = (period_end - period_start).days

        # Days used on old plan
        days_used = (change_date - period_start).days

        # Days remaining on new plan
        days_remaining = (period_end - change_date).days

        # Calculate prorated amounts
        unused_amount = (old_plan.amount / total_days) * days_remaining
        new_plan_amount = (new_plan.amount / total_days) * days_remaining

        # Net charge/credit
        proration = new_plan_amount - unused_amount

        return {
            'old_plan_credit': -unused_amount,
            'new_plan_charge': new_plan_amount,
            'net_proration': proration,
            'days_used': days_used,
            'days_remaining': days_remaining
        }

    @staticmethod
    def calculate_seat_proration(current_seats, new_seats, price_per_seat, period_start, period_end, change_date):
        """Calculate proration for seat changes."""
        total_days = (period_end - period_start).days
        days_remaining = (period_end - change_date).days

        # Additional seats charge
        additional_seats = new_seats - current_seats
        prorated_amount = (additional_seats * price_per_seat / total_days) * days_remaining

        return {
            'additional_seats': additional_seats,
            'prorated_charge': max(0, prorated_amount),  # No refund for removing seats mid-cycle
            'effective_date': change_date
        }
```

## Tax Calculation

```python
class TaxCalculator:
    """Calculate sales tax, VAT, GST."""

    def __init__(self):
        # Tax rates by region
        self.tax_rates = {
            'US_CA': 0.0725,  # California sales tax
            'US_NY': 0.04,    # New York sales tax
            'GB': 0.20,       # UK VAT
            'DE': 0.19,       # Germany VAT
            'FR': 0.20,       # France VAT
            'AU': 0.10,       # Australia GST
        }

    def calculate_tax(self, amount, customer):
        """Calculate applicable tax."""
        # Determine tax jurisdiction
        jurisdiction = self.get_tax_jurisdiction(customer)

        if not jurisdiction:
            return 0

        # Get tax rate
        tax_rate = self.tax_rates.get(jurisdiction, 0)

        # Calculate tax
        tax = amount * tax_rate

        return {
            'tax_amount': tax,
            'tax_rate': tax_rate,
            'jurisdiction': jurisdiction,
            'tax_type': self.get_tax_type(jurisdiction)
        }

    def get_tax_jurisdiction(self, customer):
        """Determine tax jurisdiction based on customer location."""
        if customer.country == 'US':
            # US: Tax based on customer state
            return f"US_{customer.state}"
        elif customer.country in ['GB', 'DE', 'FR']:
            # EU: VAT
            return customer.country
        elif customer.country == 'AU':
            # Australia: GST
            return 'AU'
        else:
            return None

    def get_tax_type(self, jurisdiction):
        """Get type of tax for jurisdiction."""
        if jurisdiction.startswith('US_'):
            return 'Sales Tax'
        elif jurisdiction in ['GB', 'DE', 'FR']:
            return 'VAT'
        elif jurisdiction == 'AU':
            return 'GST'
        return 'Tax'

    def validate_vat_number(self, vat_number, country):
        """Validate EU VAT number."""
        # Use VIES API for validation
        # Returns True if valid, False otherwise
        pass
```

## Invoice Generation

```python
class Invoice:
    def __init__(self, customer_id, subscription_id=None):
        self.id = generate_invoice_number()
        self.customer_id = customer_id
        self.subscription_id = subscription_id
        self.status = 'draft'
        self.line_items = []
        self.subtotal = 0
        self.tax = 0
        self.total = 0
        self.created_at = datetime.now()

    def add_line_item(self, description, amount, quantity=1):
        """Add line item to invoice."""
        line_item = {
            'description': description,
            'unit_amount': amount,
            'quantity': quantity,
            'total': amount * quantity
        }
        self.line_items.append(line_item)
        self.subtotal += line_item['total']

    def finalize(self):
        """Finalize invoice and calculate total."""
        self.total = self.subtotal + self.tax
        self.status = 'open'
        self.finalized_at = datetime.now()

    def mark_paid(self):
        """Mark invoice as paid."""
        self.status = 'paid'
        self.paid_at = datetime.now()

    def to_pdf(self):
        """Generate PDF invoice."""
        from reportlab.pdfgen import canvas

        # Generate PDF
        # Include: company info, customer info, line items, tax, total
        pass

    def to_html(self):
        """Generate HTML invoice."""
        template = """
        <!DOCTYPE html>
        <html>
        <head><title>Invoice #{invoice_number}</title></head>
        <body>
            <h1>Invoice #{invoice_number}</h1>
            <p>Date: {date}</p>
            <h2>Bill To:</h2>
            <p>{customer_name}<br>{customer_address}</p>
            <table>
                <tr><th>Description</th><th>Quantity</th><th>Amount</th></tr>
                {line_items}
            </table>
            <p>Subtotal: ${subtotal}</p>
            <p>Tax: ${tax}</p>
            <h3>Total: ${total}</h3>
        </body>
        </html>
        """

        return template.format(
            invoice_number=self.id,
            date=self.created_at.strftime('%Y-%m-%d'),
            customer_name=self.customer.name,
            customer_address=self.customer.address,
            line_items=self.render_line_items(),
            subtotal=self.subtotal,
            tax=self.tax,
            total=self.total
        )
```

## Usage-Based Billing

```python
class UsageBillingEngine:
    """Track and bill for usage."""

    def track_usage(self, customer_id, metric, quantity):
        """Track usage event."""
        UsageRecord.create(
            customer_id=customer_id,
            metric=metric,
            quantity=quantity,
            timestamp=datetime.now()
        )

    def calculate_usage_charges(self, subscription, period_start, period_end):
        """Calculate charges for usage in billing period."""
        usage_records = UsageRecord.get_for_period(
            subscription.customer_id,
            period_start,
            period_end
        )

        total_usage = sum(record.quantity for record in usage_records)

        # Tiered pricing
        if subscription.plan.pricing_model == 'tiered':
            charge = self.calculate_tiered_pricing(total_usage, subscription.plan.tiers)
        # Per-unit pricing
        elif subscription.plan.pricing_model == 'per_unit':
            charge = total_usage * subscription.plan.unit_price
        # Volume pricing
        elif subscription.plan.pricing_model == 'volume':
            charge = self.calculate_volume_pricing(total_usage, subscription.plan.tiers)

        return charge

    def calculate_tiered_pricing(self, total_usage, tiers):
        """Calculate cost using tiered pricing."""
        charge = 0
        remaining = total_usage

        for tier in sorted(tiers, key=lambda x: x['up_to']):
            tier_usage = min(remaining, tier['up_to'] - tier['from'])
            charge += tier_usage * tier['unit_price']
            remaining -= tier_usage

            if remaining <= 0:
                break

        return charge
```

## Resources

- **references/billing-cycles.md**: Billing cycle management
- **references/dunning-management.md**: Failed payment recovery
- **references/proration.md**: Prorated charge calculations
- **references/tax-calculation.md**: Tax/VAT/GST handling
- **references/invoice-lifecycle.md**: Invoice state management
- **assets/billing-state-machine.yaml**: Billing workflow
- **assets/invoice-template.html**: Invoice templates
- **assets/dunning-policy.yaml**: Dunning configuration

## Best Practices

1. **Automate Everything**: Minimize manual intervention
2. **Clear Communication**: Notify customers of billing events
3. **Flexible Retry Logic**: Balance recovery with customer experience
4. **Accurate Proration**: Fair calculation for plan changes
5. **Tax Compliance**: Calculate correct tax for jurisdiction
6. **Audit Trail**: Log all billing events
7. **Graceful Degradation**: Handle edge cases without breaking

## Common Pitfalls

- **Incorrect Proration**: Not accounting for partial periods
- **Missing Tax**: Forgetting to add tax to invoices
- **Aggressive Dunning**: Canceling too quickly
- **No Notifications**: Not informing customers of failures
- **Hardcoded Cycles**: Not supporting custom billing dates
