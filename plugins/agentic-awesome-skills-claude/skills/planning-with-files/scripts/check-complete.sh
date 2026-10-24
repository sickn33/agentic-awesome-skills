#!/bin/bash
# Check if all phases in task_plan.md are complete
# Exit 0 if complete, exit 1 if incomplete
# Used by Stop hook to verify task completion

PLAN_FILE="${1:-task_plan.md}"

if [ ! -f "$PLAN_FILE" ]; then
    echo "ERROR: $PLAN_FILE not found"
    echo "Cannot verify completion without a task plan."
    exit 1
fi

echo "=== Task Completion Check ==="
echo ""

# Count phases by status (using -F for fixed string matching)
TOTAL=$(grep -c "### Phase" "$PLAN_FILE" || true)
COMPLETE=$(grep -cF "**Status:** complete" "$PLAN_FILE" || true)
IN_PROGRESS=$(grep -cF "**Status:** in_progress" "$PLAN_FILE" || true)
PENDING=$(grep -cF "**Status:** pending" "$PLAN_FILE" || true)

# Default to 0 if empty
: "${TOTAL:=0}"
: "${COMPLETE:=0}"
: "${IN_PROGRESS:=0}"
: "${PENDING:=0}"

echo "Total phases:   $TOTAL"
echo "Complete:       $COMPLETE"
echo "In progress:    $IN_PROGRESS"
echo "Pending:        $PENDING"
echo ""

# Check status within each template phase; raw global counts can pass when
# duplicate statuses in one phase compensate for a missing status in another.
PHASES_OK=$(awk '
  /^### Phase/ { if (n && (statuses != 1 || !done)) bad=1; n++; statuses=0; done=0; next }
  /^## / { if (n && (statuses != 1 || !done)) bad=1; active=0 }
  /^### Phase/ { active=1 }
  /^- \*\*Status:\*\*/ { if (n) { statuses++; if ($0 == "- **Status:** complete") done=1 } }
  END { if (n && (statuses != 1 || !done)) bad=1; print (n > 0 && !bad) ? 1 : 0 }
' "$PLAN_FILE")
UNCHECKED=$(grep -cE '^[[:space:]]*- \[ \]' "$PLAN_FILE" || true)

if [ "$PHASES_OK" -eq 1 ] && [ "$UNCHECKED" -eq 0 ]; then
    echo "Plan markers complete; verify actual acceptance evidence separately."
    exit 0
else
    echo "TASK NOT COMPLETE"
    echo ""
    echo "Check remaining work and authorization; plan markers alone cannot prove completion."
    exit 1
fi
