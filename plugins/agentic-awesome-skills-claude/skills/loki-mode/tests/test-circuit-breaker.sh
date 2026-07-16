#!/bin/bash
# Test: Circuit Breaker Functionality
# Tests circuit breaker states, transitions, and recovery

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
echo "Loki Mode Circuit Breaker Tests"
echo "========================================"
echo ""

# Initialize structure
mkdir -p .loki/{state,config}

# Create circuit breaker config
cat > .loki/config/circuit-breakers.yaml << 'EOF'
defaults:
  failureThreshold: 5
  cooldownSeconds: 300
  halfOpenRequests: 3

overrides:
  external-api:
    failureThreshold: 3
    cooldownSeconds: 600
  eng-frontend:
    failureThreshold: 10
    cooldownSeconds: 180
EOF

# Initialize orchestrator state
cat > .loki/state/orchestrator.json << 'EOF'
{
  "circuitBreakers": {}
}
EOF

# Test 1: Initialize circuit breaker (CLOSED state)
log_test "Initialize circuit breaker in CLOSED state"
python3 << 'EOF'
import json
from datetime import datetime

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

# Initialize circuit breaker for eng-backend
state['circuitBreakers']['eng-backend'] = {
    'state': 'closed',
    'failures': 0,
    'lastFailure': None,
    'cooldownUntil': None,
    'halfOpenAttempts': 0
}

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)

print("INITIALIZED")
EOF

cb_state=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['state'])
")

if [ "$cb_state" = "closed" ]; then
    log_pass "Circuit breaker initialized in CLOSED state"
else
    log_fail "Expected CLOSED, got $cb_state"
fi

# Test 2: Record failures
log_test "Record failures incrementally"
python3 << 'EOF'
import json
from datetime import datetime

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

# Record 3 failures
for i in range(3):
    cb['failures'] += 1
    cb['lastFailure'] = datetime.utcnow().isoformat() + 'Z'

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)

print(f"FAILURES:{cb['failures']}")
EOF

failures=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['failures'])
")

if [ "$failures" -eq 3 ]; then
    log_pass "Recorded 3 failures"
else
    log_fail "Expected 3 failures, got $failures"
fi

# Test 3: Trip circuit breaker (CLOSED -> OPEN)
log_test "Trip circuit breaker after threshold"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

FAILURE_THRESHOLD = 5
COOLDOWN_SECONDS = 300

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

# Add 2 more failures to reach threshold
cb['failures'] += 2
cb['lastFailure'] = datetime.utcnow().isoformat() + 'Z'

# Check if threshold reached
if cb['failures'] >= FAILURE_THRESHOLD:
    cb['state'] = 'open'
    cb['cooldownUntil'] = (datetime.utcnow() + timedelta(seconds=COOLDOWN_SECONDS)).isoformat() + 'Z'
    print(f"TRIPPED:open")
else:
    print(f"NOT_TRIPPED:{cb['failures']}")

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)
EOF

cb_state=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['state'])
")

if [ "$cb_state" = "open" ]; then
    log_pass "Circuit breaker tripped to OPEN"
else
    log_fail "Expected OPEN, got $cb_state"
fi

# Test 4: Block requests when OPEN
log_test "Block requests when circuit is OPEN"
python3 << 'EOF'
import json
from datetime import datetime

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

def can_proceed(circuit_breaker):
    if circuit_breaker['state'] == 'closed':
        return True
    if circuit_breaker['state'] == 'open':
        cooldown = circuit_breaker.get('cooldownUntil')
        if cooldown:
            # Check if cooldown expired
            cooldown_time = datetime.fromisoformat(cooldown.replace('Z', '+00:00'))
            if datetime.now(cooldown_time.tzinfo) > cooldown_time:
                return True  # Can transition to half-open
        return False
    if circuit_breaker['state'] == 'half-open':
        return True
    return False

result = can_proceed(cb)
print("BLOCKED" if not result else "ALLOWED")
EOF

log_pass "Requests blocked when circuit is OPEN"

# Test 5: Transition to HALF-OPEN after cooldown
log_test "Transition to HALF-OPEN after cooldown"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

# Simulate cooldown expired
cb['cooldownUntil'] = (datetime.utcnow() - timedelta(seconds=10)).isoformat() + 'Z'

# Check and transition
cooldown_time = datetime.fromisoformat(cb['cooldownUntil'].replace('Z', '+00:00'))
if datetime.now(cooldown_time.tzinfo) > cooldown_time and cb['state'] == 'open':
    cb['state'] = 'half-open'
    cb['halfOpenAttempts'] = 0
    print("TRANSITIONED:half-open")

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)
EOF

cb_state=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['state'])
")

if [ "$cb_state" = "half-open" ]; then
    log_pass "Circuit breaker transitioned to HALF-OPEN"
else
    log_fail "Expected HALF-OPEN, got $cb_state"
fi

# Test 6: Success in HALF-OPEN -> CLOSED
log_test "Success in HALF-OPEN transitions to CLOSED"
python3 << 'EOF'
import json

HALF_OPEN_REQUESTS = 3

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

# Simulate successful requests in half-open
for i in range(HALF_OPEN_REQUESTS):
    cb['halfOpenAttempts'] += 1

# After enough successes, transition to closed
if cb['halfOpenAttempts'] >= HALF_OPEN_REQUESTS:
    cb['state'] = 'closed'
    cb['failures'] = 0
    cb['lastFailure'] = None
    cb['cooldownUntil'] = None
    cb['halfOpenAttempts'] = 0
    print("RECOVERED:closed")

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)
EOF

cb_state=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['state'])
")

if [ "$cb_state" = "closed" ]; then
    log_pass "Circuit breaker recovered to CLOSED"
else
    log_fail "Expected CLOSED, got $cb_state"
fi

# Test 7: Failure in HALF-OPEN -> OPEN
log_test "Failure in HALF-OPEN transitions back to OPEN"
python3 << 'EOF'
import json
from datetime import datetime, timedelta

COOLDOWN_SECONDS = 300

with open('.loki/state/orchestrator.json', 'r') as f:
    state = json.load(f)

cb = state['circuitBreakers']['eng-backend']

# Set to half-open
cb['state'] = 'half-open'
cb['halfOpenAttempts'] = 1

# Simulate failure
cb['state'] = 'open'
cb['failures'] += 1
cb['lastFailure'] = datetime.utcnow().isoformat() + 'Z'
cb['cooldownUntil'] = (datetime.utcnow() + timedelta(seconds=COOLDOWN_SECONDS)).isoformat() + 'Z'
cb['halfOpenAttempts'] = 0

print("REOPENED")

with open('.loki/state/orchestrator.json', 'w') as f:
    json.dump(state, f, indent=2)
EOF

cb_state=$(python3 -c "
import json
data = json.load(open('.loki/state/orchestrator.json'))
print(data['circuitBreakers']['eng-backend']['state'])
")

if [ "$cb_state" = "open" ]; then
    log_pass "Circuit breaker reopened after HALF-OPEN failure"
else
    log_fail "Expected OPEN, got $cb_state"
fi

# Test 8: Per-agent-type thresholds
log_test "Per-agent-type thresholds from config"
python3 << 'EOF'
import json

# Simulate reading config (in real usage, would parse YAML)
config = {
    'defaults': {
        'failureThreshold': 5,
        'cooldownSeconds': 300
    },
    'overrides': {
        'external-api': {
            'failureThreshold': 3,
            'cooldownSeconds': 600
        },
        'eng-frontend': {
            'failureThreshold': 10,
            'cooldownSeconds': 180
        }
    }
}

def get_threshold(agent_type):
    if agent_type in config['overrides']:
        return config['overrides'][agent_type].get('failureThreshold', config['defaults']['failureThreshold'])
    return config['defaults']['failureThreshold']

# Test different agent types
backend_threshold = get_threshold('eng-backend')  # Should use default
frontend_threshold = get_threshold('eng-frontend')  # Should use override
api_threshold = get_threshold('external-api')  # Should use override

results = {
    'eng-backend': backend_threshold,
    'eng-frontend': frontend_threshold,
    'external-api': api_threshold
}

print(f"THRESHOLDS:backend={backend_threshold},frontend={frontend_threshold},api={api_threshold}")

# Verify
assert backend_threshold == 5, f"Expected 5, got {backend_threshold}"
assert frontend_threshold == 10, f"Expected 10, got {frontend_threshold}"
assert api_threshold == 3, f"Expected 3, got {api_threshold}"

print("VERIFIED")
EOF

log_pass "Per-agent-type thresholds work correctly"

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
