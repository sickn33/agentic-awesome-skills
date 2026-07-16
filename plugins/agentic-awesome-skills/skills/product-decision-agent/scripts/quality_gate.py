#!/usr/bin/env python3
"""Quality checks for Maoxuan Product Agent sample outputs.

Usage:
  quality_gate.py output1.md output2.md ...

The script catches common regressions:
- source/theory leakage
- English-dominant answers in Chinese work scenes
- vague advice without concrete next actions
- excessive question dumping in the "需要确认" section
- missing judgment, risk, or decision signal
"""

from __future__ import annotations

import re
import sys
from pathlib import Path


HARD_BANNED = [
    r"毛泽东",
    r"毛选",
    r"矛盾论",
    r"实践论",
    r"教员",
    r"毛主席",
    r"同志",
    r"阶级",
    r"革命",
    r"斗争",
    r"主席指出",
    r"《[^》]+》认为",
]

SOFT_BANNED = [
    r"辩证",
    r"唯物",
    r"经典",
    r"原文",
]

VAGUE_PATTERNS = [
    r"提升用户体验",
    r"加强沟通",
    r"多看数据",
    r"深入了解用户",
    r"持续优化",
    r"形成闭环",
    r"赋能",
    r"抓手",
    r"打透认知",
]

JUDGMENT_HINTS = [
    "问题判断",
    "核心是",
    "关键是",
    "不是",
    "当前最",
    "先不要",
]

ACTION_HINTS = [
    "行动建议",
    "下一步",
    "今天",
    "本周",
    "24 小时",
    "48 小时",
    "2 天",
    "一周",
    "两周",
    "负责人",
    "指标",
    "验证",
    "实验",
    "灰度",
    "拆",
    "砍",
    "暂停",
    "停止",
]

DECISION_HINTS = [
    "成功指标",
    "失败指标",
    "主指标",
    "影响指标",
    "护栏",
    "全量",
    "停止",
    "暂停",
    "复盘",
    "监控",
    "达标",
    "不达标",
    "决策",
    "上线",
    "回滚",
    "留存",
    "转化",
    "回复率",
    "复访",
    "D7",
    "7 日",
    "7日",
]

RISK_HINTS = [
    "风险提醒",
    "不要",
    "先不要",
    "暂时不要",
    "不建议",
]


def count_questions(text: str) -> int:
    """Count questions in the "需要确认" section only."""
    match = re.search(
        r"(?:^|\n)(?:#{1,3}\s*)?(?:\*\*)?需要确认(?:\*\*)?[^\n]*\n"
        r"(?P<section>.*?)(?=\n(?:#{1,3}\s+|\*\*[^*\n]+?\*\*)|\Z)",
        text,
        re.DOTALL,
    )
    if not match:
        return 0

    section = match.group("section")
    questions = 0
    for line in section.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        # Count sentence-ending question marks. This ignores URL query strings
        # such as https://example.com?a=1 while still catching two questions
        # written on the same line.
        questions += len(
            re.findall(r"？|\?(?=[\s\u4e00-\u9fff]|$)", stripped)
        )
    return questions


def chinese_ratio(text: str) -> float:
    zh = len(re.findall(r"[\u4e00-\u9fff]", text))
    en = len(re.findall(r"[A-Za-z]", text))
    if zh + en == 0:
        return 0.0
    return zh / (zh + en)


def check_file(path: Path) -> tuple[list[str], list[str]]:
    text = path.read_text(encoding="utf-8")
    errors: list[str] = []
    warnings: list[str] = []

    for pattern in HARD_BANNED:
        if re.search(pattern, text, re.IGNORECASE):
            errors.append(f"exposes hard-banned source/style term: {pattern}")

    for pattern in SOFT_BANNED:
        if re.search(pattern, text, re.IGNORECASE):
            warnings.append(f"contains review-needed term: {pattern}")

    vague_hits = [p for p in VAGUE_PATTERNS if re.search(p, text)]
    if vague_hits:
        errors.append(f"contains vague phrase(s): {', '.join(vague_hits)}")

    if chinese_ratio(text) < 0.72:
        errors.append("answer is not Chinese-dominant enough")

    if not any(hint in text for hint in JUDGMENT_HINTS):
        errors.append("missing problem judgment")

    if not any(hint in text for hint in ACTION_HINTS):
        errors.append("missing concrete action hints")

    if not any(hint in text for hint in DECISION_HINTS):
        errors.append("missing metric/decision/review signal")

    if not any(hint in text for hint in RISK_HINTS):
        errors.append("missing risk or stop-doing guidance")

    if count_questions(text) > 3:
        errors.append("asks too many questions")

    stripped_len = len(text.strip())
    if stripped_len < 120:
        errors.append("output is likely too thin")
    if stripped_len > 2200:
        errors.append("output is likely too verbose")

    return errors, warnings


def main(argv: list[str]) -> int:
    if not argv:
        print("Usage: quality_gate.py output1.md output2.md ...", file=sys.stderr)
        return 2

    failed = False
    for item in argv:
        path = Path(item)
        errors, warnings = check_file(path)
        if errors:
            failed = True
            print(f"FAIL {path}")
            for err in errors:
                print(f"  - {err}")
        else:
            print(f"PASS {path}")
        for warning in warnings:
            print(f"  WARN {warning}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
