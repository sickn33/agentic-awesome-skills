import importlib.util
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


sync_repo_metadata = load_module(
    "tools/scripts/sync_repo_metadata.py",
    "sync_repo_metadata_test",
)


class SyncRepoMetadataTests(unittest.TestCase):
    def test_sync_curated_docs_updates_counts_and_versions(self):
        metadata = {
            "version": "8.4.0",
            "total_skills": 1304,
            "total_skills_label": "1,304+",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "README.md").write_text(
                """# 🌌 Antigravity Awesome Skills: 1,304+ Agentic Skills for Claude Code, Gemini CLI, Cursor, Copilot & More

> **Installable GitHub library of 1,273+ agentic skills for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and other AI coding assistants.**

**Current release: V8.3.0.** Trusted by 25k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

- **Broad coverage with real utility**: 1,273+ skills across development, testing, security, infrastructure, product, and marketing.

- [Browse 1,273+ Skills](#browse-1273-skills)

**Antigravity Awesome Skills** (Release 8.3.0) is a large, installable skill library for AI coding assistants. It includes onboarding docs, bundles, workflows, generated catalogs, and a CLI installer so you can move from discovery to actual usage without manually stitching together dozens of repos.

If you want a faster answer than "browse all 1,273+ skills", start with a tool-specific guide:
""",
                encoding="utf-8",
            )
            (root / "docs" / "users").mkdir(parents=True)
            (root / "docs" / "maintainers").mkdir(parents=True)
            (root / "docs" / "integrations" / "jetski-gemini-loader").mkdir(parents=True)

            (root / "docs" / "users" / "getting-started.md").write_text(
                "# Getting Started with Antigravity Awesome Skills (V8.3.0)\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "claude-code-skills.md").write_text(
                "- It includes 1,273+ skills instead of a narrow single-domain starter pack.\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "gemini-cli-skills.md").write_text(
                "- It helps new users get started with bundles and workflows rather than forcing a cold start from 1,273+ files.\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "usage.md").write_text(
                "✅ **Downloaded 1,254+ skill files**\n- You installed a toolbox with 1,254+ tools\nDon't try to use all 1,254+ skills at once.\nNo. Even though you have 1,254+ skills installed locally\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "visual-guide.md").write_text(
                "1,254+ skills live here\n1,254+ total\n1,254+ SKILLS\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "bundles.md").write_text(
                '### 🚀 The "Essentials" Pack\n### 🌐 The "Web Wizard" Pack\n_Last updated: March 2026 | Total Skills: 1,254+ | Total Bundles: 99_\n',
                encoding="utf-8",
            )
            (root / "docs" / "users" / "kiro-integration.md").write_text(
                "- **Domain expertise** across 1,254+ specialized areas\n",
                encoding="utf-8",
            )
            (root / "docs" / "maintainers" / "repo-growth-seo.md").write_text(
                "> Installable GitHub library of 1,273+ agentic skills\n- use a clean preview image that says `1,273+ Agentic Skills`;\n",
                encoding="utf-8",
            )
            (root / "docs" / "maintainers" / "skills-update-guide.md").write_text(
                "- All 1,254+ skills from the skills directory\n",
                encoding="utf-8",
            )
            (root / "docs" / "integrations" / "jetski-cortex.md").write_text(
                "1.200+ skill\nOver 1.200 skills, this approach\n",
                encoding="utf-8",
            )
            (root / "docs" / "integrations" / "jetski-gemini-loader" / "README.md").write_text(
                "This pattern avoids context overflow when you have 1,200+ skills installed.\n",
                encoding="utf-8",
            )

            updated_files = sync_repo_metadata.sync_curated_docs(str(root), metadata, dry_run=False)

            self.assertGreaterEqual(updated_files, 10)
            readme = (root / "README.md").read_text(encoding="utf-8")
            self.assertIn("1,304+ agentic skills", readme)
            self.assertIn("[Browse 1,304+ Skills](#browse-1304-skills)", readme)
            self.assertIn("V8.4.0", (root / "docs" / "users" / "getting-started.md").read_text(encoding="utf-8"))
            self.assertIn("1,304+ files", (root / "docs" / "users" / "gemini-cli-skills.md").read_text(encoding="utf-8"))
            self.assertIn("1,304+ specialized areas", (root / "docs" / "users" / "kiro-integration.md").read_text(encoding="utf-8"))
            self.assertIn("Total Bundles: 2", (root / "docs" / "users" / "bundles.md").read_text(encoding="utf-8"))
            jetski_cortex = (root / "docs" / "integrations" / "jetski-cortex.md").read_text(encoding="utf-8")
            self.assertIn("1,304+ skill", jetski_cortex)
            self.assertNotIn("1,1", jetski_cortex)

    def test_build_about_description_uses_live_skill_count(self):
        description = sync_repo_metadata.build_about_description(
            {
                "total_skills_label": "1,304+",
            }
        )
        self.assertIn("1,304+ agentic skills", description)
        self.assertIn("installer CLI", description)

    def test_sync_github_about_builds_expected_commands(self):
        calls = []

        def fake_runner(args, dry_run=False):
            calls.append((args, dry_run))

        sync_repo_metadata.sync_github_about(
            {
                "repo": "sickn33/antigravity-awesome-skills",
                "total_skills_label": "1,304+",
            },
            dry_run=True,
            runner=fake_runner,
        )

        self.assertEqual(len(calls), 2)
        repo_edit_args, repo_edit_dry_run = calls[0]
        topics_args, topics_dry_run = calls[1]

        self.assertTrue(repo_edit_dry_run)
        self.assertTrue(topics_dry_run)
        self.assertEqual(repo_edit_args[:4], ["gh", "repo", "edit", "sickn33/antigravity-awesome-skills"])
        self.assertIn("--description", repo_edit_args)
        self.assertIn("--homepage", repo_edit_args)
        self.assertIn("https://sickn33.github.io/antigravity-awesome-skills/", repo_edit_args)

        self.assertEqual(topics_args[:4], ["gh", "api", "repos/sickn33/antigravity-awesome-skills/topics", "--method"])
        self.assertIn("PUT", topics_args)
        self.assertIn("names[]=claude-code", topics_args)
        self.assertIn("names[]=skill-library", topics_args)

    def test_update_text_file_skips_symlinked_targets(self):
        metadata = {"version": "8.4.0"}

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            outside = root / "outside.md"
            outside.write_text("original", encoding="utf-8")
            linked = root / "README.md"
            linked.symlink_to(outside)

            changed = sync_repo_metadata.update_text_file(
                linked,
                lambda content, current_metadata: "rewritten",
                metadata,
                dry_run=False,
            )

            self.assertFalse(changed)
            self.assertEqual(outside.read_text(encoding="utf-8"), "original")


if __name__ == "__main__":
    unittest.main()
