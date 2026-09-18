import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_SCRIPTS_DIR = REPO_ROOT / "tools" / "scripts"
if str(TOOLS_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_SCRIPTS_DIR))


def load_module(relative_path: str, name: str):
    spec = importlib.util.spec_from_file_location(name, REPO_ROOT / relative_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


validate_skills = load_module("tools/scripts/validate_skills.py", "validate_skills_offensive_guardrails")


EXACT_GUARDRAIL = """
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
"""


def write_skill(root: Path, body: str):
    skill_dir = root / "offensive-test"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(
        "---\n"
        "name: offensive-test\n"
        "description: Test an authorized offensive workflow.\n"
        "risk: offensive\n"
        "source: self\n"
        "date_added: \"2026-07-29\"\n"
        "---\n\n"
        f"{body}\n\n"
        "## When to Use\n\n- Authorized tests only.\n",
        encoding="utf-8",
    )


class OffensiveSkillGuardrailTests(unittest.TestCase):
    def test_generic_disclaimer_without_confirmation_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp) / "skills"
            write_skill(skills_dir, "> AUTHORIZED USE ONLY: authorized tests only.")
            results = validate_skills.collect_validation_results(str(skills_dir))
            self.assertTrue(any("EXACT AUTHORIZED-USE DISCLAIMER" in error for error in results["errors"]))
            self.assertTrue(any("PER-ACTION CONFIRMATION GATE" in error for error in results["errors"]))

    def test_exact_guardrail_passes_security_checks(self):
        with tempfile.TemporaryDirectory() as tmp:
            skills_dir = Path(tmp) / "skills"
            write_skill(skills_dir, EXACT_GUARDRAIL)
            results = validate_skills.collect_validation_results(str(skills_dir))
            self.assertFalse(any("OFFENSIVE SKILL" in error for error in results["errors"]))


if __name__ == "__main__":
    unittest.main()
