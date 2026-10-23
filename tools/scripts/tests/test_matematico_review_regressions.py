"""Offline regressions for the reviewed, inert Kotlin metric helpers."""
import os
from pathlib import Path
import runpy
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / 'skills' / 'matematico-tao' / 'scripts'
COMPLEXITY = runpy.run_path(str(SCRIPTS / 'complexity_analyzer.py'))
GRAPH = runpy.run_path(str(SCRIPTS / 'dependency_graph.py'))


class ReviewedMathHelpers(unittest.TestCase):
    def graph(self, names):
        graph = GRAPH['DependencyGraph']()
        for name in names:
            graph.add_node(GRAPH['Node'](name, 'fixture', 'fixture', 'class'))
        return graph

    def test_duplicate_edges_do_not_create_false_cycle_and_rank_retains_mass(self):
        graph = self.graph(['a', 'b', 'c'])
        for source, target in [('a', 'b'), ('a', 'b'), ('b', 'c')]:
            graph.add_edge(GRAPH['Edge'](source, target, 'imports'))
        self.assertEqual(graph.topological_sort(), ['a', 'b', 'c'])
        self.assertAlmostEqual(sum(graph.page_rank().values()), 1.0)
        self.assertAlmostEqual(graph.betweenness_centrality()['b'], 0.5)
        graph.add_edge(GRAPH['Edge']('c', 'c', 'imports'))
        self.assertIsNone(graph.topological_sort())
        self.assertTrue(graph.find_cycles())

    def test_lexical_mask_and_expression_body_do_not_consume_next_function(self):
        with tempfile.TemporaryDirectory() as directory:
            previous = Path.cwd()
            try:
                os.chdir(directory)
                source = Path('example.kt')
                source.write_text('''// fun fake() { if (x) {} }
fun expression() = "if { while }"
fun actual() { if (true) {} else if (false) {} }
''', encoding='utf-8')
                analyzer = COMPLEXITY['KotlinComplexityAnalyzer']('.')
                analyzer.analyze()
                functions = analyzer.metrics[0].functions
                self.assertEqual([item.name for item in functions], ['expression', 'actual'])
                self.assertEqual([item.cyclomatic for item in functions], [1, 3])
                analyzer.analyze()
                self.assertEqual(len(analyzer.metrics), 1)
                with self.assertRaises(ValueError):
                    COMPLEXITY['safe_user_path']('../outside.json')
                Path('escape.kt').symlink_to(ROOT / 'skills' / 'matematico-tao' / 'SKILL.md')
                analyzer.analyze()
                self.assertEqual(len(analyzer.metrics), 1)
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
