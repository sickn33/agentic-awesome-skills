import importlib.util
import sys
import unittest
from pathlib import Path


def _load_trusted_search_config():
    module_path = (
        Path(__file__).resolve().parents[3]
        / "skills"
        / "fact-check-x-unified"
        / "scripts"
        / "trusted_search_config.py"
    )
    spec = importlib.util.spec_from_file_location("trusted_search_config", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["trusted_search_config"] = module
    spec.loader.exec_module(module)
    return module


class TrustedSearchPublicJsonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = _load_trusted_search_config()

    def test_redact_sensitive_json_masks_secret_keys(self):
        payload = {
            "status": "ok",
            "token": "fcx_secret",
            "nested": {"api_key": "abc", "count": 2},
        }
        redacted = self.module.redact_sensitive_json(payload)
        self.assertEqual(redacted["status"], "ok")
        self.assertEqual(redacted["token"], "***redacted***")
        self.assertEqual(redacted["nested"]["api_key"], "***redacted***")
        self.assertEqual(redacted["nested"]["count"], 2)


if __name__ == "__main__":
    unittest.main()
