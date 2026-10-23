import ast
from collections import Counter
from pathlib import Path
import re
import tempfile
from types import SimpleNamespace
import unittest

ROOT=Path(__file__).resolve().parents[3]
SCRIPTS=ROOT/'skills/hugging-face-jobs/scripts'

def functions(filename,names,extra=None):
 tree=ast.parse((SCRIPTS/filename).read_text());selected=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in names]
 namespace={'re':re,'Counter':Counter,'logger':SimpleNamespace(info=lambda *a:None),'tqdm':lambda items,**kw:items,'SamplingParams':lambda **kw:kw}
 namespace.update(extra or {})
 source=ast.Module(body=[ast.ImportFrom(module='__future__',names=[ast.alias(name='annotations')],level=0),*selected],type_ignores=[])
 exec(compile(ast.fix_missing_locations(source),str(SCRIPTS/filename),'exec'),namespace)
 return namespace

class JobsReview(unittest.TestCase):
 def test_boxed_fraction_and_unclosed_thinking(self):
  n=functions('cot-self-instruct.py',{'boxed_answer','parse_thinking_output','extract_reasoning_output'})
  raw=r'[New Question Begin]Q[New Question End][Final Answer to New Question Begin]\boxed{\frac{1}{2}}[Final Answer to New Question End]'
  self.assertEqual(n['extract_reasoning_output'](raw),('Q',r'\frac{1}{2}'))
  self.assertEqual(n['parse_thinking_output']('<think>unfinished secret'), '')
 def test_failed_parses_count_against_consistency(self):
  outputs=[SimpleNamespace(outputs=[SimpleNamespace(text=r'\boxed{2}')])]+[SimpleNamespace(outputs=[SimpleNamespace(text='unparseable')])]*3
  llm=SimpleNamespace(generate=lambda *args:outputs)
  n=functions('cot-self-instruct.py',{'boxed_answer','parse_thinking_output','answer_consistency_filter'})
  self.assertEqual(n['answer_consistency_filter'](llm,[{'question':'Q','answer':'2'}],4,0.5),[])
 def test_rip_is_not_a_length_proxy(self):
  n=functions('cot-self-instruct.py',{'rip_filter'})
  with self.assertRaises(NotImplementedError):n['rip_filter'](None,[], 'example/reward')
 def test_sparse_stats_and_weighted_years(self):
  try:import polars as pl
  except ImportError:self.skipTest('Optional Polars workload dependency is not installed')
  n=functions('finepdfs-stats.py',{'compute_temporal_stats','compute_global_stats','format_temporal_stats','create_ascii_charts'}, {'pl':pl})
  # Source has 2 scored docs and 1 unscored doc: missing score is not zero.
  raw=pl.DataFrame({'dump':['CC-MAIN-2024-01']*2+['CC-MAIN-2024-02'],'token_count':[1,1,1],'fw_edu_scores':[[4.0],None,[2.0]]})
  with tempfile.TemporaryDirectory() as temp:
   temporal=n['compute_temporal_stats'](raw.lazy(),Path(temp)/'stats.parquet')
   result=n['compute_global_stats'](temporal)
   self.assertEqual(result['total_docs'][0],3)
   self.assertAlmostEqual(result['avg_edu_score'][0],3.0)
   self.assertAlmostEqual(result['high_edu_rate'][0],0.5)
   with self.assertRaises(ValueError):n['compute_global_stats'](temporal.head(0))
if __name__=='__main__':unittest.main()
