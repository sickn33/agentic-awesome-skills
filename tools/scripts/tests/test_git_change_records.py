import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "tools" / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

import git_change_records


def git(root: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", *args], cwd=root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    return result.stdout.strip()


def init_repo() -> Path:
    root = Path(tempfile.mkdtemp())
    git(root, "init", "-b", "main")
    git(root, "config", "user.email", "tests@example.com")
    git(root, "config", "user.name", "Tests")
    return root


class GitChangeRecordsTests(unittest.TestCase):
    def test_path_validator_rejects_c0_c1_del_and_invalid_utf8_surrogates(self):
        for path in (
            "skills/example/line\nbreak.md",
            "skills/example/delete\x7f.md",
            "skills/example/c1\x85.md",
            "skills/example/invalid\udcff.md",
        ):
            with self.subTest(path=repr(path)):
                self.assertIsNotNone(git_change_records.validate_repo_path(path))

    def test_raw_diff_rejects_truncated_and_mixed_width_object_ids(self):
        malformed_payloads = [
            b":100644 100644 abcdef1 1234567 M\0skills/example/SKILL.md\0",
            (
                b":100644 100644 "
                + (b"a" * 40)
                + b" "
                + (b"b" * 64)
                + b" M\0skills/example/SKILL.md\0"
            ),
        ]
        for payload in malformed_payloads:
            with self.subTest(payload=payload[:30]):
                with self.assertRaises(ValueError):
                    git_change_records.parse_raw_diff(payload)

    def test_raw_diff_rejects_unknown_status_and_malformed_similarity(self):
        oid_pair = (b"a" * 40) + b" " + (b"b" * 40)
        malformed_payloads = [
            b":100644 100644 " + oid_pair + b" X\0skills/example/SKILL.md\0",
            b":100644 100644 " + oid_pair + b" R\0old\0new\0",
            b":100644 100644 " + oid_pair + b" R101\0old\0new\0",
            b":100644 100644 " + oid_pair + b" M90\0path\0",
        ]
        for payload in malformed_payloads:
            with self.subTest(payload=payload[-20:]):
                with self.assertRaises(ValueError):
                    git_change_records.parse_raw_diff(payload)

    def test_raw_diff_accepts_full_width_zero_object_id(self):
        payload = (
            b":000000 100644 "
            + (b"0" * 40)
            + b" "
            + (b"a" * 40)
            + b" A\0skills/example/SKILL.md\0"
        )
        record = git_change_records.parse_raw_diff(payload)[0]
        self.assertEqual(record.old_oid, "0" * 40)
        self.assertEqual(record.new_oid, "a" * 40)

    def test_raw_diff_preserves_renames_modes_oids_and_weird_paths(self):
        root = init_repo()
        (root / "skills/example").mkdir(parents=True)
        (root / "skills/example/SKILL.md").write_text("base\n", encoding="utf-8")
        weird = root / "skills/example/line\nbreak\tfile.md"
        weird.write_text("one\n", encoding="utf-8")
        deleted = root / "skills/example/deleted.md"
        deleted.write_text("delete\n", encoding="utf-8")
        copy_source = root / "skills/example/copy-source.md"
        copy_source.write_text("copy me exactly\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "base")
        base = git(root, "rev-parse", "HEAD")

        git(root, "mv", "skills/example/SKILL.md", "skills/example/RENAMED.md")
        weird.write_text("two\n", encoding="utf-8")
        deleted.unlink()
        (root / "skills/example/copy-target.md").write_bytes(copy_source.read_bytes())
        os.chmod(root / "skills/example/RENAMED.md", 0o755)
        git(root, "add", "-A")
        git(root, "commit", "-m", "head")
        head = git(root, "rev-parse", "HEAD")

        resolved_base, resolved_head, records = git_change_records.read_change_records(
            root, base, head, merge_base=False
        )

        self.assertEqual((resolved_base, resolved_head), (base, head))
        rename = next(record for record in records if record.status == "R")
        self.assertEqual(rename.old_path, "skills/example/SKILL.md")
        self.assertEqual(rename.new_path, "skills/example/RENAMED.md")
        self.assertEqual((rename.old_mode, rename.new_mode), ("100644", "100755"))
        self.assertEqual(len(rename.old_oid), len(base))
        self.assertEqual(len(rename.new_oid), len(head))
        self.assertTrue(any(record.new_path == "skills/example/line\nbreak\tfile.md" for record in records))
        self.assertTrue(any(record.status == "D" and record.old_path == "skills/example/deleted.md" for record in records))
        self.assertTrue(
            any(
                record.status == "C"
                and record.old_path == "skills/example/copy-source.md"
                and record.new_path == "skills/example/copy-target.md"
                for record in records
            )
        )

    def test_merge_base_mode_excludes_base_branch_only_commit(self):
        root = init_repo()
        (root / "common.txt").write_text("base\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "base")
        git(root, "checkout", "-b", "feature")
        (root / "feature.txt").write_text("feature\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "feature")
        feature = git(root, "rev-parse", "HEAD")
        git(root, "checkout", "main")
        (root / "main-only.txt").write_text("main\n", encoding="utf-8")
        git(root, "add", ".")
        git(root, "commit", "-m", "main advances")

        _, _, records = git_change_records.read_change_records(root, "main", feature, merge_base=True)
        paths = {record.new_path or record.old_path for record in records}
        self.assertEqual(paths, {"feature.txt"})

    def test_materializer_never_creates_symlinks_gitlinks_or_executables(self):
        root = init_repo()
        skill = root / "skills/example"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("regular\n", encoding="utf-8")
        executable = skill / "run.sh"
        executable.write_text("#!/bin/sh\n", encoding="utf-8")
        os.chmod(executable, 0o755)
        os.symlink("/etc/passwd", skill / "escape")
        git(root, "add", ".")
        git(root, "commit", "-m", "tree")
        commit = git(root, "rev-parse", "HEAD")
        git(root, "update-index", "--add", "--cacheinfo", f"160000,{commit},skills/example/vendor")
        git(root, "commit", "-m", "gitlink")
        commit = git(root, "rev-parse", "HEAD")

        destination = root / "snapshot" / "skills" / "example"
        unsafe = git_change_records.materialize_tree(root, commit, "skills/example", destination)

        self.assertEqual((destination / "SKILL.md").read_text(encoding="utf-8"), "regular\n")
        self.assertFalse((destination / "run.sh").exists())
        self.assertFalse((destination / "escape").exists())
        self.assertFalse((destination / "vendor").exists())
        self.assertEqual({item["mode"] for item in unsafe}, {"100755", "120000", "160000"})


if __name__ == "__main__":
    unittest.main()
