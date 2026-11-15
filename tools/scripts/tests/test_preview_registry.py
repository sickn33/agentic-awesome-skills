import pathlib
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import preview_registry as registry


class PreviewTests(unittest.TestCase):
    def test_one_fresh_report_shared_only_within_ordered_invocation(self):
        report = {"skills": [], "summary": {}}
        events = []
        with patch.object(registry, 'sync_plugin_compatibility', side_effect=lambda r: events.append('analyze') or report), \
             patch.object(registry, 'generate_index', side_effect=lambda *a, **kw: events.append(('index', kw['compatibility_report'] is report))), \
             patch.object(registry, 'mirror_canonical_index', side_effect=lambda p: events.append('mirror')), \
             patch.object(registry, 'sync_editorial_bundles', side_effect=lambda *a, **kw: events.append(('bundles', kw['compatibility_report'] is report))):
            registry.preview(pathlib.Path('/fixture'))
            registry.preview(pathlib.Path('/fixture'))
        self.assertEqual(events, ['analyze', ('index', True), 'mirror', ('bundles', True)] * 2)

    def test_failure_prevents_dependent_outputs(self):
        with patch.object(registry, 'sync_plugin_compatibility', side_effect=ValueError('bad input')), \
             patch.object(registry, 'generate_index') as index, patch.object(registry, 'sync_editorial_bundles') as bundles:
            with self.assertRaises(ValueError):
                registry.preview(pathlib.Path('/fixture'))
            index.assert_not_called()
            bundles.assert_not_called()


if __name__ == '__main__':
    unittest.main()
