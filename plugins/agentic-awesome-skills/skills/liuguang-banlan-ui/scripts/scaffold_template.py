#!/usr/bin/env python3
"""Copy the bundled neutral workbench starter into a new output directory."""

from __future__ import annotations

import argparse
import pathlib
import shutil


def copy_tree(source: pathlib.Path, target: pathlib.Path) -> None:
    shutil.copytree(source, target, dirs_exist_ok=True)


def scaffold(skill_root: pathlib.Path, output: pathlib.Path, variant: str) -> None:
    if variant not in {"both", "opal", "obsidian"}:
        raise ValueError("unknown starter variant")
    starter = skill_root / "assets" / "starter"
    if starter.is_symlink() or any(p.is_symlink() for p in starter.rglob("*")):
        raise ValueError("starter must not contain symbolic links")
    output = pathlib.Path(output.absolute())
    if any(parent.is_symlink() for parent in output.parents):
        raise ValueError("output parents must not be symbolic links")
    if output.exists() or output.is_symlink():
        raise SystemExit(f"Refusing to overwrite existing output: {output}")
    output.mkdir(mode=0o700, parents=False)

    if variant == "both":
        copy_tree(starter, output)
        return

    (output / "shared").mkdir()
    copy_tree(starter / "shared", output / "shared")
    shutil.copy2(starter / "favicon.svg", output / "favicon.svg")
    copy_tree(starter / variant, output)
    index = output / "index.html"
    index.write_text(index.read_text(encoding="utf-8").replace("../", "./"), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Scaffold the two-mode spectral UI starter")
    parser.add_argument("--output", required=True, type=pathlib.Path)
    parser.add_argument("--variant", choices=("opal", "obsidian", "both"), default="both")
    args = parser.parse_args()
    scaffold(pathlib.Path(__file__).resolve().parents[1], args.output.absolute(), args.variant)
    print(f"scaffolded {args.variant} -> {args.output.resolve()}")


if __name__ == "__main__":
    main()
