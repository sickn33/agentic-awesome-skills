import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import skillspector_advisory as advisory
from git_change_records import ChangeRecord


class AdvisoryTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name) / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.email', 'test@example.com')
        self.git('config', 'user.name', 'Test')
        self.write('skills/example/SKILL.md', '# Example\n')
        self.git('add', '.')
        self.git('commit', '-qm', 'base')
        self.base = self.git('rev-parse', 'HEAD').strip()

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], text=True)

    def write(self, name, content):
        target = self.repo / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        return target

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'change')
        return self.git('rev-parse', 'HEAD').strip()

    def test_complete_tree_and_executable_is_inert(self):
        script = self.write('skills/example/nested/tool.py', 'raise RuntimeError("must never execute")')
        script.chmod(0o755)
        head = self.commit()
        destination = Path(self.temp.name) / 'snapshot'
        modes = advisory.snapshot(self.repo, head, 'skills/example', destination)
        self.assertEqual(modes, ['skills/example/nested/tool.py'])
        self.assertEqual((destination / 'nested/tool.py').stat().st_mode & 0o777, 0o600)
        report = advisory.run(self.repo, self.base, head, Path(self.temp.name) / 'reports')
        self.assertEqual(report['head_sha'], head)
        self.assertEqual(report['skills'][0]['state'], 'dry-run')

    def test_symlink_rejected_without_following(self):
        (self.repo / 'skills/example/link').symlink_to('/etc/passwd')
        report = advisory.run(self.repo, self.base, self.commit(), Path(self.temp.name) / 'reports')
        self.assertEqual(report['skills'][0]['state'], 'incomplete')

    def test_oversized_blob_rejected_before_read(self):
        self.write('skills/example/large.txt', 'x' * 100)
        head = self.commit()
        with patch.object(advisory, 'MAX_BYTES', 20):
            with self.assertRaisesRegex(ValueError, 'byte limit'):
                advisory.snapshot(self.repo, head, 'skills/example', Path(self.temp.name) / 'snapshot')

    def test_copy_destination_and_rename_both_roots(self):
        record = ChangeRecord('C', 'skills/old/SKILL.md', 'skills/new/SKILL.md', '100644', '100644', 'a', 'b', 100)
        self.assertEqual(advisory.changed_roots([record]), ['skills/new'])
        renamed = ChangeRecord('R', record.old_path, record.new_path, '100644', '100644', 'a', 'b', 100)
        self.assertEqual(advisory.changed_roots([renamed]), ['skills/new', 'skills/old'])

    def test_scanner_timeout_reported_and_environment_sanitized(self):
        self.write('skills/example/SKILL.md', '# Changed\n')
        head = self.commit()
        original_run = subprocess.run
        def failure(*args, **kwargs):
            if args[0][0] != "/scanner":
                return original_run(*args, **kwargs)
            self.assertNotIn('GITHUB_TOKEN', kwargs['env'])
            self.assertNotIn('--use-shipped-baseline', args[0])
            self.assertIn('--no-llm', args[0])
            raise subprocess.TimeoutExpired(args[0], 60)
        with patch.object(advisory.subprocess, 'run', side_effect=failure):
            report = advisory.run(self.repo, self.base, head, Path(self.temp.name) / 'reports', '/scanner')
        self.assertEqual(report['skills'][0]['state'], 'incomplete')

    def test_partial_zero_exit_is_not_reported_as_complete(self):
        self.write('skills/example/SKILL.md', '# Changed\n')
        head = self.commit()
        original_run = subprocess.run
        def partial(*args, **kwargs):
            if args[0][0] != '/scanner':
                return original_run(*args, **kwargs)
            Path(args[0][-1]).write_text('{"execution_successful":true,"analysis_completeness":{"is_complete":false},"issues":[]}')
            return subprocess.CompletedProcess(args[0], 0)
        with patch.object(advisory.subprocess, 'run', side_effect=partial):
            report = advisory.run(self.repo, self.base, head, Path(self.temp.name) / 'reports', '/scanner')
        self.assertEqual(report['skills'][0]['state'], 'partial')

    def test_malformed_scanner_report_is_incomplete(self):
        self.write('skills/example/SKILL.md', '# Changed\n')
        head = self.commit()
        original_run = subprocess.run
        def malformed(*args, **kwargs):
            if args[0][0] != '/scanner':
                return original_run(*args, **kwargs)
            Path(args[0][-1]).write_text('[]')
            return subprocess.CompletedProcess(args[0], 0)
        with patch.object(advisory.subprocess, 'run', side_effect=malformed):
            report = advisory.run(self.repo, self.base, head, Path(self.temp.name) / 'reports', '/scanner')
        self.assertEqual(report['skills'][0]['state'], 'incomplete')

    def test_workflow_uses_trusted_base_and_network_isolation(self):
        root = Path(__file__).resolve().parents[3]
        workflow = (root / '.github/workflows/skillspector-advisory.yml').read_text()
        job = workflow.split('  skillspector-advisory:\n')[1]
        for contract in ['needs: evidence-ready', 'continue-on-error: true',
                         'github.event.pull_request.base.sha', 'unshare --net',
                         'uv sync --frozen --no-dev', 'persist-credentials: false',
                         'c7958a3268d9498644b22edb75d0f051bbc8cbfc']:
            self.assertIn(contract, job)
        self.assertNotIn('secrets.', job)
        self.assertNotIn('workflow_dispatch', workflow)
        self.assertNotIn('pull_request_target', workflow)
        self.assertIn('.app.id == 15368', workflow)
        self.assertIn('commits/$PR_HEAD/check-runs', workflow)
        self.assertIn('env.PR_NUMBER | tonumber', workflow)
        self.assertNotIn('requires_references', job)
        self.assertIn("steps.plan.outputs.count != '0'", job)


if __name__ == '__main__':
    unittest.main()
