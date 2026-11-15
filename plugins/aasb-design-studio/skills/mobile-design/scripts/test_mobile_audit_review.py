"""Offline source fixtures; no project execution or native compliance claim."""
import contextlib
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('mobile_audit',Path(__file__).with_name('mobile_audit.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)


class ReviewTests(unittest.TestCase):
    def test_innocuous_native_text_is_not_falsely_noncompliant(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'Screen.tsx'
            path.write_text("import {Text} from 'react-native'; const example = <Text style={{fontSize:17,lineHeight:22}}>Hello</Text>;")
            reviewer=audit.MobileAuditor();reviewer.audit_file(path)
            report=reviewer.get_report()
            self.assertEqual(report['status'],'advisory')
            self.assertEqual(report['warnings'],[])
            self.assertIsNone(report['compliant'])

    def test_actual_disable_and_storage_candidates_have_locations(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'Screen.tsx'
            path.write_text("import {Text} from 'react-native';\nconst node=<Text allowFontScaling={false}>Hello</Text>;\nAsyncStorage.setItem('auth_token', fixture);")
            reviewer=audit.MobileAuditor();reviewer.audit_file(path)
            findings=reviewer.get_report()['warnings']
            self.assertEqual(len(findings),2)
            self.assertEqual({f['line'] for f in findings},{2,3})
            self.assertTrue(all('unverified' in f['certainty'] for f in findings))

    def test_symlink_and_size_limits_are_incomplete(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'source.tsx';source.write_text("import 'react-native';")
            link=Path(tmp)/'link.tsx';link.symlink_to(source)
            reviewer=audit.MobileAuditor();reviewer.audit_file(link)
            self.assertEqual(reviewer.get_report()['status'],'incomplete')
            with patch.object(audit,'MAX_FILE_BYTES',8):
                reviewer=audit.MobileAuditor();reviewer.audit_file(source)
            self.assertEqual(reviewer.get_report()['status'],'incomplete')

    def test_no_mobile_source_cannot_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'helper.ts';source.write_text('export const value=1;')
            reviewer=audit.MobileAuditor();reviewer.audit_file(source)
            self.assertEqual(reviewer.get_report()['status'],'no-mobile-source')
            self.assertIsNone(reviewer.get_report()['compliant'])

    def test_audited_code_remains_inert(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/'code.ts'
            source.write_text("import 'react-native'; require('fs').writeFileSync('must-not-exist','bad');")
            reviewer=audit.MobileAuditor();reviewer.audit_file(source)
            self.assertFalse((Path(tmp)/'must-not-exist').exists())
            self.assertEqual(reviewer.get_report()['mobile_files_checked'],1)


if __name__=='__main__':unittest.main()
