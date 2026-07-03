#!/usr/bin/env python3
"""
Prof. Euler — Dependency Graph Analyzer
Gera grafo de dependências de projetos Kotlin/Android com análise matemática
de grafos: componentes, ciclos, centralidade, instabilidade.

Uso:
  python dependency_graph.py [path] [--format dot|json|text] [--output FILE]
  python dependency_graph.py C:/Users/renat/earbudllm
  python dependency_graph.py C:/Users/renat/earbudllm --format dot --output deps.dot
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path
from dataclasses import dataclass, field
from typing import Dict, List, Set, Optional, Tuple

# Fix Windows terminal encoding (cp1252 doesn't support emojis/unicode)
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass  # Python < 3.7 fallback
from collections import defaultdict, deque


@dataclass
class Node:
    id: str
    module: str
    package: str
    kind: str  # 'class', 'interface', 'object', 'enum', 'data class'
    is_abstract: bool = False
    is_open: bool = False


@dataclass
class Edge:
    src: str   # node id
    dst: str   # node id
    kind: str  # 'implements', 'extends', 'uses', 'imports', 'delegates_to'
    weight: float = 1.0


class DependencyGraph:
    """Grafo de dependências com análise matemática completa."""

    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        self._adj: Dict[str, Set[str]] = defaultdict(set)    # adjacência direta
        self._radj: Dict[str, Set[str]] = defaultdict(set)   # adjacência reversa

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node

    def add_edge(self, edge: Edge) -> None:
        if edge.src != edge.dst:  # sem self-loops
            self.edges.append(edge)
            self._adj[edge.src].add(edge.dst)
            self._radj[edge.dst].add(edge.src)

    def successors(self, node_id: str) -> Set[str]:
        return self._adj.get(node_id, set())

    def predecessors(self, node_id: str) -> Set[str]:
        return self._radj.get(node_id, set())

    # ─── Algoritmos de Grafos ────────────────────────────────────────────────

    def find_cycles(self) -> List[List[str]]:
        """Detecta ciclos usando DFS com coloração (branco/cinza/preto)."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n: WHITE for n in self.nodes}
        cycles = []
        path = []

        def dfs(node: str) -> None:
            color[node] = GRAY
            path.append(node)

            for neighbor in self._adj.get(node, set()):
                if neighbor not in self.nodes:
                    continue
                if color[neighbor] == GRAY:
                    # Ciclo encontrado! Extrair o ciclo do path
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                elif color[neighbor] == WHITE:
                    dfs(neighbor)

            path.pop()
            color[node] = BLACK

        for node in list(self.nodes.keys()):
            if color[node] == WHITE:
                dfs(node)

        # Deduplicar ciclos
        unique = []
        seen = set()
        for cycle in cycles:
            key = frozenset(cycle)
            if key not in seen:
                seen.add(key)
                unique.append(cycle)

        return unique

    def strongly_connected_components(self) -> List[List[str]]:
        """Algoritmo de Kosaraju para SCCs."""
        visited = set()
        finish_order = []

        def dfs1(node: str) -> None:
            visited.add(node)
            for neighbor in self._adj.get(node, set()):
                if neighbor in self.nodes and neighbor not in visited:
                    dfs1(neighbor)
            finish_order.append(node)

        def dfs2(node: str, component: List[str]) -> None:
            visited.add(node)
            component.append(node)
            for neighbor in self._radj.get(node, set()):
                if neighbor in self.nodes and neighbor not in visited:
                    dfs2(neighbor, component)

        # Fase 1: DFS no grafo original
        for node in self.nodes:
            if node not in visited:
                dfs1(node)

        # Fase 2: DFS no grafo transposto na ordem inversa de finalização
        visited.clear()
        sccs = []
        for node in reversed(finish_order):
            if node not in visited:
                component = []
                dfs2(node, component)
                sccs.append(component)

        return sccs

    def topological_sort(self) -> Optional[List[str]]:
        """Ordenação topológica (só válida se DAG)."""
        in_degree = defaultdict(int)
        for edge in self.edges:
            if edge.src in self.nodes and edge.dst in self.nodes:
                in_degree[edge.dst] += 1

        queue = deque([n for n in self.nodes if in_degree[n] == 0])
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in self._adj.get(node, set()):
                if neighbor in self.nodes:
                    in_degree[neighbor] -= 1
                    if in_degree[neighbor] == 0:
                        queue.append(neighbor)

        if len(result) == len(self.nodes):
            return result
        return None  # Há ciclos → não é DAG

    def betweenness_centrality(self) -> Dict[str, float]:
        """
        Centralidade de betweenness: nós que fazem "ponte" entre outros.
        Alto betweenness = single point of failure.

        Algoritmo de Brandes: O(V·E)
        """
        betweenness = defaultdict(float)
        nodes = list(self.nodes.keys())

        for s in nodes:
            # BFS para encontrar caminhos mais curtos de s para todos
            stack = []
            pred = defaultdict(list)
            sigma = defaultdict(int)
            sigma[s] = 1
            dist = defaultdict(lambda: -1)
            dist[s] = 0
            queue = deque([s])

            while queue:
                v = queue.popleft()
                stack.append(v)
                for w in self._adj.get(v, set()):
                    if w not in self.nodes:
                        continue
                    if dist[w] < 0:
                        queue.append(w)
                        dist[w] = dist[v] + 1
                    if dist[w] == dist[v] + 1:
                        sigma[w] += sigma[v]
                        pred[w].append(v)

            # Acumulação
            delta = defaultdict(float)
            while stack:
                w = stack.pop()
                for v in pred[w]:
                    if sigma[w] > 0:
                        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w])
                if w != s:
                    betweenness[w] += delta[w]

        # Normalizar
        n = len(nodes)
        if n > 2:
            factor = 2 / ((n - 1) * (n - 2))
            for node in betweenness:
                betweenness[node] *= factor

        return dict(betweenness)

    def page_rank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank para identificar classes/módulos mais "importantes".
        Nodes com alto PageRank são frequentemente usados por outros.
        """
        n = len(self.nodes)
        if n == 0:
            return {}

        rank = {node: 1.0 / n for node in self.nodes}

        for _ in range(iterations):
            new_rank = {}
            for node in self.nodes:
                incoming_sum = sum(
                    rank.get(pred, 0) / max(len(self._adj.get(pred, set())), 1)
                    for pred in self._radj.get(node, set())
                    if pred in self.nodes
                )
                new_rank[node] = (1 - damping) / n + damping * incoming_sum
            rank = new_rank

        return rank

    def coupling_metrics(self) -> Dict[str, Dict]:
        """Calcula Ca, Ce, instabilidade e abstração por módulo."""
        module_nodes: Dict[str, Set[str]] = defaultdict(set)
        for node_id, node in self.nodes.items():
            module_nodes[node.module].add(node_id)

        metrics = {}
        for module, nodes in module_nodes.items():
            # Ce: dependências efetivas (de fora do módulo)
            efferent = set()
            for n in nodes:
                for dep in self._adj.get(n, set()):
                    if dep in self.nodes and self.nodes[dep].module != module:
                        efferent.add(self.nodes[dep].module)

            # Ca: acoplamentos aferentes
            afferent = set()
            for n in nodes:
                for dep in self._radj.get(n, set()):
                    if dep in self.nodes and self.nodes[dep].module != module:
                        afferent.add(self.nodes[dep].module)

            ca = len(afferent)
            ce = len(efferent)
            instability = ce / (ca + ce) if (ca + ce) > 0 else 0.0

            # Abstração: razão de interfaces/abstratas para total
            abstracts = sum(1 for n in nodes if
                            n in self.nodes and
                            (self.nodes[n].is_abstract or self.nodes[n].kind == 'interface'))
            abstraction = abstracts / max(len(nodes), 1)

            # Distância da sequência principal: D = |A + I - 1|
            # Sequência principal: A + I = 1 (ideal)
            distance = abs(abstraction + instability - 1)

            metrics[module] = {
                'Ca': ca,
                'Ce': ce,
                'instability': round(instability, 3),
                'abstraction': round(abstraction, 3),
                'distance_from_main_sequence': round(distance, 3),
                'total_classes': len(nodes),
                'abstract_classes': abstracts,
                'depends_on_modules': list(efferent),
                'used_by_modules': list(afferent),
            }

        return metrics


class ProjectAnalyzer:
    """Analisa um projeto Kotlin/Android completo."""

    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.graph = DependencyGraph()
        self.module_files: Dict[str, List[Path]] = defaultdict(list)

    def analyze(self) -> None:
        """Analisa todos os arquivos Kotlin."""
        kt_files = list(self.project_root.glob("**/*.kt"))

        for kt_file in kt_files:
            module = self._detect_module(kt_file)
            self.module_files[module].append(kt_file)
            self._analyze_file(kt_file, module)

    def _detect_module(self, file_path: Path) -> str:
        known = ['app', 'bluetooth', 'audio', 'voice', 'llm', 'integrations', 'core-logging']
        for part in file_path.parts:
            if part in known:
                return part
        return 'unknown'

    def _analyze_file(self, file_path: Path, module: str) -> None:
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            return

        # Extrair package
        pkg_match = re.search(r'^package\s+(.+)$', content, re.MULTILINE)
        package = pkg_match.group(1).strip() if pkg_match else 'unknown'

        # Extrair declarações de classe/interface/object
        class_patterns = [
            (r'(?:abstract\s+)?(?:open\s+)?(?:data\s+)?class\s+(\w+)', 'class'),
            (r'interface\s+(\w+)', 'interface'),
            (r'object\s+(\w+)', 'object'),
            (r'enum\s+class\s+(\w+)', 'enum'),
        ]

        for pattern, kind in class_patterns:
            for match in re.finditer(pattern, content):
                class_name = match.group(1)
                node_id = f"{package}.{class_name}"
                is_abstract = 'abstract' in content[max(0, match.start()-20):match.start()]
                is_open = 'open' in content[max(0, match.start()-10):match.start()]

                node = Node(
                    id=node_id,
                    module=module,
                    package=package,
                    kind=kind,
                    is_abstract=is_abstract,
                    is_open=is_open
                )
                self.graph.add_node(node)

                # Extrair dependências via imports
                imports = re.findall(r'^import\s+(.+)$', content, re.MULTILINE)
                for imp in imports:
                    imp = imp.strip()
                    if imp.startswith('com.earllm'):
                        dep_id = imp
                        if dep_id != node_id:
                            edge = Edge(src=node_id, dst=dep_id, kind='imports')
                            self.graph.add_edge(edge)

    def generate_full_report(self) -> Dict:
        """Gera relatório matemático completo do grafo."""
        cycles = self.graph.find_cycles()
        sccs = self.graph.strongly_connected_components()
        topo = self.graph.topological_sort()
        betweenness = self.graph.betweenness_centrality()
        pagerank = self.graph.page_rank()
        coupling = self.graph.coupling_metrics()

        # Top nodes por betweenness (single points of failure)
        top_betweenness = sorted(
            betweenness.items(), key=lambda x: x[1], reverse=True
        )[:10]

        # Top nodes por pagerank (mais influentes)
        top_pagerank = sorted(
            pagerank.items(), key=lambda x: x[1], reverse=True
        )[:10]

        # SCCs com mais de 1 nó (ciclos reais)
        real_sccs = [scc for scc in sccs if len(scc) > 1]

        return {
            'graph_summary': {
                'nodes': len(self.graph.nodes),
                'edges': len(self.graph.edges),
                'is_dag': topo is not None,
                'cycles_found': len(cycles),
                'strongly_connected_components': len(real_sccs),
            },
            'cycles': cycles[:10],  # primeiros 10 ciclos
            'real_sccs': real_sccs[:5],
            'topological_order': topo[:20] if topo else None,
            'top_betweenness_centrality': [
                {'node': n, 'betweenness': round(b, 4)} for n, b in top_betweenness
            ],
            'top_pagerank': [
                {'node': n, 'pagerank': round(pr, 4)} for n, pr in top_pagerank
            ],
            'module_coupling': coupling,
            'modules': {mod: len(files) for mod, files in self.module_files.items()},
        }

    def to_dot(self) -> str:
        """Exporta grafo em formato DOT para visualização (Graphviz)."""
        lines = ['digraph AuriDependencies {']
        lines.append('  rankdir=LR;')
        lines.append('  node [shape=box, fontname="Arial"];')

        # Cores por módulo
        module_colors = {
            'app': '#4CAF50',
            'bluetooth': '#2196F3',
            'audio': '#FF9800',
            'voice': '#9C27B0',
            'llm': '#F44336',
            'integrations': '#00BCD4',
            'core-logging': '#607D8B',
        }

        # Adicionar nós por módulo
        modules_seen = defaultdict(list)
        for node_id, node in self.graph.nodes.items():
            modules_seen[node.module].append((node_id, node))

        for module, nodes in modules_seen.items():
            color = module_colors.get(module, '#9E9E9E')
            lines.append(f'  subgraph cluster_{module.replace("-", "_")} {{')
            lines.append(f'    label="{module}";')
            lines.append(f'    style=filled;')
            lines.append(f'    fillcolor="{color}20";')  # 20 = ~12% opacity
            for node_id, node in nodes[:20]:  # limitar para visualização
                short_name = node_id.split('.')[-1]
                shape = 'diamond' if node.kind == 'interface' else 'box'
                lines.append(f'    "{node_id}" [label="{short_name}", shape={shape}];')
            lines.append('  }')

        # Adicionar arestas (amostra)
        for edge in self.edges[:100]:  # limitar para visualização
            lines.append(f'  "{edge.src}" -> "{edge.dst}" [label="{edge.kind}"];')

        lines.append('}')
        return '\n'.join(lines)

    @property
    def edges(self):
        return self.graph.edges

    def print_report(self, report: Dict) -> None:
        print("\n" + "="*70)
        print("  PROF. EULER — ANÁLISE DE GRAFOS DE DEPENDÊNCIAS")
        print("="*70)

        gs = report['graph_summary']
        print(f"\n📊 RESUMO DO GRAFO G = (V={gs['nodes']}, E={gs['edges']}):")
        print(f"  É DAG (sem ciclos):          {'✅ SIM' if gs['is_dag'] else '❌ NÃO'}")
        print(f"  Ciclos detectados:           {gs['cycles_found']}")
        print(f"  SCCs com mais de 1 nó:       {gs['strongly_connected_components']}")

        if report['cycles']:
            print(f"\n❌ CICLOS DE DEPENDÊNCIA (devem ser eliminados):")
            for i, cycle in enumerate(report['cycles'][:5], 1):
                print(f"  {i}. {' → '.join(c.split('.')[-1] for c in cycle)}")

        if report['top_betweenness_centrality']:
            print(f"\n⚠️  TOP NÓDULOS CRÍTICOS (single points of failure — alto betweenness):")
            for item in report['top_betweenness_centrality'][:5]:
                short = item['node'].split('.')[-1]
                print(f"  {short:<35} betweenness={item['betweenness']:.4f}")

        print(f"\n📦 ACOPLAMENTO DE MÓDULOS (Princípio de Martin):")
        print(f"  {'Módulo':<20} {'Ca':>5} {'Ce':>5} {'I':>8} {'A':>8} {'D':>8}  Status")
        print(f"  {'-'*20} {'-'*5} {'-'*5} {'-'*8} {'-'*8} {'-'*8}  {'-'*20}")
        for mod, data in sorted(report['module_coupling'].items()):
            i = data['instability']
            a = data['abstraction']
            d = data['distance_from_main_sequence']
            status = "✅ OK" if d < 0.3 else ("⚠️  ZONA DE PROBLEMA" if d < 0.5 else "❌ FORA DA SEQ.")
            print(f"  {mod:<20} {data['Ca']:>5} {data['Ce']:>5} {i:>8.3f} {a:>8.3f} {d:>8.3f}  {status}")

        print("\n  I=instabilidade, A=abstração, D=distância da sequência principal")
        print("  D ideal < 0.3 (zona de exclusão = zona de dor/inutilidade)")
        print("\n" + "="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Prof. Euler — Análise de Grafos de Dependências'
    )
    parser.add_argument('path', nargs='?',
                        default=r'C:\Users\renat\earbudllm',
                        help='Caminho raiz do projeto')
    parser.add_argument('--format', '-f', choices=['text', 'json', 'dot'],
                        default='text', help='Formato de saída')
    parser.add_argument('--output', '-o', help='Arquivo de saída')

    args = parser.parse_args()

    print(f"🔬 Prof. Euler analisando grafos: {args.path}")

    analyzer = ProjectAnalyzer(args.path)
    analyzer.analyze()
    report = analyzer.generate_full_report()

    if args.format == 'json':
        output = json.dumps(report, indent=2, ensure_ascii=False)
        print(output)
    elif args.format == 'dot':
        output = analyzer.to_dot()
        print(output)
        if args.output:
            safe_user_path(args.output).write_text(output)
            print(f"\n✅ Arquivo DOT salvo: {args.output}")
            print("  Para visualizar: dot -Tpng deps.dot -o deps.png")
    else:
        analyzer.print_report(report)

    if args.output and args.format != 'dot':
        safe_user_path(args.output).write_text(
            json.dumps(report, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
        print(f"✅ Relatório salvo: {args.output}")

    return report


if __name__ == '__main__':
    main()
