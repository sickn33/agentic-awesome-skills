import importlib.util
import os
import stat
import sys
import tempfile
import types
import unittest
from pathlib import Path

from symlink_test_utils import symlink_or_skip


REPO_ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = REPO_ROOT / "skills" / "videodb" / "scripts" / "ws_listener.py"


def load_module(module_name: str, state_home: Path):
    fake_videodb = types.ModuleType("videodb")
    fake_dotenv = types.ModuleType("dotenv")
    fake_dotenv.load_dotenv = lambda: None

    old_argv = sys.argv[:]
    old_xdg = os.environ.get("XDG_STATE_HOME")
    sys.argv = [str(MODULE_PATH)]
    os.environ["XDG_STATE_HOME"] = str(state_home)
    sys.modules["videodb"] = fake_videodb
    sys.modules["dotenv"] = fake_dotenv
    try:
        spec = importlib.util.spec_from_file_location(module_name, MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        sys.modules[module_name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        sys.argv = old_argv
        if old_xdg is None:
            os.environ.pop("XDG_STATE_HOME", None)
        else:
            os.environ["XDG_STATE_HOME"] = old_xdg


class WsListenerSecurityTests(unittest.TestCase):
    def test_write_pid_rejects_symlink_target(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_home = Path(temp_dir)
            module = load_module("ws_listener_security_pid", state_home)

            module.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            outside = state_home / "outside.txt"
            outside.write_text("secret", encoding="utf-8")
            symlink_or_skip(self, outside, module.PID_FILE)

            with self.assertRaises(OSError):
                module.write_pid()

            self.assertEqual(outside.read_text(encoding="utf-8"), "secret")

    def test_append_event_creates_private_regular_file(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_home = Path(temp_dir)
            module = load_module("ws_listener_security_append", state_home)

            module.append_event({"channel": "demo"})

            self.assertTrue(module.EVENTS_FILE.is_file())
            file_mode = stat.S_IMODE(module.EVENTS_FILE.stat().st_mode)
            self.assertEqual(file_mode, 0o600)

    def test_append_event_rejects_symlink_target(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            state_home = Path(temp_dir)
            module = load_module("ws_listener_security_symlink", state_home)

            module.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            outside = state_home / "outside.jsonl"
            outside.write_text("secret\n", encoding="utf-8")
            symlink_or_skip(self, outside, module.EVENTS_FILE)

            with self.assertRaises(OSError):
                module.append_event({"channel": "demo"})

            self.assertEqual(outside.read_text(encoding="utf-8"), "secret\n")


if __name__ == "__main__":
    unittest.main()
