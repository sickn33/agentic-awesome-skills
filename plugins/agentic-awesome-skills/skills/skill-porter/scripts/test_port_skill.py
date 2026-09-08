"""Temporary-local-fixture tests for complete bundles and write boundaries."""
import contextlib
import importlib.util
import io
import os
from pathlib import Path
import tempfile
import unittest
spec = importlib.util.spec_from_file_location('porter', Path(__file__).with_name('port_skill.py'))
porter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(porter)

class PorterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.source = self.base / 'sample-skill'
        self.source.mkdir()
        self.original = b'---\nname: sample-skill\ndescription: "View: metadata"\n---\n`View` then `Bash`. View prose. CLAUDE.md.\n'
        (self.source / 'SKILL.md').write_bytes(self.original)
        (self.source / 'assets').mkdir()
        (self.source / 'assets/binary.bin').write_bytes(b'\x00\xffpayload')
        self.dest = self.base / 'output'
    def port(self, dry=True):
        with contextlib.redirect_stdout(io.StringIO()):
            return porter.port(self.source, self.dest, dry)
    def test_preview_writes_nothing(self):
        self.port()
        self.assertFalse(self.dest.exists())
        self.assertEqual((self.source / 'SKILL.md').read_bytes(), self.original)
    def test_copy_preserves_support_and_metadata(self):
        self.port(False)
        root = self.dest / 'sample-skill'
        self.assertEqual((root / 'assets/binary.bin').read_bytes(), b'\x00\xffpayload')
        s = (root / 'SKILL.md').read_text()
        self.assertIn('description: "View: metadata"', s)
        self.assertIn('`view_file` then `run_command`. View prose. CLAUDE.md.', s)
    def test_existing_destination_untouched(self):
        target = self.dest / 'sample-skill'
        target.mkdir(parents=True)
        (target / 'keep').write_text('unmanaged')
        with self.assertRaisesRegex(ValueError, 'already exists'): self.port(False)
        self.assertEqual((target / 'keep').read_text(), 'unmanaged')
    def test_source_link_rejected(self):
        (self.source / 'link').symlink_to(self.base)
        with self.assertRaisesRegex(ValueError, 'links'): self.port(False)
        self.assertFalse(self.dest.exists())
    def test_destination_link_rejected(self):
        self.dest.symlink_to(self.base, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'links'): self.port(False)
    @unittest.skipUnless(hasattr(os, 'mkfifo'), 'POSIX')
    def test_fifo_rejected(self):
        os.mkfifo(self.source / 'pipe')
        with self.assertRaisesRegex(ValueError, 'Non-regular'): self.port()
    def test_remote_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Remote fetch'):
            porter.port('https://github.com/example/repo', self.dest, False)
        self.assertFalse(self.dest.exists())
    def test_overlap_rejected(self):
        with self.assertRaisesRegex(ValueError, 'overlap'):
            porter.port(self.source, self.source / 'out', False)
    def test_validate_all_bundles_before_writing(self):
        repo = self.base / 'repo'
        container = repo / 'skills'
        container.mkdir(parents=True)
        self.source.rename(container / 'sample-skill')
        bad = container / 'bad-skill'
        bad.mkdir()
        (bad / 'SKILL.md').write_text('bad')
        with self.assertRaisesRegex(ValueError, 'frontmatter'):
            porter.port(repo, self.dest, False)
        self.assertFalse(self.dest.exists())
    def test_budget_rejects_before_writing(self):
        old = porter.MAX_BYTES
        porter.MAX_BYTES = 4
        try:
            with self.assertRaisesRegex(ValueError, 'budget'): self.port(False)
        finally: porter.MAX_BYTES = old
        self.assertFalse(self.dest.exists())
    def test_file_source_keeps_support(self):
        with contextlib.redirect_stdout(io.StringIO()):
            porter.port(self.source / 'SKILL.md', self.dest, False)
        self.assertEqual((self.dest / 'sample-skill/assets/binary.bin').read_bytes(), b'\x00\xffpayload')
if __name__ == '__main__': unittest.main()
