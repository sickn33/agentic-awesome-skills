#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import re
import shutil
import tempfile
import urllib.parse
import urllib.request
import uuid
from pathlib import Path


MAX_FILE_BYTES = 4_000_000
REQUIRED_FILES = ("ditto.py", "MINING_PROMPT.md")
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")


def canonical_json(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def atomic_write_bytes(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, staged = tempfile.mkstemp(prefix=".ditto-", suffix=".tmp", dir=str(path.parent))
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(staged, path)
    except Exception:
        if os.path.exists(staged):
            os.remove(staged)
        raise


def load_metadata(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def validate_metadata(value):
    if value.get("schema_version") != "1" or not SEMVER.fullmatch(value.get("version", "")):
        raise ValueError("invalid runtime metadata version")
    if set(value.get("files", {})) != set(REQUIRED_FILES):
        raise ValueError("runtime metadata must name exactly ditto.py and MINING_PROMPT.md")
    release = value["version"] != "0.0.0-dev"
    if release and value.get("ref") != "v" + value["version"]:
        raise ValueError("release runtime ref must match its exact version tag")
    if not release and value.get("ref") is not None:
        raise ValueError("development runtime ref must be null")
    for name in REQUIRED_FILES:
        expected = value["files"][name].get("sha256")
        if release and not re.fullmatch(r"[0-9a-f]{64}", expected or ""):
            raise ValueError("release runtime requires sha256 for " + name)
        if not release and expected is not None:
            raise ValueError("development runtime sha256 must be null")
    return value


def fetch_url(url):
    request = urllib.request.Request(url, headers={"User-Agent": "ditto-bootstrap/1"})
    with urllib.request.urlopen(request, timeout=30) as response:
        final = urllib.parse.urlparse(response.geturl())
        if final.scheme != "https" or final.hostname != "raw.githubusercontent.com":
            raise ValueError("runtime download left raw.githubusercontent.com")
        data = response.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise ValueError("runtime file exceeds byte ceiling")
    return data


def install_runtime(metadata, ditto_home, source_root=None, fetcher=fetch_url):
    metadata = validate_metadata(metadata)
    if metadata["version"] == "0.0.0-dev" and source_root is None:
        raise ValueError("development runtime requires --source-root")
    home = Path(os.path.abspath(os.path.expanduser(ditto_home)))
    versions = home / "runtime" / "versions"
    versions.mkdir(parents=True, exist_ok=True)
    staged = versions / (".staged-" + uuid.uuid4().hex)
    staged.mkdir()
    actual = {}
    try:
        for name in REQUIRED_FILES:
            if source_root is not None:
                data = (Path(source_root) / name).read_bytes()
            else:
                url = "https://raw.githubusercontent.com/ohad6k/ditto/{}/{}".format(metadata["ref"], name)
                data = fetcher(url)
            if len(data) > MAX_FILE_BYTES:
                raise ValueError("runtime file exceeds byte ceiling")
            actual_hash = sha256_bytes(data)
            expected_hash = metadata["files"][name].get("sha256")
            if expected_hash is not None and actual_hash != expected_hash:
                raise ValueError("sha256 mismatch for " + name)
            (staged / name).write_bytes(data)
            actual[name] = actual_hash
        receipt = {
            "schema_version": "1",
            "version": metadata["version"],
            "ref": metadata.get("ref"),
            "files": actual,
        }
        (staged / "installed-runtime.json").write_text(canonical_json(receipt) + "\n", encoding="utf-8")
        target = versions / metadata["version"]
        if target.exists():
            existing = json.loads((target / "installed-runtime.json").read_text(encoding="utf-8"))
            if existing != receipt or any(
                sha256_bytes((target / name).read_bytes()) != actual[name] for name in REQUIRED_FILES
            ):
                raise ValueError("existing runtime version failed hash validation")
            shutil.rmtree(staged)
        else:
            os.replace(staged, target)
        pointer = {"schema_version": "1", "version": metadata["version"], "runtime_dir": str(target)}
        atomic_write_bytes(
            home / "runtime" / "current.json",
            (canonical_json(pointer) + "\n").encode("utf-8"),
        )
        return {
            "status": "ready",
            "runtime_dir": str(target),
            "ditto_py": str(target / "ditto.py"),
            "mining_prompt": str(target / "MINING_PROMPT.md"),
        }
    except Exception:
        if staged.exists():
            shutil.rmtree(staged)
        raise


def main(argv=None):
    skill_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--ditto-home", default=os.environ.get("DITTO_HOME") or str(Path.home() / ".ditto"))
    parser.add_argument("--source-root")
    args = parser.parse_args(argv)
    result = install_runtime(load_metadata(skill_root / "runtime.json"), args.ditto_home, args.source_root)
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
