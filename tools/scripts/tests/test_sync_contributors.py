import importlib.util
import sys
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


sync_contributors = load_module(
    "tools/scripts/sync_contributors.py",
    "sync_contributors_test",
)


class SyncContributorsTests(unittest.TestCase):
    def test_parse_existing_contributor_links_preserves_custom_urls(self):
        content = """## Repo Contributors

- [@alice](https://github.com/alice)
- [@github-actions[bot]](https://github.com/apps/github-actions)
- [@Copilot](https://github.com/apps/copilot-swe-agent)
"""
        links = sync_contributors.parse_existing_contributor_links(content)

        self.assertEqual(links["alice"], "https://github.com/alice")
        self.assertEqual(links["github-actions[bot]"], "https://github.com/apps/github-actions")
        self.assertEqual(links["Copilot"], "https://github.com/apps/copilot-swe-agent")

    def test_update_repo_contributors_section_renders_latest_contributors(self):
        content = """## Repo Contributors

<a href="https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

We officially thank the following contributors for their help in making this repository awesome!

- [@alice](https://github.com/alice)
- [@Copilot](https://github.com/apps/copilot-swe-agent)

## License
"""

        updated = sync_contributors.update_repo_contributors_section(
            content,
            ["alice", "github-actions[bot]", "Copilot", "new-user"],
        )

        self.assertIn("https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills&max=500", updated)
        self.assertIn("https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors", updated)
        self.assertNotIn("- [@alice]", updated)
        self.assertNotIn("- [@new-user]", updated)
        self.assertEqual(updated.count("## Repo Contributors"), 1)
        self.assertEqual(updated.count("## License"), 1)

    def test_order_contributors_for_render_preserves_existing_order_and_appends_new(self):
        ordered = sync_contributors.order_contributors_for_render(
            ["new-z", "bob", "alice", "new-a", "github-actions[bot]"],
            ["alice", "github-actions[bot]", "bob", "removed-user"],
        )

        self.assertEqual(
            ordered,
            ["alice", "github-actions[bot]", "bob", "new-a", "new-z"],
        )

    def test_update_repo_contributors_section_removes_manual_list(self):
        content = """## Repo Contributors

<a href="https://github.com/sickn33/antigravity-awesome-skills/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=sickn33/antigravity-awesome-skills" alt="Repository contributors" />
</a>

Made with [contrib.rocks](https://contrib.rocks).

We officially thank the following contributors for their help in making this repository awesome!

- [@alice](https://github.com/alice)
- [@github-actions[bot]](https://github.com/apps/github-actions)
- [@bob](https://github.com/bob)

## License
"""

        updated = sync_contributors.update_repo_contributors_section(
            content,
            ["bob", "new-user", "alice", "github-actions[bot]"],
        )

        contributor_block = updated.split(
            "We officially thank the following contributors for their help in making this repository awesome!\n\n",
            1,
        )[1].split("\n## License", 1)[0]

        self.assertNotIn("- [@", contributor_block)

    def test_parse_contributors_response_dedupes_and_sorts_order(self):
        payload = [
            {"login": "alice"},
            {"login": "bob"},
            {"login": "alice"},
            {"login": "github-actions[bot]"},
        ]

        contributors = sync_contributors.parse_contributors_response(payload)

        self.assertEqual(contributors, ["alice", "bob", "github-actions[bot]"])


if __name__ == "__main__":
    unittest.main()
