import importlib.util
import os
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


base_scraper = load_module(
    "skills/junta-leiloeiros/scripts/scraper/base_scraper.py",
    "junta_base_scraper",
)


class JuntaTlsSecurityTests(unittest.TestCase):
    def test_tls_verification_is_enabled_by_default(self):
        os.environ.pop("JUNTA_INSECURE_TLS", None)
        self.assertTrue(base_scraper.should_verify_tls())

    def test_tls_verification_can_be_disabled_explicitly(self):
        os.environ["JUNTA_INSECURE_TLS"] = "1"
        try:
            self.assertFalse(base_scraper.should_verify_tls())
        finally:
            os.environ.pop("JUNTA_INSECURE_TLS", None)


if __name__ == "__main__":
    unittest.main()
