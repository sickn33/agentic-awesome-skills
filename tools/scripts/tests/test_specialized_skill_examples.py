"""Execute the repaired pure examples without SDKs, network or model downloads."""
import subprocess
import sys
import tempfile
import ast
import re
import sqlite3
import unittest
from pathlib import Path

from fixtures.reviewed_examples import reviewed_source

ROOT = Path(__file__).resolve().parents[3]


def example_definitions():
    text = reviewed_source('skills/embedding-strategies/SKILL.md')
    selected = []
    for block in re.findall(r'```python\n(.*?)```', text, re.S):
        tree = ast.parse(block)
        selected.extend(node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.ClassDef))
                        and node.name in {'chunk_by_tokens', 'recursive_character_splitter', 'LocalEmbedder'})
    class Model:
        def __init__(self, *args, **kwargs):
            self.texts = None
        def encode(self, texts, **kwargs):
            self.texts = texts
            return texts
    class Numpy:
        ndarray = list
    from typing import List
    namespace = {'List': List, 'np': Numpy, 'SentenceTransformer': Model}
    exec(compile(ast.Module(body=selected, type_ignores=[]), '<reviewed-pure-examples>', 'exec'), namespace)
    return namespace


class Examples(unittest.TestCase):
    def test_chunks_cover_tail_and_reject_nonprogressing_parameters(self):
        class Tokens:
            calls = 0
            def encode(self, text): return list(text)
            def decode(self, values):
                self.calls += 1
                if self.calls > 100:
                    raise RuntimeError('nonterminating chunker')
                return ''.join(values)
        fn = example_definitions()['chunk_by_tokens']
        self.assertEqual(fn('', 4, 1, Tokens()), [])
        self.assertEqual(fn('abcdefghij', 4, 1, Tokens()), ['abcd', 'defg', 'ghij'])
        self.assertEqual(fn('abc', 4, 1, Tokens()), ['abc'])
        for size, overlap in [(0, 0), (4, 4), (4, 5), (4, -1)]:
            with self.assertRaises(ValueError): fn('abc', size, overlap, Tokens())

    def test_character_chunks_bound_unbroken_text_and_keep_final_tail(self):
        fn = example_definitions()['recursive_character_splitter']
        self.assertEqual(fn('abcdefghijkl', 5, 1), ['abcde', 'efghi', 'ijkl'])
        self.assertEqual(fn('', 5, 1), [])
        self.assertTrue(all(len(c) <= 5 for c in fn('ab cd ef gh ij', 5, 1)))
        with self.assertRaises(ValueError): fn('abc', 2, 2)

    def test_query_prefix_is_explicit_and_does_not_inspect_dimension_as_text(self):
        cls = example_definitions()['LocalEmbedder']
        embedder = cls(query_prefix='query: ')
        self.assertEqual(embedder.embed_query('question'), 'query: question')
        self.assertEqual(embedder.embed_documents(['document']), ['document'])

    def test_kpi_queries_keep_cohort_denominator_and_spend_grain(self):
        db = sqlite3.connect(':memory:')
        self.addCleanup(db.close)
        db.executescript('''
          CREATE TABLE users(id INTEGER, cohort_month INTEGER, source TEXT);
          CREATE TABLE events(user_id INTEGER, month_index INTEGER);
          CREATE TABLE spend(month_index INTEGER, amount REAL);
          CREATE TABLE monthly_revenue(month_index INTEGER, amount REAL);
          INSERT INTO users VALUES (1,0,'marketing'),(2,0,'marketing'),(3,0,'organic'),(4,0,'organic');
          INSERT INTO events VALUES (1,13),(1,13),(2,13),(2,-1);
          INSERT INTO spend VALUES (0,60),(0,40),(1,20);
          INSERT INTO monthly_revenue VALUES (0,0),(1,100),(2,150);
        ''')
        source = (ROOT / 'skills/kpi-dashboard-design/resources/metric-queries.sql').read_text()
        queries = {name: query.strip() for name, query in re.findall(r'-- query: (\w+)\n(.*?)(?=-- query:|\Z)', source, re.S)}
        self.assertEqual(db.execute(queries['retention']).fetchall(), [(0,13,2,50.0)])
        self.assertEqual(db.execute(queries['cac']).fetchall(), [(0,100.0,2,50.0),(1,20.0,0,None)])
        self.assertEqual(db.execute(queries['growth']).fetchall(), [(0,0.0,None),(1,100.0,None),(2,150.0,50.0)])

    def test_llm_agreement_ranges_and_zero_baseline_regression(self):
        source = reviewed_source('skills/llm-evaluation/SKILL.md')
        definitions = []
        for block in re.findall(r'```python\n(.*?)```', source, re.S):
            definitions.extend(node for node in ast.parse(block).body
                               if isinstance(node, (ast.FunctionDef, ast.ClassDef))
                               and node.name in {'calculate_agreement', 'RegressionDetector'})
        namespace = {}
        exec(compile(ast.Module(body=definitions, type_ignores=[]), '<reviewed-evaluation-examples>', 'exec'), namespace)
        for value, expected in [(-0.1, 'Poor'), (0.1, 'Slight'), (0.3, 'Fair'),
                                (0.5, 'Moderate'), (0.7, 'Substantial'),
                                (1.0, 'Almost Perfect'), (float('nan'), 'Undefined')]:
            namespace['cohen_kappa_score'] = lambda a, b, result=value: result
            self.assertEqual(namespace['calculate_agreement']([], [])['interpretation'], expected)
        detector = namespace['RegressionDetector']({'accuracy': 0.0})
        with self.assertRaisesRegex(ValueError, 'nonzero baseline'):
            detector.check_for_regression({'accuracy': 0.1})
        detector = namespace['RegressionDetector']({'accuracy': 0.8})
        self.assertTrue(detector.check_for_regression({'accuracy': 0.6})['has_regression'])

    def test_fullstack_skeletons_never_report_a_successful_audit(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ['code_quality_analyzer', 'fullstack_scaffolder', 'project_scaffolder']:
                script = ROOT / 'skills/senior-fullstack/scripts' / f'{name}.py'
                result = subprocess.run([sys.executable, str(script), '.', '--json'],
                                        cwd=directory, capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn('unimplemented skeleton', result.stdout)
                self.assertNotIn('Completed successfully', result.stdout)
                self.assertEqual(list(Path(directory).iterdir()), [])

    def test_azure_hook_requires_all_resource_inputs_before_role_mutation(self):
        source = reviewed_source('skills/azd-deployment/SKILL.md')
        section = source.split('### Post-Provision RBAC Assignment', 1)[1].split('## Common Commands', 1)[0]
        import yaml
        hook = yaml.safe_load(re.search(r'```yaml\n(.*?)```', section, re.S).group(1))['hooks']['postprovision']['run']
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            calls = root / 'calls'
            mock = root / 'az'
            mock.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALLS"\n')
            mock.chmod(0o700)
            base = {'PATH': directory + ':/usr/bin:/bin', 'CALLS': str(calls),
                    'BACKEND_PRINCIPAL_ID': 'principal-fixture',
                    'OPENAI_RESOURCE_ID': '/approved/openai',
                    'SEARCH_RESOURCE_ID': '/approved/search'}
            for missing in ['BACKEND_PRINCIPAL_ID', 'OPENAI_RESOURCE_ID', 'SEARCH_RESOURCE_ID']:
                env = dict(base)
                del env[missing]
                run = subprocess.run(['bash', '-c', hook], cwd=directory, env=env,
                                     capture_output=True, text=True)
                self.assertNotEqual(run.returncode, 0)
                self.assertIn(missing, run.stderr)
                self.assertFalse(calls.exists(), 'No role command may run with incomplete inputs')
            run = subprocess.run(['bash', '-c', hook], cwd=directory, env=base,
                                 capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            commands = calls.read_text().splitlines()
            self.assertEqual(len(commands), 2)
            self.assertIn('--scope /approved/openai', commands[0])
            self.assertIn('--scope /approved/search', commands[1])

    def test_slo_alerts_do_not_reference_missing_recording_rules(self):
        source = (ROOT / 'skills/slo-implementation/SKILL.md').read_text()
        defined = set(re.findall(r'- record: (slo:[\w:]+)', source))
        used = set(re.findall(r'slo:http_availability:burn_rate_\w+', source))
        self.assertTrue(used)
        self.assertLessEqual(used, defined)

if __name__ == '__main__':
    unittest.main()
