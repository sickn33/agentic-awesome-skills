import importlib.util
import sys
import tempfile
import types
import unittest
import stat
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
TOOLS_TESTS_DIR = REPO_ROOT / "tools" / "scripts" / "tests"
if str(TOOLS_TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_TESTS_DIR))

from symlink_test_utils import symlink_or_skip

defusedxml = types.ModuleType("defusedxml")
defusedxml_minidom = types.ModuleType("defusedxml.minidom")
defusedxml.minidom = defusedxml_minidom
sys.modules.setdefault("defusedxml", defusedxml)
sys.modules.setdefault("defusedxml.minidom", defusedxml_minidom)


def load_module(relative_path: str, module_name: str):
    module_path = REPO_ROOT / relative_path
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class OfficeUnpackSecurityTests(unittest.TestCase):
    def test_extract_archive_safely_blocks_zip_slip(self):
        for relative_path, module_name in [
            ("skills/docx-official/ooxml/scripts/unpack.py", "docx_unpack"),
            ("skills/pptx-official/ooxml/scripts/unpack.py", "pptx_unpack"),
        ]:
            module = load_module(relative_path, module_name)

            with self.subTest(module=relative_path):
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    archive_path = temp_path / "payload.zip"
                    output_dir = temp_path / "output"

                    with zipfile.ZipFile(archive_path, "w") as archive:
                        archive.writestr("../escape.txt", "escape")
                        archive.writestr("word/document.xml", "<w:document/>")

                    with self.assertRaises(ValueError):
                        module.extract_archive_safely(archive_path, output_dir)

                    self.assertFalse((temp_path / "escape.txt").exists())

    def test_extract_archive_safely_blocks_zip_symlinks(self):
        for relative_path, module_name in [
            ("skills/docx-official/ooxml/scripts/unpack.py", "docx_unpack_symlink"),
            ("skills/pptx-official/ooxml/scripts/unpack.py", "pptx_unpack_symlink"),
        ]:
            module = load_module(relative_path, module_name)

            with self.subTest(module=relative_path):
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    archive_path = temp_path / "payload.zip"
                    output_dir = temp_path / "output"

                    with zipfile.ZipFile(archive_path, "w") as archive:
                        symlink_info = zipfile.ZipInfo("word/link")
                        symlink_info.create_system = 3
                        symlink_info.external_attr = (stat.S_IFLNK | 0o777) << 16
                        archive.writestr(symlink_info, "../escape.txt")
                        archive.writestr("word/document.xml", "<w:document/>")

                    with self.assertRaises(ValueError):
                        module.extract_archive_safely(archive_path, output_dir)

                    self.assertFalse((temp_path / "escape.txt").exists())

    def test_extract_archive_safely_blocks_high_compression_ratio(self):
        for relative_path, module_name in [
            ("skills/docx-official/ooxml/scripts/unpack.py", "docx_unpack_ratio"),
            ("skills/pptx-official/ooxml/scripts/unpack.py", "pptx_unpack_ratio"),
        ]:
            module = load_module(relative_path, module_name)
            module.MAX_COMPRESSION_RATIO = 10

            with self.subTest(module=relative_path):
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    archive_path = temp_path / "payload.zip"

                    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
                        archive.writestr("word/document.xml", "A" * 100_000)

                    with self.assertRaises(ValueError):
                        module.extract_archive_safely(archive_path, temp_path / "output")

    def test_pack_document_blocks_input_symlinks(self):
        for relative_path, module_name in [
            ("skills/docx-official/ooxml/scripts/pack.py", "docx_pack"),
            ("skills/pptx-official/ooxml/scripts/pack.py", "pptx_pack"),
        ]:
            module = load_module(relative_path, module_name)

            with self.subTest(module=relative_path):
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_path = Path(temp_dir)
                    input_dir = temp_path / "input"
                    outside = temp_path / "outside.txt"
                    input_dir.mkdir()
                    outside.write_text("secret", encoding="utf-8")
                    symlink_or_skip(self, outside, input_dir / "leak.txt")

                    with self.assertRaises(ValueError):
                        module.validate_input_tree(input_dir)


if __name__ == "__main__":
    unittest.main()
