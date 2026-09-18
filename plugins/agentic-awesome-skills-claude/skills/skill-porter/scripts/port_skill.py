#!/usr/bin/env python3
"""Preview or copy local skill bundles with conservative tool-name translation.

No network access, code execution, global installation, or overwriting. Python 3.9+.
Use only on a quiescent local tree owned by the current user.
"""
import argparse
import difflib
import os
import re
import stat
import sys
from pathlib import Path

MAX_FILES = 1000
MAX_BYTES = 20 * 1024 * 1024
TOOL_NAMES = {
    'View': 'view_file', 'Edit': 'replace_file_content',
    'StrReplace': 'replace_file_content', 'Write': 'write_to_file',
    'Bash': 'run_command', 'Grep': 'grep_search', 'Find': 'find_by_name',
    'LS': 'list_dir', 'WebSearch': 'search_web', 'Fetch': 'read_url_content',
}


def reject_links(path):
    """Check existing path components without accepting links or special nodes."""
    path = Path(os.path.abspath(os.path.expanduser(str(path))))
    for part in [*reversed(path.parents), path]:
        try:
            mode = part.lstat().st_mode
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(mode):
            raise ValueError('Symbolic links are not supported: ' + str(part))
        if not (stat.S_ISDIR(mode) or stat.S_ISREG(mode)):
            raise ValueError('Non-regular path: ' + str(part))
    return path


def read_regular(path, budget):
    reject_links(path)
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0)
    fd = os.open(path, flags)
    with os.fdopen(fd, 'rb') as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > budget:
            raise ValueError('Unsupported file or size budget exceeded: ' + str(path))
        data = handle.read(budget + 1)
        if len(data) > budget:
            raise ValueError('Size budget exceeded: ' + str(path))
        return data


def translate(data):
    """Keep frontmatter intact; replace only exact backtick-quoted tool names."""
    text = data.decode('utf-8')
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != '---':
        raise ValueError('SKILL.md requires YAML frontmatter')
    end = next((i for i in range(1, len(lines)) if lines[i].strip() == '---'), None)
    if end is None:
        raise ValueError('Unclosed YAML frontmatter')
    header, body = ''.join(lines[:end + 1]), ''.join(lines[end + 1:])
    body = re.sub(r'`(' + '|'.join(TOOL_NAMES) + r')`',
                  lambda m: '`' + TOOL_NAMES[m.group(1)] + '`', body)
    return (header + body).encode('utf-8')


def snapshot(source):
    source = reject_links(source)
    if source.is_file():
        if source.name != 'SKILL.md':
            raise ValueError('File source must be SKILL.md')
        source = source.parent
    if not source.is_dir():
        raise ValueError('Source must be a local skill directory or repository')
    if (source / 'SKILL.md').exists():
        roots = [source]
    else:
        container = reject_links(source / 'skills')
        if not container.is_dir():
            raise ValueError('Expected SKILL.md or skills/<id>/SKILL.md')
        roots = []
        for child in sorted(container.iterdir()):
            reject_links(child)
            if child.is_dir() and (child / 'SKILL.md').exists():
                roots.append(child)
    if not roots:
        raise ValueError('No skill bundles found')
    bundles, remaining, count = {}, MAX_BYTES, 0
    for root in roots:
        name = root.name
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', name):
            raise ValueError('Skill directory must be a lowercase hyphenated ID')
        files = {}
        for current, dirs, names in os.walk(root, followlinks=False):
            dirs.sort()
            for entry in [*dirs, *sorted(names)]:
                reject_links(Path(current) / entry)
            for entry in sorted(names):
                path = Path(current) / entry
                count += 1
                if count > MAX_FILES:
                    raise ValueError('File count budget exceeded')
                data = read_regular(path, remaining)
                remaining -= len(data)
                files[path.relative_to(root)] = data
        original = files[Path('SKILL.md')]
        files[Path('SKILL.md')] = translate(original)
        bundles[name] = (original, files)
    return source, bundles


def port(source, destination=None, dry_run=True):
    if '://' in str(source):
        raise ValueError('Remote fetch is unsupported; obtain and inspect a pinned local checkout first')
    source, bundles = snapshot(source)
    target = reject_links(destination) if destination else None
    if not dry_run and target is None:
        raise ValueError('Select --dest or --workspace before writing')
    if target is not None:
        if target == source or source in target.parents or target in source.parents:
            raise ValueError('Source and destination trees must not overlap')
        for name in bundles:
            path = target / name
            reject_links(path)
            if path.exists():
                raise ValueError('Destination already exists; choose a fresh output directory: ' + str(path))
    for name, (original, files) in bundles.items():
        print('Skill: ' + name + ' (' + str(len(files)) + ' files)')
        for line in difflib.unified_diff(original.decode('utf-8').splitlines(True),
                                        files[Path('SKILL.md')].decode('utf-8').splitlines(True),
                                        fromfile=name + '/original', tofile=name + '/preview'):
            sys.stdout.write(line)
    if dry_run:
        print('Preview only. No files written; support bytes are preserved.')
        return bundles
    target.mkdir(parents=True, exist_ok=True)
    for name, (_, files) in bundles.items():
        root = target / name
        root.mkdir()  # exclusive: never replace an existing skill
        for rel, data in files.items():
            path = root / rel
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open('xb') as handle:
                handle.write(data)
    print('Copied to ' + str(target) + '; inspect before activating in your client.')
    return bundles


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?')
    parser.add_argument('--source', dest='source_option')
    destinations = parser.add_mutually_exclusive_group()
    destinations.add_argument('--dest')
    destinations.add_argument('--workspace', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)
    source = args.source_option or args.source
    if not source or (args.source_option and args.source):
        parser.error('Supply exactly one source')
    destination = Path.cwd() / '.agents' / 'skills' if args.workspace else args.dest
    try:
        port(source, destination, dry_run=args.dry_run or destination is None)
    except (ValueError, OSError, UnicodeError) as error:
        print('skill-porter: ' + str(error), file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
