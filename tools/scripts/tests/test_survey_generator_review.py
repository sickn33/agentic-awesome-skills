import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('survey_review', ROOT / 'skills/survey-generator/build_artifact.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class SurveyReview(unittest.TestCase):
    def test_incomplete_and_active_html(self):
        for payload in ['<html>incomplete', '<!DOCTYPE html><html><head></head><body><script>alert(1)</script></body></html>', '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=https://example.com"></head></html>', '<!DOCTYPE html><html><head></head><svg><set attributeName="href" to="https://example.com"/></svg></html>']:
            with self.assertRaises(ValueError): m.validate_html(payload)
        result = m.validate_html('<!DOCTYPE html><html><head></head><body><p>Draft</p></body></html>')
        self.assertIn('Content-Security-Policy', result)
    def test_draft_source_and_reference_validation(self):
        with self.assertRaises(ValueError): m.validate_bundle({'verification_status':'draft'})
        bundle = {'verification_status':'verified','title':'Test','anchor_source':'https://example.com/paper','taxonomy':{'root':'Test'},'paradigms':[{}, {}, {}],'stack':[{}],'sections':[{'papers':['missing']}],'table':{'columns':['one']},'bibliography':[{'key':'one','authors':'A','year':'2026','title':'T','venue':'Preprint','summary':'S','source_url':'https://example.com/one'}]}
        with self.assertRaises(ValueError): m.validate_bundle(bundle)
        bundle['sections'][0]['papers']=['one']; m.validate_bundle(bundle)
    def test_version_gaps_and_model_paths(self):
        with tempfile.TemporaryDirectory() as temp:
            previous, model = m.OUTPUT_DIR, m.MODEL
            try:
                m.OUTPUT_DIR=Path(temp);m.MODEL='accounts/fireworks/models/example'
                (Path(temp)/'survey_example_v1.html').touch();(Path(temp)/'survey_example_v3.html').touch()
                self.assertEqual(m.next_version_path().name,'survey_example_v4.html')
                with self.assertRaises(ValueError):m.model_slug('bad/..')
            finally:m.OUTPUT_DIR,m.MODEL=previous,model
if __name__ == '__main__':unittest.main()
