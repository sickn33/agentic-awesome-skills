import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PLAYBOOK = ROOT / 'skills/bash-defensive-patterns/resources/implementation-playbook.md'


class BashDefensiveExamples(unittest.TestCase):
    def test_directory_removal_rejects_normalized_root_and_symlinks(self):
        text = PLAYBOOK.read_text()
        function = re.search(r'(safe_rmdir\(\) \{.*?\n\})', text, re.S).group(1)
        # The reviewed teaching function runs with an inert removal stub.
        script = 'set -eu\nrm() { printf "REMOVE:%s\\n" "$*"; }\n' + function + '\nsafe_rmdir "$1"\n'
        with tempfile.TemporaryDirectory() as directory:
            link = Path(directory) / 'alias'
            link.symlink_to(directory, target_is_directory=True)
            for target in ('/', '/usr/..', '/tmp/..', str(link)):
                with self.subTest(target=target):
                    result = subprocess.run(['bash', '-c', script, 'fixture', target], text=True, capture_output=True, timeout=5)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertNotIn('REMOVE:', result.stdout)
            result = subprocess.run(['bash', '-c', script, 'fixture', directory], text=True, capture_output=True, timeout=5)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('REMOVE:-ri -- ', result.stdout)
            self.assertTrue(Path(directory).is_dir())

    def test_signal_handlers_preserve_interrupt_exit_status(self):
        text = PLAYBOOK.read_text()
        section = text.split('### 2. Error Trapping and Cleanup', 1)[1]
        script = section.split('```bash\n', 1)[1].split('```', 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            for signal, expected in (('INT', 130), ('TERM', 143)):
                with self.subTest(signal=signal):
                    inert = 'mktemp() { printf "%s\\n" "$1"; }\nrm() { :; }\n'
                    # Keep mktemp inside the fixture and make cleanup non-destructive.
                    fixture = script.replace('mktemp -d', 'printf "%s" "$1"')
                    result = subprocess.run(['bash', '-c', inert + fixture + '\nkill -' + signal + ' $$\n',
                                             'fixture', directory], text=True, capture_output=True, timeout=5)
                    self.assertEqual(result.returncode, expected, result.stderr)


if __name__ == '__main__':
    unittest.main()
