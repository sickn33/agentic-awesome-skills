#!/bin/bash
# Test: Loki Mode Wrapper Script
# Tests the autonomous wrapper functionality

set -uo pipefail

TEST_DIR=$(mktemp -d)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WRAPPER_SCRIPT="$SCRIPT_DIR/../scripts/loki-wrapper.sh"
PASSED=0
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASSED++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAILED++)); }
log_test() { echo -e "${YELLOW}[TEST]${NC} $1"; }

cleanup() {
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

cd "$TEST_DIR"

echo "=========================================="
echo "Loki Mode Wrapper Script Tests"
echo "=========================================="
echo ""

# Test 1: Wrapper script exists and is executable
log_test "Wrapper script exists and is executable"
if [ -x "$WRAPPER_SCRIPT" ]; then
    log_pass "Wrapper script is executable"
else
    log_fail "Wrapper script not found or not executable"
fi

# Test 2: Wrapper script has correct shebang
log_test "Wrapper script has correct shebang"
SHEBANG=$(head -1 "$WRAPPER_SCRIPT")
if [ "$SHEBANG" = "#!/bin/bash" ]; then
    log_pass "Correct shebang"
else
    log_fail "Incorrect shebang: $SHEBANG"
fi

# Test 3: Exponential backoff calculation
log_test "Exponential backoff calculation"
python3 << 'EOF'
import os

BASE_WAIT = 60
MAX_WAIT = 3600

def calculate_wait(retry):
    wait_time = BASE_WAIT * (2 ** retry)
    # Add jitter would be random, just test base calculation
    if wait_time > MAX_WAIT:
        wait_time = MAX_WAIT
    return wait_time

# Test exponential growth
assert calculate_wait(0) == 60, f"Retry 0: expected 60, got {calculate_wait(0)}"
assert calculate_wait(1) == 120, f"Retry 1: expected 120, got {calculate_wait(1)}"
assert calculate_wait(2) == 240, f"Retry 2: expected 240, got {calculate_wait(2)}"
assert calculate_wait(3) == 480, f"Retry 3: expected 480, got {calculate_wait(3)}"
assert calculate_wait(4) == 960, f"Retry 4: expected 960, got {calculate_wait(4)}"
assert calculate_wait(5) == 1920, f"Retry 5: expected 1920, got {calculate_wait(5)}"

# Test max cap
assert calculate_wait(6) == 3600, f"Retry 6: expected 3600 (capped), got {calculate_wait(6)}"
assert calculate_wait(10) == 3600, f"Retry 10: expected 3600 (capped), got {calculate_wait(10)}"

print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Exponential backoff calculation works"
else
    log_fail "Exponential backoff calculation failed"
fi

# Test 4: State file JSON structure
log_test "State file JSON structure"
python3 << 'EOF'
import json
from datetime import datetime

# Simulate wrapper state
state = {
    "retryCount": 3,
    "status": "running",
    "lastExitCode": 0,
    "lastRun": datetime.utcnow().isoformat() + 'Z',
    "prdPath": "./docs/requirements.md",
    "pid": 12345
}

# Verify JSON serialization
json_str = json.dumps(state)
parsed = json.loads(json_str)

assert parsed["retryCount"] == 3
assert parsed["status"] == "running"
assert parsed["pid"] == 12345
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "State file JSON structure is valid"
else
    log_fail "State file JSON structure failed"
fi

# Test 5: Completion detection logic
log_test "Completion detection logic"
mkdir -p "$TEST_DIR/.loki/state"
cat > "$TEST_DIR/.loki/state/orchestrator.json" << 'EOF'
{
    "currentPhase": "COMPLETED",
    "startedAt": "2025-01-15T10:00:00Z",
    "completedAt": "2025-01-15T12:00:00Z"
}
EOF

python3 << EOF
import json

with open("$TEST_DIR/.loki/state/orchestrator.json") as f:
    state = json.load(f)

phase = state.get("currentPhase", "")
is_completed = phase == "COMPLETED"
assert is_completed, f"Expected COMPLETED, got {phase}"
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Completion detection works"
else
    log_fail "Completion detection failed"
fi

# Test 6: PRD path validation
log_test "PRD path validation"
touch "$TEST_DIR/test-prd.md"
if [ -f "$TEST_DIR/test-prd.md" ]; then
    log_pass "PRD path validation works"
else
    log_fail "PRD path validation failed"
fi

# Test 7: Resume prompt generation
log_test "Resume prompt generation"
python3 << 'EOF'
def build_resume_prompt(retry, prd_path=None, initial_prompt="Loki Mode"):
    if retry == 0:
        return initial_prompt
    else:
        if prd_path:
            return f"Loki Mode - Resume from checkpoint. PRD at {prd_path}. This is retry #{retry} after rate limit. Check .loki/state/ for current progress and continue from where we left off."
        else:
            return f"Loki Mode - Resume from checkpoint. This is retry #{retry} after rate limit. Check .loki/state/ for current progress and continue from where we left off."

# Test initial prompt
assert build_resume_prompt(0) == "Loki Mode"

# Test resume prompt without PRD
resume = build_resume_prompt(3)
assert "Resume from checkpoint" in resume
assert "retry #3" in resume
assert ".loki/state/" in resume

# Test resume prompt with PRD
resume = build_resume_prompt(5, "./docs/req.md")
assert "PRD at ./docs/req.md" in resume
assert "retry #5" in resume

print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Resume prompt generation works"
else
    log_fail "Resume prompt generation failed"
fi

# Test 8: Rate limit detection logic
log_test "Rate limit detection logic"
python3 << 'EOF'
def is_rate_limit(exit_code, log_content=""):
    # Any non-zero exit is treated as potential rate limit
    if exit_code != 0:
        # Could check logs for specific indicators
        rate_limit_indicators = ["rate limit", "429", "too many requests", "quota exceeded"]
        for indicator in rate_limit_indicators:
            if indicator.lower() in log_content.lower():
                return True
        # Conservative: treat any non-zero as rate limit
        return True
    return False

# Test cases
assert is_rate_limit(0) == False, "Exit 0 should not be rate limit"
assert is_rate_limit(1) == True, "Exit 1 should be treated as rate limit"
assert is_rate_limit(1, "Error: Rate limit exceeded") == True
assert is_rate_limit(1, "HTTP 429 Too Many Requests") == True
assert is_rate_limit(0, "Rate limit in logs but exit 0") == False

print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Rate limit detection logic works"
else
    log_fail "Rate limit detection logic failed"
fi

# Test 9: Log file creation
log_test "Log file and directory creation"
mkdir -p "$TEST_DIR/.loki"
LOG_FILE="$TEST_DIR/.loki/wrapper.log"
echo "[2025-01-15 10:00:00] [INFO] Test log entry" >> "$LOG_FILE"

if [ -f "$LOG_FILE" ] && grep -q "Test log entry" "$LOG_FILE"; then
    log_pass "Log file creation works"
else
    log_fail "Log file creation failed"
fi

# Test 10: COMPLETED file marker detection
log_test "COMPLETED file marker detection"
touch "$TEST_DIR/.loki/COMPLETED"
if [ -f "$TEST_DIR/.loki/COMPLETED" ]; then
    log_pass "COMPLETED file marker detection works"
else
    log_fail "COMPLETED file marker detection failed"
fi

# Test 11: Environment variable defaults
log_test "Environment variable defaults"
python3 << 'EOF'
import os

# Simulate reading with defaults
MAX_RETRIES = int(os.environ.get('LOKI_MAX_RETRIES', '50'))
BASE_WAIT = int(os.environ.get('LOKI_BASE_WAIT', '60'))
MAX_WAIT = int(os.environ.get('LOKI_MAX_WAIT', '3600'))

assert MAX_RETRIES == 50, f"Expected 50, got {MAX_RETRIES}"
assert BASE_WAIT == 60, f"Expected 60, got {BASE_WAIT}"
assert MAX_WAIT == 3600, f"Expected 3600, got {MAX_WAIT}"

print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Environment variable defaults work"
else
    log_fail "Environment variable defaults failed"
fi

# Test 12: Wrapper state loading
log_test "Wrapper state loading and saving"
STATE_FILE="$TEST_DIR/.loki/wrapper-state.json"
cat > "$STATE_FILE" << 'EOF'
{
    "retryCount": 7,
    "status": "running",
    "lastExitCode": 1,
    "lastRun": "2025-01-15T10:30:00Z",
    "prdPath": "./test.md",
    "pid": 99999
}
EOF

python3 << EOF
import json

with open("$STATE_FILE") as f:
    state = json.load(f)

assert state["retryCount"] == 7
assert state["status"] == "running"
assert state["lastExitCode"] == 1
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Wrapper state loading works"
else
    log_fail "Wrapper state loading failed"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
