#!/usr/bin/env python3
"""Unpack and format XML contents of Office files (.docx, .pptx, .xlsx)"""

import random
import shutil
import stat
import sys
import zipfile
from pathlib import Path


def _is_zip_symlink(member: zipfile.ZipInfo) -> bool:
    return stat.S_ISLNK(member.external_attr >> 16)


def _is_safe_destination(output_root: Path, member_name: str) -> bool:
    destination = output_root / member_name
    return destination.resolve().is_relative_to(output_root.resolve())


def _extract_member(archive: zipfile.ZipFile, member: zipfile.ZipInfo, output_root: Path):
    destination = output_root / member.filename
    if member.is_dir():
        destination.mkdir(parents=True, exist_ok=True)
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    with archive.open(member, "r") as source, open(destination, "wb") as target:
        shutil.copyfileobj(source, target)


def extract_archive_safely(input_file: str | Path, output_dir: str | Path):
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    output_root = output_path.resolve()

    with zipfile.ZipFile(input_file) as archive:
        for member in archive.infolist():
            if _is_zip_symlink(member):
                raise ValueError(f"Unsafe archive entry: {member.filename}")
            if not _is_safe_destination(output_root, member.filename):
                raise ValueError(f"Unsafe archive entry: {member.filename}")

        for member in archive.infolist():
            _extract_member(archive, member, output_path)


def pretty_print_xml(output_path: Path):
    import defusedxml.minidom

    xml_files = list(output_path.rglob("*.xml")) + list(output_path.rglob("*.rels"))
    for xml_file in xml_files:
        content = xml_file.read_text(encoding="utf-8")
        dom = defusedxml.minidom.parseString(content)
        xml_file.write_bytes(dom.toprettyxml(indent="  ", encoding="ascii"))


def main(argv: list[str] | None = None):
    argv = argv or sys.argv[1:]
    if len(argv) != 2:
        raise SystemExit("Usage: python unpack.py <office_file> <output_dir>")

    input_file, output_dir = argv
    output_path = Path(output_dir)
    extract_archive_safely(input_file, output_path)
    pretty_print_xml(output_path)

    if input_file.endswith(".docx"):
        suggested_rsid = "".join(random.choices("0123456789ABCDEF", k=8))
        print(f"Suggested RSID for edit session: {suggested_rsid}")


if __name__ == "__main__":
    main()
