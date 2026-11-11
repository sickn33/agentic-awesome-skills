#!/usr/bin/env python3
"""Bounded read-only source hints for mobile UI review, not a conformance audit.

No project code is imported or executed. Regex matches include comments and can
be false positives; runtime accessibility, contrast, touch layout, performance,
authentication and platform behavior remain unverified.
"""
import argparse
import json
import os
from pathlib import Path
import re
import stat

MAX_FILE_BYTES = 1024 * 1024
MAX_TOTAL_BYTES = 20 * 1024 * 1024
MAX_FILES = 1000
SKIPPED = {'node_modules','.git','dist','build','.next','.idea','.dart_tool','Pods'}
EXTENSIONS = {'.tsx','.ts','.jsx','.js','.dart','.kt','.swift'}


def safe_user_path(path_value, base_dir='.'):
    if base_dir != '.':
        raise ValueError('custom path base is unsupported')
    lexical = Path(os.path.abspath(os.path.expanduser(str(path_value))))
    if lexical.is_symlink():
        raise ValueError('source symlinks are refused')
    base = Path.cwd().resolve()
    path = lexical.resolve()
    if not path.is_relative_to(base):
        raise ValueError('source must be inside the selected working directory')
    return path


class MobileAuditor:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.files_checked = 0
        self.files_seen = 0
        self.mobile_files_checked = 0
        self.bytes_read = 0
        self.skipped_files = []
        self.incomplete = []

    def audit_file(self, filepath):
        path = Path(filepath)
        if path.is_symlink():
            self.incomplete.append('symlink source omitted')
            return
        if self.files_seen >= MAX_FILES:
            self.incomplete.append('1000-file inspection limit reached')
            return
        self.files_seen += 1
        try:
            fd = os.open(path, os.O_RDONLY|getattr(os,'O_NOFOLLOW',0)|getattr(os,'O_NONBLOCK',0))
            with os.fdopen(fd,'rb') as source:
                if not stat.S_ISREG(os.fstat(source.fileno()).st_mode):
                    raise ValueError('source must be a regular file')
                remaining = max(0, MAX_TOTAL_BYTES-self.bytes_read)
                raw = source.read(min(MAX_FILE_BYTES, remaining)+1)
            self.bytes_read += len(raw)
            if len(raw)>MAX_FILE_BYTES or self.bytes_read>MAX_TOTAL_BYTES:
                raise ValueError('source inspection byte limit exceeded')
            content=raw.decode('utf-8')
        except (OSError,ValueError,UnicodeError):
            self.incomplete.append('unreadable, nonregular, non-UTF-8 or oversized source omitted')
            return
        self.files_checked += 1
        # Names identify evidence locations, never copy source contents into reports.
        label = path.name
        mobile = bool(re.search(r'react-native|package:flutter|androidx\.compose|import SwiftUI|import UIKit',content))
        if not mobile:
            self.skipped_files.append(label)
            return
        self.mobile_files_checked += 1
        checks = [
            (r'allowFontScaling\s*(?:=\s*\{?|:)\s*false',
             'Explicit text scaling disablement: inspect user accessibility requirements.'),
            (r'key\s*=\s*\{\s*(?:index|i)\s*\}',
             'Index key candidate: check whether rows can reorder, insert or delete.'),
            (r'(?s)AsyncStorage\.setItem\(\s*[\x22\x27][^\x22\x27]*(?:token|jwt|password)[^\x22\x27]*[\x22\x27]',
             'Sensitive-key storage candidate: inspect exact values and use appropriate platform secure storage.'),
            (r'(?s)<ScrollView\b.{0,2000}?\.map\(',
             'Eager list candidate: measure actual list size before choosing virtualization.'),
        ]
        for pattern,message in checks:
            match = re.search(pattern,content,re.IGNORECASE)
            if match:
                line=content.count('\n',0,match.start())+1
                self.warnings.append({'file':label,'line':line,'candidate':message,
                                      'certainty':'unverified source-pattern hint'})

    def audit_directory(self,directory):
        root=safe_user_path(directory)
        for current,dirs,files in os.walk(root,followlinks=False):
            dirs[:] = sorted(d for d in dirs if d not in SKIPPED and not (Path(current)/d).is_symlink())
            for name in sorted(files):
                path=Path(current)/name
                if path.suffix in EXTENSIONS:
                    self.audit_file(path)
                if self.files_seen>=MAX_FILES or self.bytes_read>=MAX_TOTAL_BYTES:
                    self.incomplete.append('inspection budget reached; remaining source omitted')
                    return

    def get_report(self):
        status='incomplete' if self.incomplete else ('no-mobile-source' if not self.mobile_files_checked else 'advisory')
        return {'status':status,'files_checked':self.files_checked,
                'mobile_files_checked':self.mobile_files_checked,'bytes_read':self.bytes_read,
                'issues':self.issues,'warnings':self.warnings,'skipped_files':self.skipped_files,
                'incomplete':sorted(set(self.incomplete)), 'compliant':None,
                'limitations':'No conformance or runtime checks. No findings does not establish safety, accessibility or quality.'}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--json',action='store_true')
    args=parser.parse_args(argv)
    try:
        path=safe_user_path(args.directory)
        if not path.exists():raise ValueError('selected source does not exist')
        auditor=MobileAuditor()
        if path.is_file():auditor.audit_file(path)
        else:auditor.audit_directory(path)
    except (OSError,ValueError) as error:
        parser.error(str(error))
    report=auditor.get_report()
    if args.json:print(json.dumps(report,indent=2,ensure_ascii=True))
    else:
        print('Mobile source hints: '+report['status'])
        print(json.dumps(report,indent=2,ensure_ascii=True))
    return 2 if report['status'] in {'incomplete','no-mobile-source'} else 0


if __name__=='__main__':raise SystemExit(main())
