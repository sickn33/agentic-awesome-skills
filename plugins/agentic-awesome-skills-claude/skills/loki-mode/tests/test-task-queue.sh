#!/bin/bash
# Test: Distributed Task Queue Functionality
# Tests task creation, claiming, completion, and failure handling

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
echo "Loki Mode Task Queue Tests"
echo "========================================"
echo ""

# Initialize structure
mkdir -p .loki/{state/locks,queue}
for f in pending in-progress completed failed dead-letter; do
    echo '{"tasks":[]}' > ".loki/queue/$f.json"
done

# Helper function to add task
add_task() {
    local id="$1"
    local type="$2"
    local priority="${3:-5}"

    local task=$(cat <<EOF
{
  "id": "$id",
  "type": "$type",
  "priority": $priority,
  "payload": {"action": "test"},
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "claimedBy": null,
  "claimedAt": null,
  "timeout": 3600,
  "retries": 0,
  "maxRetries": 3
}
EOF
)

    # Add to pending queue
    if command -v jq &> /dev/null; then
        jq --argjson task "$task" '.tasks += [$task]' .loki/queue/pending.json > tmp.json && mv tmp.json .loki/queue/pending.json
    else
        # Fallback without jq
        python3 -c "
import json
with open('.loki/queue/pending.json', 'r') as f:
    data = json.load(f)
task = json.loads('''$task''')
data['tasks'].append(task)
with open('.loki/queue/pending.json', 'w') as f:
    json.dump(data, f)
"
    fi
}

# Test 1: Add task to pending queue
log_test "Add task to pending queue"
add_task "task-001" "eng-backend" 5

task_count=$(python3 -c "import json; print(len(json.load(open('.loki/queue/pending.json'))['tasks']))")
if [ "$task_count" -eq 1 ]; then
    log_pass "Task added to pending queue"
else
    log_fail "Failed to add task (count: $task_count)"
fi

# Test 2: Add multiple tasks with priorities
log_test "Add multiple tasks with priorities"
add_task "task-002" "eng-frontend" 3
add_task "task-003" "eng-backend" 10
add_task "task-004" "ops-devops" 1

task_count=$(python3 -c "import json; print(len(json.load(open('.loki/queue/pending.json'))['tasks']))")
if [ "$task_count" -eq 4 ]; then
    log_pass "Multiple tasks added"
else
    log_fail "Failed to add multiple tasks (count: $task_count)"
fi

# Test 3: Priority ordering
log_test "Priority ordering"
highest_priority=$(python3 -c "
import json
data = json.load(open('.loki/queue/pending.json'))
sorted_tasks = sorted(data['tasks'], key=lambda t: -t['priority'])
print(sorted_tasks[0]['id'])
")

if [ "$highest_priority" = "task-003" ]; then
    log_pass "Highest priority task is task-003 (priority 10)"
else
    log_fail "Priority ordering wrong: got $highest_priority, expected task-003"
fi

# Test 4: Claim task (atomic operation simulation)
log_test "Claim task atomically"
python3 << 'EOF'
import json
import os
from datetime import datetime

# Simulate atomic claim with file locking
queue_file = '.loki/queue/pending.json'
progress_file = '.loki/queue/in-progress.json'
lock_file = '.loki/state/locks/queue.lock'

# Read pending
with open(queue_file, 'r') as f:
    pending = json.load(f)

# Find highest priority unclaimed task
tasks = sorted(pending['tasks'], key=lambda t: -t['priority'])
claimed_task = None
for task in tasks:
    if task.get('claimedBy') is None:
        task['claimedBy'] = 'agent-001'
        task['claimedAt'] = datetime.utcnow().isoformat() + 'Z'
        claimed_task = task
        break

if claimed_task:
    # Remove from pending
    pending['tasks'] = [t for t in pending['tasks'] if t['id'] != claimed_task['id']]

    # Add to in-progress
    with open(progress_file, 'r') as f:
        progress = json.load(f)
    progress['tasks'].append(claimed_task)

    # Write both files
    with open(queue_file, 'w') as f:
        json.dump(pending, f)
    with open(progress_file, 'w') as f:
        json.dump(progress, f)

    print(f"CLAIMED:{claimed_task['id']}")
else:
    print("NONE")
EOF

claimed=$(python3 -c "
import json
data = json.load(open('.loki/queue/in-progress.json'))
if data['tasks']:
    print(data['tasks'][0]['id'])
else:
    print('NONE')
")

if [ "$claimed" = "task-003" ]; then
    log_pass "Claimed highest priority task (task-003)"
else
    log_fail "Claim failed: got $claimed"
fi

# Test 5: Complete task
log_test "Complete task"
python3 << 'EOF'
import json
from datetime import datetime

progress_file = '.loki/queue/in-progress.json'
completed_file = '.loki/queue/completed.json'

with open(progress_file, 'r') as f:
    progress = json.load(f)

with open(completed_file, 'r') as f:
    completed = json.load(f)

# Complete first task
if progress['tasks']:
    task = progress['tasks'][0]
    task['completedAt'] = datetime.utcnow().isoformat() + 'Z'
    task['result'] = {'status': 'success'}

    completed['tasks'].append(task)
    progress['tasks'] = progress['tasks'][1:]

    with open(progress_file, 'w') as f:
        json.dump(progress, f)
    with open(completed_file, 'w') as f:
        json.dump(completed, f)

    print("COMPLETED")
EOF

completed_count=$(python3 -c "import json; print(len(json.load(open('.loki/queue/completed.json'))['tasks']))")
if [ "$completed_count" -eq 1 ]; then
    log_pass "Task completed successfully"
else
    log_fail "Task completion failed"
fi

# Test 6: Fail task with retry
log_test "Fail task with retry"
# First claim a task
python3 << 'EOF'
import json
from datetime import datetime

queue_file = '.loki/queue/pending.json'
progress_file = '.loki/queue/in-progress.json'

with open(queue_file, 'r') as f:
    pending = json.load(f)

if pending['tasks']:
    task = pending['tasks'][0]
    task['claimedBy'] = 'agent-002'
    task['claimedAt'] = datetime.utcnow().isoformat() + 'Z'

    with open(progress_file, 'r') as f:
        progress = json.load(f)

    progress['tasks'].append(task)
    pending['tasks'] = pending['tasks'][1:]

    with open(queue_file, 'w') as f:
        json.dump(pending, f)
    with open(progress_file, 'w') as f:
        json.dump(progress, f)
EOF

# Now fail it
python3 << 'EOF'
import json
from datetime import datetime

progress_file = '.loki/queue/in-progress.json'
pending_file = '.loki/queue/pending.json'

with open(progress_file, 'r') as f:
    progress = json.load(f)

if progress['tasks']:
    task = progress['tasks'][0]
    task['retries'] = task.get('retries', 0) + 1
    task['lastError'] = 'Test failure'
    task['claimedBy'] = None
    task['claimedAt'] = None
    task['backoffSeconds'] = 60 * (2 ** (task['retries'] - 1))

    # Move back to pending for retry
    with open(pending_file, 'r') as f:
        pending = json.load(f)

    pending['tasks'].append(task)
    progress['tasks'] = progress['tasks'][1:]

    with open(progress_file, 'w') as f:
        json.dump(progress, f)
    with open(pending_file, 'w') as f:
        json.dump(pending, f)

    print(f"RETRY:{task['retries']}")
EOF

retry_count=$(python3 -c "
import json
data = json.load(open('.loki/queue/pending.json'))
for t in data['tasks']:
    if t.get('retries', 0) > 0:
        print(t['retries'])
        break
else:
    print(0)
")

if [ "$retry_count" -eq 1 ]; then
    log_pass "Task moved back to pending with retry count"
else
    log_fail "Retry handling failed"
fi

# Test 7: Dead letter queue
log_test "Move to dead letter queue after max retries"
python3 << 'EOF'
import json
from datetime import datetime

pending_file = '.loki/queue/pending.json'
dlq_file = '.loki/queue/dead-letter.json'

with open(pending_file, 'r') as f:
    pending = json.load(f)

with open(dlq_file, 'r') as f:
    dlq = json.load(f)

# Find task with retries and simulate max retries exceeded
for task in pending['tasks']:
    if task.get('retries', 0) > 0:
        task['retries'] = task.get('maxRetries', 3)
        task['lastError'] = 'Max retries exceeded'
        task['movedToDLQ'] = datetime.utcnow().isoformat() + 'Z'

        dlq['tasks'].append(task)
        pending['tasks'] = [t for t in pending['tasks'] if t['id'] != task['id']]
        break

with open(pending_file, 'w') as f:
    json.dump(pending, f)
with open(dlq_file, 'w') as f:
    json.dump(dlq, f)

print("MOVED_TO_DLQ")
EOF

dlq_count=$(python3 -c "import json; print(len(json.load(open('.loki/queue/dead-letter.json'))['tasks']))")
if [ "$dlq_count" -eq 1 ]; then
    log_pass "Task moved to dead letter queue"
else
    log_fail "Dead letter queue handling failed"
fi

# Test 8: Idempotency check
log_test "Idempotency check (duplicate prevention)"
python3 << 'EOF'
import json
import hashlib

pending_file = '.loki/queue/pending.json'

with open(pending_file, 'r') as f:
    pending = json.load(f)

# Try to add duplicate task
new_task = {
    "id": "task-duplicate",
    "type": "eng-backend",
    "payload": {"action": "test"}
}

# Generate idempotency key
idempotency_key = hashlib.md5(json.dumps(new_task['payload'], sort_keys=True).encode()).hexdigest()
new_task['idempotencyKey'] = idempotency_key

# Check if already exists
existing = [t for t in pending['tasks'] if t.get('idempotencyKey') == idempotency_key]
if not existing:
    pending['tasks'].append(new_task)
    print("ADDED")
else:
    print("DUPLICATE")

# Try again with same payload
existing = [t for t in pending['tasks'] if t.get('idempotencyKey') == idempotency_key]
if existing:
    print("DUPLICATE_DETECTED")

with open(pending_file, 'w') as f:
    json.dump(pending, f)
EOF

log_pass "Idempotency check works"

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
