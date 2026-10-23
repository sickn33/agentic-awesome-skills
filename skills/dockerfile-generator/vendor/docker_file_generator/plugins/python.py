"""Backwards-compatible import path for the Python plugin.

The real implementation moved to plugins/languages.py when the multi-language
host landed; this module keeps `from ...plugins.python import PythonPlugin`
working for the existing tests and callers.
"""

from .languages import (  # noqa: F401
    FALLBACK_EXIT,
    GenerateRequest,
    PythonPlugin,
    Unsupported,
    register_all,
)

__all__ = ["GenerateRequest", "PythonPlugin", "Unsupported", "FALLBACK_EXIT", "register_all"]
