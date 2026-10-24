"""Offline regressions; never import third-party training packages or use network."""
import argparse
import ast
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ReviewTests(unittest.TestCase):
    def test_imports_are_inert(self):
        import builtins
        original = builtins.__import__
        heavy = {'torch', 'transformers', 'trl', 'datasets', 'peft', 'unsloth', 'huggingface_hub', 'trackio'}
        def guarded(name, *args, **kwargs):
            if name.split('.')[0] in heavy:
                raise AssertionError('heavy import before execution authorization')
            return original(name, *args, **kwargs)
        with patch('builtins.__import__', side_effect=guarded), patch('subprocess.run', side_effect=AssertionError('command on import')):
            for name in ['train_sft_example', 'train_dpo_example', 'train_grpo_example',
                         'unsloth_sft_example', 'convert_to_gguf', 'estimate_cost',
                         'dataset_inspector', 'hf_benchmarks']:
                load(name)

    def test_budget_has_no_silent_defaults_or_zero_timeout(self):
        m = load('estimate_cost')
        self.assertEqual(m.budget(.001, 2)['planned_minutes'], 1)
        self.assertAlmostEqual(m.budget(2, 3, 0)['compute_cost_with_buffer'], 6)
        for value in [0, -1, 'nan', 'inf']:
            with self.assertRaises(argparse.ArgumentTypeError):
                m.budget(value, 2)
        with self.assertRaises(ValueError):
            m.budget(1, 2, float('nan'))

    def test_training_rejects_unauthorized_before_output(self):
        m = load('train_sft_example')
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp).resolve() / 'never-created'
            argv = ['--model', 'owner/model', '--model-revision', 'a'*40,
                    '--dataset', 'owner/data', '--dataset-revision', 'b'*40,
                    '--output-dir', str(out)]
            with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                m.arguments(argv)
            self.assertFalse(out.exists())
            m.arguments(argv + ['--allow-training'])
            self.assertEqual(out.stat().st_mode & 0o777, 0o700)
            with self.assertRaises(FileExistsError):
                m.arguments(argv + ['--allow-training'])

    def test_data_projection_and_rewards(self):
        sft, dpo, grpo = [load('train_' + method + '_example') for method in ['sft', 'dpo', 'grpo']]
        self.assertEqual(sft.validate_rows([{'text': 'hello', 'secret': 'omit'}]*2), [{'text': 'hello'}]*2)
        with self.assertRaises(ValueError):
            dpo.validate_rows([{'prompt': 'p', 'chosen': 'same', 'rejected': 'same'}]*2)
        self.assertEqual(grpo.exact_match_reward(['42', [{'content': ' 3 '}]], ['42', '3']), [1., 1.])
        with self.assertRaises(ValueError):
            grpo.exact_match_reward(['42'], [])
        unsloth = load('unsloth_sft_example')
        with self.assertRaises(ValueError):
            unsloth.validate_messages({'messages': [{'role': 'assistant', 'content': {'image': 'url'}}]})

    def test_untrusted_columns_cannot_generate_code(self):
        m = load('dataset_inspector')
        odd = "x']; __import__('os').system('bad') #\n"
        info = dict(ready=False, can_map=True, possible_prompt=odd,
                    possible_response=odd, prompt_col=odd, chosen_col=odd, rejected_col=odd)
        for method in ['SFT', 'DPO', 'GRPO']:
            source = m.generate_mapping_code(method, info)
            tree = ast.parse(source)
            self.assertFalse(any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                                 and n.func.id == '__import__' for n in ast.walk(tree)))
            # Only literals/subscripts inside the generated mapping function.
            function = tree.body[0]
            self.assertIsInstance(function, ast.FunctionDef)
            self.assertFalse(any(isinstance(n, ast.Call) for n in ast.walk(function)))
        with patch.object(m, 'api_request', return_value={}) as request:
            m.get_rows('owner/data', 'x&split=secret', 'train?evil=1')
            from urllib.parse import urlsplit, parse_qs
            query = parse_qs(urlsplit(request.call_args.args[0]).query)
            self.assertEqual(query['config'], ['x&split=secret'])
            self.assertEqual(query['split'], ['train?evil=1'])
        self.assertIsNone(m.NoRedirect().redirect_request(None,None,302,None,None,'https://evil.invalid'))

    def test_benchmarks_do_not_follow_token_redirects(self):
        m = load('hf_benchmarks')
        self.assertIsNone(m.NoRedirect().redirect_request(None,None,302,None,None,'https://evil.invalid'))
        for value in ['https://evil.invalid/x', 'owner/repo?token=x', 'owner/../secret', 'owner/repo/extra']:
            with self.assertRaises(ValueError):
                m.parse_repo_id(value)
        with patch.object(m.sys, 'stdin', io.StringIO('x' * 65537)):
            with self.assertRaises(ValueError):
                m.read_repo_ids_from_stdin()
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            m.print_leaderboard_table([{'dataset_id':'o/r', 'rank':0, 'model_id':'o/m', 'value':0}])
        self.assertIn('0', output.getvalue())

    def test_gguf_digest_and_pinned_inputs(self):
        m = load('convert_to_gguf')
        with self.assertRaises(argparse.ArgumentTypeError):
            m.revision('main')
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / 'artifact.gguf'
            file.write_bytes(b'bad')
            with self.assertRaises(ValueError):
                m.digest(file)
            file.write_bytes(b'GGUF' + b'fixture')
            self.assertEqual(m.digest(file)['bytes'], 11)
            link = Path(tmp) / 'link'
            link.symlink_to(file)
            with self.assertRaises(ValueError):
                m.regular(link)


if __name__ == '__main__':
    unittest.main()
