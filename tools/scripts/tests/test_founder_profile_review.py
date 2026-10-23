import importlib.util
from pathlib import Path
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

ROOT=Path(__file__).resolve().parents[3]
SCRIPTS=ROOT/'skills/find-complementary-founders/scripts'
sys.path.insert(0,str(SCRIPTS))
import assess_profile as assess
import match_profiles as match
import profile_card as card
import validate_profile as validator
import test_moltbook_publish as fixtures
import github_thread

class ProfileReview(unittest.TestCase):
 def test_single_strong_evidence_does_not_certify_strength(self):
  evidence=[{'kind':'customer_outcome','weight':5,'stages':['zero_to_one'],'functions':[],'id':'first'}]
  evidence.append(dict(evidence[0],id='feedback',kind='peer_feedback',weight=2))
  result=assess.compute_vectors(evidence,assess.STAGES)['zero_to_one']
  self.assertLess(result['score'],50)
  self.assertNotIn(result['level'],['strong','standout'])
 def test_complete_card_validation(self):
  profile=fixtures.public_profile();profile['consent']['expires_on']='1999-01-01'
  with self.assertRaises(card.CardError):card.render_card(profile)
 def test_self_copy_and_duplicate_candidates_are_excluded(self):
  owner=fixtures.public_profile();owner['_source_path']='/one'
  copy=dict(owner,_source_path='/copy')
  candidate=dict(owner,alias='another-owner',_source_path='/two')
  duplicate=dict(candidate,_source_path='/three')
  self.assertEqual(match.exclude_owner_source(owner,[copy,candidate,duplicate]),[candidate])
 def test_card_output_does_not_truncate_hardlinked_file(self):
  with tempfile.TemporaryDirectory() as temp:
   first=Path(temp)/'first';second=Path(temp)/'second';first.write_text('preserve')
   second.hardlink_to(first)
   with self.assertRaises(card.CardError):card.write_card(second,'overwrite')
   self.assertEqual(first.read_text(),'preserve')
 def test_expired_inline_draft_cannot_publish(self):
  profile=fixtures.public_profile();draft=github_thread.build_profile_comment_draft(profile)
  body=draft['payload']['body'].replace(profile['expires_on'],'1999-01-01')
  draft['payload']['body']=body
  digest=github_thread.approval_hash('github_issue_comment',draft['payload']);draft['approval_hash']=digest
  with self.assertRaises(github_thread.GitHubThreadError):github_thread.validate_draft(draft,digest)
 def test_unhashable_enum_is_validation_failure(self):
  with self.assertRaises(validator.ValidationError):validator.unique_enum_list([{}],'test',('one',))
if __name__=='__main__':unittest.main()
