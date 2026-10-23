"""Offline regressions for reviewed batch13 local helpers; no network or target code."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import wave

ROOT = Path(__file__).resolve().parents[3]


@contextlib.contextmanager
def temporary_cwd(directory):
    """Python 3.10-compatible process cwd restoration for sequential tests."""
    previous = Path.cwd()
    os.chdir(directory)
    try:
        yield
    finally:
        os.chdir(previous)


def load(relative):
    spec = importlib.util.spec_from_file_location('batch13_' + Path(relative).stem, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LocalHelpers(unittest.TestCase):
    def test_architecture_stubs_never_false_pass_and_refuse_overwrite(self):
        for name in ('project_architect', 'dependency_analyzer', 'architecture_diagram_generator'):
            script = ROOT / f'skills/senior-architect/scripts/{name}.py'
            with tempfile.TemporaryDirectory() as tmp:
                cwd = Path(tmp).resolve()
                result = subprocess.run([sys.executable, str(script), '.', '--json'], cwd=cwd, capture_output=True, text=True)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(json.loads(result.stdout)['analysis_performed'], False)
                protected = cwd / 'report.json'; protected.write_text('CANARY')
                result = subprocess.run([sys.executable, str(script), '.', '--json', '--output', 'report.json'], cwd=cwd, capture_output=True, text=True)
                self.assertEqual(result.returncode, 1)
                self.assertEqual(protected.read_text(), 'CANARY')
                result = subprocess.run([sys.executable, str(script), '.', '--output', '../escape.json'], cwd=cwd, capture_output=True, text=True)
                self.assertEqual(result.returncode, 1)

    def test_shark_rejects_external_pointer_and_edited_state_path(self):
        shark = load('skills/shark/scripts/shark.py')
        with tempfile.TemporaryDirectory() as tmp, temporary_cwd(Path(tmp).resolve()):
            pitch = Path('pitch.md'); pitch.write_text('A synthetic idea')
            with contextlib.redirect_stdout(io.StringIO()):
                shark.cmd_init(SimpleNamespace(investors=2, seed=1, pitch_file=str(pitch)))
            rd = shark.run_dir()
            state_path = Path(rd) / 'state.json'
            state = json.loads(state_path.read_text()); state['dir'] = '/tmp/outside'; state_path.write_text(json.dumps(state))
            self.assertEqual(shark.load_state()['dir'], rd)
            Path('.shark/LATEST').write_text('/tmp/outside')
            with self.assertRaises(ValueError): shark.run_dir()

    def test_shark_refuses_symlink_output_and_incomplete_answers_phase(self):
        shark = load('skills/shark/scripts/shark.py')
        with tempfile.TemporaryDirectory() as tmp, temporary_cwd(Path(tmp).resolve()):
            Path('pitch.md').write_text('A synthetic idea')
            with contextlib.redirect_stdout(io.StringIO()):
                shark.cmd_init(SimpleNamespace(investors=2, seed=1, pitch_file='pitch.md'))
            state = shark.load_state()
            with self.assertRaisesRegex(ValueError, 'Earlier phase'):
                shark.cmd_prompts(SimpleNamespace(phase='decide'))
            outside = Path('private'); outside.write_text('CANARY')
            Path(shark.jobs(state, 'grill')[0]['output']).symlink_to(outside.resolve())
            with self.assertRaises(ValueError): shark.missing(state, 'grill')
            self.assertEqual(outside.read_text(), 'CANARY')

    def test_shark_missing_and_malformed_decisions_are_not_out(self):
        shark = load('skills/shark/scripts/shark.py')
        self.assertIn('2 no decision', shark.headline({'in': 0, 'out': 0, 'panel': 2}))
        self.assertIsNone(shark.parse_decision('DECISION: IN'))
        self.assertIsNone(shark.parse_decision('DECISION: IN\nDECISION: OUT'))
        with self.assertRaises(SystemExit): shark.panel_size(SimpleNamespace(investors=0))

    def test_governance_import_and_default_log_do_not_write(self):
        with tempfile.TemporaryDirectory() as tmp, temporary_cwd(Path(tmp).resolve()), patch.dict(os.environ, {}, clear=True):
            helper = load('skills/leiloeiro-avaliacao/scripts/governance.py')
            entry = helper.log_action('secret-bearing action', {'private': 'CANARY'})
            self.assertEqual(entry['details'], {})
            self.assertEqual(entry['action'], 'unspecified')
            self.assertEqual(list(Path('.').iterdir()), [])
            self.assertEqual(helper.get_recent_actions(), [])

    def test_governance_redacts_and_refuses_log_symlink_and_invalid_ratios(self):
        helper = load('skills/leiloeiro-avaliacao/scripts/governance.py')
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp).resolve()
            with patch.dict(os.environ, {'LEILOEIRO_LOG_DIR': str(directory)}):
                helper.log_action('query', {'private': 'CANARY'})
                self.assertNotIn('CANARY', (directory / 'action_log.jsonl').read_text())
                self.assertEqual(len(helper.get_recent_actions()), 1)
                (directory / 'action_log.jsonl').unlink()
                private = directory / 'private'; private.write_text('CANARY')
                (directory / 'action_log.jsonl').symlink_to(private)
                with self.assertRaises(ValueError): helper.log_action('query')
                self.assertEqual(private.read_text(), 'CANARY')
        with self.assertRaises(ValueError): helper.check_warning_threshold(float('nan'))
        with self.assertRaises(ValueError): helper.get_recent_actions(0)

    def test_pcm_frame_and_stereo_duration(self):
        helper = load('skills/podcast-generation/scripts/pcm_to_wav.py')
        pcm = b'\0' * (24000 * 2 * 2)
        with wave.open(io.BytesIO(helper.pcm_to_wav(pcm, channels=2))) as wav:
            self.assertEqual((wav.getnchannels(), wav.getframerate(), wav.getnframes()), (2, 24000, 24000))
        self.assertEqual(helper.calculate_duration(pcm, channels=2), 1)
        with self.assertRaises(ValueError): helper.pcm_to_wav(b'\0', channels=2)
        with self.assertRaises(ValueError): helper.pcm_to_wav(b'', sample_width=4)

    def test_connection_schema_is_parsed_without_execution_and_url_rejected_before_open(self):
        helper = load('skills/connection-auth-rules/fetch_schema.py')
        source = 'raise RuntimeError("MUST NOT EXECUTE")\nclass Result(TypedDict):\n    token: str\n'
        self.assertEqual(helper._parse_connector_schema(source)['output_keys'], ['token'])
        with patch.object(helper.urllib.request, 'build_opener', side_effect=AssertionError('must not open')):
            with self.assertRaises(ValueError): helper._fetch_json('https://example.invalid/schema')

    def test_hyperexecute_builder_does_not_start_download_job_and_quotes_paths(self):
        script = ROOT / 'skills/hyperexecute-skill/scripts/build-command.js'
        result = subprocess.run(['node', str(script), 'download'], capture_output=True, text=True)
        self.assertEqual(result.returncode, 1)
        result = subprocess.run(['node', str(script), 'run', '--config', "a'$(touch CANARY).yaml"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0)
        self.assertIn("'\"'\"'", result.stdout)
        self.assertIn('--key "$LT_ACCESS_KEY"', result.stdout)


if __name__ == '__main__':
    unittest.main()
