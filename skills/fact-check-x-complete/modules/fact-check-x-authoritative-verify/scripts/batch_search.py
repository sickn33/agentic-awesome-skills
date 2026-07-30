#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from authority_verify import acquire
from common import SkillError, dump_json, load_json, now_iso


def main() -> int:
    parser = argparse.ArgumentParser(description="按知识点独立并发执行可信搜索。")
    parser.add_argument("--requests-dir", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--service-area", default="")
    parser.add_argument("--max-workers", type=int, default=12)
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--fixtures", help="测试证据映射，键为 requestId")
    args = parser.parse_args()
    try:
        request_paths = sorted(path for path in Path(args.requests_dir).glob("*.json") if path.name != "manifest.json")
        if not request_paths:
            raise SkillError("请求目录没有 JSON 文件")
        requests = [(path, load_json(path)) for path in request_paths]
        fixtures = load_json(args.fixtures) if args.fixtures else None
        if fixtures is not None and not isinstance(fixtures, dict):
            raise SkillError("fixtures 必须按 requestId 组织")
        requires_trusted_search = [
            request
            for _, request in requests
            if not (request.get("trustedAnchor") or {}).get("eligible")
        ]
        if fixtures is None and requires_trusted_search and not os.getenv("TRUSTED_SEARCH_KEY", "").strip():
            raise SkillError(
                "存在必须调用可信搜索的知识点，但未配置 TRUSTED_SEARCH_KEY。"
                "请暂停流程并由 Fact-Check-X 统一入口执行 MaaS 登录自动配置，"
                "配置完成后重新执行；不要让用户把 Key 粘贴到对话中，也不得改用深知晓来源绕过可信搜索。"
            )
        output_dir = Path(args.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        workers = max(1, min(args.max_workers, 12, len(requests)))
        started = time.monotonic()

        def run_one(entry: tuple[Path, dict]) -> tuple[str, dict, Path]:
            path, request = entry
            request_id = str(request.get("requestId") or path.stem)
            fixture = fixtures.get(request_id) if fixtures is not None else None
            result = acquire(request, args.service_area.strip(), max(1, min(args.limit, 10)), fixture)
            target = output_dir / f"{request_id}.json"
            dump_json(target, result)
            return request_id, result, target

        completed = {}
        with ThreadPoolExecutor(max_workers=workers, thread_name_prefix="authority-kp") as pool:
            futures = [pool.submit(run_one, entry) for entry in requests]
            for future in as_completed(futures):
                request_id, result, target = future.result()
                completed[request_id] = {"file": str(target.resolve()), "status": result["status"], "searchMode": result["searchMode"], "requestCount": result["requestCount"]}
        ordered = [completed[str(request.get("requestId") or path.stem)] for path, request in requests]
        manifest = {
            "schemaVersion": "fact-check-x/authority-batch@1",
            "createdAt": now_iso(),
            "executionMode": "parallel" if len(requests) > 1 and workers > 1 else "serial",
            "taskCount": len(requests),
            "maxWorkers": workers,
            "trustedSearchRequestCount": sum(item["requestCount"] for item in ordered),
            "dknowExemptCount": sum(item["searchMode"] == "dknow_exempt" for item in ordered),
            "elapsedMs": round((time.monotonic() - started) * 1000),
            "results": ordered,
        }
        dump_json(output_dir / "batch.json", manifest)
        print(json.dumps({"status": "completed", **{key: manifest[key] for key in ("executionMode", "taskCount", "maxWorkers", "trustedSearchRequestCount", "dknowExemptCount", "elapsedMs")}}, ensure_ascii=False))
        return 0
    except (SkillError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
