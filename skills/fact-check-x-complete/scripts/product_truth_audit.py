#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import hashlib
import importlib.util
import re
import sys
import zipfile
from html.parser import HTMLParser
from urllib.parse import urlparse
from pathlib import Path


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_sha256(value: object) -> str:
    payload = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def final_binding_sha256(point_id: str, platform: str, claim: dict, verdict: dict) -> str:
    return canonical_sha256(
        {
            "pointId": point_id,
            "platform": platform,
            "claim": claim,
            "verdict": verdict,
        }
    )


def bound_elements(markup: str, hash_attribute: str) -> dict[tuple[str, str], dict]:
    pattern = re.compile(
        rf'<(?P<tag>td|div)\b(?P<attrs>[^>]*\bdata-fcx-point="[^"]+"'
        rf'[^>]*\bdata-fcx-platform="[^"]+"'
        rf'[^>]*\b{re.escape(hash_attribute)}="[0-9a-f]*"[^>]*)>'
        rf'(?P<body>.*?)</(?P=tag)>',
        re.DOTALL,
    )
    output: dict[tuple[str, str], dict] = {}
    for match in pattern.finditer(markup):
        attrs = {
            key: html.unescape(value)
            for key, value in re.findall(r'(data-fcx-[a-z0-9-]+)="([^"]*)"', match.group("attrs"))
        }
        key = (attrs.get("data-fcx-point", ""), attrs.get("data-fcx-platform", ""))
        if key in output:
            output[key]["duplicate"] = True
            continue
        output[key] = {
            "sha256": attrs.get(hash_attribute, ""),
            "text": visible_text(match.group("body")),
            "duplicate": False,
        }
    return output


def reference_captured_text(reference: dict) -> str:
    values = []
    for key in ("snippet", "text", "content", "body"):
        value = str(reference.get(key) or "").strip()
        if value and value not in values:
            values.append(value)
    return "\n".join(values)


def capture_artifact_failures(capture: dict, capture_dir: Path) -> list[str]:
    failures = []
    root = capture_dir.resolve()
    for platform in capture.get("platforms") or []:
        platform_id = str(platform.get("platform") or "unknown")
        artifacts = platform.get("artifacts") or {}
        if not isinstance(artifacts, dict):
            failures.append(f"{platform_id}:capture_artifacts_invalid")
            continue
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
                failures.append(
                    f"{platform_id}:{artifact_type}_artifact_path_not_portable"
                )
                continue
            artifact = (root / relative).resolve()
            try:
                artifact.relative_to(root)
            except ValueError:
                failures.append(
                    f"{platform_id}:{artifact_type}_artifact_path_escape"
                )
                continue
            if not artifact.is_file():
                failures.append(
                    f"{platform_id}:{artifact_type}_artifact_missing:{relative.as_posix()}"
                )
    return failures


class LocalLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.targets: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        for attribute in ("href", "src"):
            value = str(values.get(attribute) or "").strip()
            if value:
                self.targets.append(value)


def report_local_link_failures(report_path: Path) -> list[str]:
    parser = LocalLinkParser()
    parser.feed(report_path.read_text(encoding="utf-8"))
    failures = []
    for target in parser.targets:
        parsed = urlparse(target)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        linked = (report_path.parent / parsed.path).resolve()
        if not linked.is_file():
            failures.append(f"{report_path.name}:local_link_missing:{parsed.path}")
    return failures


def expected_portable_files(run_dir: Path) -> dict[str, bytes]:
    root = "fact-check-x-report"
    expected = {
        f"{root}/README.txt": (
            "Fact-Check-X 完整事实核验报告包\n\n"
            "建议按以下顺序打开：\n"
            "1. 01-capture-report.html：原始答案、参考文献与引用存证\n"
            "2. 02-comparison-report.html：知识点结构化对比\n"
            "3. 03-authority-report.html：权威证据核验\n"
            "4. 04-final-report.html：平台表现与完整证据\n\n"
            "请先解压整个压缩包，再用浏览器打开 HTML 文件，以保留截图、页面存证和报告导航。\n"
        ).encode("utf-8")
    }
    for name in (
        "01-capture-report.html",
        "02-comparison-report.html",
        "03-authority-report.html",
        "04-final-report.html",
    ):
        content = (run_dir / name).read_bytes()
        if name == "02-comparison-report.html":
            content = content.replace(
                b'href="capture/report.html"', b'href="01-capture-report.html"'
            ).replace(b'href="report.html"', b'href="04-final-report.html"')
            if b'href="03-authority-report.html"' not in content:
                content = content.replace(
                    b'<a href="04-final-report.html">',
                    b'<a href="03-authority-report.html">\xe6\x9d\x83\xe5\xa8\x81\xe8\xaf\x81\xe6\x8d\xae\xe6\xa0\xb8\xe9\xaa\x8c</a>'
                    b'<a href="04-final-report.html">',
                )
        expected[f"{root}/{name}"] = content
    artifacts = run_dir / "capture/artifacts"
    if artifacts.exists():
        for source in sorted(path for path in artifacts.rglob("*") if path.is_file()):
            expected[f"{root}/artifacts/{source.relative_to(artifacts).as_posix()}"] = source.read_bytes()
    data_files = (
        "capture/results.json",
        "capture/report.md",
        "capture/capture-recovery.json",
        "capture-gate.json",
        "comparison-task.json",
        "comparison-analysis.json",
        "comparison.json",
        "comparison-gate.json",
        "authority-gate.json",
        "verification.json",
        "pipeline.json",
    )

    def portable_bytes(source: Path) -> bytes:
        if source.suffix.lower() != ".json":
            return source.read_bytes()

        def scrub(value: object) -> object:
            if isinstance(value, dict):
                return {key: scrub(item) for key, item in value.items()}
            if isinstance(value, list):
                return [scrub(item) for item in value]
            if isinstance(value, str):
                path = Path(value)
                if path.is_absolute():
                    try:
                        return path.relative_to(run_dir).as_posix()
                    except ValueError:
                        return path.name
            return value

        payload = scrub(load(source))
        if source.name == "pipeline.json":
            artifacts = payload.get("artifacts") or {}
            artifacts.pop("reportPackageSha256", None)
            artifacts.pop("reportPackageBytes", None)
        return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode(
            "utf-8"
        )

    for relative in data_files:
        source = run_dir / relative
        if source.exists():
            expected[f"{root}/data/{relative}"] = portable_bytes(source)
    for directory in (run_dir / "authority", run_dir / "report-input"):
        if directory.exists():
            for source in sorted(path for path in directory.rglob("*") if path.is_file()):
                relative = source.relative_to(run_dir).as_posix()
                expected[f"{root}/data/{relative}"] = portable_bytes(source)
    return expected


def file_manifest(directory: Path, names: set[str]) -> dict[str, str]:
    actual = {path.name for path in directory.glob("*.json") if path.is_file()}
    if actual != names:
        return {}
    return {name: digest(directory / name) for name in sorted(names)}


def visible_text(markup: str) -> str:
    return re.sub(r"\s+", "", html.unescape(re.sub(r"<[^>]+>", " ", markup)))


def ordered_unique(values: list[object]) -> bool:
    return len(values) == len(set(values))


def valid_url(value: object) -> bool:
    parsed = urlparse(str(value or ""))
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def load_contract(script: Path) -> dict:
    return load(script.parents[1] / "references/product-truth-contract.json")


def load_metrics_function(script: Path):
    packaged = script.parents[1] / "modules/fact-check-x-authoritative-verify/scripts/render_final_report.py"
    source = script.parents[2] / "fact-check-x-authoritative-verify/scripts/render_final_report.py"
    target = packaged if packaged.exists() else source
    spec = importlib.util.spec_from_file_location("fact_check_x_render_final", target)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.path.insert(0, str(target.parent))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.pop(0)
    return module.metrics


def effective_reference_indexes(claim: dict) -> list[int]:
    return sorted({
        *[item for item in claim.get("citedReferenceIndexes") or [] if isinstance(item, int)],
        *[item for item in claim.get("answerLevelReferenceIndexes") or [] if isinstance(item, int)],
    })


def canonical_comparison(value: object) -> dict:
    if not isinstance(value, dict):
        return {}
    aliases = {
        "agreement": "consensus",
        "基本一致": "mostly_consensus",
    }
    result = dict(value)
    result["status"] = aliases.get(result.get("status"), result.get("status"))
    return result


def stage_claim_projection(claim: dict) -> dict:
    return {
        key: claim.get(key)
        for key in (
            "covered", "claim", "answerExcerpt", "faithfulness", "evidence",
        )
        if key in claim
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="独立检查 Fact-Check-X 阶段守恒与产品真值契约。")
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--candidate-sha256", required=True)
    parser.add_argument("--output")
    args = parser.parse_args()
    run_dir = Path(args.run_dir).expanduser().resolve()
    failures: list[str] = []
    contract = load_contract(Path(__file__).resolve())
    conservation = contract.get("conservation") or {}
    claim_fields = list(conservation.get("claimFields") or [])
    point_fields = list(conservation.get("pointFields") or [])
    required = list(contract.get("stageArtifacts") or [])
    for name in required:
        if not (run_dir / name).exists():
            failures.append(f"missing_artifact:{name}")
    if not failures:
        capture = load(run_dir / "capture/results.json")
        failures.extend(capture_artifact_failures(capture, run_dir / "capture"))
        raw = load(run_dir / "comparison-analysis.json")
        comparison = load(run_dir / "comparison.json")
        verification = load(run_dir / "verification.json")
        comparison_task = load(run_dir / "comparison-task.json")
        comparison_html = (run_dir / "02-comparison-report.html").read_text(
            encoding="utf-8"
        )
        authority_html = (run_dir / "03-authority-report.html").read_text(
            encoding="utf-8"
        )
        authority_text = visible_text(authority_html)
        final_html = (run_dir / "04-final-report.html").read_text(encoding="utf-8")
        final_text = visible_text(final_html)
        platforms = [p.get("platform") for p in capture.get("platforms") or []]
        if len(platforms) < int(contract.get("minimumPlatforms") or 1):
            failures.append("minimum_platforms_not_met")
        comparison_platforms = [p.get("platform") for p in comparison.get("platforms") or []]
        verification_platforms = [p.get("platform") for p in verification.get("platforms") or []]
        if not ordered_unique(platforms) or platforms != comparison_platforms or platforms != verification_platforms:
            failures.append("platforms_not_conserved")
        capture_map = {p.get("platform"): p for p in capture.get("platforms") or []}
        task_platforms = comparison_task.get("platforms") or []
        task_platform_ids = [item.get("platform") for item in task_platforms]
        if (
            comparison_task.get("schemaVersion")
            != "fact-check-x/comparison-task@1"
            or comparison_task.get("question") != capture.get("question")
            or task_platform_ids != platforms
        ):
            failures.append("comparison_task_not_bound_to_capture")
        else:
            for task_platform in task_platforms:
                platform_id = task_platform.get("platform")
                captured_platform = capture_map.get(platform_id) or {}
                if (
                    task_platform.get("label")
                    != (captured_platform.get("label") or platform_id)
                    or task_platform.get("answerMarkdown")
                    != captured_platform.get("answerMarkdown")
                ):
                    failures.append(f"{platform_id}:comparison_task_answer_mismatch")
                task_references = task_platform.get("references") or []
                captured_references = captured_platform.get("references") or []
                if len(task_references) != len(captured_references):
                    failures.append(f"{platform_id}:comparison_task_reference_count_mismatch")
                    continue
                for reference_index, (task_reference, captured_reference) in enumerate(
                    zip(task_references, captured_references), 1
                ):
                    expected_reference = {
                        "index": reference_index,
                        "title": str(
                            captured_reference.get("title")
                            or captured_reference.get("text")
                            or captured_reference.get("url")
                            or ""
                        ),
                        "originalUrl": str(captured_reference.get("url") or ""),
                        "normalizedUrl": str(
                            captured_reference.get("normalizedUrl") or ""
                        ),
                        "marker": str(captured_reference.get("marker") or "").strip(),
                        "capturedText": reference_captured_text(captured_reference),
                    }
                    if any(
                        task_reference.get(key) != value
                        for key, value in expected_reference.items()
                    ):
                        failures.append(
                            f"{platform_id}:comparison_task_reference_{reference_index}_mismatch"
                        )
        raw_points = raw.get("knowledgePoints") or []
        points = comparison.get("knowledgePoints") or []
        verified = verification.get("knowledgePoints") or []
        raw_ids = [str(point.get("id") or f"K{index + 1}") for index, point in enumerate(raw_points)]
        comparison_ids = [str(point.get("id")) for point in points]
        verification_ids = [str(point.get("id")) for point in verified]
        if (
            not points
            or not ordered_unique(comparison_ids)
            or raw_ids != comparison_ids
            or comparison_ids != verification_ids
        ):
            failures.append("knowledge_points_not_conserved")
        raw_draft = raw.get("synthesisDraft")
        normalized_draft = comparison.get("synthesisDraft")
        if (
            not isinstance(raw_draft, dict)
            or raw_draft != normalized_draft
            or normalized_draft.get("status") != "unverified"
            or not str(normalized_draft.get("answer") or "").strip()
            or not ordered_unique(
                list(normalized_draft.get("basisKnowledgePointIds") or [])
            )
            or not set(normalized_draft.get("basisKnowledgePointIds") or [])
            .issubset(set(comparison_ids))
            or re.sub(r"\s+", "", str(normalized_draft.get("answer") or ""))
            not in visible_text(comparison_html)
        ):
            failures.append("synthesis_draft_not_conserved")
        final_answer = verification.get("finalAnswer")
        if (
            not isinstance(final_answer, dict)
            or final_answer.get("status") != "verified"
            or not str(final_answer.get("answer") or "").strip()
            or final_answer.get("knowledgePointIds") != comparison_ids
            or re.sub(r"\s+", "", str(final_answer.get("answer") or ""))
            not in authority_text
        ):
            failures.append("final_answer_not_conserved")
        comparison_map = {point.get("id"): point for point in points}
        verification_map = {point.get("id"): point for point in verified}
        capture_gate = load(run_dir / "capture-gate.json")
        comparison_gate = load(run_dir / "comparison-gate.json")
        authority_gate = load(run_dir / "authority-gate.json")
        capture_gate_results = Path(
            str(capture_gate.get("results") or "")
        ).expanduser().resolve()
        if (
            capture_gate.get("schemaVersion") != "fact-check-x/capture-gate@1"
            or capture_gate.get("status") != "completed"
            or not capture_gate_results.is_file()
            or capture_gate.get("sha256") != digest(capture_gate_results)
            or load(capture_gate_results) != capture
            or capture_gate.get("question") != capture.get("question")
            or capture_gate.get("platforms") != platforms
        ):
            failures.append("capture_gate_not_bound")
        comparison_files = comparison_gate.get("files") or {}
        expected_comparison_hashes = {
            "results": digest(capture_gate_results)
            if capture_gate_results.is_file()
            else "",
            "analysis": digest(run_dir / "comparison-analysis.json"),
            "comparison": digest(run_dir / "comparison.json"),
        }
        if (
            comparison_gate.get("schemaVersion")
            != "fact-check-x/comparison-gate@1"
            or comparison_gate.get("status") != "completed"
            or {
                key: (comparison_files.get(key) or {}).get("sha256")
                for key in expected_comparison_hashes
            }
            != expected_comparison_hashes
            or Path(
                str((comparison_files.get("analysis") or {}).get("path") or "")
            ).expanduser().resolve()
            != (run_dir / "comparison-analysis.json")
            or Path(
                str((comparison_files.get("comparison") or {}).get("path") or "")
            ).expanduser().resolve()
            != (run_dir / "comparison.json")
        ):
            failures.append("comparison_gate_not_bound")
        point_ids = set(comparison_ids)
        request_names = {f"{point_id}.json" for point_id in point_ids} | {"manifest.json"}
        evidence_names = {f"{point_id}.json" for point_id in point_ids} | {"batch.json"}
        result_names = {f"{point_id}.json" for point_id in point_ids}
        request_manifest = file_manifest(run_dir / "authority/requests", request_names)
        evidence_manifest = file_manifest(run_dir / "authority/evidence", evidence_names)
        result_manifest = file_manifest(run_dir / "authority/results", result_names)
        requests_index = load(run_dir / "authority/requests/manifest.json")
        evidence_batch = load(run_dir / "authority/evidence/batch.json")
        if (
            authority_gate.get("schemaVersion") != "fact-check-x/authority-gate@1"
            or authority_gate.get("status") != "finalized"
            or authority_gate.get("finalizeStatus") != "completed"
            or authority_gate.get("comparisonSha256")
            != digest(run_dir / "comparison.json")
            or authority_gate.get("requestHashes") != request_manifest
            or authority_gate.get("evidenceHashes") != evidence_manifest
            or authority_gate.get("resultHashes") != result_manifest
        ):
            failures.append("authority_gate_not_bound")
        indexed_ids = [
            str(item.get("requestId") or "")
            for item in requests_index.get("requests") or []
        ]
        if (
            requests_index.get("schemaVersion")
            != "fact-check-x/authority-requests@1"
            or requests_index.get("taskCount") != len(points)
            or indexed_ids != comparison_ids
            or evidence_batch.get("schemaVersion")
            != "fact-check-x/authority-batch@1"
            or evidence_batch.get("taskCount") != len(points)
        ):
            failures.append("authority_batch_index_not_conserved")
        for index, raw_point in enumerate(raw_points):
            point_id = raw_ids[index]
            path = f"knowledgePoints[{index}]"
            claims = raw_point.get("claims") if isinstance(raw_point, dict) else {}
            for field in point_fields:
                if field not in raw_point:
                    failures.append(f"{path}:missing_{field}")
            for platform in platforms:
                claim = claims.get(platform) if isinstance(claims, dict) else None
                if not isinstance(claim, dict):
                    failures.append(f"{path}.{platform}:missing_claim")
                    continue
                for field in claim_fields:
                    if field not in claim:
                        failures.append(f"{path}.{platform}:missing_{field}")
                if claim.get("covered") and (
                    not str(claim.get("claim") or "").strip()
                    or not str(claim.get("answerExcerpt") or "").strip()
                ):
                    failures.append(f"{point_id}.{platform}:covered_claim_text_empty")
                normalized_claim = (comparison_map.get(point_id, {}).get("claims") or {}).get(platform) or {}
                verified_claim = (verification_map.get(point_id, {}).get("claims") or {}).get(platform) or {}
                authority_claim = (
                    ((verification_map.get(point_id, {}).get("authority") or {}).get("claims") or {}).get(platform)
                    or {}
                )
                for field, value in stage_claim_projection(claim).items():
                    if normalized_claim.get(field) != value:
                        failures.append(f"{point_id}.{platform}:{field}_lost_at_comparison")
                if effective_reference_indexes(normalized_claim) != effective_reference_indexes(claim):
                    failures.append(f"{point_id}.{platform}:effective_reference_indexes_lost_at_comparison")
                if normalized_claim != verified_claim or normalized_claim != authority_claim:
                    failures.append(f"{point_id}.{platform}:claim_not_conserved_to_authority")
                references = capture_map.get(platform, {}).get("references") or []
                answer = str(capture_map.get(platform, {}).get("answerMarkdown") or "")
                if claim.get("covered") and (
                    not str(claim.get("answerExcerpt") or "").strip()
                    or str(claim.get("answerExcerpt")) not in answer
                ):
                    failures.append(f"{point_id}.{platform}:answer_excerpt_not_locatable")
                cited = set(claim.get("citedReferenceIndexes") or []) | set(claim.get("answerLevelReferenceIndexes") or [])
                evidence_indexes = {item.get("referenceIndex") for item in claim.get("evidence") or []}
                if claim.get("faithfulness") in {"supported", "contradicted"} and not evidence_indexes.issubset(cited):
                    failures.append(f"{point_id}.{platform}:evidence_indexes_not_cited")
                for evidence in claim.get("evidence") or []:
                    ref_index = evidence.get("referenceIndex")
                    if not isinstance(ref_index, int) or not (1 <= ref_index <= len(references)):
                        failures.append(f"{point_id}.{platform}:evidence_reference_out_of_range")
                        continue
                    reference = references[ref_index - 1]
                    captured_text = " ".join(
                        str(reference.get(key) or "")
                        for key in ("title", "snippet", "capturedText", "content")
                    )
                    excerpt_parts = [
                        re.sub(r"\s+", "", part)
                        for part in str(evidence.get("excerpt") or "").splitlines()
                        if part.strip()
                    ]
                    captured_compact = re.sub(r"\s+", "", captured_text)
                    reference_urls = " ".join(
                        str(reference.get(key) or "")
                        for key in (
                            "url", "officialUrl", "official_url",
                            "sourceUrl", "source_url",
                        )
                    )

                    def locatable(part: str) -> bool:
                        if part in captured_compact:
                            return True
                        attribution = re.search(
                            r"([A-Za-z0-9.-]+\.[A-Za-z]{2,})$", part
                        )
                        if not attribution:
                            return False
                        label = part[:attribution.start()]
                        return (
                            bool(label)
                            and label in captured_compact
                            and attribution.group(1) in reference_urls
                        )

                    if not excerpt_parts or not all(
                        locatable(part) for part in excerpt_parts
                    ):
                        failures.append(f"{point_id}.{platform}:evidence_excerpt_not_locatable")
            if not isinstance(raw_point.get("comparison"), dict):
                failures.append(f"{path}:missing_comparison")
            if not isinstance(raw_point.get("trustedAnchor"), dict):
                failures.append(f"{path}:missing_trusted_anchor")
            if canonical_comparison(raw_point.get("comparison")) != canonical_comparison(
                comparison_map.get(point_id, {}).get("comparison")
            ):
                failures.append(f"{point_id}:comparison_not_conserved")
        insufficient = [
            claim
            for point in points
            for claim in (point.get("claims") or {}).values()
            if claim.get("covered") and claim.get("faithfulness") == "insufficient"
        ]
        covered = [
            claim for point in points for claim in (point.get("claims") or {}).values()
            if claim.get("covered")
        ]
        if covered and len(insufficient) == len(covered):
            failures.append("all_claims_insufficient_flood")
        anchored_ids = {
            point.get("id")
            for point in points
            if (point.get("trustedAnchor") or {}).get("eligible")
        }
        comparison_cells = bound_elements(
            comparison_html, "data-fcx-claim-sha256"
        )
        final_cells = bound_elements(
            final_html, "data-fcx-binding-sha256"
        )
        authority_cells = bound_elements(
            authority_html, "data-fcx-authority-binding-sha256"
        )
        for point in points:
            point_id = point.get("id")
            for platform, claim in (point.get("claims") or {}).items():
                cell_key = (str(point_id), str(platform))
                comparison_cell = comparison_cells.get(cell_key)
                expected_claim_sha = canonical_sha256(claim)
                if (
                    not comparison_cell
                    or comparison_cell.get("duplicate")
                    or comparison_cell.get("sha256") != expected_claim_sha
                ):
                    failures.append(
                        f"{point_id}.{platform}:comparison_cell_not_bound"
                    )
                elif claim.get("covered"):
                    comparison_cell_text = comparison_cell.get("text") or ""
                    for field in ("claim", "reason"):
                        value = re.sub(
                            r"\s+", "", str(claim.get(field) or "").strip()
                        )
                        if value and value not in comparison_cell_text:
                            failures.append(
                                f"{point_id}.{platform}:{field}_not_in_comparison_cell"
                            )
                if not claim.get("covered"):
                    continue
                verdict = (
                    ((verification_map.get(point_id) or {}).get("authority") or {})
                    .get("verdicts", {})
                    .get(platform)
                    or {}
                )
                final_cell = final_cells.get(cell_key)
                expected_final_sha = final_binding_sha256(
                    str(point_id), str(platform), claim, verdict
                )
                authority_cell = authority_cells.get(cell_key)
                if (
                    not authority_cell
                    or authority_cell.get("duplicate")
                    or authority_cell.get("sha256") != expected_final_sha
                ):
                    failures.append(
                        f"{point_id}.{platform}:authority_report_cell_not_bound"
                    )
                else:
                    authority_cell_text = authority_cell.get("text") or ""
                    for label, value in (
                        ("claim", claim.get("claim")),
                        ("answer_excerpt", claim.get("answerExcerpt")),
                    ):
                        compact = re.sub(r"\s+", "", str(value or "").strip())
                        if compact and compact not in authority_cell_text:
                            failures.append(
                                f"{point_id}.{platform}:{label}_not_in_authority_report"
                            )
                if (
                    not final_cell
                    or final_cell.get("duplicate")
                    or final_cell.get("sha256") != expected_final_sha
                ):
                    failures.append(f"{point_id}.{platform}:final_cell_not_bound")
                else:
                    final_cell_text = final_cell.get("text") or ""
                    for label, value in (
                        ("claim", claim.get("claim")),
                        ("verdict_reason", verdict.get("reason")),
                    ):
                        compact = re.sub(r"\s+", "", str(value or "").strip())
                        if compact and compact not in final_cell_text:
                            failures.append(
                                f"{point_id}.{platform}:{label}_not_in_final_cell"
                            )
                for field in ("claim", "answerExcerpt"):
                    value = str(claim.get(field) or "").strip()
                    if value and value not in final_html:
                        failures.append(f"{point_id}.{platform}:{field}_not_in_final_report")
            anchor = point.get("trustedAnchor") or {}
            for item in anchor.get("evidence") or []:
                excerpt = str(item.get("excerpt") or "").strip()
                if excerpt and re.sub(r"\s+", "", excerpt) not in final_text:
                    failures.append(f"{point_id}:anchor_evidence_not_in_final_report")
                if not valid_url(item.get("url")):
                    failures.append(f"{point_id}:anchor_evidence_url_invalid")
            if anchor != (verification_map.get(point_id) or {}).get("trustedAnchor"):
                failures.append(f"{point_id}:trusted_anchor_not_conserved")
            if point_id in anchored_ids:
                authority = (verification_map.get(point_id) or {}).get("authority") or {}
                verdict = (authority.get("verdicts") or {}).get("dknowc-chat") or {}
                if verdict.get("category") != "direct_accurate":
                    failures.append(f"{point_id}:trusted_anchor_not_direct_accurate")
                if authority.get("searchMode") != "dknow_exempt":
                    failures.append(f"{point_id}:trusted_anchor_wrong_search_mode")
                if authority.get("requestCount") != 0:
                    failures.append(f"{point_id}:trusted_anchor_researched_again")
                if verdict.get("verdict") != "supported":
                    failures.append(f"{point_id}:trusted_anchor_not_supported")
            authority = (verification_map.get(point_id) or {}).get("authority") or {}
            request = load(run_dir / f"authority/requests/{point_id}.json")
            evidence_record = load(run_dir / f"authority/evidence/{point_id}.json")
            result_record = load(run_dir / f"authority/results/{point_id}.json")
            if (
                request.get("requestId") != point_id
                or request.get("claims") != point.get("claims")
                or request.get("trustedAnchor") != point.get("trustedAnchor")
                or evidence_record.get("requestId") != point_id
                or result_record != authority
            ):
                failures.append(f"{point_id}:authority_artifacts_not_conserved")
            authority_claims = authority.get("claims") or {}
            verdicts = authority.get("verdicts") or {}
            if set(authority_claims) != set(platforms) or set(verdicts) != set(platforms):
                failures.append(f"{point_id}:authority_platform_set_mismatch")
            evidence_ids = {item.get("id") for item in authority.get("evidence") or []}
            for platform, verdict in verdicts.items():
                if not authority_claims.get(platform, {}).get("covered") and verdict.get("category") != "omitted":
                    failures.append(f"{point_id}.{platform}:uncovered_verdict_not_omitted")
                if not set(verdict.get("evidenceIds") or []).issubset(evidence_ids):
                    failures.append(f"{point_id}.{platform}:verdict_evidence_id_invalid")
                reason = str(verdict.get("reason") or "").strip()
                if reason and re.sub(r"\s+", "", reason) not in authority_text:
                    failures.append(
                        f"{point_id}.{platform}:verdict_reason_not_in_authority_report"
                    )
                if reason and re.sub(r"\s+", "", reason) not in final_text:
                    failures.append(f"{point_id}.{platform}:verdict_reason_not_in_final_report")
            finding = str(authority.get("authoritativeFinding") or "").strip()
            if finding and re.sub(r"\s+", "", finding) not in authority_text:
                failures.append(
                    f"{point_id}:authoritative_finding_not_in_authority_report"
                )
            if finding and re.sub(r"\s+", "", finding) not in final_text:
                failures.append(f"{point_id}:authoritative_finding_not_in_final_report")
            for evidence in authority.get("evidence") or []:
                for field in ("title", "body"):
                    value = str(evidence.get(field) or "").strip()
                    if (
                        value
                        and re.sub(r"\s+", "", value)
                        not in authority_text
                    ):
                        failures.append(
                            f"{point_id}:authority_evidence_{field}_not_in_authority_report"
                        )
        if verification.get("dknowExemptCount") != len(anchored_ids):
            failures.append("dknow_exempt_count_mismatch")
        expected_searches = len(points) - len(anchored_ids)
        if verification.get("trustedSearchRequestCount") != expected_searches:
            failures.append("trusted_search_request_count_mismatch")
        if verification.get("status") != "completed":
            failures.append("verification_not_completed")
        pipeline = load(run_dir / "pipeline.json")
        report_package = run_dir / "05-complete-report-package.zip"
        if (
            pipeline.get("status") != "completed"
            or pipeline.get("knowledgePointCount") != len(points)
            or pipeline.get("trustedSearchRequestCount") != verification.get("trustedSearchRequestCount")
            or pipeline.get("dknowExemptCount") != verification.get("dknowExemptCount")
        ):
            failures.append("pipeline_metrics_not_conserved")
        package_artifact = (pipeline.get("artifacts") or {}).get("reportPackageSha256")
        if package_artifact != digest(report_package):
            failures.append("pipeline_report_package_hash_mismatch")
        with zipfile.ZipFile(report_package) as archive:
            if archive.testzip():
                failures.append("portable_package_corrupt")
            names = {name for name in archive.namelist() if not name.endswith("/")}
            expected_package = expected_portable_files(run_dir)
            if names != set(expected_package):
                failures.append("portable_package_file_set_mismatch")
            for name, expected_bytes in expected_package.items():
                if name not in names or archive.read(name) != expected_bytes:
                    failures.append(f"portable_package_content_mismatch:{name}")
            run_path = str(run_dir).encode("utf-8")
            if any(
                run_path in archive.read(name)
                for name in names
                if not name.endswith("/")
            ):
                failures.append("portable_package_contains_host_path")
        legacy_path = run_dir / "report-input/legacy-analysis.json"
        if not legacy_path.exists():
            failures.append("missing_legacy_report_data")
        else:
            legacy = load(legacy_path)
            recomputed_metrics = load_metrics_function(Path(__file__).resolve())(verified, verification.get("platforms") or [])
            if legacy.get("platform_metrics") != recomputed_metrics:
                failures.append("embedded_report_metrics_mismatch")
            metrics_json = json.dumps(recomputed_metrics, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            metrics_sha = hashlib.sha256(metrics_json.encode("utf-8")).hexdigest()
            if f'name="fact-check-x-metrics-sha256" content="{metrics_sha}"' not in final_html:
                failures.append("final_report_metrics_hash_missing")
            if not legacy.get("platform_metrics"):
                failures.append("missing_embedded_report_metrics")
        html = (run_dir / "01-capture-report.html").read_text(encoding="utf-8")
        for report_name in (
            "01-capture-report.html",
            "02-comparison-report.html",
            "03-authority-report.html",
            "04-final-report.html",
        ):
            failures.extend(report_local_link_failures(run_dir / report_name))
        for target in (
            "01-capture-report.html",
            "03-authority-report.html",
            "04-final-report.html",
        ):
            if f'href="{target}"' not in comparison_html:
                failures.append(f"comparison_navigation_missing:{target}")
        for report_name, report_html in (
            ("capture", html),
            ("comparison", comparison_html),
            ("authority", authority_html),
            ("final", final_html),
        ):
            if any(
                retired in report_html
                for retired in (
                    "深知可信搜索官方来源",
                    "【深知可信搜索官方来源】",
                    "可信搜索官方来源",
                )
            ):
                failures.append(f"{report_name}:retired_source_label")
        layout = contract.get("layout") or {}
        width = int(layout.get("sourceMatrixTitleColumnPercent") or 50)
        if f"#references th:first-child, #references td:first-child {{ width: {width}%; }}" not in html:
            failures.append("source_matrix_title_width")
        if layout.get("sourceMatrixTextAlign") == "center" and "text-align: center" not in html:
            failures.append("source_matrix_alignment")
        trusted_contract = contract.get("trustedSearch") or {}
        if trusted_contract.get("displayLabel") != "官方来源":
            failures.append("trusted_search_display_contract_invalid")
    result = {
        "schemaVersion": "fact-check-x/product-truth-audit@3",
        "status": "passed" if not failures else "failed",
        "contractSchemaVersion": contract.get("schemaVersion"),
        "contractSha256": digest(Path(__file__).resolve().parents[1] / "references/product-truth-contract.json"),
        "candidateSha256": args.candidate_sha256,
        "runDir": str(run_dir),
        "artifactSha256": {
            name: digest(run_dir / name) for name in required if (run_dir / name).exists()
        },
        "failures": failures,
    }
    output = Path(args.output).resolve() if args.output else run_dir / "product-truth-audit.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
