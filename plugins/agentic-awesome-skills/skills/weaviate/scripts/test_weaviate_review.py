"""Offline pure-function regressions using inert SDK doubles, no live connection."""
import ast
import contextlib
from datetime import datetime, timezone
import io
import json
import math
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import types
from typing import Any, Optional, Iterator
import unittest
from unittest.mock import patch
from urllib.parse import urlsplit

ROOT = Path(__file__).parent


def functions(file, names, **provided):
    tree = ast.parse((ROOT/file).read_text())
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    for node in nodes:
        node.decorator_list = []
    ns = dict(globals(), **provided)
    exec(compile(ast.Module(body=nodes,type_ignores=[]),str(ROOT/file),'exec'),ns)
    return types.SimpleNamespace(**{name:ns[name] for name in names})


class DummyFilter:
    @staticmethod
    def all_of(values): return ('and',values)
    @staticmethod
    def any_of(values): return ('or',values)
    @staticmethod
    def by_property(prop):
        return types.SimpleNamespace(**{name:(lambda value, n=name:(prop,n,value))
                    for name in ['equal','not_equal','less_than','less_or_equal',
                                 'greater_than','greater_or_equal','like',
                                 'contains_any','contains_all','is_none']})


DT = types.SimpleNamespace(**{name:name for name in ['TEXT','UUID','BLOB','INT','NUMBER',
    'BOOL','DATE','INT_ARRAY','NUMBER_ARRAY','BOOL_ARRAY','DATE_ARRAY','TEXT_ARRAY',
    'UUID_ARRAY','OBJECT','OBJECT_ARRAY','GEO_COORDINATES','PHONE_NUMBER']})


def importer():
    return functions('import.py',['strict_json','mapped_object','check_input','read_json',
        'read_jsonl','convert_types','import_objects'],DataType=DT,
        MAX_INPUT_BYTES=50*1024*1024,MAX_OBJECTS=10000,
        _DATE_RE=re.compile(r'^\d{4}-\d{2}-\d{2}$'),
        _DATETIME_RE=re.compile(r'^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}$'),
        _RESERVED_FIELDS={'id','_additional'},_KEEP_AS_STRING={DT.TEXT,DT.UUID,DT.BLOB})


class ReviewTests(unittest.TestCase):
    def test_filters_fail_closed(self):
        m=functions('fetch_filter.py',['parse_filter_item','parse_filters'],Filter=DummyFilter)
        for data in [None,[],{}, {'operator':'and','filters':[]},
                     {'property':'price','operator':'typo','value':5},
                     {'property':'x','operator':'is_none','value':'false'},
                     [{'property':'x','operator':'equal','value':1},None]]:
            with self.assertRaises(ValueError):m.parse_filter_item(data)
        self.assertEqual(m.parse_filter_item({'property':'x','operator':'is_none','value':False}),('x','is_none',False))

    def test_mapping_and_json_do_not_silently_drop_fields(self):
        m=importer()
        with self.assertRaises(ValueError):m.strict_json('{"a":1,"a":2}')
        with self.assertRaises(ValueError):m.strict_json('{"a":NaN}')
        with self.assertRaises(ValueError):m.mapped_object({'a':1,'b':2},{'a':'b'})
        with self.assertRaises(ValueError):m.mapped_object([1],None)
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp).resolve()/'source.json'
            path.write_text('[{"value":1}]')
            self.assertEqual(m.read_json(path),[{'value':1}])
            link=path.with_name('linked.json');link.symlink_to(path)
            with self.assertRaises(ValueError):m.read_json(link)

    def test_conversions_reject_corrupting_inputs(self):
        m=importer()
        for value,kind in [(1.5,DT.INT),('nan',DT.NUMBER),('["maybe"]',DT.BOOL_ARRAY),
                           ('2026-01-01T12:00:00',DT.DATE),(False,DT.INT)]:
            with self.assertRaises(ValueError):m.convert_types({'field':value},{'field':kind})
        self.assertEqual(m.convert_types({'field':'[true,false]'},{'field':DT.BOOL_ARRAY}),{'field':[True,False]})
        self.assertEqual(m.convert_types({'field':'2026-01-01'},{'field':DT.DATE}),{'field':'2026-01-01T00:00:00+00:00'})
        with self.assertRaises(ValueError):m.convert_types({'unknown':1},{})

    def test_import_counts_local_and_server_failures_once(self):
        m=importer()
        class Batch:
            failed_objects=[]
            def fixed_size(self,batch_size):
                self.size=batch_size;return self
            def __enter__(self):return self
            def __exit__(self,*args):self.failed_objects=[types.SimpleNamespace(message='private-source-data')]
            def add_object(self,properties):pass
        batch=Batch();coll=types.SimpleNamespace(batch=batch)
        with contextlib.redirect_stderr(io.StringIO()):
            total,success,failed,errors=m.import_objects(coll,iter([{'n':'1'},{'n':'bad'},{'n':'2'}]),{'n':DT.INT},set(),2)
        self.assertEqual((total,success,failed),(3,1,2))
        self.assertEqual(batch.size,2)
        self.assertNotIn('private-source-data',str(errors))

    def test_cloud_destination_and_header_boundaries(self):
        m=functions('weaviate_conn.py',['validate_destination','validate_headers'],API_KEY_MAP={'OPENAI_API_KEY':'X-OpenAI-Api-Key'})
        with patch.dict(os.environ,{},clear=True):
            self.assertEqual(m.validate_destination('https://a.weaviate.cloud/'),'https://a.weaviate.cloud')
            for url in ['http://a.weaviate.cloud','https://a.weaviate.cloud.evil.test',
                        'https://user:secret@a.weaviate.cloud','https://a.weaviate.cloud/path']:
                with self.assertRaises(ValueError):m.validate_destination(url)
        with self.assertRaises(ValueError):m.validate_headers({'Authorization':'private'})
        with self.assertRaises(ValueError):m.validate_headers({'X-OpenAI-Api-Key':'x\r\nInjected: yes'})

    def test_example_dates_are_source_dates(self):
        m=functions('example_data.py',['actual_date'])
        self.assertEqual(m.actual_date('2024-05-06').isoformat(),'2024-05-06T00:00:00+00:00')
        self.assertEqual(m.actual_date('2025-07-08').year,2025)
        with self.assertRaises(ValueError):m.actual_date('2026-01-01T12:00:00')


if __name__=='__main__':unittest.main()
