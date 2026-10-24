"""No GPU, dataset/model download or package import is required."""
import ast
import copy
import logging
import math
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
import vision_safety as safety
import dataset_inspector as inspector
import estimate_cost
class SafetyTests(unittest.TestCase):
 def test_entrypoints_help_without_dependencies(self):
  for name in ['image_classification_training.py','object_detection_training.py','sam_segmentation_training.py']:
   result=subprocess.run([sys.executable,str(ROOT/'scripts'/name),'--help'],capture_output=True,text=True,timeout=10)
   self.assertEqual(result.returncode,0,result.stderr);self.assertIn('--allow-training',result.stdout)
 def test_missing_permission_fails_before_dependency_import(self):
  result=subprocess.run([sys.executable,str(ROOT/'scripts/object_detection_training.py')],capture_output=True,text=True,timeout=10)
  self.assertNotEqual(result.returncode,0);self.assertNotIn('ModuleNotFoundError',result.stderr)
 def test_guard_rejects_publication_and_invalid_revision(self):
  with tempfile.TemporaryDirectory() as raw:
   args=['--allow-training','--model_name_or_path','owner/model','--model_revision','a'*40,'--dataset_name','owner/data','--dataset_revision','b'*40,'--output_dir',str(Path(raw).resolve()/'new'),'--max_steps','1','--max_train_samples','4','--max_eval_samples','2']
   self.assertEqual(safety.execution_guard(args).max_steps,1)
   with self.assertRaises(SystemExit):safety.execution_guard([*args,'--push_to_hub'])
   bad=args.copy();bad[bad.index('a'*40)]='main'
   with self.assertRaises(SystemExit):safety.execution_guard(bad)
 def test_declared_boxes_and_negative_image_preserved(self):
  self.assertEqual(safety.validated_xywh([2,3,7,9],10,12,'xyxy'),[2,3,5,6])
  for box in [[-1,0,3,4],[True,0,3,4],[0,0,float('nan'),4],[9,0,3,4]]:
   with self.assertRaises(ValueError):safety.validated_xywh(box,10,10,'xywh')
  tree=ast.parse((ROOT/'scripts/object_detection_training.py').read_text());node=next(x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name=='sanitize_dataset')
  ns={'validated_xywh':safety.validated_xywh,'logger':logging.getLogger('inert')};exec(compile(ast.Module(body=[node],type_ignores=[]),'source','exec'),ns)
  class Rows(list):
   def map(self,fn):return Rows(fn(copy.deepcopy(x)) for x in self)
  rows=Rows([{'image':type('Image',(),{'size':(10,10)})(),'objects':{'bbox':[],'category':[]}}])
  self.assertEqual(len(ns['sanitize_dataset'](rows)),1)
 def test_preview_is_not_a_certificate_and_query_is_encoded(self):
  self.assertIn('ambiguous',inspector.detect_bbox_format([1,2,3,4]))
  self.assertIn('config=a%26split%3Dsecret',inspector.endpoint('rows',config='a&split=secret'))
  with patch.object(inspector,'api_request',return_value={'splits':[{'config':'x','split':'train'}]}) as request:
   result=inspector.inspect('owner/data','x','train')
   self.assertFalse(result['validated']);self.assertEqual(request.call_count,1)
 def test_measured_budget_rejects_guesses_and_nonfinite(self):
  self.assertEqual(estimate_cost.budget(1,2,0)['compute_cost_with_buffer'],2)
  with self.assertRaises(Exception):estimate_cost.budget(float('nan'),2)
 def test_syntax_compatible_with_python310(self):
  for p in (ROOT/'scripts').glob('*.py'):ast.parse(p.read_text(),feature_version=(3,10))
if __name__=='__main__':unittest.main()
