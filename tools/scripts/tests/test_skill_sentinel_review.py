"""Offline subprocess fixtures: never scan or execute repository skill content."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = Path(__file__).resolve().parents[3] / 'skills/skill-sentinel/scripts'
class SentinelReviewTests(unittest.TestCase):
    def run_fixture(self, code):
        with tempfile.TemporaryDirectory() as td:
            env = dict(os.environ, PYTHONPATH=str(SCRIPTS), SKILL_SENTINEL_STATE_DIR=str(Path(td) / 'private-state'))
            result = subprocess.run([sys.executable, '-c', code], cwd=td, env=env, capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 0, result.stderr)
            return result.stdout

    def test_imports_have_no_filesystem_effect_and_fractional_labels(self):
        self.run_fixture('''from pathlib import Path
import config, scanner, run_audit
assert not config.DATA_DIR.exists()
assert config.get_score_label(89.9) == "Bom"
assert config.get_score_label(float('nan')) == "Desconhecido"
''')

    def test_custom_root_nested_skills_and_inert_source(self):
        self.run_fixture('''from pathlib import Path
from scanner import SkillScanner, _parse_yaml_frontmatter
root=Path('selected'); (root/'outer'/'nested').mkdir(parents=True)
for rel in ['outer', 'outer/nested']:
 p=root/rel; (p/'SKILL.md').write_text('---\\nname: '+p.name+'\\ndescription: >-\\n  folded\\n  metadata\\n---\\n# Test')
(root/'outer'/'scripts').mkdir()
(root/'outer'/'scripts'/'inert.py').write_text('raise RuntimeError("must never run")')
skills=SkillScanner(root).discover_all()
assert {s['name'] for s in skills} == {'outer','nested'}
assert skills[0]['description'] == 'folded metadata'
assert _parse_yaml_frontmatter('---\\nname: a\\n---\\n')['name']=='a'
try: _parse_yaml_frontmatter('---\\nname: a\\nname: b\\n---\\n')
except ValueError: pass
else: raise AssertionError('duplicate accepted')
''')

    def test_database_closes_connections_preserves_input_and_rejects_links(self):
        self.run_fixture('''from pathlib import Path
from db import Database
import sqlite3, os
p=Path('state'); p.mkdir(mode=0o700); db=Database(p/'audit.db'); db.init(); run=db.create_audit_run()
record={'skill_name':'synthetic','skill_path':'selected','raw_metrics':{'documentation':1}}
db.insert_skill_snapshot(run,record)
assert 'audit_run_id' not in record and isinstance(record['raw_metrics'],dict)
with db._connect() as conn: conn.execute('SELECT 1')
try: conn.execute('SELECT 1')
except sqlite3.ProgrammingError: pass
else: raise AssertionError('connection leaked')
if hasattr(os,'symlink'):
 os.symlink('audit.db',p/'link.db')
 try: Database(p/'link.db').init()
 except OSError: pass
 else: raise AssertionError('symlink followed')
''')

    def test_report_new_only_and_markup_inert(self):
        self.run_fixture('''from pathlib import Path
from report_generator import generate_report,save_report
name='<script>alert(1)</script> [link](javascript:bad) | column'
report=generate_report([{'skill_name':name,'overall_score':1}],[],[],1)
assert '<script>' not in report and '[link](javascript:' not in report
one=save_report(report,'one.md')
try: save_report('overwrite','one.md')
except FileExistsError: pass
else: raise AssertionError('overwritten')
try: save_report('escape','../escape.md')
except ValueError: pass
else: raise AssertionError('escaped')
assert Path(one).stat().st_mode & 0o777 == 0o600
''')

    def test_real_audit_document_only_reports_na_and_preserves_source(self):
        self.run_fixture('''from pathlib import Path
from run_audit import run_audit
root=Path('selected'); p=root/'synthetic'; p.mkdir(parents=True)
text='---\\nname: synthetic\\ndescription: A synthetic documentation only skill used for an offline fixture with clear scope.\\n---\\n# Example\\n'*1
(p/'SKILL.md').write_text(text)
result=run_audit(skills_root=root,include_recommendations=False)
assert result['skills_scanned']==1 and result['advisory_only']
assert result['snapshots'][0]['security'] is None
assert (p/'SKILL.md').read_text()==text
assert Path(result['report_path']).is_file()
''')
if __name__=='__main__': unittest.main()
