"""Offline regressions: no credentials, service calls or bot startup."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import types
import unittest
from unittest.mock import patch, MagicMock

ROOT = Path(__file__).resolve().parents[3] / 'skills/telegram'


def load(path):
    spec = importlib.util.spec_from_file_location('telegram_fixture', ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Repairs(unittest.TestCase):
    def test_unknown_webhook_never_polls(self):
        m = load('scripts/test_bot.py')
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({'ok': True, 'result': {'id': 1}}).encode()
        with patch.object(m, 'urlopen', side_effect=[response, RuntimeError('unavailable')]) as network:
            with contextlib.redirect_stdout(io.StringIO()):
                result = m.test_bot('synthetic-token')
        self.assertTrue(result['token_valid'])
        self.assertIsNone(result['webhook_info'])
        self.assertEqual(network.call_count, 2)
        self.assertTrue(result['errors'])

    def test_webhook_lifecycle_is_owned_by_library(self):
        app = MagicMock()
        application = MagicMock()
        application.builder.return_value.token.return_value.build.return_value = app
        telegram = types.ModuleType('telegram')
        telegram.Update = object
        ext = types.ModuleType('telegram.ext')
        ext.Application = application
        ext.CommandHandler = MagicMock()
        ext.MessageHandler = MagicMock()
        ext.filters = MagicMock()
        dotenv = types.ModuleType('dotenv')
        dotenv.load_dotenv = MagicMock()
        with patch.dict('sys.modules', {'telegram': telegram, 'telegram.ext': ext, 'dotenv': dotenv}):
            m = load('assets/boilerplate/python/webhook_server.py')
            application.builder.assert_not_called()
            with patch.dict('os.environ', {'TELEGRAM_BOT_TOKEN': 'synthetic', 'WEBHOOK_URL': 'https://example.invalid/', 'WEBHOOK_SECRET': 'a'*32, 'PORT': '5000'}, clear=True):
                m.main()
        args = app.run_webhook.call_args.kwargs
        self.assertEqual(args['webhook_url'], 'https://example.invalid/webhook')
        self.assertEqual(args['url_path'], 'webhook')
        self.assertFalse(args['drop_pending_updates'])
        self.assertEqual(args['secret_token'], 'a'*32)


if __name__ == '__main__':
    unittest.main()
