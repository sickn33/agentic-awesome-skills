#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prof. Euler — Complexity Analyzer
Análise automática de complexidade ciclomática, cognitiva e acoplamento
para projetos Kotlin/Android.

Uso:
  python complexity_analyzer.py [path] [--module MODULE] [--threshold N]
  python complexity_analyzer.py C:/Users/renat/earbudllm
  python complexity_analyzer.py C:/Users/renat/earbudllm --module llm --threshold 10
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

# Fix Unicode output on Windows (cp1252 terminal)
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        pass  # Python < 3.7 fallback
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from collections import defaultdict


@dataclass
class FunctionMetrics:
    name: str
    file: str
    line: int
    cyclomatic: int
    cognitive: int
    lines: int
    parameters: int
    nullable_params: int
    has_try_catch: bool
    coroutine: bool  # is suspend fun


@dataclass
class FileMetrics:
    path: str
    module: str
    functions: List[FunctionMetrics] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    total_lines: int = 0
    blank_lines: int = 0
    comment_lines: int = 0

    @property
    def code_lines(self):
        return self.total_lines - self.blank_lines - self.comment_lines

    @property
    def max_cyclomatic(self):
        return max((f.cyclomatic for f in self.functions), default=0)

    @property
    def avg_cyclomatic(self):
        if not self.functions:
            return 0.0
        return sum(f.cyclomatic for f in self.functions) / len(self.functions)

    @property
    def max_cognitive(self):
        return max((f.cognitive for f in self.functions), default=0)


@dataclass
class ModuleCoupling:
    module: str
    efferent: List[str] = field(default_factory=list)  # Ce: modules this depends on
    afferent: List[str] = field(default_factory=list)   # Ca: modules that depend on this

    @property
    def instability(self) -> float:
        ca = len(self.afferent)
        ce = len(self.efferent)
        if ca + ce == 0:
            return 0.0
        return ce / (ca + ce)


class KotlinComplexityAnalyzer:
    """Analisa complexidade de código Kotlin com rigor matemático."""

    # Tokens que incrementam complexidade ciclomática
    CYCLOMATIC_TOKENS = [
        r'\bif\b', r'\belse if\b', r'\bwhen\b', r'\bfor\b', r'\bwhile\b',
        r'\bdo\b', r'\btry\b', r'\bcatch\b', r'\band\b', r'\bor\b',
        r'\?\?', r'\?\.',  # Elvis operator e safe call
        r'&&', r'\|\|',
    ]

    # Tokens de quebra de fluxo (aumentam complexidade cognitiva mais que cicl.)
    COGNITIVE_BREAK_TOKENS = [
        r'\bbreak\b', r'\bcontinue\b', r'\breturn\b(?!\s+\w+\s*$)',  # return no meio
        r'\bthrow\b',
    ]

    def __init__(self, project_root: str, threshold: int = 10):
        self.project_root = Path(project_root)
        self.threshold = threshold
        self.metrics: List[FileMetrics] = []

    def analyze(self, module_filter: Optional[str] = None) -> None:
        """Analisa todos os arquivos Kotlin no projeto."""
        pattern = "**/*.kt"
        kt_files = list(self.project_root.glob(pattern))

        for kt_file in kt_files:
            # Filtra arquivos de teste se não especificado
            if 'test' in kt_file.parts and module_filter is None:
                continue

            # Filtro de módulo
            module = self._detect_module(kt_file)
            if module_filter and module != module_filter:
                continue

            metrics = self._analyze_file(kt_file, module)
            self.metrics.append(metrics)

    def _detect_module(self, file_path: Path) -> str:
        """Detecta qual módulo um arquivo pertence."""
        parts = file_path.parts
        known_modules = ['app', 'bluetooth', 'audio', 'voice', 'llm',
                         'integrations', 'core-logging']
        for part in parts:
            if part in known_modules:
                return part
        return 'unknown'

    def _analyze_file(self, file_path: Path, module: str) -> FileMetrics:
        """Analisa um arquivo Kotlin."""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            return FileMetrics(str(file_path), module)

        lines = content.split('\n')
        metrics = FileMetrics(
            path=str(file_path.relative_to(self.project_root)),
            module=module,
            total_lines=len(lines)
        )

        # Contar linhas
        for line in lines:
            stripped = line.strip()
            if not stripped:
                metrics.blank_lines += 1
            elif stripped.startswith('//') or stripped.startswith('*') or stripped.startswith('/*'):
                metrics.comment_lines += 1

        # Extrair imports
        metrics.imports = re.findall(r'^import\s+(.+)$', content, re.MULTILINE)

        # Analisar funções
        metrics.functions = self._extract_functions(content, str(file_path))

        return metrics

    def _extract_functions(self, content: str, filepath: str) -> List[FunctionMetrics]:
        """Extrai e analisa todas as funções do arquivo."""
        functions = []
        lines = content.split('\n')

        # Pattern para declarações de função Kotlin
        fun_pattern = re.compile(
            r'^(\s*)((?:suspend\s+)?(?:private\s+|protected\s+|internal\s+|public\s+)?'
            r'(?:override\s+)?(?:suspend\s+)?fun\s+(\w+)\s*\(([^)]*)\))',
            re.MULTILINE
        )

        for match in fun_pattern.finditer(content):
            fun_name = match.group(3)
            params_str = match.group(4)
            is_suspend = 'suspend' in match.group(2)
            line_num = content[:match.start()].count('\n') + 1

            # Extrair corpo da função
            body = self._extract_function_body(content, match.end())
            if not body:
                continue

            # Calcular métricas
            cc = self._cyclomatic_complexity(body)
            cog = self._cognitive_complexity(body)
            params = self._count_parameters(params_str)
            nullable = self._count_nullable_params(params_str)
            has_try = bool(re.search(r'\btry\b', body))

            functions.append(FunctionMetrics(
                name=fun_name,
                file=filepath,
                line=line_num,
                cyclomatic=cc,
                cognitive=cog,
                lines=body.count('\n'),
                parameters=params,
                nullable_params=nullable,
                has_try_catch=has_try,
                coroutine=is_suspend
            ))

        return functions

    def _extract_function_body(self, content: str, start: int) -> str:
        """Extrai o corpo de uma função por contagem de chaves."""
        i = start
        depth = 0
        started = False

        while i < len(content):
            c = content[i]
            if c == '{':
                depth += 1
                started = True
            elif c == '}':
                depth -= 1
                if started and depth == 0:
                    return content[start:i+1]
            i += 1

        return content[start:min(start + 500, len(content))]

    def _cyclomatic_complexity(self, code: str) -> int:
        """Calcula CC de McCabe."""
        cc = 1  # Base
        for pattern in self.CYCLOMATIC_TOKENS:
            matches = re.findall(pattern, code)
            cc += len(matches)
        return cc

    def _cognitive_complexity(self, code: str) -> int:
        """Calcula complexidade cognitiva (aproximação)."""
        cog = 0
        nesting = 0
        lines = code.split('\n')

        for line in lines:
            stripped = line.strip()

            # Aumenta nesting
            if re.search(r'\b(if|when|for|while|try)\b', stripped):
                cog += (1 + nesting)
                nesting += 1

            # Fecha nesting
            elif stripped == '}':
                nesting = max(0, nesting - 1)

            # Breaks de fluxo
            for pattern in self.COGNITIVE_BREAK_TOKENS:
                if re.search(pattern, stripped):
                    cog += 1

        return cog

    def _count_parameters(self, params_str: str) -> int:
        """Conta parâmetros de uma função."""
        if not params_str.strip():
            return 0
        return len([p for p in params_str.split(',') if p.strip()])

    def _count_nullable_params(self, params_str: str) -> int:
        """Conta parâmetros nullable (tipo?)."""
        return len(re.findall(r'\w+\?', params_str))

    def analyze_coupling(self) -> Dict[str, ModuleCoupling]:
        """Analisa acoplamento entre módulos."""
        module_imports: Dict[str, set] = defaultdict(set)

        for file_metrics in self.metrics:
            for imp in file_metrics.imports:
                # Detecta qual módulo está sendo importado
                for mod in ['bluetooth', 'audio', 'voice', 'llm', 'integrations', 'core.logging']:
                    if mod in imp:
                        module_imports[file_metrics.module].add(mod.replace('.', '-'))

        coupling = {}
        all_modules = set(m.module for m in self.metrics)

        for mod in all_modules:
            c = ModuleCoupling(module=mod)
            c.efferent = list(module_imports.get(mod, set()))
            for other_mod, deps in module_imports.items():
                if mod.replace('-', '.') in deps or mod in deps:
                    c.afferent.append(other_mod)
            coupling[mod] = c

        return coupling

    def generate_report(self) -> Dict:
        """Gera relatório completo com análise matemática."""
        # Funções problemáticas
        high_cc = []
        high_cognitive = []
        too_long = []
        too_many_params = []
        unsafe_nullable = []
        coroutine_issues = []

        for file_m in self.metrics:
            for func in file_m.functions:
                if func.cyclomatic > self.threshold:
                    high_cc.append({
                        'function': func.name,
                        'file': file_m.path,
                        'line': func.line,
                        'cc': func.cyclomatic,
                        'risk': self._cc_risk_label(func.cyclomatic)
                    })

                if func.cognitive > self.threshold * 1.5:
                    high_cognitive.append({
                        'function': func.name,
                        'file': file_m.path,
                        'line': func.line,
                        'cognitive': func.cognitive
                    })

                if func.lines > 50:
                    too_long.append({
                        'function': func.name,
                        'file': file_m.path,
                        'line': func.line,
                        'lines': func.lines
                    })

                if func.parameters > 5:
                    too_many_params.append({
                        'function': func.name,
                        'file': file_m.path,
                        'params': func.parameters
                    })

                if func.nullable_params > 2:
                    unsafe_nullable.append({
                        'function': func.name,
                        'file': file_m.path,
                        'nullable_params': func.nullable_params
                    })

                if func.coroutine and func.has_try_catch:
                    coroutine_issues.append({
                        'function': func.name,
                        'file': file_m.path,
                        'note': 'suspend fun with try-catch: verify structured concurrency'
                    })

        # Ordenar por severidade
        high_cc.sort(key=lambda x: x['cc'], reverse=True)

        # Módulos com maior complexidade
        module_stats = defaultdict(lambda: {'total_cc': 0, 'max_cc': 0, 'functions': 0, 'files': 0})
        for file_m in self.metrics:
            mod = file_m.module
            module_stats[mod]['files'] += 1
            module_stats[mod]['functions'] += len(file_m.functions)
            for f in file_m.functions:
                module_stats[mod]['total_cc'] += f.cyclomatic
                module_stats[mod]['max_cc'] = max(module_stats[mod]['max_cc'], f.cyclomatic)

        # Calcular média CC por módulo
        for mod, stats in module_stats.items():
            if stats['functions'] > 0:
                stats['avg_cc'] = round(stats['total_cc'] / stats['functions'], 2)
            else:
                stats['avg_cc'] = 0

        coupling = self.analyze_coupling()
        coupling_data = {}
        for mod, c in coupling.items():
            coupling_data[mod] = {
                'Ca': len(c.afferent),
                'Ce': len(c.efferent),
                'instability': round(c.instability, 3),
                'depends_on': c.efferent,
                'depended_by': c.afferent
            }

        return {
            'summary': {
                'total_files': len(self.metrics),
                'total_functions': sum(len(f.functions) for f in self.metrics),
                'total_code_lines': sum(f.code_lines for f in self.metrics),
                'high_cc_functions': len(high_cc),
                'high_cognitive_functions': len(high_cognitive),
            },
            'high_cyclomatic_complexity': high_cc[:20],  # top 20
            'high_cognitive_complexity': high_cognitive[:10],
            'overly_long_functions': too_long[:10],
            'too_many_parameters': too_many_params[:10],
            'nullable_risks': unsafe_nullable[:10],
            'coroutine_issues': coroutine_issues[:10],
            'module_statistics': dict(module_stats),
            'module_coupling': coupling_data,
        }

    def _cc_risk_label(self, cc: int) -> str:
        if cc <= 5:
            return "LOW"
        elif cc <= 10:
            return "MODERATE"
        elif cc <= 20:
            return "HIGH — refactor recommended"
        else:
            return "CRITICAL — must refactor"

    def print_report(self, report: Dict) -> None:
        """Imprime relatório formatado."""
        print("\n" + "="*70)
        print("  PROF. EULER — ANÁLISE DE COMPLEXIDADE MATEMÁTICA")
        print("="*70)

        s = report['summary']
        print(f"\n📊 RESUMO:")
        print(f"  Arquivos analisados:    {s['total_files']}")
        print(f"  Funções analisadas:     {s['total_functions']}")
        print(f"  Linhas de código:       {s['total_code_lines']}")
        print(f"  Funções alta CC:        {s['high_cc_functions']} (threshold={self.threshold})")
        print(f"  Funções alta cognitiva: {s['high_cognitive_functions']}")

        if report['high_cyclomatic_complexity']:
            print(f"\n⚠️  TOP FUNÇÕES POR COMPLEXIDADE CICLOMÁTICA:")
            print(f"  {'Função':<35} {'CC':>5}  {'Arquivo':<40} Risco")
            print(f"  {'-'*35} {'-'*5}  {'-'*40} {'-'*25}")
            for item in report['high_cyclomatic_complexity'][:10]:
                fname = item['function'][:34]
                ffile = item['file'][:39]
                print(f"  {fname:<35} {item['cc']:>5}  {ffile:<40} {item['risk']}")

        if report['module_statistics']:
            print(f"\n📦 ESTATÍSTICAS POR MÓDULO:")
            print(f"  {'Módulo':<20} {'Arquivos':>8} {'Funções':>8} {'CC Médio':>10} {'CC Máximo':>10} {'Instabilidade':>14}")
            print(f"  {'-'*20} {'-'*8} {'-'*8} {'-'*10} {'-'*10} {'-'*14}")
            coupling = report['module_coupling']
            for mod, stats in sorted(report['module_statistics'].items()):
                inst = coupling.get(mod, {}).get('instability', 'N/A')
                inst_str = f"{inst:.3f}" if isinstance(inst, float) else inst
                print(f"  {mod:<20} {stats['files']:>8} {stats['functions']:>8} "
                      f"{stats['avg_cc']:>10.2f} {stats['max_cc']:>10} {inst_str:>14}")

        if report['coroutine_issues']:
            print(f"\n🔄 PROBLEMAS POTENCIAIS EM COROUTINES:")
            for item in report['coroutine_issues'][:5]:
                print(f"  ⚠️  {item['function']} ({item['file']})")
                print(f"     → {item['note']}")

        if report['nullable_risks']:
            print(f"\n❓ NULLABLE RISKS (muitos parâmetros nullable):")
            for item in report['nullable_risks'][:5]:
                print(f"  {item['function']}: {item['nullable_params']} nullable params ({item['file']})")

        print("\n" + "="*70)
        print("  Análise matemática completa. Consulte Prof. Euler para interpretação.")
        print("="*70 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Prof. Euler — Análise de Complexidade Matemática para Kotlin/Android'
    )
    parser.add_argument('path', nargs='?',
                        default=r'C:\Users\renat\earbudllm',
                        help='Caminho raiz do projeto')
    parser.add_argument('--module', '-m', help='Analisar apenas este módulo')
    parser.add_argument('--threshold', '-t', type=int, default=10,
                        help='Threshold de complexidade ciclomática (default: 10)')
    parser.add_argument('--json', '-j', action='store_true',
                        help='Saída em formato JSON')
    parser.add_argument('--output', '-o', help='Salvar relatório em arquivo')

    args = parser.parse_args()

    print(f"🔬 Prof. Euler analisando: {args.path}")
    if args.module:
        print(f"   Módulo: {args.module}")

    analyzer = KotlinComplexityAnalyzer(args.path, threshold=args.threshold)
    analyzer.analyze(module_filter=args.module)

    report = analyzer.generate_report()

    if args.json:
        output = json.dumps(report, indent=2, ensure_ascii=False)
        print(output)
    else:
        analyzer.print_report(report)

    if args.output:
        output_path = safe_user_path(args.output)
        if args.json:
            output_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            # Salvar como markdown
            save_as_markdown(report, output_path, args.threshold)
        print(f"✅ Relatório salvo em: {args.output}")

    return report


def save_as_markdown(report: Dict, path: Path, threshold: int) -> None:
    """Salva relatório em formato Markdown."""
    lines = [
        "# Prof. Euler — Relatório de Complexidade Matemática\n",
        f"Threshold CC: {threshold}\n\n",
        "## Resumo\n",
        f"- **Arquivos**: {report['summary']['total_files']}\n",
        f"- **Funções**: {report['summary']['total_functions']}\n",
        f"- **Linhas de código**: {report['summary']['total_code_lines']}\n",
        f"- **Alta CC**: {report['summary']['high_cc_functions']}\n\n",
        "## Funções de Alta Complexidade Ciclomática\n",
        "| Função | CC | Arquivo | Risco |\n",
        "|--------|-----|---------|-------|\n",
    ]
    for item in report['high_cyclomatic_complexity'][:15]:
        lines.append(
            f"| `{item['function']}` | {item['cc']} | `{item['file']}` | {item['risk']} |\n"
        )

    lines.append("\n## Acoplamento de Módulos\n")
    lines.append("| Módulo | Ca | Ce | Instabilidade | Depende de |\n")
    lines.append("|--------|----|----|--------------|------------|\n")
    for mod, data in sorted(report['module_coupling'].items()):
        deps = ', '.join(data['depends_on']) or 'nenhum'
        lines.append(
            f"| {mod} | {data['Ca']} | {data['Ce']} | {data['instability']:.3f} | {deps} |\n"
        )

    path.write_text(''.join(lines), encoding='utf-8')


if __name__ == '__main__':
    main()
