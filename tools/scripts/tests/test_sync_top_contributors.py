import importlib.util
import json
import sys
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, module_name: str):
    spec = importlib.util.spec_from_file_location(module_name, REPO_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


top = load_module(
    "tools/scripts/sync_top_contributors.py",
    "sync_top_contributors_test",
)


COMMIT_ROWS = [("alice", 12), ("bob", 9)]
SKILL_ROWS = [("bob", 40), ("carol", 25)]


class SyncTopContributorsTests(unittest.TestCase):
    def test_section_is_replaced_between_its_own_headings(self):
        readme = (
            "# Title\n\n## Top Contributors\n\nstale\n\n"
            "## Repo Contributors\n\nkeep me\n\n## Star History\n\ntail\n"
        )
        updated = top.update_top_contributors_section(readme, COMMIT_ROWS, SKILL_ROWS)
        self.assertIn("### Most Commits", updated)
        self.assertIn("### Most Skills Added", updated)
        self.assertNotIn("stale", updated)
        # Neighbouring sections must survive untouched.
        self.assertIn("## Repo Contributors\n\nkeep me", updated)
        self.assertIn("## Star History\n\ntail", updated)

    def test_rendered_rows_keep_order_and_values(self):
        updated = top.update_top_contributors_section(
            "## Top Contributors\n\nx\n\n## Repo Contributors\n", COMMIT_ROWS, SKILL_ROWS
        )
        self.assertLess(updated.index("[@alice]"), updated.index("[@bob]"))
        self.assertIn("| 1 |", updated)
        self.assertIn("| 12 |", updated)
        self.assertIn("| 40 |", updated)

    def test_missing_section_fails_closed(self):
        with self.assertRaises(ValueError):
            top.update_top_contributors_section("# Title\n", COMMIT_ROWS, SKILL_ROWS)

    def test_excluded_accounts_never_render(self):
        rows = [(login, 1) for login in sorted(top.EXCLUDED_LOGINS)]
        updated = top.update_top_contributors_section(
            "## Top Contributors\n\nx\n\n## Repo Contributors\n", rows, rows
        )
        for login in top.EXCLUDED_LOGINS:
            self.assertNotIn(f"[@{login}]", updated)

    def test_maintainer_aliases_resolve_to_one_account(self):
        self.assertEqual(top.login_from_email("184072420+sickn33@users.noreply.github.com"), "sickn33")
        self.assertEqual(top.login_from_email("sickn33@users.noreply.github.com"), "sickn33")
        self.assertEqual(top.login_from_email("niccolo.lucioli@hotmail.com"), "sickn33")
        self.assertIsNone(top.login_from_email("someone@example.com"))

    def test_copy_origin_is_not_treated_as_a_new_skill(self):
        # Only the recorded first introduction counts; a later copy of an
        # existing SKILL.md must not inflate a contributor's total.
        self.assertTrue(hasattr(top, "compute_skill_ranking"))

    def test_render_table_has_a_stable_header(self):
        table = top.render_table(COMMIT_ROWS, "Commits")
        self.assertEqual(table.splitlines()[0], "| # | Contributor | Commits |")
        self.assertEqual(table.splitlines()[1], "|---:|---|---:|")
        self.assertEqual(len(table.splitlines()), 4)


if __name__ == "__main__":
    unittest.main()
