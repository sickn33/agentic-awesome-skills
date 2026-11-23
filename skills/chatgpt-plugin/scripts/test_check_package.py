#!/usr/bin/env python3
"""Build a minimal valid plugin package, then break it one way at a time, and check that
check_package.py passes the first and names each break. Run after every edit to the checker:

    python <skill dir>/scripts/test_check_package.py

Each broken case is a trap a submission met or a rule OpenAI's pages state, so a change to the
checker that stops catching one fails here.
"""
import copy
import json
import os
import struct
import sys
import tempfile
import zipfile
import zlib
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ beside the skill
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_package  # noqa: E402


def png(width, height):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"\x00\x00\x00" * width for _ in range(height))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


CASE = {"description": "Checks status", "prompt": "Use Example to check my apps",
        "tools_triggered": "get_status", "expected_behavior": "Lists each app and its state"}
NEGATIVE = {"description": "Advice only, no tool", "prompt": "How should I monitor cron jobs?"}

MANIFEST = {
    "$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    "name": "example",
    "version": "1.0.0",
    "description": "Check your apps' status from ChatGPT.",
    "extensions": {"com.openai": {
        "interface": {
            "displayName": "Example",
            "shortDescription": "Uptime and status",
            "longDescription": "Check whether your apps are up and read their incidents.",
            "developerName": "Example Ltd",
            "category": "Developer Tools",
            "capabilities": ["Read", "Write"],
            "websiteURL": "https://example.com",
            "supportURL": "https://example.com/support",
            "privacyPolicyURL": "https://example.com/privacy",
            "termsOfServiceURL": "https://example.com/terms",
            "defaultPrompt": ["Use Example to check my apps"],
            "brandColor": "#1A7F37",
            "composerIcon": "./assets/icon.png",
            "logo": "./assets/logo.png",
        },
        "review": {
            "test_cases": {"positive": [dict(CASE) for _ in range(5)], "negative": [dict(NEGATIVE) for _ in range(3)]},
            "demo_recording_url": "https://video.example.com/demo",
            "commerce": False,
        },
        "publication": {"release_notes": "Check status and incidents from ChatGPT."},
    }},
}
MCP = {
    "$schema": "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    "mcpServers": {"example": {
        "type": "streamable-http",
        "url": "https://example.com/mcp",
        "extensions": {"com.openai": {"auth": {"type": "oauth", "client": {"mode": "cimd"}}}},
    }},
}
SKILL = "---\nname: app-status\ndescription: Use when the user asks whether their apps are up.\n---\n\nCall get_status.\n"


def build(root, manifest=None, mcp=None, skill=SKILL, icon=(512, 512)):
    root.mkdir(parents=True, exist_ok=True)
    (root / "plugin.json").write_text(json.dumps(manifest or MANIFEST, indent=2), encoding="utf-8")
    (root / "mcp.json").write_text(json.dumps(mcp or MCP, indent=2), encoding="utf-8")
    (root / "assets").mkdir(exist_ok=True)
    (root / "assets" / "icon.png").write_bytes(png(*icon))
    (root / "assets" / "logo.png").write_bytes(png(1024, 1024))
    if skill is not None:
        (root / "skills" / "app-status").mkdir(parents=True, exist_ok=True)
        (root / "skills" / "app-status" / "SKILL.md").write_text(skill, encoding="utf-8")
    return root


def zip_of(root, path, skip=(), extra=None):
    with zipfile.ZipFile(path, "w") as archive:
        for p in sorted(root.rglob("*")):
            name = p.relative_to(root).as_posix()
            if p.is_file() and name not in skip:
                archive.write(p, name)
        for name, data in (extra or {}).items():
            archive.writestr(name, data)
    return path


def manifest_with(change):
    m = copy.deepcopy(MANIFEST)
    change(m["extensions"]["com.openai"])
    return m


def mcp_with(change):
    m = copy.deepcopy(MCP)
    change(m["mcpServers"]["example"])
    return m


BROKEN = [
    # (label, build kwargs, text the error must contain)
    ("no auth declared", {"mcp": mcp_with(lambda s: s.pop("extensions"))}, "declare the authentication before the first upload"),
    ("api_key auth", {"mcp": mcp_with(lambda s: s["extensions"]["com.openai"].update(auth={"type": "api_key", "headerScheme": "bearer"}))}, "no API-key connection flow"),
    ("client secret in mcp.json", {"mcp": mcp_with(lambda s: s["extensions"]["com.openai"]["auth"].update(client={"mode": "provided", "clientId": "x", "clientSecret": "s"}))}, "rejects a client secret"),
    ("server headers", {"mcp": mcp_with(lambda s: s.update(headers={"Authorization": "Bearer x"}))}, "headers must be empty"),
    ("clientId on cimd", {"mcp": mcp_with(lambda s: s["extensions"]["com.openai"]["auth"].update(client={"mode": "cimd", "clientId": "x"}))}, "carries no clientId"),
    ("four positive cases", {"manifest": manifest_with(lambda o: o["review"]["test_cases"]["positive"].pop())}, "exactly 5 and 3"),
    ("tools_triggered as a list", {"manifest": manifest_with(lambda o: o["review"]["test_cases"]["positive"][0].update(tools_triggered=["get_status"]))}, "a string of tool names"),
    ("no review block", {"manifest": manifest_with(lambda o: o.pop("review"))}, "No test cases provided"),
    ("no video", {"manifest": manifest_with(lambda o: o["review"].pop("demo_recording_url"))}, "demo_recording_url"),
    ("no release notes", {"manifest": manifest_with(lambda o: o.pop("publication"))}, "release_notes: missing"),
    ("unknown category", {"manifest": manifest_with(lambda o: o["interface"].update(category="Tools"))}, "is not one of"),
    ("long root description", {"manifest": {**MANIFEST, "description": "x" * 1025}}, "within 1,024"),
    ("credentials in the ZIP", {"manifest": manifest_with(lambda o: o["review"].update(test_credentials={"user": "u"}))}, "the ZIP rejects it"),
    ("missing support URL", {"manifest": manifest_with(lambda o: o["interface"].pop("supportURL"))}, "supportURL: required"),
    ("http privacy URL", {"manifest": manifest_with(lambda o: o["interface"].update(privacyPolicyURL="http://example.com/privacy"))}, "must be an HTTPS URL"),
    ("pale brand colour", {"manifest": manifest_with(lambda o: o["interface"].update(brandColor="#FFD54F"))}, "at least 2:1 is required"),
    ("name ends in Plugin", {"manifest": manifest_with(lambda o: o["interface"].update(displayName="Example Plugin"))}, "do not append"),
    ("long subtitle", {"manifest": manifest_with(lambda o: o["interface"].update(shortDescription="Uptime, status pages and incidents"))}, "at most 30"),
    ("prompt with a mention", {"manifest": manifest_with(lambda o: o["interface"].update(defaultPrompt=["@example check my apps"]))}, "must not @mention"),
    ("hooks in the manifest", {"manifest": manifest_with(lambda o: o.update(hooks="./hooks/hooks.json"))}, "cannot be submitted"),
    ("review inside interface", {"manifest": manifest_with(lambda o: o["interface"].update(review={}))}, "beside interface"),
    ("non-square icon", {"icon": (512, 256)}, "icons are square"),
    ("no skill", {"skill": None}, "at least one valid skill"),
    ("skill without description", {"skill": "---\nname: app-status\n---\n\nCall get_status.\n"}, "description is required"),
]


def main():
    failures = 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        good = build(tmp / "good")
        errs, _ = check_package.run(good)
        if errs:
            failures += 1
            print("FAIL valid package reported errors:\n  " + "\n  ".join(errs))
        else:
            print("ok   valid package passes")

        errs, _ = check_package.run(good, zip_of(good, tmp / "good.zip"))
        print("ok   matching ZIP passes" if not errs else f"FAIL matching ZIP: {errs}")
        failures += bool(errs)

        for label, zip_path, expect in (
            ("stale ZIP", zip_of(good, tmp / "stale.zip", skip=("mcp.json",), extra={"mcp.json": "{}"}), "differs from the package"),
            ("ZIP missing a file", zip_of(good, tmp / "short.zip", skip=("assets/logo.png",)), "missing assets/logo.png"),
            ("ZIP of the folder", None, "not at the ZIP's root"),
        ):
            if zip_path is None:
                zip_path = tmp / "nested.zip"
                with zipfile.ZipFile(zip_path, "w") as archive:
                    for p in good.rglob("*"):
                        if p.is_file():
                            archive.write(p, "good/" + p.relative_to(good).as_posix())
            errs, _ = check_package.run(good, zip_path)
            hit = any(expect in e for e in errs)
            failures += not hit
            print(f"{'ok  ' if hit else 'FAIL'} {label}" + ("" if hit else f": expected {expect!r} in {errs}"))

        for i, (label, kwargs, expect) in enumerate(BROKEN):
            root = build(tmp / f"broken{i}", **kwargs)
            errs, _ = check_package.run(root)
            hit = any(expect in e for e in errs)
            failures += not hit
            print(f"{'ok  ' if hit else 'FAIL'} {label}" + ("" if hit else f": expected {expect!r} in {errs}"))

    print(f"{failures} failure(s)")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
