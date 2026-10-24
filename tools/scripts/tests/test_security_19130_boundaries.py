"""Offline regressions for the CSV's concrete helper trust boundaries."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]

def module(relative, name):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    loaded = importlib.util.module_from_spec(spec)
    sys.modules[name] = loaded
    spec.loader.exec_module(loaded)
    return loaded

class Boundaries(unittest.TestCase):
    def test_citations_reject_absolute_traversal_links_and_untracked_secrets(self):
        checker = module('skills/slideops/scripts/check.py', 'citation_19130')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'repo'; root.mkdir()
            outside = Path(temp) / 'private'; outside.write_text('PRIVATE_CANARY')
            subprocess.run(['git', 'init', '-q', str(root)], check=True)
            (root / 'safe.txt').write_text('approved source')
            (root / '.env').write_text('PRIVATE_CANARY')
            (root / 'link.txt').symlink_to(outside)
            (root / 'inside.txt').symlink_to(root / '.env')
            subprocess.run(['git', '-C', str(root), 'add', 'safe.txt', '.env', 'link.txt', 'inside.txt'], check=True)
            for name in [str(outside), '../private', 'link.txt', 'inside.txt', '.env', 'unknown.txt']:
                citation = checker.find_citations(f'<pre data-src="{name}:1-1" data-sha256="000000000000">x</pre>')[0]
                checker.check_citation(citation, root, None)
                self.assertEqual(citation.status, 'UNVERIFIED')
                self.assertFalse(citation.current_lines)
            citation = checker.find_citations('<pre data-src="safe.txt:1-1" data-sha256="000000000000">x</pre>')[0]
            checker.check_citation(citation, root, None)
            self.assertEqual(citation.current_lines, ['approved source'])

    def test_outreach_malformed_maximum_template_is_bounded(self):
        audit = module('skills/outreachgenie-list-audit/scripts/audit.py', 'outreach_19130')
        _, errors = audit.parse_template('{{' + ' ' * 99990 + 'x')
        self.assertIn('unbalanced_template_braces', errors)
        self.assertEqual(audit.parse_template('{{ first_name }}')[0], [('builtin', 'first_name')])

    def test_checkpoint_capability_is_preserved_but_other_tokens_are_redacted(self):
        config = module('skills/fact-check-x-unified/scripts/trusted_search_config.py', 'config_19130')
        payload = {'checkpoint': {'acknowledgement': {'token': 'fcx_fixture'}}, 'token': 'SECRET', 'nested': {'access_token': 'SECRET'}}
        result = config.redact_sensitive_json(payload)
        self.assertEqual(result['checkpoint']['acknowledgement']['token'], 'fcx_fixture')
        self.assertEqual(result['token'], '***redacted***')
        self.assertEqual(result['nested']['access_token'], '***redacted***')

    def test_skill_preview_escapes_terminal_controls(self):
        porter = module('skills/skill-porter/scripts/port_skill.py', 'porter_19130')
        escaped = porter.terminal_safe('label\x1b]52;c;payload\x07\u202e')
        self.assertNotIn('\x1b', escaped)
        self.assertNotIn('\x07', escaped)
        self.assertNotIn('\u202e', escaped)
        self.assertIn('\\u001b', escaped)

    def test_preview_server_rejects_escape_before_opening(self):
        preview = module('skills/liuguang-banlan-ui/scripts/serve_preview.py', 'preview_19130')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp) / 'web'; root.mkdir()
            (root / 'leak').symlink_to(Path(temp))
            handler = object.__new__(preview.NoStoreHandler)
            handler.directory = str(root); handler.path = '/leak/secret'
            statuses = []; handler.send_error = lambda status, message: statuses.append(status)
            self.assertIsNone(handler.send_head())
            self.assertEqual(statuses, [403])
            (root / 'index.html').symlink_to(Path(temp) / 'secret')
            handler.path = '/'; statuses.clear()
            self.assertIsNone(handler.send_head())
            self.assertEqual(statuses, [403], 'Directory index links must not bypass containment')
            (root / 'index.html').unlink()
            alias = root.parent / 'alias'; alias.symlink_to(root, target_is_directory=True)
            handler.directory = str(alias); handler.path = '/'; statuses.clear()
            with patch.object(preview.http.server.SimpleHTTPRequestHandler, 'send_head', return_value='safe'):
                self.assertEqual(handler.send_head(), 'safe', 'An explicitly selected root alias must remain usable')
            self.assertEqual(statuses, [])

    def test_document_edits_never_execute_before_fixture_review(self):
        from fixtures.reviewed_examples import reviewed_source
        with patch.object(Path, 'read_text', return_value='raise RuntimeError("must not run")'):
            with self.assertRaisesRegex(AssertionError, 'review'):
                reviewed_source('skills/embedding-strategies/SKILL.md')


class RuntimeWrites(unittest.TestCase):
    def test_court_and_shark_refuse_preplanted_latest(self):
        from types import SimpleNamespace
        for name in ('court', 'shark'):
            helper = module(f'skills/{name}/scripts/{name}.py', name + '_19130')
            with tempfile.TemporaryDirectory() as temp:
                root = Path(temp).resolve() / ('.' + name); root.mkdir()
                outside = root.parent / 'private'; outside.write_text('CANARY')
                (root / 'LATEST').symlink_to(outside)
                with patch.object(helper, 'ROOT', str(root)), patch.object(helper, 'LATEST', str(root / 'LATEST')):
                    with self.assertRaisesRegex(ValueError, 'symlink'):
                        helper.cmd_init(SimpleNamespace())
                self.assertEqual(outside.read_text(), 'CANARY')

    def test_tastegate_refuses_existing_output_before_browser(self):
        import types
        helper = module('skills/tastegate/scripts/gate.py', 'tastegate_19130')
        adapter = types.ModuleType('playwright.sync_api')
        adapter.sync_playwright = lambda: self.fail('Browser must not launch')
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); page = root / 'page.html'; page.write_text('<html></html>')
            outside = root / 'private'; outside.write_text('CANARY')
            output = root / '.tastegate'; output.mkdir(); (output / 'report.json').symlink_to(outside)
            with patch.dict(sys.modules, {'playwright': types.ModuleType('playwright'), 'playwright.sync_api': adapter}):
                with self.assertRaises(FileExistsError): helper.run(str(page), output)
            self.assertEqual(outside.read_text(), 'CANARY')
            alias = root / 'alias'; alias.symlink_to(root, target_is_directory=True)
            with patch.dict(sys.modules, {'playwright': types.ModuleType('playwright'), 'playwright.sync_api': adapter}):
                with self.assertRaisesRegex(ValueError, 'symlink'):
                    helper.run(str(page), alias / 'new-output')
            self.assertFalse((root / 'new-output').exists())


def fixture_definitions(relative, names, namespace):
    import ast
    import re
    from fixtures.reviewed_examples import reviewed_source
    trusted = reviewed_source(relative)
    nodes = []
    for code in re.findall(r'```python\n(.*?)```', trusted, re.S):
        nodes.extend(node for node in ast.parse(code).body
                     if isinstance(node, (ast.FunctionDef, ast.ClassDef)) and node.name in names)
    if set(node.name for node in nodes) != set(names):
        raise AssertionError('Missing trusted fixture definition')
    exec(compile(ast.Module(body=nodes, type_ignores=[]), '<trusted-security-fixture>', 'exec'), namespace)
    return namespace


class PublishedSecurityExamples(unittest.TestCase):
    def test_manifest_ignores_precreated_predictable_temp_link(self):
        import os
        import json
        scope = fixture_definitions('skills/weather-data-reproducibility/SKILL.md', {'write_manifest'},
                                    {'Path': Path, 'os': os, 'json': json, 'tempfile': tempfile})
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp).resolve(); outside = root / 'private'; outside.write_text('CANARY')
            destination = root / 'manifest.json'; (root / 'manifest.json.tmp').symlink_to(outside)
            scope['write_manifest'](destination, {'ok': True})
            self.assertEqual(outside.read_text(), 'CANARY')
            self.assertEqual(json.loads(destination.read_text()), {'ok': True})
            self.assertEqual(list(root.glob('.manifest-*')), [])

    def test_esl_replays_and_same_content_new_versions_never_revert_prices(self):
        import hashlib
        import time
        from typing import List
        sent = []
        scope = fixture_definitions('skills/esl-price-sync/SKILL.md', {'compute_sku_hash', 'ESLDeltaSyncPipeline'},
                                    {'hashlib': hashlib, 'time': time, 'List': List,
                                     'transmit_to_esl_gateway': lambda job: sent.append(job) or True})
        state = {}; pipeline = scope['ESLDeltaSyncPipeline'](state)
        def item(version, price):
            return {'sku': 'A', 'tag_id': 'tag', 'price': price, 'promo_price': None,
                    'uom': 'each', 'template': 'default', 'version': version,
                    'currency': 'USD', 'barcode': 'synthetic-A'}
        pipeline.process_catalog_stream([item(10, 10), item(9, 9)], dry_run=False)
        self.assertEqual(len(sent), 1); self.assertEqual(state['A']['version'], 10)
        pipeline.process_catalog_stream([item(11, 10)], dry_run=False)
        self.assertEqual(len(sent), 1); self.assertEqual(state['A']['version'], 11)
        pipeline.process_catalog_stream([item(10, 8)], dry_run=False)
        self.assertEqual(len(sent), 1); self.assertEqual(state['A']['version'], 11)
        pipeline.process_catalog_stream([item(12, 12)], dry_run=True)
        self.assertEqual(state['A']['version'], 11)
        with self.assertRaises(ValueError): pipeline.process_catalog_stream([item(True, 8)])
        with self.assertRaisesRegex(ValueError, 'Conflicting'):
            pipeline.process_catalog_stream([item(11, 99)], dry_run=False)
        self.assertEqual(state['A']['version'], 11)
        original = item(12, 10)
        for key, value in [('currency', 'EUR'), ('barcode', 'synthetic-B'), ('tag_id', 'other-tag')]:
            changed = dict(original, **{key: value})
            self.assertNotEqual(scope['compute_sku_hash'](original), scope['compute_sku_hash'](changed))
        with self.assertRaises(ValueError): scope['compute_sku_hash'](item(12, float('nan')))

    def test_esl_battery_rejects_nonfinite_assumptions(self):
        scope = fixture_definitions('skills/esl-price-sync/SKILL.md', {'estimate_tag_battery_years'}, {})
        estimate = scope['estimate_tag_battery_years']
        for invalid in (float('nan'), float('inf'), -1, True):
            with self.assertRaises(ValueError): estimate(invalid)
        self.assertGreater(estimate(3), 0)


    def test_zip_bomb_is_rejected_before_member_read(self):
        import zipfile
        import io
        import csv
        from typing import Dict, List, Set
        scope = fixture_definitions('skills/oneroster-csv-validator/SKILL.md', {'validate_oneroster_archive'},
                                    {'zipfile': zipfile, 'io': io, 'csv': csv, 'Dict': Dict, 'List': List, 'Set': Set})
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / 'bomb.zip'
            with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
                z.writestr('manifest.csv', 'A' * (5 * 1024 * 1024))
            with patch.object(zipfile.ZipFile, 'read', side_effect=AssertionError('Must not decompress')):
                with self.assertRaisesRegex(ValueError, 'limit'):
                    scope['validate_oneroster_archive'](str(archive))

    def test_oneroster_multi_org_references_and_partial_result(self):
        import zipfile
        import io
        import csv
        from typing import Dict, List, Set
        core = ["manifest.csv", "orgs.csv", "users.csv", "courses.csv",
                "classes.csv", "enrollments.csv", "academicSessions.csv"]
        scope = fixture_definitions('skills/oneroster-csv-validator/SKILL.md', {'validate_oneroster_archive'},
                                    {'zipfile': zipfile, 'io': io, 'csv': csv, 'Dict': Dict, 'List': List,
                                     'Set': Set, 'CORE_FILES': core,
                                     'VALID_ROLES_1_1': {'administrator', 'proctor', 'student', 'teacher'}})
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / 'roster.zip'
            def write_archive(org_ids):
                with zipfile.ZipFile(archive, 'w') as z:
                    for name in core:
                        content = 'sourcedId\n'
                        if name == 'manifest.csv': content = 'propertyName,value\noneroster.version,1.1\n'
                        if name == 'orgs.csv': content = 'sourcedId\norg-a\norg-b\n'
                        if name == 'users.csv': content = 'sourcedId,orgSourcedIds\nuser-a,"' + org_ids + '"\n'
                        z.writestr(name, content)
            write_archive('org-a,org-b')
            result = scope['validate_oneroster_archive'](str(archive))
            self.assertEqual(result['status'], 'PARTIAL_CHECKS_ONLY')
            self.assertEqual(result['errors'], [])
            write_archive('org-a,PRIVATE_MISSING_ID')
            result = scope['validate_oneroster_archive'](str(archive))
            self.assertEqual(result['status'], 'FAILED')
            self.assertEqual(result['errors'], ['users.csv: unresolved org reference (identifier redacted)'])
            self.assertNotIn('PRIVATE_MISSING_ID', str(result))

    def test_oneroster_rejects_invalid_utf8_instead_of_replacing_identifiers(self):
        import zipfile
        import io
        import csv
        from typing import Dict, List, Set
        scope = fixture_definitions('skills/oneroster-csv-validator/SKILL.md', {'validate_oneroster_archive'},
                                    {'zipfile': zipfile, 'io': io, 'csv': csv, 'Dict': Dict, 'List': List,
                                     'Set': Set, 'CORE_FILES': ['manifest.csv', 'users.csv']})
        with tempfile.TemporaryDirectory() as temp:
            archive = Path(temp) / 'invalid.zip'
            with zipfile.ZipFile(archive, 'w') as z:
                z.writestr('manifest.csv', 'propertyName,value\n')
                z.writestr('users.csv', b'sourcedId\nuser-\xff\n')
            with self.assertRaises(UnicodeDecodeError):
                scope['validate_oneroster_archive'](str(archive))

    def test_pii_in_events_is_dropped_and_never_exported(self):
        from types import SimpleNamespace
        exported = []
        scope = fixture_definitions('skills/agent-observability/references/details.md', {'PIIRedactingSpanProcessor'},
                                    {'SpanProcessor': object, 'SpanExporter': object, 'ReadableSpan': object,
                                     'redact_string': lambda value: value.replace('PRIVATE_CANARY', '[redacted]')})
        processor = scope['PIIRedactingSpanProcessor'](SimpleNamespace(export=lambda spans: exported.extend(spans)))
        processor.on_end(SimpleNamespace(to_json=lambda: '{"events":["PRIVATE_CANARY"]}'))
        self.assertEqual(exported, [])
        safe = SimpleNamespace(to_json=lambda: '{"name":"ordinary"}')
        processor.on_end(safe)
        self.assertEqual(exported, [safe])

    def test_log_redaction_preserves_numeric_interpolation_and_drops_exception(self):
        import logging
        scope = fixture_definitions('skills/agent-observability/references/details.md', {'PIIRedactingFilter'},
                                    {'logging': logging,
                                     'redact_string': lambda value: value.replace('PRIVATE_CANARY', '[redacted]')})
        record = logging.LogRecord('agent', logging.INFO, __file__, 1,
                                   'request PRIVATE_CANARY took %.2f seconds', (1.25,),
                                   (ValueError, ValueError('PRIVATE_CANARY'), None))
        record.exc_text = 'PRIVATE_CANARY'
        record.stack_info = 'PRIVATE_CANARY'
        self.assertTrue(scope['PIIRedactingFilter']().filter(record))
        self.assertEqual(record.getMessage(), 'request [redacted] took 1.25 seconds')
        self.assertIsNone(record.args)
        self.assertIsNone(record.exc_info)
        self.assertIsNone(record.exc_text)
        self.assertIsNone(record.stack_info)

if __name__ == '__main__':
    unittest.main()
