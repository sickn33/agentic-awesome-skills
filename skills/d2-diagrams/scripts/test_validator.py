#!/usr/bin/env python3
"""
test_validator.py - Unit tests for validate_d2.py parser.
Supports execution from repository root, scripts directory, or unittest discovery.
"""

import os
import sys
import unittest

# Ensure scripts directory is in sys.path for direct invocation from any working directory
scripts_dir = os.path.dirname(os.path.abspath(__file__))
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

from validate_d2 import D2Parser

class TestD2Validator(unittest.TestCase):

    def test_valid_diagram(self):
        code = """
        direction: right
        classes: {
            service: {
                style.fill: "#e8f0fe"
            }
        }
        api: API Gateway { class: service }
        db: PostgreSQL { shape: cylinder }
        api -> db: Query {
            style.stroke-dash: 5
        }
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertEqual(len(errors), 0, f"Expected 0 errors, got: {errors}")

    def test_unterminated_block_string(self):
        code = """
        doc_node: {
            shape: document
            content: |md
                # System Architecture
                This markdown is never closed.
        }
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertTrue(any("Unterminated block string" in str(e) for e in errors),
                        "Expected Unterminated block string error")

    def test_terminated_block_string(self):
        code = """
        doc_node: {
            shape: document
            content: |md
                # System Architecture
                This markdown block is properly closed.
            |
        }
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertEqual(len(errors), 0, f"Expected valid block string, got errors: {errors}")

    def test_unbalanced_opening_brace(self):
        code = """
        vpc: Main VPC {
            subnet: Subnet A {
                api: API Node
            # Missing closing brace for Subnet A
        }
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertTrue(any("Unclosed opening brace" in str(e) for e in errors),
                        "Expected Unclosed opening brace error")

    def test_unexpected_closing_brace(self):
        code = """
        node_a: Node A
        }
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertTrue(any("Unexpected closing brace" in str(e) for e in errors),
                        "Expected Unexpected closing brace error")

    def test_unterminated_quote(self):
        code = """
        node_a: "Unclosed string label
        node_b: Node B
        """
        parser = D2Parser(code)
        errors = parser.validate()
        self.assertTrue(any("Unterminated string literal" in str(e) for e in errors),
                        "Expected Unterminated string literal error")

if __name__ == "__main__":
    unittest.main()
