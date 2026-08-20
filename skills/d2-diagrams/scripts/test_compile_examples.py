#!/usr/bin/env python3
"""
test_compile_examples.py - Compiler-backed integration test for all D2 documentation examples.
Extracts all fenced ```d2 code blocks from SKILL.md and references/*.md, validating every snippet
lexically and (if D2 CLI binary is installed) verifying successful compilation against D2 v0.6.8+.
"""

import os
import re
import sys
import shutil
import tempfile
import unittest
import subprocess

scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from validate_d2 import D2Parser

class TestD2DocumentationExamples(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.skill_root = os.path.dirname(scripts_dir)
        cls.d2_bin = shutil.which("d2")
        cls.snippets = []

        md_files = [os.path.join(cls.skill_root, "SKILL.md")]
        ref_dir = os.path.join(cls.skill_root, "references")
        if os.path.exists(ref_dir):
            for f in sorted(os.listdir(ref_dir)):
                if f.endswith(".md"):
                    md_files.append(os.path.join(ref_dir, f))

        for md_path in md_files:
            if not os.path.exists(md_path):
                continue
            rel_name = os.path.relpath(md_path, cls.skill_root)
            with open(md_path, "r", encoding="utf-8") as fh:
                content = fh.read()
            blocks = re.findall(r"```d2\s*\n(.*?)```", content, re.DOTALL)
            for idx, block in enumerate(blocks, start=1):
                cls.snippets.append((rel_name, idx, block.strip()))

    def test_snippets_extracted(self):
        self.assertGreaterEqual(
            len(self.snippets),
            10,
            f"Expected at least 10 D2 snippets across docs, found {len(self.snippets)}"
        )

    def test_all_snippets_lexical_validity(self):
        for rel_name, idx, code in self.snippets:
            with self.subTest(file=rel_name, block=idx):
                parser = D2Parser(code)
                errors = parser.validate()
                self.assertEqual(
                    len(errors),
                    0,
                    f"Lexical validation failed for {rel_name} (block {idx}):\n"
                    + "\n".join(str(e) for e in errors)
                    + f"\nSnippet:\n{code}"
                )

    def test_all_snippets_compiler_execution(self):
        if not self.d2_bin:
            self.skipTest("D2 CLI binary not found in PATH; skipping live binary compilation.")

        for rel_name, idx, code in self.snippets:
            with self.subTest(file=rel_name, block=idx):
                with tempfile.TemporaryDirectory() as tmpdir:
                    in_d2 = os.path.join(tmpdir, "snippet.d2")
                    out_svg = os.path.join(tmpdir, "output.svg")
                    with open(in_d2, "w", encoding="utf-8") as f:
                        f.write(code)

                    res = subprocess.run(
                        [self.d2_bin, in_d2, out_svg],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        timeout=15
                    )
                    self.assertEqual(
                        res.returncode,
                        0,
                        f"D2 compilation failed for {rel_name} (block {idx}):\n"
                        f"STDERR: {res.stderr}\nSTDOUT: {res.stdout}\nSnippet:\n{code}"
                    )
                    # Check either single SVG output or multi-board directory
                    dir_prefix = os.path.splitext(out_svg)[0]
                    has_svg = os.path.exists(out_svg) and os.path.getsize(out_svg) > 0
                    has_board_dir = os.path.isdir(dir_prefix) and len(os.listdir(dir_prefix)) > 0
                    self.assertTrue(
                        has_svg or has_board_dir,
                        f"Expected compiled SVG or multi-board output for {rel_name} (block {idx})"
                    )

if __name__ == "__main__":
    unittest.main()
