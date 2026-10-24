"""Offline regressions for the reviewed batch14 Telegram helper; no network."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[3] / 'skills/telegram-bot-messaging/scripts/telegram.sh'


@unittest.skipUnless(shutil.which('jq') and shutil.which('bash'), 'requires bash and jq')
class TelegramRepairs(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'config').mkdir()
        (self.root / 'bin').mkdir()
        mock = self.root / 'bin/curl'
        mock.write_text('#!' + sys.executable + '\n' + '''import json, os, pathlib, sys
root = pathlib.Path(os.environ['MOCK_ROOT'])
with (root / 'calls').open('a') as f:
    f.write(json.dumps({'args': sys.argv[1:], 'config': sys.stdin.read()}) + '\\n')
responses = json.loads((root / 'responses').read_text())
response = responses.pop(0) if responses else {'ok': True, 'result': {}}
(root / 'responses').write_text(json.dumps(responses))
print(json.dumps(response))
''')
        mock.chmod(0o700)
        self.env = {k: v for k, v in os.environ.items() if not k.startswith(('TELEGRAM_', 'BOT_', 'TARGET_', 'APPROVERS_'))}
        self.env.update(PATH=str(self.root / 'bin') + os.pathsep + os.environ['PATH'], MOCK_ROOT=str(self.root),
                        TELEGRAM_CONFIG_DIR=str(self.root / 'config'), TELEGRAM_BOT_TOKEN='123:synthetic', TELEGRAM_CHAT_ID='42')
        self.responses([{'ok': True, 'result': {}}])

    def responses(self, values):
        (self.root / 'responses').write_text(json.dumps(values))

    def run_bot(self, *args, input=None):
        return subprocess.run(['bash', str(SCRIPT), *args], env=self.env, text=True, input=input,
                              capture_output=True, timeout=10)

    def calls(self):
        file = self.root / 'calls'
        return [json.loads(x) for x in file.read_text().splitlines()] if file.exists() else []

    def test_config_cannot_override_executable_search_path(self):
        (self.root / 'config/config').write_text('PATH=/nonexistent\nCURL_HOME=/untrusted\n')
        result = self.run_bot('send', 'synthetic')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 1)
        self.assertNotIn('123:synthetic', '\n'.join(self.calls()[0]['args']))

    def test_invalid_names_ids_and_read_limits_never_call_api(self):
        for args in [('send', 'x', '--bot', '../escape'), ('send', 'x', '--to', '../escape'), ('read', '--limit', '101')]:
            with self.subTest(args=args):
                self.assertNotEqual(self.run_bot(*args).returncode, 0)
        self.env['TELEGRAM_CHAT_ID'] = '42&other=value'
        self.assertNotEqual(self.run_bot('send', 'x').returncode, 0)
        self.assertEqual(self.calls(), [])

    def test_caption_is_literal_and_symlink_attachment_rejected(self):
        file = self.root / 'document.txt'
        file.write_text('synthetic')
        result = self.run_bot('file', str(file), '@/private/example')
        self.assertEqual(result.returncode, 0, result.stderr)
        args = self.calls()[0]['args']
        self.assertIn('--form-string', args)
        self.assertEqual(args[args.index('--form-string') + 1], 'caption=@/private/example')
        link = self.root / 'link.txt'
        link.symlink_to(file)
        self.assertNotEqual(self.run_bot('file', str(link)).returncode, 0)
        self.assertEqual(len(self.calls()), 1)

    def test_uncertain_or_rate_limited_format_failure_has_no_retry(self):
        self.responses([{'ok': False, 'error_code': 429, 'description': 'retry later'}])
        self.assertNotEqual(self.run_bot('send', 'x', '--format', 'md').returncode, 0)
        self.assertEqual(len(self.calls()), 1)

    def test_known_markup_rejection_retries_once_without_parse_mode(self):
        self.responses([{'ok': False, 'error_code': 400, 'description': "can't parse entities"}, {'ok': True, 'result': {}}])
        result = self.run_bot('send', 'x', '--format', 'md')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.calls()), 2)
        self.assertIn('parse_mode=MarkdownV2', self.calls()[0]['args'])
        self.assertFalse(any('parse_mode=' in x for x in self.calls()[1]['args']))

    def test_ask_requires_reply_to_its_exact_message(self):
        def message(number, reply, text):
            return {'update_id': number, 'message': {'chat': {'id': 42}, 'from': {'id': 42},
                                                    'reply_to_message': {'message_id': reply}, 'text': text}}
        self.responses([{'ok': True, 'result': []}, {'ok': True, 'result': {'message_id': 7}},
                        {'ok': True, 'result': [message(1, 6, 'wrong'), message(2, 7, 'correct')]},
                        {'ok': True, 'result': {}}])
        result = self.run_bot('ask', 'synthetic question', '--timeout', '2')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), 'correct')
        self.assertEqual((self.root / 'config/offset.default').stat().st_mode & 0o777, 0o600)

    def test_invalid_setup_token_rejected_before_get_me(self):
        result = self.run_bot('setup', input='not-a-token\n')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.calls(), [])


if __name__ == '__main__':
    unittest.main()
