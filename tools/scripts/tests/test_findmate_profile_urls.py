import importlib.util
import pathlib
import unittest


REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
SCRIPT_DIR = REPO_ROOT / "skills" / "find-complementary-founders" / "scripts"


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPT_DIR / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PUBLISHER = load_module("findmate_moltbook_publish_test", "moltbook_publish.py")
GITHUB_THREAD = load_module("findmate_github_thread_test", "github_thread.py")
COMMIT = "0123456789abcdef0123456789abcdef01234567"
IMMUTABLE_URL = (
    f"https://github.com/owner/repo/blob/{COMMIT}/profiles/owner-profile.public.json"
)


class FindMateProfileUrlTests(unittest.TestCase):
    def test_accepts_full_sha_pinned_github_blob(self):
        self.assertEqual(
            PUBLISHER.immutable_github_profile_url(IMMUTABLE_URL),
            IMMUTABLE_URL,
        )
        body = f"Owner-approved profile: {IMMUTABLE_URL}"
        self.assertEqual(GITHUB_THREAD.safe_profile_url(body), IMMUTABLE_URL)

    def test_rejects_mutable_or_non_github_profile_urls(self):
        invalid_urls = [
            "https://github.com/owner/repo/blob/main/owner-profile.public.json",
            f"https://example.com/owner/repo/blob/{COMMIT}/owner-profile.public.json",
            f"https://github.com/owner/repo/blob/{COMMIT}/owner-profile.public.json?raw=1",
            f"https://github.com/owner/repo/blob/{COMMIT}/profiles/../owner-profile.public.json",
        ]
        for url in invalid_urls:
            with self.subTest(url=url):
                with self.assertRaises(PUBLISHER.PublishError):
                    PUBLISHER.immutable_github_profile_url(url)
                self.assertIsNone(
                    GITHUB_THREAD.safe_profile_url(
                        f"Owner-approved profile: {url}"
                    )
                )


if __name__ == "__main__":
    unittest.main()
