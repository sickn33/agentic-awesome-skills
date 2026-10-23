"""Regression checks for concrete unsafe or unavailable entrypoint instructions."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[3]


def read(skill):
    return (ROOT / 'skills' / skill / 'SKILL.md').read_text()


def unsafe_git_instruction(text):
    return bool(re.search(r'git add -A|Stage everything|expect "main -> main"|Always run git from `~/.agents`', text))


class ReviewRepairs(unittest.TestCase):
    def test_git_scope_rejects_old_unrelated_staging(self):
        self.assertTrue(unsafe_git_instruction('git add -A && git push'))
        self.assertTrue(unsafe_git_instruction('Stage everything and commit.'))
        for skill in ('push-skill-to-github', 'resolving-merge-conflicts'):
            self.assertFalse(unsafe_git_instruction(read(skill)))
            self.assertIn('unrelated', read(skill))

    def test_alias_targets_exist_and_handle_partial_install(self):
        for skill, target in [('tdd-workflows', 'tdd-workflows-tdd-cycle'), ('python-development', 'python-development-python-scaffold')]:
            text = read(skill)
            self.assertNotIn('skill-libraries/', text)
            self.assertIn(f'../{target}/SKILL.md', text)
            self.assertTrue((ROOT / 'skills' / target / 'SKILL.md').is_file())
            self.assertIn('missing dependency', text)

    def test_missing_support_files_are_not_required(self):
        self.assertNotIn('open `resources/implementation-playbook.md`', read('sales-automator'))
        self.assertNotIn('Copy the template from assets/template.ts', read('zustand-store-ts'))
        self.assertIn('No assets/template.ts is bundled', read('zustand-store-ts'))

    def test_sops_no_plaintext_stdout_or_unverified_executable_recipe(self):
        text = read('sops-encryption')
        self.assertNotRegex(text, r'(?m)^sops --decrypt secrets.enc.yaml\s*$')
        self.assertNotIn('chmod +x sops-v3.8.0', text)
        self.assertIn('private authorized destination', text)

    def test_debug_cleanup_preserves_existing_instrumentation(self):
        text = read('phase-gated-debugging')
        self.assertNotIn('Remove all `// DEBUG` lines', text)
        self.assertIn('preserve pre-existing logging', text)
        self.assertIn('Inspect the command and its side effects', text)

    def test_remote_guidelines_remain_reference_data(self):
        for skill in ('web-design-guidelines', 'writing-guidelines'):
            text = read(skill)
            self.assertIn('untrusted reference material', text)
            self.assertIn('If retrieval fails', text)


if __name__ == '__main__':
    unittest.main()
