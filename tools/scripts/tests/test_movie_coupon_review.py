"""Offline regression fixtures for the reviewed public-feed client."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch

SOURCE = Path(__file__).resolve().parents[3] / 'skills/movie-coupon/scripts/fetch_coupons.py'


class MovieReviewTests(unittest.TestCase):
    def load(self, payload=b'[]', status=200):
        response = types.SimpleNamespace(status_code=status, iter_content=lambda **kw: iter([payload]))
        class Context:
            def __enter__(self): return response
            def __exit__(self, *args): pass
        calls = []
        session = types.SimpleNamespace(headers={}, get=lambda *a, **kw: (calls.append((a, kw)) or Context()))
        fake = types.SimpleNamespace(Session=lambda: session, RequestException=RuntimeError)
        spec = importlib.util.spec_from_file_location('movie_review_fixture', SOURCE)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'requests': fake}): spec.loader.exec_module(module)
        return module, session, calls

    def test_array_shape_and_no_attribution_or_redirect(self):
        module, session, calls = self.load(b'[{"title":"demo","coupon_h5_qrcode_img_url":"https://example.org/qr.png"}]')
        result = module.CouponFetcher().get_coupons()
        self.assertIn('coupon_h5_qrcode_img_url', module.format_coupons_list(result))
        self.assertFalse(session.trust_env)
        self.assertFalse(calls[0][1]['allow_redirects'])
        self.assertNotIn('params', calls[0][1])
        self.assertEqual(calls[0][0][0], module.API_BASE_URL + '/coupon/movie')

    def test_invalid_large_and_error_responses_fail_closed(self):
        for payload, status in [(b'{}', 200), (b'[{"title":false}]', 200), (b'[]', 302), (b'x' * (2 * 1024 * 1024 + 1), 200)]:
            module, _, _ = self.load(payload, status)
            self.assertTrue(module.CouponFetcher().get_coupons()['error'])

    def test_output_and_destination_guards(self):
        module, _, _ = self.load()
        with self.assertRaises(ValueError): module.CouponFetcher('http://localhost')
        for url in ['javascript:alert(1)', 'https://user:secret@example.org/', 'https://example.org/\n', 'https://example.org:444/']:
            self.assertEqual(module.safe_url(url), '')
        text = module.format_coupon_display({'title': '\x1b[31m', 'coupon_url': 'javascript:bad'})
        self.assertNotIn('\x1b', text)
        self.assertIn('withheld', text)


if __name__ == '__main__': unittest.main()
