#!/usr/bin/env python3
"""Bounded annotation inventory, not type coverage or a type-safety verdict."""
import ast
import json
import os
from pathlib import Path
import re
import sys

MAX_FILES = 30
MAX_BYTES = 1_000_000
SKIP = {'.git', 'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build'}


def source_files(root, suffixes):
    """Yield a deterministic sample without following directory or file links."""
    for directory, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(name for name in dirs if name not in SKIP and not (Path(directory) / name).is_symlink())
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix in suffixes and not path.name.endswith('.d.ts') and not path.is_symlink():
                yield path


def inventory(project_path, language):
    result = {'type': language, 'files': 0, 'sample_limit': MAX_FILES, 'truncated': False, 'errors': [], 'stats': {}}
    stats = result['stats']
    stats.update({'functions': 0, 'fully_annotated_functions': 0} if language == 'python' else {'explicit_any_text_matches': 0})
    for index, path in enumerate(source_files(project_path, {'.py'} if language == 'python' else {'.ts', '.tsx'})):
        if index == MAX_FILES:
            result['truncated'] = True
            break
        try:
            with path.open('rb') as handle:
                raw = handle.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise ValueError('source exceeds byte limit')
            text = raw.decode('utf-8')
            if language == 'python':
                tree = ast.parse(text)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        stats['functions'] += 1
                        args = node.args.posonlyargs + node.args.args + node.args.kwonlyargs
                        args += [arg for arg in (node.args.vararg, node.args.kwarg) if arg]
                        annotated = node.returns is not None and all(arg.annotation is not None for arg in args)
                        stats['fully_annotated_functions'] += int(annotated)
            else:
                # This includes comments/string literals and misses inferred/aliased any.
                stats['explicit_any_text_matches'] += len(re.findall(r':\s*any\b', text))
            result['files'] += 1
        except (OSError, UnicodeError, ValueError, SyntaxError) as error:
            result['errors'].append({'file': str(path.relative_to(project_path)), 'error': str(error)})
    return result


def check_python_coverage(project_path):
    return inventory(project_path, 'python')


def check_typescript_coverage(project_path):
    return inventory(project_path, 'typescript')


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').resolve()
    if not root.is_dir():
        print('Project directory does not exist.', file=sys.stderr)
        return 2
    results = [inventory(root, language) for language in ('python', 'typescript')]
    print(json.dumps({'kind': 'annotation-inventory', 'limitation': 'Not type coverage. Annotations do not establish correctness; TypeScript counts are lexical. Run the configured type checker.', 'results': results}, indent=2))
    if any(result['errors'] for result in results):
        return 1
    return 0 if any(result['files'] for result in results) else 2


if __name__ == '__main__':
    sys.exit(main())
