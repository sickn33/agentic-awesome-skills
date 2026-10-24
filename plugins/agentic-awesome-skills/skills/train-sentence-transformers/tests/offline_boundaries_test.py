"""Offline regressions; never load training dependencies or provider assets."""
import importlib.util
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('training_safety', Path(__file__).parents[1]/'scripts/training_safety.py')
safety = importlib.util.module_from_spec(spec)
spec.loader.exec_module(safety)

class Boundaries(unittest.TestCase):
    def test_no_execution_without_scope(self):
        with patch.dict(os.environ, {}, clear=True), self.assertRaises(SystemExit):
            safety.prepare_run()

    def test_bad_budget_before_writes(self):
        with patch.dict(os.environ, {'ST_ALLOW_LOCAL_TRAINING':'1','ST_MAX_STEPS':'0'}, clear=True), self.assertRaises(ValueError):
            safety.prepare_run()

    def test_no_mutable_revision(self):
        with patch.dict(os.environ, {'ST_REVISIONS_JSON':'{"owner/model":"main"}'}, clear=True), self.assertRaises(ValueError):
            safety.revision('owner/model')

    def test_model_flags(self):
        with patch.dict(os.environ, {'ST_REVISIONS_JSON':'{"owner/model":"'+'a'*40+'"}'}, clear=True):
            result=safety.safe_model(lambda name, **kw:(name,kw), 'owner/model')
        self.assertFalse(result[1]['trust_remote_code'])
        self.assertTrue(result[1]['local_files_only'])
        self.assertTrue(result[1]['model_kwargs']['use_safetensors'])

    def test_symlink_parent(self):
        with tempfile.TemporaryDirectory() as temp:
            real=Path(temp).resolve(); (real/'link').symlink_to(real, target_is_directory=True)
            env={'ST_ALLOW_LOCAL_TRAINING':'1','ST_MAX_STEPS':'1','ST_RUN_PARENT':str(real/'link')}
            with patch.dict(os.environ, env, clear=True), self.assertRaises(ValueError):safety.prepare_run()

    def test_query_groups_disjoint(self):
        class Data:
            column_names=['score','query']
            def __len__(self):return 8
            def __getitem__(self,key):return {'query':['a','a','b','b','c','c','d','d'], 'score':[1.0]*8}[key]
            def select(self,idx):return {self['query'][i] for i in idx}
        split=safety.group_split(Data(),2)
        self.assertTrue(split['train']);self.assertTrue(split['test'])
        self.assertFalse(split['train'] & split['test'])

if __name__=='__main__':unittest.main()
