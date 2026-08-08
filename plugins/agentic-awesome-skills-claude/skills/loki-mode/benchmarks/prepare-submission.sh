#!/bin/bash
#===============================================================================
# Prepare SWE-bench Submission
# Converts benchmark results to official SWE-bench submission format
#
# Usage:
#   ./benchmarks/prepare-submission.sh <results-dir>
#   ./benchmarks/prepare-submission.sh benchmarks/results/2026-01-05-10-37-54
#
# Output:
#   Creates submission-ready folder at benchmarks/submission/
#===============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1"; }

if [ $# -lt 1 ]; then
    echo "Usage: $0 <results-directory>"
    echo "Example: $0 benchmarks/results/2026-01-05-10-37-54"
    exit 1
fi

RESULTS_DIR="$1"
SUBMISSION_DATE=$(date +%Y%m%d)
SUBMISSION_DIR="$SCRIPT_DIR/submission/${SUBMISSION_DATE}_loki_mode"

log_info "Preparing SWE-bench submission..."
log_info "Results: $RESULTS_DIR"
log_info "Output: $SUBMISSION_DIR"

# Check results directory
if [ ! -d "$RESULTS_DIR" ]; then
    log_error "Results directory not found: $RESULTS_DIR"
    exit 1
fi

# Check for required files
if [ ! -f "$RESULTS_DIR/swebench-loki-predictions.json" ]; then
    log_error "Predictions file not found: $RESULTS_DIR/swebench-loki-predictions.json"
    exit 1
fi

# Create submission directory
mkdir -p "$SUBMISSION_DIR"

# Copy template files
log_info "Copying template files..."
cp "$SCRIPT_DIR/submission-template/README.md" "$SUBMISSION_DIR/"
cp "$SCRIPT_DIR/submission-template/metadata.yaml" "$SUBMISSION_DIR/"

# Convert predictions to JSONL format
log_info "Converting predictions to JSONL format..."
python3 << CONVERT_PREDS
import json

with open("$RESULTS_DIR/swebench-loki-predictions.json", 'r') as f:
    predictions = json.load(f)

with open("$SUBMISSION_DIR/all_preds.jsonl", 'w') as f:
    for pred in predictions:
        # Format required by SWE-bench
        entry = {
            "instance_id": pred["instance_id"],
            "model_patch": pred["model_patch"],
            "model_name_or_path": pred.get("model_name_or_path", "loki-mode")
        }
        f.write(json.dumps(entry) + '\n')

print(f"Converted {len(predictions)} predictions to JSONL format")
CONVERT_PREDS

# Copy trajectories if they exist
if [ -d "$RESULTS_DIR/trajs" ]; then
    log_info "Copying trajectory files..."
    cp -r "$RESULTS_DIR/trajs" "$SUBMISSION_DIR/"
    TRAJ_COUNT=$(ls -1 "$SUBMISSION_DIR/trajs" 2>/dev/null | wc -l | tr -d ' ')
    log_success "Copied $TRAJ_COUNT trajectory files"
else
    log_info "No trajectory files found (run benchmark with --loki for trajectory logging)"
    mkdir -p "$SUBMISSION_DIR/trajs"
fi

# Copy logs if they exist
if [ -d "$RESULTS_DIR/logs" ]; then
    log_info "Copying log files..."
    cp -r "$RESULTS_DIR/logs" "$SUBMISSION_DIR/"
    LOG_COUNT=$(ls -1 "$SUBMISSION_DIR/logs" 2>/dev/null | wc -l | tr -d ' ')
    log_success "Copied $LOG_COUNT log directories"
else
    log_info "No log files found (run benchmark with --loki for log capture)"
    mkdir -p "$SUBMISSION_DIR/logs"
fi

# Update metadata with actual results
log_info "Updating metadata with actual results..."
python3 << UPDATE_META
import json
import yaml
from datetime import datetime

# Load results
with open("$RESULTS_DIR/swebench-loki-results.json", 'r') as f:
    results = json.load(f)

# Load metadata template
with open("$SUBMISSION_DIR/metadata.yaml", 'r') as f:
    metadata = yaml.safe_load(f)

# Update with actual results
metadata['results'] = {
    'patch_generation_rate': round((results.get('generated', 0) / results.get('total_problems', 1)) * 100, 2),
    'problems_solved': results.get('generated', 0),
    'problems_total': results.get('total_problems', 0),
    'fixed_by_rarv': results.get('fixed_by_rarv', 0),
    'avg_attempts': round(results.get('avg_attempts', 1.0), 2),
    'total_time_seconds': round(results.get('elapsed_time', 0)),
    'avg_time_per_problem_seconds': round(results.get('elapsed_time', 0) / max(results.get('total_problems', 1), 1))
}
metadata['submission']['date'] = datetime.now().strftime('%Y-%m-%d')

# Save updated metadata
with open("$SUBMISSION_DIR/metadata.yaml", 'w') as f:
    yaml.dump(metadata, f, default_flow_style=False, sort_keys=False)

print("Metadata updated with actual results")
CONVERT_PREDS

# Generate submission summary
log_info "Generating submission summary..."
cat > "$SUBMISSION_DIR/SUBMISSION_CHECKLIST.md" << 'CHECKLIST'
# SWE-bench Submission Checklist

## Required Files
- [x] all_preds.jsonl - Predictions in JSONL format
- [x] README.md - Description of the system
- [x] metadata.yaml - Submission metadata

## Optional but Recommended
- [ ] trajs/ - Reasoning trajectories (required for some leaderboards)
- [ ] logs/ - Execution logs

## Pre-Submission Steps

1. **Verify predictions format:**
   ```bash
   head -1 all_preds.jsonl | python -m json.tool
   ```

2. **Run SWE-bench evaluator (optional but recommended):**
   ```bash
   python -m swebench.harness.run_evaluation \
     --predictions all_preds.jsonl \
     --max_workers 4 \
     --run_id loki_mode_v2.25.0
   ```

3. **Fork and create PR:**
   ```bash
   # Fork https://github.com/SWE-bench/experiments
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/experiments.git
   cd experiments

   # Copy submission
   cp -r /path/to/submission evaluation/lite/20260105_loki_mode

   # Create PR
   git checkout -b loki-mode-submission
   git add .
   git commit -m "Add Loki Mode submission"
   git push origin loki-mode-submission
   ```

4. **Submit PR with:**
   - Link to this repository
   - Brief description of the system
   - Any relevant benchmark methodology notes

## Contact

For questions about this submission, open an issue at:
https://github.com/asklokesh/loki-mode/issues
CHECKLIST

# Final summary
echo ""
echo "======================================================================"
echo "  SUBMISSION PREPARED"
echo "======================================================================"
echo "  Location: $SUBMISSION_DIR"
echo ""
echo "  Files:"
ls -la "$SUBMISSION_DIR/"
echo ""
echo "  Next Steps:"
echo "  1. Review all_preds.jsonl format"
echo "  2. Run SWE-bench evaluator (optional)"
echo "  3. Fork SWE-bench/experiments"
echo "  4. Copy submission folder to evaluation/lite/"
echo "  5. Create pull request"
echo "======================================================================"

log_success "Submission preparation complete!"
