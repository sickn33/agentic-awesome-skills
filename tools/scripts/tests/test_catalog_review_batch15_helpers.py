"""Offline regression checks for reviewed batch15 helpers; no API or host probes."""
import ast
import contextlib
import io
import pathlib
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[3]

class ReviewedHelpers(unittest.TestCase):
    def test_monitor_rejects_zero_interval_before_collection(self):
        source = ROOT / 'skills/claude-monitor/scripts/monitor.py'
        fake_config = types.SimpleNamespace(BROWSER_NAMES=[], CLAUDE_NAMES=[], MONITOR_DEFAULTS=dict(interval=30, duration=300, alert_cpu=80, alert_ram=85))
        with patch.dict(sys.modules, {'psutil': types.SimpleNamespace(), 'config': fake_config}), patch.object(sys, 'argv', [str(source), '--interval', '0']), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as exc:
                runpy.run_path(str(source), run_name='__main__')
        self.assertEqual(exc.exception.code, 2)

    def test_memory_clear_requires_explicit_confirmation(self):
        source = ROOT / 'skills/linkedin-content-generator/scripts/memory_manager.py'
        before = (source.parent / 'memory.md').read_bytes()
        with patch.object(sys, 'argv', [str(source), 'clear']), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as exc:
                runpy.run_path(str(source), run_name='__main__')
        self.assertEqual(exc.exception.code, 2)
        self.assertEqual((source.parent / 'memory.md').read_bytes(), before)

    def test_memory_writer_rejects_symlink_without_touching_target(self):
        module = runpy.run_path(str(ROOT / 'skills/linkedin-content-generator/scripts/memory_manager.py'))
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / 'private.md'
            target.write_text('original')
            link = pathlib.Path(directory) / 'memory.md'
            link.symlink_to(target)
            function = module['ensure_memory_exists']
            function.__globals__['MEMORY_FILE'] = str(link)
            with self.assertRaises(ValueError):
                function()
            self.assertEqual(target.read_text(), 'original')

    def test_all_changed_python_scripts_parse_without_import(self):
        # The static parser catches syntax defects without executing bundled apps.
        for skill in ['claude-monitor', 'linkedin-content-generator', 'api-design-principles']:
            for source in (ROOT / 'skills' / skill).rglob('*.py'):
                with self.subTest(source=source.name):
                    ast.parse(source.read_text(), filename=str(source))

if __name__ == '__main__':
    unittest.main()
