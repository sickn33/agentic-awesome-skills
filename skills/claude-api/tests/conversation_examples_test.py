"""Offline documentation regressions; no SDK imports or requests."""
import ast
import re
import unittest
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[1]
class ConversationTests(unittest.TestCase):
 def helper(self,fail=False,stop='end_turn'):
  source=next(b for b in re.findall(r'```python\n(.*?)```',(ROOT/'python/claude-api/README.md').read_text(),re.S) if 'class ConversationManager' in b)
  tree=ast.parse(source);definition=next(n for n in tree.body if isinstance(n,ast.ClassDef))
  calls=[]
  def create(**kwargs):
   calls.append(kwargs)
   if fail:raise OSError('inert failure')
   return SimpleNamespace(stop_reason=stop,content=[SimpleNamespace(type='thinking'),SimpleNamespace(type='text',text='safe text')])
  ns={'anthropic':SimpleNamespace(Anthropic=object)};exec(compile(ast.Module(body=[definition],type_ignores=[]),'example','exec'),ns)
  return ns['ConversationManager'](SimpleNamespace(messages=SimpleNamespace(create=create)),'fixture-model'),calls
 def test_max_tokens_once_and_full_state(self):
  manager,calls=self.helper();self.assertEqual(manager.send('hello',max_tokens=7),'safe text')
  self.assertEqual(calls[0]['max_tokens'],7);self.assertNotIn('system',calls[0]);self.assertEqual(manager.messages[-1]['content'][0].type,'thinking')
 def test_failure_does_not_commit_history(self):
  manager,_=self.helper(fail=True)
  with self.assertRaises(OSError):manager.send('hello')
  self.assertEqual(manager.messages,[])
 def test_incomplete_result_does_not_commit(self):
  manager,_=self.helper(stop='max_tokens')
  with self.assertRaises(RuntimeError):manager.send('hello')
  self.assertEqual(manager.messages,[])
 def test_all_python_snippets_parse_for_310(self):
  for p in ROOT.rglob('*.md'):
   for b in re.findall(r'```python\n(.*?)```',p.read_text(),re.S):ast.parse(b,feature_version=(3,10))
if __name__=='__main__':unittest.main()
