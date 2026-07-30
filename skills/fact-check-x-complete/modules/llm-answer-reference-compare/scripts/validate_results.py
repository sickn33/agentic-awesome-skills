#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse


def fail(message: str) -> None:
    raise ValueError(message)


def validate(data: object) -> dict:
    if not isinstance(data, dict) or data.get("schemaVersion") != "1":
        fail("results.json 必须是 schemaVersion=1 的 JSON 对象")
    if not str(data.get("question") or "").strip():
        fail("缺少用户原始问题 question")
    platforms = data.get("platforms")
    if not isinstance(platforms, list) or not platforms:
        fail("platforms 必须是非空数组")
    seen: set[str] = set()
    successes = 0
    references = 0
    for index, platform in enumerate(platforms, 1):
        if not isinstance(platform, dict):
            fail(f"第 {index} 个平台结果不是对象")
        pid = str(platform.get("platform") or "").strip()
        if not pid or pid in seen:
            fail("平台 ID 必须非空且唯一")
        seen.add(pid)
        status = str(platform.get("status") or "").strip()
        if not status:
            fail(f"{pid} 缺少 status")
        if status == "success":
            successes += 1
            if not str(platform.get("answerMarkdown") or "").strip():
                fail(f"{pid} 成功但原答案为空")
        for ref_index, reference in enumerate(platform.get("references") or [], 1):
            if not isinstance(reference, dict):
                fail(f"{pid} 第 {ref_index} 条引用不是对象")
            original_url = str(reference.get("url") or "").strip()
            if original_url and urlparse(original_url).scheme not in ("http", "https"):
                fail(f"{pid} 第 {ref_index} 条引用的原始 URL 非 http(s)")
            normalized_url = str(reference.get("normalizedUrl") or "").strip()
            if not normalized_url:
                fail(f"{pid} 第 {ref_index} 条引用缺少 normalizedUrl")
            references += 1
    return {"platforms": len(platforms), "successes": successes, "references": references}


def main() -> int:
    parser = argparse.ArgumentParser(description="校验多平台原始答案采集结果。")
    parser.add_argument("--input", required=True)
    args = parser.parse_args()
    try:
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        summary = validate(data)
        print(json.dumps({"status": "completed", **summary}, ensure_ascii=False))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
