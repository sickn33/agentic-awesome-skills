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


class FakeWeaviateClient:
    def close(self):
        pass


class FakeAuth:
    @staticmethod
    def api_key(value):
        return {"api_key": value}


class FakeAdditionalConfig:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


class FakeTimeout:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None

    fake_weaviate = types.ModuleType("weaviate")
    fake_weaviate.connect_to_weaviate_cloud = lambda **kwargs: FakeWeaviateClient()

    fake_classes = types.ModuleType("weaviate.classes")
    fake_init = types.ModuleType("weaviate.classes.init")
    fake_init.Auth = FakeAuth
    fake_init.AdditionalConfig = FakeAdditionalConfig
    fake_init.Timeout = FakeTimeout

    fake_client = types.ModuleType("weaviate.client")
    fake_client.WeaviateClient = FakeWeaviateClient

    with patch.dict(
        sys.modules,
        {
            "weaviate": fake_weaviate,
            "weaviate.classes": fake_classes,
            "weaviate.classes.init": fake_init,
            "weaviate.client": fake_client,
        },
    ):
        spec.loader.exec_module(module)

    return module


class WeaviateConnectionLoggingSecurityTests(unittest.TestCase):
    MODULE_PATHS = [
        ("skills/weaviate/scripts/weaviate_conn.py", "weaviate_conn_root"),
        (
            "plugins/antigravity-awesome-skills/skills/weaviate/scripts/weaviate_conn.py",
            "weaviate_conn_codex_plugin",
        ),
        (
            "plugins/antigravity-awesome-skills-claude/skills/weaviate/scripts/weaviate_conn.py",
            "weaviate_conn_claude_plugin",
        ),
    ]

    FIXTURE_VALUE = "-".join(("fixture", "value"))

    ENV = {
        "WEAVIATE_URL": "https://example.weaviate.cloud",
        "WEAVIATE_API_KEY": f"weaviate-{FIXTURE_VALUE}",
        "OPENAI_API_KEY": f"openai-{FIXTURE_VALUE}",
        "AWS_SECRET_KEY": "aws-fixture-value",
    }

    FORBIDDEN_OUTPUT = [
        "WEAVIATE_API_KEY",
        "OPENAI_API_KEY",
        "AWS_SECRET_KEY",
        "weaviate-fixture-value",
        "openai-fixture-value",
        "aws-fixture-value",
    ]

    def _capture_stderr(self, callback, env=None):
        stderr = io.StringIO()
        with patch.dict(os.environ, env or self.ENV, clear=True):
            with contextlib.redirect_stderr(stderr):
                callback()
        return stderr.getvalue()

    def test_context_manager_does_not_forward_provider_keys_by_default(self):
        for relative_path, module_name in self.MODULE_PATHS:
            with self.subTest(relative_path=relative_path):
                module = load_module(relative_path, module_name)
                headers_seen = []

                def run_client():
                    headers_seen.append(module.get_headers())
                    with module.get_client(verbose=True):
                        pass

                output = self._capture_stderr(run_client)

                self.assertEqual([None], headers_seen)
                self.assertNotIn("Detected", output)
                self.assertIn("Connecting to Weaviate...", output)
                for forbidden in self.FORBIDDEN_OUTPUT:
                    self.assertNotIn(forbidden, output)

    def test_allowlisted_provider_verbose_output_omits_secret_names_and_values(self):
        for relative_path, module_name in self.MODULE_PATHS:
            with self.subTest(relative_path=relative_path):
                module = load_module(relative_path, module_name)
                env = {
                    **self.ENV,
                    "WEAVIATE_PROVIDER_KEYS": "OPENAI_API_KEY,AWS_SECRET_KEY",
                }

                output = self._capture_stderr(
                    lambda: module.connect_client(verbose=True).close(),
                    env=env,
                )

                self.assertIn("Detected 2 providers.", output)
                self.assertIn("Connected.", output)
                for forbidden in self.FORBIDDEN_OUTPUT:
                    self.assertNotIn(forbidden, output)


if __name__ == "__main__":
    unittest.main()
