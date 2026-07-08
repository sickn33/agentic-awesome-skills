import importlib.util
import errno
import pathlib
import sys
import tempfile
from unittest import mock
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS = REPO_ROOT / "tools" / "scripts"


def load_module(module_path: pathlib.Path, module_name: str):
    sys.path.insert(0, str(module_path.parent))
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


editorial_bundles = load_module(
    TOOLS_SCRIPTS / "sync_editorial_bundles.py",
    "sync_editorial_bundles",
)
plugin_compatibility = load_module(
    TOOLS_SCRIPTS / "plugin_compatibility.py",
    "plugin_compatibility_json",
)
get_bundle_skills = load_module(
    TOOLS_SCRIPTS / "get-bundle-skills.py",
    "get_bundle_skills_json",
)


def relative_posix(path: pathlib.Path, root: pathlib.Path) -> str:
    return path.relative_to(root).as_posix()


class EditorialBundlesTests(unittest.TestCase):
    def setUp(self):
        self.manifest_bundles = editorial_bundles.load_editorial_bundles(REPO_ROOT)
        self.compatibility_report = plugin_compatibility.load_plugin_compatibility(REPO_ROOT)
        self.compatibility_by_id = plugin_compatibility.compatibility_by_skill_id(self.compatibility_report)

    def test_manifest_has_unique_ids_and_existing_skills(self):
        bundle_ids = [bundle["id"] for bundle in self.manifest_bundles]
        self.assertEqual(len(bundle_ids), len(set(bundle_ids)))

        for bundle in self.manifest_bundles:
            self.assertEqual(bundle["id"], get_bundle_skills._normalize_bundle_query(bundle["name"]))
            self.assertTrue(bundle["skills"], f'bundle "{bundle["id"]}" should not be empty')
            for skill in bundle["skills"]:
                self.assertTrue((REPO_ROOT / "skills" / skill["id"]).exists())

    def test_bundles_doc_matches_renderer(self):
        metadata = editorial_bundles.load_metadata(str(REPO_ROOT))
        expected = editorial_bundles.render_bundles_doc(
            REPO_ROOT,
            metadata,
            self.manifest_bundles,
            self.compatibility_by_id,
        )
        actual = (REPO_ROOT / "docs" / "users" / "bundles.md").read_text(encoding="utf-8")
        self.assertEqual(actual, expected)

    def test_get_bundle_skills_reads_json_manifest_by_name_and_id(self):
        expected = ["concise-planning", "git-pushing", "kaizen", "lint-and-validate", "systematic-debugging"]
        self.assertEqual(get_bundle_skills.get_bundle_skills(["Essentials"]), expected)
        self.assertEqual(get_bundle_skills.get_bundle_skills(["essentials"]), expected)
        web_wizard_skills = get_bundle_skills.get_bundle_skills(["web-wizard"])
        self.assertIn("form-cro", web_wizard_skills)
        self.assertIn("react-best-practices", web_wizard_skills)
        self.assertIn(
            "game-development/game-design",
            get_bundle_skills.get_bundle_skills(["indie-game-dev"]),
        )

    def test_generated_bundle_plugin_contains_expected_skills(self):
        essentials_plugin = REPO_ROOT / "plugins" / "agentic-bundle-essentials" / "skills"
        expected_ids = {
            skill["id"]
            for skill in next(bundle for bundle in self.manifest_bundles if bundle["id"] == "essentials")["skills"]
        }
        actual_ids = {
            relative_posix(path, essentials_plugin)
            for path in essentials_plugin.rglob("SKILL.md")
        }
        self.assertEqual(actual_ids, {f"{skill_id}/SKILL.md" for skill_id in expected_ids})

        sample_skill_dir = essentials_plugin / "concise-planning"
        self.assertTrue((sample_skill_dir / "SKILL.md").is_file())

    def test_generated_plugin_count_matches_manifest(self):
        generated_plugins = sorted(
            path.name
            for path in (REPO_ROOT / "plugins").iterdir()
            if path.is_dir() and path.name.startswith("agentic-bundle-")
        )
        expected_plugins = sorted(
            f'agentic-bundle-{bundle["id"]}'
            for bundle in self.manifest_bundles
            if any(
                all(
                    self.compatibility_by_id[skill["id"]]["targets"][target] == "supported"
                    for skill in bundle["skills"]
                )
                for target in ("codex", "claude")
            )
        )
        self.assertEqual(generated_plugins, expected_plugins)

    def test_codex_bundle_plugin_names_keep_qualified_skill_names_valid(self):
        max_name_length = 64

        for bundle in self.manifest_bundles:
            support = all(
                self.compatibility_by_id[skill["id"]]["targets"]["codex"] == "supported"
                for skill in bundle["skills"]
            )
            if not support:
                continue

            plugin_name = editorial_bundles._bundle_codex_plugin_name(bundle["id"])
            manifest = editorial_bundles._bundle_codex_plugin_manifest(
                editorial_bundles.load_metadata(str(REPO_ROOT)),
                bundle,
            )
            self.assertEqual(manifest["name"], plugin_name)
            if bundle.get("defaultPrompts"):
                self.assertEqual(manifest["interface"]["defaultPrompt"], bundle["defaultPrompts"])
            if bundle.get("positioning"):
                self.assertEqual(manifest["interface"]["shortDescription"], bundle["positioning"])
            self.assertLessEqual(
                len(plugin_name),
                max_name_length,
                f'Codex plugin name too long for bundle "{bundle["id"]}"',
            )
            for skill in bundle["skills"]:
                qualified_name = f'{plugin_name}:{skill["id"]}'
                self.assertLessEqual(
                    len(qualified_name),
                    max_name_length,
                    f'Codex qualified skill name too long: {qualified_name}',
                )

    def test_manifest_rejects_bundle_ids_with_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = pathlib.Path(temp_dir)
            skill_dir = temp_root / "skills" / "safe-skill"
            skill_dir.mkdir(parents=True, exist_ok=True)

            payload = {
                "bundles": [
                    {
                        "id": "../../outside",
                        "name": "Safe Bundle",
                        "group": "Security",
                        "emoji": "🛡️",
                        "tagline": "Test bundle",
                        "audience": "Testers",
                        "description": "Testers",
                        "skills": [{"id": "safe-skill", "summary": "ok"}],
                    }
                ]
            }

            with self.assertRaisesRegex(ValueError, "Invalid editorial bundle id"):
                editorial_bundles._validate_editorial_bundles(temp_root, payload)

    def test_sample_bundle_copy_matches_source_file_inventory(self):
        sample_bundle = next(bundle for bundle in self.manifest_bundles if bundle["id"] == "documents-presentations")
        plugin_skills_root = REPO_ROOT / "plugins" / "agentic-bundle-documents-presentations" / "skills"

        for skill in sample_bundle["skills"]:
            source_dir = REPO_ROOT / "skills" / skill["id"]
            copied_dir = plugin_skills_root / skill["id"]
            self.assertTrue(copied_dir.is_dir(), f'copied skill dir missing for {skill["id"]}')

            source_files = sorted(
                relative_posix(path, source_dir)
                for path in source_dir.rglob("*")
                if path.is_file()
            )
            copied_files = sorted(
                relative_posix(path, copied_dir)
                for path in copied_dir.rglob("*")
                if path.is_file()
            )
            self.assertEqual(copied_files, source_files, f'copied bundle skill should match source inventory for {skill["id"]}')

    def test_root_plugins_only_include_supported_skills_for_target(self):
        codex_root = REPO_ROOT / "plugins" / "agentic-awesome-skills" / "skills"
        claude_root = REPO_ROOT / "plugins" / "agentic-awesome-skills-claude" / "skills"

        for skill_id, compatibility in self.compatibility_by_id.items():
            codex_path = codex_root / skill_id
            claude_path = claude_root / skill_id
            self.assertEqual(
                codex_path.exists(),
                compatibility["targets"]["codex"] == "supported",
                f"Codex root plugin inclusion mismatch for {skill_id}",
            )
            self.assertEqual(
                claude_path.exists(),
                compatibility["targets"]["claude"] == "supported",
                f"Claude root plugin inclusion mismatch for {skill_id}",
            )

    def test_remove_tree_retries_on_enotempty(self):
        target = REPO_ROOT / "plugins" / "agentic-awesome-skills" / "skills"
        calls = {"count": 0}

        def flaky_rmtree(path):
            calls["count"] += 1
            if calls["count"] == 1:
                raise OSError(errno.ENOTEMPTY, "Directory not empty")

        with mock.patch.object(editorial_bundles.shutil, "rmtree", side_effect=flaky_rmtree):
            with mock.patch.object(editorial_bundles.time, "sleep") as sleep_mock:
                editorial_bundles._remove_tree(target)

        self.assertEqual(calls["count"], 2)
        sleep_mock.assert_called_once()

    def test_replace_directory_atomically_swaps_only_after_staging_is_ready(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_root = pathlib.Path(temp_dir)
            destination = temp_root / "plugin"
            old_file = destination / "skills" / "old.txt"
            old_file.parent.mkdir(parents=True, exist_ok=True)
            old_file.write_text("old", encoding="utf-8")

            observed = {}

            def populate(staging_root):
                new_file = staging_root / "skills" / "new.txt"
                new_file.parent.mkdir(parents=True, exist_ok=True)
                new_file.write_text("new", encoding="utf-8")

                observed["old_visible_during_populate"] = old_file.is_file()
                observed["new_hidden_during_populate"] = not (destination / "skills" / "new.txt").exists()

            editorial_bundles._replace_directory_atomically(destination, populate)

            self.assertTrue(observed["old_visible_during_populate"])
            self.assertTrue(observed["new_hidden_during_populate"])
            self.assertFalse(old_file.exists())
            self.assertTrue((destination / "skills" / "new.txt").is_file())


if __name__ == "__main__":
    unittest.main()
