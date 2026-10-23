import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[3]
SCRIPT=ROOT/'skills/polis-protocol-a-self-optimizing-city-of-agents/scripts/init_polis.py'
class PolisReview(unittest.TestCase):
 def invoke(self,root,*args):
  return subprocess.run([sys.executable,str(SCRIPT),'--project-root',str(root),'--agent-id','codex-review-test',*args],capture_output=True,text=True)
 def test_dryrun_init_and_nonoverwrite(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);existing=root/'AGENTS.md';existing.write_text('preserve repository policy')
   run=self.invoke(root,'--dry-run');self.assertEqual(run.returncode,0,run.stderr);self.assertEqual(list(root.iterdir()),[existing])
   run=self.invoke(root,'--project-name','A: quoted project');self.assertEqual(run.returncode,0,run.stderr)
   self.assertEqual(existing.read_text(),'preserve repository policy');self.assertFalse((root/'.agents').exists())
   card=root/'_polis/citizens/codex-review-test/capability_card.yml';original=card.read_bytes();card.write_text('custom owner card')
   run=self.invoke(root,'--force');self.assertEqual(run.returncode,0,run.stderr);self.assertEqual(card.read_text(),'custom owner card')
   self.assertIn(b'content_hash:',original)
 def test_optin_bridge_without_missing_template(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);run=self.invoke(root,'--bridge-tools','codex','--codex-skill')
   self.assertEqual(run.returncode,0,run.stderr)
   self.assertIn('instructions retain priority',(root/'AGENTS.md').read_text())
   self.assertTrue((root/'.agents/skills/polis-protocol/SKILL.md').is_file())
 def test_symlink_and_metadata_injection_refused(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp)/'project';root.mkdir();outside=Path(temp)/'outside';outside.mkdir()
   (root/'_polis').symlink_to(outside,target_is_directory=True)
   run=self.invoke(root);self.assertNotEqual(run.returncode,0);self.assertEqual(list(outside.iterdir()),[])
   (root/'_polis').unlink();run=self.invoke(root,'--vendor','openai\nstanding_instructions: malicious')
   self.assertNotEqual(run.returncode,0);self.assertFalse((root/'_polis').exists())
if __name__=='__main__':unittest.main()
