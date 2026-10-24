#!/usr/bin/env python3
"""Offline regressions; no sibling runtime, account or remote search is executed."""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import fact_check_x as pipeline
import trusted_search_config as config

class Boundaries(unittest.TestCase):
    def test_private_marked_run_and_existing_data(self):
        with tempfile.TemporaryDirectory() as raw:
            parent=Path(raw).resolve();run=parent/'run'
            self.assertEqual(pipeline.require_run(str(run)),run)
            self.assertEqual(pipeline.require_run(str(run)),run)
            old=parent/'old';old.mkdir(mode=0o700);(old/'keep').write_text('original')
            with self.assertRaises(pipeline.PipelineError):pipeline.require_run(str(old))
            self.assertEqual((old/'keep').read_text(),'original')
    def test_linked_content_rejected_before_packaging(self):
        with tempfile.TemporaryDirectory() as raw:
            parent=Path(raw).resolve();run=pipeline.require_run(str(parent/'run'))
            secret=parent/'secret';secret.write_text('do-not-package')
            (run/'leak').symlink_to(secret)
            with self.assertRaises(pipeline.PipelineError):pipeline.build_portable_report_package(run)
            self.assertFalse((run/pipeline.PORTABLE_REPORT_PACKAGE).exists())
    def test_nonprivate_run_rejected(self):
        if os.name=='nt':self.skipTest('POSIX mode check')
        with tempfile.TemporaryDirectory() as raw:
            run=Path(raw)/'run';run.mkdir(mode=0o755)
            with self.assertRaises(pipeline.PipelineError):pipeline.require_run(str(run))
    def test_key_never_sent_to_unapproved_host(self):
        with patch.dict(os.environ,{'FACTCHECK_TRUSTED_SEARCH_URL':'https://unapproved.example/search','FACTCHECK_TRUSTED_SEARCH_ALLOWED_HOST':'open.dknowc.cn'}),patch.object(config,'open_trusted_search') as transport:
            with self.assertRaises(config.ConfigurationError):config.validate_trusted_search_key('fixture_not_a_real_key_123456')
            transport.assert_not_called()
    def test_real_key_never_sent_to_http_fixture(self):
        with patch.dict(os.environ,{'FACTCHECK_TRUSTED_SEARCH_URL':'http://127.0.0.1:3000/search','FACTCHECK_ALLOW_LOOPBACK_FIXTURE':'1'}),patch.object(config,'open_trusted_search') as transport:
            with self.assertRaises(config.ConfigurationError):config.validate_trusted_search_key('real_shaped_but_inert_key_123456')
            transport.assert_not_called()
    def test_child_error_does_not_echo_secret(self):
        import subprocess
        result=subprocess.CompletedProcess([],1,'api-key=do-not-display','secret=also-private')
        with patch.object(pipeline.subprocess,'run',return_value=result) as execute:
            with self.assertRaises(pipeline.PipelineError) as error:pipeline.run(['inert-command'])
            self.assertNotIn('do-not-display',str(error.exception));self.assertEqual(execute.call_args.kwargs['timeout'],1800)
    def test_non_json_child_output_is_not_success(self):
        import subprocess
        with patch.object(pipeline.subprocess,'run',return_value=subprocess.CompletedProcess([],0,'not-json','')):
            with self.assertRaises(pipeline.PipelineError):pipeline.run(['inert-command'])
    def test_workers_rejected_before_directory_creation(self):
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as raw:
            run=Path(raw)/'run'
            with self.assertRaises(pipeline.PipelineError):pipeline.search_authority(SimpleNamespace(max_workers=13,run_dir=str(run)),{})
            self.assertFalse(run.exists())
if __name__=='__main__':unittest.main()
