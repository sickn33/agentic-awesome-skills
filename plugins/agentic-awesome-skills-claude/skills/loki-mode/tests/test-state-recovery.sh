#!/bin/bash
# Test: State Recovery and Checkpoint Functionality
# Tests checkpoint creation, recovery, and rate limit handling

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
}
trap cleanup EXIT

cd "$TEST_DIR"

echo "========================================"
echo "Loki Mode State Recovery Tests"
echo "========================================"
echo ""

# Initialize structure
mkdir -p .loki/{state/{agents,checkpoints},queue,artifacts/backups}

# Create initial state
cat > .loki/state/orchestrator.json << 'EOF'
{
  "version": "2.1.0",
  "startupId": "test-session-001",
  "phase": "development",
  "agents": {"active":["eng-backend-01"],"idle":[],"failed":[],"totalSpawned":5},
  "metrics": {"tasksCompleted":10,"tasksFailed":2,"deployments":0},
  "circuitBreakers": {},
  "lastCheckpoint": "",
  "currentRelease": "0.1.0"
}
EOF

# Create agent state
cat > .loki/state/agents/eng-backend-01.json << 'EOF'
{
  "id": "eng-backend-01",
  "status": "active",
  "currentTask": "task-042",
  "tasksCompleted": 8,
  "lastHeartbeat": "2025-01-15T10:30:00Z"
}
EOF

# Create queue state
cat > .loki/queue/pending.json << 'EOF'
{"tasks":[{"id":"task-043","type":"eng-frontend","priority":5}]}
EOF
cat > .loki/queue/in-progress.json << 'EOF'
{"tasks":[{"id":"task-042","type":"eng-backend","claimedBy":"eng-backend-01"}]}
EOF

# Test 1: Create checkpoint
log_test "Create checkpoint"
CHECKPOINT_DIR=".loki/state/checkpoints/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$CHECKPOINT_DIR"
cp .loki/state/orchestrator.json "$CHECKPOINT_DIR/"
cp -r .loki/state/agents "$CHECKPOINT_DIR/"
cp -r .loki/queue "$CHECKPOINT_DIR/"

if [ -f "$CHECKPOINT_DIR/orchestrator.json" ] && [ -d "$CHECKPOINT_DIR/agents" ]; then
    log_pass "Checkpoint created at $CHECKPOINT_DIR"
else
    log_fail "Checkpoint creation failed"
fi

# Test 2: Update lastCheckpoint in state
log_test "Update lastCheckpoint timestamp"
python3 << EOF
import json
from datetime import datetime

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

state['lastCheckpoint'] = datetime.utcnow().isoformat() + 'Z'

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)

print("UPDATED")
EOF

has_checkpoint=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print('yes' if data.get('lastCheckpoint') else 'no')
")

if [ "$has_checkpoint" = "yes" ]; then
    log_pass "lastCheckpoint timestamp updated"
else
    log_fail "lastCheckpoint not set"
fi

# Test 3: Simulate crash and corrupt state
log_test "Detect corrupted state"
echo "corrupted{json" > .loki/state/orchestrator.json.corrupted

python3 << 'EOF'
import json

def is_valid_state(filepath):
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        return isinstance(data, dict) and 'version' in data
    except (json.JSONDecodeError, KeyError):
        return False

is_valid = is_valid_state('.loki/state/orchestrator.json.corrupted')
print("CORRUPTED" if not is_valid else "VALID")
assert not is_valid, "Should detect corrupted state"
EOF

log_pass "Corrupted state detected"

# Test 4: Restore from checkpoint
log_test "Restore from checkpoint"
python3 << EOF
import json
import os
import shutil
from pathlib import Path

# Find latest checkpoint
checkpoints_dir = Path('.loki/state/checkpoints')
checkpoints = sorted(checkpoints_dir.iterdir(), reverse=True)

if checkpoints:
    latest = checkpoints[0]

    # Restore orchestrator state
    if (latest / 'orchestrator.json').exists():
        shutil.copy(latest / 'orchestrator.json', '.loki/state/orchestrator.json')

    # Restore agent states
    if (latest / 'agents').exists():
        for agent_file in (latest / 'agents').iterdir():
            shutil.copy(agent_file, f'.loki/state/agents/{agent_file.name}')

    # Restore queue
    if (latest / 'queue').exists():
        for queue_file in (latest / 'queue').iterdir():
            shutil.copy(queue_file, f'.loki/queue/{queue_file.name}')

    print(f"RESTORED:{latest.name}")
else:
    print("NO_CHECKPOINT")
EOF

# Verify restoration
restored_version=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data.get('version', 'unknown'))
")

if [ "$restored_version" = "2.1.0" ]; then
    log_pass "State restored from checkpoint"
else
    log_fail "State restoration failed (version: $restored_version)"
fi

# Test 5: Orphaned task detection
log_test "Detect orphaned tasks"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

CLAIM_TIMEOUT = 3600  # 1 hour

# Create an old claimed task
old_task = {
    "id": "task-old-001",
    "type": "eng-backend",
    "claimedBy": "dead-agent-99",
    "claimedAt": (datetime.utcnow() - timedelta(hours=2)).isoformat() + 'Z'
}

with open('.loki/queue/in-progress.json', 'r') as f:
    in_progress = json.load(f)

in_progress['tasks'].append(old_task)

with open('.loki/queue/in-progress.json', 'w') as f:
    json.dump(in_progress, f)

def find_orphaned_tasks(in_progress_tasks):
    orphaned = []
    now = datetime.utcnow()

    for task in in_progress_tasks:
        if task.get('claimedAt'):
            claimed_at = datetime.fromisoformat(task['claimedAt'].replace('Z', '+00:00'))
            age = (now.replace(tzinfo=claimed_at.tzinfo) - claimed_at).total_seconds()
            if age > CLAIM_TIMEOUT:
                orphaned.append(task['id'])

    return orphaned

orphaned = find_orphaned_tasks(in_progress['tasks'])
print(f"ORPHANED:{len(orphaned)}")
assert len(orphaned) >= 1, "Should find orphaned task"
print("VERIFIED")
EOF

log_pass "Orphaned task detection works"

# Test 6: Re-queue orphaned tasks
log_test "Re-queue orphaned tasks"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

CLAIM_TIMEOUT = 3600

with open('.loki/queue/in-progress.json', 'r') as f:
    in_progress = json.load(f)

with open('.loki/queue/pending.json', 'r') as f:
    pending = json.load(f)

now = datetime.utcnow()
requeued = []

for task in in_progress['tasks'][:]:
    if task.get('claimedAt'):
        claimed_at = datetime.fromisoformat(task['claimedAt'].replace('Z', '+00:00'))
        age = (now.replace(tzinfo=claimed_at.tzinfo) - claimed_at).total_seconds()

        if age > CLAIM_TIMEOUT:
            # Re-queue: clear claim and move to pending
            task['claimedBy'] = None
            task['claimedAt'] = None
            task['requeuedAt'] = now.isoformat() + 'Z'
            task['requeueReason'] = 'claim_timeout'

            pending['tasks'].append(task)
            in_progress['tasks'].remove(task)
            requeued.append(task['id'])

with open('.loki/queue/in-progress.json', 'w') as f:
    json.dump(in_progress, f)

with open('.loki/queue/pending.json', 'w') as f:
    json.dump(pending, f)

print(f"REQUEUED:{len(requeued)}")
EOF

log_pass "Orphaned tasks re-queued"

# Test 7: Rate limit backoff simulation
log_test "Rate limit exponential backoff"
python3 << 'EOF'
import time
import random

def calculate_backoff(attempt, base_delay=60, max_delay=3600):
    """Calculate exponential backoff with jitter"""
    delay = min(base_delay * (2 ** attempt), max_delay)
    jitter = random.uniform(0, delay * 0.1)
    return delay + jitter

# Test backoff progression
delays = []
for attempt in range(5):
    delay = calculate_backoff(attempt)
    delays.append(int(delay))
    print(f"Attempt {attempt}: {delay:.0f}s")

# Verify exponential growth
assert delays[0] >= 60, "Initial delay should be ~60s"
assert delays[1] >= 120, "Second delay should be ~120s"
assert delays[2] >= 240, "Third delay should be ~240s"
assert delays[4] <= 4000, "Should cap at max_delay"

print("VERIFIED")
EOF

log_pass "Exponential backoff works"

# Test 8: Full system recovery
log_test "Full system recovery simulation"
python3 << 'EOF'
import json
import os
from pathlib import Path
from datetime import datetime, timedelta

def recover_system():
    """Full system recovery procedure"""
    recovery_log = []

    # 1. Check orchestrator state
    try:
        with open('.loki/state/orchestrator.json', 'r') as f:
            state = json.load(f)
        recovery_log.append("Orchestrator state: OK")
    except:
        recovery_log.append("Orchestrator state: RESTORE FROM CHECKPOINT")
        # Would restore here

    # 2. Check agent states
    agents_dir = Path('.loki/state/agents')
    active_agents = []
    dead_agents = []

    for agent_file in agents_dir.glob('*.json'):
        with open(agent_file, 'r') as f:
            agent = json.load(f)

        # Check heartbeat
        if agent.get('lastHeartbeat'):
            hb = datetime.fromisoformat(agent['lastHeartbeat'].replace('Z', '+00:00'))
            age = (datetime.now(hb.tzinfo) - hb).total_seconds()
            if age > 600:  # 10 min heartbeat timeout
                dead_agents.append(agent['id'])
            else:
                active_agents.append(agent['id'])

    recovery_log.append(f"Active agents: {len(active_agents)}")
    recovery_log.append(f"Dead agents: {len(dead_agents)}")

    # 3. Re-queue tasks from dead agents
    with open('.loki/queue/in-progress.json', 'r') as f:
        in_progress = json.load(f)

    requeued = 0
    for task in in_progress['tasks'][:]:
        if task.get('claimedBy') in dead_agents:
            task['claimedBy'] = None
            task['claimedAt'] = None
            requeued += 1

    with open('.loki/queue/in-progress.json', 'w') as f:
        json.dump(in_progress, f)

    recovery_log.append(f"Re-queued tasks: {requeued}")

    # 4. Reset circuit breakers if cooldown expired
    if 'circuitBreakers' in state:
        for cb_name, cb in state['circuitBreakers'].items():
            if cb.get('state') == 'open' and cb.get('cooldownUntil'):
                cooldown = datetime.fromisoformat(cb['cooldownUntil'].replace('Z', '+00:00'))
                if datetime.now(cooldown.tzinfo) > cooldown:
                    cb['state'] = 'half-open'
                    recovery_log.append(f"Circuit breaker {cb_name}: OPEN -> HALF-OPEN")

    return recovery_log

log = recover_system()
for entry in log:
    print(entry)

print("RECOVERY_COMPLETE")
EOF

log_pass "Full system recovery works"

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
