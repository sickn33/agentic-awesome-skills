import copy
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import reviewed_source_exceptions as ledger

class ReviewedSources(unittest.TestCase):
    def setUp(self):
        self.entry=dict(skill_id='example',kind='hosted-source',tree_oid='a'*40,before_source=None,after_source='https://example.org/skill.md',source_type='official',source_repo=None,evidence_url='https://example.org/skill',verified_at='2026-10-19')
        self.after={'provenance':{'source':self.entry['after_source'],'source_type':'official','source_repo':None}}
        self.reason='example:new_external_skill_invalid_source_repo'
    def load(self,e):
        with patch.object(ledger,'read_path',return_value=json.dumps({'schema_version':1,'entries':[e]}).encode()) as read:
            out=ledger.load('/repo','protected-sha');read.assert_called_once_with('/repo','protected-sha',ledger.PATH);return out
    def apply(self,e=None,tree=None,after=None,readme=None):
        with patch.object(ledger,'_run_git',return_value=((tree or 'a'*40)+'\n').encode()):
            return ledger.apply('/repo','head','example','added',None,after or self.after,[self.reason,'example:security_regression'],[e or self.entry],self.entry['evidence_url'] if readme is None else readme)
    def test_only_exact_reviewed_tree_and_reason(self):
        self.load(self.entry)
        remaining,applied=self.apply();self.assertEqual(remaining,['example:security_regression']);self.assertTrue(applied)
        self.assertIn(self.reason,self.apply(tree='b'*40)[0]);self.assertIn(self.reason,self.apply(readme='no credit')[0])
        changed=copy.deepcopy(self.after);changed['provenance']['source']='https://evil.example/skill'
        self.assertIn(self.reason,self.apply(after=changed)[0])
    def test_reject_unbounded_or_invalid_exceptions(self):
        for change in [{'kind':'allow-anything'},{'tree_oid':'main'},{'skill_id':'../escape'},{'source_repo':'owner/repo'},{'after_source':'http://example.org/file'},{'before_source':'self'}]:
            with self.subTest(change=change), self.assertRaises(ValueError):self.load({**self.entry,**change})
    def test_repin_is_same_repository_same_subtree(self):
        e={**self.entry,'kind':'source-repin','source_repo':'owner/repo','before_source':'https://github.com/owner/repo/tree/'+'a'*40+'/skills/example','after_source':'https://github.com/owner/repo/tree/'+'b'*40+'/skills/example'}
        self.load(e)
        for value in [e['after_source'].replace('owner/repo','other/repo'), e['after_source'].replace('/skills/example','/skills/other'),e['after_source'].replace('b'*40,'main')]:
            with self.assertRaises(ValueError):self.load({**e,'after_source':value})
    def test_missing_protected_ledger_is_not_exception(self):
        with patch.object(ledger,'read_path',return_value=None):self.assertEqual(ledger.load('/repo','base'),[])
    def test_community_repin_binds_whole_tree_and_preserves_other_blockers(self):
        entry = {**self.entry, 'kind': 'source-repin', 'source_type': 'community',
                 'source_repo': 'owner/repo',
                 'before_source': 'https://github.com/owner/repo/tree/' + 'b'*40 + '/skills/example',
                 'after_source': 'https://github.com/owner/repo/tree/' + 'c'*40 + '/skills/example'}
        entries = self.load(entry)
        before = {'provenance': {'source': entry['before_source']}}
        after = {'provenance': {'source': entry['after_source'], 'source_type': 'community', 'source_repo': 'owner/repo'}}
        reason = 'example:provenance_identity_changed:source'
        def evaluate(tree, old=before):
            with patch.object(ledger, '_run_git', return_value=(tree+'\n').encode()):
                return ledger.apply('/repo','head','example','modified',old,after,[reason,'example:security_regression'],entries,'')
        self.assertEqual(evaluate('a'*40)[0], ['example:security_regression'])
        self.assertIn(reason, evaluate('d'*40)[0])
        self.assertIn(reason, evaluate('a'*40, {'provenance': {'source': 'self'}})[0])

if __name__=='__main__':unittest.main()
