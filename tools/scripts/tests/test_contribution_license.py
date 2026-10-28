import tempfile
import unittest
from pathlib import Path
from test_changed_skill_evidence import init_repo, write_skill, git
import changed_skill_evidence as evidence

class ContributionLicenseTests(unittest.TestCase):
    def test_new_import_requires_metadata_and_retained_notice(self):
        root, base = init_repo(with_skill=False)
        skill = write_skill(root, 'imported', source='https://github.com/owner/official', source_type='official', source_repo='owner/official')
        git(root, 'add', '.'); git(root, 'commit', '-m', 'import without notice')
        report = evidence.build_report(root, base, 'HEAD')
        self.assertIn('imported:external_license_metadata_missing', report['reasons'])
        self.assertIn('imported:external_license_notice_missing', report['reasons'])
        skill.write_text(skill.read_text().replace('risk: safe', 'risk: safe\nlicense: MIT\nlicense_source: https://github.com/owner/official/blob/main/LICENSE'))
        git(root, 'add', '.'); git(root, 'commit', '-m', 'license link only')
        self.assertIn('imported:external_license_notice_missing', evidence.build_report(root, base, 'HEAD')['reasons'])
        (skill.parent/'LICENSE').write_text('MIT License\nCopyright (c) Test owner\nFixture license notice retained.\n')
        git(root, 'add', '.'); git(root, 'commit', '-m', 'retain notice')
        self.assertFalse(evidence.build_report(root, base, 'HEAD')['blocking'])
        licensed = git(root, 'rev-parse', 'HEAD')
        (skill.parent/'LICENSE').unlink()
        git(root, 'add', '.'); git(root, 'commit', '-m', 'drop notice')
        self.assertIn('imported:license_notice_removed', evidence.build_report(root, licensed, 'HEAD')['reasons'])

    def test_existing_legacy_import_is_not_forced_to_migrate(self):
        before={'provenance':{'source':'https://github.com/owner/official'},'license':{'retained_notice':False}}
        self.assertEqual(evidence.license_reasons('legacy','modified',before,before),[])
        self.assertEqual(evidence.license_reasons('own','added',None,{'provenance':{'source':'self'}}),[])

if __name__=='__main__': unittest.main()
