import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))

from symlink_test_utils import symlink_or_skip


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
update_readme = sys.modules["update_readme"]


class SyncRepoMetadataTests(unittest.TestCase):
    def test_sync_curated_docs_updates_counts_and_versions(self):
        metadata = {
            "version": "8.4.0",
            "core_included": True,
            "core_included_from_major": 8,
            "total_skills": 1304,
            "total_skills_label": "1,304+",
        }

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "README.md").write_text(
                """# 🌌 Agentic Awesome Skills: 1,304+ Agentic Skills for Claude Code, Gemini CLI, Cursor, Autohand Code, Copilot & More

> **Installable GitHub library of 1,273+ agentic skills for Claude Code, Cursor, Codex CLI, Autohand Code, Gemini CLI, Antigravity, and other AI coding assistants.**

**Current release: V8.3.0.** Trusted by 25k+ GitHub stargazers, this repository combines official and community skill collections with bundles, workflows, installation paths, and docs that help you go from first install to daily use quickly.

Codex or Claude inspects your project, enumerates its primary capabilities, searches and compares candidates across the complete local AAS catalog, and chooses the exact skills. Core imposes no semantic policy that favors a small stack; the manifest format has an explicit technical maximum of 128 skills. All 1,273 skills in the current catalog remain individually searchable, readable, and selectable. AAS Core does not rank or recommend skills. Its read-only `compose_stack` tool validates and returns the agent-owned manifest in memory; a client or the `aas` CLI persists the reviewed stack and its optional selection-evidence sidecar.

The 1,273+ reusable `SKILL.md` playbooks, specialized plugins, bundles, workflows, and direct installers remain important. They are the content, curation, distribution, and compatibility layers around AAS Core—not competing primary products.

- **Broad coverage with real utility**: 1,273+ skills across development, testing, security, infrastructure, product, and marketing.

- **Require capability coverage.** MCP session instructions require the agent to evaluate the full project surface—from architecture, domain behavior, data and integrations through testing, security, UX, deployment, and maintenance—then search each applicable capability, compare multiple candidates, cover it with a non-redundant skill or report a catalog gap, and avoid stopping at a minimal shortlist.

**Start here:** [Install in 1 minute](#installation) · [Recommended plugins](#recommended-specialized-plugins) · [Choose your tool](#choose-your-tool) · [📚 Browse 1,273+ Skills](#browse-1273-skills) · [Bundles & workflows](#bundles--workflows) · [Support the project](#support-the-project)

- [Browse 1,273+ Skills](#browse-1273-skills)

**Agentic Awesome Skills** (Release 8.3.0) is a large, installable skill library for AI coding assistants. It packages 1,273+ reusable `SKILL.md` playbooks, specialized plugins, bundles, workflows, generated catalogs, and a CLI installer so Claude Code, Codex CLI, Autohand Code, Cursor, Gemini CLI, Antigravity, and similar tools can reuse proven operating instructions instead of one-off prompts.
""",
                encoding="utf-8",
            )
            (root / "docs" / "users").mkdir(parents=True)
            (root / "docs" / "maintainers").mkdir(parents=True)
            (root / "docs" / "integrations" / "jetski-gemini-loader").mkdir(parents=True)
            (root / "apps" / "web-app" / "public").mkdir(parents=True)

            (root / "apps" / "web-app" / "index.html").write_text(
                '<meta name="description" content="AAS Core preview backed by 1,273+ cataloged skills">\n'
                '<title>AAS Core Preview | Agent-first stacks backed by 1,273+ skills</title>\n',
                encoding="utf-8",
            )
            (root / "apps" / "web-app" / "public" / "llms.txt").write_text(
                "> Installable GitHub library of 1,273+ agentic SKILL.md playbooks.\n"
                "- Current release: V8.3.0.\n"
                "- Release boundary: the published V8.3.0 package predates AAS Core.\n"
                "- Skill count: 1,273+.\n"
                "AAS Core preview is backed by the 1,273+ skill catalog.\n",
                encoding="utf-8",
            )

            (root / "docs" / "users" / "getting-started.md").write_text(
                "# Getting Started with Agentic Awesome Skills (V8.3.0)\n",
                encoding="utf-8",
            )
            (root / "docs" / "users" / "aas-core.md").write_text(
                "npm exec --yes --ignore-scripts --package=agentic-awesome-skills@X.Y.Z -- aas mcp configure\\\n\n"
                "Every current catalog skill is searchable, readable, selectable, and usable.\n",
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
                '### 🚀 The "Essentials" Pack\n### 🌐 The "Web Wizard" Pack\n_Last updated: June 2026 | Total Skills: 1,254+ | Total Bundles: 99_\n',
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

            self.assertGreaterEqual(updated_files, 12)
            readme = (root / "README.md").read_text(encoding="utf-8")
            self.assertIn("# AAS Core — Agentic Awesome Skills", readme)
            self.assertIn("1,304+ skills across development", readme)
            self.assertIn("[📚 Browse 1,304+ Skills](#browse-1304-skills)", readme)
            self.assertIn("[Browse 1,304+ Skills](#browse-1304-skills)", readme)
            self.assertIn("Local, agent-owned skill stacks for coding agents", readme)
            self.assertIn("AAS Core does not rank or recommend them", readme)
            self.assertIn("can persist it as `aas-stack.json`", readme)
            self.assertIn("The reusable `SKILL.md` playbooks", readme)
            self.assertIn("Guide capability coverage", readme)
            self.assertIn("does not certify semantic completeness", readme)
            self.assertEqual(
                "# Getting Started with AAS Core\n",
                (root / "docs" / "users" / "getting-started.md").read_text(encoding="utf-8"),
            )
            aas_core = (root / "docs" / "users" / "aas-core.md").read_text(encoding="utf-8")
            self.assertIn("--package=agentic-awesome-skills@8.4.0", aas_core)
            self.assertIn("searchable, readable, and available for agent selection", aas_core)
            self.assertNotIn("X.Y.Z", aas_core)
            self.assertNotIn("selectable, and usable", aas_core)
            self.assertIn("1,304+ files", (root / "docs" / "users" / "gemini-cli-skills.md").read_text(encoding="utf-8"))
            self.assertIn("1,304+ specialized areas", (root / "docs" / "users" / "kiro-integration.md").read_text(encoding="utf-8"))
            self.assertIn("Total Bundles: 2", (root / "docs" / "users" / "bundles.md").read_text(encoding="utf-8"))
            web_index = (root / "apps" / "web-app" / "index.html").read_text(encoding="utf-8")
            self.assertIn("1,304+ cataloged skills", web_index)
            self.assertIn("backed by 1,304+ skills", web_index)
            llms_text = (root / "apps" / "web-app" / "public" / "llms.txt").read_text(encoding="utf-8")
            self.assertIn("Current release: V8.4.0.", llms_text)
            self.assertIn("V8.4.0 includes AAS Core", llms_text)
            self.assertIn("Skill count: 1,304+.", llms_text)
            self.assertIn("1,304+ skill catalog", llms_text)
            jetski_cortex = (root / "docs" / "integrations" / "jetski-cortex.md").read_text(encoding="utf-8")
            self.assertIn("1,304+ skill", jetski_cortex)
            self.assertNotIn("1,1", jetski_cortex)

    def test_build_about_description_uses_live_skill_count(self):
        description = sync_repo_metadata.build_about_description(
            {
                "total_skills_label": "1,304+",
            }
        )
        self.assertIn("AAS Core is the local, agent-first control plane", description)
        self.assertIn("1,304+ agentic skills", description)
        self.assertIn("local MCP", description)

    def test_core_release_capability_is_major_based_and_fail_closed(self):
        self.assertEqual(
            update_readme.core_release_metadata({"version": "14.99.0", "aasCore": {"includedFromMajor": 15}}),
            (False, 15),
        )
        self.assertEqual(
            update_readme.core_release_metadata({"version": "15.0.0-rc.1", "aasCore": {"includedFromMajor": 15}}),
            (True, 15),
        )
        self.assertEqual(
            update_readme.core_release_metadata({"version": "16.0.0", "aasCore": {"includedFromMajor": 15}}),
            (True, 15),
        )
        with self.assertRaises(ValueError):
            update_readme.core_release_metadata({"version": "15.0.0"})
        with self.assertRaises(ValueError):
            update_readme.core_release_metadata({"version": "invalid", "aasCore": {"includedFromMajor": 15}})

    def test_prerelease_metadata_sync_is_idempotent_and_can_promote_to_stable(self):
        prerelease = {
            "version": "15.0.0-rc.1",
            "core_included": True,
            "core_included_from_major": 15,
            "total_skills": 1969,
            "total_skills_label": "1,969+",
            "star_badge_count": "44%2C000%2B",
            "star_milestone": "44,000+",
            "star_celebration": "44k",
            "stars": 43524,
            "updated_at": "2026-07-18T00:00:00+00:00",
        }
        readme = "**Current release: V15.0.0-rc.1.** stale\n"
        once = update_readme.apply_metadata(readme, prerelease)
        twice = update_readme.apply_metadata(once, prerelease)
        self.assertEqual(once, twice)
        self.assertIn("V15.0.0-rc.1.**", twice)
        self.assertNotIn("rc.1.0-rc.1", twice)

        llms = "- Current release: V15.0.0-rc.1.0-rc.1.\n"
        synced = sync_repo_metadata.sync_llms_text(llms, prerelease)
        self.assertEqual(synced, "- Current release: V15.0.0-rc.1.\n")
        self.assertEqual(sync_repo_metadata.sync_llms_text(synced, prerelease), synced)

        stable = {**prerelease, "version": "15.0.0"}
        self.assertIn("V15.0.0.**", update_readme.apply_metadata(twice, stable))
        self.assertEqual(
            sync_repo_metadata.sync_llms_text(synced, stable),
            "- Current release: V15.0.0.\n",
        )

    def test_sync_github_about_builds_expected_commands(self):
        calls = []

        def fake_runner(args, dry_run=False):
            calls.append((args, dry_run))

        sync_repo_metadata.sync_github_about(
            {
                "repo": "sickn33/agentic-awesome-skills",
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
        self.assertEqual(repo_edit_args[:4], ["gh", "repo", "edit", "sickn33/agentic-awesome-skills"])
        self.assertIn("--description", repo_edit_args)
        self.assertIn("--homepage", repo_edit_args)
        self.assertIn("https://sickn33.github.io/agentic-awesome-skills/", repo_edit_args)

        self.assertEqual(topics_args[:4], ["gh", "api", "repos/sickn33/agentic-awesome-skills/topics", "--method"])
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
            symlink_or_skip(self, outside, linked)

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
