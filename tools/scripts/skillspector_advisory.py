#!/usr/bin/env python3
"""Bounded, non-executable Git snapshots for advisory static SkillSpector scans."""
import argparse
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
import time

from git_change_records import list_tree, read_blob, read_change_records, validate_repo_path

MAX_FILES = 1000
MAX_BYTES = 16 * 1024 * 1024
MAX_SKILLS = 50


def changed_roots(records):
    roots = set()
    for record in records:
        paths = [record.new_path]
        if record.status != 'C':
            paths.append(record.old_path)
        for path in paths:
            if not path:
                continue
            parts = PurePosixPath(path).parts
            if len(parts) >= 3 and parts[0] == 'skills' and not validate_repo_path(path):
                roots.add('/'.join(parts[:2]))
    return sorted(roots)


def snapshot(repo, head, root, destination):
    entries = list_tree(repo, head, root)
    if len(entries) > MAX_FILES:
        raise ValueError('skill exceeds snapshot file limit')
    total = 0
    modes = []
    for entry in entries:
        if validate_repo_path(entry.path) or entry.object_type != 'blob' or entry.mode not in ('100644', '100755'):
            raise ValueError(f'unsupported tree entry: {entry.path} ({entry.mode})')
        size = int(subprocess.check_output(['git', '-C', str(repo), 'cat-file', '-s', entry.oid]))
        total += size
        if total > MAX_BYTES:
            raise ValueError('skill exceeds snapshot byte limit')
        relative = PurePosixPath(entry.path).relative_to(root)
        target = destination.joinpath(*relative.parts)
        target.parent.mkdir(parents=True, exist_ok=True)
        # Executable Git blobs are copied as inert 0600 data, never invoked.
        with target.open('xb') as handle:
            handle.write(read_blob(repo, entry.oid))
        target.chmod(0o600)
        if entry.mode == '100755':
            modes.append(entry.path)
    return modes


def run(repo, base, head, output, scanner=None):
    base_oid, head_oid, records = read_change_records(repo, base, head)
    roots = changed_roots(records)
    report = {'schema_version': 1, 'base_sha': base_oid, 'head_sha': head_oid,
              'mode': 'static-advisory', 'baseline': None, 'skills': [], 'errors': []}
    output.mkdir(parents=True, exist_ok=True)
    if len(roots) > MAX_SKILLS:
        report['errors'].append('changed skill count exceeds 50; scan incomplete')
    else:
        with tempfile.TemporaryDirectory(prefix='aas-skillspector-') as temporary:
            started = time.monotonic()
            for index, root in enumerate(roots):
                item = {'root': root}
                report['skills'].append(item)
                destination = Path(temporary) / str(index)
                try:
                    if time.monotonic() - started > 600:
                        raise ValueError('aggregate scan time budget exceeded')
                    item['executable_git_blobs'] = snapshot(repo, head_oid, root, destination)
                    if not (destination / 'SKILL.md').is_file():
                        item['state'] = 'deleted-or-no-skill'
                        continue
                    if scanner is None:
                        item['state'] = 'dry-run'
                        continue
                    result_path = output / f'{index}.json'
                    env = {'PATH': os.defpath, 'LANG': 'C.UTF-8', 'LANGSMITH_TRACING': 'false',
                           'LANGCHAIN_TRACING_V2': 'false', 'SKILLSPECTOR_OSV_TIMEOUT': '1'}
                    result = subprocess.run([scanner, 'scan', str(destination), '--no-llm',
                                             '--format', 'json', '--output', str(result_path)],
                                            cwd=temporary, env=env, timeout=60,
                                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    item['exit_code'] = result.returncode
                    if not result_path.is_file():
                        raise ValueError('scanner produced no JSON report')
                    if result_path.stat().st_size > 8 * 1024 * 1024:
                        result_path.unlink()
                        raise ValueError('scanner report exceeds 8 MiB')
                    payload = json.loads(result_path.read_text())
                    if not isinstance(payload, dict) or not isinstance(payload.get('analysis_completeness'), dict) or not isinstance(payload.get('issues'), list):
                        raise ValueError('scanner report has an invalid schema')
                    item['report'] = result_path.name
                    completeness = payload.get('analysis_completeness', {})
                    item['analysis_complete'] = completeness.get('is_complete', False)
                    item['execution_successful'] = payload.get('execution_successful', False)
                    item['finding_count'] = len(payload.get('issues', []))
                    item['state'] = ('reported' if item['analysis_complete'] else 'partial') if result.returncode == 0 and item['execution_successful'] else 'scanner-nonzero'
                except (ValueError, OSError, subprocess.SubprocessError) as error:
                    item['state'] = 'incomplete'
                    item['error'] = str(error)
                (output / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    (output / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as handle:
            handle.write(f'### SkillSpector advisory\n\nHead: `{head_oid}`. {len(roots)} changed skill directories. '
                         'Static scan; no automatic suppressions. Findings do not authorize merge.\n\n')
            for item in report['skills']:
                handle.write(f'- `{item["root"]}`: {item["state"]}\n')
            for error in report['errors']:
                handle.write(f'- Incomplete: {error}\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path.cwd())
    parser.add_argument('--base', required=True)
    parser.add_argument('--head', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--scanner', help='Absolute installed SkillSpector CLI; omitted for dry run')
    args = parser.parse_args()
    run(args.repo.resolve(), args.base, args.head, args.output.resolve(), args.scanner)
