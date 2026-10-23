"""Offline regression checks for local export privacy and fail-closed analysis."""
import importlib
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3] / 'skills' / 'second-deposit-igaming' / 'scripts'
sys.path.insert(0, str(ROOT))
c, i, g, x, a = [importlib.import_module(n) for n in ('sd_common', 'sd_inspect', 'sd_geo', 'sd_xlsx', 'sd_analyze')]


class ExportReviewTests(unittest.TestCase):
    def test_preview_never_emits_raw_categories(self):
        for name, values in [('source_email', ['private@example.test'] * 2), ('amount', ['123'] * 2), ('custom', ['private'] * 2)]:
            self.assertNotIn('значения', i.kind_of(name, values)[1])

    def test_nonfinite_and_invalid_timezone_rejected(self):
        self.assertIsNone(c.parse_amount('1e999'))
        for value in [float('nan'), float('inf'), 15, '+12:99']:
            with self.assertRaises(c.MappingError):
                c.parse_tz(value)
        self.assertIsNone(c.parse_time('2026-10-01T12:00+12:99'))

    def test_unknown_rules_never_authorize_method(self):
        self.assertFalse(g.allowed(None, 'BR', 'card'))
        self.assertFalse(g.allowed({'countries': {'BR': {}}}, 'BR', None))
        self.assertEqual(a.csv_safe('=1+1'), "'=1+1")

    def test_excel_name_and_missing_sheet(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.xlsx'
            sheet = x.Sheet('a"b')
            sheet.row('value')
            sheet.row('=1+1')
            x.write(path, [sheet])
            self.assertEqual(c.list_sheets(str(path)), ['a"b'])
            self.assertEqual(c.read_xlsx(str(path), 'a"b')[1], [['=1+1']])
            with self.assertRaises(c.MappingError):
                c.read_xlsx(str(path), 'missing')
            bad = x.Sheet('bad')
            bad.row(float('nan'))
            with self.assertRaises(ValueError):
                x.write(Path(folder) / 'bad.xlsx', [bad])


if __name__ == '__main__':
    unittest.main()
