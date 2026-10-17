"""Offline behavioral checks. Fixtures are fictional; no network or product writes."""

import copy
import json
import os
import subprocess
import sys
import tempfile
import tracemalloc
import unittest
from pathlib import Path

import audit

ROOT = Path(__file__).resolve().parents[1]


def snapshot():
    return json.loads((ROOT / "assets/fictional-snapshot.json").read_text())


def calls(data, tool):
    return [x for x in data["calls"] if x["tool"] == tool]


def codes(report):
    return set(report["counts"])


def one_text(data, text, action="send_message", field="message"):
    calls(data, "get_flow")[0]["result"]["nodes"] = [
        {
            "id": "test",
            "type": "action",
            "data": {"actionKey": action, "config": {field: text}},
        }
    ]


class AuditTests(unittest.TestCase):
    def test_rendered_measurement_matches_single_pass_stripping(self):
        for value in ["", " ", "\t\n", " Demo ", "🙂", "{{first_name}}", 0, None]:
            for template in [
                "{{topic}}",
                "  {{topic}}  ",
                "{{topic}}  {{topic}}",
                "\nX{{topic}}\t",
                "{{topic}}Y  ",
            ]:
                record = {"custom_fields": {"topic": value}}
                for unit in ["utf16", "code_points"]:
                    with self.subTest(value=value, template=template, unit=unit):
                        self.assertEqual(
                            audit.rendered_length(template, record, unit),
                            audit.length(audit.render(template, record), unit),
                        )

    def test_large_repeated_values_do_not_allocate_the_expanded_message(self):
        record = {"custom_fields": {"topic": "x" * (1024 * 1024)}}
        tracemalloc.start()
        try:
            measured = audit.rendered_length("{{topic}}" * 100, record, "code_points")
            _current, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
        self.assertEqual(measured, 100 * 1024 * 1024)
        self.assertLess(peak, 8 * 1024 * 1024)

    def test_snapshot_loader_rejects_ambiguous_or_invalid_json(self):
        invalid_inputs = [
            b'{"key":1,"key":2}',
            b'{"value":NaN}',
            b'{"value":1e999}',
            b"\xff",
            b'{"value":"\\ud800"}',
            b" " * (audit.MAX_BYTES + 1),
        ]
        with tempfile.TemporaryDirectory(dir=ROOT.parent) as folder:
            path = Path(folder) / "snapshot.json"
            for index, payload in enumerate(invalid_inputs):
                with self.subTest(case=index):
                    path.write_bytes(payload)
                    with self.assertRaises(audit.InputError):
                        audit.load_snapshot(path)
            path.write_text(json.dumps(snapshot()))
            self.assertEqual(audit.load_snapshot(path), snapshot())

    def test_invalid_source_kind_is_rejected_without_type_error(self):
        data = snapshot()
        data["source_kind"] = []
        with self.assertRaises(audit.InputError):
            audit.audit(data)

    def test_markdown_escapes_existing_backslashes_before_link_syntax(self):
        data = snapshot()
        node = calls(data, "get_flow")[0]["result"]["nodes"][0]
        node["id"] = r"\[label\](https://example.invalid)"
        report = audit.markdown(audit.audit(data))
        self.assertIn(r"\\\[label\\\]", report)

    def test_cli_invalid_input_exits_cleanly_without_creating_output(self):
        with tempfile.TemporaryDirectory(dir=ROOT.parent) as folder:
            source = Path(folder) / "invalid.json"
            source.write_bytes(b"\xff")
            output = Path(folder) / "report"
            result = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "scripts/audit.py"),
                    "--input",
                    str(source),
                    "--output-dir",
                    str(output),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(result.returncode, 2)
            self.assertNotIn("Traceback", result.stderr)
            self.assertFalse(output.exists())

    def test_demo_counts_shared_membership_once_per_list(self):
        report = audit.audit(snapshot())
        self.assertTrue(report["all_selected_memberships_captured"])
        self.assertEqual(report["unique_prospects_processed"], 3)
        self.assertEqual(sum(x["processed_memberships"] for x in report["coverage"]), 4)
        self.assertEqual(report["outbound_text_fields_checked"], 4)
        self.assertIn("custom_field_missing_from_list_metadata", codes(report))
        self.assertIn("required_text_renders_empty", codes(report))
        self.assertIn("rendered_text_exceeds_product_limit", codes(report))
        self.assertEqual(report["unchecked_actions"][0]["action_key"], "check_reply")
        self.assertIn("232 / 200 utf16", audit.markdown(report))

    def test_workspace_catalog_does_not_prove_selected_list_fields(self):
        data = snapshot()
        calls(data, "get_prospect_list")[1]["result"]["custom_field_metadata"] = [
            {"key": "TOPIC"}
        ]
        findings = audit.audit(data)["findings"]
        self.assertTrue(
            any(
                x["code"] == "custom_field_missing_from_list_metadata" for x in findings
            )
        )

    def test_blank_and_uncaptured_values_are_distinct(self):
        data = snapshot()
        one_text(data, "{{topic}}")
        item = calls(data, "list_prospects_in_list")[0]["result"]["items"][0]
        item.pop("custom_fields")
        report = audit.audit(data)
        self.assertIn("saved_value_not_captured_or_unsupported", codes(report))
        self.assertIn("saved_template_value_empty", codes(report))
        self.assertFalse(
            any(
                x["code"] == "required_text_renders_empty"
                and x.get("prospect_id") == item["id"]
                and x.get("list_id") == data["selected_list_ids"][0]
                for x in report["findings"]
            )
        )

    def test_missing_custom_key_is_known_empty_when_dictionary_captured(self):
        self.assertEqual(
            audit.saved_value({"custom_fields": {}}, ("custom", "topic")), ""
        )
        self.assertIsNone(audit.saved_value({}, ("custom", "topic")))
        self.assertEqual(
            audit.saved_value({"first_name": None}, ("builtin", "first_name")), ""
        )
        self.assertIsNone(audit.saved_value({}, ("builtin", "first_name")))

    def test_single_pass_and_false_values_match_contract(self):
        record = {
            "first_name": "Example",
            "custom_fields": {"topic": "{{first_name}}", "zero": 0, "false": False},
        }
        self.assertEqual(audit.render(" {{topic}} ", record), "{{first_name}}")
        self.assertEqual(audit.render("{{zero}}-{{false}}", record), "-")
        self.assertEqual(
            audit.render("{{custom_fields.TOPIC}}", record), "{{first_name}}"
        )

    def test_invalid_tokens_and_malformed_braces_skip_render_conclusions(self):
        for text in [
            "{{note}}",
            "{{first name}}",
            "{{first_name}",
            "{{{{first_name}}}}",
            "{{}}",
            "{{custom_fields.}}",
        ]:
            with self.subTest(text=text):
                data = snapshot()
                one_text(data, text)
                report = audit.audit(data)
                self.assertTrue(
                    any(x["level"] == "template_issue" for x in report["findings"])
                )
                self.assertNotIn("required_text_renders_empty", codes(report))

    def test_single_outer_braces_are_literal_under_product_rules(self):
        self.assertEqual(audit.parse_template("{{{first_name}}}")[1], [])
        self.assertEqual(
            audit.render("{{{first_name}}}", {"first_name": "Demo"}), "{Demo}"
        )

    def test_invitation_utf16_boundary_and_message_code_points(self):
        data = snapshot()
        one_text(data, "🙂" * 100, "send_connection_request", "invite_note")
        self.assertNotIn(
            "rendered_text_exceeds_product_limit", codes(audit.audit(data))
        )
        one_text(data, "🙂" * 101, "send_connection_request", "inviteNote")
        self.assertIn(
            "raw_invitation_note_exceeds_product_limit", codes(audit.audit(data))
        )
        one_text(data, "🙂" * 1000)
        self.assertNotIn(
            "rendered_text_exceeds_product_limit", codes(audit.audit(data))
        )
        one_text(data, "🙂" * 1001)
        self.assertIn("raw_message_exceeds_product_limit", codes(audit.audit(data)))

    def test_required_and_optional_empty_text(self):
        data = snapshot()
        one_text(data, "   ")
        self.assertIn("required_text_renders_empty", codes(audit.audit(data)))
        one_text(data, "   ", "send_connection_request", "invite_note")
        report = audit.audit(data)
        self.assertIn("optional_note_renders_empty", codes(report))
        self.assertNotIn("required_text_renders_empty", codes(report))

    def test_duplicate_aliases_are_unsupported_instead_of_guessed(self):
        data = snapshot()
        one_text(data, "Hello", "send_connection_request", "invite_note")
        calls(data, "get_flow")[0]["result"]["nodes"][0]["data"]["config"][
            "inviteNote"
        ] = "Different"
        report = audit.audit(data)
        self.assertIn("ambiguous_text_field_aliases", codes(report))
        self.assertEqual(report["outbound_text_fields_checked"], 0)

    def test_comment_field_and_sequence_count_are_checked(self):
        data = snapshot()
        one_text(data, "x" * 1001, "comment_post", "commentText")
        self.assertIn("rendered_text_exceeds_product_limit", codes(audit.audit(data)))
        one_text(data, [{"id": "one", "message": "Hi"}], "message_sequence", "messages")
        self.assertIn(
            "message_sequence_count_outside_product_limit", codes(audit.audit(data))
        )

    def test_zero_members_needs_explicit_page_and_still_checks_raw_text(self):
        data = snapshot()
        one_text(data, " ")
        for detail in calls(data, "get_prospect_list"):
            detail["result"]["prospect_count"] = 0
        for page in calls(data, "list_prospects_in_list"):
            page["result"]["items"] = []
            page["result"]["pagination"]["total"] = 0
        report = audit.audit(data)
        self.assertTrue(report["all_selected_memberships_captured"])
        self.assertIn("required_raw_text_empty", codes(report))

    def test_truncation_is_not_complete(self):
        data = snapshot()
        data["calls"].remove(calls(data, "list_prospects_in_list")[1])
        report = audit.audit(data)
        self.assertFalse(report["all_selected_memberships_captured"])
        self.assertIn("incomplete_collection", codes(report))

    def test_duplicate_record_and_changed_total_not_complete(self):
        data = snapshot()
        page = calls(data, "list_prospects_in_list")[0]["result"]
        page["items"][1] = copy.deepcopy(page["items"][0])
        page["pagination"]["total"] = 4
        report = audit.audit(data)
        self.assertFalse(report["all_selected_memberships_captured"])
        self.assertIn("duplicate_record_across_pages", codes(report))
        self.assertIn("pagination_or_total_mismatch", codes(report))

    def test_pagination_boolean_is_not_integer(self):
        data = snapshot()
        calls(data, "list_prospects_in_list")[0]["result"]["pagination"]["page"] = True
        report = audit.audit(data)
        self.assertFalse(report["all_selected_memberships_captured"])

    def test_changing_page_size_invalidates_collection(self):
        data = snapshot()
        page = calls(data, "list_prospects_in_list")[0]
        second = copy.deepcopy(page)
        page["arguments"]["query"]["page_size"] = 1
        page["result"]["items"] = page["result"]["items"][:1]
        page["result"]["pagination"].update(page_size=1, has_more=True, next_page=2)
        second["arguments"]["query"].update(page=2, page_size=2)
        second["result"]["items"] = second["result"]["items"][1:]
        second["result"]["pagination"].update(page=2, page_size=2, previous_page=1)
        data["calls"].insert(data["calls"].index(page) + 1, second)
        report = audit.audit(data)
        self.assertFalse(report["all_selected_memberships_captured"])
        self.assertIn("page_size_changed", codes(report))

    def test_wrong_workspace_and_write_call_are_rejected(self):
        data = snapshot()
        data["workspace_id"] = data["flow_id"]
        with self.assertRaises(audit.InputError):
            audit.audit(data)
        data = snapshot()
        data["calls"].append(
            {"tool": "activate_campaign", "arguments": {}, "result": {}}
        )
        with self.assertRaises(audit.InputError):
            audit.audit(data)

    def test_changed_builtin_contract_is_rejected(self):
        data = snapshot()
        calls(data, "list_flow_template_fields")[0]["result"]["built_in_fields"].append(
            {"key": "new_field"}
        )
        with self.assertRaises(audit.InputError):
            audit.audit(data)

    def test_output_omits_saved_values_and_rendered_text(self):
        data = snapshot()
        sentinel = "SENSITIVE-SYNTHETIC-VALUE-DO-NOT-REPORT"
        for page in calls(data, "list_prospects_in_list"):
            for item in page["result"]["items"]:
                item["first_name"] = sentinel
                item["custom_fields"] = {"topic": sentinel}
        report = audit.audit(data)
        self.assertNotIn(sentinel, json.dumps(report))
        self.assertNotIn(sentinel, audit.markdown(report))

    def test_cli_output_private_and_refuses_overwrite(self):
        with tempfile.TemporaryDirectory(dir=ROOT.parent) as folder:
            output = Path(folder) / "report"
            command = [
                sys.executable,
                str(ROOT / "scripts/audit.py"),
                "--input",
                str(ROOT / "assets/fictional-snapshot.json"),
                "--output-dir",
                str(output),
            ]
            first = subprocess.run(command, capture_output=True, text=True, check=False)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertTrue((output / "audit-report.md").is_file())
            if os.name == "posix":
                self.assertEqual(output.stat().st_mode & 0o777, 0o700)
                self.assertEqual(
                    (output / "audit-report.json").stat().st_mode & 0o777, 0o600
                )
            self.assertEqual(
                subprocess.run(command, capture_output=True, check=False).returncode, 2
            )


if __name__ == "__main__":
    unittest.main()
