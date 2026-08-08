#!/usr/bin/env python3
"""Regression tests for the sample-output quality gate."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("quality_gate.py")
SPEC = importlib.util.spec_from_file_location("quality_gate", MODULE_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load {MODULE_PATH}")
quality_gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(quality_gate)


VALID_OUTPUT = """# 测试回答

**问题判断**
当前最关键的是先拆清楚留存下降来自哪个用户群体。

**原因分析**
- 总量变化可能掩盖渠道和版本差异。

**行动建议**
1. 今天按渠道和版本拆 D7 留存，并用结果决定是否回滚。

**风险提醒**
不要在口径不清时直接全量回滚。
"""


class QuestionCountingTests(unittest.TestCase):
    def test_counts_only_confirmation_section(self) -> None:
        text = VALID_OUTPUT + "\n前文的问题是什么？\n"
        self.assertEqual(quality_gate.count_questions(text), 0)

    def test_counts_multiple_questions_on_one_line(self) -> None:
        text = VALID_OUTPUT + """

**需要确认**
1. 掉的是新用户吗？集中在哪个版本？
2. 埋点改过吗？是否有发布事故？
"""
        self.assertEqual(quality_gate.count_questions(text), 4)

    def test_ignores_url_query_string(self) -> None:
        text = VALID_OUTPUT + """

**需要确认**
1. 请确认看板 https://example.com/report?cohort=new 是否采用同一口径。
"""
        self.assertEqual(quality_gate.count_questions(text), 0)


class FileCheckingTests(unittest.TestCase):
    def check(self, text: str) -> tuple[list[str], list[str]]:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.md"
            path.write_text(text, encoding="utf-8")
            return quality_gate.check_file(path)

    def test_valid_output_passes(self) -> None:
        errors, warnings = self.check(VALID_OUTPUT)
        self.assertEqual(errors, [])
        self.assertEqual(warnings, [])

    def test_hard_source_leak_fails(self) -> None:
        errors, _ = self.check(VALID_OUTPUT + "\n毛泽东认为应该这样做。\n")
        self.assertTrue(any("hard-banned" in error for error in errors))

    def test_soft_term_warns_without_failing(self) -> None:
        errors, warnings = self.check(VALID_OUTPUT + "\n这是一个经典案例。\n")
        self.assertEqual(errors, [])
        self.assertTrue(any("review-needed" in warning for warning in warnings))

    def test_more_than_three_confirmation_questions_fails(self) -> None:
        text = VALID_OUTPUT + """

**需要确认**
1. 指标是什么？
2. 持续多久？
3. 哪类用户？
4. 试过什么？
"""
        errors, _ = self.check(text)
        self.assertIn("asks too many questions", errors)


if __name__ == "__main__":
    unittest.main()
