import contextlib
import importlib.util
import io
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    fake_httpx = types.ModuleType("httpx")
    fake_httpx.ConnectError = type("ConnectError", (Exception,), {})
    fake_httpx.TimeoutException = type("TimeoutException", (Exception,), {})
    fake_httpx.Response = FakeResponse
    fake_httpx.get = lambda *args, **kwargs: None

    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda *args, **kwargs: None

    with patch.dict(sys.modules, {"httpx": fake_httpx, "dotenv": fake_dotenv}):
        spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class WhatsAppConfigLoggingSecurityTests(unittest.TestCase):
    MODULE_PATHS = [
        ("skills/whatsapp-cloud-api/scripts/validate_config.py", "whatsapp_validate_root"),
        (
            "plugins/agentic-awesome-skills/skills/whatsapp-cloud-api/scripts/validate_config.py",
            "whatsapp_validate_codex_plugin",
        ),
        (
            "plugins/agentic-awesome-skills-claude/skills/whatsapp-cloud-api/scripts/validate_config.py",
            "whatsapp_validate_claude_plugin",
        ),
    ]

    REQUIRED_ENV = {
        "WHATSAPP_TOKEN": "token-secret-123",
        "PHONE_NUMBER_ID": "phone-id-456",
        "WABA_ID": "waba-id-789",
        "APP_SECRET": "app-secret-000",
        "VERIFY_TOKEN": "verify-token-999",
    }

    def _run_main(self, module, responses):
        stdout = io.StringIO()
        with patch.dict(os.environ, self.REQUIRED_ENV, clear=False):
            with patch.object(module.httpx, "get", side_effect=responses):
                with patch.object(module.os.path, "exists", return_value=False):
                    with patch.object(sys, "argv", ["validate_config.py"]):
                        with contextlib.redirect_stdout(stdout):
                            with self.assertRaises(SystemExit) as exit_context:
                                module.main()
        return exit_context.exception.code, stdout.getvalue()

    def test_success_output_omits_sensitive_api_values(self):
        for relative_path, module_name in self.MODULE_PATHS:
            with self.subTest(relative_path=relative_path):
                module = load_module(relative_path, module_name)
                exit_code, output = self._run_main(
                    module,
                    [
                        FakeResponse(
                            200,
                            {
                                "display_phone_number": "+39 333 123 4567",
                                "verified_name": "Top Secret Brand",
                                "code_verification_status": "VERIFIED",
                                "quality_rating": "GREEN",
                            },
                        ),
                        FakeResponse(200, {"data": [{"id": "123"}, {"id": "456"}]}),
                    ],
                )

                self.assertEqual(exit_code, 0)
                self.assertIn("Detailed API payloads are intentionally omitted", output)
                self.assertIn("OK - Phone-number endpoint reachable.", output)
                self.assertIn("OK - WABA phone-numbers endpoint reachable.", output)
                self.assertNotIn("+39 333 123 4567", output)
                self.assertNotIn("Top Secret Brand", output)
                self.assertNotIn("VERIFIED", output)
                self.assertNotIn("GREEN", output)

    def test_failure_output_omits_error_payload_details(self):
        for relative_path, module_name in self.MODULE_PATHS:
            with self.subTest(relative_path=relative_path):
                module = load_module(relative_path, module_name)
                exit_code, output = self._run_main(
                    module,
                    [
                        FakeResponse(
                            401,
                            {
                                "error": {
                                    "message": "Invalid OAuth access token.",
                                    "code": 190,
                                }
                            },
                        ),
                        FakeResponse(
                            403,
                            {
                                "error": {
                                    "message": "User does not have access to this WABA.",
                                    "code": 10,
                                }
                            },
                        ),
                    ],
                )

                self.assertEqual(exit_code, 1)
                self.assertIn("FAIL - Graph API rejected the phone-number lookup.", output)
                self.assertIn("FAIL - Graph API rejected the WABA lookup.", output)
                self.assertNotIn("Invalid OAuth access token.", output)
                self.assertNotIn("User does not have access to this WABA.", output)
                self.assertNotIn("190", output)
                self.assertNotIn("10", output)


if __name__ == "__main__":
    unittest.main()
