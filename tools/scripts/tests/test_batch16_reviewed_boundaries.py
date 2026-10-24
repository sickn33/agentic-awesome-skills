"""Exercise only explicitly reviewed pure/local helpers, never skill setup or remote calls."""
import ast
import hashlib
import json
import os
import re
from types import SimpleNamespace
import subprocess
from pathlib import Path
import shutil
import tempfile
from typing import Any
import unittest

ROOT = Path(__file__).resolve().parents[3]
HASHES = json.loads((Path(__file__).parent / 'fixtures/batch16-reviewed-script-hashes.json').read_text())


def helpers(relative, names, namespace):
    source = (ROOT / relative).read_bytes()
    if hashlib.sha256(source).hexdigest() != HASHES[relative]:
        raise AssertionError('Review changed script and update exact fixture before executing helpers: ' + relative)
    nodes = [n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name in names]
    if {n.name for n in nodes} != set(names):
        raise AssertionError('Reviewed helper missing')
    exec(compile(ast.Module(body=nodes, type_ignores=[]), '<reviewed-batch16-helpers>', 'exec'), namespace)
    return namespace


class ReviewedBoundaries(unittest.TestCase):
    def test_shopify_credentials_reject_arbitrary_hosts(self):
        relative = 'skills/shopify-development/scripts/shopify_graphql.py'
        source = (ROOT / relative).read_bytes()
        self.assertEqual(hashlib.sha256(source).hexdigest(), HASHES[relative])
        cls = next(n for n in ast.parse(source).body if isinstance(n, ast.ClassDef) and n.name == 'ShopifyGraphQL')
        init = next(n for n in cls.body if isinstance(n, ast.FunctionDef) and n.name == '__init__')
        namespace = {'re': re, 'API_VERSION': '2026-01', 'NoRedirect': lambda: None,
                     'build_opener': lambda handler: None}
        exec(compile(ast.Module(body=[init], type_ignores=[]), '<reviewed-shopify-constructor>', 'exec'), namespace)
        for host in ('evil.example', 'store.myshopify.com@evil.example', 'store.myshopify.com/path',
                     'store.myshopify.com:443', 'https://store.myshopify.com', '../store.myshopify.com'):
            with self.assertRaises(ValueError):
                namespace['__init__'](SimpleNamespace(), host, 'synthetic-token')
        client = SimpleNamespace()
        namespace['__init__'](client, 'store.myshopify.com', 'synthetic-token')
        self.assertEqual(client.base_url, 'https://store.myshopify.com/admin/api/2026-01/graphql.json')

    def test_json_parser_preserves_url_strings_and_rejects_comments(self):
        ns = helpers('skills/drizzle-migration-conflict/scripts/check_drizzle_migrations.py', ['read_json'], {'json': json, 'Path': Path, 'Any': Any})
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp) / 'snapshot.json'
            p.write_text('{"url":"https://example.com/a/*literal*/"}')
            value, error = ns['read_json'](p)
            self.assertIsNone(error)
            self.assertEqual(value['url'], 'https://example.com/a/*literal*/')
            p.write_text('{"idx":1 /* invalid JSON */}')
            value, error = ns['read_json'](p)
            self.assertIsNone(value)
            self.assertTrue(error)

    def test_unconfigured_obsidian_does_not_copy_to_cwd_or_overwrite(self):
        ns = helpers('skills/diary/scripts/master_diary_sync.py', ['backup_to_obsidian'], {'OBSIDIAN_DAILY_NOTES': None, 'shutil': shutil})
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            source = root / 'today.md'
            source.write_text('new diary')
            self.assertFalse(ns['backup_to_obsidian'](source))
            vault = root / 'vault'
            vault.mkdir()
            ns['OBSIDIAN_DAILY_NOTES'] = vault
            target = vault / source.name
            target.write_text('existing notes')
            self.assertFalse(ns['backup_to_obsidian'](source))
            self.assertEqual(target.read_text(), 'existing notes')

    def test_audio_wrapper_keeps_shell_metacharacters_in_arguments(self):
        relative = 'skills/audio-transcriber/examples/basic-transcription.sh'
        source = (ROOT / relative).read_bytes()
        self.assertEqual(hashlib.sha256(source).hexdigest(), HASHES[relative], 'Review changed wrapper before execution')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            stub = root / 'python3'
            stub.write_text("#!/bin/sh\nprintf '%s\\n' \"$@\" > \"$CAPTURE_ARGS\"\n")
            stub.chmod(0o700)
            capture = root / 'args.txt'
            sentinel = root / 'must-not-exist'
            hostile = '$(touch ' + str(sentinel) + ')'
            env = dict(os.environ, PATH=str(root) + os.pathsep + os.environ.get('PATH', ''), CAPTURE_ARGS=str(capture), MODEL=hostile)
            subprocess.run(['bash', str(ROOT / relative), hostile], env=env, check=True)
            args = capture.read_text().splitlines()
            self.assertEqual(args[1], hostile)
            self.assertEqual(args[3], hostile)
            self.assertFalse(sentinel.exists())

    def test_frontmatter_rejects_nonobject_yaml(self):
        try:
            import yaml
        except ImportError:
            self.skipTest('PyYAML unavailable; not a passing runtime check')
        import re
        ns = helpers('skills/youtube-notetaker/scripts/serve.py', ['split_frontmatter'], {'yaml': yaml, 'FM_RE': re.compile(r'^---\n(.*?)\n---\n?(.*)$', re.S)})
        with self.assertRaises(ValueError):
            ns['split_frontmatter']('---\n- unexpected list\n---\nbody')
        self.assertEqual(ns['split_frontmatter']('---\ntitle: Study\n---\nbody'), ({'title': 'Study'}, 'body'))


if __name__ == '__main__':
    unittest.main()
