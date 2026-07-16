import os
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "tools" / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import changed_skill_evidence


README = """# Test

### Official Sources

- [owner/official](https://github.com/owner/official)

### Community Contributors

- [owner/community](https://github.com/owner/community)
"""


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    return result.stdout.strip()


def write_skill(
    root: Path,
    skill_id: str,
    *,
    source: str = "self",
    source_type: str | None = None,
    source_repo: str | None = None,
    include_examples: bool = True,
    extra_body: str = "",
) -> Path:
    directory = root / "skills" / skill_id
    directory.mkdir(parents=True, exist_ok=True)
    metadata = [
        f"name: {skill_id.rsplit('/', 1)[-1]}",
        "description: A sufficiently complete example skill for focused evidence tests",
        "risk: safe",
        f"source: {source}",
        "date_added: 2026-07-13",
    ]
    if source_type is not None:
        metadata.append(f"source_type: {source_type}")
    if source_repo is not None:
        metadata.append(f"source_repo: {source_repo}")
    examples = """## Examples
```bash
echo hello
```
""" if include_examples else ""
    body = f"""# {skill_id}

## Overview
This skill provides enough documentation to be evaluated deterministically.

## When to Use
- Use when validating changed-skill evidence.

{examples}
## Limitations
- This is a test fixture.

{extra_body}
"""
    path = directory / "SKILL.md"
    metadata_text = "\n".join(metadata)
    path.write_text(f"---\n{metadata_text}\n---\n\n{body}", encoding="utf-8")
    return path


def init_repo(*, with_skill: bool = True) -> tuple[Path, str]:
    root = Path(tempfile.mkdtemp())
    git(root, "init", "-b", "main")
    git(root, "config", "user.email", "tests@example.com")
    git(root, "config", "user.name", "Tests")
    (root / "README.md").write_text(README, encoding="utf-8")
    if with_skill:
        write_skill(root, "example")
    git(root, "add", ".")
    git(root, "commit", "-m", "base")
    return root, git(root, "rev-parse", "HEAD")


class ChangedSkillEvidenceTests(unittest.TestCase):
    def test_mixed_copy_and_rename_keep_distinct_change_types(self):
        root, base = init_repo()
        original = root / "skills/example/SKILL.md"
        copied = root / "skills/aaa/SKILL.md"
        copied.parent.mkdir(parents=True)
        copied.write_text(original.read_text(encoding="utf-8").replace("name: example", "name: aaa"), encoding="utf-8")
        git(root, "mv", "skills/example", "skills/zzz")
        renamed = root / "skills/zzz/SKILL.md"
        renamed.write_text(renamed.read_text(encoding="utf-8").replace("name: example", "name: zzz"), encoding="utf-8")
        git(root, "add", "-A")
        git(root, "commit", "-m", "copy and rename")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        by_id = {change["new_skill_id"]: change for change in report["changes"]}
        self.assertEqual(by_id["aaa"]["change_type"], "copied")
        self.assertEqual(by_id["zzz"]["change_type"], "renamed")
        self.assertEqual({record["status"] for record in by_id["zzz"]["records"]}, {"R"})

    def test_unchanged_legacy_executable_does_not_block_regular_edit(self):
        root, _ = init_repo()
        executable = root / "skills/example/run.sh"
        executable.write_text("#!/bin/sh\necho stable\n", encoding="utf-8")
        os.chmod(executable, 0o755)
        git(root, "add", ".")
        git(root, "commit", "-m", "legacy executable")
        base = git(root, "rev-parse", "HEAD")
        path = root / "skills/example/SKILL.md"
        path.write_text(path.read_text(encoding="utf-8") + "\nA safe documentation edit.\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "regular edit")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertFalse(any("unsafe_snapshot_regression" in reason for reason in report["reasons"]))
        self.assertIsNotNone(report["changes"][0]["before"])
        self.assertIsNotNone(report["changes"][0]["after"])

    def test_modified_legacy_executable_is_blocking(self):
        root, _ = init_repo()
        executable = root / "skills/example/run.sh"
        executable.write_text("#!/bin/sh\necho old\n", encoding="utf-8")
        os.chmod(executable, 0o755)
        git(root, "add", ".")
        git(root, "commit", "-m", "legacy executable")
        base = git(root, "rev-parse", "HEAD")
        executable.write_text("#!/bin/sh\necho changed\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "modify executable")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(any("unsafe_snapshot_regression:100755:run.sh" in reason for reason in report["reasons"]))

    def test_skill_markdown_replaced_by_gitlink_is_not_treated_as_deletion(self):
        root, base = init_repo()
        git(root, "rm", "skills/example/SKILL.md")
        git(root, "update-index", "--add", "--cacheinfo", f"160000,{base},skills/example/SKILL.md")
        git(root, "commit", "-m", "replace skill with gitlink")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        change = report["changes"][0]
        self.assertEqual(change["change_type"], "modified")
        self.assertTrue(change["blocking"])
        self.assertEqual(change["unsafe_entries"]["after"][0]["mode"], "160000")

    def test_copy_does_not_hide_independent_source_regression(self):
        root, base = init_repo()
        source = root / "skills/example/SKILL.md"
        target = root / "skills/copied/SKILL.md"
        target.parent.mkdir(parents=True)
        target.write_text(source.read_text(encoding="utf-8").replace("name: example", "name: copied"), encoding="utf-8")
        source.write_text(source.read_text(encoding="utf-8").replace("## Examples", "## Removed Examples"), encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "copy plus source regression")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        by_id = {change["new_skill_id"]: change for change in report["changes"]}
        self.assertIn("copied", by_id)
        self.assertIn("example", by_id)
        self.assertTrue(any("example:score_decreased" in reason for reason in report["reasons"]))

    def test_security_severity_downgrade_is_not_a_regression(self):
        root, _ = init_repo()
        path = root / "skills/example/SKILL.md"
        path.write_text(
            path.read_text(encoding="utf-8") + "\n```bash\ncurl https://example.com/install.sh | bash\n```\n",
            encoding="utf-8",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "existing security flag")
        base = git(root, "rev-parse", "HEAD")
        path.write_text(
            path.read_text(encoding="utf-8").replace("risk: safe", "risk: offensive")
            + "\nAUTHORIZED USE ONLY\n",
            encoding="utf-8",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "downgrade security severity")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertFalse(any("security_warning_regression:SEC002" in reason for reason in report["reasons"]))

    def test_invalid_utf8_emits_stable_blocking_evidence(self):
        root, base = init_repo()
        path = root / "skills/example/SKILL.md"
        path.write_bytes(path.read_bytes() + b"\n\xff\xfe\n")
        git(root, "add", ".")
        git(root, "commit", "-m", "invalid utf8")

        first = changed_skill_evidence.build_report(root, base, "HEAD")
        second = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(first["blocking"])
        self.assertTrue(any("unreadable_file" in reason for reason in first["reasons"]))
        self.assertEqual(changed_skill_evidence.stable_json(first), changed_skill_evidence.stable_json(second))

    def test_malformed_risk_type_emits_blocking_evidence_instead_of_crashing(self):
        root, base = init_repo()
        path = root / "skills/example/SKILL.md"
        path.write_text(path.read_text(encoding="utf-8").replace("risk: safe", "risk: []"), encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "malformed risk")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(report["blocking"])
        self.assertTrue(any("invalid_risk" in reason for reason in report["reasons"]))

    def test_malformed_provenance_types_fail_closed_without_json_crash(self):
        root, base = init_repo(with_skill=False)
        path = write_skill(root, "external", source="community")
        content = path.read_text(encoding="utf-8").replace(
            "source: community", "source:\n  ? 2026-07-13\n  : value\nsource_type: []\nsource_repo: []"
        )
        path.write_text(content, encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "malformed provenance")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(report["blocking"])
        self.assertIn("external:new_external_skill_invalid_source_type", report["reasons"])
        changed_skill_evidence.stable_json(report)

    def test_copied_skill_is_new_and_keeps_copy_record(self):
        root, base = init_repo()
        source = root / "skills/example/SKILL.md"
        target = root / "skills/copied/SKILL.md"
        target.parent.mkdir(parents=True)
        target.write_text(source.read_text(encoding="utf-8").replace("name: example", "name: copied"), encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "copy skill")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        change = next(item for item in report["changes"] if item["new_skill_id"] == "copied")
        self.assertIn(change["change_type"], {"added", "copied"})
        self.assertTrue(any(record["status"] in {"A", "C"} for record in change["records"]))

    def test_copied_skill_cannot_inherit_legacy_unsafe_mode_exemption(self):
        root, _ = init_repo()
        executable = root / "skills/example/run.sh"
        executable.write_text("#!/bin/sh\necho legacy\n", encoding="utf-8")
        os.chmod(executable, 0o755)
        git(root, "add", ".")
        git(root, "commit", "-m", "legacy source")
        base = git(root, "rev-parse", "HEAD")
        copied = root / "skills/copied"
        copied.mkdir()
        copied_skill = (root / "skills/example/SKILL.md").read_text(encoding="utf-8").replace(
            "name: example", "name: copied"
        )
        (copied / "SKILL.md").write_text(copied_skill, encoding="utf-8")
        (copied / "run.sh").write_bytes(executable.read_bytes())
        os.chmod(copied / "run.sh", 0o755)
        git(root, "add", ".")
        git(root, "commit", "-m", "copy unsafe skill")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        copied_change = next(change for change in report["changes"] if change["new_skill_id"] == "copied")
        self.assertTrue(copied_change["blocking"])
        self.assertTrue(any("unsafe_snapshot_regression:100755:run.sh" in reason for reason in copied_change["reasons"]))

    def test_new_security_flag_is_blocking(self):
        root, base = init_repo()
        path = root / "skills/example/SKILL.md"
        path.write_text(
            path.read_text(encoding="utf-8") + "\n```bash\ncurl https://example.com/install.sh | bash\n```\n",
            encoding="utf-8",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "security regression")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(any("security_error_regression:SEC002" in reason for reason in report["reasons"]))

    def test_nested_auxiliary_change_belongs_to_nearest_skill_root(self):
        root, _ = init_repo()
        write_skill(root, "example/nested")
        reference = root / "skills/example/nested/reference.md"
        reference.write_text("base\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "nested base")
        base = git(root, "rev-parse", "HEAD")
        reference.write_text("changed\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "nested auxiliary change")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertEqual(len(report["changes"]), 1)
        self.assertEqual(report["changes"][0]["new_skill_id"], "example/nested")

    def test_nested_skill_rename_preserves_full_relative_identities(self):
        root, _ = init_repo()
        write_skill(root, "example/nested")
        git(root, "add", ".")
        git(root, "commit", "-m", "nested base")
        base = git(root, "rev-parse", "HEAD")
        git(root, "mv", "skills/example/nested", "skills/example/renamed")
        path = root / "skills/example/renamed/SKILL.md"
        path.write_text(path.read_text(encoding="utf-8").replace("name: nested", "name: renamed"), encoding="utf-8")
        git(root, "add", "-A")
        git(root, "commit", "-m", "nested rename")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertEqual(len(report["changes"]), 1)
        change = report["changes"][0]
        self.assertEqual(change["change_type"], "renamed")
        self.assertEqual((change["old_skill_id"], change["new_skill_id"]), ("example/nested", "example/renamed"))

    def test_modified_skill_reports_regressions_and_is_byte_deterministic(self):
        root, base = init_repo()
        write_skill(root, "example", include_examples=False)
        git(root, "add", ".")
        git(root, "commit", "-m", "regress")

        first = changed_skill_evidence.build_report(root, base, "HEAD")
        second = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(first["blocking"])
        self.assertEqual(first["changes"][0]["change_type"], "modified")
        self.assertTrue(any("missing_examples" in reason for reason in first["reasons"]))
        self.assertTrue(any("score_decreased" in reason for reason in first["reasons"]))
        self.assertEqual(changed_skill_evidence.stable_json(first), changed_skill_evidence.stable_json(second))
        self.assertNotIn("generated_at", first)

    def test_deletion_is_represented_without_quality_regression(self):
        root, base = init_repo()
        for path in (root / "skills/example").iterdir():
            path.unlink()
        (root / "skills/example").rmdir()
        git(root, "add", "-A")
        git(root, "commit", "-m", "delete")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertFalse(report["blocking"])
        self.assertEqual(report["changes"][0]["change_type"], "deleted")
        self.assertIsNone(report["changes"][0]["after"])

    def test_rename_compares_old_and_new_identities(self):
        root, base = init_repo()
        git(root, "mv", "skills/example", "skills/renamed")
        content = (root / "skills/renamed/SKILL.md").read_text(encoding="utf-8")
        (root / "skills/renamed/SKILL.md").write_text(content.replace("name: example", "name: renamed"), encoding="utf-8")
        git(root, "add", "-A")
        git(root, "commit", "-m", "rename")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        change = report["changes"][0]
        self.assertEqual(change["change_type"], "renamed")
        self.assertEqual((change["old_skill_id"], change["new_skill_id"]), ("example", "renamed"))
        self.assertIsNotNone(change["before"])
        self.assertIsNotNone(change["after"])

    def test_new_external_skill_requires_explicit_provenance_and_credit(self):
        root, base = init_repo(with_skill=False)
        write_skill(root, "external", source="community", source_repo="owner/community")
        git(root, "add", ".")
        git(root, "commit", "-m", "missing type")

        missing_type = changed_skill_evidence.build_report(root, base, "HEAD")
        self.assertIn("external:new_external_skill_invalid_source_type", missing_type["reasons"])

        write_skill(
            root,
            "external",
            source="community",
            source_type="community",
            source_repo="owner/community",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "complete provenance")
        complete = changed_skill_evidence.build_report(root, base, "HEAD")
        self.assertFalse(any("new_external_skill_" in reason for reason in complete["reasons"]))

    def test_modified_external_skill_cannot_remove_or_change_provenance_identity(self):
        root, _ = init_repo(with_skill=False)
        path = write_skill(
            root,
            "external",
            source="community",
            source_type="community",
            source_repo="owner/community",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "external base")
        base = git(root, "rev-parse", "HEAD")
        path.write_text(
            path.read_text(encoding="utf-8")
            .replace("source: community", "source: self")
            .replace("source_type: community\n", "")
            .replace("source_repo: owner/community\n", ""),
            encoding="utf-8",
        )
        git(root, "add", ".")
        git(root, "commit", "-m", "remove provenance")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        self.assertTrue(report["blocking"])
        self.assertIn("external:provenance_identity_changed:source", report["reasons"])
        self.assertIn("external:provenance_identity_changed:source_type", report["reasons"])
        self.assertIn("external:provenance_identity_changed:source_repo", report["reasons"])

    def test_score_component_regression_blocks_even_if_total_does_not_decrease(self):
        before = {
            "audit": {"findings": {}},
            "security": {"flags": []},
            "risk": {"declared": "safe", "suggested": "safe"},
            "score": {
                "scores": {
                    "metadata": 90.0,
                    "documentation": 80.0,
                    "security": 90.0,
                    "total": 86.0,
                }
            },
        }
        after = {
            "audit": {"findings": {}},
            "security": {"flags": []},
            "risk": {"declared": "safe", "suggested": "safe"},
            "score": {
                "scores": {
                    "metadata": 100.0,
                    "documentation": 70.0,
                    "security": 90.0,
                    "total": 86.0,
                }
            },
        }

        reasons = changed_skill_evidence.regression_reasons(
            "example", "modified", before, after
        )

        self.assertIn(
            "example:score_component_decreased:documentation:80.0->70.0",
            reasons,
        )
        self.assertFalse(any(reason.startswith("example:score_decreased:") for reason in reasons))

    def test_explicit_repo_argument_uses_requested_git_repository(self):
        root, base = init_repo()
        output = root / "evidence.json"

        result = subprocess.run(
            [
                sys.executable,
                str(SCRIPTS / "changed_skill_evidence.py"),
                "--repo",
                str(root),
                "--base",
                base,
                "--head",
                "HEAD",
                "--output",
                str(output),
            ],
            cwd=REPO_ROOT,
            check=False,
        )

        self.assertEqual(result.returncode, 0)
        self.assertEqual(json.loads(output.read_text(encoding="utf-8"))["head_oid"], base)

    def test_symlinked_skill_is_blocking_and_never_evaluated(self):
        root, base = init_repo()
        skill_file = root / "skills/example/SKILL.md"
        skill_file.unlink()
        os.symlink("../../../README.md", skill_file)
        git(root, "add", "-A")
        git(root, "commit", "-m", "symlink")

        report = changed_skill_evidence.build_report(root, base, "HEAD")

        change = report["changes"][0]
        self.assertTrue(change["blocking"])
        self.assertIsNone(change["after"])
        self.assertEqual(change["unsafe_entries"]["after"][0]["mode"], "120000")


if __name__ == "__main__":
    unittest.main()
