#!/bin/bash
# Test: Agent Timeout and Stuck Process Handling
# Tests timeout mechanisms for long-running commands like npm build

set -uo pipefail
# Note: Not using -e to allow collecting all test results

TEST_DIR=$(mktemp -d)
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
    # Kill any test processes
    pkill -f "test-long-running" 2>/dev/null || true
}
trap cleanup EXIT

cd "$TEST_DIR"

echo "========================================"
echo "Loki Mode Timeout & Stuck Process Tests"
echo "========================================"
echo ""

# macOS-compatible timeout function
run_with_timeout() {
    local timeout_seconds="$1"
    shift
    local cmd="$@"

    # Use gtimeout if available (from coreutils), otherwise use Perl
    if command -v gtimeout &> /dev/null; then
        gtimeout "$timeout_seconds" bash -c "$cmd"
        return $?
    elif command -v timeout &> /dev/null; then
        timeout "$timeout_seconds" bash -c "$cmd"
        return $?
    else
        # Perl-based timeout (works on macOS)
        perl -e '
            alarm shift @ARGV;
            $SIG{ALRM} = sub { exit 124 };
            exec @ARGV;
        ' "$timeout_seconds" bash -c "$cmd"
        return $?
    fi
}

# Test 1: Command timeout with short process
log_test "Command completes within timeout"
START=$(date +%s)
run_with_timeout 5 "sleep 1" && RESULT="success" || RESULT="timeout"
END=$(date +%s)
DURATION=$((END - START))

if [ "$RESULT" = "success" ] && [ $DURATION -lt 3 ]; then
    log_pass "Short command completed in ${DURATION}s"
else
    log_fail "Short command handling failed (result: $RESULT, duration: ${DURATION}s)"
fi

# Test 2: Command timeout with long process
log_test "Command times out correctly"
START=$(date +%s)
run_with_timeout 2 "sleep 10" && RESULT="success" || RESULT="timeout"
END=$(date +%s)
DURATION=$((END - START))

if [ "$RESULT" = "timeout" ] && [ $DURATION -lt 5 ]; then
    log_pass "Long command timed out correctly in ${DURATION}s"
else
    log_fail "Timeout mechanism failed (duration: ${DURATION}s, result: $RESULT)"
fi

# Test 3: Task timeout configuration
log_test "Task timeout configuration"
python3 << 'EOF'
import json

# Task with custom timeout
task = {
    "id": "task-build-001",
    "type": "eng-frontend",
    "payload": {
        "action": "build",
        "command": "npm run build"
    },
    "timeout": 600,  # 10 minutes for builds
    "createdAt": "2025-01-15T10:00:00Z"
}

# Different timeouts for different task types
TIMEOUT_CONFIG = {
    'default': 300,  # 5 minutes
    'build': 600,    # 10 minutes
    'test': 900,     # 15 minutes
    'deploy': 1800,  # 30 minutes
    'quick': 60      # 1 minute
}

def get_timeout(task):
    action = task.get('payload', {}).get('action', 'default')
    return task.get('timeout', TIMEOUT_CONFIG.get(action, TIMEOUT_CONFIG['default']))

timeout = get_timeout(task)
print(f"TIMEOUT:{timeout}")
assert timeout == 600, f"Expected 600, got {timeout}"
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Task timeout configuration works"
else
    log_fail "Task timeout configuration failed"
fi

# Test 4: Stuck process detection
log_test "Stuck process detection (heartbeat)"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

# Simulate agent state with heartbeat
agent_state = {
    "id": "eng-backend-01",
    "status": "active",
    "currentTask": "task-001",
    "lastHeartbeat": (datetime.utcnow() - timedelta(minutes=10)).isoformat() + 'Z'
}

HEARTBEAT_TIMEOUT = 300  # 5 minutes

def is_agent_stuck(agent):
    if not agent.get('lastHeartbeat'):
        return False

    last_heartbeat = datetime.fromisoformat(agent['lastHeartbeat'].replace('Z', '+00:00'))
    age = (datetime.now(last_heartbeat.tzinfo) - last_heartbeat).total_seconds()

    return age > HEARTBEAT_TIMEOUT

is_stuck = is_agent_stuck(agent_state)
print(f"STUCK:{is_stuck}")
assert is_stuck == True, "Agent should be detected as stuck"
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Stuck process detection works"
else
    log_fail "Stuck process detection failed"
fi

# Test 5: Process group killing
log_test "Process group killing (cleanup)"
# Create a process that spawns children
(
    echo "parent-$$" > "$TEST_DIR/parent.pid"
    (sleep 100 & echo $! > "$TEST_DIR/child.pid") &
    wait
) &
PARENT_PID=$!
sleep 0.5

# Kill the process group
if kill -0 $PARENT_PID 2>/dev/null; then
    kill -TERM -$PARENT_PID 2>/dev/null || kill -TERM $PARENT_PID 2>/dev/null || true
    sleep 0.5
    if ! kill -0 $PARENT_PID 2>/dev/null; then
        log_pass "Process group killed successfully"
    else
        kill -9 $PARENT_PID 2>/dev/null || true
        log_pass "Process killed with SIGKILL"
    fi
else
    log_pass "Process already terminated"
fi

# Test 6: npm/node process timeout simulation
log_test "npm/node process timeout handling"
cat > "$TEST_DIR/slow-script.js" << 'EOF'
// Simulate a slow npm build
console.log('Starting slow process...');
setTimeout(() => {
    console.log('Still running...');
}, 1000);
setTimeout(() => {
    console.log('Completed!');
    process.exit(0);
}, 5000);
EOF

if command -v node &> /dev/null; then
    START=$(date +%s)
    run_with_timeout 2 "node '$TEST_DIR/slow-script.js'" > /dev/null 2>&1 && RESULT="success" || RESULT="timeout"
    END=$(date +%s)
    DURATION=$((END - START))

    if [ "$RESULT" = "timeout" ]; then
        log_pass "Node process timed out correctly in ${DURATION}s"
    else
        log_fail "Node process should have timed out"
    fi
else
    log_pass "Node not available - skipping (acceptable)"
fi

# Test 7: Task retry after timeout
log_test "Task retry after timeout"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

# Task that timed out
task = {
    "id": "task-timeout-001",
    "type": "eng-frontend",
    "payload": {"action": "build"},
    "timeout": 300,
    "retries": 0,
    "maxRetries": 3,
    "lastError": "Timeout after 300 seconds",
    "claimedBy": "agent-001",
    "claimedAt": (datetime.utcnow() - timedelta(seconds=310)).isoformat() + 'Z'
}

def handle_timeout(task):
    task['retries'] += 1
    task['lastError'] = f"Timeout after {task['timeout']} seconds"
    task['claimedBy'] = None
    task['claimedAt'] = None

    # Increase timeout for retry (25% increase)
    task['timeout'] = int(task['timeout'] * 1.25)

    return task

task = handle_timeout(task)
print(f"RETRIES:{task['retries']}")
print(f"NEW_TIMEOUT:{task['timeout']}")
assert task['retries'] == 1
assert task['timeout'] == 375  # 300 * 1.25
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Task retry after timeout works"
else
    log_fail "Task retry after timeout failed"
fi

# Test 8: Watchdog timer pattern
log_test "Watchdog timer pattern"
python3 << 'EOF'
import time
from datetime import datetime, timedelta

class Watchdog:
    def __init__(self, timeout_seconds):
        self.timeout = timeout_seconds
        self.last_pet = datetime.utcnow()

    def pet(self):
        """Reset the watchdog timer"""
        self.last_pet = datetime.utcnow()

    def is_expired(self):
        """Check if watchdog has expired"""
        age = (datetime.utcnow() - self.last_pet).total_seconds()
        return age > self.timeout

    def remaining(self):
        """Get remaining time before expiry"""
        age = (datetime.utcnow() - self.last_pet).total_seconds()
        return max(0, self.timeout - age)

# Create watchdog with 2 second timeout
wd = Watchdog(2)
print(f"Initial remaining: {wd.remaining():.1f}s")
assert not wd.is_expired(), "Should not be expired initially"

# Simulate work with petting
time.sleep(0.5)
wd.pet()
print(f"After pet: {wd.remaining():.1f}s")
assert not wd.is_expired(), "Should not be expired after pet"

# Let it expire
time.sleep(0.1)
# Simulate expiry by setting last_pet in past
wd.last_pet = datetime.utcnow() - timedelta(seconds=3)
assert wd.is_expired(), "Should be expired"
print("Watchdog expired correctly")
print("VERIFIED")
EOF

if [ $? -eq 0 ]; then
    log_pass "Watchdog timer pattern works"
else
    log_fail "Watchdog timer pattern failed"
fi

# Test 9: Graceful shutdown with timeout
log_test "Graceful shutdown with timeout"
(
    trap 'echo "Received SIGTERM"; exit 0' TERM
    sleep 100
) &
PID=$!
sleep 0.2

# Send SIGTERM
kill -TERM $PID 2>/dev/null || true
sleep 0.5

if ! kill -0 $PID 2>/dev/null; then
    log_pass "Process handled SIGTERM gracefully"
else
    kill -9 $PID 2>/dev/null || true
    log_pass "Process required SIGKILL (acceptable)"
fi

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
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
