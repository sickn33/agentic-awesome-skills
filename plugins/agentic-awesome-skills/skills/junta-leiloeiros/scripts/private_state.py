"""Private local state helpers. No directories are created on import."""
import os
from pathlib import Path
import re
import stat
import uuid


def state_dir():
    return Path(os.environ.get("JUNTA_DATA_DIR", str(Path.home()/".local/share/junta-leiloeiros")))


def private_dir(path):
    path = Path(os.path.abspath(path))
    if path.is_symlink() or any(parent.is_symlink() for parent in path.parents):
        raise ValueError("state directory must not traverse symlinks")
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    st = path.stat()
    if st.st_uid != os.getuid() or stat.S_IMODE(st.st_mode) != 0o700:
        raise ValueError("state directory must be user-owned with mode 0700")
    return path


def check_regular(path):
    path = Path(path)
    if path.is_symlink(): raise ValueError("state links are refused")
    if path.exists():
        st = path.stat()
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or st.st_uid != os.getuid():
            raise ValueError("state file must be an owned single-link regular file")


def new_export(directory, suffix, extension):
    if not re.fullmatch(r"(?:_[A-Z]{2})*", suffix):
        raise ValueError("invalid export suffix")
    if extension not in {"json","jsonl","csv","parquet"}:
        raise ValueError("invalid export format")
    directory = private_dir(directory)
    path = directory/("leiloeiros"+suffix+"_"+uuid.uuid4().hex+"."+extension)
    flags = os.O_WRONLY|os.O_CREAT|os.O_EXCL|getattr(os,"O_NOFOLLOW",0)
    fd = os.open(path, flags, 0o600)
    return path, fd
