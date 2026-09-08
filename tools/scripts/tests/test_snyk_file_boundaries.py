"""Regression proofs for local file findings reviewed from Snyk."""
import os
import json
import subprocess
import sys
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from symlink_test_utils import symlink_or_skip
from test_secur0_remediations import load_module
from test_ws_listener_security import load_module as load_listener


class FileBoundaryTests(unittest.TestCase):
    def test_listener_rejects_hardlink_before_truncating(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            module = load_listener('snyk_listener', root)
            module.OUTPUT_DIR.mkdir(parents=True)
            outside = root / 'outside'
            outside.write_text('preserve me')
            os.link(outside, module.PID_FILE)
            with self.assertRaises(OSError):
                module.secure_write_text(module.PID_FILE, 'new')
            self.assertEqual(outside.read_text(), 'preserve me')

    def test_listener_repairs_existing_permissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            module = load_listener('snyk_listener_modes', Path(tmp))
            module.OUTPUT_DIR.mkdir(parents=True)
            module.EVENTS_FILE.write_text('old\n')
            module.EVENTS_FILE.chmod(0o644)
            module.secure_append_text(module.EVENTS_FILE, 'new\n')
            self.assertEqual(stat.S_IMODE(module.EVENTS_FILE.stat().st_mode), 0o600)
            self.assertEqual(module.EVENTS_FILE.read_text(), 'old\nnew\n')

    def test_profile_rejects_hardlink_before_mutation(self):
        module = load_module('snyk_profile', 'skills/find-complementary-founders/scripts/assess_profile.py')
        with tempfile.TemporaryDirectory() as tmp:
            outside = Path(tmp) / 'outside'
            outside.write_text('preserve me')
            outside.chmod(0o644)
            output = Path(tmp) / 'result.private.json'
            os.link(outside, output)
            with self.assertRaises((OSError, module.ProfileError)):
                module.write_json(output, {'secret': 'test'}, private=True)
            self.assertEqual(outside.read_text(), 'preserve me')
            self.assertEqual(stat.S_IMODE(outside.stat().st_mode), 0o644)

    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'POSIX named pipes required')
    def test_inventory_rejects_fifo_without_waiting_for_writer(self):
        module = load_module('snyk_inventory', 'skills/lint-and-validate/scripts/type_coverage.py')
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            os.mkfifo(root / 'pipe.py')
            run = subprocess.run([sys.executable, module.__file__, str(root)], capture_output=True, text=True, timeout=5)
            self.assertEqual(run.returncode, 1)
            result = json.loads(run.stdout)['results'][0]
            self.assertEqual(result['files'], 0)
            self.assertEqual(result['errors'][0]['error'], 'source is not a regular file')

    def test_state_links_are_rejected_without_changing_target(self):
        for skill in ('instagram', 'notebooklm'):
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as tmp:
                root = Path(tmp)
                old_umask = os.umask(0o077)
                try:
                    with patch.dict(os.environ, {f'AAS_{skill.upper()}_DATA_DIR': str(root / skill)}):
                        module = load_module(f'snyk_links_{skill}', f'skills/{skill}/scripts/config.py')
                        if skill == 'notebooklm':
                            module.ensure_private_state()
                    outside = root / 'outside'
                    outside.write_text('preserve me')
                    outside.chmod(0o644)
                    linked = module.DATA_DIR / 'linked'
                    symlink_or_skip(self, outside, linked)
                    with self.assertRaises(OSError):
                        module.protect_state_path(linked)
                    linked.unlink()
                    os.link(outside, linked)
                    with self.assertRaises(OSError):
                        module.protect_state_path(linked)
                    self.assertEqual(stat.S_IMODE(outside.stat().st_mode), 0o644)
                    self.assertEqual(outside.read_text(), 'preserve me')
                    external_dir = root / 'external'
                    external_dir.mkdir(mode=0o755)
                    external_dir.chmod(0o755)
                    linked_dir = module.DATA_DIR / 'linked_dir'
                    symlink_or_skip(self, external_dir, linked_dir)
                    with self.assertRaises(OSError):
                        module.protect_state_path(linked_dir, directory=True)
                    self.assertEqual(stat.S_IMODE(external_dir.stat().st_mode), 0o755)
                finally:
                    os.umask(old_umask)

    def test_state_initialization_preserves_parent_permissions(self):
        for skill in ('instagram', 'notebooklm'):
            with self.subTest(skill=skill), tempfile.TemporaryDirectory() as tmp:
                parent = Path(tmp) / 'shared' / 'apps'
                parent.mkdir(parents=True)
                parent.chmod(0o755)
                parent.parent.chmod(0o755)
                old_umask = os.umask(0o077)
                try:
                    with patch.dict(os.environ, {f'AAS_{skill.upper()}_DATA_DIR': str(parent / skill)}):
                        module = load_module(f'snyk_{skill}', f'skills/{skill}/scripts/config.py')
                        if skill == 'notebooklm':
                            module.ensure_private_state()
                    self.assertEqual(stat.S_IMODE(parent.stat().st_mode), 0o755)
                    self.assertEqual(stat.S_IMODE(parent.parent.stat().st_mode), 0o755)
                    self.assertEqual(stat.S_IMODE(module.DATA_DIR.stat().st_mode), 0o700)
                finally:
                    os.umask(old_umask)


if __name__ == '__main__':
    unittest.main()
