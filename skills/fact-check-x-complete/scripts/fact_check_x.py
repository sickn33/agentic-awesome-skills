#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

from common import PipelineError, dump_json, load_json, now_iso
from trusted_search_config import (
    PROVIDER_URL,
    ConfigurationError,
    load_trusted_search_key,
    trusted_search_key_for_execution,
)


DEPENDENCIES = {
    "collector": "llm-answer-reference-compare",
    "comparison": "fact-check-x-knowledge-compare",
    "authority": "fact-check-x-authoritative-verify",
}

DEPENDENCY_ENTRYPOINTS = {
    "collector": Path("assets/tool/dist/cli.js"),
    "comparison": Path("scripts/knowledge_compare.py"),
    "authority": Path("scripts/authority_verify.py"),
}

TRUSTED_SEARCH_CONFIGURATION_PROMPT = (
    "部分知识点还需要调用可信搜索。首次使用时，我会打开深知智能 MaaS 平台"
    f"（{PROVIDER_URL}）。您只需完成登录；技能会自动读取已有的可用 Key，"
    "没有时创建 Fact-Check-X 专用 Key，验证后保存到本机共享配置，并自动继续。"
    "后续在 Codex、Claude Code、WorkBuddy 等载体中都会直接复用，已有配置时"
    "不会再次打开登录页。Key 不会进入对话、命令输出或核验报告。"
)

PORTABLE_REPORT_PACKAGE = "05-complete-report-package.zip"
PORTABLE_REPORT_ROOT = Path("fact-check-x-report")
PORTABLE_REPORT_README = """Fact-Check-X 完整事实核验报告包

建议按以下顺序打开：
1. 01-capture-report.html：原始答案、参考文献与引用存证
2. 02-comparison-report.html：知识点结构化对比
3. 03-authority-report.html：权威证据核验
4. 04-final-report.html：平台表现与完整证据

请先解压整个压缩包，再用浏览器打开 HTML 文件，以保留截图、页面存证和报告导航。
"""


def skill_candidates() -> list[Path]:
    values = []
    if os.getenv("FACTCHECK_SKILLS_DIR"):
        values.append(Path(os.environ["FACTCHECK_SKILLS_DIR"]).expanduser())
    # The WorkBuddy single-upload package carries the three business layers here.
    values.append(Path(__file__).resolve().parents[1] / "modules")
    values.append(Path(__file__).resolve().parents[2])
    codex_home = Path(os.getenv("CODEX_HOME", Path.home() / ".codex")).expanduser()
    values.append(codex_home / "skills")
    output = []
    for value in values:
        resolved = value.resolve()
        if resolved not in output:
            output.append(resolved)
    return output


def locate_skills() -> dict[str, Path]:
    found = {}
    for key, directory in DEPENDENCIES.items():
        for parent in skill_candidates():
            candidate = parent / directory
            if (candidate / "SKILL.md").exists() or (candidate / DEPENDENCY_ENTRYPOINTS[key]).exists():
                found[key] = candidate
                break
        if key not in found:
            searched = ", ".join(str(path / directory) for path in skill_candidates())
            raise PipelineError(f"未找到依赖技能 {directory}；已检查：{searched}")
    return found


def run(command: list[str], environment: dict[str, str] | None = None) -> dict:
    process = subprocess.run(
        command,
        text=True,
        capture_output=True,
        check=False,
        env=environment,
    )
    if process.returncode:
        raise PipelineError(process.stdout.strip() or process.stderr.strip() or "子技能执行失败")
    lines = [line for line in process.stdout.splitlines() if line.strip()]
    try:
        return json.loads(lines[-1]) if lines else {"status": "completed"}
    except json.JSONDecodeError:
        return {"status": "completed", "output": process.stdout.strip()}


def trusted_search_key() -> str:
    try:
        return load_trusted_search_key()
    except ConfigurationError as exc:
        raise PipelineError(str(exc)) from exc


def validated_authority_key() -> str:
    try:
        key, _, _ = trusted_search_key_for_execution()
        return key
    except ConfigurationError as exc:
        raise PipelineError(str(exc)) from exc


def trusted_search_configuration() -> dict:
    helper = Path(__file__).with_name("trusted_search_config.py").resolve()
    return {
        "providerUrl": PROVIDER_URL,
        "command": [sys.executable, str(helper), "configure"],
        "interaction": "browser_login_only",
        "requiresChatSecret": False,
        "autoResume": True,
        "sharedAcrossCarriers": True,
    }


def require_run(run_dir: str) -> Path:
    path = Path(run_dir).resolve()
    path.mkdir(parents=True, exist_ok=True)
    return path


def capture_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def referenced_capture_artifacts(results_path: Path, results: dict) -> dict[str, Path]:
    source_root = results_path.parent.resolve()
    referenced: dict[str, Path] = {}
    for platform in results.get("platforms") or []:
        platform_id = str(platform.get("platform") or "unknown")
        artifacts = platform.get("artifacts") or {}
        if not isinstance(artifacts, dict):
            raise PipelineError(f"{platform_id} 的采集存证格式不正确")
        for artifact_type, value in artifacts.items():
            raw_path = str(value or "").strip()
            if not raw_path:
                continue
            relative = Path(raw_path)
            if (
                relative.is_absolute()
                or ".." in relative.parts
                or not relative.parts
                or relative.parts[0] != "artifacts"
            ):
                raise PipelineError(
                    f"{platform_id} 的 {artifact_type} 存证路径必须是 artifacts/ 下的相对路径：{raw_path}"
                )
            source = (source_root / relative).resolve()
            try:
                source.relative_to(source_root)
            except ValueError as exc:
                raise PipelineError(
                    f"{platform_id} 的 {artifact_type} 存证路径越出采集目录：{raw_path}"
                ) from exc
            if not source.is_file():
                raise PipelineError(
                    f"{platform_id} 声明的 {artifact_type} 存证文件不存在：{raw_path}"
                )
            normalized = relative.as_posix()
            previous = referenced.get(normalized)
            if previous and previous != source:
                raise PipelineError(f"采集存证路径冲突：{normalized}")
            referenced[normalized] = source
    return referenced


def capture_artifact_hashes(results_path: Path, results: dict) -> dict[str, str]:
    return {
        relative: capture_digest(source)
        for relative, source in sorted(
            referenced_capture_artifacts(results_path, results).items()
        )
    }


def sync_capture_evidence(run_dir: Path, results_path: Path, results: dict) -> None:
    capture_dir = (run_dir / "capture").resolve()
    source_dir = results_path.parent.resolve()
    artifacts = referenced_capture_artifacts(results_path, results)
    recovery_source = source_dir / "capture-recovery.json"
    recovery_target = capture_dir / "capture-recovery.json"
    artifact_bytes = {
        relative: source.read_bytes() for relative, source in artifacts.items()
    }
    recovery_bytes = recovery_source.read_bytes() if recovery_source.is_file() else None
    for target_root in (capture_dir, run_dir):
        shutil.rmtree(target_root / "artifacts", ignore_errors=True)
        for relative, content in artifact_bytes.items():
            target = target_root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    if recovery_bytes is not None:
        recovery_target.write_bytes(recovery_bytes)
    else:
        recovery_target.unlink(missing_ok=True)


def json_file_manifest(directory: Path, expected_names: set[str] | None = None) -> dict[str, str]:
    actual = {path.name for path in directory.glob("*.json")} if directory.exists() else set()
    if expected_names is not None and actual != expected_names:
        missing = sorted(expected_names - actual)
        extra = sorted(actual - expected_names)
        raise PipelineError(f"{directory.name} 文件集合不匹配；缺失={missing}，额外/陈旧={extra}")
    return {name: capture_digest(directory / name) for name in sorted(actual)}


def require_digest(path: Path, expected: str, label: str) -> None:
    if not path.exists() or capture_digest(path) != expected:
        raise PipelineError(f"{label} 在门禁后缺失或被修改，禁止继续")


def write_comparison_provenance(run_dir: Path, results_path: Path, analysis_path: Path, comparison_path: Path) -> Path:
    gate = run_dir / "comparison-gate.json"
    dump_json(gate, {
        "schemaVersion": "fact-check-x/comparison-gate@1",
        "status": "completed",
        "createdAt": now_iso(),
        "files": {
            "results": {"path": str(results_path), "sha256": capture_digest(results_path)},
            "analysis": {"path": str(analysis_path), "sha256": capture_digest(analysis_path)},
            "comparison": {"path": str(comparison_path), "sha256": capture_digest(comparison_path)},
        },
    })
    return gate


def require_comparison_provenance(run_dir: Path) -> dict:
    gate_path = run_dir / "comparison-gate.json"
    if not gate_path.exists():
        raise PipelineError("缺少 1.1 provenance 门禁；必须重新执行 complete-comparison")
    gate = load_json(gate_path)
    if gate.get("schemaVersion") != "fact-check-x/comparison-gate@1" or gate.get("status") != "completed":
        raise PipelineError("1.1 provenance 门禁状态不正确")
    for label, item in (gate.get("files") or {}).items():
        require_digest(Path(str(item.get("path") or "")).resolve(), str(item.get("sha256") or ""), label)
    return gate


def expected_request_ids(manifest: dict) -> list[str]:
    ids = [str(entry.get("requestId") or "") for entry in manifest.get("requests") or []]
    if not ids or any(not value for value in ids) or len(ids) != len(set(ids)):
        raise PipelineError("权威核验请求清单包含空 ID 或重复 ID")
    return ids


def scrub_portable_paths(value, run_dir: Path):
    if isinstance(value, dict):
        return {key: scrub_portable_paths(item, run_dir) for key, item in value.items()}
    if isinstance(value, list):
        return [scrub_portable_paths(item, run_dir) for item in value]
    if isinstance(value, str):
        path = Path(value)
        if path.is_absolute():
            try:
                return path.relative_to(run_dir).as_posix()
            except ValueError:
                return path.name
    return value


def portable_file_bytes(path: Path, run_dir: Path) -> bytes:
    if path.suffix.lower() == ".json":
        payload = scrub_portable_paths(load_json(path), run_dir)
        if path.name == "pipeline.json":
            artifacts = payload.get("artifacts") or {}
            artifacts.pop("reportPackageSha256", None)
            artifacts.pop("reportPackageBytes", None)
        return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    return path.read_bytes()


def normalize_comparison_navigation(content: bytes) -> bytes:
    content = content.replace(
        b'href="capture/report.html"', b'href="01-capture-report.html"'
    ).replace(b'href="report.html"', b'href="04-final-report.html"')
    if b'href="03-authority-report.html"' not in content:
        content = content.replace(
            b'<a href="04-final-report.html">',
            b'<a href="03-authority-report.html">\xe4\xba\x91\xe7\xab\xaf\xe6\x9d\x83\xe5\xa8\x81\xe6\xa0\xb8\xe9\xaa\x8c</a>'
            b'<a href="04-final-report.html">',
        )
    return content


def build_portable_report_package(run_dir: Path) -> dict:
    package_path = run_dir / PORTABLE_REPORT_PACKAGE
    package_path.unlink(missing_ok=True)
    reports = {
        Path("01-capture-report.html"): run_dir / "01-capture-report.html",
        Path("02-comparison-report.html"): run_dir / "02-comparison-report.html",
        Path("03-authority-report.html"): run_dir / "03-authority-report.html",
        Path("04-final-report.html"): run_dir / "04-final-report.html",
    }
    data_files = [
        Path("capture/results.json"),
        Path("capture/report.md"),
        Path("capture/capture-recovery.json"),
        Path("capture-gate.json"),
        Path("comparison-task.json"),
        Path("comparison-analysis.json"),
        Path("comparison.json"),
        Path("comparison-gate.json"),
        Path("authority-gate.json"),
        Path("verification.json"),
        Path("pipeline.json"),
    ]
    with zipfile.ZipFile(package_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr(str(PORTABLE_REPORT_ROOT / "README.txt"), PORTABLE_REPORT_README.encode("utf-8"))
        for relative, source in reports.items():
            if not source.exists():
                raise PipelineError(f"缺少对外交付报告：{source.name}")
            content = source.read_bytes()
            if relative.name == "02-comparison-report.html":
                content = normalize_comparison_navigation(content)
            archive.writestr(str(PORTABLE_REPORT_ROOT / relative), content)
        artifacts_dir = run_dir / "capture" / "artifacts"
        if artifacts_dir.exists():
            for source in sorted(path for path in artifacts_dir.rglob("*") if path.is_file()):
                relative = Path("artifacts") / source.relative_to(artifacts_dir)
                archive.writestr(str(PORTABLE_REPORT_ROOT / relative), source.read_bytes())
        for relative in data_files:
            source = run_dir / relative
            if source.exists():
                archive.writestr(
                    str(PORTABLE_REPORT_ROOT / "data" / relative),
                    portable_file_bytes(source, run_dir),
                )
        for directory in (run_dir / "authority", run_dir / "report-input"):
            if not directory.exists():
                continue
            for source in sorted(path for path in directory.rglob("*") if path.is_file()):
                relative = Path("data") / source.relative_to(run_dir)
                archive.writestr(
                    str(PORTABLE_REPORT_ROOT / relative),
                    portable_file_bytes(source, run_dir),
                )
    with zipfile.ZipFile(package_path) as archive:
        broken = archive.testzip()
        if broken:
            raise PipelineError(f"对外报告包校验失败：{broken}")
    return {
        "path": str(package_path.resolve()),
        "sha256": capture_digest(package_path),
        "bytes": package_path.stat().st_size,
    }


def validate_capture_results(results_path: Path, minimum_platforms: int = 1) -> dict:
    results = load_json(results_path)
    if results.get("schemaVersion") != "1":
        raise PipelineError("采集结果版本不正确，禁止进入知识点对比")
    platforms = results.get("platforms") or []
    if len(platforms) < minimum_platforms:
        raise PipelineError(f"完整事实核验至少需要 {minimum_platforms} 个采集平台，当前只有 {len(platforms)} 个")
    names = [str(item.get("platform") or "").strip() for item in platforms]
    if len(set(names)) != len(names) or any(not name for name in names):
        raise PipelineError("采集结果包含空平台或重复平台，禁止进入知识点对比")
    incomplete = []
    prompt_markers = (
        "为您智能匹配到当前所在区域为",
        "如想咨询其他区域可点击修改",
        "请选择您想咨询的地区",
        "请先完成登录",
        "登录后即可提问",
    )
    def is_prompt_only(answer: str) -> bool:
        compact = "".join(answer.split())
        matches = ["".join(marker.split()) for marker in prompt_markers if "".join(marker.split()) in compact]
        if not matches:
            return False
        return len(compact) <= max(240, sum(len(marker) for marker in matches) + 120)

    for item in platforms:
        answer = str(item.get("answerMarkdown") or "").strip()
        if item.get("status") != "success" or not answer:
            incomplete.append(
                f"{item.get('label') or item.get('platform')}: "
                f"{item.get('status')} ({item.get('error') or '无完整回答'})"
            )
        elif is_prompt_only(answer):
            incomplete.append(f"{item.get('label') or item.get('platform')}: 捕获内容是登录、地区选择或初始化提示")
    if incomplete:
        raise PipelineError("采集未完成，已禁止进入知识点对比；请先重新采集失败平台：" + "；".join(incomplete))
    recovery_path = results_path.parent / "capture-recovery.json"
    if recovery_path.exists():
        recovery = load_json(recovery_path)
        if recovery.get("status") == "required":
            raise PipelineError("采集恢复状态仍为 required，必须先由 Computer Use 完成浏览器恢复并重新采集")
    return results


def write_capture_gate(run_dir: Path, results_path: Path, results: dict) -> Path:
    gate = run_dir / "capture-gate.json"
    recovery_path = results_path.parent / "capture-recovery.json"
    dump_json(gate, {
        "schemaVersion": "fact-check-x/capture-gate@1",
        "status": "completed",
        "createdAt": now_iso(),
        "results": str(results_path.resolve()),
        "sha256": capture_digest(results_path),
        "artifactSha256": capture_artifact_hashes(results_path, results),
        "recoverySha256": capture_digest(recovery_path) if recovery_path.is_file() else None,
        "question": results.get("question"),
        "platforms": [item.get("platform") for item in results.get("platforms") or []],
    })
    return gate


def validate_and_gate_capture(run_dir: Path, results_path: Path) -> dict:
    results = validate_capture_results(results_path)
    write_capture_gate(run_dir, results_path, results)
    return results


def require_capture_gate(run_dir: Path, results_path: Path | None = None) -> dict:
    gate_path = run_dir / "capture-gate.json"
    if not gate_path.exists():
        raise PipelineError("缺少采集完整性门禁，禁止执行下游步骤；请先完成 1.0 采集并运行 prepare-comparison")
    gate = load_json(gate_path)
    if gate.get("schemaVersion") != "fact-check-x/capture-gate@1" or gate.get("status") != "completed":
        raise PipelineError("采集完整性门禁状态不正确，禁止执行下游步骤")
    checked_path = results_path or Path(str(gate.get("results") or "")).resolve()
    results = validate_capture_results(checked_path)
    if gate.get("sha256") != capture_digest(checked_path):
        raise PipelineError("results.json 在采集门禁后发生变化，禁止继续；请重新执行 prepare-comparison")
    if gate.get("artifactSha256") != capture_artifact_hashes(checked_path, results):
        raise PipelineError("采集存证文件在门禁后缺失或被修改，禁止继续；请重新执行 prepare-comparison")
    recovery_path = checked_path.parent / "capture-recovery.json"
    recovery_sha256 = capture_digest(recovery_path) if recovery_path.is_file() else None
    if gate.get("recoverySha256") != recovery_sha256:
        raise PipelineError("采集恢复记录在门禁后缺失或被修改，禁止继续；请重新执行 prepare-comparison")
    return gate


def prepare_comparison(args: argparse.Namespace, skills: dict[str, Path]) -> dict:
    run_dir = require_run(args.run_dir)
    results_path = Path(args.results).resolve()
    results = validate_and_gate_capture(run_dir, results_path)
    capture_report = run([
        "node",
        str(skills["collector"] / "assets" / "tool" / "dist" / "report-cli.js"),
        "--input",
        str(results_path),
        "--out",
        str(run_dir / "capture"),
    ])
    sync_capture_evidence(run_dir, results_path, results)
    capture_deliverable = run_dir / "01-capture-report.html"
    shutil.copyfile(capture_report["report"], capture_deliverable)
    task = run_dir / "comparison-task.json"
    result = run([sys.executable, str(skills["comparison"] / "scripts" / "knowledge_compare.py"), "--input", str(results_path), "--task-output", str(task)])
    result.update({
        "stage": "capture_completed",
        "platforms": [
            {
                "platform": item.get("platform"),
                "label": item.get("label") or item.get("platform"),
                "status": item.get("status"),
                "referenceCount": len(item.get("references") or []),
                "sourceMentionCount": len(item.get("sourceMentions") or []),
                "durationMs": item.get("durationMs"),
            }
            for item in results.get("platforms") or []
        ],
        "artifacts": {
            "results": capture_report["results"],
            "answerReferenceReport": capture_report["report"],
            "answerReferenceMarkdown": capture_report["markdown"],
            "captureDeliverable": str(capture_deliverable.resolve()),
            "captureGate": str((run_dir / "capture-gate.json").resolve()),
            "comparisonTask": str(task.resolve()),
        },
        "deliverables": [
            {
                "label": "原始答案与引用报告",
                "path": str(capture_deliverable.resolve()),
            }
        ],
    })
    return result


def complete_comparison(args: argparse.Namespace, skills: dict[str, Path]) -> dict:
    run_dir = require_run(args.run_dir)
    results_path = Path(args.results).resolve()
    results = validate_and_gate_capture(run_dir, results_path)
    sync_capture_evidence(run_dir, results_path, results)
    analysis_source = (
        Path(args.analysis).resolve()
        if args.analysis
        else run_dir / "comparison-analysis.json"
    )
    analysis = run_dir / "comparison-analysis.json"
    comparison = run_dir / "comparison.json"
    result = run([
        sys.executable,
        str(skills["comparison"] / "scripts" / "knowledge_compare.py"),
        "--input",
        str(results_path),
        "--analysis",
        str(analysis_source),
        "--canonical-analysis-output",
        str(analysis),
        "--output",
        str(comparison),
    ])
    comparison_report = run_dir / "comparison.html"
    run([sys.executable, str(skills["comparison"] / "scripts" / "render_comparison.py"), "--results", str(results_path), "--comparison", str(comparison), "--output", str(comparison_report)])
    comparison_deliverable = run_dir / "02-comparison-report.html"
    shutil.copyfile(comparison_report, comparison_deliverable)
    comparison_data = load_json(comparison)
    comparison_gate = write_comparison_provenance(run_dir, results_path, analysis, comparison)
    result.update({
        "stage": "comparison_completed",
        "knowledgePointCount": len(comparison_data.get("knowledgePoints") or []),
        "needsReviewCount": len(comparison_data.get("needsReview") or []),
        "artifacts": {
            "comparisonAnalysis": str(analysis.resolve()),
            "comparison": str(comparison.resolve()),
            "comparisonReport": str(comparison_report.resolve()),
            "comparisonDeliverable": str(comparison_deliverable.resolve()),
            "comparisonGate": str(comparison_gate.resolve()),
        },
        "deliverables": [
            {
                "label": "知识点对比报告（未核验）",
                "path": str(comparison_deliverable.resolve()),
            }
        ],
    })
    return result


def differing_claims(point: dict) -> list[dict]:
    claims = []
    for platform, claim in (point.get("claims") or {}).items():
        value = str(claim.get("claim") or "").strip()
        if claim.get("covered") and value:
            claims.append({"platform": platform, "claim": value})
    unique = {item["claim"] for item in claims}
    if (point.get("comparison") or {}).get("status") in ("conflict", "partial", "mostly_consensus") and len(unique) >= 2:
        return claims
    return []


def build_requests(comparison: dict, requests_dir: Path) -> dict:
    if comparison.get("schemaVersion") != "fact-check-x/comparison@1":
        raise PipelineError("comparison.json 版本不正确")
    points = comparison.get("knowledgePoints") or []
    if not points:
        raise PipelineError("comparison.json 没有知识点")
    requests_dir.mkdir(parents=True, exist_ok=True)
    expected = {f"{point['id']}.json" for point in points}
    stale = [path.name for path in requests_dir.glob("*.json") if path.name not in expected and path.name != "manifest.json"]
    if stale:
        raise PipelineError(f"请求目录存在不属于本次任务的旧文件：{stale}")
    entries = []
    for point in points:
        knowledge_point = {key: point.get(key) for key in ("id", "description", "role", "core")}
        payload = {"title": comparison.get("question"), "knowledgePoint": knowledge_point}
        differences = differing_claims(point)
        if differences:
            payload["differingClaims"] = differences
        request = {
            "schemaVersion": "fact-check-x/authority-request@1",
            "requestId": point["id"],
            "title": comparison.get("question"),
            "comparisonStatus": (point.get("comparison") or {}).get("status"),
            "knowledgePoint": knowledge_point,
            "claims": point.get("claims") or {},
            "cloudPayload": payload,
            "trustedAnchor": point.get("trustedAnchor") or {"eligible": False},
        }
        path = requests_dir / f"{point['id']}.json"
        dump_json(path, request)
        entries.append({"requestId": point["id"], "file": str(path.resolve()), "hasDifferingClaims": bool(differences), "dknowExempt": bool((point.get("trustedAnchor") or {}).get("eligible"))})
    manifest = {"schemaVersion": "fact-check-x/authority-requests@1", "createdAt": now_iso(), "question": comparison.get("question"), "taskCount": len(entries), "requests": entries}
    dump_json(requests_dir / "manifest.json", manifest)
    return manifest


def prepare_authority(args: argparse.Namespace) -> dict:
    run_dir = require_run(args.run_dir)
    require_capture_gate(run_dir)
    comparison_provenance = require_comparison_provenance(run_dir)
    comparison_path = Path(args.comparison).resolve() if args.comparison else run_dir / "comparison.json"
    recorded_comparison = Path(comparison_provenance["files"]["comparison"]["path"]).resolve()
    if comparison_path != recorded_comparison:
        raise PipelineError("prepare-authority 只能使用 complete-comparison 已锁定的 comparison.json")
    comparison = load_json(comparison_path)
    manifest = build_requests(comparison, run_dir / "authority" / "requests")
    request_ids = expected_request_ids(manifest)
    request_names = {f"{request_id}.json" for request_id in request_ids} | {"manifest.json"}
    request_hashes = json_file_manifest(run_dir / "authority" / "requests", request_names)
    required_count = sum(not entry.get("dknowExempt") for entry in manifest.get("requests") or [])
    configured = bool(trusted_search_key())
    result = {
        "status": "configuration_required" if required_count and not configured else "prepared",
        "taskCount": manifest["taskCount"],
        "trustedSearchRequiredCount": required_count,
        "trustedSearchConfigured": configured,
        "requests": str((run_dir / "authority" / "requests").resolve()),
    }
    if result["status"] == "configuration_required":
        result.update({
            "action": "configure_trusted_search",
            "userPrompt": TRUSTED_SEARCH_CONFIGURATION_PROMPT,
            "configuration": trusted_search_configuration(),
            "blockedReason": "未配置 TRUSTED_SEARCH_KEY，禁止发起可信搜索或使用其他来源绕过",
        })
    dump_json(run_dir / "authority-gate.json", {
        "schemaVersion": "fact-check-x/authority-gate@1",
        "createdAt": now_iso(),
        "status": result["status"],
        "trustedSearchRequiredCount": required_count,
        "trustedSearchConfigured": configured,
        "requests": result["requests"],
        "comparisonSha256": comparison_provenance["files"]["comparison"]["sha256"],
        "requestHashes": request_hashes,
    })
    return result


def search_authority(args: argparse.Namespace, skills: dict[str, Path]) -> dict:
    run_dir = require_run(args.run_dir)
    require_capture_gate(run_dir)
    authority_gate_path = run_dir / "authority-gate.json"
    if not authority_gate_path.exists():
        raise PipelineError("缺少权威核验门禁；必须先执行 prepare-authority")
    authority_gate = load_json(authority_gate_path)
    if authority_gate.get("schemaVersion") != "fact-check-x/authority-gate@1":
        raise PipelineError("权威核验门禁版本不正确")
    requests_manifest = load_json(run_dir / "authority" / "requests" / "manifest.json")
    request_ids = expected_request_ids(requests_manifest)
    current_request_hashes = json_file_manifest(
        run_dir / "authority" / "requests",
        {f"{request_id}.json" for request_id in request_ids} | {"manifest.json"},
    )
    if current_request_hashes != authority_gate.get("requestHashes"):
        raise PipelineError("权威核验请求在 prepare-authority 后被修改，禁止搜索")
    require_comparison_provenance(run_dir)
    required_count = sum(not entry.get("dknowExempt") for entry in requests_manifest.get("requests") or [])
    key = trusted_search_key()
    if required_count and not args.fixtures:
        key = validated_authority_key()
    configured = bool(key)
    if required_count and not configured and not args.fixtures:
        return {
            "status": "configuration_required",
            "action": "configure_trusted_search",
            "trustedSearchRequiredCount": required_count,
            "trustedSearchConfigured": False,
            "userPrompt": TRUSTED_SEARCH_CONFIGURATION_PROMPT,
            "configuration": trusted_search_configuration(),
            "blockedReason": "未配置 TRUSTED_SEARCH_KEY，禁止发起可信搜索或使用其他来源绕过",
        }
    if authority_gate.get("status") == "configuration_required" and not args.fixtures:
        return {
            "status": "configuration_required",
            "action": "configure_trusted_search",
            "trustedSearchRequiredCount": required_count,
            "trustedSearchConfigured": configured,
            "userPrompt": TRUSTED_SEARCH_CONFIGURATION_PROMPT,
            "configuration": trusted_search_configuration(),
            "blockedReason": "配置完成后必须重新执行 prepare-authority，禁止绕过权威核验门禁",
        }
    if authority_gate.get("status") != "prepared":
        raise PipelineError("权威核验门禁状态不允许搜索；请重新执行 prepare-authority")
    command = [
        sys.executable,
        str(skills["authority"] / "scripts" / "batch_search.py"),
        "--requests-dir",
        str(run_dir / "authority" / "requests"),
        "--output-dir",
        str(run_dir / "authority" / "evidence"),
        "--max-workers",
        str(args.max_workers),
    ]
    if args.service_area:
        command.extend(["--service-area", args.service_area])
    if args.fixtures:
        command.extend(["--fixtures", str(Path(args.fixtures).resolve())])
    environment = None
    if key:
        environment = {**os.environ, "TRUSTED_SEARCH_KEY": key}
    result = run(command, environment)
    if result.get("status") != "completed":
        raise PipelineError("可信搜索批次未完成，禁止进入裁决")
    evidence_hashes = json_file_manifest(
        run_dir / "authority" / "evidence",
        {f"{request_id}.json" for request_id in request_ids} | {"batch.json"},
    )
    dump_json(authority_gate_path, {
        **authority_gate,
        "status": "searched",
        "searchedAt": now_iso(),
        "batch": str((run_dir / "authority" / "evidence" / "batch.json").resolve()),
        "evidenceHashes": evidence_hashes,
    })
    return result


def finalize_authority(args: argparse.Namespace, skills: dict[str, Path]) -> dict:
    run_dir = require_run(args.run_dir)
    require_capture_gate(run_dir)
    authority_gate_path = run_dir / "authority-gate.json"
    if not authority_gate_path.exists():
        raise PipelineError("缺少权威核验门禁，禁止裁决")
    authority_gate = load_json(authority_gate_path)
    gate_status = authority_gate.get("status")
    if authority_gate.get("schemaVersion") != "fact-check-x/authority-gate@1" or gate_status not in {"searched", "review_pending"}:
        raise PipelineError("可信搜索尚未通过程序门禁，禁止写入裁决或进入最终报告")
    if not (run_dir / "authority" / "evidence" / "batch.json").exists():
        raise PipelineError("缺少可信搜索批次证明，禁止裁决")
    requests_dir = run_dir / "authority" / "requests"
    manifest = load_json(requests_dir / "manifest.json")
    request_ids = expected_request_ids(manifest)
    if json_file_manifest(
        requests_dir,
        {f"{request_id}.json" for request_id in request_ids} | {"manifest.json"},
    ) != authority_gate.get("requestHashes"):
        raise PipelineError("权威核验请求已被修改，禁止裁决")
    if json_file_manifest(
        run_dir / "authority" / "evidence",
        {f"{request_id}.json" for request_id in request_ids} | {"batch.json"},
    ) != authority_gate.get("evidenceHashes"):
        raise PipelineError("权威证据包已被修改或混入陈旧文件，禁止裁决")
    require_comparison_provenance(run_dir)
    evidence_dir = run_dir / "authority" / "evidence"
    assessments_dir = Path(args.assessments_dir).resolve() if args.assessments_dir else run_dir / "authority" / "assessments"
    results_dir = run_dir / "authority" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    existing_results = list(results_dir.glob("*.json"))
    if gate_status == "review_pending":
        expected_result_names = {f"{request_id}.json" for request_id in request_ids}
        if json_file_manifest(results_dir, expected_result_names) != authority_gate.get("resultHashes"):
            raise PipelineError("待复核结果已被修改或混入额外/陈旧 ID，禁止重新裁决")
        for result_path in existing_results:
            result_path.unlink()
    elif existing_results:
        raise PipelineError("results 目录必须为空；检测到旧文件或手工结果，禁止覆盖式裁决")
    expected_assessments = set()
    for request_id in request_ids:
        evidence = load_json(evidence_dir / f"{request_id}.json")
        if evidence.get("status") == "verified":
            expected_assessments.add(f"{request_id}.json")
    assessment_hashes = json_file_manifest(assessments_dir, expected_assessments)
    statuses = []
    for entry in manifest.get("requests") or []:
        request_id = entry["requestId"]
        command = [
            sys.executable,
            str(skills["authority"] / "scripts" / "authority_verify.py"),
            "finalize",
            "--request",
            str(requests_dir / f"{request_id}.json"),
            "--evidence",
            str(evidence_dir / f"{request_id}.json"),
            "--output",
            str(results_dir / f"{request_id}.json"),
        ]
        assessment = assessments_dir / f"{request_id}.json"
        if assessment.exists():
            command.extend(["--assessment", str(assessment)])
        statuses.append(run(command).get("status"))
    needs_review_count = sum(status == "needs_review" for status in statuses)
    final_status = "needs_review" if needs_review_count else "completed"
    result_hashes = json_file_manifest(results_dir, {f"{request_id}.json" for request_id in request_ids})
    dump_json(authority_gate_path, {
        **authority_gate,
        "status": "review_pending" if needs_review_count else "finalized",
        "finalizedAt": now_iso(),
        "finalizeStatus": final_status,
        "results": str(results_dir.resolve()),
        "assessmentHashes": assessment_hashes,
        "resultHashes": result_hashes,
    })
    comparison = load_json(run_dir / "comparison.json")
    verification = merge_verification(comparison, results_dir)
    verification_path = run_dir / "verification.json"
    authority_report = run_dir / "03-authority-report.html"
    dump_json(verification_path, verification)
    run([
        sys.executable,
        str(skills["authority"] / "scripts" / "render_authority_report.py"),
        "--verification",
        str(verification_path),
        "--output",
        str(authority_report),
    ])
    return {
        "status": final_status,
        "stage": (
            "authority_completed"
            if final_status == "completed"
            else "authority_needs_review"
        ),
        "taskCount": len(statuses),
        "needsReviewCount": needs_review_count,
        "results": str(results_dir.resolve()),
        "artifacts": {
            "verification": str(verification_path.resolve()),
            "authorityReport": str(authority_report.resolve()),
            "authorityGate": str(authority_gate_path.resolve()),
        },
        "deliverables": [
            {
                "label": (
                    "权威证据核验报告"
                    if final_status == "completed"
                    else "权威证据核验报告（待复核）"
                ),
                "path": str(authority_report.resolve()),
            }
        ],
    }


def merge_verification(comparison: dict, results_dir: Path) -> dict:
    points = []
    needs_review = []
    request_count = 0
    exempt_count = 0
    authority_verdicts: dict[tuple[str, str], str] = {}
    for point in comparison.get("knowledgePoints") or []:
        path = results_dir / f"{point['id']}.json"
        if not path.exists():
            raise PipelineError(f"缺少单点核验结果 {point['id']}")
        authority = load_json(path)
        if authority.get("schemaVersion") != "fact-check-x/authority-result@1" or authority.get("requestId") != point["id"]:
            raise PipelineError(f"{point['id']} 的单点核验结果版本或 ID 不正确")
        anchored = bool((point.get("trustedAnchor") or {}).get("eligible"))
        if anchored and (authority.get("searchMode"), authority.get("requestCount")) != ("dknow_exempt", 0):
            raise PipelineError(f"{point['id']} 应免查但请求计数不为 0")
        if not anchored and (authority.get("searchMode"), authority.get("requestCount")) != ("trusted_search", 1):
            raise PipelineError(f"{point['id']} 应恰好进行一次可信搜索")
        request_count += int(authority.get("requestCount") or 0)
        exempt_count += int(authority.get("searchMode") == "dknow_exempt")
        for platform, verdict in (authority.get("verdicts") or {}).items():
            authority_verdicts[(point["id"], platform)] = str(
                verdict.get("verdict") or ""
            )
        finding = str(authority.get("authoritativeFinding") or "").strip()
        if not finding:
            finding = "未取得足够权威证据，当前知识点待复核。"
            authority = {**authority, "authoritativeFinding": finding}
        for review in authority.get("needsReview") or []:
            needs_review.append({"stage": "authority", "knowledgePointId": point["id"], **review})
        points.append({**point, "authority": authority})
    for review in comparison.get("needsReview") or []:
        key = (
            str(review.get("knowledgePointId") or ""),
            str(review.get("platform") or ""),
        )
        if (
            review.get("stage") == "comparison"
            and authority_verdicts.get(key) in ("supported", "contradicted")
        ):
            continue
        needs_review.append(review)
    final_answer_lines = []
    final_answer_point_ids = []
    for point in points:
        finding = str(
            ((point.get("authority") or {}).get("authoritativeFinding") or "")
        ).strip()
        final_answer_point_ids.append(str(point.get("id") or ""))
        final_answer_lines.append(
            f"{point.get('description') or point.get('id')}：{finding}"
        )
    return {
        "schemaVersion": "fact-check-x/verification@2",
        "question": comparison.get("question"),
        "coreQuestion": comparison.get("coreQuestion"),
        "finalAnswer": {
            "status": "needs_review" if needs_review else "verified",
            "answer": "\n".join(final_answer_lines),
            "knowledgePointIds": final_answer_point_ids,
        },
        "createdAt": now_iso(),
        "platforms": comparison.get("platforms") or [],
        "knowledgePoints": points,
        "trustedSearchRequestCount": request_count,
        "dknowExemptCount": exempt_count,
        "needsReview": needs_review,
        "status": "needs_review" if needs_review else "completed",
    }


def deliver(args: argparse.Namespace, skills: dict[str, Path]) -> dict:
    run_dir = require_run(args.run_dir)
    results_path = Path(args.results).resolve()
    require_capture_gate(run_dir, results_path)
    results = validate_capture_results(results_path)
    authority_gate_path = run_dir / "authority-gate.json"
    if not authority_gate_path.exists():
        raise PipelineError("缺少权威核验门禁，禁止生成最终报告")
    authority_gate = load_json(authority_gate_path)
    if (
        authority_gate.get("schemaVersion") != "fact-check-x/authority-gate@1"
        or authority_gate.get("status") != "finalized"
        or authority_gate.get("finalizeStatus") != "completed"
    ):
        raise PipelineError("权威核验尚未通过取证与裁决门禁，禁止生成最终报告")
    comparison_gate = require_comparison_provenance(run_dir)
    comparison_path = Path(args.comparison).resolve() if args.comparison else run_dir / "comparison.json"
    if comparison_path != Path(comparison_gate["files"]["comparison"]["path"]).resolve():
        raise PipelineError("deliver 只能使用 provenance 门禁锁定的 comparison.json")
    requests_manifest = load_json(run_dir / "authority" / "requests" / "manifest.json")
    request_ids = expected_request_ids(requests_manifest)
    if json_file_manifest(
        run_dir / "authority" / "requests",
        {f"{request_id}.json" for request_id in request_ids} | {"manifest.json"},
    ) != authority_gate.get("requestHashes"):
        raise PipelineError("请求文件在裁决后被修改，禁止交付")
    if json_file_manifest(
        run_dir / "authority" / "evidence",
        {f"{request_id}.json" for request_id in request_ids} | {"batch.json"},
    ) != authority_gate.get("evidenceHashes"):
        raise PipelineError("证据文件在裁决后被修改，禁止交付")
    if json_file_manifest(
        run_dir / "authority" / "results",
        {f"{request_id}.json" for request_id in request_ids},
    ) != authority_gate.get("resultHashes"):
        raise PipelineError("结果文件被修改或混入额外/陈旧 ID，禁止交付")
    assessments_dir = run_dir / "authority" / "assessments"
    if json_file_manifest(assessments_dir, set((authority_gate.get("assessmentHashes") or {}).keys())) != authority_gate.get("assessmentHashes"):
        raise PipelineError("assessment 文件被修改、缺失或混入额外文件，禁止交付")
    comparison = load_json(comparison_path)
    verification = merge_verification(comparison, run_dir / "authority" / "results")
    verification_path = run_dir / "verification.json"
    report_path = run_dir / "report.html"
    capture_deliverable = run_dir / "01-capture-report.html"
    comparison_deliverable = run_dir / "02-comparison-report.html"
    authority_deliverable = run_dir / "03-authority-report.html"
    final_deliverable = run_dir / "04-final-report.html"
    report_package = run_dir / PORTABLE_REPORT_PACKAGE
    for stale in (
        run_dir / "03-final-report.html",
        run_dir / "04-complete-report-package.zip",
    ):
        stale.unlink(missing_ok=True)
    capture_dir = run_dir / "capture"
    capture_report = run([
        "node",
        str(skills["collector"] / "assets" / "tool" / "dist" / "report-cli.js"),
        "--input",
        str(results_path),
        "--out",
        str(capture_dir),
    ])
    sync_capture_evidence(run_dir, results_path, results)
    dump_json(verification_path, verification)
    run([
        sys.executable,
        str(skills["authority"] / "scripts" / "render_authority_report.py"),
        "--verification",
        str(verification_path),
        "--output",
        str(authority_deliverable),
    ])
    run([
        sys.executable,
        str(skills["authority"] / "scripts" / "render_final_report.py"),
        "--results",
        str(results_path),
        "--comparison",
        str(comparison_path),
        "--verification",
        str(verification_path),
        "--output",
        str(report_path),
        "--intermediate-dir",
        str(run_dir / "report-input"),
    ])
    shutil.copyfile(capture_report["report"], capture_deliverable)
    shutil.copyfile(run_dir / "comparison.html", comparison_deliverable)
    comparison_deliverable.write_bytes(
        normalize_comparison_navigation(comparison_deliverable.read_bytes())
    )
    shutil.copyfile(report_path, final_deliverable)
    manifest = {
        "schemaVersion": "fact-check-x/pipeline@2",
        "createdAt": now_iso(),
        "status": verification["status"],
        "skills": DEPENDENCIES,
        "knowledgePointCount": len(verification["knowledgePoints"]),
        "trustedSearchRequestCount": verification["trustedSearchRequestCount"],
        "dknowExemptCount": verification["dknowExemptCount"],
        "artifacts": {
            "sourceResults": str(results_path),
            "captureGate": str((run_dir / "capture-gate.json").resolve()),
            "results": capture_report["results"],
            "answerReferenceReport": capture_report["report"],
            "captureDeliverable": str(capture_deliverable.resolve()),
            "answerReferenceMarkdown": capture_report["markdown"],
            "comparisonTask": str((run_dir / "comparison-task.json").resolve()),
            "comparisonAnalysis": str(
                (run_dir / "comparison-analysis.json").resolve()
            ),
            "comparison": str(comparison_path.resolve()),
            "comparisonReport": str((run_dir / "comparison.html").resolve()),
            "comparisonDeliverable": str(comparison_deliverable.resolve()),
            "comparisonGate": str((run_dir / "comparison-gate.json").resolve()),
            "authorityGate": str((run_dir / "authority-gate.json").resolve()),
            "authorityDirectory": str((run_dir / "authority").resolve()),
            "verification": str(verification_path.resolve()),
            "authorityReport": str(authority_deliverable.resolve()),
            "authorityDeliverable": str(authority_deliverable.resolve()),
            "report": str(report_path.resolve()),
            "finalDeliverable": str(final_deliverable.resolve()),
            "reportPackage": str(report_package.resolve()),
        },
    }
    dump_json(run_dir / "pipeline.json", manifest)
    package = build_portable_report_package(run_dir)
    manifest["artifacts"].update({
        "reportPackageSha256": package["sha256"],
        "reportPackageBytes": package["bytes"],
    })
    dump_json(run_dir / "pipeline.json", manifest)
    return {
        "status": manifest["status"],
        "manifest": str((run_dir / "pipeline.json").resolve()),
        "needsReviewCount": len(verification.get("needsReview") or []),
        "artifacts": manifest["artifacts"],
        "answerReferenceReport": manifest["artifacts"]["answerReferenceReport"],
        "comparisonReport": manifest["artifacts"]["comparisonReport"],
        "report": str(report_path.resolve()),
        "deliverables": [
            {"label": "原始答案与引用报告", "path": str(capture_deliverable.resolve())},
            {"label": "知识点对比报告（未核验）", "path": str(comparison_deliverable.resolve())},
            {"label": "权威证据核验报告", "path": str(authority_deliverable.resolve())},
            {"label": "平台表现与完整证据报告", "path": str(final_deliverable.resolve())},
            {
                "label": "完整可分发报告包",
                "path": package["path"],
                "sha256": package["sha256"],
                "portable": True,
            },
        ],
        "trustedSearchRequestCount": manifest["trustedSearchRequestCount"],
        "dknowExemptCount": manifest["dknowExemptCount"],
    }


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Fact-Check-X 轻量统一编排入口。")
    commands = root.add_subparsers(dest="command", required=True)
    commands.add_parser("locate")
    prepare = commands.add_parser("prepare-comparison")
    prepare.add_argument("--results", required=True)
    prepare.add_argument("--run-dir", required=True)
    complete = commands.add_parser("complete-comparison")
    complete.add_argument("--results", required=True)
    complete.add_argument("--run-dir", required=True)
    complete.add_argument("--analysis")
    authority = commands.add_parser("prepare-authority")
    authority.add_argument("--run-dir", required=True)
    authority.add_argument("--comparison")
    search = commands.add_parser("search-authority")
    search.add_argument("--run-dir", required=True)
    search.add_argument("--max-workers", type=int, default=12)
    search.add_argument("--service-area", default="")
    search.add_argument("--fixtures")
    final = commands.add_parser("finalize-authority")
    final.add_argument("--run-dir", required=True)
    final.add_argument("--assessments-dir")
    delivery = commands.add_parser("deliver")
    delivery.add_argument("--results", required=True)
    delivery.add_argument("--run-dir", required=True)
    delivery.add_argument("--comparison")
    return root


def main() -> int:
    args = parser().parse_args()
    try:
        skills = locate_skills()
        if args.command == "locate":
            result = {"status": "completed", "skills": {key: str(path) for key, path in skills.items()}}
        elif args.command == "prepare-comparison":
            result = prepare_comparison(args, skills)
        elif args.command == "complete-comparison":
            result = complete_comparison(args, skills)
        elif args.command == "prepare-authority":
            result = prepare_authority(args)
        elif args.command == "search-authority":
            result = search_authority(args, skills)
        elif args.command == "finalize-authority":
            result = finalize_authority(args, skills)
        else:
            result = deliver(args, skills)
        print(json.dumps(result, ensure_ascii=False))
        if result.get("status") == "configuration_required":
            return 3
        if args.command in ("finalize-authority", "deliver") and result.get("status") == "needs_review":
            return 2
        return 0
    except (PipelineError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "failed", "error": str(exc)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
