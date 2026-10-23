"""Exercise reviewed installer with disposable local fixtures; no user installs or network."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

SCRIPTS = Path(__file__).resolve().parents[3] / 'skills/skill-installer/scripts'

class InstallerReview(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name).resolve()
        self.source = self.root / 'incoming/demo'
        self.source.mkdir(parents=True)
        (self.source / 'SKILL.md').write_text('---\nname: demo\ndescription: A sufficiently long description for an isolated installation regression fixture.\n---\n# Fixture\n')
        (self.source / 'scripts').mkdir()
        (self.source / 'scripts/run.sh').write_text('#!/bin/sh\nexit 0\n')
        (self.source / 'scripts/run.sh').chmod(0o755)
        (self.source / 'scripts/requirements.txt').write_text('')
        (self.source / 'data').mkdir()
        (self.source / 'data/template.json').write_text('{}')
    def tearDown(self):
        self.temp.cleanup()
    def run_cli(self, script, *args):
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        run = subprocess.run([sys.executable, str(SCRIPTS / script), *map(str, args)], cwd=self.root, capture_output=True, text=True, env=env, timeout=20)
        return run, json.loads(run.stdout) if run.stdout.strip() else {}
    def test_full_tree_registration_archive_and_no_implicit_external_code(self):
        external = self.root / 'skills/agent-orchestrator/scripts'
        external.mkdir(parents=True)
        (external / 'scan_registry.py').write_text("from pathlib import Path\nPath('UNEXPECTED_EXECUTION').write_text('bad')\n")
        run, result = self.run_cli('install_skill.py', '--source', self.source, '--json')
        self.assertEqual(run.returncode, 0, (run.stderr, result))
        self.assertTrue(result['success'])
        self.assertFalse(result['registry_updated'])
        self.assertFalse((self.root / 'skills/UNEXPECTED_EXECUTION').exists())
        registration = self.root / '.claude/skills/demo'
        self.assertEqual((registration / 'data/template.json').read_text(), '{}')
        self.assertTrue((registration / 'scripts/run.sh').stat().st_mode & 0o111)
        with zipfile.ZipFile(self.root / 'dist/demo.zip') as archive:
            self.assertIn('demo/data/template.json', archive.namelist())
            self.assertIn('demo/scripts/run.sh', archive.namelist())
    def test_metadata_symlinks_and_secrets_fail_closed(self):
        md = self.source / 'SKILL.md'
        original = md.read_text()
        for body in ('---\n- list\n---\n', '---\nname: demo\nname: other\ndescription: text\n---\n', '---\nname: 123\ndescription: text\n---\n'):
            md.write_text(body)
            run, result = self.run_cli('validate_skill.py', self.source)
            self.assertNotEqual(run.returncode, 0)
            self.assertFalse(result['valid'])
        md.write_text(original)
        secret = self.root / 'outside.txt'
        secret.write_text('private')
        (self.source / 'link').symlink_to(secret)
        run, result = self.run_cli('install_skill.py', '--source', self.source, '--json')
        self.assertNotEqual(run.returncode, 0)
        self.assertFalse((self.root / 'skills/demo').exists())
        (self.source / 'link').unlink()
        (self.source / '.env.production').write_text('TOKEN=fixture')
        run, result = self.run_cli('package_skill.py', '--source', self.source)
        self.assertNotEqual(run.returncode, 0)
    def test_dry_run_management_does_not_uninstall(self):
        target = self.root / 'skills/demo'
        target.mkdir(parents=True)
        (target / 'keep').write_text('keep')
        run, result = self.run_cli('install_skill.py', '--uninstall', 'demo', '--dry-run', '--json')
        self.assertNotEqual(run.returncode, 0)
        self.assertEqual((target / 'keep').read_text(), 'keep')
        run, result = self.run_cli('install_skill.py', '--source', self.source, '--dry-run', '--force', '--json')
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual((target / 'keep').read_text(), 'keep')
        self.assertFalse((self.root / '.claude').exists())
        self.assertFalse((self.root / 'dist').exists())
    def test_installation_root_symlink_cannot_escape_workspace(self):
        with tempfile.TemporaryDirectory() as outside:
            target = Path(outside).resolve()
            (self.root / 'skills').symlink_to(target, target_is_directory=True)
            run, result = self.run_cli('install_skill.py', '--source', self.source, '--json')
            self.assertNotEqual(run.returncode, 0)
            self.assertEqual(list(target.iterdir()), [])

    def test_archive_traversal_rejected(self):
        output = self.root / 'dist'
        output.mkdir()
        with zipfile.ZipFile(output / 'demo.zip', 'w') as archive:
            archive.writestr('demo/SKILL.md', 'fixture')
            archive.writestr('../outside', 'bad')
        run, result = self.run_cli('package_skill.py', '--verify', '--output', output)
        self.assertNotEqual(run.returncode, 0)
        self.assertEqual(result['invalid'], 1)

if __name__ == '__main__':
    unittest.main()
