---
name: odoo-automated-tests
description: "Write and run Odoo automated tests using TransactionCase, HttpCase, and browser tour tests. Covers test data setup, mocking, and CI integration."
risk: safe
source: "self"
---

# Odoo Automated Tests

## Overview

Odoo has a built-in testing framework based on Python's `unittest`. This skill helps you write `TransactionCase` unit tests, `HttpCase` integration tests, and JavaScript tour tests. It also covers running tests in CI pipelines.

## When to Use This Skill

- Writing unit tests for a custom model's business logic.
- Creating an HTTP test to verify a controller endpoint.
- Debugging test failures in a CI pipeline.
- Setting up automated test execution with `--test-enable`.

## How It Works

1. **Activate**: Mention `@odoo-automated-tests` and describe the feature to test.
2. **Generate**: Get complete test class code with setup, teardown, and assertions.
3. **Run**: Get the exact `odoo` CLI command to execute your tests.

## Examples

### Example 1: TransactionCase Unit Test (Odoo 15+ pattern)

```python
# tests/test_hospital_patient.py
from odoo.tests.common import TransactionCase
from odoo.tests import tagged
from odoo.exceptions import ValidationError

@tagged('post_install', '-at_install')
class TestHospitalPatient(TransactionCase):

    @classmethod
    def setUpClass(cls):
        # Use setUpClass for performance — runs once per class, not per test
        super().setUpClass()
        cls.Patient = cls.env['hospital.patient']
        cls.doctor = cls.env['res.users'].browse(cls.env.uid)

    def test_create_patient(self):
        patient = self.Patient.create({
            'name': 'John Doe',
            'doctor_id': self.doctor.id,
        })
        self.assertEqual(patient.state, 'draft')
        self.assertEqual(patient.name, 'John Doe')

    def test_confirm_patient(self):
        patient = self.Patient.create({'name': 'Jane Smith'})
        patient.action_confirm()
        self.assertEqual(patient.state, 'confirmed')

    def test_empty_name_raises_error(self):
        with self.assertRaises(ValidationError):
            self.Patient.create({'name': ''})

    def test_access_denied_for_other_user(self):
        # Test security rules by running as a different user
        other_user = self.env.ref('base.user_demo')
        with self.assertRaises(Exception):
            self.Patient.with_user(other_user).create({'name': 'Test'})
```

> **`setUpClass` vs `setUp`:** Use `setUpClass` (Odoo 15+) for shared test data. It runs once per class and is significantly faster than `setUp` which re-initializes for every single test method.

### Example 2: Run Tests via CLI

```bash
# Run all tests for a specific module
./odoo-bin --test-enable --stop-after-init -d my_database -u hospital_management

# Run only tests tagged with a specific tag
./odoo-bin --test-enable --stop-after-init -d my_database \
  --test-tags hospital_management

# Run a specific test class
./odoo-bin --test-enable --stop-after-init -d my_database \
  --test-tags /hospital_management:TestHospitalPatient
```

### Example 3: HttpCase for Controller Testing

```python
from odoo.tests.common import HttpCase
from odoo.tests import tagged

@tagged('post_install', '-at_install')
class TestPatientController(HttpCase):

    def test_patient_page_authenticated(self):
        # Authenticate as a user, not with hardcoded password
        self.authenticate(self.env.user.login, self.env.user.login)
        resp = self.url_open('/hospital/patients')
        self.assertEqual(resp.status_code, 200)

    def test_patient_page_redirects_unauthenticated(self):
        # No authenticate() call = public/anonymous user
        resp = self.url_open('/hospital/patients', allow_redirects=False)
        self.assertIn(resp.status_code, [301, 302, 403])
```

## Best Practices

- ✅ **Do:** Use `setUpClass()` with `cls.env` instead of `setUp()` — it is dramatically faster for large test suites.
- ✅ **Do:** Use `@tagged('post_install', '-at_install')` to run tests after all modules are installed.
- ✅ **Do:** Test both the happy path and error conditions (`ValidationError`, `AccessError`, `UserError`).
- ✅ **Do:** Use `self.with_user(user)` to test access control without calling `sudo()`.
- ❌ **Don't:** Use a production database for tests — always use a dedicated test database.
- ❌ **Don't:** Rely on test execution order — each `TransactionCase` test is rolled back in isolation.
- ❌ **Don't:** Hardcode passwords in `HttpCase.authenticate()` — use `self.env.user.login` or a fixture user.

## Limitations

- **JavaScript tour tests** require a running browser (via `phantomjs` or `Chrome headless`) and a live Odoo server — not covered in depth here.
- `HttpCase` tests are significantly slower than `TransactionCase` — use them only for controller/route verification.
- Does not cover **mocking external services** (e.g., mocking an SMTP server or payment gateway in tests).
- Test isolation is at the **transaction level**, not database level — tests that commit data (e.g., via `cr.commit()`) can leak state between tests.
