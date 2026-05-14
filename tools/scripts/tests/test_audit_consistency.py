import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


audit_consistency = load_module(
    "tools/scripts/audit_consistency.py",
    "audit_consistency_test",
)


class AuditConsistencyTests(unittest.TestCase):
    def write_repo_state(self, root: Path, total_skills: int = 1304, count_label: str = "1,304+"):
        (root / "docs" / "users").mkdir(parents=True)
        (root / "docs" / "maintainers").mkdir(parents=True)
        (root / "docs" / "integrations" / "jetski-gemini-loader").mkdir(parents=True)

        (root / "package.json").write_text(
            json.dumps(
                {
                    "name": "antigravity-awesome-skills",
                    "version": "8.4.0",
                    "description": f"{count_label} agentic skills for Claude Code, Gemini CLI, Cursor, Antigravity & more. Installer CLI.",
                }
            ),
            encoding="utf-8",
        )
        (root / "skills_index.json").write_text(json.dumps([{}] * total_skills), encoding="utf-8")
        (root / "README.md").write_text(
            f"""<!-- registry-sync: version=8.4.0; skills={total_skills}; stars=26132; updated_at=2026-03-21T00:00:00+00:00 -->
# 🌌 Antigravity Awesome Skills: {count_label} Agentic Skills for Claude Code, Gemini CLI, Cursor, Copilot & More

> **Installable GitHub library of {count_label} agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**

[![GitHub stars](https://img.shields.io/badge/⭐%2026%2C000%2B%20Stars-gold?style=for-the-badge)](https://github.com/sickn33/antigravity-awesome-skills/stargazers)

**Current release: V8.4.0.** Trusted by 26k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

- **Broad coverage with real utility**: {count_label} skills across development, testing, security, infrastructure, product, and marketing.

If you want a faster answer than "browse all {count_label} skills", start with a tool-specific guide:
""",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "getting-started.md").write_text(
            "# Getting Started with Antigravity Awesome Skills (V8.4.0)\n",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "claude-code-skills.md").write_text(
            f"- It includes {count_label} skills instead of a narrow single-domain starter pack.\n",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "gemini-cli-skills.md").write_text(
            f"- It helps new users get started with bundles and workflows rather than forcing a cold start from {count_label} files.\n",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "usage.md").write_text(
            f"✅ **Downloaded {count_label} skill files**\n- You installed a toolbox with {count_label} tools\nDon't try to use all {count_label} skills at once.\nNo. Even though you have {count_label} skills installed locally\n",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "visual-guide.md").write_text(
            f"{count_label} skills live here\n{count_label} total\n{count_label} SKILLS\n",
            encoding="utf-8",
        )
        (root / "docs" / "users" / "bundles.md").write_text(
            f'### 🚀 The "Essentials" Pack\n_Last updated: March 2026 | Total Skills: {count_label} | Total Bundles: 1_\n',
            encoding="utf-8",
        )
        (root / "docs" / "users" / "kiro-integration.md").write_text(
            f"- **Domain expertise** across {count_label} specialized areas\n",
            encoding="utf-8",
        )
        (root / "docs" / "maintainers" / "repo-growth-seo.md").write_text(
            f"> Installable GitHub library of {count_label} agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.\n> Installable GitHub library of {count_label} agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and more. Includes installer CLI, bundles, workflows, and official/community skill collections.\n- use a clean preview image that says `{count_label} Agentic Skills`;\n",
            encoding="utf-8",
        )
        (root / "docs" / "maintainers" / "skills-update-guide.md").write_text(
            f"- All {count_label} skills from the skills directory\n",
            encoding="utf-8",
        )
        (root / "docs" / "integrations" / "jetski-cortex.md").write_text(
            f"{count_label} skill\nWith {count_label} skills, this approach\n",
            encoding="utf-8",
        )
        (root / "docs" / "integrations" / "jetski-gemini-loader" / "README.md").write_text(
            f"This pattern avoids context overflow when you have {count_label} skills installed.\n",
            encoding="utf-8",
        )

    def test_local_consistency_passes_for_aligned_docs(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.write_repo_state(root)

            issues = audit_consistency.find_local_consistency_issues(root)

            self.assertEqual(issues, [])

    def test_local_consistency_flags_stale_claims(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.write_repo_state(root, count_label="1,304+")
            (root / "docs" / "users" / "usage.md").write_text(
                "✅ **Downloaded 1,273+ skill files**\n",
                encoding="utf-8",
            )

            issues = audit_consistency.find_local_consistency_issues(root)

            self.assertTrue(any("docs/users/usage.md" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
