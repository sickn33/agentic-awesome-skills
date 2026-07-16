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


repair_descriptions = load_module(
    "tools/scripts/repair_description_usage_summaries.py",
    "repair_description_usage_summaries",
)


class RepairDescriptionUsageSummariesTests(unittest.TestCase):
    def test_build_repaired_description_adds_usage_summary(self):
        description = (
            "Comprehensive performance optimization guide for React and Next.js applications, "
            "maintained by Vercel. Contains 45 rules across 8 categories."
        )
        body = """
# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Contains 45 rules across 8 categories.

## When to Use

- Writing new React components or Next.js pages
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
"""
        repaired = repair_descriptions.build_repaired_description(description, body)
        self.assertEqual(
            repaired,
            "Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Use when writing new React components or Next.js pages, reviewing code for performance issues, or refactoring existing React/Next.js code.",
        )

    def test_build_repaired_description_skips_explicit_usage_descriptions(self):
        description = "Optimize React apps. Use when writing or reviewing React and Next.js code."
        body = """
# Skill

Optimize React apps.

## When to Use
- Writing React code
"""
        repaired = repair_descriptions.build_repaired_description(description, body)
        self.assertIsNone(repaired)

    def test_build_repaired_description_uses_body_sentence_when_description_is_label(self):
        description = "(React · TypeScript · Suspense-First · Production-Grade)"
        body = """
# Frontend Development Guidelines

(React · TypeScript · Suspense-First · Production-Grade)

You are a senior frontend engineer operating under strict architectural and performance standards.

## When to Use
- Creating components or pages
- Adding new features
- Fetching or mutating data
"""
        repaired = repair_descriptions.build_repaired_description(description, body)
        self.assertEqual(
            repaired,
            "You are a senior frontend engineer operating under strict architectural and performance standards. Use when creating components or pages, adding new features, or fetching or mutating data.",
        )

    def test_update_skill_file_rewrites_mirrored_description(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            skill_path = Path(temp_dir) / "SKILL.md"
            skill_path.write_text(
                """---
name: react-best-practices
description: "Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Contains 45 rules across 8 categories."
risk: unknown
source: community
---

# Vercel React Best Practices

Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Contains 45 rules across 8 categories.

## When to Use
- Writing new React components or Next.js pages
- Reviewing code for performance issues
- Refactoring existing React/Next.js code
""",
                encoding="utf-8",
            )

            changed, new_description = repair_descriptions.update_skill_file(skill_path)

            self.assertTrue(changed)
            self.assertIn("Use when writing new React components", new_description)
            updated = skill_path.read_text(encoding="utf-8")
            self.assertIn('description: "Comprehensive performance optimization guide for React and Next.js applications, maintained by Vercel. Use when writing new React components or Next.js pages, reviewing code for performance issues, or refactoring existing React/Next.js code."', updated)


if __name__ == "__main__":
    unittest.main()
