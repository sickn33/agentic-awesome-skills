"""Exercise actual published snippets with synthetic application adapters.

No external service calls. SDK/Scipy probes run separately in a recorded environment.
"""
import ast
import asyncio
from abc import ABC, abstractmethod
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sqlite3
import subprocess
import tempfile
import time
from types import SimpleNamespace as NS
import unittest
from typing import Any

ROOT = Path(__file__).resolve().parents[3]


def load_nodes(relative, names, namespace=None, fenced=False):
    source_path = ROOT / relative
    source = source_path.read_text()
    detailed_guide = source_path.parent / 'references' / 'detailed-guide.md'
    if source_path.name == 'SKILL.md' and detailed_guide.is_file():
        source += '\n' + detailed_guide.read_text()
    if fenced:
        source = '\n'.join(re.findall(r'```python\n(.*?)\n```', source, re.S))
    parsed = ast.parse(source)
    nodes = [node for node in parsed.body if isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names]
    if {node.name for node in nodes} != set(names):
        raise AssertionError('Published definitions missing')
    scope = dict(namespace or {})
    exec(compile(ast.Module(body=nodes, type_ignores=[]), relative, 'exec'), scope)
    return scope


def load_script(relative):
    spec = importlib.util.spec_from_file_location('content_helper', ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class PriorityExamples(unittest.TestCase):
    def test_observation_preserves_business_result_and_exception(self):
        observe = load_nodes('skills/error-diagnostics-error-analysis/resources/implementation-playbook.md', ['observe_call'], {'time': time}, fenced=True)['observe_call']
        events = []
        self.assertEqual(observe(lambda: 42, events.append), 42)
        self.assertEqual(events[0]['status'], 'ok')
        self.assertGreaterEqual(events[0]['duration_seconds'], 0)
        failure = RuntimeError('PRIVATE_CANARY')
        def fail(): raise failure
        with self.assertRaises(RuntimeError) as caught: observe(fail, events.append)
        self.assertIs(caught.exception, failure)
        self.assertNotIn('PRIVATE_CANARY', json.dumps(events))
        def broken_sink(event): raise ValueError('sink failed')
        self.assertEqual(observe(lambda: 42, broken_sink), 42)
        with self.assertRaises(RuntimeError) as caught: observe(fail, broken_sink)
        self.assertIs(caught.exception, failure)

    def test_mcp_inventory_rejects_duplicates_and_cursor_loops(self):
        scope = load_nodes('skills/mcp-builder/scripts/connections.py', ['MCPConnection'], {'ABC': ABC, 'abstractmethod': abstractmethod, 'Any': Any})
        class Fixture(scope['MCPConnection']):
            def _create_context(self): raise AssertionError('No transport in this fixture')
        fixture = Fixture()
        tool = NS(name='read', description=None, inputSchema={'type': 'object'})
        pages = [NS(tools=[tool], nextCursor='next'), NS(tools=[], nextCursor=None)]
        seen = []
        async def list_tools(cursor=None): seen.append(cursor); return pages[len(seen) - 1]
        fixture.session = NS(list_tools=list_tools)
        self.assertEqual(asyncio.run(fixture.list_tools())[0]['name'], 'read')
        self.assertEqual(seen, [None, 'next'])
        seen.clear(); pages[1] = NS(tools=[tool], nextCursor=None)
        with self.assertRaisesRegex(ValueError, 'duplicate'): asyncio.run(fixture.list_tools())
        seen.clear(); pages[1] = NS(tools=[], nextCursor='next')
        with self.assertRaisesRegex(ValueError, 'cursor'): asyncio.run(fixture.list_tools())
        seen.clear(); pages[0] = NS(tools=[NS(name=str(i), description='', inputSchema={}) for i in range(1001)], nextCursor=None)
        with self.assertRaisesRegex(ValueError, 'Oversized'): asyncio.run(fixture.list_tools())

    def test_text_diagnostics_empty_substrings_ties_and_no_score(self):
        brand = load_script('skills/content-creator/scripts/brand_voice_analyzer.py')
        seo = load_script('skills/content-creator/scripts/seo_optimizer.py')
        self.assertIn('Total Sentences: 0', brand.analyze_content('', 'text'))
        self.assertEqual(brand.BrandVoiceAnalyzer().analyze_text('they have shared')['voice_profile'], {})
        self.assertEqual(brand.BrandVoiceAnalyzer().analyze_text('hey therefore')['voice_profile']['formality']['dominant'], 'mixed')
        self.assertEqual(brand.BrandVoiceAnalyzer()._calculate_readability('One example.'), brand.BrandVoiceAnalyzer()._calculate_readability('One example'))
        optimizer = seo.SEOOptimizer()
        self.assertIsNone(optimizer.analyze('')['optimization_score'])
        self.assertIn('no ranking or quality score', seo.optimize_content(''))
        data = optimizer.analyze('# Database\n\nA database is not databases.', 'database')
        self.assertEqual(data['keyword_analysis']['primary_keyword']['count'], 2)
        self.assertTrue(data['keyword_analysis']['primary_keyword']['in_title'])
        self.assertTrue(data['keyword_analysis']['primary_keyword']['in_headings'])
        self.assertFalse(any('density' in rec for rec in data['recommendations']))

    def test_replanning_replaces_the_remaining_queue(self):
        cls = load_nodes('skills/llm-app-patterns/SKILL.md', ['PlanAndExecuteAgent'], fenced=True)['PlanAndExecuteAgent']
        agent = cls()
        agent.planner = NS(create_plan=lambda _: ['first', 'stale'], replan=lambda *args, **kwargs: ['replacement'])
        agent.executor = NS(execute=lambda step, **kwargs: step)
        agent._needs_replan = lambda task, results: len(results) == 1
        agent.synthesizer = NS(summarize=lambda task, results: results)
        self.assertEqual(agent.run('task'), ['first', 'replacement'])
        agent._needs_replan = lambda *args: True
        with self.assertRaisesRegex(RuntimeError, 'budget'):
            agent.run('task')

    def test_chain_uses_parser_and_empty_chain_fails(self):
        cls = load_nodes('skills/llm-app-patterns/SKILL.md', ['PromptChain'], {'llm': NS(generate=lambda _: '42')}, fenced=True)['PromptChain']
        step = {'name': 'number', 'prompt': '{input}', 'parser': int, 'output_key': 'answer'}
        self.assertEqual(cls([step]).run('question')['final_output'], 42)
        with self.assertRaises(ValueError):
            cls([])

    def test_cache_is_opt_in_and_bound_to_scope_and_parameters(self):
        class Store:
            def __init__(self): self.data = {}; self.reads = 0
            def get(self, key): self.reads += 1; return self.data.get(key)
            def setex(self, key, ttl, value): self.data[key] = value.encode()
        calls = []
        def generate(prompt, **kwargs): calls.append(prompt); return ''
        cls = load_nodes('skills/llm-app-patterns/SKILL.md', ['LLMCache'], {'hashlib': hashlib, 'json': json, 'llm': NS(generate=generate)}, fenced=True)['LLMCache']
        store = Store(); cache = cls(store)
        a = {'tenant': 'a', 'corpus': '1'}
        cache.get_or_generate('q', 'm', a)
        self.assertEqual(store.reads, 0); self.assertEqual(store.data, {})
        cache.get_or_generate('q', 'm', a, cache_allowed=True)
        cache.get_or_generate('q', 'm', a, cache_allowed=True)
        self.assertEqual(len(calls), 2, 'empty cached output is still a cache hit')
        cache.get_or_generate('q', 'm', {'tenant': 'b', 'corpus': '1'}, cache_allowed=True)
        cache.get_or_generate('q', 'm', a, cache_allowed=True, temperature=0)
        self.assertEqual(len(calls), 4)
        with self.assertRaises(ValueError): cache.get_or_generate('q', 'm', {})

    def test_refund_zero_never_reaches_provider_and_key_survives(self):
        calls = []
        def create(**kwargs): calls.append(kwargs); return kwargs
        refund = load_nodes('skills/stripe-integration/SKILL.md', ['create_refund'], {'stripe': NS(Refund=NS(create=create))}, fenced=True)['create_refund']
        for value in [0, -1, True, 2.5]:
            with self.assertRaises(ValueError): refund('pi_fixture', 'attempt_fixture', value)
        self.assertEqual(calls, [])
        self.assertEqual(refund('pi_fixture', 'attempt_fixture', 123)['amount'], 123)
        self.assertEqual(calls[0]['idempotency_key'], 'attempt_fixture')
        self.assertNotIn('amount', refund('pi_fixture', 'full_fixture'))

    def test_analytics_denominators_and_actual_wac_query(self):
        fn = load_nodes('skills/analytics-product/SKILL.md', ['ab_test_significance'], fenced=True)['ab_test_significance']
        for args in [(0, 0, 1, 10), (11, 10, 1, 10), (True, 10, 1, 10)]:
            with self.assertRaises(ValueError): fn(*args)
        self.assertEqual(fn(0, 10, 0, 10)['status'], 'insufficient-variation')
        source = (ROOT / 'skills/analytics-product/SKILL.md').read_text()
        query = re.search(r'SELECT COUNT\(\*\) as wac.*?qualifying_users', source, re.S).group()
        db = sqlite3.connect(':memory:')
        db.execute('CREATE TABLE conversations(user_id TEXT, created_at TEXT, duration_seconds INTEGER)')
        rows = [('A', '2026-09-02', 120)] * 3 + [('B', '2026-09-02', 120)] * 2 + [('C', '2026-09-02', 60)] * 4
        db.executemany('INSERT INTO conversations VALUES(?,?,?)', rows)
        result = db.execute(query, {'window_start': '2026-09-01', 'window_end': '2026-09-08'}).fetchall()
        self.assertEqual(result, [(1,)])
        db.close()

    def test_mcp_multiple_calls_full_batch_allowlist_and_error_privacy(self):
        source = 'skills/mcp-builder/scripts/evaluation.py'
        scope = load_nodes(source, ['agent_loop'], {'Anthropic': object, 'Any': object, 'asyncio': asyncio, 'time': time, 'json': json, 'EVALUATION_PROMPT': ''})
        calls = []; requests = []
        first = NS(stop_reason='tool_use', content=[NS(type='tool_use', id='a', name='read', input={}), NS(type='tool_use', id='b', name='read', input={})])
        last = NS(stop_reason='end_turn', content=[NS(type='text', text='<response>ok</response>')])
        def create(**kwargs): requests.append(kwargs); return first if len(requests) == 1 else last
        async def call(name, args): calls.append(name); return {'content': [{'type': 'text', 'text': 'fixture'}], 'structuredContent': {'ok': True}, 'isError': True}
        result, metrics = asyncio.run(scope['agent_loop'](NS(messages=NS(create=create)), 'fixture', 'q', [{'name': 'read'}], NS(call_tool=call)))
        self.assertEqual(calls, ['read', 'read']); self.assertEqual(metrics['read']['count'], 2)
        tool_results = requests[-1]['messages'][2]['content']
        self.assertEqual([item['tool_use_id'] for item in tool_results], ['a', 'b'])
        self.assertTrue(all(item['is_error'] for item in tool_results))
        self.assertIn('structuredContent', tool_results[0]['content'])
        first.content[1].name = 'write'
        requests.clear(); calls.clear()
        with self.assertRaisesRegex(ValueError, 'outside'):
            asyncio.run(scope['agent_loop'](NS(messages=NS(create=create)), 'fixture', 'q', [{'name': 'read'}], NS(call_tool=call)))
        self.assertEqual(calls, [], 'preflight all calls before invoking the first')
        first.content = [first.content[0]]; requests.clear()
        async def failure(*args): raise RuntimeError('PRIVATE_CANARY')
        asyncio.run(scope['agent_loop'](NS(messages=NS(create=create)), 'fixture', 'q', [{'name': 'read'}], NS(call_tool=failure)))
        self.assertNotIn('PRIVATE_CANARY', requests[-1]['messages'][2]['content'][0]['content'])
        perpetual = NS(messages=NS(create=lambda **kwargs: first))
        calls.clear()
        with self.assertRaisesRegex(ValueError, 'round budget'):
            asyncio.run(scope['agent_loop'](perpetual, 'fixture', 'q', [{'name': 'read'}], NS(call_tool=call)))
        self.assertEqual(len(calls), 8)

    def test_polluter_helper_does_not_report_failed_tests_as_clean(self):
        if os.name == 'nt': self.skipTest('Bash helper supports POSIX environments only')
        script = ROOT / 'skills/systematic-debugging/find-polluter.sh'
        with tempfile.TemporaryDirectory(prefix='aas-polluter-probe-') as tmp:
            cwd = Path(tmp); bindir = cwd / 'bin'; bindir.mkdir()
            runner = bindir / 'npm'; runner.write_text('#!/bin/sh\n[ "$1" = test ] || exit 9\n[ "$2" = -- ] || exit 9\n[ "$3" = "test with spaces.js" ] || exit 9\nif [ "$PROBE_MODE" = pollution ]; then touch pollution; fi\nif [ "$PROBE_MODE" = failed ]; then exit 7; fi\n')
            runner.chmod(0o700)
            env = {**os.environ, 'PATH': str(bindir) + os.pathsep + os.environ['PATH']}
            def run(mode='clean'):
                return subprocess.run(['bash', str(script), 'pollution', '*.js'], cwd=cwd, env={**env, 'PROBE_MODE': mode}, text=True, capture_output=True, timeout=10)
            self.assertEqual(run().returncode, 2)
            (cwd / 'test with spaces.js').touch()
            self.assertEqual(run().returncode, 0)
            self.assertEqual(run('failed').returncode, 2)
            self.assertEqual(run('pollution').returncode, 1)
            self.assertTrue((cwd / 'pollution').exists())
            self.assertEqual(run().returncode, 2, 'existing pollution must not be removed')


if __name__ == '__main__': unittest.main()
