import importlib.util
import json
from pathlib import Path
import re
import sqlite3
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
LINT = ROOT / 'skills/lint-and-validate/scripts'
PLAYBOOK = ROOT / 'skills/sql-optimization-patterns/resources/implementation-playbook.md'


def module(name):
    spec = importlib.util.spec_from_file_location(name, LINT / (name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class WorkedExamples(unittest.TestCase):
    def test_no_checks_and_invalid_metadata_are_not_success(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run([sys.executable, str(LINT / 'lint_runner.py'), directory], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)
            self.assertIn('"passed": false', result.stdout)
            Path(directory, 'package.json').write_text('{')
            result = subprocess.run([sys.executable, str(LINT / 'lint_runner.py'), directory], capture_output=True, text=True)
            self.assertEqual(result.returncode, 2)

    def test_node_fallback_never_downloads_a_checker(self):
        with tempfile.TemporaryDirectory() as directory:
            Path(directory, 'package.json').write_text(json.dumps({'devDependencies': {'typescript': '1', 'eslint': '1'}}))
            runner = module('lint_runner')
            checks = runner.detect_project_type(Path(directory))['linters']
            self.assertEqual(len(checks), 2)
            self.assertTrue(all('node_modules' in check['cmd'][0] for check in checks))
            self.assertFalse(runner.run_linter(checks[0], Path(directory))['passed'])

    def test_inventory_does_not_double_count_or_claim_unread_files(self):
        checker = module('type_coverage')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for index in range(31):
                (root / f'f{index:02}.py').write_text('def identity(value: int) -> int:\n    return value\n')
            result = checker.check_python_coverage(root)
            self.assertEqual(result['files'], 30)
            self.assertTrue(result['truncated'])
            self.assertEqual(result['stats'], {'functions': 30, 'fully_annotated_functions': 30})
            (root / 'f00.py').write_text('invalid syntax !')
            self.assertEqual(len(checker.check_python_coverage(root)['errors']), 1)

    def test_published_batch_loading_preserves_values_and_empty_case(self):
        code = next(code for code in re.findall(r'```python\n(.*?)```', PLAYBOOK.read_text(), re.S) if '# batch-loading-example' in code)
        namespace = {}
        exec(compile(code, str(PLAYBOOK), 'exec'), namespace)
        with sqlite3.connect(':memory:') as connection:
            connection.executescript('CREATE TABLE orders(id INTEGER, user_id INTEGER, total INTEGER); INSERT INTO orders VALUES (1,1,10),(2,1,20),(3,2,30);')
            load = namespace['load_orders']
            self.assertEqual(load(connection, [1]), [(1,1,10),(2,1,20)])
            self.assertEqual(load(connection, []), [])
            self.assertEqual(load(connection, ['1) OR 1=1 --']), [])
            with self.assertRaises(ValueError):
                load(connection, list(range(501)))

    def test_published_cursor_handles_equal_timestamps(self):
        text = PLAYBOOK.read_text()
        query = re.search(r'SELECT \* FROM users\nWHERE \(created_at, id\).*?LIMIT 20;', text, re.S).group()
        with sqlite3.connect(':memory:') as connection:
            connection.executescript("CREATE TABLE users(id INTEGER, created_at TEXT); INSERT INTO users VALUES (12346,'2024-01-15 10:30:00'),(12345,'2024-01-15 10:30:00'),(12344,'2024-01-15 10:30:00'),(1,'2024-01-14 10:30:00');")
            self.assertEqual([row[0] for row in connection.execute(query)], [12344, 1])

    def test_published_join_aggregation_preserves_zero_and_multiple_orders(self):
        text = PLAYBOOK.read_text()
        correlated = re.search(r'SELECT u.name, u.email,\n    \(SELECT COUNT\(\*\).*?FROM users u;', text, re.S).group()
        joined = re.search(r'SELECT u.name, u.email, COUNT\(o.id\).*?GROUP BY u.id, u.name, u.email;', text, re.S).group()
        with sqlite3.connect(':memory:') as connection:
            connection.executescript("CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, email TEXT); CREATE TABLE orders(id INTEGER, user_id INTEGER); INSERT INTO users VALUES (1,'A','a'),(2,'B','b'),(3,'C','c'); INSERT INTO orders VALUES (1,1),(2,1),(3,2);")
            self.assertEqual(sorted(connection.execute(correlated)), sorted(connection.execute(joined)))
            self.assertIn(('C', 'c', 0), list(connection.execute(joined)))


if __name__ == '__main__':
    unittest.main()
