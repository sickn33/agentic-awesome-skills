#!/usr/bin/env python3
"""check_package.py — check a ChatGPT plugin package before uploading it to OpenAI's portal.

    python <skill dir>/scripts/check_package.py <package dir> [--zip <plugin.zip>]

<package dir> is the folder whose contents become the ZIP: plugin.json at its root, mcp.json,
skills/, assets/. With --zip, the ZIP is also checked to hold exactly that folder's files, byte
for byte, with plugin.json at the ZIP's root: the portal reads only the ZIP, and a ZIP rebuilt by
hand goes stale the moment a file changes.

It checks what OpenAI's pages state as rules (read 2026-10-26: /build/plugins,
/deploy/submission, /deploy/submission-errors, /plugin-guidelines) and the traps a submission
met. It cannot check what only the portal knows: the developer identity, the domain token, the
tool scan, the reviewer account. Errors exit 1; warnings print and exit 0.

Standard library only.
"""
import argparse
import json
import re
import struct
import sys
import zipfile
from pathlib import Path

errors, warnings = [], []


def error(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


# --- small readers ---------------------------------------------------------------------------

def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None
    except (ValueError, UnicodeDecodeError) as e:
        error(f"{path.name}: not valid UTF-8 JSON ({e})")
        return None


def frontmatter(text):
    """The skill's frontmatter as a dict: PyYAML when installed, else flat key: value lines
    with block scalars folded."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    try:
        import yaml
        data = yaml.safe_load(text[3:end])
        return data if isinstance(data, dict) else None
    except ImportError:
        pass
    except Exception:
        return None
    out, key, block = {}, None, []
    for line in text[3:end].strip("\n").splitlines():
        m = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if m and not line.startswith(" "):
            if key and block:
                out[key] = " ".join(s.strip() for s in block).strip()
            key, value, block = m.group(1), m.group(2).strip(), []
            if value in ("|", ">", "|-", ">-"):
                continue
            out[key] = value.strip('"').strip("'")
            key = None
        elif key is not None:
            block.append(line)
    if key and block:
        out[key] = " ".join(s.strip() for s in block).strip()
    return out


def image_size(path):
    """(width, height) for PNG and JPEG, else None."""
    data = path.read_bytes()
    if data[:8] == b"\x89PNG\r\n\x1a\n" and data[12:16] == b"IHDR":
        return struct.unpack(">II", data[16:24])
    if data[:2] == b"\xff\xd8":
        i = 2
        while i + 9 < len(data):
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack(">HH", data[i + 5:i + 9])
                return w, h
            i += 2 + struct.unpack(">H", data[i + 2:i + 4])[0]
    return None


def luminance(hex_colour):
    def channel(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (int(hex_colour[i:i + 2], 16) for i in (1, 3, 5))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def https_url(value):
    return isinstance(value, str) and re.match(r"^https://[^/@\s]+(/\S*)?$", value) is not None


def one_line(value):
    return isinstance(value, str) and value.strip() != "" and "\n" not in value and "\r" not in value


def walk_keys(node, path=""):
    """Every (dotted path, key) in a JSON value."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield f"{path}.{k}" if path else k, k
            yield from walk_keys(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from walk_keys(v, f"{path}[{i}]")


# --- the checks ------------------------------------------------------------------------------

CATEGORIES = ("Productivity", "Creativity", "Developer Tools", "Business & Operations", "Data & Analytics",
              "Communication", "Education & Research", "Security", "Finance", "Healthcare", "Travel",
              "Entertainment", "Other")
PRICING = re.compile(r"\b(free trial|pricing|price|discount|promo(tion)?|subscribe|subscription|per month|/mo)\b|[$€£]\s?\d",
                     re.IGNORECASE)
SEMVER = re.compile(r"^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$")


def check_manifest(root, has_mcp):
    manifest = load_json(root / "plugin.json")
    if manifest is None:
        if not (root / "plugin.json").exists():
            error("plugin.json: missing at the package root (the ZIP's root, not a folder inside it)")
        return None
    if not isinstance(manifest, dict):
        error("plugin.json: must be a JSON object")
        return None

    if manifest.get("$schema") != "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json":
        warn("plugin.json: $schema is not the Agent Plugins 1.0.0 manifest schema")
    name = manifest.get("name", "")
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", str(name)) or len(str(name)) > 64:
        error(f"plugin.json: name {name!r} must be lowercase letters, digits and single hyphens, at most 64 characters")
    version = manifest.get("version")
    if not (isinstance(version, str) and SEMVER.match(version)):
        error(f"plugin.json: version {version!r} must be a semantic version; raise it on every upload")
    description = manifest.get("description")
    if not isinstance(description, str) or not description.strip():
        error("plugin.json: description is required")
    elif len(description) > 1024:
        # /deploy/submission says 4,000 and /deploy/submission-errors 1,024 (2026-10-26): the stricter holds
        error(f"plugin.json: description is {len(description)} characters; keep it within 1,024")

    openai = manifest.get("extensions", {}).get("com.openai")
    if not isinstance(openai, dict):
        error('plugin.json: no extensions["com.openai"] object (the listing, review and publication fields)')
        return manifest

    for field in ("apps", "hooks"):
        if field in openai:
            error(f'plugin.json: extensions["com.openai"].{field}: packages with app references or lifecycle hooks cannot be submitted')

    for path, key in walk_keys(manifest):
        if key in ("test_credentials", "reviewer_instructions"):
            error(f"plugin.json: {path}: the ZIP rejects it; reviewer access goes in the portal's Review details")
        if key.lower() in ("clientsecret", "client_secret", "password", "access_token"):
            error(f"plugin.json: {path}: a secret has no place in the package")

    check_interface(root, openai.get("interface"), has_mcp)
    check_review(openai, has_mcp)
    check_publication(openai.get("publication"), has_mcp)
    for misplaced in ("review", "publication", "onboardingSkill"):
        if isinstance(openai.get("interface"), dict) and misplaced in openai["interface"]:
            error(f'plugin.json: {misplaced} sits beside interface under extensions["com.openai"], not inside it')
    onboarding = openai.get("onboardingSkill")
    if onboarding is not None and not (root / str(onboarding).removeprefix("./")).is_file():
        error(f"plugin.json: onboardingSkill {onboarding!r} must point to a SKILL.md in the package")
    return manifest


def check_interface(root, interface, has_mcp):
    if not isinstance(interface, dict):
        error('plugin.json: no extensions["com.openai"].interface object')
        return
    for field, limit in (("displayName", 30), ("shortDescription", 30), ("developerName", 80)):
        value = interface.get(field)
        if not one_line(value):
            error(f"interface.{field}: required, one line")
        elif len(value) > limit:
            error(f"interface.{field}: {len(value)} characters, at most {limit}")
    long_description = interface.get("longDescription")
    if not isinstance(long_description, str) or not long_description.strip():
        error("interface.longDescription: required")
    elif len(long_description) > 4000:
        error("interface.longDescription: over 4,000 characters")
    category = interface.get("category")
    if category is None:
        warn("interface.category: omitted, so the listing's category is Other")
    elif category not in CATEGORIES:
        error(f"interface.category: {category!r} is not one of {', '.join(CATEGORIES)}")
    warn("interface.developerName: the directory shows the verified identity chosen when the draft is created, whatever this says; "
         "make it the entity the privacy policy and terms name")

    display = str(interface.get("displayName", ""))
    if re.search(r"\b(mcp|mcp server|plugin)\s*$", display, re.IGNORECASE):
        error(f"interface.displayName {display!r}: do not append \"MCP\", \"MCP Server\" or \"Plugin\" to the name")
    for field in ("shortDescription", "longDescription"):
        text = str(interface.get(field, ""))
        if m := PRICING.search(text):
            warn(f"interface.{field}: {m.group(0)!r} reads like pricing or a promotion, which listings may not advertise")

    capabilities = interface.get("capabilities", [])
    if not isinstance(capabilities, list) or len(capabilities) > 20 or not all(one_line(c) and len(c) <= 120 for c in capabilities):
        error("interface.capabilities: at most 20 one-line labels of at most 120 characters")

    urls = ("websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL")
    for field in urls:
        value = interface.get(field)
        if value is None:
            if has_mcp:
                error(f"interface.{field}: required for a plugin with an MCP server (all four listing URLs are)")
        elif not https_url(value) or len(value) > 1024:
            error(f"interface.{field}: {value!r} must be an HTTPS URL without embedded credentials, at most 1,024 characters")

    prompts = interface.get("defaultPrompt")
    if prompts is not None:
        prompts = [prompts] if isinstance(prompts, str) else prompts
        normalised = [" ".join(str(p).split()).casefold() for p in prompts]
        if len(prompts) > 3:
            error("interface.defaultPrompt: at most three starter prompts")
        if len(set(normalised)) != len(normalised):
            error("interface.defaultPrompt: starter prompts must be unique")
        for p in prompts:
            if not one_line(p) or len(p) > 128:
                error(f"interface.defaultPrompt: {p!r} must be one line of at most 128 characters")
            if "@" in str(p):
                error(f"interface.defaultPrompt: {p!r} must not @mention a server")

    for field, background, label in (("brandColor", "#FFFFFF", "white"), ("brandColorDark", "#212121", "#212121")):
        colour = interface.get(field)
        if colour is None:
            continue
        if not re.match(r"^#[0-9A-Fa-f]{6}$", str(colour)):
            error(f"interface.{field}: {colour!r} must be #RRGGBB")
        elif (ratio := contrast(colour, background)) < 2:
            error(f"interface.{field}: {colour} is {ratio:.2f}:1 against {label}; at least 2:1 is required")

    for field in ("logo", "composerIcon", "logoDark", "composerIconDark"):
        value = interface.get(field)
        if value is None:
            if field == "logo":
                error("interface.logo: the primary icon is required before submission")
            elif field == "composerIcon":
                warn("interface.composerIcon: missing; distribution packages should carry it")
            continue
        check_image(root, f"interface.{field}", value, square=True)

    screenshots = interface.get("screenshots")
    if screenshots:
        warn("interface.screenshots: allowed only when the server's tool scan reports a UI output template, "
             "one per starter prompt, each exactly 706 px wide and 400-860 px tall")
        for i, shot in enumerate(screenshots):
            size = check_image(root, f"interface.screenshots[{i}]", shot, square=False)
            if size and (size[0] != 706 or not 400 <= size[1] <= 860):
                error(f"interface.screenshots[{i}]: {size[0]}x{size[1]}; screenshots are exactly 706 px wide and 400-860 px tall")


def check_image(root, label, value, square):
    if not isinstance(value, str) or not value.startswith("./"):
        error(f"{label}: {value!r} must be a ./-prefixed path relative to the plugin root")
        return None
    path = root / value[2:]
    if not path.is_file():
        error(f"{label}: {value} is not in the package")
        return None
    if path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
        error(f"{label}: {value} must be PNG, JPEG, WebP or SVG")
    if path.stat().st_size > 5 * 1024 * 1024:
        error(f"{label}: {value} is over 5 MiB")
    size = image_size(path)
    if size is None:
        if path.suffix.lower() in (".png", ".jpg", ".jpeg"):
            error(f"{label}: {value} could not be read as an image")
        return None
    w, h = size
    if square and (w != h or w < 48):
        error(f"{label}: {value} is {w}x{h}; icons are square and at least 48x48")
    if max(w, h) > 4096:
        error(f"{label}: {value} is {w}x{h}; at most 4,096 px in either dimension")
    return size


def check_review(openai, has_mcp):
    review = openai.get("review")
    if not has_mcp:
        return
    if not isinstance(review, dict):
        error('extensions["com.openai"].review: missing; a plugin with an MCP server needs its test cases and video in the ZIP '
              '(the portal refused a draft without them: "No test cases provided")')
        return
    cases = review.get("test_cases") or {}
    positive, negative = cases.get("positive") or [], cases.get("negative") or []
    if len(positive) != 5 or len(negative) != 3:
        error(f"review.test_cases: {len(positive)} positive and {len(negative)} negative; initial review needs exactly 5 and 3")
    for kind, items, required in (("positive", positive, ("description", "prompt", "tools_triggered", "expected_behavior")),
                                  ("negative", negative, ("description", "prompt"))):
        for i, case in enumerate(items):
            for field in required:
                if not isinstance(case, dict) or not str(case.get(field, "")).strip():
                    error(f"review.test_cases.{kind}[{i}].{field}: required")
            if isinstance(case, dict) and "tools_triggered" in case and not isinstance(case["tools_triggered"], str):
                error(f"review.test_cases.{kind}[{i}].tools_triggered: a string of tool names, not a list")
    url = review.get("demo_recording_url")
    if not (isinstance(url, str) and re.match(r"^https?://\S+$", url)):
        error("review.demo_recording_url: required for MCP review, a link a reviewer can open without an account")
    elif not url.startswith("https://"):
        warn("review.demo_recording_url: not HTTPS; make sure a reviewer can open it without an account")


def check_publication(publication, has_mcp):
    notes = "publication.release_notes: missing; final submission of a plugin with an MCP server requires them (what this version changed)"
    if publication is None:
        (error if has_mcp else warn)(notes)
        return
    countries = publication.get("countries")
    if countries is not None:
        if not isinstance(countries, list) or not all(isinstance(c, str) and re.match(r"^[A-Z]{2}$", c) for c in countries):
            error("publication.countries: a list of uppercase country codes (US, GB); [] removes restrictions, omit it to keep the current ones")
    if not str(publication.get("release_notes", "")).strip():
        (error if has_mcp else warn)(notes)


def check_mcp(root):
    """The servers mcp.json declares, after checking each one's authentication."""
    path = root / "mcp.json"
    if not path.exists():
        return []
    config = load_json(path)
    if not isinstance(config, dict) or not isinstance(config.get("mcpServers"), dict) or not config["mcpServers"]:
        error("mcp.json: needs a non-empty mcpServers object")
        return []
    servers = config["mcpServers"]
    if len(servers) > 1:
        warn(f"mcp.json: {len(servers)} servers declared; only one MCP server can be connected per plugin")
    for name, server in servers.items():
        where = f"mcp.json: {name}"
        if not isinstance(server, dict):
            error(f"{where}: must be an object")
            continue
        if server.get("type") != "streamable-http":
            error(f"{where}: type must be streamable-http for a public submission (a remote HTTPS endpoint)")
        if not https_url(server.get("url")):
            error(f"{where}: url must be the production HTTPS endpoint")
        if server.get("headers"):
            error(f"{where}: headers must be empty; public submission rejects non-empty server headers")
        for p, key in walk_keys(server):
            if key in ("clientSecret", "client_secret"):
                error(f"{where}: {p}: the manifest rejects a client secret; enter it in the portal")
        auth = server.get("extensions", {}).get("com.openai", {}).get("auth")
        if not isinstance(auth, dict):
            error(f'{where}: no extensions["com.openai"].auth; declare the authentication before the first upload, '
                  "because an existing connection can lock it (an undeclared anonymous server was taken for OAuth, and only a new plugin fixed it)")
            continue
        kind = auth.get("type")
        if kind not in ("none", "oauth", "mixed", "api_key"):
            error(f"{where}: auth.type {kind!r} must be none, oauth, mixed or api_key")
        if kind == "api_key":
            error(f"{where}: auth.type api_key: the portal has no API-key connection flow; contact OpenAI or use OAuth")
        client = auth.get("client")
        if client is not None:
            if kind not in ("oauth", "mixed"):
                error(f"{where}: auth.client belongs to oauth or mixed authentication")
            mode = client.get("mode") if isinstance(client, dict) else None
            if mode not in ("provided", "dcr", "cimd"):
                error(f"{where}: auth.client.mode {mode!r} must be provided, dcr or cimd")
            elif mode == "provided" and not client.get("clientId"):
                error(f"{where}: a provided client needs auth.client.clientId")
            elif mode in ("dcr", "cimd") and "clientId" in client:
                error(f"{where}: a {mode} client carries no clientId")
            if isinstance(client, dict) and client.get("tokenEndpointAuthMethod") == "private_key_jwt":
                warn(f"{where}: private_key_jwt for a provided client: the portal has no signing-key setup; confirm with OpenAI first")
        if "oauth" in auth and "client_id" in auth.get("oauth", {}):
            error(f"{where}: use auth.client.clientId, not oauth.client_id (field names are case-sensitive)")
    return list(servers)


def check_skills(root, plugin_name):
    skills_dir = root / "skills"
    folders = sorted(p for p in skills_dir.iterdir() if p.is_dir()) if skills_dir.is_dir() else []
    if not folders:
        error("skills/: no skill; a public submission ZIP must contain at least one valid skill, whatever "
              "MCP server it connects (plugin_runtime_surface_missing)")
        return
    names = set()
    for folder in folders:
        if folder.name.startswith("."):
            error(f"skills/{folder.name}: skill directories must not start with a dot")
        skill = folder / "SKILL.md"
        if not skill.is_file():
            nested = list(folder.rglob("SKILL.md"))
            error(f"skills/{folder.name}: no SKILL.md" + (" (each skill is an immediate child of skills/)" if nested else ""))
            continue
        text = skill.read_text(encoding="utf-8", errors="replace")
        fm = frontmatter(text)
        if fm is None:
            error(f"skills/{folder.name}/SKILL.md: needs YAML frontmatter between --- lines")
            continue
        name, description = str(fm.get("name", "")).strip(), str(fm.get("description", "")).strip()
        if not name:
            error(f"skills/{folder.name}/SKILL.md: name is required")
        if not description:
            error(f"skills/{folder.name}/SKILL.md: description is required")
        elif len(description) > 1024:
            error(f"skills/{folder.name}/SKILL.md: description is {len(description)} characters, at most 1,024")
        if name in names:
            error(f"skills/{folder.name}/SKILL.md: skill name {name!r} is not unique in the plugin")
        names.add(name)
        if len(f"{plugin_name}:{name}") > 64:
            error(f"skills/{folder.name}/SKILL.md: {plugin_name}:{name} is over 64 characters")
        body = text[text.find("\n---", 3) + 4:].strip()
        if not body:
            error(f"skills/{folder.name}/SKILL.md: the instructions are empty")


def check_forbidden_files(root):
    if (root / ".app.json").exists():
        error(".app.json: packages with app references cannot be submitted")
    if (root / "hooks").exists():
        error("hooks/: packages with lifecycle hooks cannot be submitted")


def package_files(root):
    return {p.relative_to(root).as_posix(): p for p in root.rglob("*") if p.is_file()}


def check_zip(root, zip_path):
    try:
        archive = zipfile.ZipFile(zip_path)
    except (OSError, zipfile.BadZipFile) as e:
        error(f"{zip_path}: cannot be read as a ZIP ({e})")
        return
    with archive:
        entries = {i.filename: i for i in archive.infolist() if not i.is_dir()}
        if "plugin.json" not in entries:
            inside = [n for n in entries if n.endswith("/plugin.json")]
            error(f"{zip_path.name}: plugin.json is not at the ZIP's root" + (f" (found {inside[0]}: zip the folder's contents, not the folder)" if inside else ""))
        files = package_files(root)
        for name in sorted(set(files) - set(entries)):
            error(f"{zip_path.name}: missing {name}, which the package has")
        for name in sorted(set(entries) - set(files)):
            error(f"{zip_path.name}: holds {name}, which the package does not")
        for name in sorted(set(files) & set(entries)):
            if archive.read(name) != files[name].read_bytes():
                error(f"{zip_path.name}: {name} differs from the package's copy; rebuild the ZIP")


def run(root, zip_path=None):
    errors.clear()
    warnings.clear()
    root = Path(root)
    if not root.is_dir():
        error(f"{root}: not a directory")
        return errors, warnings
    servers = check_mcp(root)
    has_mcp = bool(servers)
    manifest = check_manifest(root, has_mcp)
    check_skills(root, (manifest or {}).get("name", ""))
    check_forbidden_files(root)
    if zip_path:
        check_zip(root, Path(zip_path))
    return list(errors), list(warnings)


def main():
    parser = argparse.ArgumentParser(description="Check a ChatGPT plugin package before uploading it.")
    parser.add_argument("package", help="the folder whose contents become the ZIP")
    parser.add_argument("--zip", dest="zip_path", help="the ZIP built from it, checked byte for byte against the folder")
    args = parser.parse_args()
    errs, warns = run(args.package, args.zip_path)
    for w in warns:
        print(f"warning: {w}")
    for e in errs:
        print(f"error: {e}")
    print(f"{len(errs)} error(s), {len(warns)} warning(s)")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
