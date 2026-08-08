import errno
import os
import unittest


def is_symlink_privilege_error(error: OSError) -> bool:
    winerror = getattr(error, "winerror", None)
    return (
        os.name == "nt"
        and (
            winerror == 1314
            or error.errno in {errno.EPERM, errno.EACCES}
            or "privilege" in str(error).lower()
        )
    )


def symlink_or_skip(test_case: unittest.TestCase, target, link_path, target_is_directory=False) -> None:
    try:
        link_path.symlink_to(target, target_is_directory=target_is_directory)
    except OSError as error:
        if is_symlink_privilege_error(error):
            test_case.skipTest(f"Windows denied symlink creation for {link_path}")
        raise
