"""Pure input/schema regressions: no Azure dependencies, identity or network."""
import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[3] / 'skills/azure-ai-projects-py/scripts/run_batch_evaluation.py'
spec = importlib.util.spec_from_file_location('azure_projects_review', SOURCE)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

class AzureProjectsReviewTests(unittest.TestCase):
    def test_agent_build_preserves_input_and_structured_sample(self):
        data = [{'query': 'synthetic', 'output_text': 'answer', 'output_items': [{'type': 'message'}]}]
        before = copy.deepcopy(data)
        source = m.build_data_source(data, is_agent=True)
        config = m.build_data_source_config(data, is_agent=True)
        self.assertEqual(data, before)
        self.assertEqual(source['source']['content'][0]['sample']['output_items'], before[0]['output_items'])
        self.assertEqual(config['item_schema']['required'], ['query'])
        self.assertTrue(config['include_sample_schema'])

    def test_schema_preserves_types_and_rejects_inconsistent_rows(self):
        data = [{'response': 'answer', 'count': 1, 'flag': True, 'tags': ['one']}]
        properties = m.build_data_source_config(data)['item_schema']['properties']
        self.assertEqual(properties['count']['type'], 'integer')
        self.assertEqual(properties['flag']['type'], 'boolean')
        self.assertEqual(properties['tags']['type'], 'array')
        with self.assertRaises(ValueError):
            m.build_data_source_config([{'response': 'one'}, {'response': 1}])

    def test_bounded_jsonl_validation(self):
        with tempfile.TemporaryDirectory() as td:
            p = Path(td) / 'input.jsonl'
            for raw in ['[]', '{"query":"a","query":"b"}', '{"score":NaN}']:
                p.write_text(raw)
                with self.assertRaises(ValueError): m.load_jsonl(str(p))
            p.write_text('{"query":"a"}\n{"query":"b"}\n')
            with self.assertRaises(ValueError): m.load_jsonl(str(p), max_rows=1)
            with self.assertRaises(ValueError): m.load_jsonl(str(p), max_bytes=1)
            self.assertEqual(len(m.load_jsonl(str(p))), 2)

    def test_cloud_opt_in_precedes_all_other_work(self):
        with self.assertRaises(PermissionError):
            m.run_evaluation('https://untrusted.invalid', '/missing', ['unknown'], 'deployment')

    def test_evaluator_mapping_and_unknown_rejection(self):
        criteria = m.build_testing_criteria(['coherence', 'task_adherence'], 'approved', is_agent=True)
        self.assertEqual(criteria[0]['data_mapping']['response'], '{{sample.output_text}}')
        self.assertEqual(criteria[1]['data_mapping']['response'], '{{sample.output_items}}')
        self.assertEqual(m.build_testing_criteria(['f1'], '')[0]['evaluator_name'], 'builtin.f1_score')
        with self.assertRaises(ValueError): m.build_testing_criteria(['not-an-evaluator'], 'approved')

    def test_endpoint_rejects_credential_and_destination_confusion(self):
        m.validate_endpoint('https://approved.services.ai.azure.com/api/projects/example')
        for url in ['http://approved.services.ai.azure.com/api/projects/example',
                    'https://approved.services.ai.azure.com.evil.invalid/api/projects/example',
                    'https://user:secret@approved.services.ai.azure.com/api/projects/example',
                    'https://approved.services.ai.azure.com/api/projects/example?token=secret']:
            with self.assertRaises(ValueError): m.validate_endpoint(url)

if __name__ == '__main__': unittest.main()
