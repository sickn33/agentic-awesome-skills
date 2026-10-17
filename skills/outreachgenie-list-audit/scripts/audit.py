"""Audit an explicitly captured OutreachGenie snapshot. No network/API calls."""

from __future__ import annotations

import argparse
import html
import json
import math
import os
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from uuid import UUID

VERSION = "0.1.0"
BUILTINS = {
    "first_name",
    "last_name",
    "company",
    "title",
    "email",
    "phone",
    "linkedin_url",
}
PRIVATE_FIELDS = {"email", "phone"}
TOKEN = re.compile(r"{{\s*([^{}]+?)\s*}}")
ALLOWED_TOOLS = {
    "get_workspace_context",
    "get_flow",
    "list_flow_template_fields",
    "get_prospect_list",
    "list_prospects_in_list",
}
LIMITS = {
    "send_connection_request": ("invite_note", 200, False, "utf16"),
    "send_message": ("message", 1000, True, "code_points"),
    "comment_post": ("comment_text", 1000, True, "code_points"),
}
MAX_BYTES = 5 * 1024 * 1024
MAX_RECORDS = 1000
MAX_FINDINGS = 10000


class InputError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise InputError(message)


def load_snapshot(path):
    """Read bounded, unambiguous UTF-8 JSON without printing captured values."""

    def object_from_pairs(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, "Snapshot contains duplicate JSON object keys.")
            result[key] = value
        return result

    def finite_float(value):
        parsed = float(value)
        require(math.isfinite(parsed), "Snapshot contains a non-finite number.")
        return parsed

    def reject_constant(_value):
        raise InputError("Snapshot contains a non-finite number.")

    with path.open("rb") as handle:
        raw = handle.read(MAX_BYTES + 1)
    require(len(raw) <= MAX_BYTES, "Snapshot exceeds 5 MiB.")
    try:
        snapshot = json.loads(
            raw.decode("utf-8"),
            object_pairs_hook=object_from_pairs,
            parse_float=finite_float,
            parse_constant=reject_constant,
        )
        pending = [snapshot]
        while pending:
            value = pending.pop()
            if isinstance(value, str):
                value.encode("utf-8")
            elif isinstance(value, dict):
                pending.extend(value.keys())
                pending.extend(value.values())
            elif isinstance(value, list):
                pending.extend(value)
        return snapshot
    except InputError:
        raise
    except (UnicodeError, ValueError, RecursionError) as error:
        raise InputError(
            "Snapshot must be valid UTF-8 JSON with supported nesting and numeric values."
        ) from error


def uuid(value):
    require(isinstance(value, str), "Expected a UUID string.")
    try:
        return str(UUID(value))
    except ValueError as error:
        raise InputError("Invalid UUID in snapshot.") from error


def normalize_key(raw):
    key = raw.strip()
    if not key or any(c.isspace() for c in key):
        raise ValueError("empty_or_spaced_token")
    if key.startswith("custom_fields."):
        custom = key[len("custom_fields.") :].strip().lower()
        if not re.fullmatch(r"[a-z0-9_]{1,64}", custom):
            raise ValueError("invalid_custom_token")
        return "custom", custom
    if not re.fullmatch(r"[a-z][a-z0-9_]*", key):
        raise ValueError("invalid_token")
    if key in BUILTINS:
        return "builtin", key
    if key == "note":
        raise ValueError("note_is_not_a_template_field")
    if not re.fullmatch(r"[a-z0-9_]{1,64}", key):
        raise ValueError("invalid_custom_token")
    return "custom", key


def parse_template(text):
    refs, errors, spans = [], [], []
    for match in TOKEN.finditer(text):
        spans.append(match.span())
        try:
            ref = normalize_key(match.group(1))
            if ref not in refs:
                refs.append(ref)
        except ValueError as error:
            errors.append(str(error))
    remaining = text
    for start, end in reversed(spans):
        remaining = remaining[:start] + remaining[end:]
    if "{{" in remaining or "}}" in remaining:
        errors.append("unbalanced_template_braces")
    return refs, sorted(set(errors))


def saved_value(record, ref):
    kind, key = ref
    if kind == "builtin":
        if key not in record:
            return None
        value = record[key]
    else:
        if "custom_fields" not in record or not isinstance(
            record["custom_fields"], dict
        ):
            return None
        value = record["custom_fields"].get(key, "")
    if value is not None and not isinstance(value, (str, bool, int, float)):
        return None
    return str(value or "")


def render(text, record):
    """Runtime-compatible single substitution pass; caller checks syntax/coverage."""

    def replacement(match):
        try:
            return saved_value(record, normalize_key(match.group(1))) or ""
        except ValueError:
            return ""

    return TOKEN.sub(replacement, text).strip()


def length(text, unit):
    return (
        sum(2 if ord(c) > 0xFFFF else 1 for c in text) if unit == "utf16" else len(text)
    )


def rendered_length(text, record, unit):
    """Measure stripped single-pass output without allocating expanded messages."""
    cached = {}

    def stats(value):
        size = length(value, unit)
        leading = length(value[: len(value) - len(value.lstrip())], unit)
        trailing = length(value[len(value.rstrip()) :], unit)
        return size, leading, trailing

    def chunks():
        end = 0
        for match in TOKEN.finditer(text):
            yield stats(text[end : match.start()])
            ref = normalize_key(match.group(1))
            if ref not in cached:
                cached[ref] = stats(saved_value(record, ref) or "")
            yield cached[ref]
            end = match.end()
        yield stats(text[end:])

    started, total, trailing_total = False, 0, 0
    for size, leading, trailing in chunks():
        if not started:
            if leading == size:
                continue
            started = True
            total += size - leading
            trailing_total = trailing
        else:
            total += size
            trailing_total = trailing_total + size if leading == size else trailing
    return total - trailing_total


def text_fields(nodes):
    require(
        isinstance(nodes, list) and len(nodes) <= 200,
        "Flow nodes must be a list of at most 200 nodes.",
    )
    seen = set()
    fields, issues, unchecked = [], [], []
    for node in nodes:
        require(isinstance(node, dict), "Flow node must be an object.")
        nid = node.get("id")
        require(
            isinstance(nid, str) and 0 < len(nid) <= 200 and nid not in seen,
            "Missing or duplicate flow node ID.",
        )
        seen.add(nid)
        if node.get("type") != "action":
            continue
        data = node.get("data")
        require(isinstance(data, dict), "Action node data must be an object.")
        action, config = data.get("actionKey"), data.get("config")
        require(
            isinstance(action, str) and isinstance(config, dict),
            "Action key/config is missing.",
        )
        if action == "message_sequence":
            messages = config.get("messages")
            if not isinstance(messages, list) or not messages:
                issues.append((nid, "unconfigured_message_sequence"))
                continue
            if not 2 <= len(messages) <= 10:
                issues.append((nid, "message_sequence_count_outside_product_limit"))
            sequence_ids = [
                entry.get("id") if isinstance(entry, dict) else None
                for entry in messages
            ]
            if any(
                not isinstance(value, str) or not value.strip()
                for value in sequence_ids
            ) or len({str(value) for value in sequence_ids}) != len(sequence_ids):
                issues.append((nid, "message_sequence_ids_invalid"))
            for index, message in enumerate(messages):
                if not isinstance(message, dict) or not isinstance(
                    message.get("message"), str
                ):
                    issues.append((nid, "message_text_unavailable"))
                    continue
                fields.append(
                    (
                        nid,
                        action,
                        f"messages[{index}].message",
                        message["message"],
                        1000,
                        True,
                        "code_points",
                    )
                )
        elif action in LIMITS:
            name, limit, required, unit = LIMITS[action]
            camel = name.split("_")[0] + "".join(x.title() for x in name.split("_")[1:])
            if camel != name and name in config and camel in config:
                issues.append((nid, "ambiguous_text_field_aliases"))
                continue
            value = config.get(name)
            if value is None:
                value = config.get(camel)
            if value is None and not required:
                value = ""
            if not isinstance(value, str):
                issues.append((nid, "message_text_unavailable"))
                continue
            fields.append((nid, action, name, value, limit, required, unit))
        else:
            unchecked.append({"node_id": nid, "action_key": action})
    require(len(fields) <= 500, "Snapshot exceeds 500 outbound text fields.")
    return fields, issues, unchecked


def audit(snapshot):
    require(
        isinstance(snapshot, dict)
        and type(snapshot.get("schema_version")) is int
        and snapshot.get("schema_version") == 1,
        "Expected snapshot schema_version 1.",
    )
    require(
        isinstance(snapshot.get("source_kind"), str)
        and snapshot.get("source_kind") in {"fictional_fixture", "mcp_snapshot"},
        "Declare fictional_fixture or mcp_snapshot.",
    )
    captured = snapshot.get("captured_at")
    require(isinstance(captured, str), "captured_at is required.")
    try:
        parsed_date = datetime.fromisoformat(captured.replace("Z", "+00:00"))
        require(parsed_date.tzinfo is not None, "captured_at requires a timezone.")
    except ValueError as error:
        raise InputError("captured_at must be an ISO timestamp.") from error
    workspace_id, flow_id = (
        uuid(snapshot.get("workspace_id")),
        uuid(snapshot.get("flow_id")),
    )
    ids = snapshot.get("selected_list_ids")
    require(
        isinstance(ids, list) and 1 <= len(ids) <= 20, "Select one to twenty list IDs."
    )
    ids = [uuid(x) for x in ids]
    require(len(set(ids)) == len(ids), "Selected list IDs must be unique.")
    calls = snapshot.get("calls")
    require(
        isinstance(calls, list) and len(calls) <= 1000,
        "Expected at most 1000 captured tool calls.",
    )
    grouped = {name: [] for name in ALLOWED_TOOLS}
    for call in calls:
        require(
            isinstance(call, dict)
            and isinstance(call.get("tool"), str)
            and call.get("tool") in ALLOWED_TOOLS,
            "Only the five documented read tools belong in this snapshot.",
        )
        require(
            isinstance(call.get("arguments"), dict)
            and isinstance(call.get("result"), dict),
            "Call arguments and unwrapped result must be objects.",
        )
        grouped[call["tool"]].append(call)
    for singleton in ["get_workspace_context", "get_flow", "list_flow_template_fields"]:
        require(
            len(grouped[singleton]) == 1, f"Exactly one {singleton} result is required."
        )
    context = grouped["get_workspace_context"][0]
    require(
        isinstance(context["result"].get("workspace"), dict),
        "Workspace context was not captured.",
    )
    require(
        uuid(context["result"].get("workspace", {}).get("id")) == workspace_id,
        "Connected workspace does not match requested workspace.",
    )
    flow_call = grouped["get_flow"][0]
    require(
        uuid(flow_call["arguments"].get("flow_id")) == flow_id
        and uuid(flow_call["result"].get("id")) == flow_id,
        "Flow ID mismatch.",
    )
    schema_fields = grouped["list_flow_template_fields"][0]["result"].get(
        "built_in_fields"
    )
    require(
        isinstance(schema_fields, list)
        and all(
            isinstance(x, dict) and isinstance(x.get("key"), str) for x in schema_fields
        ),
        "Template-field catalog is missing.",
    )
    require(
        {x.get("key") for x in schema_fields} == BUILTINS,
        "Built-in template catalog changed; review the helper contract before continuing.",
    )
    fields, config_issues, unchecked = text_fields(flow_call["result"].get("nodes"))
    findings = []

    def add(code, level="review", **evidence):
        require(
            len(findings) < MAX_FINDINGS,
            "Snapshot produces over 10000 findings; reduce the selected-list scope and rerun.",
        )
        findings.append({"code": code, "level": level, **evidence})

    for node_id, code in config_issues:
        add(code, "unsupported", node_id=node_id)
    refs_by_field, custom_keys = {}, set()
    for node_id, action, field, text, limit, required, unit in fields:
        require(
            len(text) <= 100000, "Individual template exceeds the audit input limit."
        )
        refs, errors = parse_template(text)
        refs_by_field[(node_id, field)] = (refs, errors)
        custom_keys.update(key for kind, key in refs if kind == "custom")
        for error in errors:
            add(error, "template_issue", node_id=node_id, field=field)
        if action == "send_connection_request" and length(text.strip(), "utf16") > 200:
            add(
                "raw_invitation_note_exceeds_product_limit",
                "template_issue",
                node_id=node_id,
                field=field,
                length=length(text.strip(), "utf16"),
                limit=200,
                unit="utf16",
            )
        if action in {"send_message", "message_sequence"} and len(text.strip()) > 1000:
            add(
                "raw_message_exceeds_product_limit",
                "template_issue",
                node_id=node_id,
                field=field,
                length=len(text.strip()),
                limit=1000,
                unit="code_points",
            )
        if required and not text.strip():
            add(
                "required_raw_text_empty",
                "template_issue",
                node_id=node_id,
                field=field,
            )
        for kind, key in refs:
            if kind == "builtin" and key in PRIVATE_FIELDS:
                add(
                    "privacy_sensitive_template_field",
                    "context",
                    node_id=node_id,
                    field=field,
                    template_field=key,
                )
    details, pages = {}, {lid: [] for lid in ids}
    for call in grouped["get_prospect_list"]:
        lid = uuid(call["arguments"].get("list_id"))
        require(
            lid in ids and lid not in details and uuid(call["result"].get("id")) == lid,
            "Unexpected, duplicate or mismatched list detail.",
        )
        details[lid] = call["result"]
    require(set(details) == set(ids), "Each selected list requires one detail result.")
    for call in grouped["list_prospects_in_list"]:
        lid = uuid(call["arguments"].get("list_id"))
        require(lid in ids, "Prospect page belongs to an unselected list.")
        pages[lid].append(call)
    coverage, records_by_list, total_records = [], {}, 0
    for lid in ids:
        detail = details[lid]
        metadata = detail.get("custom_field_metadata")
        require(
            isinstance(metadata, list) and all(isinstance(x, dict) for x in metadata),
            "List field metadata was not captured.",
        )
        available = {x.get("key") for x in metadata if isinstance(x.get("key"), str)}
        for key in sorted(custom_keys - available):
            add(
                "custom_field_missing_from_list_metadata",
                "template_issue",
                list_id=lid,
                template_field=key,
            )
        active_count = detail.get("active_campaign_count")
        if type(active_count) is int and active_count > 0:
            add(
                "list_has_active_campaigns",
                "context",
                list_id=lid,
                active_campaign_count=active_count,
            )
        elif type(active_count) is not int or active_count < 0:
            add("active_campaign_context_unavailable", "unknown", list_id=lid)
        expected = detail.get("prospect_count")
        require(
            type(expected) is int and expected >= 0,
            "List prospect_count must be a nonnegative integer.",
        )
        collected, issues, seen_ids = [], [], set()
        ordered = pages[lid]
        next_expected, final_seen, first_size = 1, False, None
        for call in ordered:
            args, result = call["arguments"], call["result"]
            query = args.get("query")
            require(
                isinstance(query, dict) and set(query) <= {"page", "page_size"},
                "Capture an unfiltered page with explicit page/page_size.",
            )
            page, size = query.get("page"), query.get("page_size")
            require(
                type(page) is int
                and page >= 1
                and type(size) is int
                and 1 <= size <= 100,
                "Invalid page/page_size arguments.",
            )
            if first_size is None:
                first_size = size
            elif size != first_size:
                issues.append("page_size_changed")
            items, info = result.get("items"), result.get("pagination")
            require(
                isinstance(items, list) and isinstance(info, dict),
                "Items and normalized pagination are required.",
            )
            require(len(items) <= size, "Page contains more records than requested.")
            if page != next_expected or final_seen:
                issues.append("noncontiguous_or_extra_pages")
            if (
                any(
                    type(info.get(key)) is not int
                    for key in ["page", "page_size", "total"]
                )
                or info.get("page") != page
                or info.get("page_size") != size
                or info.get("total") != expected
            ):
                issues.append("pagination_or_total_mismatch")
            has_more = info.get("has_more")
            if type(has_more) is not bool:
                issues.append("missing_has_more")
            elif (has_more and type(info.get("next_page")) is not int) or info.get(
                "next_page"
            ) != (page + 1 if has_more else None):
                issues.append("next_page_mismatch")
            previous = info.get("previous_page")
            if (page > 1 and type(previous) is not int) or previous != (
                page - 1 if page > 1 else None
            ):
                issues.append("previous_page_mismatch")
            if type(has_more) is bool and has_more != (page * size < expected):
                issues.append("has_more_disagrees_with_total")
            if len(items) != max(0, min(size, expected - (page - 1) * size)):
                issues.append("unexpected_page_length")
            if has_more is False:
                final_seen = True
            next_expected = page + 1
            for item in items:
                require(isinstance(item, dict), "Prospect item must be an object.")
                pid = uuid(item.get("id"))
                if pid in seen_ids:
                    issues.append("duplicate_record_across_pages")
                    continue
                seen_ids.add(pid)
                collected.append({**item, "id": pid})
        total_records += len(collected)
        require(
            total_records <= MAX_RECORDS,
            f"Snapshot exceeds {MAX_RECORDS} selected-list memberships; capture a bounded scope and report partial coverage.",
        )
        if not ordered or not final_seen or len(collected) != expected:
            issues.append("incomplete_collection")
        for issue in sorted(set(issues)):
            add(issue, "coverage_issue", list_id=lid)
        coverage.append(
            {
                "list_id": lid,
                "reported_memberships": expected,
                "processed_memberships": len(collected),
                "pages": len(ordered),
                "complete": not issues,
            }
        )
        records_by_list[lid] = collected
        if expected == 0:
            add("empty_selected_list", "context", list_id=lid)
    for lid, records in records_by_list.items():
        for record in records:
            pid = uuid(record["id"])
            for node_id, action, field, text, limit, required, unit in fields:
                refs, errors = refs_by_field[(node_id, field)]
                if errors:
                    continue
                unknown = False
                for ref in refs:
                    value = saved_value(record, ref)
                    key = f"custom_fields.{ref[1]}" if ref[0] == "custom" else ref[1]
                    evidence = {
                        "list_id": lid,
                        "prospect_id": pid,
                        "node_id": node_id,
                        "field": field,
                        "template_field": key,
                    }
                    if value is None:
                        unknown = True
                        add(
                            "saved_value_not_captured_or_unsupported",
                            "unknown",
                            **evidence,
                        )
                    elif value == "":
                        add("saved_template_value_empty", "review", **evidence)
                    elif "{{" in value or "}}" in value:
                        add(
                            "saved_value_contains_literal_braces", "context", **evidence
                        )
                if unknown:
                    continue
                measured_length = rendered_length(text, record, unit)
                evidence = {
                    "list_id": lid,
                    "prospect_id": pid,
                    "node_id": node_id,
                    "field": field,
                }
                if measured_length == 0:
                    add(
                        "required_text_renders_empty"
                        if required
                        else "optional_note_renders_empty",
                        "template_issue" if required else "context",
                        **evidence,
                    )
                elif measured_length > limit:
                    add(
                        "rendered_text_exceeds_product_limit",
                        "template_issue",
                        length=measured_length,
                        limit=limit,
                        unit=unit,
                        **evidence,
                    )
    if not fields:
        add("no_supported_outbound_text_fields", "unsupported")
    counts = dict(sorted(Counter(f["code"] for f in findings).items()))
    return {
        "audit_version": VERSION,
        "source_kind": snapshot["source_kind"],
        "captured_at": captured,
        "workspace_id": workspace_id,
        "flow_id": flow_id,
        "coverage": coverage,
        "all_selected_memberships_captured": all(x["complete"] for x in coverage),
        "unique_prospects_processed": len(
            {x["id"] for records in records_by_list.values() for x in records}
        ),
        "outbound_text_fields_checked": len(fields),
        "unchecked_actions": unchecked,
        "counts": counts,
        "findings": findings,
        "limits": [
            "Supplied snapshot only; authentication and live workspace state are not independently verified.",
            "No graph reachability, schedule, reply-state, contact permission, profile validity or delivery audit.",
            "Findings omit raw saved values and rendered message text; record IDs and field names may still be sensitive.",
            "A complete snapshot or zero findings is not approval to activate or send.",
            "Field truth, relevance and whether a message is appropriate require human judgement.",
        ],
    }


def markdown(report):
    def cell(value):
        return (
            html.escape(str(value))
            .replace("\\", "\\\\")
            .replace("|", "\\|")
            .replace("\n", " ")
            .replace("\r", " ")
            .replace("`", "\\`")
            .replace("[", "\\[")
            .replace("]", "\\]")
        )

    lines = [
        "# OutreachGenie saved-list/flow audit",
        "",
        f"Source: {report['source_kind']}; captured: {report['captured_at']}",
        "",
        "This report checks a supplied snapshot. It does not approve sending.",
        "",
        "## Coverage",
        "",
        "| List ID | Reported memberships | Processed | Complete |",
        "| --- | ---: | ---: | --- |",
    ]
    for item in report["coverage"]:
        lines.append(
            f"| {item['list_id']} | {item['reported_memberships']} | {item['processed_memberships']} | {item['complete']} |"
        )
    lines += [
        "",
        "## Findings",
        "",
        "| Finding | Level | List ID | Prospect ID | Node | Text field | Template field | Detail |",
        "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for item in report["findings"]:
        detail = ""
        if "length" in item:
            detail = f"{item['length']} / {item['limit']} {item['unit']}"
        elif "active_campaign_count" in item:
            detail = f"{item['active_campaign_count']} active campaign(s)"
        lines.append(
            "| "
            + " | ".join(
                cell(item.get(k, ""))
                for k in [
                    "code",
                    "level",
                    "list_id",
                    "prospect_id",
                    "node_id",
                    "field",
                    "template_field",
                ]
            )
            + " | "
            + cell(detail)
            + " |"
        )
    if not report["findings"]:
        lines += [
            "",
            "No findings from the checks performed. This is not a readiness certification.",
        ]
    lines += ["", "## Limits", ""] + ["- " + x for x in report["limits"]]
    lines += [
        "",
        "Other saved actions were not evaluated: "
        + ", ".join(cell(x["action_key"]) for x in report["unchecked_actions"])
        + ".",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="New private directory; existing directories are not overwritten.",
    )
    args = parser.parse_args()
    try:
        snapshot = load_snapshot(args.input)
        report = audit(snapshot)
        args.output_dir.mkdir(mode=0o700, parents=False, exist_ok=False)
        for name, content in [
            (
                "audit-report.json",
                json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            ),
            ("audit-report.md", markdown(report)),
        ]:
            path = args.output_dir / name
            with path.open("x", encoding="utf-8") as handle:
                os.chmod(path, 0o600)
                handle.write(content)
        print(
            json.dumps(
                {
                    "report_directory": str(args.output_dir),
                    "findings": len(report["findings"]),
                    "coverage_complete": report["all_selected_memberships_captured"],
                }
            )
        )
    except (InputError, OSError, json.JSONDecodeError) as error:
        parser.exit(2, f"Audit could not run: {error}\n")


if __name__ == "__main__":
    main()
