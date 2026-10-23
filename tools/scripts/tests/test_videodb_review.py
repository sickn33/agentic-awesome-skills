"""Offline listener regressions: no VideoDB calls or capture."""
import asyncio
import contextlib
import io
import os
import tempfile
import unittest
from pathlib import Path
from test_ws_listener_security import load_module
from symlink_test_utils import symlink_or_skip

class VideoDBReviewTests(unittest.TestCase):
    def test_byte_limit_does_not_append_and_does_not_mutate_input(self):
        with tempfile.TemporaryDirectory() as td:
            m = load_module('videodb_review_limit', Path(td))
            m.MAX_BYTES = 1
            event = {'channel': 'transcript', 'data': {'text': 'private'}}
            with self.assertRaises(OverflowError):
                m.append_event(event)
            self.assertNotIn('ts', event)
            self.assertEqual(m.EVENTS_FILE.read_bytes(), b'')

    def test_symlink_parent_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            actual = root / 'actual'
            actual.mkdir()
            alias = root / 'alias'
            symlink_or_skip(self, actual, alias)
            m = load_module('videodb_review_parent', alias)
            with self.assertRaises(OSError):
                m.ensure_output_dir()
            self.assertFalse((actual / 'videodb-events').exists())

    def test_hardlink_not_truncated(self):
        with tempfile.TemporaryDirectory() as td:
            m = load_module('videodb_review_hardlink', Path(td))
            m.ensure_output_dir()
            source = Path(td) / 'secret'
            source.write_text('preserve')
            os.link(source, m.PID_FILE)
            with self.assertRaises(OSError):
                m.write_pid()
            self.assertEqual(source.read_text(), 'preserve')

    def test_normal_close_has_finite_total_retry_budget_and_closes_sockets(self):
        with tempfile.TemporaryDirectory() as td:
            m = load_module('videodb_review_retries', Path(td))
            m.MAX_RETRIES = 2
            m.INITIAL_BACKOFF = m.MAX_BACKOFF = 0
            opened, closed = [], []
            class Socket:
                connection_id = 'synthetic-private-id'
                async def connect(self):
                    opened.append(self)
                    return self
                async def receive(self):
                    yield {'data': {'text': 'do-not-print'}}
                async def close(self):
                    closed.append(self)
            class Connection:
                def connect_websocket(self):
                    return Socket()
            m.videodb.connect = Connection
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                with self.assertRaises(ConnectionError):
                    asyncio.run(m.listen_with_retry())
            self.assertEqual(len(opened), 2)
            self.assertEqual(len(closed), 2)
            self.assertNotIn('do-not-print', output.getvalue())
            self.assertNotIn('synthetic-private-id', output.getvalue())

if __name__ == '__main__':
    unittest.main()
