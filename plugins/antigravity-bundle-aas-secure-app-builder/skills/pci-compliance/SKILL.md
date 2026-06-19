---
name: pci-compliance
description: "Master PCI DSS (Payment Card Industry Data Security Standard) compliance for secure payment processing and handling of cardholder data."
risk: unknown
source: community
date_added: "2026-02-27"
---

# PCI Compliance

Master PCI DSS (Payment Card Industry Data Security Standard) compliance for secure payment processing and handling of cardholder data.

## Do not use this skill when

- The task is unrelated to pci compliance
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Building payment processing systems
- Handling credit card information
- Implementing secure payment flows
- Conducting PCI compliance audits
- Reducing PCI compliance scope
- Implementing tokenization and encryption
- Preparing for PCI DSS assessments

## PCI DSS Requirements (12 Core Requirements)

### Build and Maintain Secure Network
1. Install and maintain firewall configuration
2. Don't use vendor-supplied defaults for passwords

### Protect Cardholder Data
3. Protect stored cardholder data
4. Encrypt transmission of cardholder data across public networks

### Maintain Vulnerability Management
5. Protect systems against malware
6. Develop and maintain secure systems and applications

### Implement Strong Access Control
7. Restrict access to cardholder data by business need-to-know
8. Identify and authenticate access to system components
9. Restrict physical access to cardholder data

### Monitor and Test Networks
10. Track and monitor all access to network resources and cardholder data
11. Regularly test security systems and processes

### Maintain Information Security Policy
12. Maintain a policy that addresses information security

## Compliance Levels

**Level 1**: > 6 million transactions/year (annual ROC required)
**Level 2**: 1-6 million transactions/year (annual SAQ)
**Level 3**: 20,000-1 million e-commerce transactions/year
**Level 4**: < 20,000 e-commerce or < 1 million total transactions

## Data Minimization (Never Store)

```python
# NEVER STORE THESE
PROHIBITED_DATA = {
    'full_track_data': 'Magnetic stripe data',
    'cvv': 'Card verification code/value',
    'pin': 'PIN or PIN block'
}

# CAN STORE (if encrypted)
ALLOWED_DATA = {
    'pan': 'Primary Account Number (card number)',
    'cardholder_name': 'Name on card',
    'expiration_date': 'Card expiration',
    'service_code': 'Service code'
}

class PaymentData:
    """Safe payment data handling."""

    def __init__(self):
        self.prohibited_fields = ['cvv', 'cvv2', 'cvc', 'pin']

    def sanitize_log(self, data):
        """Remove sensitive data from logs."""
        sanitized = data.copy()

        # Mask PAN
        if 'card_number' in sanitized:
            card = sanitized['card_number']
            sanitized['card_number'] = f"{card[:6]}{'*' * (len(card) - 10)}{card[-4:]}"

        # Remove prohibited data
        for field in self.prohibited_fields:
            sanitized.pop(field, None)

        return sanitized

    def validate_no_prohibited_storage(self, data):
        """Ensure no prohibited data is being stored."""
        for field in self.prohibited_fields:
            if field in data:
                raise SecurityError(f"Attempting to store prohibited field: {field}")
```

## Tokenization

### Using Payment Processor Tokens
```python
import stripe

class TokenizedPayment:
    """Handle payments using tokens (no card data on server)."""

    @staticmethod
    def create_payment_method_token(card_details):
        """Create token from card details (client-side only)."""
        # THIS SHOULD ONLY BE DONE CLIENT-SIDE WITH STRIPE.JS
        # NEVER send card details to your server

        """
        // Frontend JavaScript
        const stripe = Stripe('pk_...');

        const {token, error} = await stripe.createToken({
            card: {
                number: '4242424242424242',
                exp_month: 12,
                exp_year: 2024,
                cvc: '123'
            }
        });

        // Send token.id to server (NOT card details)
        """
        pass

    @staticmethod
    def charge_with_token(token_id, amount):
        """Charge using token (server-side)."""
        # Your server only sees the token, never the card number
        stripe.api_key = "sk_..."

        charge = stripe.Charge.create(
            amount=amount,
            currency="usd",
            source=token_id,  # Token instead of card details
            description="Payment"
        )

        return charge

    @staticmethod
    def store_payment_method(customer_id, payment_method_token):
        """Store payment method as token for future use."""
        stripe.Customer.modify(
            customer_id,
            source=payment_method_token
        )

        # Store only customer_id and payment_method_id in your database
        # NEVER store actual card details
        return {
            'customer_id': customer_id,
            'has_payment_method': True
            # DO NOT store: card number, CVV, etc.
        }
```

### Custom Tokenization (Advanced)
```python
import secrets
from cryptography.fernet import Fernet

class TokenVault:
    """Secure token vault for card data (if you must store it)."""

    def __init__(self, encryption_key):
        self.cipher = Fernet(encryption_key)
        self.vault = {}  # In production: use encrypted database

    def tokenize(self, card_data):
        """Convert card data to token."""
        # Generate secure random token
        token = secrets.token_urlsafe(32)

        # Encrypt card data
        encrypted = self.cipher.encrypt(json.dumps(card_data).encode())

        # Store token -> encrypted data mapping
        self.vault[token] = encrypted

        return token

    def detokenize(self, token):
        """Retrieve card data from token."""
        encrypted = self.vault.get(token)
        if not encrypted:
            raise ValueError("Token not found")

        # Decrypt
        decrypted = self.cipher.decrypt(encrypted)
        return json.loads(decrypted.decode())

    def delete_token(self, token):
        """Remove token from vault."""
        self.vault.pop(token, None)
```

## Encryption

### Data at Rest
```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class EncryptedStorage:
    """Encrypt data at rest using AES-256-GCM."""

    def __init__(self, encryption_key):
        """Initialize with 256-bit key."""
        self.key = encryption_key  # Must be 32 bytes

    def encrypt(self, plaintext):
        """Encrypt data."""
        # Generate random nonce
        nonce = os.urandom(12)

        # Encrypt
        aesgcm = AESGCM(self.key)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

        # Return nonce + ciphertext
        return nonce + ciphertext

    def decrypt(self, encrypted_data):
        """Decrypt data."""
        # Extract nonce and ciphertext
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]

        # Decrypt
        aesgcm = AESGCM(self.key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)

        return plaintext.decode()

# Usage
storage = EncryptedStorage(os.urandom(32))
encrypted_pan = storage.encrypt("4242424242424242")
# Store encrypted_pan in database
```

### Data in Transit
```python
# Always use TLS 1.2 or higher
# Flask/Django example
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'

# Enforce HTTPS
from flask_talisman import Talisman
Talisman(app, force_https=True)
```

## Access Control

```python
from functools import wraps
from flask import session

def require_pci_access(f):
    """Decorator to restrict access to cardholder data."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = session.get('user')

        # Check if user has PCI access role
        if not user or 'pci_access' not in user.get('roles', []):
            return {'error': 'Unauthorized access to cardholder data'}, 403

        # Log access attempt
        audit_log(
            user=user['id'],
            action='access_cardholder_data',
            resource=f.__name__
        )

        return f(*args, **kwargs)

    return decorated_function

@app.route('/api/payment-methods')
@require_pci_access
def get_payment_methods():
    """Retrieve payment methods (restricted access)."""
    # Only accessible to users with pci_access role
    pass
```

## Audit Logging

```python
import logging
from datetime import datetime

class PCIAuditLogger:
    """PCI-compliant audit logging."""

    def __init__(self):
        self.logger = logging.getLogger('pci_audit')
        # Configure to write to secure, append-only log

    def log_access(self, user_id, resource, action, result):
        """Log access to cardholder data."""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'resource': resource,
            'action': action,
            'result': result,
            'ip_address': request.remote_addr
        }

        self.logger.info(json.dumps(entry))

    def log_authentication(self, user_id, success, method):
        """Log authentication attempt."""
        entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'event': 'authentication',
            'success': success,
            'method': method,
            'ip_address': request.remote_addr
        }

        self.logger.info(json.dumps(entry))

# Usage
audit = PCIAuditLogger()
audit.log_access(user_id=123, resource='payment_methods', action='read', result='success')
```

## Security Best Practices

### Input Validation
```python
import re

def validate_card_number(card_number):
    """Validate card number format (Luhn algorithm)."""
    # Remove spaces and dashes
    card_number = re.sub(r'[\s-]', '', card_number)

    # Check if all digits
    if not card_number.isdigit():
        return False

    # Luhn algorithm
    def luhn_checksum(card_num):
        def digits_of(n):
            return [int(d) for d in str(n)]

        digits = digits_of(card_num)
        odd_digits = digits[-1::-2]
        even_digits = digits[-2::-2]
        checksum = sum(odd_digits)
        for d in even_digits:
            checksum += sum(digits_of(d * 2))
        return checksum % 10

    return luhn_checksum(card_number) == 0

def sanitize_input(user_input):
    """Sanitize user input to prevent injection."""
    # Remove special characters
    # Validate against expected format
    # Escape for database queries
    pass
```

## PCI DSS SAQ (Self-Assessment Questionnaire)

### SAQ A (Least Requirements)
- E-commerce using hosted payment page
- No card data on your systems
- ~20 questions

### SAQ A-EP
- E-commerce with embedded payment form
- Uses JavaScript to handle card data
- ~180 questions

### SAQ D (Most Requirements)
- Store, process, or transmit card data
- Full PCI DSS requirements
- ~300 questions

## Compliance Checklist

```python
PCI_COMPLIANCE_CHECKLIST = {
    'network_security': [
        'Firewall configured and maintained',
        'No vendor default passwords',
        'Network segmentation implemented'
    ],
    'data_protection': [
        'No storage of CVV, track data, or PIN',
        'PAN encrypted when stored',
        'PAN masked when displayed',
        'Encryption keys properly managed'
    ],
    'vulnerability_management': [
        'Anti-virus installed and updated',
        'Secure development practices',
        'Regular security patches',
        'Vulnerability scanning performed'
    ],
    'access_control': [
        'Access restricted by role',
        'Unique IDs for all users',
        'Multi-factor authentication',
        'Physical security measures'
    ],
    'monitoring': [
        'Audit logs enabled',
        'Log review process',
        'File integrity monitoring',
        'Regular security testing'
    ],
    'policy': [
        'Security policy documented',
        'Risk assessment performed',
        'Security awareness training',
        'Incident response plan'
    ]
}
```

## Resources

- **references/data-minimization.md**: Never store prohibited data
- **references/tokenization.md**: Tokenization strategies
- **references/encryption.md**: Encryption requirements
- **references/access-control.md**: Role-based access
- **references/audit-logging.md**: Comprehensive logging
- **assets/pci-compliance-checklist.md**: Complete checklist
- **assets/encrypted-storage.py**: Encryption utilities
- **scripts/audit-payment-system.sh**: Compliance audit script

## Common Violations

1. **Storing CVV**: Never store card verification codes
2. **Unencrypted PAN**: Card numbers must be encrypted at rest
3. **Weak Encryption**: Use AES-256 or equivalent
4. **No Access Controls**: Restrict who can access cardholder data
5. **Missing Audit Logs**: Must log all access to payment data
6. **Insecure Transmission**: Always use TLS 1.2+
7. **Default Passwords**: Change all default credentials
8. **No Security Testing**: Regular penetration testing required

## Reducing PCI Scope

1. **Use Hosted Payments**: Stripe Checkout, PayPal, etc.
2. **Tokenization**: Replace card data with tokens
3. **Network Segmentation**: Isolate cardholder data environment
4. **Outsource**: Use PCI-compliant payment processors
5. **No Storage**: Never store full card details

By minimizing systems that touch card data, you reduce compliance burden significantly.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
