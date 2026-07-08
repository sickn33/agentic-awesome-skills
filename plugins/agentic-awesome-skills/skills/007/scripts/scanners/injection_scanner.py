"""007 Injection Scanner -- Specialized scanner for injection vulnerabilities.

Detects code injection, SQL injection, command injection, prompt injection,
XSS, SSRF, and path traversal patterns across Python, JavaScript/Node.js,
and shell codebases.  Performs context-aware analysis to reduce false positives
by tracking user-input sources and adjusting severity for hardcoded values,
test files, comments, and docstrings.

Usage:
    python injection_scanner.py --target /path/to/project
    python injection_scanner.py --target /path/to/project --output json --verbose
    python injection_scanner.py --target /path/to/project --include-low
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path

# ---------------------------------------------------------------------------
# Import from the 007 config hub (parent directory)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config  # noqa: E402

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = config.setup_logging("007-injection-scanner")

# ---------------------------------------------------------------------------
# Context markers: sources of user input
# ---------------------------------------------------------------------------
# If a line (or nearby lines) contain any of these tokens, variables on that
# line are treated as *tainted* (user-controlled).  When a dangerous pattern
# uses only a hardcoded literal, severity is reduced.

_USER_INPUT_MARKERS_PY = re.compile(
    r"""(?:request\.(?:args|form|json|data|files|values|headers|cookies|get_json)|"""
    r"""request\.GET|request\.POST|request\.query_params|"""
    r"""sys\.argv|input\s*\(|os\.environ|"""
    r"""flask\.request|django\.http|"""
    r"""click\.argument|click\.option|argparse|"""
    r"""websocket\.recv|channel\.receive|"""
    r"""getattr\s*\(\s*request)""",
    re.IGNORECASE,
)

_USER_INPUT_MARKERS_JS = re.compile(
    r"""(?:req\.(?:body|params|query|headers|cookies)|"""
    r"""request\.(?:body|params|query|headers)|"""
    r"""process\.argv|"""
    r"""\.useParams|\.useSearchParams|"""
    r"""window\.location|document\.location|"""
    r"""location\.(?:search|hash|href)|"""
    r"""URLSearchParams|"""
    r"""event\.(?:target|data)|"""
    r"""document\.(?:getElementById|querySelector)|\.value|"""
    r"""localStorage|sessionStorage|"""
    r"""socket\.on)""",
    re.IGNORECASE,
)

_USER_INPUT_MARKERS = re.compile(
    _USER_INPUT_MARKERS_PY.pattern + r"|" + _USER_INPUT_MARKERS_JS.pattern,
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Comment / docstring detection
# ---------------------------------------------------------------------------

_COMMENT_LINE_RE = re.compile(
    r"""^\s*(?:#|//|/\*|\*|;|rem\b|@rem\b)""", re.IGNORECASE
)

_TRIPLE_QUOTE_RE = re.compile(r'''^\s*(?:\"{3}|'{3})''')

_MARKDOWN_CODE_FENCE = re.compile(r"""^\s*```""")


def _is_comment_line(line: str) -> bool:
    """Return True if the line is a single-line comment."""
    return bool(_COMMENT_LINE_RE.match(line))


# ---------------------------------------------------------------------------
# Test file detection
# ---------------------------------------------------------------------------

_TEST_FILE_RE = re.compile(
    r"""(?i)(?:^test_|_test\.py$|\.test\.[jt]sx?$|\.spec\.[jt]sx?$|"""
    r"""__tests__|fixtures?[/\\]|test[/\\]|tests[/\\]|"""
    r"""mocks?[/\\]|__mocks__[/\\])"""
)


def _is_test_file(filepath: Path) -> bool:
    """Return True if *filepath* looks like a test or fixture file."""
    return bool(_TEST_FILE_RE.search(filepath.name)) or bool(
        _TEST_FILE_RE.search(str(filepath))
    )


# ---------------------------------------------------------------------------
# Severity helpers
# ---------------------------------------------------------------------------

def _lower_severity(severity: str) -> str:
    """Return the next-lower severity level."""
    order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
    idx = order.index(severity) if severity in order else 0
    return order[min(idx + 1, len(order) - 1)]


def _has_user_input(line: str) -> bool:
    """Return True if *line* references a known user-input source."""
    return bool(_USER_INPUT_MARKERS.search(line))


def _has_variable_interpolation(line: str) -> bool:
    """Return True if *line* contains f-string braces, .format(), or % formatting."""
    # f-string-style braces (not escaped)
    if re.search(r"""(?<!\{)\{[^{}\s][^{}]*\}(?!\})""", line):
        return True
    # .format() call
    if ".format(" in line:
        return True
    # %-style formatting with a variable (%s, %d etc followed by %)
    if re.search(r"""%[sdifr]""", line) and "%" in line:
        return True
    return False


def _only_hardcoded_string(line: str) -> bool:
    """Heuristic: return True if the dangerous call appears to use only literals.

    For example, ``eval("1+1")`` or ``os.system("clear")`` with no variables.
    """
    # If there is variable interpolation, not hardcoded
    if _has_variable_interpolation(line):
        return False
    # If there's a user input marker, not hardcoded
    if _has_user_input(line):
        return False
    # Check for variable references inside the call parens
    # Look for identifiers that aren't string literals
    paren = line.find("(")
    if paren == -1:
        return False
    inside = line[paren:]
    # If the argument is just a string literal, treat as hardcoded
    if re.match(r"""\(\s*['\"]{1,3}[^'\"]*['\"]{1,3}\s*\)""", inside):
        return True
    return False


# =========================================================================
# INJECTION PATTERN DEFINITIONS
# =========================================================================
# Each entry: (pattern_name, compiled_regex, base_severity, injection_type,
#              description)
# The scanner applies context analysis on top of base_severity.

_INJECTION_DEFS: list[tuple[str, str, str, str, str]] = [

    # -----------------------------------------------------------------
    # 1. CODE INJECTION (Python)
    # -----------------------------------------------------------------
    (
        "py_eval_user_input",
        r"""\beval\s*\([^)]*(?:\bvar\b|\bdata\b|\brequest\b|\binput\b|\bargv\b|\bparams?\b|"""
        r"""\bquery\b|\bform\b|\buser\b|\bf['\"])""",
        "CRITICAL",
        "code_injection",
        "eval() with potential user input",
    ),
    (
        "py_eval_any",
        r"""\beval\s*\(""",
        "CRITICAL",
        "code_injection",
        "eval() usage -- verify input is not user-controlled",
    ),
    (
        "py_exec_any",
        r"""\bexec\s*\(""",
        "CRITICAL",
        "code_injection",
        "exec() usage -- verify input is not user-controlled",
    ),
    (
        "py_compile_external",
        r"""\bcompile\s*\([^)]*(?:\bvar\b|\bdata\b|\brequest\b|\binput\b|\bargv\b|"""
        r"""\bparams?\b|\bquery\b|\bform\b|\buser\b|\bf['\"])""",
        "CRITICAL",
        "code_injection",
        "compile() with potential user input",
    ),
    (
        "py_dunder_import_dynamic",
        r"""\b__import__\s*\([^'\"][^)]*\)""",
        "HIGH",
        "code_injection",
        "__import__() with dynamic name",
    ),
    (
        "py_importlib_dynamic",
        r"""\bimportlib\.import_module\s*\([^'\"][^)]*\)""",
        "HIGH",
        "code_injection",
        "importlib.import_module() with dynamic name",
    ),
    # Node.js code injection
    (
        "js_eval_any",
        r"""\beval\s*\(""",
        "CRITICAL",
        "code_injection",
        "eval() in JavaScript -- verify input is not user-controlled",
    ),
    (
        "js_function_constructor",
        r"""\bnew\s+Function\s*\(""",
        "CRITICAL",
        "code_injection",
        "Function() constructor -- equivalent to eval",
    ),
    (
        "js_vm_run",
        r"""\bvm\.run(?:InNewContext|InThisContext|InContext)?\s*\(""",
        "HIGH",
        "code_injection",
        "vm.run*() -- verify input is not user-controlled",
    ),
    # Template injection
    (
        "template_injection_fstring",
        r"""(?:render|template|jinja|mako|render_template_string)\s*\(.*\bf['\"]""",
        "CRITICAL",
        "code_injection",
        "f-string in template rendering context (template injection)",
    ),
    (
        "template_injection_format",
        r"""(?:render|template|jinja|mako|render_template_string)\s*\(.*\.format\s*\(""",
        "CRITICAL",
        "code_injection",
        ".format() in template rendering context (template injection)",
    ),

    # -----------------------------------------------------------------
    # 2. COMMAND INJECTION
    # -----------------------------------------------------------------
    (
        "subprocess_shell_true",
        r"""\bsubprocess\.(?:call|run|Popen|check_output|check_call)\s*\("""
        r"""[^)]*shell\s*=\s*True""",
        "CRITICAL",
        "command_injection",
        "subprocess with shell=True -- command injection risk if input is variable",
    ),
    (
        "os_system_var",
        r"""\bos\.system\s*\(""",
        "CRITICAL",
        "command_injection",
        "os.system() -- always uses a shell; prefer subprocess without shell=True",
    ),
    (
        "os_popen_var",
        r"""\bos\.popen\s*\(""",
        "HIGH",
        "command_injection",
        "os.popen() -- shell command execution",
    ),
    (
        "child_process_exec",
        r"""\b(?:child_process\.exec|execSync|exec)\s*\(""",
        "CRITICAL",
        "command_injection",
        "child_process.exec() in Node.js -- uses shell by default",
    ),
    (
        "shell_backtick_var",
        r"""`[^`]*\$\{?\w+\}?[^`]*`""",
        "HIGH",
        "command_injection",
        "Backtick execution with variable interpolation",
    ),

    # -----------------------------------------------------------------
    # 3. SQL INJECTION
    # -----------------------------------------------------------------
    (
        "sql_fstring",
        r"""(?i)\bf['\"](?:[^'\"]*?)(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|"""
        r"""TRUNCATE|UNION|EXEC|EXECUTE)\b""",
        "CRITICAL",
        "sql_injection",
        "f-string in SQL query (SQL injection)",
    ),
    (
        "sql_format_method",
        r"""(?i)(?:['\"]\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|"""
        r"""TRUNCATE|UNION|EXEC|EXECUTE)\b[^'\"]*['\"])\.format\s*\(""",
        "CRITICAL",
        "sql_injection",
        ".format() in SQL query string (SQL injection)",
    ),
    (
        "sql_concat",
        r"""(?i)(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b[^;]*?\+\s*(?!['\"]\s*\+)""",
        "HIGH",
        "sql_injection",
        "String concatenation in SQL query",
    ),
    (
        "sql_percent_format",
        r"""(?i)(?:cursor\.execute|execute|executemany)\s*\(\s*['\"]"""
        r"""[^'\"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\b[^'\"]*%[sd]""",
        "CRITICAL",
        "sql_injection",
        "%-format in cursor.execute() (SQL injection)",
    ),
    (
        "sql_fstring_execute",
        r"""(?i)(?:cursor\.execute|execute|executemany)\s*\(\s*f['\"]""",
        "CRITICAL",
        "sql_injection",
        "f-string in execute() call (SQL injection)",
    ),

    # -----------------------------------------------------------------
    # 4. PROMPT INJECTION
    # -----------------------------------------------------------------
    (
        "prompt_injection_fstring",
        r"""(?i)(?:prompt|system_prompt|user_prompt|message|messages)\s*=\s*f['\"]"""
        r"""[^'\"]*\{(?:user|input|query|request|data|text|content|message)""",
        "HIGH",
        "prompt_injection",
        "User input directly in LLM prompt via f-string",
    ),
    (
        "prompt_injection_concat",
        r"""(?i)(?:prompt|system_prompt|user_prompt|messages?)\s*(?:=|\+=)\s*"""
        r"""[^=\n]*(?:user_input|user_message|request\.(?:body|data|form|json)|input\()""",
        "HIGH",
        "prompt_injection",
        "User input concatenated into LLM prompt",
    ),
    (
        "prompt_injection_openai",
        r"""(?i)(?:openai|anthropic|llm|chat|completion).*\bf['\"][^'\"]*\{"""
        r"""(?:user|input|query|request|data|prompt|text|content|message)""",
        "HIGH",
        "prompt_injection",
        "User variable in f-string near LLM API call",
    ),
    (
        "prompt_injection_format",
        r"""(?i)(?:prompt|system_prompt|user_prompt)\s*=\s*['\"][^'\"]*['\"]"""
        r"""\.format\s*\([^)]*(?:user|input|query|request|data)""",
        "HIGH",
        "prompt_injection",
        ".format() with user input in prompt template",
    ),
    (
        "prompt_no_sanitize_direct",
        r"""(?i)(?:messages|prompt)\s*(?:\.\s*append|\[\s*\{).*(?:content|text)\s*"""
        r"""[:=]\s*(?:user_input|user_message|request\.|input\()""",
        "MEDIUM",
        "prompt_injection",
        "User input passed directly to LLM messages without sanitization",
    ),

    # -----------------------------------------------------------------
    # 5. XSS (Cross-Site Scripting)
    # -----------------------------------------------------------------
    (
        "xss_innerhtml",
        r"""\.innerHTML\s*=\s*(?!['\"]\s*$)[^;]+""",
        "HIGH",
        "xss",
        "innerHTML assignment with variable (XSS risk)",
    ),
    (
        "xss_document_write",
        r"""\bdocument\.write\s*\([^)]*(?:\+|\$\{|\bvar\b|\bdata\b)""",
        "HIGH",
        "xss",
        "document.write() with variable content",
    ),
    (
        "xss_document_write_any",
        r"""\bdocument\.write(?:ln)?\s*\(""",
        "MEDIUM",
        "xss",
        "document.write() usage -- verify no user content",
    ),
    (
        "xss_dangerously_set",
        r"""\bdangerouslySetInnerHTML\s*=\s*\{""",
        "HIGH",
        "xss",
        "dangerouslySetInnerHTML in React (XSS risk)",
    ),
    (
        "xss_template_literal_html",
        r"""(?:innerHTML|outerHTML|insertAdjacentHTML)\s*(?:=|\()\s*`[^`]*\$\{""",
        "HIGH",
        "xss",
        "Template literal with interpolation in HTML context",
    ),
    (
        "xss_jquery_html",
        r"""\$\s*\([^)]*\)\s*\.html\s*\([^)]*(?:\+|\$\{|\bvar\b|\bdata\b)""",
        "HIGH",
        "xss",
        "jQuery .html() with variable content",
    ),

    # -----------------------------------------------------------------
    # 6. SSRF (Server-Side Request Forgery)
    # -----------------------------------------------------------------
    (
        "ssrf_requests",
        r"""\brequests\.(?:get|post|put|patch|delete|head|options|request)\s*\("""
        r"""[^)]*(?:\bvar\b|\bdata\b|\brequest\b|\bparams?\b|\bquery\b|"""
        r"""\bform\b|\buser\b|\burl\b|\bf['\"])""",
        "HIGH",
        "ssrf",
        "requests.get/post with potentially user-controlled URL",
    ),
    (
        "ssrf_urllib",
        r"""\b(?:urllib\.request\.urlopen|urllib\.request\.Request|"""
        r"""urllib2\.urlopen|urlopen)\s*\([^)]*(?:\bvar\b|\bdata\b|\brequest\b|"""
        r"""\bparams?\b|\burl\b|\buser\b|\bf['\"])""",
        "HIGH",
        "ssrf",
        "urllib with potentially user-controlled URL",
    ),
    (
        "ssrf_fetch",
        r"""\bfetch\s*\([^)]*(?:\bvar\b|\bdata\b|\breq\b|\bparams?\b|"""
        r"""\burl\b|\buser\b|\$\{)""",
        "HIGH",
        "ssrf",
        "fetch() with potentially user-controlled URL",
    ),
    (
        "ssrf_axios",
        r"""\baxios\.(?:get|post|put|patch|delete|head|options|request)\s*\("""
        r"""[^)]*(?:\bvar\b|\bdata\b|\breq\b|\bparams?\b|\burl\b|\buser\b|\$\{)""",
        "HIGH",
        "ssrf",
        "axios with potentially user-controlled URL",
    ),
    (
        "ssrf_no_allowlist",
        r"""\brequests\.(?:get|post|put|patch|delete)\s*\(""",
        "MEDIUM",
        "ssrf",
        "HTTP request without visible URL allowlist/blocklist validation",
    ),

    # -----------------------------------------------------------------
    # 7. PATH TRAVERSAL
    # -----------------------------------------------------------------
    (
        "path_traversal_open",
        r"""\bopen\s*\([^)]*(?:\brequest\b|\bparams?\b|\bquery\b|\bform\b|"""
        r"""\buser\b|\bargv\b|\binput\s*\()""",
        "HIGH",
        "path_traversal",
        "open() with user-controlled path (path traversal risk)",
    ),
    (
        "path_traversal_join",
        r"""\bos\.path\.join\s*\([^)]*(?:\brequest\b|\bparams?\b|\bquery\b|"""
        r"""\bform\b|\buser\b|\bargv\b|\binput\s*\()""",
        "HIGH",
        "path_traversal",
        "os.path.join with user input (can bypass with absolute paths)",
    ),
    (
        "path_traversal_pathlib",
        r"""\bPath\s*\([^)]*(?:\brequest\b|\bparams?\b|\bquery\b|\bform\b|"""
        r"""\buser\b|\bargv\b|\binput\s*\()""",
        "MEDIUM",
        "path_traversal",
        "Path() with user input -- verify resolve() and containment check",
    ),
    (
        "path_traversal_send_file",
        r"""\bsend_file\s*\([^)]*(?:\brequest\b|\bparams?\b|\bquery\b|\bform\b|"""
        r"""\buser\b)""",
        "HIGH",
        "path_traversal",
        "send_file() with user-controlled path",
    ),
    (
        "path_traversal_no_resolve",
        r"""\bopen\s*\(\s*(?:os\.path\.join|Path)\s*\(""",
        "MEDIUM",
        "path_traversal",
        "File open via path join without visible resolve()/realpath() check",
    ),
]

# Compile all patterns
INJECTION_PATTERNS: list[tuple[str, re.Pattern, str, str, str]] = []
for _name, _pat, _sev, _itype, _desc in _INJECTION_DEFS:
    try:
        INJECTION_PATTERNS.append((_name, re.compile(_pat), _sev, _itype, _desc))
    except re.error as exc:
        logger.warning("Failed to compile pattern %s: %s", _name, exc)


# =========================================================================
# File collection
# =========================================================================

def _should_scan_file(filepath: Path) -> bool:
    """Decide if a file should be included for injection scanning."""
    name = filepath.name.lower()
    suffix = filepath.suffix.lower()

    for ext in config.SCANNABLE_EXTENSIONS:
        if name.endswith(ext):
            return True
    if suffix in config.SCANNABLE_EXTENSIONS:
        return True

    return False


def collect_files(target: Path) -> list[Path]:
    """Walk *target* recursively and return files for injection scanning."""
    files: list[Path] = []
    max_files = config.LIMITS["max_files_per_scan"]

    for fpath in safe_user_path(target).rglob("*"):
        if not fpath.is_file() or any(part in config.SKIP_DIRECTORIES for part in fpath.parts):
            continue
        if len(files) >= max_files:
            logger.warning(
                "Reached max_files_per_scan limit (%d). Stopping.", max_files
            )
            return files
        if _should_scan_file(fpath):
            files.append(fpath)

    return files


# =========================================================================
# Core scanning logic
# =========================================================================

def _snippet(line: str, match_start: int, context: int = 80) -> str:
    """Extract a short snippet around the match position."""
    start = max(0, match_start - context // 4)
    end = min(len(line), match_start + context)
    raw = line[start:end].strip()
    if len(raw) > context:
        raw = raw[:context] + "..."
    return raw


def _is_in_docstring(lines: list[str], line_idx: int) -> bool:
    """Rough heuristic: check if line_idx falls inside a Python docstring.

    Counts triple-quote occurrences above the current line.  Odd count
    means we are inside a docstring.
    """
    count = 0
    for i in range(line_idx):
        # Count triple quotes in each preceding line
        content = lines[i]
        count += len(re.findall(r'''(?:\"{3}|'{3})''', content))
    return count % 2 == 1


def scan_file(filepath: Path, verbose: bool = False) -> list[dict]:
    """Scan a single file for injection vulnerabilities.

    Returns a list of finding dicts.
    """
    findings: list[dict] = []
    max_findings = config.LIMITS["max_findings_per_file"]
    file_str = str(filepath)
    is_test = _is_test_file(filepath)

    # --- File size check ---
    try:
        size = filepath.stat().st_size
    except OSError:
        return findings

    if size > config.LIMITS["max_file_size_bytes"]:
        if verbose:
            logger.debug("Skipping oversized file: %s (%d bytes)", filepath, size)
        return findings

    # --- Read content ---
    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return findings

    lines = text.splitlines()
    in_markdown_block = False

    # Build a *nearby user-input context* -- for each line, check if the
    # surrounding +/-5 lines mention user input sources.  This helps detect
    # indirect taint (variable assigned from request on line N, used on N+3).
    _CONTEXT_WINDOW = 5
    line_has_user_input = [False] * len(lines)
    for idx, ln in enumerate(lines):
        if _has_user_input(ln):
            lo = max(0, idx - _CONTEXT_WINDOW)
            hi = min(len(lines), idx + _CONTEXT_WINDOW + 1)
            for j in range(lo, hi):
                line_has_user_input[j] = True

    # Track patterns already matched per line to avoid duplicates
    # (more specific patterns override generic ones)
    line_patterns: dict[int, set[str]] = {}

    for line_idx, line in enumerate(lines):
        if len(findings) >= max_findings:
            break

        line_num = line_idx + 1
        stripped = line.strip()

        if not stripped:
            continue

        # Markdown code fence tracking
        if _MARKDOWN_CODE_FENCE.match(stripped):
            in_markdown_block = not in_markdown_block
            continue

        # Skip comments
        if _is_comment_line(stripped):
            continue

        # Skip if inside markdown code block
        if in_markdown_block:
            continue

        # Skip if inside docstring (for Python files)
        if filepath.suffix.lower() == ".py" and _is_in_docstring(lines, line_idx):
            continue

        for pat_name, regex, base_severity, injection_type, description in INJECTION_PATTERNS:
            m = regex.search(line)
            if not m:
                continue

            # --- De-duplication: skip generic if specific already matched ---
            # e.g., if py_eval_user_input matched, skip py_eval_any on same line
            if line_num not in line_patterns:
                line_patterns[line_num] = set()

            # Build a group key from injection_type + rough function name
            group_key = injection_type + ":" + pat_name.rsplit("_", 1)[0]
            if group_key in line_patterns.get(line_num, set()):
                continue

            # More specific: if a *_user_input variant matched, mark its group
            if "user_input" in pat_name or "var" in pat_name:
                generic_group = injection_type + ":" + pat_name.replace("_user_input", "").replace("_var", "").rsplit("_", 1)[0]
                line_patterns[line_num].add(generic_group)

            line_patterns[line_num].add(group_key)

            # --- Context-aware severity adjustment ---
            adjusted_severity = base_severity

            # 1. If only hardcoded string, lower to INFO
            if _only_hardcoded_string(line):
                adjusted_severity = "INFO"

            # 2. If no user input nearby, lower by one level (but not below MEDIUM
            #    for CRITICAL patterns, since the pattern itself is dangerous)
            elif not line_has_user_input[line_idx] and not _has_user_input(line):
                if not _has_variable_interpolation(line):
                    adjusted_severity = _lower_severity(base_severity)
                    # For the generic "any" patterns, lower further if no vars
                    if pat_name.endswith("_any"):
                        adjusted_severity = _lower_severity(adjusted_severity)

            # 3. Test files: lower severity by one level
            if is_test:
                adjusted_severity = _lower_severity(adjusted_severity)

            findings.append({
                "type": "injection",
                "injection_type": injection_type,
                "pattern": pat_name,
                "severity": adjusted_severity,
                "file": file_str,
                "line": line_num,
                "snippet": _snippet(line, m.start()),
                "description": description,
                "has_user_input_nearby": line_has_user_input[line_idx],
            })

    return findings


# =========================================================================
# Aggregation and scoring
# =========================================================================

SCORE_DEDUCTIONS = {
    "CRITICAL": 12,
    "HIGH":      6,
    "MEDIUM":    3,
    "LOW":       1,
    "INFO":      0,
}


def aggregate_by_severity(findings: list[dict]) -> dict[str, int]:
    """Count findings per severity level."""
    counts: dict[str, int] = {sev: 0 for sev in config.SEVERITY}
    for f in findings:
        sev = f.get("severity", "INFO")
        if sev in counts:
            counts[sev] += 1
    return counts


def aggregate_by_injection_type(findings: list[dict]) -> dict[str, int]:
    """Count findings per injection type."""
    counts: dict[str, int] = {}
    for f in findings:
        itype = f.get("injection_type", "unknown")
        counts[itype] = counts.get(itype, 0) + 1
    return counts


def aggregate_by_pattern(findings: list[dict]) -> dict[str, int]:
    """Count findings per pattern name."""
    counts: dict[str, int] = {}
    for f in findings:
        pattern = f.get("pattern", "unknown")
        counts[pattern] = counts.get(pattern, 0) + 1
    return counts


def compute_score(findings: list[dict]) -> int:
    """Compute injection security score starting at 100, deducting by severity."""
    score = 100
    for f in findings:
        deduction = SCORE_DEDUCTIONS.get(f["severity"], 0)
        score -= deduction
    return max(0, score)


# =========================================================================
# Report formatters
# =========================================================================

_INJECTION_TYPE_LABELS = {
    "code_injection":    "Code Injection",
    "command_injection": "Command Injection",
    "sql_injection":     "SQL Injection",
    "prompt_injection":  "Prompt Injection",
    "xss":               "Cross-Site Scripting (XSS)",
    "ssrf":              "Server-Side Request Forgery (SSRF)",
    "path_traversal":    "Path Traversal",
}


def format_text_report(
    target: str,
    total_files: int,
    findings: list[dict],
    severity_counts: dict[str, int],
    type_counts: dict[str, int],
    pattern_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
    include_low: bool = False,
) -> str:
    """Build a human-readable text report grouped by injection type."""
    lines: list[str] = []

    lines.append("=" * 72)
    lines.append("  007 INJECTION SCANNER -- VULNERABILITY REPORT")
    lines.append("=" * 72)
    lines.append("")

    # Metadata
    lines.append(f"  Target:         {target}")
    lines.append(f"  Timestamp:      {config.get_timestamp()}")
    lines.append(f"  Duration:       {elapsed:.2f}s")
    lines.append(f"  Files scanned:  {total_files}")
    lines.append(f"  Total findings: {len(findings)}")
    lines.append("")

    # Severity distribution
    lines.append("-" * 72)
    lines.append("  SEVERITY DISTRIBUTION")
    lines.append("-" * 72)
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        count = severity_counts.get(sev, 0)
        bar = "#" * min(count, 40)
        lines.append(f"    {sev:<10} {count:>5}  {bar}")
    lines.append("")

    # Injection type breakdown
    if type_counts:
        lines.append("-" * 72)
        lines.append("  FINDINGS BY INJECTION TYPE")
        lines.append("-" * 72)
        sorted_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        for itype, count in sorted_types:
            label = _INJECTION_TYPE_LABELS.get(itype, itype)
            lines.append(f"    {label:<40} {count:>5}")
        lines.append("")

    # Detailed findings grouped by injection type
    min_severity = config.SEVERITY["LOW"] if include_low else config.SEVERITY["MEDIUM"]

    displayed = [
        f for f in findings
        if config.SEVERITY.get(f.get("severity", "INFO"), 0) >= min_severity
    ]

    if displayed:
        # Group by injection type
        by_type: dict[str, list[dict]] = {}
        for f in displayed:
            itype = f.get("injection_type", "unknown")
            by_type.setdefault(itype, []).append(f)

        # Order: code_injection, command_injection, sql_injection, prompt_injection,
        #         xss, ssrf, path_traversal, then anything else
        type_order = [
            "code_injection", "command_injection", "sql_injection",
            "prompt_injection", "xss", "ssrf", "path_traversal",
        ]
        # Add any types not in the predefined order
        for t in by_type:
            if t not in type_order:
                type_order.append(t)

        for itype in type_order:
            itype_findings = by_type.get(itype, [])
            if not itype_findings:
                continue

            label = _INJECTION_TYPE_LABELS.get(itype, itype)
            lines.append("-" * 72)
            lines.append(f"  [{label.upper()}] ({len(itype_findings)} findings)")
            lines.append("-" * 72)

            # Sub-group by severity
            for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                sev_group = [f for f in itype_findings if f["severity"] == sev]
                if not sev_group:
                    continue

                for f in sorted(sev_group, key=lambda x: (x["file"], x.get("line", 0))):
                    taint_marker = " [TAINTED]" if f.get("has_user_input_nearby") else ""
                    lines.append(
                        f"    [{sev}] {f['file']}:L{f.get('line', 0)}{taint_marker}"
                    )
                    lines.append(f"           {f['description']}")
                    if f.get("snippet"):
                        lines.append(f"           > {f['snippet']}")
                    lines.append("")
    else:
        lines.append("  No injection findings above the display threshold.")
        lines.append("")

    # Score and verdict
    lines.append("=" * 72)
    lines.append(f"  INJECTION SECURITY SCORE:  {score} / 100")
    lines.append(f"  VERDICT:                   {verdict['emoji']} {verdict['label']}")
    lines.append(f"                             {verdict['description']}")
    lines.append("=" * 72)
    lines.append("")

    return "\n".join(lines)


def build_json_report(
    target: str,
    total_files: int,
    findings: list[dict],
    severity_counts: dict[str, int],
    type_counts: dict[str, int],
    pattern_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
) -> dict:
    """Build a structured JSON-serializable report dict."""
    return {
        "scan": "injection_scanner",
        "target": target,
        "timestamp": config.get_timestamp(),
        "duration_seconds": round(elapsed, 3),
        "total_files_scanned": total_files,
        "total_findings": len(findings),
        "severity_counts": severity_counts,
        "injection_type_counts": type_counts,
        "pattern_counts": pattern_counts,
        "score": score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
        "findings": findings,
    }


# =========================================================================
# Main entry point
# =========================================================================

def run_scan(
    target_path: str,
    output_format: str = "text",
    verbose: bool = False,
    include_low: bool = False,
) -> dict:
    """Execute the injection vulnerability scan and return the report dict.

    Args:
        target_path:   Path to the directory to scan.
        output_format: 'text' or 'json'.
        verbose:       Enable debug-level logging.
        include_low:   Include LOW severity findings in text output.

    Returns:
        JSON-compatible report dict.
    """
    if verbose:
        logger.setLevel("DEBUG")

    config.ensure_directories()

    target = safe_user_path(target_path).resolve()
    if not target.exists():
        logger.error("Target path does not exist: %s", target)
        sys.exit(1)
    if not target.is_dir():
        logger.error("Target is not a directory: %s", target)
        sys.exit(1)

    logger.info("Starting injection vulnerability scan of %s", target)
    start_time = time.time()

    # Collect files
    files = collect_files(target)
    total_files = len(files)
    logger.info("Collected %d files for injection scanning", total_files)

    # Scan each file
    all_findings: list[dict] = []
    max_report = config.LIMITS["max_report_findings"]

    for fpath in files:
        if len(all_findings) >= max_report:
            logger.warning(
                "Reached max_report_findings limit (%d). Truncating.", max_report
            )
            break

        file_findings = scan_file(fpath, verbose=verbose)
        remaining = max_report - len(all_findings)
        all_findings.extend(file_findings[:remaining])

    elapsed = time.time() - start_time
    logger.info(
        "Injection scan complete: %d files, %d findings in %.2fs",
        total_files, len(all_findings), elapsed,
    )

    # Aggregation
    severity_counts = aggregate_by_severity(all_findings)
    type_counts = aggregate_by_injection_type(all_findings)
    pattern_counts = aggregate_by_pattern(all_findings)
    score = compute_score(all_findings)
    verdict = config.get_verdict(score)

    # Audit log
    config.log_audit_event(
        action="injection_scan",
        target=str(target),
        result=f"score={score}, findings={len(all_findings)}, verdict={verdict['label']}",
        details={
            "total_files": total_files,
            "severity_counts": severity_counts,
            "injection_type_counts": type_counts,
            "pattern_counts": pattern_counts,
            "duration_seconds": round(elapsed, 3),
        },
    )

    # Build report
    report = build_json_report(
        target=str(target),
        total_files=total_files,
        findings=all_findings,
        severity_counts=severity_counts,
        type_counts=type_counts,
        pattern_counts=pattern_counts,
        score=score,
        verdict=verdict,
        elapsed=elapsed,
    )

    # Output
    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_text_report(
            target=str(target),
            total_files=total_files,
            findings=all_findings,
            severity_counts=severity_counts,
            type_counts=type_counts,
            pattern_counts=pattern_counts,
            score=score,
            verdict=verdict,
            elapsed=elapsed,
            include_low=include_low,
        ))

    return report


# =========================================================================
# CLI
# =========================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description=(
            "007 Injection Scanner -- Specialized scanner for injection "
            "vulnerabilities (code injection, SQL injection, command injection, "
            "prompt injection, XSS, SSRF, path traversal)."
        ),
        epilog=(
            "Examples:\n"
            "  python injection_scanner.py --target ./my-project\n"
            "  python injection_scanner.py --target ./my-project --output json\n"
            "  python injection_scanner.py --target ./my-project --verbose --include-low"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Path to the directory to scan (required).",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json"],
        default="text",
        help="Output format: 'text' (default) or 'json'.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable verbose/debug logging.",
    )
    parser.add_argument(
        "--include-low",
        action="store_true",
        default=False,
        help="Include LOW severity findings in text output (hidden by default).",
    )

    args = parser.parse_args()
    run_scan(
        target_path=args.target,
        output_format=args.output,
        verbose=args.verbose,
        include_low=args.include_low,
    )
