"""Offline behavior regressions for reviewed webhook and market-data examples."""
import base64
import hashlib
import hmac
from pathlib import Path
import re
from types import SimpleNamespace
import unittest

from fixtures.reviewed_examples.catalog_batch02 import ALPHA_SOURCE, SHOPIFY_SOURCE

ROOT = Path(__file__).resolve().parents[3]


class ReviewedExamples(unittest.TestCase):
    def test_published_examples_match_reviewed_fixtures(self):
        for skill, fixture in (("odoo-shopify-integration", SHOPIFY_SOURCE),
                               ("alpha-vantage", ALPHA_SOURCE)):
            blocks = re.findall(r"```python\n(.*?)```", (ROOT / "skills" / skill / "SKILL.md").read_text(), re.S)
            self.assertIn(fixture, blocks, "Changed example needs renewed review")

    def test_webhook_authentication_binds_raw_bytes_and_secret(self):
        namespace = {}
        exec(compile(SHOPIFY_SOURCE, "reviewed-shopify-fixture", "exec"), namespace)
        verify = namespace["valid_shopify_hmac"]
        body, secret = b'{"order":17}', b"fixture-secret"
        signature = base64.b64encode(hmac.new(secret, body, hashlib.sha256).digest()).decode()
        self.assertTrue(verify(body, signature, secret))
        self.assertFalse(verify(body + b" ", signature, secret))
        self.assertFalse(verify(body, signature, b"different-secret"))
        self.assertFalse(verify(body, "", secret))
        empty_signature = base64.b64encode(hmac.new(b"", body, hashlib.sha256).digest()).decode()
        self.assertFalse(verify(body, empty_signature, b""))

    def make_client(self, payload=None, status=200, failure=None):
        class TransportError(Exception):
            pass
        calls = []

        def get(url, **kwargs):
            calls.append((url, kwargs))
            if failure == "transport":
                raise TransportError("url?apikey=fixture-secret")

            def decode():
                if failure == "json":
                    raise ValueError("invalid")
                return payload

            return SimpleNamespace(ok=200 <= status < 400, status_code=status, json=decode)

        # Execute the reviewed fixture after its imports, with a synthetic transport.
        source = ALPHA_SOURCE[ALPHA_SOURCE.index("def av_get"):]
        namespace = {"requests": SimpleNamespace(get=get, RequestException=TransportError),
                     "API_KEY": "fixture-secret", "BASE_URL": "https://example.invalid/query"}
        exec(compile(source, "reviewed-alpha-fixture", "exec"), namespace)
        return namespace, calls

    def test_market_data_success_has_bounded_request(self):
        namespace, calls = self.make_client({"Global Quote": {"05. price": "17"}})
        self.assertEqual(namespace["av_get"]("GLOBAL_QUOTE", symbol="EXAMPLE")["Global Quote"]["05. price"], "17")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][1]["timeout"], 30)

    def test_http200_quota_and_malformed_payloads_are_failures(self):
        for payload in ({"Note": "quota"}, {"Information": "entitlement"},
                        {"Error Message": "invalid function"}, [], None):
            namespace, _ = self.make_client(payload)
            with self.assertRaises(RuntimeError):
                namespace["av_get"]("GLOBAL_QUOTE")

    def test_transport_http_and_decode_failures_do_not_expose_key(self):
        for options in ({"failure": "transport"}, {"failure": "json"}, {"status": 429}):
            namespace, calls = self.make_client(**options)
            with self.assertRaises(RuntimeError) as caught:
                namespace["av_get"]("GLOBAL_QUOTE")
            self.assertNotIn("fixture-secret", str(caught.exception))
            self.assertEqual(len(calls), 1, "No automatic retry after uncertain failures")

    def test_bad_credentials_and_reserved_key_do_not_send_requests(self):
        namespace, calls = self.make_client({})
        with self.assertRaises(ValueError):
            namespace["av_get"]("GLOBAL_QUOTE", apikey="override")
        namespace["API_KEY"] = None
        with self.assertRaises(ValueError):
            namespace["av_get"]("GLOBAL_QUOTE")
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
