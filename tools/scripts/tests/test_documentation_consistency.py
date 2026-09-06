"""Repository guides, not the independently authored skill corpus or generated mirrors."""
import collections
import json
from pathlib import Path
import re
import unittest
import unicodedata
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[3]
# Immutable release history and a relocated backup retain links to their old tree.
HISTORICAL_LINKS = {'CHANGELOG.md', 'docs/maintainers/backups/README-2026-06-02.md'}
SCRIPT_EXCEPTIONS = {
    'CHANGELOG.md': {'verify:seo'},
    'docs/maintainers/full-repo-audit-2026-05-23.md': {'verify:seo', 'lint'},
    'walkthrough.md': {'typecheck'},
    'docs/contributors/skill-anatomy.md': {'migrate', 'seed'},
    'docs_zh-CN/contributors/skill-anatomy.md': {'migrate', 'seed'},
    'docs/vietnamese/SKILL_ANATOMY.vi.md': {'migrate', 'seed'},
}


def documents():
    files = list(ROOT.glob('*.md'))
    for directory in ('docs', 'docs_zh-CN', '.github', 'skill_categorization', 'tools'):
        files.extend((ROOT / directory).rglob('*.md'))
    files.extend([ROOT / 'apps/web-app/README.md', ROOT / 'supabase/README.md', ROOT / 'tools/README.md'])
    return sorted(set(p for p in files if p.is_file()))


def prose(text):
    return re.sub(r'^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$', '', text, flags=re.M)


def anchors(text):
    text = prose(text)
    result = set(re.findall(r'<(?:a|h\d)\s[^>]*(?:id|name)=["\']([^"\']+)', text))
    seen = collections.Counter()
    for heading in re.findall(r'^#{1,6}\s+(.+)', text, re.M):
        heading = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', heading)
        heading = re.sub('<[^>]+>', '', heading).strip().lower()
        slug = ''.join(c for c in heading if c in '-_ ' or unicodedata.category(c)[0] in 'LN').replace(' ', '-')
        count = seen[slug]
        seen[slug] += 1
        result.add(slug + (f'-{count}' if count else ''))
    return result


def broken_links(path):
    failures = []
    for match in re.finditer(r'\]\(([^\s)]+)(?:\s+"[^"]*")?\)', prose(path.read_text())):
        target = match[1].strip('<>')
        parsed = urlsplit(target)
        if parsed.scheme or target.startswith('/'):
            continue
        dest = path.parent / unquote(parsed.path) if parsed.path else path
        if not dest.exists():
            failures.append(target)
        elif parsed.fragment and dest.is_file() and dest.suffix == '.md':
            if unquote(parsed.fragment) not in anchors(dest.read_text()):
                failures.append(target)
    return failures


class DocumentationConsistency(unittest.TestCase):
    def test_link_parser_rejects_missing_files_and_anchors(self):
        import tempfile
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'guide.md'
            path.write_text('# Hello\n[good](#hello) [bad](missing.md) [bad anchor](#absent)\n```md\n[example](not-a-repo-file.md)\n```\n')
            self.assertEqual(broken_links(path), ['missing.md', '#absent'])
        self.assertEqual(anchors('# Hello\n# Hello\n# 安装\n<a id="stable"></a>'), {'hello', 'hello-1', '安装', 'stable'})

    def test_active_repository_links(self):
        failures = []
        for path in documents():
            relative = path.relative_to(ROOT).as_posix()
            if relative in HISTORICAL_LINKS:
                continue
            failures.extend(f'{relative}: {target}' for target in broken_links(path))
        self.assertEqual(failures, [])

    def test_documented_npm_commands_exist(self):
        root_scripts = set(json.loads((ROOT / 'package.json').read_text())['scripts'])
        failures = []
        for path in documents():
            relative = path.relative_to(ROOT).as_posix()
            if '/backups/' in relative:
                continue
            scripts = root_scripts
            if relative == 'apps/web-app/README.md':
                scripts = scripts | set(json.loads((ROOT / 'apps/web-app/package.json').read_text())['scripts'])
            commands = set(re.findall(r'npm run ([\w:-]+)', path.read_text()))
            missing = commands - scripts - SCRIPT_EXCEPTIONS.get(relative, set())
            failures.extend(f'{relative}: {command}' for command in sorted(missing))
        self.assertEqual(failures, [])

    def test_operational_contracts(self):
        agents = (ROOT / 'AGENTS.md').read_text()
        self.assertNotIn('the latter means Tessl did not run', agents)
        for relative in ('docs/maintainers/ci-drift-fix.md', 'docs_zh-CN/maintainers/ci-drift-fix.md'):
            text = (ROOT / relative).read_text()
            self.assertIn('automation/canonical-repo-state', text)
            self.assertNotIn('git add $(node tools/scripts/generated_files.js', text)
        for relative in ('docs/maintainers/merging-prs.md', 'docs_zh-CN/maintainers/merging-prs.md'):
            self.assertIn('npm run merge:batch', (ROOT / relative).read_text())
        maintenance = (ROOT / '.github/MAINTENANCE.md').read_text()
        self.assertIn('tools/config/validation-budget.json', maintenance)
        self.assertNotIn('legacy `135`', maintenance)


if __name__ == '__main__':
    unittest.main()
