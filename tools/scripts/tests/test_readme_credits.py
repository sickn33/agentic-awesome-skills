import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

TEMP_DIRS = []


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


check_readme_credits = load_module(
    "tools/scripts/check_readme_credits.py",
    "check_readme_credits_test",
)


def git(root: Path, *args: str) -> None:
    subprocess.run(["git", *args], cwd=root, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def write_skill(root: Path, slug: str, frontmatter: str, body: str = "# Skill\n") -> Path:
    skill_dir = root / "skills" / slug
    skill_dir.mkdir(parents=True, exist_ok=True)
    skill_path = skill_dir / "SKILL.md"
    skill_path.write_text(f"---\n{frontmatter}\n---\n\n{body}", encoding="utf-8")
    return skill_path


def init_repo(readme: str, skill_files: dict[str, str]) -> Path:
    tmp = tempfile.TemporaryDirectory()
    root = Path(tmp.name)
    TEMP_DIRS.append(tmp)
    git(root, "init", "-b", "main")
    git(root, "config", "user.email", "tests@example.com")
    git(root, "config", "user.name", "Tests")
    (root / "README.md").write_text(readme, encoding="utf-8")
    for slug, frontmatter in skill_files.items():
        write_skill(root, slug, frontmatter)
    git(root, "add", ".")
    git(root, "commit", "-m", "base")
    return root


class ReadmeCreditsTests(unittest.TestCase):
    def test_no_skill_changes_is_noop(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )

        base = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["skill_files"], [])
        self.assertEqual(report["warnings"], [])
        self.assertEqual(report["errors"], [])

    def test_external_source_without_source_repo_warns_only(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: community
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["errors"], [])
        self.assertTrue(any("without source_repo" in warning for warning in report["warnings"]))

    def test_source_repo_must_exist_in_community_bucket_when_defaulted(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: community
source_repo: other/tool
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["warnings"], [])
        self.assertEqual(report["errors"], [])

    def test_source_repo_passes_in_official_bucket(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: community
source_type: official
source_repo: owner/tool
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["warnings"], [])
        self.assertEqual(report["errors"], [])

    def test_source_repo_missing_from_required_bucket_fails(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: community
source_repo: owner/tool
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["warnings"], [])
        self.assertTrue(any("missing from ### Community Contributors" in error for error in report["errors"]))

    def test_self_source_skips_readme_lookup(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: community
source_repo: other/tool
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: self
source_type: self
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertEqual(report["warnings"], [])
        self.assertEqual(report["errors"], [])

    def test_invalid_source_type_is_rejected(self):
        root = init_repo(
            """# Repo

## Credits & Sources

### Official Sources

- [owner/tool](https://github.com/owner/tool)

### Community Contributors

- [other/tool](https://github.com/other/tool)
""",
            {
                "example": """name: example
description: Example
source: self
""",
            },
        )
        git(root, "checkout", "-b", "feature")
        write_skill(
            root,
            "example",
            """name: example
description: Example
source: community
source_type: moon
source_repo: other/tool
""",
        )
        git(root, "add", "skills/example/SKILL.md")
        git(root, "commit", "-m", "update skill")

        base = subprocess.run(
            ["git", "rev-parse", "main"],
            cwd=root,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()

        report = check_readme_credits.check_readme_credits(root, base, "HEAD")

        self.assertTrue(any("invalid source_type" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
