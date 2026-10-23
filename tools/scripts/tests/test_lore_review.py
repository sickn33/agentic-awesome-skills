"""Inert memory and throwaway local Git regressions; no user-memory updates."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[3] / 'skills/lore/scripts'
class LoreReviewTests(unittest.TestCase):
    def run_script(self, name, args, cwd):
        return subprocess.run([sys.executable,str(SCRIPTS/name),*args],cwd=cwd,text=True,capture_output=True,timeout=20)
    def memory(self, root, text):
        p=root/'.lore/_global'; p.mkdir(parents=True); (p/'ARCHITECTURE.md').write_text(text)

    def test_hash_collision_is_not_reported_as_identical_text(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'- [ARCH-2026-01-01-abcd] First distinct claim\n- [ARCH-2026-01-02-abcd] Completely unrelated body\n')
            r=self.run_script('find_duplicates.py',['--json'],p);self.assertEqual(r.returncode,0,r.stderr)
            pair=json.loads(r.stdout)[0]
            self.assertIn('collision',pair['reason']); self.assertLess(pair['similarity'],1)

    def test_duplicate_full_ids_are_ambiguous_not_silently_selected(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'- [ARCH-2026-01-01-abcd] One\n- [ARCH-2026-01-01-abcd] Two\n')
            r=self.run_script('list_entries.py',['--json'],p);self.assertNotEqual(r.returncode,0)

    def test_symlinked_source_does_not_leak_or_look_empty(self):
        if not hasattr(os,'symlink'):self.skipTest('no symlink support')
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'');f=p/'.lore/_global/ARCHITECTURE.md';f.unlink();target=p/'outside';target.write_text('secret-marker')
            try:os.symlink(target,f)
            except OSError:self.skipTest('symlinks unavailable')
            r=self.run_script('list_entries.py',['--json'],p)
            self.assertNotEqual(r.returncode,0);self.assertNotIn('secret-marker',r.stdout+r.stderr)

    def test_discovery_stops_at_git_boundary(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'');child=p/'child';child.mkdir();(child/'.git').mkdir()
            r=self.run_script('list_entries.py',['--json'],child);self.assertNotEqual(r.returncode,0)

    def test_real_git_history_scope_and_path_guards(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'');(p/'file.txt').write_text('synthetic')
            commands=[['init','-q'],['add','file.txt'],['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null','commit','-qm','fixture history']]
            for command in commands:
                r=subprocess.run(['git',*command],cwd=p,capture_output=True,text=True,timeout=10)
                self.assertEqual(r.returncode,0,r.stderr)
            r=self.run_script('history.py',['./file.txt','--json'],p);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(len(json.loads(r.stdout)['commits']),1)
            r=self.run_script('history.py',['--scope=../../outside','--json'],p);self.assertNotEqual(r.returncode,0)
            r=self.run_script('history.py',['../file.txt','--json'],p);self.assertNotEqual(r.returncode,0)

    def test_freshness_reports_unknown_dates_and_rejects_negative_threshold(self):
        with tempfile.TemporaryDirectory() as td:
            p=Path(td);self.memory(p,'- [ARCH-2026-01-01-abcd] Undated claim\n')
            r=self.run_script('find_stale.py',['--json'],p);self.assertEqual(r.returncode,0,r.stderr);self.assertEqual(len(json.loads(r.stdout)['undated_or_invalid']),1)
            r=self.run_script('find_stale.py',['--days=-1'],p);self.assertNotEqual(r.returncode,0)

if __name__=='__main__':unittest.main()
