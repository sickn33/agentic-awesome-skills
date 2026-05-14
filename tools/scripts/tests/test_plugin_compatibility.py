import importlib.util
import json
import pathlib
import sys
import tempfile
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS))


def load_module(module_path: pathlib.Path, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


plugin_compatibility = load_module(
    TOOLS_SCRIPTS / "plugin_compatibility.py",
    "plugin_compatibility_test",
)


class PluginCompatibilityTests(unittest.TestCase):
    def _write_skill(self, skills_dir: pathlib.Path, skill_id: str, content: str) -> pathlib.Path:
        skill_dir = skills_dir / skill_id
        skill_dir.mkdir(parents=True, exist_ok=True)
        (skill_dir / "SKILL.md").write_text(content, encoding="utf-8")
        return skill_dir

    def test_absolute_host_paths_block_both_targets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "absolute-path-skill",
                "---\nname: absolute-path-skill\ndescription: Example\n---\nUse /Users/tester/private/file\n",
            )

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "blocked")
            self.assertEqual(entry["targets"]["claude"], "blocked")
            self.assertIn("absolute_host_path", entry["reasons"])

    def test_claude_home_paths_only_block_codex(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "claude-home-skill",
                "---\nname: claude-home-skill\ndescription: Example\n---\nRead ~/.claude/projects/cache\n",
            )

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "blocked")
            self.assertEqual(entry["targets"]["claude"], "supported")
            self.assertIn("target_specific_home_path", entry["blocked_reasons"]["codex"])

    def test_runtime_dependency_requires_explicit_manual_setup(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            skill_dir = self._write_skill(
                skills_dir,
                "dependency-skill",
                "---\nname: dependency-skill\ndescription: Example\n---\nbody\n",
            )
            (skill_dir / "requirements.txt").write_text("requests\n", encoding="utf-8")

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "blocked")
            self.assertEqual(entry["targets"]["claude"], "blocked")
            self.assertIn("undeclared_runtime_dependency", entry["reasons"])

    def test_relative_links_cannot_escape_skill_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "escaping-link-skill",
                (
                    "---\n"
                    "name: escaping-link-skill\n"
                    "description: Example\n"
                    "---\n"
                    "Read [secret](../../outside/secret.txt)\n"
                ),
            )
            outside_dir = pathlib.Path(temp_dir) / "outside"
            outside_dir.mkdir(parents=True, exist_ok=True)
            (outside_dir / "secret.txt").write_text("secret", encoding="utf-8")

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "blocked")
            self.assertEqual(entry["targets"]["claude"], "blocked")
            self.assertIn("escaped_local_reference", entry["reasons"])

    def test_manual_setup_metadata_can_make_runtime_skill_supported(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            skill_dir = self._write_skill(
                skills_dir,
                "manual-setup-skill",
                (
                    "---\n"
                    "name: manual-setup-skill\n"
                    "description: Example\n"
                    "plugin:\n"
                    "  setup:\n"
                    "    type: manual\n"
                    "    summary: Run the setup command once.\n"
                    "    docs: SKILL.md\n"
                    "---\n"
                    "body\n"
                ),
            )
            (skill_dir / "package.json").write_text(json.dumps({"name": "manual-setup-skill"}), encoding="utf-8")

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "supported")
            self.assertEqual(entry["targets"]["claude"], "supported")
            self.assertEqual(entry["setup"]["type"], "manual")

    def test_explicit_target_restrictions_block_plugin_targets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skills_dir = pathlib.Path(temp_dir) / "skills"
            self._write_skill(
                skills_dir,
                "active-browser-skill",
                (
                    "---\n"
                    "name: active-browser-skill\n"
                    "description: Example\n"
                    "plugin:\n"
                    "  targets:\n"
                    "    codex: blocked\n"
                    "    claude: blocked\n"
                    "---\n"
                    "Click live page controls only after explicit approval.\n"
                ),
            )

            report = plugin_compatibility.build_report(skills_dir)
            entry = report["skills"][0]
            self.assertEqual(entry["targets"]["codex"], "blocked")
            self.assertEqual(entry["targets"]["claude"], "blocked")
            self.assertIn("explicit_target_restriction", entry["blocked_reasons"]["codex"])
            self.assertIn("explicit_target_restriction", entry["blocked_reasons"]["claude"])

    def test_repo_sample_skills_have_expected_status(self):
        report = plugin_compatibility.build_report(REPO_ROOT / "skills")
        entries = plugin_compatibility.compatibility_by_skill_id(report)

        for skill_id in ("molykit", "claude-code-expert"):
            self.assertEqual(entries[skill_id]["targets"]["codex"], "blocked")
            self.assertEqual(entries[skill_id]["targets"]["claude"], "blocked")
            self.assertIn("absolute_host_path", entries[skill_id]["reasons"])

        self.assertEqual(entries["project-skill-audit"]["targets"]["codex"], "supported")
        self.assertEqual(entries["project-skill-audit"]["targets"]["claude"], "blocked")
        self.assertNotIn("absolute_host_path", entries["project-skill-audit"]["reasons"])
        self.assertIn("target_specific_home_path", entries["project-skill-audit"]["blocked_reasons"]["claude"])

        self.assertEqual(entries["playwright-skill"]["targets"]["codex"], "supported")
        self.assertEqual(entries["playwright-skill"]["targets"]["claude"], "supported")
        self.assertEqual(entries["playwright-skill"]["setup"]["type"], "manual")


if __name__ == "__main__":
    unittest.main()
