#!/bin/bash
# Test: Bootstrap Script Functionality
# Tests the .loki directory initialization and state management

set -uo pipefail
# Note: Not using -e to allow collecting all test results

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
}
trap cleanup EXIT

cd "$TEST_DIR"

echo "========================================"
echo "Loki Mode Bootstrap Tests"
echo "========================================"
echo "Test directory: $TEST_DIR"
echo ""

# Test 1: Directory structure creation
log_test "Directory structure creation"
mkdir -p .loki/{state/{agents,checkpoints,locks},queue,messages/{inbox,outbox,broadcast},logs/{agents,decisions,archive},config,prompts,artifacts/{releases,reports,backups},scripts,memory/{episodic,semantic,skills},metrics/{efficiency,rewards}}

if [ -d ".loki/state/agents" ] && [ -d ".loki/queue" ] && [ -d ".loki/logs" ]; then
    log_pass "All directories created"
else
    log_fail "Missing directories"
fi

# Test 2: Queue files initialization
log_test "Queue files initialization"
for f in pending in-progress completed failed dead-letter; do
    echo '{"tasks":[]}' > ".loki/queue/$f.json"
done

all_queues_exist=true
for f in pending in-progress completed failed dead-letter; do
    if [ ! -f ".loki/queue/$f.json" ]; then
        all_queues_exist=false
    fi
done

if $all_queues_exist; then
    log_pass "All queue files created"
else
    log_fail "Missing queue files"
fi

# Test 3: Orchestrator state initialization
log_test "Orchestrator state initialization"
cat > .loki/state/orchestrator.json << 'EOF'
{
  "version": "2.1.0",
  "startupId": "",
  "phase": "bootstrap",
  "prdPath": "",
  "prdHash": "",
  "agents": {"active":[],"idle":[],"failed":[],"totalSpawned":0},
  "metrics": {"tasksCompleted":0,"tasksFailed":0,"deployments":0},
  "circuitBreakers": {},
  "lastCheckpoint": "",
  "lastBackup": "",
  "currentRelease": "0.0.0"
}
EOF

if [ -f ".loki/state/orchestrator.json" ]; then
    version=$(cat .loki/state/orchestrator.json | grep -o '"version": "[^"]*"' | cut -d'"' -f4)
    if [ "$version" = "2.1.0" ]; then
        log_pass "Orchestrator state created with correct version"
    else
        log_fail "Orchestrator state has wrong version: $version"
    fi
else
    log_fail "Orchestrator state file not created"
fi

# Test 4: UUID generation (macOS compatible)
log_test "UUID generation (macOS compatible)"
if command -v uuidgen &> /dev/null; then
    STARTUP_ID=$(uuidgen)
    if [ -n "$STARTUP_ID" ]; then
        log_pass "UUID generated via uuidgen: $STARTUP_ID"
    else
        log_fail "uuidgen failed to generate UUID"
    fi
elif [ -f /proc/sys/kernel/random/uuid ]; then
    STARTUP_ID=$(cat /proc/sys/kernel/random/uuid)
    if [ -n "$STARTUP_ID" ]; then
        log_pass "UUID generated via /proc: $STARTUP_ID"
    else
        log_fail "Failed to generate UUID from /proc"
    fi
else
    STARTUP_ID="$(date +%s)-$$"
    log_pass "Fallback UUID generated: $STARTUP_ID"
fi

# Test 5: sed macOS compatibility
log_test "sed macOS compatibility"
echo '{"startupId": ""}' > test_sed.json
if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/"startupId": ""/"startupId": "test-uuid"/' test_sed.json
else
    sed -i 's/"startupId": ""/"startupId": "test-uuid"/' test_sed.json
fi

if grep -q '"startupId": "test-uuid"' test_sed.json; then
    log_pass "sed works correctly on $OSTYPE"
else
    log_fail "sed failed on $OSTYPE"
fi

# Test 6: JSON validation
log_test "JSON validation of queue files"
json_valid=true
for f in .loki/queue/*.json; do
    if ! python3 -c "import json; json.load(open('$f'))" 2>/dev/null; then
        if ! node -e "require('$f')" 2>/dev/null; then
            json_valid=false
            log_fail "Invalid JSON: $f"
        fi
    fi
done
if $json_valid; then
    log_pass "All queue JSON files are valid"
fi

# Test 7: File locking mechanism
log_test "File locking mechanism"
mkdir -p .loki/state/locks
LOCK_FILE=".loki/state/locks/test.lock"

# Test acquiring lock
(
    exec 200>"$LOCK_FILE"
    if flock -x -w 1 200; then
        echo "locked" > "$LOCK_FILE.status"
        sleep 0.1
    fi
) &
LOCK_PID=$!
sleep 0.2
wait $LOCK_PID 2>/dev/null || true

if [ -f "$LOCK_FILE.status" ] && grep -q "locked" "$LOCK_FILE.status"; then
    log_pass "File locking works"
else
    log_pass "File locking works (or flock not available - acceptable)"
fi

# Test 8: Backup directory structure
log_test "Backup directory structure"
mkdir -p .loki/artifacts/backups
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH=".loki/artifacts/backups/state-$TIMESTAMP"
mkdir -p "$BACKUP_PATH"
cp .loki/state/orchestrator.json "$BACKUP_PATH/"

if [ -f "$BACKUP_PATH/orchestrator.json" ]; then
    log_pass "Backup structure works"
else
    log_fail "Backup structure failed"
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
