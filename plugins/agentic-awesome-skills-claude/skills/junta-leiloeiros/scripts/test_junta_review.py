"""Offline regression fixtures; no external network, browser or personal data."""
import asyncio
import contextlib
import csv
import importlib
import importlib.util
import io
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).parent))
from scraper.base_scraper import AbstractJuntaScraper, should_verify_tls
from db import Database
from private_state import new_export


class FixtureScraper(AbstractJuntaScraper):
    estado='XX';junta='FIXTURE';url='https://fixture.gov.br/registry'
    rate_limit=0
    async def parse_leiloeiros(self):
        return [self.make_leiloeiro(nome='Fixture Identified',matricula='123',situacao='Irregular',
                                   email='fixture@example.invalid'),
                self.make_leiloeiro(nome='Unverified menu title')]


class ReviewTests(unittest.TestCase):
    def test_adverse_status_cannot_become_active(self):
        for raw in ['Irregular','Atuante Irregular','INATIVO','Não regular','Registro Suspenso']:
            self.assertNotEqual(AbstractJuntaScraper.normalize_situacao(raw),'ATIVO')
        self.assertEqual(AbstractJuntaScraper.normalize_situacao('Regular'),'ATIVO')
        self.assertEqual(AbstractJuntaScraper.normalize_situacao('Registro Suspenso'),'SUSPENSO')
        with patch.dict(os.environ,{'JUNTA_INSECURE_TLS':'1'}):
            self.assertTrue(should_verify_tls())

    def test_candidates_and_contacts_remain_unverified(self):
        with patch.dict(os.environ,{},clear=True):
            scraper=FixtureScraper()
            rows=asyncio.run(scraper.scrape())
            self.assertEqual(len(rows),1)
            self.assertEqual(scraper.unverified_candidates,1)
            self.assertIsNone(rows[0].email)
            self.assertEqual(rows[0].situacao,'IRREGULAR')

    def test_destination_and_response_bounds(self):
        with patch.dict(os.environ,{},clear=True):
            for url in ['http://fixture.gov.br','https://evil.example/registry',
                        'https://fixture.gov.br@evil.example','file:///etc/passwd']:
                with self.assertRaises(ValueError):FixtureScraper.checked_url(url)
        class Response:
            status_code=200
            closed=False
            async def aiter_bytes(self):
                yield b'x'*(10*1024*1024)
                yield b'x'
            async def aclose(self):self.closed=True
        response=Response()
        with self.assertRaises(ValueError):asyncio.run(FixtureScraper().bounded_response(response))
        self.assertTrue(response.closed)

    def test_database_closes_and_private_identity_is_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp).resolve()/'private'
            db=Database(directory/'registry.db')
            self.assertFalse(directory.exists(),'constructor must not create state')
            connections=[]
            class Observed(sqlite3.Connection):
                closed=False
                def close(self):self.closed=True;super().close()
            original=sqlite3.connect
            def connect(*args,**kwargs):
                connection=original(*args,**kwargs,factory=Observed)
                connections.append(connection);return connection
            with patch('sqlite3.connect',side_effect=connect):
                db.init()
                record=FixtureScraper().make_leiloeiro(nome='Fixture',matricula='1',situacao='REGULAR').to_dict()
                db.upsert_many([record]);record['situacao']='IRREGULAR';db.upsert_many([record])
                self.assertEqual(db.get_total(),1)
                self.assertEqual(db.get_all()[0]['situacao'],'IRREGULAR')
            self.assertTrue(all(c.closed for c in connections))
            self.assertEqual(db.db_path.stat().st_mode & 0o777,0o600)
            self.assertEqual(directory.stat().st_mode & 0o777,0o700)
            link=directory/'linked.db';link.symlink_to(db.db_path)
            with self.assertRaises(ValueError):Database(link).init()

    def test_exports_are_exclusive_and_formula_safe(self):
        spec=importlib.util.spec_from_file_location('junta_export',Path(__file__).with_name('export.py'))
        export=importlib.util.module_from_spec(spec);spec.loader.exec_module(export)
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp).resolve()/'exports'
            rows=[{'nome':'=1+1','matricula':'123'}]
            with contextlib.redirect_stdout(io.StringIO()):
                first=export.export_csv(rows,out,'_SP')
                second=export.export_csv(rows,out,'_SP')
            self.assertNotEqual(first,second)
            self.assertTrue(first.exists() and second.exists())
            self.assertEqual(first.stat().st_mode & 0o777,0o600)
            with first.open(encoding='utf-8-sig') as handle:
                self.assertEqual(next(csv.DictReader(handle))['nome'],"'=1+1")
            with self.assertRaises(ValueError):new_export(out,'/escape','json')


if __name__=='__main__':unittest.main()
